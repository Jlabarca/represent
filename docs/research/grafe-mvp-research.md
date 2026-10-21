# Grafe — developer workflow research and MVP readiness

> Research snapshot: 2026-10-21. This is a proposal, not current implementation state. No product code was changed.

## System Intent

Grafe is Represent's technical explorer: a developer-facing, source-linked view for understanding a repository, investigating change impact, and checking claims made by humans or AI tools. It should improve on the Codevis screenshot's useful idea—code snippets in focused nodes—while avoiding an unreadable whole-repository hairball. The product value is navigation and evidence, not merely drawing every edge. A developer should be able to start from a repository or changed file, move between project/package/symbol scopes, focus one question, inspect why an item is shown, and open the exact source location.

Potential user needs extend beyond commercial teams: maintainers inheriting unfamiliar open-source projects, contributors orienting before a first PR, reviewers estimating blast radius, educators explaining a codebase, security/quality practitioners investigating flows, and individual developers using an AI coding assistant who need to verify proposed edits. These are plausible user groups to validate, not claims of proven demand. Relevant DX opportunities include: guided onboarding trails; “what depends on this?” and reverse-impact queries; changed-file-to-tests and ownership context; review diffs over stable symbol IDs; call/dataflow trails where the extractor can support them; evidence-backed AI answers with clickable source spans; and a local/offline workspace that remains useful without a hosted account.

The basic interaction should be: orient at a project/package level; select a node or relation; inspect a compact explanation, snippet, and source range; pin or compare a path; then move to the code editor. Search, keyboard navigation, filters, breadcrumbs, density controls, and accessible list/table alternatives are core workflows. A graph is one projection, not the only way to navigate. Every edge needs an explicit relation kind and provenance; uncertain or inferred edges must not look like parser-confirmed calls.

## Ingestion Vector

Start with a reviewed, bounded source set. Extract repository identity, revision, files, packages/modules, symbols, import/reference relations, source spans, and available test/config relationships. Git changes provide a second source of evidence for change-impact and snapshot comparison. Runtime traces are an optional later input, explicitly labeled as captured behavior. User-authored notes and AI interpretations remain separate evidence classes.

```text
project-root/
├── README.md                 # @LLM-ENTRY: project purpose and domain vocabulary
├── package.json              # @LLM-TARGET: package boundaries and scripts
├── tsconfig.json             # @LLM-TARGET: compiler and project boundaries
├── src/                      # @LLM-TARGET: files, symbols, imports, references, source spans
├── test/                     # @LLM-TARGET: test declarations and explicit references
├── docs/                     # @LLM-TARGET: declared architecture and ownership context
├── .git/                     # @LLM-TARGET: revision and changed-file evidence
├── node_modules/             # @LLM-IGNORE: third-party source by default
└── dist/                     # @LLM-IGNORE: generated output by default
```

This tree is a starting policy, not a universal scanner rule. Preview exclusions, generated files, symlinks, submodules, and workspace boundaries before indexing. Dependency-cruiser documentation explicitly warns that a graph of thousands of modules and tens of thousands of edges is not useful as one view; it recommends higher-level aggregation and package-scoped graphs. SCIP TypeScript demonstrates the complementary requirement of project-aware symbol indexing; its documented workflow expects the target project's dependencies to be installed, so an MVP should not silently execute arbitrary repository scripts to satisfy analysis prerequisites.

Two repositories were shallow-cloned under ignored `references/grafe-dependency-cruiser/` and `references/grafe-scip-typescript/` for inspection and bounded trials. Their exact source revisions and licenses are recorded below. No clone scripts, install hooks, or repository test suites were run. CLI packages were fetched through `npm exec` at pinned versions for the isolated fixture and plane-sync trials.

## Visualization Spec

Grafe's overview should be hierarchical and sparse: repository → package/module → selected symbols. Aggregate edges at overview levels; reveal individual edges only on focus or query. The selected node or an adjacent detail panel should show a short excerpt with line numbers, symbol signature, evidence class, freshness/revision, and source navigation. Useful views include dependency direction, caller/callee paths, changed files and dependents, and tests related by explicit evidence. Search and “why am I seeing this?” should work across graph and outline views. Layout should preserve positions for stable nodes between snapshots when possible, but communicate removals and uncertain matches.

The same frozen snapshot/evidence model should feed Visu and Grafe. Visu consumes a compact semantic summary and region mapping; Grafe consumes the full structured technical projection. Neither view should own a separate identity for the project, source claim, or revision. Details and hover interactions read saved model data, never trigger model calls implicitly. Optional AI summaries must cite evidence IDs and source spans, expose uncertainty, and be clearly distinct from deterministic relationships.

Trial evidence (2026-10-21): a two-file JS fixture was processed with dependency-cruiser 18.7.0 using `--no-config --output-type json`; result: 2 modules, 1 resolved import edge, 0 violations, exit 0. The same fixture was indexed with SCIP TypeScript 0.4.0 using `index --cwd ... --output ... --no-progress-bar`; result: successful `.scip` index, reported 22 ms. An initial TypeScript dependency-cruiser attempt returned zero modules because no TypeScript compiler/parser was installed; its output explicitly reported TypeScript support unavailable. This is a practical warning: tool output must carry capability diagnostics, and zero edges cannot be interpreted as proof of no relationships.

### Read-only plane-sync trial

The second trial used local read-only checkout `D:/ware/plane-sync` at source revision `a1a91c4fa80888c2be0a7898dfb91bf7e42c5cd3` (origin `https://github.com/waremoto/plane-sync.git`; pinned public GitHub files were unavailable/404 during this review). The repo is a real, small Node service with one `src/index.js`, four additional JS/MJS files under `runner/`, `test/`, and `tools/`, and 21 tracked files total. The checked-in package declares Node `>=22`, has no runtime dependencies, and the source imports Node built-ins. No license file or license declaration was found in its root metadata/docs; do not assume plane-sync itself is reusable under an open-source license. The target was read-only: both outputs were written to this research folder. SCIP's `--infer-tsconfig` created an untracked 36-byte `tsconfig.json` in the target; that exact generated file was moved into this experiment folder immediately after the run, and `git status --short` was empty afterward.

| Pinned tool | Exact command scope | Observed result | Supported / unsupported evidence |
|---|---|---|---|
| dependency-cruiser 18.7.0 (MIT) | `depcruise --no-config --output-type json --output-to <research>/plane-sync-dependency-cruiser.json D:/ware/plane-sync/src` | Exit 0; 5 modules reported (one source plus four Node built-ins), 4 resolved import edges, 0 errors/warnings. | Resolved `node:http`, `node:crypto`, `node:fs`, and `node:path`; no internal file-to-file edges exist in the selected one-file `src` scope. It does not report function call/dataflow semantics. This is expected scope behavior, not a failed run. |
| SCIP TypeScript 0.4.0 (Apache-2.0) | `scip-typescript index --cwd D:/ware/plane-sync --infer-tsconfig --output <research>/plane-sync-scip-typescript.scip --no-progress-bar` | Exit 0; completion reported 599 ms; binary index 353,427 bytes. | Successful indexing for the inferred JS project. The binary was not decoded; entity/reference coverage and source-range accuracy remain unverified. Inferred config allowed JS but did not explicitly pin file inclusion, so this result does not establish that only `src/index.js` was indexed. A production adapter must preview/record exact indexed files and provide a readable index summary. |

Measured-product implications: this target supports the useful “follow imports to platform dependencies” task, but it is too small and internally monolithic to validate package aggregation, caller/callee navigation, or change-impact discovery. A four-edge dependency picture is less useful than a focused source outline here; the file's comments and function structure carry more semantics than its module graph. SCIP's successful but opaque binary reinforces the need for an adapter-facing normalized evidence API plus visible capability/index summaries, not direct viewer coupling to extractor formats. The real trial therefore supports extractor feasibility only; it does not upgrade the broad Grafe MVP readiness verdict.

The trial does not compare completeness, speed, or correctness on a real monorepo; it only verifies both toolchains on a tiny fixture and exposes configuration friction. SCIP's binary result was not decoded or audited for symbol-resolution accuracy. Dependency-cruiser's JSON was inspected directly and contains module paths, typed import relation metadata, resolution status, and reverse dependents. Full local trial outputs live under `experiments/grafe-research/`.

## Bootstrapping Steps

1. Define a small shared snapshot and evidence contract before building a viewer. Keep source facts, declared facts, runtime facts, AI interpretations, user corrections, and unknowns separate.
2. Use dependency-cruiser as a candidate module-dependency extractor for JS/TS; use SCIP as a candidate source-location and symbol-reference index. Treat both as replaceable adapters, not as the shared model. Test language coverage, workspace resolution, exclusions, failure diagnostics, and license compatibility on a reviewed fixture before committing to either.
3. Build an independent first slice: a headless Grafe projection over a checked-in synthetic TypeScript fixture, displaying a navigable module/symbol outline, one typed dependency relation, focus detail with exact snippet/source range, and a simple “impact of changed symbol” path. Keep the viewer and extractor swappable. Provide JSON output and a minimal browser/CLI surface only after the model contract is stable.
4. Add one real small repository pilot chosen with its maintainer or using a public, low-risk sample. Measure clean-index time, incremental refresh time, symbol/edge counts, unresolved relation rate, source-link accuracy, memory, and correction effort. Ask contributors/reviewers to perform concrete onboarding and change-impact tasks; do not use stars as adoption evidence.
5. Add a second snapshot and evaluate stable identities, source movement, edge deltas, and stale explanations. Only then decide whether local persistent history, editor integration, or AI change verification belongs in the first release.

### Candidate maturity and readiness

| Candidate | What it contributes | Trial / maturity signal | Limitation and role |
|---|---|---|---|
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | Configurable JS/TS dependency extraction, JSON and graph reporters, architectural rules, aggregation options | MIT; fixture successfully yielded 2 modules/1 resolved import. Docs discuss unreadable large graphs and aggregation directly. | Module dependencies, not general symbol/call graph; TS support depends on installed compiler/tooling. Suitable adapter candidate, not the model or complete Grafe. |
| [scip-typescript](https://github.com/sourcegraph/scip-typescript) | Project-aware TypeScript/JavaScript symbol index in SCIP format, suited to definitions/references/source locations | Apache-2.0; fixture indexing completed successfully in reported 22 ms. README specifies Node 22/24 and project dependencies. | No standalone viewer or architecture UX; index results were not decoded in this trial. Adapter candidate for symbol navigation, subject to larger pilot and safe dependency provisioning. |

The upstreams are technically viable components for a prototype, but Grafe itself is **not MVP-ready for a production or broad public launch**: the real target was tiny and monolithic, SCIP output was not accuracy-audited, and no shared contract, multi-language fallback, update lifecycle, or user-task validation exists. A narrow implementation slice is ready to plan. The first acceptance gate should require exact source navigation on a multi-file fixture, clear missing-capability/unresolved-edge states, and a reviewer completing a defined “find the affected callers and tests” task without relying on ungrounded AI output.

The minimum shared API/model needs are: `projectId`; immutable `projectSnapshotId` with parent/revision/time; `viewRevisionId` kept separate from source identity; stable `entityId` plus entity kind and qualified name; typed `relationId` and relation kind; source URI/path, line/column span, content hash and revision; evidence record with origin (`static`, `git`, `runtime`, `declared`, `ai`, `user`), extractor/version, confidence or unknown state, and freshness; explicit unresolved/unsupported diagnostics; and snapshot diffs. Stable IDs should derive from repository identity plus language/module/symbol identity where possible, with movement/reconciliation treated as a qualified match rather than silent identity. API boundaries should let CLI, web, VS Code, JetBrains, and library callers consume the same snapshot and query results. Ghost AI remains the only approved model path; AI summaries should be an optional projection over evidence IDs, not a requirement for core navigation.

### Annotated candidate tree

```text
dependency-cruiser/ (MIT; HEAD 60f8a7ef72cbd69a01f62c61c8efcedd8a67d83c)
├── src/                       # @LLM-TARGET: dependency discovery, resolution, reporters
├── doc/faq.md                 # @LLM-TARGET: graph scale and aggregation guidance
├── doc/options-reference.md   # @LLM-TARGET: extractor behavior/configuration
└── LICENSE                    # @LLM-TARGET: reuse terms
scip-typescript/ (Apache-2.0; HEAD e8c40f0dda526a6d008b1ef20ad13b1f38a20798)
├── src/                       # @LLM-TARGET: TypeScript SCIP index generation
├── README.md                  # @LLM-ENTRY: setup, version requirements, output workflow
├── Development.md             # @LLM-TARGET: build and development requirements
└── LICENSE                    # @LLM-TARGET: reuse terms
```

### Primary sources and limits

- dependency-cruiser [FAQ: humongous graphs and aggregation](https://github.com/sverweij/dependency-cruiser/blob/main/doc/faq.md#the-graph-dependency-cruiser-generates-is-humongous-and-i-cant-follow-the-lines-very-well-what-can-i-do) documents the practical legibility failure and package/folder aggregation options.
- dependency-cruiser [issue #981](https://github.com/sverweij/dependency-cruiser/issues/981) is a user report about submodule analysis in a large Yarn workspaces monorepo; [issue #957](https://github.com/sverweij/dependency-cruiser/issues/957) reports that even an aggregated view may remain too detailed for a user's desired module-level overview. These illustrate configuration and scale friction, not prevalence.
- dependency-cruiser [README](https://github.com/sverweij/dependency-cruiser) states its dependency validation/visualization purpose and supported language families; [options reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md) describes graph output and pruning behavior.
- Sourcegraph [scip-typescript README](https://github.com/sourcegraph/scip-typescript) documents indexing commands, Node version requirements, workspace modes, project dependency assumptions, and memory/cache options. Its current repository page reports a modest public star count, which is not a use measure.
- Microsoft TypeScript [performance guidance](https://github.com/microsoft/TypeScript/wiki/Performance) describes incremental compilation and project references, useful context for respecting project boundaries and avoiding unnecessary re-analysis.
- The local report [Represent living project views](reports/Represent%20living%20project%20views.md) records the Visu/Grafe shared-model intention and the historical Codevis screenshot limitation. I also read the local Notion export via [original-vision.md](research_notes/Represent%20living%20project%20views/original-vision.md): it backs the user's historic interest in code entities, selectable depth, source/runtime paths, and IDE-following minimap behavior. These are design leads, not validated user demand. The export did not supply independent usage data or current market evidence.
- Local plane-sync trial evidence is tied to commit `a1a91c4fa80888c2be0a7898dfb91bf7e42c5cd3`; inspect `D:/ware/plane-sync/README.md`, `package.json`, and `src/index.js` at that revision. GitHub remote paths returned 404 to this research session, so the local checkout and the saved exact output files are the evidence source.

Stars, forks, watchers, and open issues are not treated as adoption or market size. No independent evidence yet validates willingness to pay, hosted-service demand, or sustained community use. A local-first/open-source path is therefore the best current hypothesis for reducing trial friction, not a proven business model.
