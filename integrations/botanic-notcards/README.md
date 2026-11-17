# Native Botanic chats for Notcards

One shared notes assistant serves separate conversations. A card owns the link to its conversation. Opening a notebook costs no model tokens. The first question opens Botanic’s native composer. The owner reviews it and presses Send.

## Build and configuration

The reusable home adapter and remaining Botanic work are described in [Botanic card home](../../docs/design/botanic-card-home.md). Its expanded card list is local preparation for adoption.

For the current preset release, generate `librechat.notcards.yaml` from the active combined config with `prepare-config.py`. The override mounts that generated file and selects `notcards-botanic:rep12-card-spec`. The script adds the visible `notcards` model spec that selects the existing shared assistant. It verifies the existing local-model preset and preserves model-spec enforcement.

The shared build includes the existing Causa overlay with manifest SHA-256 `fea5fd989487c9ae175adcecc52da3063affaa806afc51c87b42d4838af6943e`. Layer `compose.notcards.yml` last over the base, prod1, Causa and native files. The specific Notcards router must mount ahead of the shared Botanic router so it can validate a signed card form. The protected routes still use native JWT authentication. Prod1 runs `notcards-botanic:rep12-card-route`. To roll back only the routing change, use the release's previous override with the `rep12-localized` image.

The seeded shared assistant is `agent_notcards`, on the existing Botanic local provider with `botanic-free`. It has no tools. Viewer grants refer only to the assistant. Card contents and conversation receipts still require the exact Google subject. For previously provisioned Google accounts missing that subject, a fresh verified Google OAuth callback claims it atomically. A mismatched existing subject is refused. The deployed Notcards origin and Botanic origin are `https://not.maremoto.dev` and `https://botanic.maremoto.dev`.

The standalone staging overlay targets a clean LibreChat checkout at revision `e8f3be08623663d4ad7f7241e693c94469b63bb0` and the v0.8.8 runtime pinned in this directory’s Dockerfile. Run `apply-staging.py` with the checkout’s absolute path, then use that checkout as the Docker build context with this Dockerfile. The script verifies the revision and upstream source anchors before writing. A deployment that already carries another native overlay needs a combined build and validation.

| Setting | Host | Purpose |
| --- | --- | --- |
| `NOTCARDS_PUBLIC_ORIGIN` | Notcards | Exact HTTPS origin of the signed-in notebook |
| `NOTCARDS_BOTANIC_ORIGIN` | Notcards | Exact HTTPS origin of the chat |
| `NOTCARDS_BOTANIC_LAUNCH_PRIVATE_KEY` | Notcards | Sign launches |
| `NOTCARDS_BOTANIC_RECEIPT_PUBLIC_KEY` | Notcards | Verify the chat’s receipts |
| `BOTANIC_NOTCARDS_ORIGIN` | Botanic | Exact HTTPS origin of Notcards |
| `BOTANIC_NOTCARDS_CHAT_ORIGIN` | Botanic | Exact HTTPS origin of Botanic |
| `BOTANIC_NOTCARDS_AGENT_ID` | Botanic | Existing shared notes agent accessible to the intended users |
| `BOTANIC_NOTCARDS_LAUNCH_PUBLIC_KEY` | Botanic | Verify launches |
| `BOTANIC_NOTCARDS_RECEIPT_PRIVATE_KEY` | Botanic | Sign conversation receipts |

Use separate Ed25519 key pairs for the two directions. The native hooks stay dormant until an agent ID is configured. Provision the agent with the intended notes instructions, model, user access, and tool policy. Register Google login on the chat origin. A Notcards web session and a Botanic Google session may have different cookies; their verified Google subjects must agree.

## Launch and persistence

1. A signed-in notebook posts its question to `/api/notes/{id}/botanic-launch`. Notcards checks the cookie session, request origin and owned card, loads its source context server-side, and signs a five-minute ticket containing the Google subject, card ID, one-time launch ID and payload hash. The question and context travel in a top-level form POST. They stay out of URLs.
2. Botanic verifies the exact Notcards origin and signature before storing the pending handoff. A Secure, HttpOnly, SameSite=Lax cookie allows the native page to resume after Google login. The redirect selects the configured agent. The pending endpoint checks the signed-in Google subject, and the new composer only fills a question for its current agent.
3. A first native send must match the pending question and have no parent or existing conversation. An atomic Mongo claim prevents the same handoff from attaching context to two conversations. Only the matching agent receives the quoted source material.
4. After the normal terminal save, the hook checks the owned conversation and both persisted user and assistant messages. A signed `conversation_bound` receipt associates that conversation with its originating card. The card's Questions tab then opens its canonical Botanic URL.
5. Individual and bulk deletion hooks archive confirmed owner-scoped conversation IDs and send `conversation_deleted`. The card and its personal notes, summaries and source survive. An older duplicate binding receipt cannot revive the deleted conversation. A fresh question can start a new one.
6. Each Mongo binding or deletion write marks its receipt due. The delivery worker signs a fresh assertion on retry and acknowledges only the corresponding row state. Notcards accepts callbacks at `POST /api/botanic/receipt`, matching issuer, audience, signature, original launch, card, conversation and Google subject.

## Verification and rollout

Run the issuer, native receiver, card chat and loopback tests under `tests/`. For the packaged runtime, `smoke-staging.ps1` starts an isolated, disposable Mongo and verifies matching subjects, first-turn context, persisted native messages, and confirmed deletion. It publishes no ports and invokes no model. The browser check in `scripts/notcards-browser-check.mjs` covers the separate signed-in notebook navigation and caption retry workflow.

Before exposing native chat, run a real Google login and a first question on a staging origin with its registered assistant and approved inference lane. Reopen the same conversation from both products, delete the test conversation in Botanic, reopen the original card, and explicitly start a replacement. Deploying the image or registering the agent on the shared service is a separate operator action.
