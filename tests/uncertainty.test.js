import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  COVERAGE_FACTOR,
  LINEARITY_WARNING_THRESHOLD,
  combineRelative,
  expandedInterval,
  propagate,
  toRelative,
  volumeRelativeFromDimensions,
} from '../js/uncertainty.js';

const close = (actual, expected, tolerance = 1e-12) => {
  const relative = Math.abs((actual - expected) / (expected || 1));
  assert.ok(
    relative < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test('percent and absolute uncertainties normalise to the same relative value', () => {
  close(toRelative({ kind: 'percent', value: 5 }, 100), 0.05);
  close(toRelative({ kind: 'absolute', value: 5 }, 100), 0.05);
});

test('a blank uncertainty contributes nothing', () => {
  assert.equal(toRelative(null, 100), 0);
  assert.equal(toRelative(undefined, 100), 0);
  assert.equal(toRelative({ kind: 'percent', value: 0 }, 100), 0);
});

test('sign is ignored — an uncertainty is a magnitude', () => {
  close(toRelative({ kind: 'percent', value: -5 }, 100), 0.05);
  close(toRelative({ kind: 'absolute', value: -5 }, 100), 0.05);
});

test('relative uncertainties combine in quadrature, not by adding', () => {
  close(combineRelative([0.03, 0.04]), 0.05);
  close(combineRelative([0.05]), 0.05);
  assert.equal(combineRelative([]), 0);
});

test('three equal dimension uncertainties give sqrt(3) times one of them', () => {
  const combined = volumeRelativeFromDimensions({
    height: 0.02,
    width: 0.02,
    length: 0.02,
  });
  close(combined, 0.02 * Math.sqrt(3));
});

test('the typical laboratory preset produces a modest interval', () => {
  // +/-5% concentration, +/-2% on each dimension.
  const volume = volumeRelativeFromDimensions({
    height: 0.02,
    width: 0.02,
    length: 0.02,
  });
  const interval = propagate(3.0110704e8, { concentration: 0.05, volume });

  close(interval.relative, Math.sqrt(0.05 ** 2 + 3 * 0.02 ** 2));
  assert.ok(!interval.clamped);
  assert.ok(!interval.exceedsLinearity);
  assert.ok(interval.lower > 0);
});

test('molecular-weight uncertainty is one more independent factor', () => {
  const without = propagate(1e6, { concentration: 0.05, volume: 0.02 });
  const with_ = propagate(1e6, {
    concentration: 0.05,
    volume: 0.02,
    molecularWeight: 0.1,
  });
  assert.ok(with_.relative > without.relative);
  close(with_.relative, Math.sqrt(0.05 ** 2 + 0.02 ** 2 + 0.1 ** 2));
});

test('the lower bound is clamped at zero, never negative (ADR-0001)', () => {
  // The exact case from the plan: 60% concentration uncertainty on 3.01e8.
  const interval = expandedInterval(3.0110704e8, 0.6);

  assert.equal(interval.lower, 0);
  assert.ok(interval.clamped);
  close(interval.upper, 3.0110704e8 * 2.2);
});

test('clamping kicks in exactly where the linear approximation breaks', () => {
  const atBoundary = expandedInterval(1e6, 1 / COVERAGE_FACTOR);
  assert.equal(atBoundary.lower, 0);
  assert.ok(!atBoundary.clamped, 'exactly zero is reached, not crossed');

  const past = expandedInterval(1e6, 0.51);
  assert.ok(past.clamped);
  assert.equal(past.lower, 0);
});

test('the linearity warning fires above the threshold and not at it', () => {
  assert.ok(!expandedInterval(1e6, LINEARITY_WARNING_THRESHOLD).exceedsLinearity);
  assert.ok(
    expandedInterval(1e6, LINEARITY_WARNING_THRESHOLD + 0.001).exceedsLinearity,
  );
});

test('the warning threshold is exported, not buried as a literal', () => {
  assert.equal(LINEARITY_WARNING_THRESHOLD, 0.3);
  assert.equal(COVERAGE_FACTOR, 2);
});

test('no uncertainty means a zero-width interval on the estimate', () => {
  const interval = propagate(1e6, {});
  assert.equal(interval.relative, 0);
  assert.equal(interval.lower, 1e6);
  assert.equal(interval.upper, 1e6);
  assert.ok(!interval.clamped);
});

test('an absolute uncertainty on a zero quantity is rejected', () => {
  assert.throws(
    () => toRelative({ kind: 'absolute', value: 1 }, 0),
    RangeError,
  );
});
