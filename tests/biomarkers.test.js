import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BIOMARKERS,
  analytes,
  findBiomarker,
  formsFor,
  isAmbiguous,
} from '../js/biomarkers.js';

test('every entry is complete enough to be traced back to a source', () => {
  for (const entry of BIOMARKERS) {
    assert.ok(entry.id, 'needs an id');
    assert.ok(entry.analyte, `${entry.id} needs an analyte`);
    assert.ok(entry.form, `${entry.id} needs a molecular form`);
    assert.ok(entry.short, `${entry.id} needs a short name to lead its option`);
    assert.ok(entry.why, `${entry.id} needs a stated reason`);
    assert.ok(
      Number.isFinite(entry.gramsPerMole) && entry.gramsPerMole > 0,
      `${entry.id} needs a positive molecular weight`,
    );
  }
});

test('forms sharing an analyte share its short name', () => {
  // The option text is `${short} ${form}`, so two CRP rows must both say CRP
  // or the list stops grouping visually.
  for (const analyte of analytes()) {
    const names = new Set(formsFor(analyte).map((b) => b.short));
    assert.equal(names.size, 1, `${analyte} has inconsistent short names`);
  }
});

test('ids are unique', () => {
  const ids = BIOMARKERS.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every entry names its molecular form (ADR-0003)', () => {
  // A bare analyte name with no form is exactly the failure this list exists
  // to prevent.
  for (const entry of BIOMARKERS) {
    assert.notEqual(entry.form.trim(), '');
    assert.notEqual(entry.form, entry.analyte);
  }
});

test('every analyte has exactly one recommended form', () => {
  for (const analyte of analytes()) {
    const recommended = formsFor(analyte).filter((b) => b.recommended);
    assert.equal(
      recommended.length,
      1,
      `${analyte} has ${recommended.length} recommended forms`,
    );
  }
});

test('the recommended CRP form is the circulating pentamer, not the monomer', () => {
  const forms = formsFor('C-reactive protein (CRP)');
  const recommended = forms.find((b) => b.recommended);
  assert.equal(recommended.id, 'crp-pentamer');
  assert.equal(recommended.gramsPerMole, 115000);
  assert.match(recommended.why, /serum/);
});

test('the CRP forms differ by the 5x that makes this list necessary', () => {
  const pentamer = findBiomarker('crp-pentamer');
  const monomer = findBiomarker('crp-monomer');
  assert.equal(pentamer.gramsPerMole / monomer.gramsPerMole, 5);
});

test('the recommended troponin form is the released T-I-C complex', () => {
  const recommended = formsFor('Cardiac troponin').find((b) => b.recommended);
  assert.equal(recommended.id, 'troponin-tic');
  assert.ok(recommended.gramsPerMole > findBiomarker('troponin-i').gramsPerMole);
});

test('the recommended PSA form is the ACT complex', () => {
  const recommended = formsFor('Prostate-specific antigen (PSA)').find(
    (b) => b.recommended,
  );
  assert.equal(recommended.id, 'psa-act');
});

test('the recommended insulin form is the mature hormone, not the precursor', () => {
  const recommended = formsFor('Insulin').find((b) => b.recommended);
  assert.equal(recommended.id, 'insulin-mature');
});

test('ambiguous analytes are detectable so the UI can flag the choice', () => {
  assert.ok(isAmbiguous('C-reactive protein (CRP)'));
  assert.ok(isAmbiguous('Cardiac troponin'));
  assert.ok(!isAmbiguous('Human serum albumin'));
});

test('alternate forms carry a reason too, so neither choice is unexplained', () => {
  for (const entry of BIOMARKERS.filter((b) => !b.recommended)) {
    assert.ok(entry.why.length > 20, `${entry.id} needs a real explanation`);
  }
});

test('the list is curated, not exhaustive', () => {
  assert.ok(BIOMARKERS.length >= 12);
  assert.ok(BIOMARKERS.length <= 40);
  assert.ok(analytes().length >= 12);
});

test('unknown ids return null rather than undefined', () => {
  assert.equal(findBiomarker('not-a-biomarker'), null);
});
