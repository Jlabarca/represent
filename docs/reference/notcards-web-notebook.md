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

The signed-in development board was exercised with the three requested YouTube watch URLs in a single multi-link paste. It created three cards with the real video titles. Each private detail displayed the matching player. The public caption fetch failed for all three even though YouTube’s own Show transcript panel displayed text. Operator-assisted import preserved 165, 191 and 90 timestamped segments respectively. Reopening each notebook confirmed the source video and first segment. Saved transcript content now takes precedence over stale import errors. A delayed response from a previously open card can no longer replace the current detail during navigation, and pending transcript writes are bound to the originating card.

The authenticated `/api/config` response reports chat availability independently of summary availability. The hosted development site launches the native Botanic composer and receives signed conversation receipts. A separate trusted connector implementation handles GET and POST on `/api/notes/{id}/chat` and POST on `/api/notes/{id}/chat/reset` when configured. The server resolves the signed-in owner's issuer and subject and loads source context from the matching account. The reset checks the expected conversation and requires positive deletion confirmation. Opening a notebook, a remote timeout or a failed confirmation leaves the binding intact.

## Usage Guide

Paste a YouTube link into the note field and leave the optional title empty to use the source title. Save the card, then click its art to open the notebook. The player and personal notes are available during import. When YouTube supplies public caption text it appears in the notebook. If the host supplies no usable transcript, retry the import later or provide one manually.

## Caveats

A YouTube HTTP 429 makes the retry button show the next allowed time in the
user's language. Earlier transient failures allow an immediate first manual
retry. When YouTube still supplies no captions, Notcards can reuse captions
from another copy of the same video in the signed-in library. Pasted copies
must agree before they can be reused. Source notes and conversations from
the other card are excluded.

Run `scripts/notcards-browser-check.mjs` for collection navigation, authentication
startup or importer changes. It accepts `NOTCARDS_PLAYWRIGHT_PATH` for an existing
Playwright installation and `NOTCARDS_CHROMIUM` for its browser executable. The
check uses a temporary library and a deterministic caption source, and makes
no model calls.

The native Botanic handoff creates its first conversation when the owner sends
the first question in Botanic. A signed callback records its URL on the card.
The notebook's Questions tab then reopens that conversation. If Botanic
confirms deletion, the card keeps its source, notes and summaries, and the
owner can explicitly start a new conversation. Both directions were tested
over loopback. Shared Botanic now runs the registered notes assistant, native
hooks and signed callbacks. The pilot owner still needs to verify the first
send and reopen from the hosted site.

Videos may be removed, restricted, captionless, or configured to disallow embedding. A listed caption track can also return an empty body. A successful title lookup does not establish that a transcript or an AI takeaway exists. AI takeaways require the approved dedicated gateway. Live card chat also requires owner-verified integration on the Botanic service.

## Account language and live notebook verification

The hosted UI defaults to the browser language. Signed-in choices persist on the account. Generated summary revisions record their output language. On-demand translation keeps the original and its citations and caches the translation on that revision. A translation of an older unlabeled original may record the model-detected source language. Turning a transcript or evidence timestamp into a play action now updates the embedded player and preserves the notebook URL.

The live trial used the Google account's three signed-in notebooks. Cards axmMwD_2sqM, HkhBlOB9suT and fQV0qiZFu9t retained 165, 191 and 90 caption segments. The first and third used the summary lane; the second used the deep lane after an invalid JSON response. Those transcripts had been obtained using YouTube’s transcript panel when server-side requests were rate-limited.

## Related Docs

[Collection composer](notcards-composer.md) · [Botanic design](../design/notcards-botanic-integration.md) · [Gateway request](../design/clay-notes-gateway-request.md)
