# Ferrosift recorded video comparison — method source

The website shows saved predictions from Ferrosift's custom-trained vision model (fine-tuned YOLO26s at 640 pixels) and the fine-tuned YOLO11s reference. Both models received the same decoded RGB frame for every comparison. No model was trained, tuned or selected during this video comparison.

## Run and label coverage

- 38 clips, 2,720 sampled viewing-video frames: one frame per integer second, plus the initially verified annotation frame times.
- 979 labeled sampled frames in seven SteelDS clips, containing 5,969 copper and 26,318 steel annotations.
- 843 label mappings have individual image-content alignment. Another 136 use audited publisher frame ordinals, original and converted label hashes, and recording-level content support; those additions did not receive individual publisher-image pixel comparison.
- Labels were added to 136 existing predictions after inference. The raw inference records remain unchanged. The remaining 31 clips have no verified scoring labels.

These are repeated frame-object observations from development or previously exposed recordings. They are not 979 independent pieces or 38 independent holdouts. Missing labels are never treated as empty-belt negatives. Recorded playback and processing measurements do not establish operating speed or physical sorting performance.

## Exact settings and scores

The candidate copper threshold is 0.8073331713676453; the reference threshold is 0.9101877808570862. Both use 640-square preprocessing, FP32, batch size 1, confidence floor 0.001, class-aware NMS at IoU 0.7, maximum 1,000 detections, and no augmentation. The runtime verifies the common NMS backend. Model identities, complete settings and actual package versions are in [run_manifest.json](run_manifest.json).

The scorer first assigns all positive-area detector proposals to annotations without inspecting class or score: maximum matching cardinality at IoU ≥ 0.5, then maximum summed IoU. It then applies the frozen copper thresholds. Copper-annotation routing recall is correctly flagged copper annotations divided by all copper annotations in the labeled samples, including misses. Steel matches and unmatched alarms remain visible. Native zero-area boxes below the copper thresholds are preserved in the private raw evidence; they cannot overlap valid annotations or become copper alarms. All 376 such rows were audited.

This method differs from the historical site's alarm-only greedy routing. Earlier 93.97% and 85.57% development results are not assigned to these clips. The new run used local CPU Torch 2.14.1 / torchvision 0.29.1; the earlier model bundle used Torch 2.8.0 / torchvision 0.23.0. This is declared fresh inference, not a claim of numerical reproduction across runtimes.

Public boxes show native copper-class alarms above the frozen threshold. Confidence is a model output, not an accuracy score. Display JPEGs were encoded at quality 60 from the exact inference frames after prediction, at unchanged native dimensions. Compression does not change the saved model inputs, boxes or scores.

## Source snapshots

- [generate_predictions.py](generate_predictions.py): matched decoding, model identity checks, frozen inference, raw caching and initial 843-frame scoring.
- [detection_evaluation.py](detection_evaluation.py): the class- and score-blind assignment and metric calculation.
- [rescore_revision1.py](rescore_revision1.py): the audited 979-frame label join and rescoring of existing outputs.
- [reencode_display_samples.py](reencode_display_samples.py): display-only JPEG encoding from verified input pixels.

The inference and processing files are exact audit snapshots of scripts executed in the Ferrosift project layout. The public evaluator has one presentation-only adaptation: its returned target-definition note describes the supplied SteelDS mapping; all algorithmic code is unchanged. The manifest records both the executed and public evaluator hashes. They reference separately supplied licensed datasets, model bundles and private run receipts; they are not a standalone one-command evaluation package. Model weights, private investor documents and private raw caches are not distributed here. The manifest records source and model hashes so the executed components remain identifiable.

## Source and licensing

The inference integration and accompanying evaluation source are supplied under [AGPL-3.0](AGPL-3.0.txt). Preserve applicable notices and source obligations. See [UPSTREAM_NOTICES.md](UPSTREAM_NOTICES.md). The four footage sources retain their respective licenses and attribution in the video catalog; this source-code license does not replace those licenses. Original authors do not endorse Ferrosift.
