

//import 'flowbite';
//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern
//lg 768-1024 tablet
//xl 1024-1280 laptop
//2xl 1280-1536 desktop
window.simuating = false;


// ---------------------------------------------------------------------------
// PHONE PEEK — the switch Neo asked for in the cols==1 branch below.
//
// His note there reads: "HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A
// CLASS ON <body> like: .full-screen". This is that class switch, with one
// deliberate change: the polarity is inverted, so peek is opt-IN.
// `.full-screen` would have been a disable flag, i.e. peek ON for everybody —
// and this is a published package, so that would silently rescale every design
// already built against 0.1.x/0.2.0. Off by default; nobody is surprised.
//
//   <html>                                          peek OFF  (default)
//   <html class="sqr-peek">                         peek ON   at 0.89
//   <html class="sqr-peek" data-sqr-peek="0.85">    peek ON   at 0.85
//
// The class goes on <html> (not <body>): it is always present, it survives a
// body swap, and it can be set in the server-rendered markup so the very first
// solve already has it.
//
// TO FLIP TO NEO'S ORIGINAL POLARITY (peek always on, `.full-screen` opts out)
// swap the one line marked FLIP in sqrPeekFactor().
// ---------------------------------------------------------------------------
// COLUMN CEILING — how many canonical columns a screen may show (0.3.0).
//
// Neo, 2026-09-08: "my Z Fold shows 3 columns instead of 2 in the big screen,
// both landscape and portrait" (708x823 CSS). Two faults produced it. The
// >=1024 branch fitted as many WHOLE columns as the width allowed, so a
// 1104-wide window got three; and the md/lg bands asked for fractional counts
// (1.2, 1.61) that were never meant as "how many columns", so a big phone
// landed between one and two.
//
// The rule now: once a screen can give each column at least a phone's width,
// the count is the ROUNDED number of canonical columns, capped by the ceiling
// the page declares. A touch template caps at 2; a desktop shell can raise it.
//
//   <html>                                     ceiling 2 (default)
//   <html data-sqr-max-cols="4">               ceiling 4
//   :root { --sqr-max-cols: 3 }                ceiling 3 (the attribute wins)
//
// Below MIN_COL_PX * 2 nothing changes: the phone keeps its single column and
// its peek, byte for byte.
const SQR_MAX_COLS_ATTR    = 'data-sqr-max-cols';
const SQR_MAX_COLS_VAR     = '--sqr-max-cols';
const SQR_MAX_COLS_DEFAULT = 2;
const SQR_MIN_COL_PX       = 320;   // a column narrower than this is not a column

function sqrMaxCols() {
    const el = document.documentElement;
    const attr = parseFloat(el.getAttribute(SQR_MAX_COLS_ATTR));
    if (attr > 0) return attr;
    let v = NaN;
    try { v = parseFloat(getComputedStyle(el).getPropertyValue(SQR_MAX_COLS_VAR)); } catch (e) {}
    return v > 0 ? v : SQR_MAX_COLS_DEFAULT;
}

const SQR_PEEK_CLASS   = 'sqr-peek';        // the switch
const SQR_PEEK_ATTR    = 'data-sqr-peek';   // the amount, on the same element
const SQR_PEEK_DEFAULT = 0.89;              // Neo's number: leaves ~11% showing
const SQR_PEEK_MIN     = 0.5;               // never shrink the canon past half the screen
const SQR_PEEK_MAX     = 1;                 // 1 = no peek at all

function sqrPeekElement() {
    return document.documentElement;
}

// Returns the multiplier to apply to the solved ratio: exactly 1 when the
// switch is off, otherwise the (guarded) peek factor.
function sqrPeekFactor() {
    let el = sqrPeekElement();

    // FLIP: for Neo's original polarity, replace this line with
    //       if (!el || el.classList.contains('full-screen')) return 1;
    if (!el || !el.classList.contains(SQR_PEEK_CLASS)) return 1;

    let raw = el.getAttribute(SQR_PEEK_ATTR);
    if (raw === null || raw === '') return SQR_PEEK_DEFAULT;

    let f = parseFloat(raw);
    if (!isFinite(f)) return SQR_PEEK_DEFAULT;                    // garbage -> default
    return Math.min(SQR_PEEK_MAX, Math.max(SQR_PEEK_MIN, f));     // out of range -> clamped
}

// ---------------------------------------------------------------------------
// THE FIT SWITCH — height, as an option (0.6.0).
//
// Neo, 2026-09-09: "I'm wondering if it needs to put height into perspective
// too... square screens or worst landscape screens." And: "Kinda want a switch
// to be able to do your recommended full contain-fit or handle in css. Cause I
// already had a solution started with both."
//
// Both solutions were already in this repo, started by him:
//   1. CSS  — square-root.scss's landscape media query swaps the probes so a
//             rotated phone measures a 720x360 canon. Shipped, and it stays.
//   2. JS   — the commented block in simulateScreen() below: `let height =
//             window.innerHeight`, `simulatedHeight`, `simulatingHeight`.
//             Never finished ("my brain is too tired").
// This is the switch between them. It does not replace the media query; the
// height modes MEASURE THROUGH IT, so the two compose instead of competing.
//
//   <html>                                  css     (default) — 0.5.0, bit for bit
//   <html data-sqr-fit="contain">           contain — the whole canon fits in BOTH axes
//   <html data-sqr-fit="stack">             stack   — only SQR_STACK finger units of
//                                                     height have to fit
//   :root { --sqr-fit: contain }            the same, as a custom property
//
// The default path is byte-identical TWICE OVER, and both proofs are load-bearing:
//   (a) by construction — the whole height block sits behind
//       `if (sqrFit !== SQR_FIT_CSS)`, so in css mode not one statement of it
//       runs. Not even the offsetHeight read. Same operations, same inputs,
//       same digits as 0.5.0, and no extra forced LAYOUT: css mode never
//       touches offsetHeight. Be precise about what it DOES cost — one
//       sqrFitMode() call, which when the attribute is absent falls through
//       to a single getComputedStyle. That is a style read, not a layout
//       read, and it lands on already-clean style: sqrMaxCols() flushed at
//       line 139 and nothing mutates the DOM between there and here.
//   (b) by neutral element — even without that guard the arithmetic is inert,
//       because Math.min(x, Infinity) === x and Math.max(x, 0) === x are exact
//       in IEEE-754. Do not "simplify" either identity away.
// (a) is why the guard is there; (b) is why removing it would still be safe.
// ---------------------------------------------------------------------------
const SQR_FIT_ATTR    = 'data-sqr-fit';
const SQR_FIT_VAR     = '--sqr-fit';
const SQR_FIT_CSS     = 'css';        // the default pole: width only
const SQR_FIT_CONTAIN = 'contain';    // the whole canon, both axes
const SQR_FIT_STACK   = 'stack';      // a budget of finger units of height

// 9 of the canon's 12 units. 12 units across (2 canonical columns) against 9
// down is 4:3, so this budget costs NOTHING on 4:3 and taller screens and
// engages only on the wider-than-4:3 laptop class. See docs/DESIGN-RATIONALE.md.
const SQR_STACK_ATTR    = 'data-sqr-stack';
const SQR_STACK_VAR     = '--sqr-stack';
const SQR_STACK_DEFAULT = 9;

// Never shrink the design below FLOOR x the width solve. 0.7 is the midpoint of
// [0.665, 0.75]: below 0.665 a landscape phone's finger unit drops under the
// researched 45px floor; above 0.75 the floor would pre-empt `contain` on the
// 4:3 tablet contain exists to serve. 0 disables the floor, 1 disables the
// height modes. See docs/DESIGN-RATIONALE.md.
const SQR_FIT_FLOOR_ATTR    = 'data-sqr-fit-floor';
const SQR_FIT_FLOOR_VAR     = '--sqr-fit-floor';
const SQR_FIT_FLOOR_DEFAULT = 0.7;
const SQR_FIT_FLOOR_MIN     = 0;
const SQR_FIT_FLOOR_MAX     = 1;

// How many finger units tall the canon is if the custom properties cannot be
// read at all (no stylesheet). 720/60 — it mirrors square-root.scss:3-8, and it
// is the ONLY place in the JS those numbers are repeated.
const SQR_UNITS_DOWN_FALLBACK = 12;

// One reader for the three settings above, in the order 0.3.0 established: the
// attribute on <html> wins, the custom property on :root is the fallback, and
// an empty string means "neither was set". sqrMaxCols() is deliberately left
// exactly as 0.3.0 wrote it — rewriting a function on the default path for a
// cosmetic gain is not a trade this package makes.
function sqrSetting(attr, varName) {
    const el = document.documentElement;
    if (!el) return '';
    let raw = el.getAttribute(attr);
    if (raw !== null && raw !== '') return raw.trim();
    try { raw = getComputedStyle(el).getPropertyValue(varName); } catch (e) { raw = ''; }
    return raw ? raw.trim() : '';
}

function sqrFitMode() {
    const raw = sqrSetting(SQR_FIT_ATTR, SQR_FIT_VAR).toLowerCase();
    if (raw === SQR_FIT_CONTAIN) return SQR_FIT_CONTAIN;
    if (raw === SQR_FIT_STACK)   return SQR_FIT_STACK;
    return SQR_FIT_CSS;                                       // garbage -> the default pole
}

function sqrStack() {
    const n = parseFloat(sqrSetting(SQR_STACK_ATTR, SQR_STACK_VAR));
    return (isFinite(n) && n > 0) ? n : SQR_STACK_DEFAULT;
}

function sqrFitFloor() {
    const raw = sqrSetting(SQR_FIT_FLOOR_ATTR, SQR_FIT_FLOOR_VAR);
    if (raw === '') return SQR_FIT_FLOOR_DEFAULT;             // unset -> default
    const f = parseFloat(raw);
    if (!isFinite(f)) return SQR_FIT_FLOOR_DEFAULT;           // garbage -> default
    return Math.min(SQR_FIT_FLOOR_MAX, Math.max(SQR_FIT_FLOOR_MIN, f));   // "0" -> 0, off
}

// How many finger units tall the canon is AS THE PAGE HAS IT RIGHT NOW: 12 for
// the 360x720 portrait canon, 6 when square-root.scss's landscape media query
// has rotated the probe to 720x360.
//
// The rotation is MEASURED, never inferred. Neo's started block used
// `landscape = width > height`, and that is the wrong question: the media query
// is bounded 361-768, so an 812x375 phone is in landscape while the canon has
// NOT rotated. The probe is the thing that rotated, so the probe is what we ask
// — its measured aspect against both candidates, nearest wins. That also means
// the JS never repeats the media query, and a host that overrides the canon
// (docs/INTEGRATION.md section 5) still gets the right answer.
function sqrCanonUnitsDown(probeW, probeH) {
    let mw, mh, uw;
    try {
        const cs = getComputedStyle(document.documentElement);
        mw = parseFloat(cs.getPropertyValue('--macro-width'));
        mh = parseFloat(cs.getPropertyValue('--macro-height'));
        uw = parseFloat(cs.getPropertyValue('--micro-width'));
    } catch (e) {}
    if (!(mw > 0 && mh > 0 && uw > 0)) return SQR_UNITS_DOWN_FALLBACK;
    if (!(probeW > 0 && probeH > 0)) return mh / uw;
    const aspect  = probeW / probeH;
    const swapped = Math.abs(aspect - mh / mw) < Math.abs(aspect - mw / mh);
    // BOTH branches divide by --micro-width, never --micro-height, and that is
    // deliberate: a finger unit OF HEIGHT, as this framework authors one, is
    // --micro-width. Every vertical utility in square-root.scss uses it —
    // -sqr-h-screen-1..5 at lines 56/59/62/65/68 and sqr-h-1/2 at 71 are all
    // calc(var(--micro-width) * N * 0.0625rem). --micro-height belongs to the
    // probe rules alone (37, 41, 265, 269). The shipped defaults are both 60
    // so nothing moves today; a host that overrides --micro-height on its own
    // (INTEGRATION section 5 invites exactly that) would otherwise get a stack
    // budget counting a unit no -sqr-h-* class counts. Three properties read,
    // not four.
    return (swapped ? mw : mh) / uw;
}

// ---------------------------------------------------------------------------
// SHORT SCREENS — columns from the finger and the aspect (0.7.0).
//
// Neo, 2026-09-10: "on this zfold build screen split like that it is high
// resolution and big enough where the 2 column would be much better and the 1
// unit to still be closer to a finger unit if a column added. I think perhaps
// the algorithm can based on what the size of a finger units ratio devided by
// the 60px its minimum supposed to be in relation to the ratio of the height
// to width."
//
// That is this feature, and it is two halves, because measuring his three
// splits showed the first half was already solved and only the second was
// missing:
//
//   1. THE SEAM. At 637x320 CSS (his 1672x840 Fold split at DPR 2.625) the
//      landscape query above has already rotated the probe to 720x360, so the
//      solver lays TWO macro columns across the screen and the finger is
//      53.08px -- exactly what he asked for. But square-root.scss's N-column
//      rules are gated on `@media (min-width: N*320px)` in RAW pixels, and 637
//      is three short of 640. Same screen at DPR 2.6 is 643 wide and DOES
//      split. Three pixels of device-pixel-ratio decide the layout, while the
//      JS answer moves 0.94%. So the solver now PUBLISHES the count it solved,
//      as data-sqr-cols on <html>, and the stylesheet honours it. One idea,
//      one place; the media gate stays as the no-JS fallback.
//
//   2. THE PASS. His rule, made exact: while a column is wider than K times
//      the height, add a column as long as the finger stays a finger. It is
//      the ceiling's twin -- 0.3.0 stops columns getting too NARROW, this
//      stops one getting too WIDE for the height it has -- and inside the pass
//      the finger floor REPLACES the fixed 320px column floor, because a 300px
//      column at a 50px finger is precisely what he is asking for. With the
//      default ceiling of 2 the pass is provably inert (docs/plans/
//      short-screens-design.md section 3.4); it engages on a raised ceiling.
//
// The finger is measured as unit(n) = width / (probe * n) -- the ratio the
// solver would write for n columns, which is the finger in units of the
// canonical finger. Measured through the probe, never computed from 360, for
// the same reason 0.6.0 measures simulatedHeight through it: the SCSS
// landscape swap then composes for free and a host that overrides the canon
// (docs/INTEGRATION.md section 5) gets the right answer without the JS
// knowing the media query exists.
//
//   <html>                                       on   (default since 0.7.0)
//   <html data-sqr-short="off">                  off  (the 0.6.0 solve, to the digit)
//   <html data-sqr-short="cols">                 on, said out loud
//   <html data-sqr-short="cols"
//         data-sqr-short-aspect="1.4">           a lazier trigger
//   <html data-sqr-short="cols"
//         data-sqr-short-floor="0.75">           demand a 45px finger at any aspect
//   :root { --sqr-short: cols }                  the same, server-rendered
//
// ON BY DEFAULT (owner, 2026-09-10: "I am wondering if this rule should be
// integrated into square root itself by default rather than the integration" --
// yes: the rule is the framework's own logic, finger and aspect, and it only
// changes screens the width-only solve gets wrong). `off` restores the 0.6.0
// solve, and WITH IT OFF the path is byte-identical twice over, the same two
// proofs 0.6.0 makes for the fit switch:
//   (a) by construction -- the clientHeight read, the whole pass and the
//       attribute write all sit behind `sqrShortMode === SQR_SHORT_COLS`. In
//       the switch off not one statement of them runs, not one attribute is
//       written, and no rule in square-root.scss's new block can match.
//   (b) what it DOES cost, stated precisely: one sqrShort() call, which with
//       the attribute absent falls through to a single getComputedStyle. A
//       style read, not a layout read, and it lands on already-clean style --
//       sqrMaxCols() flushed one line earlier and nothing mutates the DOM
//       between there and here.
// The removal branch is guarded by hasAttribute(), so with the switch off the
// path performs no DOM write either. What the default DOES cost now: one
// clientHeight read per solve, at the moment the probe is read anyway.
// ---------------------------------------------------------------------------
const SQR_SHORT_ATTR = 'data-sqr-short';
const SQR_SHORT_VAR  = '--sqr-short';
const SQR_SHORT_COLS = 'cols';        // the default pole (owner, 2026-09-10)
const SQR_SHORT_OFF  = 'off';         // the opt-out: the 0.6.0 solve to the digit

// K -- "the screen is short for its column". A column wider than K times the
// height puts one card across the whole screen. 1.2 is Neo's number.
const SQR_SHORT_ASPECT_ATTR    = 'data-sqr-short-aspect';
const SQR_SHORT_ASPECT_VAR     = '--sqr-short-aspect';
const SQR_SHORT_ASPECT_DEFAULT = 1.2;

// f -- the finger floor at a zero-height screen. The floor a screen of aspect
// a = height/width demands is f + (1 - f) * min(1, a): a square screen demands
// a whole finger, a 2:1 screen 0.8 of one, a 3:1 screen 0.733. Neo's number is
// 0.6, which at an infinitely wide screen would accept a 36px finger; the
// ceiling reaches maxCols long before that on any real screen (see
// docs/DESIGN-RATIONALE.md). 1 disables the pass; 0 accepts any finger.
const SQR_SHORT_FLOOR_ATTR    = 'data-sqr-short-floor';
const SQR_SHORT_FLOOR_VAR     = '--sqr-short-floor';
const SQR_SHORT_FLOOR_DEFAULT = 0.6;
const SQR_SHORT_FLOOR_MIN     = 0;
const SQR_SHORT_FLOOR_MAX     = 1;

// THE SEAM. Written by the solver, read by square-root.scss, watched by
// nothing: it is deliberately absent from the MutationObserver's
// attributeFilter below, so publishing the answer can never re-trigger the
// solve. A class would have; that is why this is an attribute.
const SQR_COLS_ATTR = 'data-sqr-cols';

function sqrShort() {
    const raw = sqrSetting(SQR_SHORT_ATTR, SQR_SHORT_VAR).toLowerCase();
    return raw === SQR_SHORT_OFF ? SQR_SHORT_OFF : SQR_SHORT_COLS;   // only a literal 'off' opts out; garbage -> the default pole (on)
}

function sqrShortAspect() {
    const n = parseFloat(sqrSetting(SQR_SHORT_ASPECT_ATTR, SQR_SHORT_ASPECT_VAR));
    return (isFinite(n) && n > 0) ? n : SQR_SHORT_ASPECT_DEFAULT;
}

function sqrShortFloor() {
    const raw = sqrSetting(SQR_SHORT_FLOOR_ATTR, SQR_SHORT_FLOOR_VAR);
    if (raw === '') return SQR_SHORT_FLOOR_DEFAULT;                   // unset -> default
    const f = parseFloat(raw);
    if (!isFinite(f)) return SQR_SHORT_FLOOR_DEFAULT;                 // garbage -> default
    return Math.min(SQR_SHORT_FLOOR_MAX, Math.max(SQR_SHORT_FLOOR_MIN, f));   // "0" -> 0, off
}

// How many canonical MACRO COLUMNS the probe spans: 1 for the 360-wide
// portrait canon, 2 where square-root.scss's landscape query has rotated it to
// 720.
//
// REFUTER FIX (blocker #1, Opus subagent, 2026-09-10): the design's first
// draft measured this as `probeW / mw` where probeW was `simulatedWidth`
// (.sqr-macro-rem's offsetWidth, a REM box) and mw the unitless --macro-width.
// Those two only cancel to a clean 1 or 2 when the browser's default font
// size is exactly 16px. Measured with CDP Page.setFontSizes({standard:24})
// (the same knob Android Chrome's own "Very large" text-size setting drives)
// at 375x812: root font-size is unchanged at 16.667px -- 0.6.0's solve does
// not care -- but the REM-based measurement returned 1.5 instead of 1,
// rounding to data-sqr-cols="2" and publishing a two-column, 750px-wide deck
// on a 375px-wide portrait phone (108% horizontal overflow). .sqr-macro-pixel
// is measured in `px`, not `rem` (square-root.scss:22-25, rotated at
// :254-257), so it is exactly 360 or 720 regardless of the root font-size --
// immune to the failure. One custom property, read inside the switch only.
// (CHANGELOG 0.6.0 says "stack is the only MODE that reads the canon
// variables"; that claim is about the three fit modes and survives -- this is
// not a fit mode, and `contain` still reads none.)
function sqrMacroColumns(probePxW) {
    let mw = NaN;
    try {
        mw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--macro-width'));
    } catch (e) {}
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
//
// REFUTER FIX (major M3, Opus subagent, 2026-09-10): the four field checks
// were `!isFinite(sp) || !isFinite(lp) || !isFinite(sc)`, which is finite-or-
// not, not positive-or-not -- it let a negative or zero threshold through as
// "valid". Measured on a PLAIN PHONE (375x812@3, switch on) with the hostile
// row "2 -1 -1 -1" (reachable from --sqr-device-tiers, i.e. from any
// stylesheet on the host page): every screen promoted, root font-size fell to
// 8.3333px (finger 31.25px, 31% under the package's own 45px researched
// floor) and the column landed at 187.5px, under SQR_MIN_COL_PX (320). "A
// malformed row is SKIPPED" was false for exactly the rows most likely to
// slip in from a bad template default. `sp/lp/sc > 0` rejects NaN the same
// way `isFinite` did (NaN > 0 is false) and additionally rejects negatives
// and zero.
function sqrDeviceTiers() {
    const raw = sqrSetting(SQR_DEVICE_TIERS_ATTR, SQR_DEVICE_TIERS_VAR);
    if (raw === '') return [];
    const rows = raw.split(',');
    const out  = [];
    for (let i = 0; i < rows.length; i++) {
        const f = rows[i].trim().split(/\s+/);
        if (f.length !== SQR_DEVICE_TIER_FIELDS) continue;
        const c = parseFloat(f[0]), sp = parseFloat(f[1]), lp = parseFloat(f[2]), sc = parseFloat(f[3]);
        if (!(c >= 2) || !(sp > 0) || !(lp > 0) || !(sc > 0)) continue;
        out.push([Math.floor(c), sp, lp, sc]);   // [cols, minShortPx, minLongPx, minScale]
    }
    return out;
}


function simulateScreen() {



    if(window.simuating) return null;
    window.simuating = true;

    /* ── THE GUARD IS RELEASED ON EVERY EXIT, INCLUDING A THROW ────────
       (2026-09-11, found from the owner's report: "there's something buggy
       about the peek next card option ... toggling it made it stop working")

       MEASURED, NOT REASONED. Remove `.sqr-macro-rem` from the DOM — which is
       exactly what a Livewire morph can do for one frame — then call
       window.squareRootResolve():

           after removing the probe and resolving:   simuating = true
           after RESTORING it and resolving again:   simuating = true
           page error: Cannot read properties of null (reading 'offsetWidth')

       It never came back. `window.simuating = false` lived only on the happy
       path at the bottom of two nested timeouts, so a single throw anywhere in
       the ~380 lines between here and there left the re-entrancy guard raised
       FOREVER, and squareRootResolve() then re-queued itself every 1100ms
       against a guard that would never drop. The solver was dead for the life
       of the page; only a reload brought it back.

       That is the owner's peek bug exactly: toggling the class fires a solve
       through the MutationObserver, and if that solve throws, the peek — and
       every later solve, including the one a resize or an orientation change
       asks for — silently stops happening.

       Two rules now hold:
         · every exit path releases the guard, so a failed solve costs one
           solve and not the page;
         · a failed solve puts the stylesheet BACK the way it found it, rather
           than leaving the root at the 100% it sets on the line below as its
           measuring baseline — which would drop the whole design to canon
           scale as a side effect of a probe being momentarily absent. */
    var sqrPrevRootCss = null;
    var sqrRelease = function (why) {
        if (sqrPrevRootCss !== null) {
            var tag = document.getElementById('square-root');
            if (tag) tag.innerHTML = sqrPrevRootCss;   /* undo the measuring baseline */
        }
        window.simuating = false;
        if (why && typeof console !== 'undefined' && console.warn) {
            console.warn('[square-root] solve abandoned (' + why + '); guard released so the next resolve can run');
        }
        return null;
    };

    let squareRootStyleTag = document.getElementById('square-root');
    /* the host page owns this tag; without it there is nothing to write a
       scale into, and reading .innerHTML off null was the second throw site */
    if (!squareRootStyleTag) return sqrRelease('no #square-root style tag in the document');
    sqrPrevRootCss = squareRootStyleTag.innerHTML;
    squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");

    setTimeout(function(){
      try {

        let macroRem = document.querySelector('.sqr-macro-rem');
        /* THE PROBE IS THE RULER. Absent, there is nothing to measure against,
           and every number below would be computed from NaN — so this is a
           clean abandon-and-retry, not something to struggle through. */
        if (!macroRem) return sqrRelease('.sqr-macro-rem probe is not in the DOM');
        let  simulatedWidth = macroRem.offsetWidth;

        /* REFUTER FIX (blocker #1, relocation): .sqr-macro-pixel queried here
           now, not left dead further down -- sqrMacroColumns() below (inside
           the short-screen pass) needs it before the peek decision is made.
           Safe to move: .sqr-macro-pixel resolves in raw `px`, never `rem`, so
           unlike simulatedWidth it does not depend on being read at this
           exact moment relative to the ":root{font-size:100%}" reset above.
           Moving it earlier changes no digit anywhere else in this file. */
        let macroPx = document.querySelector('.sqr-macro-pixel');

        let  width = window.innerWidth;

        let screen='xs';
        let cols =1;
        if(width>=320 && width<=640) {
            screen='sm';
        }
        else if(width>640 && width<768) {
            screen='md';
            cols=1.2;
        }
        else if(width>=768 && width<1024) {
            screen='lg';
            cols=1.61;//seems like the orientation/landscape rule in sqr scss making this not work right
        }else if(width>=1024 ) {
            screen='xl';
        }
       /* }else if(width>=1280 && width<1536) {
            screen='2xl';
            cols=2.1;
        }else {
            cols=2.1;
        }*/
        /* THE CEILING (0.3.0). Applied to the band's own `cols` first, then — once
           the screen is wide enough for two real columns — `cols` becomes the
           rounded canonical count, capped. 708 -> 2 columns of 354; 823 -> 2 of
           411; 1104 -> 2 of 552, not 3 of 368; 640 -> 2 of 320; 375 -> 1, peek
           untouched. */
        const maxCols = sqrMaxCols();
        if (cols > maxCols) cols = maxCols;
        if (width >= SQR_MIN_COL_PX * 2) {
            cols = Math.max(1, Math.min(maxCols, Math.round(width / simulatedWidth)));
            if (width / cols < SQR_MIN_COL_PX) cols = Math.max(1, cols - 1);
        }

        /* THE SHORT-SCREEN PASS (0.7.0). Off by default; see the banner above
           for the two proofs that the default path is byte-identical.

           Order matters and it is the ceiling's: the bands decide, the ceiling
           caps, and only then does this ask whether the screen is short for
           the column it just got. The trigger is RE-EVALUATED each turn, so
           the loop stops as soon as the column is no longer wider than K times
           the height -- on a raised ceiling that is what keeps it from running
           to maxCols on a merely wide screen.

           `unit` is the finger the next layout would have, in units of the
           canonical finger: width / (probe * n) is precisely the ratio this
           solver writes for n columns, and the finger is 60 * that. Measured
           through the probe, so the landscape swap composes for free.

           Inside this pass the finger floor REPLACES the fixed SQR_MIN_COL_PX
           floor. Nothing below the pass changes: the >= 2 * 320 gate, the
           bands, the peek and the ceiling all stay exactly as they are.

           REFUTER FIX (blockers #1/#2, majors #3/#5, Opus subagent,
           2026-09-10): `need` is now hoisted to sqrShortNeed and
           sqrPublishedCols is computed here -- both BEFORE the peek decision
           further down and BEFORE the attribute write at the end of this
           function -- because two things this pass alone does not cover:

             - Blocker #2 / major #3: the naive publish `cols * macroCols`
               reflects the PROBE'S rotation, not whether the screen actually
               has room. Every landscape viewport 361-639px wide has a rotated
               (2-macro-column) probe regardless of ITS OWN aspect, so the
               naive product would publish data-sqr-cols="2" even at 361x360
               (a 30px finger) or 366x365 (a 30.5px finger, which flips to a
               61px single column at 366x367 -- a 2px height change doubling
               the finger). The fix: publish the naive count only where either
               (a) the finger THIS viewport's own solve already has, measured
               through the same rotated probe, clears sqrShortNeed -- 637x320:
               unit(1) through the rotated probe is 0.8847, already past
               need=0.80094, which is the owner's sentence literally come true
               -- or (b) the raw-pixel media gate (gateN) would already have
               matched that many columns anyway, so the attribute is never
               MORE aggressive than the CSS fallback it exists to agree with.
               Below that floor, publish only what the gate already grants.

             - Major #5: sqrPublishedCols has to exist before the peek
               decision (further down, inside `if (cols == 1)`) can be gated
               on it -- see the fix there. Computing it here, right after the
               pass and right after macroPx is available, is the only point
               in the function early enough to do both jobs from one value. */
        const sqrShortMode = sqrShort();
        let sqrShortNeed    = 1;      // hoisted default: "off" needs a whole finger, moot since the pass never runs
        let sqrPublishedCols = cols;  // hoisted default: with the switch off, published == solved, exactly today's cols
        if (sqrShortMode === SQR_SHORT_COLS) {
            const height = document.documentElement.clientHeight || window.innerHeight;
            const K      = sqrShortAspect();
            const f      = sqrShortFloor();
            /* a = height/width. A zero-width or zero-height document is not a
               short screen, it is an unlaid-out one: a = 1 demands a whole
               finger and the pass declines. */
            const a = (width > 0 && height > 0) ? height / width : 1;
            sqrShortNeed = f + (1 - f) * Math.min(1, a);
            while (cols + 1 <= maxCols && width / cols > height * K) {
                if (width / (simulatedWidth * (cols + 1)) < sqrShortNeed) break;
                cols = cols + 1;
            }

            const macroCols = sqrMacroColumns(macroPx.offsetWidth);
            const gateN     = Math.floor(width / SQR_MIN_COL_PX);
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
           may lift it again for the screen's PIXELS -> and only then does
           `ratio = ratio/cols` divide ONCE, against the final cols. That last
           sentence is the whole reason this cannot live in the host app:
           stamping data-sqr-cols="2" on <html> from outside would move the
           stylesheet and leave the scale solved for one column, i.e. two
           columns at the single-column size -- a canvas twice the viewport.

           `solvedScale` is `width / (simulatedWidth * cols)` -- literally the
           expression already on the line above, and the number his Debug tab
           calls Scale. It is read BEFORE this pass changes cols, so a tier
           decision never examines a scale it caused itself. It is also read
           before the peek and before the fit switch, deliberately: both are
           presentation adjustments applied after the count is settled, and the
           peek only exists WHEN cols == 1, so feeding a peeked scale into the
           decision that sets cols would be circular.

           This pass CANNOT fire inside square-root.scss's landscape swap band,
           and the proof is one line: in that band the probe is 720 and the
           band is capped at 768 CSS px, so solvedScale <= 768/720 = 1.0667 --
           below any sane minScale. That is why it needs no macroCols of its
           own: wherever it fires, the probe is 360 and the published count is
           cols.

           The publish is Math.max, never Math.min: this pass adds to what the
           short pass published, and the ceiling clamps the result the same way
           the line above does. */
        const sqrDeviceMode = sqrDeviceCols();
        let sqrDeviceApplied = false;
        if (sqrDeviceMode === SQR_DEVICE_TIERS) {
            const tiers = sqrDeviceTiers();
            if (tiers.length) {
                /* clientHeight, not innerHeight, for the reason 0.6.0 states
                   further down -- the conservative reader of the two.
                   Conservative here can only make the pass DECLINE, never
                   promote, which is the safe direction. The read lands on the
                   same clean layout the short pass read one branch earlier: a
                   cached property, not a second flush. */
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
                    /* REFUTER FIX (major M2, Opus subagent, 2026-09-10): a row
                       asking for more columns than the ceiling allows used to
                       fall through to `want = Math.min(Math.floor(maxCols),
                       want)` below, which CLAMPED it to the ceiling instead of
                       dropping it -- so a tablet-only row ("3 1600 1700 1.75")
                       silently promoted a phone-sized 637x727 Fold split to 2
                       columns under the DEFAULT ceiling of 2, the moment its
                       thresholds were met. That contradicts this file's own
                       rule for the parser, "a malformed row is SKIPPED, never
                       guessed at" -- a row this pass cannot honour is exactly
                       as malformed as one the parser cannot read. Dropping it
                       here, before the threshold comparison, fails closed and
                       makes the parser's promise apply to the whole feature,
                       not just the four-field shape. */
                    if (t[0] > Math.floor(maxCols)) continue;
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
//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern
//lg 768-1024 tablet
//xl 1024-1280 laptop
//2xl 1280-1536 desktop

        /*let  height = window.innerHeight;
        let landscape = false;

        if( width > height ) {
            landscape=true;
        }*/

        /* 0.6.0: `height` is what the block above was reaching for. `landscape`
           is deliberately NOT revived: `width > height` is not the question the
           solver needs answered. square-root.scss's swap is bounded 361-768, so
           an 812x375 phone is in landscape while the canon has NOT rotated —
           the flag would be true and wrong. What the height solve needs is
           whether the PROBE rotated, and sqrCanonUnitsDown() reads that off the
           probe's own aspect. Measured, not inferred.

           clientHeight, not innerHeight — but NOT because it is "what 100vh
           resolves to". It is not, and it does not damp the URL-bar rescale
           either: a URL-bar collapse resizes the layout viewport, so
           clientHeight moves exactly as innerHeight does while 100vh stays
           pinned to the large viewport. The real reason is that clientHeight
           is the root element's own content height and, where the two differ,
           the SMALLER of them — it excludes a classic horizontal scrollbar,
           which this framework's own snap-x scrollers produce. A contain-fit
           wants the conservative number: fit the canon into what the reader
           can see, not into what a vh unit counts. innerHeight is the fallback
           for a quirks-mode document, where clientHeight is not the viewport
           at all. */
        const sqrFit = sqrFitMode();
        // (the read itself sits inside the fit branch below — css mode never asks
        //  the document for its height, so the default path forces no layout)

        // 0.7.0: macroPx (.sqr-macro-pixel) is queried earlier now, beside
        // simulatedWidth -- see the note there. It used to be queried and
        // never read at this spot; it is neither, now.

        //let simulatedHeight = macroRem.offsetHeight;
        //was trying to calculated without using reading of .sqr-macro-rem that browser lags and has to calculate at the time its rendered but my brain is too tired from days of non-end work on this theme
        //let intendedWidthFeel = macroPx.offsetWidth;
        //let ratio2   = (intendedWidthFeel /width) / 0.0625;
        //let simulatingHeight = macroRem.offsetHeight;

        /* 0.6.0: the line above, finished — and only when it is wanted. In css
           mode this read never happens, so the default path does not even pay
           for the forced layout. It is HERE, beside Neo's note, because this is
           the one moment the probe is at the 100% reset: the same element, the
           same reflow, the same instant as simulatedWidth. Measuring instead of
           computing is also what makes the SCSS landscape swap compose for
           free — when the media query has rotated the canon, simulatedHeight is
           360, not 720, and the JS never has to know the query exists. */
        let simulatedHeight = (sqrFit === SQR_FIT_CSS) ? 0 : macroRem.offsetHeight;


        let idealSqrPixelWidth = 360;
        //let cols=  parseInt((width/idealSqrPixelWidth)/2)+1;

//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern/tablet
//lg 768-1024 laptop
//xl 1024-1280 small monitor
//2xl 1280-1536 big monitor
//3xxl 1536-1920 wide monitor

        /* ONE SOLVER FOR EVERY WIDTH (0.3.0). The old `else` branch below 1024 vs
           >=1024 is gone: `cols` is now decided once, above, for every screen, so
           the ratio is one division here and the 1024 boundary stops being a step
           in the design's size. */
        let ratio = width/simulatedWidth;
        if (true) {

            ratio = ratio/cols;

            //if horizontal scrolling page && right width
            /* REFUTER FIX (major #5, Opus subagent, 2026-09-10): "&&
               sqrPublishedCols==1" added. Without it, the peek shrank a
               layout that has no horizontal scroll to peek at: at 637x320
               with the short-screen pass on, cols stays 1 (the pass itself
               declines -- unit(2) is below sqrShortNeed) while the SEAM
               still publishes data-sqr-cols="2" (finding above), so the deck
               is genuinely two full columns on screen. sqrPeekFactor() was
               firing anyway because it only ever checked cols, shrinking the
               root font-size by 11% (14.156px -> 12.598px, finger 53.08px ->
               47.24px, a 10.9% miss on the brief's own 53+-1px acceptance
               bar) whenever the owner's Customize peek pin happened to be on
               (theme.js persists it; default off). With the switch off,
               sqrPublishedCols is hoisted to equal cols exactly (see above),
               so this condition is unchanged from 0.6.0 byte for byte. */
            if(cols==1 && sqrPublishedCols==1) //1 && width>320 && width< 1024 ) /* HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A CLASS ON <body> like: .full-screen */
            {
                //This baiscally further resized the screen smaller so the tip of the right card shows so that
                // user knows they can scroll to the right/left horizontally
             //   ratio = ratio*0.89;

                // 0.2.0: the above, made switchable. sqrPeekFactor() returns
                // the 0.89 (or the data-sqr-peek override) only when <html>
                // carries `sqr-peek`, and otherwise returns exactly 1 —
                // and `x * 1` is exact in IEEE-754, so with the switch off this
                // line cannot change a single digit of the old result.
                // Scope note: this is inside if(cols==1), so peek only ever
                // touches the phone bracket (<=640, including the sub-320 watch
                // range, which also has cols==1). md/lg/xl never reach it.
                ratio = ratio*sqrPeekFactor();
            }
            // NOTE (0.2.0): an `else { ratio = ratio/cols; }` used to sit here, so on md
            // and lg the ratio was divided by `cols` twice and the effective divisor was
            // cols² — 1.44 instead of 1.2, and 2.5921 instead of 1.61. That broke the
            // invariant this whole branch exists to hold: `cols` is how many canonical
            // columns land on screen. Squared, lg put 2.59 columns on a 1023px screen
            // while the xl branch below puts 2 columns on a 1024px one, so the design got
            // BIGGER as the screen got wider. `cols` is now applied exactly once.
            // The if(cols==1) block above is kept: it is the phone peek, which is a
            // separate feature (also 0.2.0) and not part of this fix. See CHANGELOG 0.2.0.
        }

        /* 0.6.0: THE FIT SWITCH, applied. Everything here is skipped in css
           mode — see the banner at the top of this file for the two proofs that
           the default is byte-identical.

           ratioW is the css-mode answer, kept under its own name because the
           floor is measured against it: the height solve may shrink the design,
           but never below FLOOR of what the width solve asked for.

           The stack budget is clamped at the canon's own height. Without the
           clamp, "9 units" on a rotated phone (canon 6 units tall) would demand
           one and a half canons and shrink a correctly-scaled screen by ~30%.
           With it, stack degenerates to contain under the swap — which is
           right — and the three modes are ordered at every viewport:
           css >= stack >= contain. */
        if (sqrFit !== SQR_FIT_CSS) {
            const height = document.documentElement.clientHeight || window.innerHeight;
            const ratioW = ratio;
            // sqrCanonUnitsDown() is called INSIDE the stack branch and never
            // outside it. It is the only getComputedStyle in this feature, and
            // "stack is the only mode that reads the canon variables" is a
            // claim four shipped documents make -- contain must not read them.
            const budget = (sqrFit === SQR_FIT_STACK)
                         ? simulatedHeight * Math.min(1, sqrStack() /
                               sqrCanonUnitsDown(simulatedWidth, simulatedHeight))
                         : simulatedHeight;
            const ratioH = height / budget;

            ratio = Math.min(ratio, ratioH);              // budget 0 -> Infinity -> css answer
            ratio = Math.max(ratio, sqrFitFloor() * ratioW);   // and the zero guard (not NaN)
        }

        /* THE SEAM, published (0.7.0). sqrPublishedCols was decided up in the
           short-screen pass, above -- computed there rather than here because
           the peek decision (further up, inside `if (cols == 1)`) needed it
           first. It equals `cols` on every portrait-canon screen and differs
           only inside the landscape swap band, where `cols` answers "how many
           canonical devices across" and the stylesheet is asking "how many
           macro columns on screen" -- floor-gated against what the raw-pixel
           media gate and the finger already support (REFUTER FIX, blocker #2:
           see the pass above).

           The attribute is NOT in the MutationObserver's attributeFilter
           below, so this write fires no callback and cannot loop. With the
           switch off it is removed instead -- guarded, so the default path
           performs no DOM write at all. */
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
            sqrHtml.removeAttribute(SQR_COLS_ATTR);
        }

        squareRootStyleTag.innerHTML = (" :root { font-size:"+ ratio*100 +"%; } ");
        /* THE SOLVE IS COMMITTED. Nothing below may undo it: sqrPrevRootCss is
           cleared so a late failure in the verification read cannot roll the
           page back to the scale it had before this solve. */
        sqrPrevRootCss = null;
        setTimeout(function(){
            /* A REPORT, NEVER THE SOLVE. These three lines only re-measure the
               probe to log what the new scale produced, and they were the
               second place a missing probe threw — one frame of a Livewire
               morph between the write above and this timeout was enough to
               strand the guard with the scale already correctly applied. The
               read is now optional; the release below is not. */
            try {
                macroRem = document.querySelector('.sqr-macro-rem');
                if (macroRem) {
                    let newSimulatedWidth = macroRem.offsetWidth;
                    let newSimulatedHeight = macroRem.offsetHeight;
                    console.log("New Simulated Ratio: "+ratio+"% "+simulatedWidth+"<==>"+newSimulatedWidth);
                }
            } catch (e) { /* a log is never worth a wedged solver */ }
            window.simuating = false;
        },500);
      } catch (e) {
        /* ANY throw in the solve above lands here instead of killing the
           solver for the life of the page. One solve is lost; the next
           resize, class flip or squareRootResolve() runs normally. */
        sqrRelease((e && e.message) ? e.message : 'threw mid-solve');
      }
    },500);

}

simulateScreen();
/* REFUTER FIX (major #4, Opus subagent, 2026-09-10): was `= simulateScreen`.
   simulateScreen() drops (not queues) any call landing while
   window.simuating is true (the guard at the top of the function), so a
   resize arriving mid-solve was silently lost forever -- no retry, nothing
   re-triggers it. Measured: settle at 637x320 -> resize to 400x399 -> wait
   620ms (past the deferred read inside the solve) -- resize to 375x812 ->
   4s later the page is still showing the STALE 400x399 solve (two columns
   of 400px on a 375px-wide screen, 417px scrollWidth). Before 0.7.0 a
   dropped resize only cost scale; after it, it strands a phone in a
   two-column layout with horizontal overflow, and dragging a Fold's split
   divider is exactly the gesture that produces this event pattern.
   squareRootResolve() (declared below, hoisted like any function
   declaration, so it is safe to reference here before its literal line) is
   the retry this package already ships for exactly this failure mode -- it
   re-queues itself at ~1100ms if the guard is still held, instead of
   dropping. window.onload three lines below is unchanged: it fires once, at
   a point simuating is never true, so it never needed the retry. */
window.onresize = squareRootResolve;
/* A HANDLER, NOT A CALL (2026-09-11). This read `= simulateScreen()`, with the
   parentheses — so it INVOKED the solver right here, two lines after the call
   above had already raised the guard, got `null` back, and assigned that null
   to window.onload. Measured on a live page: `typeof window.onload` is
   "object", i.e. null. There has never been an onload solve, and the note three
   lines up ("it fires once, at a point simuating is never true") describes
   something that never happened.

   It is squareRootResolve rather than simulateScreen so that an onload landing
   while the first solve is still in flight RETRIES instead of being dropped —
   the same reason onresize above was changed. This adds a second solve at
   window load where there was none; it is what the original line intended, and
   the guard makes it free when the first solve has already settled. */
window.onload = squareRootResolve;


screen.orientation.addEventListener("change", function(e) {
    let squareRootStyleTag = document.getElementById('square-root');
    squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");
    simulateScreen();

});


// ---------------------------------------------------------------------------
// LIVE RE-SOLVE — what makes the peek an actual back-and-forth switch.
//
// window.squareRootResolve() is the public entry point: the same solve resize
// runs, plus one piece of bookkeeping. A solve is asynchronous and holds the
// re-entrancy guard for ~1s, so a call landing mid-solve would be silently
// dropped by `if(window.simuating) return null;`. Here it is retried once the
// guard releases instead, which is what lets you flip the class twice in quick
// succession and still land on the right scale.
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

// Toggling the class should be enough on its own — nobody should have to
// remember to call a function. One observer, on one element, filtered to the
// two attributes that matter, and it compares the resulting factor before
// re-solving so that unrelated class writes on <html> (dark mode, scroll locks,
// Livewire, whatever the host app does) do not trigger a gratuitous solve.
// 0.6.0: the same observer, the same short-circuit, three more attributes.
// 0.7.0: three more again (the short switch), and one attribute this file
// WRITES and never watches -- data-sqr-cols.
// The compared value is now a signature string rather than a number, because the
// fit mode is a string — one comparison either way, so an unrelated write to
// <html> still costs nothing.
//
// The signature reads ATTRIBUTES ONLY, on purpose. Reaching for the custom
// properties here would mean up to three getComputedStyle reads on every class
// write a host app makes (dark mode, scroll locks, Livewire) — a style flush
// per toggle, to answer a question that almost never changed. So: the custom
// property is the server-rendered default, the attribute is the live switch.
// That is exactly how --sqr-max-cols behaves in 0.3.0, and it is documented.
// After changing a custom property, call window.squareRootResolve().
//
// One gap is worth naming because the peek does NOT have it. Every ATTRIBUTE
// path is covered: an empty value gives the same fallback the signature's ''
// gives, a whitespace value changes the signature and correctly drops to css,
// and removeAttribute always changes it. A class-driven PEEK change is covered
// too, because sqrPeekFactor() reads the class. A class-driven MODE change is
// not: a rule like `html.dark { --sqr-fit: stack }` changes the effective mode
// with no attribute write and no peek change, so the signature is identical
// and the page keeps the old mode until the next resize. Drive the mode by
// attribute, or call window.squareRootResolve() after the class flip.
function sqrSolveSignature() {
    const el = document.documentElement;
    return sqrPeekFactor()
         + '|' + (el.getAttribute(SQR_FIT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_STACK_ATTR) || '')
         + '|' + (el.getAttribute(SQR_FIT_FLOOR_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_ASPECT_ATTR) || '')
         + '|' + (el.getAttribute(SQR_SHORT_FLOOR_ATTR) || '')
         + '|' + (el.getAttribute(SQR_DEVICE_COLS_ATTR) || '')
         + '|' + (el.getAttribute(SQR_DEVICE_TIERS_ATTR) || '');
}
let sqrLastSignature = sqrSolveSignature();
new MutationObserver(function() {
    let now = sqrSolveSignature();
    if (now === sqrLastSignature) return;
    sqrLastSignature = now;
    squareRootResolve();
}).observe(sqrPeekElement(), { attributes: true, attributeFilter: [
    'class', SQR_PEEK_ATTR, SQR_FIT_ATTR, SQR_STACK_ATTR, SQR_FIT_FLOOR_ATTR,
    SQR_SHORT_ATTR, SQR_SHORT_ASPECT_ATTR, SQR_SHORT_FLOOR_ATTR,
    SQR_DEVICE_COLS_ATTR, SQR_DEVICE_TIERS_ATTR
    /* SQR_COLS_ATTR is deliberately absent: it is this solver's OUTPUT.
       Watching it would make every solve schedule the next one. */
] });

