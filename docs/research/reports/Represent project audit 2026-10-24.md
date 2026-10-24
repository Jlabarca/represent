# Represent project audit, next steps and ideas (2026-10-24)

> Operator-requested report, written the same day the [Orkest platform design](Represent%20within%20Orkest%20platform%20design.md) was audited and [REPRESENT-ORKEST-IMPL](../../REPRESENT-ORKEST-IMPL.md) bootstrapped. Evidence was gathered on 2026-10-24 from the `codex/represent-v0` checkout at `d46a4cf`: the full test suite was run, Git state inspected, stores and experiments measured, and source sampled. No model call, paid run or service start was involved. Where a claim is an opinion rather than a measurement, it says so.

## Verdict

Represent is in good technical health and poor housekeeping. Three small tools work, are tested (57/57 today) and cost nothing to run; the research record is unusually honest about limits; the design for living inside Orkest is audited and bounded. What is weak is everything around the code: 21 commits have never left this machine, the project has no real `CLAUDE.md`, the methodology install regressed without being committed, the root README still describes a pre-implementation project, and the local evidence stores hold private material that only exists here. Fix the housekeeping first (an afternoon), then run the operator's Phase 0 review, then build Phase 1 of the tracker. The feature ideas below are ordered so that the cheapest ones also validate the design.

## 1. State audit

| Dimension | Measured on 2026-10-24 | Grade | Note |
|---|---|---|---|
| Tests | `node --test tests/*.test.mjs`: 57 pass, 0 fail, 0 skipped, 85 s. Eight test files, 641 lines. | Good | Runtime is dominated by server tests binding real loopback ports. No CI runs them; only a human does. |
| Code size | `src/`: Visu 703, Alegor 496, Grafe 262 lines. `web/`: Visu 254, Alegor 415, Grafe 40 lines. One `TODO` in source. | Good | Small enough to read whole. Grafe's web app is dense single-line code; it is the least readable file. |
| Dependencies | Root `package.json` has none. Grafe depends on `typescript@5.9.3` only. Node 22.23.1. | Good | Supply-chain surface is one package. Keep it that way; the hub must not change it. |
| Security posture | Every server binds `127.0.0.1`, injects a per-process token, checks exact Origin, allowlists project roots from config. All Git calls use `execFileSync` with argument arrays (no shell). Bounded reads: Grafe 2000 files, 1 MiB per file, 32 MiB total; Alegor 12 docs, 240 kB, 40 commits; Visu 3 images and $1 per project by default. | Good | The audit of the design confirmed the tool pages cannot be reached cross-origin, which is why the hub is needed. |
| Accessibility | ARIA and role markers: Visu 13, Alegor 10, Grafe 4. Keyboard and touch alternatives recorded in the browser checks. | Fair | Grafe is behind the other two. |
| Documentation | CONTEXT, TODO, LOGBOOK, README index, four promoted references, learning record, Visu guide, Orkest design, new tracker; all relative links checked this week. | Good | Root `README.md` is stale (see finding F4). "Opus 5.5" appears in three places where Fable 5.1 did the audit. |
| Methodology install | `.ghostdev/version.json` working copy says v0.1-285 with rules 15, skills 10, hooks 3, statusline off; the committed file says v0.1-159 with rules 17, skills 14, hooks 6, statusline on. `qa-pass/SKILL.md` also modified. Uncommitted since 2026-10-16. | Poor | Either the upgrade removed components on purpose and nobody recorded why, or the install is half-applied. |
| Git hygiene | `codex/represent-v0` is 21 commits ahead of `origin/main`; last push 2026-10-19. Ten dirty paths in the main checkout, including an untracked placeholder `CLAUDE.md`, three untracked `bin/` scripts, and `notion/` (12 files, 4 MB). Two app worktree branches exist. | Poor | One disk failure loses a week of work. |
| Local evidence | `.represent/visu` 24 MB with `rompe`, `luz`, `imagelab`, `assets`; six pilot and update-proof stores (12 MB); `alegor-restart-sessions-copy` 89 MB of captured session data; `references/` 930 MB of ignored clones. No Grafe or Alegor store exists at the `%LOCALAPPDATA%` default, so the trials wrote to explicit `--store` paths. | Fair | All of it is gitignored and exists only on lab1. The 89 MB session copy is private material and should be deliberately kept or deleted, not forgotten. |
| Product state | Visu paused at automatic discovery (two promoted slices). Grafe and Alegor promoted MVPs. No public deployment, no unaided user, no market signal. | As recorded | Nothing has changed since 2026-10-21 except the design. |
| Orkest readiness | Cockpit fork live on the lab1 dashboard; adapter and session readers done; unattended path gated (OQ-8 approved, kit offline, no agent has run). | External | Represent's plan does not depend on the gated part. |

## 2. Findings, ranked

- **F1. Unpushed work.** 21 commits on `codex/represent-v0` are not on the remote, which still points at `main`. Risk: total loss of the Visu, Grafe, Alegor and design work on a disk failure. Fix: push the branch and set the remote default branch, or merge to `main` and push. Five minutes.
- **F2. No real `CLAUDE.md`.** The untracked file is the ghostdev template with `{project-name}` placeholders. Every fresh session gets no project instructions beyond the umbrella `D:/ware/CLAUDE.md`. Fix: fill stack (Node 22, zero deps, three tools, ports 8871/8873/8874), session rules (no paid run without the operator, tool stores are immutable, branch is `codex/represent-v0`), the Phase 3 absolute-path rule for the Ghost layer, and commit it. Twenty minutes.
- **F3. Methodology install regression, uncommitted.** The version bump to v0.1-285 drops rules, skills and hooks and turns the status line off. If intended, commit it with the reason in LOGBOOK; if not, rerun `bin/ghostdev-init.ps1 -Execute` and compare. The untracked `bin/` scripts (`branch-reaper`, `promote-check.py`, `workflow-git.py`) belong to the same reconciliation. Thirty minutes.
- **F4. Stale root README.** It still frames Represent as "LLM-based visual representation projects" with creatures and cities, lists only Grafe and Alegor in the table, and names Opus 5.5 as the auditor. Fix: one status paragraph pointing at CONTEXT, the three tools with ports, the Orkest design and tracker. Fifteen minutes. Also replace "Opus 5.5" with "Fable 5.1" in CONTEXT line 13 and the learning record where it describes what happened (not where it records what was planned).
- **F5. Worktree cut from `main`.** The desktop app creates session worktrees from `main`, which lacks the Represent docs. This session lost time to it; a memory now records the fix. Durable fix is F1: make the remote and default branch match the real work.
- **F6. Private data in ignored stores.** `alegor-restart-sessions-copy` (89 MB) holds captured personal session text; `.represent/visu` and the pilot stores hold captured project text and generated art. None is backed up. Decide: export what matters with the tools' own export commands to a private location, delete the rest, and write the decision in LOGBOOK.
- **F7. No continuous test run.** 57 tests run only when a human remembers. A GitHub Actions workflow running `node --test` on push costs nothing and needs no secrets, because no test calls a model. Fifteen minutes once F1 is done.
- **F8. Grafe's web app is unreadable.** 40 lines for a full UI means very long lines. It passed its browser checks, but the next change will be slow. Reformat with no behaviour change, protected by the existing 16 browser checks.
- **F9. Two stale app branches.** `claude/project-overview-be308c` and this session's branch. Delete the first if its work is merged or abandoned; delete this one after fast-forwarding.

## 3. Next steps, in order

1. **Housekeeping day (F1 to F4, F7, F9).** Push, fill `CLAUDE.md`, reconcile the methodology install, refresh the README, add the test workflow, prune branches. Commit each as its own `docs` or `fix` commit.
2. **Operator Phase 0 of REPRESENT-ORKEST.** Confirm or override OQ-1 (hub), OQ-2 (hub store under `%LOCALAPPDATA%/Represent/hub/`), OQ-3 (methrep workspace id, case-folded), and the boundary that methrep keeps its name. Then review the five UX mockups (0.2 and 0.3). Nothing else in the tracker starts before this.
3. **Phase 1: artifact record and CLI attach.** The cheapest proof of the whole design: record schema, exports from three tools, Grafe HEAD capture and symbol routing, a CLI attach, a Plane Sync trial. Zero model calls. If the record is not useful when reopened a day later, stop before building the hub.
4. **Decide the private stores (F6).** Export or delete before the hub starts indexing stores.
5. **Phase 2 and 3** as planned. Phase 3 is the first Ghost edit; do it from a Represent session by absolute path, following `layers/rima`.
6. **Deferred tool work stays deferred** until Phase 3's live UX round: Grafe larger-project validation, Alegor unaided re-entry, Visu stale-document corrections. They are listed in TODO and should not jump the queue.

## 4. Improvement ideas for the existing tools

These change nothing about the liked experience; they make the tools more trustworthy or cheaper to maintain. Cost is relative (S under a day, M a few days, L more).

| Idea | Tool | Why | Cost |
|---|---|---|---|
| Record HEAD, ref and dirty flag per snapshot | Grafe | Already required by the artifact record; Visu and Alegor do it. | S (in Phase 1) |
| Symbol deep links (`#/project/snapshot/symbol`) | Grafe | Shareable focus; required for the Orkest handoff. | S (in Phase 1) |
| Reformat `web/grafe/app.mjs` | Grafe | F8. | S |
| Parallel test files or shared server fixtures | all | 85 s per run discourages running tests; most time is port binding and TypeScript program creation. | S |
| GitHub Actions `node --test` | all | F7; no secrets needed. | S |
| ARIA parity for Grafe | Grafe | 4 markers versus 13 and 10. | S |
| Static HTML export of an artifact | all | A self-contained page a reader can open without any server; the design's `view.static`. | M |
| Citation re-hash on open | Alegor, Visu | Mark each cited excerpt as matching or drifted against the current file. Alegor already compares snapshot and HEAD; extend to lines. | M |
| Stale-document conflict panel | Visu | The Luz lesson: when two sources disagree, show both with dates rather than one explanation. Improves correctness without a new image. | M |
| Measured incremental re-index | Grafe | Hash per file, rebuild only the TypeScript program for changed files' neighbourhood; measure before claiming a speedup. | L |
| tree-sitter or SCIP front end | Grafe | Second language without a second checker; the grafe-restart experiment already decoded SCIP fixtures. | L |
| Replaceable AI endpoint for Visu | Visu | Named in the design; needed for any standalone user without the Ghost gateway. OpenAI-compatible endpoint with the same cost display. | M |

## 5. Creative new features

Ordered by how little they need and how much they would teach. Each names what it would prove.

1. **Context pack for agents.** `represent context <project> --task <id>` writes a bounded Markdown file: Alegor's brief, the Grafe neighbourhood of the symbols the task names, Visu's current chapter summaries, every excerpt cited with path, lines and hash. Paste it into Claude or Codex, or let Orkest's composer carry it. Proves the artifact record is useful to an agent, not only to a person. Needs Phase 1 only.
2. **Explain this change.** Given two revisions, produce one page: which Visu chapters changed, which Grafe symbols gained or lost callers, what Alegor's brief says moved. Attach it to a PR or an Orkest decision. Proves the three tools compose. Needs Phase 1 and the static export.
3. **Project identity badge.** Export Visu's illustration as a repository social preview and a README badge with the capture revision in the alt text. Zero new art; one export command. Proves whether the memorable overview travels outside the tool, which is the cheapest external signal Represent can get.
4. **Cross-project morning brief.** Alegor over every registered project: what changed, what is declared next, what is unknown, each line cited. The operator has tens of repositories and Orkest already has the project grid; this is the brief beside it. Proves Alegor's companion role before any conversation UI. Needs the hub registry.
5. **Living poster from history.** The Gource lesson applied to Visu: chapters pulse with commit activity over a chosen range, pins light where files changed, no new image generated. Proves the animated poster ambition can start from history rather than from runtime tracing.
6. **Evidence drift alarm.** When an artifact is opened and a cited excerpt no longer matches, show it in red and offer a manual re-capture. Later, let the Orkest surface show a count of drifted artifacts per project. Proves records stay honest over time.
7. **Caller and test shadow.** In Grafe, dim callers that have no candidate test and brighten those that do; one toggle, data already in the snapshot. Proves the explorer can answer a maintainer's question in one glance.
8. **ROMPE as an explorable scene.** The owner's chosen direction: the pixel-art overview becomes a walkable map where chapters are places and pins are doors to evidence. Build it only for ROMPE, only from existing art and captured evidence, as a Visu view mode. Proves whether the game-like overview earns its cost on the one project whose style fits it.
9. **VS Code thin shell.** A webview that opens the hub's artifact list for the current repository and the Grafe neighbourhood for the symbol under the cursor. Proves the embeddability tenet with the smallest possible shell; needs Phase 2.
10. **Open artifact spec and fixtures.** Publish `represent.artifact/v0` with Plane Sync fixtures and a validator, as the first open contribution surface. Proves whether anyone outside wants to write an adapter. Needs Phase 1 and F1.

Ideas that should wait, and why: a hosted service (no external user yet), runtime tracing overlays (no runner and no DrWario bridge), session transcript ingestion beyond one explicitly selected source (privacy, and the 89 MB copy shows how fast it accumulates), and any companion that dispatches work (Orkest owns that).

## System Intent

Audit the Represent repository's technical, documentary and operational state as of 2026-10-24, rank what to fix, and propose improvements and new features that are consistent with the audited Orkest design and the preserved Visu experience.

## Ingestion Vector

```text
D:/ware/represent/
|-- src/, web/, tests/              # @LLM-TARGET: line counts, exec call sites, limits, ARIA markers, full test run
|-- docs/**                         # @LLM-TARGET: CONTEXT, TODO, README, LOGBOOK, references, reports, tracker
|-- .ghostdev/version.json, bin/    # @LLM-TARGET: methodology install state and dirt
|-- .represent/, references/        # @LLM-TARGET: sizes only; contents not read
|-- notion/                         # @LLM-IGNORE: untracked private export; counted, not read
`-- .git                            # @LLM-TARGET: branches, ahead-of-remote count, dirty paths
```

## Visualization Spec

None; this is a text report. The state table in section 1 is its only visual.

## Bootstrapping Steps

Follow section 3 in order. Record each housekeeping fix as its own commit; record F3 and F6 decisions in LOGBOOK; put accepted ideas from sections 4 and 5 into BACKLOG or into REPRESENT-ORKEST-IMPL's later phases, never into Phase 1.
