# The desktop side — a solve that belongs to a pane, not to the window

Square Root solves `window.innerWidth` and writes `:root { font-size }`. That is right for a phone,
where the window *is* the design. A desktop shell has chrome — a sidebar, a rail — so the board lives
in a **pane**, and a pane-width solve is the only thing that makes the macro columns tile to the
pixel. This document is the design for that, plus the deck and gate work it implies. Everything here
is **opt-in**: a document with no `data-sqr-host` and no `data-sqr-deck-cols` gets 0.8.0's output,
digit for digit.

## 1. The host solve — `data-sqr-host`

```html
<div class="page-body" data-sqr-host data-sqr-max-cols="4">…</div>
```

or, from script: `window.squareRootConfigure({ host: '.page-body', maxCols: 4, deckCols: 'solved' })`.

For each host the solver measures **that element's `clientWidth`** and runs the same arithmetic the
window solve runs: `cols = clamp(round(w / --macro-width), 1, maxCols)`, dropped one if a column
would fall under 320px; `scale = w / (--macro-width × cols)`.

**What it publishes, and where.** On the host element: `data-sqr-cols` (the solve) and
`data-sqr-host-id` (a serial). In a package-owned `<style id="square-root-hosts">`, one rule per
host, keyed on that id:

| published | meaning |
|---|---|
| `--micro-width`, `--micro-height` | the finger, **re-expressed for this scope** |
| `--macro-width`, `--macro-height` | the canon column, same |
| `--sqr-rem` | the rem the host *would* have had, in px — for type, `em` and host CSS |
| `--sqr-scale` | the host's own ratio, for debugging |

**Why custom properties and not `font-size`.** Every utility in this package is
`calc(var(--micro-width) * 0.0625rem * N)`, and **`rem` is always root-relative** — a `font-size` on
the host would not scope one of them. `.sqr-host { font-size: … }` is therefore a lie, and it is not
what this ships. The scope is carried by the *numbers*: the host publishes

```
--micro-width = 60 × scale × 16 / rootFontSizePx
```

so `--micro-width × 0.0625rem` renders at exactly `60 × scale` px whatever the root is doing. The
consequence is the one §9.6 asked for, and it is structural rather than promised: **`<html>`'s
font-size is never touched by a host solve.** Cuba's 14px body type and our finger units coexist
because they are measured in different things. A host **is** the scope — there is no separate
`--sqr-scope` knob to get out of step with it.

**When it runs.** Immediately after the window solve commits its `font-size` (the host arithmetic
divides by that root, so it has to read the committed value), on window resize through the same path,
and through a `ResizeObserver` on each host, so collapsing a sidebar re-solves the board without a
window resize. A publish that would write the same CSS is skipped, so the observer settles in one
pass and cannot loop.

**No probe, no landscape swap.** The window solve measures `.sqr-macro-rem` because it must survive a
host that overrode the canon and a browser with a non-16px default font. A host reads the canon
numbers off `:root` directly: a probe inside the host would read the values the host itself is
publishing — circular. The landscape swap (361–768px) therefore does not apply inside a host, which
is correct: a host exists to hold two or more canonical columns.

**Backwards compatibility.** With no `[data-sqr-host]` in the document the whole feature costs one
`querySelectorAll` per solve. No style tag is created, no attribute is written, no observer is
constructed.

## 2. Solved deck columns — `data-sqr-deck-cols="solved"`

`.sqr-span-2` names its count, so phone-authored content can never become a four-column deck without
new classes. In solved mode it stops naming a count and starts naming *a deck*:

> Inside a scope carrying `data-sqr-deck-cols="solved"`, every `.sqr-span-N`, `.sqr-flow-N` and
> `.sqr-wide-N` (N = 2, 3, 4) resolves to **S**, the `data-sqr-cols` of that scope — the nearest
> host, or `<html>` when the scope is the document. A deck authored smaller than the solve is
> **promoted** to it; a deck authored larger than the solve **clamps** to it. The authored N selects
> nothing but the class name.

`.sqr-wide-N` becomes S macro columns wide, `.sqr-span-N` becomes `repeat(S, minmax(0,1fr))`,
`.sqr-flow-N` becomes `column-count: S`. `.sqr-row` still spans the deck; `.sqr-left` / `.sqr-right`
still pin to columns 1 and 2. The ceiling still wins: the rules are guarded with
`html:not([data-sqr-max-cols="1"])`, so a page that declares one column never spans, exactly as in
0.4.0.

## 3. The gates for 3 and 4 (§9.5)

A finding first: the raw-pixel gates for 3 and 4 **already exist** (`dist/square-root.css` at
`@media (min-width: 60rem)` and `(min-width: 80rem)`), and `.sqr-wide-3` / `.sqr-span-4` have been
honoured there since 0.4.0. What §9.5 actually describes is the *solved* case: pre-solve, a 1440px
desktop paints a `.sqr-span-2` deck as two 720px columns and then reflows to four when JS lands. So
the new gates are the solved-mode ones:

```
@media (min-width: 40rem) { [data-sqr-deck-cols="solved"] … → 2 }
@media (min-width: 60rem) { [data-sqr-deck-cols="solved"] … → 3 }
@media (min-width: 80rem) { [data-sqr-deck-cols="solved"] … → 4 }
```

Emitted in ascending order so the widest matching gate wins by source order, and at a lower
specificity than the `data-sqr-cols` rules, so the solver's answer replaces the guess the moment it
arrives. The 2-column gate block from 0.4.0 is untouched, byte for byte. Caveat, stated because it
is real: the media gate measures the **window**, the host measures the **pane**, so at 1440 with a
360px sidebar the gate guesses 4 and the solver corrects to 3. Server-render `data-sqr-cols` on the
host when the shell already knows it and there is no reflow at all.

## 4. Owner decisions — designed, not shipped

**(2) A desktop macro unit.** Today every desktop column is "a phone's width" (360 canon), which is
right for the board and wrong for a data table or a plan row.

| option | cost |
|---|---|
| **A. Leave it.** One canon everywhere. | Free. Desktop tables stay phone-shaped. |
| **B. `--macro-width-desktop`, chosen by solved cols** (e.g. ≥3 cols ⇒ 480 canon). | One variable, ~20 lines. But it changes `cols` for the same width, so every existing desktop raster moves; and two canons in one document means `.sqr-wide-2` means different widths in different panes. |
| **C. Per-host canon** — a host may declare `data-sqr-macro="480"`. | ~10 lines on top of §1 (the host already reads the canon; it would read its own override first). Keeps one canon per *scope*, which is the unit this design already has. No existing pixel moves, because no host declares it today. |

**Recommendation: C.** It is additive, it costs nothing until used, and it says the true thing — a
canon belongs to a scope, like the solve does. B's "two canons, one document" is the fork this
package exists to avoid.

**(4) A ceiling above 4.** `maxCols` is capped at 4 by the host app, so 1920 and 2560 solve to 4
columns of 480 and 640px — a 80px and a 106px finger.

| option | cost |
|---|---|
| **A. Keep 4.** | Free. Wide monitors get oversized fingers; a 2560 screen is 4 columns of 640. |
| **B. Raise to 6 and let the template choose.** | Nothing in the package changes — `maxCols` is already read from an attribute and the solve is already general. The *content* is the cost: `sqr-wide-5/6`, `sqr-span-5/6`, `sqr-flow-5/6` and their gates are ~2× the current spanning block in `dist`, and every deck rule doubles. |
| **C. Raise the solve, cap the deck at 4.** | The solve tiles 5 or 6 columns (finger stays ~64px at 1920) while decks keep splitting at most 4 ways. ~5 lines: clamp S at 4 in the solved-deck rules; no new classes at all. |

**Recommendation: C**, and only if the owner has a 1920+ monitor he actually works on. It fixes the
oversized finger, which is the real defect, without doubling the stylesheet for a column nobody has
asked for. A is a perfectly good answer until then.
