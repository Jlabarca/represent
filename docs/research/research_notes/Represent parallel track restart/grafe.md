# Grafe — source navigation spike and MVP scope

> Evidence recorded 2026-10-21. This restarts Grafe as an active, independently buildable technical path while Visu is paused. This is a measured experiment and proposed narrow MVP, not a production implementation or market validation.

## System Intent

Grafe is Represent's technical navigation tool. It should help a developer understand a codebase through symbol outlines, imports, callers, references, tests, and exact source excerpts. Its graph is one way to browse; the primary useful loop is to find a symbol, see why it is connected, inspect the evidence, and jump to the relevant source.

Two experiments now show a bounded path: SCIP TypeScript 0.4.0 successfully indexed a four-file fixture and an existing small JavaScript service index could be decoded and checked against source text. The fixture produced 39 occurrences across four documents; all non-container source spans matched exactly. The plane-sync index had six observed files, 1,075 symbols, 6,485 occurrences, zero recorded diagnostics, and zero source-span mismatches. Its project tree was read-only and remained clean. Details and reproducible scripts are in [the experiment report](../../../../experiments/grafe-restart/README.md).

This only establishes source-location feasibility. It does not establish complete indexing, scale behavior, user value, demand, or willingness to pay. The previous plane-sync index used inferred TypeScript configuration, so its six documents are the observed indexed scope and not a complete-coverage claim.

## Ingestion Vector

Start with a reviewed TypeScript/JavaScript repository and a fixed revision. Keep the indexer's input-file list, compiler/indexer version, diagnostics, source hashes, symbol identifiers, typed relation evidence, and source ranges together in one immutable snapshot. The spike used a tiny synthetic fixture and decoded the existing SCIP binary for plane-sync without rewriting either source project.

```text
project-root/
├── package.json              # @LLM-TARGET: workspace boundaries and scripts; do not execute scripts for indexing
├── tsconfig.json             # @LLM-TARGET: compiler project scope and resolution settings
├── src/                      # @LLM-TARGET: definitions, imports, references, calls and source spans
├── test/                     # @LLM-TARGET: test symbols and explicit references to production code
├── docs/                     # @LLM-DECORATIVE: explain declared intent; do not treat prose as a code edge
├── .git/                     # @LLM-TARGET: revision and changed-file evidence
├── node_modules/             # @LLM-IGNORE: dependency contents; only use declared resolver metadata when available
└── dist/                     # @LLM-IGNORE: generated output
```

The prototype uses SCIP symbol identities and occurrence ranges, then inspects the TypeScript AST at the same range to distinguish import bindings, call expressions, and other references. In the observed real index, many role bits were unspecified, so SCIP's `ReadAccess` bit alone cannot be used to label a call. The SCIP schema defines occurrences as symbol-plus-source-range records, with symbol roles as a bitset and UTF-16 offsets for JavaScript/TypeScript indexers; call classification is a separate syntax question. The official schema documents these fields and the index metadata contract in [scip.proto](https://github.com/scip-code/scip/blob/main/scip.proto). The SCIP project provides TypeScript bindings and the schema as a consumer path in its [README](https://github.com/scip-code/scip/).

The tested input and review artifact are:

```text
experiments/grafe-restart/fixture/ # @LLM-ENTRY: synthetic multi-file TypeScript navigation fixture
├── tsconfig.json                  # @LLM-TARGET: explicit scope for repeatable indexing
└── src/
    ├── account.ts                 # @LLM-TARGET: interface and definition source
    ├── main.ts                    # @LLM-TARGET: imports, calls and cross-file references
    ├── presenter.ts               # @LLM-TARGET: imported type and function definition
    └── cli.ts                     # @LLM-TARGET: consumer call site
```

SCIP's official project page lists multiple language indexers, including TypeScript/JavaScript, Rust, C/C++, Java/Kotlin/Scala, Python, C#, Ruby and others; this is ecosystem availability, not evidence that Grafe supports those languages. Start with JS/TS and add languages only behind the same normalized snapshot/evidence API.

## Visualization Spec

The reviewable prototype is [fixture-viewer.html](../../../../experiments/grafe-restart/fixture-viewer.html), with [a browser capture](../../../../experiments/grafe-restart/output/grafe-fixture.png). It is a compact symbol list on the left and a source-evidence pane on the right. Selecting a symbol reveals its definition and occurrences, each with file, line, source excerpt, and a visible category. This keeps the main screen readable while allowing deeper detail on selection.

For the MVP, expand this into a file/symbol outline with search, keyboard selection, relation filters, breadcrumbs, and source links. Show edge kinds distinctly: module import, imported symbol, call, other symbol reference, and test reference only when the evidence supports them. A call is a source-language fact, not a synonym for a reference. Show unresolved or unsupported relations as diagnostics, never as absent edges that imply certainty. Preserve an accessible outline/list as the primary navigation; add a local graph projection for focused neighborhoods only.

## Bootstrapping Steps

1. Define a headless JSON snapshot contract: project/revision, selected files, indexer and version, entity IDs, entity kinds and names, typed relations, source spans, per-file hashes, diagnostics, and freshness. Make stable symbol IDs and source revisions explicit.
2. Implement a local `grafe index` for TypeScript/JavaScript using SCIP plus a syntax overlay for call/import classification. Keep the project boundary safe and visible; do not run arbitrary repository lifecycle scripts to install or prepare dependencies.
3. Build the symbol/file outline and source pane over that contract. Keep extraction independent from the web shell so CLI, editor, and embedded viewers can reuse the same snapshot and navigation queries.
4. Run the next acceptance gate on a second, larger reviewed repository with an explicitly pinned file set. Compare a manually enumerated set of imports, calls, references, and test links with the index, check every displayed source range against the actual file, and show missing/unresolved capabilities.
5. Ask a maintainer to complete a concrete task: find a changed symbol's callers and related tests using the outline and source pane. Measure clean-index and one-file refresh time, then decide whether snapshot history is the next step.

The gate is deliberately small: expand evidence from one controlled fixture and one six-file service into one larger repository and a short real navigation task. It does not require broad language support, paid AI, a hosted service, or product-market claims before Grafe can begin implementation.

### Ghost AI Plan

Baseline navigation is deterministic and makes no model calls. If optional summaries or question answering are added, route them through Ghost's AI gateway, cite snapshot evidence IDs and source spans, cache by snapshot plus prompt/model version, and keep model statements separate from extractor relationships. An unanswered question remains unknown rather than becoming an inferred code edge. The current spike made zero AI calls.

### Embeddability Plan

The snapshot contract and navigation queries belong in a headless core. The initial surfaces should be a CLI for indexing and a thin local web shell for symbol navigation. The same API can later feed VS Code, JetBrains, desktop, mobile, and embedding consumers; those shells should not create independent entity identity or relation semantics. No editor, mobile, hosted, or embedding integration was tested in this spike.

## Primary sources and evidence

- [SCIP protocol schema](https://github.com/scip-code/scip/blob/main/scip.proto) — index/document/occurrence structure, symbol-role bit flags, range encoding, and JavaScript/TypeScript position encoding.
- [SCIP project](https://github.com/scip-code/scip/) — protocol bindings and the available SCIP CLI; listed indexers show the ecosystem but do not imply Grafe integration.
- [SCIP TypeScript README](https://github.com/sourcegraph/scip-typescript/blob/main/README.md) — indexer commands and configuration options.
- [Reproducible local experiment](../../../../experiments/grafe-restart/README.md) — pinned package, fixture, decoded evidence, browser check, caveats, and next gate.
