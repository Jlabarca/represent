# Visu: automatic scope, chapters and manual updates

2026-10-21. All three configurations contain only ID, name and root. No source lists, chapter titles, summaries or visual motifs were authored for this trial. ImageLab was the new project; ROMPE and Luz were rerun with the same generic pipeline. Original projects were read-only. Edits for update measurement used a disposable copy.

| Project | Automatic scope | Detected direction | New illustration | Latest successful explanation |
|---|---:|---|---:|---:|
| ImageLab | 28 files | Neutral, low confidence | $0.0674950 | $0.0136903 |
| Luz y Luna | 30 files | Editorial, high confidence | $0.0675335 | $0.0165783 |
| ROMPE | 30 files | Retro, medium confidence | $0.0674915 | $0.0125119 |

Full per-project ledgers, scopes, captured citations and chapter outputs: [ImageLab](imagelab.json), [Luz](luz.json), [ROMPE](rompe.json). Illustrations are the adjacent PNGs. Initial lightweight text trials, rejected outputs and rate-limited requests remain accounted for. This iteration total is **$0.28688598**, including three illustrations, all text experiments and the separate controlled-copy update. It is additional to the prior $0.3682722 trial.

## Small report: the earlier $0.37

| Prior trial category | Measured cost |
|---|---:|
| 5 images: 2 ROMPE, 3 Luz | $0.3536370 |
| 6 text attempts, including 3 rejected responses | $0.0146352 |
| **Total** | **$0.3682722** |

Rejected text responses account for $0.0070860 of the text subtotal. Unchanged/detail update tests in that trial made no paid calls. Evidence: [original immutable measurements](../visu-pilot/measurements.json).

Yes, all calls went through **Ghost's local LiteLLM AI gateway**. Its aliases routed upstream through **OpenRouter**: `image-gen` → `google/gemini-3.1-flash-image`; `json` → `google/gemini-2.5-flash-lite`. Costs are gateway response-header measurements, corroborated by usage fields, not an independently reconciled invoice. The new default explanation alias is `gemini-flash` → `google/gemini-2.5-flash`, selected after the cheaper route mishandled mixed current/historical context. The route remains configurable.

## Cheap update proof

[Controlled-copy results](update-proof.json): unchanged capture, unchanged explanation, unchanged image and an excluded-file edit all made zero AI calls. A status-only change required one explicit text request costing **$0.0144183**. All six chapter identities and the artwork remained unchanged; the resulting cover was fresh. Image dispatch was forbidden in the test and occurred zero times. All 30 original source-file hashes matched afterward. Local copy scans measured 326–385ms; these are single observations, not production latency percentiles.

## What the trial taught us

- Alphabetical selection overrepresented peripheral code and old docs. Generic category quotas, README/context links and current references made the scope more representative. The discovery report still identifies it as a sample.
- Git's `--exclude-standard` does not exclude ignored *tracked* files. Discovery now explicitly subtracts those paths; a regression fixture verifies it.
- ImageLab's output can be retro without its own UI being retro. Reference-only output examples no longer set its visual identity.
- Eight-line snippets lost deprecation/current-structure context. Longer non-overlapping excerpts preserve current headings and supersession notes; a regression fixture covers the failure.
- Cheap Flash Lite was useful as an experiment but not reliable enough for this source-conflict task. The stronger existing Ghost alias costs roughly 1.3–1.7 cents for the final explanation; avoiding a new ~6.75-cent illustration is still the larger saving.
- Luz is more useful when it describes the synced/curated catalog, V3.5 material gateway, retired V2 sections and the gated wholesale proposal. Residual mistakes remain: some recommendations repeat older ideas despite newer completion evidence; some ImageLab statements misread source status. The product labels source reporting and makes quotations inspectable. This is a reviewable explanation prototype, not an audited project-state oracle.
- Generated motifs transferred the style with no hand-written visual brief, though the imagery still includes incidental UI lettering and some conventional dashboard metaphors. Keep state/rules in the text layer; further visual art direction remains worthwhile.
- The UX pass fixed low light-theme text contrast and a hover inspector that covered the clicked pin. The detail panel now shows a short excerpt for each question, with More detail and Sources collapsed.

## Verification

35 headless/API regression tests passed; nine live browser checks passed. [Browser record](browser-check.json) includes measured key text pairs (4.5:1 light/dark, 7:1 monochrome), persistence, zero theme/browsing POSTs, 390px mobile fit and no JavaScript/request errors. Screenshots include light/dark/monochrome ImageLab and desktop/mobile Luz. These checks do not establish semantic accuracy or certify full accessibility.

Reproduce through `scripts/visu-discovery-pilot.mjs` (manual `explain`, `illustrate`, `report` stages), `scripts/visu-discovery-update.mjs` (one paid text call on a fresh disposable copy) and `scripts/visu-discovery-browser.mjs` (read-only UI checks). See [usage and limits](../../docs/reference/visu-discovery.md). The live local application is served at port 8871.
