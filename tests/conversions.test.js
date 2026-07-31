import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LENGTH_UNITS,
  VOLUME_UNITS,
  areEquivalentVolumeUnits,
  equivalentVolumeUnits,
  litresFromMetres,
  toGramsPerLitre,
  toGramsPerMole,
  toLitres,
  toMetres,
  toMolPerLitre,
} from '../js/conversions.js';

const close = (actual, expected, tolerance = 1e-12) => {
  const relative = Math.abs((actual - expected) / (expected || 1));
  assert.ok(
    relative < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test('length units convert to metres', () => {
  close(toMetres(1, 'm'), 1);
  close(toMetres(1, 'cm'), 1e-2);
  close(toMetres(1, 'mm'), 1e-3);
  close(toMetres(100, 'um'), 1e-4);
  close(toMetres(1, 'nm'), 1e-9);
});

test('volume units convert to litres', () => {
  close(toLitres(1, 'L'), 1);
  close(toLitres(1, 'mL'), 1e-3);
  close(toLitres(1, 'uL'), 1e-6);
  close(toLitres(1, 'nL'), 1e-9);
  close(toLitres(1, 'pL'), 1e-12);
  close(toLitres(1, 'fL'), 1e-15);
  close(toLitres(1, 'm3'), 1000);
  close(toLitres(1, 'cm3'), 1e-3);
  close(toLitres(1, 'mm3'), 1e-6);
  close(toLitres(1, 'um3'), 1e-15);
});

test('the three equivalent volume pairs are exactly equal, not approximate', () => {
  assert.equal(VOLUME_UNITS.mL.toLitres, VOLUME_UNITS.cm3.toLitres);
  assert.equal(VOLUME_UNITS.uL.toLitres, VOLUME_UNITS.mm3.toLitres);
  assert.equal(VOLUME_UNITS.fL.toLitres, VOLUME_UNITS.um3.toLitres);

  assert.ok(areEquivalentVolumeUnits('mL', 'cm3'));
  assert.ok(areEquivalentVolumeUnits('uL', 'mm3'));
  assert.ok(areEquivalentVolumeUnits('fL', 'um3'));
  assert.ok(!areEquivalentVolumeUnits('mL', 'uL'));
});

test('ten volume units span seven distinct scales', () => {
  const scales = new Set(
    Object.values(VOLUME_UNITS).map((unit) => unit.toLitres),
  );
  assert.equal(Object.keys(VOLUME_UNITS).length, 10);
  assert.equal(scales.size, 7);
});

test('equivalentVolumeUnits names the partner unit', () => {
  assert.deepEqual(equivalentVolumeUnits('mL'), ['cm3']);
  assert.deepEqual(equivalentVolumeUnits('um3'), ['fL']);
  assert.deepEqual(equivalentVolumeUnits('L'), []);
});

test('concentration and molecular-weight units convert', () => {
  close(toMolPerLitre(10, 'nM'), 1e-8);
  close(toMolPerLitre(1, 'M'), 1);
  close(toMolPerLitre(1, 'fM'), 1e-15);

  // mg/mL is g/L exactly; g/m3 is mg/L.
  close(toGramsPerLitre(1, 'mg/mL'), 1);
  close(toGramsPerLitre(1, 'g/L'), 1);
  close(toGramsPerLitre(1, 'ug/mL'), 1e-3);
  close(toGramsPerLitre(1, 'ng/mL'), 1e-6);
  close(toGramsPerLitre(1, 'g/m3'), 1e-3);

  close(toGramsPerMole(150, 'kDa'), 150000);
  close(toGramsPerMole(150000, 'g/mol'), 150000);
});

test("the plan's worked example: 100 um x 50 um x 10 mm is 5.00e-8 L", () => {
  const volume = litresFromMetres(
    toMetres(100, 'um'),
    toMetres(50, 'um'),
    toMetres(10, 'mm'),
  );
  close(volume, 5e-8);
});

test('unknown units are rejected rather than silently yielding NaN', () => {
  assert.throws(() => toMetres(1, 'furlong'), RangeError);
  assert.throws(() => toLitres(1, 'gallon'), RangeError);
  assert.throws(() => areEquivalentVolumeUnits('mL', 'gallon'), RangeError);
});

test('every length unit carries a display label', () => {
  for (const [key, unit] of Object.entries(LENGTH_UNITS)) {
    assert.ok(unit.label, `${key} needs a label`);
  }
});
