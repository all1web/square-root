# How Square Root works

Square Root is a mobile-first layout framework by [ALL1WEB](https://github.com/all1web/square-root) (author: Neo / N30). It is two files that work as one mechanism:

- `src/square-root.scss` — a set of utilities that express every size as a multiple of a **finger unit**, authored against a **canonical device**.
- `src/square-root.js` — a solver that, at runtime, picks the root `font-size` that makes that canonical device exactly fill the real viewport.

This document explains the mechanism, line by line, including the parts that are rough. If you only want the setup snippet, jump to [Required host-page setup](#required-host-page-setup).

> **If you are turning on the phone peek switch (`sqr-peek`, new in 0.2.0), read
> [§7.1](#71-the-phone-peek-switch-sqr-peek) first.** It is opt-in, and it
> deliberately breaks the invariant the rest of this document builds up to: with
> peek on, the canonical width is no longer the viewport width, and `sqr-w-6` is
> no longer full-bleed.

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
    ratio = ratio/cols;               // applied exactly once (see §12)
    if(cols==1) {
        ratio = ratio*sqrPeekFactor();   // 1 unless <html> carries `sqr-peek` (§7.1)
    }
} else {
    simulatedWidth = parseInt(width/simulatedWidth)*simulatedWidth;
    ratio = width/simulatedWidth;
}
```

The core is one line: **`ratio = viewportWidth / canonicalWidthAsRendered`**. On a phone with the peek switch off — the default — that is the entire computation, because `sqrPeekFactor()` returns exactly `1` and `cols` is `1`. The rest is the peek adjustment (§7.1) and the desktop column fit (§8).

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

`cols` **is** a column count — literally. Dividing the ratio by it makes the root font-size smaller, which makes the canonical device render narrower than the viewport, which means **`cols` canonical columns fit across the screen**. At `md` that is 1.2 columns: one full card plus a 20% sliver of the next. At `lg`, 1.61 columns.

This is the invariant to preserve when touching this branch, and it is checkable — measure the probe and divide the viewport by it:

| Viewport | Bucket | `cols` | Root px | Canon renders as | Columns on screen |
|---|---|---|---|---|---|
| 640 | `sm` | 1 | 28.444 | 640.0 px | 1.0000 |
| 641 | `md` | 1.2 | 23.741 | 534.2 px | 1.2000 |
| 767 | `md` | 1.2 | 28.407 | 639.2 px | 1.2000 |
| 768 | `lg` | 1.61 | 21.201 | 477.0 px | 1.6100 |
| 1023 | `lg` | 1.61 | 28.240 | 635.4 px | 1.6100 |
| 1024 | `xl` | — | 22.756 | 512.0 px | 2.0000 |

Two properties fall out of that table, and both are load-bearing:

1. **The column count only ever increases with width** — 1 → 1.2 → 1.61 → 2. A wider screen never shows fewer, larger columns.
2. **Each bucket's top lands on the same scale** — 28.444, 28.407, 28.240. The buckets tile: the design grows to ~28.4 px root, a column is added, it drops and grows again. That continuity is where the `cols` values come from, and it shows they are *derived*, not arbitrary:

```
767 / 640 = 1.198  ≈ 1.2    ← the md factor
1023 / 640 = 1.598 ≈ 1.61   ← the lg factor (nudged to ≈ φ)
```

Each factor is its bucket's top width over the `sm` bucket's top width. Pick anything else and the seam at the bucket boundary opens up.

That is the point. Square Root pairs with the horizontal snap utilities in `_scrollsnap.scss`:

```scss
.scrollsnap-horizontal { scroll-snap-type: x mandatory; }
.scrollsnap-horizontal .snap-x { scroll-snap-align: center; scroll-snap-stop: always; }
```

A card deck laid out this way is a row of canonical-width cards. If a card exactly fills the screen, the user sees a single full-bleed panel with **no affordance** — nothing on screen says "there is more to the side." Shrink the scale slightly and the edge of the next card intrudes at the viewport boundary. That sliver is the **peek cue**: the entire, unambiguous, zero-chrome signal that the deck scrolls horizontally.

On phones (`cols === 1`) there is no `cols` division to produce that sliver — `cols` is 1, so the canon fills the width exactly and a full-screen card deck has no affordance at all. §7.1 is the switch that supplies one.

---

## 7.1 The phone peek switch (`sqr-peek`)

*New in 0.2.0. **Off by default.***

The mechanism was in the source from the first release, written and left disabled:

```js
if(cols==1) //1 && width>320 && width< 1024 ) /* HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A CLASS ON <body> like: .full-screen */
{
    //This baiscally further resized the screen smaller so the tip of the right card shows so that
    // user knows they can scroll to the right/left horizontally
 //   ratio = ratio*0.89;
}
```

`× 0.89` renders the canon at 89% of the viewport, leaving an 11% sliver — the same peek cue the `cols` factor produces on `md` and `lg`, but on the phone bracket where the horizontal card deck actually lives. It was disabled because it needed a way to turn it off: no design that wants a genuinely full-bleed first panel should be forced into a peek.

### The switch

That way is now a class, as the author's note asked for. It is on `<html>`:

```html
<html>                                         <!-- peek OFF (default) -->
<html class="sqr-peek">                        <!-- peek ON, factor 0.89 -->
<html class="sqr-peek" data-sqr-peek="0.85">   <!-- peek ON, factor 0.85 -->
```

```js
function sqrPeekFactor() {
    let el = document.documentElement;

    if (!el || !el.classList.contains('sqr-peek')) return 1;

    let raw = el.getAttribute('data-sqr-peek');
    if (raw === null || raw === '') return 0.89;

    let f = parseFloat(raw);
    if (!isFinite(f)) return 0.89;              // garbage -> default
    return Math.min(1, Math.max(0.5, f));       // out of range -> clamped
}
```

| | |
|---|---|
| Element | `<html>` (`document.documentElement`) — always present, survives a body swap, and can be set in server-rendered markup so the very first solve already sees it |
| Class | `sqr-peek` |
| Attribute | `data-sqr-peek`, on the **same** element as the class |
| Default factor | `0.89` |
| Accepted range | `0.5 … 1.0`, clamped |
| Fallback | `0.89` for anything non-finite, and for a missing or empty attribute |
| Scope | inside `if (cols == 1)`, so the phone bracket only — ≤ 640 px, including the sub-320 watch range, which also has `cols == 1`. Inert on `md`, `lg` and `xl`. |

Guard behaviour, measured at a 360 px viewport (root would be 16.000 px with peek off):

| `data-sqr-peek` | Factor used | Root px | Why |
|---|---|---|---|
| *(absent)* | 0.89 | 14.240 | default |
| `""` | 0.89 | 14.240 | empty is not a number |
| `"0.85"` | 0.85 | 13.600 | in range |
| `"0.5"` | 0.50 | 8.000 | the floor, used as-is |
| `"0.2"` | 0.50 | 8.000 | clamped up to the floor |
| `"3"` | 1.00 | 16.000 | clamped down to 1 — i.e. no peek |
| `"banana"` | 0.89 | 14.240 | `parseFloat` gives `NaN` → default |

### Choosing a factor

Factor `f` leaves roughly `1 − f` of the viewport showing the next card:

| Factor | Canon renders at | Sliver on a 360 px phone | Sliver on a 414 px phone |
|---|---|---|---|
| 0.95 | 95% | 18 px | 21 px |
| **0.89** | **89%** | **~40 px** | **~46 px** |
| 0.85 | 85% | 54 px | 62 px |
| 0.80 | 80% | 72 px | 83 px |

0.89 is the shipped default because ~40 px is about a finger-width of visible card edge — enough to read as "there is another card there" without stealing a meaningful amount of the current one. Below ~0.8 the sliver stops looking like a peek and starts looking like a layout mistake.

### ⚠ The consequence: with peek ON, the canon is no longer the viewport

**This is the invariant the rest of this document builds up to, and this feature breaks it on purpose.**

Everything in §5 and §6 rests on `ratio = viewportWidth / canonicalWidthAsRendered`, which makes the canonical device span the viewport **exactly**. Multiply that ratio by 0.89 and it no longer does:

| | Peek OFF | Peek ON (0.89) |
|---|---|---|
| Canon (`.sqr-macro-rem`, 22.5rem) on a 360 px phone | **360 px** — the full viewport | **320.4 px** — 89% of it |
| `sqr-w-6` | full-bleed | ~89% of the screen |
| A full-width hero, band or footer built on the canon | touches both edges | leaves ~40 px bare |

**So: `sqr-w-6` is not full-bleed with peek on, and neither is anything else sized against the canon.** That is the entire point of the feature — the bare strip *is* the affordance — but if your design has a background band, an edge-to-edge image or a sticky footer that must touch both sides, peek will visibly break it. Reach for peek on a horizontally-scrolling card deck; leave it off on a single full-bleed page.

**What still holds** — and this is why peek is a scale change rather than a layout change:

1. **Every ratio between units is preserved.** `sqr-w-3` is still half of `sqr-w-6`; the finger unit is still one sixth of the canon; the 6 × 12 grid is still a 6 × 12 grid. Peek multiplies the single number every unit is derived from, so all of them move together — it cannot change one utility relative to another.

   *Exactly, in the computed values.* Rendered boxes are a separate matter: browsers quantise layout to 1/64 px, so a **measured** ratio can land a hundredth of a pixel off ideal at some scales. Measured on Edge, `sqr-w-6 / sqr-w-3` with peek on came out 2.000000 at 375/390/430 px and 2.000098 at 360 px — a 0.015 px discrepancy on a 320 px box. That is browser layout rounding, it happens with peek off too at other viewport widths, and peek is not special in kind; it just lands on non-round root font-sizes more often.
2. **The design is uniformly scaled, not reflowed.** Nothing re-wraps, no element changes its relationship to any other, no breakpoint fires, no bucket changes. It is the same composition, 11% smaller.
3. **Tappability scales with it, so check the small end.** At 360 px with peek on, the finger unit renders at `60 × 0.89 = 53.4` px instead of 60. That is still inside the cited 45–52 px finger band (just above it), the same place the 320 px viewport lands with peek off (§6). At 320 px *with* peek on it is 47.5 px — still tappable, but that is the floor of the envelope. Below factor ~0.8 on a 320 px device you are designing under the research.
4. **Off the phone bracket, and with the switch off, nothing changes at all.**

### Flipping it live

Peek is meant to be a back-and-forth switch, so a class change has to reach the solver without a reload. Two ways, both shipped:

```js
// 1. Just toggle the class. A MutationObserver on <html> re-solves by itself.
document.documentElement.classList.toggle('sqr-peek');

// 2. Retune without toggling — the observer watches the attribute too.
document.documentElement.dataset.sqrPeek = '0.85';

// 3. Force a solve yourself (after changing something the observer cannot see).
window.squareRootResolve();
```

Paste any of those into the console on a live page and the layout re-scales in about a second — the solve is asynchronous (§5), so give it one.

The observer is deliberately narrow: it is one `MutationObserver` on one element, filtered to `class` and `data-sqr-peek`, and it recomputes `sqrPeekFactor()` and **returns early if the value did not change**. Host apps write to `<html>`'s class list constantly — dark mode, scroll locks, framework hooks — and none of that should trigger a solve.

`window.squareRootResolve()` is the public entry point and differs from calling `simulateScreen()` directly in one way: a solve holds the re-entrancy guard for ~1 s (§10), and a call landing inside that window would be silently dropped. `squareRootResolve()` re-schedules itself instead, so flipping the class twice in quick succession still converges on the correct final scale rather than getting stuck on the first one.

### Why opt-in, when the source note said opt-out

The author's note proposes the inverse polarity — peek on everywhere, a `.full-screen` class to disable it. Opt-in was shipped instead, for one reason: Square Root is a published package with at least one production consumer, and opt-out would silently rescale every phone layout already built against it on the next `npm update`. Off by default means an upgrade is a no-op.

The polarity is one line. To switch to the original intent, in `sqrPeekFactor()`:

```js
// opt-in (shipped) — peek only where asked:
if (!el || !el.classList.contains(SQR_PEEK_CLASS)) return 1;

// opt-out (the source note's idea) — peek everywhere unless .full-screen says no:
if (!el || el.classList.contains('full-screen')) return 1;
```

`data-sqr-peek`, the clamp, the observer and `squareRootResolve()` all work unchanged either way.

---

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

Plus, since 0.2.0, the live re-solve path:

```js
let sqrResolveRetry = null;
function squareRootResolve() {
    clearTimeout(sqrResolveRetry);
    if (window.simuating) {
        sqrResolveRetry = setTimeout(squareRootResolve, 1100);   // guard releases at ~1000ms
        return;
    }
    simulateScreen();
}
window.squareRootResolve = squareRootResolve;

let sqrLastPeek = sqrPeekFactor();
new MutationObserver(function() {
    let now = sqrPeekFactor();
    if (now === sqrLastPeek) return;
    sqrLastPeek = now;
    squareRootResolve();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-sqr-peek'] });
```

Four entry points, in practice three:

1. **Immediate call at parse time** — this is what runs on first paint.
2. **`window.onresize`** — every resize, including the resize a soft keyboard or a browser chrome collapse produces.
3. **`screen.orientation` change** — resets to `100%` first (belt and braces; `simulateScreen()` does the same reset itself) and re-solves.
4. **The peek observer / `window.squareRootResolve()`** — §7.1. The observer only fires when `sqrPeekFactor()` actually changes value, so unrelated writes to `<html>`'s class list cost one function call and nothing else.

(The fourth entry point is the only one that routes through `squareRootResolve()` rather than calling `simulateScreen()` directly, and it is the only one that survives the guard: `onresize` and the orientation listener still drop events that land mid-solve, exactly as below.)

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
<!-- Optional: add class="sqr-peek" here to turn on the phone peek (§7.1).
     Off by default. Add data-sqr-peek="0.85" alongside it to retune. -->
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

These are real and they are in the shipped source. One of them is now fixed; the record is kept because the fix changes scale behaviour on `md` and `lg`, and consumers pinned to 0.1.x will see the old numbers.

### Quirk 1 — `cols` was divided out twice — **fixed in 0.2.0**

Through 0.1.x, `square-root.js` read:

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

Because the `if(cols==1)` body is entirely commented out, every bucket where `cols !== 1` — `md` (1.2) and `lg` (1.61) — fell into the `else` and divided **again**. The effective divisor was `cols²`:

| Bucket | `cols` | Intended divisor | 0.1.x actual divisor |
|---|---|---|---|
| `md` | 1.2 | 1.2 | **1.44** |
| `lg` | 1.61 | 1.61 | **2.5921** |

Earlier revisions of this document speculated that the factors might have been hand-tuned *with* the double division in place, and advised against deleting a line without re-tuning. Measurement settled it — the double division was a leftover, and three independent checks say so:

1. **The column count went backwards.** Squared, `lg` put **2.5921** canonical columns on a 1023 px screen while the `xl` branch puts **2.0** on a 1024 px one. One pixel wider, and the design got *bigger* — the opposite of what every other bucket does.
2. **A tablet rendered smaller than a watch.** At 768 px the root solved to **13.168 px**, below the **14.222 px** a 320 px watch gets. Nothing in the design rationale asks for that.
3. **The factors are derived for a single division.** `767/640 = 1.198 ≈ 1.2` and `1023/640 = 1.598 ≈ 1.61`. Each factor is its bucket's top width over the `sm` bucket's top width, which makes the buckets tile continuously at a ~28.4 px root (§7). That property exists only under one division; squaring destroys it. The factors were tuned *for* single division, not with the double in place.

The `else` branch was removed and the `if(cols==1)` block kept — it is the phone peek, implemented separately in the same release (§7.1) and unrelated to this fix. The `sm`/phone bucket and the `xl`/desktop branch are byte-for-byte unaffected by *this* change; only `md` and `lg` move. (Peek can move `sm`, but only if you opt in by adding the class — with no class the phone bucket is byte-identical to 0.1.x.)

Measured before and after, headless Edge, 812 px viewport height, dpr 1, portrait:

| Viewport | Root px 0.1.x | Root px 0.2.0 |
|---|---|---|
| 320 | 14.222 | 14.222 |
| 360 | 16.000 | 16.000 |
| 640 | 28.444 | 28.444 |
| 641 | 19.784 | **23.741** |
| 700 | 21.605 | **25.926** |
| 767 | 23.673 | **28.407** |
| 768 | 13.168 | **21.201** |
| 900 | 15.431 | **24.845** |
| 1023 | 17.541 | **28.240** |
| 1024 | 22.756 | 22.756 |
| 1080 | 16.000 | 16.000 |

If your design was authored against 0.1.x scale on a tablet, see the migration note in the CHANGELOG.

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
