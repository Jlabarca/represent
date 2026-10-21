# Visu automatic discovery and manual snapshots

## Overview

<!-- CURRENT --> Visu accepts a project ID, name and absolute root. It chooses a bounded text scope, asks Ghost to choose six explanatory chapters, and renders a separately requested illustrated cover. Chapters distinguish current source-reported state, intended design and next steps. Short text is visible first; additional explanation and captured quotations expand on demand. The previous explicit-manifest path remains supported and its historical snapshots remain intact.

## Architecture

```mermaid
---
config:
  theme: dark
---
flowchart LR
  R["Git project root"] --> D["Free ranked discovery"]
  D --> S["Manual immutable capture"]
  S --> A["Manual bounded Ghost explanation"]
  A --> C["Cached six-chapter plan and citations"]
  C --> V["State / intended design / next steps"]
  C --> I["Optional manual illustration"]
  I --> V
  V --> U["Light / dark / monochrome UI"]
```

Discovery uses Git's tracked/untracked inventory, subtracts tracked ignored paths, and excludes hidden, secret, private, dependency, generated and data paths. It never executes source-project code. Git receives text-extension pathspecs so binary-heavy game repositories do not exhaust the inventory on asset names. Source roots and ancestors cannot traverse symlinks/junctions. The two MiB inventory, 20,000 candidate names, one MiB raw-file limit, 30 selected files, first ~10,000 characters per selected file and 600,000 selected-byte limit are deliberate bounds. Current context/TODO, identity, references, design, code and style have separate quotas. Links from README/current context increase priority. Selection reasons and incomplete-scope notes are exposed. See `src/visu/discovery.mjs:95`.

Each capture stores selected path, range, kind, role, hash and text. Identity excludes absolute root, Git HEAD and timestamps. Unchanged inputs deduplicate. Scans never call AI. A changed automatic snapshot has pending analysis and retains its earlier cover as stale until explicitly explained. Explanation uses up to 64,000 UTF-8 bytes of excerpts; first sections, current-state headings, implementation gates and supersession notes receive attention. The model cannot request arbitrary files. It selects six chapters, motifs and numbered references. Invalid references fail closed. Uncited fields are withheld as unknown without an automatic repair call. References prove excerpt existence, not semantic entailment. See `src/visu/analysis.mjs:44` and `src/visu/analysis.mjs:85`.

Analysis caching includes prompt/schema version, text alias, project name and captured path/role/range/hash. Image caching includes the visual recipe, name, style and image alias. Same-meaning chapter IDs/order/motifs persist where the model retains them. A status change can therefore update text without a new image; materially changed motifs or style mark the image stale. A changed chapter signature suppresses pins over an older incompatible illustration. Snapshots, view revisions and covers are separate immutable objects. See `src/visu/core.mjs:164`, `src/visu/core.mjs:206`, `src/visu/core.mjs:235`.

## Key Files

| File | Responsibility |
|---|---|
| `src/visu/discovery.mjs` | Generic safe bounded ranking, quotas, linked-source prioritization |
| `src/visu/analysis.mjs` | Excerpts, schema, Ghost text call, citation validation, stable chapter matching |
| `src/visu/core.mjs` | Capture/analysis/image cache, immutable history, locks, ledger, budgets |
| `src/visu/ghost.mjs` | Authenticated local gateway and validated inline images |
| `src/visu/{cli,server}.mjs` | Headless command/API surfaces |
| `web/visu/` | Manual actions, compact detail, themes, scope and history |
| `examples/visu/{rompe,luz,imagelab}.json` | Root-only identity configurations, no editorial input |
| `tests/visu*.test.mjs` | Regression tests, including ignored tracked files, cache and evidence failures |
| `scripts/visu-discovery-*.mjs` | Real trial, controlled-copy status update and browser evidence |

## API Surface

Existing authenticated local API remains on port 8871. `POST /api/projects/:id/scan` captures free; `POST /api/projects/:id/analyze` explicitly explains the latest capture; `POST /api/projects/:id/generate` explicitly creates or reuses its cover. Automatic projects require explanation before image generation. GET reads, export, history, themes and details make no AI requests. Legacy manifest generation retains its previous behavior. The CLI adds `analyze <id>` beside `scan`, `generate`, `list`, `serve`, and `export`; the same methods exist on the `Visu` library.

Project scope in bundles represents the latest capture; each snapshot also includes its own scope for accurate historical display. Full captured texts are included in deliberate exports. Neither source-root credentials nor gateway keys are exported. `scene.yaml` keeps the existing Represent envelope and embeds the selected view; `events.jsonl` records local view/capture events.

## Usage Guide

Add a JSON file to `examples/visu/` containing only `id`, `name`, and `root` (absolute path), then restart the service. Source projects must be Git repositories for automatic discovery. Explicit manifests remain the non-Git alternative. The source root must not contain Visu's store.

Use **Capture snapshot**, inspect **Generation records & source scope**, then **Explain snapshot**. Open **Read as an outline** to inspect chapter choice before optionally choosing **Create illustration**. Capture/explanation/image creation are manual. There is no watcher, timer, paid action on page load, or automatic image replacement. Change **Appearance** for Light, Dark or High contrast; it persists in localStorage and changes no data or AI settings. Monochrome applies grayscale to the existing art without generating a new asset.

`scripts/start-visu.ps1` accepts `-GhostEnvPath`, `-Port`, and `-MaxImageCalls` (default 6). It reads only the existing Ghost operator virtual-key assignment into the child process. The direct CLI default image-attempt ceiling remains 3; `VISU_MAX_IMAGE_CALLS` overrides it. Default text-analysis attempt ceiling is 12 per project state. `VISU_MAX_COST_USD` defaults to 1; this is a measured-spend stop, not a guaranteed invoice ceiling. Cache hits work after limits are exhausted. Unknown costs stay unknown. Failed/pending attempts count toward their stage limit. Different text aliases do not silently share caches, including offline capture.

`VISU_TEXT_MODEL` defaults to Ghost's `gemini-flash` alias; `json` remains available as the cheaper alternative. The live test found Flash Lite's handling of mixed historical/current documentation inadequate. Image calls use `VISU_IMAGE_MODEL` (default `image-gen`). At verification, routes were Ghost LiteLLM → OpenRouter → Google `gemini-2.5-flash` (text) / `gemini-3.1-flash-image` (image). The old `json` route was `gemini-2.5-flash-lite`. No direct provider client or Ghost configuration change was introduced.

## Caveats

- Scope and excerpts are bounded samples. Important implementation files or later document sections can be omitted; file-path and token heuristics do not establish full architectural understanding or a brand audit.
- Model-generated statements can misread stale docs, conflicts and implementation gates. This trial improved Luz's V3.5/current catalog explanation but still found residual contradictory recommendations and source-reported runtime assertions. Citations are navigable review evidence, not a fact-check certificate. Do not treat these views as runtime verification or use them to authorize implementation work without checking sources.
- Exactly six chapters and approximate two-row pins remain the v0 visual contract. It can over-segment small projects. The raster may include incidental labels despite the prompt; authoritative details and status live in the overlay.
- A changed explanation is one bounded whole-snapshot text call, not a delta-only per-chapter model call. No-op calls are free locally. Cached style/motifs keep images reusable; model-chosen material changes can still require a deliberate new image.
- Styling is a small heuristic vocabulary. Reference-only mention of generated pixel art does not establish the tool's own retro identity. Neutral low-confidence is an honest fallback.
- The client does not silently retry failed AI calls. Ghost itself may retry upstream according to its existing configuration (observed on 429); the local ledger records gateway requests/cost headers, not independent provider invoices.
- Theme contrast checks cover key text pairs and mobile overflow, not a comprehensive accessibility certification. Generated illustrations do not become semantically accessible just by being grayscale; the outline and text layer provide the alternative.

## Related Docs

[Initial MVP and compatibility path](visu-mvp.md), [actual trial and costs](../../experiments/visu-discovery/README.md), [implementation tracker](../impl/VISU-DISCOVERY-IMPL.md), [suite direction](../research/reports/Represent%20living%20project%20views.md).
