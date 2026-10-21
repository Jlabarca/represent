# Reference Research: GoCity, Creative Coding, and Algorithm Visualizer

## System Intent

Represent should give someone a memorable, project-style overview first, then let them inspect technical structure and evidence in detail. Both views should describe the same evolving project snapshots; snapshots can support a timeline, comparisons, and replay.

## Ingestion Vector

```text
repository / docs / git history
  -> deterministic file and symbol inventory (facts with source spans)
  -> @LLM cached semantic annotations (purpose, relation, uncertainty; optional/on demand)
  -> versioned snapshot + event/change records
  -> @LLM view suggestions (optional; selected composition/theme, with evidence links)
  -> still overview / interactive animated visu / technical source graph
```

Keep parser observations, model-generated claims, and user-authored corrections identifiable as different evidence classes. Do not interpret LOC, method counts, stars, or folder names as architecture facts.

## Visualization Spec

- **Overview/visu:** one memorable project-wide composition in the project's visual style; progressive detail via hover, popovers, and drill-down; a timeline or scrubber for snapshots; still-image export.
- **Technical:** navigable directory/module hierarchy, typed edges with filters, compact size/complexity indicators, source anchors and code snippets in node details, with uncertainty and source evidence visible.
- **Shared model:** stable identities across scans, snapshot IDs, generated timestamp, provenance per claim, confidence or unknown state, explicit diffs, and deterministic layout anchors where nodes persist.

## Bootstrapping Steps

1. Define one snapshot schema for both views, with source evidence and stable node IDs.
2. Start the technical projection from deterministic inventory and a few typed relations; keep code excerpts in an accessible detail panel.
3. Create a still overview from the same snapshot, detect or offer a theme, and add one useful hover/popup detail layer.
4. Save two snapshots and implement a simple timeline/diff before adding continuous animation.
5. Measure refresh cost, layout stability, readability, and source-link correctness on small and medium projects. Add a larger project after choosing limits and aggregation behavior.

## What GoCity contributes to a technical Represent view, and what it cannot establish

### Takeaway

GoCity is a useful technical-view precedent for turning a deterministic syntax-tree summary into a spatial overview, with hover details and a direct jump back to source. It measures Go code shape; its city metaphor does not infer architectural meaning, runtime behavior, or concept-level relationships by itself.

### Cited Findings

- The current public repository describes directories as districts, files as buildings, and structs as buildings placed on files; LOC darkens color, variable count affects footprint, and method count affects height. It supports local or GitHub project input. [GoCity README](https://github.com/rodrigo-brito/gocity/blob/f2b5f40ced5929a8de100a87fec53bac0d296a06/README.md)
- At the inspected revision, `pkg/analyzer` walks Go files with Go's `go/parser` and AST; its visitor counts fields/attributes, structs, receiver methods, function-body lines, and file-level declarations. `pkg/model` assembles package/file/struct nodes, calculates rectangle dimensions/positions, and links nodes to GitHub source URLs. [AST analyzer](https://github.com/rodrigo-brito/gocity/blob/f2b5f40ced5929a8de100a87fec53bac0d296a06/pkg/analyzer/analyzer.go), [AST visitor](https://github.com/rodrigo-brito/gocity/blob/f2b5f40ced5929a8de100a87fec53bac0d296a06/pkg/analyzer/visitor.go), [scene model and source links](https://github.com/rodrigo-brito/gocity/blob/f2b5f40ced5929a8de100a87fec53bac0d296a06/pkg/model/node.go)
- The paper describes a processing/frontend split: fetch, parse metadata, establish hierarchy and positions, cache processed projects, then render an interactive Babylon.js/React city with rotate/zoom controls. Hover presents LOC, methods, and attributes; a button opens the corresponding GitHub location. [GoCity SANER paper, architecture and interaction](https://homepages.dcc.ufmg.br/~mtov/pub/2019-saner-gocity.pdf)
- The paper reports 23,000 unique users in November 2018 and approximately 1.3K GitHub stars at that time. In a separate feedback study, 12 of 60 contacted project owners replied; 8 of 11 answering the architecture question said it offered useful information, and 6 of 10 answering the maintenance question said it could help. The paper itself cautions that 12 responses from popular, non-organizational Go projects do not generalize to other systems. [GoCity SANER paper, abstract/introduction and survey/threats to validity](https://homepages.dcc.ufmg.br/~mtov/pub/2019-saner-gocity.pdf)
- The local Notion export contains a screenshot with the visible title `github.com/divan/codevis/cmd/codevis` and code text inside a node-and-edge graph. Opening the exact owner route `https://github.com/divan/codevis` returned 404 on 2026-10-21; this does not establish whether the repo is private, deleted, or moved. The public [KDE/codevis](https://github.com/KDE/codevis) repository is a different project and should not be conflated with the screenshot. Screenshot: [Notion export image](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Untitled.png).

### Inferences

- For Represent's technical view, the most transferable pattern is a traceable hierarchy plus compact metrics and source-backed hover/click detail. Keep inferred relationships and narrative labels visibly distinct from parser facts.
- A useful first code model can stay deterministic: stable node IDs, parent/child placement, measured properties, source spans, and file links. Later semantic extraction can add typed relations without claiming that a size metric explains what a module does.
- A 3D city can give a memorable whole-project silhouette, but should be one optional presentation over the same inspectable project model. It does not need to be the default infographic style.

### Gaps

- The study is from 2019 and the user count is a historical figure reported by the authors, not a current activity measure. No current usage telemetry or independently measured user count was found.
- The paper's evaluation is a small response sample and concerns Go developers and Go systems. It does not establish that code cities improve comprehension for every language, team, or project.
- The `divan/codevis` 404 does not reveal repository visibility history or whether another canonical home exists.

## Does Algorithm Visualizer's large star count show that people use it?

### Takeaway

Algorithm Visualizer has unusually strong public engagement signals and a real educational product with examples, a live demo, and a separate algorithms repository. Stars alone do not answer how many people use it; its architecture is intentionally instrumented educational code, so it is a reference for interactive playback and detail-on-demand, not automatic whole-repository understanding.

### Cited Findings

- On 2026-10-21, the repository page displayed 48.9K stars, 7.6K forks, 1.2K watching, 668 commits, and a live demo link. These are visible GitHub activity/interest measures, not a count of unique users or active deployments. [Algorithm Visualizer repository](https://github.com/algorithm-visualizer/algorithm-visualizer)
- The README says the main repository is a React app that interprets visualization commands; a separate `algorithms` repository contains the menu's contributed educational examples, and separate tracer libraries extract visualization commands from code in supported languages. The algorithms repository README says examples shown in the site currently support JavaScript, C++, and Java. [Main README](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/18de2edf6b629e843ee4bcedfa2208d22b253f0f/README.md), [algorithms README](https://github.com/algorithm-visualizer/algorithms)
- The code skeleton asks authors to instantiate `Array2DTracer`/`LogTracer`, then place marked `visualize` calls around the desired state changes. The viewer replays serialized commands against tracer and layout classes. Thus, the visual stream is authored/instrumented as part of the algorithm, rather than discovered from arbitrary unannotated source. [JavaScript skeleton](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/18de2edf6b629e843ee4bcedfa2208d22b253f0f/src/files/skeletons/code.js), [visualization command interpreter](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/18de2edf6b629e843ee4bcedfa2208d22b253f0f/src/components/VisualizationViewer/index.js)
- Available tracer types in the inspected source include arrays, graphs, charts, scatter plots, logs, and Markdown. The GitHub page identifies the project license as MIT. [Tracer implementations](https://github.com/algorithm-visualizer/algorithm-visualizer/tree/18de2edf6b629e843ee4bcedfa2208d22b253f0f/src/core/tracers), [license](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/18de2edf6b629e843ee4bcedfa2208d22b253f0f/LICENSE)

### Inferences

- The star count is not suspicious on its own: the public repository and its companion algorithms repo expose concrete educational material and a runnable service, while forks, watchers, commits, and a live demo are additional observable signals. None reveals how many people currently use it or whether it's used in classes or production; don't turn the signals into an adoption estimate.
- The useful pattern for Represent is the explicit event/tracer stream and synchronized views: code line, data structure, and log can advance together. A project-evolution companion could reuse this idea for playback across snapshots, with one project model driving timeline and detail panes.
- For Represent visu, the renderer should consume semantically selected project facts and evidence. For the technical view, a deterministic extractor can provide hierarchy and links; deeper explanations can be generated on demand and cached. Algorithm Visualizer supplies precedent for keeping state transitions inspectable, not for deriving those facts from all code automatically.

### Gaps

- Repository stars, watchers, forks, commits, or issues do not reveal monthly active users, classroom adoption, retention, or current site traffic. No public audited usage metric was found.
- This review inspected the app repository and its public educational content, not every server/tracer repository in the organization or its current service runtime.

## Which creative-coding ideas transfer to Represent's visual product?

### Takeaway

`awesome-creative-coding` is a discovery index for rendering tools and learning material, not a ready-made codebase analyzer. Use it to choose a suitable rendering technique after defining the data and user task; its own definition emphasizes expressive work, interaction design, information visualization, and generative art.

### Cited Findings

- The repository calls itself a carefully curated resource list aimed primarily at beginner/intermediate creative coders, and describes creative coding as expressive work that includes interaction design, information visualization, and generative art. [Awesome Creative Coding README](https://github.com/terkelg/awesome-creative-coding/blob/9643124b4a883e20dfb1b79df69505418728dbeb/readme.md)
- Its list links to renderer/tool options including Three.js, Pixi.js, p5.js, Fabric.js, Canvas-sketch, and NodeBox. These are examples to evaluate against an actual rendering requirement, not a recommendation to bundle all of them. [Library/tool listings](https://github.com/terkelg/awesome-creative-coding/blob/9643124b4a883e20dfb1b79df69505418728dbeb/readme.md)
- The README labels the collection CC0. [License statement](https://github.com/terkelg/awesome-creative-coding/blob/9643124b4a883e20dfb1b79df69505418728dbeb/readme.md#license)

### Inferences

- Represent can treat rendering as a small theme system over stable content: detect or ask about a project's visual style, choose a readable infographic composition, then let users switch themes while preserving the same nodes, relations, and evidence. The notes in the local `Pixel Clay - Represent` page already state a similar theme/modding idea; this repository can help find implementation techniques, but not determine the content model.
- The MVP should optimize a cheap refresh loop: extract a compact, versioned scene; compare it to the prior snapshot; regenerate only changed labels/layout/content; retain source provenance and a stable project identity. A timeline can then show saved overviews and expose changed details on hover/click.
- The eventual interactive visual can add animation and deeper navigation over time, while the same snapshot remains exportable as a still overview. The separate technical view can focus on code structure, source spans, and evidence; it need not adopt the expressive theme of the overview.

### Gaps

- A curated list cannot tell us which graphics stack is best for the product's real scale, export formats, accessibility, or performance. Those need to be measured on a deliberately small prototype.
- No renderer was installed or executed in this review. The clone was inspected as a reference catalog.

Annotated reference tree:

```text
GoCity (Go-only analyzer; AST-derived metrics)
  pkg/analyzer/analyzer.go       deterministic file walk + Go AST parse
  pkg/analyzer/visitor.go        field/struct/method/line counts
  pkg/model/node.go              folder/file/struct scene + source URLs
  pkg/model/position.go          automatic 2D arrangement dimensions
  pkg/server/assets/             bundled React/Babylon renderer
Algorithm Visualizer (instrumented educational execution)
  src/files/skeletons/code.js    author-written visualization hooks
  src/core/tracers/              typed state adapters (graph/array/chart/log...)
  src/components/VisualizationViewer/ interprets and replays tracer commands
  separate algorithms repo      curated educational examples
awesome-creative-coding (discovery catalog; CC0)
  readme.md                      graphics tools, techniques, learning links
```

## Clone and observation manifest

Clones are under ignored `references/` and remain clean after inspection. No dependencies were installed and no project code was run. Repository revisions and public GitHub counts below were recorded on 2026-10-21; GitHub counts can change.

| Repository | HEAD | License | Public signals observed |
|---|---|---|---|
| [rodrigo-brito/gocity](https://github.com/rodrigo-brito/gocity) | `f2b5f40ced5929a8de100a87fec53bac0d296a06` | MIT | 1.8K stars, 140 forks, 27 watching, 114 commits |
| [terkelg/awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding) | `9643124b4a883e20dfb1b79df69505418728dbeb` | CC0 (README) | 15.5K stars, 1.0K forks, 386 watching, 421 commits |
| [algorithm-visualizer/algorithm-visualizer](https://github.com/algorithm-visualizer/algorithm-visualizer) | `18de2edf6b629e843ee4bcedfa2208d22b253f0f` | MIT | 48.9K stars, 7.6K forks, 1.2K watching, 668 commits |
