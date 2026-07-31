// Curated molecular weights, qualified by molecular form (ADR-0003).
//
// READ THIS BEFORE EDITING. Entries that look like duplicates are not
// duplicates: "CRP (pentamer)" and "CRP (monomer)" differ by 4.6x, and
// consolidating them into one "CRP" row would silently produce results that
// are wrong by that factor while every displayed calculation step still looked
// correct. Where a biomarker has more than one form in common use, the form
// actually present in the physiological matrix is marked `recommended` and
// carries the reason.
//
// Masses are for the intact species named, including glycosylation where the
// circulating form is glycosylated, so they will not always match the
// per-chain sequence mass in UniProt.
//
// No DOM (ADR-0002).

export const BIOMARKERS = [
  {
    id: 'crp-pentamer',
    analyte: 'C-reactive protein (CRP)',
    form: 'Pentamer, circulating',
    gramsPerMole: 115000,
    recommended: true,
    why: 'Circulates almost entirely as the pentraxin pentamer; the monomer is essentially absent from serum.',
    accession: 'P02741',
  },
  {
    id: 'crp-monomer',
    analyte: 'C-reactive protein (CRP)',
    form: 'Monomer',
    gramsPerMole: 23000,
    recommended: false,
    why: 'Dissociated monomeric form, found at sites of inflammation rather than in bulk serum.',
    accession: 'P02741',
  },
  {
    id: 'troponin-tic',
    analyte: 'Cardiac troponin',
    form: 'T–I–C ternary complex',
    gramsPerMole: 77000,
    recommended: true,
    why: 'Released into the blood as the intact complex after myocardial injury.',
    accession: 'P19429 + P45379 + P63316',
  },
  {
    id: 'troponin-i',
    analyte: 'Cardiac troponin',
    form: 'Free cTnI',
    gramsPerMole: 24000,
    recommended: false,
    why: 'The isolated subunit — appropriate only when the assay is specific to free cTnI.',
    accession: 'P19429',
  },
  {
    id: 'psa-act',
    analyte: 'Prostate-specific antigen (PSA)',
    form: 'PSA–ACT complex',
    gramsPerMole: 90000,
    recommended: true,
    why: 'The majority of serum PSA is bound to α1-antichymotrypsin.',
    accession: 'P07288 + P01011',
  },
  {
    id: 'psa-free',
    analyte: 'Prostate-specific antigen (PSA)',
    form: 'Free PSA',
    gramsPerMole: 28400,
    recommended: false,
    why: 'The unbound fraction — appropriate when free PSA is being measured specifically.',
    accession: 'P07288',
  },
  {
    id: 'insulin-mature',
    analyte: 'Insulin',
    form: 'Mature insulin',
    gramsPerMole: 5808,
    recommended: true,
    why: 'The circulating hormone.',
    accession: 'P01308',
  },
  {
    id: 'proinsulin',
    analyte: 'Insulin',
    form: 'Proinsulin',
    gramsPerMole: 9390,
    recommended: false,
    why: 'Precursor peptide; a minor fraction of circulating immunoreactive insulin.',
    accession: 'P01308',
  },
  {
    id: 'tnf-trimer',
    analyte: 'TNF-α',
    form: 'Soluble homotrimer',
    gramsPerMole: 52000,
    recommended: true,
    why: 'The bioactive form is the trimer.',
    accession: 'P01375',
  },
  {
    id: 'tnf-monomer',
    analyte: 'TNF-α',
    form: 'Monomer',
    gramsPerMole: 17400,
    recommended: false,
    why: 'Single subunit; not the form that binds receptor.',
    accession: 'P01375',
  },
  {
    id: 'haemoglobin-tetramer',
    analyte: 'Haemoglobin A',
    form: 'α₂β₂ tetramer',
    gramsPerMole: 64500,
    recommended: true,
    why: 'The functional tetramer as found in erythrocytes.',
    accession: 'P69905 + P68871',
  },
  {
    id: 'haemoglobin-beta',
    analyte: 'Haemoglobin A',
    form: 'β subunit',
    gramsPerMole: 15900,
    recommended: false,
    why: 'A single globin chain.',
    accession: 'P68871',
  },
  {
    id: 'igg',
    analyte: 'Immunoglobulin G (IgG)',
    form: 'Whole antibody',
    gramsPerMole: 150000,
    recommended: true,
    why: 'Intact immunoglobulin, the form measured in serum.',
    accession: 'P01857',
  },
  {
    id: 'albumin-hsa',
    analyte: 'Human serum albumin',
    form: 'Mature HSA',
    gramsPerMole: 66437,
    recommended: true,
    why: 'Single circulating form; no ambiguity.',
    accession: 'P02768',
  },
  {
    id: 'il6',
    analyte: 'Interleukin-6 (IL-6)',
    form: 'Mature monomer',
    gramsPerMole: 21000,
    recommended: true,
    why: 'Acts as a monomer; glycosylation raises the apparent mass somewhat.',
    accession: 'P05231',
  },
  {
    id: 'fibrinogen',
    analyte: 'Fibrinogen',
    form: 'Hexamer (Aα₂Bβ₂γ₂)',
    gramsPerMole: 340000,
    recommended: true,
    why: 'Circulates only as the assembled hexamer.',
    accession: 'P02671 + P02675 + P02679',
  },
  {
    id: 'thyroglobulin',
    analyte: 'Thyroglobulin',
    form: 'Dimer',
    gramsPerMole: 660000,
    recommended: true,
    why: 'Secreted and measured as the dimer.',
    accession: 'P01266',
  },
  {
    id: 'bsa',
    analyte: 'Bovine serum albumin (BSA)',
    form: 'Mature BSA',
    gramsPerMole: 66433,
    recommended: true,
    why: 'Standard blocking and calibration protein; single form.',
    accession: 'P02769',
  },
  {
    id: 'glucose',
    analyte: 'Glucose',
    form: 'C₆H₁₂O₆',
    gramsPerMole: 180.156,
    recommended: true,
    why: 'Small molecule with an exact formula mass; no oligomeric ambiguity.',
    accession: null,
  },
  {
    id: 'cortisol',
    analyte: 'Cortisol',
    form: 'C₂₁H₃₀O₅',
    gramsPerMole: 362.46,
    recommended: true,
    why: 'Small molecule with an exact formula mass; no oligomeric ambiguity.',
    accession: null,
  },
];

/** Analyte names in list order, for building option groups. */
export function analytes() {
  return [...new Set(BIOMARKERS.map((b) => b.analyte))];
}

export function formsFor(analyte) {
  return BIOMARKERS.filter((b) => b.analyte === analyte);
}

export function findBiomarker(id) {
  return BIOMARKERS.find((b) => b.id === id) ?? null;
}

/** True when the analyte has more than one form the user must choose between. */
export function isAmbiguous(analyte) {
  return formsFor(analyte).length > 1;
}
