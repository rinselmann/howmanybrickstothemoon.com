# How Many Bricks to the Moon?

A static site that answers a specific silly question: pick a brick, decide which way up it
goes, and find out how many of them you would need to stack from the Earth to the Moon.

Because orientation is a choice, the answer moves a lot. A LEGO 2x4 stacked flat gains
9.6 mm per brick — about 40 billion of them. Stand the same brick on its end and it gains
33.6 mm, cutting the count to under 12 billion.

## Running it

No build step and no dependencies. The site is plain ES modules, so it needs to be served
over HTTP rather than opened from the filesystem:

```sh
npm run serve      # http://localhost:8080
```

## Tests

```sh
npm test
```

Uses the Node built-in test runner. The calculation, formatting and rendering modules are
all covered; see `CLAUDE.md` for how the rendering tests avoid needing a browser.

## The one interesting rule

Stacking gaps are per-axis, not per-brick. A LEGO stud nests into the tube of the brick
above it, so stacking flat adds nothing at all — but roll that brick onto its side and the
stud has nowhere to go, adding 1.8 mm of dead air every single time. Mortar behaves the
other way round: it goes on whichever face you are bedding, so it applies in every
orientation. This is modelled by `gap.axes` in `js/data.js`.
