# Ingestion and abstraction: GitNexus / CodeBoarding

## What was acquired and actually exercised?

### Takeaway
Both official repositories were verified through GitHub, then shallow-cloned without submodules into dedicated reference directories on 2026-10-21. This is a source study plus one isolated executable probe, not an end-to-end benchmark.

### Cited Findings
- GitNexus origin: https://github.com/abhigyanpatwari/GitNexus.git; checkout `D:/ware/represent/references/gitnexus`; SHA `04427e03c8314be4c2a2ab74a99b53b7222c0514`. Root `LICENSE` identifies **PolyForm Noncommercial License 1.0.0**; package metadata uses `PolyForm-Noncommercial-1.0.0`. [License](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/LICENSE#L1)
- CodeBoarding origin: https://github.com/CodeBoarding/CodeBoarding.git; checkout `D:/ware/represent/references/codeboarding`; SHA `3a5098c31c1649fc4a16257e46ce6830c2cfac8c`. Root `LICENSE` identifies **MIT License**, copyright 2025 CodeBoarding. [License](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/LICENSE#L1)
- GitNexus package exposes a compiled CLI; supports Node `^22.18.0 || >=24.11.0`; install scripts build native tree-sitter components. Local Node is v22.23.1, but the clone has no node_modules. [Manifest](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/package.json#L28)
- CodeBoarding requires Python >=3.12,<3.13 and substantial parser/provider dependencies; default local Python is 3.8.10. Its headless CLI offers full, incremental and partial local analysis. [Manifest](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/pyproject.toml#L11), [CLI](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/codeboarding_cli/main.py#L15)
- **Actual execution:** after reading the entire dependency-free `edge-reasons.ts`, imported it directly using Node's experimental type stripping and asserted that `global-name-fallback` is heuristic while `module-membership` is not. Exit 0: “PASS: heuristic guess separated from module membership”. This exercises a real upstream function, not parsing or CLI startup. [Executed module](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/graph/edge-reasons.ts#L25)

### Inferences
- Study GitNexus's algorithms and contracts before deciding on code reuse; do not assume its license matches CodeBoarding's.
- A full installation would add avoidable native builds and provider infrastructure before the small Represent experiment is specified.

### Gaps
No packages installed, provider calls made, sibling project code executed, or full upstream tests run. Windows end-to-end parser performance remains unmeasured.

## Which ingestion and graph patterns are useful?

### Takeaway
GitNexus offers detailed static graph engineering; CodeBoarding combines tree-sitter call-site detection with LSP definition resolution. Both provide stronger patterns than a generic file tree, but their semantic edges require explicit evidence.

### Cited Findings
- GitNexus normalizes Windows separators, loads root and nested gitignore rules, supports its own override file, and avoids following symlinked ignore files. [Ignore implementation](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/config/ignore-service.ts#L327), [nested precedence](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/config/ignore-service.ts#L543)
- Its scan phase produces paths and sizes before later content reading; parse phases expose typed outputs and tree-sitter fallback. [Scan](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/ingestion/pipeline-phases/scan.ts#L1), [parse](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/ingestion/pipeline-phases/parse.ts#L37)
- Graph relationships carry source/target IDs, type, confidence, reason and optional evidence. A confidence score alone cannot distinguish global-name guessing from resolved calls; the implementation explicitly excludes that heuristic from selected traversals. [Schema](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus-shared/src/graph/types.ts#L283), [reasons](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/graph/edge-reasons.ts#L1)
- CodeBoarding's ignore manager reads root gitignore plus a generated/customizable CodeBoarding ignore file and categorizes exclusions. Root ignore read errors log a warning and yield no patterns. [Manager](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/infra/repo_utils/ignore.py#L160)
- CodeBoarding's scanner invokes Tokei; source inspection loads JS/TS/C# tree-sitter grammars; call graph building discovers symbols and resolves edges through definitions using LSP and source inspection. [Scanner](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/scanner.py#L64), [inspector](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/engine/source_inspector.py#L1), [builder](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/engine/call_graph_builder.py#L24)
- Its graph separates calls from reference relationships, deduplicates aliases by physical location, and retains call sites. [CallGraph](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/cfg/call_graph.py#L20)

### Inferences
Borrow staged interfaces and provenance; adapt to Represent's smaller scene contract through a separate evidence manifest. Treat AST references, LSP-resolved calls and semantic interpretations as different claim kinds.

### Gaps
Nested-ignore parity was not established for CodeBoarding. Neither complete parser nor resolution accuracy was measured on plane-sync or Ghost.

## How should abstraction, caching and the next experiment work?

### Takeaway
Use deterministic structural groups as the baseline, then optional explicit semantic interpretations. Cache extraction independently of graph reconstruction and AI; avoid treating communities as architectural truth.

### Cited Findings
- GitNexus sorts graph projections and uses seeded Leiden with deterministic thread/seed requirements for an optional engine. [Community implementation](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/ingestion/community-processor.ts#L103), [sorted projection](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/core/ingestion/community-processor.ts#L300)
- GitNexus caches content-addressed parse chunks, with deterministic buckets, parser identity and publication after successful analysis; cached parsing does not eliminate graph reconstruction. [Cache](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/src/storage/parse-cache.ts#L1)
- CodeBoarding groups sorted file leaves, constructs directed inter-file links from calls and selected reference kinds, and drafts/replays a tree specification. This implementation explicitly prefers file units over Leiden communities for its naming partition. [Clustering](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/clustering/service.py#L1)
- CodeBoarding's warm cache uses versioned SHA-tagged pickle state and changed-file invalidation; provider-specific prompt-cache support is distinct. [Static cache](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/static_analyzer/analysis_cache.py#L1), [prompt caching](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/agents/llm_config.py#L502)
- Test sources cover GitNexus deterministic community export, CodeBoarding unknown cache versions and Windows file URI handling. These are inspected test definitions, not passing results from this session. [Determinism](https://github.com/abhigyanpatwari/GitNexus/blob/04427e03c8314be4c2a2ab74a99b53b7222c0514/gitnexus/test/unit/community-processor.test.ts#L133), [cache](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/tests/static_analyzer/test_analysis_cache.py#L149), [Windows](https://github.com/CodeBoarding/CodeBoarding/blob/3a5098c31c1649fc4a16257e46ce6830c2cfac8c/tests/test_windows_compatibility.py#L1)

### Inferences

| Choice | Recommendation |
|---|---|
| Borrow as design | Ignore provenance, staged scan/parse/resolve, call-site evidence, parser-version cache identity, deterministic ordering. |
| Adapt | File/module baseline; optional community overlay; explicit reason/evidence mapped through a sidecar into scene nodes and edges. |
| Avoid | Blindly copying licensed code; importing either full runtime into v0; provider-specific calls outside Ghost; heuristic calls rendered as facts; pickle as a portable interchange format. |

Next small experiment: create read-only input snapshots of a bounded plane-sync JS module and a bounded Ghost C# namespace, recording selected paths/hashes and exclusions. Hand-label a few imports, calls, unresolved dynamic calls and containment facts. Run a minimal JS/C# parser adapter against those snapshots; compare precision and omitted edges to the hand labels. Produce deterministic File/Module nodes first, plus a provenance manifest. Repeat after a one-file edit to test stable IDs and cache invalidation. No execution of target project source is needed. Only after this passes, evaluate LSP resolution and Ghost-mediated semantic grouping against the same labels.

### Gaps
No token-cost measurement or whole-run spending ceiling was verified. Native grammar/LSP installation, Windows resource use, large-repo limits and runtime ambiguity remain explicit experiment targets. No numerical clustering claim from upstream comments has been independently validated.

