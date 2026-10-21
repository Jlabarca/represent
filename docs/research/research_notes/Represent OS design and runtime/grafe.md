# Grafe product direction: learning from Gource and Codevis

## What did Gource teach us, and where does it fit?

### Takeaway

Gource is a powerful reference for making repository history feel alive: it turns dated file changes into a moving directory tree with contributors. It does not explain code architecture or confirmed symbol relationships, so Grafe should borrow its temporal replay as a distinct “Evolution” mode while keeping a stable structural map and source-linked navigation as the primary experience.

### Cited Findings

- Gource’s own site describes its scene as a tree: the repository root is central, directories are branches, files are leaves, and developer avatars appear when they contribute. Its built-in log support covers Git, Mercurial, Bazaar and SVN. [Gource official site](https://gource.io/) (reviewed 2026-10-21; the current page announces v0.56, while the local experiment used v0.53).
- The local test used Gource v0.53 against the 114-commit GoCity checkout at `f2b5f40ced5929a8de100a87fec53bac0d296a06`. A 640×360, 25fps export took about 24 seconds and produced 426–427 raw PPM frames, about 294–295 MB. The retained frame shows directory paths, file dots and contributor avatars, but several labels collide at that resolution. The complete run record and retained image are [gource-run.json](../../../../experiments/grafe-reference-checks/gource-run.json) and [gource-gocity-midframe.png](../../../../experiments/grafe-reference-checks/gource-gocity-midframe.png). The image is a sampled replay frame, not an interactive app evaluation.
- A second local Gource v0.53 export used the 668-commit Algorithm Visualizer clone; it took roughly 30 seconds and produced about 491 MB of raw PPM output, while the opening frame was empty. A shallow one-commit repository was not a meaningful history input. The test therefore exposed export volume and history-window limits as well as the visual metaphor. [Run record](../../../../experiments/grafe-reference-checks/gource-run.json).
- The test is historical and version-specific. Gource’s official page now lists v0.56, released March 6, 2026; this update does not retroactively change what v0.53 produced in the local experiment. [Gource release notes](https://gource.io/).
- The user’s original Notion note says “Gource. Definitivamente lo mas cercano a lo que imagino,” and separately asks for a fast, efficient tool, Git-based input, broad-project support, recognizable themes and a future representation of runtime/build flows. This is a direct design signal from the product owner, not independent user research. [Original Notion note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md); see its “Gource” and “Performance / Big projects” portions.
- The companion reference analysis distinguishes Gource’s history/event replay from persistent project structure: its tree is animated by contributions and physics, whereas an architecture map needs stable identity and layout to compare places and revisions. [Spatial history research](../Represent%20reference%20repository%20study/spatial-history.md).

### Inferences

- **What to borrow:** a scrubber over time, visible dates, a clear sense that files and contributors are changing, and the immediate emotional legibility of “activity moving through the project.” Keep pause, step, playback speed, date-range controls and a path filter. These are proposed interaction ideas inspired by Gource; the local test rendered video frames and did not evaluate Gource’s interactive controls.
- **What not to borrow as the default architecture view:** the force-driven, moving tree, transient contributor avatars as architectural importance, or a scene that is only legible while it animates. Movement answers “what changed when?” It does not answer “what is this module for?”, “who calls this function?”, or “what code supports this edge?”
- **Proposed Grafe split:** keep an Overview with stable directory/package placement and aggregate structure; a Focus view for symbol/file relationships and code evidence; and an optional Evolution view that animates Git events over the same stable map. For Evolution, preserve location for unchanged entities, animate only additions/removals/changes, and let each selected event open its commit and source diff. The stable map is a product recommendation informed by the local Gource frame’s label crowding and the spatial-history study, not a feature already implemented.
- **Keep “runtime” separate from Git history.** A commit says that a file changed; it does not prove that a function executed. A future runtime view should require real profiler/trace data, display capture time and environment, and distinguish observed paths from statically inferred relationships. The Notion “Code runtime doctor” and main vision notes describe this aspiration, but Grafe currently has no runtime tracer.
- The Gource export’s several-hundred-megabyte raw output is a reason to use event/state data and render interactively only when needed, rather than retaining rendered frame sequences as snapshots. It is not a browser performance benchmark, nor proof that Gource itself uses the same memory/storage profile in ordinary interactive use.

### Gaps

- We have not evaluated Gource v0.56 locally, benchmarked its interactive playback, tested accessibility, or compared behavior on a large monorepo. The v0.53 batch export is useful qualitative evidence only.
- We have no validated user study showing whether developers want contributor avatars or animated replay in daily code understanding. The owner’s Notion note and one local frame do not establish demand.
- The desired source of future runtime data, process overhead, privacy model and relationship to snapshot identity are not decided.

## What is the Codevis reference, and what does it imply for Grafe?

### Takeaway

The Codevis in the owner’s screenshot is the exact project `github.com/divan/codevis`, an early alpha Go visualization experiment described by its author in 2019; its GitHub URL currently returns 404, and the cause is unknown. The similarly named public KDE Codevis is a separate C++ maintenance tool. The screenshot and author’s article support code-bearing spatial navigation as the inspiration, but they do not provide a current source repository to copy or a proven general-purpose design.

### Cited Findings

- The screenshot preserved from Notion visibly names `github.com/divan/codevis/cmd/codevis` and contains code snippets within graph nodes. Its byte-for-byte copy is [notion-codevis.png](../../../../experiments/grafe-reference-checks/notion-codevis.png). The parent Notion page also links the “Go Visual” note. [Original page](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md).
- The exact [divan/codevis URL](https://github.com/divan/codevis) returned 404 when checked on 2026-10-21. Divan’s 2019 post calls it an early-alpha experiment, says it worked in the browser with a local filesystem server, and describes a WebGL/Three.js 3D relationship map. The post explicitly labels it experimental and based on subjective assumptions; it says the author was only about 20% through the planned implementation. [Author’s post, “Rethinking Visual Programming with Go”](https://divan.dev/posts/visual_programming_go/).
- The author says his prototype was not a call graph, and explains that he wanted zoom-dependent relationships: at package zoom he wanted one kind of connection; at function zoom he wanted more local detail. He also describes rendering function text when a concept cannot be usefully decomposed further. These are the author’s own design claims and prototype intent, not independently validated usability results. [Author’s post](https://divan.dev/posts/visual_programming_go/).
- Public [KDE Codevis](https://github.com/KDE/codevis) identifies itself as a C++ source/dependency maintenance visualizer. Its guide documents a package/namespace tree, forward and reverse dependency controls, configurable traversal depth, covered nodes that can be expanded, a node-detail pane, and a minimap showing the current viewport. It requires generating a C++ code database from compilation information. [KDE Codevis README](https://github.com/KDE/codevis/blob/main/README.md); [official getting-started guide](https://github.com/KDE/codevis/blob/main/doc/getting_started.md).
- The owner’s April Notion attempt asks for representations of concrete structures (lists, dictionaries, pools, state machines), interaction counts and a configurable technical level; it also asks for IDE/web viewing. The MiniMap note describes a viewport that follows code navigation, can zoom out to the whole project, and can be detached from following. These notes make code detail and navigation part of the original product vision, while leaving the exact visual metaphor open. [11 April Attempt](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/11%20abril%20Attempt%201d316a8a3d6580aa9dbbf1e1a3df496f.md); [MiniMap](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap%2031116a8a3d65801ba934c246225923bf.md).

### Inferences

- Grafe’s distinctive promise should be **“navigate code as a map, verify every connection in code.”** Start with the evidence and explainable relation types. Use spatial placement to help orientation, while keeping file paths, qualified symbol names and source excerpts visible and selectable. A beautiful map that cannot show why an edge exists repeats the weakness of ungrounded architecture pictures.
- A zoom-level contract is more useful than “show everything”: overview = package/directory and major symbols; focus = callers, callees, references and tests around one selected symbol; detail = source excerpt, exact path/line and relation provenance. Expand one neighborhood/path at a time. Keep source outline/search and a list/table view available when the graph becomes dense.
- The user’s game-like minimap idea aligns with the KDE Codevis viewport cue and the original Notion note. **Proposed:** a small, optionally detachable project map that marks the active viewport/selected symbol, follows navigation by default, and can be unpinned to explore. The current Grafe MVP has a focused graph, source outline, search, evidence list and details; it does **not** implement the project-wide viewport minimap, detachable follow mode, IDE cursor sync or 3D world.
- The authored “physical vs logical” distinction in KDE Codevis is a useful design cue: show filesystem/package placement separately from semantic symbol relationships instead of implying that neighboring files are necessarily connected. Keep graph depth and relationship kind explicit. [KDE getting-started guide](https://github.com/KDE/codevis/blob/main/doc/getting_started.md).
- Avoid inferring architecture from folder proximity, co-change, names or runtime traces without labeling the source of that evidence. A candidate edge should remain visibly a candidate. The implemented Grafe does this for unresolved/text-matched candidates and checker-resolved relationships; it is JS/TS-only and bounded to captured source. [Grafe reference](../../../reference/grafe-mvp.md); [real pilot](../../../../experiments/grafe-mvp/README.md).
- Treat “technical level” as progressive disclosure rather than separate truth modes: a plain-language caption and a compact graph first; on selection, show precise edge kind, qualification, file/line, snippet, extractor/coverage and ambiguity. This adapts the owner’s adjustable-detail idea while preserving evidence. It is proposed; the current UI exposes technical details and citations but does not offer a general novice/expert level setting.
- The 3D/force-directed layout in the divan experiment shows both the appeal and cost of the idea: the author calls physics tuning difficult and notes performance challenges around text and many lines. A responsive 2D stable layout is the lower-risk first product recommendation; 3D/isometric theming can be tested later as a renderer/theme over the same data, without making it the only navigation mechanism. [Author’s post](https://divan.dev/posts/visual_programming_go/).

### Gaps

- The original `divan/codevis` source is unavailable at the checked URL; we cannot verify its present ownership/status, inspect its implementation, reproduce its build or confirm later maintenance. A 404 does not establish that it was made private.
- KDE Codevis was reviewed through its public documentation but was not cloned, built or run in this test. Its workflow is C++/compilation-database-centered; we have not shown that its interaction model transfers unchanged to Grafe’s JS/TS pilot.
- The owner’s old notes describe useful aspirations, not a validated priority order. In particular, data-structure recognition, natural-language themes, AI-generated labels, IDE integrations and runtime paths need separate evidence and scope decisions.

## What should Grafe feel like, and what is implemented today?

### Takeaway

Grafe should be a technical workspace inside the broader Represent experience: an interactive map for orientation, a focused evidence view for understanding and change impact, and a history layer for evolution. The current MVP is already a useful evidence-first symbol explorer; a persistent project map, Gource-like history mode, runtime data, AI interpretation, IDE sync and richer project-specific visual identity remain future work.

### Cited Findings

- The current product reference describes a local, zero-AI JavaScript/TypeScript explorer. It captures a bounded configured scope, creates stable symbol and relation identities, and presents a selected symbol with source-linked callers, outgoing relations, candidates, snippets and scope notes. Refresh is manual; identical content reuses a snapshot. [Grafe MVP reference](../../../reference/grafe-mvp.md).
- Real pilot results: Plane Sync indexed 6 selected source files (101,151 bytes), 75 symbols and 437 relations; `upsertImpl` resolved to three production callers, while five dynamic-import test mentions were shown as candidates. Represent indexed 51 selected files (347,468 bytes), 244 symbols and 2,036 relations; `analyzeProject` had seven checker-linked test references but no direct production call. First scans took about 784 ms and 953 ms respectively. These are bounded-scope measurements, not full-repository coverage guarantees. [Pilot report](../../../../experiments/grafe-mvp/README.md); machine details in [real-project-audit.json](../../../../experiments/grafe-mvp/real-project-audit.json).
- The controlled-copy refresh showed that no-op indexing reused the same snapshot ID, changing `runner/afkbot.mjs` changed the ID, unaffected symbol IDs remained stable, and the original worktree’s HEAD/status/selected hashes stayed unchanged. Refresh is a bounded full rebuild, not per-file incremental compilation caching. [Pilot report](../../../../experiments/grafe-mvp/README.md).
- The MVP browser UI has a focused graph and a separate Evidence list, search, source outline/details, history selector, light/dark themes and responsive keyboard/touch use. The documented browser check passed 16 assertions. Its current-purpose flow is to find/select a symbol and inspect source-linked relationships. [Pilot report](../../../../experiments/grafe-mvp/README.md); [implementation guide](../../../reference/grafe-mvp.md).
- Represent’s product notes position Represent as a suite of interactive representations and describe Alegor as the companion/project-continuity direction. This creates a plausible home for Grafe and its snapshots within a Represent web shell, but does not mean the OS-style shell or integration exists in Grafe today. [Original vision](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md); [current Grafe reference](../../../reference/grafe-mvp.md).

### Inferences

#### Recommended product sentence

**Grafe maps code structure, shows how a selected part connects, and lets you verify every claim in source.** History and runtime can enrich that map, but each signal must retain its own provenance.

#### Three-question user journey

1. **“Where am I?”** Open a project at its last saved snapshot. Show the repository/package outline, an orientation map, the selected file/symbol, indexing coverage and limits. Search or click an area to focus it. This is the proposed Overview; the current project selector/source outline/search provide only part of this path.
2. **“What is this, and how does it connect?”** Select a symbol. Show a small, readable neighborhood grouped by callers, outgoing calls/uses, references and tests. Selecting an edge opens its exact source line and why the relation is classified as confirmed or candidate. This is the current MVP’s strongest implemented loop.
3. **“What changed, and what might I need to inspect?”** Compare saved snapshots or select a commit range. Highlight changed symbols/files on the stable map, then list affected callers/tests with evidence and unknown coverage. An optional Evolution replay shows the same changes moving over time. The MVP stores snapshots and history but does not yet provide this integrated impact-analysis or animated history experience; runtime traces would be another separately labeled source.

#### Proposed map, minimap and evolution modes

| Mode | Main question | Suggested representation | Status |
|---|---|---|---|
| **Overview** | Where does this part live in the project? | Stable, zoomable 2D hierarchy from directories/packages to files and major symbols; provide labels, coverage, search, and selection. A small viewport minimap follows the selected area and can be unpinned. | Proposed. Current UI has source outline and focused graph, not project-wide overview/minimap. |
| **Focus** | How does this selected item relate to nearby code? | Small typed graph plus source outline/evidence table; directions and edge depth explicit; node selection opens source evidence. | Implemented narrow form in the current JS/TS MVP. |
| **Evolution** | What changed over time, and who/what changed with it? | Gource-inspired scrub/playback over stable layout; animate path/symbol changes, allow date/commit/path filters, and open commit diff. Keep contributor activity optional and do not equate it with importance. | Proposed. Local Gource test was an offline PPM replay only; Grafe has snapshot history but no event animation. |
| **Runtime** | What actually ran in a captured scenario? | Overlay profiler/trace observations with capture metadata, environment and source links; visually distinguish observed execution from static inference. | Future data source from owner’s vision; not implemented or tested. |

#### Relationship to Represent OS and Alegor

- **Represent OS** can provide the shell, project picker, persistent workspace and launch surface; Grafe should remain a focused work app rather than requiring a desktop metaphor for its graph. The shell idea is a product direction, not an existing Grafe capability.
- **Alegor** can keep the dated project snapshots and “since you were here” context; Grafe can open the map and evidence at a chosen snapshot. If this is built, snapshot identity should be shared, while each generated Grafe index/view records its own analyzer version and scope. This integration is proposed and not present in the MVP.
- The map should feel project-specific through a restrained theme (color, shapes, labels or icons tied to declared data), but semantic meaning must remain stable and have a legend. The original notes mention themes/modding and imagery; no tested evidence yet shows that a custom theme improves code comprehension.

#### Product order recommendation

1. Tighten the existing Focus path with a short guided sample: select `upsertImpl`, see its three real callers, and open the cited lines. Show “5 test mentions are candidates” with an explanation of why they are not confirmed calls.
2. Add a deterministic **Overview** using the already captured hierarchy and stable identities; test whether users can locate a known file/symbol and recover orientation after zooming. Add the viewport minimap only if the hierarchy is too large to keep orientation; otherwise it risks decorative duplication.
3. Add **change highlighting** between two snapshots before full Gource-style playback. First validate that changed paths/symbols map cleanly and preserve positions; then decide if continuous animation helps beyond a diff list and timeline.
4. Treat runtime tracing and AI-generated architectural summaries as separate capability expansions. For each edge or explanation, show whether evidence is compiler-resolved, Git-derived, trace-observed, human-declared or model-suggested.
5. Test with task completion (locate a function, verify its callers, find what changed) and evidence correctness. Do not use GitHub stars or visual novelty as demand validation.

### Gaps

- No usability study has compared a stable overview, a focus graph, Gource-like replay or a minimap. The proposed journey is a coherent hypothesis derived from the owner’s notes, the existing MVP and source documentation.
- No trial yet shows that inferred lists/dictionaries/pools/state machines can be identified reliably across languages or that those structures should appear in the initial map. Each would need language-specific evidence and explicit confidence.
- A shared Represent OS/Alegor snapshot identity and renderer contract have not been designed or implemented. This memo recommends the product relationship but does not set their architecture.

