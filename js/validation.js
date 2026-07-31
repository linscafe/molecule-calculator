// Validation errors block a result. Plausibility warnings never do.
// Keeping the two in one module makes that distinction hard to blur.
// No DOM (ADR-0002).

/** An atom is ~0.1-0.3 nm across; a C-C bond is ~0.15 nm. */
export const MIN_PLAUSIBLE_METRES = 1e-10;

/** Pure water is 55.5 M; saturated NaCl is ~6.1 M. */
export const MAX_PLAUSIBLE_MOLARITY = 25;

// Error *codes*, never sentences. The interface layer turns these into text in
// whichever locale is active — see i18n.js. A module that returns English
// cannot be localised without being rewritten.
export const ERRORS = {
  REQUIRED: 'required',
  NOT_A_NUMBER: 'notNumber',
  NEGATIVE: 'negative',
  ZERO: 'zero',
};

/**
 * Strip the grouping separators and spaces a human types, so that "150,000"
 * and "150 000" are numbers rather than validation errors. Deliberately does
 * not accept a decimal comma: "1,5" is ambiguous against "1,500" and guessing
 * wrong changes a result by 1000x.
 */
export function parseDecimal(raw) {
  if (typeof raw !== 'string') return raw;
  return raw.replace(/[\s,]/g, '');
}

function positiveNumberError(raw) {
  if (raw === '' || raw === null || raw === undefined) return ERRORS.REQUIRED;
  const value = Number(parseDecimal(raw));
  if (!Number.isFinite(value)) return ERRORS.NOT_A_NUMBER;
  if (value < 0) return ERRORS.NEGATIVE;
  if (value === 0) return ERRORS.ZERO;
  return null;
}

/**
 * @param {{volumeMode: 'dimensions'|'volume', concentrationType: 'molar'|'mass',
 *          values: Record<string, string|number>}} input
 * @returns {{errors: Record<string,string>, valid: boolean, blocking: string|null}}
 */
export function validate({ volumeMode, concentrationType, values }) {
  const required =
    volumeMode === 'dimensions'
      ? ['height', 'width', 'length']
      : ['volume'];
  required.push('concentration');
  if (concentrationType === 'mass') required.push('molecularWeight');

  const errors = {};
  for (const field of required) {
    const error = positiveNumberError(values[field]);
    if (error) errors[field] = error;
  }

  const first = required.find((field) => errors[field]);
  return {
    errors,
    valid: first === undefined,
    // The single problem the live region announces. Naming one field beats
    // announcing a list nobody can hold in their head.
    blocking: first ? { field: first, code: errors[first] } : null,
  };
}

/**
 * Non-blocking plausibility checks, each anchored to a physical constant.
 *
 * The failure these actually catch is not exotic physics but a unit slip —
 * meaning 100 µm and leaving the selector on nm makes the volume 10⁹x too
 * small, and nothing else in the tool would complain.
 *
 * @param {{dimensionsMetres?: number[], molPerLitre?: number,
 *          moleculeCount?: number}} computed
 */
export function plausibilityWarnings({
  dimensionsMetres = [],
  molPerLitre,
  moleculeCount,
}) {
  const warnings = [];

  if (dimensionsMetres.some((m) => m > 0 && m < MIN_PLAUSIBLE_METRES)) {
    warnings.push({ code: 'sub-atomic-dimension' });
  }

  if (Number.isFinite(molPerLitre) && molPerLitre > MAX_PLAUSIBLE_MOLARITY) {
    warnings.push({ code: 'implausible-concentration' });
  }

  if (Number.isFinite(moleculeCount) && moleculeCount < 1) {
    warnings.push({ code: 'below-one-molecule' });
  }

  return warnings;
}
