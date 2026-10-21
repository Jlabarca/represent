# Represent — Context

> Living doc. Single source of truth for project state, decisions, and current sprint.
> See `DOCS-PROTOCOL.md` for the rules that govern this file.
> Updated: 2026-10-21

## What is Represent

Represent is the **root workspace for all LLM-based visual representation projects** under waremoto. It lives at `D:/ware/represent` (repo: <https://github.com/Jlabarca/represent>). Multiple concrete projects — different visualization modes, different ingestion strategies, different output surfaces — will live here as sub-projects under one shared doctrine, one AI backend, and one embeddability target.

Each sub-project ingests source code (files, directory trees, git history, runtime traces) and outputs artistic visual representations — dependency graphs, creatures, cities, blueprints, animated minimaps, whatever makes a codebase legible at a glance.

The thesis: a project should have an iconic visual identity that reflects its real structure, not just a logo. Developers should look at the picture and understand relationships they'd otherwise have to read thousands of lines to recover.

## Current State

Product pre-implementation, with working reference-tool experiments. Repo bootstrapped 2026-04-13. No Represent scanner or general renderer has shipped. Seven upstream repositories are cloned locally; ROMPE's two prompts have been exercised through interactive-diagram, Eraser Diagrams and an illustrated-poster baseline. See [trial results](research/rompe-tool-trials.md) and [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md).

## Key Architecture Decisions (Locked)

| Decision | Choice | Reason | Date |
|---|---|---|---|
| AI backend | **Ghost AI pipeline** (not direct provider SDKs) | Reuse Ghost's provider routing, caching, resilience, and cost controls. No per-project API-key plumbing. Providers: Gemini primary, OpenRouter fallback, local Ollama/vLLM (RTX 3090). | 2026-04-13 |
| Embeddability | **First-principle, not afterthought** | Every tool must ship to the broadest public surface possible: web app, VSCode extension, JetBrains extension, desktop (Tauri-class), mobile, CLI, library. Core must be headless and framework-agnostic; surfaces are thin shells. | 2026-04-13 |
| Rendering format | _tbd_ | Likely SVG as v0 portable primitive (works in every surface), canvas/WebGL for interactive v1. Needs a POC to lock. | — |
| Ingestion v0 | _tbd_ | Candidates: git-walk, AST (tree-sitter / Roslyn), `codebase-digest` piped output, IDE-index scrape. Needs a POC to lock. | — |
| Workspace layout | **Monorepo under `D:/ware/represent`** | Shared doctrine + shared core + per-project subfolders. One docs tree at the root. | 2026-04-13 |
| Development sequence | **Clone, study and exercise references; synthesize; design; build** | Operator's 2026-10-21 direction: use the Multica/Orkest approach, learning from working projects and adapting the strongest parts before inventing another stack. | 2026-10-21 |
| Compatibility target | **methrep's `represent.scene/v0` envelope + `events.jsonl`** | Reuse the stable boundary, not methrep's markdown parser or date-only append algorithm. Code metadata belongs in annotations; structural extensions need tests. | 2026-10-21 |
| First delivery gate | **First real plane-sync scene before enrichment, renderer or shell implementation** | Keep the P0-P4 kickoff, with source study ahead of P1. The actual tracked plane-sync tree is small (19 files), and requires JavaScript support. | 2026-10-21 |
| Current validation case | **ROMPE game-design prompts before scanner implementation** | Operator explicitly requested hands-on use of existing tools. These are upstream-renderer experiments, not a premature P3 product implementation. | 2026-10-21 |
| Document visualization boundary | **Audited facts → selected view → renderer** | The trials found real prompt/source discrepancies; valid layout alone cannot establish correct rules. Share provenance and qualifications across explainer and poster outputs. | 2026-10-21 |

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
| Docs doctrine | ✅ Done | `DOCS-PROTOCOL.md` + root living docs in place |
| Ghost AI wiring decision | ⬜ Pending | Pick which Ghost protocol(s) the first POC will use |
| First POC brief | ⬜ Pending | Needs a Rule 6 research/ entry |
| Headless core skeleton | ⬜ Pending | Must support all surfaces in the embeddability table |
| Ingestion pipeline spike | ⬜ Pending | |
| First visual output | ⬜ Pending | |
| First embedded surface (web) | ⬜ Pending | |

## Current Sprint

Hands-on ROMPE tool trials are delivered before new scanner code, following the operator's latest steering. Review [the local comparison](../experiments/rompe/index.html) and [findings](research/rompe-tool-trials.md). The original plane-sync checkpoint stays queued; choose implementation libraries only after a parser feasibility spike. P2-P4 remain downstream of the first scene.

## Active Research

- [Companion interaction research](research/companions.md): ambient panel, query-first and change-digest alternatives; verified capabilities separated from inferred design rules.
- [Reference repository study](research/reports/Represent%20reference%20repository%20study.md): GitNexus, CodeBoarding, interactive-diagram, CodeCharta, Gource and Git City. [Inventory](research/reference-repos.json) records pinned commits and source paths. Eraser Diagrams was added for the [ROMPE trials](research/rompe-tool-trials.md).
- [Graphify field results](research/graphify-tested.md): ignore-awareness, cost, unlabeled clusters and indiscriminate rendering failures remain acceptance constraints.

## Completed

No general product capability promoted. Research deliverables: preserved PDF, seven reference checkouts, source-grounded comparison, companion study, and reproducible ROMPE explainer/poster trials. Product implementation remains separate from those experiments.
