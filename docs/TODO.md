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

## Sprint: Reference study → first scene (2026-10-21)

Full scope and evidence: [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md).

- [x] Preserve and read the Interactive Atlas PDF; inspect methrep and bootstrap the tracker — evidence: research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf; REPRESENT-V0-IMPL.md.
- [x] Clone and inspect reference projects; record pinned versions, licenses and concrete reusable parts — evidence: research/reference-repos.json; research/reports/Represent reference repository study.md.
- [x] Exercise reference tools using the two ROMPE prompts, inspect output and preserve source corrections — evidence: research/rompe-tool-trials.md; ../experiments/rompe/validation/browser-results.json.
- [ ] Lock P0 choices, then implement the smallest deterministic CLI/library scan.
- [ ] Show the first plane-sync scene before enrichment, renderer or shell work.
- [ ] Measure the corpus sizes and scanner limits.
- [x] Finish companion research — evidence: research/companions.md.
