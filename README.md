# Ferrosift — conveyor intelligence and engineering

Ferrosift connects visual material detection with the engineering of physical separation. This static website brings the model comparison, conveyor design, engineering program and operator planning scenario together.

Serve this directory over HTTP and open `index.html`. Explore `model-demo/` for the conveyor video comparison and `explorer.html` for the machine, teams we're building, planning scenario and engineering downloads. The `engineering/` route opens the machine view. There is no build step or server-side inference.

The comparison now puts synchronized saved Ferrosift/reference views first, with the selected clip's scores immediately underneath. Shared playback and seeking follow the source recording clock; images and boxes update at the actual saved sample times. Original footage and source details remain available below the comparison.

`sensor-concept/` explains a proposed experiment on one tracked fragment through RGB, optional exterior 3D geometry, and sequential under-belt and side-coil measurements. Explorer's **Research cell** control adds a separate procedural 3D overlay. These are labeled research schematics: no measured sensor performance, buildable coil design or hidden copper map is asserted. Authoritative CAD and engineering downloads are unchanged.

The video picker contains 38 recordings from four datasets and 2,720 saved comparison frames. Both exact model checkpoints ran on the same decoded pixels. Seven clips have scores on 979 verified labeled frames; the other 31 show “Accuracy unavailable: no verified labels.” The selected-clip metric is copper-annotation routing recall under the frozen all-proposal matcher. Source credits, exposure history, model hashes, thresholds and runtime are included with the comparison. `model-demo/method/` contains the calculation source and run provenance.

On our labeled conveyor evaluation, Ferrosift detected 94.0% of copper annotations versus 85.6% for the YOLO11s reference, an 8.4 percentage-point improvement. The homepage's **Methods, assumptions & design status** section gives the exact counts and comparison scope. These historical results come from the development cohort used to select the model configuration and operating point.

## Engineering files

The current IR01-R1 assembly contains 494 named solids and 204,200 triangles, with ten A3 drawing sheets. STEP, BREP, GLB and browser geometry come from the same editable CadQuery source. `engineering/downloads/manifest.json` records exact engineering-file sizes and checksums; `engineering/README.md` describes the file set and design review.

## Methods and design status

The historical candidate found 7,081 of 7,535 copper annotations; the reference found 6,448. Repeated frames count repeated annotations. The selected configurations combine architecture, training and model-selection effects. Their approximately 1% development alarm-burden cap remains a selection constraint, distinct from physical steel loss or a field guarantee. Source exposure, thresholds, steel alarms and exact counts are recorded in the public conveyor evidence excerpt and evaluation contract.

The CAD is preliminary and not for fabrication. Receiving containment has an unresolved capture hold, documented in `engineering/downloads/receiving_capture_hold.json`. No operating speed or full-width capture route is approved. Actuator selection, sensing coverage, controls, guarding and physical recovery trials remain part of the engineering program.

Source playback, prediction cadence, measured inference speed and schematic belt motion are separate quantities. New operating conditions require their own evaluation. The **Planning scenario** uses explicit reader-entered assumptions for recovery, prices and costs.

This release builds on the preserved IR01-R1 website. Model development is described in `training.html`; engineering provenance is retained in the engineering manifests. The five expandable programs include research questions, proposed mechanisms, concept sketches, measurable gates and primary-source references.
