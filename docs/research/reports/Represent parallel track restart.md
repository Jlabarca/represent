# Restart Grafe and Alegor in parallel

The Grafe and Alegor tracks did not keep progressing while Visu was built: their initial research and designs existed, but the work was allowed to stall when implementation narrowed around Visu. This restart turns both tracks into evidence-backed, independently testable MVP proposals. Grafe now demonstrates exact source navigation over a fixture and a small real index; Alegor demonstrates a source-cited re-entry brief and exposes stale project state. **Both are ready for narrow local MVP implementation**, while neither prototype is a shipped product and several user-value questions remain open. Visu is paused, not a prerequisite for either track.

## System Intent

**Grafe** should answer concrete code-navigation questions—what calls this symbol, where is it defined, and which tests or files are related—then take a developer to inspectable source. A focused outline and evidence pane are the first useful product loop; a graph is an optional local projection, not the product's purpose. **Alegor** should answer where work stopped, what changed, what was decided, and what remains uncertain using project history and cited project records. Its starting point can be Git plus project docs; session history is an explicit later input, not a requirement for the first MVP. The local trials support feasibility and a starting scope, not adoption or willingness-to-pay claims. ([Grafe experiment](../../../experiments/grafe-restart/README.md), [Alegor experiment](../../../experiments/alegor-restart/README.md), [developer-needs evidence](../research_notes/Represent%20parallel%20track%20restart/developer-needs.md))

## Ingestion Vector (annotated tree)

Grafe's experiment decoded SCIP TypeScript symbols and occurrences, then used a TypeScript AST overlay to classify calls and imports where SCIP role bits were insufficient. The pinned synthetic fixture covers four TypeScript files. The real plane-sync check decoded an already-existing index; its six documents are observed scope, not full-repository coverage. A production MVP should pin the exact source file set and revision, record extractor/version and diagnostics, verify each displayed span against the file, and keep unknown relations visible. It must not run a target repository's install/build scripts as an indexing shortcut. SCIP defines index, document, symbol, occurrence, and range data; it does not supply Grafe's user experience or prove extraction completeness. ([SCIP schema](https://github.com/scip-code/scip/blob/main/scip.proto), [SCIP TypeScript indexer](https://github.com/sourcegraph/scip-typescript), [measured local trial](../../../experiments/grafe-restart/README.md))

```text
project-root/
├── .git/                 # @LLM-TARGET: revision, branch, changed paths
├── package.json          # @LLM-TARGET: package boundaries and declared tooling
├── tsconfig.json         # @LLM-TARGET: JS/TS project scope and resolution settings
├── src/                  # @LLM-TARGET: symbols, imports, calls, references, exact spans
├── test/                 # @LLM-TARGET: test symbols and explicit source references
├── docs/                 # @LLM-TARGET: declared intent; never invent code edges
├── node_modules/         # @LLM-IGNORE: third-party source
└── dist/                 # @LLM-IGNORE: generated output
```

Alegor's first extractor reads the chosen repository's Git changes and explicitly selected status/decision documents, preserving observed Git facts separately from declared prose and unresolved conflicts. The trial covered seven commits and 78 changed paths at a pinned HEAD and cited CONTEXT and TODO independently. A synthetic session fixture tested candidate linkage only; no personal session folders or transcripts were read. Any real session connector must be selected and previewed by the user, retain origin and parser information, and allow weak candidates to remain unlinked. The `sessions` project describes local transcript search, resume, and repository context, establishing an adjacent implementation pattern—not market demand or compatibility with Alegor. ([pinned sessions README](https://github.com/nicknisi/sessions/blob/9293eb6a8ed7a92c27c9c531061bd20e5b8bd1cb/README.md), [Alegor trial limits](../../../experiments/alegor-restart/README.md), [developer-needs evidence](../research_notes/Represent%20parallel%20track%20restart/developer-needs.md))

```text
project-root/
├── .git/                           # @LLM-TARGET: dated commits and changed paths
├── README.md                       # @LLM-ENTRY: project identity and vocabulary
├── docs/CONTEXT.md                 # @LLM-TARGET: declared state, cite exact lines
├── docs/TODO.md                    # @LLM-TARGET: work state; surface disagreements
├── .represent/snapshots/           # @LLM-TARGET: linked source snapshots when present
├── .represent/views/               # @LLM-TARGET: Visu/Grafe revisions when present
├── [user-selected session roots]/  # @LLM-TARGET: previewed connector evidence only
├── node_modules/                   # @LLM-IGNORE: dependencies
└── build output/                   # @LLM-IGNORE: generated files
```

## Visualization Spec

The Grafe test viewer is deliberately a crude but working technical outline: selectable symbols on one side and grouped definitions, imports, calls, and references with snippets on the other. The next interface should keep that evidence pane, add search and relation filters, and reveal only a focused neighborhood. Label relations by their actual evidence source and provide a list/outline alternative. In the synthetic fixture, **39 total occurrences; all non-container source spans were checked and had zero mismatches**; the browser showed a selected function's definition, import, and call with no page errors. The existing plane-sync index had six documents, 1,075 symbols, 6,485 occurrences, and no span mismatches, but the index's original file scope was not pinned, so those counts cannot establish completeness. ([Grafe trial and viewer](../../../experiments/grafe-restart/README.md))

Alegor's static concept uses a dated commit timeline, a declared-state card, and a conflict card with separate citations. It correctly exposed a stale sprint statement in CONTEXT that TODO already contradicted. That is useful because the companion should show the disagreement rather than silently choose which document is right. The browser prototype passed **12 checks**, including source-link navigation and a 390px layout. It remains a small static prototype, not a finished companion UI. ([Alegor trial](../../../experiments/alegor-restart/README.md))

## Bootstrapping Steps

1. **Grafe MVP:** freeze a versioned headless snapshot contract and implement local TypeScript/JavaScript indexing from a reviewed, explicit file scope. Include stable symbol IDs, typed relations, source spans, per-file identity, tool version, and diagnostics. Keep the CLI/core independent of the web viewer.
2. Test Grafe on a second larger repository with its exact input set pinned. Manually review imports, calls, references, and tests; verify every shown range. Have a maintainer complete a caller-and-related-tests task, then measure clean indexing and one-file refresh.
3. **Alegor MVP:** turn the deterministic Git/docs re-entry extractor into a local CLI and web brief. Add fixtures for unchanged state, docs-only changes, conflicting records, deleted citations, and unsupported evidence. Make citations clickable and label observed, declared, inferred, corrected, and unknown claims.
4. Validate Alegor on one real project re-entry task, then invite the user to choose a small session source and preview what would be read. Measure missed and false candidate links; preserve uncertainty. This real-session check does not block the Git/docs MVP.
5. Keep both tracks local-first and exportable. Reuse Visu's existing snapshot/view identity where applicable while evolving a common technical evidence contract; do not gate either build on Visu integration. Use Ghost only for optional cited summaries after deterministic behavior is useful; no AI call was made in these trials.

## What the restart proved—and what it did not

Grafe's controlled four-file run yielded **4 documents and 39 total occurrences**; all non-container source spans were checked, with zero mismatches. The separately decoded plane-sync index yielded **6 documents, 1,075 symbols, 6,485 occurrences, zero recorded diagnostics, and zero source-span mismatches**. An AST overlay classified 47 imported symbols, 1,711 call expressions, and 3,652 other references; these are counts for those six observed files, not a completeness or scale benchmark. Its browser check passed, and plane-sync remained clean. ([Grafe measurements](../../../experiments/grafe-restart/README.md))

Alegor's Git/docs record used **7 commits and 78 unique changed paths** at the captured HEAD. The isolated Windows trial of pinned `nicknisi/sessions` reproduced 8 passing, 14 failing tests and one setup error; after correcting the fixture path and a two-line experimental scanner normalization, the context suite passed **25/25**. This is not an upstream patch or full-suite Windows validation, and actual Claude session-folder naming remains unchecked. The Alegor browser passed 12 checks. Both tracks made **zero paid AI calls**. ([Alegor experiment logs and limits](../../../experiments/alegor-restart/README.md))

The market evidence is narrow: issue reports describe graph scope/performance and indexing diagnostics; project READMEs describe transcript search and persistent memory. These are concrete signals to test, but not representative user research. A plausible open-source contribution is the common boring layer—versioned evidence/snapshot formats, extractor and connector adapters, coverage diagnostics, fixtures, and a renderer-independent CLI/MCP read interface. The next meaningful proof is task success with maintainers, plus correctness and false-link measurements; stars, feature lists, and attractive demos cannot substitute for that. ([source-backed developer-needs synthesis](../research_notes/Represent%20parallel%20track%20restart/developer-needs.md))

