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

## Research and source material

| Document | Purpose |
|---|---|
| [Graphify field results](research/graphify-tested.md) | Measured failure cases and lessons |
| [Companions](research/companions.md) | Sourced interaction patterns and A/B approaches |
| [Interactive Atlas source PDF](research/sources/ChatGPT_Prompt-Codex-Interactive-Atlas_20261020-1748.pdf) | Preserved 18-page source conversation; proposals are not verified facts |
| [Handoffs index](handoffs/README.md) | Local continuation prompts; kickoff remains intentionally ignored |

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
