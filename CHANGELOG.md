# Changelog

All notable changes to Square Root are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-08-27

First public release. Extracted from the ALL1.AI product template, where the
framework has been running in production.

### Included
- The canonical-device scaler (`src/square-root.js`) — solves the root
  font-size so a 360×720 design fits any viewport exactly.
- The unit system (`src/square-root.scss`) — macro/micro custom properties and
  the generated `sqr-*` utility classes.
- The scroll-snap layer (`src/_scrollsnap.scss`) — horizontal column snapping,
  vertical card snapping, and the invisible-scrollbar helper.
- Full documentation in `docs/`, including the research behind every constant.

### Known quirks carried over from the original (documented, not yet changed)
- For screens where `cols !== 1`, the ratio is divided by `cols` twice.
- `window.onload = simulateScreen();` invokes immediately rather than binding a
  handler; `onresize` and the orientation listener still fire.

These are documented rather than silently fixed so that existing projects
depending on the current scale behaviour are not surprised by an upgrade.
