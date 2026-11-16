---
id: REP-11

---
# REP-11: NOTCARDS-COMPOSER

> Updated: 2026-11-16
> Prior-art sweep: REP-10 collection, hosted note store, web assets and deployment guide.

## AI Continuation Prompt

Deliver inline creation, first-link inference, optional split, desktop card size and a mobile vertical feed on the hosted dev service.

## Open Questions

One combined card is the default. Only the first pasted link may trigger automatic video summarization. Ghost activation remains operator-managed.

## Architecture

Reuse the hosted notebook store, account session, shared collection shell and localized settings. Apply vertical scroll snapping on the mobile collection only.

## Current State

REP-10 uses an add dialog with an explicit type, fixed desktop columns and a mobile grid.

## Known Bugs

No prior bug recorded for this feature.

## What Needs Testing

Mixed link ordering, retry/split saves, text persistence, settings storage, phone top and center snap behavior, desktop grids and private account boundaries.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REP-11.1 | planned | current | current | Responsive collection and inline composer |

## Checklist

### Phase 1 — Collection composer and responsive cards

> verify: integration
> requires:
>   skip_budget: 0

- [ ] REP-11.1.1 — Deliver inline note and link capture, desktop sizes and a one-card-per-screen vertical mobile collection. Verify content and layout in a browser.

## Key Files Reference

Shared web UI under src/clay-notes/web and hosted creation in src/notcards. Exercise the app through the served web shell.

## Architecture Notes

Preserve attachment covers, manual reordering, account isolation and the gateway spend boundary.

## Plan — 1

Use an inline Keep-style note field and optional title above the board. Parse unique, ordered HTTP(S) links and identify actual YouTube video URLs using normalized hosts. Keep one note by default, opt into a card per link, persist surrounding text, retain retryable drafts, keep later URLs out of automatic generation. Use an account-scoped hosted endpoint with retry-safe writes. Register new web assets on both servers and in Docker. Add a persistent desktop range input and CSS target size. Mobile collection uses the document as a vertical snap scroller, a start snap point for the header and a centered full-height frame for each card. Preserve card art, views, local fallback and native accessibility. Run feature tests, actual desktop/mobile browser acceptance, the existing cross-platform full test inventory and dev deploy.

Exact owned files: `docs/CONTEXT.md`, `docs/reference/notcards-composer.md`, `src/clay-notes/server.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/composer-links.mjs`, `src/clay-notes/web/composer.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/style.css`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-hosted.test.mjs`, `tests/notcards-composer.test.mjs`.
