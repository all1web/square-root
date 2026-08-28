# Changelog

All notable changes to Square Root are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-08-28

### Fixed
- **`cols` is now applied exactly once on `md` and `lg`.** The solver divided the
  ratio by `cols` twice — once unconditionally, then again in the `else` branch
  of an `if (cols == 1)` whose body is entirely commented out. The effective
  divisor was `cols²`: 1.44 instead of 1.2 at `md`, and 2.5921 instead of 1.61
  at `lg`. The `else` branch was removed.

  This was listed as a possibly-intentional quirk in 0.1.0. Measurement settled
  it as a leftover:
  - At 1023 px the squared `lg` factor put **2.59** canonical columns on screen,
    while the desktop branch puts **2.0** on a 1024 px screen — one pixel wider
    and the design scaled *up*. Every other bucket boundary goes the other way.
  - At 768 px the root solved to **13.168 px**, smaller than the **14.222 px** a
    320 px watch gets.
  - The factors themselves are `767/640 = 1.198 ≈ 1.2` and
    `1023/640 = 1.598 ≈ 1.61` — each bucket's top width over the `sm` bucket's
    top width. That makes the buckets tile continuously at a ~28.4 px root, a
    property that holds only under a single division. The factors were tuned
    *for* one division, so no re-tuning was needed.

### Migration — read this if you ship a tablet layout

`md` (641–767) and `lg` (768–1023) now scale **larger** than on 0.1.x. Root
font-size at 812 px viewport height, dpr 1, portrait, measured in headless Edge:

| Viewport | 0.1.x | 0.2.0 | Change |
|---|---|---|---|
| 320 | 14.222 | 14.222 | — |
| 360 | 16.000 | 16.000 | — |
| 640 | 28.444 | 28.444 | — |
| 641 | 19.784 | 23.741 | +20% |
| 700 | 21.605 | 25.926 | +20% |
| 767 | 23.673 | 28.407 | +20% |
| 768 | 13.168 | 21.201 | +61% |
| 900 | 15.431 | 24.845 | +61% |
| 1023 | 17.541 | 28.240 | +61% |
| 1024 | 22.756 | 22.756 | — |
| 1080 | 16.000 | 16.000 | — |

**Phones (`sm`, ≤ 640) and desktop (`xl`, ≥ 1024) are unchanged** — if you only
target phones, this release is a no-op for you.

If a tablet design was eyeballed against 0.1.x it will now show roughly 1.6
canonical columns where it used to show 2.6. That is the documented intent of
the `cols` factor, but it is a visible change. To keep the old rendering,
pin `0.1.0` — or set `cols` to `1.44` at `md` and `2.5921` at `lg`, which
reproduces 0.1.x exactly under the corrected single division.

### Still open
- `window.onload = simulateScreen();` still invokes immediately rather than
  binding a handler. Unchanged in this release; `onresize` and the orientation
  listener still fire.

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
  *(Fixed in 0.2.0.)*
- `window.onload = simulateScreen();` invokes immediately rather than binding a
  handler; `onresize` and the orientation listener still fire.

These are documented rather than silently fixed so that existing projects
depending on the current scale behaviour are not surprised by an upgrade.
