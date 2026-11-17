# Represent — Context

> Living doc. Single source of truth for project state, decisions, and current sprint.
> See `DOCS-PROTOCOL.md` for the rules that govern this file.
> Updated: 2026-11-16

## Notcards web notebook (2026-11-16)

The signed-in navigation and caption-retry fix shipped to dev at `b474908`. All three original collection cards opened in the same tab. A fourth card's live retry showed YouTube's rate limit. The visible YouTube transcript panel supplied 76 caption rows; reopening that notebook retained them. The full suite passed 190 tests. The standalone browser check holds a folders response until after navigation, retries a failed import, and verifies captions after reload.

The dev site runs the signed native Botanic handoff and metered summary adapter with both features gated. The 186-test platform suite passed. Loopback tests verify an owned conversation can be bound, reopened, and unlinked after deletion while the card stays intact. Real chat still needs the native Botanic hooks mounted and configured.

The three requested videos were saved through the Google-authenticated web app. YouTube’s visible Show transcript panel provided 165, 191 and 90 timed rows in request order after the automatic importer failed. Each card’s URL, first caption and count were verified after reopening. A signed-in reload of the deployed NEAR notebook retained all 90 segments.

The web app is the primary entry point. Opening a card shows its full notebook, editable notes and source material. YouTube cards include a player. The first submitted question should create one owner-bound Botanic conversation. Removing that conversation in Botanic leaves the card and all saved notes intact. Direct summaries require the dedicated gateway Apply. The unpacked extension is an optional capture shortcut.

The approved repair restored lab1’s tailnet address and both LiteLLM bindings. Ghost Review passed for the dedicated public key with a USD 1 budget per 30 days and `clay-notes-summary` as default. Apply reached live verification and rolled back. The registry omits three existing Botanic Max grants and declares four Codex subscription lanes while its gateway-owned login is absent. The host credential is reserved. No inference was purchased.

## Notcards collection composer (2026-11-16)

The hosted collection provides an inline note composer with first-link type inference and an optional split per link. Desktop users choose the card size in Settings. Phones open at the collection header and scroll vertically through centered cards. [Implementation](orkest/done/notcards-composer.imp.md).

## Notcards development (2026-11-16)

The user renamed Clay Notes **Notcards** and selected `not.maremoto.dev` for development, with `not.cards` intended for production. The light reference uses clear binder pockets and the dark reference uses a black album. Both use Satoshi, large italic titles and actual full-art video or attached covers. [Development deployment](guides/notcards-dev.md). [Implementation](orkest/done/notcards-dev.imp.md).

Google app authentication and account-scoped notes replace pairing for hosted users. The older local Clay Notes tool retains its developer flow. The existing Ghost request keeps its technical key and lane names across the brand change. Live generation awaits operator Apply evidence and paid-call authorization.

## Current Operating Direction (2026-11-15)

**Verified current state and next delivery:** TCG/cache/image-cover source checkpoint `d177508` and phase bookkeeping `9f96101` pass118/118 full regressions and46/46 focused checks. The user-selected service is `clay.maremoto.dev` with Google app authentication, no Cloudflare Access and no customer pairing/local service. [Hosted service and future notebook plan](design/clay-notes-service-roadmap.md) is intended architecture, not a deployed system. It proposes a private-gateway-connected Node app with account isolation, persistent jobs/spend reservations and an automatic extension account handoff. Existing local pairing remains development tooling only.

**Gateway request amendment:** The unapplied request now proposes audience `public`, forbids `max-broker`, retains the cheap-preset summary lane and uses `client-anthropic` for optional deep regeneration. This is an app policy proposal for a customer service; the gateway guide treats Max/public as a review warning, not a platform ban. The prior smart/Max internal proposal is superseded before Apply. The actual user quote “Yes, summary is default (recommended)” still settles defaultLane only. The proposed$1/30d is an initial test backstop; service launch budget/quotas are not approved. No Apply SHA/lane-test or live paid permission exists.

**REP-9.4 implementation:** Collection cache renders before network, with notes fetched independently from model discovery. Native full-art TCG cards, preserved-order filtering, manual/chronological/title sorting, pointer/keyboard saved reorder and authenticated image attachments/cover selection are implemented. Focused46/46; browser keyboard order/reload, sort/search/filter, upload/custom cover/default restore, desktop light/dark and390px Arabic RTL passed with no overflow. Images are attached as files; OCR/vision is future work. Final phase/full verification still must match committed source. Customer auth/deploy remains planned, not live.

**Current verified boundary:** REP-9.3 checkpoint `51c5825` and bookkeeping `00ba615` pass113/113 full regressions,41/41 focused, with saved English/dark settings verified in the browser. Next user-requested work: cache-first collection independent of model discovery; full-art TCG cards using the YouTube thumbnail, image attachments with a chosen cover, saved reorder/filter/sort and tactile accessible motion. REP-9 phases4–5 own implementation and the hosted/general-notebook plan. No hosted deployment, Google roundtrip or real AI summary is claimed.

**Hosted service decision (latest):** User selects `clay.maremoto.dev`, Google app authentication “as we usually do”, explicitly **no Cloudflare Access**, and no local pairing/server/key setup for customers. The extension should reuse the hosted account session, with one normal Google sign-in when needed; installation alone cannot establish a previously unknown Google account. The loopback MVP is development tooling, not the customer deployment. Revise the un-applied gateway request to customer-facing audience/lanes/budgets before operator Review; no Apply SHA or paid approval has been supplied. Reuse an inspected existing Google-auth/hosting pattern, keep gateway credentials server-side and record external OAuth/domain deployment prerequisites explicitly.

**Latest user steering:** Clay Notes is a general multi-source notebook product; videos are the initial adapter, not the product boundary. After current work, plan NotebookLM-style capabilities across supported documents/web/text/audio/images/video. The user also requests language Automatic/manual and Light/Dark/Automatic preferences under a settings icon, and replaces sticky-note cards with tactile TCG-style cards supporting saved reorder, filtering, creation and sorting. A reported website401 exposed shared cookie names across loopback ports and an untranslated extension-pairing error; repair website sessions before UI expansion. A diagnostic also reproduced transient Windows EPERM during atomic JSON rename; fix bounded replacement rather than accepting flaky queued jobs. No live gateway or paid approval has changed.

**Release preparation checkpoint:** Ten-language web/Chrome authored copy is implemented at `070d2af` (29 focused checks); Spanish and Arabic RTL/mobile browser checks passed. All three user video transcripts exported through the native browser without inference. Source-only trial records and reproducible extension ZIP are being prepared under REP-9. No gateway Apply SHA, lane-test result or paid-call approval has arrived; those remain explicit external gates.

**Follow-up decision — own gateway consumer and release preparation.** User: “this app goes through the GhostWare AI gateway ... with its OWN key and its OWN lane. Never borrow LITELLM_KEY_OPERATOR or another app's key” and “No live paid call until the operator says so.” This supersedes the tentative REP-8 suggestion to reuse Represent's Trazo/Visu consumer. Clay Notes requests new key `clay-notes`, envVar `LITELLM_KEY_CLAY_NOTES`, and app-specific summary/deep lanes. The operator answered “Yes, summary is default (recommended)”; request `clay-notes-summary` as default. Budget$1/30d is proposed, not applied. [Gateway request](design/clay-notes-gateway-request.md) follows the agent-to-agent workflow; Apply SHA/lane-test and paid-call permission are pending. [REP-9](orkest/done/clay-notes-release-prep.imp.md) owns localization, packaging, the [release plan](guides/clay-notes-release.md) and source-only trials of the three provided videos. Gateway wiring waits for Apply evidence; independent source/localization work may proceed without inference.

**Clay Notes is the active user-requested tool.** Represent remains a suite: Visu (paused), Grafe, Alegor and the deferred Trazo POC remain intact. Clay Notes adds one-click YouTube capture, automatic transcript statements/conclusions through Ghost, a clay/Satoshi card collection and a full notebook with cited revisions, personal notes and questions. Local implementation and offline/browser validation are in [the operating reference](reference/clay-notes.md) and [evidence](../experiments/clay-notes/README.md). The implementation tracker is [REP-8](orkest/done/clay-notes.imp.md). Live Chrome installation/capture and real gateway success remain unverified; no paid calls or credential/allow-list changes were made. The older operating-direction entries below are preserved history, not the active cursor.

## Current Operating Direction (2026-10-25)

**Plan number one: the Trazo POC.** The operator chose to test Represent's feasibility with one resident, proactive artist companion: run it in a folder, it asks for consent, draws a zero-AI sketch in under three seconds, then explains and illustrates within a budget, with a technical-level dial. Design and four-week plan: [reference/trazo-poc.md](reference/trazo-poc.md) (placed in reference by the operator's request; rewritten as-built on promotion). Tracker: [REPRESENT-TRAZO-POC-IMPL](orkest/represent-trazo-poc.imp.md); Phase 0 is the operator's confirmation of codename, licence and trial folders. It reuses the three tools as libraries and writes the Orkest design's artifact record, so [REPRESENT-ORKEST-IMPL](orkest/represent-orkest.imp.md) waits behind it without being discarded. The investor-facing summary is a private artifact page; see LOGBOOK 2026-10-25. Phase 0 confirmed, week 1 (the zero-AI sketch) built, trialled and passed (verdict 1.7: go) and week 2 (priced explanation through Ghost with preview and cache, chapter infographic with citations, Mermaid text, artifact record v0) built on 2026-10-25, all still with zero model calls; the cursor is the paid week-2 trial (2.4), which needs the operator's gateway key.

## Current Operating Direction (2026-10-24)

**Design drafted, audited and bootstrapped; implementation not started.** [Represent within Orkest: platform design](research/reports/Represent%20within%20Orkest%20platform%20design.md) revalidated the Orkest/Ghost state on 2026-10-24 (cockpit fork live at `/x/orkest`, adapter Phase 3 and session readers Phase 5 done, unattended path still gated in ORKEST-FORK Phase 4) and places Represent inside Orkest through a **portable artifact record** and a **small hub**, with one GhostShell layer following the RIMA precedent. Visu, Grafe and Alegor stay independent, launchable and unchanged in experience; Represent never dispatches, verifies, holds credentials or writes to Multica. The bounded plan is [REPRESENT-ORKEST-IMPL](orkest/represent-orkest.imp.md); its Phase 0 is the operator's review of the design and the five hosting UX changes against the preserved Visu screenshots. No code, service, runner or provider was changed by this step.

## Current Operating Direction (2026-10-21)

**Learning checkpoint closed; design first next.** The exploration through the Atlas/reference study, ROMPE trials, Visu/Grafe/Alegor MVPs and Represent OS infographic is preserved in the [exploration learning record](research/reports/Represent%20exploration%20learning%20record.md). Keep [Visu's experience and implementation knowledge](guides/visu-experience.md) at hand: the owner explicitly likes it and wants it inside Represent. No tool, history or artifact is being discarded. Independent old follow-ups are deferred while a fresh session designs Represent within Orkest; Opus 5.5 then audits/improves the design and bootstraps its bounded implementation plan. No new integration tracker or runtime is created by this closeout.

**Grafe and Alegor local MVPs are implemented. Visu remains paused.** The two tracks progressed in parallel with separate headless cores, CLIs, web apps, real-project trials, UI/UX rounds and detailed research records. Completed promotion records are [GRAFE-MVP](orkest/done/grafe-mvp.imp.md) and [ALEGOR-MVP](orkest/done/alegor-mvp.imp.md).

Grafe's configured local port is **8873**; Alegor's is **8874**. Both use manual snapshots outside read-only source roots and make zero AI calls. See [Grafe usage](reference/grafe-mvp.md) and [Alegor usage](reference/alegor-mvp.md). No public deployment, session connector or cross-tool snapshot interoperability is claimed. These are retained independent tools; their next integration is a design question. Port numbers do not establish that a service is currently running.

**Product direction clarification (2026-10-21):** The user frames Represent as Maremoto’s AI developer-tooling branch/product line: open, simpler to adopt, and expert-focused, with room for specialized products beyond visualization alone. Orkest is the emerging work platform, starting with Multica and aiming toward both coupled and standalone modes; Represent should integrate into that work experience while keeping useful tools independently launchable. Visu is a liked tool inside Represent even while its implementation remains paused. Grafe and Alegor are current tools, not a mandate to make Represent a separate OS or agent control plane. This is a research recommendation pending product-boundary review; see [Represent within the Orkest platform](research/reports/Represent%20within%20the%20Orkest%20platform.md). The user’s stated unmanaged-agent and Multica-parity intent is recorded separately from what the inspected Orkest/Ghost source snapshot proves; reconcile it with the active Orkest session before treating older summaries as current implementation status.

## Historical visual product direction (2026-10-21)

> **Historical framing:** The design below records the earlier Visu-first product sequence. The user subsequently authorized Grafe and Alegor implementation in parallel, paused Visu implementation, and clarified that Represent should be a broad AI developer-tooling product line fitting into Orkest. The earlier design rationale is preserved here for history; the Orkest comparison linked above records the newer product-boundary recommendation.

The ROMPE trials established the current visual quality bar: **“A memorable overview”** is the only tested output accepted as a natural Represent product direction. The user's desired product is clean and easy at first glance, with deeper summaries, technical data, and source evidence available through hover, focus, or popups. The overview should detect and adopt each project's own style; the MVP narrows the format/workflow to a dependable illustrated overview and cheap, measurable updates, not to a single art style such as ROMPE's pixel art.

The product should be designed in two equally serious tracks: **Visu**, the illustrated overview that can grow into an animated interactive scene, and **Grafe**, a technical explorer improving on the Codevis idea with source/code detail inside focused nodes. Share project identity, evidence, and snapshot lineage. Implementation need not happen in parallel: the first product proof is an updateable Visu overview; the earlier plane-sync scan becomes a Grafe engineering checkpoint rather than the global gate for all product work. **Alegor** is a candidate name for a project/history companion; its exact product/service boundary remains a proposal, and the user's only fixed constraint is that it is not a mascot.

Branding recommendation for review: **Represent** (suite), **Visu** (illustrated overview), **Grafe** (technical explorer), **Alegor** (candidate companion). Names and any `alegor.ai` domain styling are provisional; domain and trademark availability have not been checked. A local-first snapshot workflow is the MVP direction. Hosted sync, embeds, sharing, or subscription budgets are later service proposals, not current commitments.

See the [living project views design](research/reports/Represent%20living%20project%20views.md) for the complete recommendation and [research verdict](research/rompe-tool-trials.md) for the corrected interpretation of trial results.

## What is Represent

Represent is the **root workspace for all LLM-based visual representation projects** under waremoto. It lives at `D:/ware/represent` (repo: <https://github.com/Jlabarca/represent>). Multiple concrete projects — different visualization modes, different ingestion strategies, different output surfaces — will live here as sub-projects under one shared doctrine, one AI backend, and one embeddability target.

Each sub-project ingests source code (files, directory trees, git history, runtime traces) and outputs artistic visual representations — dependency graphs, creatures, cities, blueprints, animated minimaps, whatever makes a codebase legible at a glance.

The thesis: a project should have an iconic visual identity that reflects its real structure, not just a logo. Developers should look at the picture and understand relationships they'd otherwise have to read thousands of lines to recover.

## Current State

**Parallel MVP completion (2026-10-21):** Grafe provides bounded JS/TS symbol navigation, typed relationships, source excerpts, focused graph/evidence views and manual snapshot history. Alegor provides Git/docs snapshots, timeline/baseline comparison, declared next work, unknown/conflict indicators and captured citations. Both were exercised against Plane Sync and Represent, with changed/deleted-source trials in disposable copies. The integrated suite passed **57/57** (10 Grafe, 12 Alegor, 35 existing Visu); Grafe passed 16 browser checks, and Alegor passed citation/theme/detail/mobile/keyboard/range checks. Each received design and live implementation UX rounds. Zero model/API calls were made for these MVP workflows.

Grafe indexed 51 integrated Represent source files in 952.82ms and six Plane Sync files in 783.95ms. Refresh is a full bounded rebuild with immutable no-op reuse, not per-file incremental compilation. Alegor's real Plane Sync clone trial recorded a docs-only update in 1,534.66ms, unchanged reuse and preserved citations after deletion. Its rule-based selection is limited to 40 first-parent commits and 12 documents; it does not read personal sessions. Detailed source genealogy, actual trials and limitations are in [Grafe research and tests](research/grafe-research-and-tests.md) and [Alegor research and tests](research/alegor-research-and-tests.md). Earlier paragraphs below are historical checkpoints.

### Historical checkpoints — Visu and initial bootstrap

**Automatic Visu iteration (2026-10-21):** Root-only configurations now discover a bounded Git text sample and let Ghost choose six chapters. Manual Capture → Explain → Illustrate separates free source capture, cached text analysis and optional image generation. Current state, intended design and next steps have separate captured citations and progressive detail. Light, dark and high-contrast monochrome are local presentation settings. ImageLab was tested without authored scope/chapters alongside refreshed ROMPE/Luz. A controlled-copy status update cost $0.0144183, retained chapter identities and reused art; unchanged operations cost zero. Thirty-five tests and nine browser checks passed. The new development trial cost $0.28688598 including failed/rejected text requests and three illustrations; the earlier $0.3682722 is separate. See [current reference](reference/visu-discovery.md) and [trial](../experiments/visu-discovery/README.md). Interpretation still needs review when source documents disagree; discovery is a sample, not a repository-wide audit. The curated-MVP description below is historical.

**Working local MVP (2026-10-21):** Visu now runs at local port 8871 with a shared headless core, CLI and web shell. ROMPE and Luz y Luna have actual Ghost-generated illustrations, detected style reasons, captured evidence, optional checklist counts, source snapshots, separate portrait revisions and exports. Fourteen regression tests and nine browser checks pass. Controlled-copy unchanged/detail-only updates made zero AI calls; selected original files retained their hashes. The full trial, including rejected generations, cost $0.3682722 in measured Ghost charges. See [Visu reference](reference/visu-mvp.md), [pilot evidence](../experiments/visu-pilot/README.md) and [archived tracker](orkest/done/visu-mvp.imp.md). Source scope/chapter mapping is curated, styles are heuristic, raster quality still needs inspection, and there is no background watcher. Grafe and Alegor remain parallel research tracks. The following pre-implementation statement describes the state before this build.

Product pre-implementation, with working reference-tool experiments and a local UI concept. Repo bootstrapped 2026-04-13. No Represent scanner or general renderer has shipped. Ten upstream repositories are inventoried locally; ROMPE's two prompts have been exercised through interactive-diagram, Eraser Diagrams and an illustrated-poster baseline. See [trial results](research/rompe-tool-trials.md), [living views concept](../experiments/rompe/living-overview-concept/index.html), and [REPRESENT-V0-IMPL.md](orkest/represent-v0.imp.md).

## Key Architecture Decisions (Locked)

| Decision | Choice | Reason | Date |
|---|---|---|---|
| AI backend | **Ghost AI pipeline** (not direct provider SDKs) | Reuse Ghost's provider routing, caching, resilience, and cost controls. No per-project API-key plumbing. Providers: Gemini primary, OpenRouter fallback, local Ollama/vLLM (RTX 3090). | 2026-04-13 |
| Embeddability | **First-principle, not afterthought** | Every tool must ship to the broadest public surface possible: web app, VSCode extension, JetBrains extension, desktop (Tauri-class), mobile, CLI, library. Core must be headless and framework-agnostic; surfaces are thin shells. | 2026-04-13 |
| Rendering format | _tbd_ | Likely SVG as v0 portable primitive (works in every surface), canvas/WebGL for interactive v1. Needs a POC to lock. | — |
| Ingestion v0 | _tbd_ | Candidates: git-walk, AST (tree-sitter / Roslyn), `codebase-digest` piped output, IDE-index scrape. Needs a POC to lock. | — |
| Local MVP ingestion/rendering | **Grafe: TypeScript 5.9.3 checker and focused web graph; Alegor: bounded Git/docs and timeline/evidence UI** | Resolves local MVP choices. The general multi-language pipeline remains open; internal versioned JSON snapshots do not yet implement methrep interchange. | 2026-10-21 |
| Workspace layout | **Monorepo under `D:/ware/represent`** | Shared doctrine + shared core + per-project subfolders. One docs tree at the root. | 2026-04-13 |
| Development sequence | **Clone, study and exercise references; synthesize; design; build** | Operator's 2026-10-21 direction: use the Multica/Orkest approach, learning from working projects and adapting the strongest parts before inventing another stack. | 2026-10-21 |
| Compatibility target | **methrep's `represent.scene/v0` envelope + `events.jsonl`** | Reuse the stable boundary, not methrep's markdown parser or date-only append algorithm. Code metadata belongs in annotations; structural extensions need tests. | 2026-10-21 |
| First delivery gate | **Historical technical checkpoint: first real plane-sync scene for the Grafe ingestion track** | The original scanner-first P0-P4 kickoff preceded the tested Visu direction. The plane-sync scene remains a useful engineering checkpoint, but is no longer the global product gate. | 2026-10-21 |
| Current validation case | **ROMPE poster establishes the visual bar; validate style transfer on another project** | The user selected “A memorable overview” as the only tested output that fits Represent. Box-based tools remain useful research instruments, not the product's main visual direction. | 2026-10-21 |
| Document visualization boundary | **Audited facts → selected view → renderer** | The trials found real prompt/source discrepancies; valid layout alone cannot establish correct rules. Share provenance and qualifications across explainer and poster outputs. | 2026-10-21 |
| Orkest integration seam | **Portable artifact record `represent.artifact/v0` + a small `represent hub`** | One record (tool, project, revision, scope, evidence hashes, provenance, optional task) is all Orkest needs; the hub fronts the three loopback tools and keeps their stores immutable. No shared database, second board or new shell. Design: [Represent within Orkest](research/reports/Represent%20within%20Orkest%20platform%20design.md). Pending operator review (REPRESENT-ORKEST.0.1). | 2026-10-24 |
| Host shell | **One GhostShell layer `layers/represent` by the RIMA precedent** | Edited by absolute path from a Represent session, imports only shell APIs, proxies to the hub; survives Orkest's extraction and keeps `Ghost/apps` frozen. | 2026-10-24 |
| Trust chain | **Represent is never in it** | Artifacts are not evidence of accepted work. The only handoff to work is text in Orkest's existing composer; runner, verifier and Multica writes stay in ORKEST-FORK. | 2026-10-24 |
| Name collision with methrep | **Product keeps "Represent"; methrep keeps its name and code** | New ids are `represent-hub`, `/x/represent`, `/proxy/represent`; nothing new is named `Ghost.Represent`. Recording in the naming canon is a later umbrella task. | 2026-10-24 |
| Trazo week 1 | **Go** | Operator verdict 2026-10-25 on the zero-AI sketch; week 2 started the same day. | 2026-10-25 |
| Trazo Phase 0 | **Codename Trazo, Apache-2.0, trial folders Represent, Plane Sync, luz, `D:/ware/docs`** | Operator confirmed the defaults; week 1 ran with zero model calls. | 2026-10-25 |
| Feasibility proof | **Trazo POC first: zero-AI sketch, then explanation and templated infographics, then optional illustration; four weeks, four real folders** | Tests the three unknowns (a free sketch worth keeping open, cheap explanation over raster art, proactivity without noise) before any platform work. Open core (Apache-2.0 proposed) with a service path. Design: [reference/trazo-poc.md](reference/trazo-poc.md). Codename provisional. | 2026-10-25 |

> [!WARNING]
> **Historical gate superseded 2026-10-21:** The initial bootstrap recorded these choices before the user clarified that the illustrated overview is the product-quality bar. Preserve them here as the original technical sequence; they are not current global gates.
>
> | Historical choice | Original rationale |
> |---|---|
> | **First real plane-sync scene before enrichment, renderer or shell implementation** | Keep the P0-P4 kickoff, with source study ahead of P1. The actual tracked plane-sync tree is small (19 files), and requires JavaScript support. |
> | **ROMPE game-design prompts before scanner implementation** | Operator explicitly requested hands-on use of existing tools. These are upstream-renderer experiments, not a premature P3 product implementation. |
>
> The plane-sync scene remains a Grafe engineering checkpoint. The ROMPE test remains the visual reference; validate the overview workflow on a non-game project to test style transfer.

### V0 decisions under evaluation

The historical Unity/.NET design remains a possible future renderer, especially for spatial themes. For the first companion, TypeScript plus a light web renderer is the working hypothesis: one language for a headless CLI/library and browser surfaces, with accessible text and easier host integration. The deciding evidence is source study and local trials, not bundle size alone; the earlier presence-universe brief explicitly treated payload size as a non-issue.

The supplied Interactive Atlas PDF is preserved under [research/sources/](research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf). Its useful direction is an evidence-grounded interactive model with overview and focused explanations, not an all-nodes graph. Its product rankings, prices and library claims are research leads, not verified facts.

## Surface Targets (Embeddability)

Every sub-project must plan how it reaches each of these surfaces before leaving the research stage:

| Surface | Role | Notes |
|---|---|---|
| **Web app** | Primary public-facing demo | Standalone site + shareable link per visualization |
| **VSCode extension** | In-IDE integration | Uses VSCode webview for rendering |
| **JetBrains extension** | IntelliJ / Rider / etc. | Shares core with VSCode ext |
| **Desktop app** | Offline power-user tool | Tauri preferred over Electron for size/perf |
| **Mobile app** | Viewer + share target | Read-only likely, not authoring |
| **CLI** | Scriptable / CI integration | Outputs artifacts to stdout / file |
| **Library** | Embeddable in other waremoto tools | Headless, language-agnostic over HTTP or stdio |

The **core** of every sub-project must be headless and framework-agnostic so that all of these surfaces are thin shells around the same logic — no surface-specific rewrites.

## Ghost AI Integration

Represent does not own its AI stack. All LLM calls go through Ghost's AI pipeline, which provides:
- Provider routing (Gemini / OpenRouter / local Ollama/vLLM)
- Prompt caching
- Rate limiting and retry
- Cost accounting
- Resilience / fallback chains

See [Ghost AI system docs](../../Ghost/docs/reference/ai-system.md) and [Ghost protocols](../../Ghost/docs/reference/protocols.md). Every Represent sub-project's `research/` brief must specify which Ghost protocol it will use (or propose a new one).

## Milestone Status

| Milestone | State | Notes |
|---|---|---|
| Docs doctrine and suite design | Complete | Protocol and source-grounded suite proposal exist. |
| Ghost AI wiring | Local Visu implemented | See measured Visu ledger; Grafe/Alegor require no AI. |
| Headless cores and CLI | Local MVPs implemented | Visu, Grafe, Alegor; IDE/mobile-native shells remain future work. |
| Ingestion and visual output | Local MVPs tested | Illustrated overview, focused JS/TS graph and Git/docs timeline. |
| Web surfaces | Local MVPs implemented | Visu 8871 (paused), Grafe 8873, Alegor 8874; no public hosted release. |
| Real-project and UX validation | Automated local trials complete | Two repositories, controlled copies and screenshots; unaided human validation remains open. |

## Current Sprint

**Clay Notes (2026-11-15 user priority)** — local MVP implemented and validated under [REP-8](orkest/done/clay-notes.imp.md): 24 focused tests, 96/96 full regressions, twelve browser checks. Core, loopback service, unpacked Chrome extension and clay/Satoshi web surfaces are present. The default request is “give me a TLDR list of the main statements and conclusions”; the configured initial gateway model is cheap when enabled, otherwise the first configured alias. Explicit regeneration preserves revisions. **Next focus: installed-Chrome and real gateway trial.** Credentials, consumer scope and live caption compatibility remain unverified; fixture tests do not establish them. Trazo and platform integration stay deferred, with human gates unchanged. This supersedes the sprint priority in the preserved paragraph below.

**Trazo POC** ([tracker](orkest/represent-trazo-poc.imp.md), [design](reference/trazo-poc.md)). Cursor: week-2 paid trial (REPRESENT-TRAZO-POC.2.4: one explanation per folder with the operator's key; previews and estimates in [experiments/trazo-poc/week2](../experiments/trazo-poc/week2/README.md)), then the operator's rating (2.5), then week 3 (live and proactive). REPRESENT-ORKEST's Phase 0 review is deferred until the POC verdict. Visu development and paid refreshes remain paused; Trazo reuses Visu's discovery, analysis and gateway code as libraries without changing its experience.


## Active Research

- [Represent within Orkest: platform design](research/reports/Represent%20within%20Orkest%20platform%20design.md): 2026-10-24 readiness revalidation, target user and jobs, boundaries, artifact record and hub, three stages, Visu participation, one end-to-end Plane Sync task, UX design round, AI/auth boundary, standalone path, three open questions with defaults. **Audited design awaiting operator review; nothing implemented.**
- [Companion interaction research](research/companions.md): ambient panel, query-first and change-digest alternatives; verified capabilities separated from inferred design rules.
- [Reference repository study](research/reports/Represent%20reference%20repository%20study.md): GitNexus, CodeBoarding, interactive-diagram, CodeCharta, Gource and Git City. [Inventory](research/reference-repos.json) records pinned commits and source paths. Eraser Diagrams was added for the [ROMPE trials](research/rompe-tool-trials.md).
- [Graphify field results](research/graphify-tested.md): ignore-awareness, cost, unlabeled clusters and indiscriminate rendering failures remain acceptance constraints.
- [Living project views report](research/reports/Represent%20living%20project%20views.md): product suite recommendation, Visu MVP, Grafe parallel design, snapshot service direction, and evidence-based UX gates. Names and service roles remain proposals.
- [Represent within the Orkest platform](research/reports/Represent%20within%20the%20Orkest%20platform.md): compares the earlier Represent-centered workspace proposal with the user's Orkest-first AI developer-tooling direction; recommends a low-duplication integration proof and records current-source limits. **Research recommendation only; no platform, runtime, or provider decision is authorized by this report.** See its [company stack](research/research_notes/Represent%20within%20the%20Orkest%20platform/company-stack.md), [Orkest platform](research/research_notes/Represent%20within%20the%20Orkest%20platform/orkest-platform.md), and [vision and runners](research/research_notes/Represent%20within%20the%20Orkest%20platform/vision-and-runners.md) notes.
- [Historical Represent OS design and runtime report](research/reports/Represent%20OS%20design%20and%20runtime.md) and [interactive concept infographic](../experiments/represent-os-concept/index.html): Gource’s tested evolution lesson for Grafe, Dot/Skales workflow research for Alegor, and the earlier separate-web-workspace proposal. **The Orkest-first report above supersedes that proposal’s product center; its visual, evidence, and runtime research remains useful.** See [source notes](research/research_notes/Represent%20OS%20design%20and%20runtime/).

## Completed

Visu's two local slices are promoted and paused. Grafe and Alegor local MVP implementations, real-project/copy trials, UI/UX rounds and detailed research records are complete; both are promoted with focused 10/10 and 12/12 verification at implementation commit `8a781edf`. Research includes preserved PDF/Notion analysis, pinned reference checkouts, source-grounded comparison, actual Gource execution, Skales public-material inspection and reproducible ROMPE trials. Automated checks do not establish market demand or human product acceptance.

## Active implementation

- [REP-8: CLAY-NOTES](orkest/done/clay-notes.imp.md) — verified local MVP; external Chrome/gateway trial remains open.

- Shipped REP-8.1; source 0c299bd76e96d3067dd88346ffbb3396a4b69967, executed tests and QA recorded.

- Shipped REP-8.2; source be35fd49215afad13ecdd81390658550d8b41dfd, executed tests and QA recorded.

- Shipped REP-8.3; source caaf831b06fe7c465e709f2dcbcc62d37b8d8700, executed tests and QA recorded.

## Completed implementation

- [REP-8: CLAY-NOTES](orkest/done/clay-notes.imp.md) — implemented, tested and promoted.

## Active implementation

- [REP-9: CLAY-NOTES-RELEASE-PREP](orkest/done/clay-notes-release-prep.imp.md) — plan-only.

- Shipped REP-9.1; source e90b284ee65e6e29c7d2a97b6dd33a5dc1a8ebec, executed tests and QA recorded.

- Shipped REP-9.2; source 070d2afb687d51b41f0e6b02414fb6210ce0231e, executed tests and QA recorded.

- Shipped REP-9.3; source 51c582523351e032f4bad6e954a5c618fb706b67, executed tests and QA recorded.

- Shipped REP-9.4; source d177508840c4ba3566afb294ff2d4400d2837b34, executed tests and QA recorded.

- Shipped REP-9.5; source b1d08b9fcc7d28cbfc458892937c9903ea1dfef9, executed tests and QA recorded.

## Completed implementation

- [REP-9: CLAY-NOTES-RELEASE-PREP](orkest/done/clay-notes-release-prep.imp.md) — implemented, tested and promoted.

## Active implementation

- [REP-10: NOTCARDS-DEV](orkest/done/notcards-dev.imp.md) — plan-only.

- Shipped REP-10.1; source ca3cf9f1dc2444f3b7ffe89e55140f9fb736c4a9, executed tests and QA recorded.

## Completed implementation

- [REP-10: NOTCARDS-DEV](orkest/done/notcards-dev.imp.md) — implemented, tested and promoted.

## Active implementation

- [REP-11: NOTCARDS-COMPOSER](orkest/done/notcards-composer.imp.md) — plan-only.

- Shipped REP-11.1; source 2919b5ad69b69e2b00302476917a4346f90763bc, executed tests and QA recorded.

## Completed implementation

- [REP-11: NOTCARDS-COMPOSER](orkest/done/notcards-composer.imp.md) — implemented, tested and promoted.

## Active implementation

- [REP-12: NOTCARDS-WEB-NOTEBOOK](orkest/notcards-web-notebook.imp.md) — plan-only.

- Shipped REP-12.1; source b6d24b255dd6d0db6ce19f8b33e399a23bd920c1, executed tests and QA recorded.
