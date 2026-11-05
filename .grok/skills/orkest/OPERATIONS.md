# Internal ancillary operations

These are procedures inside the one skill, never additional installed skills,
aliases or automatically dispatched feature runs. Use actual available tools;
Claude's AskUserQuestion/Agent names are not portable tool contracts. No procedure
or delegated agent can broaden the person's permissions.

## Handoff

On the person's request, resolve the exact live target or recorded active target;
ask only a real ambiguous match. Inspect branch/HEAD, session-base diff, recent
commits, tracker cursor, logbook tail and actual pending input. Verify stale
handoffs against Git rather than treating them as authority. Write one compact
topic-keyed `docs/orkest/handoffs/DESCRIPTION_NAME.md` containing read order,
verbatim request, phase/next action, branch/HEAD, actual receipts, pending inputs,
in-flight decisions absent from durable history and changed paths. Reference
history instead of duplicating it. Preserve unknowns explicitly.

This scratch file replaces only its own previous handoff, remains gitignored and
is never staged. Print its path and exact resume prompt. Do not clear/close the
person's session, promote or edit source. Startup/compact observers may suggest
a handoff but do not fabricate its contents or silently generate a feature run.
During deferred layout migration use the existing legacy handoff location;
the migrator moves it as part of its own transaction.

## Roadmap

Only update a board when requested or within a previously authorized explicit
board-maintenance step. Default product board is `docs/ROADMAP.md`; a requested
repo-relative path must stay inside the repo. Preserve curated IDs, notes,
dependencies, north star, decisions and live deployment data. Read live/done/
planned/parked ORK trackers and legacy trackers, their evidence, references and
the person's instruction. Folder placement, checked boxes, file mtime and an
external board status alone cannot establish shipped/deployed state.

Author exactly one `roadmap` YAML fence: `v: 1`, stable `project`, `updated`,
`nodes`; optional `title`, `north_star`, `decisions`, `live`. Nodes have stable
lowercase kebab `id`, `title`, `kind`, `status`, optional repo-relative `impl`,
`ref`, one-line `note`, and `needs` IDs. Kinds: wave/feature/capability/infra/
decision. States: planned/next/active/blocked/done/descoped. Validate R1–R7:

1. One parseable fence, required fields and unique IDs.
2. Closed kinds/status enums.
3. Every dependency exists; graph is acyclic.
4. Done requires a grounded date and all dependencies done.
5. At most one next node, chosen from the dependency frontier/person's instruction.
6. Generated Mermaid/table markers match the actual renderer; never hand-write them.
7. Progress is computed, never persisted as a guessed field.

Use ORKEST_ROADMAP_BIN, falling back to GHOSTDEV_ROADMAP_BIN, or a verified local
CLI: check then render. No renderer means self-check and preserve/omit derived
sections honestly; do not fake generated output. Reconcile rather than replace;
an explicit fresh rebuild still provides a concrete diff. Dry mode writes
nothing. Report status changes with their evidence, validation and next pointer.

## Portable procedure storage and schema

Canonical procedures live at `docs/orkest/procedures/NAME/PROCEDURE.md`; recording
trail is `recording-source.md` beside it. During transition read existing
`.claude/procedures/NAME/PROCEDURE.md` without global/home scans or implicit moves.
If both exist with different content, stop that procedure for a precise conflict.
Names are lowercase kebab-case, at most 40 characters. Never overwrite an existing
procedure while recording. Keep runtime guard/state under the current worktree's
Git metadata or project-local `.runs/procedures/`, not a harness-specific home.

A procedure declares frontmatter `name`, `genre`, explicit `triggers`, `budget`
(max turns, wall-clock minutes, tokens and optional model recommendation), then
Should I Run Now? / Inputs / Steps / Verdict / Output Artifacts / Notes. Supported
genres are research-verdict, audit-report, refactor-sweep. Steps are ordered
research/synthesize/decide/gate/execute/report. Unknown/missing schema values,
unresolved placeholders or an unknown gate refuse execution. Model recommendations
never authorize launching another runtime or changing approvals.

## Record a verified procedure

Manual request only. Default lookback is 24 hours; accept an explicit h/d/ISO
window and topic filter. Gather actual Git commits and four-section logbook
entries in this repository; never harvest personal transcripts. Group by target,
source paths and history boundaries. Fewer than two commits and no logbook entry
means insufficient source material. If several arcs genuinely tie, ask which one.

Infer reusable inputs, ordered steps, explicit prerequisites, safe paths,
expected observations, verification and permission limits. Cite commit SHAs and
dated logbook entries for each inference in `recording-source.md` unless the
person explicitly requests no trail. Do not infer that a once-successful action
is always execute-safe or that historical permission persists into future runs.
Budget defaults must be labeled estimates; no invented actual token usage.
Uncertain gate/decision values remain a draft needing review, never runnable.

Show the concrete draft before an unprovided approval decision. An explicit
record-and-save request or auto-save scope already supplies authorization; do not
ask again. Preserve existing local procedures. Validate, write the scoped draft
and trail, append logbook and commit exact owned paths under the parent run's
contract. Report inference gaps and a dry-run validation path. No push/destructive
operations or automatic recurring schedule is implied.

## Execute a procedure

Require explicit manual or authorized scheduled dispatch; observed signals alone
do not trigger it. Resolve and validate the procedure and inputs. Apply all
current project/AFK/permission guards before any step. Acquire a project-local
recursion guard keyed by name and actual session; duplicate recursion refuses.
Clean up only this run's guard in finally, including failure/skip.

Evaluate every Should I Run Now predicate before steps. Standard predicates:
recent-run cooldown from dated logbook, weekly budget from an explicitly
configured local budget source, active-run no-trample using the adopter's actual
schema, and a nonempty candidate/target set. Missing mandatory inputs or unknown
checks refuse; absence of an optional budget source is reported. An explicitly
person-requested force can override a soft procedure gate with a logbook warning,
never project policy, recursion, AFK, writer or permission limits.

Execute ordered steps using argument vectors/available tools; no evaluation of
untrusted prose. Fanout is read-only unless isolated editing worktrees are
explicitly authorized; preserve per-task results and report failures. Synthesis
must distinguish actual source observations and inference. A decide step emits
exactly one fenced verdict with option ratify/defer/reject/escalate, confidence
0..1, rationale, override_hint, execute_safe boolean and typed follow_up entries.
No/malformed/multiple verdicts fail safely. A verdict never grants permissions.

Execution needs execute_safe true, an allowed non-notify action, authorized scope
and remaining budget with five-turn/three-minute reporting headroom. Otherwise
skip execution and report why. Internal bootstrap follow-up goes through this
skill's normal resolver/gates; in an unattended lane it cannot create peers or
promote. ADR follow-up appends only the specified grounded decision in CONTEXT,
verifies one occurrence and commits exact paths. Notifications default to console;
external messages require the person's explicit instruction and actual tool.
Unknown/external unsupported action types are reported, never silently dispatched.

An explicitly requested audit checkpoint receives the scoped diff, observations
and options using available review tools or inline review. Allow at most two
revise cycles; escalate the third or a real missing human decision. Capture each
action's result; partial failure remains partial, never full success. Append
four-section logbook at the end, never insert/rewrite prior history. Runtime
NDJSON records start/gates/steps/verdict/execute/finish in the local run directory;
no-commit/dry previews do not turn results into shipped claims. Report artifacts,
executed/skipped/failed actions, verification, budgets and remaining decisions.

## Fold-in inventory

| Retired suite skill | Internal owner |
|---|---|
| bootstrap-impl, clarify-impl | WORKFLOW grounded bootstrap/clarification |
| run-impl, tdd | WORKFLOW per-box loop and run helpers |
| qa-pass, logbook-append | WORKFLOW phase boundary |
| promote-impl | WORKFLOW final audit/promotion |
| audit-impl, hygiene-impl, triage-sessions | Doctor report and diagnostic boundaries |
| handoff, roadmap | This document's explicit operations |
| record-procedure, run-procedure | This document's portable procedure lifecycle |

This table is a historical mapping, not command aliases. `/orkest` remains the
only installed skill; these procedures are selected from the person's request.
