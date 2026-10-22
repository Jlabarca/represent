# Represent Workspace / “Represent OS” concept infographic

> **Closed learning artifact (2026-10-21).** The owner did not adopt this separate-workspace design. Preserve the infographic, SVG/PNG, source links and checks as research; it is not the next implementation cursor or Visu's visual quality bar. See the [learning closeout](../../docs/research/reports/Represent%20exploration%20learning%20record.md), [Visu preservation guide](../../docs/guides/visu-experience.md), and [Orkest-platform design input](../../docs/research/reports/Represent%20within%20the%20Orkest%20platform.md).

This folder contains a standalone research infographic about the proposed Represent project workspace. It answers what Gource contributed to Grafe’s design, how Dot and Skales informed Alegor, and whether Represent needs a local service, Linux sandbox, or full desktop.

## Files

- `index.html` — responsive interactive infographic. The runtime buttons change a recommendation panel; the research source disclosure opens on demand.
- `poster.svg` — fixed-size 1440 × 1900 static poster artwork.
- `poster.png` — 2× raster export of the poster SVG.
- `desktop.png`, `mobile.png` — browser captures of the responsive HTML at 1440px and 390px widths.
- `browser-check.json` — reproducible browser-check results.
- `browser-check.mjs` — Playwright script used for the local-only checks.

For the full evidence ledger, source citations, project history and runtime comparisons, read [Represent OS design and runtime](../../docs/research/reports/Represent%20OS%20design%20and%20runtime.md).

## Recommendation shown

Use **Represent Workspace** as the user-facing name for the web shell; keep **Represent OS** as an exploratory product metaphor. Keep Alegor’s current deterministic Git/docs snapshots and Grafe’s current JS/TS Focus view as their foundations. A persistent Alegor companion, shared workspace, Grafe Overview/Evolution modes, and integrated Visu artifacts remain proposals. Visu is paused.

Start with the web workspace and current local Node services. Add a narrow local connector for explicit access to a chosen checkout. Add disposable, resource-bounded Linux jobs only when a real workflow requires command execution. Compare managed sandbox providers on the same controlled job before choosing a hosted runner. Defer a full remote desktop until a proven use case requires GUI apps. Keep executable artifact preview on a separate browser origin and sandboxed iframe; a container does not secure same-origin browser content.

## Research distinctions

- Gource shows repository activity over time; its replay is not semantic code architecture. The Grafe MVP is a bounded, evidence-backed JS/TS symbol Focus view. Stable Overview and Gource-inspired Evolution are separate proposed modes; runtime traces need separate observed evidence.
- The supplied Dot screenshot is interface evidence. Official Dot documentation describes cloud and optional local computer access; neither establishes the internal OS/container architecture.
- Skales was researched from the public README and guide, not installed or run. Its public repository says the application is proprietary and source is unavailable.
- No AI/image generation, provider provisioning, paid test, or external runtime asset was used. The infographic is an original HTML/SVG composition; local Playwright and SVG rasterization were used only to validate/export it.

## Re-check locally

In one PowerShell window, serve the repository root. In a second window, run the browser check. The check defaults to `http://127.0.0.1:8876/experiments/represent-os-concept/`; set `BASE_URL` if using a different local address.

```powershell
python -m http.server 8876 --bind 127.0.0.1 --directory D:/ware/represent #
```

```powershell
node D:/ware/represent/experiments/represent-os-concept/browser-check.mjs #
```

The browser check covers desktop and mobile overflow, all workload switches, keyboard focus, reduced-motion preference, opening the research disclosure, and same-origin resolution of the research report, README, SVG and PNG poster links. It makes no network calls beyond the local server.
