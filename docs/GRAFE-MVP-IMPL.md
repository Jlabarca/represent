# Grafe MVP — Implementation Tracker

> Updated: 2026-10-21. Explicit user authorization: build both MVPs in parallel, real-project tests, individual UI/UX improvement rounds, detailed research/test documents. Visu remains paused.
> Prior-art sweep: existing grafe research, restart experiments, capabilities and Visu reference checked. Existing experiments are not the product MVP.
> Baseline: 52266d898cf234475b522be64f13404cf8506faa. Continue the session's existing codex/represent-v0 integration branch; unrelated methodology and Notion files are excluded.

## AI Continuation Prompt

Read CONTEXT.md, DOCS-PROTOCOL.md, this tracker and research/reports/Represent parallel track restart.md. Complete this bounded MVP independently of the other track and without changing Visu. Parent owns integration, tracker and commits. Isolated build and research workers have disjoint file ownership. Preserve exact test evidence and explicit limitations. Source repositories remain read-only; mutations for verification use copies. All future AI must use Ghost; this MVP requires none.

## System Intent

A local JS/TS technical explorer: bounded explicit Git scope, compiler-derived symbols and typed relationships, exact source excerpts, focused graph and searchable outline, incoming/outgoing change impact and explicit related tests.

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

Use a pinned TypeScript compiler API adapter instead of depending on an opaque SCIP executable in an npm cache. Capture exact source scope, stable symbol IDs, definition spans, import/call/reference/test evidence, source hashes and capability diagnostics. Cache unchanged snapshots; query a focused neighborhood rather than draw all nodes. Serve only configured project IDs at loopback port 8873, with protected mutations. The renderer shows readable symbol names, code snippets, filters, impact and keyboard-accessible alternatives. Research worker independently verifies Gource, Codevis and original Notion intent. No upstream source transplant is planned.

## Open Questions

1. **Q:** Scope and AI? **Resolution:** A local single-user MVP with CLI/library/web and zero paid calls. No hosted service, autonomous companion actions or universal language/session claims.
2. **Q:** State and test roots? **Resolution:** State is outside source repositories; explicit configured roots only. Plane Sync and Represent (multi-file source); bounded larger JS/TS repository if needed.
3. **Q:** Product acceptance? **Resolution:** Automated behavior and real-project task checks plus an actual UI/UX review are required. Human preference remains review feedback, not an invented acceptance result.

## Current State

Planned, with read-only worker planning complete. Product edits start after this plan commit. Historical prototypes remain available.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| 1 | Planned | Codex | high | Headless core, CLI, local web and meaningful regression tests |
| 2 | Planned | Codex | high | Real-project trials, UI/UX improvement, detailed research record and promotion |

## Checklist

### Phase 1 — Working local product (verify: integration)
- [ ] GRAFE-MVP.1.1 — Implement the bounded core, snapshot/evidence lifecycle and CLI with tested safety, correctness and no-op behavior.
- [ ] GRAFE-MVP.1.2 — Implement the local web surface, protected manual actions, progressive detail and accessible navigation.

### Phase 2 — Real proof and research traceability (verify: e2e)
- [ ] GRAFE-MVP.2.1 — Run real-project task and controlled-copy update trials; preserve measurements and original-source hashes.
- [ ] GRAFE-MVP.2.2 — Complete design and implementation UI/UX rounds; fix observed defects and save browser evidence.
- [ ] GRAFE-MVP.2.3 — Deliver detailed source/repository/Notion genealogy distinguishing considered, inspected and executed; reconcile actual build findings.
- [ ] GRAFE-MVP.2.4 — Complete QA, reference/current-state/index updates and scoped committed promotion.

## Known Bugs

None identified before implementation. Scope limits and unverified claims must be documented as such rather than hidden.

## What Needs Testing

Exact evidence locations, excluded/ignored/symlink inputs, immutable historical data, no-op cache, changed and missing sources, bounded capture, source projects unchanged, local HTTP origin/auth, useful real-project workflow, keyboard/mobile/no-console-error checks, and a saved UX improvement record.

## Key Files Reference

src/grafe/**; web/grafe/**; tests/grafe*.test.mjs; scripts/grafe-*.mjs; examples/grafe/**; experiments/grafe-mvp/**; docs/reference/grafe-mvp.md; docs/research/grafe-research-and-tests.md; experiments/grafe-reference-checks/**

Parent-owned integration: package.json, .gitignore if dependency exclusions are needed, docs/CONTEXT.md, TODO.md, LOGBOOK.md, README.md, CAPABILITIES.md and this tracker. Workers must not edit these shared files.

## Plan — GRAFE-MVP.1 / .2

Use a pinned TypeScript compiler API adapter instead of depending on an opaque SCIP executable in an npm cache. Capture exact source scope, stable symbol IDs, definition spans, import/call/reference/test evidence, source hashes and capability diagnostics. Cache unchanged snapshots; query a focused neighborhood rather than draw all nodes. Serve only configured project IDs at loopback port 8873, with protected mutations. The renderer shows readable symbol names, code snippets, filters, impact and keyboard-accessible alternatives. Research worker independently verifies Gource, Codevis and original Notion intent. No upstream source transplant is planned.

The phases share the same product boundary but remain separately evidenced. Worker sends core/UI/test inventory and verification before parent integrates exact files; parent commits source checkpoints with corresponding checklist IDs. Parent performs final verification on integrated state before promotion. Design, implementation and live UX testing run alongside source research; neither track waits on Visu. Base is the immutable baseline above.

