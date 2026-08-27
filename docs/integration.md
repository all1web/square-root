# Integrating Square Root

Square Root is two halves that only work together:

- **`square-root.scss`** — utilities that express every size as `calc(var(--micro-width) * N * 0.0625rem)`. Because `0.0625rem` is `1/16` rem, the numbers in `--macro-width: 360` / `--micro-width: 60` are *reference pixels at a 16px root font-size*. The whole system is authored in rem against a canonical 360×720 device.
- **`square-root.js`** — a solver that measures a probe element and writes a `font-size` percentage onto `:root` so that the canonical 360px width lands exactly on the real viewport width.

Nothing in the CSS scales by itself. If you ship the CSS without the JS, you have a stylesheet hard-coded to a 16px root — i.e. a design that only looks right on a 360px-wide phone. If you ship the JS without the host-page setup below, it throws on the first line and nothing happens.

This document is about wiring the two together in real projects.

---

## 1. What the host page must provide

The JS makes three hard assumptions. All three are non-negotiable — they are read directly, without null checks.

### 1.1 A style tag it can own

```html
<style id="square-root"></style>
```

`square-root.js` line 21–22 does:

```js
let squareRootStyleTag = document.getElementById('square-root');
squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");
```

This is the *only* place the solver writes. It never touches inline styles, never sets `document.documentElement.style`. If the element is missing you get `TypeError: Cannot set properties of null` and the script dies immediately.

Two placement rules:

- **The tag must exist before the script runs.** Put it in `<head>`; load the script with `defer`, as a module, or at the end of `<body>`.
- **Put it last in `<head>`, after every `<link rel="stylesheet">` and every other `<style>`.** The solver writes a plain `:root { font-size: … }` rule — specificity `(0,1,0)`, the same as any other `:root` or `html` font-size rule you might ship. Ties are broken by document order, so a later stylesheet that sets `html { font-size: 62.5% }` will silently beat the solver.

### 1.2 Two probe elements

```html
<div class="fixed invisible sqr-macro-pixel"></div>
<div class="fixed invisible sqr-macro-rem"></div>
```

`.sqr-macro-rem` is the one that matters. From the SCSS:

```scss
.sqr-macro-rem {
    width: calc(var(--macro-width) * 0.0625rem);   // 22.5rem
    height: calc(var(--macro-height) * 0.0625rem); // 45rem
}
```

At a 100% root that measures 360×720 CSS px. The solver resets the root to 100%, waits 500ms for layout, reads `macroRem.offsetWidth`, and computes `window.innerWidth / thatWidth`. The probe *is* the measuring stick — its measured width is the canon.

`.sqr-macro-pixel` (a literal `360px × 720px` box) is queried on line 67 but, in the current source, never read — the code that used it is commented out. Include it anyway; it costs nothing and the file clearly expects it.

The two utility classes on the probes are **not defined by Square Root** — they come from Tailwind, and they are load-bearing:

| Class | Must resolve to | Why |
|---|---|---|
| `fixed` | `position: fixed` | Takes the probe out of normal flow. A probe that is a flex/grid child can be *shrunk* by its parent, and then `offsetWidth` is not 22.5rem and the solved ratio is wrong. |
| `invisible` | `visibility: hidden` | Hides it while keeping it in the layout tree so it still has a measurable box. **`display: none` gives `offsetWidth === 0`**, which makes the ratio `Infinity` and produces `font-size: Infinity%` — an invalid declaration the browser drops. |

If you are not using Tailwind, define them yourself (see §2).

### 1.3 A real viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

The whole ratio hinges on `window.innerWidth`. Without this, mobile browsers report the 980px fallback viewport and Square Root will faithfully scale your 360px canon onto an imaginary 980px screen.

Do **not** add `user-scalable=no` or `maximum-scale=1` to "make it more app-like". Square Root already fits the design to the screen; blocking pinch-zoom only removes the accessibility escape hatch.

### 1.4 The startup sequence (and the ~1s flash)

```
script runs
  └─ writes ":root{font-size:100%}"
       └─ 500ms  ── measures probe, computes ratio, writes ":root{font-size:R%}"
            └─ 500ms  ── re-measures, logs, clears window.simuating
```

Two chained `setTimeout(…, 500)` calls. For roughly the first half second the page renders at the browser default root size, then snaps to the solved size. There is **no callback, event, or promise** exposed for "scaling settled" — if you want to hide the flash you have to build that yourself:

```html
<style>html.sqr-booting body { visibility: hidden; }</style>
<script>
  document.documentElement.classList.add('sqr-booting');
  // The solver's second timeout lands at ~1000ms; 1100 is a safe margin.
  setTimeout(function () {
    document.documentElement.classList.remove('sqr-booting');
  }, 1100);
</script>
```

That snippet is your code, not part of the framework. It is a timing guess, not a guarantee.

### 1.5 Re-triggering the solver

The script binds `window.onresize = simulateScreen`. The portable way to force a re-solve from anywhere — after a client-side navigation, after injecting a large chunk of DOM, after a container animation finishes — is:

```js
window.dispatchEvent(new Event('resize'));
```

This works whether the script was loaded as a classic script or bundled as a module. Calling `simulateScreen()` by name only works if you loaded the file as a **classic** `<script>` (function declarations at the top level of a classic script are global); inside a bundler it is module-scoped and `window.simulateScreen` is `undefined`.

Note the re-entrancy guard: `if (window.simuating) return null;` (the typo is in the source). Rapid resize events during a drag are coalesced — only the first one in each ~1s window does work.

---

## 2. Plain HTML page, from scratch

This is a complete, working page with no build step and no Tailwind. `.fixed` and `.invisible` are declared manually because Square Root does not ship them.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Square Root — plain HTML</title>

  <!-- Compiled Square Root utilities (includes the scrollsnap partial). -->
  <link rel="stylesheet" href="./dist/square-root.css">

  <style>
    /* Square Root does not define these. The probes need them. */
    .fixed     { position: fixed; top: 0; left: 0; }
    .invisible { visibility: hidden; }

    /* Ordinary page styling. */
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
    .card {
      background: #f2f2f2;
      border: 1px solid #ddd;
      border-radius: 0.5rem;
    }
  </style>

  <!-- LAST in <head>: the solver writes here, and later rules would outrank it. -->
  <style id="square-root"></style>
</head>
<body>

  <!-- Measuring sticks. Keep them direct children of <body>. -->
  <div class="fixed invisible sqr-macro-pixel"></div>
  <div class="fixed invisible sqr-macro-rem"></div>

  <!-- A horizontally snapping row of canon-width cards. -->
  <div class="scrollsnap-horizontal invisible-scrollbar"
       style="display:flex; overflow-x:auto;">
    <section class="snap-x sqr-w-6 sqr-h-8 sqr-mr-1 sqr-px-1 sqr-pt-1 card">
      <h1>One</h1>
      <p>sqr-w-6 is 6 finger units: 6 × 60 × 0.0625rem = 22.5rem = the full canon width.</p>
    </section>
    <section class="snap-x sqr-w-6 sqr-h-8 sqr-mr-1 sqr-px-1 sqr-pt-1 card">
      <h1>Two</h1>
    </section>
    <section class="snap-x sqr-w-6 sqr-h-8 sqr-mr-1 sqr-px-1 sqr-pt-1 card">
      <h1>Three</h1>
    </section>
  </div>

  <!-- defer so the style tag and probes exist before the script's first line. -->
  <script src="./src/square-root.js" defer></script>
</body>
</html>
```

Reading the utility names: `--micro-width` is `60`, so `sqr-w-1` = `calc(60 * 1 * 0.0625rem)` = `3.75rem` = 60 reference px, one finger. `sqr-w-6` = `22.5rem` = 360 reference px = exactly the canon width. The generated loop covers `1` through `8` for `sqr-w`, `sqr-h`, `sqr-mt`, `sqr-mx`, `sqr-px`, `sqr-pt`, `sqr-pl`, `sqr-mr`, plus negative `-sqr-l-N` / `-sqr-r-N`. Values above `6` intentionally exceed the canon — the source notes `sqr-w` is used "for high number beyond page width to set width of pagewrapper".

`dist/` in this repo is checked-in Sass output and has drifted from `src/` (the compiled `scroll-padding-left` values in `dist/square-root.css` and `dist/scrollsnap.css` differ from each other and from the current `_scrollsnap.scss`). If snapping offsets look off, compile from `src/` yourself.

---

## 3. Vite + SCSS

### 3.1 Getting the files

```bash
npm install @all1web/square-root
```

or vendor it:

```bash
npm install github:all1web/square-root
```

If you are working against a checkout, a path dependency or a Vite alias to the repo's `src/` works equally well. There is no CLI, no config file, and no plugin — Square Root is a stylesheet and a script.

### 3.2 SCSS entry

```scss
/* resources/css/app.scss */

/* Import the source, not dist — you get the @for loop compiled by your Sass. */
@import "@all1web/square-root/src/square-root";

/* Your own layers come after. */
@import "./components/card";
@import "./components/nav";
```

`square-root.scss` `@import`s `_scrollsnap` itself, so importing the one file gives you the snap utilities too. It emits a `:root { … }` block with the four canon variables — see §5 before you try to change them.

If you would rather not run Sass at all, import the prebuilt CSS instead (`@all1web/square-root/dist/square-root.css`), accepting the drift noted above.

### 3.3 JS entry

```js
/* resources/js/app.js */
import '@all1web/square-root/src/square-root.js';
```

Things to know about this import:

- The file has **no exports**. It is a side-effect module: it declares `window.simuating`, defines `simulateScreen`, calls it once at the top level, assigns `window.onresize`, and adds a `screen.orientation` listener. A bare `import '…'` is exactly right and will not be tree-shaken.
- Because Vite emits `<script type="module">`, execution is deferred until after HTML parsing. The `<style id="square-root">` tag and both probes will exist by then — *provided they are in the markup*, not injected later by a framework.
- `simulateScreen` is **not** global under a bundler. Re-trigger with `window.dispatchEvent(new Event('resize'))` (§1.5).
- The top-level `screen.orientation.addEventListener(...)` runs unguarded, and it is the **last** statement in the file. On any engine where `screen.orientation` is undefined it throws — after the initial solve and the `onresize` binding have already happened, so resizing still works but rotation handling is lost. More importantly, if your bundler concatenates other side-effect modules after this one in the same chunk, they never execute. Import `square-root.js` last, or guard it in a fork.

`vite.config.js` needs nothing Square-Root-specific:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: { quietDeps: true }, // silences @import deprecation noise from the vendored file
    },
  },
});
```

---

## 4. Laravel + Blade

Everything lives in one layout file. `@vite` injects a deferred module script, so the parse-order requirement is satisfied automatically.

```blade
{{-- resources/views/layouts/app.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>{{ $title ?? config('app.name') }}</title>

    @vite(['resources/css/app.scss', 'resources/js/app.js'])
    @livewireStyles

    {{--
        Square Root writes its solved root font-size into this tag.
        It MUST be the last font-size-capable rule in <head>: the solver's
        `:root { font-size: N% }` has the same specificity as anything else
        targeting :root or html, so later rules win on document order.
    --}}
    <style id="square-root"></style>
</head>
<body class="antialiased">

    {{--
        Measuring sticks for square-root.js. Keep them as direct children of
        <body>, outside any Livewire root, so a component re-render never
        removes them and no flex parent can shrink them.
        .fixed / .invisible come from Tailwind, not from Square Root.
    --}}
    <div class="fixed invisible sqr-macro-pixel"></div>
    <div class="fixed invisible sqr-macro-rem"></div>

    <div id="layoutLiveWire" class="rows-1">
        {{ $slot }}
    </div>

    @livewireScripts
</body>
</html>
```

The `id="layoutLiveWire"` and `rows-1` / `rows-2` / `rows-3` classes are not decorative — `_scrollsnap.scss` keys vertical scroll padding off them:

```scss
#layoutLiveWire.rows-1 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 4); }
#layoutLiveWire.rows-2 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 13); }
#layoutLiveWire.rows-3 .scrollsnap-vertical { scroll-padding-top: calc(var(--micro-width) * 0.0625rem * 0.225 * 14); }
```

If you use `.scrollsnap-vertical` without that wrapper you fall back to the base `0.225` padding, and snap targets will sit under a fixed header.

**Livewire / `wire:navigate`.** A SPA-style navigation swaps the body without re-evaluating the JS module. The probes survive (they are outside the Livewire root) and `window.onresize` is still bound, so a re-solve is one line:

```blade
<script>
    document.addEventListener('livewire:navigated', function () {
        window.dispatchEvent(new Event('resize'));
    });
</script>
```

Strictly it is only needed if a navigation changes the orientation/landscape state or your own CSS redefines the canon per-page; the solved root font-size otherwise persists across navigations because the `<style id="square-root">` tag persists.

---

## 5. Overriding the canon

The canon lives entirely in CSS custom properties:

```scss
:root {
    --macro-width: 360;
    --macro-height: 720;
    --micro-width: 60;   /* Average finger 45-52px / thumb 72px */
    --micro-height: 60;
}
```

The JS reads **none** of these. It measures `.sqr-macro-rem`, whose width is derived from `--macro-width`. (`let idealSqrPixelWidth = 360;` exists on line 76 but is dead — the only code that used it is commented out.) So overriding the variables is sufficient and complete: change them and both the utilities *and* the solver follow.

The two variables do different jobs:

- **`--macro-width` changes the ratio.** It is the probe's width, therefore the denominator of `window.innerWidth / probeWidth`. Raising it makes the solved root font-size smaller — everything on the page shrinks, because more reference pixels have to fit in the same physical screen.
- **`--micro-width` changes the grid, not the ratio.** It is the finger unit every utility multiplies. Raising it makes each `sqr-*-N` step bigger *relative to the canon*, i.e. fewer units fit across the page. The solved root font-size does not move.

Because of that split, a canon change is usually a *pair* of changes. `360 / 60 = 6` finger units across the canonical width. To move to a 768×1024 tablet reference while keeping six columns of rhythm:

```scss
/* Load AFTER square-root.scss so this wins on document order. */
:root {
    --macro-width: 768;
    --macro-height: 1024;
    --micro-width: 128;   /* 768 / 6 — preserves "sqr-w-6 == full canon width" */
    --micro-height: 128;
}
```

Change only `--macro-width` and `sqr-w-6` stops meaning "one screen wide": at `--macro-width: 768` with `--micro-width: 60` it is 360/768 ≈ 47% of the canon.

Two caveats:

1. **The landscape swap is hard-coded to a viewport range, not to your canon.** `square-root.scss` ends with:

   ```scss
   @media screen and (orientation:landscape) and (min-width:361px) and (max-width:768px) { … }
   ```

   Inside, the probes swap `--macro-width` and `--macro-height` so a rotated phone measures a 720×360 canon. Those media conditions do not move when you change the canon. If your reference device is a tablet or desktop, that block will still fire on 361–768px landscape screens and swap your axes. To neutralise it, re-declare the four probe rules in a stylesheet loaded after Square Root, inside the same media query.

2. **Override in a stylesheet, not in the `<style id="square-root">` tag.** The solver overwrites that tag's entire `innerHTML` on every run; anything you put there is destroyed on the first resize.

---

## 6. Turning scaling off on desktop

Square Root's desktop branch (`width >= 1024`) does not scale the design to the window — it floors the window into whole canon-width columns:

```js
simulatedWidth = parseInt(width/simulatedWidth) * simulatedWidth;
ratio = width/simulatedWidth;
```

At 1440px: `parseInt(1440/360) === 4`, so `simulatedWidth = 1440`, `ratio = 1.0`, root stays at 100% and you get exactly four 360px columns. At 1500px: still 4 columns, `simulatedWidth = 1440`, `ratio = 1.0417`, root becomes 104.17% and each column widens to 375px so four fill the window with no ragged edge.

That is a real design decision. If your project has a separate desktop template that should use ordinary CSS at a normal 16px root, the honest way to opt out is **not to run the solver at all** — there is no flag, no option object, and no `data-` attribute in the source.

### 6.1 Don't load the script on desktop

```html
<style id="square-root"></style>
<script>
  // Load the solver only below the desktop breakpoint. Above it the root
  // font-size is never touched, so rem behaves normally.
  if (!window.matchMedia('(min-width: 1024px)').matches) {
    var s = document.createElement('script');
    s.src = '/js/square-root.js';
    s.defer = true;
    document.head.appendChild(s);
  }
</script>
```

Serve `square-root.js` as a static asset (e.g. `public/js/`) rather than bundling it, so this branch can decide at runtime. The trade-off is honest and worth stating: **this decides once, at page load.** Resizing a desktop window down past 1024px will not start the solver, and a phone rotated into a >1024px landscape will keep scaling. If that matters, reload on the boundary crossing yourself.

### 6.2 If it is already loaded

Undo it after the ~1s settle:

```js
setTimeout(function () {
  window.onresize = null;
  document.getElementById('square-root').innerHTML = ':root{font-size:100%;}';
}, 1100);
```

Incomplete, and you should know why: the `screen.orientation` change listener added at the top of the module is still attached, and it both resets the tag and calls `simulateScreen()` directly — bypassing `window.onresize`. On a rotating device the scaling comes back. §6.1 is the reliable route.

### 6.3 Keeping Square Root for layout but not for type

If the desktop objection is really "my body text gets huge/tiny", you do not need to disable the solver. Set type in `px` (or `pt`, `ch`, `vw`) instead of rem for the elements you want frozen, and leave layout on `sqr-*`. See §7 — this is the same trade-off Tailwind users hit.

---

## 7. Running Tailwind CSS alongside Square Root

They coexist cleanly on responsibilities:

- **Square Root owns rem-scale layout**: the canon, the finger grid, box sizes, gutters, scroll snapping. Its classes are all `sqr-`-prefixed (plus `snap-x`, `snap-y`, `scrollsnap-*`, `invisible-scrollbar`, `text-2xs`).
- **Tailwind owns everything else**: color, typography choices, borders, shadows, flex/grid mechanics, states, dark mode.

There are no class-name collisions with default Tailwind except `snap-x` — Tailwind's own `snap-x` sets `scroll-snap-type: x var(--tw-scroll-snap-strictness)` on the *container*, whereas Square Root's `.scrollsnap-horizontal .snap-x` sets `scroll-snap-align: center; scroll-snap-stop: always` on the *child*. Different elements, different properties, but if you put both on one element the result depends on source order. Import order in your CSS entry decides it; be deliberate.

Order Tailwind first so your Square Root utilities are the later rules:

```scss
@tailwind base;
@tailwind components;

@import "@all1web/square-root/src/square-root";

@tailwind utilities;
```

If you use Tailwind's JIT content scanning, note that Square Root classes are plain CSS — they are not generated by Tailwind and do not need to appear in `content`.

### 7.1 The warning: Tailwind's rem utilities scale too

This is the single most important consequence of adopting Square Root, and it is easy to miss.

Tailwind's spacing and type scales are **in rem**. Square Root changes the **root font-size**. Therefore every Tailwind rem utility on the page scales with the device — not just the `sqr-*` ones.

Worked example. `text-xs` is `0.75rem`; `p-3` is `0.75rem`; `gap-4` is `1rem`; `w-64` is `16rem`.

| Viewport | Solved ratio | Root font-size | `text-xs` | `p-3` | `w-64` |
|---|---|---|---|---|---|
| 320px (small Android) | 320 / 360 = 0.889 | 14.22px | **10.7px** | 10.7px | 227px |
| 360px (canon) | 360 / 360 = 1.000 | 16.00px | **12.0px** | 12.0px | 256px |
| 390px (iPhone 14) | 390 / 360 = 1.083 | 17.33px | **13.0px** | 13.0px | 277px |
| 430px (iPhone Pro Max) | 430 / 360 = 1.194 | 19.11px | **14.3px** | 14.3px | 306px |

(Ratios shown for the `sm` bucket, where `cols === 1` and only one division happens. See §9 for `md`/`lg`.)

**When this is what you want.** Almost always, on phones. It is the entire point: a card designed at 360px reproduces on a 430px screen at identical proportions, and the text inside grows with it instead of leaving the card looking empty. You can design one screen and stop testing "does the label wrap on a Pixel".

**When it surprises you.**

- **Long-form reading text.** A 10.7px body on a 320px phone is genuinely too small; the design does not know that a small phone is held closer, it just shrinks everything. Set reading type in `px` or `clamp()`.
- **`text-3xl` on desktop.** Above 1024px the ratio is the column-fit ratio, which sits near 1.0 — so desktop type stays roughly canonical even on a 2560px monitor. That is usually right, but it means Tailwind's `lg:text-5xl` will not compensate the way you expect.
- **Mixing units.** `border`, `border-2`, `w-px`, `ring-1`, and any arbitrary value like `text-[14px]` are in **px** and do *not* scale. A 1px hairline next to a scaled 14.3px label is fine; a `p-[12px]` next to a `p-3` will visibly diverge across devices. Pick rem or px per component and stay consistent.
- **Breakpoint prefixes still key off real CSS pixels.** `md:`, `lg:` etc. compile to `@media (min-width: 768px)`, and media query lengths are evaluated against the *initial* font-size, not the solved one. So `md:` fires at a real 768px regardless of what Square Root did to `:root`. This is a feature — the JS buckets and the CSS breakpoints agree on the same numbers — but do not try to "shift a breakpoint" by changing the canon.
- **Tailwind's `rem` in your own `@apply`d components** inherits all of the above.

Rule of thumb: **things that should feel the same size relative to the layout → rem (default). Things that should feel the same physical size on every device → px.**

### 7.2 Probes and Tailwind

`.fixed` and `.invisible` in the required markup are Tailwind class names. If you ever purge them (they are in a Blade layout, so scanning normally finds them) or move to a Tailwind config that renames them, the probes lose `position: fixed` / `visibility: hidden` and the solver's measurement goes wrong — see §8.

---

## 8. Troubleshooting

### Root font-size stuck at 100% (or at the browser default)

Open DevTools and inspect `<style id="square-root">`. Three distinct failures:

| Symptom | Cause |
|---|---|
| The tag is empty, console shows `Cannot set properties of null (setting 'innerHTML')` | **No `<style id="square-root">` in the page**, or the script ran before it was parsed. Add the tag; load the script with `defer`/`type="module"`/end-of-body. |
| The tag contains `:root { font-size:100%; }` and never changes; console shows `Cannot read properties of null (reading 'offsetWidth')` | **`.sqr-macro-rem` is missing.** The first write (100%) succeeded; the measurement 500ms later threw. Add the probe. |
| The tag contains `:root { font-size:Infinity%; }` or `NaN%`, and the page renders at 16px | **The probe measured zero.** Its width came out `0`, so `width / 0` is `Infinity`. Usually `display: none` instead of `visibility: hidden`, or the probe sits inside a `display: none` ancestor, or `.sqr-macro-rem` styles were never loaded (the CSS is missing while the JS is present). |

Also check: the tag has the right value but the page ignores it → **something later in the cascade wins.** Search your CSS for `html {` or `:root {` with a `font-size`. A reset like `html { font-size: 62.5% }` will override the solver if its stylesheet is linked after the tag. Move `<style id="square-root">` to be the last thing in `<head>`.

One environment-level cause that looks like a bug: browsers with a **minimum font size** setting (Chrome's `Settings → Appearance → Minimum font size`, some Android accessibility modes) clamp the computed root size. The solver then measures a probe that is larger than 22.5rem-of-the-intended-root and solves to a wrong ratio. It cannot be worked around in CSS; verify in a clean profile before chasing it.

### The layout scales twice / everything is half size

The ratio was applied on top of something that was already scaled. Check, in order:

1. **The probe is not a direct child of `<body>`.** Rem is root-relative, so an ancestor's `font-size` does not affect the probe — but `transform: scale()`, `zoom`, and CSS `container-type` on an ancestor **do** change `offsetWidth`. So does being a flex or grid item that gets shrunk (`flex-shrink` defaults to `1`), which is exactly what `position: fixed` is there to prevent. If `.fixed` isn't resolving to `position: fixed`, fix that first.
2. **The script is loaded twice** — e.g. bundled into `app.js` *and* included as a `<script>` tag. You get two `window.onresize` assignments (harmless, the second wins) but two overlapping timeout chains on first load. The `window.simuating` guard catches most of this; a second copy loading more than a second later is not guarded.
3. **`md` / `lg` viewports look smaller than you expected.** That is the documented double division, not a stacking bug. See §9, quirk 1.
4. **You nested `sqr-*` sizing inside a wrapper that also has `sqr-w-*` and `overflow:hidden`.** The utilities are absolute rem values, not percentages — they do not compose like a fluid grid. A `sqr-w-6` inside a `sqr-w-4` overflows by design.

### `window.onload` never fires the solver

Line 122 of `square-root.js`:

```js
window.onload = simulateScreen();
```

The parentheses **invoke** `simulateScreen` immediately and assign its return value — `undefined` — to `window.onload`. So no load handler is ever bound, and (because `simulateScreen()` was already called on line 120) this line is also the second invocation in a row; the `window.simuating` guard makes it return `null` instantly.

The practical effect is nearly invisible, which is why it has survived: `window.onresize` is bound correctly, the `screen.orientation` listener is bound correctly, and the line-120 call already schedules the initial solve. Where it *can* bite you is a page whose layout only settles after `load` — late web fonts, images without intrinsic dimensions, third-party embeds — because there is no post-load re-solve. Symptom: correct on reload, subtly wrong on first paint of a cold cache.

Workaround without touching the file:

```js
window.addEventListener('load', function () {
  window.dispatchEvent(new Event('resize'));
});
```

The fix in the file, if you maintain a fork, is to drop the parentheses (`window.onload = simulateScreen;`). Both are listed here so you can recognise the behaviour in the wild; the source is unchanged as of this writing.

### Values look wrong because a parent has its own font-size

Worth being precise, because the intuition cuts both ways:

- `sqr-*` utilities use **rem**. Rem is resolved against `:root` only. A parent with `font-size: 1.25rem`, `font-size: 20px`, or `font-size: larger` has **no effect** on any `sqr-*` value. People expecting an "inherited scale" inside a section are surprised that nothing changes.
- Conversely, anything you author in **em** *does* inherit, and will drift out of the grid the moment a parent changes its type size. If you extend Square Root with your own utilities, use `calc(var(--micro-width) * N * 0.0625rem)` exactly as the source does — not `em`.
- **The probe is immune too**, for the same reason — which is why "the probe is inside my typography wrapper" is *not* a cause of bad measurements, but "the probe is inside a `transform: scale()` wrapper" is.
- Unitless `line-height` inherits as a *number* and is recomputed per element, so it stays proportional automatically. A `line-height` in `px` will not.

### The console is talking to you

The solver logs on every run:

```
Screen: sm
New Simulated Ratio: 1.0833333333333333% 360<==>390
```

Two things to know: the ratio is printed without being multiplied by 100 (so `1.083` means a `108.3%` root), and the two numbers are the probe width *before* and *after* applying the new root — the second should equal `window.innerWidth` on `sm`, or `innerWidth / cols / cols` on `md`/`lg`. If the second number does not move at all, the write is being overridden by a later rule.

---

## 9. Known quirks

These are in the source as written. Document them, work around them, decide for yourself whether to fix them — but do not assume they are accidents you can "clean up" without changing how existing designs look.

### Quirk 1 — the ratio is divided by `cols` twice on `md` and `lg`

```js
if (width < 1024) {
    ratio = ratio/cols;

    if (cols == 1) {
        // ratio = ratio*0.89;   ← body is commented out
    } else {
        ratio = ratio/cols;     // ← second division
    }
}
```

The unconditional `ratio = ratio/cols` runs, and then, whenever `cols !== 1`, the `else` branch divides by `cols` **again**. The `if` branch that would have handled `cols === 1` has its only statement commented out, so the `if`/`else` exists purely to add a second division for the non-1 buckets.

`cols` is `1.2` at `md` (641–767px) and `1.61` at `lg` (768–1023px); it is `1` everywhere else, so phones and desktop are unaffected.

Concretely, at a 700px `md` viewport with a 360px probe:

| | Ratio | Root | Canon spans | Columns visible |
|---|---|---|---|---|
| One division | 700/360/1.2 = 1.620 | 162% | 583px | ~1.20 |
| **As written (two)** | 700/360/1.2/1.2 = 1.350 | 135% | 486px | **~1.44** |

At an 800px `lg` viewport: one division gives 1.380 (canon spans 497px, ~1.6 columns); as written you get 0.857 (canon spans 308px, ~2.6 columns).

This may well be deliberate tuning — the whole purpose of `cols` is to shrink the scale so the *next* card peeks in at the screen edge and signals that content scrolls horizontally, and one division at `1.2` barely peeks. Treat the effective factors as `1.44` and `2.59`, not `1.2` and `1.61`. The source itself flags uncertainty at `lg`: *"seems like the orientation/landscape rule in sqr scss making this not work right"*.

If you "fix" it to a single division, every `md` and `lg` layout gets meaningfully larger and your peek disappears.

### Quirk 2 — `window.onload = simulateScreen();` invokes instead of binding

Covered in full in §8. Summary: the parentheses call the function and assign `undefined`, so no `load` handler is ever registered. Masked by the fact that `onresize` and the `screen.orientation` listener still work, and by the immediate call on line 120.

### Smaller things worth knowing

- **`window.simuating`** is spelled that way in the source (missing `l`). It is a real global; anything you write against it must use the same spelling.
- **The re-entrancy guard is time-based, not idempotent.** Between the first call and the flag clearing ~1000ms later, every resize is dropped — not queued. A slow drag-resize on desktop settles one second after you stop, not continuously.
- **`.sqr-macro-pixel` is queried but unused** (`let macroPx = …` on line 67). Harmless — it is never dereferenced, so its absence would not throw — but include it, since the intent is clearly to keep it available.
- **The orientation handler resets to 100% before re-solving**, so a rotation produces a brief unscaled frame in addition to the usual ~1s settle.
- **`screen.orientation.addEventListener` is unguarded** at module top level. On an engine where `screen.orientation` is undefined it throws. The initial solve (line 120) and the `onresize` binding (line 121) run *before* it, so those survive; what dies is rotation handling and any code you append after the listener in the same module or bundle chunk.

---

## 10. Checklist

Before you file a bug against your own layout:

- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` present
- [ ] `<style id="square-root"></style>` present, in `<head>`, **after** every stylesheet link
- [ ] `.sqr-macro-rem` and `.sqr-macro-pixel` present as direct children of `<body>`
- [ ] `.fixed` resolves to `position: fixed`, `.invisible` to `visibility: hidden` (not `display: none`)
- [ ] The compiled Square Root CSS is actually loaded (check that `.sqr-macro-rem` has a computed width)
- [ ] The JS runs *after* the above exist (`defer`, `type="module"`, or end of `<body>`)
- [ ] No other rule sets `font-size` on `html` or `:root` later in the cascade
- [ ] You have waited ~1s after load before judging the result

---

Square Root is by Neo (N30) at ALL1WEB — <https://github.com/all1web/square-root>.
