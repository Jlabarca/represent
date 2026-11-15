# Gateway request — Clay Notes, lab1

> Prepared2026-11-15. Status: **pending operator Apply**. No secrets or live inference. [Onboarding workflow](../../../Ghost/docs/guides/ai-gateway-app-onboarding.md), [console reference](../../../Ghost/docs/reference/ai-gateway-console.md).

Registry inspected read-only: `D:/ware/Ghost/infrastructure/docker/litellm/routes.json`, SHA256 `3ab596405829fe9de5c03e62e543144d92de701cec84a3c09fcd4e5cb9ca5c24`. `keys.clay-notes` does not exist; `represent` exists for Trazo/Visu and is not reused. Refresh registry revision in the console before Review; this snapshot is not a promise it stays current.

```text
Gateway request — lab1
key: clay-notes (new)  group clay-notes  audience operator
envVar: LITELLM_KEY_CLAY_NOTES
budget: $1 / 30d (proposed backstop, operator reviews)  forbid: []

lane: clay-notes-summary (new; copy the current cheap preset)
  1 openrouter-lab1 google/gemini-2.5-flash-lite  enabled  paid
  2 anthropic-lab1  claude-haiku-5-5             enabled  paid
  3 ollama          qwen3:8b                    enabled  $0

lane: clay-notes-deep (new; copy the current smart preset)
  1 max-broker      claude-max-sonnet           enabled  $0, rate-limited
  2 anthropic-lab1  claude-sonnet-5-5            enabled  paid
  3 openrouter-lab1 google/gemini-2.5-flash       enabled  paid
  4 ollama          qwen3:8b                    enabled  $0

key lanes after: [clay-notes-summary, clay-notes-deep]
defaultLane: clay-notes-summary (operator confirmed)
why: fast automatic transcript TLDR, with explicit deeper regeneration, attribution
     and isolated budget for this internal app.
app-side decision: docs/CONTEXT.md, 2026-11-15 follow-up decision
```

The numbered chains use the current registry's named presets/catalog; copy their prices and parameters in the console, not an invented upstream. Policy closure for both lanes combined is `openrouter-lab1`, `anthropic-lab1`, `ollama`, `max-broker`. All lanes remain lab1-only. Max is a subscription/rate-limited hop with reported$0, not a paid-fallback exemption. Exhausted key budget is a failure; do not promise that local fallback will still be reached.

## Operator decision and app-side conflict

User approval quoted verbatim: **“Yes, summary is default (recommended)”** in response to the proposed own key/$1 backstop/two-lane request. This settles the requested default, not actual creation, Apply or a paid-call allowance. User hard boundary: **“No live paid call until the operator says so.”**

REP-8's reusable generic aliases and tentative `represent`-consumer suggestion conflict with the new own-key/own-lane rule. Amended decision: Clay Notes will read only `LITELLM_KEY_CLAY_NOTES` from its process environment, send app-specific lane names as `model`, and never fall back to another application's key or infer free service from a lane name. The new implementation step is gated on operator Apply SHA and lane-test evidence; current legacy gateway wiring is not represented as compliant completion. No old evidence is erased.

## Operator action, then return evidence

1. Create the new named value in Ghost's gitignored `.env` without printing it. Do not run the broad provisioner. The app agent never reads, requests or pastes its value.
2. In the [admin console](http://localhost:3002/x/ai-gateway/console), draft the new key and both lanes from the presets above; review the budget, closure, prices, default and current registry revision. Starting the host runner is separately operator-controlled.
3. **Operator clicks Apply.** This app session neither applies nor writes registry, consumers, queue files or key/model APIs.
4. Return the scoped **Apply commit SHA** and **own-key lane-test result for each lane**, using names/results only. Live inference, including a console lane-test that may bill, remains operator-controlled. Report failures without changing the scope silently.
5. Give a separate bounded paid-call approval before the three-video summary trial, for example a maximum dollar allowance and whether both default/deep lanes may be used. No such approval exists yet.

Evidence to fill after the operator acts:

| Evidence | Current state |
|---|---|
| Apply commit SHA | pending — not invented |
| clay-notes-summary own-key lane-test | pending |
| clay-notes-deep own-key lane-test | pending |
| Paid-call approval and cap | pending |
| Post-Apply app lane/header/spend-fence tests | pending |

## Post-Apply application work

Read the key by environment name only; use `/v1/chat/completions` at `http://localhost:4000`. Classify the actual serving hop using `x-litellm-model-api-base`, response model and reported response cost. Keep missing/contradictory attribution unknown; never treat lane/default labels as proof of a free hop. Check/route potentially paid chains through a bounded app spend fence before inference, reserve conservatively for uncertain usage and record actual or unknown cost afterward. Budget refusals preserve notebooks; no automatic billable retry. Add loopback-stub tests for free Max/local, paid fallback, missing headers/cost, exhausted cap, truncation and lane selection. Do not test paid inference in this preparation phase. Link the real Apply SHA in the implementation/reference once received.

The exact user-requested ephemeral handoff is also written at `docs/handoffs/GATEWAY-REQUEST-2026-11-15.md`. That path is locally excluded and unstaged to preserve the project's ephemeral-handoff rule; this document is the committed durable request.
