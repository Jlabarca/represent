# ROMPE: practical explainer and poster trials

> **User verdict (2026-10-21):** Of the tested outputs, only the illustrated **“A memorable overview”** is a convincing direction for Represent. The box-based inspector and controlled diagrams remain useful research/authoring tools, but are not the product's primary visual direction. This supersedes the earlier three-complementary-product recommendation below while preserving its trial measurements. See the [living project views report](reports/Represent%20living%20project%20views.md).

## System Intent

**Use “A memorable overview” as Represent's tested visual direction.** These trials exercised the two [ROMPE prompts](G:/ro/RagnarokRebuildTcp/docs/research/sandbox-explainer-prompts.md) against a planned Albion-inspired sandbox inside retro Ragnarok. They superseded immediate scanner work at the time; they do not change the earlier repository study's historical findings. The user's later product direction makes an updateable, style-aware overview the next design priority.

This was **agent-authored content → native configuration → real renderer**, not autonomous natural-language generation by the GitHub tools. No model/API comparison was performed. The [source audit](../../experiments/rompe/source-audit.md) and [manifest](../../experiments/rompe/source-manifest.json) record source revision, hashes, read scope and qualifications. This establishes document fidelity, not implemented gameplay.

## Ingestion Vector

```text
Read-only ROMPE design documents
|-- accepted Sandbox plan + Groups     # @LLM-ENTRY: current mechanics and relationships
|-- Player Path sections 0–9           # @LLM-TARGET: chapter/status evidence
`-- earlier MMO research               # @LLM-TARGET: rationale, not overriding mechanics
    |
    v
Source audit + shared fact manifest    # exceptions, planned state, unresolved rules
    |
    +-- agent-authored native config --> interactive-diagram --> HTML/SVG
    +-- agent-authored JSON ----------> Eraser CLI -----------> PNG
    `-- authored prompt + refinement -> built-in image tool --> poster PNG
```

The source summaries needed correction before rendering. Red loss includes equipped crafted gear **if flagged**; ordinary black is crafted-only full loss, with a named abyss exception permitting and looting vanilla gear. Grave follows dropping deaths only. Twelve characters describes roster capacity, not active companions. Party and guild are parallel affiliations with a temporary war override, not ownership rings. ([Risk rules](G:/ro/RagnarokRebuildTcp/docs/design/rompe-sandbox.md:472), [abyss exception](G:/ro/RagnarokRebuildTcp/docs/design/player-path-content.md:166), [groups](G:/ro/RagnarokRebuildTcp/docs/design/groups.md:38))

## Visualization Spec

Prompt 1 needs navigable explanations with evidence; Prompt 2 needs an appealing single image. Their acceptance criteria differ. Diagram structure and precise qualifiers belong in the inspector; a poster must select a readable overview without implying that planned mechanics are shipped. Timing remains a playtest sketch. ([Onboarding](G:/ro/RagnarokRebuildTcp/docs/design/rompe-sandbox.md:148), [implementation status table](G:/ro/RagnarokRebuildTcp/docs/design/player-path-content.md:81))

The tested outputs are the [interactive explainer](../../experiments/rompe/interactive-diagram/explainer.html), [native template poster](../../experiments/rompe/interactive-diagram/poster.html), [Eraser poster](../../experiments/rompe/eraser-diagrams/rendered/prompt2-poster.png), and [illustrated poster v2](../../experiments/rompe/imagegen/rompe-poster-v2.png). Correcting misleading concentric rings was deliberate; other composition departures remain shortcomings.

## Bootstrapping Steps

Preserve one audited fact model, then derive separate inspector and poster views. Keep source anchors and unresolved semantics in the inspector. Regenerate native configurations, run structural/browser checks, inspect desktop and mobile screenshots, then review the poster's wording and art manually. Treat render correctness, readability and factual fidelity as separate gates. Do not force code-city analyzers onto game-design documents.

Reproduction instructions live in the [interactive trial README](../../experiments/rompe/interactive-diagram/README.md) and [Eraser trial README](../../experiments/rompe/eraser-diagrams/README.md). Consult the current [browser results](../../experiments/rompe/validation/browser-results.json) after reruns; this report does not freeze an artifact hash.

## Results and limits

| Trial | Actual execution | Practical assessment |
|---|---|---|
| interactive-diagram | Real upstream HTML/SVG runtime; 10 tabs, 56 cards, source details and export | Desktop is readable and explorable; box-based art is weak. Native poster repeats long card bands without pixel style. |
| Eraser Diagrams | Built CLI validated four JSON inputs and rendered three Prompt 1 diagrams plus Prompt 2 poster | Precise and controllable, but flat presentation. Some text wraps to three lines; composition and six-word constraints are not universally satisfied. |
| Built-in image generation | Generated poster, then edited using a refinement prompt | Visually strongest poster: pixel art, clear risk tiles, corrected grouping, planned/sketch badges. Manual inspection is not machine proof of facts. |

The isolated headless Playwright run records **14 passing checks**, all ten tab audits plus poster audit without conflicts, detail/source-anchor behavior, zoom/fit and SVG export. It records no external requests or errors. Mobile has no horizontal overflow, but fit-view labels are too small to read: passing geometry is insufficient. See [desktop](../../experiments/rompe/validation/loop-desktop.png), [mobile](../../experiments/rompe/validation/loop-mobile.png) and [export](../../experiments/rompe/validation/loop-export.svg).

The exact renderer sources are [interactive-diagram](https://github.com/LizardLiang/interactive-diagram/tree/1e252e62fd07631e71316179bc00861f52c6292b) and [eraser-diagrams](https://github.com/eraserlabs/eraser-diagrams/tree/1f5eefd53fa42010dd86321e600d68fdce37b30d). Eraser retained PNGs; it supplied no standalone SVG output flag. Image generation used the built-in image tool, **not a GitHub renderer or Ghost integration**; its [prompt](../../experiments/rompe/imagegen/prompt.txt) and [refinement](../../experiments/rompe/imagegen/refinement.txt) preserve the authoring record.

## Earlier experiment recommendation (superseded as product direction)

The original trial author recommended three complementary views sharing evidence: interactive exploration, reproducible diagrams for detail, and an illustrated poster for orientation. The user later selected only the poster-like “A memorable overview” as a product direction. Retain the inspector and diagrams as research instruments and possible technical-authoring references; they do not set Visu's visual language.

## Decision and source questions

Proceed with the three complementary views sharing evidence: interactive exploration, reproducible diagram/vector export for precise details, and art for orientation. Keep content corrections upstream of every renderer. None of these trials demonstrates that a model independently understood the whole source corpus.

Source clarification remains necessary for “flagged” red equipment loss; same-account safety versus war-side precedence; neutral outsiders versus guildless war targets; and Mid starting at level 25 or 30. Preserve those conflicts rather than inventing answers. ([Red rule](G:/ro/RagnarokRebuildTcp/docs/design/rompe-sandbox.md:472), [precedence](G:/ro/RagnarokRebuildTcp/docs/design/groups.md:95), [war rules](G:/ro/RagnarokRebuildTcp/docs/design/groups.md:257), [Path chapters](G:/ro/RagnarokRebuildTcp/docs/design/player-path-content.md:51), [Sandbox chapters](G:/ro/RagnarokRebuildTcp/docs/design/rompe-sandbox.md:673))
