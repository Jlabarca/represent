# Spatial History Reference Repository Study

**Verified:** 2026-10-21. Repositories cloned shallowly with submodules disabled; this note describes the checked-out source at the recorded commits. Source inspection is separate from application execution: neither project was run here.

## Visual Metaphor, Spatial Stability, and Change Animation

### Takeaway

Git City is the stronger reference for Represent's legible, stable spatial model: directory hierarchy becomes nested districts, files become plots/buildings, data properties map to understandable visual channels, and it precomputes one layout across history so time scrubbing changes building state without moving files. Gource is stronger as a kinetic replay of actors touching files, but its force-driven tree and transient avatars should not be the default overview for a persistent architecture map.

### Cited Findings

- Gource describes its repository as a tree with root at center, directories as branches, files as leaves, and contributor sprites appearing/disappearing around files/directories. [README at checked-out revision](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/README.md#L1-L20)
- Gource hashes paths to initialize directory positions and then moves the spring-like system with accumulated acceleration; this provides repeatable initial placement but the layout responds dynamically to contributions and physics. Its CLI exposes a hash seed. [dirnode.cpp](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/src/dirnode.cpp#L770-L825), [README options](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/README.md#L300-L320)
- Git City says directory tree forms nested districts and file plots; plot area is weighted from square-root peak lines-of-code across history. Its README says files remain spatially fixed while timeline scrubbing changes building/crop dimensions, with layout recomputed only when peak sizes change. [README: model and history](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/README.md#L20-L40), [README: history/layout](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/README.md#L145-L166)
- Git City's squarified treemap algorithm builds a directory tree and deterministically allocates nested file/directory rectangles from sorted weights. In equal-weight ties, ordering is not explicitly tie-broken in this function, so byte-identical layout across all input orderings is not established by this source alone. [treemap.ts](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/renderer/src/layout/treemap.ts#L1-L145), [treemap.ts layout entry](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/renderer/src/layout/treemap.ts#L260-L310)
- Git City animates building heights and colors toward targets with exponential interpolation while keeping each building instance tied to a file-path index. [Buildings.tsx](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/renderer/src/city/Buildings.tsx#L36-L105)

### Inferences

- Represent should separate persistent identity/layout from changing measures: stable node IDs and deterministic cluster placement; animate only explicit changed properties and additions/removals. If an analysis change necessarily reshapes layout, identify it as a layout revision and preserve camera/selection by stable ID.
- Adapt Git City's hierarchy and visual channels (e.g. cluster type, activity, ownership) as optional theme mappings; avoid literal city decoration unless it encodes project data. Its own README cautions that file caps do not make huge projects readable, so overview selection and cluster-level aggregation still need first-class treatment.
- Borrow Gource's visual emphasis on temporal actors/actions for an optional event replay. Keep it subordinate to a static overview, with pause/scrub and source-linked event details; avoid treating author activity as architectural importance.

### Gaps

- Source and README support stable geometry through history replay, but no independent pixel-level or cross-platform determinism test was run. Git City may have other input canonicalization that resolves treemap equal-weight ties; this study only confirms what the cited function shows.
- These projects visualize file history/size and change events, not semantic imports or architecture. Their fidelity to Represent's intended semantic model remains untested.

## Git-History Ingestion and Incremental Data Contract

### Takeaway

Git City demonstrates an efficient local history projection: one first-parent raw/numstat stream accumulates file line-count state and samples bounded full snapshots; new commits can splice onto a cached head if ancestry invariants hold. Gource offers a simpler event stream concept and multi-VCS/custom-log adapters, but its parser is older and format details should not be copied blindly.

### Cited Findings

- Git City reads `git log --first-parent --reverse --no-renames --raw --numstat` in one streaming pass. It cumulatively applies additions/deletions to track line counts at each mainline commit without checkout or per-file git reads. The default timeline keeps about 50 spaced captures. [README](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/README.md#L145-L166), [analyze.ts stream/parser](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/main/git/analyze.ts#L120-L232)
- Its snapshot contract contains commit hash/date/author/message/index and file state (path, LOC, touch count/time, author, binary flag); compact storage interns strings and stores columns in typed arrays, materializing only the displayed snapshot. [types.ts](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/shared/types.ts#L1-L75), [snapshots.ts](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/shared/snapshots.ts#L1-L112)
- The incremental path checks unchanged HEAD, ancestry, first-parent chain identity, and commit count; if history was rewritten or the path cannot safely splice, it falls back to full replay. Cached path/author intern tables append IDs to keep old captures valid. [analyze.ts incremental splice](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/main/git/analyze.ts#L460-L565), [incremental tests](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/main/git/incremental.test.ts)
- Git City's `CompactSnapshot` comment reports approximately 25 bytes per file-capture entry and explains the motivation: avoiding >500 MB object snapshots for a monorepo. README reports its own measured repo scenarios, including 14,271 first-parent commits in ~133 seconds and 73 MB compact arrays vs 541 MB object data. These are upstream-reported measurements, not reproduced here. [types.ts](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/src/shared/types.ts#L18-L42), [README measurements](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/README.md#L168-L198)
- Gource's Git adapter invokes `git log --reverse --raw --encoding=UTF-8 --no-renames` with username and timestamp fields, parses commit files/actions, and converts them into per-file create/modify/remove actions. It also supports other VCS formats and custom/stdin logs. [git.cpp](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/src/formats/git.cpp#L80-L125), [git.cpp parser](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/src/formats/git.cpp#L198-L245), [processCommit](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/src/gource.cpp#L1188-L1255)

### Inferences

- For Represent, copy the stream-and-replay approach only for git-history signals; maintain the separate deterministic source scan as the authoritative current structure. A compact contract could keep current scene plus a bounded set of history snapshots/events and stable IDs rather than storing a full object graph per commit.
- Preserve raw commit and path evidence, specify rename and merge policy, and report when metrics are first-parent-only. Git City's no-renames setting makes line-count deltas simple but means path identity is not rename identity; do not present that as rename detection.
- Use immutable revision/hash plus index in history references. Validate cache base precisely and fall back to full scan/replay after rewrites rather than guessing. Keep caches bounded and expose progress/cancel because history cost grows with commit count.

### Gaps

- Git City's stream parser skips rename detection (`--no-renames`) and its first-parent model omits side-branch histories from the spatial timeline. Whether that is appropriate depends on Represent's desired history semantics.
- Neither implementation's change log contains semantic edges in the Represent sense. Neither demonstrates incremental parser caching for current source-code relationships.

## Reuse, Adaptation, Licensing, and Windows Feasibility

### Takeaway

Use both repositories as references, not as direct source imports for the v0 design: Git City is MIT and TypeScript but is an Electron desktop git client with a large dependency/tooling surface; Gource is a GPL-3.0 C++/OpenGL application with a substantially different architecture. Source-only research and local cloning succeeded; neither executable/test suite was run in this pass.

### Cited Findings

- Gource identifies itself as a software version-control visualization tool; its repository includes `COPYING` containing GNU GPL version 3. [GitHub repository](https://github.com/acaudwell/Gource), [COPYING](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/COPYING)
- Git City identifies itself as a Three.js city and git client, advertises Windows/macOS/Linux downloads, and the checked-out root `LICENSE` is MIT. [Repository](https://github.com/maximalcode/git-city), [LICENSE](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/LICENSE), [package.json scripts/dependencies](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/package.json)
- Git City package scripts offer Vitest unit tests and Playwright E2E; package declares Electron, Three.js, React, Vite, and Vitest dependencies. A local `node_modules` directory was absent in this checkout. [package.json](https://github.com/maximalcode/git-city/blob/8eacc4b8b5d3abdb334882016a4673fca83d3663/package.json)
- Gource's README says it renders via OpenGL and needs a 3D-accelerated video card; build metadata and source are C++/Qt-era/autotools. [README](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/README.md#L20-L45), [INSTALL](https://github.com/acaudwell/Gource/blob/70db547c6b8b40745fb41a8db7e8d28897be1a9e/INSTALL)

### Inferences

| Reuse / adapt | Avoid |
|---|---|
| Git City: data model separation, columnar compact snapshots, bounded history sampling, explicit parser fallbacks, stable keyed scene objects, small pure layout functions with tests. | Directly copying its Electron/git-client machinery into a minimal Represent panel. Avoid tying Represent's scene contract to line counts or Git alone. |
| Gource: event-oriented playback, explicit actor/action timeline, custom log as a possible interchange pattern, visible time controls. | Copying GPL code into Represent absent an explicit licensing decision; force-directed physics as default architecture placement; Gource's legacy command construction/parser as a safe production subprocess pattern. |

Gource is identified as GPL-3.0 in repository metadata; its `COPYING` text permits version 3 or any later version. Git City root license identifies MIT. This is factual license metadata, not legal advice; any source reuse must preserve applicable notices and receive project-level review.

### Gaps

- Windows runtime support is documented by Git City release metadata/README, but a released Windows binary was not installed or evaluated. Source inspection does not establish frame rate, accessibility, rendering quality, or a successful build on this machine.
- I did not run tests because dependencies were not installed; installing the complete Electron/Three.js/Playwright development tree would be a sizeable setup and was not needed for source inspection. Gource was not built; its OpenGL toolchain and dependencies are absent/unverified. No app execution or performance results are claimed.

### Clone and local verification record

| Repository | Local clone | Origin HEAD (shallow) | License identifier/file |
|---|---|---|---|
| [acaudwell/Gource](https://github.com/acaudwell/Gource) | `D:/ware/represent/references/gource` | `70db547c6b8b40745fb41a8db7e8d28897be1a9e` | GPL-3.0 / `COPYING` |
| [maximalcode/git-city](https://github.com/maximalcode/git-city) | `D:/ware/represent/references/git-city` | `8eacc4b8b5d3abdb334882016a4673fca83d3663` | MIT / `LICENSE` |

Both clones use `--depth 1 --no-recurse-submodules`; both working trees were clean after cloning and inspection.
