---
id: REP-9

---
# REP-9: CLAY-NOTES-RELEASE-PREP

> Updated: 2026-11-15
> Prior-art sweep: CAPABILITIES, CONTEXT, REP-8 done tracker, existing Clay Notes source/tests and Ghost onboarding/console/routes registry inspected 2026-11-15.

## AI Continuation Prompt

Continue the user's 2026-11-15 follow-up: prepare own-key/own-lane Ghost request, localize the site to many languages, write the full extension deployment plan, and begin read-only tests against X6J3ByTqhLY, t2_F7Fn8vYA, Ecuit73WzV0. Preserve unrelated .ghostdev/version.json and notion/. Prior local MVP REP-8 promoted32c2a43;96 tests. Current gateway work stops at the prepared request: operator applies, returns SHA/lane-test, then a later slice wires the new lane with header-based attribution and spend fence. No secrets, paid inference, route-runner, queue files, registry mutation or key/model APIs.

## Open Questions

Default lane settled by operator: “Yes, summary is default (recommended)” on2026-11-15. Proposed budget$1/30d, not an applied configuration. Operator Apply SHA, lane-test result and separate live paid-call approval remain external dependencies, not permission to infer. Routine language selection defaults to ten locales including Arabic RTL; content itself stays in the captured/generated source language until the post-Apply generation-language work.

## Architecture

Preserve Node22 buildless core/service/web/Chrome. New local web i18n catalog maps all authored UI copy with explicit locale selection, browser preference, persisted choice, locale dates and RTL. Captured titles/transcript/model output are user data, not translated automatically. Chrome metadata/action/options use native chrome.i18n messages and matching ten locales. Token-free packaging produces a reproducible ZIP from an explicit extension allow-list, without storage/credentials. Gateway request is durable in docs/design plus the exact user-requested ephemeral docs/handoffs/GATEWAY-REQUEST-2026-11-15.md; the latter is excluded locally to avoid reintroducing a legacy tracked layout. Follow the user's explicit destination over generic handoff placement. No live-model wiring before Apply evidence.

## Current State

Grounded preparation only. No localization, packaging, real-video access result or gateway Apply claimed yet.

## Known Bugs

No new reproducible defect established. Existing live Chrome/gateway compatibility remains unverified.

## What Needs Testing

Locale negotiation including regional fallbacks, interpolation and locale-switch persistence, complete catalog keys, RTL and CJK rendering, English fallback. Extension i18n metadata/options and worker behavior. ZIP deterministic allow-list and missing asset failures. Three real video metadata/transcript access checks, caption limits/hash/count evidence and explicit no-AI status. Existing96 regressions plus new tests; browser proof for Spanish/Arabic/mobile. No LLM inference.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REP-9.1 | Shipped | current | current | Gateway request and release decisions |
| REP-9.2 | Shipped | current | current | Ten-language site and Chrome copy |
| REP-9.3 | Shipped | current | current | Packaging, video access trials and release guide |

## Checklist

### Phase 1 — Operator request

> verify: docs

- [x] REP-9.1.1 — Write the own-key/two-lane request from live registry presets, record operator default-lane decision and supersede shared-key suggestions; create full release plan with explicit Apply/live-call boundaries. — evidence: C:/Python312/python.exe -B tmp/clay-release-doc-check.py: 0/0 passed, skipped=0, output sha256=1648e2cda1171d55d02cd44ff1b15bdad16eb9c1e69d3cb89a2217f8e887ddc7

### Phase 2 — Localization

> verify: integration
> requires:
>   skip_budget: 0

- [x] REP-9.2.1 — Implement ten-language web UI and Chrome metadata/options/action copy; test locale negotiation, catalogs, fallback and existing capture flow; inspect Spanish/Arabic/mobile with no paid calls. — evidence: node scripts/clay-notes-test.mjs: 29/29 passed, skipped=0, output sha256=632a5155331e40e4c8396f6fe242e5d06881f2941f90778a61635667e1828eb2

### Phase 3 — Release preparation and video trials

> verify: integration
> requires:
>   skip_budget: 0

- [x] REP-9.3.1 — Create an explicit allow-listed ZIP builder and tests, record real access/transcript results for the three user URLs, update release guide with reproducible install/distribution/rollback steps and verify the whole suite. Keep gateway Apply/wiring and full live summaries explicitly pending. — evidence: node scripts/clay-notes-test.mjs: 41/41 passed, skipped=0, output sha256=5b078bf7b4550311f6acb50849028bd386ebab513020d520cb1f01a3797a610b

## Key Files Reference

| File | Role |
|---|---|
| docs/design/clay-notes-gateway-request.md | New durable request and operator decision |
| docs/guides/clay-notes-release.md | New complete release plan |
| src/clay-notes/web/i18n.mjs | New web locale catalog/runtime |
| src/clay-notes/web/app.mjs | Existing dynamic UI |
| src/clay-notes/web/index.html | Existing static dialogs/navigation |
| src/clay-notes/server.mjs | Serve new i18n module only; no gateway wiring |
| extensions/clay-notes/_locales/ | New native Chrome messages |
| scripts/clay-notes-package.mjs | New token-free ZIP builder |
| experiments/clay-notes/videos/ | New real source-access evidence |

## Architecture Notes

User's explicit own-key/own-lane rule supersedes REP-8's tentative represent-key reuse. No application of gateway configuration is authorized; record the conflict and quote the actual decision. Default-lane approval is not a paid-call approval. Read-only YouTube access can proceed independently. Public extension distribution requires a reachable authenticated backend for users; the current loopback lab1 product is an internal developer/unlisted-testing candidate, not automatically a public SaaS. The release plan must keep that product boundary concrete.

## Plan — 1

Documentation-only phase. Exact paths: docs/CONTEXT.md, docs/TODO.md, docs/README.md, docs/reference/clay-notes.md, docs/design/clay-notes-gateway-request.md, docs/guides/clay-notes-release.md. Update CONTEXT first. Record actual user quotes for own key/lane, default-lane choice and no paid calls before approval. Request new clay-notes key because registry keys.clay-notes does not exist; propose $1/30d, operator audience, summary cheap preset, deep smart preset and default summary. No registry, consumers, .env, route queue, runner, /key or /model writes/calls.

Write the exact requested ephemeral handoff at docs/handoffs/GATEWAY-REQUEST-2026-11-15.md and add only that path to this checkout's .git/info/exclude. Preserve the durable request in docs/design and commit it; never stage ephemeral handoffs. Explain this user-directed path exception. The full release guide covers local service, language matrix, gateway approval/evidence, token-free tests, three real-video trials, ZIP package, developer install, permissions/privacy/store materials, tester distribution, public-backend gap, roll-forward/rollback and measurable gates.

Pins: supersede the old reference's tentative Represent consumer reuse; preserve historical evidence, link current own-key decision. Index new docs and active tracker, preserve REP-8 and unrelated local changes. Verify documentary required fields/operator quote/URLs through a small offline check plus diff review; no behavior or live inference in this phase.

Exact owned files: `docs/CONTEXT.md`, `docs/README.md`, `docs/TODO.md`, `docs/design/clay-notes-gateway-request.md`, `docs/guides/clay-notes-release.md`, `docs/reference/clay-notes.md`.

### Phase 1 QA — 2026-11-15

No mechanical QA findings.

## Plan — 2

Implement ten-language UI without changing gateway model/key/spend wiring. Exact paths: src/clay-notes/web/i18n.mjs, src/clay-notes/web/app.mjs, src/clay-notes/web/index.html, src/clay-notes/web/style.css, src/clay-notes/server.mjs (static module allow-list only), extensions/clay-notes/manifest.json, content.js, background.js (only localized messages), options.html, options.js, options.css, extensions/clay-notes/_locales/en/messages.json, _locales/es/messages.json, _locales/pt/messages.json, _locales/fr/messages.json, _locales/de/messages.json, _locales/it/messages.json, _locales/ja/messages.json, _locales/zh_CN/messages.json, _locales/ar/messages.json, _locales/hi/messages.json, tests/clay-notes-i18n.test.mjs, tests/clay-notes-extension.test.mjs.

Use a shared explicit catalog keyed by authored English phrases, translation helper with literal interpolation, locale negotiation en/es/pt/fr/de/it/ja/zh-CN/ar/hi, localStorage selection, lang/dir and Intl dates. Mark only authored UI text for translation; do not translate user notes/titles/transcripts/AI output or raw server errors. Prefer editing template literals to call the helper instead of sweeping DOM text. Static markup gets data-i18n labels/attributes; dialogs can translate on init and locale change. Escape translations/interpolation before HTML rendering. Mobile select and Arabic logical CSS; use system glyph fallbacks where Satoshi lacks characters. New language choices affect presentation only until post-Apply output-language work.

Chrome native i18n uses _locales/default_locale and localized manifest/action/options/content-button text. Pairing code and gateway key are separate; no credential value in localization catalogs. Existing sender-validation/capture semantics retained.

Pins: server static allow-list must serve i18n.mjs, manifest references locale name/description/action keys, tests VM chrome stub must provide i18n.getMessage; package glob already finds i18n test. Update only listed surfaces. TDD locale negotiation with pt-BR/es-CL regional matching first, then Spanish visible controls and RTL/escaped interpolation/fallback. Run focused Node suite; review desktop Spanish, Arabic and mobile. Catalog completeness guards missing user-visible translations, not exact growable locale counts. No paid/network LLM call.

Exact owned files: `extensions/clay-notes/_locales/ar/messages.json`, `extensions/clay-notes/_locales/de/messages.json`, `extensions/clay-notes/_locales/en/messages.json`, `extensions/clay-notes/_locales/es/messages.json`, `extensions/clay-notes/_locales/fr/messages.json`, `extensions/clay-notes/_locales/hi/messages.json`, `extensions/clay-notes/_locales/it/messages.json`, `extensions/clay-notes/_locales/ja/messages.json`, `extensions/clay-notes/_locales/pt/messages.json`, `extensions/clay-notes/_locales/zh_CN/messages.json`, `extensions/clay-notes/background.js`, `extensions/clay-notes/content.js`, `extensions/clay-notes/manifest.json`, `extensions/clay-notes/options.css`, `extensions/clay-notes/options.html`, `extensions/clay-notes/options.js`, `src/clay-notes/server.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/style.css`, `tests/clay-notes-extension.test.mjs`, `tests/clay-notes-i18n.test.mjs`.

### Phase 2 QA — 2026-11-15

No mechanical QA findings.

## Plan — 3

Release preparation only; gateway Apply/wiring/live inference remains pending. Exact paths: scripts/clay-notes-package.mjs, scripts/clay-notes-video-trial.mjs, scripts/clay-notes-icons.mjs, scripts/clay-notes-test.mjs, tests/clay-notes-release.test.mjs, tests/clay-notes-server.test.mjs, extensions/clay-notes/manifest.json, extensions/clay-notes/icons/icon.svg, extensions/clay-notes/icons/16.png, 32.png, 48.png, 128.png, docs/CONTEXT.md, docs/TODO.md, docs/README.md, docs/reference/clay-notes.md, docs/reference/clay-notes-release-prep.md, docs/guides/clay-notes-release.md, experiments/clay-notes/release-prep/README.md, browser-check.json, video-trials.json, package.json, spanish.jpg, arabic.jpg, arabic-mobile.jpg, source-notebook.jpg. The package.json under experiments is a non-secret artifact report, not runtime package configuration. dist ZIP/raw captured transcripts/live trial notebooks remain ignored and unstaged.

Package: build a deterministic ZIP using Node built-ins, explicit seven base extension files, all declared locale message files and manifest icons. Validate referenced resources, MV3/default_locale/version, no symlinks/path traversal/secret/runtime entries, bounded input sizes. Fixed timestamps/sorted entries, integrity SHA256, inspect members/CRC in tests. Add original code-native clay/star icons (SVG+generated PNG), version0.2.0, no external images/inference. Package output dist/clay-notes/clay-notes-0.2.0.zip and report; no publication.

Source-only video adapter: parse native browser export headers and [m:ss] captions into the existing canonical segments; never include exporter metadata as speech. Read only the exact three provided URLs/exports; record title/channel/source language/automatic captions, counts, duration and SHA256. Store normalized source-only notebooks in an isolated local trial store. No summary/chat/Gateway.complete call, no key reading. Raw transcript exports stay outside Git. Test language/header/time parsing and prove adapter never invokes a fake gateway.

Harness repair: phase2 old service fixture used a1-second polling allowance and Windows worker occasionally timed out before results. Serialize test files as already configured; permit bounded60-second files, stream TAP diagnostics, use explicit per-test/fixture cleanup so a failed assertion releases a held fake gateway. Do not convert timeouts/skips into passes. Execute focused then strict full suite once after final source changes; rerun only affected failures, and required final-head receipts for promotion.

Evidence: reuse temporary browser screenshots from actual Spanish/Arabic/390px UI checks, add real source-only notebook inspection; preserve original video words/AI output language unchanged. Update CONTEXT first and references/index/TODO. The release plan must accurately distinguish prepared ZIP/developer install from operator installation/store submission, hosting/backend decisions and translation review. Final local preparation may be closed independently of the explicitly pending gateway/user live-trial gates, never called full gateway onboarding done.

Exact owned files: `docs/CONTEXT.md`, `docs/README.md`, `docs/TODO.md`, `docs/guides/clay-notes-release.md`, `docs/reference/clay-notes-release-prep.md`, `docs/reference/clay-notes.md`, `experiments/clay-notes/release-prep/README.md`, `experiments/clay-notes/release-prep/arabic-mobile.jpg`, `experiments/clay-notes/release-prep/arabic.jpg`, `experiments/clay-notes/release-prep/browser-check.json`, `experiments/clay-notes/release-prep/package.json`, `experiments/clay-notes/release-prep/source-notebook.jpg`, `experiments/clay-notes/release-prep/spanish.jpg`, `experiments/clay-notes/release-prep/video-trials.json`, `extensions/clay-notes/icons/128.png`, `extensions/clay-notes/icons/16.png`, `extensions/clay-notes/icons/32.png`, `extensions/clay-notes/icons/48.png`, `extensions/clay-notes/icons/icon.svg`, `extensions/clay-notes/manifest.json`, `scripts/clay-notes-icons.mjs`, `scripts/clay-notes-package.mjs`, `scripts/clay-notes-test.mjs`, `scripts/clay-notes-video-trial.mjs`, `tests/clay-notes-release.test.mjs`, `tests/clay-notes-server.test.mjs`.

## Plan — 3

Amendment after intermediate source commit b211418: the prepared package/source-trial work is preserved but not verified and the phase box stays unchecked. Re-plan at this clean owned checkpoint before repairs/settings. Preserve original phase base so QA includes every prepared source change. Gateway key/lane wiring remains blocked on operator Apply; no paid calls or secret values.

New exact source paths in addition to the prior phase3 inventory: src/clay-notes/core.mjs, src/clay-notes/server.mjs, src/clay-notes/web/app.mjs, src/clay-notes/web/i18n.mjs, src/clay-notes/web/index.html, src/clay-notes/web/style.css, src/clay-notes/web/session.mjs, tests/clay-notes-preferences.test.mjs. Existing tests/clay-notes-server.test.mjs remains owned. Added session module must be in server static allow-list.

Confirmed root cause: ignored diagnostic reproduced EPERM on atomic rename during the initial summary-state mutation. Implement bounded retry of EPERM/EACCES/EBUSY only, immutable previous-file retention and cleanup of owned temp files. Move summary startup persistence inside failure handling. TDD inject a transient rename lock then assert a successful bounded replacement; permanent errors must surface and old content must survive. No LLM retry or extra billable call.

User-reported website auth bug: cookies are host-scoped, so same name across8876/8880 lets QA invalidate the main service. Namespace local HttpOnly cookies by actual port; distinguish web_session_expired from extension_not_paired. Browser session helper may refresh its own root cookie and retry an auth-rejected operation exactly once, without navigating away or losing form drafts. Localize the web error. Tests cover two independent service cookies, no extension pairing requirement for website, one mutation after401 bootstrap and no retry for a real server error.

User settings: move language selector into a gear dialog; Automatic uses browser/OS preference and listens to languagechange, manual locale persists. Add Light/Dark/Automatic; auto follows prefers-color-scheme and change events, manual theme persists. Use clear accessible labels, all ten languages and restrained clay/Satoshi palette in both modes. Add truthful presentation for awaiting_summary so captured notes do not claim an active job. Test preference resolution/migration, live detection and card copy, then inspect real source notes in light/dark/auto without inference. The current site's local development mode remains separate from the newly requested hosted Google-auth SaaS target.

Latest scope queue after this phase: tactile TCG collection with durable reorder/filter/sort/create in a separately committed next phase; then future multi-source/NotebookLM roadmap. Hosted clay.maremoto.dev with Google auth, no Cloudflare Access, no production pairing, extension account-session flow needs architecture grounded in existing app patterns and OAuth deployment prerequisites. Public gateway request must be revised before Apply; the internal operator request is not silently applied to customers.

Verification: focused Node tests with actual TAP counts; deterministic lock and session regressions precede implementation. Run full suite through a strict gate once final source/settings/card changes are complete, plus required committed-head receipts. Retain failed attempts. No plain success claim before all required proof and browser checks. Exact ownership remains the helper's committed path inventory.

Exact owned files: `docs/CONTEXT.md`, `docs/README.md`, `docs/TODO.md`, `docs/guides/clay-notes-release.md`, `docs/reference/clay-notes-release-prep.md`, `docs/reference/clay-notes.md`, `experiments/clay-notes/release-prep/README.md`, `experiments/clay-notes/release-prep/arabic-mobile.jpg`, `experiments/clay-notes/release-prep/arabic.jpg`, `experiments/clay-notes/release-prep/browser-check.json`, `experiments/clay-notes/release-prep/package.json`, `experiments/clay-notes/release-prep/source-notebook.jpg`, `experiments/clay-notes/release-prep/spanish.jpg`, `experiments/clay-notes/release-prep/video-trials.json`, `extensions/clay-notes/icons/128.png`, `extensions/clay-notes/icons/16.png`, `extensions/clay-notes/icons/32.png`, `extensions/clay-notes/icons/48.png`, `extensions/clay-notes/icons/icon.svg`, `extensions/clay-notes/manifest.json`, `scripts/clay-notes-icons.mjs`, `scripts/clay-notes-package.mjs`, `scripts/clay-notes-test.mjs`, `scripts/clay-notes-video-trial.mjs`, `src/clay-notes/core.mjs`, `src/clay-notes/server.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/session.mjs`, `src/clay-notes/web/style.css`, `tests/clay-notes-preferences.test.mjs`, `tests/clay-notes-release.test.mjs`, `tests/clay-notes-server.test.mjs`.

### Phase 3 QA — 2026-11-15

No mechanical QA findings.
