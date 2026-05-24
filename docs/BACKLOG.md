# Represent — Backlog

> Non-blocking ideas, deferred work, parking lot.
> Items become active by moving to TODO.md.
> Resolved items: `~~strikethrough~~` + date + one-line resolution.
> See `DOCS-PROTOCOL.md` Rule 2.

## Active research informing this backlog

- [research/graphify-tested.md](research/graphify-tested.md) — 2026-05-20. Three runs of `safishamsi/graphify` on luz + drwario. Cost measured ($0.15 / 85 files), failure modes documented, action items extracted. **Read this before starting `/represent` skill design.**

## Visual mode ideas

- **Creature mode** — each file is an animal; class shape drives body plan, line count drives spikes, dependencies drive limbs. Pokémon / dinosaur flavor.
- **City mode** — RTS / SimCity-style overhead map; packages are districts, classes are buildings, hot runtime paths are traffic.
- **Actor mode** — each file is a stage actor whose costume encodes responsibility and whose props encode dependencies.
- **Blueprint mode** — technical architectural drawing, crisp lines, margin annotations.
- **Gource-like** — animated git history, but with semantic grouping rather than raw file paths.
- **Neopet mode** — persistent creature that evolves with the repo; shows relationships live as you code.

## Ingestion strategies

- Git-walk + blame for temporal signal
- Roslyn / tree-sitter AST parse for structural signal
- IDE index scrape (what JetBrains/VSCode already know) for zero-cost semantic signal
- Runtime trace ingestion (tie into drwario?) for hot-path signal
- Embedding-based clustering for "what belongs together"

## Output formats

- Static SVG / PNG (v0, cheap, shareable, works in every surface)
- Interactive web canvas (v1, zoomable, procedural LOD)
- Short animation / reel (v2, shows evolution over time)
- 3D mesh (v3, maybe GLB for embedding anywhere)

## Surface shells (embeddability targets)

Every sub-project ships to as many of these as possible. Core logic lives in a headless library; each surface is a thin shell.

- **Web app** — primary public demo, shareable link per visualization
- **VSCode extension** — webview hosts the renderer, uses the library directly
- **JetBrains extension** — shares core with VSCode ext
- **Desktop app** — Tauri preferred over Electron (smaller, faster)
- **Mobile app** — viewer + share target; Flutter or React Native candidates
- **CLI** — stdout artifact for CI / scripting
- **Library** — headless, callable from any waremoto tool over HTTP or stdio

## Ghost AI integration questions

- Which Ghost protocol does the first POC consume? (See `Ghost/docs/reference/protocols.md`.)
- Do we need a Represent-specific protocol for "code → visualization prompt" translation, or can we reuse an existing generic-reasoning one?
- How do we handle streaming responses from Ghost into incremental rendering?
- Prompt cache keys — what's the granularity? (per-file? per-commit? per-repo?)

## Non-blocking questions

- Local model (Ollama / vLLM) vs hosted — cost vs privacy vs quality tradeoffs
- How to handle giant monorepos without OOMing — streaming ingestion?
- Can we reuse `codebase-digest` output as ingestion input?
- Modding system for visual themes — let devs pick their aesthetic
