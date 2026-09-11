# Design rationale — why these numbers

Square Root's constants are not round numbers picked for tidiness. Each one comes
from published research on how people actually use phones, and the framework's
whole value depends on them being *specific*. This page records the reasoning, so
that anyone tempted to "clean up" a value understands what they would be
discarding.

---

## The micro unit: 60 — the smallest block that is never hard to tap

```css
--micro-width: 60;
--micro-height: 60;
```

This is the framework's atom. Every spacing, sizing and offset utility is a
multiple (or a documented fraction) of it, which means **no element built from
Square Root units can accidentally become too small to hit comfortably.**

The number comes from touch-target research on finger and thumb contact areas.
The source file cites the widely-referenced Smashing Magazine summary of that
work:

> <https://www.smashingmagazine.com/2012/02/finger-friendly-design-ideal-mobile-touchscreen-target-sizes/>

The findings that matter here:

| Contact | Typical width | Consequence |
|---|---|---|
| Average adult **finger** pad | ~45–52 px | Targets below this produce mis-taps |
| Average adult **thumb** | ~72 px | One-handed use needs more room than a finger |

60 sits deliberately **between the finger and the thumb figure**: comfortably
above the finger minimum so ordinary taps never miss, while not so large that a
phone screen can only hold a handful of controls. It is the smallest block that
is *reliably* tappable for both grips rather than only the best case.

This is why the unit exists at all. Plenty of design systems start from a
typographic scale (4 px, 8 px) and hope the resulting controls end up big enough.
Square Root inverts that: it starts from **the human hand** and derives layout
from it, so accessibility of touch is structural rather than something you audit
for afterwards.

> A practical consequence: `sqr-w-1`/`sqr-h-1` is one finger. If a control is one
> unit, it is by construction tappable. Fractions exist (`sqr-h-1/2`,
> `sqr-mr-1/2`, `xs:sqr-mx-1/4`) for *spacing* — not for shrinking touch targets
> below the researched floor.

---

## The macro unit: 360 × 720 — the canonical phone

```css
--macro-width: 360;
--macro-height: 720;
```

This is the reference device the whole design is authored against — described in
the source as *"the size of the lens / top-fold of the page … the largest unit we
want to fit on screen from a mobile-first approach."*

Why 360 × 720:

- **360 px is the floor of the modern phone class.** It is the most common
  reported CSS width in the Android field and the practical minimum a
  contemporary phone design must survive. Designing to the smallest common device
  and scaling *up* is safe; designing to a large device and scaling down is not,
  because content that fits at 430 px can become unreadable at 360 px.
- **720 = exactly 2 × 360**, giving a 1:2 canonical aspect. A clean integer ratio
  keeps the maths honest when the canon is rotated for landscape (the framework
  swaps to 720 × 360) and when columns are tiled on wide screens.
- **360 is exactly 6 micro units** (6 × 60). The canonical viewport is therefore
  a whole number of finger-widths across — six columns of guaranteed-tappable
  blocks — and 720 is twelve down. The macro and micro systems are commensurate
  by construction, so no layout built from micro units can ever land on a
  fractional relationship with the page.

That last point is the quiet one, and it is the reason both constants had to be
chosen together rather than independently.

---

## The device brackets

The bucket boundaries in `square-root.js` and the media queries in
`square-root.scss` follow real device classes rather than arbitrary round
numbers:

| Bracket | Range | What lives there |
|---|---|---|
| `2xs` | ≤ 320 px | Watches. Explicitly excluded from the landscape rules — a watch is not a phone in landscape. |
| `xs` / `sm` | 320–640 px | Phones. The design target. |
| `md` | 640–768 px | Large phones / small tablets. |
| `lg` | 768–1024 px | Tablets. |
| `xl` | ≥ 1024 px | Laptops and desktops — switches to whole-column tiling. |

The landscape media query is bounded `(min-width: 361px) and (max-width: 768px)`
for exactly this reason: **361 excludes the watch class** (a 320-wide watch
rotated is still not a landscape phone), and **768 excludes tablets**, which have
enough height to keep the portrait canon. The source comment records the
reasoning and the testing that produced those bounds, including the note that
320 in both dimensions turned out to be the safe cut-off in practice.

---

## The `cols` factors — the "peek" is a research-backed affordance

On mid-size screens the solver divides the scale by a `cols` factor (1.2 at `md`,
1.61 at `lg`). This deliberately makes content *slightly smaller than a perfect
fit*, so the edge of the next column is visible.

That sliver is not decoration. A partially-visible next item is the strongest
known affordance for horizontal scrolling on touch devices — considerably more
effective than arrows or dots, because it communicates that more content exists
*and* which direction it lies in, without any chrome. Square Root builds the cue
into the scale itself rather than adding UI to explain the gesture.

---

## The fit switch: 9 finger units, and a floor of 0.7

Both numbers arrived with `data-sqr-fit` in 0.6.0, and both are derived from constants already on
this page rather than chosen for tidiness.

### `data-sqr-stack` = 9 — the aspect at which a height budget is free

The canon is **12 finger units tall and 6 across** (720/60 and 360/60 — the commensurability above).
Once a screen is wide enough for two canonical columns, which is the default column ceiling, the
width solve lays `2 × 6 = 12` units across the viewport. A height budget of `S` units therefore
costs **nothing** on any screen whose aspect is `12 : S` or taller, and starts costing on anything
wider:

| `S` | free above this aspect | consequence |
|---|---|---|
| 12 | 1 : 1 | binds on everything but a portrait phone — that is `contain`, not a budget |
| **9** | **4 : 3** | **binds only on screens wider than 4:3** |
| 8 | 3 : 2 | starts binding on 4:3 tablets — too eager |
| 6.75 | 16 : 9 | inert across the whole laptop class — useless where it is needed |

9 is the value that engages on exactly the set the feature was asked for — square screens and the
worst landscape screens — and nowhere else. Every phone in portrait, every tablet in portrait, a
folding phone in both orientations and a 4:3 tablet in landscape get the width solve unchanged, to
the digit.

There is a second, independent reading of the same number: 9 of 12 units is three quarters of the
canon, the canon minus about three units of fixed chrome at top and bottom, which is what a real
application board measures. That is corroboration, not derivation — a package default must not be
computed from one consumer's header height.

The budget is clamped at the canon's own height (`min(1, S / unitsDown)`), because under the
landscape swap the canon is 6 units tall, and an unclamped 9-unit budget would demand one and a half
canons of height on a screen the media query had already handled correctly.

### `data-sqr-fit-floor` = 0.7 — the midpoint of a window closed at both ends

The floor bounds how far the height solve may shrink the width solve. It is the same axis as the
peek factor — a multiplier on the width solve — though it does not *inherit* the peek's bound. The
floor is applied after the peek multiply, so `sqr-peek` at `SQR_PEEK_MIN = 0.5` composed with a
binding floor of `0.7` gives `0.35` of the raw width solve: two independent factors, each clamped on
its own. Two constants close the floor's own window:

**The lower bound is the touch research, on the two-column class.** From 640px CSS up, the column
solve runs and the screens that can reach the floor carry two columns, so at the floor a finger unit
renders at `FLOOR × W / 12` real pixels. The narrowest screen in that class that can reach the floor
is a landscape phone just past the landscape query's 768px bound — 812 × 375. Keeping the finger
unit at or above **45px**, the bottom of the 45–52px band this page cites for the micro unit, gives

```
FLOOR × 812 / 12 ≥ 45   →   FLOOR ≥ 540/812 = 0.665
```

Below that, the framework would be designing under its own research.

**Below 640px this bound does not hold, and no floor value rescues it.** There the column solve does
not run, `cols` stays 1, and the floor's finger unit is `FLOOR × W / 6` — twice as sensitive. A
360 × 300 window (landscape, but under the landscape query's `min-width: 361`, so the canon is still
portrait) clamps to the floor and lands on a 42px finger unit, 6.7% under the band. Holding 45px at
`W = 360` would need `FLOOR ≥ 0.75`, which is exactly the upper bound below; at `W = 320` it would
need `0.84`, which is past it. So the window is derived for, and claimed only for, screens wide
enough for two columns. On a sub-361px landscape window a height mode cannot hold the touch band:
the floor clamps and the page scrolls — the same honest answer 812 × 375 gets.

**The upper bound is the mode's own purpose.** With two columns the floor engages below viewport
aspect `H/W = FLOOR`, and `contain` exists to fit a 4:3 landscape tablet at `H/W = 0.75`. A floor
above 0.75 would pre-empt `contain` on exactly the screen it was built for — at 0.8 a 1024 × 768
tablet clamps to a canon 819px tall in a 768px window, a contain that does not contain. So

```
FLOOR ≤ 0.75
```

**0.70 is the midpoint of [0.665, 0.75]** — arithmetic 0.7075, geometric 0.7062 — and clears both
ends by more than 5%. At the floor on 812 × 375 the finger unit measures 47.4px, inside the band.
`0` disables the floor; `1` disables the height modes.

If you move either number, say which of these bounds you are spending and what you get for it.

---

## The short-screen switch: 1.2 and 0.6

*0.7.0, `data-sqr-short`. Both are Neo's numbers; this is the arithmetic behind them.*

### `data-sqr-short-aspect` = 1.2 — a column wider than its own height, with headroom

The trigger is `width / cols > height × aspect`: a column is "short for itself" once it is wider
than `aspect` times the viewport height. `1.0` would fire the instant a column stops being taller
than it is wide — the moment a card *could* look like a landscape photo rather than a portrait one,
not the moment it actually looks wrong. Neo's Fold numbers (`docs/plans/short-screens.md` §3) settle
it empirically: at 941 × 729 (aspect 0.775) he wants **one** column and gets it — `358/1 = 358`
against `278 × 1.2 = 333.6`, so `358 > 333.6` and the trigger is already true there, but the finger
floor (below) is what actually declines the second column, not the aspect trigger. At 637 × 320 he
wants **two** — `637 > 384` (`320 × 1.2`), comfortably past. `1.2` is the point past which "a column
this wide, this short" reads as *wrong* rather than merely *not square*: a 20% margin over the literal
1:1 line, wide enough that a normal portrait card (aspect ≈ 0.6–0.8, per the mockups this template is
measured against) never trips it by accident.

### `data-sqr-short-floor` = 0.6 — the finger this pass will spend, at the flattest screen it will ever meet

`need = floor + (1 − floor) × min(1, height/width)`: a square screen (`a = 1`) demands a full
canonical finger (`need = 1`, regardless of `floor`); an infinitely wide, flat screen (`a → 0`)
converges on `need = floor`. So `floor` is the answer to one question only: *how small a finger will
this pass ever accept, in the limit?*

`0.6` is deliberately **below** the package's own researched 45–52px floor (`docs/DESIGN-RATIONALE.md`
above, `--micro-width` and the fit switch's own `0.665` bound both sit above it) — 0.6 × 60px = 36px.
That looks like a contradiction until the ceiling is accounted for: **the ceiling reaches `maxCols`
long before the aspect gets anywhere near the limit that would demand a 36px finger.** At the default
ceiling of 2 the pass cannot fire at all (`data-sqr-short §3.4` in
[HOW-IT-WORKS.md §7.3](HOW-IT-WORKS.md)) — `unit(2) ≥ 0.6` needs `width ≥ 1.2 × probe`, i.e. a
viewport more than twice as wide as it is meant to be tall, which the ceiling has already capped to
2 columns by then. On a raised ceiling (§3.3's 900 × 350 worked example, `maxCols = 4`) the pass stops
at a **50px finger** (`unit(3) = 0.833`), nowhere near 36px, because `need` at that aspect
(`a = 0.389`) is already `0.756` — comfortably above the floor. The lowest finger reached anywhere in
the worked table (`short-screens-design.md` §3) is **46.67px**, at 560 × 300 — inside the touch band,
not below it. `0.6` is therefore a *limit that is never reached on a real screen*, stated honestly
rather than picked to look conservative: raising it to `0.75` (the researched floor exactly) would
change no worked answer in this release, only the ones a future, much wider ceiling might reach. If
you raise the ceiling past 4, re-check this bound before you rely on it.

### Why the published attribute needs its own floor, separate from the pass

The pass decides whether *its own* loop adds a column. The published `data-sqr-cols`, though, is
`cols × macroCols` — and `macroCols` is 2 for *every* landscape viewport 361–639px wide, regardless
of that viewport's own aspect, because that is what the probe rotation (§9) means, not a judgement
about whether two columns fit. Multiplying the two together naively — without asking `need` again at
the point of publishing — would offer a second column to a 361 × 360 window (a 30px finger, half the
floor) exactly as readily as to 637 × 320 (a 53px finger, comfortably past it), because both windows
rotate the same probe. So the publish step asks the same `need` question the pass asks, one more
time, before it ever converts a probe's rotation into a promise to the stylesheet.

---

## The philosophy, stated plainly

1. **Start from the hand, not the grid.** The atom is a researched touch target,
   so tappability is a property of the system rather than a review checklist.
2. **Author once, for the smallest real phone.** Scale the whole composition to
   the device instead of re-flowing it, so proportion and rhythm survive
   translation to any screen.
3. **Keep the units commensurate.** 360 = 6 × 60 and 720 = 12 × 60 means macro
   and micro never fight.
4. **Build affordances into the geometry.** The peek is spacing, not a widget.
5. **Share the ruler with the utility framework.** The unit is rem
   (`--micro-width × 0.0625rem` = 3.75rem) and the solver moves only the root
   font-size, so Tailwind's rem scales — spacing, type, radius — are finger
   units without translation (`p-3` = 0.75rem = 0.2u on every device). That is
   why Tailwind, whose scale is rem, replaced Bootstrap, whose scale had to be
   stripped out. Anything in px (`border-2`, `text-[11px]`, `top: 30px`) is off
   the ruler and is the first thing to convert.

If you change a constant, change it knowing which of these it serves. Overriding
`--macro-width` to target a different reference device is supported and
documented in [INTEGRATION.md](INTEGRATION.md) — but a canon that is not a whole
multiple of the micro unit gives up point 3, and a micro unit below ~48 gives up
point 1.
