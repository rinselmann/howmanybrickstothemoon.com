import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatExact,
  formatWords,
  formatMass,
  formatMoney,
  formatDuration,
  formatMm,
  formatKm,
} from '../public/js/format.js';

test('formatExact groups thousands and rounds', () => {
  assert.equal(formatExact(40041666667), '40,041,666,667');
  assert.equal(formatExact(1234.6), '1,235');
});

test('formatWords picks the right scale word', () => {
  assert.equal(formatWords(40041666667), '40.0 billion');
  assert.equal(formatWords(1.5e6), '1.50 million');
  assert.equal(formatWords(4.2e15), '4.20 quadrillion');
});

test('formatWords drops decimals once the number is large within its scale', () => {
  assert.equal(formatWords(4.2e11), '420 billion');
});

test('formatWords falls back to exact below one thousand', () => {
  assert.equal(formatWords(999), '999');
});

test('formatMass switches from kg to tonnes to worded tonnes', () => {
  assert.equal(formatMass(12.5), '12.5 kg');
  assert.equal(formatMass(5000), '5 tonnes');
  assert.match(formatMass(9.3e10), /tonnes$/);
  assert.match(formatMass(9.3e10), /million|billion/);
});

test('formatMoney words large sums and returns a placeholder for unknown', () => {
  assert.equal(formatMoney(null), 'unknown');
  assert.equal(formatMoney(4.0e9), '$4.00 billion');
  assert.equal(formatMoney(1200), '$1,200');
});

test('formatDuration reports only the leading unit', () => {
  assert.equal(formatDuration(30), '30 seconds');
  assert.equal(formatDuration(600), '10 minutes');
  assert.equal(formatDuration(7200), '2 hours');
  assert.equal(formatDuration(86400 * 3), '3 days');
  assert.match(formatDuration(40041666667), /years$/);
});

test('formatMm trims trailing zeroes', () => {
  assert.equal(formatMm(9.6), '9.6 mm');
  assert.equal(formatMm(33.6), '33.6 mm');
  assert.equal(formatMm(190), '190 mm');
});

test('formatKm rounds and groups', () => {
  assert.equal(formatKm(376291.6), '376,292 km');
});
