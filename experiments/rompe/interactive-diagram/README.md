# ROMPE through interactive-diagram

This is an actual use of LizardLiang/interactive-diagram, pinned at `1e252e62fd07631e71316179bc00861f52c6292b` (MIT). Both outputs use its real HTML/SVG renderer. `generate.mjs` imports its own `configSpan` and `spliceTitle` machinery. Renderer algorithms and event behavior are retained; authored configuration, a small risk-colour CSS override, and UI-string substitutions are the output adaptations. UI strings also occur inside JavaScript; no algorithm or handler was replaced. Attribution/license: [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt).

Open **explainer.html** for Prompt 1 or **poster.html** for Prompt 2. Sources were read from `G:/ro/RagnarokRebuildTcp/docs` without changing that repository. `sources.html` contains line-linked read-only snapshots; player-path is limited to sections 0–9. Each interactive card links to source context. `pitch.md` provides the plain-text pitch and five key ideas.

## What was adapted

- Prompt 1 uses the explicitly permitted native diagram format. Ten purpose-specific tabs avoid putting all 56 cards into one graph. The economic loop is authored around a circuit, with a survive/sell branch. The upstream layout guard may adjust coordinates. Minutes use a linked progression rather than the template's calendar-date timeline, avoiding fabricated dates.
- Short diagram labels carry at most two authored lines; longer explanation and evidence live in the upstream details panel. Actual wrapping/readability requires a browser check.
- Prompt 2 uses the real upstream poster template. It is a tall band-based infographic, **not an exact execution** of the specified circular six-icon composition, stacked rings, pixel-art characters, or guaranteed 4:5/9:16 image. It is an HTML/SVG poster candidate, not a generated raster image. The upstream exporter can produce SVG/PNG after browser inspection.
- Grouping deliberately uses relationship/override arrows instead of literal concentric containment. Party and guild are separate relationships; promotion dismantles the old party; event war sides override normal bonds.
- The source design corrects the prompt's abbreviated risk rule: red drops inventory **plus equipped crafted gear if flagged**; ordinary black is crafted-only full loot; named abyss maps permit and loot vanilla gear. Twelve is roster capacity, not active companions. Onboarding is a playtest sketch; minute-eight rental may initially be scripted.
- Market strategy statements are attributed to the supplied design/research rationale, not independently verified market findings. Current implementation is not inferred from accepted design.

## Reproduce

Requires Python and Node, plus the existing sibling shallow upstream clone. No dependencies to install, network service, or LLM API calls.

```powershell
python D:/ware/represent/experiments/rompe/interactive-diagram/author.py #
```

```powershell
node D:/ware/represent/experiments/rompe/interactive-diagram/generate.mjs #
```

```powershell
node D:/ware/represent/experiments/rompe/interactive-diagram/validate.mjs #
```

Local serving, if needed:

```powershell
python -m http.server 8770 --bind 127.0.0.1 --directory D:/ware/represent/experiments/rompe/interactive-diagram #
```

## Actual validation

2026-10-21: authoring and generation exited successfully. Validation passed: 10 views, 56 cards, seven event cards, unique IDs, valid edge endpoints, source links, maximum two authored label lines, maximum six-word poster labels, parsable embedded renderer JavaScript, and no external script tags. No upstream files were modified.

After the semantic/source/UI corrections below, static validation and the headless Playwright harness passed on the final generated files: 14 browser checks passed, all ten tabs and the poster reported no overlaps, and source navigation, zoom/Fit and SVG export passed. No page errors or external requests were observed. Mobile Fit makes labels too small; zoom/detail remains necessary. The harness, results and screenshots are preserved in [../validation/](../validation/).

## Browser test handoff

Open `explainer.html`. Native selectors from inspected upstream source:

- `.tab-btn[data-tab-id="risk"]`, then `.node-group[data-id="red"]`: inspect `#panel-title`, `#panel-desc`, and `#panel-resp a`. Expected conditional red loss and a working source link.
- `.tab-btn[data-tab-id="loop"]`: inspect circular economy and survive branch; hover `risk` to trace its chain, double-click to pin, drag a node, then use Fit.
- `.tab-btn[data-tab-id="groups"]`, then `.node-group[data-id="war"]`: description must explain override rather than containment.
- `.tab-btn[data-tab-id="onboarding"]`, then `.node-group[data-id="minute8"]`: planned two-minute rental and scripted fallback.
- `#btn-audit`: upstream overlap audit. Run separately on all ten views; record actual conflicts rather than assuming clean output.
- `#btn-theme`, `#btn-svg`: inspect theme contrast and exported SVG. No search feature is claimed.
- Poster: upstream `#svg` exports SVG; inspect the generated page before export. The poster template also has its own overlap/overflow audit.

Visible zoom/Fit/theme/help/audit/export-adjacent toolbar labels and the legend title are translated to English by explicit UI-only substitutions in generate.mjs. Config typeLabels supplies game-facing terms. Long help prose and remaining secondary UI are not fully localized; this is not a complete localization claim.

## Semantic review corrections

Every card now has explicit per-ID source anchors, replacing the generic tab anchor. Important corrections: Grave → Sandbox line 502 plus risk table 479; implementation status → Player Path line 81; minute-eight rental → Sandbox 160 and scripted fallback 758; each event → its own section; grouping → Groups relation/decision sections. Mid omits a disputed lower bound and states both source values (Player Path 25–70 versus Sandbox 30–70). Blue details distinguish ambient soft Off from event-side combat and the hard town PvpOff veto, with Groups lines 248 and 310. The poster says starter-field triple healing instead of ambiguous First Aid ×3. These changes are reproducible through author.py and generate.mjs.
