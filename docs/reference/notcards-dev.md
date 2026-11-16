# Notcards development service

## Overview

Each trading card opens a research notebook. The development service saves YouTube captures, web references, pasted text and uploaded cover images to the signed-in account. The public album uses the three example videos and their original thumbnails.

## Architecture

Google authenticates a website user through a dedicated OAuth web client. The server issues an opaque session cookie. The Chrome extension uses a one-time PKCE exchange for a scoped Notcards grant. One Node process manages SQLite identities and private collections on a persistent Docker volume. A dedicated tunnel routes the development hostname to this app.

## Key Files

- The hosted HTTP entry point is `src/notcards/server.mjs:25`. Google identity verification starts at `src/notcards/identity.mjs:9`.
- The account store orders writes and checks quotas in `src/notcards/store.mjs:185`. Chrome capture and retry handling live in `extensions/notcards/background.js` and `extensions/notcards/auth.mjs`.
- The album and notebook views share `src/clay-notes/web/`. Desktop light, desktop dark and mobile browser captures are in `experiments/notcards/dev/`.

## API Surface

`/api/session` reports sign-in state. The website uses account-scoped notes, folders, ordering and media endpoints. The extension uses `/auth/extension/authorize` to start its grant exchange and `/api/capture` to submit a selected source. Signed-out private notes return HTTP 401.

## Usage Guide

Open the album, sign in with Google, and choose **New research** to save text or a source. The Chrome button downloads the development extension. After loading it into Chrome, select **Notcards** on a YouTube watch page. For setup, callback registration, storage limits and installation steps, see the [development guide](../guides/notcards-dev.md).

## Caveats

The development origin is `not.maremoto.dev`. The public development hostname resolves and the configured Google client opens the account chooser. End-to-end acceptance also covers the return to a private collection and an authenticated extension capture. Accounts can save source material while Ghost onboarding is pending. The operator controls lane Apply and live paid inference. Production at `not.cards` and Chrome Web Store distribution are future releases.

## Related Docs

[Development and deployment](../guides/notcards-dev.md) · [Research notebook roadmap](../design/clay-notes-service-roadmap.md) · [Gateway request](../design/clay-notes-gateway-request.md)
