# Developer needs for Grafe and Alegor

Research snapshot: 2026-10-21. This is bounded evidence gathering for product discovery, not validated market demand. GitHub issues below are individual reports and may be fixed, version-specific, or unrepresentative. Stars and repository descriptions are not treated as adoption proof.

## System Intent

**Grafe should help a developer answer a concrete repository question and get back to work:** “What does this thing depend on?”, “What changed around this symbol?”, or “Which tests and callers should I inspect?” It should expose the strongest evidence available at each scope, let the user follow an exact source location, and say when the extractor cannot answer. It should not compete as another all-purpose architecture-diagram canvas. Existing products already provide dependency rules/graphs (dependency-cruiser), metric maps (CodeCharta), and code knowledge graphs/query tools (GitNexus). Grafe's plausible opening is a calm, progressively detailed, source-linked workbench that joins file/module structure to symbols, change history, tests, and a small amount of human context.

**Alegor should reduce project re-entry and history fragmentation:** “Where did I leave off, what changed, why, and what is the next useful action?” The local notes contain this first-person need—several concurrent AI sessions become hard to distinguish—and the open-source projects `sessions`, Lore, and Persistent Memory MCP each describe adjacent solutions for searching transcripts or persisting context. So the broad “AI memory” category is already occupied. Alegor's plausible distinct job is to connect a project’s immutable source snapshots and Visu/Grafe views to selected, source-linked session evidence, then produce a brief with clear confidence and links. Keep it useful when no transcript connector is installed.

Concrete pain signals from primary project sources:

1. **Large-repository graphs can be hard to scope and interpret.** A dependency-cruiser user analyzing one submodule inside a huge monorepo reports complex configuration, duplicate alias paths, unresolved edges, and unwanted transitive modules in the visualization; they ask for a useful “helicopter view” of a component subset. A separate user with a roughly 30,000-file TypeScript monorepo reports a dependency query taking 7m28s and asks to avoid analysis not required by the requested rule. These are two concrete reports, not prevalence estimates. [Issue #981](https://github.com/sverweij/dependency-cruiser/issues/981), [Issue #978](https://github.com/sverweij/dependency-cruiser/issues/978)
2. **A completed index can still be misleading or unusable.** GitNexus users have reported apparently successful indexing with empty search results because full-text indexes were absent, including a 5,000+ file report where the suggested re-index loop did not fix the problem; another Windows report describes files being created while the repo remained unindexed, later fixed in 1.6.4. This supports explicit capability/completeness checks and actionable diagnostics as a product quality issue; it does not establish a general failure rate. [Issue #1715](https://github.com/abhigyanpatwari/GitNexus/issues/1715), [Issue #1400](https://github.com/abhigyanpatwari/GitNexus/issues/1400)
3. **AI session history is fragmented and re-entry is manual.** `sessions` describes transcripts scattered among separate tool-specific stores and offers search, repo-scoped context, resume, and usage reporting. In a separate Superpowers feature proposal, a multi-tool user details session-start narration, losing half-done work during handoff, and forgetting why priorities changed; they describe manually maintaining a cross-plan roadmap. This is direct first-person evidence from two project sources, but not an independently sampled user study. [sessions README](https://github.com/nicknisi/sessions), [Superpowers issue #1192](https://github.com/obra/superpowers/issues/1192)
4. **History and memory tools already overlap heavily.** Lore describes a local cross-tool archive plus shared agent memory; Persistent Memory MCP offers durable project facts, Git-aware context, provenance, bounded context packets, progressive retrieval, and continuation state. Their feature lists show what an open-source alternative would need to distinguish itself from; they do not by themselves prove unmet needs. [Lore README](https://github.com/DnaMes/lore), [Persistent Memory MCP README](https://github.com/dannymaaz/memory-mcp)
5. **Project-aware extraction and focused visualization are different jobs.** dependency-cruiser targets module dependency validation and graph reporters; CodeCharta targets metric-centered maps; SCIP TypeScript targets a language-aware symbol index. Their official docs/repos establish existing capabilities, while the local trials show the tradeoff: dependency-cruiser gave a readable typed import result for a tiny fixture, SCIP produced an opaque binary index not yet accuracy-audited. Grafe should normalize and explain adapter outputs instead of binding its product model to one graph/index format. [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), [CodeCharta](https://github.com/MaibornWolff/codecharta), [scip-typescript](https://github.com/sourcegraph/scip-typescript)

**Do not duplicate:** a generic dependency graph exporter, a metric-only city map, a code graph index, a universal AI transcript browser, or another general-purpose vector-memory MCP server. Those are viable projects in their own right but are already served by the named projects. Build on their formats or offer adapters where licenses and maintenance permit. Grafe and Alegor should share Represent's snapshot identity/evidence and keep their job boundaries narrow.

### Inferences

- A narrow Grafe pilot should prove one workflow: choose a changed file or symbol, inspect its directly resolved dependents and relevant tests, and open a trustworthy source span. Let the user start at a repository or package overview and reveal symbol-level detail on demand. Keep unresolved imports and unsupported-language coverage visible.
- A narrow Alegor pilot should answer “what changed and where should I resume?” from Git/source snapshot deltas and a small opt-in corpus of selected session records. Link out to the session tool for full transcripts; do not ingest every home-directory history or pretend temporal proximity proves causation.
- An open-source contribution wedge can be the boring glue: a documented, versioned evidence/snapshot schema; extractor and session-importer contracts; small fixture corpora; correctness/coverage diagnostics; and a renderer-independent CLI/MCP read interface. This could be useful even if there is no paid hosted product.
- A broad Waremoto/AI software-agency direction can grow from these shared capabilities: source-grounded codebase orientation, impact investigation, AI-work provenance, and project-state visualization. Each should remain a composable tool with exportable data, rather than requiring a bundled platform or account.

### Gaps

- No representative user interviews, task observations, telemetry, willingness-to-pay evidence, or maintainer approvals have been collected. Do not describe these findings as validated market demand.
- The issue reports' current status/version context and frequency across projects need follow-up before making product promises. GitHub issues may already have fixes or be edge cases.
- Compatibility and license checks are required before reusing code or building integrations. The strongest current plan is to consume documented interfaces/formats and write adapters, not copy implementation wholesale.

## Ingestion Vector — annotated tree

Grafe's first read should be a user-visible, bounded set of Git-tracked project files and existing configuration, with generated/vendor/dependency data excluded by default. Use extractor adapters to emit normalized entities, typed relations, source spans, diagnostics, and provenance. Pull in SCIP or language-server indexes only when already available or after a clear, user-approved setup preview; do not silently execute repository install/build scripts. Git commits and diffs are evidence for change, not proof of runtime behavior.

Alegor should ingest Represent snapshot/view IDs plus Git metadata first. Session ingestion is an explicit connector selection with a file preview, local paths and hashes, parser version, and an “unlinked” state. Start from existing exported/session records where possible; avoid brittle broad home-directory crawls. Treat transcript text as untrusted evidence and preserve origin/time/repo/branch/file references.

```text
project-root/
├── README.md                         # @LLM-ENTRY: purpose, vocabulary, declared system shape
├── package.json / solution files     # @LLM-TARGET: packages, project boundaries, commands
├── src/ / app/ / packages/           # @LLM-TARGET: modules, symbols, explicit relations, spans
├── test/ / tests/                    # @LLM-TARGET: test declarations and direct references
├── docs/                              # @LLM-TARGET: declared architecture/decisions, dated claims
├── .git/                              # @LLM-TARGET: revision, branch, changed paths, history evidence
├── .represent/snapshots/              # @LLM-TARGET: immutable source snapshots + evidence manifests
├── .represent/views/                  # @LLM-TARGET: Visu/Grafe view revisions linked to snapshots
├── selected-session-export/           # @LLM-OPT-IN: user-selected, parser-identified evidence only
├── node_modules/ / vendor/ / dist/    # @LLM-IGNORE: third-party or generated data by default
└── secrets / local databases          # @LLM-IGNORE: credentials and private state
```

The tree is a proposal, not a universal scanner policy. Multi-root workspaces, symlinks, submodules, generated code, ignored-but-tracked files, and language-specific project configuration must appear in a scope preview and diagnostic report.

## Visualization Spec

Grafe opens with a clean repository/package outline, not an everything-at-once graph. Search or a concrete query (“dependents”, “callers”, “tests”, “changed since snapshot”) focuses a neighborhood. Selecting a node shows qualified name, relation kind, exact snippet and span, repository revision, extractor and evidence type, and an explicit reason it is visible. A list/table alternative mirrors the same result for accessibility and large graphs. Expand along a single path; preserve user layout where entity identity is reliable. Distinguish parsed static edges, Git facts, declared documentation, runtime traces, and model interpretation visually. Unknown/unresolved capability is an answer, not a hidden error.

Alegor opens on the selected project and latest snapshot. Show a dated timeline and a “since you were here” card containing only evidenced changes, declared decisions, open questions, and linked sessions. Keep source snapshot identity separate from regenerated Visu/Grafe view revisions. A past item returns to the exact snapshot/view; each explanation links to a file/line, commit, or transcript message. The UI should say whether a session link is inferred from repo/branch/file overlap or explicitly selected by the user. Hover can add detail, but core actions and evidence must work by keyboard and touch.

## Bootstrapping Steps

1. **Name the evidence contract first.** Define stable project/snapshot/view IDs, entity and relation kinds, source spans, extractor/version, revision/freshness, evidence origin, unsupported/unresolved diagnostics, and snapshot diffs. Keep IDs and exports independent from any renderer or AI provider.
2. **Grafe spike:** Use dependency-cruiser as the JS/TS module-edge candidate and SCIP as an optional symbol-reference candidate. On one multi-package, multi-language public repository, report exact indexed files, unresolved edges, setup requirements, run time, and source-link correctness. Do not treat an empty result as a complete index. Keep a source outline alongside the graph.
3. **Alegor spike:** Implement a read-only project re-entry brief over one controlled repo's two snapshots and a handful of user-selected, sanitized session fixtures. First validate source-delta links and explicit/unlinked session states; only then test a real connector.
4. **Test tasks, not visual preference alone.** Ask developers unfamiliar with the target to (a) identify the callers/tests affected by one change and (b) resume a paused task using the re-entry card. Compare against their ordinary editor/Git workflow and existing tools. Record task completion, time, wrong edges/claims, missing coverage, corrections, and whether they would keep it installed. Report the small sample honestly.
5. **Invite the right open-source contributors.** Publish one fixture format, adapter contract, support/capability matrix, privacy defaults, reproducible benchmarks, and “good first adapter” tasks. Ask maintainers of candidate extractors/session tools for format/interoperability feedback before presenting integrations as endorsed.
6. **Only then decide whether to make separate MVPs.** Grafe is mature enough for a narrow prototype, not a broad production graph product. Alegor is mature enough for a fixture-driven re-entry design spike, not an independent universal memory product. Both can progress beside Visu because they share the evidence/snapshot foundation, but there is not yet evidence to promise a hosted suite or automate transcript ingestion.

## Ghost AI and Embeddability

Core Grafe queries should be deterministic and useful offline. If AI helps name a subsystem or explain a path, send only a bounded evidence packet through Ghost's approved gateway, cache by source digest + prompt/model version, and require citations to supplied evidence IDs. The model may summarize but must not invent graph edges, tests, runtime behavior, or certainty. Show AI usage separately from deterministic extraction.

Alegor's first re-entry brief should also be deterministic from Git/snapshot deltas and selected metadata. Optional synthesis can run through Ghost using only those evidence IDs; store prompt/model lineage, citations, and corrections. Do not expose raw session history to a hosted model by default. The user must be able to inspect, export, and delete local history without an Alegor service.

Keep both cores headless and embeddable. Grafe should offer a library/API and CLI JSON output; later a read-only MCP surface can answer bounded queries for agents, and an IDE extension can deep-link to source. Alegor should expose the timeline and re-entry brief through CLI/export and read-only MCP, while the browser shell remains optional. Reuse a common project/snapshot identity and the same evidence API across Visu, Grafe, and Alegor. Avoid building a separate account, hosted sync layer, or agent write-back until a local workflow demonstrates value and privacy expectations are understood.

### Sources and local evidence

- User-provided product direction and trials are synthesized in [Grafe MVP research](../../grafe-mvp-research.md), [Alegor MVP research](../../alegor-mvp-research.md), [ROMPE tool trials](../../rompe-tool-trials.md), and the [Represent suite report](../reports/Represent%20living%20project%20views.md). Those are design/evaluation records, not market studies.
- dependency-cruiser user reports: [huge monorepo submodule graph and alias/unresolved-edge problems](https://github.com/sverweij/dependency-cruiser/issues/981); [30,000-file repository and excessive work for a focused query](https://github.com/sverweij/dependency-cruiser/issues/978).
- GitNexus user reports: [large-repository FTS search silently empty despite indexing success](https://github.com/abhigyanpatwari/GitNexus/issues/1715); [Windows analyze produced files but an unindexed repo, later fixed](https://github.com/abhigyanpatwari/GitNexus/issues/1400).
- Session continuity first-person report: [Superpowers cross-session roadmap proposal](https://github.com/obra/superpowers/issues/1192); existing tools: [`sessions`](https://github.com/nicknisi/sessions), [Lore](https://github.com/DnaMes/lore), [Persistent Memory MCP](https://github.com/dannymaaz/memory-mcp).
- Adjacent technical products: [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), [CodeCharta](https://github.com/MaibornWolff/codecharta), [scip-typescript](https://github.com/sourcegraph/scip-typescript), [GitNexus](https://github.com/abhigyanpatwari/GitNexus).
