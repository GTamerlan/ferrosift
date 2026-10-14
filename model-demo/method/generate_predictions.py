#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-only
"""Fresh local CPU video diagnostics using the identity-frozen public model pair.

This is a separately declared runner, not the bundle's version-pinned infer.py.
It keeps that runner's weights and inference settings, records the new runtime,
uses identical decoded pixels for both models, and never trains or tunes.
"""
from __future__ import annotations
import hashlib, importlib.metadata, json, math, os, platform, re, sys, time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
WORK = ROOT / 'artifacts/video_picker_20261014'
PRIVATE = WORK / 'inference'
PUBLIC = ROOT / 'artifacts/ferrosift_video_picker_release_20261014/model-demo'
CATALOG = ROOT / 'private_video_collection_20261014/catalog/Ferrosift_Video_Library'
MAPPING = WORK / 'label_audit/verified_frame_mapping.json'
INITIAL_PROTOCOL_SHA256 = '660bb006f85348ed9c6c4c4c179d2820f02a8678be036ba347aeb82132ba96b3'
os.environ['YOLO_CONFIG_DIR'] = str(PRIVATE / 'runtime/ultralytics')
os.environ['MPLCONFIGDIR'] = str(PRIVATE / 'runtime/matplotlib')
os.environ['TORCH_HOME'] = str(PRIVATE / 'runtime/torch')
os.environ['YOLO_OFFLINE'] = 'true'
os.environ['YOLO_AUTOINSTALL'] = 'false'


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n')
    temp.replace(path)


def utc():
    return datetime.now(timezone.utc).isoformat()


def verify_bundle(directory):
    files = []
    for line in (directory / 'SHA256SUMS.txt').read_text().splitlines():
        expected, relative = line.split(None, 1)
        relative = relative.lstrip('*')
        p = directory / relative
        if p.is_symlink() or not p.resolve().is_relative_to(directory) or sha(p) != expected:
            raise ValueError('Bundled manifest mismatch: ' + relative)
        files.append({'path': relative, 'sha256': expected})
    cfg = json.loads((directory / 'settings.json').read_text())
    method, model = next(iter(cfg['models'].items()))
    if cfg['classes'] != {'0': 'steel', '1': 'visible_copper'} or cfg['expected_end2end'] is not False:
        raise ValueError('Class or native postprocessing declaration changed')
    if sha(directory / model['file']) != model['sha256']:
        raise ValueError('Checkpoint mismatch')
    return cfg, method, model, files


def prepare():
    import cv2
    source = (CATALOG / 'index.html').read_text()
    assets = json.loads(re.search(r'const ASSETS=(\[.*?\]);', source, re.S).group(1))
    mapping = json.loads(MAPPING.read_text())
    if len(assets) != 38 or len(mapping['frames']) != 843:
        raise ValueError('Expected the frozen 38 clips and 843 verified label matches')
    labels = defaultdict(dict)
    for frame in mapping['frames']:
        key = frame['video_frame_index']
        if key in labels[frame['asset_id']]:
            raise ValueError('Duplicate label frame')
        if frame.get('label_geometry_verified_against_original_gzip') is not True:
            raise ValueError('Label geometry not verified')
        labels[frame['asset_id']][key] = frame
    clips = []
    for asset in assets:
        aid = asset['asset_id']
        relative = asset.get('preview_path') or asset['relative_path']
        path = CATALOG / relative
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(CATALOG):
            raise ValueError('Invalid local video path')
        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            raise ValueError('Cannot decode ' + aid)
        fps = cap.get(cv2.CAP_PROP_FPS)
        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        if not 0 < fps < 121 or count <= 0 or width <= 0 or height <= 0:
            raise ValueError('Invalid video metadata')
        duration = count / fps
        uniform = {min(count - 1, round(t * fps)) for t in range(math.ceil(duration))}
        selected = sorted(uniform | set(labels[aid]))
        digest = sha(path)
        for index, label in labels[aid].items():
            if (index >= count or digest != label['preview_sha256'] or
                    (width, height) != (label['width'], label['height']) or abs(fps - label['preview_fps']) > 1e-7):
                raise ValueError('Label-to-video identity or coordinate mismatch')
        clips.append({'asset_id': aid, 'dataset_id': asset['dataset_id'], 'relative_path': relative,
            'sha256': digest, 'fps': fps, 'video_frames': count, 'width': width, 'height': height,
            'duration_seconds': duration, 'selected_frames': selected, 'uniform_frames': sorted(uniform),
            'labeled_frames': sorted(labels[aid]), 'exposure': asset['exposure'],
            'prior_exposure': asset.get('historical_exposure'), 'license': asset['license']})
    configs, specs, model_paths, bundled_files = {}, {}, {}, {}
    for role in ('candidate', 'reference'):
        directory = WORK / f'private_models/Ferrosift_{role}_model/ferrosift_{role}_model'
        cfg, method, model, files = verify_bundle(directory)
        configs[role] = cfg
        specs[role] = {'method': method, 'export_checkpoint_sha256': model['sha256'],
            'copper_threshold': model['copper_threshold'], 'input_size': cfg['imgsz']}
        model_paths[role] = directory / model['file']
        bundled_files[role] = files
    if configs['candidate']['inference'] != configs['reference']['inference']:
        raise ValueError('Pair does not share exact inference settings')
    versions = {p: importlib.metadata.version(p) for p in ('torch', 'torchvision', 'ultralytics', 'Pillow', 'numpy', 'opencv-python', 'scipy')}
    if versions['ultralytics'] != '8.4.175':
        raise ValueError('Ultralytics recipe version changed')
    protocol = {'schema_version': 1, 'declared_utc': utc(), 'experiment': 'Preregistered matched video frame diagnostics 20261014',
        'models': specs, 'inference': configs['candidate']['inference'], 'classes': {'0': 'steel', '1': 'visible_copper'},
        'device': 'cpu', 'versions': versions, 'python': platform.python_version(), 'machine': platform.machine(),
        'requested_cpu_threads': 4, 'seed': 42, 'model_or_threshold_selection_performed': False, 'training_performed': False,
        'weight_download_performed': False, 'cloud_compute_performed': False, 'live_server_inference': False,
        'sampling': 'All clips uniformly at integer video seconds, nearest available frame, union every verified labeled frame; no result-dependent selection.',
        'selection_count': sum(len(c['selected_frames']) for c in clips), 'verified_labeled_frame_count': 843,
        'input_pixels': 'Same OpenCV-decoded BGR uint8 pixels supplied through one RGB PIL image to both models; BGR and RGB hashes saved. JPEG display images are encoded after inference and not used as model input.',
        'coordinate_space': 'Original decoded viewing video pixels. Verified SteelDS labels already use 1280x720 pixel xyxy coordinates; no further scaling.',
        'scoring': 'Existing experiments/detection_evaluation.py; class- and score-blind maximum-cardinality IoU>=0.5 matching over all post-NMS proposals, then frozen copper decision thresholds. This differs from historical website alarm-only greedy routing.',
        'metrics_scope': 'Only 843 verified labeled repeated frame-object observations in seven SteelDS clips. Not unique pieces, independent holdouts, physical recovery, or general accuracy.',
        'public_overlay_policy': 'Native copper-class detections at or above each frozen copper threshold only. No class relabeling. Full post-NMS proposals, including steel detections, retained privately for scoring.',
        'source_decode_opencv_threads': 1,
        'prior_runtime_difference': 'Torch2.14.1/torchvision0.29.1 local CPU rather than bundled Torch2.8.0/torchvision0.23.0; fresh separately declared inference, not reproduction of historical scores.',
        'mapping_sha256': sha(MAPPING), 'runner_sha256': sha(__file__),
        'compatible_cache_protocol_sha256': [INITIAL_PROTOCOL_SHA256],
        'geometry_policy': 'Preserve zero-area post-clipping native boxes separately. Exclude only zero-area detections below the frozen copper alarm threshold; zero-area boxes cannot overlap any valid annotation and subthreshold boxes cannot become copper alarms. Abort for a zero-area copper alarm or any inverted/out-of-bounds geometry. Original strict-run cache contained only valid geometry and is reused unchanged.',
        'evaluator_sha256': sha(ROOT / 'experiments/detection_evaluation.py'), 'clips': clips,
        'bundled_manifests_verified': bundled_files}
    initial = json.loads((PRIVATE / 'geometry_guard_review/protocol_initial.json').read_text())
    if sha(PRIVATE / 'geometry_guard_review/protocol_initial.json') != INITIAL_PROTOCOL_SHA256:
        raise ValueError('Initial protocol hash changed')
    for key in ('models', 'inference', 'classes', 'versions', 'mapping_sha256', 'clips', 'selection_count', 'verified_labeled_frame_count', 'scoring'):
        if protocol[key] != initial[key]:
            raise ValueError('Resume protocol would invalidate original cached predictions: ' + key)
    protocol_path = PRIVATE / 'protocol.json'
    if protocol_path.exists():
        old = json.loads(protocol_path.read_text())
        protocol['declared_utc'] = old['declared_utc']
        if protocol != old:
            raise ValueError('Existing protocol differs; refuse silent evidence replacement')
    else:
        write(protocol_path, protocol)
    return clips, labels, configs, specs, model_paths, protocol


def run():
    import cv2, numpy as np, torch
    from PIL import Image
    from ultralytics import YOLO, settings
    from experiments.detection_evaluation import evaluate_frames
    cv2.setNumThreads(1)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    clips, labels, configs, specs, model_paths, protocol = prepare()
    protocol_hash = sha(PRIVATE / 'protocol.json')
    for key in ('sync', 'hub', 'wandb', 'mlflow', 'comet', 'clearml', 'neptune', 'tensorboard'):
        if key in settings:
            settings.update({key: False})
    torch.manual_seed(42)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(4)
    models = {role: YOLO(str(path), task='detect') for role, path in model_paths.items()}
    if any(m.names != {0: 'steel', 1: 'visible_copper'} for m in models.values()):
        raise ValueError('Loaded model class mapping mismatch')
    for model in models.values():
        # Setup predictor before measuring and before resetting its CPU thread side effect.
        model.predict(source=Image.new('RGB', (1280, 720)), imgsz=640, **protocol['inference'])
        if bool(model.predictor.model.end2end):
            raise ValueError('Expected common class-aware NMS, got end-to-end backend')
    torch.set_num_threads(4)
    started = time.perf_counter()
    runtimes, smoke = [], []

    def infer(clip, index, bgr):
        aid = clip['asset_id']
        pixel_bgr = hashlib.sha256(bgr.tobytes()).hexdigest()
        label = labels[aid].get(index)
        if label and pixel_bgr != label['decoded_video_frame_sha256']:
            raise ValueError('Verified labeled video pixels changed: ' + label['frame_id'])
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        pixel_rgb = hashlib.sha256(rgb.tobytes()).hexdigest()
        cache = PRIVATE / 'raw' / aid / f'{index}.json'
        if cache.exists():
            row = json.loads(cache.read_text())
            if row['protocol_sha256'] not in [protocol_hash, INITIAL_PROTOCOL_SHA256] or row['decoded_bgr_sha256'] != pixel_bgr or row['decoded_rgb_sha256'] != pixel_rgb:
                raise ValueError('Cached predictions do not match frozen pixels/protocol')
            return row
        image = Image.fromarray(rgb)
        row = {'asset_id': aid, 'video_frame_index': index, 'time': index / clip['fps'],
            'width': image.width, 'height': image.height, 'decoded_bgr_sha256': pixel_bgr,
            'decoded_rgb_sha256': pixel_rgb, 'protocol_sha256': protocol_hash,
            'labeled_frame_id': label['frame_id'] if label else None, 'detections': {}, 'inference_ms': {}, 'native_invalid_geometry': {}}
        for role, model in models.items():
            before = time.perf_counter()
            result = model.predict(source=image, imgsz=configs[role]['imgsz'], **configs[role]['inference'])[0]
            if bool(model.predictor.model.end2end) or result.orig_shape != (image.height, image.width):
                raise ValueError('Native backend or coordinates changed')
            predictions, invalid_geometry = [], []
            for b, c, s in zip(result.boxes.xyxy.cpu().tolist(), result.boxes.cls.cpu().tolist(), result.boxes.conf.cpu().tolist()):
                if int(c) not in (0, 1) or not math.isfinite(s) or not .001 <= s <= 1:
                    raise ValueError('Invalid class/confidence')
                if not all(math.isfinite(v) for v in b) or not (0 <= b[0] <= b[2] <= image.width and 0 <= b[1] <= b[3] <= image.height):
                    raise ValueError('Inverted/out-of-bounds native box')
                if b[0] == b[2] or b[1] == b[3]:
                    invalid_geometry.append({'bbox': b, 'class_id': int(c), 'object_score': float(s), 'reason': 'zero_area_after_native_clipping'})
                    if int(c) == 1 and s >= specs[role]['copper_threshold']:
                        raise ValueError('Zero-area copper alarm requires explicit unmatched-alarm accounting')
                    continue
                predictions.append({'bbox': b, 'class_id': int(c), 'object_score': float(s),
                    'copper_score': float(s) if int(c) == 1 else 0.0})
            row['detections'][role] = predictions
            row['native_invalid_geometry'][role] = invalid_geometry
            row['inference_ms'][role] = (time.perf_counter() - before) * 1000
        row['actual_torch_threads'] = torch.get_num_threads()
        if row['actual_torch_threads'] != 4:
            raise ValueError('Inference CPU thread count changed')
        write(cache, row)
        return row

    # Fixed smoke set: first four 1Hz frames of first clip from each dataset.
    smoke_clips, seen = [], set()
    for clip in clips:
        if clip['dataset_id'] not in seen:
            smoke_clips.append(clip)
            seen.add(clip['dataset_id'])
    for clip in smoke_clips:
        chosen = set(clip['uniform_frames'][:4])
        cap = cv2.VideoCapture(str(CATALOG / clip['relative_path']))
        for index in range(max(chosen) + 1):
            ok, frame = cap.read()
            if not ok:
                raise ValueError('Smoke decode ended early')
            if index in chosen:
                row = infer(clip, index, frame)
                smoke.append({'asset_id': clip['asset_id'], 'frame': index, 'timing_ms': row['inference_ms']})
        cap.release()
    pair_ms = [sum(x['timing_ms'].values()) for x in smoke]
    smoke_receipt = {'status': 'pass', 'utc': utc(), 'frames': len(smoke), 'matched_model_calls': len(smoke) * 2,
        'device': 'cpu', 'actual_threads': torch.get_num_threads(), 'common_nms_verified': True,
        'mean_pair_ms': float(np.mean(pair_ms)), 'median_pair_ms': float(np.median(pair_ms)),
        'p95_pair_ms': float(np.percentile(pair_ms, 95)), 'estimated_full_inference_seconds': float(np.mean(pair_ms)) / 1000 * protocol['selection_count'],
        'frames_total_planned': protocol['selection_count'], 'runtime_versions': protocol['versions'], 'observations': smoke,
        'caveat': 'Single local sampling estimate; excludes full decode/serialization and is not a real-time/industrial throughput benchmark.'}
    write(PRIVATE / 'smoke_receipt.json', smoke_receipt)
    print('SMOKE ' + json.dumps(smoke_receipt), flush=True)
    if smoke_receipt['estimated_full_inference_seconds'] > 7200:
        raise RuntimeError('Projected inference exceeds two hours; pause before full generation')

    summary = []
    for clip in clips:
        aid = clip['asset_id']
        chosen = set(clip['selected_frames'])
        cap = cv2.VideoCapture(str(CATALOG / clip['relative_path']))
        public_frames, evaluation_frames = [], []
        proposals = {'candidate': {}, 'reference': {}}
        clip_start = time.perf_counter()
        for index in range(clip['video_frames']):
            ok, bgr = cap.read()
            if not ok:
                raise ValueError('Video ended before metadata frame count: ' + aid)
            if index not in chosen:
                continue
            row = infer(clip, index, bgr)
            runtimes.append(row['inference_ms'])
            image_relative = f'samples/{aid}/{index}.jpg'
            dest = PUBLIC / image_relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not cv2.imwrite(str(dest), bgr, [cv2.IMWRITE_JPEG_QUALITY, 80]):
                raise ValueError('Display JPEG could not be written')
            f = {'time': row['time'], 'source_frame_index': index, 'image': image_relative,
                'input_pixel_sha256': row['decoded_rgb_sha256'], 'width': row['width'], 'height': row['height']}
            for role in ('candidate', 'reference'):
                threshold = specs[role]['copper_threshold']
                f[role] = [{'box': p['bbox'], 'confidence': p['object_score'], 'class_id': p['class_id']}
                    for p in row['detections'][role]
                    if p['class_id'] == 1 and p['copper_score'] >= threshold]
            label = labels[aid].get(index)
            f['labels_verified'] = bool(label)
            if label:
                frame_id = label['frame_id']
                f['truth'] = [{'box': a['bbox'], 'class_id': 1 if a['label'] == 'visible_copper' else 0} for a in label['annotations']]
                f['annotation_frame_id'] = frame_id
                for role in proposals:
                    proposals[role][frame_id] = row['detections'][role]
                evaluation_frames.append({**label, 'path': f"decoded-video:{aid}:{index}"})
            public_frames.append(f)
        if cap.read()[0]:
            raise ValueError('Video has extra frames beyond metadata')
        cap.release()
        if len(public_frames) != len(chosen) or sha(CATALOG / clip['relative_path']) != clip['sha256']:
            raise ValueError('Selected frame count/video hash changed')
        metrics = {'available': bool(evaluation_frames), 'reason': None if evaluation_frames else 'Accuracy unavailable: no verified labels for these sampled video frames.',
            'sampled_frames': len(public_frames), 'labeled_frames': len(evaluation_frames),
            'copper_annotations': sum(a['label'] == 'visible_copper' for f in evaluation_frames for a in f['annotations']),
            'steel_annotations': sum(a['label'] == 'steel' for f in evaluation_frames for a in f['annotations']),
            'matching_rule': 'Class- and score-blind maximum-cardinality matching at IoU>=0.5, then maximum summed IoU; all post-NMS proposals participate.',
            'scope': 'Repeated frame-object observations, not independent physical pieces, standard AP, overall accuracy or physical sorting results.',
            'thresholds': {r: specs[r]['copper_threshold'] for r in specs}}
        for role in ('candidate', 'reference'):
            if not evaluation_frames:
                metrics[role] = None
                continue
            result = evaluate_frames(evaluation_frames, proposals[role], specs[role]['copper_threshold'])
            write(PRIVATE / 'metrics' / f'{aid}.{role}.json', result)
            c = result['counts']
            metrics[role] = {'copper_found': c['copper_correct'], 'copper_missed': c['copper_false_negatives'],
                'steel_matches': c['steel_falsely_flagged'], 'unmatched_alarms': c['unmatched_copper_alarms'],
                'other_matches': c['distractor_copper_flags'], 'copper_alarms': c['copper_alarms'],
                'copper_recall': result['copper_recall'], 'copper_alarm_precision': result['copper_precision'],
                'steel_annotation_false_copper_rate': result['steel_fpr']}
        payload = {'schema_version': 1, 'asset_id': aid, 'width': clip['width'], 'height': clip['height'],
            'fps': clip['fps'], 'duration_seconds': clip['duration_seconds'], 'frames': public_frames, 'metrics': metrics,
            'models': specs, 'sampling_hz': 1, 'prerecorded': True, 'runtime_versions': protocol['versions'],
            'inference_settings': protocol['inference'],
            'display_filter': protocol['public_overlay_policy'], 'protocol_sha256': protocol_hash,
            'display_note': 'Display JPEGs are compressed copies of the exact video frames used for inference; boxes use original decoded pixel coordinates.',
            'source_video_sha256': clip['sha256'], 'label_mapping_sha256': protocol['mapping_sha256']}
        write(PUBLIC / 'predictions' / f'{aid}.json', payload)
        item = {'asset_id': aid, 'frames': len(public_frames), 'labeled_frames': len(evaluation_frames),
            'elapsed_seconds': time.perf_counter() - clip_start, 'prediction_sha256': sha(PUBLIC / 'predictions' / f'{aid}.json'), 'metrics': metrics}
        summary.append(item)
        write(PRIVATE / 'progress.json', {'status': 'running', 'utc': utc(), 'completed_clips': len(summary),
            'completed_frames': sum(s['frames'] for s in summary), 'total_clips': len(clips), 'clips': summary})
        print('CLIP ' + json.dumps({k: item[k] for k in ('asset_id', 'frames', 'labeled_frames', 'elapsed_seconds')}), flush=True)
    if sum(s['labeled_frames'] for s in summary) != 843 or sum(s['frames'] for s in summary) != protocol['selection_count']:
        raise ValueError('Final frame/label count mismatch')
    for role, path in model_paths.items():
        if sha(path) != specs[role]['export_checkpoint_sha256']:
            raise ValueError('Weights changed during inference')
    if sha(MAPPING) != protocol['mapping_sha256'] or sha(__file__) != protocol['runner_sha256']:
        raise ValueError('Protocol inputs changed during inference')
    final = {'status': 'complete', 'finished_utc': utc(), 'elapsed_seconds': time.perf_counter() - started,
        'clips_complete': len(summary), 'frames_complete': sum(s['frames'] for s in summary),
        'labeled_frames_scored': 843, 'matched_model_calls': 2 * sum(s['frames'] for s in summary),
        'actual_torch_threads': torch.get_num_threads(), 'protocol_sha256': protocol_hash,
        'runtime_versions': protocol['versions'], 'models': specs, 'clips': summary,
        'same_pixel_input_for_both_models': True, 'all_labeled_BGR_hashes_verified': True,
        'training_performed': False, 'new_threshold_selection_performed': False,
        'raw_predictions_directory': str((PRIVATE / 'raw').relative_to(ROOT))}
    write(PRIVATE / 'FINAL_RECEIPT.json', final)
    write(PRIVATE / 'progress.json', final)
    print('COMPLETE ' + json.dumps({k: final[k] for k in ('status', 'frames_complete', 'labeled_frames_scored', 'elapsed_seconds')}), flush=True)


if __name__ == '__main__':
    try:
        run()
    except BaseException as e:
        write(PRIVATE / 'failure.json', {'utc': utc(), 'type': type(e).__name__, 'error': str(e)})
        raise
