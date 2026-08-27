# Scroll snap

The scroll-snap layer of **Square Root** — `src/_scrollsnap.scss`.

This is the smallest file in the framework (44 lines, six rules) and it does the least work of
any part of it, on purpose. It contributes **only** snap behaviour and scrollbar suppression. It
sets no `display`, no `overflow-x`, no widths on children, and no colours. You bring the layout;
this layer tells the browser where scrolling is allowed to come to rest.

It exists to serve one pattern, which is the pattern Square Root as a whole was built for:

> **A horizontal rail of full-device-width columns you swipe between, where each column is itself
> a vertical stack of cards you scroll through.** Two nested scroll containers, both snapping,
> both with hidden scrollbars, all sized in the framework's finger unit so the whole thing scales
> in lockstep with `square-root.js`'s root font-size solve.

---

## Where the file lives and how it gets to the browser

`_scrollsnap.scss` is a Sass partial. It is pulled in by the main stylesheet:

```scss
// src/square-root.scss, line 18
@import "_scrollsnap";
```

That means:

* **If you ship `dist/square-root.css`, the snap layer is already inside it.** Do not also link
  `dist/scrollsnap.css` — you would get every rule twice.
* `dist/scrollsnap.css` is a standalone build of just this partial. It is only usable **alongside**
  the main stylesheet, because every `scroll-padding` value in it reads `var(--micro-width)`, and
  `--micro-width` is declared in the `:root` block of `square-root.scss`, not here. Load
  `scrollsnap.css` on its own and those `calc()` expressions become invalid at computed-value time,
  so `scroll-padding-top` silently falls back to its initial value of `auto`. Snapping still works;
  the offset does not.

### The `dist/` builds are currently stale

Verified drift at the time of writing — `src/` is the source of truth, and this document describes
`src/`:

| Declaration | `src/_scrollsnap.scss` | `dist/scrollsnap.css` | `dist/square-root.css` |
| --- | --- | --- | --- |
| `.scrollsnap-horizontal` `scroll-padding-left` | commented out | `… * 0.75` | `… * 0.50` |
| `.snap-x` `scroll-snap-align` | `center` | `start` | `start` |
| `.scrollsnap-vertical` `scroll-padding-top` | `… * 0.225` | absent | absent |
| `#layoutLiveWire.rows-N` overrides | present | absent | absent |
| `.snap-y` selector | `>` (child) | descendant | `>` (child) |

If your columns align to their left edge instead of centring, or your `rows-N` classes do nothing,
you are running a stale `dist/`. Rebuild from `src/`.

---

## Rule-by-rule reference

Every rule in the file, in source order.

### 1. `.invisible-scrollbar` — WebKit half

```css
.invisible-scrollbar::-webkit-scrollbar {
    display: none;
}
```

Removes the scrollbar box entirely in Chrome, Safari, Edge and Opera. `display: none` on the
scrollbar pseudo-element also removes the gutter, so the content width does not change — unlike
setting `width: 0`, which some engines still reserve space for.

### 2. `.invisible-scrollbar` — standard / legacy half

```css
.invisible-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;     /* Firefox */
}
```

`scrollbar-width: none` is the standard property (Firefox 64+, Chromium 121+, Safari 18.2+).
`-ms-overflow-style: none` covers IE11 and pre-Chromium Edge.

**Why all three declarations are needed.** They are not redundant, they cover disjoint engine
generations. A modern Chrome honours both `scrollbar-width` and the `::-webkit-scrollbar`
pseudo-element, but Safari before 18.2 and Chrome before 121 honour *only* the pseudo-element,
and Firefox honours *only* `scrollbar-width`. Drop either and one of your target browsers grows a
scrollbar. Keep the pair.

**The rule does not cascade to descendants.** `::-webkit-scrollbar` matches the scrollbar of *the
element the class is on*. In the nested pattern below you have two scroll containers — the rail
and each column — so `invisible-scrollbar` must be written on **both**, every time.

**Accessibility note.** Hiding the scrollbar removes the browser's only built-in "there is more
over here" affordance. Nothing about scrolling is disabled — wheel, trackpad, touch, arrow keys,
`PageDown` and programmatic `scrollTo` all still work — but the *cue* is gone. Square Root
replaces that cue deliberately: the `cols` factor in `square-root.js` (1.2 at `md`, 1.61 at `lg`)
shrinks the scale so the next column's edge peeks in past the viewport edge. If you hide the
scrollbar on a container that does **not** get that peek, add your own indicator.

### 3. `.scrollsnap-horizontal` — the rail

```css
.scrollsnap-horizontal {
    scroll-snap-type: x mandatory;
    /* scroll-padding-left: calc(var(--micro-width) * 0.0625rem * 0.35);  ← commented out in src */
}
```

`x mandatory` means: after any scroll gesture on this container's inline axis, the browser **must**
come to rest on a snap position. There is no "close enough" state — you cannot park half-way
between two columns.

The commented-out `scroll-padding-left` would have inset the snapport's left edge by
`60 × 0.0625rem × 0.35` = `1.3125rem` (21px at a 16px root). It is off in `src`, and that is
consistent with the `center` alignment used by `.snap-x`: a left inset shifts the snapport, which
would push "centred" columns off-centre by half the inset. If you switch your columns to
`start` alignment, that padding becomes the thing you would re-enable.

**This rule does not make the element scroll.** `scroll-snap-type` has no effect on a box that is
not a scroll container. You must supply the overflow and the layout yourself:

```css
.rail {
    display: flex;
    flex-wrap: nowrap;      /* wrapped columns cannot form a horizontal rail */
    overflow-x: auto;       /* ← without this, nothing scrolls and nothing snaps */
    overflow-y: hidden;
}
```

This is the single most common way to wire the class up and see nothing happen.

### 4. `.scrollsnap-horizontal .snap-x` — the columns

```css
.scrollsnap-horizontal .snap-x {
    scroll-snap-align: center;
    scroll-snap-stop: always;
}
```

`scroll-snap-align: center` — one value, so it applies to both axes; the rail's `x mandatory`
snap-type means only the inline component is consulted. Each column comes to rest centred in the
snapport. When the column is exactly viewport-width, "centred" and "flush" are the same thing.
When the JS `cols` factor has shrunk the scale so the column is *narrower* than the viewport,
centring gives you a **symmetric** peek — a sliver of the previous column on the left and of the
next one on the right. That symmetry is the reason for `center` over `start`.

`scroll-snap-stop: always` — a fast flick cannot fly past a column. The scroller stops at the very
next snap position regardless of gesture velocity. For a rail of categories this is what you want:
one swipe, one category, no accidental skipping of three sections. The cost is that reaching column
seven takes seven swipes; there is no shortcut short of `scrollTo`.

**The selector is a descendant selector**, not a child selector. Any `.snap-x` anywhere inside a
`.scrollsnap-horizontal` picks up these declarations — including one buried several levels deep.
That is usually harmless (`scroll-snap-align` is resolved against the element's *nearest ancestor
scroll container*, so a deeply nested `.snap-x` defines snap positions in whatever inner scroller
encloses it, not in the rail), but it does mean the class can act at a distance. Put `.snap-x` on
the direct children of the rail and nowhere else.

**Corollary:** because alignment resolves against the *nearest* scroll container, the element
carrying `.scrollsnap-horizontal` must be the element that actually scrolls. Putting the class on a
non-scrolling wrapper while the real `overflow-x` sits on a parent or a child sends the snap
positions to the wrong box.

### 5. `.scrollsnap-vertical` — a column

```css
.scrollsnap-vertical {
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
    height: 100vh;
    scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225);
}
```

Unlike the horizontal rule, this one is opinionated: it establishes the scroll container itself
(`overflow-y: scroll`) and commits to a height (`100vh`).

* **`overflow-y: scroll`, not `auto`.** The container is a scroll container even when its content
  is short, so layout does not reflow the moment content crosses the one-screen threshold. On
  desktop engines that still reserve a classic scrollbar gutter this permanently steals a few
  pixels of width — which is precisely why you pair it with `invisible-scrollbar`.

* **`height: 100vh`.** On mobile browsers `100vh` is the *large* viewport height: it ignores the
  retractable URL bar, so the bottom of each column can sit under browser chrome until the user
  scrolls. If that matters to you, override with `height: 100dvh` in your own stylesheet — the
  framework does not do this for you. Both `.scrollsnap-vertical` and your own column class are
  single-class selectors of equal specificity, so **source order decides**: load your CSS after
  `square-root.css` and your height wins.

* **Source note on the snap-type.** The author's inline comment reads:
  `y mandatory; //turns to proximity when going next auto so it can scroll up, cause it wont
  otherwise`. That is a note about the host application flipping this to `y proximity` at runtime
  when it drives an automatic "next card" scroll — under `mandatory`, a programmatic scroll that
  lands between snap positions gets yanked back. It is a documented behaviour of the *host app*,
  not an API of this framework: there is no class or flag here that performs the swap. If you
  animate scroll position yourself, expect to do the same thing.

### 6. `#layoutLiveWire.rows-N` — scroll-padding overrides

```css
#layoutLiveWire.rows-1 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 *  4); }
#layoutLiveWire.rows-2 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 13); }
#layoutLiveWire.rows-3 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 14); }
```

`scroll-padding-top` insets the top edge of the **snapport** — the region a snap area is aligned
into. Because `.snap-y` uses `scroll-snap-align: start`, the padding is exactly the gap left
between the top of the column and the top of the card it has snapped to. That is what you use to
stop a fixed header from covering the top of every card.

Only `rows-1`, `rows-2` and `rows-3` exist. Any other value (including no class at all) falls
through to the base `0.225`.

**This is a hard-coded host hook, and you should know that before you use it.** `#layoutLiveWire`
is an id from the Livewire application Square Root was extracted from. The selector will not match
unless you literally put `id="layoutLiveWire"` on an ancestor of your columns. The multipliers
(4, 13, 14) are hand-tuned values, not a formula — the jump from 4 to 13 is not a typo you should
"fix". `0.225 × 4 = 0.9` of a finger unit ≈ 54px is close to one 60px header row, which is at
least consistent with the name; the larger two are tuned to whatever chrome that app stacks above
the scroller.

If you are not that app, ignore the classes and write the value yourself:

```css
.column { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 1); } /* one finger unit */
```

### 7. `.scrollsnap-vertical > .snap-y` — the cards

```css
.scrollsnap-vertical > .snap-y {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    /* height: 100vh;  ← commented out in src */
}
```

`start` — the card's top edge aligns to the top of the snapport (i.e. below the
`scroll-padding-top` inset). Cards read top-down, so top alignment is what you want; a card taller
than the column simply scrolls past its own bottom before the next snap engages.

`scroll-snap-stop: always` — same reasoning as the rail. One swipe, one card.

**This one is a child combinator (`>`), and the horizontal one is not.** This asymmetry is real
and it will catch you: `.snap-y` must be a **direct child** of the `.scrollsnap-vertical` element.
Wrap your cards in an inner `<div>` for padding or a grid and every card silently stops snapping.
Put the spacing utilities on the card itself instead.

The commented-out `height: 100vh` means cards are **not** forced to fill the column. Cards size
themselves. Use the framework's own height utilities if you want full-bleed cards that leave room
for chrome — e.g. `-sqr-h-screen-1` is `calc(100vh - one finger unit)`.

---

## Scroll-padding, in the framework's units

Every offset in this file is expressed in the micro (finger) unit:
`calc(var(--micro-width) * 0.0625rem * multiplier)`, where `--micro-width: 60`. One whole finger
unit is `60 × 0.0625rem = 3.75rem`.

| Rule | Multiplier | Value | Fingers | px at a 16px root |
| --- | --- | --- | --- | --- |
| `.scrollsnap-vertical` (base) | `0.225` | `0.84375rem` | 0.225 | 13.5px |
| `#layoutLiveWire.rows-1` | `0.225 × 4` = 0.9 | `3.375rem` | 0.9 | 54px |
| `#layoutLiveWire.rows-2` | `0.225 × 13` = 2.925 | `10.96875rem` | 2.925 | 175.5px |
| `#layoutLiveWire.rows-3` | `0.225 × 14` = 3.15 | `11.8125rem` | 3.15 | 189px |
| `.scrollsnap-horizontal` (commented out) | `0.35` | `1.3125rem` | 0.35 | 21px |

The last column is a *reference* figure only — it is what you would get if the root font-size were
the browser default 16px. In a live Square Root page it never is. `square-root.js` sets
`:root { font-size: ratio*100% }` where, on a phone, `ratio = window.innerWidth / 360`. So:

```
1rem                = 16 × innerWidth / 360   px
one finger (3.75rem) = 60 × innerWidth / 360  px  =  innerWidth / 6
```

**On a phone, one micro unit is exactly one sixth of the viewport width**, and every snap offset in
the table above is a fixed fraction of the screen. On a 390px iPhone the base `scroll-padding-top`
resolves to 14.6px and `rows-1` to 58.5px; on a 430px Pro Max, 16.1px and 64.5px. The proportions
are identical, which is the entire point of the framework — you do not get a 54px header inset on a
device whose header is not 54px tall.

(The `/ cols` divisions in the JS at `md` and `lg` make the ratio smaller than `innerWidth / 360`,
so the one-sixth identity holds for `cols == 1` screens. See *Known quirks*.)

---

## Building the pattern

The whole design is three elements and which class goes where:

| Element | Classes | Role |
| --- | --- | --- |
| The rail | `scrollsnap-horizontal` `invisible-scrollbar` + **your** `display:flex; overflow-x:auto` | The horizontal scroll container. Snaps on x. |
| A column | `snap-x` `scrollsnap-vertical` `invisible-scrollbar` + **your** width | **Both roles at once.** It is a snap area in the rail *and* a scroll container of its own. Snaps on y. |
| A card | `snap-y` + Square Root spacing/height utilities | A snap area in its column. Must be a direct child of the column. |

The column carrying two classes is the hinge of the whole pattern. `snap-x` makes it a target for
the rail's horizontal snapping; `scrollsnap-vertical` simultaneously turns it into a nested
vertical scroller. The browser routes a horizontal gesture to the rail and a vertical gesture to
the column, so "swipe sideways between categories, scroll down through cards" needs no JavaScript
at all.

### Worked example

A page of horizontally snapping category columns, each scrolling vertically through cards.
Copy-pasteable as-is.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Square Root — snapping columns</title>

  <!-- Square Root. The snap layer is compiled into this file; do not also load scrollsnap.css. -->
  <link rel="stylesheet" href="/node_modules/@all1web/square-root/dist/square-root.css">

  <!-- REQUIRED. square-root.js writes ":root { font-size: N% }" into this tag.
       It must already exist in the DOM when the script runs, and it must start empty. -->
  <style id="square-root"></style>

  <style>
    /* ---- Everything Square Root deliberately does NOT provide ---- */

    /* The probes must have a layout box but paint nothing.
       visibility:hidden keeps the box. display:none would give offsetWidth 0
       and the JS would compute an infinite ratio. */
    .fixed     { position: fixed; top: 0; left: 0; pointer-events: none; }
    .invisible { visibility: hidden; }

    html, body { margin: 0; height: 100%; overflow: hidden; }

    /* The rail: scrollsnap-horizontal only declares snap-type,
       so the scroll container and the flex layout are on us. */
    .rail {
      display: flex;
      flex-wrap: nowrap;      /* wrapping would destroy the rail */
      overflow-x: auto;
      overflow-y: hidden;
      height: 100dvh;
    }

    /* A column: one canonical device wide (--macro-width 360 × 0.0625rem = 22.5rem),
       so exactly one column fills the viewport after the JS solves the root size.
       Loaded after square-root.css, so this height beats .scrollsnap-vertical's 100vh. */
    .column {
      flex: 0 0 auto;
      width: calc(var(--macro-width) * 0.0625rem);
      height: 100dvh;
      overscroll-behavior-y: contain;   /* stop the column's scroll chaining into the rail */
    }

    .card {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      border-radius: 1rem;
      background: #1b1b1f;
      color: #fff;
    }
  </style>
</head>
<body>

  <!-- REQUIRED probes. square-root.js measures .sqr-macro-rem to solve the root font-size.
       Keep both, keep them invisible, and never switch them to display:none. -->
  <div class="fixed invisible sqr-macro-pixel"></div>
  <div class="fixed invisible sqr-macro-rem"></div>

  <!-- Optional: the host hook that activates the rows-N scroll-padding overrides.
       Drop the id and the class if you would rather set scroll-padding-top yourself. -->
  <div id="layoutLiveWire" class="rows-1">

    <div class="rail scrollsnap-horizontal invisible-scrollbar">

      <!-- One category. snap-x = a stop on the rail. scrollsnap-vertical = its own scroller.
           invisible-scrollbar must be repeated here: the ::-webkit-scrollbar rule does not
           reach descendants. -->
      <section class="column snap-x scrollsnap-vertical invisible-scrollbar">
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Coffee · 1</article>
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Coffee · 2</article>
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Coffee · 3</article>
      </section>

      <section class="column snap-x scrollsnap-vertical invisible-scrollbar">
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Bakery · 1</article>
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Bakery · 2</article>
      </section>

      <section class="column snap-x scrollsnap-vertical invisible-scrollbar">
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Wine · 1</article>
        <article class="card snap-y -sqr-h-screen-1 sqr-px-1 sqr-pt-1 sqr-mt-1">Wine · 2</article>
      </section>

    </div>
  </div>

  <!-- Last, after the probes exist. The script calls simulateScreen() the moment it parses,
       and that call synchronously touches #square-root. -->
  <script src="/node_modules/@all1web/square-root/src/square-root.js"></script>
</body>
</html>
```

Utilities used, and what they resolve to (`--micro-width: 60`, so one unit is `3.75rem`):

| Class | Declaration | Purpose here |
| --- | --- | --- |
| `-sqr-h-screen-1` | `height: calc(100vh - 3.75rem)` | Card fills the column minus one finger unit, leaving the next card's edge visible as a vertical scroll cue. |
| `sqr-px-1` | `padding-left/right: 3.75rem` | One finger of gutter inside the card. |
| `sqr-pt-1` | `padding-top: 3.75rem` | |
| `sqr-mt-1` | `margin-top: 3.75rem` | Gap between stacked cards. |
| `.sqr-macro-rem` | `width: 22.5rem; height: 45rem` | The probe the JS measures. |
| `.sqr-macro-pixel` | `width: 360px; height: 720px` | The unscaled canonical device, queried by the JS but unused in the current maths. |

Note the deliberate choice of `-sqr-h-screen-1` rather than a full-height card: leaving one finger
unit of the next card showing is the vertical counterpart of the horizontal `cols` peek. With the
scrollbar hidden, that sliver is the only thing telling the user the column continues.

### Notes on the example's structure

* **`.snap-y` cards are direct children of `.column`.** No wrapper. The `>` combinator in
  `.scrollsnap-vertical > .snap-y` is unforgiving.
* **`invisible-scrollbar` appears twice** — once on the rail, once per column. Two scroll
  containers, two scrollbars, two rules needed.
* **The rail also sets `overflow-y: hidden`.** Without it, a vertical gesture that begins on the
  rail's own box can scroll the rail instead of a column.
* **`overscroll-behavior-y: contain` on the column is plain CSS, not a Square Root class.** Add it
  yourself. Without it, hitting the bottom of a column chains the scroll up to the page.
* **The column width is authored in the macro unit**, `calc(var(--macro-width) * 0.0625rem)` =
  `22.5rem`. That is the same expression `.sqr-macro-rem` uses, which is what the JS measures — so
  the column is, by construction, exactly one solved viewport wide. Hard-coding `100vw` instead
  would break the `cols` peek at `md`/`lg`, because `cols` works by making the solved rem *smaller*
  than the viewport while `100vw` stays pinned to it.

---

## Known quirks and gotchas

Behaviours verified in the source. They are documented rather than patched.

### The `cols` ratio is divided twice

In `square-root.js`, for any screen below 1024px:

```js
ratio = ratio/cols;

if(cols==1)
{
    //   ratio = ratio*0.89;      ← the entire if-branch body is commented out
}else {
    ratio = ratio/cols;           ← second division
}
```

For `md` (`cols = 1.2`) and `lg` (`cols = 1.61`) the ratio is divided by `cols` **twice** — an
effective `/1.44` and `/2.59`. The `if` branch that would have balanced this is commented out, so
the `else` runs unguarded for every non-`1` bucket.

**Effect on this layer:** on tablets and large phones the solved root font-size is considerably
smaller than one column per viewport, so a `22.5rem` column occupies well under the full width and
you see a large peek of the neighbours on both sides — pronounced at `lg`. It may be deliberate
tuning (the source comment on the `lg` branch reads *"seems like the orientation/landscape rule in
sqr scss making this not work right"*, which suggests it was tuned by eye against that media
query). Either way, **do not size columns by eyeballing a tablet** — check `sm` too, where
`cols == 1` and only one division happens.

### `window.onload` never binds

```js
simulateScreen();
window.onresize = simulateScreen;
window.onload = simulateScreen();   // ← parentheses: invokes now, assigns undefined
```

The parentheses call the function immediately and assign its return value (`undefined`) to
`window.onload`, so no load handler is ever registered. Nothing re-solves the root size once
images, webfonts and late DOM have settled.

**Effect on this layer:** the only pass that runs at startup is the bare `simulateScreen()` call on
line 120, which fires the moment the script tag parses and then waits `500ms` before measuring.
Until it lands, the root font-size is the browser default and every column is a literal 360px wide
— so a snap layout can visibly re-flow about half a second in, and the browser may re-resolve snap
positions underneath a scroll already in progress. The bug is masked in practice because
`onresize` and the `screen.orientation` listener still fire, and both re-solve correctly.

Practical consequences:

* **Put the `<script>` at the end of `<body>`**, after both probes. `simulateScreen()` reaches for
  `document.getElementById('square-root')` synchronously and will throw on a null style tag.
* Expect a brief unscaled first paint. Hide the rail until the first solve completes if that flash
  is unacceptable — you will have to do this yourself; the framework offers no ready hook.

### The re-entrancy guard is about a second wide

`window.simuating` (spelled that way in the source) is set on entry and only cleared in a nested
`setTimeout` after two 500ms waits. Any `resize` or `orientationchange` arriving inside that ~1s
window returns `null` and is dropped, not queued. Rotating a device while a solve is in flight can
therefore leave the root size stale until the next resize event — with snapping columns that shows
up as columns of the wrong width and snap positions that no longer line up with the viewport edges.

### `100vh` and mobile browser chrome

`.scrollsnap-vertical` hard-codes `height: 100vh`. On mobile that is the *large* viewport, measured
with the URL bar retracted, so a column is taller than the visible area while the bar is showing.
Override with `100dvh` in your own stylesheet (as the example does) if you need the column to match
what is actually on screen.

### `overflow-y: scroll` always reserves a gutter

On desktop engines with classic scrollbars, `.scrollsnap-vertical` loses a few pixels of inner
width even when the content fits. Pairing it with `invisible-scrollbar` removes the bar and the
gutter; that pairing is not automatic, so a `.scrollsnap-vertical` without `invisible-scrollbar`
will be measurably narrower than a sibling without it.

### No `scroll-behavior` and no `overscroll-behavior` anywhere

Neither property appears in the framework. Scroll chaining from a column to the page, and jump-cut
versus smooth programmatic scrolling, are entirely yours to configure.

---

## Browser caveats

Verifiable from the CSS and the specifications it relies on:

* **Scrollbar hiding needs both the `-webkit` pseudo-element and the standard property.** They are
  handled by different engine generations; see rule 2 above. Removing either one regresses a real
  browser.
* **`-ms-overflow-style: none`** targets IE11 and pre-Chromium Edge only. It is inert everywhere
  else and costs nothing to keep.
* **`scroll-snap-stop: always`** is the newest thing in the file — Safari only shipped it in 15.4.
  On an engine that lacks it, snapping still works, but a fast flick can travel several columns in
  one gesture. That degrades gracefully; it does not break.
* **`scroll-padding` in `calc()` with a custom property** is invalid at computed-value time when
  the custom property is missing, and the property falls back to its initial `auto`. This is the
  concrete failure mode of loading `dist/scrollsnap.css` without `square-root.css`.
* **`scroll-snap-align` resolves against the nearest ancestor scroll container**, not against the
  element carrying `.scrollsnap-horizontal` / `.scrollsnap-vertical`. In nested scrollers, always
  confirm that the element with the snap-type class is the same element with the `overflow`.
* **`scroll-snap-type` on a non-scrolling box does nothing at all**, silently. `.scrollsnap-horizontal`
  ships no `overflow-x`, so this is the default state until you add one.

---

## Class index

| Class | Element it belongs on | What it does |
| --- | --- | --- |
| `.scrollsnap-horizontal` | the horizontal scroll container | `scroll-snap-type: x mandatory` |
| `.snap-x` | a direct child of the rail | `scroll-snap-align: center`, `scroll-snap-stop: always` |
| `.scrollsnap-vertical` | each column | `scroll-snap-type: y mandatory`, `overflow-y: scroll`, `height: 100vh`, `scroll-padding-top: 0.225` units |
| `.snap-y` | a **direct child** of a `.scrollsnap-vertical` | `scroll-snap-align: start`, `scroll-snap-stop: always` |
| `.invisible-scrollbar` | every scroll container | hides the scrollbar in WebKit/Blink, Gecko and legacy Edge |
| `.rows-1` / `.rows-2` / `.rows-3` | an ancestor that also has `id="layoutLiveWire"` | multiplies the vertical `scroll-padding-top` by 4 / 13 / 14 |

---

*Square Root — ALL1WEB. Author: Neo (N30). Package `@all1web/square-root`,
repo <https://github.com/all1web/square-root>. This document describes `src/_scrollsnap.scss`.*
