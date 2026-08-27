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

## The philosophy, stated plainly

1. **Start from the hand, not the grid.** The atom is a researched touch target,
   so tappability is a property of the system rather than a review checklist.
2. **Author once, for the smallest real phone.** Scale the whole composition to
   the device instead of re-flowing it, so proportion and rhythm survive
   translation to any screen.
3. **Keep the units commensurate.** 360 = 6 × 60 and 720 = 12 × 60 means macro
   and micro never fight.
4. **Build affordances into the geometry.** The peek is spacing, not a widget.

If you change a constant, change it knowing which of these it serves. Overriding
`--macro-width` to target a different reference device is supported and
documented in [integration.md](integration.md) — but a canon that is not a whole
multiple of the micro unit gives up point 3, and a micro unit below ~48 gives up
point 1.
