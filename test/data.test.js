/**
 * Integrity checks on the catalogue. These exist because the data is edited by
 * hand far more often than the code is, and a typo in a dimension produces a
 * plausible-looking wrong answer rather than a crash.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AXES,
  BRICKS,
  ORIENTATIONS,
  DISTANCE_MODES,
  MILESTONES,
  BUILD_RATES,
} from '../js/data.js';

const unique = (values) => new Set(values).size === values.length;

test('every id is unique within its list', () => {
  for (const [label, list] of Object.entries({
    BRICKS,
    ORIENTATIONS,
    DISTANCE_MODES,
    MILESTONES,
    BUILD_RATES,
  })) {
    assert.ok(unique(list.map((item) => item.id)), `${label} has a duplicate id`);
  }
});

test('every brick has three positive, finite dimensions', () => {
  for (const brick of BRICKS) {
    for (const axis of AXES) {
      const value = brick.dims[axis];
      assert.ok(
        Number.isFinite(value) && value > 0,
        `${brick.id} has a bad ${axis}: ${value}`,
      );
    }
  }
});

test('every brick has a positive mass and a name', () => {
  for (const brick of BRICKS) {
    assert.ok(brick.massGrams > 0, `${brick.id} has no mass`);
    assert.ok(brick.name && brick.category, `${brick.id} is missing name or category`);
  }
});

test('gap definitions name only real axes and carry a label', () => {
  for (const brick of BRICKS) {
    if (!brick.gap) continue;
    assert.ok(brick.gap.amountMm > 0, `${brick.id} has a non-positive gap`);
    assert.ok(brick.gap.label, `${brick.id} gap has no label`);
    assert.ok(brick.gap.axes.length > 0, `${brick.id} gap applies to nothing`);
    for (const axis of brick.gap.axes) {
      assert.ok(AXES.includes(axis), `${brick.id} gap names unknown axis ${axis}`);
    }
  }
});

test('a studded brick carries every hint the renderer needs', () => {
  for (const brick of BRICKS) {
    if (!brick.studPitch) continue;
    assert.ok(brick.studRadius > 0, `${brick.id} has studPitch but no studRadius`);
    assert.ok(brick.studHeight > 0, `${brick.id} has studPitch but no studHeight`);
    assert.ok(
      brick.studRadius * 2 < brick.studPitch,
      `${brick.id} studs would overlap each other`,
    );
  }
});

test('a brick is at least as long as it is wide', () => {
  for (const brick of BRICKS) {
    assert.ok(
      brick.dims.length >= brick.dims.width,
      `${brick.id}: length and width look swapped`,
    );
  }
});

test('orientations cover each axis exactly once', () => {
  assert.deepEqual(ORIENTATIONS.map((o) => o.axis).sort(), [...AXES].sort());
});

test('distance modes are positive and larger than both radii combined', () => {
  for (const mode of DISTANCE_MODES) {
    assert.ok(mode.centerToCenterKm > 100000, `${mode.id} looks too small`);
    assert.equal(typeof mode.surface, 'boolean', `${mode.id} must state surface`);
  }
});

test('milestones are positive and strictly ascending', () => {
  for (const milestone of MILESTONES) {
    assert.ok(milestone.altitudeKm > 0, `${milestone.id} has a bad altitude`);
  }
  const altitudes = MILESTONES.map((m) => m.altitudeKm);
  assert.deepEqual(altitudes, [...altitudes].sort((a, b) => a - b));
});

test('milestones stay below the Moon and are spread out enough to read', () => {
  const closest = Math.min(...DISTANCE_MODES.map((m) => m.centerToCenterKm));
  for (const milestone of MILESTONES) {
    assert.ok(milestone.altitudeKm < closest, `${milestone.id} is beyond the Moon`);
  }
  // The ladder is a log axis; rungs nearer than ~0.2 decades overlap visually.
  for (let i = 1; i < MILESTONES.length; i += 1) {
    const gap =
      Math.log10(MILESTONES[i].altitudeKm) - Math.log10(MILESTONES[i - 1].altitudeKm);
    assert.ok(
      gap >= 0.2,
      `${MILESTONES[i].id} sits too close to ${MILESTONES[i - 1].id} on the log axis`,
    );
  }
});

test('build rates are positive', () => {
  for (const rate of BUILD_RATES) {
    assert.ok(rate.bricksPerSecond > 0, `${rate.id} has a bad rate`);
  }
});
