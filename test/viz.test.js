/**
 * viz.js talks to the DOM, so these tests stand up a deliberately tiny stub of
 * it: just enough of createElementNS/appendChild/setAttribute to let the
 * renderers run. That is cheap and it catches the failures that actually
 * happen here — NaN coordinates, malformed viewBoxes, wrong element counts —
 * without pulling in a full headless browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { BRICKS, MILESTONES, AXES } from '../js/data.js';
import { stackPitchMm, brickCount } from '../js/calc.js';

/* ---- minimal DOM stub ---- */

class StubNode {
  constructor(name) {
    this.nodeName = name;
    this.attributes = {};
    this.childNodes = [];
    this.textContent = '';
  }

  setAttribute(key, value) {
    this.attributes[key] = value;
  }

  getAttribute(key) {
    return this.attributes[key] ?? null;
  }

  appendChild(child) {
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    this.childNodes = this.childNodes.filter((node) => node !== child);
    return child;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  /** Depth-first walk, used by the assertions below. */
  *descendants() {
    for (const child of this.childNodes) {
      yield child;
      yield* child.descendants();
    }
  }
}

globalThis.document = {
  createElementNS: (_ns, name) => new StubNode(name),
};

// Imported after the stub exists, because viz.js resolves `document` at call
// time but the import itself must not blow up in a bare Node process.
const { renderBrickDiagram, renderLadder } = await import('../js/viz.js');

const svg = () => new StubNode('svg');
const numeric = /^-?\d+(\.\d+)?$/;

/** Every coordinate-ish attribute anywhere in the tree must be a real number. */
function assertNoBadNumbers(root, label) {
  const coordKeys = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'width', 'height'];
  for (const node of root.descendants()) {
    for (const key of coordKeys) {
      const value = node.attributes[key];
      if (value === undefined) continue;
      assert.match(String(value), numeric, `${label}: ${node.nodeName}.${key} = ${value}`);
    }
    if (node.attributes.points) {
      for (const pair of String(node.attributes.points).split(' ')) {
        const [x, y] = pair.split(',');
        assert.match(x, numeric, `${label}: bad polygon x ${x}`);
        assert.match(y, numeric, `${label}: bad polygon y ${y}`);
      }
    }
  }
}

/* ---- brick diagram ---- */

test('every brick renders in every orientation without producing NaN', () => {
  for (const brick of BRICKS) {
    for (const axis of AXES) {
      const target = svg();
      const pitch = stackPitchMm(brick, axis);
      renderBrickDiagram(target, brick, axis, pitch);
      assertNoBadNumbers(target, `${brick.id}/${axis}`);

      const viewBox = target.getAttribute('viewBox');
      assert.ok(viewBox, `${brick.id}/${axis}: no viewBox`);
      const parts = viewBox.split(' ').map(Number);
      assert.equal(parts.length, 4);
      assert.ok(parts.every(Number.isFinite), `${brick.id}/${axis}: viewBox ${viewBox}`);
      assert.ok(parts[2] > 0 && parts[3] > 0, `${brick.id}/${axis}: empty viewBox`);
    }
  }
});

test('the diagram draws three bricks, so three visible faces each', () => {
  const brick = BRICKS.find((b) => b.id === 'jenga-block'); // no studs to confuse the count
  const target = svg();
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  const faces = [...target.descendants()].filter((n) =>
    String(n.attributes.class ?? '').includes('face '),
  );
  assert.equal(faces.length, 9);
});

test('a 2x4 stud grid produces eight studs per brick', () => {
  const brick = BRICKS.find((b) => b.id === 'lego-brick-2x4');
  const target = svg();
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  const studTops = [...target.descendants()].filter(
    (n) => n.attributes.class === 'stud-top',
  );
  assert.equal(studTops.length, 8 * 3);
});

test('a 1x1 brick produces exactly one stud per brick', () => {
  const brick = BRICKS.find((b) => b.id === 'lego-brick-1x1');
  const target = svg();
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  const studTops = [...target.descendants()].filter(
    (n) => n.attributes.class === 'stud-top',
  );
  assert.equal(studTops.length, 3);
});

test('a masonry brick renders no studs at all', () => {
  const brick = BRICKS.find((b) => b.id === 'clay-modular');
  const target = svg();
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  const studs = [...target.descendants()].filter((n) =>
    String(n.attributes.class ?? '').startsWith('stud'),
  );
  assert.equal(studs.length, 0);
});

test('re-rendering replaces the previous drawing rather than stacking onto it', () => {
  const target = svg();
  const brick = BRICKS[0];
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  const first = [...target.descendants()].length;
  renderBrickDiagram(target, brick, 'height', stackPitchMm(brick, 'height'));
  assert.equal([...target.descendants()].length, first);
});

test('a larger pitch spreads the stack further, widening the viewBox', () => {
  const brick = BRICKS.find((b) => b.id === 'lego-brick-2x4');
  const tight = svg();
  const loose = svg();
  renderBrickDiagram(tight, brick, 'height', 9.6);
  renderBrickDiagram(loose, brick, 'height', 40);
  const heightOf = (node) => Number(node.getAttribute('viewBox').split(' ')[3]);
  assert.ok(heightOf(loose) > heightOf(tight));
});

/* ---- ladder ---- */

test('the ladder draws a rung per milestone plus the Moon', () => {
  const target = svg();
  const pitch = 9.6;
  renderLadder(target, {
    milestones: MILESTONES,
    moonKm: 376291.6,
    countFor: (km) => brickCount(km, pitch),
    formatCount: (n) => `${n} bricks`,
  });
  assertNoBadNumbers(target, 'ladder');

  const rungs = [...target.descendants()].filter((n) =>
    String(n.attributes.class ?? '').startsWith('rung'),
  );
  const groups = rungs.filter((n) => n.nodeName === 'g');
  assert.equal(groups.length, MILESTONES.length + 1);
  assert.equal(groups.filter((n) => n.attributes.class.includes('rung-goal')).length, 1);
});

test('rungs ascend the screen as altitude increases', () => {
  const target = svg();
  renderLadder(target, {
    milestones: MILESTONES,
    moonKm: 376291.6,
    countFor: () => 1,
    formatCount: String,
  });
  const ticks = [...target.descendants()]
    .filter((n) => n.attributes.class === 'rung-tick')
    .map((n) => Number(n.attributes.y1));
  // Higher altitude means a smaller y, so the list must be strictly decreasing.
  for (let i = 1; i < ticks.length; i += 1) {
    assert.ok(ticks[i] < ticks[i - 1], `rung ${i} did not rise above the previous one`);
  }
});

test('the Moon rung sits at the very top of the axis', () => {
  const target = svg();
  renderLadder(target, {
    milestones: MILESTONES,
    moonKm: 376291.6,
    countFor: () => 1,
    formatCount: String,
  });
  const ticks = [...target.descendants()].filter((n) => n.attributes.class === 'rung-tick');
  const moon = ticks.at(-1);
  assert.equal(Number(moon.attributes.y1), 40); // LADDER.top
});

test('the ladder is cleared between renders', () => {
  const target = svg();
  const args = {
    milestones: MILESTONES,
    moonKm: 376291.6,
    countFor: () => 1,
    formatCount: String,
  };
  renderLadder(target, args);
  const first = [...target.descendants()].length;
  renderLadder(target, args);
  assert.equal([...target.descendants()].length, first);
});
