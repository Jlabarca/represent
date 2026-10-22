# Represent exploration learning record

> Closed learning checkpoint: 2026-10-21. Evidence reviewed from checkout `f92f1a4` on `codex/represent-v0`. This closes the exploration through the Represent OS report/infographic and records the subsequent Orkest comparison. It preserves the working tools, experiments and findings; it does not declare the proposed OS or full companion implemented.

## System Intent

Preserve what the initial Represent exploration taught us before beginning a fresh platform design. The sequence covered the Interactive Atlas brief, reference repositories, ROMPE explainer/poster trials, Visu's illustrated overview and automatic discovery, independent Grafe/Alegor MVPs, Notion/Gource/Codevis/Skales research, and the Represent OS concept. The latest company-context study reframes the next design around Orkest and a broader AI developer-tooling branch.

The owner's strongest positive product feedback is **Visu's experience**, starting with ROMPE's **“A memorable overview.”** Keep it as a first-class tool inside Represent. The owner questioned the separate Represent Workspace/OS proposal; that proposal is learning material, not the visual standard or an accepted replacement for Visu. The [Visu preservation guide](../../guides/visu-experience.md) is the short entry point to that knowledge.

## Ingestion Vector

This closeout reads saved source, reports, measurements and feedback. It makes no model calls, regenerates no illustrations, reruns no paid pilots and changes no application code. Original sibling projects and Notion exports remain untouched.

```text
represent/
|-- docs/research/sources/            # @LLM-ENTRY: preserved Interactive Atlas PDF
|-- docs/research/reports/            # @LLM-TARGET: design iterations and this learning record
|-- docs/research/research_notes/     # @LLM-TARGET: source-specific evidence and inspected revisions
|-- docs/reference/                  # @LLM-TARGET: actual Visu, Grafe and Alegor implementations
|-- docs/impl/                       # @LLM-TARGET: completed implementation and verification records
|-- experiments/rompe/               # @LLM-TARGET: explainer/poster trials and source audit
|-- experiments/visu-pilot/          # @LLM-TARGET: initial real art, costs and rejected attempts
|-- experiments/visu-discovery/      # @LLM-TARGET: root-only trials, update proof and themes
|-- experiments/grafe-mvp/           # @LLM-TARGET: real-project and browser evidence
|-- experiments/alegor-mvp/          # @LLM-TARGET: re-entry and controlled-copy evidence
|-- experiments/represent-os-concept/ # @LLM-TARGET: historical interactive infographic and poster
|-- src/ and web/                    # @LLM-TARGET: reusable headless cores and current UIs
|-- references/                     # @LLM-IGNORE: ignored research clones; use recorded revision manifests first
`-- .represent/                     # @LLM-IGNORE: ignored local history and captured private source; preserve, do not bulk ingest
```

## Visualization Spec

The retained visual bar is a project-specific illustrated whole picture with short explanations and deeper evidence on demand. The [original ROMPE poster](../../../experiments/rompe/imagegen/rompe-poster-v2.png), [Visu ROMPE](../../../experiments/visu-discovery/rompe.png), [Luz](../../../experiments/visu-discovery/luz.png), and [ImageLab dark UI](../../../experiments/visu-discovery/imagelab-dark.png) make the distinction concrete. Pixel art is ROMPE's direction, not a universal Represent skin.

The [Represent OS infographic](../../../experiments/represent-os-concept/index.html), [SVG](../../../experiments/represent-os-concept/poster.svg) and [PNG](../../../experiments/represent-os-concept/poster.png) remain useful explanations of an explored architecture. Their runtime switches illustrate choices; they do not run jobs. Their HTML/SVG composition proved exact labels, editable layout, progressive source disclosure and inexpensive re-export. They did not demonstrate Visu-style automatic illustration generation, an integrated OS, or user acceptance of that design.

## Bootstrapping Steps

The prior exploration is closed as a learning checkpoint. Keep its source, images, failed attempts, scripts and measurements in place. Do not tick unfinished historical bootstrap boxes merely to make the tracker look complete, restart its scanner-first sequence, or discard the working tools. Independent follow-up tasks remain recorded but are deferred behind the new design checkpoint.

The next session resumes **[Represent within the Orkest platform](Represent%20within%20the%20Orkest%20platform.md)** in design first. The durable continuation brief is below; a small ignored handoff supplies the immediate cursor. Opus 5.5 audits the design, improves it where needed, and then bootstraps the bounded implementation plan. This closeout does not launch that implementation or provision its runtime.

## What was learned, in order

| Work | Evidence retained | Learning to carry forward |
|---|---|---|
| Atlas, methrep and initial bootstrap | [PDF](../sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf), [reference study](Represent%20reference%20repository%20study.md), [original tracker](../../REPRESENT-V0-IMPL.md) | Keep a headless core and Ghost AI boundary. Reuse methrep's scene/event idea, not its regular-Markdown parser for arbitrary code. Scene compatibility remains a target; the three MVPs do not prove full interchange. |
| Repository-first study | [Pinned inventory](../reference-repos.json), [Graphify field results](../graphify-tested.md), [new visual references](../research_notes/Represent%20living%20project%20views/new-references.md) | Inspect and exercise useful projects before inventing the stack. Graphify exposed generated-file ranking, unnamed clusters, truncation, rendering ceilings and repeated-build cost. Stars and demos do not establish accuracy, active adoption or demand. Its large-repository cost projection is not a measured Represent bill. |
| Two ROMPE prompts | [Source audit](../../../experiments/rompe/source-audit.md), [trial verdict](../rompe-tool-trials.md), [comparison gallery](../../../experiments/rompe/index.html) | Agent-authored native input made the renderers useful; this was not autonomous repo understanding. The owner selected the illustrated memorable overview. Box diagrams remained authoring/research instruments. Correct source rules before rendering; clean geometry can still explain the wrong game. |
| Visu curated MVP | [Pilot](../../../experiments/visu-pilot/README.md), [historical reference](../../reference/visu-mvp.md), [completed tracker](../../impl/VISU-MVP-IMPL.md) | Style-aware art plus inspectable detail is a coherent experience. Separate capture, view and art identities; keep old art visible with honest freshness. Limit raster lettering; put precise state and evidence in the web layer. |
| Visu automatic discovery | [Current reference](../../reference/visu-discovery.md), [trial/cost record](../../../experiments/visu-discovery/README.md), [update proof](../../../experiments/visu-discovery/update-proof.json), [tracker](../../impl/VISU-DISCOVERY-IMPL.md) | Root-only configuration selected scope/chapters on a new project, ImageLab. Explicit manual stages and art reuse reduced refresh spend. Bounded sampling and stale-document interpretation remain real weaknesses, especially behind generic Luz explanations. |
| Grafe feasibility and MVP | [Detailed dossier](../grafe-research-and-tests.md), [real trials](../../../experiments/grafe-mvp/README.md), [current reference](../../reference/grafe-mvp.md) | Compiler-backed symbols, exact snippets and a focused neighborhood are useful without inference. Confirmed relationships, text candidates, unresolved edges and actual runtime traces need distinct meanings. The MVP supports bounded JS/TS; it does not establish whole-monorepo or multi-language coverage. |
| Alegor feasibility and MVP | [Detailed dossier](../alegor-research-and-tests.md), [real trials](../../../experiments/alegor-mvp/README.md), [copy update](../../../experiments/alegor-mvp/controlled-copy.json), [reference](../../reference/alegor-mvp.md) | Saved Git/docs citations support re-entry and survive source deletion. A closed checklist should yield an unknown next step, not a generic suggestion. This is a memory/evidence foundation, not a conversational, autonomous Dot counterpart. |
| Notion, Gource and Codevis | [Grafe dossier](../grafe-research-and-tests.md), [original vision](../research_notes/Represent%20living%20project%20views/original-vision.md), [Gource run](../../../experiments/grafe-reference-checks/gource-run.json) | Original notes asked for code-bearing nodes, following/detachable minimaps, adjustable depth, themes and later runtime views. Gource's strength is temporal activity. Stable structure, focused code and evolution are different views. |
| Dot, Skales and runtime options | [OS report](Represent%20OS%20design%20and%20runtime.md), [source notes](../research_notes/Represent%20OS%20design%20and%20runtime/), [Skales manifest](../../../experiments/alegor-reference-checks/skales-inspection.json) | Persistent identity, visible work and control handoff are useful. Screenshots do not expose private infrastructure. Workspace UI, agent execution, independent verification and executable artifact previews are separate boundaries. |
| Orkest/company-context correction | [Comparison](Represent%20within%20the%20Orkest%20platform.md), [source notes](../research_notes/Represent%20within%20the%20Orkest%20platform/) | The earlier separate workspace proposal was too narrow for the owner's AI developer-tooling branch. Orkest is the proposed shared work platform; Represent contributes expert tools and experiences. This needs fresh design and a current readiness audit, not another scheduler or identity system by assumption. |

### Research status must survive the summary

Gource **0.53 was executed** on GoCity and Algorithm Visualizer histories. Retained frames demonstrate replay, label crowding and large raw exports; they are not browser benchmarks or semantic-call-graph tests. The original Notion screenshot identifies **divan/codevis**; its exact URL returned 404 at research time, with the reason unknown. **KDE Codevis** is a different project, reviewed through documentation and not run. **Skales** was cloned/inspected at the revision in its manifest, including its public guide/license; its application was not run and its current source was unavailable. The earlier PET note linked Skales and that pointer was initially missed, then followed up. Preserve these distinctions instead of upgrading every reference to a tested dependency.

The isolated `sessions` Windows context-suite experiment passed 25/25 after a local experimental path fix. It was not full upstream validation, an accepted upstream patch, or a test on the owner's real personal session corpus. The earlier static Alegor restart at port 8872 is different from the later local MVP at port 8874. These details live in the Alegor dossier and prevent a fresh session from overclaiming the companion's readiness.

## Visu is the experience to retain

Keep the owner's requested philosophy: a clean, understandable overview with substantial detail available when asked. Preserve project style, current state versus intended design, source-linked chapters, history, light/dark/high-contrast modes, keyboard/touch alternatives, and manual control of paid work. The full animated/interactive poster remains a desired direction, not a shipped capability.

The strongest implementation seam is **captured evidence -> explanation/view -> illustration**, with separate cache keys and immutable revisions. The UI should expose this gently: it need not make users understand storage internals. The [preservation guide](../../guides/visu-experience.md) points to screenshots, code, safe preview instructions, costs and regression evidence so the next designer can see the product rather than reconstruct it from prose.

### Costs and verification, with scope intact

| Recorded run | What it establishes |
|---|---|
| Initial Visu trial: **$0.3682722** | Five images cost $0.3536370; six text attempts cost $0.0146352, including three rejected outputs. Ghost gateway measurements, not an independently reconciled invoice. |
| Automatic Visu iteration: **$0.28688598** | Additional development run including three images, text trials and its controlled-copy update. The **$0.0144183** status update is inside this total, not another amount to add. |
| Controlled status update | One explicit text request, stable six chapter identities and reused art; zero image requests. Unchanged operations reused caches without model calls. |
| Visu QA | Automatic-discovery slice recorded **35 regression tests and nine browser checks**. The older 14-test MVP is an earlier suite, not an additional denominator to sum. |
| Integrated MVP QA | Recorded **57/57**: 35 Visu, 10 Grafe and 12 Alegor. Final focused 10/10 and 12/12 runs were recorded at `8a781edf`; Grafe also recorded 16 browser checks. Alegor records named browser assertions without a fabricated aggregate count. |
| OS infographic QA | Saved browser report passed desktop/mobile, runtime scenario controls, source disclosure and local report/poster links. It validates the explanatory artifact, not the proposed OS. |

Visu's measured route was **Ghost LiteLLM -> OpenRouter -> Google models**, with aliases and exact historical routes recorded in the trial. Direct provider clients were not introduced. The earliest ROMPE built-in image-tool experiment was separate from Visu's later Ghost generation; its cost is not silently included in the Visu ledger. This closeout incurred no new image generation, paid trial or sandbox provisioning. Historical results are being cited, not rerun or relabeled as current benchmark results.

## Limits and failed assumptions worth keeping

- A visually successful overview can contain a generic or incorrect explanation. Luz showed why source specificity, retired-doc context and conflict handling matter. A valid citation proves an excerpt exists, not that a model's conclusion follows from it.
- Cheap updates have several meanings. Visu reuses artwork; its changed automatic explanation is still one bounded whole-snapshot call. Grafe rebuilds its selected scope before deduplicating the result. Alegor rereads bounded Git/docs before no-op storage reuse. None is a universal per-file incremental analysis system.
- Git ignore awareness needs explicit handling for ignored tracked files. Generated, secret and dependency paths should not become architecture; omissions need diagnostics.
- Full-graph rendering obscures useful work. Selection, stable positions, named relationships, outlines and evidence made the small MVPs more useful than indiscriminate graph density.
- The OS concept did not establish the owner's desired product design. Preserve its useful interaction/runtime lessons while designing the broader platform from actual developer work.
- Multica/CloudCLI/Orkest documentation and live development can diverge. The company-context study recorded source revisions and incomplete adapter/runner seams. It did not inspect the active Claude session, run an unattended agent, approve OQ-8 or prove provider parity.

## Fresh design continuation contract

1. **Read before designing:** this closeout, [Visu preservation](../../guides/visu-experience.md), the [Orkest comparison](Represent%20within%20the%20Orkest%20platform.md), then its three source notes and the current sibling-project instructions/docs. Preserve earlier reports and original Notion material.
2. **Recheck the platform:** read current Orkest setup/unattended-work docs, the owning Ghost tracker and relevant source. Reconcile unmanaged/exploratory work and the owner's eventual parity/standalone target with current implementation. Coordinate through evidence; do not edit another active session's work based on stale notes.
3. **Design first:** describe the target user, concrete jobs, product/brand/repository boundaries, Orkest versus Represent responsibilities, full Alegor companion role, and how Visu/Grafe participate. Include one realistic end-to-end task and UI/UX improvement round. Explore the Dot-like experience without assuming its private internals or requiring a new OS.
4. **Protect the reusable seams:** independent headless tools and artifacts, project/revision/evidence identity, direct-model Ghost routing versus external CLI authentication, optional GhostDev verification, and a standalone path that does not require the entire private company stack. Do not silently replace Visu's visual quality bar with a generic dashboard.
5. **Opus 5.5 audit, then bootstrap:** audit the fresh design for duplication, unsupported readiness claims, UX, costs, integration scope, runner/verifier separation and preservation of Visu. Improve the design where needed. Bootstrap only the resulting bounded implementation plan with owned files, dependencies, acceptance criteria, real-project trials and design/implementation UI/UX rounds. Do not treat the old scanner tracker or a new planning tracker as permission to implement infrastructure now.

## Ghost AI Plan

The implemented boundary and measured historical routes are retained, not reconfigured by this closeout. Direct Represent model calls continue through Ghost. A future Orkest CLI session can have its own supported authentication/accounting; an API gateway key and a CLI subscription are not interchangeable. Cache by output-affecting evidence/recipe/model versions, keep browsing and appearance free of inference, and make new paid work explicit. The external standalone boundary needs design rather than an assumption that every user installs GhostWare.

## Embeddability Plan

Keep current libraries, CLIs, local UIs and saved outputs. Visu's art/detail experience should remain usable as a tool, whether launched independently, from Orkest, or through a later editor/desktop shell. Design the smallest actual project/task/artifact contract before consolidating stores or moving code. The source and evidence inventories above are durable; ignored runtime state requires its own preservation and deliberate export. No working source or artifact was removed to close this exploration.
