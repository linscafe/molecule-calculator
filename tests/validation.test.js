import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ERRORS,
  MAX_PLAUSIBLE_MOLARITY,
  MIN_PLAUSIBLE_METRES,
  parseDecimal,
  plausibilityWarnings,
  validate,
} from '../js/validation.js';

const dimensions = (values) =>
  validate({ volumeMode: 'dimensions', concentrationType: 'molar', values });

test('a complete dimensions form is valid', () => {
  const result = dimensions({
    height: '100',
    width: '50',
    length: '10',
    concentration: '10',
  });
  assert.ok(result.valid);
  assert.equal(result.blocking, null);
  assert.deepEqual(result.errors, {});
});

test('all three dimensions are required', () => {
  const result = dimensions({ height: '100', width: '', concentration: '10' });
  assert.ok(!result.valid);
  assert.equal(result.errors.width, 'required');
  assert.equal(result.errors.length, 'required');
});

test('negatives and zeroes are rejected with different messages', () => {
  const negative = dimensions({
    height: '-5',
    width: '50',
    length: '10',
    concentration: '10',
  });
  assert.equal(negative.errors.height, 'negative');

  const zero = dimensions({
    height: '0',
    width: '50',
    length: '10',
    concentration: '10',
  });
  assert.equal(zero.errors.height, 'zero');
});

test('grouped input is accepted — the placeholder itself is "150,000"', () => {
  assert.equal(parseDecimal('150,000'), '150000');
  assert.equal(parseDecimal('150 000'), '150000');
  assert.equal(parseDecimal('1.5e-9'), '1.5e-9');

  const result = validate({
    volumeMode: 'volume',
    concentrationType: 'mass',
    values: { volume: '5', concentration: '10', molecularWeight: '150,000' },
  });
  assert.ok(result.valid);
});

test('a decimal comma is not guessed at', () => {
  // "1,5" becomes 15, not 1.5. Guessing wrong here is a 10x error, and the
  // ambiguity against "1,500" is unresolvable without knowing the locale.
  assert.equal(parseDecimal('1,5'), '15');
});

test('non-numeric input is rejected', () => {
  const result = dimensions({
    height: 'abc',
    width: '50',
    length: '10',
    concentration: '10',
  });
  assert.equal(result.errors.height, 'notNumber');
});

test('volume mode requires a volume and ignores the dimension fields', () => {
  const result = validate({
    volumeMode: 'volume',
    concentrationType: 'molar',
    values: { volume: '5', concentration: '10' },
  });
  assert.ok(result.valid);
  assert.equal(result.errors.height, undefined);
});

test('mass concentration requires a molecular weight; molar does not', () => {
  const values = { volume: '5', concentration: '10' };

  const mass = validate({
    volumeMode: 'volume',
    concentrationType: 'mass',
    values,
  });
  assert.ok(!mass.valid);
  assert.equal(mass.errors.molecularWeight, 'required');

  const molar = validate({
    volumeMode: 'volume',
    concentrationType: 'molar',
    values,
  });
  assert.ok(molar.valid);
});

test('one blocking problem is surfaced, not a list to hold in your head', () => {
  const result = dimensions({ height: '', width: '', length: '', concentration: '' });
  assert.deepEqual(result.blocking, { field: 'height', code: 'required' });
});

test('validation returns codes, never sentences', () => {
  // A module that hands back English cannot be localised without a rewrite.
  const result = dimensions({ height: '-1', width: '', length: 'x', concentration: '0' });
  for (const code of Object.values(result.errors)) {
    assert.ok(Object.values(ERRORS).includes(code), `${code} is not a known code`);
    assert.ok(!/ /.test(code), `${code} looks like a sentence`);
  }
});

test('a sub-atomic dimension is flagged as a probable unit slip', () => {
  const warnings = plausibilityWarnings({
    dimensionsMetres: [1e-4, 5e-11, 1e-2],
  });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'sub-atomic-dimension');
});

test('a plausible nanochannel is not flagged', () => {
  const warnings = plausibilityWarnings({
    dimensionsMetres: [MIN_PLAUSIBLE_METRES, 1e-6, 1e-3],
  });
  assert.deepEqual(warnings, []);
});

test('a concentration denser than any real solution is flagged', () => {
  const warnings = plausibilityWarnings({ molPerLitre: 30 });
  assert.equal(warnings[0].code, 'implausible-concentration');

  assert.deepEqual(plausibilityWarnings({ molPerLitre: MAX_PLAUSIBLE_MOLARITY }), []);
});

test('an expected count below one is flagged', () => {
  const warnings = plausibilityWarnings({ moleculeCount: 0.03 });
  assert.equal(warnings[0].code, 'below-one-molecule');
  assert.deepEqual(plausibilityWarnings({ moleculeCount: 1 }), []);
});

test('warnings never block — they are returned separately from errors', () => {
  const warnings = plausibilityWarnings({
    dimensionsMetres: [1e-12],
    molPerLitre: 100,
    moleculeCount: 0.001,
  });
  assert.equal(warnings.length, 3);
  // validate() knows nothing about them; the two paths cannot be confused.
  assert.ok(dimensions({ height: '1', width: '1', length: '1', concentration: '1' }).valid);
});
