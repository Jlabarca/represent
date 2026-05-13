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
