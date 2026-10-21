# Represent

> Root workspace for all **LLM-based visual representation** projects under waremoto.
> Lives at `D:/ware/represent`. Repo: <https://github.com/Jlabarca/represent>

Represent is the umbrella for tools, POCs, and products that turn source code (and other structured inputs) into artistic visual representations — dependency graphs, creatures, cities, blueprints, animated minimaps, 3D meshes. A project should have an iconic visual identity that reflects its real structure, not just a logo. Developers should look at the picture and understand relationships they'd otherwise have to read thousands of lines to recover.

Multiple concrete projects will live here. They share one doctrine, one AI backend, and one embeddability target — differ only in their visualization mode and ingestion strategy.

## Core tenets

- **Ghost AI backend.** All LLM calls go through Ghost's AI pipeline (providers, routing, caching, resilience). No per-project provider plumbing, no hardcoded API keys. See [Ghost AI system docs](../Ghost/docs/reference/ai-system.md).
- **Embeddability is a first principle.** Every tool built here must be deployable as broadly as possible: web app, VSCode extension, JetBrains extension, desktop app, mobile app, CLI, and library. The core must be headless and framework-agnostic; surfaces are thin shells.
- **Doctrine first.** Every POC follows [docs/DOCS-PROTOCOL.md](docs/DOCS-PROTOCOL.md) — System Intent / Ingestion Vector / Visualization Spec / Bootstrapping Steps, no exceptions.

## Status

Product pre-implementation, with runnable reference-tool experiments. Start with the [ROMPE explainer/poster comparison](experiments/rompe/index.html), the [living-overview interaction concept](experiments/rompe/living-overview-concept/index.html), and [trial findings](docs/research/rompe-tool-trials.md). Ten upstream checkouts inform the [v0 tracker](docs/REPRESENT-V0-IMPL.md); a general scanner and renderer remain planned.

**Current product direction (2026-10-21):** build toward one Represent suite with Visu's project-styled memorable overview first, while designing Grafe's technical explorer in parallel. The plane-sync scan is a Grafe engineering checkpoint, not a global product gate. See [docs/CONTEXT.md](docs/CONTEXT.md) and the [living project views design](docs/research/reports/Represent%20living%20project%20views.md).

## Docs

All workspace documentation lives under [docs/](docs/). Start at [docs/CONTEXT.md](docs/CONTEXT.md).

The documentation protocol is strict — read [docs/DOCS-PROTOCOL.md](docs/DOCS-PROTOCOL.md) before adding or editing docs. Every POC in `docs/research/` must pass Rule 6 (System Intent / Ingestion Vector / Visualization Spec / Bootstrapping Steps).
