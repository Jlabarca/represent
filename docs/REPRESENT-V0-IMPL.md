# Represent v0 — Implementation Tracker

> [!WARNING]
> **Closed as historical exploration, 2026-10-21.** This scanner-first tracker is not the current execution cursor. Preserve its original ideas and unchecked boxes as historical scope; they are not completed by closure. The working Visu/Grafe/Alegor slices have separate promoted trackers. Read the [learning record](research/reports/Represent%20exploration%20learning%20record.md), [Visu preservation guide](guides/visu-experience.md), and [Orkest-platform research](research/reports/Represent%20within%20the%20Orkest%20platform.md). The next design will be audited/improved by Opus 5.5 before a new bounded tracker is bootstrapped.

> Living design and status for the first directory-to-scene companion.
> Source brief: `docs/handoffs/ASTRA-KICKOFF.md` (local, intentionally ignored).
> Follows DOCS-PROTOCOL.md Rule 15. Updated: 2026-10-21.
> Prior-art sweep: 2026-10-21 — CAPABILITIES.md is empty; no reference/ or impl/ implementation exists. Methodology scripts are tooling, not Represent product code. Methrep exists in GhostDev and remains read-only.

## AI Continuation Prompt

Read CONTEXT.md, this tracker, DOCS-PROTOCOL.md, the living project views report, reference studies, and the ROMPE trial verdict. Preserve older ideas and distinguish accepted direction from proposals. Current product-design priority is an updateable, project-styled Visu overview, with Grafe designed in parallel over shared evidence/snapshot identities. The plane-sync scene is a Grafe engineering checkpoint, not a global prerequisite for Visu. All AI goes through Ghost; keep the core headless. Do not extend methrep to parse code or modify sibling repositories. Check current git status for unrelated changes; use exact-path commits and evidence on completed boxes.

<details>
<summary>Historical continuation prompt (superseded 2026-10-21; preserved under Rule 5)</summary>

> Read CONTEXT.md, this tracker, DOCS-PROTOCOL.md, the reference-repository study, and research/companions.md. Study working upstream projects before implementing; record source evidence and actual trial results separately. Preserve the supplied PDF and earlier design ideas. All AI goes through Ghost; keep the core headless. The first implementation checkpoint is a real `scene.yaml` for `D:/ware/plane-sync`, shown before P2-P4 implementation. Do not extend methrep to parse code or modify sibling repositories. Check current git status: unrelated methodology rollout changes existed before this work. Use exact-path commits and evidence on completed boxes.

</details>

## Latest Steering (2026-10-21)

The user judged **“A memorable overview”** the only tested ROMPE output that makes sense as a Represent tool. Visu's key promise is to infer project style and produce a simple, attractive infographic with optional short/technical/source-linked detail. The MVP should keep the overview and refresh workflow narrow; style profiles should vary by project, and ROMPE pixel art is a reference rather than a universal theme. Build a cheap update loop through deterministic extraction, changed-evidence synthesis, caching and measured generation operations. No cost claim is established yet.

Design **Visu** and **Grafe** as parallel product tracks, not one poster with a hidden graph mode. Visu's full direction is an animated and interactive illustrated scene, where motion communicates evidence-backed flow or change; label explanatory models as conceptual unless runtime traces support them. Grafe should improve on the historical Codevis idea with source/code inside focused nodes, source navigation, filtering, and progressive detail. Both share project identity, evidence, and immutable snapshots. The first Visu proof can precede implementation of both full products.

Recommended names for evaluation are Represent (suite), Visu (overview), Grafe (technical view), and Alegor (candidate companion). The user asked for branding advice and fixed only that Alegor is not a mascot; its product/service role is still a proposal. Local snapshot history is a reasonable MVP. Hosted sync, embedding, export services, sharing, or subscription budgets are future service options, with no price/domain availability asserted. Full rationale and journeys are in [the living views report](research/reports/Represent%20living%20project%20views.md).

## System Intent

Represent is an umbrella for visual understanding tools. The v0 slice maps a local repository into a small, legible overview with deeper structural detail available on demand. Start with code; retain a shared contract that can also render methodology and later design documents. Source facts, inferred responsibilities and hypothetical simulations must remain distinguishable.

## Ingestion Vector

```text
<selected-repository>/
|-- .gitignore       # @LLM-TARGET: filter before parsing or metrics
|-- .git/            # @LLM-TARGET: bounded local history, never raw object ingestion
|-- package.json     # @LLM-TARGET: entry points and module context
|-- src/             # @LLM-ENTRY: JS/TS/C#/Python source relationships
|-- tests/           # @LLM-DECORATIVE: retain evidence, separate from runtime overview
`-- generated/       # @LLM-IGNORE: explicit generated/build filtering
```

Research reads pinned local clones under `references/`. A scan must never execute the scanned project's code or write to its source directory. Output artifacts belong under Represent for the sibling corpus.

## Visualization Spec

Start with an infographic-style overview of named modules, dependency direction and uncertainty. Focus reveals files and source locations. Choose views by the questions they answer; do not draw every node at once. A future game-design adapter may select state machines, economies or interactive simulations, but must not invent undocumented mechanics. Cities, creatures and Unity remain later experiments. The source PDF's pages 3 and 15 are illustrative visual references, not a shipped UI.

## Architecture

```mermaid
---
config:
  theme: dark
---
flowchart LR
    R["Pinned reference repos + trials"] --> D["Design decisions"]
    D --> A["Read-only source scan"]
    A --> B["Observed structure + provenance"]
    B --> C["scene.yaml + events.jsonl"]
    C -. "later" .-> E["Ghost enrichment + view selection"]
    C -. "later" .-> F["Theme + focused web renderer"]
    E -. "later" .-> F
    F -. "later" .-> G["Thin companion surfaces"]
```

Methrep defines the compatibility target: `schema`, `view`, `scope`, `nodes`, `edges`; nodes have `id`, `type`, optional `name`/`label`/`annotations`; edges have `from`, `to`, `relation`. Use `owns` for hierarchy and `depends-on` for resolved imports. Necessary structural `Module` and `File` types must be documented. Unknown semantics must not become asserted Services or Pipelines. Methrep omits empty collections in YAML; future readers must tolerate this. Envelope compatibility does not prove renderer compatibility.

## Open Questions

1. **Q: What comes before implementation?**
   **Resolution:** Clone, inspect and exercise the selected reference projects, synthesize reuse/adapt/avoid decisions, then settle P0 and build P1. Deliver the first plane-sync scene before P2-P4.
   > Rationale: operator's research-first steering on 2026-10-21 supersedes immediately starting a scanner.
   > Override: start a separate implementation spike early only on explicit operator direction.
   > [!WARNING] Historical sequence superseded for global priority by the user's Visu-first product direction (2026-10-21). Keep the first plane-sync scene as a Grafe engineering checkpoint; it no longer blocks Visu design or its first prototype. See [Latest Steering](#latest-steering-2026-10-21).
2. **Q: Which architecture choices are fixed?**
   **Resolution:** Headless core, Ghost-only AI and the scene/events boundary are fixed. TypeScript/web is a working preference until the source study settles it. Reuse methrep's contract, not its date-only event append algorithm.
   > Rationale: the current emitter can miss later same-day events and rewrite on malformed tails; the existing Mermaid renderer skips unknown types.
   > Override: choose another language/renderer when demonstrated tradeoffs justify it; record the decision in CONTEXT.md.
3. **Q: Which corpus and languages?**
   **Resolution:** plane-sync is the small first target (19 tracked files at inspection), including JavaScript `.js/.mjs/.cjs`. Add C#/TS/Python. Choose medium by measured eligible-file count; measure Ghost as the large target.
   > Rationale: kickoff size estimates are not measurements, and omitting JS misses the first target.
   > Override: substitute corpus members when needed, preserving measured size diversity and the first plane-sync checkpoint.

## Current State (2026-10-21)

Reference study and ROMPE trials delivered. PDF copied/read; companion and living-view research reviewed. The user selected the illustrated “A memorable overview” as the quality bar; the earlier recommendation that all three tested renderers form complementary product views is superseded. Upstream interactive-diagram and Eraser outputs remain research instruments, and the image-generation baseline remains an experiment rather than a general Represent renderer. No scanner, enrichment, snapshot service, or companion shell implemented. No promoted capability claimed. The first plane-sync scene remains useful for Grafe's engineering path; it is no longer the global gate ahead of Visu design/prototyping.

## Known Bugs

No Represent runtime exists yet. Risks: ignore-rule fidelity; falsely resolved references; unstable IDs/layout; unsupported syntax; accidental all-graph rendering; event deduplication. Upstream defects remain research observations, not bugs owned by this implementation.

## What Needs Testing

- TEST.1: ignored tracked/untracked files, nested negations, generated output, symlinks/junctions, Unicode paths and non-Git roots.
- TEST.2: JS/TS/TSX/Python import forms and C# using/namespace extraction, parse errors, ambiguous/external refs; no fabricated edges.
- TEST.3: stable bytes on repeat scans, unique IDs, valid endpoints, source hashes/spans, explicit resource-limit behavior and no source writes/network calls.
- TEST.4: actual small/medium/large file counts, revisions/manifests, timing, peak memory and completeness; no silent 5,000-node ceiling.
- TEST.5: future Ghost budget/cache failures, invalid/truncated view specs, unchanged methrep scene through the same renderer, event playback.

## Implementation Status

| Phase | State | Model | Effort | Description |
|---|---|---|---|---|
| REPRESENT-V0.0 | in progress | gpt-6-astra | xhigh | P0: reference study, trials and recorded decisions |
| REPRESENT-V0.1 | not started | gpt-6.1-sol | xhigh | P1: deterministic CLI/library and first scene |
| REPRESENT-V0.2 | not started | gpt-6-astra | ultra | P2: budgeted Ghost enrichment and view selection |
| REPRESENT-V0.3 | not started | gpt-6.1-sol | ultra | P3: focused renderer and methrep abstraction test |
| REPRESENT-V0.4 | not started | gpt-6.1-sol | xhigh | P4: local companion shell |

Model columns are future execution hints; they are not claims about completed work.

## Checklist

### P0 — Research, then decisions

- [x] REPRESENT-V0.0.1 Preserve/read the PDF, inspect local prior art and bootstrap P0-P4 with the research-first sequence — evidence: research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf; CONTEXT.md; this tracker.
- [x] REPRESENT-V0.0.2 Clone pinned reference repositories and inspect real ingestion/model/layout/theme code; record licenses and reusable paths — evidence: research/reference-repos.json; research/research_notes/Represent reference repository study/; research/reports/Represent reference repository study.md.
- [x] REPRESENT-V0.0.3 Exercise feasible reference examples; distinguish actual observations from source-only findings; write reuse/adapt/avoid synthesis — evidence: research/rompe-tool-trials.md; ../experiments/rompe/validation/browser-results.json; ../experiments/rompe/eraser-diagrams/README.md.
- [ ] REPRESENT-V0.0.4 Record final v0 choices and scan limits in CONTEXT.md; define contract extensions and validation corpus — evidence: pending decision and implementation plan.
- [x] REPRESENT-V0.0.5 Run the operator's ROMPE explainer/poster prompts through suitable reference projects, inspect actual output and preserve provenance/corrections — evidence: ../experiments/rompe/index.html; source-audit.md and source-manifest.json under that directory; research/rompe-tool-trials.md.

### P1 — First deterministic scene

> [!WARNING]
> **Historical scanner-first gate superseded for global product sequencing (2026-10-21).** P1's plane-sync scene remains the Grafe technical checkpoint. Visu product design and its first overview/update prototype can proceed before that scene; see [Latest Steering](#latest-steering-2026-10-21).

- [ ] REPRESENT-V0.1.1 Implement CLI/library, filtering, bounded syntax/history extraction and scene serialization as one vertical slice — evidence: pending source and fixture tests.
- [ ] REPRESENT-V0.1.2 Generate, inspect and show the first plane-sync scene with honest completeness and source evidence — evidence: pending saved scene and inspection.
- [ ] REPRESENT-V0.1.3 Benchmark measured small/medium/large inputs, including Ghost; prove deterministic output and bounded behavior — evidence: pending benchmark results.
- [x] REPRESENT-V0.1.4 Finish companion research with verified sources, compact context model, scan/diff triggers and three testable interaction modes — evidence: research/companions.md; unverified consumer-companion claims explicitly marked.

### P2 — Cheap enrichment

- [ ] REPRESENT-V0.2.1 Use Ghost's verified transport for compact cluster digests and validated labels/purposes/view specs; no provider SDKs or raw files — evidence: pending adapter/payload tests.
- [ ] REPRESENT-V0.2.2 Cache by content and output-affecting configuration; enforce cost reservations across retries, fail closed when price cannot be bounded — evidence: pending cache/budget tests.
- [ ] REPRESENT-V0.2.3 Report per-cluster completeness and measure cold/warm/changed-scan cost and latency — evidence: pending reports.

### P3 — Renderer

- [ ] REPRESENT-V0.3.1 Ship deterministic layered overview/drilldown, search-to-camera, minimap and readable infographic theme — evidence: pending interaction tests and screenshots.
- [ ] REPRESENT-V0.3.2 Render an unchanged real methrep scene through the same loader/model/renderer with no domain-specific conversion — evidence: pending fixture hash and paired screenshots.
- [ ] REPRESENT-V0.3.3 Implement event playback with stable IDs, explicit invalid-event handling and reproducible replay — evidence: pending replay tests.

### P4 — Companion

- [ ] REPRESENT-V0.4.1 Local web panel + CLI path-to-picture with progress/cancel/retry, reusing the headless core — evidence: pending end-to-end checks.
- [ ] REPRESENT-V0.4.2 Persist compact project context/prior scene and explain structural diffs; recover from stale/corrupt state — evidence: pending restart/diff tests.
- [ ] REPRESENT-V0.4.3 Add scene-grounded follow-ups through Ghost; evaluate ambient/query-first/digest modes before VS Code integration — evidence: pending workflow review.

## Key Files Reference

| File | Purpose |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Decisions and current state |
| [companions.md](research/companions.md) | Companion design research |
| [graphify-tested.md](research/graphify-tested.md) | Measured failure cases to avoid |
| [Source PDF](research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf) | Preserved Interactive Atlas conversation |
| `references/` (ignored) | Local upstream study clones; never stage embedded repositories |

## Architecture Notes

The prior Unity recommendation was motivated by shop expertise, theme assets and eventual 3D. Evaluate that argument honestly; web-first must earn its place through v0 interaction and embedding needs. Keep semantic data independent of visual metaphor. Learn from reference code, but choose a small coherent design rather than combining every dependency or reproducing upstream limitations.

## Owned Paths and Commit Policy

This task owns this tracker, the edits to CONTEXT/TODO/README/LOGBOOK, the copied PDF, new research notes/report/inventory, and any new Represent implementation files explicitly added to this tracker. Existing dirty `.claude/skills/qa-pass/SKILL.md`, `.ghostdev/version.json`, `CLAUDE.md` and untracked `bin/` rollout scripts are outside scope. Commit exact files with workflow-git.py. The ignored kickoff remains local. P2-P4 are not promoted by this bootstrap.

ROMPE trial scope additionally owns `experiments/rompe/`: source audit/manifest, derived explainer configs and HTML, renderer inputs/outputs, upstream notices, image prompts/results and browser test evidence. G:/ro/RagnarokRebuildTcp remains read-only. The research/experiment boxes form one documentation-and-fixture checkpoint; no source-changing product box has shipped. P0.0.4 remains open rather than claiming a language/parser decision without a scanner feasibility test.
