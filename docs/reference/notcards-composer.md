# Notcards collection composer

## Overview

The hosted collection opens a compact note field above the trading cards. A signed-in owner can create a thought, collect several sources in one notebook or split a paste into individual cards.

## Architecture

The browser uses the shared link parser to offer splitting. The server parses the original draft again. It saves note text under the signed-in account and journals the generated card IDs by draft ID. Retrying a partial save reuses those IDs. A note can reference the same video as an existing notebook.

## Key Files

- `src/clay-notes/web/composer.mjs` manages the inline field, keyboard actions and sign-in return.
- `src/clay-notes/web/composer-links.mjs` extracts ordered links and recognizes supported YouTube URLs.
- `src/notcards/store.mjs:218` saves combined or split drafts under the account write lock.
- `src/clay-notes/web/style.css` defines desktop card sizing and mobile scroll positions.

## API Surface

POST `/api/composer` uses the web session, a same-origin request and a JSON object with `draftId`, `body`, `title`, `folderId` and `split`. A successful save returns `{ids: [...]}`. Reusing a draft ID with different content returns HTTP 409.

## Usage Guide

Click the note field or press N. Paste or type the note, optionally add a title, then save. Two or more distinct links expose the option to create a card for each. The first card keeps the original prose. On a desktop, change card size in Settings. On a phone scroll past the header to center each card.

## Caveats

Only a recognized YouTube video in first position qualifies for automatic summarization when the service has captions and a configured gateway. Later links stay sources. Pasting a URL alone does not supply its transcript. The extension captures available captions on the selected YouTube page. The size preference is stored per browser.

## Related Docs

[Development service](../guides/notcards-dev.md) · [Extension publishing](../guides/notcards-chrome-store.md) · [Implementation tracker](../orkest/done/notcards-composer.imp.md)
