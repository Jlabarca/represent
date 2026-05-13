# Represent — Context

> Living doc. Single source of truth for project state, decisions, and current sprint.
> See `DOCS-PROTOCOL.md` for the rules that govern this file.
> Updated: 2026-04-13

## What is Represent

Represent is the **root workspace for all LLM-based visual representation projects** under waremoto. It lives at `D:/ware/represent` (repo: <https://github.com/Jlabarca/represent>). Multiple concrete projects — different visualization modes, different ingestion strategies, different output surfaces — will live here as sub-projects under one shared doctrine, one AI backend, and one embeddability target.

Each sub-project ingests source code (files, directory trees, git history, runtime traces) and outputs artistic visual representations — dependency graphs, creatures, cities, blueprints, animated minimaps, whatever makes a codebase legible at a glance.

The thesis: a project should have an iconic visual identity that reflects its real structure, not just a logo. Developers should look at the picture and understand relationships they'd otherwise have to read thousands of lines to recover.

## Current State

Pre-implementation. Repo bootstrapped 2026-04-13. Docs doctrine in place; no code, no sub-projects yet.

## Key Architecture Decisions (Locked)

| Decision | Choice | Reason | Date |
|---|---|---|---|
| AI backend | **Ghost AI pipeline** (not direct provider SDKs) | Reuse Ghost's provider routing, caching, resilience, and cost controls. No per-project API-key plumbing. Providers: Gemini primary, OpenRouter fallback, local Ollama/vLLM (RTX 3090). | 2026-04-13 |
| Embeddability | **First-principle, not afterthought** | Every tool must ship to the broadest public surface possible: web app, VSCode extension, JetBrains extension, desktop (Tauri-class), mobile, CLI, library. Core must be headless and framework-agnostic; surfaces are thin shells. | 2026-04-13 |
| Rendering format | _tbd_ | Likely SVG as v0 portable primitive (works in every surface), canvas/WebGL for interactive v1. Needs a POC to lock. | — |
| Ingestion v0 | _tbd_ | Candidates: git-walk, AST (tree-sitter / Roslyn), `codebase-digest` piped output, IDE-index scrape. Needs a POC to lock. | — |
| Workspace layout | **Monorepo under `D:/ware/represent`** | Shared doctrine + shared core + per-project subfolders. One docs tree at the root. | 2026-04-13 |

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

Bootstrapping. First concrete task is to land a research/ POC that survives Rule 6 validation.

## Active Research

_None yet._ POCs land under `docs/research/` and get referenced here.

## Completed

_Nothing shipped yet._
