# Device-tier columns — the design (0.8.0)

Companion to `device-tier-columns.md` (the brief). Written by the Opus subagent, 2026-09-10, against
the working tree's UNCOMMITTED 0.7.0. Every line number below is `src/square-root.js` as it stands in
that tree. Nothing here reverts a line of 0.7.0.

---

## 0. Read this first — four findings that change the brief's own numbers

The brief hands the app row `{"cols":2,"minDevicePx":1600,"minScale":2}` (§5, §7.3). Modelled against
the solver's actual arithmetic, three of those four numbers need a decision before anything is built.
The model is `scratchpad/tiers-model.cjs` / `tiers-model2.cjs` — a transcription of lines 403-509 plus
the proposed pass, no browser, 105,696 (width, height, dpr) combinations.

**F1 — `minScale: 2` ships a feature that can never fire.** His own reading is `Scale 1.7694`
(= 637 / 360, and `637 / 360 / 1` is exactly the expression already on line 505). A threshold of 2
rejects it. So does 1.9, and so does 1.8:

| `minScale` | promoted widths at dpr 2.625, h = 727 | promoted finger |
|---|---|---|
| 2.0 | **none** | — |
| 1.9 | **none** | — |
| 1.8 | **none** | — |
| **1.75** | **630-639** | 52.50 - 53.25px |
| 1.6 | 610-639 | 50.83 - 53.25px |
| 1.5 | 610-639 | 50.83 - 53.25px |

1.75 is the highest round value that promotes the screen he asked about. **Use 1.75.** §8.2 argues it.

**F2 — the threshold has a physical meaning, and it is the finger.** A 1 -> 2 promotion halves the
scale, so the promoted finger is `60 x minScale / 2` = **`30 x minScale` px, exactly**. 1.75 buys a
52.5px floor; 1.5 buys 45.00px, the researched touch floor this framework is built on
(`docs/DESIGN-RATIONALE.md`). Below 1.5 the promotion hands back a finger the package itself calls too
small. That identity is the dial the owner should be given, in those words.

**F3 — the long edge at 1900 sits 0.44% under his live reading, and the URL bar crosses it.** At
637 x 727 CSS, dpr 2.625, the long edge is 1908.375 device px against a 1900 threshold. An Android
URL-bar collapse is a height-only resize of 60-100 CSS px = 158-263 device px, and `window.onresize`
re-solves. The page would flip 2 -> 1 columns (finger 53 -> 106px) the moment he scrolls. Headroom:

| long-edge threshold | CSS height that still clears it (dpr 2.625) | URL-bar headroom from 727 |
|---|---|---|
| 1900 | 723.8px | **3.2px** |
| 1800 | 685.7px | 41.3px |
| **1700** | 647.6px | **79.4px** |

Ship the app row with **1700**. The rectangle is still his — the short edge, 1600, is the load-bearing
half and is untouched, and in portrait it does not move with the URL bar at all. §8.3 argues it.

**F4 — the feature's whole footprint on today's numbers is a ten-pixel band of split widths, and
that is correct.** Across the 105,696-combination sweep, with the switch on, **zero non-promoted
viewports move a digit** and the promoted set is exactly `width 630-639 CSS px` (on his device, at
`height >= 724`). The reason is that the 0.3.0 ceiling branch at line 433 already gives 2 columns at
every width `>= 640`. His 637 is three pixels short of that cliff — **the same three-pixel seam
0.7.0 was about, one branch further up**. The feature is not a new layout regime; it is the last
10px of the 640 cliff, gated so it cannot false-positive. Say that plainly in the changelog rather
than overselling it.

---

## 1. The insertion points, verbatim

### 1.1 Constants and readers — between `sqrMacroColumns()` (ends :375) and `simulateScreen()` (:378)

OLD (lines 373-378):

```js
    if (!(mw > 0) || !(probePxW > 0)) return 1;
    return probePxW / mw;
}


function simulateScreen() {
```

NEW:

```js
    if (!(mw > 0) || !(probePxW > 0)) return 1;
    return probePxW / mw;
}

// ---------------------------------------------------------------------------
// DEVICE TIERS -- columns from the device's own pixels, not its shape (0.8.0).
//
// Neo, 2026-09-10: "well I think considering device pixels is > 1600x1900
// approx and the scale is close to 2. its a screen that doesn't need the small
// mobile screen. now I don't think this should be the default for square root
// but in this website 1 col is for mobile small screens and 2 col is for
// screens like this, once we narrow this down I'm gonna make ipad and tablets 3
// cols probably."
//
// A DIFFERENT AXIS FROM 0.7.0. data-sqr-short asks whether the window is SHORT
// for its column -- shape. This asks whether the window is BIG -- raw pixel
// budget -- and it is the question the aspect can never answer: his split was
// 637x727 CSS, aspect 1.14, genuinely portrait, nowhere near the 1.2 trigger,
// and still 1672x1908 real pixels being asked to carry one 637px column at
// 1.77x the canon. Two independent signals have to agree before a column is
// added, because either alone false-positives: a 411x960 phone at dpr 4 has
// 1644 device pixels across and is still a phone (its scale is 1.14), and a
// 500px slice of the same Fold is still at 1.39 scale (its short edge is 1313).
//
//   <html>                                          off (default)
//   <html data-sqr-device-cols="tiers"
//         data-sqr-device-tiers="2 1600 1700 1.75"> on, one tier
//   :root { --sqr-device-cols: tiers }              the same, server-rendered
//
// THE TABLE. One row per tier, four numbers, in this order:
//
//        cols   minShortPx   minLongPx   minScale
//         |         |            |           `- the scale the earlier passes
//         |         |            |              already solved, width/(probe*cols)
//         |         |            `- the LONGER viewport edge, in device pixels
//         |         `- the SHORTER viewport edge, in device pixels
//         `- how many columns this tier asks for (>= 2; a row asking for 1 is dropped)
//
// Rows are separated by commas, fields by spaces: "2 1600 1700 1.75, 3 ..." --
// deliberately NOT JSON. JSON needs a single-quoted HTML attribute, a
// try/catch, and it cannot survive the --sqr-* custom-property channel every
// other switch in this package offers; four numbers in CSS's own value syntax
// need none of that and read back through sqrSetting() unchanged. See
// docs/design/device-tier-columns-design.md section 8.1.
//
// EDGES, NOT WIDTH-AND-HEIGHT. The pair is sorted before it is compared, so the
// same window promotes the same way in both orientations. Comparing w>=1600 and
// h>=1900 as written would have flipped on rotation; comparing the AREA would
// have promoted a 411x960 phone at dpr 4 (6.3 megapixels) that the short edge
// correctly refuses.
//
// THE PROMOTED FINGER IS THE THRESHOLD, HALVED. A 1 -> 2 promotion halves the
// solved scale, so the finger it leaves is exactly 30 * minScale px. 1.75 keeps
// a 52.5px finger -- the same finger 0.7.0 already ships on his landscape split
// (53.08px). 1.5 would keep exactly the researched 45px floor. Below that this
// package is handing back a finger it calls too small; choose the number as a
// finger, not as a scale.
//
// OFF BY DEFAULT, and byte-identical twice over -- the same two proofs 0.6.0 and
// 0.7.0 each make:
//   (a) by construction -- the clientHeight read, the devicePixelRatio read, the
//       tier parse, the promotion and the attribute write all sit behind
//       `sqrDeviceMode === SQR_DEVICE_TIERS`. With the switch absent not one
//       statement of them runs, sqrDeviceApplied stays false, and the publish
//       guard below is `sqrShortMode === SQR_SHORT_COLS || false` -- 0.7.0's
//       condition exactly.
//   (b) what it DOES cost, stated precisely: one sqrDeviceCols() call, which
//       with the attribute absent falls through to a single getComputedStyle.
//       A style read, not a layout read, on already-clean style -- sqrMaxCols()
//       flushed at line 431 and nothing between there and here mutates the DOM,
//       so this is the fourth map lookup on one flush, not a fourth flush.
//   The pass also never LOWERS anything: it compares `want > cols` and publishes
//   Math.max(sqrPublishedCols, cols). Turning it on can add a column; it can
//   never take one away, and it cannot move the scale of a viewport it declines.
// ---------------------------------------------------------------------------
const SQR_DEVICE_COLS_ATTR  = 'data-sqr-device-cols';
const SQR_DEVICE_COLS_VAR   = '--sqr-device-cols';
const SQR_DEVICE_TIERS      = 'tiers';    // the on pole
const SQR_DEVICE_OFF        = 'off';      // the default pole: 0.7.0 to the digit

const SQR_DEVICE_TIERS_ATTR = 'data-sqr-device-tiers';
const SQR_DEVICE_TIERS_VAR  = '--sqr-device-tiers';
const SQR_DEVICE_TIER_FIELDS = 4;         // cols, minShortPx, minLongPx, minScale

function sqrDeviceCols() {
    const raw = sqrSetting(SQR_DEVICE_COLS_ATTR, SQR_DEVICE_COLS_VAR).toLowerCase();
    return raw === SQR_DEVICE_TIERS ? SQR_DEVICE_TIERS : SQR_DEVICE_OFF;   // only a literal 'tiers' opts in; garbage -> off
}

// The table, parsed. A malformed row is SKIPPED, never guessed at: a wrong
// field count, a non-number, or a row asking for fewer than 2 columns drops out
// and the rest of the table still works. An empty or absent table returns [],
// and the pass below is inert on it -- so "switch on, table missing" is a
// no-op, not a crash and not a surprise layout.
function sqrDeviceTiers() {
    const raw = sqrSetting(SQR_DEVICE_TIERS_ATTR, SQR_DEVICE_TIERS_VAR);
    if (raw === '') return [];
    const rows = raw.split(',');
    const out  = [];
    for (let i = 0; i < rows.length; i++) {
        const f = rows[i].trim().split(/\s+/);
        if (f.length !== SQR_DEVICE_TIER_FIELDS) continue;
        const c = parseFloat(f[0]), sp = parseFloat(f[1]), lp = parseFloat(f[2]), sc = parseFloat(f[3]);
        if (!(c >= 2) || !isFinite(sp) || !isFinite(lp) || !isFinite(sc)) continue;
        out.push([Math.floor(c), sp, lp, sc]);   // [cols, minShortPx, minLongPx, minScale]
    }
    return out;
}


function simulateScreen() {
```

### 1.2 The pass — after the short pass closes (:509), before the log (:511)

OLD (lines 505-511):

```js
            let n = Math.round(cols * macroCols);
            if (n > gateN && (width / (simulatedWidth * cols)) < sqrShortNeed) {
                n = Math.max(1, gateN);   // the seam wanted more than the screen (or the gate) supports -- decline to the gate
            }
            sqrPublishedCols = Math.max(1, Math.min(Math.floor(maxCols), n));
        }

        console.log("Screen: "+screen );
```

NEW:

```js
            let n = Math.round(cols * macroCols);
            if (n > gateN && (width / (simulatedWidth * cols)) < sqrShortNeed) {
                n = Math.max(1, gateN);   // the seam wanted more than the screen (or the gate) supports -- decline to the gate
            }
            sqrPublishedCols = Math.max(1, Math.min(Math.floor(maxCols), n));
        }

        /* THE DEVICE-TIER PASS (0.8.0). Off by default; the banner above
           simulateScreen() has the two proofs.

           WHERE IT SITS, AND WHY EXACTLY HERE. The order is the ceiling's, one
           step longer: the bands decide -> the 0.3.0 ceiling caps -> the
           short-screen pass may lift cols for the screen's SHAPE -> this pass
           may lift it again for the screen's PIXELS -> and only then, at line
           589, does `ratio = ratio/cols` divide ONCE, against the final cols.
           That last sentence is the whole reason this cannot live in the host
           app: stamping data-sqr-cols="2" on <html> from outside would move the
           stylesheet and leave the scale solved for one column, i.e. two
           columns at the single-column size -- a canvas twice the viewport.

           `solvedScale` is `width / (simulatedWidth * cols)` -- literally the
           expression already on line 505 above, and the number his Debug tab
           calls Scale. It is read BEFORE this pass changes cols, so a tier
           decision never examines a scale it caused itself. It is also read
           before the peek (:620) and before the fit switch (:647), deliberately:
           both are presentation adjustments applied after the count is settled,
           and the peek only exists WHEN cols == 1, so feeding a peeked scale
           into the decision that sets cols would be circular.

           This pass CANNOT fire inside square-root.scss's landscape swap band,
           and the proof is one line: in that band the probe is 720 and the band
           is capped at 768 CSS px, so solvedScale <= 768/720 = 1.0667 -- below
           any sane minScale. That is why it needs no macroCols of its own:
           wherever it fires, the probe is 360 and the published count is cols.

           The publish is Math.max, never Math.min: this pass adds to what the
           short pass published, and the ceiling clamps the result the same way
           line 508 does. */
        const sqrDeviceMode = sqrDeviceCols();
        let sqrDeviceApplied = false;
        if (sqrDeviceMode === SQR_DEVICE_TIERS) {
            const tiers = sqrDeviceTiers();
            if (tiers.length) {
                /* clientHeight, not innerHeight, for the reason 0.6.0 states at
                   :534 -- the conservative reader of the two. Conservative here
                   can only make the pass DECLINE, never promote, which is the
                   safe direction. The read lands on the same clean layout the
                   short pass read one branch earlier: a cached property, not a
                   second flush. */
                const height   = document.documentElement.clientHeight || window.innerHeight;
                const dpr      = window.devicePixelRatio || 1;
                const shortPx  = Math.min(width, height) * dpr;
                const longPx   = Math.max(width, height) * dpr;
                const solvedScale = (simulatedWidth > 0 && cols > 0) ? width / (simulatedWidth * cols) : 0;
                /* The HIGHEST tier that qualifies wins, taken as a max rather
                   than by first match, so a table written out of order still
                   answers correctly. */
                let want = cols;
                for (let i = 0; i < tiers.length; i++) {
                    const t = tiers[i];   // [cols, minShortPx, minLongPx, minScale]
                    if (shortPx >= t[1] && longPx >= t[2] && solvedScale >= t[3] && t[0] > want) want = t[0];
                }
                want = Math.min(Math.floor(maxCols), want);   // a tier can never out-rank the ceiling
                if (want > cols) {
                    cols = want;
                    sqrPublishedCols = Math.min(Math.floor(maxCols), Math.max(sqrPublishedCols, cols));
                    sqrDeviceApplied = true;
                }
            }
        }

        console.log("Screen: "+screen );
```

### 1.3 The publish guard — line 679

The seam has to publish when THIS pass promoted, even with `data-sqr-short="off"`. Without this the
scale would halve and the stylesheet would never hear about it: one stretched column at half size,
the exact failure brief §4 warns about, inverted.

OLD (lines 678-683):

```js
        const sqrHtml = document.documentElement;
        if (sqrShortMode === SQR_SHORT_COLS) {
            sqrHtml.setAttribute(SQR_COLS_ATTR, String(sqrPublishedCols));
        } else if (sqrHtml.hasAttribute(SQR_COLS_ATTR)) {
```

NEW:

```js
        const sqrHtml = document.documentElement;
        /* 0.8.0: `|| sqrDeviceApplied` -- the device-tier pass publishes its own
           promotion even with data-sqr-short="off", because a promoted cols with
           no attribute is a half-scale single column. sqrDeviceApplied is false
           unless that pass actually raised cols, so with both switches off this
           condition is 0.7.0's, byte for byte, and the hasAttribute-guarded
           removal branch below still performs no DOM write. */
        if (sqrShortMode === SQR_SHORT_COLS || sqrDeviceApplied) {
            sqrHtml.setAttribute(SQR_COLS_ATTR, String(sqrPublishedCols));
        } else if (sqrHtml.hasAttribute(SQR_COLS_ATTR)) {
```

### 1.4 The observer — signature :785, filter :795

Same treatment the fit and short attributes got: attributes are the live switch, custom properties
are the server-rendered channel and are not watched.

OLD (lines 783-786):

```js
         + '|' + (el.getAttribute(SQR_SHORT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_ASPECT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_FLOOR_ATTR) || '');
}
```

NEW:

```js
         + '|' + (el.getAttribute(SQR_SHORT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_ASPECT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_FLOOR_ATTR) || '')
         + '|' + (el.getAttribute(SQR_DEVICE_COLS_ATTR) || '')
         + '|' + (el.getAttribute(SQR_DEVICE_TIERS_ATTR) || '');
}
```

OLD (lines 793-798):

```js
}).observe(sqrPeekElement(), { attributes: true, attributeFilter: [
    'class', SQR_PEEK_ATTR, SQR_FIT_ATTR, SQR_STACK_ATTR, SQR_FIT_FLOOR_ATTR,
    SQR_SHORT_ATTR, SQR_SHORT_ASPECT_ATTR, SQR_SHORT_FLOOR_ATTR
    /* SQR_COLS_ATTR is deliberately absent: it is this solver's OUTPUT.
       Watching it would make every solve schedule the next one. */
] });
```

NEW:

```js
}).observe(sqrPeekElement(), { attributes: true, attributeFilter: [
    'class', SQR_PEEK_ATTR, SQR_FIT_ATTR, SQR_STACK_ATTR, SQR_FIT_FLOOR_ATTR,
    SQR_SHORT_ATTR, SQR_SHORT_ASPECT_ATTR, SQR_SHORT_FLOOR_ATTR,
    SQR_DEVICE_COLS_ATTR, SQR_DEVICE_TIERS_ATTR
    /* SQR_COLS_ATTR is deliberately absent: it is this solver's OUTPUT.
       Watching it would make every solve schedule the next one. */
] });
```

That is the entire package diff: **four edits, one file, no CSS.**

---

## 2. The pass order, and the two proofs

### 2.1 Order of operations, line by line

| # | line | what decides | this pass's view of it |
|---|---|---|---|
| 1 | 405-419 | the width bands set `cols` (1, 1.2, 1.61) | input |
| 2 | 431-436 | 0.3.0 ceiling caps it; `>= 640` rounds to canonical columns | input — and the reason the footprint is only 630-639 |
| 3 | 485-509 | `data-sqr-short` may lift `cols` for SHAPE; computes `sqrPublishedCols` | input — never overwritten, only raised |
| 4 | **NEW, after 509** | **this pass may lift `cols` for PIXELS** | reads `width`, `clientHeight`, `devicePixelRatio`, `simulatedWidth`, `cols`, `maxCols` — all already local except the two device reads |
| 5 | 586-589 | `ratio = width/simulatedWidth`, then `/cols` — **once** | consumes the final `cols` |
| 6 | 606-621 | the peek, only `if (cols == 1 && sqrPublishedCols == 1)` | a promotion makes both 2, so the peek correctly stands down |
| 7 | 647-662 | the fit switch (`css` by default in products) | untouched |
| 8 | 678-683 | the seam publishes `data-sqr-cols` | guard widened, §1.3 |

If both passes would fire, the higher `cols` wins and neither ever lowers the other: step 3 can only
increment in a `while`, step 4 only assigns when `want > cols`.

### 2.2 Proof A — byte-identical by construction

Everything the feature reads or writes sits behind `sqrDeviceMode === SQR_DEVICE_TIERS`:
`clientHeight`, `devicePixelRatio`, `sqrDeviceTiers()`, the comparison, the assignment. With the
attribute and the custom property both absent, `sqrDeviceCols()` returns `off`, `sqrDeviceApplied`
stays `false`, and line 679 evaluates `sqrShortMode === SQR_SHORT_COLS || false` — 0.7.0's own
condition. No statement inside the block executes; no attribute is written; no rule in
`square-root.scss` changes, because no rule was added.

### 2.3 Proof B — what it costs when off, stated precisely

One `sqrDeviceCols()` call. With the attribute absent that is one `getAttribute` miss and one
`getComputedStyle` — a **style** read, not a layout read, landing on style that `sqrMaxCols()` already
flushed at line 431, with nothing mutating the DOM in between. It is the fourth such lookup on the
same flush (`sqrMaxCols`, `sqrFitMode`, `sqrShort`, this), and a lookup on a clean style map is not a
flush. **Zero forced layouts, zero DOM writes, zero bytes of CSS.**

### 2.4 Proof C — measured, not just argued

`scratchpad/tiers-model.cjs` runs both solvers (off, and on with the app's row) over
`width 300-1400 x height {320,360,400,500,640,700,727,760,812,823,900,1000} x dpr
{1,2,2.35,2.5,2.625,3,3.5,4}` = **105,696 combinations**:

```
checked=105696  nonPromotedThatMoved=0  promotedCount=300
promoted widths: 630-639 only
promoted finger range: 52.50 - 53.25px
```

Not one viewport the pass declines differs in `cols`, `sqrPublishedCols`, `data-sqr-cols` or `ratio`.

---

## 3. The tier-3 extension point (scaffolded, deliberately unpopulated)

The owner: *"once we narrow this down I'm gonna make ipad and tablets 3 cols probably."* The
mechanism is finished for it; the numbers are his to name. A future tablet row is **one more comma**:

```
data-sqr-device-tiers="2 1600 1700 1.75, 3 <minShortPx> <minLongPx> <minScale>"
```

It plugs into the `for` loop in §1.2 with no code change — the loop already takes the highest
qualifying tier — and `square-root.scss` already emits every `html[data-sqr-cols="3"]` rule (§4).
**Two things a tier-3 row needs that a tier-2 row does not**, and both are findings, not numbers:

1. **The ceiling must be raised with it.** `want = Math.min(Math.floor(maxCols), want)` — with the
   default `maxCols = 2` a `cols:3` row is silently clamped to 2. A tablet template has to set
   `data-sqr-max-cols="3"` (or `--sqr-max-cols: 3`) alongside the row. Modelled: 1024 x 1366 @ dpr 2
   reaches 3 columns from the 0.3.0 rounding branch alone once the ceiling allows it — no tier row
   needed. The tier row only does work where the ceiling branch does not, i.e. **width 640-899**,
   where `Math.round(width / 360)` returns 2.
2. **Its `minScale` must be read as a finger, the tier-3 way.** A 2 -> 3 promotion multiplies the
   scale by 2/3, so the promoted finger is `40 x minScale` px (against `30 x minScale` for a 1 -> 2
   row). An iPad Air at 834 x 1112 CSS solves `cols = 2`, `scale = 834/(360x2) = 1.1583`, finger
   69.5px; a row that promotes it to 3 leaves a **46.3px** finger and 278px columns. Whether that is
   the right trade is exactly what he said is undecided. **No number is proposed here.**

What a verifier can check today, without his numbers: append a row with deliberately unreachable
thresholds and confirm nothing moves; then a reachable one with `data-sqr-max-cols="3"` and confirm
`data-sqr-cols="3"` and a scale of exactly one third. `tiers-model2.cjs` prints both.

---

## 4. SCSS — the brief's claim confirmed, nothing is missing

`src/square-root.scss:216-243`:

```scss
@for $n from 2 through 4 {
    ...
    @for $m from $n through 4 {
        @include sqr-n-columns($n, '[data-sqr-cols="#{$m}"]');
    }
}
```

The loop bound is **4**, not 2, so `html[data-sqr-cols="2"]`, `="3"` and `="4"` are all emitted, each
carrying the rules for every count it contains. Verified in the compiled artefact:

```
$ grep -o 'data-sqr-cols="[0-9]"' dist/square-root.css | sort -u
data-sqr-cols="2"
data-sqr-cols="3"
data-sqr-cols="4"
$ grep -c 'data-sqr-cols' dist/square-root.css
51
```

`dist/square-root.css:838` is `html[data-sqr-cols="2"].sqr-mode-flow .sqr-flow-2`, which is exactly
the selector products' deck needs (`resources/views/rank-one/content/home-mobile.blade.php:567`,
`<div class="sqr-span-2 sqr-flow-2">`, with `sqr-mode-flow` / `sqr-mode-rows` written to `<html>` by
`resources/js/foldlayout.js:33-34`).

**Conclusion: no new CSS, no SCSS edit, no `dist` change, and no `plugin.cjs` change.** (0.7.0 had to
mirror its new block into the Tailwind plugin; this release adds no block to mirror. `npm run
verify:plugin` should still be run, and should still pass unchanged.)

---

## 5. products wiring — one insertion in `theme.js`

`resources/js/theme.js` is the right file for exactly the reason the brief gives: it already owns the
one place the framework's switch names live for this app (`PEEK_CLASS`, :112-114), and it is imported
at `resources/js/app.js:46` — **twenty-two lines before** `import '@all1web/square-root'` at
`app.js:68`. ES module bodies evaluate in import order, so this runs before the package's top-level
`simulateScreen()` at `src/square-root.js:698`. The very first solve already sees the switch.

OLD (`resources/js/theme.js:134-139`):

```js
paintPeek(readPeek());
/* <body> may not exist yet if this ever runs from <head>; re-apply once
   it does, so the html/body pair never disagree */
document.addEventListener('DOMContentLoaded', () => paintPeek(readPeek()));

/* ── stores ────────────────────────────────────────────────────────── */
```

NEW:

```js
paintPeek(readPeek());
/* <body> may not exist yet if this ever runs from <head>; re-apply once
   it does, so the html/body pair never disagree */
document.addEventListener('DOMContentLoaded', () => paintPeek(readPeek()));

/* ── device tiers ──────────────────────────────────────────────────── */

/* SQUARE ROOT 0.8.0 — WHICH SCREENS ARE "NOT A SMALL MOBILE SCREEN".
   The package ships the mechanism, off by default; these are ALL1's own
   numbers, and they live here for the same reason PEEK_CLASS does — one
   place, and nothing else in the app moves if they change.

   Owner, 2026-09-10, reading his own Debug tab on a Fold split at
   637 × 727 CSS: "device pixels is > 1600x1900 approx and the scale is
   close to 2 … 1 col is for mobile small screens and 2 col is for screens
   like this."

        2      → two columns
        1600   → the SHORTER viewport edge, in device pixels
        1700   → the LONGER one. His reading was 1908 and he said 1900;
                 1900 leaves 3px of headroom and an Android URL-bar
                 collapse is 60–100 CSS px, so the page would flip back to
                 one column the moment he scrolled. 1700 keeps his
                 rectangle with 79 CSS px of room.
        1.75   → the scale the single column had already been stretched to.
                 His reading was 1.7694 (= 637/360). This number IS the
                 finger it leaves: a 1→2 promotion halves the scale, so the
                 promoted finger is 30 × 1.75 = 52.5px — the same finger
                 the landscape split already ships (53.08px).

   A tablet row (3 cols) would be one more comma here AND a raised ceiling
   (data-sqr-max-cols="3"); the owner has not named its numbers yet. This
   runs before app.js imports @all1web/square-root, so the first solve
   already has it. */
const SQR_DEVICE_TIERS = '2 1600 1700 1.75';

document.documentElement.setAttribute('data-sqr-device-cols', 'tiers');
document.documentElement.setAttribute('data-sqr-device-tiers', SQR_DEVICE_TIERS);

/* ── stores ────────────────────────────────────────────────────────── */
```

No px/rem literals enter a blade or an `all1` SCSS partial, so `tools/verify/sqr-lint.cjs` has nothing
to flag; run it on `resources/js/theme.js` anyway, per the standing rule.

Mirror step, exactly as every Square Root feature this session has done it (products installs from
GitHub, not a local path):

```
copy src/square-root.js -> C:/Users/colum/Documents/GitHub/products/node_modules/@all1web/square-root/src/square-root.js
```

`src/square-root.scss` and `dist/` are **not** mirrored — they did not change.

Then, once, at the end:

```
cd C:/Users/colum/Documents/GitHub/products && npm run build
```

---

## 6. Worked numbers — predictions the verifier checks against

Computed by the model in §2.4, from the code in §1.2. `scale0` is the solved scale the pass reads;
`finger` is `3.75 x root px`; `col` is `width / data-sqr-cols`. Pass bar 3%.

### 6.1 The four viewports of brief §6 — switch ON (`2 1600 1700 1.75`)

| viewport | dpr | device px (short x long) | scale0 | promoted | cols | `data-sqr-cols` | root px | finger | column |
|---|---|---|---|---|---|---|---|---|---|
| 375 x 812 phone | 3 | 1125 x 2436 | 1.041667 | no — short edge 1125 < 1600 | 1 | `1` | 16.6667 | 62.500px | 375.00 |
| 708 x 823 Fold open | 2.625 | 1859 x 2160 | 0.983333 | no — scale 0.98 < 1.75 | 2 | `2` | 15.7333 | 59.000px | 354.00 |
| 637 x 320 split landscape | 2.625 | 840 x 1672 | 0.884722 | no — short edge 840 < 1600 | 1 | `2` (0.7.0 seam) | 14.1556 | 53.083px | 318.50 |
| **637 x 727 split portrait** | 2.625 | **1672 x 1908** | **1.769444** | **YES** | **2** | **`2`** | **14.1556** | **53.083px** | **318.50** |

Rows 1-3 are identical to the switch-OFF run, digit for digit (§2.4). Row 4 is the ask: brief §6
predicts "scale correctly halved (~0.885, finger ~53px)" — the model gives `ratio 0.884722`,
`finger 53.083px`. **0% discrepancy against the brief's own target.**

Two independent cross-checks on row 4:

- the promoted finger, 53.083px, is **byte-identical** to the finger 0.7.0 already ships at 637 x 320
  (row 3) — the same 637px carried by two macro columns, arrived at from two different passes.
- the column, 318.50px, equals `360 x 0.0625rem x 14.1556` = 318.50px to five decimals: the deck's
  columns are real macro columns, not a stretched one with an attribute lie.

### 6.2 The same four with the switch OFF (package default) — the regression baseline

| viewport | cols | `data-sqr-cols` | root px | finger |
|---|---|---|---|---|
| 375 x 812 @3 | 1 | `1` | 16.6667 | 62.500px |
| 708 x 823 @2.625 | 2 | `2` | 15.7333 | 59.000px |
| 637 x 320 @2.625 | 1 | `2` | 14.1556 | 53.083px |
| 637 x 727 @2.625 | 1 | `1` | 28.3111 | 106.167px |

Rows 1-3 must match §6.1 exactly. Row 4 is the before-picture: one 637px column at a 106px finger.

### 6.3 Near-threshold non-promotions — each fails exactly one test

| # | viewport | dpr | device px | scale0 | which test fails | result |
|---|---|---|---|---|---|---|
| N1 | 637 x 727 | **2.35** | 1497 x 1708 | 1.769444 | **short edge** 1497 < 1600 | 1 col, root 28.3111, finger 106.167px |
| N2 | 600 x 760 | **2.70** | 1620 x 2052 | 1.666667 | **scale** 1.667 < 1.75 | 1 col, root 26.6667, finger 100.000px |
| N3 | 637 x 640 | 2.625 | 1672 x 1680 | 1.769444 | **long edge** 1680 < 1700 | 1 col, root 28.3111, finger 106.167px |
| N4 | 500 x 727 | 2.625 | 1313 x 1908 | 1.388889 | **short edge** 1313 < 1600 | 1 col, root 22.2222, finger 83.333px |

N1 and N2 are the brief's two required cases and they are as clean as this gets: **N1 is the owner's
exact viewport with only the device-pixel ratio changed**, which isolates the device half of the rule;
N2 fails on scale alone with the device half comfortably passed. N3 proves the long edge earns its
place — it is the only test that declines a near-square 637 x 640 window. N4 is the self-limiting
property of brief §2: narrow the same Fold's split and it falls back on its own.

**If the owner keeps his literal 1900** rather than the 1700 of §0 F3, N3 becomes `635 x 700 @ 2.52`
(device 1600 x 1764, long edge 1764 < 1900, declines) and row 4 of §6.1 keeps only 3.2 CSS px of
URL-bar headroom. Report whichever number is actually in `theme.js`.

### 6.4 The dpr threshold at his exact viewport

637 x 727 CSS, `minScale 1.75`: the short edge binds at dpr 2.512, the long edge (at 1700) at 2.339.

| dpr | device px | promoted |
|---|---|---|
| 2.00 | 1274 x 1454 | no |
| 2.50 | 1593 x 1818 | no |
| 2.51 | 1599 x 1825 | no |
| **2.625 (his)** | **1672 x 1908** | **yes** |
| 3.00 | 1911 x 2181 | yes |

### 6.5 Peek interaction (his Customize pin persists in localStorage)

With `sqr-peek` pinned on, the promoted row is unaffected — `cols == 1` is false, so line 620 never
runs and the scale stays 0.884722. The non-promoted rows peek exactly as they do today (375 x 812:
ratio 0.927083, finger 55.625px). The 0.7.0 refuter fix at :606 and this pass agree by construction.

---

## 7. Ship: version, changelog, readme, dist

### 7.1 Version

- `package.json:3` — `"version": "0.7.0"` -> `"0.8.0"`
- `CITATION.cff:19-20` — `version: 0.7.0` -> `0.8.0`; `date-released: "2026-09-10"` stays (same day).

### 7.2 `CHANGELOG.md` — new entry above the 0.7.0 one

~~~markdown
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
  only ADD columns, never remove one, and never out-rank `data-sqr-max-cols`.
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
- **No new CSS.** It reuses the `html[data-sqr-cols="N"]` rules 0.7.0 added; `square-root.scss`,
  `dist/` and `plugin.cjs` are unchanged.
- Live-togglable: the observer watches the two new attributes alongside the peek, fit and short ones,
  same signature short-circuit. The custom properties stay the server-rendered channel.
- **Measured**: across 105,696 (width × height × DPR) combinations with the switch on, not one
  viewport the pass declines moves a digit of `cols`, `data-sqr-cols` or the solved ratio. With ALL1's
  own row the promoted set is exactly `width 630–639 CSS px` on a dense enough screen — the last ten
  pixels below the 640 cliff where the 0.3.0 ceiling already gives two columns. Small on purpose.
- Scaffolded, not populated: a third tier (*"once we narrow this down I'm gonna make ipad and tablets
  3 cols probably"*) is one more row plus a raised ceiling. His numbers, when he names them.
- Unchanged: the bands, the ceiling, the peek, the fit switch, the short-screen pass, the landscape
  media query and its bounds, every constant in `docs/DESIGN-RATIONALE.md`, and both known quirks.
~~~

### 7.3 `README.md` — a new section after "Short screens", before "Known quirks" (`:637`)

Matching the fit switch's and short screens' own format: the italic status line, the HTML block, the
field table, the **Settings.** table, worked answers, the live-flip block, and a
`### ⚠ What this costs you`.

~~~markdown
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
| `cols` | how many columns this tier asks for (2 or more) |
| `minShortPx` | the **shorter** viewport edge, in device pixels (`min(w,h) × devicePixelRatio`) |
| `minLongPx` | the **longer** one. The pair is sorted, so rotation does not flip the answer |
| `minScale` | the scale the earlier passes already solved, `width / (probe × cols)` |

**All four must hold**, and the highest qualifying tier wins. A tier can only add columns, never
remove one, and never out-rank `data-sqr-max-cols`.

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
tier; a `3 …` row without `data-sqr-max-cols="3"` is silently a 2.
~~~

### 7.4 dist

`npm run build` is **not required** — no SCSS changed. Run it anyway to prove the point, and confirm
`git diff --stat dist/` is empty:

```
cd C:/Users/colum/Documents/GitHub/square-root
npm run build          # sass src/square-root.scss dist/square-root.css --no-source-map
npm run verify:plugin  # must still pass, unchanged
git diff --stat dist/  # must be EMPTY — if it is not, something touched the SCSS
```

(No agent commits. The package repo is the owner's.)

---

## 8. Why mine is better — every departure from the brief, argued

### 8.1 A space/comma table, not JSON (brief §5's example encoding)

The brief left the shape to the designer and asked for the argument. JSON costs four things the CSV
form does not:

1. **It cannot survive the custom-property channel.** Every switch this package ships offers
   `data-sqr-*` **and** `--sqr-*`, read through one function, `sqrSetting()` (:166-173) — that is how
   a server-rendered default works. `--sqr-device-tiers: [{"cols":2,…}]` is a CSS value whose
   serialisation through `getComputedStyle().getPropertyValue()` is not something you can reason
   about by reading it. `--sqr-device-tiers: 2 1600 1700 1.75` is an ordinary CSS value that looks
   like a `transition` list, because it is one. The CSV form uses `sqrSetting()` **unchanged**.
2. **It forces a single-quoted HTML attribute.** `data-sqr-device-tiers='[{"cols":2}]'` is fine in a
   blade and a trap everywhere else. Four numbers need no quoting at all.
3. **It needs `JSON.parse` in a `try`** on a path that runs on every solve, plus per-row shape
   validation anyway (`typeof t.cols === 'number'` …). The CSV form's whole parser is
   `split(',')` → `trim().split(/\s+/)` → four `parseFloat`s, and a malformed row is skipped rather
   than guessed at.
4. **Key names would be the only self-documentation, and they are not needed.** The four fields are
   named in the banner, in the README's field table, in the constants, and in `theme.js`'s own comment
   where they are actually written — four places against one, at the cost of positional order.

If the owner prefers JSON, this is a fifteen-line change confined to `sqrDeviceTiers()`; nothing else
in the design depends on the encoding.

### 8.2 `minScale 1.75`, not the brief §7's literal `2`

**At 2 the feature is dead on arrival on the exact screen it was asked for.** His reading is 1.7694
(§0 F1: 1.9 and 1.8 are dead too). The literal number in the brief comes from his words *"the scale is
close to 2"* — a description of what he measured, not a threshold he tuned. 1.75:

- is the highest round number that promotes 637 × 727;
- sits 1.1% under his own reading, inside his 3% pass bar;
- is `7/4`, i.e. "the one column has been stretched past 630 CSS px";
- and, by the identity in §0 F2, keeps a **52.5px** finger — 0.7% from the 53.08px finger 0.7.0 ships
  on his landscape split, which he approved. The promoted layout is not a new size; it is the size he
  already signed off, arriving at a viewport that could not previously reach it.

### 8.3 The long edge at 1700 in the app row, not his 1900

**Not a disagreement with his number — a URL-bar collapse crossing it.** His live long edge is 1908.4
device px against 1900: **0.44% of headroom**, and `window.onresize` re-solves on a height-only
change. Android's URL bar is a 60–100 CSS px collapse = 158–263 device px, so scrolling his own report
would flip the page 2 → 1 columns, finger 53 → 106px, mid-gesture. 1700 keeps the same rectangle and
the same intent with 79 CSS px of room. **The short edge — the half that actually carries the
decision, and the half that does not move with the bar — is exactly his 1600, untouched.** The
package's README says this out loud so the next host does not repeat it.

### 8.4 A sorted rectangle, not one number and not the area

The brief's table shape had a single `minDevicePx`. Modelled:

- **`w >= 1600 && h >= 1900` as written** flips on rotation: the same window turned sideways is
  1908 × 1672 and fails the height test. Wrong by construction.
- **Area** (`>= 3.04 Mpx`) promotes a 411 × 960 phone at DPR 4 — a real device, 1644 × 3840 = 6.3
  Mpx — to two columns. A tall dense phone has a big area and is still a phone.
- **Short edge alone** promotes that same phone (1644 >= 1600) and is only saved by the scale test.
- **Sorted `short >= A && long >= B`** is orientation-free, uses both numbers he actually said, and
  is one comparison pair. It also does real work: at 637 × 640 it is the only test that declines.

### 8.5 The promotion publishes its own count, bypassing the short pass's floor gate

Feeding a promotion through line 505's gate would **invert** the feature. That gate asks whether the
finger at the solved `cols` clears `sqrShortNeed`, and on a portrait screen `sqrShortNeed` is 1.0 — a
whole canonical finger. A 1 → 2 promotion always halves the finger, so it always fails, and the seam
would publish `1` while `cols` is `2`: the scale halved, the stylesheet still on one column. Exactly
one stretched column with an attribute lie, which is what the verifier is told to look for.

The gate is right for what it guards — the naive `cols × macroCols` product on a **rotated** probe —
and this pass provably never fires on a rotated probe (§1.2: `solvedScale <= 768/720 = 1.0667` inside
the band, below any sane `minScale`). Different justification, different gate. Its own two thresholds
**are** its gate.

### 8.6 Highest qualifying tier by `Math.max`, not first match in an ordered table

The brief says "ordered table … picking the HIGHEST tier whose thresholds are met". Taking the max
honours the order and does not depend on it, so a host that appends a tier-3 row above the tier-2 row
gets the right answer instead of a silent bug. Same cost, one comparison a row.

### 8.7 One thing the brief asked for that is NOT worth building

Brief §6's third check — *"a viewport just under both thresholds (e.g., device px ≈1500, scale ≈1.8)"*
— is unbuildable as stated: 1.8 is **above** any workable `minScale`, so that viewport fails on the
device half only. §6.3 splits it into the two single-failure cases N1 and N2, which is what the check
was reaching for and is strictly more informative: each isolates one half of the rule.

---

## 9. What the verifier should measure (Sonnet)

One headless-Edge session, `products/tools/verify/harness.cjs`, `A1_BASE=http://127.0.0.1:8002`, then
**one** confirmation pass on `100.90.6.29:8002`.

| # | viewport | dSF | switch | expect |
|---|---|---|---|---|
| 1 | 375 × 812 | 3 | on | `data-sqr-cols="1"`, root 16.6667px, finger 62.500px |
| 2 | 708 × 823 | 2.625 | on | `data-sqr-cols="2"`, root 15.7333px, finger 59.000px |
| 3 | 637 × 320 | 2.625 | on | `data-sqr-cols="2"`, root 14.1556px, finger 53.083px |
| 4 | **637 × 727** | **2.625** | **on** | **`data-sqr-cols="2"`, root 14.1556px, finger 53.083px, two real deck columns of 318.5px** |
| 5 | rows 1-4 | same | **off** (`removeAttribute('data-sqr-device-cols')` + `squareRootResolve()`) | rows 1-3 identical; row 4 back to root 28.3111px, finger 106.167px, `data-sqr-cols="1"` |
| 6 | 637 × 727 | 2.35 | on | not promoted — root 28.3111px |
| 7 | 600 × 760 | 2.70 | on | not promoted — root 26.6667px |
| 8 | 637 × 640 | 2.625 | on | not promoted — root 28.3111px (the long edge, 1680 < 1700) |
| 9 | 500 × 727 | 2.625 | on | not promoted — root 22.2222px |

Row 4 is the one that needs a raster, not just numbers: the Map board at 637 × 727 showing **two**
card columns. Read `getComputedStyle(deck).columnCount` (flow mode) or `gridTemplateColumns` (rows
mode) as well as the attribute — the attribute alone cannot tell a real split from a lie. Also check
`document.documentElement.scrollWidth <= 637` on every row: a promotion that overflows horizontally
is a failure whatever the attribute says.

Report MAX % first, then counts over 1 / 3 / 5 / 10%, `file:line` for every change, and `model_id`.
