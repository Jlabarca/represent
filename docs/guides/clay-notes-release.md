# Clay Notes — extension and hosted service release plan

> Revised2026-11-15. Target: **https://clay.maremoto.dev**, Google app authentication, no Cloudflare Access, no customer pairing/local service. [Intended architecture and future notebook roadmap](../design/clay-notes-service-roadmap.md), [current implementation](../reference/clay-notes-release-prep.md), [own-key gateway request](../design/clay-notes-gateway-request.md).

## Delivery boundary

The local Node/Chrome MVP and its TCG/cache/settings/image improvements are implemented and tested. They are development tooling, not the public account service. Its local shared-session bootstrap must never be exposed as production auth. The production extension uses a fixed hosted origin and a scoped account grant; existing website sessions are reused quietly, otherwise one normal Google sign-in resumes the pending capture. Installing an extension alone does not identify a new Google user.

The customer flow is install → click Clay Notes on YouTube → sign in once if needed → notebook opens immediately → default statements/conclusions arrive automatically. The website also accepts sources through its growing adapter set. No Ghost key/model setup, lab1 connection or pairing code appears in that flow. General notebooks are the product; YouTube is the current adapter, while additional formats are sequenced in the roadmap.

## Ordered build and deployment gates

| Stage | Concrete work | Acceptance |
|---|---|---|
| 0 · completed local foundation | Ten UI/Chrome locales, automatic language/theme gear, full-art TCG/default thumbnails/image covers, saved reorder/filter/sort, cache before model discovery, reproducible ZIP0.2.0 | Current source d177508:46/46 focused,118/118 full; desktop light/dark and390px Arabic source-only browser evidence. Physical pointer drag remains a direct manual trial |
| 1 · hosted app | New Google-auth production entry, account ownership schema, private media, account cache/purge, export/deletion, durable jobs and quotas | Stubbed auth/nonce/CSRF/replay, two-account isolation, logout/revocation, failed/missing OAuth config cannot enable local auth; no public route yet |
| 2 · operator configuration | Dedicated Web Google client, callback/origin, stable extension ID, app service/database/volume, secret references, reviewed gateway request | Actual client and domain/config evidence by name; no values in chat, source or package; own-key Apply SHA/lane-tests returned by operator |
| 3 · gateway adapter | Server reads only LITELLM_KEY_CLAY_NOTES; app-specific lanes; actual-hop/cost classification and transactional spend reservation | After Apply only: token-free tests for free/paid/unknown serving, budgets, truncation, duplicate/restarted jobs, parallel user requests; no live paid call |
| 4 · hosted extension candidate | Fixed origin, chrome.identity/PKCE handoff, no local setup, resumable capture, idempotency and truthful source/error states | Developer-profile and fresh-profile trials, website-session reuse, first Google login, expired/revoked grant, duplicate clicks, SPA navigation, no captions/offline/quota cases |
| 5 · private URL trial | Serve app through HTTPS tunnel/reverse proxy at selected hostname, no Access; gateway/database/admin stay private | Real Google callback and two users on URL; ownership/media checks, restart/recovery, backup/restore, private source deletion/export, cache purge and no credential leaks |
| 6 · capped live video trial | Three default summaries and only separately approved deep redo | Separate operator spend cap; actual model/hop/cost/latency and source-citation checks; no fixture result counts as live success |
| 7 · store release | Versioned production ZIP, listing/screenshots/icons, privacy/support/deletion pages, narrow permissions, reviewed translations | Stable item ID matches callback allow-list; package has no keys/dev loopback requirements; operator dashboard review/submission and actual installation acceptance |
| 8 · monitored launch | Configured service/per-user quotas and selected capacity; normal public Google enrollment | Measured cold/warm latency, errors/queue/spend/backups; rollback rehearsal and owner. Existing$1/30d test proposal is not a public service budget |

Stages1/4 can use stubs while gateway Apply waits. No inference begins without the operator's separate live allowance. The card/source-only tests do not qualify hosted authentication, installed extension capture or service deployment.

## Exact external configuration

| Input | Proposed production value or required evidence |
|---|---|
| Public app origin | `https://clay.maremoto.dev` |
| Web Google OAuth callback | `https://clay.maremoto.dev/auth/google/callback` |
| Sign-in scopes | `openid email profile`; no Drive scope for basic login |
| App environment names | `CLAY_NOTES_GOOGLE_CLIENT_ID`, `CLAY_NOTES_GOOGLE_CLIENT_SECRET`, `CLAY_NOTES_PUBLIC_ORIGIN`, `CLAY_NOTES_DATABASE_URL`; operator configures values in the service secret store, never chat |
| Extension callback | Exact `chrome.identity.getRedirectURL('auth')` from the stable published extension ID; register/allow-list development IDs separately |
| Gateway environment | `LITELLM_KEY_CLAY_NOTES` server-side only; real Apply SHA plus both own-key lane-test results |
| Hostname routing | Dedicated app-only HTTPS tunnel/proxy target; no Cloudflare Access policy; no route to Ghost4000, database or developer pairing endpoints |
| Storage and operations | Dedicated database/private volume, service identity, backup location/restore proof, health/metrics and restart policy; choose real resource names during implementation |
| Live spend and capacity | Explicit trial dollar/call cap, service backstop and per-account quota configuration before public enrollment |

Google client registration and secret entry belong in Google Cloud/service configuration, without pasting values into this chat. [Google OIDC setup](https://developers.google.com/identity/openid-connect/openid-connect) describes credentials/redirects. [Chrome identity](https://developer.chrome.com/docs/extensions/reference/api/identity) describes the redirect and interactive behavior. The hosted auth implementation must use tested state/nonce/PKCE and account/session validation, not unverified email or Chrome profile text.

## Three real-video acceptance trials

| Video | Source-only proof already captured | Live acceptance after approval |
|---|---|---|
| [X6J3ByTqhLY](https://www.youtube.com/watch?v=X6J3ByTqhLY) | KManuS88, Spanish automatic captions,582segments/20,745characters | Automatic default summary; timestamp/citation spot checks; cold latency/cost |
| [t2_F7Fn8vYA](https://www.youtube.com/watch?v=t2_F7Fn8vYA) | Un Podcast Sobre Bitcoin, Spanish automatic captions,724segments/26,282characters | Default summary; duplicate capture produces no second automatic billable job |
| [Ecuit73WzV0](https://www.youtube.com/watch?v=Ecuit73WzV0) | Bitcoin Strategy, English manual captions,175segments/11,360characters | Default summary; optional explicitly approved deep redo preserves prior revision/source |

See [trial hashes and limits](../../experiments/clay-notes/release-prep/video-trials.json). Native transcript export is not installed-extension evidence. Last-caption timestamps are not guaranteed video duration. Compare at least three claims per summary against actual segments; conclusions must reflect the source's uncertainty and be attributed appropriately. Keep source text immutable per revision. Record cold/warm total time and actual serving headers/cost; missing attribution remains unknown. Failures preserve captured sources and previous revisions.

## Chrome packaging, install and publication

The existing allow-list builder creates a deterministic developer ZIP with icons and ten native locales:

```powershell
node D:/ware/represent/scripts/clay-notes-package.mjs #
```

Current output is `D:/ware/represent/dist/clay-notes/clay-notes-0.2.0.zip`; [integrity report](../../experiments/clay-notes/release-prep/package.json) records its hash/members. **This is the local development extension**, with loopback/pairing behavior. It must not be sold or submitted as the hosted candidate. The production slice changes manifest/origin/auth/permissions and version, rebuilds the ZIP and publishes a new integrity report. Never package the repo root, .env, notebook store, fixtures or provider credentials.

Developer-only local testing still uses the loopback service and current options; it is retained for offline regressions. Chrome Developer mode/Load unpacked/reload and YouTube refresh are a developer procedure, not customer onboarding. Test actual Chrome installation/version, SPA behavior and permissions separately from this in-app-browser evidence.

The hosted manifest will request the narrow YouTube capture and Clay Notes API access it needs, `storage`, the actual scripting/active-tab capabilities used, and `identity` for login. Review optional current-page capture permissions when adding general web sources; avoid `<all_urls>`, browsing history or cookie permission by default. The service's full text/image data flow and account grant storage must match the privacy disclosure.

Prepare a focused listing, real screenshots including TCG/settings, original icons, reviewed localized descriptions, support contact, release notes, privacy and deletion/export URLs. Describe selected source content sent to the hosted service and configured AI providers, retention, user ownership and account authentication. Do not claim on-device-only processing or zero data collection. Provider processing, private storage and diagnostic retention are separate. Review [Chrome i18n](https://developer.chrome.com/docs/extensions/reference/api/i18n), [distribution setup](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution/) and [privacy disclosures](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements/) again before submission.

Obtain the store item ID early, configure its exact auth callback, then run a trusted-tester candidate through the same origin/auth flow intended for launch. The operator owns developer-account agreements and final submission/publication. No store upload or agreement acceptance occurred during preparation.

## Release rollback and operational proof

Pin compatible app/extension versions and record source commit, package hash, auth-client/callback configuration names and gateway Apply SHA. Use backwards-compatible API changes across extension rollout. Back up database and private assets before migrations and rehearse restore into an isolated service. Never overwrite the user's local library during migration; explicit import copies sources into the authenticated account with ownership and source-version checks.

Rollback the app to its last verified image/revision while preserving data; stop new automatic jobs on spend/attribution/isolation failures. Keep sources and previous revisions readable. Store rollback generally requires a new reviewed extension version; retain idempotency and compatibility with the already installed candidate. Revocation/logout must invalidate account/extension grants and clear account caches. Tunnel rollback removes only this app's public route, leaving sibling apps/gateway unchanged. Gateway rollback stays operator-owned in its console/journal; this app session never edits registry, consumers, runner or queue files.

Support records contain nonsecret versions, job/call IDs, source adapter status and known/unknown cost. They exclude source content by default and never contain session, pairing, Google or gateway tokens. Public acceptance requires real results for authentication, isolation, capture, budget, backup and publication; a prepared plan is not evidence they occurred.
