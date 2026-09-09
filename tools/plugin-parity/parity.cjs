/* Parity check: plugin.cjs must emit the same framework as src/square-root.scss.
 *
 * Compares dist/square-root.css against the Tailwind build of plugin.cjs
 * (tools/plugin-parity/out.css). Values are canonicalized before comparing, so
 * only REAL differences fail: vendor -moz- prefixes Tailwind adds, whitespace,
 * calc parenthesization and factor order (all mathematically identical) are
 * normalized away.
 *
 * Run: npm run verify:plugin
 * Exit 1 on any mismatch, or on a dist selector missing from the plugin that
 * is not on the documented skip list.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', '..', 'dist', 'square-root.css');
const OUT = path.join(__dirname, 'out.css');

/* dist selectors the plugin deliberately does not emit — documented in the
   plugin.cjs header. */
const SKIP = [
  (s) => s.includes('scrollsnap') || s.includes('snap-'),        // _scrollsnap layer
  (s) => s.includes('.xs\\:') || s.includes('.\\32xs'),          // variant-syntax collisions
  (s) => s.includes('html:not(.sqr-mode-rows)'),                 // empty ruleset in SCSS
];

function canonValue(v) {
  return v
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')                                        // calc parens: a*(b) == a*b here
    .replace(/\*0\.0625rem\*(-?[\d.]+)/g, '*$1*0.0625rem')       // factor order
    .replace(/var--micro-width\*0\.0625rem/g, 'var--micro-width*1*0.0625rem'); // explicit ×1
}

function parse(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const map = {};
  const walk = (body, prefix) => {
    let i = 0;
    while (i < body.length) {
      const open = body.indexOf('{', i);
      if (open === -1) break;
      let depth = 1, j = open + 1;
      while (j < body.length && depth > 0) {
        if (body[j] === '{') depth++;
        else if (body[j] === '}') depth--;
        j++;
      }
      const sel = body.slice(i, open).trim();
      const inner = body.slice(open + 1, j - 1);
      if (sel.startsWith('@media')) {
        walk(inner, sel.replace(/\s+/g, ' ') + ' | ');
      } else if (sel) {
        const decls = inner
          .split(';')
          .map((d) => d.trim())
          .filter(Boolean)
          .filter((d) => !d.startsWith('-moz-'))                 // autoprefixer additions
          .map((d) => canonValue(d))
          .sort()
          .join(';');
        sel.split(',').forEach((s) => {
          const key = prefix + s.replace(/\s+/g, ' ').replace(/"/g, '').trim();
          map[key] = map[key] ? map[key] + ';' + decls : decls;
        });
      }
      i = j;
    }
  };
  walk(css, '');
  return map;
}

const dist = parse(fs.readFileSync(DIST, 'utf8'));
const out = parse(fs.readFileSync(OUT, 'utf8'));

let mismatches = 0, matches = 0;
const missing = [];
for (const [sel, decls] of Object.entries(dist)) {
  if (!sel.includes('sqr') && !sel.includes('text-2xs')) continue;
  if (SKIP.some((f) => f(sel))) continue;
  if (out[sel] === undefined) { missing.push(sel); continue; }
  if (out[sel] !== decls) {
    mismatches++;
    console.log(`MISMATCH ${sel}\n  dist:   ${decls}\n  plugin: ${out[sel]}`);
  } else matches++;
}

console.log(`matches = ${matches}   mismatches = ${mismatches}   missing = ${missing.length}`);
missing.forEach((s) => console.log('  missing from plugin: ' + s));
if (mismatches || missing.length) process.exit(1);
console.log('parity OK — plugin.cjs and square-root.scss emit the same framework');
