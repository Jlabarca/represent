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
- Wrote the four-section [living project views report](../research/reports/Represent%20living%20project%20views.md), including annotated ingestion scope, Visu MVP, full animated Visu, parallel Grafe design, candidate Alegor role, local-first snapshots, future service options, and UX gates.
- Updated the reference inventory with three new studies and indexed their notes. Left the Notion export and prior research source notes unchanged.
- Reconciled CONTEXT, TODO, tracker, README, and this logbook: Visu's style-aware memorable overview is now the first product proof; plane-sync remains a Grafe engineering checkpoint, not the global gate.
- Added the local [living-overview concept](../../experiments/rompe/living-overview-concept/index.html): parent visually inspected the desktop and its saved validation records 20 passing checks across desktop/mobile, zero external requests, keyboard marker behavior, source-linked detail, focus restoration, planned-status toggling, and mobile detail scrolling. Its timeline switches between two poster revisions of the **same** audited ROMPE source snapshot; it does not demonstrate two project snapshots or project evolution.

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

While Visu is paused, completed parallel feasibility work for Grafe and Alegor. Grafe decoded a four-file TypeScript fixture (39 occurrences, zero checked source-span mismatches) and a saved six-document plane-sync index (1,075 symbols, 6,485 occurrences, zero span mismatches), and produced a focused-symbol browser prototype. Alegor produced a cited Git/docs re-entry brief over seven commits and 78 paths, surfaced conflicting sprint state, and produced a static timeline/evidence prototype. Its browser prototype passed 12 checks. The pinned `sessions` Windows context suite passed 25/25 after an isolated two-line experimental scanner/fixture path normalization; actual Claude session-folder compatibility remains unverified. No paid AI calls were made. See [parallel restart report](../research/reports/Represent%20parallel%20track%20restart.md) and the [Grafe](../../experiments/grafe-restart/README.md) and [Alegor](../../experiments/alegor-restart/README.md) records.

### Decisions

Begin narrow local MVP implementation for both tracks in parallel; neither waits on Visu or the other track. Grafe starts with explicit-scope TypeScript/JavaScript navigation and source evidence. Alegor starts with Git/docs re-entry and visible conflicts; a user-selected session connector follows after local task validation. Shared project/snapshot identity should be reused when concrete, not treated as a prerequisite. These prototypes do not establish product-market fit or shipped MVP status.

### Blockers / limits

Grafe's real-project index scope was not pinned when originally generated, and six observed files do not prove full coverage or scaling. The AST overlay classified syntax but did not independently verify every semantic relation. Alegor's session linkage input was synthetic; the context-suite patch was local and not upstream accepted. No representative user study, willingness-to-pay research, or session-correlation accuracy measurement has been done.

### Next

For Grafe, pin a second larger repository's exact file set, audit relation and span correctness, then run a caller-and-tests task. For Alegor, add deterministic conflict/deleted-citation fixtures, validate a real project re-entry task, then preview an explicitly selected session corpus and measure false/missed links. Keep Visu paused unless reprioritized.

## 2026-10-21 — Build Grafe and Alegor MVPs in parallel

### Accomplished

Recorded separate implementation plans in GRAFE-MVP-IMPL.md and ALEGOR-MVP-IMPL.md at e3f4b02 before product edits. Two isolated build worktrees and two research workers have disjoint file ownership. Real-project trials, individual design/implementation UX rounds and detailed research/test genealogies are required for both tracks.

### Decisions

Continue on the existing codex/represent-v0 integration branch. Grafe uses a pinned TypeScript compiler adapter for JS/TS; Alegor starts with zero-dependency Git/docs re-entry. Both operate locally without paid AI, keep state outside scanned roots, and never execute scanned-project scripts. Visu code and paid refreshes remain paused. Gource/Codevis and Skales/original Notion are explicit research checks, not assumed earlier coverage.

### Blockers / limits

None before implementation. Personal transcript integration is outside this slice; technical inference and document interpretation must expose unsupported or uncertain evidence.

### Next

Integrate each independently tested core/UI, run real-project and copy-based change trials, inspect screenshots and fix UX findings, then verify and promote both tracks with measured evidence.

## 2026-10-21 — Grafe core and web integration

### Accomplished

Integrated the bounded TypeScript-checker source explorer, CLI, immutable local history and focused graph/evidence UI. Parent Node verification passed 10/10 with zero skips; worker browser checks passed 14/14, and parent visually inspected corrected screenshots.

### Decisions

Treat dynamic test mentions as candidates, never confirmed test coverage. Keep manual full-scope rebuilds and content-addressed no-op reuse explicit.

### Blockers / limits

No open core/UI acceptance blocker. Full-repository semantic coverage, runtime dispatch and per-file incremental caching are not claimed.

### Next

Complete integrated pilot evidence, detailed dossier reconciliation and parallel Alegor integration before final promotion.

## 2026-10-21 — Alegor core and web integration

### Accomplished

Integrated the zero-dependency Git/docs snapshot core, CLI and protected local web app. Parent full regression run passed 57/57, including all 12 Alegor cases. Browser checks passed for citations, persistent themes, compact details, unavailable-history wording, keyboard and mobile layout.

### Decisions

Keep snapshots manual and immutable outside source roots. Distinguish observed Git facts, declared plans and unknown next steps. No model calls or personal transcript scanning.

### Blockers / limits

No open acceptance blocker. Rule-based source selection and the 40-commit history window are bounded; session connectors and autonomous actions remain future work.

### Next

Publish the completed real-project/copy trials and source genealogy, then verify both tracks at their committed implementation state and promote together.

## 2026-10-21 — Integrated MVP trials, UX and research reconciliation

### Accomplished

Both main-workspace MVPs passed the 57/57 regression suite. Grafe's final browser run passed 16/16 with zero errors; Alegor's citation, theme persistence, progressive disclosure, mobile/keyboard, project-switch and unavailable-range checks passed. Both were tested on Represent and Plane Sync, including copy-only changes and source-preservation proofs. Detailed per-track dossiers now separate inspected references, executable trials, adopted ideas and remaining limits.

### Decisions

Manual local snapshots, zero model calls, evidence before interpretation. Grafe uses a bounded full rebuild and explicit candidates/diagnostics; Alegor uses captured Git/docs and leaves absent next steps unknown. Main Notion notes were read directly, Gource was executed, divan/codevis remains unavailable at its exact URL, and Skales's public documentation/distribution was inspected without claiming private source or an app run.

### Blockers / limits

No known acceptance failure remains. Neither broad monorepo coverage nor unaided human usability is established. Personal session ingestion, IDE integration, runtime tracing, generic scene interoperability and hosted service remain later work. Visu implementation and paid refreshes were untouched.

### Next

Verify focused suites at the committed implementation HEAD, promote both trackers with their references, then continue independent larger-project and re-entry validation tracks.

## 2026-10-21 - Promote Grafe and Alegor local MVPs

### Accomplished

Final implementation/evidence commit 8a781edf0d929212c22364af8b3b7c1faacb8612 passed focused Grafe 10/10 and Alegor 12/12 suites with zero skips. Both verification events were recorded at that HEAD and both promotion checkers passed. Earlier integrated regression verification passed 57/57, Grafe browser verification 16/16, and Alegor interaction checks passed. Archived both trackers to impl/, added reference/capability/index entries and reconciled current state.

### Decisions

Keep Grafe and Alegor as independent active product tracks; Visu remains paused. Detailed dossiers are the research/test audit trail, distinguishing Gource execution, unavailable divan Codevis, separate KDE Codevis docs, Skales public-material inspection, and direct Notion reading. Manual local updates require zero model calls.

### Blockers / limits

No open machine acceptance blocker. Reference content and product usefulness still await human review. Bounded JS/TS scope, rule-based Git/docs interpretation, unknown runtime edges and history limits remain documented. Unrelated methodology and raw Notion files were preserved outside these commits.

### Next

Grafe: larger multi-package scope and unaided navigation, then editor-follow/minimap and incremental indexing. Alegor: unaided re-entry, then an explicitly selected session preview with measured false/missed links. No push or public deployment performed.

## 2026-10-21 — Represent OS, Gource, Dot and Skales research

### Accomplished

Synthesized the detailed Gource/Grafe, Dot/Skales/Alegor and execution-runtime research notes into the standalone [Represent OS design and runtime report](../research/reports/Represent%20OS%20design%20and%20runtime.md). Added a protocol-compliant annotated ingestion vector, Ghost and embeddability plans, citation distinctions, and bootstrapping steps. Indexed the report and the accompanying [interactive concept infographic](../../experiments/represent-os-concept/index.html), and linked its source-note cluster.

### Findings and recommendations

The local Gource 0.53 exports demonstrate a clear history-replay metaphor, with crowded labels and large raw frame output; they do not demonstrate semantic architecture or browser performance. Original divan Codevis remains unavailable at its checked URL; KDE Codevis is a separate documented project. The exact Skales public repository and guide were researched, but the proprietary application was not run. Dot's screenshot and official help support interaction lessons, not assumptions about its private runtime. Recommend Represent Workspace as a web shell over project artifacts, with optional execution only for workflows that need it.

### Limits

The report and infographic are research artifacts, not an accepted OS/runtime decision or implementation. No provider was provisioned, no container was started, and no paid AI or image generation was used for this work. Visu remains paused; current Grafe/Alegor MVP state is unchanged.

### Next

Review the recommendation before creating any integrated workspace or execution-runner implementation tracker. A future runtime comparison needs a named real task and bounded workload first.

## 2026-10-21 — Compare Represent with the Orkest platform direction

### Accomplished

Read the deep-research report-writer and Represent documentation protocol, then synthesized the Orkest platform/company-stack source notes, prior Represent OS report, Orkest Multica/CloudCLI guide, unattended-work status, Ghost Orkest tracker and current adapter interfaces, Represent tool references, and the user-supplied runner/verifier comparison. Added [Represent within the Orkest platform](../research/reports/Represent%20within%20the%20Orkest%20platform.md) and indexed it with the three source notes.

### Decisions

The report compares the earlier separate Represent Workspace thesis with the user's broader Maremoto AI developer-tooling product-line intent and Orkest-first platform approach. It keeps Visu as a first-class Represent tool while its implementation remains paused, and recommends a small project/task-to-Represent-artifact integration proof before adding a new shell or execution layer. The report treats the user's unmanaged-agent and Multica-parity direction as current product intent, while distinguishing it from readiness verified in the inspected source snapshot.

### Blockers / limits

No active Claude Code session was inspected, no Orkest or Ghost decision was changed, and no services, runners, containers, provider credentials, or infrastructure were started or inspected. Source notes record repository heads and identify stale/conflicting summaries. The report is a research recommendation, not an adopted architecture or approval for runner provisioning.

### Next

Reconcile the report's Orkest readiness caveat with the operator's active unmanaged-agent work before planning implementation. If the product boundary is accepted, define the smallest project/revision/artifact link and prove it in Orkest using one current Represent tool; leave unattended runner and verifier work to their existing gated tracker.

## 2026-10-21 — Close exploration learning and preserve Visu

### Accomplished

Closed the Atlas/reference/ROMPE/Visu/Grafe/Alegor/Represent OS sequence into [Represent exploration learning record](../research/reports/Represent%20exploration%20learning%20record.md). Added [Keep the Visu experience at hand](../guides/visu-experience.md) with screenshots, code seams, manual capture/explain/illustrate behavior, cache/cost evidence, limitations and local-history preservation. Verified 65 local links across the two new documents, required learning sections, existing ROMPE/Luz/ImageLab store directories and documentation whitespace. These are documentation checks, not reruns of earlier paid pilots or application suites.

### Decisions

The owner explicitly wants the liked Visu experience kept inside Represent. Keep every working tool and trial artifact, preserve the earlier OS proposal as historical learning, and mark the original scanner-first tracker as historical rather than falsely completing its unchecked boxes. The next cursor is the new design-first TODO section: revalidate Orkest/Ghost, draft the design, have Opus 5.5 audit/improve it, then bootstrap a bounded implementation plan. No new integration IMPL is created in this closeout. Durable reading order and audit/bootstrap requirements are in the learning record; the handoff is disposable scratch.

### Blockers / limits

No application code, images, source projects, provider configuration, runtime infrastructure or local history was changed. Visu history under .represent/visu remains ignored and is not included in a fresh Git clone; tracked trial evidence is retained, and the guide explains deliberate export. Earlier test counts and model charges remain historical observations. Existing unrelated methodology and Notion worktree changes are excluded. Opus 5.5 has not audited or bootstrapped the new design yet.

### Next

Create the ignored REPRESENT-ORKEST-DESIGN handoff from the verified checkout, then resume [Represent within the Orkest platform](../research/reports/Represent%20within%20the%20Orkest%20platform.md) in a fresh design-first session. Recheck current Orkest work rather than trusting old source snapshots or resuming the original bootstrap tracker. Preserve Visu's visual/interaction quality bar throughout design and audit.

## 2026-10-24 — Represent within Orkest: design, audit and bootstrap

### Accomplished

Revalidated Orkest and Ghost state on 2026-10-24 (Orkest `8f96ded`, Ghost `cc920933` committed files only): the cockpit fork is done and deployed on the lab1 dashboard with Orkest on, adapter Phase 3 and session readers Phase 5 are done, the unattended path is still gated in ORKEST-FORK Phase 4 (OQ-8 approved 2026-10-23, 4.2 kit offline, no daemon or agent has run). Drafted [Represent within Orkest: platform design](../research/reports/Represent%20within%20Orkest%20platform%20design.md): target user and five jobs, product/brand/repo boundaries, an artifact record `represent.artifact/v0` plus a small hub as the seam, three stages (record and CLI, hub, one GhostShell layer by the RIMA precedent; Alegor companion design-only), Visu hosted not rebuilt, one Plane Sync end-to-end trace with exists/stage/gated marks, a five-change UX design round, AI and auth boundary, standalone path, costs and three open questions. Ran an independent Fable 5.1 audit (fifteen findings) and folded every one in. Bootstrapped [REPRESENT-ORKEST-IMPL](represent-orkest.imp.md) with phases 0 to 5, owned files, nine tests, Plane Sync trials and two UX rounds. Updated CONTEXT (four decision rows, direction, sprint), TODO cursor, README index.

### Decisions

Orkest is the host; Represent contributes tools and portable artifacts and is never in the trust chain. Hub after the record and CLI attach are proven; tool pages never call the hub; the hub spawns tools with a token it generates; loopback only. Hub store outside every project root (`%LOCALAPPDATA%/Represent/hub/`), because Alegor refuses a store inside a configured root. Host project id is the methrep workspace id, case-folded. Stage B owns one layer plus the same shell-core proxy wiring RIMA needed. "Compose from this" is open-for-box plus clipboard, because Orkest's composer prefills only a box id. Product keeps "Represent"; methrep keeps its name. All four rows await the operator's confirmation in REPRESENT-ORKEST.0.1.

### Blockers / limits

Audit corrections worth remembering: Grafe and Alegor stores default to `%LOCALAPPDATA%/Represent/<tool>`, not `.represent/`; Grafe does not record HEAD and has no symbol URL routing (new Phase 1 work); the adapter's board writes sit behind Father's internal route and no Orkest UI write path is live; "in production" was an overstatement (Phase 6 open). Loopback view URLs only open from a lab1 browser. The Ghost working tree was dirty and was not inspected. No code, service, runner, credential or provider was changed; no paid run. The design's three `../../../../Ghost/...` links resolve from `D:/ware/represent`, not from inside a worktree. The handoff remains ignored scratch. This work landed on branch `claude/represent-orkest-design-a4fc91`, cut from `codex/represent-v0` at `0e80bcc`; it fast-forwards onto that branch.

### Next

Operator Phase 0: confirm or override OQ-1 to OQ-3 and the boundaries (0.1), review the design UX mockups (0.2, 0.3). Implementation of Phase 1 waits for that review. Visu stays paused; Grafe and Alegor follow-ups stay deferred.

## 2026-10-24 — Project audit report

### Accomplished

Fast-forwarded `codex/represent-v0` to the design commit `d46a4cf` in the main checkout. Ran the full suite from that checkout (57 pass, 0 fail, 85 s) and measured Git, store, experiment and source state. Wrote [Represent project audit 2026-10-24](../research/reports/Represent%20project%20audit%202026-10-24.md): a graded state table, nine ranked findings, six ordered next steps, twelve tool improvements and ten feature ideas with what each would prove.

### Decisions

None taken; the report ranks them for the operator. Housekeeping (push, real CLAUDE.md, methodology reconciliation, README) is recommended before Phase 0 of REPRESENT-ORKEST.

### Blockers / limits

Findings of note: 21 commits unpushed; the untracked `CLAUDE.md` is an unfilled template; the uncommitted `.ghostdev/version.json` bump drops rules, skills, hooks and the status line; no Grafe or Alegor store exists at the `%LOCALAPPDATA%` default; `.represent/alegor-restart-sessions-copy` holds 89 MB of private captured session data with no backup. Sizes were measured, contents of ignored stores and `notion/` were not read. No model call or paid run.

### Next

Operator reads the report; housekeeping day; then Phase 0 of the tracker.

## 2026-10-25 — Trazo POC: design, tracker, plan number one

### Accomplished

Pushed `codex/represent-v0` to origin (first push of the branch; 22 commits). Wrote [reference/trazo-poc.md](../reference/trazo-poc.md): answers to whether a resident proactive artist companion can be a working POC and a product, the experience script, the five unknowns with pass criteria, architecture (watcher, discovery snapshot, fact graph, deterministic SVG sketch with four levels, one cached explanation, templated infographics with citations, optional Visu illustration, loopback viewer with SSE, nudges with budget, Claude Code hook, stdio MCP), stack decision with alternatives, data model, reuse table, security, four-week plan, open-core service path, risks. Bootstrapped [REPRESENT-TRAZO-POC-IMPL](represent-trazo-poc.imp.md) with eleven tests and weekly phases. Made it plan number one in CONTEXT, TODO and README; REPRESENT-ORKEST deferred behind it. Built a private investor-facing artifact page summarizing the POC for technical readers.

### Decisions

Operator: the Trazo POC is the number-one plan now. Defaults pending operator confirmation in 0.1: codename Trazo, Apache-2.0, `fs.watch` recursive with polling fallback, Mermaid for graph views and hand-built SVG for the sketch, store under `%LOCALAPPDATA%/Represent/trazo/`. The design lives in `reference/` by the operator's request although it is pre-implementation; it is rewritten as-built on promotion.

### Blockers / limits

Nothing implemented; no model call or paid run. Codename, licence and trial folders are the operator's. No market validation; the public repository is the demand instrument. The artifact page is private until the operator shares it and is not a financial offering.

### Next

Operator Phase 0 (REPRESENT-TRAZO-POC.0.1), then week 1 sketch with a stop-or-go verdict at 1.7.

## 2026-10-25 — Trazo POC week 1: zero-AI sketch built and trialled

### Accomplished

Phase 0 recorded (operator confirmed the defaults). Week 1 of [REPRESENT-TRAZO-POC-IMPL](represent-trazo-poc.imp.md) implemented: `src/trazo/cli.mjs` and `consent.mjs` (read plan printed, `[y/N]` consent per canonical path, store outside the folder, revoke and list), `facts.mjs` (bounded capture through Visu's discovery, import scanners for JS/TS, Python, C#, Go, Rust, Java/Kotlin, Markdown sections, last 40 commits through Alegor, stable ids, level floors, lazy Grafe symbols), `sketch.mjs` (deterministic SVG: id-ordered strip treemap, curved module arrows, history strip, poster/guide/engineer/deep), `server.mjs` and `web/trazo/` (loopback, per-process token in a meta tag, exact Host and Origin, CSP, dial with keys, three themes, status strip, ledger). Library seams: `discovery.inventory`, `grafe.indexFiles`, `alegor.readHistory`. Tests: 10 new, suite 67 pass. Trial on Represent, Plane Sync, luz and `D:/ware/docs` under [experiments/trazo-poc/week1](../../experiments/trazo-poc/week1/README.md): first sketch 0.44 to 0.78 s warm, dial switches under 15 ms, zero model calls, zero network.

### Decisions

Token delivered through a `<meta>` tag because the viewer's CSP forbids inline scripts (found in the browser, fixed). Module widths blend an equal share with weight so small modules stay labelled; rows cap their item count. Alegor's git helper ignores stderr so non-git folders stay quiet. Attribution trailer `Claude Fable 5.1` as in the previous commits.

### Blockers / limits

Cold first capture of a large folder can take up to 13.6 s on this machine (Windows file cache, measured; warm 0.3 s). Path aliases unresolved, so luz shows no module arrows. Deep level lists symbols without drawing calls. TEST.5's one-file-change measurement is deferred to week 4. No model call or paid run.

### Next

Operator verdict (1.7): go to week 2, go after layout fixes, or stop.

## 2026-10-25 — Trazo POC week 2: explain and compose built, paid trial pending

### Accomplished

Verdict 1.7 recorded (go). Week 2 of [REPRESENT-TRAZO-POC-IMPL](represent-trazo-poc.imp.md) built: `src/trazo/explain.mjs` (excerpt set from Visu's discovery with a bounded loader, preview with estimate, explain only with a Ghost client, `confirm: true` and under a per-call cap; cache by excerpt set, prompt version and model; vocabulary for document folders), `src/trazo/compose.mjs` with `web/trazo/templates/` (six-chapter infographic: captions, module tags, confidence dots, clickable citations, import arrows, legend, freshness and STALE line; Mermaid flowchart text), `src/artifact/record.mjs` (`represent.artifact/v0` builder and validator), server endpoints (preview, explain, explanation, citations, infographic, mermaid, artifact, ledger) and the viewer flow (preview modal, priced button, views, citation popover). Visu seam: `analyzeProject` takes an optional vocabulary note. Tests: 5 new, suite 72 pass. Previews with estimates for the four folders recorded under [experiments/trazo-poc/week2](../../experiments/trazo-poc/week2/README.md) together with a fake-analyzer demo run. Zero model calls.

### Decisions

Explanation reuses `analyzeProject` whole (six chapters, validated citations, withheld claims) rather than a new prompt; Trazo attaches chapters to fact-graph modules afterwards. Price estimate fitted to Visu's measured history and labelled as such; the ledger records the gateway's reported cost. Mermaid stays text in the viewer so no request leaves loopback. Artifact record written beside every explained snapshot with the quote hashes as evidence.

### Blockers / limits

The paid trial (2.4) needs `TRAZO_GHOST_KEY` in the shell that launches Trazo; none is set here and the key is never read from files. Three of four folders estimate at $0.066, above the design's $0.05 line; Plane Sync at $0.043. Chapter-level redraw and nudges are week 3. No model call or paid run.

### Next

Operator runs the four explanations with the key, rates ten statements per folder (2.5); then week 3 (watcher, nudges, SSE, hook, MCP).

## 2026-11-15 — REP-8: CLAY-NOTES

### Accomplished

- Created a grounded plan-only tracker.

### Decisions

- Allocate identity locally; implementation evidence remains unclaimed.

### Blockers

- See tracker questions and dependencies; implementation is still unverified.

### Next

- Execute the first runnable phase under the Orkest workflow.

## 2026-11-15 — REP-8.1

### Accomplished

- Implemented durable video notebooks, bounded caption parsing and the Ghost summary/question contract. Nine offline behavior tests passed; meaningful video-deduplication red preceded implementation. Source checkpoint 0c299bd.

### Decisions

- Keep gateway credentials server-side and preserve source segments with every revision. Use a tiny TAP-summary adapter because this installed Orkest release does not parse Node TAP counts; counts derive from the real runner.

### Blockers

- Live gateway calls require a dedicated Clay Notes consumer key. Chrome capture and UI remain phase 2.

### Next

- Implement authenticated loopback API, Satoshi/clay web surfaces and unpacked Chrome extension.

## 2026-11-15 — REP-8.2

### Accomplished

- Implemented the authenticated local service, durable asynchronous summary queue, Satoshi/clay library and notebook, and unpacked Manifest V3 YouTube capture extension. Fifteen offline domain/API/extension-contract checks pass with no skips.

### Decisions

- Pair Chrome with a local random token; keep the Ghost virtual key exclusively in service memory. Use a buildless ESM web shell with bundled Satoshi fonts and licence. Save/open a notebook before caption extraction; offer transcript paste if YouTube does not expose captions.

### Blockers

- Browser interaction QA, actual installed-extension capture and paid gateway trial remain distinct from fixture tests. The latter needs a dedicated consumer key.

### Next

- Inspect the library/notebook in a browser, exercise extension worker behavior, run existing tool regressions and document verified limits.

## 2026-11-15 — REP-8.3

### Accomplished

- Completed the local Clay Notes implementation, read-only source review, 24 focused behavior checks and twelve browser checks. Full strict gate 20261115T202648Z-clay-notes-full-14470a96 passed 96/96, zero failures/errors/skips in 40.2s. Source checkpoint caaf831. Added operating guide, local font licence, fixture screenshots and doctor summary.

### Decisions

- Reserve transcript queue slots before asynchronous mutation; preserve clear saved-but-needs-transcript feedback. Support first-configured model when cheap is not enabled. Existing Represent consumer permits json/gemini-flash only; no key scope or allow-list changes were made. Full Git-heavy test files run serially with a 60-second file timeout; targeted files retain 15 seconds.

### Blockers

- No installed-Chrome capture or real gateway response was verified. A live trial requires loading the unpacked extension and an authorized consumer key; fixture results do not complete it. Initial full run with a 15-second file timeout canceled two files; the corrected serial full gate passed all 96. Repository doctor still reports nine legacy evidence errors, eighteen warnings and nine informational findings.

### Next

- Finish final documentation reconciliation, committed-head verification, audit and local-MVP promotion. Then perform the external video/gateway trial when credentials and Chrome pairing are configured.

## 2026-11-15 — Promote CLAY-NOTES

### Accomplished

- Archived the evidenced tracker after fresh tests and final audit.
- Boxes: 3 earned by the helper, 0 adopted (shipped before the helper, accepted by a person).

### Decisions

- The person-invoked default run authorized this promotion.

### Blockers

- No remaining promotion gate.

### Next

- Review the promotion commit and reference when needed.

## 2026-11-15 — REP-9: CLAY-NOTES-RELEASE-PREP

### Accomplished

- Created a grounded plan-only tracker.

### Decisions

- Allocate identity locally; implementation evidence remains unclaimed.

### Blockers

- See tracker questions and dependencies; implementation is still unverified.

### Next

- Execute the first runnable phase under the Orkest workflow.

## 2026-11-15 — REP-9.1

### Accomplished

- Prepared own-key summary/deep gateway request at the exact requested handoff path and committed durable copy. Created full extension release/deployment/rollback plan and three-video trial matrix; validated required fields offline.

### Decisions

- Operator confirmed: Yes, summary is default (recommended). Request new clay-notes key LITELLM_KEY_CLAY_NOTES with proposed $1/30d backstop; never reuse Represent/Operator keys. Ten interface languages including Arabic RTL are the default scope.

### Blockers

- Gateway Apply SHA, own-key lane tests and separate paid-call approval remain pending. No gateway mutation or inference was performed.

### Next

- Implement independent localization and package/source-only testing while gateway flow waits at operator review.

## 2026-11-15 — REP-9.2

### Accomplished

- Implemented ten-language authored web copy, native Chrome locale metadata/options/actions, persistent language selection, locale dates and Arabic RTL. Focused suite29/29 passed. Browser Spanish library/save dialog, Arabic layout/reload persistence and390px mobile RTL fit passed; screenshots captured in temporary QA files for phase3 evidence.

### Decisions

- User titles/transcripts/personal notes/model output retain their original text. Language changes affect authored UI; generation-language wiring waits for gateway Apply. Non-Latin glyphs use system fallback when Satoshi lacks them.

### Blockers

- Gateway request remains pending operator Apply and live paid approval. No inference made. Existing service fixture polling and15s worker timeout were intermittent; bounded repeat passed, and phase3 will strengthen harness diagnostics rather than hide failed runs.

### Next

- Build reproducible extension ZIP and export adapter, ingest real transcripts into isolated trial notes with no summary calls, record evidence and verify all tools.

## 2026-11-15 — REP-9.3 partial source checkpoint, not verified

### Accomplished

- Prepared0.2.0 allow-listed ZIP and source-only trial records for three real transcripts, with1481 segments/58387 characters and zero inference. Preliminary34/34 runs passed, but later integration receipts failed; this checkpoint does not earn the phase box.

### Decisions

- Preserve prepared source in an exact-path intermediate commit, then commit an amended phase plan before the needed repairs and new settings scope. Actual diagnostic captured Windows EPERM on rename; queued-job failures are not dismissed as scheduling noise.
- User broadened product to multi-source notebooks, requested gear-menu language/theme Automatic controls and tactile TCG cards. Future NotebookLM feature planning follows current implementation, not immediate unbounded format implementation.

### Blockers

- Website authentication message is wrong for the web UI; shared host cookies across QA8880 and main8876 can collide. Add port-specific cookies, auto web-session recovery and localized feedback. Gateway Apply/paid permission still pending.

### Next

- Re-plan the bounded phase with explicit core/server/UI/test paths, repair atomic replacement and web authentication, then implement requested settings. Earn fresh test evidence before checking any box; TCG library and general-notebook roadmap follow.

## 2026-11-15 — REP-9.3

### Accomplished

- REP-9.3 source checkpoint51c5825: deterministic extension ZIP0.2.0, three source-only transcript trials (1481 segments/58387chars), Windows atomic-replace and web-session regression fixes, persistent language/appearance settings.
- Strict phase gate20261115T221428Z-clay-release-phase3-b85385ae passed113/113 with0failures/errors/skips at51c5825; focused41/41 and browser saved English/dark reload verified.

### Decisions

- Website cookie namespace follows loopback port; one bounded auth bootstrap replaces the misleading extension-pairing web error. No customer auth claim follows from local session repair.
- User expands delivery to Google-auth SaaS atclay.maremoto.dev, no Cloudflare Access/local setup, full-art TCG cards, image covers, immediate cached collection; next committed phases own this work.

### Blockers

- Own-key gateway Apply SHA/lane-test and separate live paid-call allowance remain absent. No real summaries, extension install/store publication or hosted auth/deploy claimed.

### Next

- Commit grounded phase4 for cache-first full-art TCG cards, persisted reorder/filter/sort and validated image attachments; phase5 revises public gateway request and writes hosted Google/extension deployment plus general NotebookLM roadmap.

## 2026-11-15 — REP-9.4

### Accomplished

- REP-9.4 source checkpointd177508 implements cache-first full-art TCG collection, default YouTube art, validated image attachments/covers, saved filtered reorder, sorting/search/filtering and reduced-motion-aware native effects.
- Focused46/46; strict full gate20261115T223610Z-clay-tcg-phase4-69a57571 passed118/118 atd177508, zero failures/errors/skips. Browser desktop light/dark,390px Arabic RTL, settings, saved keyboard order, sort/search/filter, image upload/cover/reload/default restore verified; screenshots committed.

### Decisions

- Native CSS3D/Pointer Events/Web Animations retain buildless stack. Image bytes are authenticated files with8-per-notebook/2MiB limits; existing thumbnail is default. Images are not yet OCR/vision sources.
- Cache holds minimal local card metadata for seven days before independent notes/config refresh; hosted release must scope it per account and purge at signout. Read-only implementation review found no concrete blockers.

### Blockers

- Physical pointer dragging was source reviewed but not directly automated by available browser APIs; keyboard movement and persistence were exercised.
- Hosted Google auth, own-key Apply/lane tests, live paid allowance and Web Store publication remain unperformed; no model summaries fabricated.

### Next

- Commit phase5 hosted Google/no-Access/no-pairing deployment and future general-notebook roadmap; revise the unapplied gateway request for customer audience before operator Review.

## 2026-11-15 — REP-9.5

### Accomplished

- REP-9.5 documentation checkpointb1d08b9 records a concrete Google-auth SaaS/extension deployment plan forclay.maremoto.dev and a sequenced general NotebookLM-style roadmap after current TCG work.
- Revised durable and ephemeral own-key request for public audience, cheap summary/default, optional client-anthropic deep, proposed Max forbid and test-only$1/30d backstop. Offline contract/link check verified4docs/29local links; independent read-only review found no blockers.

### Decisions

- Customers use Google accounts with existing-session extension handoff or one normal initial sign-in; no Cloudflare Access, pairing code or local service. Current local shared-session server must never be simply exposed publicly.
- Proposed Node/lab1 app-only HTTPS edge retains private gateway; account ownership, PostgreSQL jobs/spend reservations, per-account cache purge and stable-ID PKCE extension flow are implementation slices, not deployed claims.
- Broad notebooks roadmap separates multiple source types/versions/citations from current YouTube captions and image attachments; OCR/vision, rich studio and sharing remain future capabilities.

### Blockers

- Operator Google client/callback/stable extension-ID configuration, hosted code/deployment, gateway Apply SHA/lane-test and separate paid allowance are not yet supplied/executed. No credentials read or shared, no registry/queue/runner mutation, no live inference/store publication.

### Next

- Finish final committed-head regressions/audit and promote this preparation tracker. Next hosted implementation earns the documented account/isolation/job/extension slices; operator reviews the revised request, applies it and returns SHA/lane-tests before gateway wiring.

## 2026-11-15 — Promote CLAY-NOTES-RELEASE-PREP

### Accomplished

- Archived the evidenced tracker after fresh tests and final audit.
- Boxes: 5 earned by the helper, 0 adopted (shipped before the helper, accepted by a person).

### Decisions

- The person-invoked default run authorized this promotion.

### Blockers

- No remaining promotion gate.

### Next

- Review the promotion commit and reference when needed.

## 2026-11-16 — REP-10: NOTCARDS-DEV

### Accomplished

- Created a grounded plan-only tracker.

### Decisions

- Allocate identity locally; implementation evidence remains unclaimed.

### Blockers

- See tracker questions and dependencies; implementation is still unverified.

### Next

- Execute the first runnable phase under the Orkest workflow.

## 2026-11-16 — REP-10.1

### Accomplished

- Built Notcards' account-scoped development service, Google web sign-in, hosted Chrome capture package and isolated Docker deployment. Signed-in fixture coverage verifies session isolation and grant scope.
- Matched the light pocket and dark album layouts with actual video full-art covers. Chromium showed the capture button on all three supplied videos and rendered both desktop themes and the 390-pixel mobile collection.

### Decisions

- Use not.maremoto.dev for development, reserve not.cards for production, and use Google identity directly. The unpacked development extension ID is aimdojafaddgpjhiejbfihfljeacolmk.
- The existing Ghost request retains its technical key and lane names. Hosted capture saves source material while inference awaits operator onboarding.

### Blockers

- Published the proxied development DNS record and configured the dedicated Google web client. The public sign-in reached Google’s account chooser. Real account consent and capture remain acceptance steps. No Ghost Apply SHA, lane-test result or paid-call approval was supplied.

### Next

- Verify the public dev origin, real Google login, and first and repeat captures in Chrome after DNS and the web client are available. Follow the service roadmap for source-grounded research tools and production distribution.

## 2026-11-16 — Promote NOTCARDS-DEV

### Accomplished

- Archived the evidenced tracker after fresh tests and final audit.
- Boxes: 1 earned by the helper, 0 adopted (shipped before the helper, accepted by a person).

### Decisions

- The person-invoked default run authorized this promotion.

### Blockers

- No remaining promotion gate.

### Next

- Review the promotion commit and reference when needed.

## 2026-11-16 — REP-11: NOTCARDS-COMPOSER

### Accomplished

- Created a grounded plan-only tracker.

### Decisions

- Allocate identity locally; implementation evidence remains unclaimed.

### Blockers

- See tracker questions and dependencies; implementation is still unverified.

### Next

- Execute the first runnable phase under the Orkest workflow.

## 2026-11-16 — REP-11.1

### Accomplished

- Shipped a retry-safe inline collection composer with first-link source detection, opt-in splitting, a saved desktop card size and a centered mobile feed.
- Corrected grant expiry and structured-caption compatibility for the released Chrome worker. Built a separate Web Store package and documented how the publisher registers its assigned ID.

### Decisions

- Only the first original link can qualify for a YouTube summary. The first split card keeps the entire original draft.
- Retain the unpacked extension identity alongside the optional exact Store item ID.

### Blockers

- The dashboard must assign the Store item ID before its real sign-in can be tested. The publisher supplies the privacy policy and reviewer access. AI generation awaits the dedicated Ghost gateway approval.

### Next

- Register the assigned Chrome Web Store item ID on the development service and verify capture under that identity before submitting the listing for review.

## 2026-11-16 — Promote NOTCARDS-COMPOSER

### Accomplished

- Archived the evidenced tracker after fresh tests and final audit.
- Boxes: 1 earned by the helper, 0 adopted (shipped before the helper, accepted by a person).

### Decisions

- The person-invoked default run authorized this promotion.

### Blockers

- No remaining promotion gate.

### Next

- Review the promotion commit and reference when needed.

## 2026-11-16 — REP-12: NOTCARDS-WEB-NOTEBOOK

### Accomplished

- Created a grounded plan-only tracker.

### Decisions

- Allocate identity locally; implementation evidence remains unclaimed.

### Blockers

- See tracker questions and dependencies; implementation is still unverified.

### Next

- Execute the first runnable phase under the Orkest workflow.

## 2026-11-16 — REP-12.1

### Accomplished

- Fixed the unpacked extension origin error reproduced in Chromium with an ambient website cookie alongside the scoped grant. The real YouTube button saved timestamped captions and opened a private notebook after the change.
- Added a full notebook on card activation, a video player, editable notes and tracked background imports for public YouTube metadata and captions.

### Decisions

- The web app is the primary entry. Opening a card never creates a chat. Direct takeaways are gated on the dedicated gateway Apply. Card chats belong to Botanic after an owner-verified first question.

### Blockers

- Notcards has no dedicated gateway key or registered live Botanic integration. Public caption tracks can return empty bodies.

### Next

- Complete the owner-bound card conversation lifecycle and present the Botanic deployment change for review. Obtain the operator's gateway Apply SHA and lane-test results before live inference.

## 2026-11-16 — REP-12 signed-in video acceptance

### Accomplished

- Imported all three supplied links in the hosted web app using Google sign-in. Verified titles, video sources, player frames and saved transcripts by reopening the three cards. Corrected stale form submission and refresh races, duplicate transcript fields, misleading capture states, and the hosted chat status. Deployed `bde295e` to the development site and verified its captions-ready and Botanic-unavailable states there. The focused suite passed 17 tests and a Chromium navigation regression passed with two distinct private notes.

### Decisions

- The operator approved the lab1 one-shot executor and the console-generated cheap alias. The requested summary lane stays the public key’s default and all lanes share USD 1 per 30 days. Represent’s Codex reserve is a separate project setting.

### Blockers

- The dedicated host credential exists and policy Review passed. The live gateway Apply could not reach localhost during preflight. Windows had no assigned lab1 Tailscale address or gateway listener. No administrative transaction remained pending on disk.

### Next

- Restore the shared gateway binding with operator approval, retry its reviewed configuration and record the resulting commit. Verify automated caption retrieval, direct summaries and the native Botanic owner binding before promoting REP-12.

## 2026-11-16 — REP-12 development notebook and lab1 repair

### Accomplishments

- Restored Tailscale and both original LiteLLM bindings. The host and development app reached the gateway. Retried the reviewed Apply and verified rollback on pre-existing drift.
- Deployed the summary adapter and native Botanic handoff to the development web app with inference disabled. Verified the refreshed signed-in NEAR notebook retained its 90 segments. The complete platform gate passed 186 tests across Linux and Windows NTFS.
- Tested signed conversation binding, reopening, duplicate and out-of-order callbacks, deletion and explicit fresh launch on loopback. Tested all three real transcripts against local deterministic transport, including a deep redo.

### Decisions

- A card retains its transcript and personal notes when a signed Botanic deletion receipt arrives. Only sending a new question initiates a replacement conversation. Google subject and original launch ID bind each receipt to its owner and card.

### Blockers

- The live gateway rejected the global check for four unserved Codex subscription lanes and three existing Botanic Max grants missing from the registry. There is no successful Apply SHA. Production Botanic still needs native route and message hooks and signing configuration.

### Next

- Reconcile the shared registry through the reviewed maintenance flow, then verify the dedicated lanes. Follow with bounded live summaries after operator approval and a real native Botanic login, send, reopen and delete test in staging.

## 2026-11-17 — Card navigation and caption retries

### Accomplishments

- Deployed `b474908` on the development site. Opened all three supplied videos from the signed-in collection in the same tab. Retried an existing failed Ethereum card, observed YouTube's limit, recovered 76 timed rows through the ordinary transcript panel, and confirmed its real title and source survived reload.
- The cross-platform suite passed 190 tests. The Chromium regression held a folders request open during card navigation, retried a failed import and confirmed saved captions after reload.

### Decisions

- Display the retry time returned by the caption importer. Retain same-owner pasted source provenance when recovering a duplicate video. Enable a first manual retry immediately after generic failures.

### Blockers

- YouTube limited lab1's unauthenticated caption requests. A first-time remote import can still need a later retry or a transcript from YouTube's visible panel. The shared gateway registry still lacks the Notcards key and lanes.

### Next

- Reconcile the shared gateway drift and run the approved-lane checks. Wire the native Botanic hooks in staging before the first real shared chat test.

## 2026-11-17 — Pinned native chat build

### Accomplishments

- Built the Notcards staging image from a disposable checkout of the pinned LibreChat source. The compiled frontend and runtime contain the Notcards route, native composer, post-persistence binding and deletion hooks. The packaged image passed the real Mongo smoke test. The full product suite passed 190 checks and the final signed-in browser regression passed.

### Decisions

- Scope first-turn context to the selected agent and the matching Google subject, question and native conversation. The test uses a temporary Mongo with networking disabled. The hosted ZIP is version 0.3.3.

### Blockers

- The shared Botanic and gateway deployments still need operator action before real inference. Ghost's read-only preparation accepts reconciling Botanic's six existing grants. Lab1's gateway-owned Codex login is still absent.

### Next

- Resolve the four Codex subscription lanes, complete a reviewed Apply, and run the authorized bounded pilot. Configure the shared notes agent and signing keys on the selected Botanic deployment, then validate login, send, reopen and confirmed deletion with a real user.

## 2026-11-17 — Hosted Notcards, account language and shared Botanic

### Accomplishments

- Verified real takeaways from three videos on the signed-in website. Transcript timestamps seek its embedded player. The collection and notebook use monochrome surfaces and blue focus indicators.
- Released ten account languages, per-revision output language and cached translations. Verified original and translated text in Chromium and Arabic right-to-left layout in a new browser profile. The platform suite passed all 194 tests. Browser navigation, retry, embedded timestamp and playback continuity passed.
- Shipped the localized native card launcher to shared Botanic. The packaged Mongo smoke covered verified ownership, first send and confirmed remote deletion. The production container reported healthy.

### Decisions

- The operator authorized the shared rollout, waived an additional test-data backup, and capped the live pilot at USD 1. Direct Notcards usage totaled USD 0.0494749 across eight charged requests. Botanic chats use its existing local model lane.

### Blockers

- The pilot Botanic account requires a fresh Google OAuth callback to confirm its Google subject. At last check, production had no bound card conversation. YouTube had also rate-limited server requests for the trial videos. Their saved transcripts came from the YouTube transcript panel.

### Next

- Send a question from a hosted card after Google sign-in, reopen the same conversation from the card and verify its signed receipt.

## 2026-11-17 — Shared Botanic card launch routing

### Accomplishments

- Reproduced the reported 401 on the public card-launch form. The prior packaged image failed a new mount-order assertion. The corrected image passed the assertion and the existing Mongo ownership, saved-message and deletion checks. The public form now reaches its own validator and protected reads return 401 to an anonymous client.
- Confirmed the pilot owner's verified Google subjects match across Notcards and Botanic.

### Decisions

- Deployed a one-file image change that mounts the signed Notcards router before the parent JWT middleware. Prod1 reports healthy on image `c8d08c1744a0961c6b0ff80a6680028512f888b72d9077146d3326b105753470`.

### Blockers

- The original form submissions stopped before Botanic stored the launch. Live verification needs a fresh card submission from the signed-in browser.

### Next

- Confirm the first native reply, its signed receipt and reopening the same conversation from the NEAR card.

## 2026-11-17 — Native model preset and reusable home preparation

### Accomplishments

- Fixed the native preset selection after the first accepted form failed with “No model spec selected”. Production's own resolver confirms the assistant and preset, and the public client matches the container. The native Mongo smoke and all 194 pre-home platform checks passed.
- Restored the existing lab1 bridge's published port 4001. Prod1 received HTTP 200 through the restored connection. Model completion remains unverified.
- Prepared the optional owner-scoped card/conversation list and pure session-list adapter in commit `6af1916`. Added regression coverage for linked chats, native-only chats, note-only cards, authenticated listing, cross-owner isolation and deleted bindings. Wrote the Botanic adoption plan.
- The complete post-change platform suite passed 195 tests, with zero failures or skips.

### Decisions

- Keep notebook storage and ingestion services reusable while Botanic owns the signed-in home and native conversation UI. Existing chat sessions can appear as cards before they acquire notebook attachments.
- The home preparation is local code. A Botanic rollout still needs the account-scoped API adapter and native board renderer.

### Blockers

- A successful live inference and bound conversation are still pending. The reported Max-model access error and local model health remain part of the Botanic repair work.

### Next

- Adopt the prepared adapter in Botanic, implement the unified two-panel workspace and verify the old-chat and note-only cases alongside the live video chat.
