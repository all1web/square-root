# Measuring for Square Root

This is the authoring workflow: how to take measurements from a design and turn
them into Square Root classes. The mechanism that makes this work is covered in
[HOW-IT-WORKS.md](HOW-IT-WORKS.md); the full class list is in
[UTILITIES.md](UTILITIES.md). This page is the part you do every day.

**One correction up front, because it trips people:** the canonical width is
**360, not 320**. `:root` declares `--macro-width: 360`. 320 is the
watch/small-device *boundary* — the width where the `2xs:` watch rules fire
(`max-width: 320px`) and below which the landscape rules refuse to apply
(`min-width: 361px`). You design at 360. You never design at 320; the solver
shrinks the 360 canon to fit a 320 screen for you.

---

## 1. Design on one artboard: 360 × 720

Set up a single artboard at **360 × 720 CSS px** — the canonical device — and
design in plain pixels, the way you normally would. No second artboard, no
breakpoint variants. This one frame is the whole design, for every phone.

## 2. Think in finger units: 60px

One finger unit is **60px** (`--micro-width: 60`, from touch-target research:
average fingertip 45–52px, thumb 72px — see
[DESIGN-RATIONALE.md](DESIGN-RATIONALE.md)). The canon is exactly
**6 units wide and 12 units tall**, so every measurement on the artboard lands
on a grid you can count on your fingers: a full-width element is 6, half the
screen is 3, a header is probably 1.

If your design tool has layout grids, set a 60px grid on the artboard and snap
to it while designing — then step 3 never produces awkward numbers.

## 3. Convert: measured px ÷ 60 = the class number

Measure an element on the artboard, divide by 60, and that quotient is the `N`
in the class name:

| Measured on the artboard | ÷ 60 | Class |
|---|---|---|
| 60px wide | 1 | `sqr-w-1` |
| 120px wide | 2 | `sqr-w-2` |
| 180px wide | 3 | `sqr-w-3` |
| 360px wide | 6 | `sqr-w-6` |
| 30px tall | ½ | `sqr-h-1/2` |

The generated scales run **1 through 8** for these property families:
`sqr-w-N`, `sqr-h-N`, `sqr-mt-N`, `sqr-mr-N`, `sqr-mx-N`, `sqr-px-N`,
`sqr-pt-N`, `sqr-pl-N`, and the negative offsets `-sqr-l-N` / `-sqr-r-N`.

Note what is **not** in that list: there is no `sqr-mb-N`, `sqr-ml-N`,
`sqr-my-N`, `sqr-py-N` or `sqr-pb-N` — those loops are commented out in
`square-root.scss`. In practice this means **space below a block is authored as
the next block's `sqr-mt-N`**, and all-around padding needs a custom rule (the
`calc()` formula in section 6). Check [UTILITIES.md](UTILITIES.md) before
assuming a class exists.

## 4. The framework does the runtime arithmetic

At runtime `square-root.js` solves the root font-size so the 360-wide canon
spans the real viewport exactly:

```
root font-size = 16px × (viewport width ÷ 360)
```

which means one finger unit renders at `60 × (viewport ÷ 360)` px. You never do
this arithmetic while authoring — it is what the framework is for. But it is
worth seeing once, honestly computed, so you trust the classes:

| Artboard px | Class | 320px phone | 360px phone | 390px phone | 430px phone |
|---|---|---|---|---|---|
| *(solved root font-size)* | | *14.22px* | *16px* | *17.33px* | *19.11px* |
| 30 | `sqr-h-1/2` | 26.67px | 30px | 32.5px | 35.83px |
| 60 | `sqr-w-1` | 53.33px | 60px | 65px | 71.67px |
| 120 | `sqr-w-2` | 106.67px | 120px | 130px | 143.33px |
| 180 | `sqr-w-3` | 160px | 180px | 195px | 215px |
| 240 | `sqr-w-4` | 213.33px | 240px | 260px | 286.67px |
| 300 | `sqr-w-5` | 266.67px | 300px | 325px | 358.33px |
| 360 | `sqr-w-6` | 320px | 360px | 390px | 430px |

Read the columns vertically: on every phone, `sqr-w-3` is exactly half the
screen and `sqr-w-6` is exactly all of it. The pixel values differ; the
*fractions* never do. That is the invariant you are buying.

> These columns assume the phone bracket — see the caution in section 9.

## 5. Worked example: a card

Say the artboard has a card: **300px wide, 120px tall, 30px from the top, 20px
inner padding**. Convert each measurement:

- **Width 300** → 300 ÷ 60 = 5 → `sqr-w-5`
- **Height 120** → 120 ÷ 60 = 2 → `sqr-h-2`
- **30 from the top** → 30 ÷ 60 = ½. There is no `sqr-mt-1/2` (the only
  fraction classes are listed in section 6), so either snap up to `sqr-mt-1`
  if the rhythm allows a full-unit gap, or keep the half unit with the
  `calc()` formula:

  ```css
  .card-offset {
    margin-top: calc(var(--micro-width) * 0.5 * 0.0625rem); /* 30 reference px */
  }
  ```

- **20 inner padding** → 20 ÷ 60 = 0.333… — not on the grid. **Snap it to the
  nearest half unit: 30px.** Since no all-around padding class exists at any
  value, write it with the same formula:

  ```css
  .card-pad {
    padding: calc(var(--micro-width) * 0.5 * 0.0625rem); /* 30 reference px */
  }
  ```

```html
<div class="sqr-w-5 sqr-h-2 card-offset card-pad">…</div>
```

**Snapping is a feature, not a compromise.** A 20px value that survives into
the build is a value that sits off the 60px grid forever, quietly breaking the
rhythm every other measurement obeys. Snapping keeps the whole composition on
the grid — and keeps anything interactive at or above the researched touch
floor. If a snapped value looks wrong on the artboard, adjust the *design* to
the grid, not the grid to the design.

## 6. Fractions: only these exist

The complete list of fractional classes in `square-root.scss`:

| Class | Applies | Actual value |
|---|---|---|
| `sqr-h-1/2` | `height` | ½ unit — 30 reference px |
| `sqr-mr-1/2` | `margin-right` | ½ unit — 30 reference px |
| `-sqr-ml-1/2` | negative `margin-left`, **`:first-child` only** | −½ unit |
| `sqr-pl-1-3/4` | `padding-left` | 1¾ units — 105 reference px |
| `xs:sqr-my-1/2` | vertical margins, `min-width: 321px` | **¼ unit (15px)** — the rule applies `0.25` despite the `1/2` name |
| `xs:sqr-mx-1/4` | horizontal margins, `min-width: 321px` | ¼ unit — 15 reference px |

That is all of them. **Arbitrary fractions do not exist** — there is no
`sqr-w-1/2`, no `sqr-mt-1/3`, no plugin syntax to generate one. A measurement
that lands on a fraction must either snap to a class that exists or be written
directly with the formula every utility uses:

```css
calc(var(--micro-width) * N * 0.0625rem)
```

`N` is the value in finger units (0.5 for a half, 1.75 for one-and-three-
quarters). Any rule written this way scales in lockstep with the framework,
because it is the same rem arithmetic the generated classes use.

## 7. What NOT to size in finger units

Square Root units are for **layout blocks, touch targets and major spacing**.
They are the wrong tool for:

- **Typography.** Type has its own scale and its own legibility floor. Set it
  in `rem` (it still scales with the solve, which is what you want) — just not
  in 60px finger multiples. A 60px-tall letter is a headline, not a unit.
- **Hairlines and borders.** A 1px border should stay 1px. Written in finger
  units — or any rem value — it scales with the viewport, which is exactly what
  a hairline must not do. Use `px`.
- **Sub-pixel and micro gaps.** 2px of optical nudge between an icon and its
  label is not layout; forcing it onto the grid rounds it to 0 or 15px, both
  wrong. Use `px` and let it stay fixed.

Over-applying the unit is the most common misuse of the framework. If a
measurement is not a block, a target or a major gap, it probably is not a
finger-unit measurement.

## 8. Touch targets come free — do not undo that

Every generated class is a multiple of 60, and 60 is the smallest block touch
research shows a finger reliably hits. So **anything sized at 1 unit or more is
tappable by construction** — tappability is structural, not a review checklist.

The corollary: **fractions are for spacing, never for shrinking a control.** A
`sqr-h-1/2` gap between rows is on purpose; a 30px-tall button would put an
interactive element below the researched floor, which is precisely the mistake
the unit exists to make impossible.

## 9. Checking your work

Load the page on a phone (or DevTools responsive mode), open the console, and
verify the three links in the chain. Note the solver measures on a
`setTimeout(…, 500)` — give it a second to settle after load or resize.

**1. The root solved to the right value.** Expect `16 × (viewport ÷ 360)`:

```js
parseFloat(getComputedStyle(document.documentElement).fontSize)
// 390px viewport → 17.333…  (16 × 390 / 360)
```

The script also logs its bucket and result on every solve:
`Screen: sm` then `New Simulated Ratio: …`.

**2. The canon spans the viewport.** The `.sqr-macro-rem` probe *is* the
canonical device in rem; after the solve it must measure exactly the screen:

```js
document.querySelector('.sqr-macro-rem').offsetWidth === window.innerWidth
// true
```

**3. A block landed where the artboard said.** Multiply the artboard
measurement by the same ratio:

```js
document.querySelector('.my-card').offsetWidth
// sqr-w-5 = 300 artboard px → 300 × 390 / 360 = 325 on a 390px viewport
```

If (1) is right but (3) is wrong, the element is picking up a non-rem size from
somewhere else — a `px` width, a constraining parent — and has left the system.

## 10. Caution: this arithmetic is a phone-range rule

Everything above assumes the `sm` bracket — viewports from 320 to 640px, where
`cols = 1` and the canon maps 1:1 onto the screen. Outside it the solver
deliberately changes the deal:

- **From 641px up**, the ratio is divided by a `cols` factor (**1.2** at `md`,
  **1.61** at `lg` — and note the division is currently applied *twice*; see
  [Known quirks in the README](../README.md#known-quirks)). The design is
  solved *smaller* than the viewport on purpose, so the next column peeks in
  at the screen edge — the built-in cue that the layout scrolls sideways.
- **At 1024px and up**, the solver floors to whole 360-wide columns and
  re-solves so they tile the width exactly.

So "1 unit = viewport ÷ 6" is a **phone**-range identity, not a universal one.
On a tablet your `sqr-w-6` card is intentionally narrower than the screen. The
full bracket-by-bracket behaviour, with worked ratio tables, is in
[HOW-IT-WORKS.md](HOW-IT-WORKS.md).
