/* A DOM small enough to be a ruler.
 *
 * src/square-root.js cannot be tested in jsdom: jsdom has no layout, so
 * offsetWidth is 0 and the probe — the thing this whole framework measures
 * against — reads nothing. It also does not resolve custom properties through
 * getComputedStyle. So the harness models exactly the four things the solver
 * actually asks the document for, and models them the way a browser answers:
 *
 *   1. the probes' sizes, computed from the canon and the CURRENT root
 *      font-size (which is what makes the 100% measuring reset meaningful),
 *      including square-root.scss's landscape swap band (361-768px);
 *   2. getComputedStyle on <html> — the canon custom properties, the --sqr-*
 *      switches and fontSize;
 *   3. attributes and classes on <html> and on host elements;
 *   4. timers, which are FAKE and drained on demand, so a solve that takes
 *      two nested 500ms timeouts in a browser takes no time here and is
 *      deterministic instead of flaky.
 */
import vm from 'node:vm';
import fs from 'node:fs';

class El {
    constructor(doc, tag) {
        this.doc = doc;
        this.tagName = tag;
        this.attrs = new Map();
        this.classes = new Set();
        this.children = [];
        this.innerHTML = '';
        this.style = {};
        this._clientWidth = 0;
        this._clientHeight = 0;
        this.classList = {
            contains: (c) => this.classes.has(c),
            add: (c) => this.classes.add(c),
            remove: (c) => this.classes.delete(c),
        };
    }
    get id() { return this.attrs.get('id') || ''; }
    set id(v) { this.attrs.set('id', v); }
    getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
    setAttribute(n, v) { this.attrs.set(n, String(v)); this.doc.writes.push(n); }
    hasAttribute(n) { return this.attrs.has(n); }
    removeAttribute(n) { this.attrs.delete(n); this.doc.writes.push('-' + n); }
    appendChild(el) { this.children.push(el); this.doc.all.push(el); return el; }
    getBoundingClientRect() { return { width: this._clientWidth, height: this._clientHeight }; }
    get clientWidth() { return this._clientWidth; }
    get clientHeight() { return this._clientHeight; }
}

/* The probes. Their sizes are derived, never stored: .sqr-macro-rem is a rem
   box, so it moves with the root font-size the solver is writing; and
   .sqr-macro-pixel is a px box, so it does not. That difference is the whole
   point of 0.7.0's refuter fix, so the harness has to honour it. */
class Probe extends El {
    constructor(doc, kind) { super(doc, 'div'); this.kind = kind; }
    get swapped() {
        const w = doc_window(this.doc).innerWidth, h = doc_window(this.doc).innerHeight;
        return w > h && w >= 361 && w <= 768;   // square-root.scss:289
    }
    get offsetWidth() {
        const c = this.doc.canon;
        const n = this.swapped ? c['--macro-height'] : c['--macro-width'];
        return this.kind === 'px' ? n : n * 0.0625 * this.doc.rootPx();
    }
    get offsetHeight() {
        const c = this.doc.canon;
        const n = this.swapped ? c['--macro-width'] : c['--macro-height'];
        return this.kind === 'px' ? n : n * 0.0625 * this.doc.rootPx();
    }
}

function doc_window(doc) { return doc.win; }

export function createPage(opts = {}) {
    const canon = Object.assign(
        { '--macro-width': 360, '--macro-height': 720, '--micro-width': 60, '--micro-height': 60 },
        opts.canon || {}
    );

    const doc = { canon, all: [], writes: [], vars: opts.vars || {} };
    const html = new El(doc, 'html');
    const head = new El(doc, 'head');
    const body = new El(doc, 'body');
    doc.all.push(html, head, body);
    for (const [k, v] of Object.entries(opts.htmlAttrs || {})) html.attrs.set(k, String(v));

    /* the host page owns the #square-root tag (README "Quick start") */
    const rootStyle = new El(doc, 'style');
    rootStyle.id = 'square-root';
    head.appendChild(rootStyle);

    const macroRem = new Probe(doc, 'rem');
    const macroPx = new Probe(doc, 'px');
    body.appendChild(macroRem);
    body.appendChild(macroPx);

    const hosts = (opts.hosts || []).map((h) => {
        const el = new El(doc, 'div');
        el._clientWidth = h.width;
        el._clientHeight = h.height || 800;
        for (const [k, v] of Object.entries(h.attrs || {})) el.attrs.set(k, String(v));
        if (h.classes) h.classes.forEach((c) => el.classes.add(c));
        body.appendChild(el);
        return el;
    });

    doc.rootPx = () => {
        const m = /font-size\s*:\s*([\d.eE+-]+)%/.exec(rootStyle.innerHTML || '');
        return m ? (16 * parseFloat(m[1])) / 100 : 16;
    };

    html._clientHeight = opts.innerHeight || 812;

    const document = {
        documentElement: html,
        head,
        body,
        writes: doc.writes,
        getElementById(id) { return doc.all.find((e) => e.id === id) || null; },
        createElement(tag) { return new El(doc, tag); },
        getElementsByTagName(t) { return t === 'head' ? [head] : []; },
        querySelector(sel) {
            if (sel === '.sqr-macro-rem') return opts.noProbe ? null : macroRem;
            if (sel === '.sqr-macro-pixel') return opts.noProbe ? null : macroPx;
            return null;
        },
        querySelectorAll(sel) {
            const attr = /^\[([^\]=]+)\]$/.exec(sel);
            if (attr) return doc.all.filter((e) => e.attrs.has(attr[1]));
            if (sel.startsWith('.')) return doc.all.filter((e) => e.classes.has(sel.slice(1)));
            return [];
        },
    };

    /* getComputedStyle: the canon, the --sqr-* switches, and fontSize. Custom
       properties set on <html> as attributes are NOT visible here — the
       package's own rule is "the attribute is the live switch, the custom
       property is the server-rendered default", and `vars` is that default. */
    const getComputedStyle = (el) => ({
        getPropertyValue(name) {
            if (el === html && name in canon) return String(canon[name]);
            if (el === html && name in doc.vars) return String(doc.vars[name]);
            return '';
        },
        get fontSize() { return doc.rootPx() + 'px'; },
    });

    /* FAKE TIMERS. flush() drains in scheduled order; a solve is two nested
       500ms timeouts, so one flush() settles it completely. */
    const timers = [];
    let clock = 0, seq = 0;
    const setTimeout_ = (fn, ms) => { const id = ++seq; timers.push({ id, fn, at: clock + (ms || 0), seq: id }); return id; };
    const clearTimeout_ = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
    const flush = () => {
        let guard = 0;
        while (timers.length) {
            if (++guard > 500) throw new Error('timer flush did not settle');
            timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
            const t = timers.shift();
            clock = Math.max(clock, t.at);
            t.fn();
        }
    };

    const resizeObserved = [];
    const win = {
        innerWidth: opts.innerWidth || 375,
        innerHeight: opts.innerHeight || 812,
        devicePixelRatio: opts.dpr || 2,
        simuating: false,
    };
    doc.win = win;

    const sandbox = {
        window: win,
        document,
        getComputedStyle,
        screen: { orientation: { addEventListener() {} } },
        setTimeout: setTimeout_,
        clearTimeout: clearTimeout_,
        console: { log() {}, warn() {}, error() {} },
        MutationObserver: class { constructor(f) { this.f = f; } observe() {} },
        ResizeObserver: class { constructor(f) { this.f = f; } observe(el) { resizeObserved.push(el); } },
        Math,
        String,
        parseFloat,
        isFinite,
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);

    return {
        sandbox, win, document, html, hosts, head, rootStyle, flush, resizeObserved,
        run(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file }); },
        /* the answers a test asks for */
        rootFontSize() { return rootStyle.innerHTML.trim(); },
        rootPx() { return doc.rootPx(); },
        cols() { return html.getAttribute('data-sqr-cols'); },
        hostStyle() { const t = document.getElementById('square-root-hosts'); return t ? t.innerHTML : null; },
        writes() { return doc.writes.slice(); },
    };
}
