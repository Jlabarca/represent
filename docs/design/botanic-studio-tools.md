# Botanic Studio tools ← Represent tooling (pointer)

> Updated: 2026-11-20 · Owner of the plan: Botanic, `D:/ware/botanic/docs/reference/studio-tools-roadmap.md` (tracker ORK-000001 phase 7 in `D:/ware/botanic/docs/orkest/botanic-card-home.imp.md`)

Botanic's note workspace (Documento | Chat, with a Studio panel) is adding Studio tools in four phases (S1–S4). Several of them reuse Represent's Notcards code or contracts. This file records which ones, so a change here does not break Botanic quietly.

## What Botanic depends on

| Represent | Used by Botanic as | Phase | Contract to keep stable |
|---|---|---|---|
| `src/clay-notes/core.mjs` summary prompt, the `{overview, statements[{text,sources[]}], conclusions[]}` JSON | "Resumen con citas", "Guía de estudio" and "FAQ" citations | S1, S3 | Field names, and `sources[]` = transcript segment indices |
| `src/notcards/video-summary.mjs` `translate()` | "Traducir", with a cache per revision and locale | S1 | Ported, not called: the Botanic copy runs on Botanic's lanes |
| `src/notcards/video-import.mjs` segments + `transcriptHash` | Citation targets; Studio card staleness | S1–S3 | `segments[].start`, `transcriptHash` |
| `store.mjs updateTranscript`, `POST /api/notes/{id}/transcript` | "Pegar transcripción" through the signed bridge | S2 | The route, owner check and body shape |
| `store.mjs compose`, `POST /api/composer`, `clay-notes/web/composer-links.mjs` | "Separar enlaces" for multi-link notes | S2 | Link extraction, and the one-note-per-link result |
| `store.mjs addImage` | Covers for Studio exports | S4 | `POST /api/notes/{id}/images` |
| `docs/design/clay-notes-service-roadmap.md` waves 1–5 | Product design for S3 (study outputs) and S4 (multi-note, audio, slides) | S3, S4 | Design only; Botanic owns the runtime |

## Not taken

- Notcards' own `/summarize` lane. It bills `LITELLM_KEY_CLAY_NOTES` (USD 1 / 30 days, with `max-broker` forbidden), which is separate from Botanic's `botanic-free` / `botanic-recommended` lanes, and it is reached on prod1 through lab1's bridge.
- Visu, Grafe and Alegor, which are code tools, not note tools.

## When you change one of these here

Check the matching phase in the Botanic roadmap and its tests in `D:/ware/botanic/native/card-home/tests/` (`bridge.test.cjs` for bridge routes; the S1 validator tests once they land).
