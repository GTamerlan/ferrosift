# Ferrosift — retrofit sensing module

This unpublished M02 candidate presents a removable computer-vision and directional induction sensing module for existing recycling lines. The grey host conveyor is installation reference; feed preparation, drive, downstream ejection and collection are host responsibilities.

Serve this directory over HTTP and open `index.html`. `explorer.html#machine` presents one guided walkthrough: camera/geometry, candidate induction coils, and combined classification/output to the existing sorter. Play or scroll through the three steps. One optional technical-details disclosure provides engineering files, sources, recorded evaluation and proposed R&D workstreams. `engineering/` redirects there. No build step or server-side inference is required.

The optional `how-it-works/` guide follows temporary software ID 42 through detection, exterior geometry, arrival prediction, induction, measurement association and proposed routing. It uses original educational diagrams. Magnetic-field arrows are distinct from closed electrical-current loops inside the illustrated conductor; neither is a solved field or measured result. Its captions and transcript explain uncertain association, limits of geometry and the role of the host sorter.

## Research scope

The 180 mm guided central lane on a 600 mm reference belt is a proposed mechanical experiment, not measured sensor coverage. Horizontal XY coils below the belt and upright XZ side coils provide intended complementary orientations. The six functional windings (two transmit and four candidate receive windings) illustrate two transmitters and four receivers; their balance, field patterns and channel arrangement are unoptimized. The stations are sequential, and belt travel does not guarantee fragment association.

The proposed contribution is geometry- and pose-conditioned interpretation of directional, frequency-dependent response sequences on irregular layered PCB/e-scrap. Optical/induction fusion already exists. Comparison with strong simpler baselines on independent fragments and source lots, then collected-output measurement, will determine whether the module adds value. The 2045 horizon is aspirational; space actuation is a separate research program with its own physical and flight gates.

## Engineering files

`engineering/downloads/module_manifest.json` lists exact public engineering file identities. `module_assembly.*` contains the module only; `module_with_host.*` includes the grey reference belt/frame. Separate PDF, STEP and compact editable-source ZIP downloads avoid requiring the full engineering packet. Component schedule, six proposed-layout drawing sheets, design assumptions, host interfaces and geometry checks accompany the interchange files. All derive from the same M02 source revision. The complete conveyor IR01-R1 and its receiving-capture hold remain preserved in local project history and frozen earlier releases, separate from this offer.

The CAD is preliminary and not fabrication-certified. Checks concern the stated nominal geometry and export consistency. They do not establish electromagnetic performance, usable aperture, allowable loads, tolerances, field compatibility, speed, safety compliance or successful physical recovery. See the design holds and interface contract before using the geometry.

## Preserved recorded evidence

The side-by-side comparison contains 38 recordings and 2,720 saved frame pairs. Seven clips have scores on 979 verified labelled frames, including one where the reference leads; 31 have no verified accuracy. The complete `model-demo/` assets, sources, labels, predictions, loss and scoring code remain unchanged from the frozen public baseline.

The separate historical selected development result is 7,081/7,535 visible-copper annotations (94.0%) versus 6,448/7,535 (85.6%). Configuration and thresholds were selected on those 1,522 development frames. Repeated appearances count as annotations; this does not establish physical recovery, purity or financial gain. Full methods, exposure history and thresholds remain available. Training provenance is in `training.html`.

The main walkthrough uses a fixed hypothetical example: 1,000 t annual feed × 10% contained Cu × a five percentage-point recovery increase = 5 extra t Cu; 5 t × assumed US$8,000/t − US$20,000 extra annual operating cost = US$20,000/year before capital costs, financing and tax. None of these assumptions is a measured Ferrosift result, rated capacity or current market quote. CV scores contribute no dollars. The original operator calculator remains separately accessible, with its four original assets unchanged. Proposed R&D workstreams are planning descriptions, not staffed-team claims.

Private papers, investor decks, funding/salary scenarios, private website QA and local coordination sources are excluded from this website. Scoped engineering verification accompanies the editable CAD source. This candidate has not been published.
