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

## Sprint: Visu and Grafe product design (2026-10-21)

### Completed build: Visu MVP

- [x] Build and test the headless snapshot/style/update core — evidence: [archived tracker](impl/VISU-MVP-IMPL.md), 14 regression cases.
- [x] Integrate Ghost generation and a minimal accessible web shell — evidence: [reference](reference/visu-mvp.md), actual Ghost ledger and nine browser checks.
- [x] Exercise ROMPE and Luz with measured cold/warm/overlay/art-change cases; complete implementation UX review — evidence: [pilot](../experiments/visu-pilot/README.md).
- [x] Research Grafe and Alegor in parallel; gate any implementation on real trial evidence — evidence: [Grafe](research/grafe-mvp-research.md), [Alegor](research/alegor-mvp-research.md). Neither independently shippable MVP is mature yet; next work is multi-file symbol accuracy and real re-entry validation respectively.

Current sprint follows the user's product-quality correction after the ROMPE trial. **“A memorable overview” is the sole tested output accepted as the Represent visual direction.** The poster/box-diagram verdict below is superseded as a product recommendation, while the experiments remain evidence. Full design and current state: [living views report](research/reports/Represent%20living%20project%20views.md), [ROMPE trial verdict](research/rompe-tool-trials.md), and [tracker](REPRESENT-V0-IMPL.md).

- [x] Preserve the earlier PDF, clone/source study, and ROMPE tests as research evidence — evidence: `research/sources/`, `research/reference-repos.json`, `research/rompe-tool-trials.md`.
- [x] Review Notion-era technical/visual ideas and new GoCity, creative-coding, and Algorithm Visualizer references — evidence: `research/research_notes/Represent living project views/` and `Represent living project views.md`.
- [x] Record the product direction, naming recommendation, Visu/Grafe parallel design, MVP sequence, proposed companion role, and UX gates — evidence: `research/reports/Represent living project views.md`.
- [ ] Review Visu and Grafe design tracks as separate product experiences over shared evidence and snapshots.
- [x] Prototype one project-styled Visu overview with semantic detail regions; validate ROMPE and one non-game project — evidence: [pilot](../experiments/visu-pilot/README.md).
- [x] Measure incremental refresh work, cache behavior, generation cost/latency and freshness — evidence: [measurements](../experiments/visu-pilot/measurements.json).
- [ ] Gather user readability/correction feedback and calibrate thresholds; machine checks do not establish acceptance.
- [x] Design and implement the local snapshot timeline and comparison workflow; keep Alegor's service boundary provisional — evidence: [Visu reference](reference/visu-mvp.md).
- [ ] Continue Grafe design; retain the first plane-sync scene as a technical checkpoint, not a blocker for Visu product proof.

## Historical sprint: Reference study → first scene (2026-10-21)

> [!WARNING]
> **SUPERSEDED —** The Visu and Grafe product-design sprint above now sets the active priority. This earlier scanner-first gate remains a technical checkpoint for Grafe, not a global blocker for Visu. The completed research evidence remains valid. Preserved per DOCS-PROTOCOL.md Rule 5.

Full scope and evidence: [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md).

- [x] Preserve and read the Interactive Atlas PDF; inspect methrep and bootstrap the tracker — evidence: research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf; REPRESENT-V0-IMPL.md.
- [x] Clone and inspect reference projects; record pinned versions, licenses and concrete reusable parts — evidence: research/reference-repos.json; research/reports/Represent reference repository study.md.
- [x] Exercise reference tools using the two ROMPE prompts, inspect output and preserve source corrections — evidence: research/rompe-tool-trials.md; ../experiments/rompe/validation/browser-results.json.
- [ ] Lock P0 choices, then implement the smallest deterministic CLI/library scan.
- [ ] Show the first plane-sync scene before enrichment, renderer or shell work.
- [ ] Measure the corpus sizes and scanner limits.
- [x] Finish companion research — evidence: research/companions.md.
