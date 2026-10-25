# Trazo POC — week 1 trial (zero-AI sketch)

Date: 2026-10-25. Machine: lab1 (Windows 11, Node 22.23.1). Tracker box: REPRESENT-TRAZO-POC.1.6. Verdict box: 1.7 (operator).

**Zero model calls, zero network requests.** Every number here comes from `node src/trazo/cli.mjs <folder> --once --yes` or from the viewer; the ledger on every folder reads `0 calls, $0.00`.

## What was built (1.1 to 1.5)

| Piece | File | Notes |
|---|---|---|
| CLI and consent | `src/trazo/cli.mjs`, `src/trazo/consent.mjs` | Prints what will and will not be read, asks `[y/N]`, stores consent per canonical path under the Trazo store (`%LOCALAPPDATA%/Represent/trazo/`, `TRAZO_STORE` or `--store` to override). Refuses a store inside the folder. `--revoke`, `--list`, `--once`, `--port`, `--budget`. |
| Library seams | `src/visu/discovery.mjs` `inventory()`, `src/alegor/core.mjs` `readHistory()`, `src/grafe/core.mjs` `indexFiles()` | Visu, Grafe and Alegor behaviour unchanged; the existing 57 tests still pass. |
| Fact graph | `src/trazo/facts.mjs` | Bounded capture (2000 files, 1 MiB each, 32 MiB), import scanners for JS/TS, Python, C#, Go, Rust, Java/Kotlin, Markdown sections, last 40 commits, stable ids, level floors, lazy JS/TS symbols through Grafe. |
| Sketch | `src/trazo/sketch.mjs` | Deterministic SVG: strip treemap ordered by module id, curved import arrows, history strip, four levels. CSS variables for theme. |
| Viewer | `src/trazo/server.mjs`, `web/trazo/` | Loopback only, per-process token in a meta tag, exact Host and Origin checks, CSP, dial (keys 1 to 4), three themes (`t`), recapture (`r`), status strip, ledger. Port 8875. |
| Tests | `tests/trazo-core.test.mjs`, `tests/trazo-server.test.mjs` | 10 tests; whole suite 67 pass, 0 fail. |

## Timings (warm cache, same machine)

From [timings.json](timings.json). Capture = inventory plus reading and hashing text files; history = four git calls; facts = graph build; symbols = Grafe's TypeScript program, computed only when the deep level is opened.

| Folder | Files | KiB | Modules | Commits | Capture | History | Facts | **Total to first sketch** | Symbols (lazy) | Render guide |
|---|---|---|---|---|---|---|---|---|---|---|
| Represent (worktree) | 200 | 2 909 | 20 | 31 | 131 ms | 315 ms | 22 ms | **468 ms** | 1 890 ms | 2.9 ms |
| Plane Sync | 15 | 140 | 7 | 25 | 84 ms | 352 ms | 1 ms | **438 ms** | 567 ms | 0.3 ms |
| luz | 1 031 | 5 656 | 22 | 40 | 341 ms | 386 ms | 54 ms | **781 ms** | 1 592 ms | 0.8 ms |
| D:/ware/docs | 697 | 10 597 | 18 | 40 | 214 ms | 350 ms | 49 ms | **613 ms** | 922 ms | 1.2 ms |

Cold first runs of the day: Represent 4.0 s, Plane Sync 0.9 s, luz 13.6 s, docs 9.1 s. Profiling showed the cost is Windows reading the files for the first time (the same `readFileSync` loop takes 0.3 s warm), not Trazo's work. TEST.1's "under 3 s" passes warm on all four and cold on two; the cold case needs either a progress line or a first-run note.

Dial switches (TEST.2): server render under 3 ms at every level; the browser shows the new sketch in 3 to 15 ms; the deep level's first open waits for symbols (0.6 to 1.9 s), later opens are instant. No network request leaves loopback.

## What the sketches show

Screenshots are from the viewer; SVGs are the server's output for each level.

- Represent: [poster](represent-poster.jpg), [guide](represent-guide.jpg), [engineer](represent-engineer.jpg), [deep](represent-deep.jpg) (dark theme). Module arrows show `scripts`, `tests` and `src/trazo` depending on the three tools; the history strip is coloured by the module each commit touched most.
- luz: [guide, dark](luz-guide-dark.jpg), [poster, light](luz-poster-light.jpg). 22 modules; the poster collapses 17 small ones into one box. No module arrows: luz imports through `@/` aliases and inside each app, which the scanner does not resolve.
- docs: [guide, light](docs-guide-light.jpg). A pure Markdown folder draws as well as a code folder: modules by top-level directory, sections counted, history coloured.
- Plane Sync: [guide SVG](plane-sync-guide.svg) only; a 15-file project is one row of boxes.

Rendered SVGs: `<folder>-{poster,guide,engineer,deep}.svg` for all four folders.

## Observations for the verdict

1. **A free sketch exists and is fast.** Under a second warm on every folder, under 100 ms per dial switch, nothing sent anywhere.
2. **It is honest but plain.** The guide level reads as a labelled treemap with a history strip; it is a map, not yet a picture. Whether this is worth keeping open before any explanation or illustration is the question 1.7 asks.
3. **Known gaps.** Path aliases (`@/`, tsconfig `paths`) are not resolved, so TypeScript apps show few or no module arrows. C# and Go namespace imports resolve to directories and often land in the same module, adding little. Modules are top-level directories (or second-level under `src`, `apps`, `docs` and the like); monorepos with deeper structure get coarse boxes. The deep level lists symbols; it does not draw calls yet.
4. **Cold start.** The first capture of a large folder after a reboot can take 10 s on this machine. A progress line in the CLI and a "first run" note in the viewer would cover it; caching file hashes by mtime would remove it.
5. **Security held in tests.** Secrets, dependencies and hidden paths never enter the capture; wrong token, Host or Origin are refused; snapshot files on disk are never rewritten.

## Verdict (1.7, operator)

Pending. Options: go to week 2 (explain and compose) as planned; go with layout fixes first (aliases, progress line); stop.
