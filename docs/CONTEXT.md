# Represent — Context

> Living doc. Single source of truth for project state, decisions, and current sprint.
> See `DOCS-PROTOCOL.md` for the rules that govern this file.
> Updated: 2026-10-21

## Current Operating Direction (2026-10-21)

**Grafe and Alegor local MVPs are implemented. Visu remains paused.** The two tracks progressed in parallel with separate headless cores, CLIs, web apps, real-project trials, UI/UX rounds and detailed research records. Completed promotion records are [GRAFE-MVP](impl/GRAFE-MVP-IMPL.md) and [ALEGOR-MVP](impl/ALEGOR-MVP-IMPL.md).

Grafe runs at port **8873**; Alegor runs at **8874**. Both use manual snapshots outside read-only source roots and make zero AI calls. See [Grafe usage](reference/grafe-mvp.md) and [Alegor usage](reference/alegor-mvp.md). No public deployment, session connector or cross-tool snapshot interoperability is claimed. Neither track waits for Visu or the other track.

## Latest Product Direction (2026-10-21)

> **Sequence updated 2026-10-21:** The design below records the earlier Visu-first sequence. The user subsequently authorized Grafe and Alegor implementation in parallel and paused Visu. That newer direction governs active work; the original design rationale is preserved here.

The ROMPE trials established the current visual quality bar: **“A memorable overview”** is the only tested output accepted as a natural Represent product direction. The user's desired product is clean and easy at first glance, with deeper summaries, technical data, and source evidence available through hover, focus, or popups. The overview should detect and adopt each project's own style; the MVP narrows the format/workflow to a dependable illustrated overview and cheap, measurable updates, not to a single art style such as ROMPE's pixel art.

The product should be designed in two equally serious tracks: **Visu**, the illustrated overview that can grow into an animated interactive scene, and **Grafe**, a technical explorer improving on the Codevis idea with source/code detail inside focused nodes. Share project identity, evidence, and snapshot lineage. Implementation need not happen in parallel: the first product proof is an updateable Visu overview; the earlier plane-sync scan becomes a Grafe engineering checkpoint rather than the global gate for all product work. **Alegor** is a candidate name for a project/history companion; its exact product/service boundary remains a proposal, and the user's only fixed constraint is that it is not a mascot.

Branding recommendation for review: **Represent** (suite), **Visu** (illustrated overview), **Grafe** (technical explorer), **Alegor** (candidate companion). Names and any `alegor.ai` domain styling are provisional; domain and trademark availability have not been checked. A local-first snapshot workflow is the MVP direction. Hosted sync, embeds, sharing, or subscription budgets are later service proposals, not current commitments.

See the [living project views design](research/reports/Represent%20living%20project%20views.md) for the complete recommendation and [research verdict](research/rompe-tool-trials.md) for the corrected interpretation of trial results.

## What is Represent

Represent is the **root workspace for all LLM-based visual representation projects** under waremoto. It lives at `D:/ware/represent` (repo: <https://github.com/Jlabarca/represent>). Multiple concrete projects — different visualization modes, different ingestion strategies, different output surfaces — will live here as sub-projects under one shared doctrine, one AI backend, and one embeddability target.

Each sub-project ingests source code (files, directory trees, git history, runtime traces) and outputs artistic visual representations — dependency graphs, creatures, cities, blueprints, animated minimaps, whatever makes a codebase legible at a glance.

The thesis: a project should have an iconic visual identity that reflects its real structure, not just a logo. Developers should look at the picture and understand relationships they'd otherwise have to read thousands of lines to recover.

## Current State

**Parallel MVP completion (2026-10-21):** Grafe provides bounded JS/TS symbol navigation, typed relationships, source excerpts, focused graph/evidence views and manual snapshot history. Alegor provides Git/docs snapshots, timeline/baseline comparison, declared next work, unknown/conflict indicators and captured citations. Both were exercised against Plane Sync and Represent, with changed/deleted-source trials in disposable copies. The integrated suite passed **57/57** (10 Grafe, 12 Alegor, 35 existing Visu); Grafe passed 16 browser checks, and Alegor passed citation/theme/detail/mobile/keyboard/range checks. Each received design and live implementation UX rounds. Zero model/API calls were made for these MVP workflows.

Grafe indexed 51 integrated Represent source files in 952.82ms and six Plane Sync files in 783.95ms. Refresh is a full bounded rebuild with immutable no-op reuse, not per-file incremental compilation. Alegor's real Plane Sync clone trial recorded a docs-only update in 1,534.66ms, unchanged reuse and preserved citations after deletion. Its rule-based selection is limited to 40 first-parent commits and 12 documents; it does not read personal sessions. Detailed source genealogy, actual trials and limitations are in [Grafe research and tests](research/grafe-research-and-tests.md) and [Alegor research and tests](research/alegor-research-and-tests.md). Earlier paragraphs below are historical checkpoints.

### Historical checkpoints — Visu and initial bootstrap

**Automatic Visu iteration (2026-10-21):** Root-only configurations now discover a bounded Git text sample and let Ghost choose six chapters. Manual Capture → Explain → Illustrate separates free source capture, cached text analysis and optional image generation. Current state, intended design and next steps have separate captured citations and progressive detail. Light, dark and high-contrast monochrome are local presentation settings. ImageLab was tested without authored scope/chapters alongside refreshed ROMPE/Luz. A controlled-copy status update cost $0.0144183, retained chapter identities and reused art; unchanged operations cost zero. Thirty-five tests and nine browser checks passed. The new development trial cost $0.28688598 including failed/rejected text requests and three illustrations; the earlier $0.3682722 is separate. See [current reference](reference/visu-discovery.md) and [trial](../experiments/visu-discovery/README.md). Interpretation still needs review when source documents disagree; discovery is a sample, not a repository-wide audit. The curated-MVP description below is historical.

**Working local MVP (2026-10-21):** Visu now runs at local port 8871 with a shared headless core, CLI and web shell. ROMPE and Luz y Luna have actual Ghost-generated illustrations, detected style reasons, captured evidence, optional checklist counts, source snapshots, separate portrait revisions and exports. Fourteen regression tests and nine browser checks pass. Controlled-copy unchanged/detail-only updates made zero AI calls; selected original files retained their hashes. The full trial, including rejected generations, cost $0.3682722 in measured Ghost charges. See [Visu reference](reference/visu-mvp.md), [pilot evidence](../experiments/visu-pilot/README.md) and [archived tracker](impl/VISU-MVP-IMPL.md). Source scope/chapter mapping is curated, styles are heuristic, raster quality still needs inspection, and there is no background watcher. Grafe and Alegor remain parallel research tracks. The following pre-implementation statement describes the state before this build.

Product pre-implementation, with working reference-tool experiments and a local UI concept. Repo bootstrapped 2026-04-13. No Represent scanner or general renderer has shipped. Ten upstream repositories are inventoried locally; ROMPE's two prompts have been exercised through interactive-diagram, Eraser Diagrams and an illustrated-poster baseline. See [trial results](research/rompe-tool-trials.md), [living views concept](../experiments/rompe/living-overview-concept/index.html), and [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md).

## Key Architecture Decisions (Locked)

| Decision | Choice | Reason | Date |
|---|---|---|---|
| AI backend | **Ghost AI pipeline** (not direct provider SDKs) | Reuse Ghost's provider routing, caching, resilience, and cost controls. No per-project API-key plumbing. Providers: Gemini primary, OpenRouter fallback, local Ollama/vLLM (RTX 3090). | 2026-04-13 |
| Embeddability | **First-principle, not afterthought** | Every tool must ship to the broadest public surface possible: web app, VSCode extension, JetBrains extension, desktop (Tauri-class), mobile, CLI, library. Core must be headless and framework-agnostic; surfaces are thin shells. | 2026-04-13 |
| Rendering format | _tbd_ | Likely SVG as v0 portable primitive (works in every surface), canvas/WebGL for interactive v1. Needs a POC to lock. | — |
| Ingestion v0 | _tbd_ | Candidates: git-walk, AST (tree-sitter / Roslyn), `codebase-digest` piped output, IDE-index scrape. Needs a POC to lock. | — |
| Local MVP ingestion/rendering | **Grafe: TypeScript 5.9.3 checker and focused web graph; Alegor: bounded Git/docs and timeline/evidence UI** | Resolves local MVP choices. The general multi-language pipeline remains open; internal versioned JSON snapshots do not yet implement methrep interchange. | 2026-10-21 |
| Workspace layout | **Monorepo under `D:/ware/represent`** | Shared doctrine + shared core + per-project subfolders. One docs tree at the root. | 2026-04-13 |
| Development sequence | **Clone, study and exercise references; synthesize; design; build** | Operator's 2026-10-21 direction: use the Multica/Orkest approach, learning from working projects and adapting the strongest parts before inventing another stack. | 2026-10-21 |
| Compatibility target | **methrep's `represent.scene/v0` envelope + `events.jsonl`** | Reuse the stable boundary, not methrep's markdown parser or date-only append algorithm. Code metadata belongs in annotations; structural extensions need tests. | 2026-10-21 |
| First delivery gate | **Historical technical checkpoint: first real plane-sync scene for the Grafe ingestion track** | The original scanner-first P0-P4 kickoff preceded the tested Visu direction. The plane-sync scene remains a useful engineering checkpoint, but is no longer the global product gate. | 2026-10-21 |
| Current validation case | **ROMPE poster establishes the visual bar; validate style transfer on another project** | The user selected “A memorable overview” as the only tested output that fits Represent. Box-based tools remain useful research instruments, not the product's main visual direction. | 2026-10-21 |
| Document visualization boundary | **Audited facts → selected view → renderer** | The trials found real prompt/source discrepancies; valid layout alone cannot establish correct rules. Share provenance and qualifications across explainer and poster outputs. | 2026-10-21 |

> [!WARNING]
> **Historical gate superseded 2026-10-21:** The initial bootstrap recorded these choices before the user clarified that the illustrated overview is the product-quality bar. Preserve them here as the original technical sequence; they are not current global gates.
>
> | Historical choice | Original rationale |
> |---|---|
> | **First real plane-sync scene before enrichment, renderer or shell implementation** | Keep the P0-P4 kickoff, with source study ahead of P1. The actual tracked plane-sync tree is small (19 files), and requires JavaScript support. |
> | **ROMPE game-design prompts before scanner implementation** | Operator explicitly requested hands-on use of existing tools. These are upstream-renderer experiments, not a premature P3 product implementation. |
>
> The plane-sync scene remains a Grafe engineering checkpoint. The ROMPE test remains the visual reference; validate the overview workflow on a non-game project to test style transfer.

### V0 decisions under evaluation

The historical Unity/.NET design remains a possible future renderer, especially for spatial themes. For the first companion, TypeScript plus a light web renderer is the working hypothesis: one language for a headless CLI/library and browser surfaces, with accessible text and easier host integration. The deciding evidence is source study and local trials, not bundle size alone; the earlier presence-universe brief explicitly treated payload size as a non-issue.

The supplied Interactive Atlas PDF is preserved under [research/sources/](research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf). Its useful direction is an evidence-grounded interactive model with overview and focused explanations, not an all-nodes graph. Its product rankings, prices and library claims are research leads, not verified facts.

## Surface Targets (Embeddability)

Every sub-project must plan how it reaches each of these surfaces before leaving the research stage:

| Surface | Role | Notes |
|---|---|---|
| **Web app** | Primary public-facing demo | Standalone site + shareable link per visualization |
| **VSCode extension** | In-IDE integration | Uses VSCode webview for rendering |
| **JetBrains extension** | IntelliJ / Rider / etc. | Shares core with VSCode ext |
| **Desktop app** | Offline power-user tool | Tauri preferred over Electron for size/perf |
| **Mobile app** | Viewer + share target | Read-only likely, not authoring |
| **CLI** | Scriptable / CI integration | Outputs artifacts to stdout / file |
| **Library** | Embeddable in other waremoto tools | Headless, language-agnostic over HTTP or stdio |

The **core** of every sub-project must be headless and framework-agnostic so that all of these surfaces are thin shells around the same logic — no surface-specific rewrites.

## Ghost AI Integration

Represent does not own its AI stack. All LLM calls go through Ghost's AI pipeline, which provides:
- Provider routing (Gemini / OpenRouter / local Ollama/vLLM)
- Prompt caching
- Rate limiting and retry
- Cost accounting
- Resilience / fallback chains

See [Ghost AI system docs](../../Ghost/docs/reference/ai-system.md) and [Ghost protocols](../../Ghost/docs/reference/protocols.md). Every Represent sub-project's `research/` brief must specify which Ghost protocol it will use (or propose a new one).

## Milestone Status

| Milestone | State | Notes |
|---|---|---|
| Docs doctrine and suite design | Complete | Protocol and source-grounded suite proposal exist. |
| Ghost AI wiring | Local Visu implemented | See measured Visu ledger; Grafe/Alegor require no AI. |
| Headless cores and CLI | Local MVPs implemented | Visu, Grafe, Alegor; IDE/mobile-native shells remain future work. |
| Ingestion and visual output | Local MVPs tested | Illustrated overview, focused JS/TS graph and Git/docs timeline. |
| Web surfaces | Local MVPs implemented | Visu 8871 (paused), Grafe 8873, Alegor 8874; no public hosted release. |
| Real-project and UX validation | Automated local trials complete | Two repositories, controlled copies and screenshots; unaided human validation remains open. |

## Current Sprint

Continue **Grafe and Alegor independently in parallel** from the completed local MVPs. Next Grafe validation: a larger multi-package JS/TS repository and an unaided caller-and-tests task, followed by measured incremental indexing and editor-follow/minimap exploration. Next Alegor validation: unaided project re-entry and one explicitly selected session-source preview with false/missed-link measurements. Neither waits on Visu or the other track. Keep Visu paused. Broader validation and connectors are follow-up work, not included in completed-MVP claims.

## Active Research

- [Companion interaction research](research/companions.md): ambient panel, query-first and change-digest alternatives; verified capabilities separated from inferred design rules.
- [Reference repository study](research/reports/Represent%20reference%20repository%20study.md): GitNexus, CodeBoarding, interactive-diagram, CodeCharta, Gource and Git City. [Inventory](research/reference-repos.json) records pinned commits and source paths. Eraser Diagrams was added for the [ROMPE trials](research/rompe-tool-trials.md).
- [Graphify field results](research/graphify-tested.md): ignore-awareness, cost, unlabeled clusters and indiscriminate rendering failures remain acceptance constraints.
- [Living project views report](research/reports/Represent%20living%20project%20views.md): product suite recommendation, Visu MVP, Grafe parallel design, snapshot service direction, and evidence-based UX gates. Names and service roles remain proposals.

## Completed

Visu's two local slices are promoted and paused. Grafe and Alegor local MVP implementations, real-project/copy trials, UI/UX rounds and detailed research records are complete; both are promoted with focused 10/10 and 12/12 verification at implementation commit `8a781edf`. Research includes preserved PDF/Notion analysis, pinned reference checkouts, source-grounded comparison, actual Gource execution, Skales public-material inspection and reproducible ROMPE trials. Automated checks do not establish market demand or human product acceptance.
