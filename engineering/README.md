# Ferrosift engineering program — IR01-R1

The Engineering Explorer connects the conveyor's sensing, tracking and separation stages in an interactive CAD view. Open `../explorer.html#machine` to inspect the assembly and download its editable source, drawings and component inventory.

The assembly contains 494 named solids, 204,200 triangles and ten A3 drawing sheets. `conveyor-assembly.json`, STEP, BREP and GLB are generated from the same CAD solids. `downloads/manifest.json` records exact bytes and hashes, the two-stage flow and design status.

## Primary files

- `downloads/Ferrosift_Investor_Engineering_Drawings_IR01.pdf`: ten A3 sheets, including four solid sections.
- `downloads/Ferrosift_Engineering_Source_v01.zip`: editable CadQuery source, parameters, design basis and source QA.
- `downloads/Ferrosift_Editable_Drawings_and_BOM_IR01.zip`: editable SVG sheets, projection scripts, component inventory, assumptions and tolerance register.
- `downloads/integration_manifest.json` and `assembly_manifest.json`: assembly identities, physical flow and current design holds.
- `downloads/receiving_capture_hold.json`: receiving-containment analysis and the open capture hold.
- `downloads/historical_video_evidence_audit.txt`: conveyor evidence, source exposure and historical development context.
- `downloads/benchmark_verification_contract.json`: model identity, frozen settings and evaluation methods.

## Design and next engineering steps

The design uses a primary pneumatic split toward concentrate and balance. A separate gate on the balance path routes groups or clearing windows into a review bin. The gate's operating sequence inhibits feed, clears the path, moves the gate and verifies position before feed resumes.

Receiving containment is the next geometry priority. An analytical gravity-only point launch at 1.5 m/s from an outer lane clears a converging wall by about 70 mm. The side guards do not capture that interior path. The capture hold remains unresolved; no operating speed or full-width capture route is approved.

The program also covers actuator and valve selection, optical coverage, induction-coil design, encoder synchronization, structural loads, drive sizing, guarding and interlocks. Physical impulse/trajectory trials and weighed output-stream testing will establish recovery and purity.

## Technical status

The CAD is preliminary and not for fabrication or a certified machine release. Actuator and switch bodies are design envelopes; the induction cassette reserves space for sensor development. Viewer motion and markers explain the intended sequence. The component inventory counts CAD parts; procurement choices, masses, costs and manufacturing tolerances require further engineering approval.

The historical visual-detection comparison is separate from machine validation. Exact counts, steel alarms, source exposure and development-selection scope are accessible through `../index.html#technical-methods` and the evidence downloads.

The preserved IR01-R1 public release is commit `5c890035c539e892ef8b0298a08997b7db5922a5`; its earlier predecessor is `af611cd885e5e643c7ac583c27395051238ccc7f`. The two downloads retaining the `Ferrosift_Conveyor_Concept_` names are compatibility aliases containing the same bytes as the current IR01 drawing PDF and source ZIP. This local candidate keeps those engineering assets unchanged.
