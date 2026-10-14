#!/usr/bin/env python3
"""Reduce display-only JPEG weight using verified source pixels; never infer."""
import hashlib, json, shutil, time
from datetime import datetime, timezone
from pathlib import Path
import cv2

ROOT = Path(__file__).resolve().parents[3]
PRIVATE = ROOT / 'artifacts/video_picker_20261014/inference'
WEB = ROOT / 'artifacts/ferrosift_video_picker_release_20261014/model-demo'
VIDEOS = ROOT / 'private_video_collection_20261014/catalog/Ferrosift_Video_Library'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')
    temp.replace(path)


def main():
    cv2.setNumThreads(1)
    protocol = json.loads((PRIVATE / 'protocol.json').read_text())
    before = {r['path']: r for r in json.loads((PRIVATE / 'DISPLAY_SAMPLE_MANIFEST.json').read_text())}
    assert json.loads((PRIVATE / 'INTEGRITY_QA.json').read_text())['status'] == 'pass'
    output = PRIVATE / 'display_quality60'
    if (output / 'FINAL_RECEIPT.json').exists():
        raise ValueError('Display re-encode already completed')
    archived = PRIVATE / 'initial_public_predictions'
    archived.mkdir(parents=True, exist_ok=True)
    for p in (WEB / 'predictions').glob('*.json'):
        if (archived / p.name).exists():
            raise ValueError('Initial public JSON archive already exists; review before restart')
        shutil.copy2(p, archived / p.name)
    rows, changes = [], []
    started = time.perf_counter()
    for clip in protocol['clips']:
        video = VIDEOS / clip['relative_path']
        if sha(video) != clip['sha256']:
            raise ValueError('Source viewing video changed')
        selected = set(clip['selected_frames'])
        cap = cv2.VideoCapture(str(video))
        for index in range(clip['video_frames']):
            ok, bgr = cap.read()
            if not ok:
                raise ValueError('Premature video end')
            if index not in selected:
                continue
            relative = f"samples/{clip['asset_id']}/{index}.jpg"
            path = WEB / relative
            old = before[relative]
            if path.stat().st_size != old['bytes'] or sha(path) != old['sha256']:
                raise ValueError('Display image changed before re-encode: ' + relative)
            raw = json.loads((PRIVATE / 'raw' / clip['asset_id'] / f'{index}.json').read_text())
            digest = hashlib.sha256(bgr.tobytes()).hexdigest()
            if digest != raw['decoded_bgr_sha256']:
                raise ValueError('Decoded image differs from inference input')
            ok, encoded = cv2.imencode('.jpg', bgr, [cv2.IMWRITE_JPEG_QUALITY, 60])
            if not ok:
                raise ValueError('JPEG encoding failed')
            blob = encoded.tobytes()
            temp = path.with_suffix('.jpg.tmp')
            temp.write_bytes(blob)
            temp.replace(path)
            rows.append({'path': relative, 'before_sha256': old['sha256'], 'before_bytes': old['bytes'],
                'after_sha256': hashlib.sha256(blob).hexdigest(), 'after_bytes': len(blob),
                'width': clip['width'], 'height': clip['height'], 'decoded_BGR_sha256': digest,
                'inference_RGB_sha256': raw['decoded_rgb_sha256'], 'viewing_frame_index': index})
        cap.release()
        pred = WEB / 'predictions' / (clip['asset_id'] + '.json')
        prior_digest = sha(pred)
        value = json.loads(pred.read_text())
        value['display_note'] = 'Display JPEGs use OpenCV JPEG quality60 at unchanged native dimensions, encoded directly from the exact decoded viewing-video pixels used for inference. Display compression occurs after inference; boxes and scores are unchanged.'
        value['display_encoding'] = {'format': 'JPEG', 'encoder': 'OpenCV5.0.0.93', 'quality': 60,
            'dimensions': 'native viewing-video dimensions', 'inference_repeated': False,
            'coordinates_transformed': False}
        # Match the compact prediction JSON encoding used for the inference export.
        pred.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n')
        changes.append({'path': str(pred.relative_to(WEB)), 'before_sha256': prior_digest, 'after_sha256': sha(pred)})
        print('DISPLAY ' + clip['asset_id'], flush=True)
    assert len(rows) == len(before) == 2720
    # Verify every written image header and checksum after the complete batch.
    from PIL import Image
    for record in rows:
        path = WEB / record['path']
        assert sha(path) == record['after_sha256']
        with Image.open(path) as image:
            assert image.format == 'JPEG' and image.size == (record['width'], record['height'])
            image.verify()
    write(output / 'DISPLAY_SAMPLE_CHANGES.json', rows)
    write(output / 'PREDICTION_METADATA_CHANGES.json', changes)
    receipt = {'status': 'pass', 'finished_utc': datetime.now(timezone.utc).isoformat(),
        'sample_count': len(rows), 'before_bytes': sum(r['before_bytes'] for r in rows),
        'after_bytes': sum(r['after_bytes'] for r in rows), 'elapsed_seconds': time.perf_counter() - started,
        'models_loaded': False, 'inference_performed': False, 'scores_changed': False,
        'coordinates_changed': False, 'every_decoded_BGR_identity_matches_inference': True,
        'every_JPEG_header_and_digest_verified': True, 'opencv_version': cv2.__version__,
        'previous_quality': 80, 'new_quality': 60,
        'old_bytes_reproducible': 'Initial quality80 JPEGs are reproducible from unchanged viewing videos, saved selected indices, OpenCV5.0.0.93, and preserved generator. Initial SHA/size manifest retained; bulky initial JPEG bytes not duplicated.',
        'initial_JPEG_manifest_sha256': sha(PRIVATE / 'DISPLAY_SAMPLE_MANIFEST.json'),
        'changes_manifest_sha256': sha(output / 'DISPLAY_SAMPLE_CHANGES.json'),
        'prediction_metadata_changes_sha256': sha(output / 'PREDICTION_METADATA_CHANGES.json')}
    write(output / 'FINAL_RECEIPT.json', receipt)
    print(json.dumps(receipt, indent=2), flush=True)


if __name__ == '__main__':
    main()
