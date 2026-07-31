// Analytic uncertainty propagation for v1 (ADR-0001).
//
// The molecule count is a pure product of independent factors, so relative
// variances add. One rule covers both volume modes: volume contributes either
// its own entered uncertainty (direct volume mode) or the summed contributions
// of height, width and length (dimensions mode).
//
// No DOM (ADR-0002).

/** k = 2 gives roughly 95% coverage under a normal-distribution assumption. */
export const COVERAGE_FACTOR = 2;

/**
 * Above this relative uncertainty the linear approximation stops being
 * trustworthy and we say so. A judgement, not a derived constant — which is
 * exactly why it is a named export rather than a literal below.
 */
export const LINEARITY_WARNING_THRESHOLD = 0.3;

/** Significant digits kept on the reported uncertainty, per GUM 7.2.6. */
export const UNCERTAINTY_SIGNIFICANT_DIGITS = 2;

/**
 * Normalise a user-entered uncertainty to a dimensionless relative value.
 * @param {{kind: 'percent'|'absolute', value: number}|null|undefined} entry
 * @param {number} quantity the measured value the uncertainty applies to
 */
export function toRelative(entry, quantity) {
  if (entry === null || entry === undefined) return 0;
  const { kind, value } = entry;
  if (!Number.isFinite(value) || value === 0) return 0;
  if (kind === 'percent') return Math.abs(value) / 100;
  if (kind === 'absolute') {
    if (quantity === 0) throw new RangeError('quantity must not be zero');
    return Math.abs(value / quantity);
  }
  throw new RangeError(`Unknown uncertainty kind "${kind}"`);
}

/** Combine independent relative uncertainties in quadrature. */
export function combineRelative(components) {
  const sumOfSquares = components
    .filter((c) => Number.isFinite(c))
    .reduce((total, c) => total + c * c, 0);
  return Math.sqrt(sumOfSquares);
}

/**
 * Relative uncertainty of a volume computed as h x w x l. Identical maths to
 * combineRelative — named separately because the breakdown panel shows this
 * step on its own, and because it documents that the three dimensions are
 * assumed independent.
 */
export function volumeRelativeFromDimensions({ height, width, length }) {
  return combineRelative([height, width, length]);
}

/**
 * The expanded uncertainty interval on a molecule count.
 *
 * The lower bound is clamped at zero: the linear approximation drives it
 * negative once relative uncertainty passes 1/k, and a negative molecule count
 * is not a meaningful quantity. See ADR-0001 — do not remove the clamp.
 *
 * @returns {{relative: number, standard: number, lower: number, upper: number,
 *            clamped: boolean, exceedsLinearity: boolean}}
 */
export function expandedInterval(moleculeCount, relative) {
  const standard = moleculeCount * relative;
  const margin = COVERAGE_FACTOR * standard;
  const rawLower = moleculeCount - margin;
  return {
    relative,
    standard,
    lower: Math.max(0, rawLower),
    upper: moleculeCount + margin,
    clamped: rawLower < 0,
    exceedsLinearity: relative > LINEARITY_WARNING_THRESHOLD,
  };
}

/**
 * Whole propagation for one calculation. Pass relative uncertainties; omit or
 * pass 0 for anything the user left blank.
 *
 * @param {{concentration?: number, volume?: number, molecularWeight?: number}} parts
 */
export function propagate(moleculeCount, parts) {
  const relative = combineRelative([
    parts.concentration ?? 0,
    parts.volume ?? 0,
    parts.molecularWeight ?? 0,
  ]);
  return expandedInterval(moleculeCount, relative);
}
