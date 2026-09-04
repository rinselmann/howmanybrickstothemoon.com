import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MM_PER_KM,
  stackPitchMm,
  gapAppliesTo,
  distanceKm,
  brickCount,
  totalMassKg,
  totalCostUsd,
  buildSeconds,
  computeStack,
} from '../public/js/calc.js';
import { BRICKS, DISTANCE_MODES, EARTH_RADIUS_KM, MOON_RADIUS_KM } from '../public/js/data.js';

const brickById = (id) => BRICKS.find((b) => b.id === id);
const modeById = (id) => DISTANCE_MODES.find((m) => m.id === id);

const lego = brickById('lego-brick-2x4');
const clay = brickById('clay-modular');
const jenga = brickById('jenga-block');

test('stacking flat lets LEGO studs nest, so the pitch is the bare height', () => {
  assert.equal(stackPitchMm(lego, 'height'), 9.6);
  assert.equal(stackPitchMm(lego, 'height', { includeGap: false }), 9.6);
});

test('stacking a LEGO brick sideways exposes the stud and adds its height', () => {
  assert.equal(stackPitchMm(lego, 'length'), 31.8 + 1.8);
  assert.equal(stackPitchMm(lego, 'width'), 15.8 + 1.8);
});

test('the gap toggle removes the stud allowance', () => {
  assert.equal(stackPitchMm(lego, 'length', { includeGap: false }), 31.8);
});

test('a mortar joint applies on every axis', () => {
  assert.equal(stackPitchMm(clay, 'height'), 57 + 9.5);
  assert.equal(stackPitchMm(clay, 'width'), 92 + 9.5);
  assert.equal(stackPitchMm(clay, 'length'), 194 + 9.5);
});

test('a brick with no gap is unaffected by the toggle', () => {
  for (const axis of ['length', 'width', 'height']) {
    assert.equal(stackPitchMm(jenga, axis), stackPitchMm(jenga, axis, { includeGap: false }));
  }
});

test('gapAppliesTo reports whether the toggle can change the answer', () => {
  assert.equal(gapAppliesTo(lego, 'height'), false);
  assert.equal(gapAppliesTo(lego, 'length'), true);
  assert.equal(gapAppliesTo(clay, 'height'), true);
  assert.equal(gapAppliesTo(jenga, 'height'), false);
});

test('an unknown axis is rejected rather than silently yielding NaN', () => {
  assert.throws(() => stackPitchMm(lego, 'depth'), /Unknown axis/);
});

test('ground-to-ground subtracts both radii; centre-to-centre does not', () => {
  assert.equal(distanceKm(modeById('mean-center')), 384400);
  assert.equal(
    distanceKm(modeById('mean-surface')),
    384400 - EARTH_RADIUS_KM - MOON_RADIUS_KM,
  );
});

test('perigee is closer than the mean, apogee further', () => {
  assert.ok(distanceKm(modeById('perigee-surface')) < distanceKm(modeById('mean-surface')));
  assert.ok(distanceKm(modeById('apogee-surface')) > distanceKm(modeById('mean-surface')));
});

test('brickCount rounds up to the brick that first reaches the target', () => {
  assert.equal(brickCount(1, 1e6), 1); // exactly one brick spans 1 km
  assert.equal(brickCount(1, 999999), 2); // a hair short, so a second is needed
  assert.equal(brickCount(384400, 9.6), Math.ceil((384400 * MM_PER_KM) / 9.6));
});

test('the canonical figure: ~40 billion 2x4 bricks, centre to centre', () => {
  const count = brickCount(384400, stackPitchMm(lego, 'height'));
  assert.equal(count, 40041666667);
});

test('a zero or negative pitch is rejected', () => {
  assert.throws(() => brickCount(100, 0), /Pitch must be positive/);
  assert.throws(() => brickCount(100, -5), /Pitch must be positive/);
});

test('mass and cost scale linearly with the count', () => {
  assert.equal(totalMassKg(1000, lego), 2.32);
  assert.equal(totalCostUsd(1000, lego), 100);
});

test('cost is null when the brick has no price', () => {
  assert.equal(totalCostUsd(10, { ...jenga, priceUsd: undefined }), null);
});

test('buildSeconds divides by the rate and rejects a non-positive one', () => {
  assert.equal(buildSeconds(1000, 10), 100);
  assert.throws(() => buildSeconds(1000, 0), /Rate must be positive/);
});

test('computeStack assembles a consistent result', () => {
  const result = computeStack({
    brick: lego,
    axis: 'height',
    includeGap: true,
    mode: modeById('mean-center'),
    bricksPerSecond: 1,
  });

  assert.equal(result.pitchMm, 9.6);
  assert.equal(result.distanceKm, 384400);
  assert.equal(result.count, 40041666667);
  assert.equal(result.massKg, (result.count * lego.massGrams) / 1000);
  assert.equal(result.seconds, result.count);
  assert.ok(result.count > 1e10);
});

test('milestoneCount uses the same pitch as the headline figure', () => {
  const result = computeStack({
    brick: lego,
    axis: 'height',
    includeGap: true,
    mode: modeById('mean-center'),
    bricksPerSecond: 1,
  });
  assert.equal(result.milestoneCount(8.849), brickCount(8.849, 9.6));
  assert.ok(result.milestoneCount(8.849) < result.count);
});

test('turning a brick on its end always needs fewer of it than lying flat', () => {
  for (const brick of BRICKS) {
    const flat = brickCount(384400, stackPitchMm(brick, 'height'));
    const onEnd = brickCount(384400, stackPitchMm(brick, 'length'));
    assert.ok(onEnd <= flat, `${brick.id}: expected on-end count to be no larger`);
  }
});
