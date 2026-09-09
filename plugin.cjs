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
     solved root; that is what keeps the gate stable). */
  const spanning = {};
  for (let n = 2; n <= 4; n++) {
    spanning[`.sqr-wide-${n}`] = { width: unit(6) };
    spanning[`@media (min-width: ${n * 20}rem)`] = {
      ...(spanning[`@media (min-width: ${n * 20}rem)`] || {}),
      [`.sqr-wide-${n}`]: { width: unit(6 * n) },
      /* MODE A — aligned rows: cards alternate in document order. */
      [`html.sqr-mode-rows .sqr-span-${n}`]: {
        display: 'grid',
        'grid-template-columns': `repeat(${n}, 1fr)`,
        'grid-auto-flow': 'row',
        'column-gap': unit(1),
        'align-content': 'start',
      },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-row`]: { 'grid-column': '1 / -1' },
      /* MODE B — masonry fill: multi-column IS the masonry; block because
         multi-column is only honoured on a block container. */
      [`html.sqr-mode-flow .sqr-flow-${n}`]: {
        display: 'block',
        'column-count': `${n}`,
        'column-gap': unit(1),
        'column-fill': 'balance',
      },
      [`html.sqr-mode-flow .sqr-flow-${n} > *`]: { 'break-inside': 'avoid' },
      [`html.sqr-mode-flow .sqr-flow-${n} > .sqr-row`]: { 'column-span': 'all' },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-left`]: { 'grid-column': '1' },
      [`html.sqr-mode-rows .sqr-span-${n} > .sqr-right`]: { 'grid-column': '2' },
    };
  }
  addComponents(spanning);
});
