# Evidence and asset provenance

## Selectable video comparison

`model-demo/catalog.json` records all 38 playback files with original source links, CC BY 4.0 credits, viewing transformations and exposure history. `model-demo/ATTRIBUTION.txt` carries the complete recording credits for SteelDS, the iron-ore laboratory conveyor, RGB–LWIR consumer-waste footage and the C&D author demonstration. The author demonstration retains its embedded graphics; Ferrosift and reference overlays are presented in separate saved sample panels.

New local inference covers 2,720 identical decoded frame pairs. Scores use 979 labeled frames across seven SteelDS recordings, including training and previously exposed development/diagnostic material. The other 31 recordings have no verified scores. Frame-level label evidence includes 843 direct content alignments and 136 additional ordinal/provenance joins supported by recording-level checks. This is separate from the earlier development result below. The run record and calculation source are in `model-demo/method/`; verified training facts are in `training/verified-facts.json`.

## Ferrosift conveyor result

The homepage reports the historical selected development configuration: Ferrosift YOLO26s detected 7,081 of 7,535 visible-copper annotations (93.9748%, displayed as 94.0%); the YOLO11s reference detected 6,448 (85.5740%, displayed as 85.6%). The difference is 633 annotation detections or 8.4008 percentage points, displayed as 8.4.

The cohort contains 1,522 development frames used in model/configuration and threshold selection. Repeated appearances count as repeated annotations. Candidate and reference produced 361 and 364 steel matches plus 3 and 1 unmatched copper alarms, respectively: 364 and 365 non-copper alarms against 36,563 steel annotations, approximately the frozen 1% conservative development alarm-burden cap. This quantity is distinct from conventional false-positive rate and physical steel loss.

This is a comparison of complete selected model configurations, with architecture, training and selection effects not isolated. It does not establish untouched-holdout performance, a commercial-sorter advantage, physical recovery or live sorting. Source exposure and exact thresholds remain in `engineering/downloads/historical_video_evidence_audit.json`; frozen methods are in `engineering/downloads/benchmark_verification_contract.json`. The homepage links these details in its accessible methods section.

## Engineering status

IR01-R1 CAD, drawings and source files are preliminary and not for fabrication. Receiving containment has an unresolved outer-lane capture hold, with the analysis in `engineering/downloads/receiving_capture_hold.json`. The website's model comparison, illustrative machine motion and operator planning scenario have separate purposes and units.

## Industry evidence

The 2024 Global E-waste Monitor from UNITAR / ITU reports 2022 estimates of 62 million tonnes generated, 22.3% documented formal collection/recycling, and US$62 billion in recoverable natural resources left unaccounted for. The homepage computes the complement (77.7%) and rounds the two corresponding tonnages (13.8 and 48.2 million). These are not audited company losses, and the complement is not all landfill.

https://unitar.org/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling

TOMRA's manufacturer-published customer case studies describe PNW Metal's loss of smaller metals to landfill and expanded Zorba product offerings, and Premier Surplus's approximately 95% first-pass material recovery. Product offerings growing fourfold is not a claim of fourfold recovery. Neither source provides a dollar value for company losses. These examples are unrelated to Ferrosift's own performance.

- PNW, May 2021: https://www.tomra.com/en-ie/waste-metal-recycling/media-center/customer-stories/pnw-metal-recycling-inc
- Premier, March 2021: https://www.tomra.com/en-gb/waste-metal-recycling/media-center/customer-stories/premier-surplus

## Real photographs

All four images are photographs. No AI-generated imagery is included.

| Local asset | Photographer / source | License and changes |
|---|---|---|
| `industrial-context.jpg` | Rose Galloway Green, Ferrybridge feedstock hall, March 2023. https://unsplash.com/photos/a-large-pile-of-garbage-in-a-large-building-30OuFAgqnFs | Unsplash License https://unsplash.com/license; resized/compressed, CSS crop and overlay. This is energy-from-waste industrial context, not a Ferrosift facility or e-waste sorting installation. |
| `broken-circuit-board.jpg` | Guinnog, January 2011. https://commons.wikimedia.org/wiki/File:Brokencircuitboard2011.jpg | CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0/; resized/compressed, CSS crop and overlay. This image adaptation is available under the same license. |
| `circuit-board.jpg` | Vishnu Mohanan, June 2020. https://unsplash.com/photos/close-up-of-dark-blue-circuit-board-pfR18JNEMv8 | Unsplash License; resized/compressed, CSS crop and overlay. |
| `earth-horizon.jpg` | NASA / Expedition 70, ISS070-E-1178, September 29, 2023. https://science.nasa.gov/earth/earth-observatory/sunrise-from-the-station-152259/ | NASA astronaut photography, public domain in the United States; resized/compressed, CSS crop and overlay. No endorsement implied. |

## Font

D-DIN, Datto / Monotype, SIL Open Font License 1.1. https://github.com/amcchord/datto-d-din

The license and font log are distributed alongside the fonts in `assets/fonts/`.
