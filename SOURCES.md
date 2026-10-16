# Evidence and asset provenance

## Selectable video comparison

`model-demo/catalog.json` records all 38 playback files with original source links, CC BY 4.0 credits, viewing transformations and exposure history. `model-demo/ATTRIBUTION.txt` carries the complete recording credits for SteelDS, the iron-ore laboratory conveyor, RGB–LWIR consumer-waste footage and the C&D author demonstration. The author demonstration retains its embedded graphics; Ferrosift and reference overlays are presented in separate saved sample panels.

The preserved recorded inference covers 2,720 identical decoded frame pairs. Scores use 979 labeled frames across seven SteelDS recordings, including training and previously exposed development/diagnostic material. The other 31 recordings have no verified scores. Frame-level label evidence includes 843 direct content alignments and 136 additional ordinal/provenance joins supported by recording-level checks. This is separate from the earlier development result below. The run record and calculation source are in `model-demo/method/`; verified training facts are in `training/verified-facts.json`. The M02 presentation revision does not retrain models or rerun inference.

The synchronized replay holds each exact saved image and its native model alarms until the next saved timestamp. `recorded-cv/cumulative-metrics.json` projects previously evaluated per-frame counts into a minimal presentation file; it does not rescore public boxes. Cumulative recall sums correctly flagged copper annotations and all labeled copper annotations at or before the replay time. It is unavailable until the denominator is positive, changes only at evaluated sample times, and ends at the frozen clip aggregates. Six scored clips favor the candidate and one favors the reference. No score is supplied for the other 31 clips. These are repeated annotation observations, not continuous video accuracy, unique pieces or physical recovery.

## Ferrosift conveyor result

The homepage reports the historical selected development configuration: Ferrosift YOLO26s detected 7,081 of 7,535 visible-copper annotations (93.9748%, displayed as 94.0%); the YOLO11s reference detected 6,448 (85.5740%, displayed as 85.6%). The difference is 633 annotation detections or 8.4008 percentage points, displayed as 8.4.

The cohort contains 1,522 development frames used in model/configuration and threshold selection. Repeated appearances count as repeated annotations. Candidate and reference produced 361 and 364 steel matches plus 3 and 1 unmatched copper alarms, respectively: 364 and 365 non-copper alarms against 36,563 steel annotations, approximately the frozen 1% conservative development alarm-burden cap. This quantity is distinct from conventional false-positive rate and physical steel loss.

This is a comparison of complete selected model configurations, with architecture, training and selection effects not isolated. It does not establish untouched-holdout performance, a commercial-sorter advantage, physical recovery or live sorting. Source exposure and exact thresholds remain in `engineering/downloads/historical_video_evidence_audit.json`; frozen methods are in `engineering/downloads/benchmark_verification_contract.json`. The homepage links these details in its accessible methods section.

## Engineering status

M02 is a proposed retrofit sensing module with a separate grey host-conveyor reference. Its 180 mm guided lane is a mechanical experimental passage on a 600 mm host belt, not validated sensor coverage. Two sequential stations illustrate vertical and transverse excitation with six unoptimized functional windings (two transmit and four candidate receive windings). The refined bobbins, housings, terminals, glands and fasteners are source CAD geometry; their detail does not imply qualified components or manufacturing readiness. RGB, optional exterior 3D, acquisition, calibration, host encoder association and routing interfaces remain a research integration program. Dimensions and exports are preliminary and not fabrication-certified.

The complete conveyor IR01-R1 is preserved separately in project history, including its unresolved receiving-containment hold. It is not the current module offer. Host feeding, downstream ejection and collection are outside M02 and need their own engineering and physical validation. The recorded CV comparison and reader-assumption calculator retain their original evidence and units.

## Matched comparison and illustrative economics

Official vendor descriptions checked on 15 October 2026 establish existing capabilities: [STEINERT KSS CLI](https://steinertglobal.com/us/sorting-systems/sensor-sorting/combined-sensor-sorting-systems/steinert-kss-cli-1/) combines colour, laser 3D and induction; [TOMRA’s 14 April 2026 FINDER announcement](https://www.tomra.com/en-gb/waste-metal-recycling/media-center/news/2026/tomra-recycling-launches-the-new-finder) describes PCB sorting and insulated-wire recovery. These sources do not establish that competitors lack multiple sensing directions. Ferrosift must demonstrate useful incremental information and better routing against strong simpler baselines and the incumbent process at matched throughput, output purity and total cost.

The fixed illustration assumes 1,000 t annual feed, 10% contained Cu, physical Cu recovery of 80% versus 85%, US$8,000 payable value per extra recovered Cu tonne, and US$20,000 extra annual operating cost. This gives 100 t contained Cu, 80 versus 85 t recovered, and 5 extra t × US$8,000/t − US$20,000 = US$20,000/year before capital costs, financing and tax. Payable value is an invented assumption after assumed buyer deductions. The example is not a measured outcome, market quote, module capacity, profit, ROI or payback. Other-metal credits and unstated route costs are outside this simplified example. No CV score is converted into recovery or money.

## Module rationale and longer horizon

The public methods section links primary research on moving-belt induction, optical/inductive fusion and controlled PCB inspection, plus incumbent vendor descriptions. Generic sensor fusion already exists. Ferrosift proposes testing geometry-conditioned directional and frequency response sequences on independent PCB/e-scrap lots against strong simpler baselines. No source validates the exact proposed module or establishes direct elemental assay.

The homepage's orientation hypothesis is consistent with [Abdel Rehim et al.'s directional measurement study](https://pure.manchester.ac.uk/ws/portalfiles/portal/47916570/FULL_TEXT.PDF), already linked in the Explorer, and [Ledger and Lionheart's primary-author analysis](https://arxiv.org/html/1906.00382v1), which gives the rotation rule for a magnetic polarizability tensor (§7). [Zhao et al.'s in-line scanning study](https://research.manchester.ac.uk/en/publications/determining-the-electromagnetic-polarizability-tensors-of-metal-o-2/) also identifies the dependence on coil geometry and measurement protocol. These support the statement that orientation can change a fragment's response. They do not establish an orientation-loss percentage, complete tensor recovery from the proposed two field directions, unique copper identification, or improved classification by this module. More reliable classification remains a hypothesis to test.

The 2045 horizon is aspirational. Published magnetic manipulation and detumbling work describes constrained laboratory experiments or simulations, not Ferrosift flight evidence. Any orbital application would require a separate actuation architecture, stand-off/force/torque testing, power and thermal engineering, reaction control, safe proximity operations, a mission partner and flight qualification. Detumbling concerns relative rotation, not stopping orbital motion. The dated, source-specific boundaries and accessible primary links are on the homepage under Sources.

## Beginner guide

The optional beginner guide uses original schematics and captions. The induction explanation is grounded in [Feynman Lectures II–17](https://www.feynmanlectures.caltech.edu/II_17.html) and [OpenStax University Physics 13.5](https://openstax.org/books/university-physics-volume-2/pages/13-5-eddy-currents): changing magnetic fields can drive circulating electric fields and currents in conductors, which alter a receiving coil's electrical response. The guide is not a field solution, interior elemental map, tracking demonstration or measured sorting result. Its record association and routing sequence describe the proposed Ferrosift architecture.

The circulating currents are induced within conductive scrap; they do not enter it from the air or cover. The proposed nonconductive sensing window is distinct from a metal shield. The receiver/readout inset shows a function, not a coil location or orientation. The directional studies above also explain why response depends on geometry: moving or rotating the same piece can change its response without changing its copper content, and a stronger response alone is not a copper assay. Optional exterior height/pose sensing may help account for distance and orientation, subject to calibration with known samples and testing; it does not reveal hidden metal depth or provide automatic calibration. The proposed combination of appearance, optional surface geometry and directional induction informs routing, not an internal elemental map. A piece ID is a software label; encoder and tracking association must link the readings to that piece, and the label alone does not establish correct association.

## Industry evidence

The 2024 Global E-waste Monitor from UNITAR / ITU reports 2022 estimates of 62 million tonnes generated, 22.3% documented formal collection/recycling, and US$62 billion in recoverable natural resources left unaccounted for. The homepage computes the complement (77.7%) and rounds the two corresponding tonnages (13.8 and 48.2 million). These are not audited company losses, and the complement is not all landfill.

https://unitar.org/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling

TOMRA's manufacturer-published customer case studies describe PNW Metal's loss of smaller metals to landfill and expanded Zorba product offerings, and Premier Surplus's approximately 95% first-pass material recovery. Product offerings growing fourfold is not a claim of fourfold recovery. Neither source provides a dollar value for company losses. These examples are unrelated to Ferrosift's own performance. In the Premier article, the 75–90% figure is a consultant expectation; about 95% is the operator's report for its specific e-scrap line, downstream of a Javelin eddy-current separator. Neither is a universal baseline or multilayer-PCB copper-recovery rate. The hypothetical operator example uses independent assumptions. Further processing described in the article concerns ejected products, not an assertion that the unrecovered share is subsequently recovered.

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
