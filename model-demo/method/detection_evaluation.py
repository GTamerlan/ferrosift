"""EXP-007 full-frame detection metrics; no image/model IO or fitting.

Boxes use pixel-space [x1, y1, x2, y2] corners. Predictions are an explicit
mapping from each frame_id to a list, including [] for an empty detector result.
Proposal geometry and ordering must be frozen before comparing classifiers.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Mapping
import hashlib
import json
import math

IOU_THRESHOLD = 0.5
REJECT_ALL_THRESHOLD = math.nextafter(1.0, math.inf)
LABELS = ("steel", "visible_copper", "distractor")
MATCHING_RULE = "Class- and score-blind one-to-one assignment: maximum cardinality at IoU>=0.5, then maximum summed IoU; stable supplied annotation/proposal order breaks solver ties."


def _number(value, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return float(value)


def _box(value, width: int, height: int) -> list[float]:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        raise ValueError("bbox must contain four pixel-space corner coordinates")
    x1, y1, x2, y2 = [_number(v, "bbox coordinate") for v in value]
    if not (0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height):
        raise ValueError("bbox must have positive area and lie inside the frame")
    return [x1, y1, x2, y2]


def box_iou(first, second) -> float:
    intersection = max(0.0, min(first[2], second[2]) - max(first[0], second[0])) * max(
        0.0, min(first[3], second[3]) - max(first[1], second[1]))
    union = ((first[2] - first[0]) * (first[3] - first[1])
             + (second[2] - second[0]) * (second[3] - second[1]) - intersection)
    return intersection / union


def match_boxes(annotations: list[dict], predictions: list[dict]) -> list[dict]:
    """Geometry-only exact assignment; SciPy is already a pinned base dependency.

    With k=min(number of GT, number of proposals), bonus=k+1 exceeds every
    possible total-IoU improvement. Thus losing one match can never help the
    objective. Invalid assignments have zero weight and are discarded. The
    pinned deterministic solver receives only geometry in the supplied order.
    """
    if not annotations or not predictions:
        return []
    import numpy as np
    from scipy.optimize import linear_sum_assignment

    overlaps = np.asarray([[box_iou(a["bbox"], p["bbox"]) for p in predictions]
                           for a in annotations], dtype=float)
    bonus = min(overlaps.shape) + 1
    weights = np.where(overlaps >= IOU_THRESHOLD, bonus + overlaps, 0.0)
    gt_indices, prediction_indices = linear_sum_assignment(weights, maximize=True)
    return [{"annotation_index": int(g), "prediction_index": int(p), "iou": float(overlaps[g, p])}
            for g, p in zip(gt_indices, prediction_indices) if overlaps[g, p] >= IOU_THRESHOLD]


def _hash(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def _prepare(frames, predictions) -> dict:
    frames = list(frames)
    if not frames:
        raise ValueError("At least one frame is required")
    if not isinstance(predictions, Mapping):
        raise ValueError("Predictions must map every frame_id to an explicit list")
    clean, seen = [], set()
    for frame in frames:
        identity = frame.get("frame_id")
        if not isinstance(identity, str) or not identity or identity in seen:
            raise ValueError("Frame IDs must be nonempty unique strings")
        seen.add(identity)
        for key in ("path", "source_id", "split"):
            if not isinstance(frame.get(key), str) or not frame[key]:
                raise ValueError(f"Every frame requires a nonempty {key}")
        width, height = frame.get("width"), frame.get("height")
        if any(type(value) is not int or value <= 0 for value in (width, height)):
            raise ValueError("Frame width and height must be positive integers")
        if not isinstance(frame.get("annotations"), list):
            raise ValueError("Every frame requires an explicit annotation list")
        annotations = []
        for item in frame["annotations"]:
            if item.get("label") not in LABELS:
                raise ValueError("Annotations must be steel, visible_copper, or distractor")
            original = item.get("original_class")
            if original is not None and not isinstance(original, str):
                raise ValueError("original_class must be a string when provided")
            annotations.append({"bbox": _box(item.get("bbox"), width, height),
                                "label": item["label"], "original_class": original})
        clean.append({key: frame[key] for key in ("frame_id", "path", "width", "height", "split", "source_id")}
                     | {"annotations": annotations})
    if set(predictions) != seen:
        raise ValueError("Predictions must cover every frame explicitly, with no extra frame IDs")
    clean.sort(key=lambda frame: frame["frame_id"])
    prepared, clean_predictions, gt_counts = [], {}, Counter()
    for frame in clean:
        identity, proposals = frame["frame_id"], []
        if not isinstance(predictions[identity], list):
            raise ValueError("Each prediction result must be a list, including [] when nothing was detected")
        for item in predictions[identity]:
            score = _number(item.get("copper_score"), "copper_score")
            object_score = _number(item.get("object_score"), "object_score")
            if not 0 <= score <= 1 or not 0 <= object_score <= 1:
                raise ValueError("Prediction scores must lie in [0,1]")
            proposals.append({"bbox": _box(item.get("bbox"), frame["width"], frame["height"]),
                              "copper_score": score, "object_score": object_score})
        matches = match_boxes(frame["annotations"], proposals)
        by_prediction = {item["prediction_index"]: item["annotation_index"] for item in matches}
        events = []
        for index, item in enumerate(proposals):
            annotation = by_prediction.get(index)
            label = frame["annotations"][annotation]["label"] if annotation is not None else "unmatched"
            duplicate = label == "unmatched" and any(box_iou(item["bbox"], a["bbox"]) >= IOU_THRESHOLD
                                                      for a in frame["annotations"])
            events.append({"score": item["copper_score"], "label": label, "duplicate": duplicate})
        gt_counts.update(a["label"] for a in frame["annotations"])
        clean_predictions[identity] = proposals
        prepared.append({"frame": frame, "predictions": proposals, "matches": matches, "events": events})
    return {"frames": prepared, "ground_truth_counts": gt_counts,
            "frames_sha256": _hash(clean), "predictions_sha256": _hash(clean_predictions)}


def _threshold(value) -> float:
    value = _number(value, "threshold")
    if not 0 <= value <= REJECT_ALL_THRESHOLD:
        raise ValueError("Threshold must be in [0,1] or the finite reject-all value immediately above 1")
    return value


def _evaluate(prepared: dict, threshold: float) -> dict:
    matrix = [[0, 0, 0], [0, 0, 0]]
    totals, per_frame, distractors = Counter(), [], defaultdict(Counter)
    for item in prepared["frames"]:
        frame, proposals = item["frame"], item["predictions"]
        by_gt = {m["annotation_index"]: m["prediction_index"] for m in item["matches"]}
        frame_counts = Counter()
        for index, annotation in enumerate(frame["annotations"]):
            prediction_index = by_gt.get(index)
            decision = ("missed" if prediction_index is None else
                        "visible_copper" if proposals[prediction_index]["copper_score"] >= threshold else "steel")
            label = annotation["label"]
            frame_counts[f"{label}_{decision}"] += 1
            if label in LABELS[:2]:
                matrix[LABELS.index(label)][("steel", "visible_copper", "missed").index(decision)] += 1
            else:
                distractors[annotation["original_class"] or "unspecified"][decision] += 1
        for event in item["events"]:
            if event["score"] >= threshold:
                frame_counts["copper_alarms"] += 1
                if event["label"] == "unmatched":
                    frame_counts["unmatched_copper_alarms"] += 1
                    frame_counts["duplicate_copper_alarms" if event["duplicate"] else "unknown_background_copper_alarms"] += 1
        frame_counts["predictions"] = len(proposals)
        frame_counts["matched_predictions"] = len(item["matches"])
        frame_counts["unmatched_predictions"] = len(proposals) - len(item["matches"])
        totals.update(frame_counts)
        per_frame.append({"frame_id": frame["frame_id"], "source_id": frame["source_id"],
                          "path": frame["path"], "matches": item["matches"], "counts": dict(frame_counts)})
    steel_correct, steel_flagged, missed_steel = matrix[0]
    copper_as_steel, copper_correct, missed_copper = matrix[1]
    steel, copper = sum(matrix[0]), sum(matrix[1])
    copper_alarms = totals["copper_alarms"]
    frame_count = len(prepared["frames"])
    counts = {"ground_truth_steel": steel, "ground_truth_copper": copper,
              "ground_truth_distractor": prepared["ground_truth_counts"]["distractor"],
              "steel_correct": steel_correct, "steel_falsely_flagged": steel_flagged,
              "copper_correct": copper_correct, "copper_classified_steel": copper_as_steel,
              "missed_steel": missed_steel, "missed_copper": missed_copper,
              "missed_distractor": totals["distractor_missed"],
              "copper_false_negatives": copper_as_steel + missed_copper,
              "copper_alarms": copper_alarms, "false_copper_alarms": copper_alarms - copper_correct,
              "distractor_copper_flags": totals["distractor_visible_copper"],
              **{key: totals[key] for key in ("predictions", "matched_predictions", "unmatched_predictions",
                  "unmatched_copper_alarms", "duplicate_copper_alarms", "unknown_background_copper_alarms")}}
    return {"schema_version": 1, "frame_count": frame_count, "threshold": threshold,
            "frames_sha256": prepared["frames_sha256"], "predictions_sha256": prepared["predictions_sha256"],
            "matching_rule": MATCHING_RULE, "iou_threshold": IOU_THRESHOLD,
            "confusion_matrix": matrix, "confusion_matrix_rows": list(LABELS[:2]),
            "confusion_matrix_columns": ["steel", "visible_copper", "missed"], "counts": counts,
            "copper_recall": copper_correct / copper if copper else None,
            "copper_precision": copper_correct / copper_alarms if copper_alarms else None,
            "steel_fpr": steel_flagged / steel if steel else None,
            "steel_detection_recall": (steel - missed_steel) / steel if steel else None,
            "copper_detection_recall": (copper - missed_copper) / copper if copper else None,
            "target_detection_coverage": (steel + copper - missed_steel - missed_copper) / (steel + copper) if steel + copper else None,
            "background_false_alarms": counts["unmatched_copper_alarms"],
            "unknown_background_copper_alarms": counts["unknown_background_copper_alarms"],
            "duplicate_copper_alarms": counts["duplicate_copper_alarms"],
            "distractor_copper_flags": counts["distractor_copper_flags"],
            "false_copper_alarms_per_frame": counts["false_copper_alarms"] / frame_count,
            "background_false_alarms_per_frame": counts["unmatched_copper_alarms"] / frame_count,
            "distractors_by_original_class": {name: dict(value) for name, value in sorted(distractors.items())},
            "per_frame": per_frame,
            "denominator_note": "Recall and steel FPR use every ground-truth copper/steel object, including missed detections. Copper precision uses every copper alarm, including wrong steel, distractors, duplicate and unassigned alarms. Missing steel is reported separately, never described as correctly classified steel.",
            "background_note": "background_false_alarms includes all unmatched copper predictions; duplicate overlaps and unknown/unannotated background are separate components. Annotation completeness is not established by this metric.",
            "target_definition_note": "Metrics follow the supplied ground-truth label mapping. Visible copper is the target class in the scored SteelDS samples; steel is the other supplied class. Labels describe visible material annotations, not chemical assays. Other-class flags, when such labels are supplied, are reported separately and must not be interpreted as chemical absence or physical sorting outcomes.",
            "fingerprint_note": "frames_sha256 identifies the supplied frame metadata and annotations; it does not verify image bytes or physical independence."}


def evaluate_frames(frames, predictions, threshold: float) -> dict:
    """Evaluate every supplied frame at one already-frozen cutoff."""
    return _evaluate(_prepare(frames, predictions), _threshold(threshold))


def select_threshold(frames, predictions, cap: float = 0.05) -> dict:
    """Select on validation only, matching once and sweeping score groups.

    Primary: copper recall under the steel-FPR cap. Ties: fewer total false
    copper alarms (steel, distractor, unmatched), then the higher threshold.
    """
    frames = list(frames)
    if not frames or any(frame.get("split") != "val" for frame in frames):
        raise ValueError("Threshold selection requires nonempty validation-only (val) frames")
    cap = _number(cap, "cap")
    if not 0 <= cap <= 1:
        raise ValueError("Steel false-positive-rate cap must be in [0,1]")
    prepared = _prepare(frames, predictions)
    gt = prepared["ground_truth_counts"]
    if not gt["steel"] or not gt["visible_copper"]:
        raise ValueError("Threshold selection requires both steel and copper ground truth")
    groups = defaultdict(Counter)
    for item in prepared["frames"]:
        for event in item["events"]:
            groups[event["score"]][event["label"]] += 1
    cumulative = Counter()
    best_rank, best_threshold = (0.0, 0, REJECT_ALL_THRESHOLD), REJECT_ALL_THRESHOLD
    eligible_count = 1
    for threshold in sorted(groups, reverse=True):
        cumulative.update(groups[threshold])
        if cumulative["steel"] / gt["steel"] <= cap:
            eligible_count += 1
            tp = cumulative["visible_copper"]
            false_alarms = sum(cumulative.values()) - tp
            rank = (tp / gt["visible_copper"], -false_alarms, threshold)
            if rank > best_rank:
                best_rank, best_threshold = rank, threshold
    return {"schema_version": 1, "selection_split": "val", "test_used_for_selection": False,
            "threshold": best_threshold, "steel_fpr_cap": cap,
            "candidate_count": len(groups) + 1, "eligible_count": eligible_count,
            "objective": "Maximum all-GT copper recall subject to steel FPR cap; then fewer total false copper alarms; then higher threshold",
            "matching_rule": MATCHING_RULE, "rank": list(best_rank),
            "validation_metrics": _evaluate(prepared, best_threshold),
            "comparison_note": "The same cap does not imply the same achieved steel false-positive rate."}


def paired_comparison(primary: dict, baseline: dict) -> dict:
    """A descriptive paired comparison; no statistical-significance claim."""
    if (primary.get("frames_sha256") != baseline.get("frames_sha256") or not primary.get("frames_sha256")
            or primary.get("frame_count") != baseline.get("frame_count")
            or primary.get("matching_rule") != baseline.get("matching_rule")
            or primary.get("iou_threshold") != baseline.get("iou_threshold")):
        raise ValueError("Paired comparison requires identical frame annotations and matching rules")
    for label in ("ground_truth_steel", "ground_truth_copper", "ground_truth_distractor"):
        if primary["counts"][label] != baseline["counts"][label]:
            raise ValueError("Paired comparison ground-truth denominators differ")
    if any(item.get(key) is None for item in (primary, baseline) for key in ("copper_recall", "steel_fpr")):
        raise ValueError("Paired comparison requires both steel and copper ground truth")
    criteria = {"copper_recall_strictly_higher": primary["copper_recall"] > baseline["copper_recall"],
                "steel_fpr_not_higher": primary["steel_fpr"] <= baseline["steel_fpr"],
                "unmatched_copper_alarms_not_higher": primary["background_false_alarms"] <= baseline["background_false_alarms"]}
    return {"meaningful_strict_win": all(criteria.values()), "criteria": criteria,
            "frame_count": primary["frame_count"], "frames_sha256": primary["frames_sha256"],
            "primary_threshold": primary["threshold"], "baseline_threshold": baseline["threshold"],
            "copper_recall_delta": primary["copper_recall"] - baseline["copper_recall"],
            "steel_fpr_delta": primary["steel_fpr"] - baseline["steel_fpr"],
            "background_false_alarms_delta": primary["background_false_alarms"] - baseline["background_false_alarms"],
            "distractor_copper_flags_delta": primary["distractor_copper_flags"] - baseline["distractor_copper_flags"],
            "scope": "Strict descriptive win on the stated copper-recall/steel-FPR/unmatched-alarm criteria only. Distractor flags are reported separately. This is not statistical significance, equal achieved FPR, tracking accuracy or physical-piece recovery."}
