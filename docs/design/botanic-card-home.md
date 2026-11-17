# Botanic's signed-in card home

## First release

After Google sign-in, open the user's card collection at the Botanic root. Keep direct conversation links, OAuth returns and app-specific launches working. A new note, a video notebook and an existing personal chat each appear once. Opening a card shows the native conversation on the left and the saved material on the right. Each panel can collapse without remounting the player or losing a draft. On mobile, show the source first for a notebook and the conversation first for an existing chat. Keep the TCG treatment on the collection. Use small editable sticky notes inside the source panel.

## Ready in Represent

| Component | Source | Adoption |
|---|---|---|
| Album presentation, cover choice, sort, manual order, initial cache and motion | `src/clay-notes/web/collection.mjs`, `style.css`, `assets/` | Reuse the collection helpers, Satoshi assets and card styles. Scope the styles to the board. Keep account caches separate. |
| Composer and language | `src/clay-notes/web/composer-links.mjs`, `composer.mjs`, `i18n.mjs` | Reuse URL parsing, source inference and translations. Adapt DOM events, account language and theme to the Botanic shell. |
| Notebook data and jobs | `src/notcards/store.mjs`, `video-import.mjs`, `video-summary.mjs` | Keep the existing service and card IDs. It owns images, private notes, folders, thumbnails, timestamped sources and translated summary revisions. Caption extraction can still be rate-limited. |
| Session list | `src/notcards/server.mjs`, `botanic-receipts.mjs`, `integrations/botanic-notcards/home.mjs` | The new optional card-list field and portable join are implemented and tested locally. |
| Chat lifecycle | `integrations/botanic-notcards/server/`, `src/notcards/botanic-launch.mjs` | Reuse verified owner binding, first-send context and deletion receipts. The current web UI launches a separate composer. Rendering it in place remains Botanic work. |

## Contract for the home

1. With the authenticated Notcards owner, request `GET /api/notes?include=conversation`. This returns the existing card summaries with a nullable `conversationId`. Plain `GET /api/notes` keeps its existing shape. The expanded read uses one active-receipt lookup for the owner. If the binding service is unconfigured, the expanded read returns 503. Treat that as unavailable metadata and offer a retry.
2. Load the signed-in Botanic user's visible conversation pages through its native conversation list. Keep its account, project and archive rules. Join that owner's complete card list with the loaded chat pages using `buildSessionCards(cards, conversations)`. The adapter returns `{key, card, conversationId, conversation}`. A bound card can have a conversation ID before its native chat page has loaded. Loading later pages adds chat metadata without duplicating the card. Apply the home search and ordering after the join, or supply equivalent filtering from both services.
3. A plain card keeps its stable card ID before its first message. A native-only chat opens its existing conversation ID. On the first request to attach notebook material to a native-only chat, Botanic must verify current ownership and create one companion card atomically and idempotently. The signed first-send path handles the other direction. Existing chats can appear on the home without a bulk migration.
4. For an existing conversation, reopen its native URL with normal Botanic authorization. A confirmed deletion clears its active link. A surviving notebook retains its sources and summaries. An assistant conversation does not need to exist to read or edit a notebook. No model call is needed to list sessions.

## Work owned by Botanic

- Add a signed-in board route first, then make it the default root after verification. Leave the public login and existing `/c/{id}` routes intact. The `landing/` directory in the Botanic repo is a static SDK demo. Implement this in the served app or its same-origin shell. Coordinate with the deployed native overlay when packaging.
- Supply a server-side card API adapter authenticated for the current verified subject. The two existing sites have host-specific sessions. Browser access to a Botanic chat does not authorize a Notcards API read by itself. Reuse the existing identity proof design, with the intended audience, short expiry and owner scope, or provide an explicit linked-session exchange. Preserve direct Notcards access for the extension and existing links.
- Bind the collection renderer to Botanic's router, pagination, user preferences and native composer. Implement the two-panel workspace, scroll and draft continuity, note editing, in-player citation seeking and chat-only card metadata. Keep native-only sessions on their original assistant and model. A new notebook chat selects the registered Notcards assistant and a model the active gateway key can serve.
- If the embed uses a frame, exercise sign-in, frame policy and return navigation on the real domains. Prefer the Botanic origin for the default home and chat. Future `not.cards` is cross-site with `botanic.maremoto.dev` and needs a separate sign-in and cookie test.

## Live acceptance for default-home rollout

Use an owner with a plain note, a video and an older native chat. Open the plain note, edit and reload it, and verify zero inference requests. Open the video, ask a question in place, seek the source from a citation, reload and verify one conversation and one card. Open the old chat from the board and from its original link. Add its first notebook attachment twice under a retried request and verify one companion card. Check two accounts, chat deletion, account switching, mobile and keyboard controls, reduced motion, and an unavailable model. The existing three manually imported video notebooks are suitable pilot cards.
