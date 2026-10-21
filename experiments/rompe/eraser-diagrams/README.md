# ROMPE diagrams through Eraser Diagrams

This experiment runs the visual portions of the two prompts in [`sandbox-explainer-prompts.md`](G:/ro/RagnarokRebuildTcp/docs/research/sandbox-explainer-prompts.md): Prompt 1's economy loop, four risk zones, and grouping diagrams, plus Prompt 2's tall poster. The inputs are explicit Eraser JSON authored from the project documents; this is a renderer benchmark, not a provider/LLM generation run. It makes no network requests at render time: no external icons or fonts are used.

## Source fidelity and status

The source docs call ROMPE Sandbox the accepted core project plan, but state that there is no implementation tracker/code for it yet. The first-15-minute sequence is explicitly a sketch to playtest. These artifacts are marked **planned design** throughout. They preserve the important qualifications:

- Blue permits up to three active companions; yellow up to two; red and black one. Those are concurrent active-body caps, not the account roster size.
- The account roster is up to 12 characters (you plus 1–11), represented as a tag on your characters in a party, not a separate grouping tier.
- Red PvP drops inventory, plus equipped crafted gear only if flagged. Black is full loot for crafted-only gear. Named black “abyss” maps are the exception where vanilla gear is also permitted and lootable.
- Blue is normally PvP-off, though event-side rules can still allow fighting. Yellow has no item drops but crafted durability wears.
- The playtest sketch starts with triple healing in the starter field and a level-80 rented companion for two minutes; these are not live onboarding steps.
- Party is temporary and uncapped; guild is permanent and can form by promoting a party, which then disbands. A war/event lease temporarily overrides ordinary party relations with a guild-only side.
- Death/grave applies only where the map's drop rule calls for it; the economy diagram does not imply a universal death penalty.

Primary read-only sources: `G:/ro/RagnarokRebuildTcp/docs/design/rompe-sandbox.md` (especially §§4.2, 9, 10.1, 10.4), `groups.md` (§§0, 1, 3, 7.1), `player-path-content.md` (v2.0 path), and `docs/research/modern-mmo-lessons.md`. The poster uses geometric pixel-like shapes rather than externally sourced game art.

## Renderer record

- Official repository: [eraserlabs/eraser-diagrams](https://github.com/eraserlabs/eraser-diagrams)
- Local shallow clone: `D:/ware/represent/references/eraser-diagrams`
- Checked-out HEAD: `1f5eefd53fa42010dd86321e600d68fdce37b30d`
- Root/package license: MIT (`LICENSE`; package metadata also says MIT)
- Node: 22.23.1; pnpm: 8.10.4; renderer CLI built from the checked-out workspace dependencies; browser: local Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- Install/build used: `pnpm install --filter @eraserlabs/diagrams-cli... --ignore-scripts --prefer-offline`; `pnpm --filter @eraserlabs/diagrams-cli... build`.
- Validation: all four JSON inputs passed `eraser-diagrams validate` with zero errors/warnings.
- Rendering: all four PNGs rendered successfully, zero errors/warnings. At 1.25×, reported per-image render durations were about 2.0–2.5 s (renderer-reported, not a controlled benchmark).
- The renderer's supported file outputs are PNG and HTML; it has no standalone SVG output flag. PNG is the retained visual output.
- No project source files were edited and no commits were created. Dependency installation/build files live in the assigned clone; its lockfile was restored to the recorded commit after pnpm 8 reported it incompatible and rewrote it. Git status is clean.

## Reproduce

After installing/building the CLI once as above, from PowerShell 5.1 run:

```powershell
& 'D:/ware/represent/experiments/rompe/eraser-diagrams/run.ps1'
#
```

`run.ps1` regenerates the four input JSON files, validates them, and renders PNGs into `rendered/` with the local Chrome path pinned. No API key or hosted generation call is involved.

## Artifacts

### Prompt 1

- [Economy core loop](rendered/prompt1-economy.png) · [source JSON](inputs/prompt1-economy.json)
- [Risk zones](rendered/prompt1-risk-zones.png) · [source JSON](inputs/prompt1-risk-zones.json)
- [Grouping model](rendered/prompt1-grouping.png) · [source JSON](inputs/prompt1-grouping.json)

### Prompt 2

- [Tall poster](rendered/prompt2-poster.png) · [source JSON](inputs/prompt2-poster.json)

### Regeneration source

- [Input generator](generate-inputs.mjs)
- [PowerShell render script](run.ps1)
