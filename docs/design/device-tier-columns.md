# Device-tier columns — column count from device pixels, not aspect (owner, 2026-09-10 22:40, package repo)

## 1. The owner's words, verbatim

> "well I think considering device pixels is > 1600x1900 approx and the scale is close to 2. its a
> screen that doesn't need the small mobile screen. now I don't think this should be the default for
> square root but in this website 1 col is for mobile small screens and 2 col is for screens like this,
> once we narrow this down I'm gonna make ipad and tablets 3 cols probably."

The reading this came from (his Debug tab, live, on his own device): viewport 637×727 CSS px,
`devicePixelRatio` 2.63, viewport-device-pixels ≈ 1672×1908, Square Root's own solved `Scale` 1.7694
(root 28.3px, finger 106.2px — 1.77× the 60px canon). Aspect h/w 1.14 — genuinely portrait, nowhere near
the `data-sqr-short` trigger (needs `width > 1.2 × height`), so the aspect-based short-screens feature
(0.7.0) correctly never touches this case. The owner is naming a DIFFERENT axis entirely: not the
window's shape, but its raw pixel budget — is this window, right now, rendering enough real pixels that
one column stretched to fill it reads as absurd, regardless of orientation.

## 2. The two numbers he named, precisely

Both numbers he cited are **viewport**-based, not the physical screen's own resolution (`screen.width` /
`screen.height`, which his Debug tab reports separately at 708×823 and which he did NOT cite) — so the
signal is inherently self-limiting: narrow the same Fold's split further and the viewport-device-pixels
shrink with it, correctly falling back to one column on a genuinely small slice of even a large device.

1. **Viewport device pixels** — `innerWidth × devicePixelRatio` and `innerHeight × devicePixelRatio` (or
   `document.documentElement.clientWidth/clientHeight`, matching the fit switch's own choice of the
   conservative reader — see `square-root.js`'s `clientHeight` comment). His threshold: **≈ 1600 × 1900**.
2. **The solved scale** — Square Root's own `ratio` (root font-size ÷ 16) at `cols = 1`, i.e., how far the
   single-column canon has already been stretched before this feature runs. His threshold: **≈ 2**, i.e.
   close to or past double the canon's native size.

Read together: a window is "not a small mobile screen" when it is BOTH physically pixel-dense (`device
pixels ≥ threshold`) AND already being asked to stretch its one column well past native size (`scale ≥
threshold`). Two independent, correlated confirmations rather than one number that could false-positive
on an odd device.

## 3. The two/three tiers, and where this repo's job ends

| tier | today | owner's plan |
|---|---|---|
| **small mobile** | 1 column | unchanged |
| **large screen** | (what this feature adds) 2 columns | this pass |
| **tablet (iPad etc.)** | not distinguished yet | 3 columns, **"once we narrow this down"** — his own words mark the exact tablet threshold as undecided. Scaffold the mechanism for a third tier; do not invent numbers for it. Flag the extension point clearly and stop. |

## 4. Where this lives: package mechanism, app policy (his own separation)

> "I don't think this should be the default for square root but in this website" — the exact shape every
> other switch in this package already takes (`data-sqr-fit`, `data-sqr-short`, `data-sqr-max-cols`): the
> package ships the MECHANISM, opt-in, default inert, byte-identical to today's solve until switched on;
> `products/resources/js/theme.js` supplies ALL1's own threshold numbers, the same file that already sets
> `sqr-peek` and previously set `data-sqr-short` before that became the package default.

**Why this cannot be app-side alone.** The naive fix — have `theme.js` read the numbers and slap
`data-sqr-cols="2"` on `<html>` after the fact — would be cosmetic and wrong: the CSS column rules would
follow the stamped attribute, but the SOLVED SCALE (the root font-size the `#square-root` style tag
writes) would still be computed for `cols = 1`, because that division only happens inside
`simulateScreen()`'s own `ratio = ratio / cols` line. The result would be two columns rendered at the
SAME oversized single-column scale — doubling the effective canvas width past the viewport, not fixing
the problem. The decision has to be made BEFORE the ratio divide, inside the solver, the same place
`data-sqr-short`'s pass already sits.

## 5. The mechanism (binding, in the solver's own vocabulary)

A new switch, same pattern as `data-sqr-short`: `data-sqr-device-cols` / `--sqr-device-cols`, **off by
default** (today's solve untouched, byte-for-byte, the same two proofs 0.6.0 and 0.7.0 each made). When
on, it reads a **threshold table** from the host page rather than one hardcoded number, because the owner
is explicit that tier 3 is still undecided and more tiers may follow:

```
data-sqr-device-cols="tiers"
data-sqr-device-tiers='[{"cols":2,"minDevicePx":1600,"minScale":2},{"cols":3,"minDevicePx":???,"minScale":???}]'
```

(exact attribute/JSON shape is the designer's call — the constraint is: an ORDERED table of
`{cols, minDevicePx, minScale}`, evaluated after the base pass and any `data-sqr-short` pass have set
their own `cols`, picking the HIGHEST tier whose thresholds are met, never lowering `cols` below what
either of those already decided. products' `theme.js` supplies only the tier-2 row for now; tier 3 is
scaffolded in the mechanism but not populated — the designer states plainly where a future tier-3 row
would go and what it would need, not what its numbers are.)

**The two numbers, computed where the solver already has them cheaply:**
- `viewportDevicePx = { w: width * devicePixelRatio, h: height * devicePixelRatio }` — `width`/`height`
  are already local variables in `simulateScreen()`.
- `solvedScale = ratio` at the point immediately BEFORE this pass runs (i.e., the scale the page would
  get at whatever `cols` the earlier passes chose) — read it before this pass's own `cols` change, so a
  tier decision doesn't examine a scale it hasn't caused yet.

**Applying a promoted tier:** if a tier's thresholds are met and its `cols` exceeds the current `cols`,
set `cols` to that tier's value THEN let the existing `ratio = ratio / cols` line (or the short-screens
loop's own re-solve) run against the NEW `cols`, so the scale is correctly halved (or thirded) for the
promoted column count — not merely stamped on top of an unchanged scale. Publish `data-sqr-cols` exactly
as `data-sqr-short` already does (the attribute the CSS mixin reads; NOT in the `MutationObserver`'s
`attributeFilter`, so publishing an answer can never re-trigger the solve).

**Order of operations, precisely:** base bands decide → 0.3.0 ceiling caps → `data-sqr-short`'s
aspect-based pass may lift `cols` → THIS pass may lift `cols` further, using the scale that resulted from
everything before it → the final `ratio = width / simulatedWidth / cols` (or equivalent) is computed once,
against the FINAL `cols`, not recomputed twice. If both `data-sqr-short` and this pass would fire, the
higher of their two proposed `cols` wins; neither pass ever lowers what the other decided.

## 6. What must not regress (re-verify these four exactly, before and after)

| viewport | today | must stay |
|---|---|---|
| 375×812 (phone) | 1 col, scale 1.0417 | unchanged |
| 708×823 (Fold open) | 2 col | unchanged |
| 637×320 (Fold split, landscape — the 0.7.0 case) | 2 col via `data-sqr-short` | unchanged |
| **637×727 (Fold split, portrait — this ask)** | 1 col, scale 1.7694 | **→ 2 col**, scale correctly halved (≈0.885, finger ≈53px) |

Also verify: `data-sqr-device-cols` absent or `off` → the whole pass is inert, zero DOM reads beyond
checking the attribute (same proof `data-sqr-short`'s banner makes); a viewport just under both
thresholds (e.g., device px ≈1500, scale ≈1.8) stays at whatever the earlier passes already gave it, not
promoted; a viewport meeting the device-px threshold but not the scale threshold (or vice versa) does NOT
promote — both must hold.

## 7. Where it reaches products (the owner tests live on his Fold)

1. Package: `src/square-root.js` (the pass), `src/square-root.scss` (no new CSS needed — it reuses the
   same `html[data-sqr-cols="N"]` rules `data-sqr-short` already added), `package.json` version bump,
   `CHANGELOG.md` / `README.md` in the house voice, quoting the owner.
2. Mirror `src/square-root.js` (and `.scss` if touched) into
   `C:/Users/colum/Documents/GitHub/products/node_modules/@all1web/square-root/src/` — the same manual
   mirror step every prior Square Root feature this session used, since `products` installs from GitHub,
   not a local path.
3. `products/resources/js/theme.js`: set `data-sqr-device-cols="tiers"` and the tier-2 row
   (`{"cols":2,"minDevicePx":1600,"minScale":2}`) at the same early point `sqr-peek` is already set,
   before Square Root's own script runs its first solve.
4. `npm run build` in `products`.

## 8. Untouchable

Everything `data-sqr-short` and the 0.3.0 ceiling already own stays exactly as it is; this pass only ever
ADDS to `cols`, after them, using their result as its own starting point. No px/rem literals — this is
pure arithmetic on already-measured values. Emoji never in attribute names or JSON keys. No git commands
by any agent — the package repo is the owner's to commit.

## 9. Verify (Sonnet — harness `products/tools/verify/harness.cjs`, owner path
`http://127.0.0.1:8002`/mirrored build, then confirm once more on `100.90.6.29:8002`)

The four-row table in §6, both with the switch on (products' real config) and with
`data-sqr-device-cols` absent (proving the package default is untouched). For the promoted 637×727 case:
read `data-sqr-cols`, the computed root font-size, the resulting finger px, and a raster of the Map board
at that exact viewport showing two real columns, not one stretched column with an attribute lie. Report
the near-threshold non-promotion cases from §6 with their actual numbers. `node tools/verify/sqr-lint.cjs`
on any touched products file. MAX % first; file:line for every change; `model_id`.
