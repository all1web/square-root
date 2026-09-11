# Changelog

## 0.8.0 — 2026-09-10

**Device tiers: how many columns a screen gets can come from its pixels, not just its shape.**

Neo, 2026-09-10, reading his own Debug tab on a Fold split: *"well I think considering device pixels
is > 1600x1900 approx and the scale is close to 2. its a screen that doesn't need the small mobile
screen. now I don't think this should be the default for square root but in this website 1 col is for
mobile small screens and 2 col is for screens like this, once we narrow this down I'm gonna make ipad
and tablets 3 cols probably."*

The screen he was looking at was 637 × 727 CSS at DPR 2.625 — aspect 1.14, genuinely portrait,
nowhere near `data-sqr-short`'s 1.2 trigger, so 0.7.0 correctly never touched it — and 1672 × 1908
real pixels carrying **one** 637px column at 1.77× the canon. That is a different axis from anything
this package measured before: not the window's shape, its raw pixel budget.

- New: **`data-sqr-device-cols`** / `--sqr-device-cols`, `tiers` or `off`, **off by default** — his
  own call: *"I don't think this should be the default for square root but in this website"*. With it
  off the 0.7.0 solve is untouched, byte for byte, and the two proofs are the ones 0.6.0 and 0.7.0
  each make: by construction every read, the promotion and the publish sit behind one guard; and what
  it costs is one `sqrDeviceCols()` call, a `getComputedStyle` on already-clean style, no forced
  layout and no DOM write.
- New: **`data-sqr-device-tiers`** / `--sqr-device-tiers`, a table of tiers, four numbers a row, rows
  comma-separated: `cols minShortPx minLongPx minScale`. The highest qualifying tier wins; a tier can
  only ADD columns, never remove one, and never out-rank `data-sqr-max-cols` — a row asking for more
  columns than the ceiling allows is dropped, not clamped to it.
- **Both signals must agree.** The viewport's device-pixel rectangle — sorted, so the answer does not
  flip on rotation — must be at least `minShortPx × minLongPx`, **and** the scale the earlier passes
  already solved must have reached `minScale`. Either alone false-positives: a 411 × 960 phone at DPR
  4 has 1644 pixels across (its scale is 1.14), and a 500px slice of the same Fold is still at 1.39
  (its short edge is 1313). Both are refused.
- **The threshold is a finger in disguise, and that is how to choose it.** A 1 → 2 promotion halves
  the scale, so the finger it leaves is exactly `30 × minScale` px; a 2 → 3 promotion leaves
  `40 × minScale`. 1.75 keeps 52.5px — the same finger 0.7.0 already ships on his landscape split.
  1.5 keeps exactly the researched 45px floor. Below that the package is handing back a finger it
  calls too small.
- **The decision is made inside the solver, before the ratio divides, and it has to be.** Stamping
  `data-sqr-cols` from the host page would move the stylesheet and leave the scale solved for one
  column — two columns at the single-column size, a canvas twice the viewport. The pass sits after
  the bands, the ceiling and the short-screen pass, and `ratio = ratio/cols` still divides **once**,
  against the final count.
- The seam publishes a promotion even with `data-sqr-short="off"`, for the same reason.
- **A malformed row is skipped, never guessed at** — a wrong field count, a non-number, or a
  non-positive threshold drops that row and leaves the rest of the table working. A row's `cols`
  field must also clear `2` and never exceed `data-sqr-max-cols`, or it is skipped the same way.
- **No new CSS.** It reuses the `html[data-sqr-cols="N"]` rules 0.7.0 added; `square-root.scss`,
  `dist/` and `plugin.cjs` are unchanged.
- Live-togglable: the observer watches the two new attributes alongside the peek, fit and short ones,
  same signature short-circuit. The custom properties stay the server-rendered channel.
- **Measured**: across 105,696 (width × height × DPR) combinations with the switch on, not one
  viewport the pass declines moves a digit of `cols`, `data-sqr-cols` or the solved ratio. With ALL1's
  own row the promoted set is exactly `width 630–639 CSS px` on a dense enough screen — the last ten
  pixels below the 640 cliff where the 0.3.0 ceiling already gives two columns. Small on purpose.
- Scaffolded, not populated: a third tier (*"once we narrow this down I'm gonna make ipad and tablets
  3 cols probably."*) is one more row plus a raised ceiling. His numbers, when he names them.
- Unchanged: the bands, the ceiling, the peek, the fit switch, the short-screen pass, the landscape
  media query and its bounds, every constant in `docs/DESIGN-RATIONALE.md`, and both known quirks.

## 0.7.0 — 2026-09-10

**Short screens: the column count comes from the finger and the aspect, and the stylesheet finally
hears it.**

Neo, 2026-09-10: *"because I have it open in split view on the big fold screen and as I make the
divider in between the split go further to one side … the ratio of the width to height it too close
to a square and it looks not good the whole hero is covered … on this zfold build screen split like
that it is high resolution and big enough where the 2 column would be much better and the 1 unit to
still be closer to a finger unit if a column added. I think perhaps the algorithm can based on what
the size of a finger units ratio devided by the 60px its minimum supposed to be in relation to the
ratio of the height to width."*

Measuring his three splits first changed what this release is. At 637 × 320 CSS the solver had
**already** given him what he asked for — the landscape query rotates the probe to 720 × 360, so two
macro columns are on screen and the finger is 53.08px. What had not happened was the layout: the
N-column rules are gated on `@media (min-width: N × 320px)` in raw pixels, and 637 is three short of
640. The same screen at DPR 2.6 is 643 wide and splits. **Three pixels of device-pixel-ratio decided
the layout while the solved answer moved 0.94 %.** So this release is a seam before it is a rule.

- New: **`data-sqr-cols`** on `<html>`, written by the solver on every solve — the macro-column count
  it actually solved, `cols × (probe ÷ --macro-width)`, floor-gated against the raw-pixel media gate
  and the viewport's own finger (see "Patched before ship" below), then clamped by the ceiling.
  `square-root.scss` emits every N-column rule twice now, once under the media gate and once under
  `html[data-sqr-cols="N"]`, from **one mixin**. The media gate stays as the no-JS fallback. The
  attribute is an output: it is deliberately **not** in the `MutationObserver`'s `attributeFilter`,
  so publishing an answer can never schedule the next solve.
- New: **`data-sqr-short`** / `--sqr-short`, `cols` or `off`, **`cols` by default** (the owner's call,
  2026-09-10; `off` restores the 0.6.0 solve to the digit). When on, after
  the ceiling has spoken: while a column is wider than `data-sqr-short-aspect` (**1.2**) times the
  viewport height, add a column as long as the next finger still clears
  `f + (1 − f) × min(1, height/width)` of a canonical finger, `f` = `data-sqr-short-floor`
  (**0.6**). A square screen demands a whole finger; a 2:1 screen 0.8 of one; a 3:1 screen 0.73.
- **Inside the pass the finger floor replaces the fixed 320px column floor.** That is the whole
  point: a 900 × 350 board with a ceiling of 4 goes to three columns of 300px at a 50px finger,
  where 0.3.0 stopped at two of 450. Nothing below the pass changes — the `≥ 2 × 320` gate, the
  bands, the peek and the ceiling are untouched.
- The finger is measured **through the probe**, `width / (probe × n)` — which is exactly the ratio
  this solver would write for `n` columns. Same reason 0.6.0 measures `simulatedHeight` through it:
  the SCSS landscape swap composes for free, and an overridden canon (INTEGRATION §5) answers for
  itself. One custom property is read, `--macro-width`, inside the switch only.
- **Off by default, and byte-identical twice over**, the same two proofs as the fit switch: by
  construction the height read, the pass and the attribute write all sit behind one guard; and the
  removal branch is `hasAttribute`-guarded, so the default path performs no DOM write either. What
  it costs is one `sqrShort()` call — with the attribute absent, a single `getComputedStyle`, a
  style read on already-clean style, no forced layout.
- **At the default ceiling of 2 the pass provably never fires** (the arithmetic is in
  `docs/DESIGN-RATIONALE.md`): every root font-size a 2-column page solves is unchanged, and the
  entire behaviour change is the stylesheet catching up. `data-sqr-cols` can only add columns, never
  remove them.
- Live-togglable: the observer watches the three `data-sqr-short*` attributes alongside the peek and
  the fit attributes, with the same signature short-circuit. As always, the custom properties are
  the server-rendered channel and are not observed — call `window.squareRootResolve()` after
  changing one.
- **Patched before ship** (Opus subagent design review, 2026-09-10): the first draft measured the
  probe's rotation off `.sqr-macro-rem` ÷ the unitless `--macro-width`, which only resolves to a
  clean 1 or 2 when the browser's default font-size is exactly 16px — a 24px default (Android's own
  "Very large" text size) published a two-column, 750px-wide deck on a 375px-wide portrait phone.
  Fixed to measure `.sqr-macro-pixel` instead, a `px`-based probe immune to the default. The naive
  `cols × macroCols` product also published `data-sqr-cols="2"` for every landscape viewport
  361–639px wide regardless of its OWN aspect — a 361 × 360 window got two 180px columns of a 30px
  finger, and a 2px height change (366 × 365 → 366 × 367) flipped the count and doubled the finger.
  Fixed with a floor: the seam's answer publishes only where the viewport's own finger — or the
  raw-pixel media gate — already supports it. `window.onresize` now points at `squareRootResolve()`
  (the retrying entry point) rather than `simulateScreen()` directly, so a resize landing mid-solve
  is queued instead of silently dropped — before 0.7.0 a dropped resize only cost scale, and after it
  an unlucky drop could strand a two-column layout on a portrait phone. And the phone peek
  (`sqr-peek`) is now gated on the **published** column count as well as the solved one, so it no
  longer shrinks a screen the seam has already split in two.
- The Tailwind plugin mirrors the new block, and `npm run verify:plugin` proves it. This release
  also brings the plugin back into parity with the 0.6.0 deck gutters (`minmax(0, 1fr)`,
  `column-gap: 0`, the 0.25u `padding-inline`), which the 0.6.0 entry changed in the SCSS only.
- Unchanged: the bands, the ceiling, the peek, the fit switch, the landscape media query and its
  bounds, every constant in `docs/DESIGN-RATIONALE.md`, and both known quirks.

## 0.6.0 — 2026-09-09

**The height, as an option: `data-sqr-fit`.**

Neo, 2026-09-09: *"I'm wondering if it needs to put height into perspective too… square screens or
worst landscape screens"*, and *"kinda want a switch to be able to do your recommended full
contain-fit or handle in css. Cause I already had a solution started with both."* Both halves were
already in the repo — the landscape media query in the SCSS, shipped; the `simulatedHeight` block in
the solver, commented out and unfinished. This is the switch between them. The JS half is completed
in place, under his own notes.

- New: `data-sqr-fit` on `<html>`, or `--sqr-fit` on `:root`, with three modes. **`css` is the
  default and is the 0.5.0 solve to the digit** — the whole height block sits behind a guard, so in
  the default mode not one statement of it runs, not even the `offsetHeight` read.
- `contain` fits the canonical device in **both** axes:
  `ratio = min(ratioW, viewportHeight / probeHeight)`, where the viewport height is
  `document.documentElement.clientHeight` — the conservative reading of the two available, since it
  excludes a classic horizontal scrollbar and this framework's boards are horizontal scrollers.
- `stack` fits a budget of finger units of height instead — `data-sqr-stack` / `--sqr-stack`,
  default **9** of the canon's 12 — clamped at the canon's own height so a rotated phone is never
  asked for more height than the rotated canon has.
- New: `data-sqr-fit-floor` / `--sqr-fit-floor`, default **0.7**, clamped 0–1. The height solve may
  never take the scale below `0.7 ×` the width solve. `0` disables it; `1` disables the height modes.
- The height is **measured from the same probe, in the same reflow, as the width**, so the SCSS
  landscape swap composes for free: where the media query has rotated the canon, the probe reports
  360 tall rather than 720 and the JS never has to know the query exists. The rotation is detected
  from the probe's measured aspect, not from `width > height` — those are different questions, and
  an 812 × 375 phone is the case where they disagree.
- The three modes are ordered at every viewport: `css` ≥ `stack` ≥ `contain`.
- Live-togglable. The 0.2.0 `MutationObserver` now watches the three new attributes alongside
  `class` and `data-sqr-peek`, comparing a signature string with the same early return so unrelated
  writes to `<html>` still cost nothing. As with `--sqr-max-cols`, the custom properties are the
  server-rendered channel and are not observed — call `window.squareRootResolve()` after changing one.
- **What a height mode costs**, stated in the README and HOW-IT-WORKS §7.2 rather than buried: with
  one on, the canon no longer spans the viewport width — the same invariant the peek breaks, but by
  an amount the screen's aspect decides rather than one you chose; and a height-only resize now
  rescales the page, which on mobile means the collapsing URL bar. Use a height mode on a board that
  owns the viewport, not on a long scrolling document.
- `stack` is the only mode that reads the canon variables — three of them, `--macro-width`,
  `--macro-height` and `--micro-width`, inside its own branch. That is what makes an overridden canon
  (INTEGRATION §5) work in `stack` mode instead of silently assuming 12 units. `--micro-width` and
  not `--micro-height`, because `--micro-width` is the unit every `-sqr-h-*` class counts.
- The demo (`examples/index.html`) gets a fit toggle beside Board 2's mode buttons and a readout of
  `fit`, `stack`, `floor`, the probe, `cols`, `ratioW`, `ratioH` and the solved ratio, with a check
  mark when its mirror of the arithmetic agrees with the measured root font-size.
- Unchanged: `square-root.scss` (including the landscape query and its bounds), the Tailwind plugin,
  the buckets, the `cols` rule, every constant in `docs/DESIGN-RATIONALE.md`, and both known quirks.

## 0.5.0 — 2026-09-09

**The Tailwind plugin.**

Square Root now ships as a Tailwind CSS plugin (`plugin.cjs`, exported as
`@all1web/square-root/tailwind`) targeting v3.3+ (`plugins: [require(...)]`)
and v4 (`@plugin`). The SCSS remains the source of truth; the plugin mirrors
its class surface exactly and `npm run verify:plugin` proves it — a parity
check that compiles the plugin through Tailwind and compares every selector
and declaration against `dist/square-root.css` (129 rules, zero drift
tolerated; benign differences like vendor prefixes and calc factor order are
normalized, real ones fail the build).

- What Tailwind adds on top of the static CSS: JIT **arbitrary values**
  (`sqr-w-[1/2]`, `sqr-mt-[1.75]`) — the fractions that don't exist as static
  classes; IntelliSense autocomplete; purging of unused utilities.
- What the plugin deliberately does not emit: the scroll-snap layer (link
  `dist/scrollsnap.css`) and the `2xs:`/`xs:` prefixed classes, whose names
  collide with Tailwind's variant syntax — use Tailwind's own variants.
- Known quirks are mirrored, not fixed: `-sqr-h-screen-5` subtracts 4 units in
  the plugin too, matching the SCSS. Fix both or neither.
- The solver (`src/square-root.js`) is unchanged and still required — the
  plugin replaces the stylesheet, never the runtime.
- Packaging: `tailwindcss >=3.3.0` as an *optional* peerDependency; the
  package stays dependency-free at runtime.

## 0.4.0 — 2026-09-08

**Spanning: one section across N macro columns.**

Built for the dark Report page's Fold layout (docs/plans/dark-report-page-build.md §3,
products repo). A card deck that lives in one `sqr-w-6` section on a phone can now widen
across 2-4 canonical columns once the viewport actually has room for them, in either of
two layout modes, with zero DOM reordering.

- New: `.sqr-wide-{2,3,4}` — the SECTION's own width. Below the derived gate (`N * 320px`,
  the package's own `SQR_MIN_COL_PX`, written in rem against the *initial* 16px root so it
  never drifts with the solved canon) it is byte-identical to `.sqr-w-6`; above the gate it
  is `N` macro columns wide.
- New: `.sqr-span-{2,3,4}` + `html.sqr-mode-rows` — **Mode A, aligned rows.** The direct
  children become a CSS grid, `repeat(N, 1fr)`, `grid-auto-flow: row`; cards alternate
  left/right/… in document order and the rows line up. A child marked `.sqr-row` spans the
  full width (`grid-column: 1 / -1`); `.sqr-left` / `.sqr-right` pin an individual card.
- New: `.sqr-flow-{2,3,4}` + `html.sqr-mode-flow` — **Mode B, masonry fill.** `column-count:
  N` with `column-fill: balance`; cards fill the left column then the right, no gaps. No
  JS masonry — native grid masonry is not shipped on Android Chrome, and a JS masonry
  breaks Livewire morphs and scroll snap. `.sqr-row` spans all columns (`column-span: all`).
  The container is set to `display: block` for the same reason Mode A sets `display: grid`:
  multi-column is only honoured on a block container, so a deck the host made a flex row
  on the phone still splits above the gate.
- The mode is a class on `<html>` the host sets (a store, not part of this package) — no
  mode class means flow's grid/column rules simply do not apply and layout stays block.
- **The ceiling wins.** `:root[data-sqr-max-cols="1"]` (0.3.0) forces every `sqr-wide-*` back
  to one macro column and every `sqr-span-*` / `sqr-flow-*` back to `display:block` — a page
  that declares one column never spans, regardless of viewport width.
- New: a spanning deck is **transparent to the vertical snap rule**.
  `.scrollsnap-vertical > [class*="sqr-span-"] > .snap-y` (and `sqr-flow-`) re-applies the
  `scroll-snap-align: start; scroll-snap-stop: always` that `_scrollsnap.scss` gives a direct
  `.snap-y` child. It is needed because the layout class can never sit on the scrolling
  column itself — a multi-column box with a definite block-size fragments sideways instead
  of balancing — so a page whose cards are siblings in that column has to wrap them one
  element deep, and would otherwise lose every card's snap point. Outside the gate, since
  the wrapper is in the DOM on the phone too.
- Emitted after the unit `@for` loop, so `.sqr-wide-#{$n}` beats `.sqr-w-6` on source order
  alone — no `!important` anywhere in this feature.

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
