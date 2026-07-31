// Interface layer. Everything that touches the DOM lives here, so that the
// calculation modules stay importable by `node --test` (ADR-0002).

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
  countWithUncertainty,
  exponentOf,
  percent,
  primaryCount,
  readableCount,
  roundToUncertainty,
  scientific,
} from './formatters.js';
import { parseDecimal, plausibilityWarnings, validate } from './validation.js';
import { BIOMARKERS, analytes, findBiomarker, formsFor } from './biomarkers.js';

/** Long enough that typing a six-digit molecular weight announces once. */
const DEBOUNCE_MS = 500;

const DEFAULT_UNITS = {
  'height-unit': 'um',
  'width-unit': 'um',
  'length-unit': 'mm',
  'volume-unit': 'uL',
  'molecular-weight-unit': 'g/mol',
};

const UNCERTAINTY_KINDS = { percent: '%', absolute: 'absolute' };

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
      option.textContent = unit.label;
      option.selected = key === selected;
      return option;
    }),
  );
}

function fillKindSelect(select) {
  select.replaceChildren(
    ...Object.entries(UNCERTAINTY_KINDS).map(([key, label]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      return option;
    }),
  );
}

function fillBiomarkers() {
  const select = el('biomarker');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'Custom / not listed';
  select.replaceChildren(blank);

  for (const analyte of analytes()) {
    const group = document.createElement('optgroup');
    group.label = analyte;
    for (const entry of formsFor(analyte)) {
      const option = document.createElement('option');
      option.value = entry.id;
      const mass =
        entry.gramsPerMole >= 1000
          ? `${entry.gramsPerMole / 1000} kDa`
          : `${entry.gramsPerMole} g/mol`;
      option.textContent = entry.recommended
        ? `${entry.form} — ${mass} (recommended)`
        : `${entry.form} — ${mass}`;
      group.append(option);
    }
    select.append(group);
  }
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
  for (const id of [
    'u-height-kind',
    'u-width-kind',
    'u-length-kind',
    'u-volume-kind',
    'u-concentration-kind',
    'u-molecular-weight-kind',
  ]) {
    fillKindSelect(el(id));
  }
  fillBiomarkers();
}

function syncConcentrationUnits() {
  const isMass = el('concentration-type').value === 'mass';
  fillUnitSelect(
    el('concentration-unit'),
    isMass ? MASS_CONCENTRATION_UNITS : MOLAR_UNITS,
    isMass ? 'ng/mL' : 'nM',
  );
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
          gramsPerMole: toGramsPerMole(
            num(values.molecularWeight),
            units.molecularWeight,
          ),
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

function renderFieldErrors(errors) {
  for (const field of MEASURE_FIELDS) {
    const key = field === 'molecular-weight' ? 'molecularWeight' : field;
    const node = el(`${field}-error`);
    if (!node) continue;
    const message = touched.has(field) ? errors[key] : undefined;
    node.textContent = message ?? '';
    show(node, Boolean(message));
    el(field).setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
  }
}

function renderWarnings(warnings) {
  const container = el('warnings');
  container.replaceChildren(
    ...warnings.map((warning) => {
      const p = document.createElement('p');
      p.className = 'warning';
      p.dataset.code = warning.code;
      p.textContent = warning.message;
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
  heading.textContent = 'In equivalent volumes:';

  const list = document.createElement('ul');
  list.className = 'occupancy__list';
  for (const [share, label] of [
    [probabilities.zero, 'contain 0 molecules'],
    [probabilities.one, 'contain 1'],
    [probabilities.twoOrMore, 'contain 2 or more'],
  ]) {
    const item = document.createElement('li');
    const value = document.createElement('span');
    value.className = 'occupancy__value';
    value.textContent = percent(share);
    item.append(value, ` ${label}`);
    list.append(item);
  }

  const note = document.createElement('p');
  note.className = 'field-note';
  note.textContent =
    'Assumes molecules are randomly and independently distributed (Poisson).';

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
    return primaryCount(rounded, Math.max(1, exponentOf(rounded) - place + 1));
  };
  el('interval').textContent =
    `${bound(interval.lower)} to ${bound(interval.upper)} molecules`;
  el('interval-relative').textContent =
    `Combined relative uncertainty: ${percent(interval.relative)} ` +
    `(k = 2, approximately 95% coverage).`;

  const warning = el('interval-warning');
  const messages = [];
  if (interval.exceedsLinearity) {
    messages.push(
      `Relative uncertainty is ${percent(interval.relative)}. At this magnitude ` +
        'the linear approximation is unreliable; treat the interval as ' +
        'indicative only.',
    );
  }
  if (interval.clamped) {
    messages.push(
      'The interval is truncated at zero. A molecule count cannot be negative.',
    );
  }
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
      title: 'Dimensions entered',
      lines: [
        `Height = ${values.height} ${label(LENGTH_UNITS, units.height)}`,
        `Width = ${values.width} ${label(LENGTH_UNITS, units.width)}`,
        `Length = ${values.length} ${label(LENGTH_UNITS, units.length)}`,
      ],
    });
    steps.push({
      title: 'Converted volume',
      lines: [
        `V = h × w × l`,
        `V = ${scientific(result.volumeLitres)} L`,
      ],
    });
  } else {
    const entered = `${values.volume} ${label(VOLUME_UNITS, units.volume)}`;
    const twins = equivalentVolumeUnits(units.volume);
    const lines = [`Volume entered = ${entered}`];
    // Equivalent units are the same scale by definition, so stating a
    // conversion between them would be a no-op line that looks like a bug.
    if (twins.length > 0) {
      lines.push(
        `${label(VOLUME_UNITS, units.volume)} is exactly ${twins
          .map((t) => label(VOLUME_UNITS, t))
          .join(' and ')}`,
      );
    }
    lines.push(`V = ${scientific(result.volumeLitres)} L`);
    steps.push({ title: 'Volume', lines });
  }

  if (state.concentrationType === 'mass') {
    const biomarker = findBiomarker(el('biomarker').value);
    steps.push({
      title: 'Mass concentration',
      lines: [
        `C = ${values.concentration} ${label(MASS_CONCENTRATION_UNITS, units.concentration)} = ${scientific(result.gramsPerLitre)} g/L`,
      ],
    });
    steps.push({
      title: 'Molecular weight',
      lines: [
        `MW = ${scientific(result.gramsPerMole)} g/mol`,
        ...(biomarker
          ? [
              `From ${biomarker.analyte} — ${biomarker.form}` +
                (biomarker.accession ? ` (UniProt ${biomarker.accession})` : ''),
            ]
          : []),
      ],
    });
    steps.push({
      title: 'Amount of substance',
      lines: [
        'n = (C × V) / MW',
        `n = ${scientific(result.amountOfSubstanceMol)} mol`,
      ],
    });
  } else {
    steps.push({
      title: 'Concentration',
      lines: [
        `C = ${values.concentration} ${label(MOLAR_UNITS, units.concentration)} = ${scientific(result.molPerLitre)} mol/L`,
      ],
    });
    steps.push({
      title: 'Amount of substance',
      lines: ['n = C × V', `n = ${scientific(result.amountOfSubstanceMol)} mol`],
    });
  }

  steps.push({
    title: 'Number of molecules',
    lines: [
      `N = n × ${scientific(AVOGADRO)} mol⁻¹`,
      `N = ${scientific(result.moleculeCount)} molecules`,
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
  announce('—');
  show(el('result-readable'), false);
  show(el('occupancy'), false);
  show(el('uncertainty-card'), false);
  el('warnings').replaceChildren();
  el('breakdown').replaceChildren();
  el('validation-status').textContent = validation.blocking
    ? `No result yet: ${validation.blocking}`
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

  const primary = result.interval
    ? `${countWithUncertainty(result.moleculeCount, result.interval.standard)} molecules`
    : `${primaryCount(result.moleculeCount)} molecules`;
  announce(primary);

  // Read the readable line off the *rounded* count. Saying "301 million"
  // beside "(3.0 ± 1.8) × 10⁸" would claim a third significant figure the
  // uncertainty does not support.
  const readable = readableCount(
    result.interval
      ? roundToUncertainty(result.moleculeCount, result.interval.standard).value
      : result.moleculeCount,
  );
  el('result-readable').textContent = readable
    ? `Approximately ${readable}`
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
  node.textContent = `1 ${VOLUME_UNITS[unit].label} is exactly 1 ${twins
    .map((t) => VOLUME_UNITS[t].label)
    .join(' and 1 ')}.`;
  show(node, true);
}

function applyBiomarker() {
  const entry = findBiomarker(el('biomarker').value);
  const why = el('biomarker-why');
  if (!entry) {
    show(why, false);
    return;
  }
  // Prefill, never lock — a researcher measuring free PSA specifically must
  // not be argued with (ADR-0003).
  const useKilodaltons = entry.gramsPerMole >= 1000;
  el('molecular-weight-unit').value = useKilodaltons ? 'kDa' : 'g/mol';
  el('molecular-weight').value = String(
    useKilodaltons ? entry.gramsPerMole / 1000 : entry.gramsPerMole,
  );
  touched.add('molecular-weight');
  why.textContent = `${entry.form}: ${entry.why}`;
  show(why, true);
  renderNow();
}

function copyResult() {
  const status = el('copy-status');
  if (!lastResult) {
    status.textContent = 'Nothing to copy yet.';
    return;
  }
  const { state, result } = lastResult;
  const lines = [
    'Number of molecules',
    el('result-primary').textContent,
  ];
  const readable = readableCount(result.moleculeCount);
  if (readable) lines.push(`Approximately ${readable}`);

  lines.push('', 'Calculation');
  for (const step of breakdownSteps(state, result)) {
    lines.push(`${step.title}:`);
    for (const line of step.lines) lines.push(`  ${line}`);
  }

  if (result.interval) {
    lines.push(
      '',
      'Estimated uncertainty interval',
      `  ${primaryCount(result.interval.lower)} to ${primaryCount(result.interval.upper)} molecules`,
      `  Combined relative uncertainty ${percent(result.interval.relative)}, k = 2`,
    );
    if (result.interval.clamped) {
      lines.push('  Truncated at zero; a molecule count cannot be negative.');
    }
    if (result.interval.exceedsLinearity) {
      lines.push(
        `  Above ${percent(LINEARITY_WARNING_THRESHOLD)} relative uncertainty the linear approximation is unreliable.`,
      );
    }
    lines.push(
      '',
      'Assumptions',
      '  Molecules are uniformly distributed in the volume',
      '  Concentration represents freely available molecules',
      '  Input uncertainties are independent',
      '  The reported interval is an approximate 95% uncertainty interval',
    );
  }

  navigator.clipboard
    .writeText(lines.join('\n'))
    .then(() => {
      status.textContent = 'Copied.';
    })
    .catch(() => {
      status.textContent = 'Could not copy.';
    });
}

function reset() {
  for (const field of MEASURE_FIELDS) el(field).value = '';
  for (const id of [
    'u-height',
    'u-width',
    'u-length',
    'u-volume',
    'u-concentration',
    'u-molecular-weight',
  ]) {
    el(id).value = '';
  }
  el('mode-dimensions').checked = true;
  el('concentration-type').value = 'molar';
  el('uncertainty-enabled').checked = false;
  el('biomarker').value = '';
  el('copy-status').textContent = '';
  touched.clear();
  populate();
  syncModePanels();
  syncConcentrationType();
  show(el('uncertainty-panel'), false);
  show(el('biomarker-why'), false);
  lastAnnounced = '';
  renderNow();
}

function wire() {
  for (const field of MEASURE_FIELDS) {
    const input = el(field);
    input.addEventListener('input', scheduleRender);
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

  for (const id of [
    'height-unit',
    'width-unit',
    'length-unit',
    'volume-unit',
    'concentration-unit',
    'molecular-weight-unit',
  ]) {
    el(id).addEventListener('change', renderNow);
  }
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

  for (const id of [
    'u-height',
    'u-width',
    'u-length',
    'u-volume',
    'u-concentration',
    'u-molecular-weight',
  ]) {
    el(id).addEventListener('input', scheduleRender);
    el(id).addEventListener('blur', renderNow);
    el(`${id}-kind`).addEventListener('change', renderNow);
  }

  el('uncertainty-preset').addEventListener('click', () => {
    el('u-concentration').value = '5';
    for (const id of ['u-height', 'u-width', 'u-length']) el(id).value = '2';
    renderNow();
  });

  el('reset').addEventListener('click', reset);
  el('copy').addEventListener('click', copyResult);
}

populate();
syncModePanels();
syncConcentrationType();
wire();
render();
