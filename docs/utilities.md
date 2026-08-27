# Square Root — Utility & Class Reference

Complete reference for every class emitted by `src/square-root.scss` (which `@import`s
`src/_scrollsnap.scss`). Nothing here is invented: every selector, declaration and comment
below is present in the source.

- Package: `@all1web/square-root`
- Repo: <https://github.com/all1web/square-root>
- Author: Neo / N30 (ALL1WEB)

---

## 1. The unit system in one paragraph

Square Root does not use breakpoints to resize a design. It defines a **canonical device**
(`--macro-width` × `--macro-height` = 360 × 720) and a **finger unit**
(`--micro-width` / `--micro-height` = 60). Every utility is authored as

```css
calc(var(--micro-width) * N * 0.0625rem)
```

`0.0625rem` is `1/16 rem`, so at the browser default root font-size of 16px the raw variable
number reads as **reference pixels**: `--micro-width: 60` → `60 × 0.0625rem` = `3.75rem` = **60px**.
The entire framework is therefore rem-based against a 360px-wide canon.

`square-root.js` then solves for the root font-size at runtime (it measures the `.sqr-macro-rem`
probe and writes `:root { font-size: <ratio>% }` into `<style id="square-root">`) so the 360-wide
canon spans exactly the real viewport width. Because everything is rem, all the classes below
scale in lockstep.

**Every "px at 16px root" value in this document is the *reference* size — the size on the
canonical 360×720 device.** On a real 430px-wide phone the root font-size is scaled up by
`430/360 ≈ 1.194`, so `.sqr-w-1` renders ≈71.6 real px while still occupying exactly the same
*proportion* of the screen. That invariance is the entire point.

---

## 2. CSS custom properties

Declared on `:root` at the top of `square-root.scss`:

```css
:root {
    --macro-width:360;
    --macro-height:720;

    /* Avertage finger 45-52/thumb:72px */
    --micro-width:60;
    --micro-height:60;
}
```

| Property | Default | Unitless? | Consumed by |
|---|---|---|---|
| `--macro-width` | `360` | yes | `.sqr-macro-pixel`, `.sqr-macro-rem` |
| `--macro-height` | `720` | yes | `.sqr-macro-pixel`, `.sqr-macro-rem` |
| `--micro-width` | `60` | yes | `.sqr-micro-*` **and every sizing / spacing / positioning utility**, including all the `-h-` height ones |
| `--micro-height` | `60` | yes | `.sqr-micro-pixel`, `.sqr-micro-rem` **only** |

All four are **unitless numbers**, not lengths. They are always multiplied by `1px` or by
`0.0625rem` inside a `calc()`. Setting `--micro-width: 60px` will break every utility.

### What happens when you override them

**`--macro-width`** is the canon. It is measured at runtime by the JS solver
(`ratio = window.innerWidth / macroRem.offsetWidth`), so overriding it genuinely changes the
design canon:

```css
:root { --macro-width: 320; }   /* .sqr-macro-rem probe becomes 20rem = 320px */
```

Now the solver stretches a 320-wide design to fill the viewport, which makes everything on
screen **larger** (root font-size goes up). A larger `--macro-width` makes everything smaller
and fits more on screen. Note the JS also declares `let idealSqrPixelWidth = 360;` but that
constant is **unused** in the live code path (the only line that referenced it is commented
out), so no JS edit is needed when you override the canon.

**`--macro-height`** is used only by the two macro probe elements. The solver reads
`offsetWidth` only, so changing the height affects nothing except the probes' own box.

**`--micro-width`** is the global scale multiplier for the utility grid. Halving it halves every
`sqr-w-*`, `sqr-h-*`, `sqr-m*`, `sqr-p*`, `-sqr-l-*`, `-sqr-r-*`, `sqr-t-1`, `-sqr-h-screen-*`
and the scroll-snap padding in `_scrollsnap.scss` simultaneously. Do this per-section rather
than globally if you only want a locally denser grid:

```css
.dense-panel { --micro-width: 40; }  /* 40 → .sqr-w-1 is now 2.5rem / 40 reference px */
```

**`--micro-height`** currently affects only `.sqr-micro-pixel` and `.sqr-micro-rem`. It is
**not** used by `.sqr-h-N`, `.sqr-h-1\/2` or `.-sqr-h-screen-N` — those all derive from
`--micro-width`. See [Gotchas](#8-gotchas--known-quirks).

---

## 3. Probe / measurement classes

These four exist to be measured, not to lay anything out. `.sqr-macro-rem` is **required** on
the host page — the JS crashes without it.

| Class | Generated CSS | At 16px root |
|---|---|---|
| `.sqr-macro-pixel` | `width: calc(var(--macro-width) * 1px);`<br>`height: calc(var(--macro-height) * 1px);` | `360px × 720px` — fixed, never scales |
| `.sqr-macro-rem` | `width: calc(var(--macro-width) * 0.0625rem);`<br>`height: calc(var(--macro-height) * 0.0625rem);` | `22.5rem × 45rem` = `360px × 720px` — scales with root |
| `.sqr-micro-pixel` | `width: calc(var(--micro-width) * 1px);`<br>`height: calc(var(--micro-height) * 1px);` | `60px × 60px` — fixed |
| `.sqr-micro-rem` | `width: calc(var(--micro-width) * 0.0625rem);`<br>`height: calc(var(--micro-height) * 0.0625rem);` | `3.75rem × 3.75rem` = `60px × 60px` — scales |

The `pixel` pair is the *intended* physical size; the `rem` pair is the *simulated* size. The
solver's whole job is to make the second equal the viewport. Comparing the two is the debugging
tool: if `.sqr-macro-rem` measures 430 while `.sqr-macro-pixel` measures 360 on a 430px phone,
the solve worked.

> The source comments on `.sqr-macro-rem` read `//22.5` and `//45` — those are the rem values,
> and they are correct.

### Landscape override

```css
@media screen and (orientation:landscape) and (min-width:361px) and (max-width:768px) {
    .sqr-macro-pixel { width: calc(var(--macro-height) * 1px);    height: calc(var(--macro-width) * 1px); }
    .sqr-macro-rem   { width: calc(var(--macro-height) * 0.0625rem); height: calc(var(--macro-width) * 0.0625rem); }
    .sqr-micro-pixel { width: calc(var(--micro-height) * 1px);    height: calc(var(--micro-width) * 1px); }
    .sqr-micro-rem   { width: calc(var(--micro-height) * 0.0625rem); height: calc(var(--micro-width) * 0.0625rem); }
}
```

Inside that window the canon is transposed to **720 × 360**, so `.sqr-macro-rem` measures
`45rem` (720 reference px) and the solver divides the viewport by 720 instead of 360 — the
rotated device is treated as the canon. The lower bound of 361px deliberately excludes
watch-class screens (the source comment cites "320x292=moms apple watch"); the 768px upper
bound excludes tablets.

**Only these four classes are transposed.** Nothing else in the framework is orientation-aware —
`.sqr-w-*` etc. keep using `--micro-width` in landscape.

The same media query also contains `.mobile-right-button { background:red; }`. That is a live
declaration, not a comment — a debugging leftover that will paint any element with the class
`mobile-right-button` red on landscape phones between 361px and 768px. There is no other rule
for `.mobile-right-button` in the framework. Avoid that class name, or override the background.

---

## 4. Sizing utilities

### 4.1 The `@for $i from 1 through 8` loop

Every looped class shares one formula:

```css
calc(var(--micro-width) * N * 0.0625rem)   /*  = 3.75N rem  =  60N reference px  */
```

so the value table is the same for all of them:

| N | rem | Reference px |
|---|---|---|
| 1 | `3.75rem` | 60 |
| 2 | `7.5rem` | 120 |
| 3 | `11.25rem` | 180 |
| 4 | `15rem` | 240 |
| 5 | `18.75rem` | 300 |
| 6 | `22.5rem` | 360 |
| 7 | `26.25rem` | 420 |
| 8 | `30rem` | 480 |

`N = 6` is worth memorising: `22.5rem` is exactly the canonical device width, so `.sqr-w-6` is
a full-bleed card and `.sqr-w-7` / `.sqr-w-8` overflow the canon on purpose. The source comment
above the loop says as much: *"sqr-w used for high number beyond page width to set width of
pagewrapper"*.

### 4.2 Width and height

| Class | Generated CSS (N = 1…8) | Reference px |
|---|---|---|
| `.sqr-w-N` | `width: calc(var(--micro-width) * N * 0.0625rem);` | 60N wide |
| `.sqr-h-N` | `height: calc(var(--micro-width) * N * 0.0625rem);` | 60N tall |

Note that `.sqr-h-N` uses `--micro-width`, **not** `--micro-height`. With the shipped defaults
(both 60) this is invisible; if you override only one of them it is not. See
[Gotchas](#8-gotchas--known-quirks).

Concrete: `.sqr-w-1` → `width: calc(var(--micro-width) * 1 * 0.0625rem)` → `3.75rem` → 60px.
`.sqr-h-8` → `height: 30rem` → 480px.

### 4.3 Fractional / one-off sizes

| Class | Generated CSS | rem | Reference px |
|---|---|---|---|
| `.sqr-h-1\/2` (write `sqr-h-1/2`) | `height: calc(var(--micro-width) * 0.5 * 0.0625rem);` | `1.875rem` | 30 |

---

## 5. Spacing utilities

### 5.1 Looped margin & padding (N = 1…8)

| Class | Generated CSS | Reference px |
|---|---|---|
| `.sqr-mt-N` | `margin-top: calc(var(--micro-width) * N * 0.0625rem);` | 60N |
| `.sqr-mr-N` | `margin-right: calc(var(--micro-width) * N * 0.0625rem);` | 60N |
| `.sqr-mx-N` | `margin-left: …;`<br>`margin-right: calc(var(--micro-width) * N * 0.0625rem);` | 60N each side |
| `.sqr-px-N` | `padding-left: …;`<br>`padding-right: calc(var(--micro-width) * N * 0.0625rem);` | 60N each side |
| `.sqr-pt-N` | `padding-top: calc(var(--micro-width) * N * 0.0625rem);` | 60N |
| `.sqr-pl-N` | `padding-left: calc(var(--micro-width) * N * 0.0625rem);` | 60N |

There is **no** `sqr-mb-N`, `sqr-ml-N`, `sqr-my-N`, `sqr-py-N`, `sqr-pb-N` or `sqr-pr-N`.
See [section 7](#7-classes-that-are-commented-out--do-not-exist).

### 5.2 Fractional spacing one-offs

| Class | Write it as | Generated CSS | rem | Reference px |
|---|---|---|---|---|
| `.sqr-mr-1\/2` | `sqr-mr-1/2` | `margin-right: calc(var(--micro-width) * 0.0625rem * 0.5);` | `1.875rem` | 30 |
| `.-sqr-ml-1\/2:first-child` | `-sqr-ml-1/2` | `margin-left: calc(var(--micro-width) * 0.0625rem * -0.5);` | `-1.875rem` | −30 |
| `.sqr-pl-1-3\/4` | `sqr-pl-1-3/4` | `padding-left: calc(var(--micro-width) * 1.75 * 0.0625rem);` | `6.5625rem` | 105 |

**`-sqr-ml-1/2` only applies to a first child.** The selector is
`.-sqr-ml-1\/2:first-child` — putting the class on the second, third … sibling does nothing.
It is the counterpart to `sqr-mr-1/2`: give every card a 30px right gutter, then pull the
leading card back by half a unit so the row starts flush against the edge.

```html
<div class="scrollsnap-horizontal invisible-scrollbar flex overflow-x-auto">
  <div class="snap-x sqr-w-6 sqr-mr-1/2 -sqr-ml-1/2">card one</div>
  <div class="snap-x sqr-w-6 sqr-mr-1/2 -sqr-ml-1/2">card two</div>
</div>
```

Because the `/` must be escaped in CSS, these class names are written **unescaped in HTML**
(`class="sqr-mr-1/2"`) and escaped only in the stylesheet.

---

## 6. Positioning utilities

### 6.1 Looped negative offsets (N = 1…8)

| Class | Generated CSS | rem | Reference px |
|---|---|---|---|
| `.-sqr-l-N` | `left: calc(var(--micro-width) * N * -0.0625rem);` | `-3.75N rem` | −60N |
| `.-sqr-r-N` | `right: calc(var(--micro-width) * N * -0.0625rem);` | `-3.75N rem` | −60N |

Note the sign lives in the multiplier (`-0.0625rem`), so these are **always negative** — they
pull an element outside its positioned ancestor. There are no positive `sqr-l-N` / `sqr-r-N`
counterparts (commented out — see section 7). Both require the element to be
`position: absolute | relative | fixed | sticky`; Square Root does not set that for you.

### 6.2 Positive top offset

| Class | Generated CSS | rem | Reference px |
|---|---|---|---|
| `.sqr-t-1` | `top: calc( ( var(--micro-width) * 1 * 0.0625rem) );` | `3.75rem` | 60 |

Only `-1` exists. There is no `sqr-t-2`, no `sqr-b-*`, and no positive left/right.

---

## 7. Viewport-relative heights

These subtract whole finger units from the full viewport height — the standard "screen minus a
60px header" layout.

| Class | Generated CSS | Resolves to (16px root) |
|---|---|---|
| `.-sqr-h-screen-1` | `height: calc( 100vh - ( var(--micro-width) * 1 * 0.0625rem) );` | `100vh - 3.75rem` (`100vh - 60px`) |
| `.-sqr-h-screen-2` | `height: calc( 100vh - ( var(--micro-width) * 2 * 0.0625rem) );` | `100vh - 7.5rem` (`100vh - 120px`) |
| `.-sqr-h-screen-3` | `height: calc( 100vh - ( var(--micro-width) * 3 * 0.0625rem) );` | `100vh - 11.25rem` (`100vh - 180px`) |
| `.-sqr-h-screen-4` | `height: calc( 100vh - ( var(--micro-width) * 4 * 0.0625rem) );` | `100vh - 15rem` (`100vh - 240px`) |
| `.-sqr-h-screen-5` | `height: calc( 100vh - ( var(--micro-width) * 4 * 0.0625rem) );` | `100vh - 15rem` (`100vh - 240px`) |

> ### ⚠ `-sqr-h-screen-5` is a duplicate of `-sqr-h-screen-4`
>
> Read the last row again. The source (`square-root.scss`, lines 67–69) is:
>
> ```scss
> .-sqr-h-screen-5 {
>     height: calc( 100vh - ( var(--micro-width) * 4  *  0.0625rem) );
> }
> ```
>
> The multiplier is **4**, not 5. `.-sqr-h-screen-5` subtracts 240 reference px, exactly like
> `.-sqr-h-screen-4`, not the 300px its name implies. This is almost certainly a copy-paste
> slip rather than intent (1, 2, 3 and 4 all follow the name). Until it is fixed, do not use
> `-sqr-h-screen-5` expecting a fifth unit — write `height: calc(100vh - 18.75rem)` inline, or
> patch the SCSS.

Note also that these use `100vh`, not `100dvh` / `100svh`, so on mobile browsers with a
collapsing URL bar the reserved height is the *large* viewport. If your header hides under the
browser chrome, that is why.

---

## 8. Responsive helpers

Square Root deliberately has almost no breakpoints — the JS solve replaces them. These five are
the exceptions, and they exist for the two ends the solve does not cover well: watches, and
"anything bigger than a watch".

### 8.1 Watch tier — `@media (max-width: 320px)`

| Write in HTML | Selector in CSS | Generated CSS |
|---|---|---|
| `2xs:hide` | `.\32xs\:hide` | `display: none;` |
| `2xs:hidden` | `.\32xs\:hidden` | `display: none;` |
| `2xs:block` | `.\32xs\:block` | `display: block;` |

`2xs:hide` and `2xs:hidden` are aliases in a shared rule — identical behaviour, pick either.
`\32` is the CSS hex escape for the digit `2` (a class name cannot start with a bare digit);
in HTML you just write `class="2xs:hide"`.

The source labels this tier "watch rules". The comment block above the landscape media query
names a concrete target: `//320x292=moms apple watch`.

### 8.2 Everything above a watch — `@media (min-width: 321px)`

| Write in HTML | Selector in CSS | Generated CSS | rem | Reference px |
|---|---|---|---|---|
| `xs:sqr-my-1/2` | `.\xs\:sqr-my-1\/2` | `margin-top: calc(var(--micro-width) * 0.0625rem * 0.25);`<br>`margin-bottom: calc(var(--micro-width) * 0.0625rem * 0.25);` | `0.9375rem` | 15 top & bottom |
| `xs:sqr-mx-1/4` | `.\xs\:sqr-mx-1\/4` | `margin-left: calc(var(--micro-width) * 0.0625rem * 0.25);`<br>`margin-right: calc(var(--micro-width) * 0.0625rem * 0.25);` | `0.9375rem` | 15 each side |

> **Naming caveat:** `xs:sqr-my-1/2` multiplies by **0.25**, not 0.5 — it is a *quarter* unit
> (15px), identical in magnitude to `xs:sqr-mx-1/4`. The name says half. Trust the value in the
> table, not the class name. (`xs:sqr-mx-1/4` is correctly named.)

Both selectors use `\x`, which CSS resolves to a literal `x` because `x` is not a hex digit — so
the class names really are `xs:sqr-my-1/2` and `xs:sqr-mx-1/4`. They are valid and they do work;
the escape is simply redundant.

Also note the tiers do not tile cleanly with the JS buckets: the CSS uses `≤320` / `≥321`, while
`square-root.js` buckets `width>=320 && width<=640` as `sm`, `>640 && <768` as `md` (`cols=1.2`),
`>=768 && <1024` as `lg` (`cols=1.61`) and `>=1024` as `xl`. A 320px screen matches the CSS
watch tier *and* the JS `sm` bucket.

### 8.3 Type scale

| Class | Generated CSS | Reference px |
|---|---|---|
| `.text-2xs` | `font-size: 0.65rem;` | 10.4 |

The only typographic class in the framework, and the only one that is **not** namespaced with
`sqr-`. It is expressed in plain `rem`, so it scales with the solve like everything else. If you
also use Tailwind, be aware this is a bare `text-2xs` and will collide with a same-named
Tailwind theme extension.

---

## 9. Scroll-snap classes (`_scrollsnap.scss`)

`square-root.scss` does `@import "_scrollsnap";`, so these ship in the compiled CSS.

| Class | Generated CSS |
|---|---|
| `.invisible-scrollbar` | `-ms-overflow-style: none;` `scrollbar-width: none;` plus `.invisible-scrollbar::-webkit-scrollbar { display: none; }` |
| `.scrollsnap-horizontal` | `scroll-snap-type: x mandatory;` |
| `.scrollsnap-horizontal .snap-x` | `scroll-snap-align: center;` `scroll-snap-stop: always;` |
| `.scrollsnap-vertical` | `scroll-snap-type: y mandatory;` `overflow-y: scroll;` `height: 100vh;` `scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225);` |
| `.scrollsnap-vertical > .snap-y` | `scroll-snap-align: start;` `scroll-snap-stop: always;` |

`scroll-padding-top` on `.scrollsnap-vertical` = `0.84375rem` = **13.5 reference px**.

Two structural details that bite:

- `.snap-x` is matched as a **descendant** (`.scrollsnap-horizontal .snap-x`) — any depth works.
- `.snap-y` is matched as a **direct child** (`.scrollsnap-vertical > .snap-y`) — wrap it in
  anything and the snap silently stops working.
- `.scrollsnap-vertical` hard-sets `height: 100vh`. It is a full-screen scroller by definition.

### Host-app-specific overrides

```css
#layoutLiveWire.rows-1 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 4); }
#layoutLiveWire.rows-2 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 13); }
#layoutLiveWire.rows-3 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 14); }
```

| Selector | scroll-padding-top | Reference px |
|---|---|---|
| `#layoutLiveWire.rows-1 .scrollsnap-vertical` | `3.375rem` | 54 |
| `#layoutLiveWire.rows-2 .scrollsnap-vertical` | `10.96875rem` | 175.5 |
| `#layoutLiveWire.rows-3 .scrollsnap-vertical` | `11.8125rem` | 189 |

These are keyed to an `id="layoutLiveWire"` element from the originating Livewire app, not a
general Square Root API. The multipliers (4, 13, 14) are hand-tuned to that app's header
heights and are not derivable from the unit system. Treat them as inert unless you happen to
have that ID, and expect to retune the numbers if you adopt the pattern.

---

## 10. Classes that are commented out — do NOT exist

There is one large commented block **inside** the `@for` loop (lines 100–133 of
`square-root.scss`). None of the following are generated. Using them in HTML does nothing —
silently, with no error.

| Not generated | What it would have done |
|---|---|
| `.sqr-my-N` | `margin-top` + `margin-bottom` |
| `.sqr-py-N` | `padding-top` + `padding-bottom` |
| `.sqr-pb-N` | `padding-bottom` |
| `.sqr-l-N` | `left` (positive) |
| `.sqr-r-N` | `left` — note the commented source sets `left`, not `right`; the rule was buggy as written |
| `.sqr-ml-N` | `margin-left` (positive) |
| `.-sqr-ml-N` | negative `margin-left` |
| `.-sqr-mr-N` | negative `margin-right` |

A second `.sqr-pt-#{$i}` block also sits inside that comment. That is a harmless duplicate —
`.sqr-pt-N` **is** generated, from the live rule earlier in the loop.

If you need any of the above, either uncomment the block in the SCSS (they follow the same
`3.75N rem` formula and will Just Work — except fix `.sqr-r-N` to use `right`), or write the
`calc()` inline:

```css
.my-thing { margin-bottom: calc(var(--micro-width) * 2 * 0.0625rem); } /* = sqr-mb-2 */
```

Also absent from the framework entirely (never written, not even commented): `sqr-mb-N`,
`sqr-pr-N`, `sqr-b-N`, `sqr-t-N` for N > 1, any positive `sqr-l/r-N`, and any `min-`/`max-`
variants.

---

## 11. Classes Square Root uses but does NOT define

The required host-page markup is:

```html
<head>
  <style id="square-root"></style>
  <link rel="stylesheet" href="square-root.css">
</head>
<body>
  <div class="fixed invisible sqr-macro-pixel"></div>
  <div class="fixed invisible sqr-macro-rem"></div>
  <!-- your app -->
  <script src="square-root.js"></script>
</body>
```

`fixed` and `invisible` are **not** in `square-root.scss` — they are Tailwind classes
(`position: fixed` and `visibility: hidden`). If you are not using Tailwind you must supply
them yourself:

```css
.fixed     { position: fixed; }
.invisible { visibility: hidden; }
```

Use `visibility: hidden`, **not** `display: none`. The solver reads `macroRem.offsetWidth`, and
a `display: none` element measures 0 — the ratio becomes `Infinity` and the page collapses.
`position: fixed` matters too: it takes the probe out of flow so no parent's width can
constrain it.

`.sqr-macro-rem` is mandatory. `.sqr-macro-pixel` is queried by the JS
(`document.querySelector('.sqr-macro-pixel')`) but its value is only used by commented-out code;
include it anyway, since `querySelector` returning `null` is harmless today but the element is
the reference ruler you will want when debugging.

---

## 12. Gotchas & known quirks

Honest list of things in the source that will surprise you.

**1. `-sqr-h-screen-5` == `-sqr-h-screen-4`.** Multiplier is `4` in both. Detailed in
[section 7](#7-viewport-relative-heights).

**2. `xs:sqr-my-1/2` is a quarter unit, not a half.** Multiplier is `0.25` (15px), same as
`xs:sqr-mx-1/4`. Detailed in [section 8.2](#82-everything-above-a-watch--media-min-width-321px).

**3. Height utilities are driven by `--micro-width`.** `.sqr-h-N`, `.sqr-h-1/2` and
`.-sqr-h-screen-N` all read `var(--micro-width)`. `--micro-height` reaches only
`.sqr-micro-pixel` / `.sqr-micro-rem`. With the shipped 60/60 defaults this is a no-op, but if
you override `--micro-height` expecting vertical rhythm to follow, it will not.

**4. `ratio` is divided by `cols` twice on md/lg.** In `square-root.js`:

```js
ratio = width/simulatedWidth;
if(width < 1024 ) {
    ratio = ratio/cols;
    if(cols==1) {
        // body is commented out
    } else {
        ratio = ratio/cols;
    }
}
```

For `md` (`cols = 1.2`) and `lg` (`cols = 1.61`) the ratio is divided **twice** — effectively
`/cols²` (1.44 and ≈2.59). The `if(cols==1)` branch's only statement
(`ratio = ratio*0.89;`) is commented out, so at `cols == 1` the branch is a no-op and the
single division by 1 leaves the ratio unchanged. The double division may well be deliberate
tuning — it is what makes the next card peek in at the edge on tablets — but it is not what the
code reads like on first pass. Do not "fix" it without re-testing on a 768–1023px device.

**5. `window.onload = simulateScreen();` invokes immediately.** The trailing `()` calls the
function and assigns its return value (`undefined`) to `window.onload`, so **the load handler
never binds**. This is masked because `simulateScreen()` is already called directly on the line
above, and because `window.onresize` and the `screen.orientation` change listener still fire.
The correct form would be `window.onload = simulateScreen;` (no parentheses). Left as-is here
because changing it alters the number of solve passes on first paint.

**6. `screen.orientation` is assumed to exist.** The listener is attached unconditionally;
older Safari without `screen.orientation` will throw at that line.

**7. `document.getElementById('square-root')` is assumed to exist.** No null guard — if the
`<style id="square-root">` tag is missing, the first line of `simulateScreen()` throws and
nothing scales.

**8. The solve is asynchronous with two 500ms `setTimeout`s.** The root font-size is not correct
for roughly the first half-second, and `window.simuating` (spelled with one `l` — that is the
real global name) stays `true` for ~1s afterwards, during which resize events are ignored.
Expect a visible reflow on load and a lag during drag-resize.

**9. `.mobile-right-button` is painted red** inside the landscape media query. Debug leftover;
see [section 3](#landscape-override).

**10. `text-2xs` is not namespaced** and may collide with Tailwind or other utility CSS.

---

## 13. Quick lookup — every class in the framework

Sizing: `sqr-w-1`…`sqr-w-8`, `sqr-h-1`…`sqr-h-8`, `sqr-h-1/2`

Spacing: `sqr-mt-1`…`8`, `sqr-mr-1`…`8`, `sqr-mx-1`…`8`, `sqr-px-1`…`8`, `sqr-pt-1`…`8`,
`sqr-pl-1`…`8`, `sqr-mr-1/2`, `-sqr-ml-1/2` (first-child only), `sqr-pl-1-3/4`

Positioning: `sqr-t-1`, `-sqr-l-1`…`8`, `-sqr-r-1`…`8`

Viewport: `-sqr-h-screen-1`…`-sqr-h-screen-5` (4 and 5 identical)

Probes: `sqr-macro-pixel`, `sqr-macro-rem`, `sqr-micro-pixel`, `sqr-micro-rem`

Responsive: `2xs:hide`, `2xs:hidden`, `2xs:block`, `xs:sqr-my-1/2`, `xs:sqr-mx-1/4`

Type: `text-2xs`

Scroll: `invisible-scrollbar`, `scrollsnap-horizontal`, `scrollsnap-vertical`, `snap-x`, `snap-y`

Not defined here, required from Tailwind or your own CSS: `fixed`, `invisible`
