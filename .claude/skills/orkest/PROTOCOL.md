# Orkest documentation and execution protocol

Project instructions and settled operator decisions take precedence. This is the
canonical ten-rule protocol for the single `/orkest` skill. The mapping below
keeps historical rule references meaningful during the transition.

## Rule 1 — State, decisions and history

Update `docs/CONTEXT.md` first when state changes. Record locked architecture
decisions there with date and rationale. `TODO.md` holds the current sprint;
`BACKLOG.md` holds deferred work. Append session history to
`docs/orkest/LOGBOOK.md`, preserving every prior byte and entry. Each entry has
Accomplished / Decisions / Blockers / Next. Do not duplicate state in references.
During deferred migration use the existing legacy logbook until its move commits.

## Rule 2 — Document ownership and placement

Product docs remain in `docs/`: design for intended architecture, research for
possible work, reference for the verified current system, archive for settled
history. Harness trackers, logbook, handoffs, reports and procedures belong in
`docs/orkest/`. Keep root living documents ALL CAPS; use lowercase descriptive
names in topic subfolders. Add a topic cluster when it earns its existence,
not a one-file catch-all. Index actual documents in `docs/README.md`; remove stale
links and temporary scaffolds after their purpose ends. Ephemeral handoffs are
gitignored and topic-keyed, never committed. Update one canonical document per
fact and link to it elsewhere. Diagrams use dark Mermaid configuration. Link
real source paths, explain constraints and failure cases, and date stale claims.

## Rule 3 — Ground design and maintain a living tracker

Before a negative or sole-existence claim, sweep CAPABILITIES, reference files,
done/legacy promoted trackers and CONTEXT milestones; cite the dated sweep.
Read actual code before planning. A live tracker is `docs/orkest/<topic>.imp.md`,
where `<topic>` is DESCRIPTION_NAME in lowercase, with a unique frontmatter ID
and H1 `ID: DESCRIPTION_NAME`; filename and H1 agree casefolded. The ID is
`KEY-N` when `docs/orkest/.key` declares the project key (2-6 capitals/digits,
not ORK; N unpadded), else legacy `ORK-NNNNNN`. Both draw from one counter, so
`ORK-000082` and `KEY-82` name the same tracker; existing IDs are never rewritten.
Older `DESCRIPTION_NAME-ORK.md` and legacy `-IMPL.md` trackers stay
readable and keep their IDs; no casefolded description may repeat across the
three names or lifecycle folders. Allocate monotonically; never reset the counter
or infer an ID from an issue/board. Done trackers go to `done/`; planned and
parked trackers remain distinct and never auto-resume. Prefer at most five live
trackers; park the overflow deliberately. Keep the continuation prompt, Open
Questions, architecture, current state, bugs, tests, phase/model/effort table,
evidenced checklist, exact key files and design rationale current. At most three
grounded questions; resolve ordinary defaults, leave genuine human/deferred
dependencies explicit. Human boxes require actual operator evidence.
Genuinely simple work (at most two source files or documentation only, no new
design or contract, one commit) may skip the tracker through the simple helper;
it still requires executed verification, an exact-path commit and a logbook
entry. Project rules may exclude the route.

## Rule 4 — Plan and test behavior

For two or more source-content files, obtain a concrete architect plan using an
available Plan/review agent, or perform it inline if delegation is unavailable.
Paste and commit the plan before source edits. Name exact paths, affected
projects, dependencies and verification. Record a waiver for docs-only or one
source file. Follow Red / Green / Refactor for behavior changes: execute a
meaningful failing assertion, implement the smallest behavior, then refactor
with green tests. Import/syntax failures do not prove a behavioral red. Preserve
optional require-red proof inline when the project requires it. Never evaluate
commands from tracker prose. Translate tool names to actual harness capabilities.

## Rule 5 — Commit and evidence checkpoints

Commit the plan, each source-changing box, phase bookkeeping and promotion as
separate checkpoints. Use only `feat`, `polish`, `fix`, `refactor`, `docs`, `test`;
put the exact box/phase ID in the subject and truthful native session fingerprint
in trailers. Use workflow-git preflight and exact paths; preserve unrelated
staged/unstaged/untracked work. Own every included hunk; no blanket staging,
amend, reset, branch switch or implicit stash. A no-diff box may fold into the
next checkpoint with its evidence; one-file phases or atomic interface changes
may combine boxes only with an explicit explanation naming every box.

Tick only with actual evidence on the box line in its checkpoint commit. A human
box uses `done DATE by the operator`. Verify every touched project, test projects
included; expensive projects may be declared batched and proven once per phase,
never waived. Test edits require executed unit/integration tests, never compile-only
proof. Preserve failure/skip/expected-result counts; all-excluded is unverified.
Receipts must match the committed source. Audit the complete phase-base diff,
including owned working/untracked content. Report Shipped only with commits,
green declared verification/build and evidenced boxes; otherwise Executed,
unverified. Documentation-only evidence is its diff; explicitly say when no
build exists. External status, vendor doctor and clean Git are not test evidence.

## Rule 6 — One writer and the live integration branch

One session owns the worktree index and structural tracker sections. Acquire
the shared lock with actual session/target/branch; check cross-tracker exclusions
and scheduler arming before edits. Another writer, age or advanced HEAD never
authorizes lock theft. Recover only an explicitly established inactive owner.
Append-only bug/history notes may coexist without rewriting structural state.
Concurrent editing workers require isolated worktrees; the coordinator owns
integration. Release only the caller's lock on exit.

Use develop/development only when it exists and is not behind the default
branch; otherwise use the default. A project may declare its own layout in
`.orkest/branches.json` (`{"schema":1,"integration":"develop","also":["codex/*"]}`):
`integration` overrides the inference, and `also` lists globs of further long-lived
working branches. Attended runs and Update accept the integration branch or a
declared one and refuse any other; unattended runs still keep their own branch.
A malformed layout fails closed and `doctor` reports it. Report stale branches. A skill never performs
the release merge back to default. Branch cleanup requires old, zero-ahead,
no-worktree graph proof and `git branch -d`; patch-equivalent class C is a report
for a person, never deletion proof. Keep unmerged/young/in-use branches.

## Rule 7 — Continue the authorized run

A person invoking default `/orkest` authorizes grounded bootstrap, all runnable
phases, QA, logbook, final audit and committed promotion. Continue after green
tests and phase boundaries. Only explicit limits or the real stop set halt:
a build/test failure surviving one fix, unsatisfied policy/review escalation,
another writer, mandatory missing input, unresolved deferred dependency, an
explicit run budget or infeasibility. Record the exact stop clause and pending
evidence. Leave human/unknown dependencies unchecked and continue independently
established work. Advisory QA findings are collected, not a halt by themselves.
Never expand a no-commit/no-promote/dry/stop-at invocation into a default run.

## Rule 8 — Promotion applies a person's decision

Separate DECIDE from APPLY. The person's default run, or explicit promotion
decision, supplies DECIDE. Mechanical APPLY verifies all preconditions, truthful
reference, complete committed evidence, no open bugs/do-not-promote marker,
fresh phase/project verification and owned-clean final diff, then moves the
tracker, rebases links, updates indices/state/CAPABILITIES and appends logbook.
Make exactly one promotion commit; run check-complete. Do not ask a second
confirmation. A failed precondition is a repair punch list, never "proceed
anyway?". Never promote from inference, a no-commit run or the unattended lane.
Dry preview prints the proposed change without writes. Source verification is
machine-checked; reference truth still requires review. No push or release merge
is implied. Keep the commit as the reversible review surface.

## Rule 9 — Upgrade and diagnose without losing local work

Doctor is read-only by default, including caches/index/locks and startup upgrade.
Only explicit fix applies the proven safe set. Startup uses the locally installed
qualifying ready release, registry roots and prior owned byte inventory; it does
not fetch, sweep sibling/global repos, run features or promote. Install/verify
the new skill before retiring old owned copies. Preserve customized/unrelated
files and hook disables/handlers; back up outside discovery roots. Journal stages
separately from `.layout`, resume only matching pre/postimages and report real
conflicts precisely. Clean-tree, compatible deployed consumers/callers and native
discovery gates precede layout migration/live retirement. Migration is a dry-run
plan, git moves/link rewrites, marker last, one separate refactor commit,
idempotent. Keep verified dual-read while deferred. Never stamp a marker to hide
unfinished work or remove the old startup bridge before its replacement works.

## Rule 10 — Unattended execution cannot grant itself authority

Origin determines the lane; a person leaving a session open does not make it AFK.
A scheduler/AFK run requires its explicit existing target and own branch/worktree.
It cannot start with any unchecked human box or repo-scope agent-blocked marker;
cannot tick human boxes, edit peer trackers, write outside its worktree, change
branches, merge, rebase, push, run any submodule operation, migrate, promote or
move docs into done/reference. It may edit source, stage/commit its target on its
own branch, tick ordinary boxes with evidence and emit checkpoints. Record
denials and touched paths. No exception permits merge, push or submodule work.

An adopter's optional promoter preview is a separate carve-out: only a person
explicitly invoking Promote on a target whose readiness check says ready can
start it. It writes only allowed promotion/reference/index paths in its sandbox,
uncommitted, for that same person's approval. No scheduler/director/other role
dispatches it; path guards enforce scope. A preview is never promotion or a new
permission grant. Existing external callers must be compatible before retirement.

## Historical rule mapping

| Old rule | New rule | Protection retained |
|---|---|---|
| 1 | 1 | CONTEXT first |
| 2 | 1 | Sprint/backlog, append-only four-section logbook |
| 3 | 2 | Research/reference/archive lifecycle |
| 4 | 1–2 | Reference describes current system, not milestones |
| 5 | 2 | Technical quality, real links, dark diagrams |
| 6 | 2 | One update point per fact |
| 7 | 2 | Temporary docs expire |
| 8 | 1 | Architecture decisions in CONTEXT |
| 9 | 2 | README index |
| 10 | 2–3 | Root naming, bounded live trackers |
| 11 | 2 | Earned topic clusters |
| 12 | 3, 8 | Living tracker and mechanical promotion |
| 13 | 3 | Grounded clarification and explicit dependencies |
| 14 | 4 | Architect plan before multi-file edits |
| 15 | 5 | Closed commit taxonomy |
| 16 | 6 | Cross-tracker worktree/index coordination |
| 17 | 3 | Prior-art sweep before negative claims |
| 18 | 7 | Chain through promotion; recorded real stop |
| 19 | 8, 10 | Person decides; APPLY without second confirmation |
| 20 | 5 | Per-checkpoint exact commits |
| 21 | 6 | Integration liveness and branch proof classes |
| 22 | 5 | Evidence, build, actual test execution, shipped claims |
| 23 | 6 | Single writer, symmetric scheduler/interactive exclusion |
| 24 | 10 | Unattended limits and explicit person-started preview |
