# Visu browser shell

This is the local browser surface for Represent Visu. The selected overview art owns the page; region markers expose its evidence in a separate inspector, and the outline gives the same information a text-first route. The shell also exposes source snapshots, recorded changed paths, style selection, explicit scanning and image generation, and a JSON history export.

The implementation uses native browser modules and the local API only. Every API and art request carries the injected bearer token. Source excerpts are rendered as text, not HTML. Hover and keyboard focus preview a region; click opens its detail. On touch, click is the primary route. The inspector and outline work without the image. History compares recorded changed paths and says when a line diff is unavailable. Light, dark, and high-contrast monochrome themes persist in browser-local preferences and never change the project style or source snapshot.

The project actions are deliberately separate: **Capture snapshot** records a manual source state, **Explain snapshot** asks Ghost for the current state, intended design, and next steps with separate evidence, and **Create illustration** requests raster artwork. A pending explanation is labeled as potentially stale. Region navigation pins are hidden when chapter signatures show that saved art belongs to a different chapter. Older views can still show the legacy summary, status, and captured source excerpts.

`index.html` contains the `<!--VISU_CONFIG-->` injection marker for the server. `app.mjs` expects the local contract documented in the Visu implementation tracker. `style.css` provides the responsive shell and small retro, editorial, and neutral accent variants; it does not load remote fonts or assets. The art placeholder is an original CSS landscape used only before a project overview exists.

The region pins are approximate navigation targets from the scene data. They do not claim exact segmentation of a generated raster. A stale view remains visibly stale, and a failed generation leaves its saved art available. The shell reports service errors verbatim in a local toast and does not estimate generation price.
