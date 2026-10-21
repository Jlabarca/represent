# Represent — Logbook


> Append-only session history. Never edit previous entries.
> Each session appends: date, accomplishments, decisions, blockers, next steps.
> See `DOCS-PROTOCOL.md` Rule 2.

---

## 2026-04-13 — Repo bootstrap

**Accomplishments:**
- Cloned empty `Jlabarca/represent` repo
- Wrote `docs/DOCS-PROTOCOL.md` (adapted from ORO DOCS-PROTOCOL.md + Notion Bootstrap Architect doctrine)
- Scaffolded root living docs: `CONTEXT.md`, `TODO.md`, `BACKLOG.md`, `LOGBOOK.md`, `README.md`
- Seeded `BACKLOG.md` with visual-mode ideas migrated from the Notion workspace (creature, city, actor, blueprint, gource, neopet)

**Decisions:**
- Repo is the new home for the doctrine; the Notion workspace remains as the historical idea trail (Rule 5: Append & Deprecate — nothing deleted).
- Rule 6 (Atomic POC Structure) is mandatory for every `research/` entry: System Intent, Ingestion Vector, Visualization Spec, Bootstrapping Steps.
- Rule 8 (Directory Tree Standard) adds `@LLM-ENTRY`, `@LLM-TARGET`, `@LLM-DECORATIVE`, `@LLM-IGNORE` annotations.

**Blockers:** None.

**Next steps:**
- Pick the inaugural visual mode and write the first `research/{mode}.md` POC brief.
- Decide the v0 ingestion strategy.

## 2026-10-21 — Represent v0 bootstrap and reference study

**Accomplishments:**
- Copied and read the 18-page Interactive Atlas PDF under `research/sources/`.
- Read the prepared kickoff, original vision/presence proposals, graphify results and methrep contract/emitters.
- Bootstrapped `REPRESENT-V0-IMPL.md` with P0-P4, evidence gates, source scope and auto-resolved questions. Started reference and companion research.

**Decisions:**
- Follow the operator's research-first sequence: clone, study/use, synthesize, design, build.
- Preserve headless/Ghost-only commitments and the scene/events boundary; evaluate language and renderer against actual reference code.
- Include JavaScript in P1; plane-sync has 19 tracked files and belongs in the small target tier.
- Use branch `codex/represent-v0`; keep pre-existing methodology rollout changes outside task commits.

**Blockers:** None for research. Browser/runtime availability and reference execution limits will be recorded as evidence, not assumed successful.

**Next steps:** Finish reference trials/synthesis, record P0 decisions, then produce the first plane-sync scene before P2-P4.

## 2026-10-21 — ROMPE reference-tool trials

**Accomplishments:**
- Completed six-repo source study; added Eraser Diagrams as the seventh clone for hands-on document visualization.
- Read the two ROMPE prompts and their design sources independently; recorded six source hashes and fifteen factual invariants in `experiments/rompe/source-manifest.json`.
- Ran interactive-diagram's real templates (ten views, 56 source-linked cards and a poster), Eraser's local CLI (three diagrams and a poster), and a built-in image-generation poster plus correction pass.
- Headless Chromium validated ten tabs, source navigation, zoom/fit and SVG exports: 14 passing checks; all tab/poster overlap audits clear; no page errors or external requests. Inspected desktop/mobile screenshots and rendered images.

**Decisions:**
- Follow the operator's latest request: game-design trials before scanner implementation; preserve the original first plane-sync scene checkpoint for later.
- Use a shared audited fact model with different views. Interactive inspector best for exploration; deterministic diagrams for controlled detail; illustrated poster for orientation.
- Keep exact source qualifications and unresolved contradictions. Red loss is conditional; roster capacity differs from active companions; onboarding remains a sketch.

**Blockers:** No blocker for delivered trials. Mobile fit-view text is too small; Eraser labels can exceed the requested visible line/word limits. These are experiment findings, not hidden passes. Full-app execution of the other five reference projects is not claimed.

**Next steps:** Review the trials, settle remaining product/parser choices, then implement the first headless scan; do not promote P0-P4 from these experiments.

## 2026-10-21 — Living project views and suite design

**Accomplishments:**
- Read the local Notion-era Represent notes and synthesized them with the ROMPE tool verdict and new GoCity, Algorithm Visualizer, and creative-coding research.
- Wrote the four-section [living project views report](research/reports/Represent%20living%20project%20views.md), including annotated ingestion scope, Visu MVP, full animated Visu, parallel Grafe design, candidate Alegor role, local-first snapshots, future service options, and UX gates.
- Updated the reference inventory with three new studies and indexed their notes. Left the Notion export and prior research source notes unchanged.
- Reconciled CONTEXT, TODO, tracker, README, and this logbook: Visu's style-aware memorable overview is now the first product proof; plane-sync remains a Grafe engineering checkpoint, not the global gate.
- Added the local [living-overview concept](../experiments/rompe/living-overview-concept/index.html): parent visually inspected the desktop and its saved validation records 20 passing checks across desktop/mobile, zero external requests, keyboard marker behavior, source-linked detail, focus restoration, planned-status toggling, and mobile detail scrolling. Its timeline switches between two poster revisions of the **same** audited ROMPE source snapshot; it does not demonstrate two project snapshots or project evolution.

**Decisions / recommendations:**
- The operator accepted “A memorable overview” as the only tested output that fits Represent. Box-based tools remain useful research instruments.
- Recommend one Represent suite with Visu, Grafe, and a candidate Alegor companion/history experience; do not imply separate products/accounts or claim an unverified domain. The assistant/history boundary is proposed, not user-fixed.
- Narrow MVP output/workflow, while keeping style per project. Test ROMPE and a non-game repository. Design both Visu and Grafe seriously over shared source evidence and immutable snapshots.

**Blockers / limits:**
- No scanner, generated project view, durable snapshot service, hosted companion, or product renderer is implemented. The local living-overview page is a concept artifact.
- Automated style detection, image-region freshness, incremental image regeneration, affordability and adoption have not been established. Measure them in a pilot; do not invent cost/usage claims.
- The overview's raster text remains small on mobile; the detail layer is readable on demand. The concept reuses existing ROMPE art and hand-authored evidence; it does not implement ingestion, style detection, snapshot persistence, generated updates, animation, or chat.

**Next steps:** Review the suite proposal, then prototype one project-styled Visu overview with source-backed regions and a two-snapshot update. Continue Grafe design in parallel and retain the plane-sync scene for its technical engineering checkpoint.

## 2026-10-21 — Visu implementation kickoff

User authorized building Visu against ROMPE and a non-game project, with parallel Grafe/Alegor exploration. Grounded the plan in the existing Ghost image gateway and actual Luz style tokens. Created VISU-MVP-IMPL.md before source changes; core remains headless and source repositories read-only. Existing gateway needed a loopback-only runtime Compose override; no Ghost tracked configuration changed. Next: implement, run both pilots, measure updates, inspect UI and record mature research boundaries.


## 2026-10-21 — Visu headless core and Ghost checkpoint

Implemented bounded manifests, safe source capture, heuristic style profiles, immutable content identities, view/art lineage, source-role update classification, checklist evidence and a shared CLI/library/local API. Ghost json and image-gen routes now produce validated story citations and PNGs with measured attempt ledgers, no silent retry and persistent call limits. Thirteen regression cases pass. A read-only agent audit found concrete bugs in role keys, missing evidence, PNG validation and Windows store containment; fixed them. Real ROMPE/Luz generation and controlled-copy tests produced evidence; original selected file hashes remained unchanged during those tests. Next: complete UI/pilot documentation, browser checks and promotion audit.

## 2026-10-21 — Visu browser and two-project pilot

### Accomplished

Integrated the isolated browser shell and completed design plus implementation UX rounds. The full illustration stays visible, evidence is progressively disclosed, keyboard/tap/Escape work, history separates portrait revisions, and an optional captured-checklist layer avoids fabricated whole-project progress. Fourteen core tests and nine browser checks pass. ROMPE retro and Luz editorial art were generated through Ghost. Measured full trial cost was $0.3682722 including failures. Copy-based no-op/detail updates used zero AI calls and preserved original file hashes. Added reference/visu-mvp.md and reproducible trial scripts/results.

### Decisions

Keep short text and conceptual imagery in raster art; put exact facts in captured evidence. Source-reference validation does not prove semantic entailment. Treat dollar budgets as measured-spend stops; recheck between paid stages and retain hard attempt limits. Grafe and Alegor remain separate design/research tracks after actual extractor/session trials, not prematurely launched MVPs.

### Blockers

None for the bounded local Visu slice. Public-release naming/licensing, generalized chapter discovery, richer style detection, animated layers and standalone Grafe/Alegor remain outside this slice.

### Next

Run final scoped QA and promotion checks; use the two-project MVP for user review and collect corrections before widening scope.

## 2026-10-21 — Promote Visu MVP

### Accomplished

Promoted VISU-MVP-IMPL to impl/ + reference/visu-mvp.md. Scoped implementation commits d13a2b6 and 05b304f contain the working core, UI, tests and two-project evidence. The actual runner passed 14/14 tests at 05b304f; nine browser checks passed with no failed requests. Promotion checker passed every machine gate. Added the capability row and archived tracker index.

### Decisions

Promotion denotes the documented bounded local MVP, not general architecture inference or automatic art correctness. Reference content still awaits human product review. Historical research and failed attempts remain preserved. Local runtime verification records are ignored rather than committed.

### Blockers

None for this slice. Grafe and Alegor remain evidence-led parallel design tracks; their research does not yet justify independent MVP implementation.

### Next

Review both projects in Visu, collect semantic/art corrections, then prioritize general chapter extraction and richer style evidence. For Grafe, validate multi-file symbol/source accuracy. For Alegor, validate a real project re-entry task against opted-in session evidence.

## 2026-10-21 — Automatic Visu discovery and manual refresh

### Accomplished

Implemented root-only safe Git discovery, bounded cited six-chapter Ghost analysis, version/model-aware caching, independent image reuse, manual capture/explain/illustrate and persistent dark/high-contrast monochrome. Real ImageLab trial required no authored sources or overview; refreshed Luz/ROMPE through the same pipeline. UX review fixed inspector overlap and text contrast, then condensed explanations and citations behind disclosure. Thirty-five regression tests and nine browser checks pass; screenshots and raw measurements are saved in experiments/visu-discovery/.

### Decisions

Keep snapshots and both paid actions manual. Default text route is Ghost gemini-flash after Flash Lite struggled with historical/current conflicts. The measured controlled-copy status update cost $0.0144183, reused art and preserved all six chapter identities with zero image calls; unchanged operations made no AI calls. All thirty original selected Luz files retained their hashes. This iteration cost $0.28688598 including rejected experiments and three images. The earlier $0.3682722 was $0.3536370 images plus $0.0146352 text, routed Ghost LiteLLM → OpenRouter → Google; both reports preserve failures.

### Blockers / limits

No unresolved automated-test failures. Bounded source selection and six chapters are heuristic. Some source interpretations still confuse stale notes and implementation gates; validated quotations are review evidence, not proof of semantic correctness. The UI separates source-reported current state, intended design and next work. Grafe/Alegor remain parallel research tracks.

### Next

Complete scoped promotion, then collect product feedback on automatically chosen chapters and source conflicts. Future improvements should target semantic selection and corrections before adding automatic paid refreshes.

## 2026-10-21 — Promote Visu automatic discovery

Promoted VISU-DISCOVERY-IMPL to impl/ with reference/visu-discovery.md. Implementation commit 3023fd26 contains the scoped feature and trial evidence. Recorded 44/44 checks (35 regression, nine browser) at that HEAD; promotion checker passed all machine gates. Unrelated methodology files and Notion sources were excluded. Next: user review of chapter relevance and source interpretation; human review remains distinct from automated verification. No deployment or push was performed.

## 2026-10-21 — Restart Grafe and Alegor independently

### Accomplished

While Visu is paused, completed parallel feasibility work for Grafe and Alegor. Grafe decoded a four-file TypeScript fixture (39 occurrences, zero checked source-span mismatches) and a saved six-document plane-sync index (1,075 symbols, 6,485 occurrences, zero span mismatches), and produced a focused-symbol browser prototype. Alegor produced a cited Git/docs re-entry brief over seven commits and 78 paths, surfaced conflicting sprint state, and produced a static timeline/evidence prototype. Its browser prototype passed 12 checks. The pinned `sessions` Windows context suite passed 25/25 after an isolated two-line experimental scanner/fixture path normalization; actual Claude session-folder compatibility remains unverified. No paid AI calls were made. See [parallel restart report](research/reports/Represent%20parallel%20track%20restart.md) and the [Grafe](../experiments/grafe-restart/README.md) and [Alegor](../experiments/alegor-restart/README.md) records.

### Decisions

Begin narrow local MVP implementation for both tracks in parallel; neither waits on Visu or the other track. Grafe starts with explicit-scope TypeScript/JavaScript navigation and source evidence. Alegor starts with Git/docs re-entry and visible conflicts; a user-selected session connector follows after local task validation. Shared project/snapshot identity should be reused when concrete, not treated as a prerequisite. These prototypes do not establish product-market fit or shipped MVP status.

### Blockers / limits

Grafe's real-project index scope was not pinned when originally generated, and six observed files do not prove full coverage or scaling. The AST overlay classified syntax but did not independently verify every semantic relation. Alegor's session linkage input was synthetic; the context-suite patch was local and not upstream accepted. No representative user study, willingness-to-pay research, or session-correlation accuracy measurement has been done.

### Next

For Grafe, pin a second larger repository's exact file set, audit relation and span correctness, then run a caller-and-tests task. For Alegor, add deterministic conflict/deleted-citation fixtures, validate a real project re-entry task, then preview an explicitly selected session corpus and measure false/missed links. Keep Visu paused unless reprioritized.
