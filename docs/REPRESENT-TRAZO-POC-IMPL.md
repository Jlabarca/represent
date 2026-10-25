# REPRESENT-TRAZO-POC — Implementation Tracker

> Living design+status doc for the Trazo POC: a resident, proactive artist companion over a consented path.
> Design: [reference/trazo-poc.md](reference/trazo-poc.md) (placed in reference by the operator's request; rewritten as-built on promotion). Quality bar: [Visu guide](guides/visu-experience.md). Seam honoured: the artifact record in [Represent within Orkest](research/reports/Represent%20within%20Orkest%20platform%20design.md).
> Follows DOCS-PROTOCOL.md Rule 15.
> Updated: 2026-10-25
> Prior-art sweep: 2026-10-25. Checked [CAPABILITIES.md](CAPABILITIES.md) (Visu discovery and overview, Grafe explorer, Alegor re-entry: all reused as libraries, none resident or proactive), `reference/` and `impl/` filenames, `experiments/represent-os-concept/` (static composition proof, not a watcher), REPRESENT-ORKEST-IMPL (waits behind this POC; its artifact record is written here), and Ghost's methrep (a methodology daemon, not a folder artist).

**Plan number one as of 2026-10-25 (operator).** Phase 0 confirmed 2026-10-25 with the defaults (codename Trazo, Apache-2.0, trial folders Represent, Plane Sync, luz, `D:/ware/docs`). Week 1 (1.1 to 1.6) implemented and trialled the same day with zero model calls; the operator's verdict at 1.7 decides week 2.

## AI Continuation Prompt

Read `CLAUDE.md`, `docs/CONTEXT.md`, this tracker, the [design](reference/trazo-poc.md) and the [Visu guide](guides/visu-experience.md). Reuse `src/visu/discovery.mjs`, `src/visu/analysis.mjs`, `src/visu/ghost.mjs`, `src/grafe/core.mjs` and `src/alegor/core.mjs` as libraries; do not copy them.

Rules:
- **Zero AI first.** Week 1 ships with no model call anywhere in the new code. No model call ever runs without consent and a shown price; tests and CI run with no key.
- **Preserve Visu.** The three tools' code changes only to expose library functions. Nothing precise goes into raster.
- **Bounded reads.** Discovery's caps and ignore rules are the law; the hook receives paths, never content; loopback only; stdio MCP only.
- **Store outside project roots.** `%LOCALAPPDATA%/Represent/trazo/` by default, `TRAZO_STORE` to override. Every explained snapshot writes a `represent.artifact/v0` record.
- **No Orkest or Ghost code.** No dispatch, no chat, no accounts, no shells (Tauri, VS Code) in the POC.
- Tick a box only with evidence. Human boxes are the operator's. Each week ends with `/qa-pass` and a LOGBOOK entry.

## Open Questions

| ID | Question | Default | Why |
|---|---|---|---|
| OQ-1 | Codename and licence | Trazo, Apache-2.0 | **Confirmed 2026-10-25 (operator, 0.1).** Patent grant; embedding-friendly. |
| OQ-2 | Watcher | `fs.watch` recursive with 5 s polling fallback | Zero dependencies; Node 22 supports recursive watch on all three platforms. |
| OQ-3 | Graph diagrams | Mermaid text rendered client-side; sketch in hand-built SVG | Agent-readable, deterministic, no layout library. |

## System Intent

A resident companion that draws a consented folder in under three seconds with no model call, explains and illustrates it on request within a budget, and adjusts its technical level with a dial. Developers first; any structured folder second.

## Ingestion Vector

See the design's annotated tree. Summary: Git-tracked text under the consented path, capped by discovery; README and Markdown sections; manifests for language hints; never dependencies, outputs or secrets. Store under `%LOCALAPPDATA%/Represent/trazo/`.

## Visualization Spec

Treemap, layered modules with import arrows, history strip; captioned chapters with citations at guide level; optional styled illustration over the poster level. Four levels, stable positions, three themes, keyboard reachable.

## Architecture

Watcher → snapshot (discovery) → fact graph → sketch (SVG, four levels) → explain (one cached text call) → compose (templates and Mermaid) → optional illustrate (Visu pipeline) → viewer (loopback, token, SSE). Nudges from thresholds and budget. Claude Code hook and MCP `draw` are optional inputs. Full diagram and stack table in the design.

## Current State (2026-10-25)

Week 1 built: `src/trazo/{cli,consent,facts,sketch,server}.mjs`, `web/trazo/`, two test files (whole suite 67 pass). Library seams added to Visu discovery (`inventory`), Grafe (`indexFiles`) and Alegor (`readHistory`) without changing their behaviour. Trial on the four folders recorded under [experiments/trazo-poc/week1](../experiments/trazo-poc/week1/README.md): first sketch in 0.44 to 0.78 s warm (cold file cache up to 13.6 s on luz), dial switches under 15 ms, zero model calls. Waiting on the operator's verdict (1.7). REPRESENT-ORKEST waits behind this POC.

## Known Bugs

- Path aliases (`@/`, tsconfig `paths`) are not resolved, so alias-heavy TypeScript apps (luz) show no module arrows. Candidate for week 2 or the verdict's layout-fix option.
- C# and Go namespace imports resolve to directories, often inside the same module; adds little signal.
- Cold first capture of a large folder can take 10 s on Windows (file cache, measured; Trazo's own work is under 1 s). No progress line yet.
- The deep level lists symbols with inbound call counts; it does not draw call edges.

## What Needs Testing

- **TEST.1 First drawing.** On Represent, Plane Sync, luz and a docs folder: sketch under 3 s, zero model calls, ledger empty.
- **TEST.2 Dial.** Four levels from one fact graph; each switch under 100 ms; no network request.
- **TEST.3 Consent.** Unconsented path refused; consent revocation stops the watcher; `.env`, binaries, dependencies never appear in the snapshot.
- **TEST.4 Fact graph.** Import edges for JS, TS, Python, C#, Go and Rust fixtures; JS/TS symbols from Grafe; Markdown sections; bounded commits; stable node ids across a one-file change.
- **TEST.5 Stable layout.** Changing one file moves no other node more than its own box.
- **TEST.6 Explain and cache.** One call per snapshot; identical excerpt set costs $0; citations validated; chapter redraw sends only that chapter.
- **TEST.7 Nudges.** Below threshold no nudge; above threshold one nudge; second change inside an hour suppressed; daily budget stops paid redraws; "quiet for today" honoured.
- **TEST.8 Viewer security.** Wrong token and wrong Origin refused; SSE delivers a sketch update without reload.
- **TEST.9 Hook and MCP.** A posted path triggers a snapshot; `draw(path, level)` over stdio returns valid SVG for a consented path and refuses an unconsented one.
- **TEST.10 Artifact record.** Every explained snapshot yields a valid `represent.artifact/v0` record with evidence hashes.
- **TEST.11 Visu untouched.** The 57 existing tests pass; the three tools' servers behave as before.

## Implementation Status

| Phase | State | Model | Description |
|---|---|---|---|
| 0 Confirm | Done 2026-10-25 | operator | Codename, licence, four trial folders. |
| 1 Sketch (week 1) | 1.1 to 1.6 done 2026-10-25; 1.7 operator | Claude Fable 5.1 | CLI, consent, snapshot, fact graph, SVG sketch, dial, viewer, ledger. |
| 2 Explain and compose (week 2) | Not started | any | Explanation through Ghost, templates, citations, cache, artifact record. |
| 3 Live and proactive (week 3) | Not started | any | Watcher, nudges, budget, SSE, hook, MCP. |
| 4 Polish and trials (week 4) | Not started | operator + any | UX rounds, five-day use, ROMPE illustration pass, public repository, verdict. |
| 5 Promotion | Not started | any | As-built reference, CAPABILITIES, archive. |

## Checklist

### Phase 0 — Confirm

- [x] REPRESENT-TRAZO-POC.0.1 **human:** operator confirms or overrides OQ-1 to OQ-3 and names the four trial folders (default: Represent, Plane Sync, luz, `D:/ware/docs`). Evidence: operator chat 2026-10-25, "Phase 0 confirmed with the defaults: codename Trazo, Apache-2.0, trial folders Represent, Plane Sync, luz and D:/ware/docs."

### Phase 1 — Sketch (week 1)

- [x] REPRESENT-TRAZO-POC.1.1 `src/trazo/cli.mjs`: `trazo [path]` with consent prompt, stored consent, `--store`, `--port`; prints what will and will not be read. TEST.3. Evidence 2026-10-25: `src/trazo/cli.mjs`, `src/trazo/consent.mjs`; `tests/trazo-core.test.mjs` (consent grant/revoke/list, store-outside refusal, `.env`/`node_modules`/binary never captured); consent revocation of a watcher is week 3.
- [x] REPRESENT-TRAZO-POC.1.2 Library seams: `grafe/core.mjs` exports `indexFiles(root, files)` (named `symbolsFor` in the plan); `alegor/core.mjs` exports `readHistory(root, { limit })`; `visu/discovery.mjs` exports `inventory(root)` and `safeName`. TEST.11 stays green. Evidence 2026-10-25: `node --test tests/*.test.mjs` 67 pass, 0 fail (57 prior + 10 new); Alegor's git helper now ignores stderr, no other behaviour change.
- [x] REPRESENT-TRAZO-POC.1.3 `src/trazo/facts.mjs`: fact graph builder with import scanners for six languages, Markdown sections, commits, stable ids and level floors. TEST.4. Evidence 2026-10-25: scanners for JS/TS, Python, C#, Go, Rust (plus Java/Kotlin) with fixture tests; same folder twice gives the same snapshot id and node order; Grafe symbols lazily (313 symbols, 873 calls on Represent).
- [x] REPRESENT-TRAZO-POC.1.4 `src/trazo/sketch.mjs`: treemap, layered modules, history strip; SVG primitives; stable positions. TEST.5. Evidence 2026-10-25: four levels render on all four folders; order by module id is independent of weight (test); rendering deterministic (test). Partial for TEST.5: widths still follow weight, so a large file change resizes neighbours in the same row; the one-file-change measurement is week 4's.
- [x] REPRESENT-TRAZO-POC.1.5 `src/trazo/server.mjs` and `web/trazo/`: loopback viewer with token and Origin, dial, three themes, status strip, ledger. TEST.1, TEST.2, TEST.8 (static part). Evidence 2026-10-25: `tests/trazo-server.test.mjs` (401 without token, 403 on foreign Host or Origin, level and focus validation, immutable snapshot files, CSP); viewer screenshots under `experiments/trazo-poc/week1/`.
- [x] REPRESENT-TRAZO-POC.1.6 Week 1 trial on the four folders under `experiments/trazo-poc/week1/`: timings, screenshots, operator verdict. **Stop-or-go.** Evidence 2026-10-25: [week1/README.md](../experiments/trazo-poc/week1/README.md), `timings.json`, 16 SVGs, 7 screenshots. First sketch 0.44 to 0.78 s warm; TEST.1 passes warm on all four, cold on two (file cache).
- [ ] REPRESENT-TRAZO-POC.1.7 **human:** operator's verdict on the zero-AI sketch.

### Phase 2 — Explain and compose (week 2)

- [ ] REPRESENT-TRAZO-POC.2.1 `src/trazo/explain.mjs`: excerpt set from discovery, `analysis.mjs` prompt with vocabulary parameter, cache by excerpt hash, prompt version and model; "what I will send" preview. TEST.6.
- [ ] REPRESENT-TRAZO-POC.2.2 `src/trazo/compose.mjs` and `web/trazo/templates/`: chapter infographic with captions, citations, confidence marks, freshness line; Mermaid emission for graph views. 
- [ ] REPRESENT-TRAZO-POC.2.3 Artifact record v0 writer (shared with REPRESENT-ORKEST 1.2 when that resumes). TEST.10.
- [ ] REPRESENT-TRAZO-POC.2.4 Week 2 trial: one explanation per folder with costs, correctness ratings (10 statements each) under `experiments/trazo-poc/week2/`.
- [ ] REPRESENT-TRAZO-POC.2.5 **human:** operator rates the statements.

### Phase 3 — Live and proactive (week 3)

- [ ] REPRESENT-TRAZO-POC.3.1 `src/trazo/watch.mjs`: recursive watch, debounce, polling fallback, discovery-aligned ignores; SSE channel. TEST.8 (live part).
- [ ] REPRESENT-TRAZO-POC.3.2 `src/trazo/nudge.mjs`: thresholds, hourly cap per chapter, daily budget, quiet mode; chapter redraw path. TEST.7.
- [ ] REPRESENT-TRAZO-POC.3.3 `hooks/claude-code-post-tool-use.mjs` and `src/trazo/mcp.mjs` (stdio `draw`, `explain`). TEST.9.
- [ ] REPRESENT-TRAZO-POC.3.4 Week 3 trial: a real coding session on Plane Sync with the hook on; nudge log and acceptance under `experiments/trazo-poc/week3/`.

### Phase 4 — Polish and trials (week 4)

- [ ] REPRESENT-TRAZO-POC.4.1 Design UX round against the Visu screenshots, then a live UX round; punch list and `polish` commits.
- [ ] REPRESENT-TRAZO-POC.4.2 Five working days of use with the ledger and nudge log as evidence; operator's notes.
- [ ] REPRESENT-TRAZO-POC.4.3 ROMPE illustration pass using existing art through the Visu pipeline; zero new image calls unless the operator approves one.
- [ ] REPRESENT-TRAZO-POC.4.4 Public repository: README with the script, demo recording, Apache-2.0, CI running `node --test` without keys. **human:** operator approves publication.
- [ ] REPRESENT-TRAZO-POC.4.5 Feasibility verdict against the design's table, written to `docs/research/reports/Trazo POC verdict.md`; decision on the service path and on resuming REPRESENT-ORKEST.

### Phase 5 — Promotion

- [ ] REPRESENT-TRAZO-POC.5.1 Rewrite `reference/trazo-poc.md` as-built; CAPABILITIES line; archive this tracker to `impl/`; CONTEXT, TODO, README, LOGBOOK updated.

## Key Files Reference

| File | Purpose | Phase |
|---|---|---|
| `src/trazo/cli.mjs`, `consent.mjs` | Entry, consent, store | 1 |
| `src/trazo/facts.mjs`, `tests/trazo-core.test.mjs` | Fact graph and language scanners; sketch tests share the file | 1 |
| `src/trazo/sketch.mjs` | Deterministic SVG layouts | 1 |
| `src/trazo/server.mjs`, `web/trazo/**`, `tests/trazo-server.test.mjs` | Viewer, dial, SSE | 1, 3 |
| `src/trazo/explain.mjs`, `compose.mjs`, `web/trazo/templates/` | Explanation and infographic | 2 |
| `src/artifact/record.mjs` | Artifact record v0 | 2 |
| `src/trazo/watch.mjs`, `nudge.mjs`, `mcp.mjs`, `hooks/` | Live loop, nudges, agent inputs | 3 |
| `src/grafe/core.mjs`, `src/alegor/core.mjs` | Library seams only | 1 |
| `experiments/trazo-poc/**` | Weekly trial evidence | 1 to 4 |

## Architecture Notes

- **Why zero AI first.** The design's first unknown is whether a free sketch is worth keeping open. If it is not, no amount of illustration saves the product, and the week-1 stop costs one week.
- **Why templates and Mermaid, not raster.** Every Visu trial showed raster lettering as the error source; captions with citations are checkable, images are not.
- **Why the store is outside the repo.** Same rule as Grafe and Alegor; Alegor refuses stores inside configured roots.
- **Why no chat.** Conversation is the Alegor companion's job over Orkest context; Trazo is the artist. Merging them now would re-create the "Represent OS" scope the learning record retired.
- **Why the artifact record is written here.** It keeps the Orkest design's seam alive while that tracker waits, so resuming it starts from a populated store.
