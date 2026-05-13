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

Pre-implementation. Doctrine in place, no code yet. See [docs/CONTEXT.md](docs/CONTEXT.md) for current state.

## Docs

All workspace documentation lives under [docs/](docs/). Start at [docs/CONTEXT.md](docs/CONTEXT.md).

The documentation protocol is strict — read [docs/DOCS-PROTOCOL.md](docs/DOCS-PROTOCOL.md) before adding or editing docs. Every POC in `docs/research/` must pass Rule 6 (System Intent / Ingestion Vector / Visualization Spec / Bootstrapping Steps).
