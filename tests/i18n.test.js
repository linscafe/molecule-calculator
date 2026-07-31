import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LOCALE,
  LOCALES,
  getLocale,
  keysFor,
  setLocale,
  t,
} from '../js/i18n.js';
import { ERRORS } from '../js/validation.js';
import { BIOMARKERS, localised } from '../js/biomarkers.js';
import { readableCount } from '../js/formatters.js';

test('the locales have not drifted apart', () => {
  const [reference, ...others] = LOCALES;
  const expected = [...keysFor(reference)].sort();
  for (const locale of others) {
    const actual = [...keysFor(locale)].sort();
    const missing = expected.filter((key) => !actual.includes(key));
    const extra = actual.filter((key) => !expected.includes(key));
    assert.deepEqual(missing, [], `${locale} is missing keys`);
    assert.deepEqual(extra, [], `${locale} has keys ${reference} does not`);
  }
});

test('no string is left untranslated by copy-paste', () => {
  // A handful of strings are legitimately identical across locales: unit
  // symbols, the em-dash placeholder, and the language names themselves —
  // "English" is written "English" in a Chinese language picker. Everything
  // else differing is the point of having a second locale.
  const allowed = new Set([
    'lang.en',
    'lang.zh-TW',
    'kind.percent',
    'result.empty',
  ]);
  const identical = keysFor('en').filter(
    (key) => !allowed.has(key) && t(key, {}, 'en') === t(key, {}, 'zh-TW'),
  );
  assert.deepEqual(identical, [], 'these zh-TW strings are still English');
});

test('every validation code has a string in both locales', () => {
  for (const code of Object.values(ERRORS)) {
    for (const locale of LOCALES) {
      const message = t(`error.${code}`, { label: 'X' }, locale);
      assert.ok(message.includes('X'), `error.${code} drops its {label}`);
    }
  }
});

test('every plausibility warning code has a string in both locales', () => {
  for (const code of [
    'sub-atomic-dimension',
    'implausible-concentration',
    'below-one-molecule',
  ]) {
    for (const locale of LOCALES) {
      assert.ok(t(`warn.${code}`, {}, locale).length > 0);
    }
  }
});

test('parameters are substituted, and unknown ones left alone', () => {
  assert.equal(
    t('result.approximately', { value: '301 million' }, 'en'),
    'Approximately 301 million',
  );
  assert.equal(
    t('interval.range', { lower: '0', upper: '6.6 × 10⁸' }, 'en'),
    '0 to 6.6 × 10⁸ molecules',
  );
  // A missing parameter leaves the token visible rather than printing
  // "undefined" into the page.
  assert.equal(t('result.approximately', {}, 'en'), 'Approximately {value}');
});

test('a missing key throws rather than shipping silently', () => {
  assert.throws(() => t('no.such.key'), RangeError);
  assert.throws(() => setLocale('klingon'), RangeError);
});

test('the locale is switchable and defaults to English', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  setLocale('zh-TW');
  assert.equal(getLocale(), 'zh-TW');
  assert.equal(t('result.heading'), '分子數量');
  setLocale('en');
  assert.equal(t('result.heading'), 'Number of molecules');
});

test('Chinese groups large numbers in myriads, not thousands', () => {
  // This is the trap: 3.01e8 is "301 million" but 「3.01億」. The two systems
  // share no boundaries above 10^4, so the zh-TW scale table is not a
  // translation of the English one.
  assert.equal(readableCount(3.0110704e8, 'en'), '301 million (short scale)');
  assert.equal(readableCount(3.0110704e8, 'zh-TW'), '3.01億');

  assert.equal(readableCount(6.02e14, 'en'), '602 trillion (short scale)');
  assert.equal(readableCount(6.02e14, 'zh-TW'), '602兆');

  assert.equal(readableCount(5e6, 'en'), '5 million (short scale)');
  assert.equal(readableCount(5e6, 'zh-TW'), '500萬');

  assert.equal(readableCount(6.02e17, 'zh-TW'), '60.2京');
});

test('the short-scale qualifier is English-only', () => {
  // "billion" is ambiguous between short and long scale; 億 is not ambiguous,
  // so a qualifier there would be noise.
  assert.match(readableCount(5e9, 'en'), /\(short scale\)$/);
  assert.doesNotMatch(readableCount(5e9, 'zh-TW'), /scale|尺度/);
});

test('both locales agree on when to omit the readable line', () => {
  for (const value of [0.03, 45000, 6.02e20, 6.02214076e23]) {
    assert.equal(readableCount(value, 'en'), null);
    assert.equal(readableCount(value, 'zh-TW'), null);
  }
});

test('an unknown locale is rejected rather than silently falling back', () => {
  assert.throws(() => readableCount(1e9, 'fr'), RangeError);
});

// A chemical formula is not language: C₆H₁₂O₆ is written C₆H₁₂O₆ in Chinese,
// so requiring it to differ would force a wrong translation.
//
// Short names are exempt from the differ/Chinese checks entirely, because both
// outcomes are correct depending on the analyte: CRP is written CRP in a
// Taiwanese lab report, while cTn is 心肌旋轉蛋白. Asserting either way would
// make one of those a failure. Presence is checked; wording is not.
// Element symbols and subscripts only, and at least one subscript \u2014 otherwise
// an ordinary English word like "Monomer" passes as a formula and escapes the
// translation check entirely.
const isChemicalFormula = (value) =>
  /^[A-Za-z\d\u2080-\u2089]+$/.test(value) && /[\u2080-\u2089]/.test(value);

test('every biomarker is fully translated, form included', () => {
  for (const entry of BIOMARKERS) {
    const zh = localised(entry, 'zh-TW');
    const en = localised(entry, 'en');
    assert.equal(en.analyte, entry.analyte);
    for (const field of ['analyte', 'short', 'form', 'why']) {
      assert.ok(zh[field], `${entry.id}.${field} missing in zh-TW`);
      if (field === 'short') continue;
      if (isChemicalFormula(en[field])) {
        assert.equal(zh[field], en[field], `${entry.id}.${field} should not be translated`);
        continue;
      }
      assert.notEqual(
        zh[field],
        en[field],
        `${entry.id}.${field} is still English`,
      );
      // The molecular form is part of the entry's identity (ADR-0003), so a
      // translated name beside an English form would be half a translation.
      assert.match(zh[field], /[一-鿿]/, `${entry.id}.${field} has no Chinese`);
    }
  }
});

test('an unknown locale falls back to English for biomarkers', () => {
  const entry = BIOMARKERS[0];
  assert.equal(localised(entry, 'fr').analyte, entry.analyte);
});
