# Local application validation

`browser-tests.cjs` exercises generated HTML using Playwright Chromium in a fresh headless browser profile. It does not access personal browser tabs, cookies or profiles. HTTP(S) requests are blocked and recorded; the tested outputs should be self-contained.

Run with installed Playwright, or use this machine's bundled runtime:

```powershell
node D:/ware/represent/experiments/rompe/validation/browser-tests.cjs C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright #
```

It checks all ten rendered tabs/card counts, all ten native overlap audits, the red-loss detail, navigation to its source anchor, zoom/fit, SVG export, and the poster render/audit/export. It writes `browser-results.json` and desktop/mobile screenshots. Console errors, network requests and unsuccessful audit messages fail the run.

Fourteen checks passing does not establish full UI accessibility, all touch gestures, all source-link semantics or readable mobile layouts. The 390px fit-view screenshot exposes very small text despite no horizontal overflow. Independent source review is documented in `../source-audit.md`; manual visual inspection is described in the trial report.

The initial detail assertion ran before the upstream 300ms single-click delay completed. The harness now waits for the observable detail text; no renderer behavior was changed to satisfy it.
