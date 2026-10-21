# Alegor companion: research and MVP direction

> Research snapshot: 2026-10-21. Proposal only; no Alegor implementation is approved by this note. Alegor is a product role, not a mascot. It should make returning to a project and understanding its history easier across Represent's views and AI tools.

## System Intent

Alegor is the optional companion/history surface for a project. Its first job is **re-entry**: help a developer answer “where did I leave off, what changed, and why?” with links to dated project snapshots, saved Visu/Grafe views, decisions, work-in-progress, and the sessions that contain their reasoning. The user’s old Notion note describes a related personal pain: juggling five to ten concurrent assistant sessions makes conversations easy to confuse. A second note imagines a “code runtime doctor” that explains workflow strengths and weaknesses, starting with Unity profiling data. These are useful user-originated hypotheses, not market-wide validation.

Current open-source projects show two adjacent needs: searchable cross-agent transcripts and durable project memory/context. `nicknisi/sessions` explicitly correlates commits/files with the sessions that explain them; `DnaMes/lore` positions itself as a local archive plus shared memory across coding assistants; `dannymaaz/memory-mcp` focuses on durable, provenance-aware project context and bounded retrieval. This demonstrates active open-source exploration and product competition, not adoption or willingness to pay. At the time checked, GitHub showed 38 stars and 6 forks for `sessions`; stars/forks are weak interest signals, not active usage. `lore` documents support for many extractors but explicitly marks several as fixture-only/unverified, a useful reminder to separate claimed compatibility from tested ingestion.

**Recommendation:** Alegor should not initially be another general chat-memory database. Its distinctive job is to connect **project state snapshots ↔ visual views ↔ evidence ↔ AI work sessions**, then produce a short, source-backed re-entry brief. Represent remains useful without Alegor: snapshot storage and exports belong to the shared project model. Alegor may later offer MCP tools that let coding agents read the same lineage.

## Ingestion Vector

Use explicit local project scope and opt-in connectors. Start from Represent's immutable source snapshots, scene/view revisions and event records; then link external session transcripts only when the user selects supported locations/tools. Do not upload raw history by default. A transcript is untrusted evidence, not an instruction source. Store connector identity, parser version, local URI/hash, timestamps, repo/worktree/branch, referenced file paths, extracted claims and confidence. Preserve an “unlinked” state when correlation is weak.

```text
project-root/
├── .git/                         # @LLM-TARGET: commit, branches, file-change evidence
├── README.md                     # @LLM-ENTRY: purpose and project vocabulary
├── docs/                          # @LLM-TARGET: decisions, status, plans with citations
├── .represent/                    # @LLM-TARGET: immutable snapshots, views, event history
│   ├── snapshots/                 # @LLM-TARGET: source revision and evidence ledger
│   ├── views/                     # @LLM-TARGET: Visu/Grafe revisions and art lineage
│   └── events.jsonl               # @LLM-TARGET: append-only project events
├── .claude/projects/              # @LLM-TARGET: opt-in Claude session records
├── .codex/sessions/               # @LLM-TARGET: opt-in Codex session records
├── .opencode/                     # @LLM-TARGET: opt-in OpenCode session records
├── node_modules/                  # @LLM-IGNORE: third-party dependencies
└── dist/                          # @LLM-IGNORE: generated build output
```

Connector paths above are examples, not a universal scan policy; many tools store logs outside the repository. Ask the user to choose local roots, preview matched sources, and report unsupported formats. Never silently read an entire home directory. A future integration may consume normalized session exports instead of maintaining many fragile raw-format parsers.

## Visualization Spec

The home view should feel like a quiet project archive, not an inbox. A project selector leads to a chronological spine of **source snapshots**; each snapshot can have one or more separate **view revisions** so regenerating art does not imply source changed. A compact “Since you were here” card highlights only verified file/claim changes, approved decisions, open questions, and sessions correlated to those changes. Selecting a past point restores its source identity and its linked Visu/Grafe views. A session should open at a concise digest with provenance and a resume link when the source tool supports one.

```mermaid
---
config:
  theme: dark
---
flowchart LR
    S["Source snapshot"] --> E["Evidence and change set"]
    E --> V["Visu / Grafe view revisions"]
    E --> C["Session correlation"]
    C --> R["Re-entry brief with citations"]
    R --> P["Project timeline"]
    P --> S2["Next source snapshot"]
    S2 --> E2["Compare evidence"]
```

The default language should distinguish **observed**, **declared**, **inferred**, **user-corrected**, and **unknown**. Every consequential summary item links to file/line, commit, or transcript message where available. Show confidence and correlation basis (for example matching repo + edited-file overlap + time window). Avoid pretending timeline order proves causality. Use no percentage-complete unless the project supplies an explicit denominator and status source. Hover may add a concise explanation, but all essential controls and provenance must work by keyboard, click, and touch.

## Bootstrapping Steps

1. Agree a versioned Alegor record schema over Represent's existing snapshot/view identifiers; do not fork history storage.
2. Prototype the re-entry card against hand-authored/fixture session records first. Verify links and confidence labels before adding more connectors.
3. Choose one session source (likely Claude Code or Codex) and test path selection, privacy preview, parser coverage, and malformed/unknown records.
4. Correlate a small fixture corpus to Git commits and changed files; measure precision and show unlinked results instead of guessing.
5. Test a real user journey: leave work, make a controlled change, then return and answer “what changed / why / what next?” without opening whole transcripts.
6. Add optional read-only MCP tools only after the local UI/API model works; keep writes and auto-injection opt-in.
7. Evaluate DX/community contribution costs: connector fixture format, parser contract, compatibility matrix, export schema, privacy defaults, reproducible test corpus, and transparent unsupported-state reporting.

### Repo study and bounded trial

Two MIT projects were shallow-cloned under ignored `references/` for source study, not copied into Represent:

| Repo | Pinned local revision | Reusable idea | Caution |
|---|---|---|---|
| [`nicknisi/sessions`](https://github.com/nicknisi/sessions) | `9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb` (README reports v1.32.0) | Repo-scoped session search, bounded context primer, commit/file-to-session explanation, progressive digest, MCP read APIs, opt-in memory triage. Local-only default and explicit correlation confidence are good patterns. | Its transcript index is a neighboring product category. No proof its summaries are accurate in our target projects. |
| [`DnaMes/lore`](https://github.com/DnaMes/lore) | `db5cabdf80ce7d48e91630b043b1c218aa333a84` | Broad adapter inventory, local archive, export, web interface and MCP path suggest connector ecosystem patterns. | Several listed adapters are explicitly fixture-only/unverified; README screenshots are incomplete. Treat compatibility claims as a test matrix to verify, not facts to inherit. |

Trial on `sessions`: `bun install --frozen-lockfile` completed on the pinned checkout (104 packages). Running `bun test src/context.test.ts` on this Windows host produced **8 passing, 14 failing** tests. Failure traces show the fixture helper builds Claude project folder slugs with `cwd.replaceAll('/', '-')`; Windows paths contain backslashes, so the generated path includes an invalid drive-qualified fragment. This is a portability defect in the test fixture path construction, not evidence that the product's session parsing fails on Windows; the tested behavior is therefore inconclusive on this host. No source files in either upstream repository were changed. We did not ingest personal session data, call a paid API, or start a service.

## Ghost AI Plan

An initial re-entry brief can be assembled deterministically from snapshot deltas, commit metadata, and bounded session digests. If synthesis is needed, send a small evidence packet through Ghost's approved AI path, cache by evidence digest + prompt/model version, and require citations to supplied evidence IDs. Keep transcript text local unless the user explicitly chooses a remote-backed summary. Querying an already-saved brief should cost no model call. Do not use a model to infer progress percentages or silently bridge missing evidence.

## Embeddability Plan

Keep timeline, correlation, evidence and re-entry generation in a headless local core. Web is the first UI. A CLI can print/export the same brief; MCP can expose bounded read-only retrieval to agents. IDE integrations may add “why this code?” links later. Hosted sync, team sharing and cross-device retention require a separate opt-in design and are not part of a local MVP. Export must remain understandable without the Alegor shell.

## Maturity assessment

**Ready for a narrow design prototype; not yet ready for an independently shippable Alegor MVP.** Existing projects provide strong patterns and a clear distinction opportunity, while the user notes supply concrete first-person pain. However, we have not tested re-entry with actual user-selected histories, measured correlation precision, validated a connector on a real corpus, or established demand beyond project descriptions and small public-interest signals. Keep Alegor as a design track while Visu establishes the shared snapshot/view contract. A small fixture-driven re-entry panel can be built after that contract stabilizes; do not launch another standalone app or promise universal session support yet.

## Sources

- `sessions` README/product/design and current repo metadata: [GitHub repository](https://github.com/nicknisi/sessions). README describes its four indexed tools, local index, correlations, and current release; the trial above used the pinned local checkout.
- `Lore` README and extractor support caveats: [GitHub repository](https://github.com/DnaMes/lore).
- `Persistent Memory MCP` README: [GitHub repository](https://github.com/dannymaaz/memory-mcp) — local-first durable context, Git identity, provenance, bounded retrieval and continuation patterns; its README states a public package release was still pending.
- User's local first-person notes: [`What if`](../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/What%20if%2031816a8a3d6580129e42f59e492fb5b3.md), [`Code runtime doctor`](../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Code%20runtime%20doctor%2031b16a8a3d65809aae3fc0469c228281.md), and [`Represent suite design`](reports/Represent%20living%20project%20views.md).
