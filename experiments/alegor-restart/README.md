# Alegor re-entry restart

This is an isolated experimental prototype, created while Visu work is paused. It reads the current Represent Git history and two project documents to answer “what changed, where is the state written down, and what disagrees?” It does not require Visu's runtime or snapshot format. No personal session directories were enumerated, no transcript was ingested, and no AI or paid model call was made.

Open [the static prototype](index.html), its [line-numbered source evidence](evidence.html), [the Markdown brief](reentry.md), or [the JSON record](reentry.json). Run the deterministic extractor with Node 22:

```powershell
node D:/ware/represent/experiments/alegor-restart/reentry.mjs D:/ware/represent D:/ware/represent/experiments/alegor-restart d7b24ac #
```

At the captured revision `df3233a`, the trial covers **7 commits and 78 unique changed paths** from the suite-direction commit `d7b24ac`. It cites current state from CONTEXT and TODO separately. The extractor deliberately surfaces a stale-state mismatch: CONTEXT's Current Sprint still describes the Visu discovery proof as next, while TODO records the automatic discovery trial, non-game test, manual-update measurement, and browser checks complete. It does not guess which document wins. A synthetic session fixture overlaps `docs/CONTEXT.md` and the Alegor research brief, demonstrating candidate linkage only; file overlap cannot prove why a commit happened.

## Windows `sessions` portability trial

Pinned source: `nicknisi/sessions` commit `9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb`. An isolated clone of that exact revision lives under the ignored `.represent/alegor-restart-sessions-copy/` directory; the upstream reference checkout was not modified. Install used Bun 1.1.12 and the lockfile. Before the patch, `bun test src/context.test.ts` reproduced **8 pass, 14 fail, one setup error**: the fixture converted `/` only, then attempted to create a child path containing the absolute Windows drive path. Correcting only fixture setup revealed the production scanner had the same slash-only normalization in its Claude project prefix. A two-line experimental patch normalizes both path separators and removes the Windows drive colon. After the patch, **25 pass, 0 fail** in that context suite.

The raw [before log](windows-before.log), [after log](windows-after.log), exit codes and [exact two-file diff](windows-path-fix.patch) are retained. This is evidence about this fixture and context suite on this host; it is not a claim that the whole upstream test suite is Windows-ready or that this patch has been accepted upstream. The test fixture and scanner agree on a synthetic Windows slug; the actual Claude Code on-disk slug convention on this host was not independently checked, so connector compatibility remains unverified.

## Browser check and limits

The static HTML passed twelve headless-browser checks both from local files and the parent preview at `http://127.0.0.1:8872/alegor-restart/index.html`: key sections render, both source links open and jump to the cited line in a bundled evidence page, the synthetic session is labelled, there are no page or console errors, and the 390px layout has no horizontal overflow. The prototype surfaces the stale disagreement as unresolved. This is a small prototype, not a polished companion UI. The JSON is reproducible for a fixed base and HEAD (digest `5f6df93875a4d4471185f3bfba211be832d793f3504ac55d183df86a5bfcad9c`); its generated timestamp naturally changes on reruns.

No `.represent` snapshot export or real user-selected session corpus was imported here. Git commits are the observed history source. Session linkage mechanics are represented only by the synthetic fixture. The next meaningful acceptance gate is an explicitly chosen, privacy-previewed session source: verify a re-entry brief against that user's own correction of “what changed / why / what next?”, measure false links, and keep unrelated sessions excluded. That gate does not block starting a local Git/docs MVP now.

## Files

- `reentry.mjs`, `synthetic-session.json`: extractor and synthetic linkage input.
- `index.html`, `evidence.html`, `reentry.md`, `reentry.json`: generated outputs.
- `browser-smoke.mjs`: headless browser smoke script using the host's installed Playwright.
- `windows-before.log`, `windows-after.log`, `windows-path-fix.patch`: isolated upstream experiment evidence.
