/**
 * Every number the site shows is derived here.
 *
 * These functions are pure: no DOM, no imports beyond static data, no clock.
 * That is what lets `node --test` exercise them directly.
 */

import { EARTH_RADIUS_KM, MOON_RADIUS_KM } from './data.js';

export const MM_PER_KM = 1e6;

/**
 * The distance a single brick actually buys you, which is not the same as its
 * dimension. A brick contributes its own extent along the stacking axis plus
 * whatever gap the stacking method forces between neighbours.
 *
 * The gap is axis-dependent on purpose. LEGO studs vanish into the tube below
 * when you stack flat, so a 9.6 mm brick advances exactly 9.6 mm; turn it on
 * its side and the same stud now adds 1.8 mm of dead air every single time.
 */
export function stackPitchMm(brick, axis, { includeGap = true } = {}) {
  const base = brick.dims[axis];
  if (base === undefined) throw new Error(`Unknown axis: ${axis}`);
  if (!includeGap || !brick.gap || !brick.gap.axes.includes(axis)) return base;
  return base + brick.gap.amountMm;
}

/** True when the gap toggle would actually change the answer for this axis. */
export function gapAppliesTo(brick, axis) {
  return Boolean(brick.gap && brick.gap.axes.includes(axis));
}

/** Resolve a DISTANCE_MODES entry into the gap the bricks have to span. */
export function distanceKm(mode) {
  if (!mode.surface) return mode.centerToCenterKm;
  return mode.centerToCenterKm - EARTH_RADIUS_KM - MOON_RADIUS_KM;
}

/**
 * You cannot lay a fractional brick, so this rounds up: the count is the first
 * brick that reaches or passes the target.
 */
export function brickCount(km, pitchMm) {
  if (!(pitchMm > 0)) throw new Error('Pitch must be positive');
  return Math.ceil((km * MM_PER_KM) / pitchMm);
}

export function totalMassKg(count, brick) {
  return (count * brick.massGrams) / 1000;
}

export function totalCostUsd(count, brick) {
  return brick.priceUsd === undefined ? null : count * brick.priceUsd;
}

/** Seconds of continuous, uninterrupted laying at the given rate. */
export function buildSeconds(count, bricksPerSecond) {
  if (!(bricksPerSecond > 0)) throw new Error('Rate must be positive');
  return count / bricksPerSecond;
}

/**
 * One call that produces everything the UI renders, so the view layer never
 * has to remember the order these depend on each other in.
 */
export function computeStack({ brick, axis, includeGap, mode, bricksPerSecond }) {
  const pitchMm = stackPitchMm(brick, axis, { includeGap });
  const km = distanceKm(mode);
  const count = brickCount(km, pitchMm);
  return {
    pitchMm,
    distanceKm: km,
    count,
    massKg: totalMassKg(count, brick),
    costUsd: totalCostUsd(count, brick),
    seconds: buildSeconds(count, bricksPerSecond),
    /** How many of this brick it takes to reach each waypoint on the way up. */
    milestoneCount: (altitudeKm) => brickCount(altitudeKm, pitchMm),
  };
}
