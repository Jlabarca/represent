---
id: REP-12

---
# REP-12: NOTCARDS-WEB-NOTEBOOK

> Updated: 2026-11-16
> Prior-art sweep: REP-11 composer, hosted server, release ZIP, Botanic site registry and card conversation integration design.

## AI Continuation Prompt

Open a complete private notebook from the board, watch the source video inline, edit notes and use sources directly on the web. Make optional chat persistent in Botanic and automatic summaries attributable to the Notcards gateway key.

## Open Questions

Only the first submitted question should create a Botanic conversation. A deleted remote conversation leaves the card intact. Ghost Apply and paid tests remain operator actions.

## Architecture

Use verified Google identity, private notebooks and canonical source URLs. Render video embeds from validated YouTube IDs and keep account notes editable independently of AI. Authenticate unpacked capture with scoped grants and PKCE.

## Current State

REP-11 shipped the board and composer. The hosted server returns 503 for all chat and summary requests.

## Known Bugs

The YouTube button reports Request origin is not allowed after login. Verify the real browser wire behavior.

## What Needs Testing

Unpacked Chrome authentication and capture, source rendering, card activation, editing and repeat visits without an extension, owner isolation, conversation deletion and guarded AI routing.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REP-12.1 | Shipped | current | current | Web notebook and unpacked capture |

| REP-12.2 | planned | current | current | Owned AI conversations and dedicated gateway |

## Checklist

### Phase 1 â€” Collection composer and responsive cards

> verify: integration
> requires:
>   skip_budget: 0

- [x] REP-12.1.1 â€” Deliver web-first detail and correct the unpacked client contract. Verify with browser, server and account fixtures. — evidence: node tmp/webbook-check.mjs: 1/1 passed, skipped=0, output sha256=536f5e61f7c3e43237407386819f918b157ccfce4913781d03dee63277d386cf

### Phase 2 — Optional Botanic conversations and direct summaries

> verify: integration
> requires:
>   skip_budget: 0

- [x] REP-12.2.1 — Establish verified card-owner bindings, lazy creation, explicit recovery after remote deletion and one conversation visible in Botanic. — evidence: node tmp/webbook-chat-assert.mjs: 1/1 passed, skipped=0, output sha256=fe44f48ec5de0d05943cc86bdb71cc1fc4452025d5a3f05ce93b18c219130612
- [ ] REP-12.2.2 — After operator Apply evidence, connect and verify direct summary lanes with the approved spend fence and independently authorized live acceptance.

## Key Files Reference

### Continuation plan for REP-12.2.2

November 17 acceptance work: preserve the existing Botanic grants through the guarded Ghost transaction, account for logged-out lab1 subscription models, verify the dedicated lanes and record combined spend. Exercise all three saved cards and launch a real native card conversation. Update timestamp and evidence controls in `src/clay-notes/web/app.mjs` with a same-tab browser regression in `scripts/notcards-browser-check.mjs`. Integrate the isolated visual review in `src/clay-notes/web/style.css` and version the web entry point. Verify the hosted build before recording acceptance.

1. Run the checked Ghost console transaction on lab1. Record its Apply SHA and actual lane tests. Verify the dedicated host credential by name only.
2. Exercise the normal private notebook summary API with loopback responses, actual hop accounting, per-owner reservations, duplicate protection and recoverable import jobs. Enable the hosted gateway only after the approved transaction succeeds.
3. Verify the signed-in board, each source ID, transcript count, source text, loading/error copy and summary outcome for the three supplied videos. Test YouTube’s public transcript panel as an unattended importer fallback and distinguish it from operator-assisted capture.
4. Stage a Botanic-native owner-verified conversation integration. Verify first question, follow-up, registration and confirmed deletion before enabling chat. Production rollout remains a separate operator action.

Shared web UI under src/clay-notes/web and hosted creation in src/notcards. Exercise the app through the served web shell.

## Architecture Notes

Preserve attachment covers, manual reordering, account isolation and the gateway spend boundary.

## Plan — 1

Use the existing board and private notebook route. Make the full artwork open its notebook with keyboard and pointer, preserve pin and drag, show a responsive embedded video built from canonical source identity, editable personal notes and working source links. Reflect hosted AI availability honestly. Fix the real unpacked Chrome origin failure narrowly without opening cookie writes or arbitrary origins. Verify Google discovery, actual Chrome transfer, owner isolation and web-only workflow, then deploy to the dev service. Track the Botanic bridge and gateway activation separately.

Exact owned files: `docs/CONTEXT.md`, `docs/reference/notcards-web-notebook.md`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/style.css`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-hosted.test.mjs`.

## Plan — 1

Use the existing board and private notebook route. Make the full artwork open its notebook with keyboard and pointer, preserve pin and drag, show a responsive embedded video built from canonical source identity, editable personal notes and working source links. Reflect hosted AI availability honestly. Fix the real unpacked Chrome origin failure narrowly without opening cookie writes or arbitrary origins. Verify Google discovery, actual Chrome transfer, owner isolation and web-only workflow, then deploy to the dev service. Track the Botanic bridge and gateway activation separately. Apply the same narrow player frame policy on the local web server. If needed update worker credentials for the ZIP and release a new build.

Exact owned files: `docs/CONTEXT.md`, `docs/reference/notcards-web-notebook.md`, `extensions/notcards/background.js`, `extensions/notcards/manifest.json`, `src/clay-notes/server.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/style.css`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `tests/clay-notes-hosted.test.mjs`.

## Plan — 1

Use the existing board and private notebook route. Make the full artwork open its notebook with keyboard and pointer, preserve pin and drag, show a responsive embedded video built from canonical source identity, editable personal notes and working source links. Reflect hosted AI availability honestly. Fix the real unpacked Chrome origin failure narrowly without opening cookie writes or arbitrary origins. Verify Google discovery, actual Chrome transfer, owner isolation and web-only workflow, then deploy to the dev service. Track the Botanic bridge and gateway activation separately. Apply the same narrow player frame policy on the local web server. If needed update worker credentials for the ZIP and release a new build. On manual video creation hydrate the title when empty and try to import available public captions in the background. Handle old cards on open, persist precise progress, expose explicit retry and distinguish missing captions from gateway availability. Test the three supplied URLs without paid calls.

Exact owned files: `docs/CONTEXT.md`, `docs/reference/notcards-web-notebook.md`, `extensions/notcards/background.js`, `extensions/notcards/manifest.json`, `src/clay-notes/server.mjs`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/style.css`, `src/notcards/server.mjs`, `src/notcards/store.mjs`, `src/notcards/video-import.mjs`, `tests/clay-notes-hosted.test.mjs`, `tests/notcards-video-import.test.mjs`.

### Phase 1 QA — 2026-11-16

No mechanical QA findings.

## Plan — 2

Add the trusted owner-bound card/conversation service to the existing private notebook server. Keep the connector an explicit capability. Only the first user question creates a remote conversation; losing the remote service preserves the binding. A confirmed deletion plus an explicit user reset permits a new conversation. Use verified issuer/subject lookup, owner-only source context and a stable request ID. Surface availability separately from direct summaries. Exercise HTTP authentication, idempotency, ownership and deletion with a stub port. The live native Botanic registration requires a separately approved production change. Direct summary activation requires the dedicated key/lane Apply evidence and permission for a live paid test.

Exact owned files: `docs/CONTEXT.md`, `docs/design/notcards-botanic-integration.md`, `docs/reference/notcards-web-notebook.md`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/style.css`, `src/notcards/card-chat.mjs`, `src/notcards/server.mjs`, `tests/notcards-card-chat.test.mjs`.

## Plan — 2

Add the trusted owner-bound card/conversation service to the existing private notebook server. Keep the connector an explicit capability. Only the first user question creates a remote conversation; losing the remote service preserves the binding. A confirmed deletion plus an explicit user reset permits a new conversation. Use verified issuer/subject lookup, owner-only source context and a stable request ID. Surface availability separately from direct summaries. Exercise HTTP authentication, idempotency, ownership and deletion with a stub port. The live native Botanic registration requires a separately approved production change. Direct summary activation requires the dedicated key/lane Apply evidence and permission for a live paid test. Live CDN returned the previous style sheet despite deploying current assets. Version the HTML asset references and verify the served bytes and real sample card click.

Exact owned files: `docs/CONTEXT.md`, `docs/design/notcards-botanic-integration.md`, `docs/reference/notcards-web-notebook.md`, `src/clay-notes/web/app.mjs`, `src/clay-notes/web/i18n.mjs`, `src/clay-notes/web/index.html`, `src/clay-notes/web/style.css`, `src/notcards/card-chat.mjs`, `src/notcards/server.mjs`, `tests/notcards-card-chat.test.mjs`.
