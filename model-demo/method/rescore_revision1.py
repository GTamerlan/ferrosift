#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Attach independently audited labels to existing predictions; no model calls."""
from __future__ import annotations
import hashlib, json, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from experiments.detection_evaluation import evaluate_frames

WORK = ROOT / 'artifacts/video_picker_20261014'
PRIVATE = WORK / 'inference'
PUBLIC = ROOT / 'artifacts/ferrosift_video_picker_release_20261014/model-demo'
MAPPING = WORK / 'label_audit_revision1/augmented_frame_mapping.json'
EXPECTED_MAPPING = '8e5ee5402a2a26f1ce6be5fc8482e75b20daf457fc82db3d21cd5ccb51f08eee'
DIRECT = 'direct_image_content_alignment'
ORDINAL = 'ordinal_provenance_with_recording_content_support'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n')
    temp.replace(path)


def main():
    if sha(MAPPING) != EXPECTED_MAPPING:
        raise ValueError('Revised mapping identity changed')
    initial_mapping_path = WORK / 'label_audit/verified_frame_mapping.json'
    initial = json.loads(initial_mapping_path.read_text())
    mapping = json.loads(MAPPING.read_text())
    assert mapping['schema_version'] == 2 and len(mapping['frames']) == 979
    assert mapping['frames'][:843] == initial['frames']
    indexed = {(f['asset_id'], f['video_frame_index']): f for f in mapping['frames']}
    assert len(indexed) == 979
    protocol = json.loads((PRIVATE / 'protocol.json').read_text())
    before_raw = json.loads((PRIVATE / 'RAW_PREDICTION_MANIFEST.json').read_text())
    display_changes = json.loads((PRIVATE / 'display_quality60/DISPLAY_SAMPLE_CHANGES.json').read_text())
    destination = PRIVATE / 'scoring_revision1'
    if destination.exists():
        raise ValueError('Scoring revision already exists')
    destination.mkdir()
    declaration = {'revision': 1, 'declared_utc': datetime.now(timezone.utc).isoformat(),
        'mapping_sha256': EXPECTED_MAPPING, 'initial_mapping_sha256': sha(initial_mapping_path),
        'label_audit_receipt_sha256': sha(WORK / 'label_audit_revision1/AUDIT_RECEIPT.json'),
        'inference_protocol_sha256': sha(PRIVATE / 'protocol.json'), 'runner_sha256': sha(__file__),
        'evaluator_sha256': sha(ROOT / 'experiments/detection_evaluation.py'),
        'inference_performed': False, 'threshold_selection_performed': False, 'models': protocol['models'],
        'selected_frames_unchanged': 2720, 'labeled_frames': 979,
        'verification_tiers': {DIRECT: 843, ORDINAL: 136},
        'verification_note': '843 frames retain individual image-content comparison. 136 additional sampled frames use audited publisher frame ordinals and original/converted label hashes with recording-level content support; individual publisher image-pixel comparison was not performed for those additions.',
        'scoring': protocol['scoring'], 'geometry_policy': protocol['geometry_policy'],
        'native_zero_area_subthreshold_records_retained': 376,
        'scope': 'Frame-object annotation diagnostics on exposed or development recordings; not independent holdouts, unique physical pieces, chemistry or physical sorting.'}
    write(destination / 'protocol.json', declaration)
    revision_hash = sha(destination / 'protocol.json')
    counts = {'labeled': 0, 'copper': 0, 'steel': 0, DIRECT: 0, ORDINAL: 0}
    results, changes = [], []
    for clip in protocol['clips']:
        aid = clip['asset_id']
        path = PUBLIC / 'predictions' / f'{aid}.json'
        original = json.loads(path.read_text())
        original_hash = sha(path)
        payload = json.loads(path.read_text())
        gt, proposals = [], {'candidate': {}, 'reference': {}}
        tier_counts = {DIRECT: 0, ORDINAL: 0}
        for f in payload['frames']:
            index = f['source_frame_index']
            label = indexed.get((aid, index))
            f['labels_verified'] = bool(label)
            if not label:
                assert 'truth' not in f
                f['label_verification_level'] = 'no_verified_labels'
                continue
            if label.get('content_evidence', {}).get('accepted') is True:
                tier = DIRECT
            else:
                assert label['mapping_evidence_tier'] == 'verified_ordinal_provenance_supported_by_recording_level_content_alignment_not_individual_pixel_proof'
                assert label['individual_source_image_content_match_performed'] is False
                tier = ORDINAL
            raw = json.loads((PRIVATE / 'raw' / aid / f'{index}.json').read_text())
            assert raw['decoded_bgr_sha256'] == label['decoded_video_frame_sha256']
            assert (raw['width'], raw['height']) == (label['width'], label['height'])
            assert raw['decoded_rgb_sha256'] == f['input_pixel_sha256']
            assert label['label_geometry_verified_against_original_gzip'] is True
            f['truth'] = [{'box': a['bbox'], 'class_id': int(a['label'] == 'visible_copper')} for a in label['annotations']]
            f['annotation_frame_id'] = label['frame_id']
            f['label_verification_level'] = tier
            gt.append({**label, 'path': f'decoded-video:{aid}:{index}'})
            for role in proposals:
                proposals[role][label['frame_id']] = raw['detections'][role]
            tier_counts[tier] += 1
            counts[tier] += 1
        metrics = {'available': bool(gt), 'reason': None if gt else 'Accuracy unavailable: no verified labels for these sampled video frames.',
            'sampled_frames': len(payload['frames']), 'labeled_frames': len(gt),
            'copper_annotations': sum(a['label'] == 'visible_copper' for f in gt for a in f['annotations']),
            'steel_annotations': sum(a['label'] == 'steel' for f in gt for a in f['annotations']),
            'matching_rule': 'Class- and score-blind maximum-cardinality matching at IoU>=0.5, then maximum summed IoU over all positive-area post-NMS proposals. Native zero-area subthreshold rows are preserved separately and cannot match annotations or become copper alarms.',
            'scope': declaration['scope'], 'verification_tiers': tier_counts,
            'thresholds': {r: protocol['models'][r]['copper_threshold'] for r in protocol['models']}}
        for role in ('candidate', 'reference'):
            if not gt:
                metrics[role] = None
                continue
            evaluated = evaluate_frames(gt, proposals[role], protocol['models'][role]['copper_threshold'])
            write(destination / 'metrics' / f'{aid}.{role}.json', evaluated)
            c = evaluated['counts']
            metrics[role] = {'copper_found': c['copper_correct'], 'copper_missed': c['copper_false_negatives'],
                'steel_matches': c['steel_falsely_flagged'], 'unmatched_alarms': c['unmatched_copper_alarms'],
                'other_matches': c['distractor_copper_flags'], 'copper_alarms': c['copper_alarms'],
                'copper_recall': evaluated['copper_recall'], 'copper_alarm_precision': evaluated['copper_precision'],
                'steel_annotation_false_copper_rate': evaluated['steel_fpr']}
        payload['metrics'] = metrics
        payload['label_mapping_sha256'] = EXPECTED_MAPPING
        payload['scoring_revision'] = 1
        payload['scoring_protocol_sha256'] = revision_hash
        payload['label_verification_note'] = declaration['verification_note']
        allowed = {'truth', 'annotation_frame_id', 'labels_verified', 'label_verification_level'}
        for old, new in zip(original['frames'], payload['frames']):
            assert {k: v for k, v in old.items() if k not in allowed} == {k: v for k, v in new.items() if k not in allowed}
        for key in ('models', 'inference_settings', 'runtime_versions', 'display_encoding', 'source_video_sha256'):
            assert payload[key] == original[key]
        write(path, payload)
        results.append({'asset_id': aid, 'metrics': metrics})
        changes.append({'path': f'predictions/{aid}.json', 'before_sha256': original_hash, 'after_sha256': sha(path)})
        counts['labeled'] += len(gt)
        counts['copper'] += metrics['copper_annotations']
        counts['steel'] += metrics['steel_annotations']
    assert counts == {'labeled': 979, 'copper': 5969, 'steel': 26318, DIRECT: 843, ORDINAL: 136}
    assert all(sha(PRIVATE / row['path']) == row['sha256'] for row in before_raw)
    assert all(sha(PUBLIC / row['path']) == row['after_sha256'] for row in display_changes)
    write(destination / 'PUBLIC_PREDICTION_CHANGES.json', changes)
    receipt = {'status': 'pass', 'finished_utc': datetime.now(timezone.utc).isoformat(),
        'counts': counts, 'clips': results, 'model_inference_performed': False,
        'all_raw_prediction_hashes_unchanged': True, 'all_display_JPEG_hashes_unchanged': True,
        'all_public_overlay_arrays_scores_timestamps_images_unchanged': True,
        'original_843_frame_records_unchanged': True,
        'scoring_protocol_sha256': revision_hash, 'new_mapping_sha256': EXPECTED_MAPPING,
        'public_prediction_changes_sha256': sha(destination / 'PUBLIC_PREDICTION_CHANGES.json')}
    write(destination / 'FINAL_RECEIPT.json', receipt)
    print(json.dumps({k: v for k, v in receipt.items() if k != 'clips'}, indent=2))


if __name__ == '__main__':
    main()
