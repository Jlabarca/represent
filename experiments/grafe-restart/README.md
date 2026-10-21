# Grafe source navigation restart spike

Date: 2026-10-21. Experimental, local-only artifacts. No production Visu/Grafe code, package files, or source projects were changed. No AI calls were made.

## What was tested

The older Grafe research had generated a SCIP binary for plane-sync but had not decoded it, so it had not established whether symbols, references, or source spans were usable. This spike closes that narrow gap.

- A synthetic four-file TypeScript project was indexed by pinned `@sourcegraph/scip-typescript@0.4.0` and decoded using its generated protobuf classes. It yielded four documents and 39 occurrences. All non-container occurrence spans were checked against the exact source text; there were zero mismatches. The fixture contains cross-file imports, type references, function calls, local definitions, and plain reads.
- The existing SCIP binary from the read-only `D:/ware/plane-sync` pilot was decoded in summary-only mode. Its metadata identifies `scip-typescript 0.4.0`, root `file:///D:/ware/plane-sync`, six documents, 1,075 symbol records, 6,485 occurrences, zero diagnostics, and zero span mismatches. Local TypeScript AST classification counted 47 imported symbols, 1,711 call expressions, and 3,652 other references (definitions are counted separately: 1,075). The six files were `runner/afkbot.mjs`, `src/index.js`, three tests and `tools/board-structure.js`. The target's Git worktree remained clean.
- SCIP provides symbol identity, occurrences and ranges. In this observed index, occurrence role bits were often unspecified, so Grafe must not infer call-vs-reference from a `ReadAccess` bit. The prototype uses the TypeScript AST at the same source range to classify import bindings, call expressions, and other references. The viewer labels this distinction and opens the exact excerpt.
- A minimal static focused-symbol explorer is [fixture-viewer.html](fixture-viewer.html); the captured first view is [grafe-fixture.png](output/grafe-fixture.png). It lists indexed symbols and, on selection, shows definition/call/import/reference snippets grouped by source file. It embeds only the synthetic fixture's source excerpts.

The smoke used Playwright Chromium headlessly: 15 selectable symbols appeared, selecting `presentAccount()` showed the definition, import, and line-5 call snippet, the call label was visible, and there were no page errors.

## Reproduce

Run `./run-fixture.ps1` from PowerShell in this folder, or invoke it by full path. It uses the pinned indexer, the existing generated protobuf classes in npm's `_npx` cache, and the installed Playwright runtime. It re-indexes only the synthetic fixture. The plane-sync audit reads its existing saved `.scip` and source files and writes only path/count/diagnostic/span summaries; it does not retain source excerpts.

The detailed synthetic decoder output is `output/fixture-decoded.json`; the real-project evidence is `output/plane-sync-summary.json`. No dependency checkout or upstream repository bulk is included.

## Limits

- One TypeScript fixture and one very small real JavaScript service are evidence of a working adapter slice, not broad language, monorepo, incremental-indexing, memory, or usability proof.
- The plane-sync index is the binary made in the earlier pilot with `--infer-tsconfig`; its exact file scope was not explicitly pinned at index time. The decoded six-document list is the observed scope, not proof of complete repository coverage.
- The TypeScript AST overlay classified syntax; it did not type-check each call edge independently or measure unresolved-module completeness. The previous binary reports zero SCIP diagnostics, which does not mean every relation is resolved.
- SCIP does not provide the focus/navigation UI, repo-specific onboarding paths, change history, or update policy. This prototype does not yet implement those.
- Market demand remains a hypothesis. The useful work tasks to validate are onboarding to an unfamiliar repository, tracing callers/callees, and finding tests affected by a changed symbol. No willingness-to-pay or community-size claim was tested.

## Recommended first Grafe MVP slice

Ship a local, headless TypeScript/JavaScript snapshot index plus a web/CLI shell with a focused symbol/file outline, typed relations (`import`, `call`, `reference`, `test-reference` where evidence exists), exact source spans, and a source detail pane. Make SCIP the semantic adapter and keep the AST overlay explicit and replaceable; record extractor version, selected files, diagnostics, revision and source hashes. Do not call AI for baseline navigation. Optional Ghost explanations can follow later as evidence-cited summaries.

The next acceptance gate should add a second, larger reviewed repository, pin the exact input file set, and compare a manually enumerated set of imports/calls/references against SCIP+AST results. Require every displayed source range to match text, every omitted/unresolved relationship to be visible as a capability diagnostic, and a short maintainer task (“find callers and related tests for this symbol”) to complete through the outline and source pane. Then measure clean-index and one-file refresh cost before adding history or IDE shells.
