# Gateway request — Clay Notes hosted service, lab1

## Latest lab1 transaction, 2026-11-16

The operator subsequently requested “create the Notcards gateway key and lanes” and answered “go wth recommended” to the scoped one-shot Review/Apply and the console-generated alias. This supersedes the original manual-Apply handoff below for this lab1 transaction. The key name remains `LITELLM_KEY_CLAY_NOTES`. Its value was generated once in the host environment and was never printed. The four staged objects were the public key, the summary lane (selected default), the deep lane, and the mandatory `clay-notes-default` copy of the cheap chain. They share the key’s USD 1 per 30 days. The key forbids `max-broker`.

Ghost’s host executor passed Review. Apply failed during gateway preflight because Windows had no listener on port 4000; no registry, consumers or gateway config changes were left by the transaction. The healthy container still declared a port binding to a Tailscale address that Windows no longer had. The traffic key is not live until the console reports a successful Apply. No SHA, lane-test result or live inference charge was recorded for this attempt.

The operator approved repairing lab1 and retrying. Starting the Tailscale desktop client after restarting its Windows service restored its existing address. The original gateway port mappings were recreated and the hosted app confirmed HTTP 200 liveliness. A second Apply rolled back after the live consistency check. Four `codex-sub-*` lanes are declared but the gateway’s own subscription login is absent. The existing `botanic-default` key serves three more Max lanes than its registry entry, consistent with Botanic’s documented November 10 deployment. The executor reported the previous files and live state restored. No successful Apply SHA or paid probe exists. A shared gateway reconciliation is a separate decision from provisioning Notcards.

> 2026-11-16: The public product is **Notcards**, initially at `not.maremoto.dev`. The existing request below still identifies its dedicated internal key and two lanes. The brand change does not grant permission to Apply or make paid calls.

> Revised2026-11-15 after the user selected SaaS at `clay.maremoto.dev`. **Pending operator Review/Apply.** Supersedes the unapplied internal/operator smart/Max proposal. [Onboarding workflow](../../../Ghost/docs/guides/ai-gateway-app-onboarding.md), [console reference](../../../Ghost/docs/reference/ai-gateway-console.md), [service design](clay-notes-service-roadmap.md).

Registry rechecked read-only2026-11-15: `D:/ware/Ghost/infrastructure/docker/litellm/routes.json`, SHA256 `3ab596405829fe9de5c03e62e543144d92de701cec84a3c09fcd4e5cb9ca5c24`. No `keys.clay-notes`. Existing `represent` belongs to Trazo/Visu and is not reused. Refresh the registry revision before console Review.

```text
Gateway request — lab1
key: clay-notes (new)  group clay-notes  audience public
envVar: LITELLM_KEY_CLAY_NOTES
budget: $1 / 30d (initial test backstop proposed; not service launch capacity)
forbid: [max-broker] (app proposal for customer traffic; operator reviews)

lane: clay-notes-summary (new; current cheap preset)
  1 openrouter-lab1 google/gemini-2.5-flash-lite enabled paid
  2 anthropic-lab1  claude-haiku-5-5            enabled paid
  3 ollama          qwen3:8b                   enabled $0

lane: clay-notes-deep (new; current client-anthropic preset)
  1 anthropic-lab1  claude-sonnet-5-5           enabled paid
  2 anthropic-lab1  claude-haiku-5-5            enabled paid

key lanes after: [clay-notes-summary, clay-notes-deep]
defaultLane: clay-notes-summary (operator confirmed)
why: hosted source-grounded notebooks with fast automatic summaries and optional
     deeper regeneration, isolated key/spend and explicit account quotas.
app-side decision: docs/CONTEXT.md, 2026-11-15 Gateway request amendment
```

Hops come from the actual catalog/presets; copy current prices and parameters in the console. Combined upstream closure is `openrouter-lab1`, `anthropic-lab1`, `ollama`. All lanes remain lab1-only and server-to-server; browsers never receive a key or access the private gateway. The optional deep lane has no free fallback. Exhausted key budget is a failure; do not assume a local hop will still be reached.

## Actual decisions and supersession

The user's actual answer was **“Yes, summary is default (recommended)”**. It settles defaultLane only, not Apply, a new public chain, budget approval or permission for a paid call. The user explicitly says **“No live paid call until the operator says so.”** None has occurred.

The user subsequently chose Google-auth SaaS at `clay.maremoto.dev`, no Cloudflare Access and no customer pairing/local server. Therefore the prior audience `operator` and smart/Max deep chain were revised before any Apply. The onboarding guide warns on Max with public/client audience; it does not prohibit it. Proposed `forbid: [max-broker]` is this app's deliberate customer-service policy, subject to operator review. The new public audience, optional deep chain and launch quotas remain proposals; no approval quote is invented.

REP-8's generic aliases/old environment setting and tentative shared `represent` consumer are historical local behavior. New compliant wiring reads only `LITELLM_KEY_CLAY_NOTES` from the server environment, uses the app lane names as `model`, classifies actual serving hop from response headers/model/cost, and fences potentially paid calls before execution. This implementation still waits for real Apply SHA and lane-test evidence. The proposed$1/30d cap is a small initial testing backstop; public enrollment also needs deliberately configured per-account quotas and a service capacity budget.

## Operator action and return evidence

1. Create the named key value in Ghost's gitignored `.env` without printing it. The app agent never reads, asks for or pastes its value; never use the broad key provisioner.
2. In the [operator console](http://localhost:3002/x/ai-gateway/console), draft the key and lanes from these presets. Review audience, forbids, budget, closure, prices and default. Start the route-runner only under the operator's separate control.
3. **Operator clicks Apply.** This app session never applies, writes route-queue files/registry/consumers, starts a runner or calls LiteLLM `/key/*` or `/model/*`.
4. Return the scoped **Apply commit SHA** and **own-key lane-test result for each lane**, by name/result only. Console lane tests that may bill remain operator controlled.
5. Separately approve a bounded live summary allowance, stating the total cap and whether deep redo is permitted. Only then run the three-video quality/latency trial.

| Evidence | State |
|---|---|
| Apply commit SHA | pending |
| clay-notes-summary own-key lane-test | pending |
| clay-notes-deep own-key lane-test | pending |
| Separate paid-call allowance/cap | pending |
| App adapter and token-free tests | deployed gated to dev; three transcripts and deep redo verified on loopback |
| Public service capacity/per-account quotas | proposed, not configured |

## Post-Apply application work

POST to `http://localhost:4000/v1/chat/completions` from the app server using `model: "clay-notes-summary"` or the explicitly selected deep lane. Classify `x-litellm-model-api-base`, response model and reported cost. Missing or contradictory attribution stays unknown, with conservative spend reservation; never infer free service from an alias. Reconcile actual/unknown charges, reject exhausted caps before inference, retain notebooks on failure and require an explicit retry rather than an automatic billable loop. Add loopback-stub tests for paid/local serving, missing headers/cost, exhausted cap, truncation, lane selection, duplicate jobs and concurrent account reservations. Record the actual Apply SHA in the implementation reference. No new-lane live call is part of preparation.

The exact requested ephemeral copy is `docs/handoffs/GATEWAY-REQUEST-2026-11-15.md`, locally excluded and unstaged. This document is the durable committed request shown to the operator. Current work stops at this request boundary for gateway changes; independent UI/design preparation does not imply Apply.
