# How Square Root works

Square Root is a mobile-first layout framework by [ALL1WEB](https://github.com/all1web/square-root) (author: Neo / N30). It is two files that work as one mechanism:

- `src/square-root.scss` — a set of utilities that express every size as a multiple of a **finger unit**, authored against a **canonical device**.
- `src/square-root.js` — a solver that, at runtime, picks the root `font-size` that makes that canonical device exactly fill the real viewport.

This document explains the mechanism, line by line, including the parts that are rough. If you only want the setup snippet, jump to [Required host-page setup](#required-host-page-setup).

---

## 1. Why breakpoints fail for this goal

The usual responsive toolkit answers the question *"what should I show at this width?"* Square Root is trying to answer a different question: *"how do I show **the same design**, in the same proportions, on every phone?"*

Consider a card layout authored on a 360 px-wide phone. On a 430 px-wide Pro Max, with ordinary CSS:

- Text set in `px` or `rem` stays the same physical size.
- Padding set in `px` stays the same.
- A `w-full` card grows by 70 px.
- A fixed-height header does not grow at all.

The result is not "the same design, bigger." It is a **differently proportioned** design: the card is 19% wider but the type, the gutters and the header are unchanged, so the ratio between every pair of elements has shifted. Vertical rhythm drifts against the taller screen. Anything you tuned by eye on the 360 device — how much of the next card peeks in, where the fold lands, how much breathing room sits under a heading — is now wrong, and wrong by a different amount on every handset.

A breakpoint cannot fix this, because breakpoints are *discrete* and phone widths are *continuous*. Adding `sm:`/`md:` variants gives you three or four hand-tuned designs and linear interpolation between none of them. You would need a breakpoint per device to hold proportion, which is the same as having none.

Fluid type (`clamp()`, `vw` units) gets closer, but you have to opt into it per property, and mixing `vw` sizes with `px` sizes reintroduces the same drift at a smaller scale.

Square Root's answer: **scale is not a per-property decision, it is a global one.** Author the whole design once, against one device, in one unit — then change that unit's size so the design fits.

---

## 2. The canonical device and the finger unit

Everything starts with four numbers, defined at the top of `square-root.scss`:

```scss
:root {
    --macro-width:360;
    --macro-height:720;

    /* Avertage finger 45-52/thumb:72px */
    --micro-width:60;
    --micro-height:60;
}
```

### The macro: 360 × 720

This is the **canonical device** — the "lens", as the source comments call it: *"size of lense/ topfold of page minimum/Largest Unit that we want to fit in screen from a mobile first approach"*.

360 × 720 CSS px is a deliberately conservative modern-phone frame. It is the width at which the design is authored and the width the solver will make fill the screen. Nothing on a page has to be 360 wide; the number's job is to be the **reference frame** for the ratio.

### The micro: 60 — the finger unit

60 is the **finger unit**: the smallest unit that makes sense when a fingertip is the pointing device. The source cites the Smashing Magazine research on ideal mobile touchscreen target sizes:

```scss
/*https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/*/
```

and records the finding inline: **average finger 45–52 px, thumb 72 px**. 60 sits above the finger range and below the thumb figure — comfortably tappable without wasting a screen that is only six units wide.

Which is the second reason 60 was chosen: the two numbers are commensurate.

| | in finger units |
|---|---|
| `--macro-width` 360 | **6** |
| `--macro-height` 720 | **12** |

The canonical device is exactly a 6 × 12 grid of finger units. Every layout decision in Square Root is therefore a whole (or simple fractional) number of thumbs, and the whole page is six thumbs wide by construction.

> **Stale comment warning:** in `.sqr-micro-rem` the source annotates the value `//4.5rem`. The arithmetic is `60 × 0.0625rem = 3.75rem`. The `4.5rem` comment is stale; the computed value is 3.75rem. The macro comments (`//22.5`, `//45`) are correct.

---

## 3. Why `0.0625rem` is the magic multiplier

Every utility in the framework has the same shape:

```scss
@for $i from 1 through 8 {
    .sqr-w-#{$i} {
        width: calc(var(--micro-width) * #{$i} *  0.0625rem);
    }
    ...
}
```

`0.0625` is `1 / 16`. Since the browser default root font-size is 16 px, `0.0625rem` is **one reference pixel** — one pixel *as measured on the canonical device*.

That one constant is what lets the CSS variables be plain, readable integers:

```
--macro-width: 360     →  360 * 0.0625rem = 22.5rem  = 360px at a 16px root
--macro-height: 720    →  720 * 0.0625rem = 45rem    = 720px at a 16px root
--micro-width: 60      →   60 * 0.0625rem =  3.75rem =  60px at a 16px root
```

So you read `--micro-width: 60` as "60 pixels" and you are right — *at the canonical scale.* The variables are authored in reference pixels; the multiplier converts them to rem at the point of use; and because the output is rem, the browser's root font-size becomes a single global scale knob for the entire framework.

This is the pivot of the whole design:

> The design is **authored in pixels** (readable, device-like numbers) but **rendered in rem** (globally scalable). `0.0625rem` is the exchange rate between the two.

The full utility set follows the pattern — `sqr-w-N`, `sqr-h-N`, `sqr-mt-N`, `sqr-mr-N`, `sqr-mx-N`, `sqr-px-N`, `sqr-pt-N`, `sqr-pl-N` for `N` in 1–8, plus negative-offset helpers `-sqr-l-N` / `-sqr-r-N`, fractional one-offs (`sqr-h-1/2`, `sqr-mr-1/2`, `-sqr-ml-1/2`, `sqr-pl-1-3/4`), and viewport-minus-N-units heights (`-sqr-h-screen-1` … `-sqr-h-screen-5`, built as `calc(100vh - (var(--micro-width) * N * 0.0625rem))`).

**Consequence for adopters:** only rem-based CSS participates in the scaling. Any `px` value you write yourself — a border, a font-size, a shadow offset — will *not* scale with the layout and will drift exactly the way section 1 describes. If you want it to scale, express it as `calc(var(--micro-width) * <fraction> * 0.0625rem)`, or in plain `rem`.

---

## 4. The probes

The framework defines four measuring elements. Two are pixel-based, two rem-based:

```scss
.sqr-macro-pixel {   /* 360 × 720 real CSS px — never scales */
    width: calc(var(--macro-width) * 1px);
    height: calc(var(--macro-height) * 1px);
}
.sqr-macro-rem {     /* 22.5rem × 45rem — scales with the root font-size */
    width: calc(var(--macro-width) * 0.0625rem);
    height: calc(var(--macro-height) * 0.0625rem);
}
.sqr-micro-pixel { width: calc(var(--micro-width) * 1px);      height: calc(var(--micro-height) * 1px); }
.sqr-micro-rem   { width: calc(var(--micro-width) * 0.0625rem); height: calc(var(--micro-height) * 0.0625rem); }
```

Two of them are placed in the host page as invisible probes:

```html
<div class="fixed invisible sqr-macro-pixel"></div>
<div class="fixed invisible sqr-macro-rem"></div>
```

### Why two?

They differ in exactly one way — `1px` versus `0.0625rem` — and that difference is the whole point.

- **`.sqr-macro-pixel` is the fixed reference.** It is 360 × 720 real CSS pixels and stays that size no matter what the solver writes into the root font-size. It is the "what the canonical device actually is" yardstick, unaffected by the scaling.
- **`.sqr-macro-rem` is the measuring stick.** It is the same canonical 360 × 720 *expressed in the framework's own unit system*. Its rendered width therefore answers the question the solver actually needs answered: **"at the current root font-size, how many real pixels wide is the canonical device?"**

That is why the rem probe is the one the solver reads. It is not measuring the screen; it is measuring **the framework**. Everything on the page is built from the same `0.0625rem`-scaled unit as the rem probe, so if the probe is made to fit the viewport, every utility on the page fits in proportion with it — by construction, not by coincidence.

The pixel probe is currently *reference only*. `square-root.js` does look it up:

```js
let macroPx = document.querySelector('.sqr-macro-pixel');
```

but every use of it is commented out — the block above it records an abandoned attempt to derive the ratio arithmetically (`ratio2 = (intendedWidthFeel / width) / 0.0625`) instead of measuring, to avoid waiting on browser layout. Keep the element in your page: it costs nothing, it is part of the documented setup, and it is the natural place to hook a debug overlay comparing intended-vs-actual scale.

### The probes must remain measurable

`offsetWidth` is read from the rem probe, so the probe must have a layout box. `.fixed` and `.invisible` are **not defined by `square-root.scss`** — they come from your utility layer (they are Tailwind's `position: fixed` and `visibility: hidden`). Both are chosen precisely because they hide the element while keeping it laid out. If you substitute `display: none`, `offsetWidth` becomes `0`, `ratio` becomes `Infinity`, and the page collapses. If you do not have Tailwind, define them yourself:

```css
.fixed     { position: fixed; }
.invisible { visibility: hidden; }
```

---

## 5. The solve loop

The whole solver is `simulateScreen()` in `square-root.js`. In order:

### Step 0 — re-entrancy guard

```js
if(window.simuating) return null;
window.simuating = true;
```

(The typo — one `l` — is in the source. It is a real global, spelled that way; see [Re-entrancy](#9-re-entrancy-resize-and-orientation).)

### Step 1 — reset to a known baseline

```js
let squareRootStyleTag = document.getElementById('square-root');
squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");
```

The solver owns a `<style id="square-root">` tag in the host page and rewrites its contents. Resetting to `100%` puts the root font-size back to the browser default so the probe measures at the **canonical baseline** — 22.5rem × 16px = 360px — rather than at whatever scale the previous solve left behind. Without this reset, each run would measure the output of the last run and the ratio would compound.

### Step 2 — wait for reflow, then measure

```js
setTimeout(function(){
    let macroRem = document.querySelector('.sqr-macro-rem');
    let simulatedWidth = macroRem.offsetWidth;
    let width = window.innerWidth;
    ...
```

**Why the timeout matters.** Writing `innerHTML` on the style tag only invalidates layout; the browser has not recomputed anything yet. `offsetWidth` is a forced-synchronous-layout read, so in principle it flushes — but the reset changes the *root font-size*, which invalidates every rem length on the page, and the source treats that as something to let the browser settle rather than race. The 500 ms is a deliberately generous "let it reflow" pause, not a tuned number. The author's own comment on the abandoned pixel-math approach names the problem directly: *"browser lags and has to calculate at the time its rendered."*

So `simulatedWidth` is the **live rendered width of the canonical device at a 16 px root** — normally 360, but *not* always (see the landscape swap in §8, and page zoom or a user-set default font size, both of which this design absorbs correctly precisely because it measures rather than assumes).

### Step 3 — bucket the screen

```js
let screen='xs';
let cols =1;
if(width>=320 && width<=640) { screen='sm'; }
else if(width>640 && width<768) { screen='md'; cols=1.2; }
else if(width>=768 && width<1024) { screen='lg'; cols=1.61; }
else if(width>=1024 ) { screen='xl'; }
```

See §7.

### Step 4 — solve for the ratio

```js
let ratio = width/simulatedWidth;
if(width < 1024 ) {
    ratio = ratio/cols;
    if(cols==1) {
        // ratio = ratio*0.89;   ← body commented out in source
    } else {
        ratio = ratio/cols;
    }
} else {
    simulatedWidth = parseInt(width/simulatedWidth)*simulatedWidth;
    ratio = width/simulatedWidth;
}
```

The core is one line: **`ratio = viewportWidth / canonicalWidthAsRendered`**. On a phone with `cols === 1` that is the entire computation. The rest is the peek adjustment (§7) and the desktop column fit (§8).

### Step 5 — write the answer

```js
squareRootStyleTag.innerHTML = (" :root { font-size:"+ ratio*100 +"%; } ");
```

`font-size` on `:root` as a percentage is a percentage of the browser default (16 px). Writing `ratio * 100` therefore sets the root to `ratio × 16` px — and since the rem probe is 22.5rem, its new rendered width is `22.5 × ratio × 16 = 360 × ratio = viewportWidth`. The canonical device now spans the viewport exactly, and every `0.0625rem`-scaled utility on the page moved with it.

### Step 6 — verify, release the guard

```js
    setTimeout(function(){
        macroRem = document.querySelector('.sqr-macro-rem');
        let newSimulatedWidth = macroRem.offsetWidth;
        let newSimulatedHeight = macroRem.offsetHeight;
        console.log("New Simulated Ratio: "+ratio+"% "+simulatedWidth+"<==>"+newSimulatedWidth);
        window.simuating = false;
    },500);
```

The second nested 500 ms timeout exists for the same reflow reason as the first: the new font-size has just been written, so the probe has to be re-laid-out before re-measuring. This is a **verification read** — `newSimulatedWidth` is logged so you can confirm it matches `window.innerWidth`, and nothing is done with it. It is also where the guard is released, which means the guard is held for roughly **one full second per solve**.

(The log label says `%` but prints the raw ratio, e.g. `1.19444` not `119.444`.)

---

## 6. Worked example: portrait phones

Assume the browser default 16 px root and a portrait viewport, so the rem probe measures 360 and every width below falls in the `sm` bucket with `cols = 1`.

| Viewport `innerWidth` | Probe `offsetWidth` | `ratio` | Root font-size written | Root in px | Canon (22.5rem) renders as | Finger unit (3.75rem) renders as |
|---|---|---|---|---|---|---|
| 320 | 360 | 320/360 = 0.8889 | `88.889%` | 14.222 | **320 px** ✓ | 53.3 px |
| 360 | 360 | 360/360 = 1.0000 | `100%` | 16.000 | **360 px** ✓ | 60.0 px |
| 375 | 360 | 375/360 = 1.0417 | `104.167%` | 16.667 | **375 px** ✓ | 62.5 px |
| 414 | 360 | 414/360 = 1.1500 | `115%` | 18.400 | **414 px** ✓ | 69.0 px |
| 430 | 360 | 430/360 = 1.1944 | `119.444%` | 19.111 | **430 px** ✓ | 71.7 px |

The canonical device spans the viewport exactly at every width — that is the invariant. And the finger unit tracks it: on a 430 px Pro Max a `sqr-w-1` box is 71.7 real pixels, on a 320 px handset it is 53.3, and in both cases it is **exactly one sixth of the screen width**. Proportion is preserved; absolute size follows the device, which is what you want, because a bigger phone is held at the same distance by the same hand.

Note the 320 case: the finger unit lands at 53.3 px, inside the 45–52 px "average finger" band the framework cites (just above it). That is the low end of the design's comfort envelope, and it is why 60 rather than 45 was chosen for the canonical unit — the scale-down has to stay tappable.

---

## 7. Screen buckets, the `cols` factor, and the "peek" cue

| Bucket | Width range | `cols` | Source comment |
|---|---|---|---|
| `xs` | below 320 | 1 | watch territory (`2xs 0-320 watch`) |
| `sm` | 320 – 640 inclusive | 1 | phones |
| `md` | 641 – 767 | **1.2** | `phone-modern` / small tablet |
| `lg` | 768 – 1023 | **1.61** | tablet |
| `xl` | 1024 and up | 1 (unused) | takes the desktop branch instead |

`cols` is not a column count. It is a **deliberate shrink factor**: dividing the ratio makes the root font-size smaller, which makes the canonical device render narrower than the viewport, which means **more than one canonical column fits on screen**.

That is the point. Square Root pairs with the horizontal snap utilities in `_scrollsnap.scss`:

```scss
.scrollsnap-horizontal { scroll-snap-type: x mandatory; }
.scrollsnap-horizontal .snap-x { scroll-snap-align: center; scroll-snap-stop: always; }
```

A card deck laid out this way is a row of canonical-width cards. If a card exactly fills the screen, the user sees a single full-bleed panel with **no affordance** — nothing on screen says "there is more to the side." Shrink the scale slightly and the edge of the next card intrudes at the viewport boundary. That sliver is the **peek cue**: the entire, unambiguous, zero-chrome signal that the deck scrolls horizontally.

On phones (`cols === 1`) the peek is currently **not applied**. The intended mechanism is right there in the source, commented out:

```js
if(cols==1) //1 && width>320 && width< 1024 ) /* HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A CLASS ON <body> like: .full-screen */
{
    //This baiscally further resized the screen smaller so the tip of the right card shows so that
    // user knows they can scroll to the right/left horizontally
 //   ratio = ratio*0.89;
}
```

`× 0.89` would render the canon at 89% of the viewport, leaving an 11% sliver. It is disabled because it needs an opt-out — the author's note proposes a `.full-screen` class on `<body>` — and no design that wants a genuinely full-bleed first panel should be forced into a peek. Re-enabling it is a one-line change, but you inherit the missing opt-out with it.

The `lg` factor carries a warning from the author:

```js
cols=1.61;//seems like the orientation/landscape rule in sqr scss making this not work right
```

That is real: the `lg` bucket starts at 768 and the landscape media query (§8) runs up to and including 768, so at exactly 768 px in landscape the probe measures 720 rather than 360 and the arithmetic changes underneath the factor. Treat `lg` as the least settled bucket.

A larger 2xl bucket (`cols = 2.1`) exists as commented-out source and is **not active**:

```js
/* }else if(width>=1280 && width<1536) {
    screen='2xl';
    cols=2.1;
}else {
    cols=2.1;
}*/
```

---

## 8. Desktop: flooring to whole columns

At 1024 px and up the goal changes. A desktop viewport is several canonical devices wide, and a fractional column at the right edge looks like a mistake rather than a peek. So the desktop branch **floors to a whole number of columns and then stretches to fill**:

```js
simulatedWidth = parseInt(width/simulatedWidth)*simulatedWidth;
ratio = width/simulatedWidth;
```

Read it in two moves. `parseInt(width / simulatedWidth)` truncates to the number of whole canonical columns that fit. Multiplying back gives the width those columns occupy at the current scale. Dividing the viewport by *that* gives the scale-up that closes the leftover gap by making each column slightly wider.

### Worked example: 1440 px

```
probe at 100% root          = 360
parseInt(1440 / 360)        = 4          (4 whole canonical columns fit)
simulatedWidth              = 4 × 360    = 1440
ratio                       = 1440 / 1440 = 1
root font-size written      = 100%       (16px)
canonical column renders as = 22.5rem    = 360px
4 × 360                     = 1440       ← exact fill, no ragged edge
```

1440 is the clean case. A messier one:

```
1280:  parseInt(1280/360) = 3  →  3 × 360 = 1080  →  ratio = 1280/1080 = 1.1852
       root = 118.52% = 18.96px  →  column = 22.5rem = 426.7px  →  3 × 426.7 = 1280 ✓

1024:  parseInt(1024/360) = 2  →  2 × 360 =  720  →  ratio = 1024/720  = 1.4222
       root = 142.22% = 22.76px  →  column = 22.5rem = 512.0px  →  2 × 512.0 = 1024 ✓
```

So on desktop the columns get *wider than canonical* to tile exactly, rather than staying 360 and leaving a gutter. The trade-off is visible at bucket edges: just below 1440 you get 3 fat columns, just above you get 4 narrower ones, and the jump at the boundary is abrupt. That is inherent to whole-column flooring, not a bug.

Note that `screen = 'xl'` and `cols` are computed but unused on this branch — the desktop path ignores `cols` entirely.

---

## 9. Landscape: swapping the canon

`square-root.scss` ends with a media query that rotates the canonical device:

```scss
@media screen and (orientation:landscape) and (min-width:361px) and (max-width:768px) {
    .sqr-macro-pixel {
        width: calc(var(--macro-height) * 1px);    // 720
        height: calc(var(--macro-width) * 1px);    // 360
    }
    .sqr-macro-rem {
        width: calc(var(--macro-height) * 0.0625rem);   // 45rem
        height: calc(var(--macro-width) * 0.0625rem);   // 22.5rem
    }
    .sqr-micro-pixel { width: calc(var(--micro-height) * 1px);       height: calc(var(--micro-width) * 1px); }
    .sqr-micro-rem   { width: calc(var(--micro-height) * 0.0625rem); height: calc(var(--micro-width) * 0.0625rem); }
}
```

This is elegant precisely because of §4: the solver does not need to know about orientation. It measures the probe, and the probe has become 45rem wide (720 reference px). A rotated phone genuinely *is* a 720 × 360 device, so the canon it should be fitted to is the rotated canon. `ratio = width / 720` follows automatically.

The micro swap is currently a **no-op** — `--micro-width` and `--micro-height` are both 60, so exchanging them changes nothing. It is there for symmetry, and it starts working the moment anyone sets a non-square finger unit.

### Why those bounds

The bounds are hand-derived, and the reasoning is preserved in the source comments:

- **`min-width: 361px`** — excludes watches. The author's test device is named in the file: `//320x292=moms apple watch`. A watch in landscape is short *and* narrow; rotating a 720-wide canon onto it produces an unusably tiny scale. The comment sets the floor by reasoning about the smallest non-watch device: *"our lowest device width res is 320 for a NOT WATCH, so it's height would be 640... that height would now be width in landscape."* 361 is one pixel above 360 — anything at or below the canonical width is treated as too small to rotate.
- **`max-width: 768px`** — excludes tablets and everything larger. A tablet in landscape has plenty of both dimensions and is better served by the `cols`/whole-column logic than by a rotated phone canon. The comment lands on *"bigger than watch...361 and below any tablet to not effect screens seems to work best."*

The long comment block above the query is worth reading in full if you are modifying this — it records an unresolved design tension between doing orientation in CSS (this query) and doing it in JS by width bucket, and the author's provisional conclusion: *"I ended up using this for now. still figuring it out."* Note also that the `lg` bucket and this query overlap at exactly 768 (§7).

---

## 10. Re-entrancy: resize and orientation

```js
window.simuating = false;
...
simulateScreen();
window.onresize = simulateScreen;
window.onload = simulateScreen();

screen.orientation.addEventListener("change", function(e) {
    let squareRootStyleTag = document.getElementById('square-root');
    squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");
    simulateScreen();
});
```

Three entry points, in practice two:

1. **Immediate call at parse time** (line 120) — this is what runs on first paint.
2. **`window.onresize`** — every resize, including the resize a soft keyboard or a browser chrome collapse produces.
3. **`screen.orientation` change** — resets to `100%` first (belt and braces; `simulateScreen()` does the same reset itself) and re-solves.

The guard exists because a solve is asynchronous and stateful: it writes `100%`, waits, measures, writes a ratio. If a second solve started mid-flight it would measure a page that the first solve is about to change, and the ratio would be garbage. `window.simuating` (sic) makes the function a no-op while one is in progress.

**Consequences you should know about:**

- The guard is held for the full ~1000 ms (500 ms + 500 ms). Resize is a firehose; during a drag or an orientation animation, nearly every event is dropped.
- The dropped events are **discarded, not queued**. If the *last* resize event of a sequence lands inside the guard window, no further solve is scheduled and the page keeps a scale computed for an earlier size until something else triggers a resize. On a phone this is rarely visible (orientation change fires its own listener afterwards); when dragging a desktop window it is, and a nudge of the window corrects it.
- Because the immediate call at line 120 is what actually bootstraps the page (see quirk 2), **the script must run after the probes exist in the DOM.** Put it at the end of `<body>`, or use `defer`. If it runs early, `document.querySelector('.sqr-macro-rem')` returns `null` and `macroRem.offsetWidth` throws inside the timeout — and there is no `onload` fallback to rescue it.
- Likewise `document.getElementById('square-root')` is dereferenced without a null check on the very first line of the function. A missing style tag is an immediate `TypeError`.

---

## 11. Required host-page setup

Four things. All four are load-bearing except the pixel probe (§4), which you should include anyway.

```html
<!doctype html>
<html>
<head>
    <!-- 1. The style tag the solver writes into. Must exist, must have this id, must be empty. -->
    <style id="square-root"></style>

    <!-- 2. The compiled framework CSS -->
    <link rel="stylesheet" href="/css/square-root.css">
</head>
<body>

    <!-- 3. The probes. Hidden but laid out: visibility:hidden, never display:none. -->
    <div class="fixed invisible sqr-macro-pixel"></div>
    <div class="fixed invisible sqr-macro-rem"></div>

    <!-- ... your page ... -->

    <!-- 4. The solver, AFTER the probes (or use defer) -->
    <script src="/js/square-root.js"></script>
</body>
</html>
```

Package name is `@all1web/square-root`; source at `https://github.com/all1web/square-root`.

If you compile the SCSS yourself, `square-root.scss` `@import`s `_scrollsnap` — keep both files together:

```
src/
  square-root.scss     ← compile this one
  _scrollsnap.scss
  square-root.js
```

Checklist when it does not work:

| Symptom | Cause |
|---|---|
| `TypeError: ... of null` on load | Script ran before the probes, or `<style id="square-root">` is missing |
| Everything vanishes / absurd scale | A probe is `display:none`, so `offsetWidth` is 0 and `ratio` is `Infinity` |
| Layout does not scale at all | `.fixed` / `.invisible` undefined, or your sizes are in `px` rather than the `0.0625rem` units |
| Scale is stale after a window drag | The last resize landed inside the ~1s guard window (§10) |

---

## 12. Known quirks

These are real, they are in the shipped source, and they are documented here rather than quietly patched — one of them may well be intentional.

### Quirk 1 — `cols` is divided out twice

`square-root.js` lines 88–100:

```js
if(width < 1024 ) {

    ratio = ratio/cols;                    // ← division #1, unconditional

    if(cols==1)
    {
        //   ratio = ratio*0.89;           // ← if-branch body is commented out
    }else {
        ratio = ratio/cols;                // ← division #2
    }
}
```

For any bucket where `cols !== 1` — that is `md` (1.2) and `lg` (1.61) — the ratio is divided by `cols` **twice**. The effective divisor is `cols²`:

| Bucket | `cols` | Intended divisor | Actual divisor |
|---|---|---|---|
| `md` | 1.2 | 1.2 | **1.44** |
| `lg` | 1.61 | 1.61 | **2.5921** |

Worked, at 800 px (an `lg` width, portrait so the probe reads 360):

```
ratio = 800/360             = 2.2222
ratio = 2.2222 / 1.61       = 1.3803     ← after division #1
ratio = 1.3803 / 1.61       = 0.8573     ← after division #2
root  = 85.73% = 13.72px  →  canon = 22.5rem = 308.6px
800 / 308.6 = 2.59 canonical columns on screen
```

One division would have given ~1.61 columns — a peek. Two gives ~2.59 — two and a half full cards.

The shape of the code is telling: the `if(cols==1)` branch was written to apply the phone peek (`× 0.89`), so the `else` was presumably meant to be the *only* shrink for `cols !== 1`, with the unconditional `ratio = ratio/cols` added later — or vice versa. **But `cols` values of 1.2 and 1.61 are themselves hand-tuned, not derived**, and 1.61 is suspiciously close to φ, so it is entirely possible the author tuned these numbers *with the double division in place* and the current output is exactly what was wanted. Do not "fix" it by deleting a line without re-tuning `cols` and looking at the result on a real tablet.

### Quirk 2 — `window.onload` never binds

`square-root.js` line 122:

```js
simulateScreen();
window.onresize = simulateScreen;
window.onload = simulateScreen();   // ← parentheses
```

`window.onresize = simulateScreen` is correct: it assigns the function. `window.onload = simulateScreen()` **calls** `simulateScreen` immediately and assigns its **return value** — which is `undefined` (or `null`, when the guard short-circuits) — to `window.onload`. The load handler is therefore never registered.

In practice, at line 122 the guard is still `true` from the line-120 call one instruction earlier, so this invocation hits `if(window.simuating) return null;` and does nothing at all. `window.onload` becomes `null`.

The bug is **masked** by three things and so is easy to miss:

- The immediate call on line 120 already bootstraps the page.
- `window.onresize` binds correctly and fires on any viewport change.
- The `screen.orientation` listener binds correctly via `addEventListener`.

What is actually lost is the one thing `onload` gives you that the others do not: a re-solve **after images, fonts and stylesheets have finished loading**. If a late-arriving webfont or stylesheet changes layout after the initial solve, nothing re-runs. The fix is one character:

```js
window.onload = simulateScreen;    // no parentheses
```

but note it would then fire a second solve — harmless, since the guard will have released by then and the solve is idempotent.

### Smaller sharp edges

- `let idealSqrPixelWidth = 360;` (line 76) is declared and never used — the canonical width is obtained by measuring the probe, not from this constant. Changing it does nothing.
- `let macroPx = ...` (line 67) is queried and never used; every consumer is commented out (§4).
- `newSimulatedHeight` is read and never used.
- The global is spelled `window.simuating`, not `simulating`. If you check it from your own code, match the spelling.
- The verification `console.log` prints `ratio` with a `%` suffix but does not multiply by 100.
- `screen.orientation.addEventListener` is called unguarded at parse time. It is well supported on modern mobile browsers but is not universal on older desktop Safari; if you need to support such a browser, feature-detect before the call.
- The framework ships production `console.log` calls (`"Screen: ..."`, `"New Simulated Ratio: ..."`) on every solve, and every resize triggers a solve.
