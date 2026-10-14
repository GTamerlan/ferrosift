# Conveyor concept viewer

Concept-only release prepared 13 October 2026 and cleared by evidence review. This viewer does not run inference or machine control. The frozen export contains 380 named solid components and 108,124 triangles.

## Files and integration

- `index.html`: full assembly workbench and accessible design-basis schedule.
- `conveyor-viewer.js`: dependency-free WebGL loader, cached CAD batches, controls, triangle picking and illustrative motion.
- `conveyor-details.js`: optional component inspection panels for optical sensing, induction, encoder tracking and pneumatic sorting.
- `conveyor-viewer.css`: scoped styles shared with `../explorer.html`.
- `conveyor-assembly.json`: byte-identical copy of the final CAD export. The viewer reports missing/invalid geometry honestly and falls back to the process schematic.
- `conveyor-schematic.svg`: accessible process diagram; explicitly not scaled chute geometry or a fabrication drawing.
- `legacy-procedural-renderer.js`: original renderer source retained for inspection; not executed by the new page and not represented as CAD.
- `verify-viewer.cjs`: local checks for geometry validation, transforms, calculated travel and group/window sequencing.
- `downloads/`: final STEP, GLB, six-sheet PDF and an editable-source ZIP. `manifest.json` records sizes and SHA-256 checksums. The source ZIP contains CAD Python/specification JSON, design-basis sources/calculations, the tested dependency lock and research briefs; it excludes virtual environments, the unexecuted Fusion probe and private model data.

The existing six narrative stages retain their IDs. The synchronous `window.ferroScene` interface remains available before the existing site UI initializes: `update`, `pause`, `explode`, `orbit`, `reset`, `halftone` (compatibility no-op), `getState`. The loader later marks `available` true only after a valid assembly is uploaded to WebGL. `setSpeed` and `setStage` support the workbench. `inspectTopic`, `selectPart` and `clearTechnical` drive the optional technical panel. `getState().renderStats` exposes draw counts, shadow passes, canvas scale and CPU submission timing for local profiling. The former recorded steel/copper `model-demo/` files and `#vision-demo` panel are outside this viewer.

Serve the repository over local HTTP; opening the HTML with `file://` cannot reliably fetch its JSON. All geometry, scripts and styles are self-hosted; no new runtime CDN or build pipeline is introduced.

## Mesh contract

```json
{
  "schemaVersion": 1,
  "units": "mm",
  "coordinateSystem": "x-longitudinal,y-transverse,z-up",
  "provenance": {
    "kind": "cad-tessellation",
    "description": "Actual exporter and validation result, supplied by the CAD pipeline"
  },
  "objects": [{
    "id": "unique-stable-id",
    "name": "Readable component name",
    "description": "Function, envelope limitations and unresolved choices",
    "category": "frame",
    "color": "#87939d",
    "opacity": 1,
    "vertices": [0, 0, 0, 100, 0, 0, 0, 100, 0],
    "normals": [0, 0, 1, 0, 0, 1, 0, 0, 1],
    "indices": [0, 1, 2],
    "position": [0, 0, 0],
    "rotation": [0, 0, 0],
    "explode": [0, 0, 0]
  }]
}
```

Coordinates and `position`/`explode` are millimetres. X increases toward the discharge, Y is across the belt and Z is up. Vertices may be in assembly coordinates with identity transforms, or local coordinates with optional `position` and Euler `rotation` in radians. Rotation order is X, then Y, then Z. Normals are optional and are computed if absent. Indexed triangles are required. Meshes are not welded or repaired by the viewer. More than 65,535 vertex indices use the standard WebGL extension, with expanded triangles as a fallback.

`color` accepts six-digit hex or RGB arrays in the range 0–1 or 0–255. Optional `opacity` is clamped to 0–1. `default_hidden: true` keeps optional envelopes hidden initially; selecting the named component or enabling its category reveals it. Display names and descriptions are inserted as text, not executable markup.

Optional per-object animation uses a **local-coordinate pivot**, prior to `position`/`rotation` and explode transforms:

```json
{"type":"roller","axis":"y","pivot":[3000,0,900],"radius":100,"direction":1}
```

```json
{"type":"review-gate","axis":"z","pivot":[3400,0,740],"angle":0.45,"balanceAngle":-0.45}
```

A `belt` animation metadata object may carry a direction vector. Belt surface marks move with integrated travel while the loop geometry stays fixed; roller motion uses integrated travel, so changing speed does not teleport the assembly or material. A gate animation is a visual explanation only. Its angle and phase duration are not commissioning values. Optional top-level `routes` maps `target`, `balance` and `review` to arrays of `[x,y,z]` waypoints in assembly coordinates. Waypoints must come from the concept layout and are drawn as explicitly illustrative paths, not simulated trajectories. Without paths, colored samples stop at the lip.

## Controls and evidence boundaries

- Pause freezes sample and mechanical motion; reduced-motion preferences pause initially and on changes.
- Pointer orbit is enabled by default. Drag or use the arrow keys to orbit; wheel, pinch and `+`/`−` zoom the focused workbench view. The Explorer uses Ctrl+wheel so ordinary scrolling continues its tour. Camera presets and explode transitions ease over time; reduced motion applies them immediately. Disable Orbit in Inspect tools to restore canvas scrolling.
- Explode offsets categories for inspection. It is not an assembly/disassembly procedure.
- Section removes the near Y<0 half without generating caps. It is labelled an open, uncapped section.
- Dimensions show the v0 study datums in mm. The SVG overlay remains legible without altering the source mesh.
- Service space shows exported `serviceZones` polygons that account for the component projections. Each zone has `{id, points: [[x,y,z], ...], label}`. The control stays disabled when the CAD pipeline has not supplied these envelopes. No compliance clearance is claimed.
- Category checkboxes control visibility; named component selection highlights an individual object.
- Overview, Optical, Induction, Tracking and Routing presets show closer technical views. The induction label identifies the cassette below the belt, not a field simulation or selected coil design.
- Component lists, dimension/service tools and evidence are closed optional panels. Route labels and explanatory markers appear only when Routing annotations is enabled.
- Compatible static parts are batched by material, subsystem, visibility and explode offset; original named meshes remain available for exact triangle picking and component inspection. A neutral material palette, approximate studio reflections and a cached 1024px native depth-texture shadow map provide studio-floor contact shadows. Machine surfaces use clean studio lighting without self-shadow sampling. Browsers without the depth-texture extension retain the assembly and lighting with shadows omitted. These are display effects on the unchanged CAD meshes, not measured material properties. The floor is display staging, not added machine hardware. Four shadow-filter taps, a maximum 20 Hz shadow refresh during geometry changes, a 1.4 DPR cap and a 1.8-million-pixel budget limit rendering load. A persistent slow-frame run can lower rendering scale; CAD geometry stays unchanged.
- Click a visible CAD component or a related-component button to inspect it. Optical rays follow the exported 300 mm X × 400 mm Y example footprint. The induction outline is reserved enclosure geometry, not calibrated coverage or an electromagnetic field. Tracking markers and nozzle labels are explanatory.
- Optional depth-device envelopes are hidden initially and shown together only on explicit selection. Mounting provisions remain visible. Closing inspection restores the default optional visibility.
- Kinematics and camera easing use elapsed seconds. An interruption longer than 250 ms is treated as a pause rather than a catch-up jump. Motion is verified at synthetic 10/30/60/120 Hz; these rates are test inputs, not a throughput claim.

Moving radius-8 mm octahedra on a single illustrative centerline are synthetic explanatory markers. Their maximum extent matches the 8 mm path-clearance check; no full-width coverage or loading pattern is implied. They are not PCB detections, feed-distribution samples or predicted actuator outcomes. The routing illustration inserts feed-inhibited clear phases before gate changes. Review applies to groups/windows on the **balance path only**; it cannot recover material already ejected into concentrate. Target ejection is suppressed for the entire uncertain review group, and candidate neighbours assigned to review are counted visibly. Phase lengths are deliberately explanatory and do not substitute for observed clear-gap and gate-position feedback.

The UI calculates only belt displacement per frame at an assumed 30 fps (`1000 × v / 30` mm) and ideal 1250 mm sensor-to-lip travel (`1.25 / v` seconds). It does not infer available computing time, physical purity, recovery or capacity. The 400 mm optical footprint example must not be described as full 600 mm belt coverage. Geometry provenance is read from the actual export; an unrun script or mesh alone is not a native CAD deliverable.

## Verification

Syntax, mesh validation, coordinate transforms, group/window clearance and recovery calculator checks run locally. The polished renderer is checked with installed Chrome/CDP on desktop and narrow mobile viewports, including camera easing, orbit/zoom, optional tools, pause, reduced motion and the existing recorded model demonstration. Local screenshots and the reproducible browser helper are retained in the project verification folder, `engineering/conveyor_concept_20261013/verification/viewer_polish_20261013/` for the earlier pass and `verification/viewer_refinement_20261014/` for the current performance and technical-inspection checks. Older synthetic WebGL fixtures describe the prior renderer and are not the verification for its shadow pipeline. Headless browser timing is a QA observation, not a device performance guarantee. Geometry and recorded-result hashes are compared with the preceding release before publication.
