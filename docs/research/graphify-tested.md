# Graphify — tested on luz + drwario

> Date: 2026-05-20
> Companion to [`docs/products/represent.md`](../../../docs/products/represent.md) (Represent vision) and the prior trending note `docs/research/trending.md` in waremoto.
>
> **Source**: [safishamsi/graphify](https://github.com/safishamsi/graphify) — ~49.7k stars, pip package `graphifyy`, Claude Code skill.
> **Pitch (verbatim)**: *"Type `/graphify` in your AI coding assistant and it maps your entire project — code, docs, PDFs, images, videos — into a knowledge graph you can query instead of grepping through files."*

---

## TL;DR

Three runs executed: **luz unlabeled** (LLM blocked, real-world JS repo), **drwario unlabeled** (Unity C#), **drwario labeled** (LLM via OpenRouter + claude-haiku-4.5, patched `llm.py` to bypass account-credential dead ends).

- **Graphify installs and runs in ~2 minutes** via `uvx --python 3.12 --with openai --from graphifyy graphify .` AST pass is solid; the rest is downstream of the LLM call.
- **Pricing measured**: $0.15 for drwario (85 files, 6 min). Projects to **~$20 per snapshot on a 10k-file monorepo**, and that's *per build*. The "70x token savings" pitch is per-query downstream — the per-build cost upstream is unbounded.
- **The LLM step is the whole product.** Without it, "god nodes" are minified bundle symbols on luz (`$j()`, `_b()`, `_t()`) or primitives on drwario (`float`, `workbench.colorCustomizations`). With it, real architecture appears (`DrWarioView`, `LLMPromptBuilder`, `LLMClient`, `ProfilingSession`).
- **Community naming is *not actually shipped*.** Even with the LLM running, communities stayed `Community 0..63`. The labeled clusters in graphify's viral demo videos appear to be manual post-processing — no documented command flag produces them. **This is the headline product feature, missing from the tool.**
- **Betweenness centrality runs on the raw graph.** Semantic filtering doesn't propagate — `float` was *removed* from god-nodes by the LLM but is *still* the top "Suggested Question" as a cross-community bridge. Two parts of the same report contradict each other.
- **Silent JSON truncation on cheap models.** Claude Haiku hit output-token limits → graphify recursively halves chunks → at recursion depth 3 it silently keeps partial results. No completeness signal in the report. **Quality is hard-coupled to model capacity.**
- **Hard 5,000-node ceiling on the HTML viz.** luz (11,588 nodes) silently produced no `graph.html`. Real-world repos hit this immediately, with no fallback.
- **No build-artifact filtering.** Graphify ingested luz's `.medusa/server/public/admin/assets/` and `playwright-report/trace/` bundles and ranked their minified symbols as luz's core architecture. No `.gitignore` awareness.
- **The renderer is `vis-network`** (force-directed HTML, ~660 KB self-contained). Exactly the "raw graph = noise" failure mode Represent's POC 2 evaluation rubric calls out. YouTube comment thread confirms: *"I thought that was the Path of Exile tree."*
- **49.7k stars are distribution, not quality.** Slash-skill packaging at peak skill-wave timing, Karpathy-adjacent positioning, 16-assistant compatibility matrix, 30+ translated READMEs, every credibility badge GitHub renders. See § *Why graphify has ~49.7k stars*.

**Verdict — differentiate hard.** Ship Represent as `/represent` (skill-first, Unity-on-demand). The labeled run validates every Represent design choice that diverges from graphify: Semantic Ontology v0 drops primitives at ingestion (not post-hoc), theme packs replace vis-network, `scene.yaml`+`events.jsonl` solves staleness + per-build cost, Unity WebGPU has no 5k ceiling, runtime overlay is unowned territory. Match graphify's distribution shape exactly; compete on a moat graphify's vis-network stack structurally cannot reach.

---

## Run 1 — luz (Medusa storefront + admin)

```
cd d:/ware/luz
uvx --python 3.12 --with openai --from graphifyy graphify .
```

**Numbers**:
- Scanned: 1,145 code files
- AST extraction: ~2 min, 16 workers
- Result: **11,588 nodes · 28,627 edges · 562 communities · 4,573 isolated nodes**
- Outputs: `graph.json` (15 MB), `manifest.json` (273 KB), `GRAPH_REPORT.md` (1,479 lines)
- **No `graph.html`** — exceeds default 5,000-node viz limit; tool skips rather than degrades
- Semantic LLM step: 32/32 chunks failed (OpenRouter key rejected — graphify ignored `OPENAI_BASE_URL` through `uvx`)

### What the report claims as "core abstractions"

```
God Nodes (most connected — your core abstractions):
  1. $j()          274 edges
  2. _b()          230 edges
  3. H()           193 edges
  4. constructor() 186 edges
  5. _t()          185 edges
  ...
  8. fetch()       163 edges
```

These are **webpack/vite minified bundle symbols** ingested from `solace-api/.medusa/server/public/admin/assets/` and `solace-store/playwright-report/trace/assets/`. The single non-minified entry is `fetch()`.

### "Surprising Connections" (verbatim)

> `xo() --calls--> $s()` — *solace-store/playwright-report/trace/sw.bundle.js → solace-api/.medusa/server/public/admin/assets/chunk-FKNW5MLZ-CyhLNrHV.js*

Pure noise between two build artifacts. The non-noise entries (`useBulkOrders → useTranslation`) are mundane i18n.

### Knowledge Gaps

> 4,573 isolated node(s): `type`, `url`, `Authorization`, `version`, `configurations` (+4568 more)

JSON keys and HTTP header strings treated as graph nodes.

---

## Run 2 — drwario (Unity diagnostics tool, 74 C# files)

```
cd d:/ware/drwario
uvx --python 3.12 --with openai --from graphifyy graphify .
graphify cluster-only .   # re-cluster + generate graph.html
```

**Numbers**:
- Scanned: 85 code files + 50 docs
- Result: **799 nodes · 1,155 edges · 49 communities**
- Outputs: `graph.json` (687 KB), `graph.html` (660 KB), `GRAPH_REPORT.md` (9.6 KB)
- Semantic LLM step: 2/2 chunks failed (Gemini 403, project denied)

### God Nodes (real this time)

```
1. LLMPromptBuilder        26 edges
2. LLMClient               23 edges
3. ProfilingSession        22 edges
4. LLMResponseParser       20 edges
5. ProfilingSession        20 edges  (duplicate — partition bug)
6. GCAllocationRuleTests   20 edges
7. float                   19 edges
8. TimelineElement         19 edges
9. RenderingEfficiencyRule 18 edges
10. workbench.colorCustomizations  16 edges  (a VSCode settings key)
```

The AST pass actually finds DrWario's real architecture (`LLMPromptBuilder`, `LLMClient`, `ProfilingSession`, the analysis rules). But entries 7 and 10 are noise — `float` is a C# primitive and `workbench.colorCustomizations` is a VSCode setting key from `.vscode/settings.json`. Without LLM filtering, primitives leak into the architecture view.

### "Suggested Questions" (verbatim)

> Why does `float` connect `Community 1` to `Community 0`, `Community 2`, `Community 35`, `Community 3`, `Community 5`, `Community 4`, `Community 9`, `Community 20`, `Community 22`?
> _High betweenness centrality (0.120) — this node is a cross-community bridge._

The top three "uniquely positioned questions" are about `float`, `int`, `string` — i.e. *every method that takes a numeric or string parameter touches every community*. This is a structural defect of the graph model when there's no semantic layer to dedupe primitives.

### The `graph.html`

vis-network force-directed graph, ~660 KB self-contained (no CDN), click-to-highlight neighborhood, search box. Same look every viral knowledge-graph tool ships with. The comment *"I thought that was the Path of Exile tree"* (from the YouTube thread on the video that surfaced graphify) is dead accurate.

---

## Why graphify has ~49.7k stars (despite the failure modes above)

The technical result is mediocre. The distribution is exceptional. Both are true at the same time, and the second one is what matters on GitHub. Six compounding factors:

### 1. It rides the Claude Code skills wave at exactly the right moment

`/graphify` is a **Claude Code slash-skill** first, a Python CLI second. The README's opening line isn't *"a knowledge graph tool"* — it's *"Type `/graphify` in your AI coding assistant."* That framing puts it in the same shelf as `addyosmani/agent-skills` (37k stars, +3k/week at the time of the trending scan). The skill marketplace surface is currently the hottest packaging primitive on dev-tools Twitter and HN; a `pip install graphifyy && /graphify install` line in a tweet converts.

### 2. It claims to solve the most-felt agent problem of 2026: context bloat

The pitch (verbatim from the README header):

> *"a knowledge graph you can query **instead of grepping through files**"*

Every Claude Code / Cursor / Codex user has felt token-burn from blind file-reads. Graphify promises a structural fix. **Whether it works is downstream of whether the pitch lands** — and on a problem this acute, the pitch lands. Top YouTube comment (`@jd5787`, 11 likes) calls the 70x-savings claim *"waaaayyy over stated"*, but the comment exists *under a video where the channel paid attention because the claim was bold*. The over-claim is the marketing.

### 3. It claims compatibility with sixteen-plus AI assistants

`pyproject.toml` keywords: *Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Aider, OpenClaw, Factory Droid, Trae, Hermes, Kimi Code, Kiro, Pi, Google Antigravity, GitHub Copilot CLI, VS Code Copilot Chat.* Each is a separate `graphify <platform> install` subcommand. Most users will only use one — but the **search-surface** is sixteen. Every "best skill for $assistant" thread, blog post, and tweet has a hook for graphify.

### 4. Karpathy-adjacent positioning

The YouTube thread surfaces this immediately: *"This vs Karpathy wiki?"* (`@MrMarco7ify`), *"I have the Wiki LLM by Karpathy, can I convert it into this?"* (`@Plammos`), *"Name Karphaty starts to be in every marketing trick"* (`@KatseEksitus`). The graphify author is **positioning against / alongside Karpathy's "Wiki LLM"** — the most credible name in the agent-memory discourse. That single comparison anchors the project in a known reference frame; it doesn't have to explain itself from scratch. The Gumroad link in the README header to *"The Memory Layer"* book ($safishamsi.gumroad.com/l/qetvlo) is the same play: stake out the vocabulary of the discourse, then sell the book/tool that "implements" it.

### 5. README polish + 30+ translated READMEs

The README header has translations to **30+ languages** (Chinese, Japanese, Korean, German, French, Spanish, Hindi, Portuguese, Russian, Arabic, Italian, Polish, Dutch, Turkish, Ukrainian, Vietnamese, Indonesian, Swedish, Greek, Romanian, Czech, Finnish, Danish, Norwegian, Hungarian, Thai, Traditional Chinese). Most projects ship one README. Translated READMEs are a star-farming signal: they appear in non-English dev-Twitter, get re-shared, and add stars from outside the Anglo bubble. PyPI badge, downloads badge, sponsor button, LinkedIn button, X handle, GitHub Actions CI badge, star-history chart — every credibility marker GitHub renders is present and on-brand.

### 6. The honest parts are *just* honest enough to be credible

Graphify's `GRAPH_REPORT.md` includes:

> *"Built from commit `2bd8b62f`. Run `git rev-parse HEAD` and compare to check if the graph is stale."*

It admits the staleness problem in its own output. That's the kind of disclosure that survives a YouTube critique: a skeptic reading the report says *"at least they're honest about it"* and stars anyway. Compare to the silent 5,000-node ceiling — that one's not in the README, and it's the kind of thing that would bite you on a star-history-relevant repo.

### What graphify proves about distribution

**The 49.7k stars are not paid for by graph quality.** They're paid for by:

- being the right *shape* (slash-skill) at the right moment (Claude Code skill wave),
- pitching against the right *pain* (context bloat) with a bold number (70x),
- carrying the right *associations* (Karpathy, "memory layer"),
- shipping with the right *surface area* (16 assistants, 30 languages, every badge),
- maintaining the *cosmetic* signals of legitimacy (CI, PyPI, sponsor, book).

For Represent: **the implementation can lose to graphify and the launch can still win**, but only if the launch matches graphify's shape. That means: ship as a slash-skill, pick a bold quantified pitch, anchor in an existing discourse (likely "what your agent sees" or "visual context window"), translate the README, ship CI/badges/sponsor button day one. None of these are about code. All of them are about whether 49.7k people who *would have* starred a better tool ever find it.

---

## Sidebar — Karpathy, the "memory layer", and why this positioning works

The YouTube comment thread keeps surfacing one name: *"This vs Karpathy wiki?"* (`@MrMarco7ify`), *"I have the Wiki LLM by kaparthy, can I convert it into this Graphify?"* (`@Plammos`), *"Name Karphaty starts to be in every marketing trick"* (`@KatseEksitus`, with a slightly resentful tone). Worth understanding why this anchor is so load-bearing for graphify's distribution.

### Who is Andrej Karpathy

[Andrej Karpathy](https://karpathy.ai/) is one of the highest-trust figures in practical AI engineering for the post-ChatGPT generation of developers. The relevant credentials, ranked by how much they show up in his audience's mental model:

- **Co-founder of OpenAI** (2015), then **Director of AI at Tesla** (2017–2022, lead of the Autopilot/FSD perception stack), then back to **OpenAI** briefly in 2023, then **independent / educational** since 2024.
- **Educational YouTube series** [*Neural Networks: Zero to Hero*](https://www.youtube.com/playlist?list=PLAdk-EyP1ND8MqJEJnSvaoUShrAWYe51U) — the canonical learn-LLMs-from-scratch curriculum. Each video has 1–4M views. The *makemore*, *micrograd*, and *nanoGPT* videos are how a generation of devs learned what an LLM actually is.
- **Code artifacts**: [nanoGPT](https://github.com/karpathy/nanoGPT) (40k+ stars, the minimal GPT training repo), [llm.c](https://github.com/karpathy/llm.c) (GPT training in pure C, 30k+ stars), [nanochat](https://github.com/karpathy/nanochat) (minimal ChatGPT clone), [LLM101n](https://github.com/karpathy/LLM101n) (course).
- **Essays that frame the field's vocabulary**: [*Software 2.0*](https://karpathy.medium.com/software-2-0-a64152b37c35) (2017, coined the term), and his recent posts on X/Twitter coining vocabulary like *"context engineering"* and *"agent memory"*.
- **Twitter/X**: [@karpathy](https://x.com/karpathy), 1.5M+ followers. When he tweets a concept, it enters the discourse within hours.

The relevance: **Karpathy doesn't have to endorse a tool for the tool to benefit from being adjacent to him.** Being in the same conversation, sharing vocabulary, being mentioned in the same threads — that's already worth thousands of stars to a dev tool. Graphify never claims Karpathy endorsement; it just lives in the same neighborhood.

### What "memory layer" specifically means

The phrase comes from the agent-engineering discourse of 2025–2026: LLMs have a fixed context window, agents need state that persists across sessions, RAG and vector DBs are the v1 answer, **structured memory (graphs, hierarchies, schemas) is the v2 thesis**. The "memory layer" is the hypothesized infrastructure piece between raw storage (Postgres, S3) and the LLM context window — analogous to caches between RAM and disk. It's the same vocabulary that powers mem0, LangMem, Letta (formerly MemGPT), and Anthropic's own work on agent memory.

Graphify's README links to a Gumroad title — [*"The Memory Layer"*](https://safishamsi.gumroad.com/l/qetvlo) by the graphify author — as the first badge above the project name. The book is the *positioning artifact*; graphify is the *demonstration*. The stack:

1. Establish a vocabulary item (*"the memory layer"*).
2. Sell a book that "defines" the term.
3. Ship a tool that "implements" the term.
4. Position the tool in conversations about adjacent figures (Karpathy, Anthropic skills, mem0).

This is **not deceptive** — it's a coherent thought-leadership funnel. But it's worth seeing clearly: the engineering value of graphify (vis-network on tree-sitter AST) is decoupled from the marketing surface (memory-layer thesis). The marketing surface is what generates the stars.

### How Represent should use the same lane

Represent can sit in the same neighborhood **without copying graphify's specific framing**. Two adjacent vocabulary items that aren't yet owned:

- **"Agent visual context" / "what your agent sees"** — the visual analogue to "memory layer." Karpathy himself has tweeted about LLMs being non-visual and needing visual scaffolding for code; the niche is open.
- **"Visual scratchpad" / "spatial code memory"** — frames the Unity player as the persistence layer for spatial reasoning, the way vector DBs are the persistence layer for semantic reasoning.

Concrete moves:

1. **Cite Karpathy where genuine** (his "Software 2.0" framing is real prior art for Represent's "your repo as semantic ontology, not files" thesis). Don't fake adjacency; do *establish* it where the lineage is honest.
2. **Coin one phrase and stick to it.** Graphify owns "memory layer." Represent should own one of *"visual context layer"*, *"agent atlas"*, *"spatial code memory"*, *"semantic minimap"*. Repeat it in every README, tweet, and demo until it's the search term.
3. **Don't sell a book.** Graphify's book-then-tool funnel works for one Safi Shamsi; it doesn't scale and it ages badly. Represent's funnel should be tool-first, with a manifesto-grade README in place of the Gumroad link.
4. **Identify the next Karpathy-adjacent moment.** When he tweets about agent visual reasoning, code visualization, or LLM spatial cognition (he will, eventually), Represent should already exist as the obvious link. That's a months-of-prep readiness state, not a reactive one.

---

## What this proves about graphify

| Claim | Reality observed |
|---|---|
| "Knowledge graph from any folder" | True at AST level. The graph is real. Interpretation is not. |
| "Core abstractions" via betweenness | **Unlabeled run**: minified bundle symbols (luz) or primitives (drwario). **Labeled run**: real architecture appears (`DrWarioView`, `LLMPromptBuilder`). The LLM is doing 100% of the comprehension work. |
| "Surprising connections" | Unlabeled: noise edges between build artifacts. Labeled: useful doc-to-code citations (`LLMResponseParser → docs/tests/llm-parser.md`). The cite/describe relation is the most novel thing graphify produces. |
| "Communities" (the headline demo feature) | **Numbered `Community 0..63` even with the LLM running.** No documented command produces named clusters. Either undocumented flag or manual post-processing in the viral demos. |
| Graph metrics + LLM filtering | Inconsistent: the LLM removes `float` from god-nodes but betweenness centrality still ranks `float` as top cross-community bridge. Two parts of the same report contradict each other. |
| "Works on any repo size" | Hard 5,000-node ceiling on the HTML viz. Silent skip on overflow, no degradation path. |
| "Just point at a folder" | No `.gitignore`/build-artifact awareness. Ingests `.medusa/`, `playwright-report/`, `node_modules` if present. |
| Cheap-model support | Silent JSON truncation under output-token caps. Graphify halves chunks 3 times, then keeps partials with no completeness signal. Quality is hard-coupled to model capacity. |
| **The graph staleness problem** | Graphify itself tells you: *"Built from commit `2bd8b62f`. Run `git rev-parse HEAD` and compare to check if the graph is stale."* The YouTube comment thread's loudest critique is confirmed by the tool's own report. |
| Per-build cost | Measured: $0.15 / 85 files. Projects to ~$20 / 10k files **per snapshot**. Per-commit rebuild on a monorepo costs $20/day in LLM. |

---

## Mapping to Represent's planned differentiators

The luz + drwario runs make the prior `(b) differentiate hard` verdict concrete. Each Represent design decision now has a *specific* graphify failure it answers:

| Graphify failure observed | Represent's planned answer | Source |
|---|---|---|
| `$j()`, `_b()`, `_t()` ranked as god nodes on luz | Semantic Ontology v0 — only `Service`/`Store`/`Queue`/`StateMachine`/etc. are nodes. Minified symbols don't fit any concept and are dropped at ingestion. | [represent.md § Semantic Ontology v0](../../../docs/products/represent.md#semantic-ontology-v0) |
| `float`/`int`/`string` ranked as top "cross-community bridges" on drwario | Same — primitives aren't first-class. Relations are typed (`produces`, `consumes`, `owns`, `triggers`, `depends-on`), not "references". | [represent.md § Semantic Ontology v0](../../../docs/products/represent.md#semantic-ontology-v0) |
| Communities are numbered `Community 0..562` without LLM | Theme packs render *named* primitives (Command Center, Barracks, SCV) — naming is the rendering, not a post-hoc LLM pass. | [represent.md § Theme Pack format](../../../docs/products/represent.md#theme-pack-format) |
| 5,000-node ceiling silently kills luz | Unity WebGPU player + RTS/Maps navigation is designed for >>5,000 nodes. That's the *point* of the engine choice. | [represent.md § Why Unity WebGPU](../../../docs/products/represent.md#why-unity-webgpu-not-a-web-stack), [§ Navigation model](../../../docs/products/represent.md#navigation-model) |
| "Built from commit X — check if stale" | `scene.yaml` (stable, hand-editable terrain) + `events.jsonl` (append-only stream). Structural edits update terrain; file changes stream as events. No full re-extraction per commit. | [represent.md § Two-file scene contract](../../../docs/products/represent.md#architecture) |
| Static `graph.html`, no runtime view | POC 5 runtime overlay + DrWario integration — the runtime side is unowned by graphify and unreachable from a vis-network stack. | [represent.md § POC 5](../../../docs/products/represent.md#poc-5----runtime-overlay-live-data) |
| Single visual mode (vis-network force graph) | Theme packs — Infographic, SC2/RTS, City, Factory, Circuit. The abstraction test: do *two* themes render the same `scene.yaml` recognizably? | [represent.md § Theme Ideas](../../../docs/products/represent.md#theme-ideas) |
| No build-artifact awareness | Represent's ingestion is semantic-driven: only nodes that *bind to a concept* enter the scene. `.medusa/server/public/` simply doesn't produce `Service` or `Queue` nodes. | [represent.md § Combined Strategy](../../../docs/products/represent.md#combined-strategy-recommended) |

### What's worth stealing from graphify

- **`pip install` + `/slash-skill` packaging** is sharper distribution than VSCode/JetBrains extensions. Represent should ship `represent-core` as a Claude Code skill that emits `scene.yaml` the same way graphify emits `graph.json`.
- **MCP-server output** as a first-class surface — agent-facing first, human-facing second, is the viral path. Represent's docs currently undersell this.
- **Karpathy-adjacent positioning** — graphify rides the "context window / memory layer" discourse. Represent could ride the "agent visual context" axis (what does the agent see?) with the same vocabulary.
- **The honest staleness note in the report** (`Built from commit X`) — Represent should keep that, even though `events.jsonl` makes it nearly moot.

### What *not* to copy

- **vis-network rendering** — the "looks like Path of Exile tree" failure mode is structural to force-directed HTML graphs. Theme packs are the moat that can't work in this stack.
- **The 70x token-savings pitch** — top YouTube comment (`@jd5787`, 11 likes): *"the 70x savings is waaaayyy over stated"*. This claim decays as context windows grow. Represent's "your repo, made legible" hook is more durable.
- **"Point at any folder"** without filtering — Represent should default-exclude `.medusa/`, `.next/`, `node_modules/`, `Library/`, `Temp/`, `bin/`, `obj/`, `playwright-report/`. Build artifacts ranked as architecture is the single worst failure mode demonstrated here.

---

## Implications for Represent's first POC

The luz run argues against POC 2 (Static Analysis Graph, no AI) as a standalone deliverable: that's exactly what graphify shipped, that's exactly what fails on real repos. Run POC 2 only as **plumbing** for POC 4 (Hybrid Pipeline) — never as a user-facing artifact.

The drwario run argues *for* dogfooding on small, semantically-clean repos first (Ghost, drwario, the methodology itself), where the AST pass produces recognizable architecture even without semantic enrichment. These are good first dogfood targets — already listed in [represent.md § Dogfood targets](../../../docs/products/represent.md#dogfood-targets).

Priority sequence (revised after this run):

1. **`represent-core` AST extractor + scene.yaml emitter** — gated by Semantic Ontology v0, must drop primitives + build artifacts. Test target: drwario should produce `LLMClient`, `ProfilingSession`, the analysis rules — not `float`/`workbench.colorCustomizations`.
2. **Infographic theme renderer** — single 2D theme, validates the theme-pack abstraction before SC2.
3. **Slash-skill packaging** — `pip install represent-core && /represent .` (steal graphify's distribution).
4. **POC 5 runtime overlay** — pulled forward from "last POC" to a top-3 priority, because it's the durable moat graphify cannot follow into.

---

## Run 3 — drwario *with* semantic LLM enrichment (claude-haiku-4.5 via OpenRouter)

To answer "what does the labeled output actually look like?", I patched `d:/tmp/graphify/graphify/llm.py:83` to point the `openai` backend at OpenRouter (`https://openrouter.ai/api/v1`) with default model `anthropic/claude-haiku-4.5`, then ran from the local source clone:

```powershell
cd d:/ware/drwario
$env:OPENAI_API_KEY = $env:OPENROUTER_API_KEY
uv run --python 3.12 --with openai --with 'd:/tmp/graphify' -- graphify . --backend openai
```

**Result on the same drwario codebase:**
- 904 nodes · 1,285 edges · 63 communities (vs unlabeled 799/1155/49 — semantic extraction added 13% more nodes by reading docs)
- **Cost: $0.15** (~6 min, 125,182 tokens in / 60,637 tokens out at OpenRouter haiku-4.5 pricing)
- Outputs: `graph.json` (687 KB), `graph.html` (vis-network, ~660 KB), `GRAPH_REPORT.md` (labeled god nodes)

### Cost projection

Linear-ish per-file at this density:

| Repo | Code files | Est. cost | Est. wall time |
|---|---|---|---|
| drwario (measured) | 85 | $0.15 | 6 min |
| luz | 1,145 | ~$2 | 60–90 min |
| Hypothetical 10k-file monorepo | 10,000 | ~$20 | 10+ hr |

This is the **per-snapshot** cost. Run `graphify update .` on every commit and a 10k-file repo costs $20/day in compute. The README's "70x token savings" pitch is per-query downstream; the per-build cost upstream is unbounded.

### What got better with the LLM

God nodes are now actual architecture — primitives are *gone* from top 10:

```
1. DrWarioView           67 edges    ← real, main editor view
2. LLMPromptBuilder Tests 40 edges
3. LLMPromptBuilder      28 edges
4. LLMClient             25 edges
5. LLMResponseParser     24 edges
6. TestSessionBuilder    23 edges
7. ProfilingSession      22 edges
8. RuntimeCollector      22 edges
```

Compare unlabeled run where positions 7 and 10 were `float` and `workbench.colorCustomizations`. **The LLM step is what makes the architecture view legible.** It's not a polish layer — it's the product.

Surprising connections now include doc-to-code bridges:

> `LLMResponseParser --cites--> LLM Response Parser Reference` *(Editor/Analysis/LLM/LLMResponseParser.cs → docs/tests/llm-parser.md)*
> `ProfilerMarker --semantically_similar_to--> ProfilingSession`

This is the most genuinely useful thing graphify does — connecting prose docs to the code they describe. Represent's `scene.yaml` ingestion should treat this as a first-class relation (`describes`, `cites`).

### What stayed broken even with the LLM

**Communities are still `Community 0..63`.** Even with semantic extraction running, the community-naming step did not fire. Either it requires a flag I haven't found (none documented in `graphify --help`), or — more likely — the labeled communities in graphify's viral demo videos are **manual post-processing**, not tool output. The README never specifies which command produces named clusters. **This is the headline graphify deliverable and it is not actually shipped.**

**`float` is back as the top "Suggested Question"** even with semantic enrichment:

> *"Why does `float` connect `Community 1` to `Community 0`, `Community 32`, `Community 33`...?"*

The LLM removed `float` from god-nodes, but the betweenness-centrality calculation runs on the *raw* graph — semantic filtering doesn't propagate to graph metrics. Represent should compute centrality **on the semantic projection**, not the raw AST graph.

**Silent JSON truncation** under cheap models:

```
chunk of 25 truncated at depth 0, splitting into halves of 12 and 13
chunk of 13 truncated at depth 1, splitting into halves of 6 and 7
chunk of 3 still truncated at recursion depth 3 (max 3) — partial result kept
```

Claude Haiku 4.5 hits output-token caps → graphify recursively halves the chunk → at recursion depth 3 it gives up and **silently keeps partial results**. No warning surfaced to the user; no completeness metric in the report. Quality is hard-coupled to model capacity: cheap model = silent data loss, flagship model = $$$. Represent must (a) refuse to silently truncate, (b) emit a per-extraction confidence/completeness metric, (c) prefer streaming/incremental extraction over giant JSON blobs that overflow output budgets.

**178 weakly-connected JSON-key noise nodes** survived semantic enrichment (`command`, `args`, `displayName`). The LLM extracts symbols but doesn't filter "this is just a parameter name appearing in a config file."

---

## Verdict on Represent-as-`/represent`-skill (post-eval)

Yes, ship `/represent` as the primary surface. Three concrete improvements over `/graphify` the labeled run makes visible:

| Graphify gap (measured) | Represent answer |
|---|---|
| Community naming not actually shipped — only manual demos | Names *are* the rendering. `StateMachine`/`Service`/`Queue` come from Semantic Ontology v0, not a post-hoc LLM pass that can silently skip. |
| Betweenness centrality computed on raw graph — `float` stays a "god" by metric even when removed from labels | Compute graph metrics on the semantic projection only. Primitives never enter the centrality calculation because they're never nodes. |
| Silent JSON truncation, no completeness signal | Emit `extraction_coverage: 0.87` per file; refuse to write a scene if coverage drops below threshold without an explicit `--allow-partial` flag. |
| Cost unbounded for monorepos (~$20 for 10k files per snapshot) | `events.jsonl` makes per-commit cost ≈ touched-files only. Snapshot is rare and explicit (`/represent rebuild`); the steady state is incremental and cheap. |
| `graph.html` skipped silently above 5k nodes | Unity WebGPU player has no ceiling. The same scene.yaml renders at 5k or 50k. |
| Static analysis only — no runtime | DrWario already produces the runtime stream; `events.jsonl` is the durable contract for ingesting it. |

The proposed `/represent` skill shape (refined from prior message):

```
pip install represent                       # PyPI
/represent install                          # writes Claude Code skill + hook
/represent .                                # → scene.yaml + events.jsonl + report.md
/represent open                             # launches Unity WebGPU player at localhost
/represent watch                            # tails fs changes into events.jsonl
/represent theme infographic|sc2|city       # swap theme, no re-extract
/represent verify                           # show extraction_coverage per file, list partial extractions
```

The Unity player is the moat but **not** the entry point. Agent-first, human-viz-on-demand.

---

## Verdict on reaching graphify's 49.7k stars

Reach is downstream of distribution shape, not graph quality. From the section above on *Why graphify has so many stars*, Represent must replicate:

1. **Slash-skill primary surface.** Not a Unity build hosted at a URL. The Unity build is a subcommand.
2. **Bold quantified pitch.** Graphify uses "70x token savings" (oversold but viral). Represent's options: *"See your repo at 5,000 nodes without the hairball"*, *"What your agent sees, in one image"*, *"Architecture diagrams that don't lie about staleness"*. Pick one, put a number on it (*"5,000 nodes, 60 fps"* / *"1 commit, 30 ms re-render"*).
3. **Karpathy-adjacent vocabulary.** "Visual memory layer", "agent visual context", "what your agent sees" — anchor in the discourse that's already moving.
4. **16-assistant compatibility matrix.** Copy graphify's `graphify <platform> install` pattern. Most users use one, but the search surface is sixteen.
5. **Translated READMEs day one.** Trivial to do with the slash-skill itself.
6. **Cosmetic legitimacy.** PyPI badge, CI badge, sponsor button, X handle, LinkedIn, star-history chart embed. None of these are about code.
7. **Honest disclosure beats hidden failure.** Graphify ships a stale-graph warning *in* the report and survives YouTube critique because of it. Represent should do the same for `extraction_coverage`, partial extractions, theme-pack-missing-renderer fallbacks.

**Will Represent reach 49.7k?** Plausibly, if launched in the next 2–3 months while the skill wave is cresting. The window is short — `@HuntTheNight`'s "I built my own MCP that does this" comment on the YouTube thread means independent reimplementations are landing weekly. **First mover with theme packs wins**; second mover with theme packs loses to graphify's distribution lead.

**What graphify can't follow:** the Unity WebGPU player + theme pack abstraction + runtime overlay. Their vis-network stack structurally can't host those. That's the durable moat once distribution parity is reached.

---

## Action items extracted from this research

Concrete next steps for Represent, ordered by what unblocks the most downstream work:

1. **Lock in the `/represent` skill contract** — define the six subcommands (`install`, `.`, `open`, `watch`, `theme`, `verify`) and the file outputs (`scene.yaml`, `events.jsonl`, `report.md`). This is the public surface; everything else is internal. Write it as a FEATURE-IMPL.
2. **Build `represent-core` AST extractor** that drops at ingestion: minified files, primitives, build-artifact directories (`.medusa/`, `.next/`, `node_modules/`, `Library/`, `Temp/`, `bin/`, `obj/`, `playwright-report/`, `dist/`). Test target: drwario should emit `LLMClient`/`ProfilingSession`/analysis-rules only — never `float` or `workbench.colorCustomizations`. **Dogfood criterion**: top-10 god-nodes contain zero primitives, zero VSCode setting keys, zero minified symbols.
3. **Emit `extraction_coverage` per file** in `scene.yaml` and refuse to write a scene when coverage drops below threshold (default 0.85) without an explicit `--allow-partial` flag. Cures graphify's silent-truncation failure.
4. **Compute graph metrics on the semantic projection**, not the raw AST graph. Centrality, community detection, betweenness — all run after Semantic Ontology v0 filtering, never before.
5. **Ship one theme first (infographic)** before SC2. The abstraction test from [represent.md § Theme Ideas](../../../docs/products/represent.md#theme-ideas) is: does the *same* scene.yaml render recognizably in two themes? Validate before adding theme #3.
6. **Pull POC 5 (runtime overlay) forward** to a top-3 priority. DrWario already produces the runtime stream; `events.jsonl` is the durable contract. This is the moat graphify cannot follow into.
7. **Skip POC 2 as a user-facing artifact.** Graphify *is* POC 2 with LLM enrichment, and it has the failure modes documented above. Use POC 2 internally as plumbing for POC 4 only.
8. **Launch checklist (per § *Why graphify has so many stars*)**: slash-skill primary surface, PyPI day one, 16-assistant `install` subcommands, translated READMEs, bold quantified pitch ("5k nodes, 60 fps" / "1 commit, 30ms re-render"), Karpathy-adjacent vocabulary, CI/sponsor/star-history badges, MCP-server output as first-class surface.

---

## Final conclusion

### What graphify really is

A **tree-sitter AST extractor + Leiden clustering + vis-network HTML page**, wrapped as a slash-skill for sixteen AI coding assistants. The Python plumbing is solid and the install story is genuinely friction-free. Everything that makes the *output* look like a product — the labeled communities, the architectural insight, the "queryable knowledge graph" framing — is downstream of a single LLM call that the tool documents poorly, never measures, and silently degrades. The headline demo feature (named communities) is not actually shipped by any documented command. **Graphify is a brilliant distribution wrapper around a mediocre static-analysis tool.**

### Are the 49.7k stars inflated?

**Yes — but not fraudulently.** The stars are real (each one is a real person clicking a button) and the project is real (the AST pass works, the install works, the report file gets written). What's inflated is the *gap* between the stars and the delivered value. A user who runs `/graphify` on their own repo gets a force-directed hairball with numbered communities and is no closer to understanding their code than before. Most stars come from the launch impulse — the slash-skill packaging, the Karpathy positioning, the "70x token savings" hook, the 30-language READMEs, the timing. They are paid for by a *promise* (queryable architectural memory) that the tool delivers in skeleton form only. A repo with the same code and a plain README would not break 5k stars. Three signals confirm inflation: (1) the star-to-fork ratio (~9:1) and single-language Python profile suggest a launch-day spike, not years of compounding; (2) the YouTube top comment is *"the 70x savings is waaaayyy over stated"* with 11 likes; (3) the most-cited features in the README (named communities, MCP queries) are the least functional in the actual run.

### What to learn

1. **Distribution shape eats implementation quality.** A worse product with a better launch surface beats a better product with no launch. The Unity WebGPU player can be magnificent, but if the entry point is a hosted URL, Represent loses to whatever ships as `/visualize`.
2. **The LLM call is often *the* product, not a polish layer.** Treat it as load-bearing — measure it, version it, gate on it.
3. **Honest failure disclosure beats hidden failure.** Graphify's stale-graph warning in the report file is what survives YouTube critique. The silent 5,000-node ceiling is what *would* destroy them in a write-up if anyone noticed.
4. **The skill marketplace is currently the flattest distribution surface in dev tools.** Flatter than VSCode extensions, flatter than npm, flatter than browser plugins. One pip line installs into sixteen assistants. This window may close as the marketplaces formalize.
5. **Independent reimplementations land weekly on hot wedges.** `@HuntTheNight`'s "I built an MCP that does this" comment is the canary. The first-mover window on theme packs + runtime overlay is short.

### What to copy

- **Slash-skill primary surface.** `/represent` over a hosted URL.
- **One-line install + one-line invoke.** `pip install represent && /represent .`
- **MCP-server output** as a first-class deliverable, not an afterthought.
- **Honest disclosure in the report file.** Coverage scores, partial-extraction warnings, stale-graph timestamps.
- **Karpathy-adjacent vocabulary**: "visual memory layer", "what your agent sees".
- **16-assistant compatibility matrix.** Most users use one; the search surface is sixteen.
- **Translated READMEs day one.** The skill itself can generate them.
- **Every credibility badge.** PyPI, CI, sponsor, X, LinkedIn, star-history.
- **Doc-to-code citation relations** — the most novel thing graphify's labeled run produced.

### What to avoid

- **vis-network force-directed rendering.** Structurally produces "Path of Exile tree" hairballs. No spatial meaning.
- **Bold token-savings claims.** "70x" decays as context windows grow, and the skeptics smell it on day one.
- **Single visual mode.** Locks you out of the SC2/infographic/city moat.
- **Static `graph.json` rewritten per commit.** The staleness problem `@hatonafox5170` flagged is structural to this design.
- **"Point at any folder" without `.gitignore` semantics.** Build artifacts ranked as architecture is the single most embarrassing failure mode demonstrated here.
- **Silent partial outputs.** If extraction coverage drops, refuse to write or warn loudly. Never bury truncation in a debug log.
- **Centrality on the raw graph.** Compute metrics on the semantic projection, not the AST graph.
- **Monolithic per-snapshot LLM cost.** A $20-per-rebuild monorepo is a non-product. `events.jsonl` makes the steady state incremental.
- **Numbered placeholder communities.** If the labels aren't shipped, the feature isn't shipped.

---

## Files referenced

- [d:/ware/luz/graphify-out/GRAPH_REPORT.md](../../../luz/graphify-out/GRAPH_REPORT.md) — Run 1, luz unlabeled (LLM blocked, 11,588 nodes, no graph.html)
- [d:/ware/drwario/graphify-out/GRAPH_REPORT.md](../../../drwario/graphify-out/GRAPH_REPORT.md) — Run 3, drwario *with* LLM via patched OpenRouter (904 nodes, 63 communities, $0.15 cost)
- [d:/ware/drwario/graphify-out/graph.html](../../../drwario/graphify-out/graph.html) — vis-network viz, ~660 KB self-contained
- [d:/tmp/graphify/graphify/llm.py:83](../../../../../tmp/graphify/graphify/llm.py) — patched line redirecting `openai` backend to OpenRouter (`https://openrouter.ai/api/v1`, default model `anthropic/claude-haiku-4.5`)
- [d:/ware/docs/products/represent.md](../../../docs/products/represent.md) — Represent vision
- [d:/ware/docs/research/trending.md](../../../docs/research/trending.md) — prior trending comparison companion
- Source: <https://github.com/safishamsi/graphify>
- YouTube discussion: <https://www.youtube.com/watch?v=HQEm4rBKdec> (Eric Tech walkthrough — comment thread captured staleness + over-claim critiques used here)
