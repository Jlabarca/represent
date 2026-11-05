# {project-name}

{One-line project description. Fill in the actual stack and project hard rules.}

Read [docs/CONTEXT.md](docs/CONTEXT.md) first for current state, locked decisions
and active work, then [docs/DOCS-PROTOCOL.md](docs/DOCS-PROTOCOL.md). Project rules
and settled operator decisions take precedence over methodology defaults.

## Stack

- Language: {language}
- Framework/runtime: {framework and runtime}
- Build: {actual build command}
- Tests: {actual test command}

## Orkest workflow

The only suite entry is `/orkest [description]` (short alias `/ork`): match or create a grounded live
tracker, plan, TDD, commit each evidenced box, QA, append logbook and continue
through committed promotion. `/orkest doctor` is its read-only hygiene subcommand;
explicit `--fix` applies only its proven safe set. There is no separate doctor
skill or legacy skill aliases; `/ork` is the same skill under its short name. Read the canonical skill's PROTOCOL/WORKFLOW and
OPERATIONS resources; locate authoring/projection roots in harness-registry.json.

Live trackers are `docs/orkest/<topic>.imp.md` (lowercase DESCRIPTION_NAME);
ID/frontmatter/H1 agree as `KEY-N: DESCRIPTION_NAME` (key from docs/orkest/.key;
legacy `ORK-NNNNNN` without one or for older trackers). Existing `-ORK.md`
and legacy `-IMPL.md` trackers stay readable. Done/planned/parked stay separate.
Product state remains in docs/CONTEXT.md and docs/TODO.md; durable history is the
append-only docs/orkest/LOGBOOK.md. Handoffs are ephemeral and never staged.

Two or more source-content files require a committed Plan before edits. Use only
feat/polish/fix/refactor/docs/test commit types, exact owned paths and actual
session trailers. A checked box, clean Git, vendor doctor or external board is
not verification. Execute required tests/builds and preserve unrelated local work.
The person's default run is the promotion decision; no second confirmation.
Unattended runs never promote, migrate, edit peer trackers or leave their worktree.

## Installed release and startup

Normal Update and bin/orkest-init share the same local, journaled reconciler as
startup. It installs/verifies new skill bytes before retiring proven-owned old
copies, keeps backups outside discovery roots and preserves local edits/disables.
Migration waits for clean-tree/deployed consumer/native readiness, uses git moves
and link rewrites, and makes its own refactor commit. Startup never fetches,
sweeps other repos, runs a feature or promotes. Old layouts remain readable while
pending. An unready development release refuses live update rather than claiming
success. Runs and Update need the integration branch or one declared in
`.orkest/branches.json` (`integration`, `also` globs); any other branch is refused. Init is dry by default and requires this Git repository and a base commit.

Claude/Codex retain TDD/session fingerprint policies plus startup/statusline;
Codex's adapter normalizes every file in apply_patch. Grok uses its own trusted
project SessionStart configuration and inline policy checks. Honor native first
trust; never change global trust or approvals. Claude-only reload fields stay
conditional. Codex/Grok may require native refresh/next session for cached skills.

Use ORKEST_* settings; GHOSTDEV_* and .ghostdev/hooks.json remain one-release read
fallbacks. New disables go in .orkest/hooks.json; explicit empty event arrays and
local handlers remain owned by the project. Available Codex metrics drive the
installed usage reserve; unknown metrics are never guessed. See the skill workflow.
