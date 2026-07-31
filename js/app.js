// Interface layer. Everything that touches the DOM lives here, so that the
// calculation modules stay importable by `node --test` (ADR-0002).
//
// It is also the only layer that knows what language the user reads. The
// calculation modules return codes; the sentences are chosen here.

import {
  LENGTH_UNITS,
  MASS_CONCENTRATION_UNITS,
  MOLAR_UNITS,
  MOLECULAR_WEIGHT_UNITS,
  VOLUME_UNITS,
  equivalentVolumeUnits,
  litresFromMetres,
  toGramsPerLitre,
  toGramsPerMole,
  toLitres,
  toMetres,
  toMolPerLitre,
} from './conversions.js';
import {
  AVOGADRO,
  calculateFromMass,
  calculateFromMolar,
  occupancyProbabilities,
} from './calculations.js';
import {
  LINEARITY_WARNING_THRESHOLD,
  propagate,
  toRelative,
  volumeRelativeFromDimensions,
} from './uncertainty.js';
import {
  PLAIN_NOTATION_MAX,
  PLAIN_NOTATION_MIN,
  atPlace,
  countWithUncertainty,
  exponentOf,
  percent,
  primaryCount,
  readableCount,
  roundToUncertainty,
  scientific,
} from './formatters.js';
import { parseDecimal, plausibilityWarnings, validate } from './validation.js';
import { analytes, findBiomarker, formsFor, localised } from './biomarkers.js';
import { DEFAULT_LOCALE, LOCALES, getLocale, setLocale, t } from './i18n.js';

/** Long enough that typing a six-digit molecular weight announces once. */
const DEBOUNCE_MS = 500;
const LOCALE_STORAGE_KEY = 'molecule-calculator.locale';

const DEFAULT_UNITS = {
  'height-unit': 'um',
  'width-unit': 'um',
  'length-unit': 'um',
  'volume-unit': 'uL',
  'molecular-weight-unit': 'g/mol',
};

/**
 * The page opens on a worked example rather than an empty form, so the first
 * thing a visitor sees is a real result with its reasoning beside it.
 *
 * A 10 x 10 x 50 µm channel holding CRP at 100 pg/mL contains 2.62 molecules,
 * which splits roughly 7% empty / 19% one / 74% two or more. That is not a
 * contrived number: it is the counting regime microfluidics actually works in,
 * and it puts a real occupancy distribution on screen immediately rather than
 * a near-certain zero.
 *
 * Reset returns here rather than to a blank form, so "default" means one thing.
 */
const DEFAULTS = {
  concentrationType: 'mass',
  units: {
    'height-unit': 'um',
    'width-unit': 'um',
    'length-unit': 'um',
    'concentration-unit': 'pg/mL',
  },
  values: { height: '10', width: '10', length: '50', concentration: '100' },
  biomarker: 'crp-pentamer',
  uncertainty: {
    'u-height': '1',
    'u-width': '1',
    'u-length': '1',
    'u-concentration': '1',
    'u-molecular-weight': '1',
  },
};

const el = (id) => document.getElementById(id);
const num = (raw) => Number(parseDecimal(String(raw).trim()));

const MEASURE_FIELDS = [
  'height',
  'width',
  'length',
  'volume',
  'concentration',
  'molecular-weight',
];

const UNCERTAINTY_FIELDS = [
  ['u-height', 'uncertainty.height'],
  ['u-width', 'uncertainty.width'],
  ['u-length', 'uncertainty.length'],
  ['u-volume', 'uncertainty.volume'],
  ['u-concentration', 'uncertainty.concentration'],
  ['u-molecular-weight', 'uncertainty.molecularWeight'],
];

// Fields whose error has been shown at least once. Errors appear on blur, not
// while a field is still being typed into.
const touched = new Set();

let debounceTimer = null;
let lastAnnounced = '';
let lastResult = null;

// ---------------------------------------------------------------- population

function fillUnitSelect(select, table, selected) {
  select.replaceChildren(
    ...Object.entries(table).map(([key, unit]) => {
      const option = document.createElement('option');
      option.value = key;
      // Unit symbols are not translated: µm is µm in every language.
      option.textContent = unit.label;
      option.selected = key === selected;
      return option;
    }),
  );
}

function fillKindSelects() {
  for (const [id, labelKey] of UNCERTAINTY_FIELDS) {
    const select = el(`${id}-kind`);
    const chosen = select.value;
    select.replaceChildren(
      ...['percent', 'absolute'].map((kind) => {
        const option = document.createElement('option');
        option.value = kind;
        option.textContent = t(`kind.${kind}`);
        return option;
      }),
    );
    if (chosen) select.value = chosen;
    select.setAttribute('aria-label', t('kind.aria', { label: t(labelKey) }));
  }
}

function fillBiomarkers() {
  const select = el('biomarker');
  const chosen = select.value;
  const locale = getLocale();

  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = t('mw.custom');
  select.replaceChildren(blank);

  for (const analyte of analytes()) {
    const group = document.createElement('optgroup');
    group.label = localised(formsFor(analyte)[0], locale).analyte;
    for (const entry of formsFor(analyte)) {
      const option = document.createElement('option');
      option.value = entry.id;
      const mass =
        entry.gramsPerMole >= 1000
          ? `${entry.gramsPerMole / 1000} kDa`
          : `${entry.gramsPerMole} g/mol`;
      // Lead with the molecule, not the form: the optgroup label is easy to
      // lose track of once the list is scrolling, and "Pentamer, circulating"
      // on its own does not say what it is a pentamer of.
      const { short, form } = localised(entry, locale);
      option.textContent = entry.recommended
        ? `${short} ${form} — ${mass}（${t('mw.recommended')}）`
        : `${short} ${form} — ${mass}`;
      group.append(option);
    }
    select.append(group);
  }
  if (chosen) select.value = chosen;
}

function populate() {
  for (const [id, selected] of Object.entries(DEFAULT_UNITS)) {
    const table = id.startsWith('volume')
      ? VOLUME_UNITS
      : id.startsWith('molecular')
        ? MOLECULAR_WEIGHT_UNITS
        : LENGTH_UNITS;
    fillUnitSelect(el(id), table, selected);
  }
  syncConcentrationUnits();
  fillKindSelects();
  fillBiomarkers();
}

// Called only on startup, on Reset, and when the concentration type changes —
// all three of which want the default unit, never the previous one. An earlier
// version preserved the selection here, which quietly broke Reset: leaving the
// unit on M after a reset made every subsequent result 10^9 too large.
function syncConcentrationUnits() {
  const isMass = el('concentration-type').value === 'mass';
  fillUnitSelect(
    el('concentration-unit'),
    isMass ? MASS_CONCENTRATION_UNITS : MOLAR_UNITS,
    isMass ? 'ng/mL' : 'nM',
  );
}

// -------------------------------------------------------------------- locale

function applyTranslations() {
  const locale = getLocale();
  document.documentElement.lang = locale;
  document.title = t('app.title');

  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  for (const node of document.querySelectorAll('[data-i18n-aria]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  }

  // Selects whose option text is generated rather than marked up.
  fillKindSelects();
  fillBiomarkers();
  syncBiomarkerWhy();

  // The live region dedupes identical text; a language change must be allowed
  // through even when the number itself has not moved.
  lastAnnounced = '';
}

function changeLocale(locale) {
  setLocale(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private browsing, or storage disabled. The choice simply will not
    // survive a reload, which is not worth failing the switch over.
  }
  applyTranslations();
  renderNow();
}

function restoreLocale() {
  let stored = null;
  try {
    stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const locale = LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  setLocale(locale);
  el(locale === 'zh-TW' ? 'lang-zh' : 'lang-en').checked = true;
}

// -------------------------------------------------------------------- state

function readState() {
  const volumeMode = document.querySelector(
    'input[name="volume-mode"]:checked',
  ).value;
  const concentrationType = el('concentration-type').value;

  const values = Object.fromEntries(
    MEASURE_FIELDS.map((field) => [
      field === 'molecular-weight' ? 'molecularWeight' : field,
      el(field).value.trim(),
    ]),
  );

  const units = {
    height: el('height-unit').value,
    width: el('width-unit').value,
    length: el('length-unit').value,
    volume: el('volume-unit').value,
    concentration: el('concentration-unit').value,
    molecularWeight: el('molecular-weight-unit').value,
  };

  // A prefilled molecular weight is carried as the exact catalogue double, not
  // re-parsed from the string rendered into the field. Only valid while the
  // field still shows that prefill in that unit.
  const mwInput = el('molecular-weight');
  const exactMolecularWeight =
    mwInput.dataset.exactGramsPerMole !== undefined &&
    mwInput.dataset.exactUnit === units.molecularWeight
      ? Number(mwInput.dataset.exactGramsPerMole)
      : null;

  const uncertaintyEnabled = el('uncertainty-enabled').checked;
  const entry = (id) => {
    const raw = el(id).value.trim();
    if (raw === '') return null;
    return { kind: el(`${id}-kind`).value, value: num(raw) };
  };

  return {
    volumeMode,
    concentrationType,
    values,
    units,
    exactMolecularWeight,
    uncertaintyEnabled,
    uncertainty: uncertaintyEnabled
      ? {
          height: entry('u-height'),
          width: entry('u-width'),
          length: entry('u-length'),
          volume: entry('u-volume'),
          concentration: entry('u-concentration'),
          molecularWeight: entry('u-molecular-weight'),
        }
      : {},
  };
}

// ------------------------------------------------------------------ compute

function compute(state) {
  const { values, units } = state;
  const dimensionsMetres =
    state.volumeMode === 'dimensions'
      ? [
          toMetres(num(values.height), units.height),
          toMetres(num(values.width), units.width),
          toMetres(num(values.length), units.length),
        ]
      : [];

  const volumeLitres =
    state.volumeMode === 'dimensions'
      ? litresFromMetres(...dimensionsMetres)
      : toLitres(num(values.volume), units.volume);

  const result =
    state.concentrationType === 'mass'
      ? calculateFromMass({
          gramsPerLitre: toGramsPerLitre(
            num(values.concentration),
            units.concentration,
          ),
          volumeLitres,
          gramsPerMole:
            state.exactMolecularWeight ??
            toGramsPerMole(num(values.molecularWeight), units.molecularWeight),
        })
      : calculateFromMolar({
          molPerLitre: toMolPerLitre(
            num(values.concentration),
            units.concentration,
          ),
          volumeLitres,
        });

  return { ...result, dimensionsMetres, interval: computeInterval(state, result) };
}

function computeInterval(state, result) {
  if (!state.uncertaintyEnabled) return null;
  const { uncertainty, values } = state;

  const volume =
    state.volumeMode === 'dimensions'
      ? volumeRelativeFromDimensions({
          height: toRelative(uncertainty.height, num(values.height)),
          width: toRelative(uncertainty.width, num(values.width)),
          length: toRelative(uncertainty.length, num(values.length)),
        })
      : toRelative(uncertainty.volume, num(values.volume));

  const interval = propagate(result.moleculeCount, {
    concentration: toRelative(
      uncertainty.concentration,
      num(values.concentration),
    ),
    volume,
    molecularWeight:
      state.concentrationType === 'mass'
        ? toRelative(uncertainty.molecularWeight, num(values.molecularWeight))
        : 0,
  });

  return interval.relative > 0 ? interval : null;
}

// ------------------------------------------------------------------- render

function show(node, visible) {
  node.hidden = !visible;
}

const fieldLabel = (field) =>
  t(`field.${field === 'molecular-weight' ? 'molecularWeight' : field}`);

function renderFieldErrors(errors) {
  for (const field of MEASURE_FIELDS) {
    const key = field === 'molecular-weight' ? 'molecularWeight' : field;
    const node = el(`${field}-error`);
    if (!node) continue;
    const code = errors[key];
    const visible = touched.has(field) && code !== undefined;
    node.textContent = visible
      ? t(`error.${code}`, { label: fieldLabel(field) })
      : '';
    show(node, visible);
    el(field).setAttribute('aria-invalid', code ? 'true' : 'false');
  }
}

function renderWarnings(warnings) {
  const container = el('warnings');
  container.replaceChildren(
    ...warnings.map((warning) => {
      const p = document.createElement('p');
      p.className = 'warning';
      p.dataset.code = warning.code;
      p.textContent = t(`warn.${warning.code}`);
      return p;
    }),
  );
}

function renderOccupancy(moleculeCount) {
  const container = el('occupancy');
  const probabilities = occupancyProbabilities(moleculeCount);
  if (!probabilities) {
    container.replaceChildren();
    show(container, false);
    return;
  }

  const heading = document.createElement('p');
  heading.className = 'occupancy__heading';
  heading.textContent = t('occupancy.heading');

  const list = document.createElement('ul');
  list.className = 'occupancy__list';
  for (const [share, key] of [
    [probabilities.zero, 'occupancy.zero'],
    [probabilities.one, 'occupancy.one'],
    [probabilities.twoOrMore, 'occupancy.twoOrMore'],
  ]) {
    const item = document.createElement('li');
    const value = document.createElement('span');
    value.className = 'occupancy__value';
    value.textContent = percent(share);
    item.append(value, ` ${t(key)}`);
    list.append(item);
  }

  const note = document.createElement('p');
  note.className = 'field-note';
  note.textContent = t('occupancy.note');

  container.replaceChildren(heading, list, note);
  show(container, true);
}

function renderInterval(interval) {
  const card = el('uncertainty-card');
  if (!interval) {
    show(card, false);
    return;
  }
  show(card, true);

  // The bounds claim no more precision than the uncertainty supports, for the
  // same reason the primary result does not. Rounding alone is not enough —
  // the significant-figure count has to come from the uncertainty as well, or
  // 6.6e8 prints as "6.60 × 10⁸" and re-claims the digit just discarded.
  const bound = (value) => {
    const { value: rounded, place } = roundToUncertainty(
      value,
      interval.standard,
    );
    if (rounded === 0) return '0';
    const magnitude = Math.abs(rounded);
    if (magnitude >= PLAIN_NOTATION_MIN && magnitude <= PLAIN_NOTATION_MAX) {
      return atPlace(rounded, place);
    }
    return primaryCount(rounded, Math.max(1, exponentOf(rounded) - place + 1));
  };

  el('interval').textContent = t('interval.range', {
    lower: bound(interval.lower),
    upper: bound(interval.upper),
  });
  el('interval-relative').textContent = t('interval.relative', {
    percent: percent(interval.relative),
  });

  const warning = el('interval-warning');
  const messages = [];
  if (interval.exceedsLinearity) {
    messages.push(
      t('interval.linearity', { percent: percent(interval.relative) }),
    );
  }
  if (interval.clamped) messages.push(t('interval.clamped'));

  warning.replaceChildren(
    ...messages.map((text) => {
      const p = document.createElement('p');
      p.className = 'warning';
      p.textContent = text;
      return p;
    }),
  );
}

function breakdownSteps(state, result) {
  const { values, units } = state;
  const label = (table, key) => table[key].label;
  const steps = [];

  if (state.volumeMode === 'dimensions') {
    steps.push({
      title: t('step.dimensions'),
      lines: [
        `${t('field.height')} = ${values.height} ${label(LENGTH_UNITS, units.height)}`,
        `${t('field.width')} = ${values.width} ${label(LENGTH_UNITS, units.width)}`,
        `${t('field.length')} = ${values.length} ${label(LENGTH_UNITS, units.length)}`,
      ],
    });
    steps.push({
      title: t('step.volumeConverted'),
      lines: ['V = h × w × l', `V = ${scientific(result.volumeLitres)} L`],
    });
  } else {
    const entered = `${values.volume} ${label(VOLUME_UNITS, units.volume)}`;
    const twins = equivalentVolumeUnits(units.volume);
    const lines = [t('breakdown.volumeEntered', { value: entered })];
    // Equivalent units are the same scale by definition, so stating a
    // conversion between them would be a no-op line that looks like a bug.
    if (twins.length > 0) {
      lines.push(
        t('breakdown.equivalence', {
          unit: label(VOLUME_UNITS, units.volume),
          others: twins.map((twin) => label(VOLUME_UNITS, twin)).join(' / '),
        }),
      );
    }
    lines.push(`V = ${scientific(result.volumeLitres)} L`);
    steps.push({ title: t('step.volume'), lines });
  }

  if (state.concentrationType === 'mass') {
    const biomarker = findBiomarker(el('biomarker').value);
    steps.push({
      title: t('step.massConcentration'),
      lines: [
        `C = ${values.concentration} ${label(MASS_CONCENTRATION_UNITS, units.concentration)} = ${scientific(result.gramsPerLitre)} g/L`,
      ],
    });
    // Echo the entry the way the concentration step does, so the reader can
    // check what they typed rather than only its converted 3-figure rendering.
    const enteredMw = `${values.molecularWeight} ${label(MOLECULAR_WEIGHT_UNITS, units.molecularWeight)}`;
    steps.push({
      title: t('step.molecularWeight'),
      lines: [
        units.molecularWeight === 'g/mol'
          ? `MW = ${enteredMw}`
          : `MW = ${enteredMw} = ${scientific(result.gramsPerMole)} g/mol`,
        ...(biomarker
          ? [
              t('breakdown.from', localised(biomarker, getLocale())) +
                (biomarker.accession ? ` (UniProt ${biomarker.accession})` : ''),
            ]
          : []),
      ],
    });
    steps.push({
      title: t('step.amount'),
      lines: [
        'n = (C × V) / MW',
        `n = ${scientific(result.amountOfSubstanceMol)} mol`,
      ],
    });
  } else {
    steps.push({
      title: t('step.concentration'),
      lines: [
        `C = ${values.concentration} ${label(MOLAR_UNITS, units.concentration)} = ${scientific(result.molPerLitre)} mol/L`,
      ],
    });
    steps.push({
      title: t('step.amount'),
      lines: ['n = C × V', `n = ${scientific(result.amountOfSubstanceMol)} mol`],
    });
  }

  steps.push({
    title: t('step.molecules'),
    lines: [
      `N = n × ${scientific(AVOGADRO)} mol⁻¹`,
      `N = ${scientific(result.moleculeCount)}`,
    ],
  });

  return steps;
}

function renderBreakdown(state, result) {
  const list = el('breakdown');
  list.replaceChildren(
    ...breakdownSteps(state, result).map((step) => {
      const item = document.createElement('li');
      const title = document.createElement('p');
      title.className = 'breakdown__title';
      title.textContent = step.title;
      const pre = document.createElement('pre');
      pre.textContent = step.lines.join('\n');
      item.append(title, pre);
      return item;
    }),
  );
}

function announce(text) {
  // Writing identical text would queue a second identical announcement.
  if (text === lastAnnounced) return;
  lastAnnounced = text;
  el('result-primary').textContent = text;
}

function renderInvalid(validation) {
  lastResult = null;
  announce(t('result.empty'));
  show(el('result-readable'), false);
  show(el('occupancy'), false);
  show(el('uncertainty-card'), false);
  el('warnings').replaceChildren();
  el('breakdown').replaceChildren();
  el('validation-status').textContent = validation.blocking
    ? t('result.withheld', {
        reason: t(`error.${validation.blocking.code}`, {
          label: fieldLabel(validation.blocking.field),
        }),
      })
    : '';
}

function render() {
  const state = readState();
  const validation = validate(state);
  renderFieldErrors(validation.errors);

  if (!validation.valid) {
    renderInvalid(validation);
    return;
  }
  el('validation-status').textContent = '';

  const result = compute(state);
  lastResult = { state, result };

  const count = result.interval
    ? countWithUncertainty(result.moleculeCount, result.interval.standard)
    : primaryCount(result.moleculeCount);
  announce(`${count} ${t('result.molecules')}`);

  // Read the readable line off the *rounded* count. Saying "301 million"
  // beside "(3.0 ± 1.8) × 10⁸" would claim a third significant figure the
  // uncertainty does not support.
  const readable = readableCount(
    result.interval
      ? roundToUncertainty(result.moleculeCount, result.interval.standard).value
      : result.moleculeCount,
    getLocale(),
  );
  el('result-readable').textContent = readable
    ? t('result.approximately', { value: readable })
    : '';
  show(el('result-readable'), Boolean(readable));

  renderWarnings(
    plausibilityWarnings({
      dimensionsMetres: result.dimensionsMetres,
      molPerLitre: result.molPerLitre,
      moleculeCount: result.moleculeCount,
    }),
  );
  renderOccupancy(result.moleculeCount);
  renderInterval(result.interval);
  renderBreakdown(state, result);
}

// ------------------------------------------------------------------ wiring

function scheduleRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(render, DEBOUNCE_MS);
}

function renderNow() {
  clearTimeout(debounceTimer);
  render();
}

function syncModePanels() {
  const mode = document.querySelector('input[name="volume-mode"]:checked').value;
  show(el('dimensions-panel'), mode === 'dimensions');
  show(el('volume-panel'), mode === 'volume');
  for (const node of document.querySelectorAll('[data-uncertainty-for]')) {
    const scope = node.dataset.uncertaintyFor;
    if (scope === 'dimensions') show(node, mode === 'dimensions');
    if (scope === 'volume') show(node, mode === 'volume');
  }
  syncVolumeEquivalence();
}

function syncConcentrationType() {
  const isMass = el('concentration-type').value === 'mass';
  show(el('molecular-weight-group'), isMass);
  for (const node of document.querySelectorAll(
    '[data-uncertainty-for="mass"]',
  )) {
    show(node, isMass);
  }
}

function syncVolumeEquivalence() {
  const unit = el('volume-unit').value;
  const twins = equivalentVolumeUnits(unit);
  const node = el('volume-equivalence');
  if (twins.length === 0) {
    show(node, false);
    return;
  }
  node.textContent = t('volume.equivalence', {
    unit: VOLUME_UNITS[unit].label,
    others: twins.map((twin) => VOLUME_UNITS[twin].label).join(' / '),
  });
  show(node, true);
}

function syncBiomarkerWhy() {
  const entry = findBiomarker(el('biomarker').value);
  const why = el('biomarker-why');
  if (!entry) {
    show(why, false);
    return;
  }
  const { form, why: reason } = localised(entry, getLocale());
  why.textContent = `${form}: ${reason}`;
  show(why, true);
}

function applyBiomarker() {
  const entry = findBiomarker(el('biomarker').value);
  if (!entry) {
    syncBiomarkerWhy();
    renderNow();
    return;
  }
  // Prefill, never lock — a researcher measuring free PSA specifically must
  // not be argued with (ADR-0003).
  const input = el('molecular-weight');
  const useKilodaltons = entry.gramsPerMole >= 1000;
  const unit = useKilodaltons ? 'kDa' : 'g/mol';
  el('molecular-weight-unit').value = unit;
  input.value = String(
    useKilodaltons ? entry.gramsPerMole / 1000 : entry.gramsPerMole,
  );
  // The field above is a display of the catalogue value, so the catalogue
  // value stays the source of truth rather than being re-derived from the
  // string it was rendered into. Cleared the moment the user edits the field
  // (see wire()) or picks a different unit, at which point what is displayed
  // *is* what was meant.
  input.dataset.exactGramsPerMole = String(entry.gramsPerMole);
  input.dataset.exactUnit = unit;
  touched.add('molecular-weight');
  syncBiomarkerWhy();
  renderNow();
}

function copyResult() {
  const status = el('copy-status');
  if (!lastResult) {
    status.textContent = t('copy.nothing');
    return;
  }
  const { state, result } = lastResult;

  // Markdown, so the result pastes into a lab notebook, an issue, or a doc
  // with its structure intact rather than as a wall of text.
  const lines = [`# ${t('result.heading')}`, ''];
  lines.push(`**${el('result-primary').textContent}**`, '');

  const readable = readableCount(result.moleculeCount, getLocale());
  if (readable) lines.push(t('result.approximately', { value: readable }), '');

  const warnings = plausibilityWarnings({
    dimensionsMetres: result.dimensionsMetres,
    molPerLitre: result.molPerLitre,
    moleculeCount: result.moleculeCount,
  });
  if (warnings.length > 0) {
    lines.push(`## ${t('warnings.heading')}`, '');
    for (const warning of warnings) lines.push(`- ${t(`warn.${warning.code}`)}`);
    lines.push('');
  }

  const occupancy = occupancyProbabilities(result.moleculeCount);
  if (occupancy) {
    lines.push(`## ${t('occupancy.title')}`, '', t('occupancy.heading'), '');
    for (const [share, key] of [
      [occupancy.zero, 'occupancy.zero'],
      [occupancy.one, 'occupancy.one'],
      [occupancy.twoOrMore, 'occupancy.twoOrMore'],
    ]) {
      lines.push(`- ${percent(share)} ${t(key)}`);
    }
    lines.push('', t('occupancy.note'), '');
  }

  lines.push(`## ${t('breakdown.calculation')}`, '');
  breakdownSteps(state, result).forEach((step, index) => {
    // Fenced so the aligned formulae survive the paste.
    lines.push(`### ${index + 1}. ${step.title}`, '', '```text', ...step.lines, '```', '');
  });

  if (result.interval) {
    lines.push(`## ${t('interval.heading')}`, '');
    lines.push(el('interval').textContent, '');
    lines.push(el('interval-relative').textContent, '');
    if (result.interval.clamped) lines.push(t('interval.clamped'), '');
    if (result.interval.exceedsLinearity) {
      lines.push(
        t('interval.linearity', { percent: percent(result.interval.relative) }),
        '',
      );
    }
    lines.push(t('interval.explanation'), '');
    lines.push(`## ${t('assumptions.heading')}`, '');
    for (const key of [
      'assumptions.uniform',
      'assumptions.free',
      'assumptions.independent',
      'assumptions.interval',
    ]) {
      lines.push(`- ${t(key)}`);
    }
    lines.push('');
  }

  navigator.clipboard
    .writeText(`${lines.join('\n').trimEnd()}\n`)
    .then(() => {
      status.textContent = t('copy.done');
    })
    .catch(() => {
      status.textContent = t('copy.failed');
    });
}

/** Seed the worked example. Shared by startup and Reset. */
function applyDefaults() {
  el('mode-dimensions').checked = true;
  el('concentration-type').value = DEFAULTS.concentrationType;
  syncConcentrationUnits();
  syncConcentrationType();
  syncModePanels();

  for (const [id, unit] of Object.entries(DEFAULTS.units)) el(id).value = unit;
  for (const [field, value] of Object.entries(DEFAULTS.values)) {
    el(field).value = value;
  }

  el('uncertainty-enabled').checked = true;
  show(el('uncertainty-panel'), true);
  for (const [id, value] of Object.entries(DEFAULTS.uncertainty)) {
    el(id).value = value;
  }

  el('biomarker').value = DEFAULTS.biomarker;
  syncVolumeEquivalence();
  // Sets the molecular weight, its exact catalogue double, and the reason for
  // the chosen form, then renders.
  applyBiomarker();
}

function reset() {
  for (const field of MEASURE_FIELDS) el(field).value = '';
  delete el('molecular-weight').dataset.exactGramsPerMole;
  delete el('molecular-weight').dataset.exactUnit;
  for (const [id] of UNCERTAINTY_FIELDS) el(id).value = '';
  el('copy-status').textContent = '';
  touched.clear();
  populate();
  applyDefaults();
  lastAnnounced = '';
  renderNow();
}

function wire() {
  for (const field of MEASURE_FIELDS) {
    const input = el(field);
    input.addEventListener('input', () => {
      // Once the user types, the field is the source of truth again.
      delete input.dataset.exactGramsPerMole;
      delete input.dataset.exactUnit;
      scheduleRender();
    });
    input.addEventListener('blur', () => {
      touched.add(field);
      renderNow();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      // There is no form and no submit button, so Enter has to be given a job
      // explicitly: flush the debounce and dismiss the mobile keyboard.
      event.preventDefault();
      touched.add(field);
      input.blur();
      renderNow();
    });
  }

  for (const id of Object.keys(DEFAULT_UNITS)) {
    el(id).addEventListener('change', renderNow);
  }
  el('concentration-unit').addEventListener('change', renderNow);
  el('volume-unit').addEventListener('change', syncVolumeEquivalence);

  for (const id of ['mode-dimensions', 'mode-volume']) {
    el(id).addEventListener('change', () => {
      syncModePanels();
      renderNow();
    });
  }

  el('concentration-type').addEventListener('change', () => {
    syncConcentrationUnits();
    syncConcentrationType();
    renderNow();
  });

  el('biomarker').addEventListener('change', applyBiomarker);

  el('uncertainty-enabled').addEventListener('change', (event) => {
    show(el('uncertainty-panel'), event.target.checked);
    renderNow();
  });

  for (const [id] of UNCERTAINTY_FIELDS) {
    el(id).addEventListener('input', scheduleRender);
    el(id).addEventListener('blur', renderNow);
    el(`${id}-kind`).addEventListener('change', renderNow);
  }

  for (const id of ['lang-en', 'lang-zh']) {
    el(id).addEventListener('change', (event) => {
      if (event.target.checked) changeLocale(event.target.value);
    });
  }

  el('reset').addEventListener('click', reset);
  el('copy').addEventListener('click', copyResult);
}

restoreLocale();
populate();
applyTranslations();
wire();
applyDefaults();
