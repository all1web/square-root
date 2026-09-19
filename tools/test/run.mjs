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
        if (a.rootFontSize() !== b.rootFontSize() || a.cols() !== b.cols()) {
            mismatches++;
            console.log(`  FAIL ${v.name} / ${s.label}: 0.8.0 ${a.rootFontSize()} cols=${a.cols()} vs 0.9.0 ${b.rootFontSize()} cols=${b.cols()}`);
        }
    }
}
ok(`${compared} viewport x switch combinations identical`, mismatches === 0, `${mismatches} differed`);

/* the canon itself, spelled out, so a regression names a number and not a diff */
const phone = solve(NEW_JS, { innerWidth: 375, innerHeight: 812, dpr: 3 });
ok('375x812 root font-size unchanged at 104.16666666666667%',
    phone.rootFontSize() === ':root { font-size:104.16666666666667%; }', phone.rootFontSize());
ok('375x812 publishes data-sqr-cols="1"', phone.cols() === '1', String(phone.cols()));
ok('375x812 creates no host style tag', phone.hostStyle() === null);

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
    ok('it publishes micro, macro, --sqr-rem and --sqr-scale',
        ['--micro-width', '--micro-height', '--macro-width', '--macro-height', '--sqr-rem', '--sqr-scale']
            .every((v) => css.includes(v)));
    ok('the host is observed for its own resizes', page.resizeObserved.length === 1);
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

// ── C / D. the stylesheet ──────────────────────────────────────────────────
console.log('\nC. dist — the solved deck, and additions only');

const dist = fs.readFileSync(path.join(ROOT, 'dist', 'square-root.css'), 'utf8');
const old = fs.readFileSync(OLD_CSS, 'utf8');

/* ADDITIONS ONLY: every line of the 0.8.0 stylesheet still appears, in the
   same order, in the 0.9.0 one. A subsequence check is exactly the right
   shape for "nothing was changed or removed, only inserted". */
{
    const a = old.split('\n'), b = dist.split('\n');
    let i = 0, firstMiss = null;
    for (let j = 0; j < b.length && i < a.length; j++) if (a[i] === b[j]) i++;
    if (i < a.length) firstMiss = a[i];
    ok('the 0.8.0 stylesheet is an exact subsequence of the 0.9.0 one (additions only)',
        i === a.length, firstMiss ? 'first line lost: ' + JSON.stringify(firstMiss) : '');
    console.log(`       ${a.length} lines before, ${b.length} after, +${b.length - a.length}`);
}

ok('the 2-column raw-pixel gate block is byte-identical',
    dist.includes('@media (min-width: 40rem) {\n  /* WIDTH — the section itself. Below both gates it is one macro column,'));

for (const s of [2, 3, 4]) {
    ok(`solved scope at data-sqr-cols="${s}" resolves spans to ${s}`,
        dist.includes(`html:not([data-sqr-max-cols="1"]).sqr-mode-rows [data-sqr-deck-cols=solved][data-sqr-cols="${s}"] [class*=sqr-span-] {`) &&
        new RegExp(`\\[data-sqr-cols="${s}"\\] \\[class\\*=sqr-span-\\] \\{[^}]*repeat\\(${s},`).test(dist));
    ok(`solved scope at data-sqr-cols="${s}" resolves flows to ${s}`,
        new RegExp(`\\[data-sqr-cols="${s}"\\] \\[class\\*=sqr-flow-\\] \\{[^}]*column-count: ${s};`).test(dist));
    ok(`solved scope at data-sqr-cols="${s}" resolves wides to ${s} macro columns`,
        new RegExp(`\\[data-sqr-cols="${s}"\\] \\[class\\*=sqr-wide-\\] \\{\\s*width: calc\\(var\\(--micro-width\\) \\* ${6 * s} `).test(dist));
    ok(`…and the <html>-as-scope form exists too`,
        dist.includes(`html:not([data-sqr-max-cols="1"])[data-sqr-deck-cols=solved][data-sqr-cols="${s}"].sqr-mode-rows [class*=sqr-span-] {`));
}
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
