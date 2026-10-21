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

