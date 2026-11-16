---
id: REP-10

---
# REP-10: NOTCARDS-DEV

> Updated: 2026-11-16
> Prior-art sweep: REP-8, REP-9, hosted service roadmap, local notebook store and native Chrome package.

## AI Continuation Prompt

Build and run the hosted Notcards dev version at not.maremoto.dev. Keep not.cards for a future production launch. Match the two supplied binder references with real data.

## Open Questions

Dev Google client configuration is external. Production domain registration, store publication and Ghost Apply are separate.

## Architecture

Dedicated Node dev origin, secure Google OIDC and account-isolated storage on a persistent volume, scoped extension grants, reference-driven Satoshi collection UI.

## Current State

The previous local MVP and three trial transcripts exist. Public origin, account linking and hosted package require implementation.

## Known Bugs

Local shared session and pairing cannot be exposed. Browser cache must be scoped after identity is known.

## What Needs Testing

Account isolation, real cookie boundaries, extension grant/retry, album controls, dark/light desktop/mobile, dev host reachability.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REP-10.1 | planned | current | current | Hosted app, album, browser extension and dev deployment |

## Checklist

### Phase 1 — Hosted development album

> verify: integration
> requires:
>   skip_budget: 0

- [x] REP-10.1.1 — Implement account-based Notcards with Google authentication, hosted extension capture, reference album and isolated HTTPS deployment configuration. Verify with token-free fixtures, browser checks and report actual public readiness. — evidence: node tmp/notcards-red.mjs: 1/1 passed, skipped=0, output sha256=e905dd18212f0c5454ecb23219dfd04896eb5d3952aa6fab6b184ac7cac063d5

## Key Files Reference

src/notcards/server.mjs hosts the account-scoped API. src/clay-notes/web holds the shared collection. scripts/notcards-extension.mjs builds the development extension. deploy/notcards holds the service and tunnel configuration.

## Architecture Notes

Keep existing local trial data compatible. Disable public AI generation until operator applies the dedicated lanes. Do not expose the loopback service.

## Plan — 1

Implement the hosted development app in src/notcards, sharing the existing notebook core and real cover data. Validate Google identity, scope stores by account, bind short-lived extension grants to a stable Chrome ID and keep credentials server-side. Generate a distinct development extension artifact. Rebuild the album chrome, folders, high contrast full-art cards, filters and controls for the supplied light and dark references while retaining the existing notebook editor. Configure an isolated persistent app container and dedicated tunnel. Verify distinct accounts and grants with local fixtures and inspect both themes with the three captured notebooks. Public readiness requires DNS and the operator's own Google configuration. All automatic model traffic stays disabled pending gateway onboarding.

Pins: historical loopback APIs, tests and extension stay compatible. Keep old note IDs and cover attachment data readable. The new origin and extension build are isolated from the previous developer artifact. Use node scripts/clay-notes-test.mjs --all for regression coverage and run targeted hosted and extension tests plus the browser comparison.

Exact owned files: `deploy/notcards/Dockerfile`, `deploy/notcards/compose.yml`, `docs/CONTEXT.md`, `docs/guides/notcards-dev.md`, `scripts/notcards-extension.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/collection.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/style.css`, `src/notcards/cli.mjs`, `src/notcards/identity.mjs`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-album.test.mjs`, `tests/clay-notes-hosted.test.mjs`, `tests/notcards-extension.test.mjs`.

## Plan — 1

Implement the hosted development app in src/notcards, sharing the existing notebook core and real cover data. Validate Google identity, scope stores by account, bind short-lived extension grants to a stable Chrome ID and keep credentials server-side. Generate a distinct development extension artifact. Rebuild the album chrome, folders, high contrast full-art cards, filters and controls for the supplied light and dark references while retaining the existing notebook editor. Configure an isolated persistent app container and dedicated tunnel. Verify distinct accounts and grants with local fixtures and inspect both themes with the three captured notebooks. Public readiness requires DNS and the operator's own Google configuration. All automatic model traffic stays disabled pending gateway onboarding.

Pins: historical loopback APIs, tests and extension stay compatible. Keep old note IDs and cover attachment data readable. The new origin and extension build are isolated from the previous developer artifact. Use node scripts/clay-notes-test.mjs --all for regression coverage and run targeted hosted and extension tests plus the browser comparison.

Exact owned files: `deploy/notcards/Dockerfile`, `deploy/notcards/Dockerfile.dockerignore`, `deploy/notcards/cloudflared.yml`, `deploy/notcards/compose.yml`, `deploy/notcards/dev.ps1`, `docs/CONTEXT.md`, `docs/README.md`, `docs/TODO.md`, `docs/design/clay-notes-gateway-request.md`, `docs/design/clay-notes-service-roadmap.md`, `docs/guides/clay-notes-release.md`, `docs/guides/notcards-dev.md`, `extensions/notcards/_locales/ar/messages.json`, `extensions/notcards/_locales/de/messages.json`, `extensions/notcards/_locales/en/messages.json`, `extensions/notcards/_locales/es/messages.json`, `extensions/notcards/_locales/fr/messages.json`, `extensions/notcards/_locales/hi/messages.json`, `extensions/notcards/_locales/it/messages.json`, `extensions/notcards/_locales/ja/messages.json`, `extensions/notcards/_locales/pt/messages.json`, `extensions/notcards/_locales/zh_CN/messages.json`, `extensions/notcards/background.js`, `extensions/notcards/content.css`, `extensions/notcards/content.js`, `extensions/notcards/icons/128.png`, `extensions/notcards/icons/16.png`, `extensions/notcards/icons/32.png`, `extensions/notcards/icons/48.png`, `extensions/notcards/icons/icon.svg`, `extensions/notcards/manifest.json`, `extensions/notcards/options.css`, `extensions/notcards/options.html`, `extensions/notcards/options.js`, `scripts/notcards-extension.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/collection.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/style.css`, `src/notcards/.gitignore`, `src/notcards/cli.mjs`, `src/notcards/identity.mjs`, `src/notcards/package-lock.json`, `src/notcards/package.json`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-album.test.mjs`, `tests/clay-notes-hosted.test.mjs`, `tests/notcards-extension.test.mjs`.

## Plan — 1

Implement the hosted development app in src/notcards, sharing the existing notebook core and real cover data. Validate Google identity, scope stores by account, bind short-lived extension grants to a stable Chrome ID and keep credentials server-side. Generate a distinct development extension artifact. Rebuild the album chrome, folders, high contrast full-art cards, filters and controls for the supplied light and dark references while retaining the existing notebook editor. Configure an isolated persistent app container and dedicated tunnel. Verify distinct accounts and grants with local fixtures and inspect both themes with the three captured notebooks. Public readiness requires DNS and the operator's own Google configuration. All automatic model traffic stays disabled pending gateway onboarding.

Pins: historical loopback APIs, tests and extension stay compatible. Keep old note IDs and cover attachment data readable. The new origin and extension build are isolated from the previous developer artifact. Use node scripts/clay-notes-test.mjs --all for regression coverage and run targeted hosted and extension tests plus the browser comparison.

Exact owned files: `deploy/notcards/Dockerfile`, `deploy/notcards/Dockerfile.dockerignore`, `deploy/notcards/cloudflared.yml`, `deploy/notcards/compose.yml`, `deploy/notcards/dev.ps1`, `docs/CONTEXT.md`, `docs/README.md`, `docs/TODO.md`, `docs/design/clay-notes-gateway-request.md`, `docs/design/clay-notes-service-roadmap.md`, `docs/guides/clay-notes-release.md`, `docs/guides/notcards-dev.md`, `experiments/notcards/dev/album-dark.jpg`, `experiments/notcards/dev/album-light.jpg`, `experiments/notcards/dev/album-mobile.jpg`, `experiments/notcards/dev/browser.json`, `extensions/notcards/_locales/ar/messages.json`, `extensions/notcards/_locales/de/messages.json`, `extensions/notcards/_locales/en/messages.json`, `extensions/notcards/_locales/es/messages.json`, `extensions/notcards/_locales/fr/messages.json`, `extensions/notcards/_locales/hi/messages.json`, `extensions/notcards/_locales/it/messages.json`, `extensions/notcards/_locales/ja/messages.json`, `extensions/notcards/_locales/pt/messages.json`, `extensions/notcards/_locales/zh_CN/messages.json`, `extensions/notcards/auth.mjs`, `extensions/notcards/background.js`, `extensions/notcards/content.css`, `extensions/notcards/content.js`, `extensions/notcards/icons/128.png`, `extensions/notcards/icons/16.png`, `extensions/notcards/icons/32.png`, `extensions/notcards/icons/48.png`, `extensions/notcards/icons/icon.svg`, `extensions/notcards/manifest.json`, `extensions/notcards/options.css`, `extensions/notcards/options.html`, `extensions/notcards/options.js`, `scripts/notcards-extension.mjs`, `src/clay-notes/server.mjs`, `src/clay-notes/web/album.css`, `src/clay-notes/web/album.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/collection.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/session.mjs`, `src/clay-notes/web/style.css`, `src/notcards/.gitignore`, `src/notcards/cli.mjs`, `src/notcards/identity.mjs`, `src/notcards/package-lock.json`, `src/notcards/package.json`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-album.test.mjs`, `tests/clay-notes-collection.test.mjs`, `tests/clay-notes-hosted.test.mjs`, `tests/clay-notes-i18n.test.mjs`, `tests/clay-notes-preferences.test.mjs`, `tests/clay-notes-release.test.mjs`, `tests/notcards-extension.test.mjs`.
