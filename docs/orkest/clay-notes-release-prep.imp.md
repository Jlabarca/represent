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
| REP-9.3 | [ ] not started | current | current | Packaging, video access trials and release guide |

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

- [ ] REP-9.3.1 — Create an explicit allow-listed ZIP builder and tests, record real access/transcript results for the three user URLs, update release guide with reproducible install/distribution/rollback steps and verify the whole suite. Keep gateway Apply/wiring and full live summaries explicitly pending.

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
