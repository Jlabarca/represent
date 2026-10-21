# Represent — Docs Index

Start at **[CONTEXT.md](CONTEXT.md)** — it's the living source of truth for where the project is and where it's going.

## Root living documents

| Doc | Purpose |
|---|---|
| [CONTEXT.md](CONTEXT.md) | State, decisions, milestones, current sprint |
| [TODO.md](TODO.md) | Active sprint tasks |
| [BACKLOG.md](BACKLOG.md) | Deferred ideas, parking lot |
| [LOGBOOK.md](LOGBOOK.md) | Append-only session history |
| [DOCS-PROTOCOL.md](DOCS-PROTOCOL.md) | Rules that govern this folder |
| [CAPABILITIES.md](CAPABILITIES.md) | Promoted capabilities only |
| [REPRESENT-V0-IMPL.md](REPRESENT-V0-IMPL.md) | Research-first bootstrap and P0-P4 delivery tracker |

## Archived implementation trackers

| Document | Purpose |
|---|---|
| [Visu MVP](impl/VISU-MVP-IMPL.md) | Completed local illustrated-overview slice, implementation evidence and pilot |

## Implementation reference

| Document | Purpose |
|---|---|
| [Visu automatic discovery](reference/visu-discovery.md) | Root-only scope and chapters, manual paid stages, current/design detail, themes and cache limits |
| [Automatic Visu trial and costs](../experiments/visu-discovery/README.md) | ImageLab/Luz/ROMPE outputs, measured cheap update, original $0.37 breakdown and browser evidence |
| [Visu MVP](reference/visu-mvp.md) | Local headless illustrated overview, source/style capture, Ghost generation, snapshots, API and usage |
| [Visu pilot evidence](../experiments/visu-pilot/README.md) | ROMPE/Luz actual art, rejected attempts, costs, update benchmarks and UI captures |

## Research and source material

| Document | Purpose |
|---|---|
| [Grafe MVP research](research/grafe-mvp-research.md) | Pinned extractor trials, real plane-sync evidence, DX opportunities and maturity gate |
| [Alegor MVP research](research/alegor-mvp-research.md) | Re-entry companion design, session-memory references, Windows trial and maturity gate |
| [Graphify field results](research/graphify-tested.md) | Measured failure cases and lessons |
| [Companions](research/companions.md) | Sourced interaction patterns and A/B approaches |
| [Interactive Atlas source PDF](research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf) | Preserved 18-page source conversation; proposals are not verified facts |
| [Handoffs index](handoffs/README.md) | Local continuation prompts; kickoff remains intentionally ignored |
| [Reference repository study](research/reports/Represent%20reference%20repository%20study.md) | Source-grounded reuse/adapt/avoid synthesis |
| [Living project views report](research/reports/Represent%20living%20project%20views.md) | Suite design: Visu overview, Grafe technical explorer, candidate Alegor history/assistant experience, MVP and full direction |
| [Reference inventory](research/reference-repos.json) | Local clone origins, exact revisions, licenses and trial scope |
| [Historical vision and Codevis screenshot analysis](research/research_notes/Represent%20living%20project%20views/original-vision.md) | Synthesis of the local Notion export; source export remains unmodified |
| [New visual and technical references](research/research_notes/Represent%20living%20project%20views/new-references.md) | GoCity, Algorithm Visualizer adoption signals, and creative-coding findings |
| [Living suite architecture notes](research/research_notes/Represent%20living%20project%20views/product-architecture.md) | Detailed MVP/full-product, snapshot, workflow, UX, and open-decision synthesis |
| [New reference evidence JSON](research/research_notes/Represent%20living%20project%20views/new-references.json) | Pinned repository revisions, observations, and limits |
| [ROMPE and living overview concepts](../experiments/rompe/living-overview-concept/index.html) | Local concept artifact for a style-aware overview and snapshot interactions; not a shipped product |
| [Ingestion notes](research/research_notes/Represent%20reference%20repository%20study/ingestion.md) | GitNexus and CodeBoarding source evidence |
| [Visualization notes](research/research_notes/Represent%20reference%20repository%20study/visualization.md) | interactive-diagram and CodeCharta source evidence |
| [Spatial/history notes](research/research_notes/Represent%20reference%20repository%20study/spatial-history.md) | Git City and Gource source evidence |
| [ROMPE tool trials](research/rompe-tool-trials.md) | Actual explainer/poster outputs, browser checks and limitations |
| [ROMPE comparison gallery](../experiments/rompe/index.html) | Local interactive and image artifacts with reproduction records |
| [Living overview concept](../experiments/rompe/living-overview-concept/index.html) | Concept interaction for an illustrated overview and snapshot history; not product implementation |

## Subfolders

| Folder | Purpose |
|---|---|
| `reference/` | Deep-dives on current implementation |
| `research/` | POC briefs — must follow Rule 6 (System Intent / Ingestion Vector / Visualization Spec / Bootstrapping Steps) |
| `ingestion/` | LLM ingestion strategies, annotated trees, prompt templates |
| `visual-spec/` | Art direction clusters (creature, city, actor, blueprint, etc.) |
| `guides/` | How-to guides |
| `troubleshooting/` | Bug patterns and pitfalls |
| `legacy/` | Archived superseded docs |

## How to add a doc

Read [DOCS-PROTOCOL.md](DOCS-PROTOCOL.md) → "When Adding a New Doc — Decision Tree". Short version:

- Status change → update CONTEXT.md, don't create a new file
- New POC idea → `research/` + follow Rule 6
- System that now exists in code → `reference/`
- Art direction → `visual-spec/`
- Deferred idea → BACKLOG.md
