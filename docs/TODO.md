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

## Active sprint: Grafe + Alegor local MVPs (2026-10-21)

The tracks progress independently; Visu is not a gate. Keep the shared snapshot/evidence identity composable as it becomes concrete, without requiring cross-track integration before either local workflow is useful.

### Grafe — source navigation

- [x] Decode pinned SCIP TypeScript output and verify fixture occurrences against exact source text: four files, 39 occurrences, zero checked span mismatches.
- [x] Decode existing plane-sync SCIP index in summary-only mode: six observed documents, 1,075 symbols, 6,485 occurrences, zero recorded diagnostics and zero span mismatches; source tree remained clean.
- [x] Build a runnable focused-symbol browser prototype; browser smoke passed. Evidence: [trial report](../experiments/grafe-restart/README.md).
- [ ] Define the versioned headless snapshot contract and build local TypeScript/JavaScript indexing with explicit scope, typed edges, spans, hashes, versions, and diagnostics.
- [ ] Test a second larger repository with pinned file scope and manually audited relations; run a maintainer caller-and-tests navigation task and measure clean and incremental indexing.

### Alegor — project re-entry

- [x] Build a deterministic Git/docs brief over seven commits and 78 changed paths; expose the stale CONTEXT/TODO sprint disagreement with separate citations.
- [x] Build a runnable static timeline/evidence prototype; 12 browser checks passed.
- [x] Test a pinned upstream `sessions` Windows context suite in an isolated copy: corrected experimental fixture/scanner paths yielded 25/25; actual session-folder compatibility remains unverified and the patch is not upstream accepted.
- [ ] Turn the Git/docs extractor into a local CLI and web MVP with conflict, missing-citation, deleted-source, and unchanged-state fixtures.
- [ ] Validate “what changed / where do I resume?” on one real project task; only then preview a user-selected session source and measure false/missed links.

Research, prototype and exact limitations are in the [restart report](research/reports/Represent%20parallel%20track%20restart.md), [Grafe experiment](../experiments/grafe-restart/README.md), and [Alegor experiment](../experiments/alegor-restart/README.md). Both tracks made zero paid AI calls. These tasks are a design/build plan, not evidence that either product MVP is complete.


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
- [x] Restart Grafe and Alegor with independent executable trials and runnable local prototypes — evidence: [parallel restart report](research/reports/Represent%20parallel%20track%20restart.md), [Grafe experiment](../experiments/grafe-restart/README.md), [Alegor experiment](../experiments/alegor-restart/README.md). Both now justify narrow local MVP implementation; neither is shipped or validated for market demand.

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
