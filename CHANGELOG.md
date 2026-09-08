# Changelog


## 0.3.0 — 2026-09-08

**A column ceiling, and one solver for every width.**

Neo's Z Fold (708x823 CSS) showed three columns in both orientations. Two causes: above 1024 the
solver fitted as many whole canonical columns as the width allowed (1104 / 368 = 3), and the md/lg
bands asked for fractional counts (1.2, 1.61) that were never a column count.

- New: `data-sqr-max-cols` on `<html>`, or `--sqr-max-cols`, caps how many canonical columns a
  screen may show. Default **2**. The attribute wins over the custom property.
- Once a screen can give each column at least 320 CSS px, the count is `round(width / column)`
  capped by the ceiling — 708 → 2 columns of 354, 823 → 2 of 411, 1104 → 2 of 552, 640 → 2 of 320.
- Below 640 nothing changes: one column, and the 0.2.0 phone peek untouched.
- The separate `>= 1024` whole-column branch is removed; `cols` is decided once and applied once,
  so the 1024 boundary is no longer a step in the design's size.
All notable changes to Square Root are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-08-28

### Added
- **Phone peek, as a class switch.** The `if (cols == 1)` block in
  `square-root.js` has carried a commented-out `ratio = ratio*0.89` and a note
  asking for a way to disable it since the first release. It is now implemented
  and switchable at runtime.

  **Off by default.** Turn it on with a class on `<html>`:

  ```html
  <html class="sqr-peek">                        <!-- peek on, factor 0.89 -->
  <html class="sqr-peek" data-sqr-peek="0.85">   <!-- peek on, factor 0.85 -->
  <html>                                         <!-- peek off — 0.1.x behaviour -->
  ```

  Flip it live, with no reload — this is the "easy back and forth switch" it was
  asked for. A `MutationObserver` on that one element re-solves when the class
  or the attribute changes:

  ```js
  document.documentElement.classList.toggle('sqr-peek');   // from the console
  document.documentElement.dataset.sqrPeek = '0.85';       // retune live
  window.squareRootResolve();                              // force a re-solve
  ```

  `window.squareRootResolve()` is a new export — the same solve `onresize` runs,
  except that a call arriving while a solve is in flight is retried after the
  re-entrancy guard releases instead of being dropped.

  **Scope.** The multiplication sits inside `if (cols == 1)`, so peek only ever
  affects the phone bracket (≤ 640 px, which includes the sub-320 watch range —
  it also has `cols == 1`). `md`, `lg` and `xl` never reach the line, and the
  class is inert there.

  **The factor.** Default `0.89`, Neo's original number. `data-sqr-peek` accepts
  any finite number, clamped to `0.5 … 1.0`; anything unparseable falls back to
  `0.89`. Factor `f` leaves roughly `1 − f` of the viewport showing the next
  card — at 0.89 that is ~11%, about 40 px on a 360 px phone.

### Changed — read this before turning peek on
- **With `sqr-peek` on, the canonical width deliberately no longer equals the
  viewport width.** This is the headline invariant of the framework, and the
  feature breaks it on purpose. `sqr-w-6` stops being full-bleed: it renders at
  ~89% of the screen, and every full-width element built on the canon inherits
  that. If your design has a full-bleed hero, a background band or a sticky
  footer that must touch both edges, peek will leave a gap beside it.

  What still holds, unchanged:
  - **Every ratio between units is preserved.** `sqr-w-3` is still half of
    `sqr-w-6`; the finger unit is still one sixth of the canon. Peek multiplies
    the one number every unit derives from, so it cannot move one utility
    relative to another. (Exactly, in the computed values — rendered boxes
    still carry the browser's usual 1/64 px layout rounding, as they do with
    peek off.)
  - **The design is uniformly scaled, not reflowed.** Peek moves one number —
    the root font-size — so the whole composition shrinks as one piece. Nothing
    re-wraps, nothing changes bucket, no breakpoint fires.
  - **Nothing changes off the phone bracket**, and nothing changes at all with
    the switch off.

  Measured on `examples/index.html`, headless Edge, 812 px viewport height,
  dpr 1, portrait. `sqr-w-6` is the six-finger canonical column:

  | Viewport | Root px OFF | `sqr-w-6` OFF | Root px ON | `sqr-w-6` ON | Margin left showing |
  |---|---|---|---|---|---|
  | 360 | 16.0000 | 360.00 px | 14.2400 | 320.39 px | 39.61 px (11.00%) |
  | 414 | 18.4000 | 414.00 px | 16.3760 | 368.45 px | 45.55 px (11.00%) |
  | 640 | 28.4444 | 640.00 px | 25.3156 | 569.59 px | 70.41 px (11.00%) |
  | 700 (`md`) | 25.9259 | 583.33 px | 25.9259 | 583.33 px | — class inert |
  | 900 (`lg`) | 24.8447 | 559.00 px | 24.8447 | 559.00 px | — class inert |
  | 1200 (`xl`) | 17.7778 | 400.00 px | 17.7778 | 400.00 px | — class inert |

  The OFF column is byte-identical to the same measurement taken before this
  change: `sqrPeekFactor()` returns exactly `1` when the class is absent, and
  `x * 1` is exact in IEEE-754.

- **Polarity is opt-in, not opt-out.** Neo's source note proposed the inverse —
  peek always on, a `.full-screen` class to disable it. Opt-in was chosen
  because this is a published package and opt-out would silently rescale every
  design already built against it. To switch to the original polarity, change
  the line marked `FLIP` in `sqrPeekFactor()`:

  ```js
  // opt-in (shipped):
  if (!el || !el.classList.contains(SQR_PEEK_CLASS)) return 1;
  // opt-out (Neo's original idea) — peek everywhere unless .full-screen says no:
  if (!el || el.classList.contains('full-screen')) return 1;
  ```

  That one line is the whole polarity. (`data-sqr-peek` keeps working either
  way, and the element stays `<html>`.)

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
