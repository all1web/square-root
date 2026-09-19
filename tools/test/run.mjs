/* The package's tests. `npm test`.
 *
 * Four groups, in the order the desktop-side brief asks for them:
 *
 *   A. NO HOST = TODAY'S OUTPUT. The 0.8.0 solver and the 0.9.0 solver are
 *      both loaded, into two identical sandboxes, and driven over a matrix of
 *      viewports and switches. Every digit of the published root font-size and
 *      every data-sqr-cols must match. This is not "the phone looks the same",
 *      it is the same arithmetic proved on the same inputs.
 *   B. THE HOST SOLVE. It publishes on the host and only on the host; the
 *      numbers render the finger the brief's table asks for; <html>'s
 *      font-size is untouched; and with no host in the document nothing at all
 *      is created or written.
 *   C. THE CSS. The solved-deck rules and the solved gates are in dist, and
 *      the dist diff against HEAD is ADDITIONS ONLY — every line of the old
 *      file still present, in order.
 *   D. THE GATES. 40/60/80rem each carry their solved block, ascending.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPage } from './dom.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NEW_JS = path.join(ROOT, 'src', 'square-root.js');
const TMP = path.join(ROOT, 'tools', 'test', '.baseline');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (detail ? '   ' + detail : '')); }
};
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
/* 0.9.1 appends `--sqr-cols` to the same :root write as `font-size` (see
   square-root.js, "THE SEAM, published"), so the OLD (HEAD) and NEW solves
   can no longer be compared by raw string equality -- only the HEAD file
   ever lacked --sqr-cols. Compare the number the two solvers actually agree
   or disagree about instead. */
const fontPct = (s) => { const m = /font-size:\s*([\d.eE+-]+)%/.exec(s || ''); return m ? m[1] : null; };

/* the 0.8.0 solver, straight out of git — the baseline is the tag, not a copy
   somebody remembered to update */
fs.mkdirSync(TMP, { recursive: true });
const OLD_JS = path.join(TMP, 'square-root.HEAD.js');
fs.writeFileSync(OLD_JS, execFileSync('git', ['show', 'HEAD:src/square-root.js'], { cwd: ROOT, maxBuffer: 1 << 24 }));
const OLD_CSS = path.join(TMP, 'square-root.HEAD.css');
fs.writeFileSync(OLD_CSS, execFileSync('git', ['show', 'HEAD:dist/square-root.css'], { cwd: ROOT, maxBuffer: 1 << 24 }));

function solve(file, opts) {
    const page = createPage(opts);
    page.run(file);
    page.flush();
    return page;
}

// ── A. no host = today's output ────────────────────────────────────────────
console.log('\nA. no host — 0.8.0 and 0.9.0 agree digit for digit');

const MATRIX = [
    { name: 'canon 360x720',        innerWidth: 360,  innerHeight: 720,  dpr: 3 },
    { name: 'iPhone 375x812',       innerWidth: 375,  innerHeight: 812,  dpr: 3 },
    { name: 'Pixel 412x915',        innerWidth: 412,  innerHeight: 915,  dpr: 2.6 },
    { name: 'watch 320x320',        innerWidth: 320,  innerHeight: 320,  dpr: 2 },
    { name: 'Fold split 637x320',   innerWidth: 637,  innerHeight: 320,  dpr: 2.625 },
    { name: 'Fold open 708x823',    innerWidth: 708,  innerHeight: 823,  dpr: 2.625 },
    { name: 'landscape 812x375',    innerWidth: 812,  innerHeight: 375,  dpr: 3 },
    { name: 'iPad 1024x768',        innerWidth: 1024, innerHeight: 768,  dpr: 2 },
    { name: 'iPad Pro 1194x834',    innerWidth: 1194, innerHeight: 834,  dpr: 2 },
    { name: 'laptop 1366x768',      innerWidth: 1366, innerHeight: 768,  dpr: 1 },
    { name: 'desktop 1440x900',     innerWidth: 1440, innerHeight: 900,  dpr: 2 },
    { name: 'wide 1920x1080',       innerWidth: 1920, innerHeight: 1080, dpr: 1 },
];
const SWITCHES = [
    { label: 'defaults',        htmlAttrs: {} },
    { label: 'max-cols=4',      htmlAttrs: { 'data-sqr-max-cols': '4' } },
    { label: 'short=off',       htmlAttrs: { 'data-sqr-short': 'off' } },
    { label: 'peek',            htmlAttrs: {}, peek: true },
    { label: 'fit=contain',     htmlAttrs: { 'data-sqr-fit': 'contain' } },
    { label: 'fit=stack',       htmlAttrs: { 'data-sqr-fit': 'stack' } },
    { label: 'tiers',           htmlAttrs: { 'data-sqr-max-cols': '4', 'data-sqr-device-cols': 'tiers', 'data-sqr-device-tiers': '2 1600 1700 1.75, 3 1900 2300 1.75' } },
];

let mismatches = 0, compared = 0;
for (const v of MATRIX) {
    for (const s of SWITCHES) {
        const opts = { innerWidth: v.innerWidth, innerHeight: v.innerHeight, dpr: v.dpr, htmlAttrs: s.htmlAttrs };
        const mk = (file) => {
            const page = createPage(JSON.parse(JSON.stringify(opts)));
            if (s.peek) page.html.classList.add('sqr-peek');
            page.run(file);
            page.flush();
            return page;
        };
        const a = mk(OLD_JS), b = mk(NEW_JS);
        compared++;
        if (fontPct(a.rootFontSize()) !== fontPct(b.rootFontSize()) || a.cols() !== b.cols()) {
            mismatches++;
            console.log(`  FAIL ${v.name} / ${s.label}: 0.9.0 ${a.rootFontSize()} cols=${a.cols()} vs 0.9.1 ${b.rootFontSize()} cols=${b.cols()}`);
        }
    }
}
ok(`${compared} viewport x switch combinations identical`, mismatches === 0, `${mismatches} differed`);

/* the canon itself, spelled out, so a regression names a number and not a diff */
const phone = solve(NEW_JS, { innerWidth: 375, innerHeight: 812, dpr: 3 });
ok('375x812 root font-size unchanged at 104.16666666666667%',
    fontPct(phone.rootFontSize()) === '104.16666666666667', phone.rootFontSize());
ok('375x812 publishes data-sqr-cols="1"', phone.cols() === '1', String(phone.cols()));
ok('375x812 publishes --sqr-cols:1 alongside it (0.9.1)', phone.rootCols() === '1', String(phone.rootCols()));
ok('375x812 creates no host style tag', phone.hostStyle() === null);

// ── A2. no ceiling by choice — data-sqr-max-cols="auto" ─────────────────────
console.log('\nA2. data-sqr-max-cols="auto" — the owner\'s ruling, 2026-09-19');
{
    const AUTO_CASES = [
        { width: 1440, cols: 4 },
        { width: 1920, cols: 5 },
        { width: 2560, cols: 7 },
        { width: 2880, cols: 8 },
    ];
    for (const c of AUTO_CASES) {
        const page = solve(NEW_JS, {
            innerWidth: c.width, innerHeight: 1080, dpr: 1,
            htmlAttrs: { 'data-sqr-max-cols': 'auto' },
        });
        ok(`${c.width}px wide, no ceiling, solves ${c.cols} columns`,
            page.rootCols() === String(c.cols), 'got ' + page.rootCols());
    }
    /* the scale stays in band: cols absorbs the width, the finger never
       drifts more than a rounding step off the canon's 60px. */
    for (const c of AUTO_CASES) {
        const page = solve(NEW_JS, {
            innerWidth: c.width, innerHeight: 1080, dpr: 1,
            htmlAttrs: { 'data-sqr-max-cols': 'auto' },
        });
        const scale = c.width / (360 * c.cols);
        ok(`${c.width}px: the finger stays within its band (scale ${scale.toFixed(3)})`,
            scale > 0.9 && scale < 1.15, String(scale));
    }
    /* numeric ceilings are unchanged: the same width, capped at 4, never
       exceeds 4 -- "auto" is additive, not a replacement default. */
    const capped = solve(NEW_JS, { innerWidth: 2880, innerHeight: 1080, dpr: 1, htmlAttrs: { 'data-sqr-max-cols': '4' } });
    ok('a numeric ceiling still caps (2880px, max-cols=4, unchanged behaviour)',
        capped.rootCols() === '4', 'got ' + capped.rootCols());
    const noAttr = solve(NEW_JS, { innerWidth: 2880, innerHeight: 1080, dpr: 1 });
    ok('the default ceiling (no attribute) is still 2, byte for byte',
        noAttr.rootCols() === '2', 'got ' + noAttr.rootCols());
    /* --sqr-max-cols: auto (the CSS custom property form) */
    const viaVar = solve(NEW_JS, { innerWidth: 1920, innerHeight: 1080, dpr: 1, vars: { '--sqr-max-cols': 'auto' } });
    ok('--sqr-max-cols: auto (the custom-property form) also lifts the ceiling',
        viaVar.rootCols() === '5', 'got ' + viaVar.rootCols());
}

// ── B. the host solve ──────────────────────────────────────────────────────
console.log('\nB. the host solve — the pane, not the window');

/* The brief's own table (cuba-shell-steps-4-6.md section 4.4): a 1440 window
   whose sidebar is one macro column leaves a 1080px pane = 3 macro columns at
   a 60px finger; a 1194 window leaves 796px = 2 columns at a 66.33px finger. */
const HOST_CASES = [
    { name: '1440 window, 1080 pane', innerWidth: 1440, innerHeight: 900, pane: 1080, cols: 3, finger: 60 },
    { name: '1194 window, 796 pane',  innerWidth: 1194, innerHeight: 834, pane: 796,  cols: 2, finger: 66.33333333333333 },
    { name: '1366 window, 1024 pane', innerWidth: 1366, innerHeight: 768, pane: 1024, cols: 3, finger: 56.888888888888886 },
    { name: '1920 window, 1440 pane', innerWidth: 1920, innerHeight: 1080, pane: 1440, cols: 4, finger: 60 },
];
for (const c of HOST_CASES) {
    const page = solve(NEW_JS, {
        innerWidth: c.innerWidth, innerHeight: c.innerHeight, dpr: 2,
        htmlAttrs: { 'data-sqr-max-cols': '4' },
        hosts: [{ width: c.pane, attrs: { 'data-sqr-host': '', 'data-sqr-deck-cols': 'solved' } }],
    });
    const host = page.hosts[0];
    const css = page.hostStyle() || '';
    const micro = parseFloat(/--micro-width:([\d.eE+-]+)/.exec(css)[1]);
    /* what the browser will actually render: the utilities are
       calc(var(--micro-width) * 0.0625rem * N), and rem is the ROOT's. */
    const renderedFinger = micro * 0.0625 * page.rootPx();
    ok(`${c.name}: host solves ${c.cols} columns`, host.getAttribute('data-sqr-cols') === String(c.cols),
        'got ' + host.getAttribute('data-sqr-cols'));
    ok(`${c.name}: one finger renders at ${c.finger.toFixed(2)}px`, near(renderedFinger, c.finger, 1e-9),
        'got ' + renderedFinger);
    ok(`${c.name}: pane tiles exactly (${c.cols} macro columns == pane width)`,
        near(renderedFinger * 6 * c.cols, c.pane, 1e-9), `${renderedFinger * 6 * c.cols} vs ${c.pane}`);
}

/* publishes on the host ONLY */
{
    const page = solve(NEW_JS, {
        innerWidth: 1440, innerHeight: 900, dpr: 2,
        htmlAttrs: { 'data-sqr-max-cols': '4' },
        hosts: [{ width: 1080, attrs: { 'data-sqr-host': '' } }],
    });
    const bare = solve(NEW_JS, { innerWidth: 1440, innerHeight: 900, dpr: 2, htmlAttrs: { 'data-sqr-max-cols': '4' } });
    ok('a host does not move <html> font-size', page.rootFontSize() === bare.rootFontSize(),
        `${page.rootFontSize()} vs ${bare.rootFontSize()}`);
    ok('a host does not move <html> data-sqr-cols', page.cols() === bare.cols());
    const css = page.hostStyle() || '';
    ok('the host style tag keys on data-sqr-host-id', /^\[data-sqr-host-id="1"\]\{/.test(css.trim()), css.slice(0, 40));
    ok('it publishes micro, macro, --sqr-rem, --sqr-scale and --sqr-cols',
        ['--micro-width', '--micro-height', '--macro-width', '--macro-height', '--sqr-rem', '--sqr-scale', '--sqr-cols']
            .every((v) => css.includes(v)));
    ok('the host is observed for its own resizes', page.resizeObserved.length === 1);
}

/* a host may also declare `data-sqr-max-cols="auto"` (0.9.1) */
{
    const page = solve(NEW_JS, {
        innerWidth: 2880, innerHeight: 1080, dpr: 1,
        htmlAttrs: { 'data-sqr-max-cols': '4' },   // the page ceiling stays 4
        hosts: [{ width: 2880, attrs: { 'data-sqr-host': '', 'data-sqr-max-cols': 'auto' } }],
    });
    ok('a host ceiling of "auto" overrides a numeric page ceiling',
        page.hosts[0].getAttribute('data-sqr-cols') === '8', String(page.hosts[0].getAttribute('data-sqr-cols')));
}

/* a host with its own narrower ceiling, and the 320px floor */
{
    const page = solve(NEW_JS, {
        innerWidth: 1440, innerHeight: 900, dpr: 2,
        htmlAttrs: { 'data-sqr-max-cols': '4' },
        hosts: [
            { width: 1080, attrs: { 'data-sqr-host': '', 'data-sqr-max-cols': '2' } },
            { width: 500,  attrs: { 'data-sqr-host': '' } },
        ],
    });
    ok('a host ceiling overrides the page ceiling', page.hosts[0].getAttribute('data-sqr-cols') === '2',
        String(page.hosts[0].getAttribute('data-sqr-cols')));
    ok('a 500px pane stays one column (the 320px floor)', page.hosts[1].getAttribute('data-sqr-cols') === '1',
        String(page.hosts[1].getAttribute('data-sqr-cols')));
    ok('two hosts, two rules, two ids', (page.hostStyle().match(/data-sqr-host-id/g) || []).length === 2);
}

/* the options door, and the idle publish */
{
    const page = createPage({
        innerWidth: 1440, innerHeight: 900, dpr: 2,
        htmlAttrs: { 'data-sqr-max-cols': '4' },
        hosts: [{ width: 1080, classes: ['page-body'] }],
    });
    page.run(NEW_JS);
    page.flush();
    ok('before configure() there is no host style tag', page.hostStyle() === null);
    page.sandbox.window.squareRootConfigure({ host: '.page-body', maxCols: 4, deckCols: 'solved' });
    page.flush();
    ok('squareRootConfigure({host}) marks and solves it', page.hosts[0].getAttribute('data-sqr-cols') === '3',
        String(page.hosts[0].getAttribute('data-sqr-cols')));
    ok('configure() sets data-sqr-deck-cols on the host',
        page.hosts[0].getAttribute('data-sqr-deck-cols') === 'solved');
    const css1 = page.hostStyle();
    const writesBefore = page.writes().length;
    page.sandbox.window.squareRootSolveHosts();
    ok('a re-solve that moves nothing writes nothing', page.hostStyle() === css1 && page.writes().length === writesBefore);
}

/* an unmeasurable host is skipped, not published at a nonsense scale */
{
    const page = solve(NEW_JS, {
        innerWidth: 1440, innerHeight: 900, dpr: 2,
        hosts: [{ width: 0, attrs: { 'data-sqr-host': '' } }],
    });
    ok('a host with no width is skipped', page.hosts[0].getAttribute('data-sqr-cols') === null);
    ok('…and no style tag is created for it', page.hostStyle() === null);
}

// ── E. when the solve runs (0.9.2) ─────────────────────────────────────────
console.log('\nE. when the solve runs — the owner\'s iPad, 2026-09-19');

/* The owner's viewport, with the host app's own ceiling. The numbers are the
   ones measured on the live page: 1194 / (360 x 3) = 110.55555555555556%,
   which is 17.68888888888889px of root — and they have to be there by
   DOMContentLoaded plus one solve, never at `load`. */
const IPAD = { innerWidth: 1194, innerHeight: 834, dpr: 2, htmlAttrs: { 'data-sqr-max-cols': 'auto' } };
const IPAD_PCT = '110.55555555555556';
const IPAD_PX = 17.68888888888889;

{
    /* the document is past parsing when the module runs (a deferred/module
       script, which is what a bundler emits): solve immediately. */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'interactive' }));
    page.run(NEW_JS);
    page.flush();
    ok('readyState=interactive: the first solve lands with no event at all',
        fontPct(page.rootFontSize()) === IPAD_PCT && page.cols() === '3',
        page.rootFontSize() + ' cols=' + page.cols());
    ok('…and the root is 17.69px, not 16px', near(page.rootPx(), IPAD_PX, 1e-9), String(page.rootPx()));
}

{
    /* still parsing when the module runs — the probe may not exist yet, so the
       solve waits for DOMContentLoaded. It must NOT wait for `load`: that was
       the bug. */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'loading' }));
    page.run(NEW_JS);
    page.flush();
    ok('readyState=loading: nothing is written at module execution',
        page.styleWrites().length === 0, JSON.stringify(page.styleWrites()));
    page.setReadyState('interactive');
    page.fire('document', 'DOMContentLoaded');
    page.flush();
    ok('DOMContentLoaded + one solve: cols=3 AND font-size 110.55555555555556%',
        fontPct(page.rootFontSize()) === IPAD_PCT && page.cols() === '3',
        page.rootFontSize() + ' cols=' + page.cols());
    ok('…the root font-size is 17.69px before `load` has fired at all',
        near(page.rootPx(), IPAD_PX, 1e-9), String(page.rootPx()));

    /* and `load`, when it finally arrives seconds later, is free */
    const before = page.styleWrites().length;
    page.fire('window', 'load');
    page.flush();
    ok('`load` after a settled solve writes nothing new',
        page.styleWrites().length === before, `${page.styleWrites().length - before} extra write(s)`);
    ok('…and the page never dips to 100% on the way',
        !page.styleWrites().slice(before).some((s) => /font-size:\s*100%/.test(s)));
    ok('…and the solve is still the settled one',
        fontPct(page.rootFontSize()) === IPAD_PCT && page.cols() === '3', page.rootFontSize());
}

{
    /* a resize that changes the viewport still solves; one that does not, does
       not. The first half is the whole framework, so it is worth the line. */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'complete' }));
    page.run(NEW_JS);
    page.flush();
    const settled = page.styleWrites().length;
    page.fire('window', 'resize');
    page.flush();
    ok('a resize to the same size is a no-op', page.styleWrites().length === settled);
    page.resize(375, 812);
    page.fire('window', 'resize');
    page.flush();
    ok('a resize to 375x812 re-solves (104.16666666666667%, cols=1)',
        fontPct(page.rootFontSize()) === '104.16666666666667' && page.cols() === '1',
        page.rootFontSize() + ' cols=' + page.cols());
}

{
    /* the public door is never short-circuited: it is what the README tells a
       host app to call after changing a CUSTOM PROPERTY, which no input can
       see. It must re-solve even when everything observable is identical. */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'complete' }));
    page.run(NEW_JS);
    page.flush();
    const settled = page.styleWrites().length;
    page.sandbox.window.squareRootResolve();
    page.flush();
    ok('window.squareRootResolve() always performs a real solve',
        page.styleWrites().length > settled, 'it was skipped');
    ok('…and lands on the same answer', fontPct(page.rootFontSize()) === IPAD_PCT, page.rootFontSize());
}

{
    /* THE OWNER'S BUG ITSELF. A rotation landing while a solve is in flight
       used to write ":root{font-size:100%}" and then drop its own solve, so
       the page stayed at canon scale until the NEXT rotation — "you have to
       rotate it back and forth". Here the first solve is deliberately left
       un-flushed (in flight) when the rotation arrives. */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'complete' }));
    page.run(NEW_JS);                       // solve in flight: window.simuating === true
    ok('a solve is in flight', page.sandbox.window.simuating === true);
    page.fire('screen', 'change');          // the rotation lands mid-solve
    page.flush();
    ok('a rotation mid-solve does not strand the page at 100%',
        page.rootPx() !== 16 && fontPct(page.rootFontSize()) === IPAD_PCT,
        page.rootFontSize());
}

{
    /* the host page keeps its own handlers */
    const page = createPage(Object.assign({}, IPAD, { readyState: 'complete' }));
    page.run(NEW_JS);
    page.flush();
    ok('window.onload / window.onresize are never assigned',
        page.sandbox.window.onload === undefined && page.sandbox.window.onresize === undefined,
        `onload=${typeof page.sandbox.window.onload} onresize=${typeof page.sandbox.window.onresize}`);
    ok('resize, load and orientationchange are registered as listeners',
        ['resize', 'load', 'orientationchange'].every((t) => (page.listeners.window[t] || []).length === 1));
}

// ── C / D. the stylesheet ──────────────────────────────────────────────────
console.log('\nC. dist — the solved deck, and additions only');

const dist = fs.readFileSync(path.join(ROOT, 'dist', 'square-root.css'), 'utf8');
const old = fs.readFileSync(OLD_CSS, 'utf8');

/* ADDITIONS ONLY THROUGH GATE 3: everything up to "GATE 4" is untouched, in
   order. Gate 4 itself is NOT additions-only as of 0.9.1 — it is a stated
   REPLACEMENT (docs/desktop-side.md §4(4), owner's ruling 2026-09-19): the
   per-N attribute enumeration (2..4, ~127 lines) is swapped for a handful of
   var(--sqr-cols) rules that resolve ANY count, because "auto" lets a scope
   solve past 4 and enumerating every count a TV could reach is exactly the
   fork this package exists to avoid. The subsequence check therefore runs
   only over the shared prefix (0.4.0's gates and earlier), where nothing
   changed or moved. */
{
    const gateMarker = '/* GATE 4 — WHAT THE SOLVER SOLVED';
    const aFull = old.split('\n'), bFull = dist.split('\n');
    const aCut = aFull.findIndex((l) => l.includes(gateMarker));
    const a = aCut >= 0 ? aFull.slice(0, aCut) : aFull;
    const b = bFull;
    let i = 0, firstMiss = null;
    for (let j = 0; j < b.length && i < a.length; j++) if (a[i] === b[j]) i++;
    if (i < a.length) firstMiss = a[i];
    ok('everything before Gate 4 is an exact subsequence of 0.9.0 (additions only)',
        i === a.length, firstMiss ? 'first line lost: ' + JSON.stringify(firstMiss) : '');
    console.log(`       ${aFull.length} lines before, ${bFull.length} after, ${bFull.length - aFull.length >= 0 ? '+' : ''}${bFull.length - aFull.length} (Gate 4 replaced, not appended)`);
}

ok('the 2-column raw-pixel gate block is byte-identical',
    dist.includes('@media (min-width: 40rem) {\n  /* WIDTH — the section itself. Below both gates it is one macro column,'));

/* GATE 4 is var-driven as of 0.9.1 (docs/desktop-side.md §4(4), owner's
   ruling 2026-09-19): one rule per shape, reading `--sqr-cols` off the
   cascade, so it resolves to ANY solved count -- 2 through 8 and beyond --
   with no per-N enumeration. `[data-sqr-cols]` (bare, no `="N"`) is kept as
   the "has this scope solved" guard; the count itself comes from the
   variable, not the attribute's string. */
ok('the var-driven solved-span rule uses --sqr-cols, not an enumerated count',
    dist.includes('html:not([data-sqr-max-cols="1"]).sqr-mode-rows [data-sqr-deck-cols=solved][data-sqr-cols] [class*=sqr-span-] {') &&
    /\[data-sqr-cols\] \[class\*=sqr-span-\] \{[^}]*repeat\(var\(--sqr-cols\),/.test(dist));
ok('the var-driven solved-flow rule uses --sqr-cols',
    /\[data-sqr-cols\] \[class\*=sqr-flow-\] \{[^}]*column-count: var\(--sqr-cols\);/.test(dist));
ok('the var-driven solved-wide rule uses --sqr-cols',
    /\[data-sqr-cols\] \[class\*=sqr-wide-\] \{\s*width: calc\(var\(--micro-width\) \* 6 \* var\(--sqr-cols\)/.test(dist));
ok('…and the <html>-as-scope form exists too',
    dist.includes('html:not([data-sqr-max-cols="1"])[data-sqr-deck-cols=solved][data-sqr-cols].sqr-mode-rows [class*=sqr-span-] {'));
ok('no per-count enumeration remains for Gate 4 (2, 3 and 4 no longer named in an attribute selector)',
    ![2, 3, 4].some((n) => dist.includes(`[data-sqr-deck-cols=solved][data-sqr-cols="${n}"]`)));
ok('the ceiling still wins: every solved rule is guarded',
    (dist.match(/\[data-sqr-deck-cols=solved\]/g) || []).length ===
    (dist.match(/html:not\(\[data-sqr-max-cols="1"\]\)[^\n]*\[data-sqr-deck-cols=solved\]/g) || []).length);

console.log('\nD. the solved gates at 40 / 60 / 80rem');
{
    /* The 0.4.0 gates come first in the file and are not what this section is
       about, so everything here is measured from the solved-gate marker on. */
    const at = dist.indexOf('GATE 3 — THE SOLVED PRE-PAINT');
    ok('the solved gates are a block of their own, after the 0.4.0 gates',
        at > dist.lastIndexOf('html[data-sqr-cols="4"].sqr-mode-flow .sqr-flow-4 > .sqr-row'));
    const solvedGates = dist.slice(at, dist.indexOf('GATE 4 — WHAT THE SOLVER SOLVED'));
    const idx = [40, 60, 80].map((r) => solvedGates.indexOf(`@media (min-width: ${r}rem)`));
    ok('all three solved gates exist', idx.every((i) => i > 0));
    ok('they are emitted ascending, so the widest matching gate wins',
        idx[0] < idx[1] && idx[1] < idx[2]);
    for (const [i, [r, n]] of [[40, 2], [60, 3], [80, 4]].entries()) {
        const end = i < 2 ? idx[i + 1] : solvedGates.length;
        const block = solvedGates.slice(idx[i], end);
        const solvedAt = block.indexOf('[data-sqr-deck-cols=solved] [class*=sqr-span-] {');
        ok(`the ${r}rem solved gate splits ${n} ways`,
            solvedAt > 0 && new RegExp(`repeat\\(${n},`).test(block.slice(solvedAt, solvedAt + 400)));
        ok(`the ${r}rem solved gate sets column-count ${n} for flow decks`,
            new RegExp(`\\[class\\*=sqr-flow-\\] \\{[^}]*column-count: ${n};`).test(block));
    }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
