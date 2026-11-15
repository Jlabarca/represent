# Clay Notes — creation, testing and deployment plan

> Updated2026-11-15. Owner: Represent app agent for app source/tests; operator for gateway Apply, live paid approval, Chrome installation and store publication. [Existing local MVP](../reference/clay-notes.md), [gateway request](../design/clay-notes-gateway-request.md), [preparation tracker](../orkest/clay-notes-release-prep.imp.md).

## Product and deployment boundary

The first release is an internal lab1 tool: a Node22+ service on `127.0.0.1:8876`, Chrome MV3 capture, local notebook storage, Ghost routing and no cloud accounts. The extension needs its local service. A Chrome Web Store listing does not host the Node service or grant other users access to lab1. Broader public release requires an explicit authenticated hosted-backend or distributable local-companion decision. Do not expose the lab1 gateway/key to Chrome or the internet to make a demo work.

## Phases and acceptance gates

| Stage | Deliverable | Acceptance and owner |
|---|---|---|
| 1 · existing MVP | Save/open before caption extraction, cited statements/conclusions, Keep-like collection, notes/questions, revision history | REP-8 implemented;96 historical tests and12 fixture-browser checks; real Chrome/gateway flow not yet accepted |
| 2 · gateway request | Own `clay-notes` key, summary/deep lanes, proposed$1/30d cap | Request prepared from registry; operator confirmed default summary; **Apply SHA and own-key lane-test pending** |
| 3 · localization | en/es/pt/fr/de/it/ja/zh-CN/ar/hi authored interface copy; Arabic RTL; persisted language; native Chrome messages | Offline locale/capture regressions, desktop Spanish/Arabic and mobile rendering; user/model source content remains original language |
| 4 · gateway wiring after Apply | Named environment key, `clay-notes-summary`/`clay-notes-deep`, actual-hop metadata and spend fence | Token-free loopback tests; known Apply SHA linked; unknown attribution fails conservatively; operator live-call cap still required |
| 5 · source-only video trial | Metadata, transcript availability/language/count/hash and caption limitations for all three URLs below | No inference; record denied/blocked/absent source honestly; captured text never creates a fake summary |
| 6 · bounded live trial | One automatic summary per video, then one explicitly chosen deeper redo if separately approved | Operator-specified call/dollar cap; real model/hop/cost/time, timestamp spot-checks, duplicate saves avoid a second automatic call |
| 7 · release candidate | Versioned ZIP, manifest/resources/locale checks, integrity hash, install and rollback guide | Reproducible allow-list package, no tokens/store data/dev fixtures; all app regressions pass |
| 8 · developer install | Chrome Developer mode → Load unpacked → local pairing; enable only YouTube and loopback | Operator installs; refresh YouTube after extension reload; verify one button across SPA changes, service restart and missing captions |
| 9 · controlled distribution | Store-ready ZIP, listing, screenshots/icons, privacy/support pages, permission explanation, tester list | Operator developer account/admin2FA and dashboard review; internal trusted-testers/unlisted choice; no publication by this app agent |
| 10 · broader release | Deliberate companion installer or authenticated hosted product; monitoring, ownership and incident process | Separate scope/approval; gateway credentials stay server-side; public data/hosting policy and budget validated first |

Stage3 and source-only stage5 can proceed while the gateway request waits. Steps4/6 cannot be marked complete from fixture tests. New locale labels do not by themselves prove human translation review or generated-output language support.

## Three-video trial matrix

| Video | Source-only capture now | After operator approval |
|---|---|---|
| [X6J3ByTqhLY](https://www.youtube.com/watch?v=X6J3ByTqhLY) | Actual title/channel, availability, transcript language/segments/characters/hash or exact blocker | Default summary, citation spot-check, cold latency/cost |
| [t2_F7Fn8vYA](https://www.youtube.com/watch?v=t2_F7Fn8vYA) | Same, preserving original text and timestamps | Default summary, duplicate save/no extra inference |
| [Ecuit73WzV0](https://www.youtube.com/watch?v=Ecuit73WzV0) | Same; report missing captions/region/age/sign-in failures | Default summary; optional approved deep redo and revision/source preservation |

For each video, record what happened rather than assuming titles or access from an ID. Test empty/long/malformed captions with fixtures separately. Compare at least three statement citations to the actual transcript and check conclusions are attributed to the speaker. A valid reference index is not a factual-accuracy verdict. Capture on the current video must survive SPA navigation, duplicate clicks and service disconnection. Summary language follows a separately tested post-Apply preference; interface language switching does not silently translate stored evidence.

## Local setup and operator install

Node22+ is required. Serve from any PowerShell5.1 shell:

```powershell
node D:/ware/represent/src/clay-notes/cli.mjs serve #
```

Open the library, choose the desired language, and select Connect Chrome. The operator loads `D:/ware/represent/extensions/clay-notes`, opens its options and enters the **local pairing code**. This is separate from the gateway key; key values never go in chat, docs, extension storage or a ZIP. In Chrome, reload the unpacked extension after code changes and refresh the YouTube page to reinject content scripts. Test service-off, no-key and missing-caption messages before real inference.

## Chrome Web Store preparation and distribution

Use [Chrome's i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n) for `_locales/<locale>/messages.json` with `default_locale`, including name/description/action/options. Before submitting, complete the current [distribution setup](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/) and [privacy disclosures](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements/). These official pages were checked2026-11-15; review them again at submission.

Prepare a single-purpose listing: save the current YouTube video's transcript into the user's local Clay Notes library and summarize via their authorized server. Explain `storage` for local pairing/preferences, `scripting` for current-video caption metadata and the YouTube/loopback host permissions. Do not request `<all_urls>`, browsing history or provider credentials. Review local-network permission behavior in the target Chrome versions; report actual prompts rather than assuming permissions transfer from the in-app browser.

Release assets: extension icons at current required sizes, screenshots of the real released UI, concise English listing plus the ten localized listings as reviewed, support contact/URL, release notes, a public privacy-policy URL, retention/deletion instructions and the developer dashboard's matching data-use declarations. Disclose that a user-selected video's title, URL and transcript travel to their local service and then the configured Ghost/provider chain after authorized generation. Local storage, extension pairing, gateway spend logs and provider processing are distinct. No claim of zero collection or on-device-only inference is accurate for paid/provider hops. No copied Clay artwork or fabricated AI-results screenshots.

Upload the ZIP and verify manifest/locale/resource warnings. Start with operator-controlled tester distribution, then unlisted/internal use if suitable. The operator reviews and submits/publishes; this plan does not perform the submission or accept agreements. Keep extension version and service compatibility version paired. Do not sell a local-lab1 dependency as a functioning public service.

## Release verification and integrity

Run the focused test launcher and full suite before packaging. The planned package script must accept an explicit source directory/output path, enumerate only declared extension files/locales/icons, reject symlinks/secrets/runtime stores, validate referenced assets and emit a versioned ZIP plus SHA256. Package bytes should be deterministic for unchanged source. Tests inspect ZIP members rather than merely asserting that a file exists. Only approved release files go to the Web Store; never package a repository root, `.env`, fixtures or notebook JSON.

The trial report records supported Chrome/OS versions, actual extension install method, service HEAD, manifest version, locale, video IDs and whether inference was stubbed or live. Stop on failed spend classification, wrong video/citations, duplicate billable calls or data loss. Pending operator evidence is not a green gate.

## Rollback and support

Keep the last verified versioned ZIP/hash and source commit. For developer installs, reload the previous verified extension folder and refresh YouTube; restore the compatible service revision without rewriting stored notebooks. Back up the local store before any future schema migration. Store rollback requires a new reviewed version containing the fix/reversion; do not assume the Web Store can downgrade every installed client. Preserve notebook revisions and error records.

Gateway rollback belongs to the operator/console transaction and its journal. The app agent never deletes lane/model rows, edits registry data or clears a failed transaction. Report the request/Apply SHA and failure by name, disable further automatic generation through the app's future spend fence, and retain saved notebooks. Support diagnostics include non-secret version/status/error/call IDs and known/unknown cost; no pairing or gateway key values.
