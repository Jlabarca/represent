# Grafe MVP validation

Grafe is a local, zero-model source explorer. These pilots test whether a bounded deterministic index can give useful navigation and evidence on real repositories while keeping manual refresh predictable. It rebuilds the configured source scope on refresh; it does not claim a per-file incremental compiler cache. The dependency is TypeScript 5.9.3, pinned under `src/grafe/` and installed with lifecycle scripts disabled.

## Real project pilots

The pilot configuration in [`examples/grafe/real-projects.json`](../../examples/grafe/real-projects.json) points to Plane Sync and Represent. The full machine report is in [`real-project-audit.json`](real-project-audit.json). It records selected file and byte counts, symbols, typed relationships, grouped diagnostics, indexing time, no-op identity, and a controlled one-file refresh performed on a temporary copy.

| Project | Files / bytes | Symbols | Relationships | Diagnostics | Audited lookup |
|---|---:|---:|---:|---:|---|
| Plane Sync | 6 / 101,151 | 75 | 437 | 205 groups | `upsertImpl` has 3 production callers: `fullSync` (`src/index.js:423`), `handlePostLink` (`:712`), and `handleForcedSync` (`:729`). Five dynamic-import test mentions are surfaced as candidates, not confirmed calls. |
| Represent | 51 / 347,468 | 244 | 2,036 | 1,449 groups | `analyzeProject` has 7 checker-linked test references and no direct production call. Passing it as a constructor value is not treated as a call. |

The test refresh copied Plane Sync to a temporary directory. A no-op refresh kept the same snapshot ID; changing `runner/afkbot.mjs` changed the snapshot ID while unaffected symbol IDs remained stable. The original source worktree remained unchanged, verified by HEAD, status and selected source hashes. First indexing took 783.95ms for Plane Sync and 952.82ms for Represent. Counts and timings are a bounded source-scope measurement, not an estimate for an entire monorepo.

The earlier 34-file Represent run is preserved separately in [initial-real-project-audit.json](initial-real-project-audit.json). The final integrated run above includes both MVPs and their tests. Its report records HEAD `34a79ca3cba61ed9fc19972cb6ec335304e1e709` plus exact working-tree file hashes; the SHA alone does not identify the then-uncommitted sample.

## UI and UX round

The first layout let source detail content stretch the page and push the graph out of view. The revised desktop workspace now fits the initial viewport, with separately scrolling outline and detail panes. The graph centers the selected symbol and limits the visible neighborhood; an Evidence view exposes source-linked relationships as a distinct list. Snippets are collapsed on demand. The reference browser run places the selected node inside the initial viewport (`y=530..582` in a 1000px viewport), with document height exactly 1000px.

The browser QA round caught a tall one-result search row and overlapping graph cards; both were corrected and added as geometry assertions. Cards now use separate incoming/outgoing columns with 72px spacing, show up to five per side, and state when more remain in the detail pane. At a 390px viewport, measured document width is 375px and a symbol tap target is 42px tall. Measured text contrast ratios are 5.07:1 for muted light text, 7.08:1 for muted dark text, and 14.11:1 for primary dark text. Screenshots: [`plane-sync-light.png`](plane-sync-light.png), [`plane-sync-dark.png`](plane-sync-dark.png), and [`plane-sync-mobile.png`](plane-sync-mobile.png). Browser assertions and results are in [`browser-check.json`](browser-check.json): 16 checks passed, with no page errors. Parent integration also corrected outgoing-row navigation, labeled candidate graph nodes, and cleared stale graphs when switching to an unindexed project. Ten core/API tests passed; the combined repository suite passed 57/57.

## Scope and caveats

- Refresh is explicit and local; the CLI and browser UI make no AI calls.
- Only configured roots are accepted. Indexing uses Git's tracked/untracked inventory plus ignore rules, skips generated/dependency/hidden/secret paths, rejects symlinked source ancestors, and applies file/byte limits.
- The TypeScript checker sees only captured files and its own standard library. It never executes repository code or follows project references outside that captured scope.
- Confirmed edges rely on checker-resolved symbols. Dynamic loading, package aliases, runtime dispatch, reflection, and external dependencies may remain unresolved. Text matches appear as candidates. Diagnostics report omissions rather than inventing edges.
- JS/TS is supported by the pinned TypeScript parser. Other languages, runtime call paths, IDE cursor integration, and automatic background snapshots are outside this MVP.
- Snapshots are immutable content-addressed records. No-op indexing reuses the existing record and timestamp; history is local to the configured store.

## Re-run

From the repository root, install the pinned parser (scripts disabled), generate pilot evidence, run the tests, then launch the local web view:

```powershell
npm ci --prefix D:/ware/represent/src/grafe --ignore-scripts #
node D:/ware/represent/scripts/grafe-pilot.mjs D:/ware/represent/examples/grafe/real-projects.json --store C:/Users/Administrator/AppData/Local/Represent/grafe-mvp #
node --test D:/ware/represent/tests/grafe-core.test.mjs D:/ware/represent/tests/grafe-server.test.mjs #
node D:/ware/represent/src/grafe/cli.mjs serve --config D:/ware/represent/examples/grafe/real-projects.json --store C:/Users/Administrator/AppData/Local/Represent/grafe-mvp --port 8873 #
```

The server binds to `127.0.0.1`, requires a per-process bearer token for API access, enforces same-origin requests, and only serves configured project roots. Stop it with Ctrl+C.
