# Square Root

**Invented by [Neo Nosrati](https://neonos.net).**

A mobile-first CSS + JS layout framework — one design, scaled to fit every phone
exactly, without breakpoints.

![Square Root — solve every screen](https://github.com/all1web/plugin-assets/raw/main/square-root/hero.png)

Phones do not agree on anything. A 320px Android, a 375px iPhone SE, a 430px Pro Max and a folded foldable all have different widths, different heights and different aspect ratios. So a screen you designed to look right on one of them looks cramped on the next and empty on the one after that. The usual answer is breakpoints: redraw the design two or three times and hope the in-between sizes behave. Square Root takes the other route. You design once, for one imaginary phone, and Square Root rescales that single design so it fits every real phone exactly — same proportions, same rhythm, same number of things above the fold. Nothing reflows, nothing jumps to a new breakpoint. The whole page just gets bigger or smaller as one piece.

---

## The idea in 30 seconds

**1. There is a canonical device.** Square Root declares one reference phone, 360 × 720 CSS px, in `:root`:

```css
:root {
  --macro-width: 360;
  --macro-height: 720;

  /* Average finger 45-52 / thumb: 72px */
  --micro-width: 60;
  --micro-height: 60;
}
```

`--macro-*` is the device. `--micro-*` is the **finger unit** — 60px, picked from touch-target research (an average fingertip lands around 45–52px, a thumb around 72px). Every layout decision you make is in whole or half fingers, not in pixels.

**2. Every utility is authored in rem against that canon.** All the size utilities look like this:

```css
.sqr-w-2 { width: calc(var(--micro-width) * 2 * 0.0625rem); }
```

`0.0625rem` is `1/16rem`, so the numbers in those variables read as **reference pixels at a 16px root**: `60 * 2 * 0.0625rem` = `7.5rem` = 120px when the root font-size is the browser default of 16px. The entire framework — widths, heights, margins, padding, offsets — is rem. There is not a hard pixel in the layout.

**3. `square-root.js` then solves for the root font-size** so the canon lands exactly on the real viewport:

- It resets `:root { font-size: 100% }` through a `<style id="square-root">` tag the host page provides.
- It measures the live `offsetWidth` of an invisible probe, `.sqr-macro-rem`, which is `calc(var(--macro-width) * 0.0625rem)` = **22.5rem** — 360px at a 16px root.
- It computes `ratio = window.innerWidth / measuredProbeWidth` and writes `:root { font-size: (ratio * 100)% }` back into that same style tag.

Because the design is 100% rem, changing the root font-size scales *everything* in lockstep. The 360-wide canon spans exactly the viewport width on every device.

### Worked example

The probe measures 360px while the root is at 100% (16px). Two phones:

| | 320px phone | 430px phone |
|---|---|---|
| `ratio = innerWidth / 360` | `320 / 360 = 0.8889` | `430 / 360 = 1.1944` |
| written root font-size | `88.89%` → 14.22px | `119.44%` → 19.11px |
| probe re-measures at | `22.5rem × 14.22 = 320px` | `22.5rem × 19.11 = 430px` |
| a `.sqr-w-2` box (7.5rem) | `106.7px` — 33.3% of screen | `143.3px` — 33.3% of screen |

Same fraction of the screen on both. That is the whole trick.

> The buckets above 640px behave differently on purpose — see [Tablets and desktop](#behaviour-on-tablets-and-desktop). And if you opt into the [phone peek switch](#the-phone-peek-switch-sqr-peek), the canon deliberately spans 89% of the viewport rather than all of it.

---

## Built hand in hand with Tailwind

This is by design, not coincidence, and it is the reason Tailwind was chosen over Bootstrap (whose
scale had to be stripped out first). **Tailwind's default spacing, type and radius scales are rem.
Square Root's unit is rem. The solver moves only the root font-size and never `--micro-width`.** So
every rem-based Tailwind utility is *already* a finger unit — the same number on every device:

```
1u = var(--micro-width) × 0.0625rem = 60 × 0.0625rem = 3.75rem
any rem value  →  finger units = rem ÷ 3.75
```

| Tailwind class | value | finger units | at the 360 canon |
|---|---|---|---|
| `p-1` / `m-1` / `gap-1` | `0.25rem` | `0.06667u` | 4px |
| `p-2` | `0.5rem` | `0.13333u` | 8px |
| `p-3` · `text-xs` · `rounded-xl` | `0.75rem` | `0.20000u` | 12px |
| `p-4` · `text-base` · `rounded-2xl` | `1rem` | `0.26667u` | 16px |
| `text-sm` | `0.875rem` | `0.23333u` | 14px |
| `w-8` / `h-8` | `2rem` | `0.53333u` | 32px |
| `w-11` / `h-11` | `2.75rem` | `0.73333u` | 44px |
| `w-16` · `pb-16` | `4rem` | `1.06667u` | 64px |
| `sqr-w-1` | `3.75rem` | `1u` | 60px |

`p-3` and `.sqr-w-1/5` are the same ruler; you can mix them freely, and a layout authored in
Tailwind classes scales exactly as one authored in `sqr-*` classes. When a house rule asks for every
length to be *written* as a finger unit, the conversion is the exact fraction above — never a
rounded table (`0.19u` for `0.75rem` is a 5 % error that compounds down a column).

**What is not on the ruler** (these do not scale with the root):

| | example | rule |
|---|---|---|
| px utilities | `border-2`, `ring-2`, `w-px`, `shadow-*` offsets | keep 1px hairlines; convert the rest to `sqr-*` or `calc()` |
| arbitrary px values | `text-[11px]`, `w-[30px]`, inline `top: 30px` | convert: `N = px ÷ 60` at the canon |
| breakpoints | `md:` = `@media (min-width: 768px)` | leave — media queries read the initial root on purpose; the column count is `data-sqr-max-cols` |
| `rounded-full` | `9999px` | a shape, not a length — leave |

**Or let Tailwind emit the framework itself.** Square Root ships as a Tailwind plugin — the same
classes, generated by Tailwind instead of linked as a stylesheet, which adds JIT arbitrary values
(`sqr-w-[1/2]`, `sqr-mt-[1.75]` — the fractions the static CSS doesn't have), IntelliSense
autocomplete and purging:

```js
// tailwind.config.js (v3)
plugins: [require('@all1web/square-root/tailwind')]
```

```css
/* app.css (v4) */
@plugin "@all1web/square-root/tailwind";
```

The plugin covers everything except the scroll-snap layer (link `dist/scrollsnap.css` for that) and
the `2xs:`/`xs:` prefixed classes, whose names collide with Tailwind's variant syntax — use
Tailwind's own variants instead (`max-[320px]:hidden`, `min-[321px]:sqr-mx-[1/4]`). The solver JS is
runtime, not build-time: it is still required, exactly as in Quick start. `npm run verify:plugin`
proves the plugin and the SCSS emit the same framework.

More in [INTEGRATION.md §7](docs/INTEGRATION.md#7-running-tailwind-css-alongside-square-root).

---

## Install

**As a dependency**

```bash
npm install @all1web/square-root
```

```bash
npm install github:all1web/square-root
```

**Or copy the files.** Square Root is two build outputs and one script — no bundler required.

```bash
git clone https://github.com/all1web/square-root.git
cp square-root/dist/square-root.css   your-project/assets/css/
cp square-root/src/square-root.js     your-project/assets/js/
```

If you compile SCSS yourself, import the source instead and you inherit the `:root` variables and the `@for` loops:

```scss
@import "node_modules/@all1web/square-root/src/square-root";
```

`src/square-root.scss` already `@import "_scrollsnap"`, so you get the snap classes too.

---

## Quick start

The JS is not optional and it is not standalone — it needs a style tag to write into and two probe elements to measure. Here is the complete minimal host page:

```html
<!doctype html>
<!-- add class="sqr-peek" to turn on the phone peek — off by default, see below -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Square Root</title>

  <!-- 1. square-root.js writes the solved :root font-size in here.
          It must exist before the script runs, and must stay empty. -->
  <style id="square-root"></style>

  <!-- 2. the compiled framework CSS -->
  <link rel="stylesheet" href="/assets/css/square-root.css">

  <!-- 3. only needed if you are NOT already using Tailwind,
          which supplies .fixed and .invisible -->
  <style>
    .fixed     { position: fixed; }
    .invisible { visibility: hidden; }
  </style>
</head>
<body>

  <!-- 4. the two probes. They must be in the DOM, must be laid out
          (visibility:hidden, never display:none), and must not be
          inside a container that could constrain their width. -->
  <div class="fixed invisible sqr-macro-pixel"></div>
  <div class="fixed invisible sqr-macro-rem"></div>

  <!-- your page -->
  <main class="sqr-px-1 sqr-mt-1">
    <div class="sqr-w-4 sqr-h-2">a 4-finger by 2-finger card</div>
  </main>

  <!-- 5. the script, LAST — it calls simulateScreen() immediately on parse,
          so #square-root and .sqr-macro-rem have to already exist. -->
  <script src="/assets/js/square-root.js"></script>
</body>
</html>
```

Things that will bite you if you skip them:

- **`.invisible` must be `visibility: hidden`, not `display: none`.** A `display:none` probe has `offsetWidth === 0`, which makes `ratio` `Infinity` and the page collapses.
- **`.fixed` matters.** The probe is measured with `offsetWidth`, so a narrow parent would shrink it and you would solve for the wrong number.
- **`<style id="square-root">` must be present and must be the only thing setting `:root { font-size }`.** The script overwrites its contents wholesale, twice per run.
- **The script measures on a `setTimeout(…, 500)`** after resetting the root to 100%, to let the browser re-lay-out the probe. So there is a ~half-second at first paint where the page renders at the unscaled canon before it snaps to size. Hiding the body until the first solve completes is a reasonable thing to do in your own code.
- `.sqr-macro-pixel` (the hard-pixel 360 × 720 twin of the probe) is queried by the script and is expected to be present, even though the current measurement path uses `.sqr-macro-rem`. Keep both in the markup.

Open the console — each solve logs the screen bucket and the before/after probe width.

---

## Using the units

Think in fingers. `1` = one `--micro-width` = 60 reference px = `3.75rem`. The generated scales run **1 through 8**.

| Class | Resolves to | At the canonical root |
|---|---|---|
| `.sqr-w-N` | `width: calc(var(--micro-width) * N * 0.0625rem)` | N × 60px |
| `.sqr-h-N` | `height: calc(var(--micro-width) * N * 0.0625rem)` | N × 60px |
| `.sqr-mt-N` | `margin-top` of N fingers | N × 60px |
| `.sqr-mx-N` / `.sqr-mr-N` | horizontal / right margin of N fingers | N × 60px |
| `.sqr-px-N` / `.sqr-pl-N` / `.sqr-pt-N` | padding of N fingers | N × 60px |
| `.-sqr-l-N` / `.-sqr-r-N` | negative `left` / `right` offset of N fingers | −N × 60px |
| `.sqr-h-1\/2` | `height: calc(var(--micro-width) * 0.5 * 0.0625rem)` | 30px |
| `.sqr-mr-1\/2` | half-finger right margin | 30px |
| `.-sqr-ml-1\/2` | half-finger negative left margin, **`:first-child` only** | −30px |
| `.sqr-pl-1-3\/4` | `padding-left` of 1.75 fingers | 105px |
| `.sqr-t-1` | `top: calc(var(--micro-width) * 1 * 0.0625rem)` | 60px |
| `.-sqr-h-screen-N` | `height: calc(100vh - (var(--micro-width) * N * 0.0625rem))` | full height minus N fingers |
| `.sqr-macro-rem` | `22.5rem × 45rem` — the canonical device, in rem | 360 × 720px |
| `.sqr-macro-pixel` | `360px × 720px` — the canonical device, in hard pixels | 360 × 720px |
| `.sqr-micro-rem` | `3.75rem × 3.75rem` — one finger, in rem | 60 × 60px |
| `.sqr-micro-pixel` | `60px × 60px` — one finger, in hard pixels | 60 × 60px |
| `.text-2xs` | `font-size: 0.65rem` | 10.4px |

Use `-sqr-h-screen-N` for a scroll pane that sits under a fixed N-finger header. Use `sqr-macro-*` when you want an element that *is* the canonical viewport — a full-page card in a horizontal scroller, for example.

Two responsive helpers ship as well: `.2xs:hidden` / `.2xs:block` fire at `max-width: 320px` (watches), and `.xs:sqr-my-1\/2` / `.xs:sqr-mx-1\/4` fire at `min-width: 321px`. Escape the class names in HTML as `2xs:hidden` and `xs:sqr-mx-1/4` — the backslashes are only there in the CSS.

A landscape rule at `(orientation: landscape) and (min-width: 361px) and (max-width: 768px)` swaps the canon to **720 × 360** for the four `sqr-macro-*` / `sqr-micro-*` classes, so the probe measures a rotated device and the JS solves against the long edge. The generated `sqr-w-N` / `sqr-h-N` scales are not swapped — they read `--micro-width` on both axes, which is harmless while `--micro-width` and `--micro-height` are both 60.

---

## Spanning: one section across N macro columns

*New in 0.4.0.* A card deck that is one `sqr-w-6` column on a phone can widen to 2–4
canonical columns once the viewport actually has room for them — no breakpoint you author,
no DOM reorder, no JS masonry.

**The width, and the derived gate.** `.sqr-wide-2` / `.sqr-wide-3` / `.sqr-wide-4` put on a
section: below the gate the section is exactly `.sqr-w-6` (one macro column); above it, `N`
macro columns wide. The gate is derived from the package's own floor for what counts as a
column — `SQR_MIN_COL_PX` (320, `square-root.js`) — so `N` columns need `N * 320px` of
viewport, written as `N * 20rem` (`320 / 16`). That `rem` is deliberately measured against
the browser's un-solved 16px initial root, not the canon's own solved font-size: a media
query re-evaluates against the *initial* value, so the gate stays put while `square-root.js`
rescales everything else.

```html
<section class="sqr-w-6 sqr-wide-2">
  <div class="sqr-span-2">          <!-- or sqr-flow-2 — see the two modes below -->
    <div class="card">1</div>
    <div class="card">2</div>
    <div class="card">3</div>
  </div>
</section>
```

The width class goes on the section itself; the layout class (`sqr-span-N` / `sqr-flow-N`)
goes on whichever element's **direct children are the cards** — those are not always the
same element (an `absolute`-positioned bar between them, for instance, is neither).

**Never put the layout class on a scrolling column.** If the cards are siblings inside a
`.scrollsnap-vertical` column, wrap them in one deck element and put `sqr-span-N` /
`sqr-flow-N` on *that*. A multi-column box with a definite block-size (and that column is
`height: 100vh`) does not balance into N columns — it fragments into height-bound columns
that run off sideways, usually straight into the column's own `overflow-x: hidden`. The
wrapper costs nothing: spanning ships a rule that keeps
`.scrollsnap-vertical > [class*="sqr-span-"] > .snap-y` snapping, so the cards keep the
snap positions the direct-child rule used to give them.

**Two modes, chosen by a class on `<html>`** — this package does not pick one for you:

- **`html.sqr-mode-rows` + `.sqr-span-N`** — **aligned rows.** The container becomes a CSS
  grid, `repeat(N, 1fr)`, `grid-auto-flow: row`. Cards alternate across the row in document
  order (card 1 left, card 2 right, card 3 starts the next row) — nothing is reordered, the
  DOM is untouched, only the *painted* position changes. A child marked `.sqr-row` spans the
  full width (`grid-column: 1 / -1`) — a section header inside the deck, say. `.sqr-left` /
  `.sqr-right` pin one specific card to a column if you need to override the alternation.
- **`html.sqr-mode-flow` + `.sqr-flow-N`** — **masonry fill.** `column-count: N` with
  `column-fill: balance`; cards fill the left column top to bottom, then the right, so
  uneven card heights never leave a gap the way aligned rows can. **No JS, ever** — native
  grid masonry is not shipped on Android Chrome, so CSS multi-column IS the masonry, and a
  JS-driven masonry is exactly the kind of DOM surgery that breaks a Livewire morph or a
  scroll-snap container mid-scroll. `.sqr-row` spans every column (`column-span: all`).
  Each mode states the `display` it needs — `grid` for rows, `block` for flow — because
  multi-column is only honoured on a block container.

With no `sqr-mode-rows` / `sqr-mode-flow` class on `<html>` at all, neither rule matches and
the deck stays block — pick a default, and remember it is a plain class toggle:

```js
document.documentElement.classList.add('sqr-mode-flow');   // or 'sqr-mode-rows'
```

**One trap.** Never set `display` (or `column-count`) in a `style="…"` attribute on a
spanning deck: an inline declaration outranks every class selector, so the mode rules can
never paint and one of the two modes silently does nothing — put spacing and anything else
a demo or host page needs in a class.

**The ceiling wins.** `data-sqr-max-cols="1"` (the 0.3.0 column ceiling) forces every
`sqr-wide-*` back to one macro column and every `sqr-span-*` / `sqr-flow-*` back to
`display: block`, at any viewport width — a page that declares one column never spans,
full stop.

**Source order, not `!important`.** The spanning rules are emitted after the unit `@for`
loop, so `.sqr-wide-2` beats the earlier `.sqr-w-6` on source order alone if you ever apply
both — you don't need to, `.sqr-wide-N` already equals `.sqr-w-6` below its own gate.

Try it: the second board in [`examples/index.html`](examples/index.html) has three spanning
sections and two buttons that flip between the modes live.

---

## Scroll snap

`_scrollsnap.scss` is imported by `square-root.scss`, and also builds to `dist/scrollsnap.css` on its own. The short version:

```html
<div class="scrollsnap-horizontal invisible-scrollbar">
  <div class="snap-x sqr-macro-rem">…</div>
  <div class="snap-x sqr-macro-rem">…</div>
</div>
```

`.scrollsnap-horizontal` sets `scroll-snap-type: x mandatory`; `.scrollsnap-vertical` sets `y mandatory` plus `overflow-y: scroll; height: 100vh`. Children marked `.snap-x` / `.snap-y` get `scroll-snap-align` and `scroll-snap-stop: always`. `.invisible-scrollbar` hides the scrollbar cross-browser. Vertical scroll-padding is expressed in fingers and has per-row overrides keyed off `#layoutLiveWire.rows-1` … `.rows-3`.

Full detail, including the row overrides and the snap-stop behaviour: **[docs/SCROLL-SNAP.md](docs/SCROLL-SNAP.md)**.

---

## Behaviour on tablets and desktop

The solve is not the same at every width. `square-root.js` sorts the viewport into a bucket and applies a `cols` factor:

| `window.innerWidth` | bucket | `cols` |
|---|---|---|
| below 320 | `xs` | 1 |
| 320 – 640 | `sm` | 1 |
| 641 – 767 | `md` | 1.2 |
| 768 – 1023 | `lg` | 1.61 |
| 1024 and up | `xl` | 1 (desktop path) |

**Below 1024 — the peek cue.** The ratio is divided by `cols` (exactly once, since 0.2.0), which makes the solved root font-size *smaller* than a perfect one-column fit would give. The design therefore does not quite fill the width, and the next card in a horizontal scroller peeks in at the edge. That sliver is the affordance: it is how the user knows the row scrolls sideways, without a chevron or a hint label. `cols` is literally the number of canonical columns that end up across the screen — 1.2 of them at `md`, 1.61 at `lg`.

**1024 and up — whole columns.** The desktop branch does something different. It floors the number of canonical columns that fit and re-solves against that:

```js
simulatedWidth = parseInt(width / simulatedWidth) * simulatedWidth;
ratio = width / simulatedWidth;
```

At 1200px with a 360px probe: `parseInt(3.33) = 3`, so it solves for `1200 / 1080 = 1.111` → root `111.1%`, and three 400px columns tile the viewport exactly. No ragged right edge, no half-column gutter. At 1440px it lands on 4 × 360 = 1440, ratio exactly 1.

**Re-solving.** `simulateScreen()` runs once at parse time, again on `window.onresize`, and again on `screen.orientation` `change` (which resets the root to 100% first). A module-level `window.simuating` flag (spelling as in source) makes overlapping runs a no-op; it is cleared about a second after a solve begins, so resize events fired inside that window are dropped rather than queued. Since 0.2.0 there is a fourth trigger — `window.squareRootResolve()` and the peek observer below — which retries instead of being dropped.

---

## The phone peek switch (`sqr-peek`)

*New in 0.2.0. **Off by default** — an upgrade changes nothing until you opt in.*

Phones get `cols = 1`, so the canonical design fills the screen exactly and a horizontally-scrolling card deck shows no sign that it scrolls. `sqr-peek` shrinks the solve slightly so the edge of the next card stays visible — the same affordance the `cols` factor produces on tablets, on the bracket where card decks actually live.

```html
<html>                                         <!-- peek off (default) -->
<html class="sqr-peek">                        <!-- peek on, factor 0.89 -->
<html class="sqr-peek" data-sqr-peek="0.85">   <!-- peek on, factor 0.85 -->
```

The class goes on `<html>`. The factor is clamped to `0.5 … 1.0` and falls back to `0.89` on anything unparseable. Factor `f` leaves about `1 − f` of the viewport showing the next card — at the default 0.89 that is ~11%, roughly 40px on a 360px phone.

**It only applies to phones.** The multiplication sits inside `if (cols == 1)`, so it affects widths up to 640px and nothing else. On `md`, `lg` and `xl` the class is inert.

**Flip it live, no reload.** A `MutationObserver` on `<html>` (filtered to `class`, `data-sqr-peek` and, since 0.6.0, the three `data-sqr-fit*` attributes, and short-circuited when the resulting inputs are unchanged) re-solves on its own:

```js
document.documentElement.classList.toggle('sqr-peek');   // paste into the console
document.documentElement.dataset.sqrPeek = '0.85';       // retune live
window.squareRootResolve();                              // or force a solve yourself
```

Give it about a second — the solve is asynchronous.

### ⚠ What peek costs you

**With peek on, the canonical width is no longer the viewport width.** That is the headline invariant of the framework, and this feature breaks it deliberately. `sqr-w-6` stops being full-bleed — it renders at ~89% of the screen — and so does every full-width element built on the canon. A background band, an edge-to-edge image or a sticky footer will leave a bare strip on one side. That strip is the feature; it is also the thing that will surprise you.

| Viewport | root, peek off | `sqr-w-6`, peek off | root, peek on | `sqr-w-6`, peek on |
|---|---|---|---|---|
| 360 | 16.000px | 360.00px | 14.240px | 320.39px |
| 414 | 18.400px | 414.00px | 16.376px | 368.45px |
| 640 | 28.444px | 640.00px | 25.316px | 569.59px |

**What still holds:** every ratio between units is preserved — `sqr-w-3` is still half of `sqr-w-6`, the finger unit is still one sixth of the canon — and the design is uniformly scaled, not reflowed. Nothing re-wraps and no breakpoint fires; the same composition is simply 11% smaller. Watch the small end though: at 360px with peek on the finger unit measures 53.4px, and at 320px it measures 47.5px — still inside the cited 45–52px touch band, but that is the floor.

Use peek on a card deck. Leave it off on a full-bleed page.

**Polarity.** The source note that this implements proposed the opposite default — peek always on, a `.full-screen` class to disable it. Opt-in was shipped because this is a published package and opt-out would silently rescale existing designs. Switching is one line in `sqrPeekFactor()`:

```js
// opt-in (shipped):
if (!el || !el.classList.contains(SQR_PEEK_CLASS)) return 1;
// opt-out (peek everywhere unless .full-screen says no):
if (!el || el.classList.contains('full-screen')) return 1;
```

Full detail, including the guard table and the tappability note: **[docs/HOW-IT-WORKS.md §7.1](docs/HOW-IT-WORKS.md)**.

---

## The fit switch (`data-sqr-fit`)

*New in 0.6.0. **Off by default** — the default mode is the 0.5.0 solve, to the digit.*

The headline solve fits the canon to the viewport **width**. That is right on a phone, where the
screen is always taller than it is wide. It is not always right on a square screen, a landscape
phone, or a 16:9 laptop, where the design can end up taller than the window. `square-root.scss`
already answers part of this in CSS — the landscape media query rotates the canon to 720 × 360
between 361px and 768px — and this switch is the other half, for the screens that query
deliberately excludes.

```html
<html>                                    <!-- css     (default): width only, 0.5.0 exactly -->
<html data-sqr-fit="contain">             <!-- contain: the whole canon fits in BOTH axes -->
<html data-sqr-fit="stack">               <!-- stack:   9 finger units of height must fit -->
<html data-sqr-fit="stack" data-sqr-stack="7">        <!-- a 7-unit budget instead -->
<html data-sqr-fit="contain" data-sqr-fit-floor="0.6"><!-- allow a deeper shrink -->
```

| mode | what it guarantees | binds when |
|---|---|---|
| `css` | nothing about height. The design may be taller than the window; the page scrolls. | never |
| `contain` | the canonical device fits the viewport in both axes | viewport aspect `H/W < (probe height / probe width) / cols`. With the portrait canon that is `2/cols` — any landscape screen once two columns are on it; halve it where the landscape media query has rotated the probe |
| `stack` | `data-sqr-stack` finger units of height fit (default **9** of the canon's 12), never more than the canon itself | wider than 4:3, with the defaults |

The three modes are ordered at every viewport: **`css` ≥ `stack` ≥ `contain`.** `css` is always the
largest scale, `contain` always the smallest.

**Settings.** Each reads the attribute on `<html>` first, then the custom property on `:root`, then
the default — the same order as `data-sqr-max-cols`.

| | attribute | custom property | default |
|---|---|---|---|
| mode | `data-sqr-fit` | `--sqr-fit` | `css` |
| height budget, in finger units | `data-sqr-stack` | `--sqr-stack` | `9` |
| floor | `data-sqr-fit-floor` | `--sqr-fit-floor` | `0.7` (clamped 0–1; `0` = no floor) |

**The floor** is what stops a short wide window collapsing the design: the height solve may never
take the scale below `0.7 ×` what the width solve asked for. On a 1366 × 768 laptop, `contain`
would like to shrink the canon to 56% of the width solve; the floor holds it at 70% and the page
scrolls the rest. `0.7` is not a round number — it is the midpoint of a window closed at one end by
the 45px touch floor and at the other by the 4:3 tablet. See
[docs/DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md).

**Flip it live, no reload.** The same `MutationObserver` that watches the peek watches these three
attributes, with the same short-circuit:

```js
document.documentElement.dataset.sqrFit = 'contain';   // paste into the console
document.documentElement.dataset.sqrStack = '7';       // retune the budget
document.documentElement.removeAttribute('data-sqr-fit');   // back to the default
```

The **custom properties are not observed** — they are the server-rendered channel, exactly like
`--sqr-max-cols`. Change one and call `window.squareRootResolve()`.

### ⚠ What each mode costs you

**`css` costs nothing.** It is the 0.5.0 solve, unchanged, and it is what you get if you never touch
this feature. An upgrade to 0.6.0 does not move a digit.

**`contain` and `stack` break the headline invariant**, the same one the peek breaks — with the
canon fitted to the height, it no longer spans the width, so `sqr-w-6` is not full-bleed and neither
is anything else built on the canon. Unlike the peek, the amount is not a fixed factor you chose; it
depends on the viewport's aspect, so the same page gives up a different share of the width on
different screens.

| viewport | mode | root px | canon on screen | bare width |
|---|---|---|---|---|
| 1024 × 768 | `css` | 22.756 | 2 × 512 = 1024px | 0 |
| 1024 × 768 | `contain` | 17.067 | 2 × 384 = 768px | 256px (25%) |
| 1024 × 768 | `stack` | 22.756 | 2 × 512 = 1024px | 0 — stack is free at 4:3 |
| 1366 × 768 | `css` | 30.356 | 2 × 683 = 1366px | 0 |
| 1366 × 768 | `contain` | 21.249 | 2 × 478 = 956px | 410px (30%) — and the canon *still* does not fit; that is the floor |
| 1366 × 768 | `stack` | 22.756 | 2 × 512 = 1024px | 342px (25%) |

**The height modes re-solve on a height-only resize.** `onresize` fires when only the height
changes, and in `css` mode that lands on the same number so nothing moves. In `contain` and `stack`
it rescales the whole page. On a mobile browser the collapsing URL bar is a height-only resize of
60–100px, so a height mode on a long scrolling document makes the design breathe while the reader
scrolls. **Nothing damps this.** The height is read from `documentElement.clientHeight`, the root
element's own content height, and a URL-bar collapse moves that exactly as it moves
`window.innerHeight`. (`clientHeight` is used because it is the conservative number: where it
differs from `100vh` it is the smaller, having excluded a classic horizontal scrollbar — and this
framework's boards are horizontal scrollers.) The mitigation is placement, not arithmetic: **put a
height mode on a board that owns the viewport** — a `height: 100vh` snap column — not on a document
that scrolls.

**A guarantee can be unachievable, and the floor wins when it is.** On an 812 × 375 landscape phone
(past the SCSS swap's 768px bound, so the canon is still portrait), nine finger units of height need
41.7px each — under the researched 45px floor. Neither height mode can deliver there. Both clamp to
the floor and the page scrolls, which is the honest answer.

**Off the wide screens, all three modes are identical.** On every portrait phone, on the Fold in
both orientations, and on any rotated phone the SCSS swap covers, the height never binds and the
solved root is the `css` number exactly.

Full detail, including the eight-viewport worked table:
**[docs/HOW-IT-WORKS.md §7.2](docs/HOW-IT-WORKS.md)**.

---

## Short screens (`data-sqr-short`)

*New in 0.7.0. **On by default** (the owner's call, 2026-09-10: the rule is the framework's own logic,
finger and aspect, and it only changes screens the width-only solve gets wrong). `data-sqr-short="off"`
restores the 0.6.0 solve to the digit, and with it off nothing is written to `<html>`.*

The width solve says how big the design is. It does not say how many columns the screen should show
— that is the ceiling (`data-sqr-max-cols`, 0.3.0), and the ceiling only ever asks how WIDE a column
is. On a short wide window a single column can be wide enough to pass the ceiling and still be
wrong: one card lies across the whole screen and the fold has no room left.

There is a second half to the problem, and it is the one that bites first. The N-column rules in
`square-root.scss` are gated on `@media (min-width: N × 320px)` — **raw** pixels, resolved against
the initial 16px root. The solver measures against the probe. Where the landscape media query has
rotated the canon to 720 × 360, those two answers disagree: a 637 × 320 window is already two macro
columns wide to the solver, and three pixels short of the gate to the stylesheet. Turn this switch
on and the solver publishes its answer as `data-sqr-cols` on `<html>`, and the stylesheet follows it.

```html
<html>                                                  <!-- on (default) -->
<html data-sqr-short="off">                             <!-- off: the 0.6.0 solve -->
<html data-sqr-short="cols">                            <!-- on, said out loud -->
<html data-sqr-short="cols" data-sqr-short-aspect="1.4"><!-- a lazier trigger -->
<html data-sqr-short="cols" data-sqr-short-floor="0.75"><!-- demand a 45px finger at any aspect -->
:root { --sqr-short: cols }                             <!-- the same, server-rendered -->
```

| mode | what it does | binds when |
|---|---|---|
| `off` | nothing. No attribute is written and no `html[data-sqr-cols]` rule can match. | never |
| `cols` | publishes the solved macro-column count as `data-sqr-cols`, and adds a column while the screen is short for it and the finger holds | `width / cols > height × aspect`, and only then if the next finger clears the floor |

**The rule, in one line.** While a column is wider than `aspect` times the viewport height, accept
one more column if the finger it would leave is still at least
`floor + (1 − floor) × min(1, height/width)` of a canonical finger. **Inside this pass the finger
floor replaces the fixed 320px column floor** — a 300px column at a 50px finger is a column; a 300px
column at a 30px finger is not.

**The published attribute is floor-gated, not the pass's raw product.** `data-sqr-cols` is not simply
"the solved column count times the probe's macro-column span" — that product reflects the landscape
probe's rotation alone, and every landscape viewport 361–639px wide rotates regardless of its own
aspect. It publishes the naive count only where the viewport's own finger, measured through the
rotated probe, already clears the floor, or where the raw-pixel media gate would have matched that
many columns anyway. A 361 × 360 window (a 30px finger either way) is not offered a second column;
a 637 × 320 window (a 53px finger) is — that distinction is the whole feature.

**Settings.** Each reads the attribute on `<html>` first, then the custom property on `:root`, then
the default — the same order as `data-sqr-max-cols` and `data-sqr-fit`.

| | attribute | custom property | default |
|---|---|---|---|
| mode | `data-sqr-short` | `--sqr-short` | `cols` (on; `off` opts out) |
| trigger, column width ÷ height | `data-sqr-short-aspect` | `--sqr-short-aspect` | `1.2` |
| finger floor at a flat screen | `data-sqr-short-floor` | `--sqr-short-floor` | `0.6` (clamped 0–1; `1` = pass disabled) |
| the count, **written not read** | `data-sqr-cols` | — | — |

**Worked answers**, at the default ceiling of 2:

| viewport | probe | today | with the switch on | finger |
|---|---|---|---|---|
| 637 × 320 | 720 × 360 (rotated) | 1 column — 3px short of the 40rem gate | **2 columns of 318.5** | 53.08px, unchanged |
| 643 × 323 | 720 × 360 | 2 columns (past the gate) | 2 columns | 53.58px, unchanged |
| 600 × 320 | 720 × 360 | 1 column | **2 columns of 300** | 50.00px, unchanged |
| 361 × 360 | 720 × 360 | 1 column | 1 column — the finger would be a 30px half-finger | 30.08px |
| 358 × 278 | 360 × 720 | 1 column | 1 column — the finger would be half a finger | 59.67px |
| 451 × 775 | 360 × 720 | 1 column | 1 column — not short | 75.17px |
| 900 × 350, ceiling 4 | 360 × 720 | 2 columns of 450 | **3 columns of 300** | 75 → 50px |

**Flip it live, no reload.** The same `MutationObserver` that watches the peek and the fit
attributes watches these three:

```js
document.documentElement.dataset.sqrShort = 'cols';         // paste into the console
document.documentElement.dataset.sqrShortAspect = '1.4';    // retune the trigger
document.documentElement.removeAttribute('data-sqr-short'); // back to the default
```

`data-sqr-cols` is the one attribute here the observer does **not** watch — it is the solver's own
output, and watching it would make every solve schedule the next one.

### ⚠ What this costs you

**`off` costs nothing.** No height read, no attribute written, no rule matched. One extra
`getComputedStyle` on `<html>` per solve, which is a style read on already-clean style.

**On, it reads the viewport height** — so a height-only resize can now change the answer. On mobile
that means the collapsing URL bar. Unlike the fit modes this output is discrete, so the design does
not breathe with the bar; it flips, once, and only if the window is sitting exactly on a boundary.
Pick an `aspect` you are not living on. `window.onresize` is `squareRootResolve()` (not the raw
solver), so a resize landing mid-solve is retried rather than dropped — with the raw solver a dropped
resize on a foldable could otherwise strand a stale, too-wide column layout.

**At a ceiling of 2 the pass cannot fire at all** — the arithmetic is in
[docs/DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md). On a two-column template the switch is
purely the seam: the solved scale is untouched at every viewport and only the column gate moves.

**A wider screen never loses a column.** `data-sqr-cols` only ever adds rules to the ones the media
gate already matched.

**The phone peek is gated on the published count, not just the solved one.** With `sqr-peek` on, a
screen where the seam has published a second column no longer applies the peek's shrink — the peek
is a one-column horizontal-scroll affordance, and a genuinely two-column screen has nothing to peek
at.

Full detail, including the specificity table and the compiled selectors:
**[docs/HOW-IT-WORKS.md §7.3](docs/HOW-IT-WORKS.md)**.

---

## Device tiers (`data-sqr-device-cols`)

*New in 0.8.0. **Off by default** — the owner's own call: the mechanism belongs in the package, the
numbers belong to the site. With it off the 0.7.0 solve is untouched to the digit and nothing is read
beyond the switch itself.*

`data-sqr-short` (0.7.0) asks whether a window is **short** for its column — its shape. This asks
whether it is **big** — its raw pixel budget — and that is the question the aspect can never answer.
A Fold split at 637 × 727 CSS is aspect 1.14, genuinely portrait, nowhere near the short trigger, and
it is 1672 × 1908 real pixels being asked to carry one 637px column at 1.77× the canon.

```html
<html>                                                       <!-- off (default) -->
<html data-sqr-device-cols="tiers"
      data-sqr-device-tiers="2 1600 1700 1.75">              <!-- two columns on a big dense window -->
<html data-sqr-device-cols="tiers" data-sqr-max-cols="3"
      data-sqr-device-tiers="2 1600 1700 1.75, 3 … … …">     <!-- a tablet tier needs the ceiling too -->
:root { --sqr-device-cols: tiers }                            <!-- the same, server-rendered -->
```

**The table.** One row per tier, four numbers, rows separated by commas:

| field | means |
|---|---|
| `cols` | how many columns this tier asks for (2 or more, and never more than `data-sqr-max-cols` — a row asking for more than the ceiling allows is dropped, not clamped to it) |
| `minShortPx` | the **shorter** viewport edge, in device pixels (`min(w,h) × devicePixelRatio`) |
| `minLongPx` | the **longer** one. The pair is sorted, so rotation does not flip the answer |
| `minScale` | the scale the earlier passes already solved, `width / (probe × cols)` |

**All four must hold**, and the highest qualifying tier wins. A tier can only add columns, never
remove one, and never out-rank `data-sqr-max-cols`. Every field is validated before a row is used: a
wrong field count, a non-number, a `cols` under 2, or a threshold that is not a positive number drops
that one row and leaves the rest of the table working.

**Choose `minScale` as a finger, not as a scale.** A 1 → 2 promotion halves the solved scale, so the
finger it leaves is exactly `30 × minScale` px; a 2 → 3 promotion leaves `40 × minScale`.

| `minScale` | finger left by a 1 → 2 promotion | |
|---|---|---|
| 2.00 | 60.0px | a whole canonical finger |
| **1.75** | **52.5px** | the ALL1 number |
| 1.50 | 45.0px | exactly the researched touch floor |
| 1.25 | 37.5px | below the floor — don't |

**Settings.** Each reads the attribute on `<html>` first, then the custom property on `:root`, then
the default — the same order as `data-sqr-max-cols`, `data-sqr-fit` and `data-sqr-short`.

| | attribute | custom property | default |
|---|---|---|---|
| mode | `data-sqr-device-cols` | `--sqr-device-cols` | `off` (`tiers` opts in) |
| the tier table | `data-sqr-device-tiers` | `--sqr-device-tiers` | empty — an empty table is inert |
| the ceiling a tier cannot pass | `data-sqr-max-cols` | `--sqr-max-cols` | `2` |

**Worked answers**, with `2 1600 1700 1.75` and the default ceiling of 2:

| viewport | DPR | device px | scale | result | finger |
|---|---|---|---|---|---|
| 637 × 727 | 2.625 | 1672 × 1908 | 1.7694 | **2 columns of 318.5** | 106.2 → 53.08px |
| 637 × 727 | 2.35 | 1497 × 1708 | 1.7694 | 1 column — short edge under 1600 | 106.17px |
| 600 × 760 | 2.70 | 1620 × 2052 | 1.6667 | 1 column — scale under 1.75 | 100.00px |
| 500 × 727 | 2.625 | 1313 × 1908 | 1.3889 | 1 column — narrow the split, it falls back | 83.33px |
| 375 × 812 | 3 | 1125 × 2436 | 1.0417 | 1 column — a phone is a phone | 62.50px |
| 708 × 823 | 2.625 | 1859 × 2160 | 0.9833 | 2 columns, from the 0.3.0 ceiling — this pass declines | 59.00px |

**Flip it live, no reload.** The observer watches both attributes, with the same short-circuit:

```js
document.documentElement.dataset.sqrDeviceCols = 'tiers';
document.documentElement.dataset.sqrDeviceTiers = '2 1600 1700 1.5';
document.documentElement.removeAttribute('data-sqr-device-cols');   // back to the default
```

### ⚠ What this costs you

**`off` costs nothing.** One `getComputedStyle` on `<html>` per solve — a style read on already-clean
style. No height read, no attribute written, no rule matched, no CSS added by this release at all.

**On, it reads the viewport height**, so a height-only resize can change the answer — on mobile, the
collapsing URL bar. Leave the long edge real headroom: a 60–100 CSS px collapse is 160–260 device
pixels, and a threshold sitting just under your live reading will flip the layout mid-scroll. In
portrait the **short** edge is the load-bearing half and does not move with the bar; set the long one
low enough to stay clear.

**It moves the cliff, it does not remove it.** Column counts are integers, so somewhere one CSS pixel
still doubles the finger. With ALL1's own row that boundary moves from 640 to 630, on screens dense
enough to deserve it.

**A tablet tier needs the ceiling raised too.** `data-sqr-max-cols` defaults to 2 and clamps every
tier; a `3 …` row without `data-sqr-max-cols="3"` is now dropped rather than silently clamped to 2 —
the ceiling still has to be raised for the row to do anything at all.

---

## Known quirks

These are real, they are in the shipped source, and you should know about them before you go debugging your own layout.

**1. `md` and `lg` were divided by `cols` twice — fixed in 0.2.0.**

Through 0.1.x the first division was unconditional, and then, because the `if (cols == 1)` branch body is commented out, any bucket where `cols !== 1` fell into the `else` and divided **again**:

```js
if (width < 1024) {
    ratio = ratio / cols;

    if (cols == 1) {
        // ratio = ratio * 0.89;   <-- body is commented out
    } else {
        ratio = ratio / cols;      // <-- removed in 0.2.0
    }
}
```

Effective divisors were `1.2 × 1.2 = 1.44` at `md` and `1.61 × 1.61 = 2.5921` at `lg`. The tell that this was a leftover rather than tuning: at 1023px the squared `lg` factor put 2.59 columns on screen, while the desktop branch puts 2 columns on a 1024px screen — one pixel wider and the design got bigger. A 768px tablet also solved to a 13.17px root, smaller than the 14.22px a 320px watch gets.

Since 0.2.0 `cols` is applied once. `md` and `lg` therefore scale **larger** than they did on 0.1.x; phones (`sm`) and desktop (`xl`) are unchanged. See the CHANGELOG for the migration note and `docs/HOW-IT-WORKS.md` §12 for the full before/after table.

(The `cols == 1` body is no longer empty either — since 0.2.0 it holds the [peek switch](#the-phone-peek-switch-sqr-peek). That is a separate, opt-in feature; with no `sqr-peek` class it multiplies by exactly 1 and the phone bucket is byte-identical to 0.1.x.)

**2. `window.onload = simulateScreen();` never binds a handler.**

```js
simulateScreen();
window.onresize = simulateScreen;
window.onload = simulateScreen();   // parentheses: calls it, assigns undefined
```

The trailing `()` **invokes** `simulateScreen` immediately and assigns its return value — `undefined` — to `window.onload`. There is no load handler. In practice the bug is masked: the bare `simulateScreen()` on the line above already runs at parse time, and `onresize` plus the orientation listener cover everything after. But if you ever depend on a re-solve after images and webfonts finish loading, it is not happening. The fix, if you want it, is dropping the parentheses.

**Smaller things in the same spirit**

- `.-sqr-h-screen-5` subtracts **4** fingers, not 5 — the `-4` rule was copied and the multiplier not updated. `.-sqr-h-screen-4` and `.-sqr-h-screen-5` are currently identical.
- `.xs\:sqr-my-1\/2` applies `0.25` of a finger, not `0.5`, despite the name.
- `screen.orientation.addEventListener` is called unguarded. Browsers without the Screen Orientation API will throw at that line — everything above it has already run, but nothing after it will.
- The `//4.5rem` comment beside `.sqr-micro-rem` is stale; `60 × 0.0625rem` is `3.75rem`.
- `dist/` is checked in and can drift from `src/` (the built `.snap-x` currently says `scroll-snap-align: start` where the source says `center`). Rebuild from `src/` if the two disagree.

---

## Docs

- **[docs/MEASURING.md](docs/MEASURING.md)** — the authoring workflow: design on the 360 × 720 artboard, measure in pixels, divide by 60, and turn the result into classes — with a conversion table, a worked example, and how to verify the result in a browser. **Start here if you are building a page.**
- **[docs/DESIGN-RATIONALE.md](docs/DESIGN-RATIONALE.md)** — why every constant is the number it is: the research behind the 60px finger unit, why the canon is 360 × 720, and the device-bracket reasoning. **Read this before changing a value.**
- **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)** — the scaler in depth: probes, the solve loop, worked ratio tables, column tiling, the landscape canon swap
- **[docs/UTILITIES.md](docs/UTILITIES.md)** — complete class reference, what each resolves to, and which classes are commented out in source
- **[docs/INTEGRATION.md](docs/INTEGRATION.md)** — plain HTML, Vite, Laravel/Blade, and coexisting with Tailwind (including the rem-scaling caveat)
- **[docs/SCROLL-SNAP.md](docs/SCROLL-SNAP.md)** — scroll-snap classes, row overrides, snap-stop behaviour
- Runnable demo: [`examples/index.html`](examples/index.html)
- Source of truth is small enough to read end to end: [`src/square-root.scss`](src/square-root.scss), [`src/_scrollsnap.scss`](src/_scrollsnap.scss), [`src/square-root.js`](src/square-root.js)

Touch-target sizing follows [Smashing Magazine's finger-friendly design research](https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/), which is where the 60px micro unit comes from.

## License

MIT — free to use, including commercially. Attribution is appreciated but not
required.

## Author

**Invented and built by Neo Nosrati** — [neonos.net](https://neonos.net) ·
[@N30 on GitHub](https://github.com/N30).

Square Root came out of building [ALL1.AI](https://all1.ai), where a single
interface had to hold its shape across every phone a customer might arrive on.
It has been running in production there since before this repository existed.

Repository: <https://github.com/all1web/square-root>
