# Notcards web notebook

## Overview

Sign in with Google on the development website to create notes, keep links, play a saved video and edit the notebook. The card owns its notes, source text, attachments and takeaway revisions independently of an optional Botanic conversation.

## Architecture

The notebook resolves a video from its canonical source URL. Its internal card ID can differ from the YouTube video ID. The site embeds the video in a responsive privacy-enhanced player. A background importer looks up the public video title and available captions. Manual titles and any transcript already supplied by the owner take precedence. The collection and the open notebook read the persisted import status.

## Key Files

The collection and detail views live in `src/clay-notes/web/app.mjs`. The hosted request handler in `src/notcards/server.mjs` checks the signed-in account before loading the notebook. `src/notcards/video-import.mjs` reads public metadata and captions. The account store saves import results and coordinates background jobs.

## API Surface

- GET `/api/notes/{id}` opens the account's note and schedules eligible older videos for import.
- POST `/api/notes/{id}/video-import` retries a failed or unavailable import.
- PATCH `/api/notes/{id}` saves edited notes and notebook preferences.
- POST `/api/capture` accepts a scoped extension grant. When Chrome also attaches an ambient site cookie, the server selects the explicit grant. A failed bearer token cannot fall back to the cookie. New extension builds omit ambient credentials on token and capture requests.

### Optional Botanic chat

The authenticated `/api/config` response reports chat availability independently of summary availability. An enabled trusted connector handles GET and POST on `/api/notes/{id}/chat` and POST on `/api/notes/{id}/chat/reset`. The server resolves the signed-in owner's issuer and subject, loads source context from the matching account and binds the remote conversation ID to the card on the first question. A repeated request ID can be recovered without opening another conversation. The reset checks the expected conversation and demands positive deletion confirmation from the connector. Opening a notebook, a remote timeout or a failed confirmation leaves the binding intact. The public development deployment still requires a registered Botanic site and an authenticated connector.

## Usage Guide

Paste a YouTube link into the note field and leave the optional title empty to use the source title. Save the card, then click its art to open the notebook. The player and personal notes are available during import. When YouTube supplies public caption text it appears in the notebook. If the host supplies no usable transcript, retry the import later or provide one manually.

## Caveats

Videos may be removed, restricted, captionless, or configured to disallow embedding. A listed caption track can also return an empty body. A successful title lookup does not establish that a transcript or an AI takeaway exists. AI takeaways require the approved dedicated gateway. Live card chat also requires owner-verified integration on the Botanic service.

## Related Docs

[Collection composer](notcards-composer.md) · [Botanic design](../design/notcards-botanic-integration.md) · [Gateway request](../handoffs/GATEWAY-REQUEST-2026-11-15.md)
