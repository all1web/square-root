# Working on Square Root

Read this before changing anything. It carries the context that is not obvious
from the code, and the reasoning that must survive future edits.

## What this is

Square Root is a mobile-first layout framework **invented by Neo Nosrati
(NeoNos)**. It is not a wrapper around someone else's idea and it is not a
utility-class library like Tailwind. It solves one specific problem:

> A design authored for one phone looks wrong on the next, because phones differ
> in width, height *and* aspect ratio. Breakpoints answer this by redrawing the
> design at 2–3 sizes and hoping the in-between behaves.

Square Root's answer instead: **declare one canonical device, author everything
in `rem` against it, then solve the root font-size at runtime so the canon lands
exactly on the real viewport.** Nothing re-flows; the whole composition scales as
one piece, so proportion and rhythm are identical on every screen.

The three source files are small enough to read end to end, and you should,
before your first edit:

- `src/square-root.scss` — the custom properties and the generated `sqr-*` classes
- `src/_scrollsnap.scss` — the snap layer
- `src/square-root.js` — the scaler (the actual invention)

## The mechanism, in one pass

1. `:root` declares the canon: `--macro-width: 360`, `--macro-height: 720`, and
   the finger unit `--micro-width/height: 60`.
2. Every utility is `calc(var(--micro-width) * N * 0.0625rem)`. Since
   `0.0625rem` is 1/16 rem, those variables read as **reference pixels at a 16px
   root**.
3. Two invisible probes sit in the host page. `.sqr-macro-rem` is the measuring
   stick — it is `--macro-width * 0.0625rem` = 22.5rem = 360px at a 16px root.
4. `square-root.js` resets `:root{font-size:100%}` via a `<style id="square-root">`
   tag the host page must provide, measures the probe's live width, computes
   `ratio = innerWidth / probeWidth`, and writes `:root{font-size:(ratio*100)%}`
   back into that tag.
5. Because everything is rem, the canon now spans exactly the viewport width.

Verified live: at a 375px viewport the root solves to 16.67px and the probe
measures exactly 375px.

## The numbers are researched. Do not "tidy" them.

This is the single most important thing to preserve. Every constant has a reason,
documented in `docs/DESIGN-RATIONALE.md`:

- **60 (the micro unit)** is the smallest block that is reliably tappable. Touch
  research puts an average fingertip at ~45–52px and a thumb at ~72px; 60 sits
  deliberately between them. Because every utility is a multiple of it, nothing
  built from Square Root units can accidentally be too small to hit. Tappability
  is structural, not a review checklist.
- **360 × 720** is the canonical phone: 360 is the practical floor of the modern
  phone class (design to the smallest real device and scale *up*), and 720 is
  exactly 2 × 360.
- **360 = 6 × 60 and 720 = 12 × 60.** Macro and micro are commensurate by
  construction, so no layout built from micro units lands on a fractional
  relationship with the page. The two constants had to be chosen together.
- **Device brackets** follow real device classes. The landscape media query is
  bounded `361px–768px` specifically to exclude watches (≤320) and tablets
  (≥768), which the source comments record as the result of actual testing.
- **The `cols` factors** (1.2 at md, 1.61 at lg) deliberately under-fit the
  scale so the *next column peeks in* at the screen edge. That sliver is the
  affordance for horizontal scrolling — built into the geometry instead of added
  as UI chrome.

If you propose changing a constant, say which principle it serves and why the
change is better. "Rounder number" is not a reason.

## Two known quirks — documented on purpose, do not silently fix

Both are in `src/square-root.js` and are described in the README and CHANGELOG:

1. **Double `cols` division.** For screens where `cols !== 1`, the ratio is
   divided by `cols` twice — once unconditionally, then again in the `else`
   branch whose `if` body is fully commented out. This makes md/lg scale smaller
   than a single division would. It may be deliberate tuning of the peek.
2. **`window.onload = simulateScreen();`** has parentheses, so it *invokes*
   immediately and assigns `undefined` to `onload` — the load handler never
   binds. Masked because `onresize` and the `orientationchange` listener fire.

They are left as-is so existing projects depending on current scale behaviour are
not surprised by an upgrade. **Fix only with Neo's explicit say-so**, and if you
do, ship it as a minor version with a migration note in the CHANGELOG.

## House rules for this repo

- **Accuracy over enthusiasm** in docs. Every claim must be checkable against the
  source. No invented APIs, no option flags that don't exist, no fictional
  commands. If something is unavailable (there is a large commented-out block in
  the SCSS), say so rather than documenting it as usable.
- **Keep `dist/` in sync with `src/`.** They drifted once already. Rebuild with
  `npm run build` after any SCSS change and commit both.
- **The docs are part of the product.** This framework's value to Neo is
  reputational — it is free and MIT, published to establish authorship of the
  idea. Sloppy documentation costs more here than a missing feature.
- **Don't add dependencies.** It is plain SCSS and one dependency-free JS file.
  That is a feature.
- **Preserve the original comments in the source.** Neo's notes record the
  reasoning and the testing that produced the values, including the false starts.
  They are primary sources.

## Consumers

`products` (the ALL1.AI template builder) consumes this via
`"@all1web/square-root": "github:all1web/square-root"` and pulls updates with
`npm update @all1web/square-root`. Changes here reach it — so treat scale
behaviour as a public API.

## Where things are

| Path | What |
|---|---|
| `src/` | the framework — source of truth |
| `dist/` | compiled CSS, checked in, must match `src/` |
| `docs/DESIGN-RATIONALE.md` | **why every constant is what it is — read first** |
| `docs/MEASURING.md` | the authoring workflow — artboard px ÷ 60 → classes, snapping, verification |
| `docs/HOW-IT-WORKS.md` | the scaler in depth, worked ratio tables |
| `docs/UTILITIES.md` | complete class reference |
| `docs/INTEGRATION.md` | HTML / Vite / Laravel / Tailwind adoption |
| `docs/SCROLL-SNAP.md` | the snap layer |
| `examples/index.html` | runnable demo with a live readout |
