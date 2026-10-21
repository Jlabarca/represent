# Living overview concept

A small, local UI direction study for the product idea the user preferred: a memorable, project-styled infographic that remains easy to read as a whole, with optional technical or progress detail when requested.

## Open

Serve the repository root and open `experiments/rompe/living-overview-concept/` in a browser. The page is buildless and has no external requests or dependencies.

## What this explores

- The selected ROMPE poster stays the dominant visual canvas.
- “Explore details” reveals three keyboard-accessible markers. While hidden, markers are disabled and skipped by Tab. Selecting one opens a short explanation and direct links to captured source lines; close returns focus to the selected marker.
- The detail panel is closed until a marker is selected. On mobile, selecting a marker scrolls the detail panel into view and focuses its close control.
- “Project status” adds a visible planned label to the markers. The panel distinguishes accepted design from implemented behavior.
- The source snapshot was audited on 21 Oct 2026 at ROMPE HEAD `07eabc1`. The timeline switches between two real poster revisions from that same source snapshot, so it describes artwork changes and makes no claim about game progress.
- The suite footer explores Visu (visual overviews), Grafe (technical exploration), and Alegor (companion and project history) as working names only.

## Limits

This is a static interaction prototype, not the product service. It has no ingestion, automatic project-style detection, persistent snapshots, generated updates, animation engine, chat, or backend. The ROMPE artwork is reused unchanged; details and status are a small hand-authored demonstration backed by the linked design sources. The raster overview is still a compressed summary, and its text is small on mobile, so source details carry the precise rules. Mobile detail text is sized for reading and is brought into view after selecting a marker.

## Verification

The tested interactions, viewport sizes, and screenshots are recorded in `validation-results.json` and `validation/`.
