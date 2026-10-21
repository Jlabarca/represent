# Alegor MVP — Implementation Tracker

> Updated: 2026-10-21. Explicit user authorization: build both MVPs in parallel, real-project tests, individual UI/UX improvement rounds, detailed research/test documents. Visu remains paused.
> Prior-art sweep: existing alegor research, restart experiments, capabilities and Visu reference checked. Existing experiments are not the product MVP.
> Baseline: 52266d898cf234475b522be64f13404cf8506faa. Continue the session's existing codex/represent-v0 integration branch; unrelated methodology and Notion files are excluded.

## AI Continuation Prompt

Read CONTEXT.md, DOCS-PROTOCOL.md, this tracker and research/reports/Represent parallel track restart.md. Complete this bounded MVP independently of the other track and without changing Visu. Historical execution instructions: parent owned integration, tracker and commits. Isolated build and research workers have disjoint file ownership. Preserve exact test evidence and explicit limitations. Source repositories remain read-only; mutations for verification use copies. All future AI must use Ghost; this MVP requires none.

## System Intent

A local project re-entry tool: manual immutable Git/docs snapshots, selected-baseline comparisons, observed changes, declared next work, explicit conflicts/unknowns and exact captured citations, with timeline and focused evidence.

## Ingestion Vector

```text
selected-project/
|-- .git/       # @LLM-TARGET: revision and bounded change evidence
|-- src/        # @LLM-TARGET: selected language-supported source
|-- docs/       # @LLM-TARGET: declared intent and exact citations
|-- .env       # @LLM-IGNORE: credentials
|-- dist/      # @LLM-IGNORE: generated output
`-- node_modules/ # @LLM-IGNORE: third-party source
```

## Visualization Spec

A clean local web app with a useful overview and detailed evidence on demand. Search, selection, keyboard, mobile and empty/error states are part of acceptance. Complete a design UX round, then inspect the running app and record a distinct improvement round with actual fixes and screenshots.

## Architecture

Use Node 22 without runtime dependencies. Capture Git identity and bounded selected docs in immutable snapshots under the tool workspace, never the scanned root. Preserve historical excerpts; derive evidence-linked re-entry cards and compare selected baselines. Separate observed Git facts, declared document state, conflicts and unknowns. CLI/library and loopback UI port 8874 consume the same saved model; protected manual mutations and allowlisted project IDs only. No home-directory transcript scan or autonomous actions. Research worker independently inspects Skales and original Notion companion notes.

## Open Questions

1. **Q:** Scope and AI? **Resolution:** A local single-user MVP with CLI/library/web and zero paid calls. No hosted service, autonomous companion actions or universal language/session claims.
2. **Q:** State and test roots? **Resolution:** State is outside source repositories; explicit configured roots only. Represent and Plane Sync; controlled copies for changed/deleted/conflicting documents and branch transitions.
3. **Q:** Product acceptance? **Resolution:** Automated behavior and real-project task checks plus an actual UI/UX review are required. Human preference remains review feedback, not an invented acceptance result.

## Current State

Local MVP implemented and integrated. Real-project and controlled-copy trials, independent correctness review, and both design/implementation UI/UX rounds passed. The detailed research genealogy and implementation reference are complete. Final committed verification and promotion gates passed; this tracker is archived as the completed local MVP record.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| 1 | Complete | Codex | high | Headless core, CLI, local web and meaningful regression tests |
| 2 | Complete | Codex | high | Real-project trials, UI/UX improvement, detailed research record and promotion |

## Checklist

### Phase 1 — Working local product (verify: integration)
- [x] ALEGOR-MVP.1.1 — Implement the bounded core, snapshot/evidence lifecycle and CLI with tested safety, correctness and no-op behavior. Evidence: src/alegor/ and tests/alegor-{core,server}.test.mjs; 12/12 passed, zero skipped.
- [x] ALEGOR-MVP.1.2 — Implement the local web surface, protected manual actions, progressive detail and accessible navigation. Evidence: web/alegor/ and experiments/alegor-mvp/browser-check.json; citations, theme persistence, keyboard/mobile, progressive detail and unavailable-range checks passed.

### Phase 2 — Real proof and research traceability (verify: e2e)
- [x] ALEGOR-MVP.2.1 — Run real-project task and controlled-copy update trials; preserve measurements and original-source hashes.
- [x] ALEGOR-MVP.2.2 — Complete design and implementation UI/UX rounds; fix observed defects and save browser evidence.
- [x] ALEGOR-MVP.2.3 — Deliver detailed source/repository/Notion genealogy distinguishing considered, inspected and executed; reconcile actual build findings.
- [x] ALEGOR-MVP.2.4 — Complete QA, reference/current-state/index updates and prepare scoped committed promotion; final transaction evidence is appended below.

## Known Bugs

No open known acceptance bugs. Review fixed completed-item classification, implicit root widening, sensitive paths, rename direction/destination hashes, unavailable comparison wording, excessive first-layer detail, table artifacts and mobile overflow. Rule-based document interpretation and bounded Git history remain explicit limits.

## What Needs Testing

Exact evidence locations, excluded/ignored/symlink inputs, immutable historical data, no-op cache, changed and missing sources, bounded capture, source projects unchanged, local HTTP origin/auth, useful real-project workflow, keyboard/mobile/no-console-error checks, and a saved UX improvement record.

## Key Files Reference

src/alegor/**; web/alegor/**; tests/alegor*.test.mjs; scripts/alegor-*.mjs; examples/alegor/**; experiments/alegor-mvp/**; docs/reference/alegor-mvp.md; docs/research/alegor-research-and-tests.md; experiments/alegor-reference-checks/**

Parent-owned integration: package.json, .gitignore if dependency exclusions are needed, docs/CONTEXT.md, TODO.md, LOGBOOK.md, README.md, CAPABILITIES.md and this tracker. Workers must not edit these shared files.

## Plan — ALEGOR-MVP.1 / .2

Use Node 22 without runtime dependencies. Capture Git identity and bounded selected docs in immutable snapshots under the tool workspace, never the scanned root. Preserve historical excerpts; derive evidence-linked re-entry cards and compare selected baselines. Separate observed Git facts, declared document state, conflicts and unknowns. CLI/library and loopback UI port 8874 consume the same saved model; protected manual mutations and allowlisted project IDs only. No home-directory transcript scan or autonomous actions. Research worker independently inspects Skales and original Notion companion notes.

The phases share the same product boundary but remain separately evidenced. Worker sends core/UI/test inventory and verification before parent integrates exact files; parent commits source checkpoints with corresponding checklist IDs. Parent performs final verification on integrated state before promotion. Design, implementation and live UX testing run alongside source research; neither track waits on Visu. Base is the immutable baseline above.


## Phase 2 QA and evidence

Core/UI checkpoint: `1a4b2ded4379cb0b36cd5f0a49f3754d537005ed`. Twelve behavior/API tests passed, also included in the full 57/57 repository run. Main-workspace browser checks passed for exact citations, themes/persistence, bounded first-layer detail, keyboard/mobile and unavailable-range/unknown states; no page errors.

`experiments/alegor-mvp/real-pilot.json` records Represent at `34a79ca` with 22 commits/12 docs and Plane Sync at `a1a91c4` with 25 commits/two docs, source hashes and unchanged HEAD/status. `controlled-copy.json` proves no-op reuse, a docs-only update at the same HEAD in 1,534.66ms, a retained citation after deleting its source, and unchanged original project hashes. The copy task was synthetic.

The design round established identity, timeline, baseline and exact evidence. Independent review and live UX fixed completed-item classification, scope widening, sensitive paths, rename/hash direction, unknown-range wording, first-layer density, table artifacts and mobile overflow. See `experiments/alegor-mvp/README.md`, browser JSON and screenshots. Detailed Notion/Skales/source genealogy: `docs/research/alegor-research-and-tests.md`; API/usage: `docs/reference/alegor-mvp.md`. No paid calls, no personal transcript scanning, no Visu edits. Rule-based selection, bounded history and unaided usability remain explicit limits.

## Promotion verification - 2026-10-21

Final implementation/evidence commit: `8a781edf0d929212c22364af8b3b7c1faacb8612`. The focused `alegor` suite passed **12/12**, zero skipped, at that HEAD. `ware loop-verify --suite ALEGOR-MVP` recorded the actual runner totals; `promote-check.py --suite ALEGOR-MVP` passed all machine gates. The prior integrated run passed 57/57 and the final browser evidence is committed. Reference content still awaits human review; automated success is not human product acceptance.

Promotion archives this tracker, updates current state/index/capabilities and records a scoped docs commit. No push, deployment, paid AI operation or Visu implementation change occurred. Follow-up product work is tracked in `docs/TODO.md`.
