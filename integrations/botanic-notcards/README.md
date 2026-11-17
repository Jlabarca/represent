# Notcards native Botanic handoff (proposal artifact)

This directory is a Notcards-owned, reviewable integration artifact. It is **not
deployed** and does not change the shared Botanic checkout. The handoff launches
the normal Botanic conversation UI at top level; it is not chat embedded in the
Notcards card detail.

## Transport contract

1. Notcards issues a five-minute Ed25519-signed ticket bound to its exact HTTPS
   issuer, the exact Botanic HTTPS audience, verified Google OIDC subject, card
   ID, random one-time `jti`, and SHA-256 of the canonical payload. The ticket
   contains no question or source text. Notcards returns `{ticket, question,
   context}` to its authenticated page. That page submits those fields in a
   top-level HTML form POST to Botanic; the question/context are never URL data.
2. Botanic's unauthenticated launch POST checks the exact `Origin`, ticket
   signature/issuer/audience/expiry and payload digest, then stores a durable
   pending row and a short-lived `__Host-notcards_launch` HttpOnly, Secure,
   SameSite=Lax cookie. It does not assume the Botanic login cookie accompanies
   a cross-site POST. It responds with a clean `303 /`.
3. The Botanic page performs its normal Google login if needed. On a same-origin
   authenticated GET, the extension compares `req.user.provider === 'google'`
   and `req.user.googleId === pending.subject`; mismatch gets no card/question
   data and does not consume the owner's launch. Only after this equality can
   the owner reclaim that pending launch. OAuth's return is a top-level GET, so
   the newly set Lax handoff cookie is sent. The pre-existing auth cookie is not
   required on the launch POST.
4. `NotcardsLaunch` fills an empty native composer once and never submits. The
   user reviews the first question and presses native Botanic Send exactly once.
   The pending endpoint returns only the first question, never the source
   context. The existing Botanic conversation/message pipeline remains the sole
   chat path. Opening a card, accepting a launch or previewing pending state do
   not create a conversation.
5. The Botanic generation hook reads the pending context and adds it as bounded
   untrusted source material, but does not bind yet. After the ordinary
   controller has persisted the conversation and first message, its completion
   hook must verify `db.getConvo(userId, conversationId)` and persisted
   user/assistant messages, then call `confirmGeneratedConversation`. This
   records the exact Google subject, Botanic internal user, card and
   server-generated `conversationId`. Reopening reads that binding. The Mongo
   indexes enforce one active `(googleId, cardId)` and unique
   `(googleId, conversationId)`; an explicit fresh launch needs confirmation
   that the previous owned conversation was deleted and an archived binding.
6. `confirmGeneratedConversation` returns a short-lived Botanic-signed JWS
   with `{iss:botanicOrigin,aud:notcardsOrigin,sub:googleId,
   event:'conversation_bound',card_id,jti,conversation_id,iat,exp}`. A confirmed
   delete uses the same claims with `event:'conversation_deleted'` and the
   original launch `jti`. Notcards verifies this with Botanic's public key,
   matches the launch `jti`/subject/card, then writes or archives its durable
   owner/card binding. Callback retries must accept the same `jti` and same
   conversation idempotently. Keep callback delivery in a durable outbox; a
   Notcards outage must not fail the already-persisted Botanic turn. Later
   saved turns can regenerate the assertion without resending the first prompt.

## Required Notcards-side issuer

Mount an authenticated cookie-only `POST /api/notes/:id/botanic-launch`. Check
same-origin `Origin`, verify card ownership from the Notcards session, derive
issuer/subject only from the verified Google user record, load the card context
server-side, enforce 4,000-character question and 128 KiB canonical context
limits, and issue the ticket. Keep only `jti`, owner hash, card ID, payload hash,
expiry and status in Notcards SQLite; never persist raw first question/context.
The HTML form target must be a configured exact Botanic origin, with
`target="_blank"` and `rel="noopener"`; `noopener` means the form POST itself
must carry the envelope. Do not place any private values in query/hash/referrer.

## Botanic deployment hooks

- Add `server/launch.cjs` to the native overlay's declared/hash-locked files.
- Add `server/store.cjs` and initialize the `botanic_notcards_launches` Mongo
  collection's unique `jti`, active Google-subject/card and bound
  Google-subject/conversation indexes plus TTL cleanup for pending rows only.
  Keep bound context for future turns but erase the first question on bind.
  Expired pending rows can be replaced and their raw payload is removed; bound
  rows remain durable until deletion is confirmed.
- Mount the unauthenticated `POST /api/botanic/notcards/launch` before
  `requireJwtAuth`; it accepts only the configured Notcards origin and signed
  bounded envelope. Mount authenticated `GET /api/botanic/notcards/pending`
  after `requireJwtAuth`; it reclaims using the pending cookie and exact Google
  `googleId`. Authenticated `GET /api/botanic/notcards/cards/:cardId` reads only
  an existing owner/card binding, verifies it with `db.getConvo(userId,id)` and
  returns the native `/c/:conversationId` URL. A mismatch is empty; database
  outage is unavailable; confirmed owner-scoped not-found archives the binding
  and returns a signed `conversation_deleted` assertion. It never creates a chat.
- Mount the React component only in the registered Notcards agent workspace;
  preserve the standard composer/send path.
- Extend the normal `ResumableAgentController` initialization hook in
  `api/server/controllers/agents/request.js` through the `initializeClient`
  callback in `api/server/services/Endpoints/agents/initialize.js` (the same
  hook where the
  Causa overlay calls `router.cjs.applyPreferences`) to read pending source for
  an actual Notcards-agent generation. The `conversationId` is already
  server-generated there. Append context as untrusted quoted source, not
  policy/instructions. Add a post-persistence completion hook in the ordinary
  `request.js` terminal-save path after `saveMessage` and message-reference
  recovery to invoke `confirmGeneratedConversation` only after
  owner-scoped root-conversation and message checks. The proposed helper does
  not claim to be wired into the pinned upstream yet.
- In the pinned `api/server/routes/convos.js` delete handlers, call
  `archiveDeletedConversations` only after `db.deleteConvos` returns its
  owner-scoped deleted ID list (including the final cascade list before the
  successful response). It archives mappings for the same native Google
  subject and Botanic user and returns signed `conversation_deleted` assertions
  for the Notcards callback. No Notcards card data is deleted. The helper is not
  wired to the shared checkout; bulk deletion hooks need the same post-delete
  evidence rule.

## Key/configuration and activation gates

Generate two independent Ed25519 key pairs: Notcards signs launch tickets and
Botanic signs binding assertions. Keep each private key only on its respective
service and configure the peer's public key for verification, plus exact origins,
issuer/audience and TTL. Do not reuse gateway/provider API keys. Register the
Notcards Botanic agent in the existing native registry with its own approved
Google subject rule, agent and project IDs; current Causa registry and policy
do not grant Notcards access. Apply the patch to the exact pinned LibreChat
checkout, add migrations/indexes, run fixture tests and native login/send/delete
regressions in staging, and obtain explicit operator approval before staging or
production registration/deployment. No actual integration, endpoint, Google
OAuth, agent, project, or deployment is claimed by this artifact.
