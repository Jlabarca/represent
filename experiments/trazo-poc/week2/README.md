# Trazo POC — week 2 trial (explain and compose)

Date: 2026-10-25. Tracker boxes: 2.1 to 2.3 built; 2.4 is the paid trial; 2.5 is the operator's rating.

**Model calls so far: zero.** Everything on this page was produced with the viewer's own code and a fake analyzer that returns schema-shaped chapters without any network call. The real explanation needs a gateway key in the shell that starts Trazo; see "Running the paid trial" below.

## What was built (2.1 to 2.3)

| Piece | File | Notes |
|---|---|---|
| Explain | `src/trazo/explain.mjs` | Excerpt set from Visu's `discover()` plus a bounded loader (same ranges and 600 KB cap as Visu's capture); `preview()` shows every excerpt and an estimate; `explain()` refuses without a Ghost client (409), without `confirm: true` (428) and above the per-call cap (402, `TRAZO_MAX_CALL_USD`, default $0.25); cache keyed by excerpt set, prompt version and model, hits cost $0 and make no call; vocabulary switches to "sections and documents" for Markdown folders. |
| Visu seam | `src/visu/analysis.mjs` | `analyzeProject` gains an optional `vocabulary.note`; default prompt unchanged. |
| Compose | `src/trazo/compose.mjs`, `web/trazo/templates/{infographic,chapter}.svg` | Template SVG with slots: title, meta line, six chapter cards (label, module tag, confidence dots, caption, current state, up to three clickable citations), arrows where the chapters' modules import each other, legend, freshness line with a STALE mark when the folder changed. Mermaid flowchart emitted as text (chapters as nodes, module imports as edges, low-confidence chapters dashed). |
| Artifact record | `src/artifact/record.mjs` | `represent.artifact/v0` builder and validator; id content-addressed over everything except `task` and `view.url`; evidence lines carry the quote hash. Written as `artifact.json` beside `explanation.json`, `infographic.svg` and `chapters.mmd` in the snapshot folder. |
| Viewer | `web/trazo/` | EXPLAIN panel; preview modal with the exact excerpts, size, model, estimate and cap; "Explain once for about $x" button; views sketch / chapters / mermaid (keys `s`, `c`, `m`); citation popover on click; ledger with today's spend. |
| Tests | `tests/trazo-explain.test.mjs` | 5 tests with a fake analyzer; suite 72 pass. |

## Excerpt-set previews (zero calls)

`node src/trazo/cli.mjs <folder> --once --preview --yes`. Full lists in `preview-<folder>.txt`.

| Folder | Excerpts | Files | Bytes | Vocabulary | Estimate |
|---|---|---|---|---|---|
| Represent | 49 | 30 | 63 644 | code | $0.066 |
| Plane Sync | 38 | 14 | 40 110 | code | $0.043 |
| luz | 69 | 30 | 63 991 | code | $0.067 |
| D:/ware/docs | 47 | 30 | 63 811 | docs | $0.066 |

The estimate is `$0.004 + $0.001 per KB`, fitted to Visu's measured history ($0.067 for a 64 KB set on gemini-flash through the gateway). It is shown as an estimate; the gateway's reported cost is what the ledger records. Note for the design's pass table: the target "under $0.05 per explanation" is met only for Plane Sync at this excerpt size; the other three sit at about $0.066 because discovery fills its 64 KB cap. Lowering the cap for the explain call is one lever if the rating shows the extra excerpts do not buy correctness.

## Demo run with the fake analyzer (zero calls)

Screenshots: [preview modal](demo-preview-modal.jpg), [chapters infographic](demo-chapters.jpg), [citation popover](demo-citation.jpg), [Mermaid text](demo-mermaid.jpg). Outputs: [demo-infographic.svg](demo-infographic.svg), [demo-chapters.mmd](demo-chapters.mmd), [demo-artifact.json](demo-artifact.json), [demo-ledger.json](demo-ledger.json). The captions say "Demo caption" on purpose; the citations are real excerpts of this repository, which is what the popover shows.

## Running the paid trial (2.4)

One explanation per folder, with the operator watching the preview and the price. In a PowerShell window with the gateway key set for that window only:

```powershell
Set-Location D:/ware/represent; $env:TRAZO_GHOST_KEY='<operator key>'; node D:/ware/represent/src/trazo/cli.mjs D:/ware/plane-sync #
```

Then in the viewer: Preview what I will send, read the list, Explain once. Repeat for `D:/ware/represent`, `D:/ware/luz` and `D:/ware/docs`. The ledger under `%LOCALAPPDATA%/Represent/trazo/<project>/ledger.json` records the reported cost of each call; a second click on an unchanged folder must read "cached · $0".

For 2.5, rate ten statements per folder (the six summaries plus four current-state lines) as true or false against the cited excerpts; the pass line is 8 of 10.

## Observations

1. **Consent before cost holds end to end.** No path in the code reaches the gateway without the preview having been computable and `confirm: true` in the request; tests pin the 409, 428 and 402 refusals and the $0 cache hit.
2. **Citations are checkable.** Every caption card links to excerpts the viewer shows verbatim with path and line range; the artifact record carries the same lines with hashes.
3. **Open:** real captions, real cost and the correctness rating are the week's measurement and need the key.
