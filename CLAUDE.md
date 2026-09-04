# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm test                              # full suite (Node built-in runner)
node --test test/calc.test.js         # one file
node --test --test-name-pattern="stud"  # one test by name
npm run serve                         # http://localhost:8080
```

There is no build step, no bundler, and no dependencies — `package.json` exists only to
hold those two scripts and `"type": "module"`. Do not add a toolchain without being asked.

The site uses native ES modules, so `file://` will not work; it must be served over HTTP.

## Architecture

A strict one-way dependency chain, which is what keeps the logic testable in bare Node:

```
data.js  →  calc.js  →  app.js  →  viz.js
                ↑                    ↑
            format.js ───────────────┘
```

- **`public/js/data.js`** — the brick catalogue and all constants. No behaviour.
- **`js/calc.js`** — every number the site displays. Pure: no DOM, no clock, no I/O.
- **`js/format.js`** — number-to-string only. Separate from `calc.js` because these are
  legibility decisions, not arithmetic.
- **`js/viz.js`** — builds SVG nodes for the two visualisations. Never sets a colour.
- **`js/app.js`** — the only module that touches the document or holds state.

`computeStack()` in `calc.js` is the single entry point the UI calls; it returns everything
the view needs in one object, including a `milestoneCount` closure so the ladder is
guaranteed to use the same pitch as the headline number.

### Units

Millimetres for bricks, kilometres for astronomy, grams for mass. `MM_PER_KM` bridges the
first two. Any new field should follow this and say so in a comment — mixing them produces
plausible wrong answers rather than errors.

### Stacking gaps are per-axis

The core domain rule, and the thing most likely to be got wrong. A brick's `gap` names
both an amount **and** which axes it applies to:

- A LEGO stud nests into the tube above it, so stacking flat (`height`) adds nothing.
  Turned on its side, the stud has nowhere to go — hence `axes: ['length', 'width']`.
- Mortar goes on whichever face is being bedded, so masonry lists all three axes.

`stackPitchMm()` is the only place that resolves this, and `gapAppliesTo()` exists so the
UI can dim the toggle when it would not change the answer. When adding a brick, decide
deliberately which axes its gap belongs to.

### Colours live in CSS, not in viz.js

`viz.js` assigns semantic class names (`face-top`, `stud-side`, `rung-goal`, …) and every
fill and stroke is defined in `css/styles.css` alongside the rest of the theme. Keep it
that way; do not introduce inline `fill`/`stroke` attributes.

The brick diagram is a hand-rolled isometric projection — camera on the `(+1,+1,+1)`
diagonal, so exactly three faces are visible and painter's-algorithm ordering is just
sorting by the coordinate sum. A circle in the XY plane projects to an *axis-aligned*
ellipse under this transform, which is why studs need no rotation. Strokes use
`vector-effect="non-scaling-stroke"` because the `viewBox` is fitted to the brick's real
millimetre dimensions and therefore varies wildly between parts.

## Testing

`test/viz.test.js` stands up a ~30-line stub of `createElementNS`/`appendChild` rather than
pulling in jsdom or a headless browser. This is deliberate and worth preserving: it catches
the failures that actually occur in this renderer — `NaN` coordinates, empty `viewBox`es,
wrong element counts, stale nodes left behind between renders — for none of the cost.

`test/data.test.js` guards the catalogue, which is hand-edited far more often than the code
is. Its milestone spacing check (rungs at least 0.2 decades apart) enforces a *rendering*
constraint from the data layer: closer rungs overlap illegibly on the log axis.

`app.js` has no direct tests. It is deliberately kept thin enough that it holds no logic
worth testing — if something there starts needing a test, move it into `calc.js` instead.

## Data accuracy

Dimensions and masses are real published figures; prices are rough single-unit estimates
present only for the novelty total. The `<footer>` in `index.html` states the assumptions
to the reader — if you change a constant that it mentions, update it there too.
