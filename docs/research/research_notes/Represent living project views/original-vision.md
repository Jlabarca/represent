# Historical Represent vision: technical exploration and visual overviews

## System Intent

Recover the product ideas in the Notion export for a project visualizer: one direction makes a memorable, project-styled overview; another supports technical exploration of code structure and, potentially, runtime behavior. This is historical design research, not a current implementation spec. The current suite proposal is Represent / Visu / Grafe / Alegor, with naming and the companion's role still open.

## Ingestion Vector

Read every Markdown file and inspect all four images in the preserved Notion export:

```text
notion/                                                        # @LLM-ENTRY: historical Represent vision export
├── Go Visual - Auto Mermaid Diagram of your architect …md     # @LLM-TARGET: visual-scripting intermediate, Unity/WebGPU, cost
├── Pixel Clay - Represent Code Graphics Representatio …md     # @LLM-TARGET: primary product idea and evolution notes
└── Pixel Clay - Represent Code Graphics Representatio/        # @LLM-TARGET: attached historical source material
    ├── 11 abril Attempt …md                                    # @LLM-TARGET: code structures, interactions, system proposal
    ├── Code runtime doctor …md                                 # @LLM-TARGET: profiling and runtime diagnosis concept
    ├── MiniMap …md                                             # @LLM-TARGET: code navigation and visual references
    │   ├── image.png                                           # @LLM-DECORATIVE: top-down game-map reference
    │   └── image 1.png                                         # @LLM-DECORATIVE: isometric architecture reference
    ├── PET …md                                                 # @LLM-TARGET: one-line theme lead only
    ├── Research …md                                            # @LLM-TARGET: one-line product lead only
    ├── What if …md                                              # @LLM-TARGET: assistant-session identity customization
    ├── image.png                                               # @LLM-DECORATIVE: visual-style reference
    └── Untitled.png                                            # @LLM-TARGET: visible Codevis graph and code-snippet example
```

The export contains 8 Markdown files and 4 PNG files. All are inventoried and hashed in the Source corpus manifest below; the source files remain unchanged.

## Visualization Spec

This note is a source-linked synthesis, with the Codevis screenshot as the concrete technical-view reference. Historical concepts support a readable overview, selectable or hoverable detail, and a zoomable code map with named entities and optional snippets. The current design exploration separates a memorable infographic (Visu) from technical exploration (Grafe); visual style and suite names remain provisional. See [Codevis screenshot](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Untitled.png).

## Bootstrapping Steps

1. Treat the findings below as historical evidence; distinguish visible/source-backed facts from generated design suggestions and untested ideas.
2. Define one Visu MVP around a memorable overview, project style, cheap updates and details on demand; measure refresh cost and readability.
3. In parallel, define a Grafe technical-view spike for source-linked code entities, controlled detail density and navigation; keep runtime overlays and code-change what-if analysis as separately scoped research.
4. Explore whether a companion called Alegor should keep snapshots and show project evolution; settle its role, privacy/storage and branding before implementation.
5. Preserve a shared evidence model only after validating what data both views need; compare proposed choices with the existing reference repositories and trials.

## What the original notes establish about the product

### Takeaway
The durable original idea is a codebase made legible through project-specific visual metaphors, with both useful structure and an immediately recognizable overview. The notes repeatedly pair a visual summary with an optional path into technical detail, while leaving implementation choices exploratory.

### Cited Findings
- The main note calls for an iconic image of a project and its parts, but also says the visualization should expose runtime paths, uncertainty, randomness, dependencies, use, and injection relationships — [main note, “First Attempt” and “Pruebas”](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L77).
- Its proposed visual metaphors include a file as an actor or creature, where traits reflect code shape and relationships; a generated prompt also varies the technical level of the explanation — [main note, “Pruebas” and “IA ayudando a diseñar”](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L103).
- The April attempt sharpens the technical goal: show recurring structures such as lists, dictionaries, pools and state machines; show which things interact, how many there are, how they interact, and a short phrase summarizing the behavior. It asks for configurable technical depth and reusable image or viewer outputs — [11 abril Attempt, opening prompt](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/11%20abril%20Attempt%201d316a8a3d6580aa9dbbf1e1a3df496f.md#L1).
- The main note explicitly treats a visual-scripting-like intermediate model as a step toward richer imagery and suggests a toggle to inspect that intermediate representation — [Go Visual, “Unity WebGPU implementation”](../../../../notion/Go%20Visual%20-%20Auto%20Mermaid%20Diagram%20of%20your%20architect%2017316a8a3d6580cd9702cfbc5c89b20d.md#L12).
- A separate idea describes analyzing runtime workflows and their strengths and weaknesses, beginning with Unity profiling data and potentially expanding to builds and a web app — [Code runtime doctor](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Code%20runtime%20doctor%2031b16a8a3d65809aae3fc0469c228281.md#L1).
- The MiniMap note imagines a project map that follows the developer's current location, supports zooming out to the whole diagram, and can detach or resume following. It also proposes an always-available overlay restricted to selected applications — [MiniMap](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap%2031116a8a3d65801ba934c246225923bf.md#L1).
- The same note's attached second image is a polished isometric cloud-architecture diagram. The prose discusses Cloudcraft, Python `diagrams`, Eraser and D2 as options; it does not establish that any was adopted — [MiniMap image: isometric architecture reference](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap/image%201.png).
- The original vision also includes an evolving local representation that might later become animation, short video or a 3D mesh, plus user prompting to improve the representation — [main note, research callout](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L12).
- Cost and device constraints were already recognized: the Go Visual note questions the cost of one or two model calls per query, while the main note calls out local disk/RAM and performance on large repositories — [Go Visual](../../../../notion/Go%20Visual%20-%20Auto%20Mermaid%20Diagram%20of%20your%20architect%2017316a8a3d6580cd9702cfbc5c89b20d.md#L1); [main note, performance](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L230).
- The “What if” page is about customizing the developer's coding-assistant workspace to distinguish many concurrent sessions using colors, images and titles; it does not describe what-if code simulations — [What if](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/What%20if%2031816a8a3d6580129e42f59e492fb5b3.md#L1).
- Runtime and first-person code-navigation ideas are joined by unfinished references to a PET and to Codalogy; those pages provide leads only, not requirements or an evaluation — [PET](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/PET%2032816a8a3d6580209f8ec360a6088f18.md#L1); [Research](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Research%2026316a8a3d65809d84afd8cce42368e6.md#L1).

### Inferences
- The strongest enduring product principle is “overview first, detail on demand”: let a readable overview explain the important shape, then expose exact structures, source, counts, runtime evidence and uncertainty through selection or hover. The April prompt's explicit adjustable technical level and the MiniMap's zoom/navigation idea support that synthesis.
- The generated-poster-to-interactive direction in the current conversation is consistent with the old “local image, later animation/video/3D” progression. A working suite proposal is **Represent** as umbrella, **Visu** for the project-styled animated interactive infographic, **Grafe** for technical exploration, and **Alegor** for a possible companion. These are open branding and product-role proposals, not historically established or locked decisions.
- The current MVP preference for “A memorable overview,” project-specific visual style and cheap incremental refresh narrows the old broad vision in a useful way. A progress/snapshot timeline and hover/popup data layer are current steering, not requirements found in the historical export.
- “Alegor” is a proposed name for a companion; the user's explicit clarification is that it is not a mascot. A snapshot/history assistant or service is one possible role to design, not an established product definition. Old creature/PET metaphors should be read as optional representational themes, not as the companion's character.
- Stable project identity, a source-backed intermediate model and incremental recomputation are likely prerequisites if the overview must remain updateable and link visual elements to technical detail. The export proposes local evolving data and a pseudo-visual-scripting stage but does not specify those mechanisms.

### Gaps
- The Notion export does not preserve reliable creation dates for all pages. “11 abril” is in a title but does not establish a year; treat this as historical material rather than asserting an exact age.
- No note defines which graph nodes or edges are authoritative, how evidence/uncertainty should be represented, how updates are reconciled, or how a user approves a changed interpretation.
- “What if” scenario analysis, such as predicting the effect of a code change, is not described in this export; only customization of concurrent assistant sessions is.
- Runtime diagnosis is an idea, not an implemented analyzer specification. The notes do not identify supported profiler formats, measurements, sampling overhead, or causality limits.
- Whether Unity/WebGPU, web rendering, IDE plugins, or a specific diagram library should be chosen remains open in the source material.

## What the Codevis and minimap images visibly establish

### Takeaway
The Codevis screenshot gives a concrete visual target for technical exploration: named code entities, relationship lines and code snippets can share a navigable canvas. It also gives a clear warning: showing too many entities, edges and snippets at once destroys legibility. The minimap images establish visual references only; they do not prove those systems are integrated with Represent.

### Cited Findings
- The attached screenshot itself displays `github.com/divan/codevis/cmd/codevis`, a central `main` label, many named functions/types, dense connecting lines, and source-like snippets adjacent to selected nodes — [Codevis screenshot](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Untitled.png).
- At the screenshot's overview scale, many labels and snippets overlap or become too small to read, and a large number of edges radiate from `main`. The screenshot visibly demonstrates code-bearing nodes, but not a polished overview of the entire system.
- One image attached to MiniMap is a game-style top-down terrain map with a large player-position marker and scattered points of interest — [MiniMap game-map image](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap/image.png).
- Its second attached image uses an isometric, grouped layout for two regional infrastructure stacks, with labeled services and directional links — [MiniMap architecture image](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap/image%201.png).
- The accompanying prose proposes following the current code location, zooming out to the complete map, and detaching/re-attaching the follower — [MiniMap interaction description](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap%2031116a8a3d65801ba934c246225923bf.md#L1).

### Inferences
- For a useful technical view, nodes should be able to reveal code, not just labels; links to exact source locations and compact snippets are supported by the screenshot's visible example. The implementation must control density with zoom-dependent detail, filtering, focus/neighbor views, or progressive disclosure; otherwise it repeats the screenshot's overload.
- The two visual references suggest a shared spatial canvas could support both an overview and a current-location marker, while the operator's current detail-on-hover preference supplies a natural route from a memorable view to technical data.
- A future “what-if” capability should be treated as a separate, newly specified feature: compare alternate code/architecture states against an evidence-backed baseline. The old page with that title is not evidence for this capability.

### Gaps
- The screenshot does not identify Codevis's node/edge schema, parsing accuracy, interaction behavior, filtering, performance, or current availability. It establishes only what is visible in the captured image.
- The export has no screenshots or specification for runtime diagnosis, profiling overlays, progress snapshot comparison, or code-change simulation.
- The map images do not establish the origin, license, editability, runtime behavior, or technical integration of the depicted visuals.

## How to carry the historical ideas into today's two product directions

### Takeaway
Retain the historical combination of an understandable overview, deep technical inspection and an evolving local model, while using the latest direction to keep the first experience focused on a single memorable, project-styled infographic. Design Grafe, the technical explorer, as a parallel direction rather than forcing every code relationship into the infographic.

### Cited Findings
- Current Represent context still treats the product as pre-implementation and records the headless/embeddable core and Ghost AI pipeline decisions; it lists SVG/WebGL and ingestion approaches as unresolved — [current project context](../../../CONTEXT.md#L1).
- The historical technical track names structure and runtime information: lists/dictionaries/pools/state machines, interaction counts, relationships, runtime paths, uncertainty, profiling-derived strengths/weaknesses, and navigation through a project minimap — [April attempt](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/11%20abril%20Attempt%201d316a8a3d6580aa9dbbf1e1a3df496f.md#L1); [main note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L77); [Code runtime doctor](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/Code%20runtime%20doctor%2031b16a8a3d65809aae3fc0469c228281.md#L1); [MiniMap](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/MiniMap%2031116a8a3d65801ba934c246225923bf.md#L1).
- Historical implementation proposals include a task queue mixing regular computation and LLM work, prompt assembly, result extraction, a code analyzer and a diagram generator; the text names Roslyn, Graphviz/Mermaid, plugins and REST as examples — [April attempt, requirements and proposed architecture](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio/11%20abril%20Attempt%201d316a8a3d6580aa9dbbf1e1a3df496f.md#L30). These are generated design suggestions and exploratory notes, not accepted decisions.
- The historical notes explicitly weigh Unity/WebGPU against web, and call out IDE embedding, scripting/mods, openness, cost, memory, and large-repository performance — [Go Visual](../../../../notion/Go%20Visual%20-%20Auto%20Mermaid%20Diagram%20of%20your%20architect%2017316a8a3d6580cd9702cfbc5c89b20d.md#L12); [main note](../../../../notion/Pixel%20Clay%20-%20Represent%20Code%20Graphics%20Representatio%20d2122e06d68d451c9f980fa24256b9f4.md#L218).
- The current user direction adds the MVP's project-style detection, an easy-to-understand infographic, cheap refresh as the project evolves, optional hover/pop-up details, and interest in a companion under the name Alegor. The user mentioned snapshot/timeline history as a possible idea; defining Alegor as the service that owns that history remains a proposal. This is current operator input from 2026-10-21, not a claim from the older Notion pages.

### Inferences
- **Represent (umbrella, provisional):** organize the suite and shared source/evidence model.
- **Visu (infographic direction, provisional):** generate a memorable overview from a compact, source-grounded model; adapt typography, color, iconography and layout to the project's style; expose short and technical details on hover/popups; update only affected facts/visual regions where feasible; allow snapshots to be revisited in an evolution timeline. The timeline is a plausible feature from current steering, not a historical commitment.
- **Grafe (technical exploration, provisional):** provide a zoomable/focusable map of packages, files, types, functions and selected code; connect each visual claim to source; include optional runtime/profiler overlays and evidence/uncertainty; keep a current-location minimap/follow toggle; investigate scenario comparison as a separately validated feature. This synthesizes documented old ideas and clearly labels runtime/what-if as future research.
- **Alegor (companion name, provisional):** explore an integrated assistant or service that can keep snapshots and make evolution visible, perhaps with timeline thumbnails. That role is a design proposal; the user established only a non-mascot companion naming direction. The boundary between Alegor and the two visual tools remains open.
- A strong shared foundation would preserve stable entity IDs, evidence/source links, project-style tokens, semantic facts, and snapshot deltas, while each product direction chooses a different presentation. This is an architectural inference, not a decision already captured in historical notes.
- Preserve the user's stated UI principle in both directions: a clean, fast default with more technical explanation available on demand, rather than permanent full-detail labeling.
- Cost-efficient evolution likely needs deterministic extraction for repeatable structure, cached/incremental semantic analysis for meaning, and a renderer that can consume saved snapshots without repeating model calls. Historical notes identify the cost/performance problem but do not specify this solution; validate it in research before treating it as architecture.

### Gaps
- “Project style” needs a concrete detection scope: repository assets and docs, existing UI/theme conventions, language/framework, or user-selected references. The old notes suggest themes/modding but define no style inference method.
- Snapshot cadence, what constitutes a change, storage/retention, privacy, sharing, and whether Alegor is local-first or hosted remain unresolved.
- No target benchmark defines “cheap,” acceptable refresh latency, memory use, supported project size, or detail quality.
- Historical headings and ideas use names such as “Pixel Clay,” “Go Visual,” “PET,” “Code runtime doctor,” and “MiniMap.” None is established as the chosen suite brand. Represent / Visu / Grafe / Alegor is a working proposal subject to branding and product-role exploration.
- The image export has 12 files (8 Markdown and 4 PNG). SHA-256 hashes below identify the exact research corpus reviewed; all sources remain unmodified.

### Source corpus manifest

| Source relative to `notion/` | SHA-256 |
|---|---|
| `Go Visual - Auto Mermaid Diagram of your architect 17316a8a3d6580cd9702cfbc5c89b20d.md` | `E8EBCAD038A39AB501F554D94E0AE7C3C7D16C2CE4BEE26944FA973172E5015F` |
| `Pixel Clay - Represent Code Graphics Representatio d2122e06d68d451c9f980fa24256b9f4.md` | `34C16890BA7D9CD81500E26F666334C59F357748E6916DED0CAC651A18453DB3` |
| `Pixel Clay - Represent Code Graphics Representatio/11 abril Attempt 1d316a8a3d6580aa9dbbf1e1a3df496f.md` | `0CD91A1D86D42C786C71DCECEF3D9936F6D0DB213B75186B709ACEE055F0DAF4` |
| `Pixel Clay - Represent Code Graphics Representatio/Code runtime doctor 31b16a8a3d65809aae3fc0469c228281.md` | `0E0F04954366389324781F198B269F1900A7E4E50AC7635D3F9585C82E40C0B2` |
| `Pixel Clay - Represent Code Graphics Representatio/image.png` | `C18F548B0A4FAE51A109D42E7C3534515BD74B1F88B6D93B436763A3D1B981B7` |
| `Pixel Clay - Represent Code Graphics Representatio/MiniMap 31116a8a3d65801ba934c246225923bf.md` | `874F91160E500E75EB4D1C421D104C36F1F920A7C4E8C4733DA4A3EE16A3CED0` |
| `Pixel Clay - Represent Code Graphics Representatio/MiniMap/image 1.png` | `88A2B3B535FB2A80FD4F40AC03D9985C755839D17675297FD761E1F74BE714CF` |
| `Pixel Clay - Represent Code Graphics Representatio/MiniMap/image.png` | `B8ECE79A76FFA57314562193E55AE4481BC78FE556C0D08197FA2478EFA39ADE` |
| `Pixel Clay - Represent Code Graphics Representatio/PET 32816a8a3d6580209f8ec360a6088f18.md` | `BD8C840F90CC846B8F3C09F1BAAAB6679F6E2B66A149B57AB08EBB68F1ADF3B0` |
| `Pixel Clay - Represent Code Graphics Representatio/Research 26316a8a3d65809d84afd8cce42368e6.md` | `FCCB9983108743FA81B7F7F22088E73F4ADF30CDA31F72C3319CA05F8DB164F3` |
| `Pixel Clay - Represent Code Graphics Representatio/Untitled.png` | `E105F7D0C9C9997D30F67EFDD19356D48951183C64E1FCE85E655282208E8306` |
| `Pixel Clay - Represent Code Graphics Representatio/What if 31816a8a3d6580129e42f59e492fb5b3.md` | `F73A46CF5F48FB3C2FA7FE3DC9019870BACF498BE6A1F399E6784DA22B6DFA1E` |
