# Represent — TODO

> Active sprint tasks only. Completed sprints roll up into CONTEXT.md.
> See `DOCS-PROTOCOL.md` Rule 2.

## Sprint: Bootstrap (2026-04-13 → ?)

> Historical bootstrap checklist; superseded by the active sprint below. Earlier ideas are preserved.

- [x] Initialize repo
- [x] Land `docs/DOCS-PROTOCOL.md`
- [x] Scaffold root living docs (CONTEXT, TODO, BACKLOG, LOGBOOK, README)
- [x] Lock architecture decisions: Ghost AI backend, embeddability as first principle
- [ ] Write first research/ POC brief (must pass Rule 6 — System Intent, Ingestion Vector, Visualization Spec, Bootstrapping Steps)
- [ ] Choose the inaugural visual mode (creature / city / blueprint / actor / gource-style)
- [ ] Decide ingestion strategy v0 (git-walk vs AST parse vs IDE index vs `codebase-digest` reuse)
- [ ] Pick the Ghost protocol the POC will use (or propose a new one)
- [ ] Sketch the headless core → surface boundary (what the library exposes, what each surface does on top)
- [ ] Prototype a minimal pipeline: ingest → annotate → Ghost AI prompt → render

## Active sprint: Grafe + Alegor follow-up validation (2026-10-21)

Both local MVPs are implemented. Evidence and promotion records: [GRAFE-MVP](GRAFE-MVP-IMPL.md), [ALEGOR-MVP](ALEGOR-MVP-IMPL.md). The tracks progress independently; Visu stays paused. Shared identity can evolve without blocking either workflow.

### Grafe - source navigation

- [x] Decode pinned SCIP fixture/Plane Sync output and build the early focused viewer. [Restart evidence](../experiments/grafe-restart/README.md).
- [x] Build a headless bounded JS/TS index with typed relations, stable IDs, source spans/hashes, diagnostics, CLI and local web app. [Reference](reference/grafe-mvp.md).
- [x] Test Plane Sync and the larger integrated Represent source scope; audit caller/test relationships and controlled-copy changes, preserving original source hashes. [Pilot](../experiments/grafe-mvp/README.md).
- [x] Complete design and implementation UI/UX rounds, 10 core/API tests and 16 browser checks. [Browser evidence](../experiments/grafe-mvp/browser-check.json).
- [x] Reconcile Notion, Gource, both Codevis identities and reference/test genealogy. [Detailed research](research/grafe-research-and-tests.md).
- [ ] Validate a larger multi-package JS/TS project and an unaided maintainer caller-and-tests task; measure omissions, memory and indexing cost.
- [ ] Explore editor-follow/minimap interaction and measured per-file incremental indexing. Current refresh rebuilds the bounded scope.

### Alegor - project re-entry

- [x] Complete the original Git/docs brief and static timeline prototype; keep the isolated sessions 25/25 Windows test distinct from personal-session compatibility. [Restart evidence](../experiments/alegor-restart/README.md).
- [x] Build the local Git/docs library, CLI and web MVP with immutable snapshots, conflicts/unknowns, deleted citations, safe scope and no-op fixtures. [Reference](reference/alegor-mvp.md).
- [x] Exercise real Represent and Plane Sync re-entry evidence and a disposable Plane Sync clone update; preserve original HEAD/status/document hashes. [Pilot](../experiments/alegor-mvp/README.md).
- [x] Complete design and implementation UI/UX rounds, 12 core/API tests and citation/theme/mobile/keyboard/range browser checks. [Browser evidence](../experiments/alegor-mvp/browser-check.json).
- [x] Reconcile original Notion/PET, Skales, sessions/lore/memory-mcp and test genealogy. [Detailed research](research/alegor-research-and-tests.md).
- [ ] Measure an unaided real maintainer re-entry task, including missed and misleading facts.
- [ ] Preview one explicitly selected session source and measure false/missed project links before integrating transcripts.

Both MVP workflows made zero AI/API calls. The integrated repository suite passed 57/57. Manual snapshots remain the default. Community opportunities include evidence formats, adapters and fixtures; no market-demand claim has been validated.

## Paused: Visu MVP (2026-10-21)

Visu implementation and paid refresh work are paused at the completed automatic-discovery slice. Resume only when explicitly reprioritized. Its completed evidence remains in [the trial report](../experiments/visu-discovery/README.md) and [reference](reference/visu-discovery.md).

### Completed build: automatic Visu discovery

- [x] Choose bounded source scope and six chapters from project identity/root alone; test ImageLab without an authored overview — evidence: [trial report](../experiments/visu-discovery/README.md).
- [x] Separate specific current state, intended design and next steps with inspectable quotations; refresh Luz/ROMPE — evidence: saved project JSON and generated art in the trial folder.
- [x] Keep capture, explanation and illustration manual; verify no-op caching and a $0.0144183 status refresh with zero image calls — evidence: [update proof](../experiments/visu-discovery/update-proof.json).
- [x] Add persistent dark/high-contrast monochrome and complete a second UX pass — evidence: 35 regression tests and [nine browser checks](../experiments/visu-discovery/browser-check.json).
- [ ] Collect corrections for stale-document interpretation and chapter usefulness; improve evidence selection before claiming dependable project-state understanding.

### Completed build: Visu MVP

- [x] Build and test the headless snapshot/style/update core — evidence: [archived tracker](impl/VISU-MVP-IMPL.md), 14 regression cases.
- [x] Integrate Ghost generation and a minimal accessible web shell — evidence: [reference](reference/visu-mvp.md), actual Ghost ledger and nine browser checks.
- [x] Exercise ROMPE and Luz with measured cold/warm/overlay/art-change cases; complete implementation UX review — evidence: [pilot](../experiments/visu-pilot/README.md).
- [x] Restart Grafe and Alegor with independent executable trials and runnable local prototypes — evidence: [parallel restart report](research/reports/Represent%20parallel%20track%20restart.md), [Grafe experiment](../experiments/grafe-restart/README.md), [Alegor experiment](../experiments/alegor-restart/README.md). This historical checkpoint justified local MVP implementation; the completed builds are recorded above. Market demand remains unvalidated.

Paused Visu design context: after the ROMPE trial, **“A memorable overview” is the sole tested output accepted as the Represent visual direction.** The remaining Visu feedback tasks below are deferred while this MVP is paused. The poster/box-diagram verdict is superseded as a product recommendation, while experiments remain evidence. Full design and state: [living views report](research/reports/Represent%20living%20project%20views.md), [ROMPE trial verdict](research/rompe-tool-trials.md), and [tracker](REPRESENT-V0-IMPL.md).

- [x] Preserve the earlier PDF, clone/source study, and ROMPE tests as research evidence — evidence: `research/sources/`, `research/reference-repos.json`, `research/rompe-tool-trials.md`.
- [x] Review Notion-era technical/visual ideas and new GoCity, creative-coding, and Algorithm Visualizer references — evidence: `research/research_notes/Represent living project views/` and `Represent living project views.md`.
- [x] Record the product direction, naming recommendation, Visu/Grafe parallel design, MVP sequence, proposed companion role, and UX gates — evidence: `research/reports/Represent living project views.md`.
- [ ] Review Visu and Grafe design tracks as separate product experiences over shared evidence and snapshots.
- [x] Prototype one project-styled Visu overview with semantic detail regions; validate ROMPE and one non-game project — evidence: [pilot](../experiments/visu-pilot/README.md).
- [x] Measure incremental refresh work, cache behavior, generation cost/latency and freshness — evidence: [measurements](../experiments/visu-pilot/measurements.json).
- [ ] Gather user readability/correction feedback and calibrate thresholds; machine checks do not establish acceptance.
- [x] Design and implement the local snapshot timeline and comparison workflow; keep Alegor's service boundary provisional — evidence: [Visu reference](reference/visu-mvp.md).
- [x] Continue Grafe design; retain the plane-sync index as a technical checkpoint and independently test source navigation. See the active Grafe + Alegor sprint above.

## Historical sprint: Reference study → first scene (2026-10-21)

> [!WARNING]
> **SUPERSEDED —** This original scanner-first bootstrap is historical. Its completed research remains useful; the current independent Grafe and Alegor MVP tasks are listed above. The old plane-sync scene remains a technical checkpoint, not a global product gate. Preserved per DOCS-PROTOCOL.md Rule 5.

Full scope and evidence: [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md).

- [x] Preserve and read the Interactive Atlas PDF; inspect methrep and bootstrap the tracker — evidence: research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf; REPRESENT-V0-IMPL.md.
- [x] Clone and inspect reference projects; record pinned versions, licenses and concrete reusable parts — evidence: research/reference-repos.json; research/reports/Represent reference repository study.md.
- [x] Exercise reference tools using the two ROMPE prompts, inspect output and preserve source corrections — evidence: research/rompe-tool-trials.md; ../experiments/rompe/validation/browser-results.json.
- [ ] Lock P0 choices, then implement the smallest deterministic CLI/library scan.
- [ ] Show the first plane-sync scene before enrichment, renderer or shell work.
- [ ] Measure the corpus sizes and scanner limits.
- [x] Finish companion research — evidence: research/companions.md.
