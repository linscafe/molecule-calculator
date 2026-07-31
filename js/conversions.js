// Unit tables and conversion helpers.
//
// No DOM access anywhere in this file — it must stay importable by both the
// browser and `node --test` (ADR-0002).
//
// Unit keys are ASCII so they survive URLs, form values and test names; the
// `label` carries the character a human should see.

export const LENGTH_UNITS = {
  m: { label: 'm', toMetres: 1 },
  cm: { label: 'cm', toMetres: 1e-2 },
  mm: { label: 'mm', toMetres: 1e-3 },
  um: { label: 'µm', toMetres: 1e-6 },
  nm: { label: 'nm', toMetres: 1e-9 },
};

// Litres, not cubic metres, because every concentration unit is per-litre and
// converting once here saves converting on every calculation path.
//
// Three of these pairs are the same scale by definition, not by approximation:
// mL/cm3, uL/mm3 and fL/um3. Ten entries, seven distinct scales. Both spellings
// are kept because a chemist reaches for µL and an engineer for mm³.
export const VOLUME_UNITS = {
  L: { label: 'L', toLitres: 1 },
  mL: { label: 'mL', toLitres: 1e-3 },
  uL: { label: 'µL', toLitres: 1e-6 },
  nL: { label: 'nL', toLitres: 1e-9 },
  pL: { label: 'pL', toLitres: 1e-12 },
  fL: { label: 'fL', toLitres: 1e-15 },
  m3: { label: 'm³', toLitres: 1e3 },
  cm3: { label: 'cm³', toLitres: 1e-3 },
  mm3: { label: 'mm³', toLitres: 1e-6 },
  um3: { label: 'µm³', toLitres: 1e-15 },
};

export const MOLAR_UNITS = {
  M: { label: 'M', toMolPerLitre: 1 },
  mM: { label: 'mM', toMolPerLitre: 1e-3 },
  uM: { label: 'µM', toMolPerLitre: 1e-6 },
  nM: { label: 'nM', toMolPerLitre: 1e-9 },
  pM: { label: 'pM', toMolPerLitre: 1e-12 },
  fM: { label: 'fM', toMolPerLitre: 1e-15 },
};

export const MASS_CONCENTRATION_UNITS = {
  'g/L': { label: 'g/L', toGramsPerLitre: 1 },
  'mg/mL': { label: 'mg/mL', toGramsPerLitre: 1 },
  'ug/mL': { label: 'µg/mL', toGramsPerLitre: 1e-3 },
  'ng/mL': { label: 'ng/mL', toGramsPerLitre: 1e-6 },
  'g/m3': { label: 'g/m³', toGramsPerLitre: 1e-3 },
};

export const MOLECULAR_WEIGHT_UNITS = {
  'g/mol': { label: 'g/mol', toGramsPerMole: 1 },
  kDa: { label: 'kDa', toGramsPerMole: 1e3 },
};

function convert(value, unit, table, field) {
  const entry = table[unit];
  if (entry === undefined) {
    throw new RangeError(`Unknown unit "${unit}"`);
  }
  return value * entry[field];
}

export const toMetres = (value, unit) =>
  convert(value, unit, LENGTH_UNITS, 'toMetres');

export const toLitres = (value, unit) =>
  convert(value, unit, VOLUME_UNITS, 'toLitres');

export const toMolPerLitre = (value, unit) =>
  convert(value, unit, MOLAR_UNITS, 'toMolPerLitre');

export const toGramsPerLitre = (value, unit) =>
  convert(value, unit, MASS_CONCENTRATION_UNITS, 'toGramsPerLitre');

export const toGramsPerMole = (value, unit) =>
  convert(value, unit, MOLECULAR_WEIGHT_UNITS, 'toGramsPerMole');

/**
 * Volume of a cuboid channel, in litres, from three lengths in metres.
 * 1 m³ is exactly 1000 L.
 */
export function litresFromMetres(height, width, length) {
  return height * width * length * 1e3;
}

/**
 * True when two volume units denote the same scale (mL and cm³, µL and mm³,
 * fL and µm³). The calculation breakdown uses this to state an equivalence
 * instead of printing a no-op conversion line.
 */
export function areEquivalentVolumeUnits(a, b) {
  const left = VOLUME_UNITS[a];
  const right = VOLUME_UNITS[b];
  if (left === undefined || right === undefined) {
    throw new RangeError(`Unknown volume unit "${left ? b : a}"`);
  }
  return left.toLitres === right.toLitres;
}

/** The other volume units sharing a unit's scale, if any. */
export function equivalentVolumeUnits(unit) {
  return Object.keys(VOLUME_UNITS).filter(
    (other) => other !== unit && areEquivalentVolumeUnits(unit, other),
  );
}
