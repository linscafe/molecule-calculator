// Enforces one rule: values are held as full-precision doubles everywhere, and
// rounded only at the moment they are shown to a person.
//
// The structural tests below are the load-bearing ones. The value tests prove
// the rule holds today; the structural tests stop it being broken tomorrow by
// someone who reaches for toFixed in the wrong file.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  litresFromMetres,
  toGramsPerLitre,
  toGramsPerMole,
  toLitres,
  toMetres,
  toMolPerLitre,
} from '../js/conversions.js';
import {
  AVOGADRO,
  calculateFromMass,
  calculateFromMolar,
  occupancyProbabilities,
  poissonProbability,
} from '../js/calculations.js';
import { expandedInterval, propagate, toRelative } from '../js/uncertainty.js';
import {
  primaryCount,
  roundToUncertainty,
  scientific,
  toSignificantFigures,
} from '../js/formatters.js';
import { BIOMARKERS } from '../js/biomarkers.js';

const source = (name) =>
  readFileSync(new URL(`../js/${name}`, import.meta.url), 'utf8');

// Rounding *primitives*. Math.max/Math.min are clamping, not rounding, and are
// deliberate elsewhere (the zero-clamp of ADR-0001, the Poisson tail).
const ROUNDING = /\btoFixed\b|\btoPrecision\b|Math\.round\b|Math\.trunc\b|toLocaleString\b|Intl\.NumberFormat\b/;

test('the calculation modules contain no rounding at all', () => {
  for (const name of [
    'conversions.js',
    'calculations.js',
    'uncertainty.js',
    'validation.js',
    'biomarkers.js',
  ]) {
    const offending = source(name)
      .split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => ROUNDING.test(line));
    assert.deepEqual(
      offending,
      [],
      `${name} must not round; rounding belongs in formatters.js`,
    );
  }
});

test('formatters.js is the only file allowed to round', () => {
  assert.ok(ROUNDING.test(source('formatters.js')), 'formatters.js should round');
});

test('app.js never rounds directly — only via formatters, only when rendering', () => {
  const lines = source('app.js').split('\n');

  const direct = lines
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => ROUNDING.test(line));
  assert.deepEqual(direct, [], 'app.js must not use rounding primitives');

  // Every use of the rounding helper must sit inside a render function, so a
  // rounded value can never reach a calculation.
  let current = null;
  const callers = new Set();
  for (const line of lines) {
    const declaration = line.match(/^(?:async )?function (\w+)/);
    if (declaration) current = declaration[1];
    if (/roundToUncertainty\(/.test(line) && current) callers.add(current);
  }
  for (const caller of callers) {
    assert.match(
      caller,
      /^render/,
      `roundToUncertainty called from ${caller}(), which is not a render function`,
    );
  }
  assert.ok(callers.size > 0, 'expected the helper to actually be used');
});

test('conversion is exact multiplication, bit-identical to doing it by hand', () => {
  assert.equal(toMetres(100, 'um'), 100 * 1e-6);
  assert.equal(toLitres(1, 'pL'), 1 * 1e-12);
  assert.equal(toMolPerLitre(10, 'nM'), 10 * 1e-9);
  assert.equal(toGramsPerLitre(150, 'ng/mL'), 150 * 1e-6);
  assert.equal(toGramsPerMole(66.437, 'kDa'), 66.437 * 1e3);
});

test('the whole chain is bit-identical to the same arithmetic done inline', () => {
  const h = toMetres(100, 'um');
  const w = toMetres(50, 'um');
  const l = toMetres(10, 'mm');
  const result = calculateFromMolar({
    molPerLitre: toMolPerLitre(10, 'nM'),
    volumeLitres: litresFromMetres(h, w, l),
  });

  const inline = 10 * 1e-9 * (h * w * l * 1e3) * AVOGADRO;
  assert.equal(result.moleculeCount, inline);

  // And it is not a rounded 3-significant-figure value pretending to be exact.
  assert.notEqual(result.moleculeCount, 3.01e8);
  assert.ok(String(result.moleculeCount).length > 6);
});

test('the mass path keeps every digit the division produces', () => {
  const result = calculateFromMass({
    gramsPerLitre: toGramsPerLitre(150, 'ng/mL'),
    volumeLitres: 1,
    gramsPerMole: 150000,
  });
  assert.equal(result.amountOfSubstanceMol, (150 * 1e-6 * 1) / 150000);
  // 1 ulp below 1e-9 — inherent to IEEE-754, and deliberately not tidied away.
  assert.notEqual(result.amountOfSubstanceMol, 1e-9);
  assert.ok(Math.abs(result.amountOfSubstanceMol - 1e-9) < 1e-24);
});

test('stored values always carry more precision than what is displayed', () => {
  const result = calculateFromMolar({
    molPerLitre: toMolPerLitre(10, 'nM'),
    volumeLitres: 5e-8,
  });
  const shown = toSignificantFigures(result.moleculeCount, 3);
  assert.notEqual(result.moleculeCount, shown);
  assert.ok(
    result.moleculeCount.toString().length > shown.toString().length,
    'the stored double should be longer than its rendering',
  );
});

test('uncertainty propagation never rounds', () => {
  const relative = toRelative({ kind: 'percent', value: 5 }, 100);
  assert.equal(relative, 5 / 100);

  const interval = propagate(3.0110704e8, { concentration: 0.05, volume: 0.02 });
  assert.equal(interval.relative, Math.sqrt(0.05 ** 2 + 0.02 ** 2));
  assert.equal(interval.standard, 3.0110704e8 * interval.relative);
  assert.equal(interval.upper, 3.0110704e8 + 2 * interval.standard);
});

test('the zero-clamp is the only value the interval ever alters', () => {
  const clamped = expandedInterval(1e6, 0.9);
  assert.equal(clamped.lower, 0);
  // The unclamped arithmetic is still exact underneath.
  assert.equal(clamped.upper, 1e6 + 2 * (1e6 * 0.9));
  assert.equal(clamped.standard, 1e6 * 0.9);
});

test('occupancy is computed from the unrounded mean', () => {
  const mean = calculateFromMolar({
    molPerLitre: toMolPerLitre(50, 'fM'),
    volumeLitres: toLitres(1, 'pL'),
  }).moleculeCount;

  assert.notEqual(mean, 0.03);
  const probabilities = occupancyProbabilities(mean);
  assert.equal(probabilities.zero, poissonProbability(0, mean));
  assert.equal(probabilities.zero, Math.exp(-mean));
});

test('display helpers are pure — they never write back', () => {
  const value = 3.0110704e8;
  const uncertainty = 1.5e7;

  const first = roundToUncertainty(value, uncertainty);
  const second = roundToUncertainty(value, uncertainty);
  assert.deepEqual(first, second);

  // The originals are untouched, and rendering does not alter them.
  scientific(value);
  primaryCount(value);
  assert.equal(value, 3.0110704e8);
  assert.equal(uncertainty, 1.5e7);
});

test('rounding for display is never fed back into rounding again', () => {
  const value = 3.0110704e8;
  const once = roundToUncertainty(value, 1.5e7).value;
  const twice = roundToUncertainty(once, 1.5e7).value;
  assert.equal(once, twice, 'rounding must be idempotent, not cumulative');
});

test('catalogue molecular weights are stored as written, not re-derived', () => {
  for (const entry of BIOMARKERS) {
    assert.equal(
      Number(String(entry.gramsPerMole)),
      entry.gramsPerMole,
      `${entry.id} does not survive a string round-trip`,
    );
    // The UI shows large masses in kDa; the stored g/mol stays authoritative.
    assert.equal(
      toGramsPerMole(entry.gramsPerMole / 1e3, 'kDa'),
      entry.gramsPerMole,
      `${entry.id} loses precision when displayed in kDa`,
    );
  }
});
