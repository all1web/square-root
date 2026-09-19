/**
 * Square Root — Tailwind CSS plugin.
 *
 * The same framework as src/square-root.scss, emitted through Tailwind so you
 * get JIT arbitrary values (sqr-w-[1/2], sqr-mt-[1.75]), IntelliSense and
 * purging. The SCSS remains the source of truth: this file mirrors its class
 * surface exactly — same families, same fractions, same known quirks — and a
 * parity check compares both outputs. If you change one, change the other.
 *
 * The solver (src/square-root.js) is runtime, not build-time: it is NOT part
 * of this plugin and is still required. See README "Quick start".
 *
 * Usage, Tailwind v3 (tailwind.config.js):
 *   plugins: [require('@all1web/square-root/tailwind')]
 * Usage, Tailwind v4 (CSS):
 *   @plugin "@all1web/square-root/tailwind";
 *
 * Not emitted here, on purpose:
 *  - the `2xs:` / `xs:` prefixed classes from the SCSS — their names collide
 *    with Tailwind's variant syntax; use Tailwind's own variants instead
 *    (e.g. max-[320px]:hidden, min-[321px]:sqr-mx-[1/4]).
 *  - the scroll-snap layer (src/_scrollsnap.scss) — link dist/scrollsnap.css.
 */
const plugin = require('tailwindcss/plugin');

/* One finger unit is 60 reference px, authored as rem: 0.0625rem = 1/16.
   Identical formula to every rule in src/square-root.scss. */
const unit = (n) => `calc(var(--micro-width) * ${n} * 0.0625rem)`;
const negUnit = (n) => `calc(var(--micro-width) * ${n} * -0.0625rem)`;

/* The generated scale runs 1..8, matching the SCSS @for loop. */
const SCALE = {};
for (let i = 1; i <= 8; i++) SCALE[i] = `${i}`;

/* Fractions that exist in the SCSS — and only these. Arbitrary values are the
   Tailwind-only extension for everything else. */
const HALF = { '1/2': '0.5' };

/* === SOLVED DECK COLUMNS (0.9.0) ======================================
   Mirrors the `sqr-solved-deck` mixin in src/square-root.scss rule for rule:
   inside a scope carrying data-sqr-deck-cols="solved", every .sqr-span-N /
   .sqr-flow-N / .sqr-wide-N resolves to S — the scope's own data-sqr-cols
   (gate 4), or the widest matching raw-pixel gate before the solver has run
   (gate 3). Two selector forms per scope, because the scope may be a host
   element or <html> itself, and the mode class always lives on <html>. */
const SOLVED = '[data-sqr-deck-cols="solved"]';
const GUARD = 'html:not([data-sqr-max-cols="1"])';

function solvedDeckBlock(s, at) {
  const wides = [`${GUARD} ${at}`, `${GUARD}${at}`];
  const rows = [`${GUARD}.sqr-mode-rows ${at}`, `${GUARD}${at}.sqr-mode-rows`];
  const flows = [`${GUARD}.sqr-mode-flow ${at}`, `${GUARD}${at}.sqr-mode-flow`];
  const out = {};
  /* Gate 3's $s is a number (2-4, the raw-pixel pre-paint) and folds exactly
     as 0.9.0 did. Gate 4's $s is the string 'var(--sqr-cols)' (0.9.1) — see
     the SCSS mixin's own comment for why: any count, no enumeration. */
  const wideWidth = typeof s === 'number' ? unit(6 * s) : `calc(var(--micro-width) * 6 * ${s} * 0.0625rem)`;
  for (const p of wides) out[`${p} [class*="sqr-wide-"]`] = { width: wideWidth };
  for (const p of rows) {
    out[`${p} [class*="sqr-span-"]`] = {
      display: 'grid',
      'grid-template-columns': `repeat(${s}, minmax(0, 1fr))`,
      'grid-auto-flow': 'row',
      'column-gap': '0',
      'align-content': 'start',
      'padding-inline': unit(0.25),
    };
    out[`${p} [class*="sqr-span-"] > .sqr-row`] = { 'grid-column': '1 / -1' };
    out[`${p} [class*="sqr-span-"] > .sqr-left`] = { 'grid-column': '1' };
    out[`${p} [class*="sqr-span-"] > .sqr-right`] = { 'grid-column': '2' };
  }
  for (const p of flows) {
    out[`${p} [class*="sqr-flow-"]`] = {
      display: 'block',
      'column-count': `${s}`,
      'column-gap': '0',
      'column-fill': 'balance',
      'padding-inline': unit(0.25),
    };
    out[`${p} [class*="sqr-flow-"] > *`] = { 'break-inside': 'avoid' };
    out[`${p} [class*="sqr-flow-"] > .sqr-row`] = { 'column-span': 'all' };
  }
  return out;
}

function solvedDeck() {
  const out = {};
  /* GATE 3 — the solved pre-paint, ascending so the widest gate wins. */
  for (let m = 2; m <= 4; m++) {
    out[`@media (min-width: ${m * 20}rem)`] = solvedDeckBlock(m, SOLVED);
  }
  /* GATE 4 — what the solver solved for this scope (0.9.1: var-driven, any
     count — see square-root.scss's own Gate 4 comment). `[data-sqr-cols]`
     bare is the "has this scope solved" guard; 'var(--sqr-cols)' supplies
     the actual count, so this fires once for the whole feature instead of
     once per enumerated N. */
  Object.assign(out, solvedDeckBlock('var(--sqr-cols)', `${SOLVED}[data-sqr-cols]`));
  return out;
}

module.exports = plugin(function ({ addBase, addComponents, addUtilities, matchUtilities }) {

  /* === :root constants + the ceiling — always emitted ================== */
  addBase({
    ':root': {
      '--macro-width': '360',
      '--macro-height': '720',
      /* Average finger 45-52 / thumb: 72px */
      '--micro-width': '60',
      '--micro-height': '60',
    },
    /* THE CEILING WINS (0.4.0). A page that declares one column never spans. */
    ':root[data-sqr-max-cols="1"] [class*="sqr-wide-"]': { width: unit(6) },
    ':root[data-sqr-max-cols="1"] [class*="sqr-span-"], :root[data-sqr-max-cols="1"] [class*="sqr-flow-"]': {
      display: 'block',
      'column-count': 'initial',
    },
    /* SOLVED DECK COLUMNS (0.9.0) — the mirror of square-root.scss's
       sqr-solved-deck mixin, gates 3 and 4. In addBase for the same reason the
       ceiling above is: these selectors carry no class candidate for JIT to
       find, so they must be emitted unconditionally. Layer order is moot —
       every one of them outranks the spanning rules on specificity, which is
       what the SCSS relies on too. */
    ...solvedDeck(),
  });

  /* === the probes + landscape canon swap =============================== */
  addComponents({
    '.sqr-macro-pixel': {
      width: 'calc(var(--macro-width) * 1px)',
      height: 'calc(var(--macro-height) * 1px)',
    },
    '.sqr-macro-rem': {
      width: 'calc(var(--macro-width) * 0.0625rem)',
      height: 'calc(var(--macro-height) * 0.0625rem)',
    },
    '.sqr-micro-pixel': {
      width: 'calc(var(--micro-width) * 1px)',
      height: 'calc(var(--micro-height) * 1px)',
    },
    '.sqr-micro-rem': {
      width: 'calc(var(--micro-width) * 0.0625rem)',
      height: 'calc(var(--micro-height) * 0.0625rem)',
    },
    /* Landscape phones only: 361px excludes watches, 768px excludes tablets
       (tested bounds — see the source comments in square-root.scss). */
    '@media screen and (orientation: landscape) and (min-width: 361px) and (max-width: 768px)': {
      '.sqr-macro-pixel': {
        width: 'calc(var(--macro-height) * 1px)',
        height: 'calc(var(--macro-width) * 1px)',
      },
      '.sqr-macro-rem': {
        width: 'calc(var(--macro-height) * 0.0625rem)',
        height: 'calc(var(--macro-width) * 0.0625rem)',
      },
      '.sqr-micro-pixel': {
        width: 'calc(var(--micro-height) * 1px)',
        height: 'calc(var(--micro-width) * 1px)',
      },
      '.sqr-micro-rem': {
        width: 'calc(var(--micro-height) * 0.0625rem)',
        height: 'calc(var(--micro-width) * 0.0625rem)',
      },
    },
  });

  /* === the unit scale, 1..8 + arbitrary values ========================= */
  matchUtilities(
    {
      'sqr-w': (v) => ({ width: unit(v) }),
      'sqr-mt': (v) => ({ 'margin-top': unit(v) }),
      'sqr-mx': (v) => ({ 'margin-left': unit(v), 'margin-right': unit(v) }),
      'sqr-px': (v) => ({ 'padding-left': unit(v), 'padding-right': unit(v) }),
      'sqr-pt': (v) => ({ 'padding-top': unit(v) }),
    },
    { values: SCALE }
  );
  /* families that also carry a fraction in the SCSS */
  matchUtilities({ 'sqr-h': (v) => ({ height: unit(v) }) }, { values: { ...SCALE, ...HALF } });
  matchUtilities({ 'sqr-mr': (v) => ({ 'margin-right': unit(v) }) }, { values: { ...SCALE, ...HALF } });
  matchUtilities({ 'sqr-pl': (v) => ({ 'padding-left': unit(v) }) }, { values: { ...SCALE, '1-3/4': '1.75' } });
  /* sqr-t-1 is the only member of its family in the SCSS; arbitrary values
     extend it without inventing new static classes. */
  matchUtilities({ 'sqr-t': (v) => ({ top: unit(v) }) }, { values: { 1: '1' } });

  /* === statics that mirror the SCSS one for one ======================== */
  const statics = {
    '.-sqr-ml-1\\/2:first-child': { 'margin-left': 'calc(var(--micro-width) * 0.0625rem * -0.5)' },
    '.text-2xs': { 'font-size': '0.65rem' },
  };
  for (let i = 1; i <= 8; i++) {
    statics[`.-sqr-l-${i}`] = { left: negUnit(i) };
    statics[`.-sqr-r-${i}`] = { right: negUnit(i) };
  }
  /* -sqr-h-screen-5 subtracts 4 units, same as the SCSS — a documented quirk
     (README "Known quirks") kept for parity; fix both or neither. */
  const screenSub = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4 };
  for (const [n, sub] of Object.entries(screenSub)) {
    statics[`.-sqr-h-screen-${n}`] = { height: `calc(100vh - (var(--micro-width) * ${sub} * 0.0625rem))` };
  }
  addUtilities(statics);

  /* === SPANNING: one section across N macro columns (0.4.0) ===========
     Gate derived from the package's own constants: a column is not a column
     below SQR_MIN_COL_PX (320) — square-root.js — so N columns need N*320px,
     i.e. N*20rem against the INITIAL 16px root (media queries never see the
     solved root; that is what keeps the gate stable).

     0.7.0: also mirrored under html[data-sqr-cols="M"] for every M >= n — see
     the loop below the @media block. PRE-EXISTING DRIFT FIXED IN THIS RELEASE
     (found during 0.7.0 review, docs/plans/short-screens-design.md §2.2): the
     0.6.0 gutter change (minmax(0, 1fr), column-gap: 0, the 0.25u
     padding-inline) reached src/square-root.scss but never this file. Three
     drifts, six rules -- grid-template-columns, column-gap (twice) and the
     missing padding-inline (twice) -- fixed here so npm run verify:plugin is
     green against the 0.6.0 SCSS as well as the 0.7.0 attribute block. */
  const spanning = {};
  for (let n = 2; n <= 4; n++) {
    spanning[`.sqr-wide-${n}`] = { width: unit(6) };
    spanning[`@media (min-width: ${n * 20}rem)`] = {
      ...(spanning[`@media (min-width: ${n * 20}rem)`] || {}),
      [`.sqr-wide-${n}`]: { width: unit(6 * n) },
      /* MODE A — aligned rows: cards alternate in document order. */
      [`html.sqr-mode-rows .sqr-span-${n}`]: {
        display: 'grid',
        'grid-template-columns': `repeat(${n}, minmax(0, 1fr))`,
        'grid-auto-flow': 'row',
        'column-gap': '0',
        'align-content': 'start',
        'padding-inline': unit(0.25),
      },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-row`]: { 'grid-column': '1 / -1' },
      /* MODE B — masonry fill: multi-column IS the masonry; block because
         multi-column is only honoured on a block container. */
      [`html.sqr-mode-flow .sqr-flow-${n}`]: {
        display: 'block',
        'column-count': `${n}`,
        'column-gap': '0',
        'column-fill': 'balance',
        'padding-inline': unit(0.25),
      },
      [`html.sqr-mode-flow .sqr-flow-${n} > *`]: { 'break-inside': 'avoid' },
      [`html.sqr-mode-flow .sqr-flow-${n} > .sqr-row`]: { 'column-span': 'all' },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-left`]: { 'grid-column': '1' },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-right`]: { 'grid-column': '2' },
    };

    /* GATE 2 — WHAT THE SOLVER SOLVED (0.7.0), mirroring
       square-root.scss's `@for $m from $n through 4 { @include
       sqr-n-columns($n, '[data-sqr-cols="#{$m}"]'); }`. One block per count
       that CONTAINS n, exact-match attribute selectors (no @media wrapper —
       the attribute is the gate). */
    for (let m = n; m <= 4; m++) {
      const at = `html[data-sqr-cols="${m}"]`;
      spanning[`${at} .sqr-wide-${n}`] = { width: unit(6 * n) };
      spanning[`${at}.sqr-mode-rows .sqr-span-${n}`] = {
        display: 'grid',
        'grid-template-columns': `repeat(${n}, minmax(0, 1fr))`,
        'grid-auto-flow': 'row',
        'column-gap': '0',
        'align-content': 'start',
        'padding-inline': unit(0.25),
      };
      spanning[`${at}.sqr-mode-rows .sqr-span-${n} > .sqr-row`] = { 'grid-column': '1 / -1' };
      spanning[`${at}.sqr-mode-flow .sqr-flow-${n}`] = {
        display: 'block',
        'column-count': `${n}`,
        'column-gap': '0',
        'column-fill': 'balance',
        'padding-inline': unit(0.25),
      };
      spanning[`${at}.sqr-mode-flow .sqr-flow-${n} > *`] = { 'break-inside': 'avoid' };
      spanning[`${at}.sqr-mode-flow .sqr-flow-${n} > .sqr-row`] = { 'column-span': 'all' };
      spanning[`${at}.sqr-mode-rows .sqr-span-${n} > .sqr-left`] = { 'grid-column': '1' };
      spanning[`${at}.sqr-mode-rows .sqr-span-${n} > .sqr-right`] = { 'grid-column': '2' };
    }
  }
  addComponents(spanning);
});
