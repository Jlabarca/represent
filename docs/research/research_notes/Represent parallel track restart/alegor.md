# Alegor restart — evidence and MVP proposal

## System Intent

**Alegor can start as an independent local re-entry companion while Visu is paused.** Its core question is “where did I leave off, what changed, what did I decide, and what remains uncertain?” The narrow useful loop is a dated project point → observed repository changes → source-backed declared state → unresolved differences → next action. It can work from Git and project docs before any transcript connector or Visu integration exists.

The restart produced a reviewable static prototype over real Represent history: 7 commits and 78 changed paths since `d7b24ac`, plus citations into CONTEXT and TODO. It exposed a real state discrepancy: CONTEXT's Current Sprint still says Visu discovery is the next proof; TODO records that proof as complete. Alegor should surface both sources with their locations and let the operator correct or reconcile them. Choosing one automatically would hide the exact re-entry problem the tool should reveal. See [trial report](../../../../experiments/alegor-restart/README.md) and [generated brief](../../../../experiments/alegor-restart/index.html).

The motivating open-source patterns are adjacent, not proof of market size. The pinned `sessions` README describes a local index for multiple coding agents, repo-scoped context, search/resume and MCP access; its own repository identifies itself as a cross-agent session search/memory tool ([pinned README](https://github.com/nicknisi/sessions/blob/9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb/README.md)). Alegor's proposed distinction is to anchor re-entry in **project snapshots, evidence, decisions and optional sessions together**, rather than making transcript recall the whole product. Existing public project descriptions do not establish adoption, willingness to pay, or unmet demand for that distinction.

## Ingestion Vector (annotated tree)

Start with bounded, local repository evidence. Session paths must be selected by the user and previewed before reading. The session fixture in this trial is explicitly synthetic; no personal session roots or transcripts were accessed.

```text
project-root/
├── .git/                           # @READ: commit identity, dates, changed paths; observed history
├── README.md                       # @READ: project purpose and vocabulary
├── docs/CONTEXT.md                 # @READ: declared current state and decisions; cite each claim
├── docs/TODO.md                    # @READ: declared active/completed work; compare with CONTEXT
├── .represent/                     # @OPTIONAL: exported source snapshot and view references, if present
│   ├── snapshots/                  # @OPTIONAL: source identity and evidence manifest
│   ├── views/                      # @OPTIONAL: Visu/Grafe revisions, when those tools exist
│   └── events.jsonl                # @OPTIONAL: append-only project events, if adopted
├── [user-selected session roots]/  # @OPT-IN: connector preview, parser version, local URI/hash
├── node_modules/                   # @IGNORE: dependency content
└── build output/                   # @IGNORE: generated files unless explicitly selected as evidence
```

Preserve evidence kinds rather than flattening them into model prose: `observed` (Git/file fact), `declared` (project doc or session statement), `inferred` (correlation with its basis), `user-corrected`, and `unknown`. A session's project identity, file overlap and time proximity can rank a candidate link, but those signals do not establish that the session caused or explained a commit. Keep weak candidates unlinked. A normalized session adapter can be added later; the source readme for `sessions` documents local indexing and agent retrieval, while our pinned Windows trial found a slash-normalization defect in both its fixture helper and scanner. The isolated two-line patch made its 25 context tests pass, but is not upstream-accepted or full-suite validation ([exact patch and logs](../../../../experiments/alegor-restart/windows-path-fix.patch)). The fixture and scanner agree on a synthetic Windows slug; actual Claude Code directory naming was not verified using a selected real session source.

## Visualization Spec

The prototype establishes the smallest useful screen: a quiet vertical timeline of real commits, a short declared-state card, a conflict card with two clickable citations, and a clearly labelled synthetic candidate session. This renders as static HTML and has a JSON record and Markdown export. A bundled line-numbered evidence page keeps citations usable in a static preview. It passed ten headless browser checks, including opening both source links, no console/page errors, and no horizontal overflow at 390px. It is reviewable without an AI service.

For MVP, keep this interaction:

1. **Since this snapshot:** group meaningful commits and changed paths into a small dated timeline.
2. **Where state is declared:** show short excerpts from CONTEXT/TODO/decision records with file-and-line citations.
3. **Needs review:** put contradictory, stale, missing or weakly linked claims in a visible “unknown / conflict” area, rather than smoothing them into one confident answer.
4. **Session links:** show candidate basis (same selected project, file overlap, time window) and a human review control. Never imply causality from chronology alone.
5. **Next action:** quote or link to an explicit task; when none exists or sources conflict, say it is unknown.

Keep source snapshot identity separate from view or brief revisions. A new written brief should not claim that project source changed; a source SHA or explicit file capture identifies the source point. Later Visu/Grafe artifacts can attach to that point as optional linked views, but Alegor must remain useful without them.

## Bootstrapping Steps

1. Treat `experiments/alegor-restart/reentry.mjs` as the first end-to-end local core spike. Freeze a versioned JSON shape for source point, evidence item, conflict, session reference, and rendered brief; preserve the existing CLI/HTML/JSON output parity.
2. Add fixture cases for unchanged repo, docs-only change, conflicting CONTEXT/TODO, deleted file citation, unrelated session, same-file candidate, and insufficient evidence. Measure false candidate links; never assert the fixture proves historical causality.
3. Reconcile the current sprint discrepancy with the user and update the project documents. Use the correction as a user-corrected event, then rerun the same brief and show exactly what changed.
4. Add an explicit local session-source picker with preview, file counts, parser support and exclusions. Do not scan home directories or ingest raw session data until selected.
5. Validate one actual user-selected session source with the operator. The acceptance test is whether the brief helps answer “what changed / why / what next?” with inspectable sources and visible uncertainty; record misses and false links.
6. Add read-only agent retrieval only after the local core's record and permissions are clear. Keep writes, auto-injection, transcript upload, hosted sync and cross-device storage separate opt-ins.

**Build readiness:** enough evidence exists to begin this local Git/docs MVP independently of Visu. The prototype already demonstrates the core re-entry loop and found a state conflict it can help catch. Real-session correlation quality, connector scope and market demand remain open questions; none is a reason to postpone the deterministic first MVP.

## Ghost AI Plan

The current prototype is deterministic and made zero AI calls. Keep that as the default path. If natural-language synthesis proves useful, send only a compact evidence packet through Ghost's approved AI pipeline; attach stable evidence IDs, require citations, and cache by evidence digest plus prompt/model version. Leave unresolved conflicts as unknown unless the supplied sources support a resolution. Raw transcript text stays local unless the user explicitly opts into a remote request. Exact Ghost protocol, request budget and fallback behavior remain to be chosen before adding synthesis.

## Embeddability

The prototype's core already runs from Node and exports JSON/Markdown; static HTML is the first surface. A narrow MVP should expose the same deterministic brief through a CLI and a local web view. Keep the data model UI-independent so Represent, a future Visu/Grafe view, or an IDE panel can display it. Read-only MCP retrieval is a later adapter over the same cited records, not a separate memory store. Hosted sync, team sharing and automatic agent context injection are later choices, not MVP requirements.

### Sources and evidence limits

- `nicknisi/sessions` pinned README and scanner/test files: [README](https://github.com/nicknisi/sessions/blob/9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb/README.md), [scanner](https://github.com/nicknisi/sessions/blob/9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb/src/scanner.ts), [context fixture](https://github.com/nicknisi/sessions/blob/9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb/src/context.test.ts). They support the product and code-level trial claims above, not broad adoption or Windows readiness beyond the tested context suite.
- `DnaMes/lore` pinned repository and extractor inventory: [repository](https://github.com/DnaMes/lore/tree/db5cabdf80ce7d48e91630b043b1c218aa333a84). Treat its adapter inventory as implementation leads; do not infer production compatibility from a listed extractor alone.
- User-provided pain and system intent are documented in Represent's local [Alegor research brief](../../alegor-mvp-research.md); the trial report contains exact base/head, overlap, digest, and browser-test record.
