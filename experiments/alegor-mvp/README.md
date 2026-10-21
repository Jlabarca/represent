# Alegor MVP pilot

## What was tested

The MVP was exercised against two read-only local repositories configured explicitly in `examples/alegor/projects.example.json`:

- Represent at `34a79ca3cba61ed9fc19972cb6ec335304e1e709` (`codex/represent-v0`), 22 captured first-parent commits and 12 selected documents. Its source worktree was already dirty; the capture recorded 41 changed paths with hashes for 6,807,206 bytes, and the pilot verified HEAD and status did not change during capture. For the task evidence, `docs/CONTEXT.md` hashed to `bc44dfd4ca7f7aefc4f28b2b722bd963ae96d7f649bd7e32e8067e8d77768cda`, `docs/TODO.md` to `a106ff704f3c4015f54bbd1ed5b3e85fa42871a7ee5d161540348f56e9e321c5`, and `docs/ALEGOR-MVP-IMPL.md` to `07104540ddbeebc9b876e6a813c0779c65ce08bc298f6f9a1f5213183c99c9da`.
- Plane Sync at `a1a91c4fa80888c2be0a7898dfb91bf7e42c5cd3` (`main`), 25 captured first-parent commits and 2 selected documents. Its `docs/PLANE-SYNC-IMPL.md` hash was `975a519277fd4c175d2e125176abcfa55b6d1875b857d557ca5b46cc6802dbfb` and `README.md` hash was `4a01aa45cabc95b71086b0b4bdd0a1ad73cfd7f61b9ce341d4bb7a5b988c0e27`.

For both repositories, the pilot captured twice, confirmed the second capture reused the same immutable snapshot, and checked that source HEAD and porcelain status were unchanged. The machine-readable evidence, including document hashes, exact citations, selected next tasks, and declared context, is in `real-pilot.json`. No AI or external API was used.

Represent's task answer is specific: its captured TODO names headless snapshot/indexing work at `docs/TODO.md:32`, another larger-repository trial at `:33`, the Alegor local CLI/web MVP at `:40`, and the real-project re-entry validation at `:41`. The selected `ALEGOR-MVP-IMPL.md` additionally records implementation and trial tasks at lines 55–60. These are source-authored open checklist items, not claims of verified implementation status. The code exposes citations to those exact lines.

Plane Sync's captured `docs/PLANE-SYNC-IMPL.md` says the bridge’s two-way sync was verified and P2 complete at line 35, while its selected checklist is closed. Alegor therefore leaves “where to resume” unknown instead of inventing a task. That is a useful negative result: the feature distinguishes an absent explicit next step from a generic suggestion.

The stored source hashes and the run output should be read as snapshots of those exact revisions. Repository work may advance after the pilot; the pilot did not modify either source tree.

## Controlled update trial

The parent also tested an actual disposable clone of Plane Sync with [alegor-copy-pilot.mjs](../../scripts/alegor-copy-pilot.mjs). [controlled-copy.json](controlled-copy.json) records the exact revisions, citations, original document hashes and timings. First capture took 1,161.29ms; unchanged recapture took 1,412.97ms and reused the snapshot. Adding a synthetic `docs/TODO.md` in the clone took 1,534.66ms, produced a new snapshot at the same Git HEAD with zero new commits, and selected its explicit task at line 5. After deleting that file, the historical citation remained readable. The original project's HEAD, status and selected document hashes stayed unchanged. The marker task is test data, not an actual Plane Sync requirement. All operations made zero model/API calls; no-op reuse saves storage, not the Git/docs collection work.

Automated fixtures use disposable repositories, not the user's live projects. They cover a no-op recapture, a docs-only update, multiple commits after a saved baseline, branch divergence / out-of-window history, a deleted source file with retained snapshot citations, checked and unchecked similar items, hidden and ignored docs, sensitive changed filenames, a renamed file followed by another modification, and rejection of a configured subdirectory that would otherwise widen scope. The rename test confirms that the destination file is hashed and a second same-status edit produces a new revision. These fixtures are synthetic and do not claim to represent human usability.

## UI/UX improvement rounds

The initial interface was reviewed for high information density, readable hierarchy, small-screen layout, keyboard access, and progressive disclosure. Improvements include a compact project identity with accent color and branch, a selectable snapshot timeline and comparison point, re-entry cards, citation buttons that open the evidence drawer at the source line, responsive stacking, a persistent light/dark toggle, visible empty/unknown states, and keyboard-operable controls. The second pass fixed a correctness issue found during review: a baseline outside the stored range now shows “Change range unavailable” and the reason rather than “0 commits / no changes.” A partial dirty-worktree hash also surfaces an explicit notice.

Automated browser checks and screenshots are stored alongside this report. The browser pass found and fixed a 3-pixel mobile horizontal overflow caused by the timeline edge bleed. It verifies desktop/mobile rendering, compact first-layer claims, clean Markdown table presentation, fingerprint disclosure on demand, persisted theme, exact citation jumps, and the unavailable-history notice (using an explicitly synthetic intercepted API response). See the [browser report](browser-check.json), [desktop](screenshots/alegor-desktop.png), [dark theme](screenshots/alegor-desktop-dark.png), [unavailable range](screenshots/alegor-range-unavailable.png), [Plane Sync](screenshots/alegor-plane-sync.png), and [mobile](screenshots/alegor-mobile.png). These checks verify interaction mechanics only; they do not establish that users understand the tool without assistance.

## Reproduction

The final focused suite passed **12/12** behavior and API/security tests. Run the behavior tests and read-only pilot from the repository root:

```powershell
node --test D:/ware/represent/tests/alegor-core.test.mjs D:/ware/represent/tests/alegor-server.test.mjs #
```

```powershell
node D:/ware/represent/scripts/alegor-pilot.mjs D:/ware/represent/examples/alegor/projects.example.json #
```

```powershell
node D:/ware/represent/src/alegor/cli.mjs serve D:/ware/represent/examples/alegor/projects.example.json --port 8874 #
```

## Limits and next tests

The selector supports repository-root scope only; subdirectory roots fail closed. History is capped at 40 first-parent commits, document selection is rule-based, and the local web server is a development surface rather than a hardened multi-user service. Dirty file contents are bounded; a snapshot says when some hashes could not be captured. A broader pilot should ask a maintainer to answer a concrete “what changed / where should I continue?” question unaided, then compare their answer with cited project facts and record missed and misleading evidence.
