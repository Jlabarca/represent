---
name: orkest
description: Match or bootstrap a tracker and drive its verified implementation through promotion; doctor performs harness hygiene.
---

# Orkest

The sole suite skill is `/orkest [description]`; `/ork` is its short alias with
identical arguments. `/orkest doctor` is its read-only hygiene subcommand. Never
create another doctor skill, legacy skill aliases or deprecated skill stubs. Read [WORKFLOW.md](WORKFLOW.md) and the project's own
instructions before acting. The project rules and the person's settled decisions
take precedence over defaults here.
Read [PROTOCOL.md](PROTOCOL.md) for the ten rules and historical mapping,
[OPERATIONS.md](OPERATIONS.md) for internal handoff/roadmap/procedure work, and
[SAFETY.md](SAFETY.md) for the hook protection handover.

## Entry and intent

Parse the actual invocation: a description, exact ORK id, `doctor`, `--dry`,
`--no-commit`, `--no-promote`, or `--stop-at <step>`. Reject unknown flags before
writes. Doctor routes directly to its internal procedure; it never bootstraps a
feature named doctor and never runs a write-on-start upgrade as part of its check.

An ordinary person-invoked `/orkest` means **bootstrap if needed, then run through
all phases, verification, QA, logbook, final audit and committed promotion**.
It is the person's Rule 19 decision. No second promotion confirmation is needed.
An empty invocation resumes the recorded active live tracker; an unknown id or
ambiguous description needs a mandatory question. Done/planned/parked documents
are never silently resumed. A new description needs grounded phases, not a
generic placeholder task or a new tracker that duplicates an existing one.

Genuinely simple work takes the simple route instead of a tracker: at most two
source files or a documentation-only change, no new design, contract, schema,
infrastructure or security surface, one commit, and verification that runs in
minutes. Everything else, and anything the project's own rules exclude from the
route, gets a tracker. The `simple` helper still executes the verification,
commits exactly the named files plus a grounded logbook entry with the native
session trailer, and never edits trackers or project state documents. It is
interactive only; the AFK lane always needs its explicit tracker target.

Find the current repository root with Git and its installed `bin/orkest.py`.
Always pass that root explicitly to helpers as `--repo <root>` (there is no
`--root`), for example `python bin/orkest.py --repo <root> inspect <ORK-id>`;
`--summary` shortens inspect/start output. If a local prerequisite is missing,
inspect the configured local distribution and init/update procedure and repair
it within the authorized scope; do not download a release or guess credentials.
Startup reconciles the installed version separately. Starting a session does
not itself invoke feature work or authorize promotion.

Use `inspect` for read-only resolution and preflight; `start` establishes the
person's run and its single writer. Continue the action it returns by running
its `next_command` (normally `plan`, then `next` after each step); starting is not
the run. Editing, committing or ticking boxes outside the plan, checkpoint, verify
and commit-phase steps leaves no run evidence. Advance the session's own task list
at each checkpoint. Print the matched tracker and current phase, then work; do not
ask whether to start.
Run and test helpers with an argument vector or safely quoted explicit arguments,
never by evaluating commands copied out of tracker prose or tool output.

## Harness capabilities

| Concern | Claude Code | Codex | Grok |
|---|---|---|---|
| Mandatory input | AskUserQuestion when available | Available user-input tool; otherwise pause with the exact question | Available input tool; otherwise pause with the exact question |
| Planning/review | Native Agent/Plan/Explore where supported | Available collaboration tools, using their actual schemas | Native delegation where supported |
| Missing delegation | Perform the same checks inline | Perform the same checks inline | Perform the same checks inline |
| Hooks and startup | Use verified native wiring | Use verified adapter/wiring, including every file in apply_patch | Use verified startup integration; never assume Claude events |
| Vendor doctor | Invoke native `/doctor` when available | Report portable checks and actual native availability | Report portable checks and actual native availability |
| Waiting on a gate | `run_in_background` or one blocking `gate wait` | One blocking `gate wait` with a long tool timeout; no wake-up | Same as Codex; headless `-p` can exit before SessionStart finishes |
| Context loss | PreCompact hook writes the Live gates section | No compaction hook: update `.git/orkest/run-notes.md` before each long run | Same as Codex |

Keep frontmatter portable: name and description only. Do not emit Claude tool
names as if they existed in every harness, change approval/sandbox settings, or
launch a different model runtime to avoid a missing capability. Model/effort
columns are recommendations; report unavailable mappings and proceed with the
current session. Subagents may plan/review, but the coordinator owns the tracker,
index, integration and promotion. Concurrent editing workers require isolated
worktrees; they cannot stage or rewrite the shared tracker.

## Boundaries and stopping

Only invocation limits or a genuinely mandatory unresolved step stop the loop.
A phase boundary, green tests, an advisory QA punch list or unrelated dirt is not
a stop. Continue independent engineering when an interactive human gate blocks
other work; leave the gate and its unknown/dependent work unchecked. Ask only
when no required decision can be established from authorized source/evidence.
Record the precise stop and release the owned lock on every exit.

An installed `orkest-budget.json` enforces the person's Codex usage reserve at
safe start/next/phase boundaries. Default warning is 80% used; stop is 90% of an
applicable actual account window. Unknown metrics are reported, never inferred.
This explicit budget stop preserves the run ledger and releases only its owned
lock. It never interrupts an atomic TDD/box checkpoint or silently buys credits,
consumes resets, changes models or starts another task. See WORKFLOW's usage
policy for durable checkpoints and context compaction guidance.

Dry-run writes nothing, including locks, migration, counters and receipts.
No-commit is an unshipped preview and never promotes. Stop-at stops before its
named action. A failed promotion precondition is a punch list to repair, never a
request to waive it. A build/test failure surviving one fix, a genuine review
escalation, a policy hook that cannot be satisfied, or another live writer is a
recorded halt. Never amend a failed checkpoint or tick a box without evidence.

The scheduler/AFK lane is determined by dispatch origin, not elapsed time or
whether a person left the session open. A person-started run remains authorized.
AFK runs require their explicit target/branch/worktree, refuse any unchecked
human box or agent-blocked tracker, and cannot bootstrap peers, migrate, promote,
merge/rebase/push, operate submodules or write outside their worktree. A promoter
preview, if the adopter supports it, is a separate readiness-gated person action,
uncommitted in its sandbox. It is never dispatched by this skill's scheduler lane.

## Work in another repository

A box that needs a change inside a submodule or sibling repository uses that
repository's own worktree and branch: commit and push there, re-pin the pointer in
this repository, then confirm with `git merge-base --is-ancestor <pinned> <remote
branch>`. Never commit a pointer to a commit that exists only on this machine; a
fresh checkout cannot fetch it. The person's open checkout of that repository is
never switched.

Long test runs: pass the runner's hang timeout (for example `dotnet test
--blame-hang-timeout 3m`). Write long multi-line edit scripts to a file instead of a
large shell heredoc.

## Long gates and the verdict rule

1. Any command expected to run longer than about 2 minutes goes through
   `orkest.py gate run --name <slug> [--strict] [--phase P] -- <command>`: a detached
   supervisor writes `verdict.json` last, so the result survives a dead session or a
   compaction. Never start it as a raw background job and never judge progress by
   reading a log tail. A foreground verification call over 10 minutes is a defect.
2. No end of turn without a verdict or a pending record. Report each gate as
   `VERDICT: pass|fail|not-qualifying|timeout|killed|supervisor-lost` with the
   verdict path, or `PENDING` only when the harness cannot block longer, with the gate id,
   the exact `gate wait` command, the log path and the deadline. Ending with "still
   running" and no record is a protocol violation.
3. Do not poll. One blocking `gate wait <id> --max-s 240`, repeated as the deadline
   allows. After three consecutive "still running" answers, the next call is a blocking wait.
4. One live run per name: never start a second run of a gate that is live. Use
   `gate cancel` or `--replace` and report both ids. When a fix lands during a live run,
   decide at once: let it finish if its remaining work does not exercise the changed
   paths, otherwise cancel and rerun only what is affected.
5. A strict gate treats skips and missing prerequisites as not qualifying. Declare
   intended skips as `skip_budget` and prerequisites in the phase `> requires:` block;
   `orkest.py preflight` checks them in seconds and `verify` refuses without them.
6. Near the compaction point run `gate list --live` and write every live gate id into
   the checkpoint. After a resume, read the Live gates section of the handoff first and
   wait on those gates; never relaunch their commands. `gate ack <id>` marks a verdict reported.
7. An aborted, cancelled or budget-stopped gate gets a Blockers logbook entry naming
   the last accepted tier, the unfinished work and the exact next command.
8. Ingest a finished gate as evidence with `verify --gate <id> --phase P --box B`;
   it is accepted only when qualifying and when the gate ran on the current phase source.

## Final report

Lead with the verdict, derived only from recorded facts (`orkest.py report` prints
the skeleton):

```
VERDICT: PASS | FAIL | NOT QUALIFYING | TIMEOUT | KILLED | SUPERVISOR-LOST | PENDING
gate: <id>  head: <sha>  qualifying: yes/no  duration: ...
counts: passed X / failed Y / errors Z / skipped W   exit: N
reasons: <skips, missing prerequisites, deadline>   verdict file: <path>
unresolved: <failing gates, human boxes, pending inputs>
dirty_files: <from orkest.py dirty-report>
---
PROGRESS (not evidence): <free text>
NEXT: <one exact command>
```

Progress text is never phrased as a result. `dirty_files` is always present and names
every dirty path this run does not own, split into pre-existing and appeared during
the run; do not stage or revert them. Hitting a time or usage limit is a stated
stop, never silence.

## Evidence

Git commits and actual test execution are evidence. A checked box, a clean tree,
a successful vendor doctor or an external board status is not proof by itself.
Use `workflow-git.py` preflight, exact-file commit, phase-base audit-diff and final
check-complete. Preserve unrelated index entries and edits. Every source box,
plan, phase bookkeeping and promotion has its checkpoint and truthful native
session trailer. Report Shipped only when the commits, builds/tests and box-line
evidence exist; otherwise report Executed, unverified. Follow the complete
internal steps in [WORKFLOW.md](WORKFLOW.md).
