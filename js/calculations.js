// The science. Pure functions only — no DOM (ADR-0002).
//
// Every input to this module is already in SI-consistent units: litres,
// mol/L, g/L, g/mol. Converting is `conversions.js`'s job, so that a reviewer
// checking the chemistry here never has to think about unit prefixes.

/**
 * The Avogadro constant. Exact by definition since the 2019 SI redefinition —
 * this is a defined value, not a measurement, so it contributes no uncertainty.
 */
export const AVOGADRO = 6.02214076e23;

/** Below this expected count, the mean stops being a useful answer on its own. */
export const OCCUPANCY_THRESHOLD = 10;

/** Amount of substance, in moles, from molar concentration and volume. */
export function amountOfSubstanceFromMolar(molPerLitre, volumeLitres) {
  return molPerLitre * volumeLitres;
}

/** Amount of substance, in moles, from mass concentration, volume and MW. */
export function amountOfSubstanceFromMass(
  gramsPerLitre,
  volumeLitres,
  gramsPerMole,
) {
  return (gramsPerLitre * volumeLitres) / gramsPerMole;
}

/** Molecules from an amount of substance in moles. */
export function moleculesFromAmount(mol) {
  return mol * AVOGADRO;
}

/**
 * The molar concentration a mass concentration corresponds to.
 * Used by the plausibility check, so that the "exceeds any realistic solution"
 * warning applies to mass-concentration input too rather than only to molar.
 */
export function molarFromMassConcentration(gramsPerLitre, gramsPerMole) {
  return gramsPerLitre / gramsPerMole;
}

/**
 * Probability that a volume with this expected count contains exactly k
 * molecules, assuming molecules are randomly and independently distributed.
 *
 * Computed in log space so the factorial cannot overflow before the
 * exponential underflows.
 */
export function poissonProbability(k, mean) {
  if (mean < 0) throw new RangeError('mean must not be negative');
  if (mean === 0) return k === 0 ? 1 : 0;
  let logFactorial = 0;
  for (let i = 2; i <= k; i += 1) logFactorial += Math.log(i);
  return Math.exp(-mean + k * Math.log(mean) - logFactorial);
}

/**
 * The occupancy breakdown shown when the expected count is small.
 * Returns null above OCCUPANCY_THRESHOLD, where P(0) is negligible and the
 * mean is a fair summary on its own.
 */
export function occupancyProbabilities(mean) {
  if (mean >= OCCUPANCY_THRESHOLD) return null;
  const zero = poissonProbability(0, mean);
  const one = poissonProbability(1, mean);
  // Subtracting rather than summing a tail keeps the three shares at exactly 1,
  // and clamps the rounding noise that would otherwise show as a tiny negative.
  const twoOrMore = Math.max(0, 1 - zero - one);
  return { zero, one, twoOrMore };
}

/**
 * Full molar-concentration result.
 * @returns {{molPerLitre: number, volumeLitres: number,
 *            amountOfSubstanceMol: number, moleculeCount: number}}
 */
export function calculateFromMolar({ molPerLitre, volumeLitres }) {
  const amountOfSubstanceMol = amountOfSubstanceFromMolar(
    molPerLitre,
    volumeLitres,
  );
  return {
    molPerLitre,
    volumeLitres,
    amountOfSubstanceMol,
    moleculeCount: moleculesFromAmount(amountOfSubstanceMol),
  };
}

/**
 * Full mass-concentration result. Carries the equivalent molarity so the
 * breakdown can show the mass -> moles step that makes the molecular weight
 * necessary in the first place.
 */
export function calculateFromMass({
  gramsPerLitre,
  volumeLitres,
  gramsPerMole,
}) {
  const amountOfSubstanceMol = amountOfSubstanceFromMass(
    gramsPerLitre,
    volumeLitres,
    gramsPerMole,
  );
  return {
    gramsPerLitre,
    volumeLitres,
    gramsPerMole,
    molPerLitre: molarFromMassConcentration(gramsPerLitre, gramsPerMole),
    amountOfSubstanceMol,
    moleculeCount: moleculesFromAmount(amountOfSubstanceMol),
  };
}
