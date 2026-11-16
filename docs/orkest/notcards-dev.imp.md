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

- [ ] REP-10.1.1 — Implement account-based Notcards with Google authentication, hosted extension capture, reference album and isolated HTTPS deployment configuration. Verify with token-free fixtures, browser checks and report actual public readiness.

## Key Files Reference

src/notcards/server.mjs hosts the account-scoped API. src/clay-notes/web holds the shared collection. scripts/notcards-extension.mjs builds the development extension. deploy/notcards holds the service and tunnel configuration.

## Architecture Notes

Keep existing local trial data compatible. Disable public AI generation until operator applies the dedicated lanes. Do not expose the loopback service.
