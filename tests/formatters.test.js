import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  countWithUncertainty,
  exponentOf,
  percent,
  primaryCount,
  readableCount,
  roundToUncertainty,
  scientific,
  toSignificantFigures,
} from '../js/formatters.js';

test('significant figures round rather than truncate', () => {
  assert.equal(toSignificantFigures(3.0110704e8, 3), 3.01e8);
  assert.equal(toSignificantFigures(1.2345, 3), 1.23);
  assert.equal(toSignificantFigures(1.2355, 3), 1.24);
  assert.equal(toSignificantFigures(0, 3), 0);
});

test('exponents are the n in m x 10^n', () => {
  assert.equal(exponentOf(1.2e12), 12);
  assert.equal(exponentOf(5e-8), -8);
  assert.equal(exponentOf(1), 0);
  assert.equal(exponentOf(0), 0);
});

test('scientific notation uses real superscripts', () => {
  assert.equal(scientific(1.2e12), '1.20 × 10¹²');
  assert.equal(scientific(3.0110704e8), '3.01 × 10⁸');
  assert.equal(scientific(5e-8), '5.00 × 10⁻⁸');
  assert.equal(scientific(6.02214076e23), '6.02 × 10²³');
});

test('a mantissa that rounds up to ten is renormalised', () => {
  // 9.999e5 -> mantissa 10.00, which is not normalised; it must become 1.00e6.
  assert.equal(scientific(9.999e5), '1.00 × 10⁶');
  assert.equal(scientific(9.9999e12), '1.00 × 10¹³');
});

test('mantissa rounding follows the actual double, not the decimal literal', () => {
  // The nearest double to 9.995 is 9.99499999999999957..., genuinely below the
  // midpoint, so this rounds down. Not a bug — documenting it so nobody
  // "fixes" the renormalisation branch above by chasing this case.
  assert.equal(scientific(9.995e5), '9.99 × 10⁵');
});

test('the primary result is plain inside the band and scientific outside it', () => {
  assert.equal(primaryCount(45000), '45,000');
  assert.equal(primaryCount(1234), '1,230'); // 3 sf, then grouped
  assert.equal(primaryCount(3.0110704e8), '3.01 × 10⁸');
  assert.equal(primaryCount(5e-8), '5.00 × 10⁻⁸');
});

test('the readable line stops where the words stop informing', () => {
  assert.equal(readableCount(6.02e14), '602 trillion (short scale)');
  assert.equal(readableCount(6.02e17), '602 quadrillion (short scale)');
  assert.equal(readableCount(1.2e12), '1.2 trillion (short scale)');
  assert.equal(readableCount(5e6), '5 million (short scale)');
});

test('no readable line above 10^18 — "602 sextillion" helps nobody', () => {
  assert.equal(readableCount(6.02e20), null);
  assert.equal(readableCount(6.02214076e23), null);
  assert.equal(readableCount(1e18), null);
});

test('no readable line below 10^6, where it would only repeat the primary', () => {
  assert.equal(readableCount(45000), null);
  assert.equal(readableCount(0.03), null);
});

test('every readable line is marked short scale', () => {
  // "billion" is 10^9 on the short scale and 10^12 on the long scale still
  // used across much of Europe. An unmarked line is ambiguous, not merely
  // informal.
  for (const value of [5e6, 5e9, 5e12, 5e15, 9.9e17]) {
    assert.match(readableCount(value), /\(short scale\)$/);
  }
});

test('uncertainty decides precision: the value rounds to the uncertainty', () => {
  const rounded = roundToUncertainty(3.0110704e8, 1.5e7);
  assert.equal(rounded.value, 3.01e8);
  assert.equal(rounded.uncertainty, 1.5e7);
  assert.equal(rounded.place, 6);
});

test('value and uncertainty share one exponent so mantissas compare directly', () => {
  assert.equal(countWithUncertainty(3.0110704e8, 1.5e7), '(3.01 ± 0.15) × 10⁸');
});

test('with no uncertainty the display falls back to the 3 sf default', () => {
  assert.equal(countWithUncertainty(3.0110704e8, 0), '3.01 × 10⁸');
});

test('probabilities keep a useful number of decimals as they shrink', () => {
  assert.equal(percent(0.9704455335), '97.0%');
  assert.equal(percent(0.029113366), '2.9%');
  assert.equal(percent(0.000441), '0.04%');
  assert.equal(percent(0), '0%');
  assert.equal(percent(1e-6), '<0.01%');
});
