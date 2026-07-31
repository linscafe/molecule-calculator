import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AVOGADRO,
  OCCUPANCY_THRESHOLD,
  calculateFromMass,
  calculateFromMolar,
  molarFromMassConcentration,
  occupancyProbabilities,
  poissonProbability,
} from '../js/calculations.js';
import { litresFromMetres, toMetres, toMolPerLitre } from '../js/conversions.js';

const close = (actual, expected, tolerance = 1e-9) => {
  const relative = Math.abs((actual - expected) / (expected || 1));
  assert.ok(
    relative < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test('Avogadro is the exact defined SI value', () => {
  assert.equal(AVOGADRO, 6.02214076e23);
});

test("the plan's worked example end to end: 10 nM in a 100x50 um x 10 mm channel", () => {
  const volumeLitres = litresFromMetres(
    toMetres(100, 'um'),
    toMetres(50, 'um'),
    toMetres(10, 'mm'),
  );
  const result = calculateFromMolar({
    molPerLitre: toMolPerLitre(10, 'nM'),
    volumeLitres,
  });

  close(result.volumeLitres, 5e-8);
  close(result.amountOfSubstanceMol, 5e-16);
  close(result.moleculeCount, 3.0110704e8, 1e-6);
});

test('one litre of one molar contains one mole of molecules', () => {
  const result = calculateFromMolar({ molPerLitre: 1, volumeLitres: 1 });
  close(result.amountOfSubstanceMol, 1);
  close(result.moleculeCount, AVOGADRO);
});

test('mass concentration divides by molecular weight before counting', () => {
  // 150 ng/mL of a 150 kDa antibody is exactly 1 nM.
  const result = calculateFromMass({
    gramsPerLitre: 150e-6,
    volumeLitres: 1,
    gramsPerMole: 150000,
  });
  close(result.molPerLitre, 1e-9);
  close(result.amountOfSubstanceMol, 1e-9);
  close(result.moleculeCount, 6.02214076e14);
});

test('doubling molecular weight halves the molecule count', () => {
  const base = calculateFromMass({
    gramsPerLitre: 1e-3,
    volumeLitres: 1e-6,
    gramsPerMole: 25000,
  });
  const doubled = calculateFromMass({
    gramsPerLitre: 1e-3,
    volumeLitres: 1e-6,
    gramsPerMole: 50000,
  });
  close(doubled.moleculeCount, base.moleculeCount / 2);
});

test('the CRP monomer-vs-pentamer error is a 5x count difference', () => {
  const shared = { gramsPerLitre: 1e-6, volumeLitres: 1e-3 };
  const pentamer = calculateFromMass({ ...shared, gramsPerMole: 115000 });
  const monomer = calculateFromMass({ ...shared, gramsPerMole: 23000 });
  close(monomer.moleculeCount / pentamer.moleculeCount, 5);
});

test('molarFromMassConcentration lets the plausibility check see mass input', () => {
  close(molarFromMassConcentration(180.156, 180.156), 1);
});

test('Poisson probabilities match the plan worked example at N = 0.03', () => {
  const p = occupancyProbabilities(0.03);
  close(p.zero, 0.9704455335, 1e-8);
  close(p.one, 0.029113366, 1e-7);
  close(p.twoOrMore, 1 - p.zero - p.one, 1e-9);
  // ~97% of equivalent volumes are empty.
  assert.ok(p.zero > 0.97 && p.zero < 0.971);
});

test('at N = 0.5 roughly 60% of volumes are empty', () => {
  const p = occupancyProbabilities(0.5);
  close(p.zero, Math.exp(-0.5), 1e-12);
  close(p.one, 0.5 * Math.exp(-0.5), 1e-12);
});

test('the three occupancy shares always sum to one', () => {
  for (const mean of [0, 0.001, 0.03, 0.5, 1, 5, 9.9]) {
    const p = occupancyProbabilities(mean);
    close(p.zero + p.one + p.twoOrMore, 1, 1e-12);
  }
});

test('occupancy is hidden at and above the threshold', () => {
  assert.equal(occupancyProbabilities(OCCUPANCY_THRESHOLD), null);
  assert.equal(occupancyProbabilities(1e8), null);
  assert.notEqual(occupancyProbabilities(9.99), null);
});

test('a zero mean means the volume is certainly empty', () => {
  assert.equal(poissonProbability(0, 0), 1);
  assert.equal(poissonProbability(1, 0), 0);
});

test('a negative mean is rejected', () => {
  assert.throws(() => poissonProbability(0, -1), RangeError);
});
