// Number presentation. No DOM (ADR-0002).
//
// Two rules govern everything here:
//   - When an uncertainty exists, it decides the precision (GUM practice).
//   - When it does not, 3 significant figures is a *display default*, not a
//     claim about the precision of the inputs. v1 does not track significant
//     figures through the calculation.

export const DEFAULT_SIGNIFICANT_FIGURES = 3;

/** Outside this band the primary result is shown in scientific notation. */
export const PLAIN_NOTATION_MIN = 1e-3;
export const PLAIN_NOTATION_MAX = 1e6;

/**
 * At or above this value the readable line is omitted entirely: "602
 * sextillion" conveys less than 6.02 × 10²³ does.
 */
export const READABLE_MAX = 1e18;

// English groups large numbers in thousands; Chinese groups them in myriads.
// These are different systems, not different words for the same one, so the
// zh-TW row is not a translation of the en row — 3.01e8 reads "301 million"
// but 「3.01億」, and the two tables share no boundaries above 10^4.
//
// The "(short scale)" qualifier exists only in English, where "billion" is
// 10^9 on the short scale and 10^12 on the long scale still used across much
// of Europe. The Chinese myriad system carries no such ambiguity, so adding a
// qualifier there would be noise.
const SCALES = {
  en: {
    separator: ' ',
    qualifier: ' (short scale)',
    steps: [
      [1e15, 'quadrillion'],
      [1e12, 'trillion'],
      [1e9, 'billion'],
      [1e6, 'million'],
    ],
  },
  'zh-TW': {
    separator: '',
    qualifier: '',
    steps: [
      [1e16, '京'],
      [1e12, '兆'],
      [1e8, '億'],
      [1e4, '萬'],
    ],
  },
};

const SUPERSCRIPTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

const toSuperscript = (n) =>
  String(n)
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] ?? ch)
    .join('');

// Fixed locale so tests are deterministic and separators do not shift with the
// machine running them.
const groups = new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 });

/** Round to a number of significant figures. */
export function toSignificantFigures(value, digits = DEFAULT_SIGNIFICANT_FIGURES) {
  if (value === 0 || !Number.isFinite(value)) return value;
  return Number(value.toPrecision(digits));
}

/** Decimal exponent, i.e. the n in `m × 10ⁿ`. */
export function exponentOf(value) {
  if (value === 0 || !Number.isFinite(value)) return 0;
  return Math.floor(Math.log10(Math.abs(value)));
}

/** `1.20 × 10¹²` */
export function scientific(value, digits = DEFAULT_SIGNIFICANT_FIGURES) {
  if (value === 0) return '0';
  if (!Number.isFinite(value)) return String(value);
  let exponent = exponentOf(value);
  let mantissa = Number((value / 10 ** exponent).toFixed(digits - 1));
  // toFixed can round 9.99 up to 10.00, which is no longer normalised.
  if (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  return `${mantissa.toFixed(digits - 1)} × 10${toSuperscript(exponent)}`;
}

/**
 * The primary result string: scientific outside the plain band, grouped
 * decimal inside it.
 */
export function primaryCount(value, digits = DEFAULT_SIGNIFICANT_FIGURES) {
  if (!Number.isFinite(value)) return String(value);
  const magnitude = Math.abs(value);
  if (value !== 0 && (magnitude < PLAIN_NOTATION_MIN || magnitude > PLAIN_NOTATION_MAX)) {
    return scientific(value, digits);
  }
  return groups.format(toSignificantFigures(value, digits));
}

/**
 * The secondary readable line, or null when there isn't a useful one.
 *
 * Omitted below 10⁶, where the primary result is already plain digits and a
 * readable line would only repeat it, and at or above 10¹⁸, where the words
 * stop informing anyone.
 */
export function readableCount(value, locale = 'en') {
  if (!Number.isFinite(value) || value < PLAIN_NOTATION_MAX || value >= READABLE_MAX) {
    return null;
  }
  const scale = SCALES[locale];
  if (scale === undefined) throw new RangeError(`Unknown locale "${locale}"`);

  const [factor, name] = scale.steps.find(([f]) => value >= f);
  const mantissa = toSignificantFigures(value / factor, DEFAULT_SIGNIFICANT_FIGURES);
  return `${groups.format(mantissa)}${scale.separator}${name}${scale.qualifier}`;
}

/**
 * Grouped decimal carrying exactly the decimals the uncertainty's place
 * implies. Without this, a lower bound of 0.00500 renders as "0.005" beside an
 * upper of "0.00547" and appears to carry fewer figures than it does.
 */
export function atPlace(value, place) {
  const decimals = Math.max(0, -place);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Round a value and its standard uncertainty so the value claims no more
 * precision than the uncertainty supports.
 *
 * The uncertainty is kept to `digits` significant figures and the value is
 * rounded to the same decimal place.
 */
export function roundToUncertainty(value, standardUncertainty, digits = 2) {
  if (!Number.isFinite(standardUncertainty) || standardUncertainty <= 0) {
    return { value, uncertainty: standardUncertainty, place: null };
  }
  const place = exponentOf(standardUncertainty) - (digits - 1);
  const step = 10 ** place;
  return {
    value: Math.round(value / step) * step,
    uncertainty: Math.round(standardUncertainty / step) * step,
    place,
  };
}

/**
 * `(3.01 ± 0.15) × 10⁸` — one shared exponent, so the reader compares the
 * mantissas directly instead of two powers of ten.
 */
export function countWithUncertainty(value, standardUncertainty, digits = 2) {
  const rounded = roundToUncertainty(value, standardUncertainty, digits);
  if (rounded.place === null) return primaryCount(value);

  const exponent = exponentOf(rounded.value || standardUncertainty);
  if (Math.abs(rounded.value) <= PLAIN_NOTATION_MAX) {
    return `${atPlace(rounded.value, rounded.place)} ± ${atPlace(
      rounded.uncertainty,
      rounded.place,
    )}`;
  }
  const decimals = Math.max(0, exponent - rounded.place);
  const mantissa = (rounded.value / 10 ** exponent).toFixed(decimals);
  const mantissaU = (rounded.uncertainty / 10 ** exponent).toFixed(decimals);
  return `(${mantissa} ± ${mantissaU}) × 10${toSuperscript(exponent)}`;
}

/** `97.0%` — probabilities keep one decimal until they get small. */
export function percent(fraction) {
  const value = fraction * 100;
  if (value === 0) return '0%';
  if (value < 0.01) return `<0.01%`;
  const decimals = value < 1 ? 2 : 1;
  return `${value.toFixed(decimals)}%`;
}
