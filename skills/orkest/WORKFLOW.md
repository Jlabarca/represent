# Internal Orkest workflow

These are procedures inside `/orkest`, not additional skills or slash commands.
Use the project's canonical state/decisions and hard rules. Do not count external
board/session status as evidence or import external product code/assets.

## Read and resolve

Read project instructions, CONTEXT, documentation protocol and the matched live
tracker. Sweep CAPABILITIES, reference/ and done/impl history before a negative
claim or a bootstrap. Resolve exact id first, then deterministic title/filename
matches; ties ask, unmatched descriptions bootstrap, empty args use the active
target or ask. Do not confuse a description's words with shell code.

Finish read-only preflight before acquiring a writer: integration branch liveness,
conflicts, foreign locks/armed targets, source ownership inventory, Open Questions
and active-phase placeholders. Age and an advanced HEAD never prove a writer is
gone. Recover only a deliberately confirmed inactive owner, preserving its work.
Default interactive runs may preserve unrelated staged/unstaged/untracked work;
whole-file commits require ownership of every included hunk. Use source/docs to
resolve prerequisites rather than asking the person to enumerate discoverable
paths or commands.

The helper's run state and lock are per worktree, independent of document layout.
On a clean interactive tree with verified installed readers, the shared migrator
can apply the validated old-to-new transaction before target execution. A dirty
tree may defer only the layout move, using verified dual-read for an existing
legacy target. It cannot invent a compatibility receipt, bootstrap into a mixed
layout, hide a pending transaction, or promote before migration completes.
Startup/version progress and `.layout` completion remain separate.

## Simple-task route

Before bootstrapping, decide whether the description is genuinely simple: at
most two source files (or documentation only), no design or contract change,
one commit, verification in minutes, and the project rules allow the route.
If so, run `simple --title <one line> --paths <exact files> --input-file <JSON
logbook draft> --command-json <JSON argument array> [--tier docs|build|unit]
[--type fix|polish|refactor|docs|test]`. The helper preflights the branch and
budget, executes the command without a shell, records a receipt and commits
only the named files plus the four-section logbook entry (the legacy
docs/LOGBOOK.md while layout migration is pending). A failed verification
commits nothing. Tracker, CONTEXT, logbook and docs/orkest paths are refused,
as are more than two source files or test edits without behavioral
verification. Never split one real feature into several simple commits to
avoid a tracker; when in doubt, bootstrap.

## Bootstrap and clarification

When resolution says bootstrap, ground the design in real code and docs. Use
available planning/review agents in parallel where useful; otherwise work inline.
Draft 1–6 composable phases, with the first a small testable slice. Name exact
files, acceptance tests, dependencies, Model/Effort and behavioral verify tiers.
Use the installed ORK template and at most three Open Questions. Honor settled
operator decisions. Resolve ordinary choices from source-supported defaults;
defer genuinely expensive ambiguous choices with their dependencies. Ask only
for mandatory missing input, not routine approval of the bootstrap.

Pass the grounded draft to the bootstrap helper. The local allocator assigns
`KEY-N` when `docs/orkest/.key` declares a key, else `ORK-NNNNNN`; frontmatter id/H1 agree and the filename is the lowercase
`<topic>.imp.md` (H1 keeps DESCRIPTION_NAME). A description that already exists
as `.imp.md`, `-ORK.md` or `-IMPL.md`, in any lifecycle folder, is a collision.
Persist the counter with the tracker under the writer lock. Update CONTEXT first,
then TODO/index, append the grounded bootstrap logbook and commit the exact files.
No-commit remains a preview. Then **continue immediately into implementation**;
there is no bootstrap-only default in `/orkest`.

## Per-box loop

Helper protocol: `plan --phase N --input-file <grounded-plan> --paths <exact-source-files>`
records scope and commits the plan. Declare all touched project keys with `--projects`
(the default is `.`). Name expensive projects (Unity editor or device rigs, UI
end-to-end, long integration suites) with `--batched`: they stay in the declared
inventory but are proven once per phase at the boundary instead of per box, so
cheap unit checks run early and scarce resources run once. Batched proof is never
skipped: `next` demands it before `qa-pass`, and promotion re-verifies every
project. `verify --phase N --box <box-id> --expect red|green
--project <key> --command-json <JSON-argument-array>` executes the actual command,
without a shell. Inspect its `accepted`, exit code and counts; a rejected receipt
is a failed gate even when the helper successfully reports it. `checkpoint --phase N
--box <box-id> --paths <exact-owned-files>` earns the box only with fresh proof.
`next` recomputes the action from Git and receipts. After each source checkpoint,
run phase verification again against the committed source head. `release` removes
only the caller's lock; a later `start` retains the phase ledger. Always include
the explicit repository and actual session identity in helper calls.

On a cold resume, validate already checked/evidenced boxes with `checkpoint
--existing-commit <actual-full-SHA>` (or its unambiguous Git subject match).
The helper checks ancestry, the exact box ID and changed source paths, imports
no invented result and makes no empty commit. Re-run phase verification on the
current source before continuing. Completed phases retain their committed QA
snapshot when later phases evolve shared files; final promotion still requires
fresh verification of every phase/project against the final HEAD.

Runner summaries retain native skip and expected-result categories. The receipt's
verification `skipped` total includes native skips and expected failures; neither
earns a behavioral pass. Pytest xpasses retain their native category and count
as passes only with the runner's successful exit. Unittest unexpected successes
remain failures. An all-excluded run never supplies green verification.

A skip is not a pass: a green receipt requires `skipped` within the skip budget,
which is 0 unless the phase's `> requires:` block declares `skip_budget: N` or the
call passes `--skip-budget N`. Name the allowed skips and why in the plan. A rejected
receipt carries `reject_reason`. Receipts also record `started_at` and `duration_s`.

1. Establish the runnable phase from its dependencies, not checklist order alone.
   Capture the phase-base SHA before its first plan/source checkpoint. Read its
   Model/Effort and verify tier. Preserve unknown/human dependencies unchanged.
2. Inventory source-content files. For two or more, obtain a concrete plan using
   available delegation, append it under `## Plan — PHASE`, and commit it before
   source edits. Pure documentation/single-source work records a waiver. Include
   touched project/test roots and exact verification commands. Update the plan
   explicitly if the owned file inventory changes.
3. Sibling guard before adding a route, tool or adapter, handler, migration or enum
   value: find its nearest sibling and `git grep` every place the sibling appears
   (registries, indexes, catalogs, architecture tests); list those surfaces in the Plan
   and update them in the same box or justify them. Do not assert exact counts of
   growable collections; assert membership or derive the expectation from the source of
   truth. An intentional pin states its reason in the assertion message.
   TDD for behavior: one meaningful failing assertion, run it, minimal code to
   green, then refactor with green tests. A typo/import error is not the required
   red. Do not batch speculative tests or claim a never-run test. Nonbehavioral
   documentation/rename work records its justified verify tier; test-writing
   work must execute at least unit tests.
4. Use the verify helper with the actual command argument vector, expected red or
   green, phase/box and project. It records execution, output/counts and source
   fingerprints. Never pass invented passed/total numbers or treat an external
   status as a receipt. Re-run after relevant source changes.
5. Re-read the box's criteria. Tick only proven work, with an evidence suffix on
   that same line. Never tick a human box from inference. The checkpoint helper
   includes the tracker and exact owned files through workflow-git.py. Include
   the box id in the subject, actual verification/exit code in the body and the
   native session trailer. Preserve unrelated pre-staging. No blanket add, no
   amend, no branch switching or hidden prerequisite commits under no-commit.
6. Repeat without stopping for a green box. If a real failure survives one fix,
   report it, retain reviewable work and release the owned lock.

## Phase boundary

Use `qa-pass --phase N` to capture the complete owned phase-base diff and actual
committed-source test receipts. Review its findings with the available audit
capability. `logbook --phase N --input-file <JSON-draft>` accepts grounded string
lists named `accomplished`, `decisions`, `blockers`, and `next`. `commit-phase
--phase N` writes CONTEXT first, tracker/TODO, the append-only entry and the QA
report in one scoped documentation commit. Then use `next` and continue.

Execute the declared verification of every touched project, tests included.
Require actual behavioral execution where declared; all-skipped is not green, and a
partly skipped run is green only inside its declared skip budget.
Verify receipts against committed source fingerprints and their phase source
head. A plan, assertion string, clean status or compile-only check cannot prove
test execution. Preserve skipped counts and all command results.

Run QA against the complete phase-base diff, including committed, working and
untracked owned paths. Check box evidence/commits, tests changed and run, build of
test projects, current Updated date, valid index links and logbook coverage.
Collect advisory findings and continue; a build/behavioral failure is a gate.
Do not call an uncommitted preview Shipped.

Append a four-section logbook entry: Accomplished / Decisions / Blockers / Next.
Derive decisions from verified choices, never invent operator rationale. The
person's run already authorizes its bookkeeping; no second apply prompt. Never
rewrite prior entries. Update CONTEXT first, then tracker status/TODO/index with
the QA verdict, and commit phase bookkeeping. Continue the next runnable phase.

## Final audit and promotion

After committing the reference and remaining owned bookkeeping, execute final
verification for every phase/project against current HEAD. `audit --phase N
--input-file <grounded-final-review>` validates gates and records that review;
`promote --phase N` rechecks them, moves/rebases the tracker and links, commits
the exact promotion files and runs `workflow-git.py check-complete`. The helper
passes its executed test receipts directly to the checker; an absent external
rail does not waive the skill's own verification gate.

Before promotion, finish owned implementation and tracked bookkeeping, reconcile
the exact changed-path inventory with Git and verify the final implementation.
Create a missing reference from verified source rather than asking a routine
question. A genuinely undecidable contract still needs mandatory input.

Require all required boxes evidenced and committed, no open bugs or author
do-not-promote marker, an existing truthful reference (shape is machine-checked;
content remains a review judgment), fresh behavioral receipts and no owned dirt.
Use an independent auditor when available; otherwise perform the same audit
inline and state that capability. Failed gates produce a punch list, never a
proceed-anyway question. Advisory QA does not waive tests or required human gates.

Only the person's default run authorizes APPLY. No-commit/no-promote/stop limits,
pending migration and every unattended run withhold promotion. Mechanically move
the tracker to done/, rebase incoming/outgoing links, update CONTEXT/TODO/index,
append LOGBOOK and CAPABILITIES, then make exactly one promotion commit. Verify
the archived tracker, reference, indices and all owned changes are committed at
HEAD with workflow-git.py check-complete before reporting success or emitting a
done event. The commit itself is the reversible review surface.

## Codex usage and context policy

Keep the authorized goal intact while working in bounded slices. Check actual
usage at run/phase boundaries through the available host tool or the internal
`bin/orkest.py budget --repo <absolute-root> --harness codex` helper. The helper
uses only native initialize/initialized/account/rateLimits/read RPCs, without a
model call, login, reset, credit action, thread creation or settings change.
An installed `orkest-budget.json` configures 80% warning/90% reserve defaults.
Actual Codex bucket/window facts win; missing, stale, null or unavailable values
are UNKNOWN, not zero or an assumed five-hour quota. Short sanitized caching
avoids repeated service calls. Other harnesses do not query the Codex account.

The runner checks before acquiring a start lock and at safe next/phase boundaries;
it does not interrupt TDD or an atomic source checkpoint. A configured reserve
stop records its reason, preserves phases/verification/index and releases only
the caller's lock. Resume normally when quota/policy permits. Explicit user
policy changes remain authoritative; never bypass a stop on your own. Dry and
doctor paths do not query/cache usage. A new chat never resets account allowance.

The run ledger persists every source checkpoint; keep a concise human-readable
continuation checkpoint after two boxes or about 20 minutes. Name actual HEAD,
phase/next action, owned edits, test receipts, pending inputs and unresolved gates.
Reuse it instead of re-reading large unchanged histories. Default routine tool
output to about 1,500 tokens, save long logs and report totals/failures/paths. Run
required verification once; repeat after relevant changes/failures/new concerns.

Message budget: emit progress only at a box checkpoint, a phase boundary, a first
failure, a needed decision, or after at least 20 minutes. "Still waiting" and "no new
failure" are not events. Collapse identical status lines and never repeat an unchanged
log tail. Do not re-read a log whose command already ended with an exit code and counts;
open it only on failure and read the failing section. Between launching a blocking wait
and its return, send no messages and make no other tool calls.

When native context stats are available, prepare handoff/compaction near 70% used
and finish the safe checkpoint before another large slice near 85%. The account
RPC does not supply context usage: until the host provides that metric, context
thresholds are instruction guidance, not a claimed hard numeric guard. Report
UNKNOWN rather than estimating. Use actual native compaction when available for
the same objective. A fresh task still requires explicit user authorization;
carry a compact handoff rather than the transcript. Do not create tasks or change
model/effort automatically to work around limits.

## Doctor and ancillary duties

Doctor checks layout, identities, broken links, tracker drift/evidence, policy
wiring/disables, promotion candidates and agent branches. It is read-only unless
explicit fix is requested; even its preflight must not trigger migration. Native
doctor/session tools are conditional and their output is diagnostic, never
implementation evidence. Prefer verified local session/digest sources when a
service is unavailable. Branch deletion requires the proven zero-ahead/unowned
class and `git branch -d`; patch-equivalence is only a report for a person.

Run `bin/orkest.py doctor --repo <absolute-project-root> --harness <actual-harness>`.
The JSON report separates findings, registered skill roots, policy status,
consumer readiness, promotion candidates and branch proof classes. It does not
write caches, locks, the index or global configuration. A checked box requires an
exact box reference in a local Git subject; this diagnostic is not a substitute
for the run engine's verified receipts. Fenced identity examples are document
content, not real identity claims. Missing components are reported explicitly.
Never repair a drifted skill by overwriting a possible local customization.
On a large repository the report can exceed the tool output limit: write it to a
file outside the project and summarize from that file; never judge a truncated
report. A proposed link fix is a basename match, so name what each destination
is before applying `--fix`. A foreign writer lock names its session and its idle time; a lock
held by a running session is waited for, never cleared, and one idle past the stale window is recovered by the next write.

The current session service GET and digest generator both write state; do not
invoke them during read-only doctor. An existing project-local JSON export may
be supplied with `--session-report`: schema 1, absolute `repo`, source
`methrep-cache` or `digest-cache`, `scannedAt`, and `sessions` rows containing
`id`, `state`, `stateEvidence`. Report its historical timestamp and quote state
evidence as diagnostic claims. Never reinterpret it as implementation proof.
Without such an export, report unavailable and continue portable checks.
Supplied exports are explicitly unverified historical snapshots. Their claimed
source and timezone-qualified timestamp do not attest provenance or freshness.

In the active Claude harness only, invoke native `/doctor` if that actual
capability is available and quote its observed output. The helper never starts
a different runtime. If an existing project-local observation is available,
`--native-doctor-report` accepts JSON with `harness: claude-code`, absolute
`repo`, `observedAt` and verbatim `output`; it remains an unverified diagnostic
observation. Codex/Grok finish the portable report with native doctor unavailable.
Do not create diagnostic input files merely to run a read-only check.

`doctor --fix` first collects the complete read-only report. Dry, no-commit and
unattended invocations remain read-only previews. Interactive repair requires the
live integration branch, the actual session identity, no foreign/active writer
and no armed scheduler targets. A required migration runs first with verified
readers and registered consumer readiness, as its own refactor commit; otherwise
repair defers. It never stamps a marker to conceal an incomplete transaction.

The safe set is deliberately narrow: clean files with one local link destination,
an existing unique frontmatter identity plus an otherwise matching H1 missing
only that ID, and the adapter's owned hook changes. Keep explicit disables,
empty event arrays and local handlers. Preserve dirty/untracked files, malformed
groups, conflicting identities and ambiguous destinations. Revalidate old,
zero-ahead class A branches and worktree ownership immediately before `git branch
-d`; class C, unmerged, young and in-use branches stay. Commit the remaining
repair set, context/logbook and report with exact paths in one fix commit.
Restore only this transaction's unchanged writes/branch refs on commit failure;
preserve unrelated index entries and concurrent user edits. A second clean check
does not produce another repair commit.

The final single skill also owns internal handoff, roadmap and procedure duties.
Handoffs quote the actual request, phase, receipts, pending inputs and next safe
action. Roadmaps reconcile real tracker/reference state and never create shipped
claims from heuristics. Record procedures only from verified work, preserving
preconditions, exact scoped commands, expected results and permissions. Execute
a recorded procedure only after its run gate; delegation cannot grant broader
permissions. Keep procedure storage portable and preserve local custom content.
