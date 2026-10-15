# M02 retrofit sensing module engineering

Open `../explorer.html#machine` to follow the actual source geometry through camera/geometry, candidate directional induction, and combined classification/output to the existing sorter. The grey host parts provide installation context. Module-only and module-with-host STEP, BREP and GLB files, the browser mesh, six A3 drawings, four actual-CAD figures and a preliminary component schedule share a single revision. PDF, module STEP and compact editable-source ZIP are separate downloads.

The M02 refinement retains six functional winding paths (two transmit, four candidate receive), each with three illustrative perimeter passes, insulation, terminals and recessed return grooves. Refined bobbin, housing, gland and fastener geometry is modeled in the source. These geometric choices are unoptimized; they do not specify a qualified electrical circuit, operating frequency or performance. Internal harness, component selection and calibration remain engineering holds.

Dimensions use millimetres: X follows travel, Y crosses the belt, Z points up. The reference belt surface is at Z=1000 mm; carrying-surface-relative height is Z minus 1000. The central 180 mm lane and 60 mm packaging witness are mechanical research envelopes, not accepted feed or active sensing coverage. All dimensions, optics, electronics, materials and interfaces are proposed and require selection and validation.

Use `downloads/module_manifest.json` for exact file sizes/checksums, `downloads/design_basis.json` for dimensions, `downloads/interface_contract.json` for installation and control dependencies, `downloads/geometry_checks.json` for the limited nominal checks, and `downloads/design_holds.json` for unresolved release gates.

The host reference intentionally omits a complete conveyor, feed machine and downstream sorter. The installation needs line-specific support/return-run measurements, EMC and belt-material characterization, controlled feed into the narrow lane, guarding and safe service procedures. Interior views omit selected covers, insulation and surrounding context to reveal the actual hardware. No physical testing or electromagnetic solution is implied.

The earlier whole-conveyor concept is preserved in the project's local history and frozen prior website releases. It is not supplied as the current module design.
