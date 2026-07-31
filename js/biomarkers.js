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
    short: 'CRP',
    zhTW: {
      short: 'CRP',
      analyte: 'C反應蛋白（CRP）',
      form: '五聚體，循環型',
      why: '在血清中幾乎全以五聚體形式存在，單體實質上不存在於血清中。',
    },
    analyte: 'C-reactive protein (CRP)',
    form: 'Pentamer, circulating',
    gramsPerMole: 115000,
    recommended: true,
    why: 'Circulates almost entirely as the pentraxin pentamer; the monomer is essentially absent from serum.',
    accession: 'P02741',
  },
  {
    id: 'crp-monomer',
    short: 'CRP',
    zhTW: {
      short: 'CRP',
      analyte: 'C反應蛋白（CRP）',
      form: '單體',
      why: '解離後的單體形式，出現在發炎部位，而非血清整體中。',
    },
    analyte: 'C-reactive protein (CRP)',
    form: 'Monomer',
    gramsPerMole: 23000,
    recommended: false,
    why: 'Dissociated monomeric form, found at sites of inflammation rather than in bulk serum.',
    accession: 'P02741',
  },
  {
    id: 'troponin-tic',
    short: 'cTn',
    zhTW: {
      short: '心肌旋轉蛋白',
      analyte: '心肌旋轉蛋白',
      form: 'T–I–C 三元複合體',
      why: '心肌受損後以完整複合體的形式釋入血液。',
    },
    analyte: 'Cardiac troponin',
    form: 'T–I–C ternary complex',
    gramsPerMole: 77000,
    recommended: true,
    why: 'Released into the blood as the intact complex after myocardial injury.',
    accession: 'P19429 + P45379 + P63316',
  },
  {
    id: 'troponin-i',
    short: 'cTn',
    zhTW: {
      short: '心肌旋轉蛋白',
      analyte: '心肌旋轉蛋白',
      form: '游離 cTnI',
      why: '單一次單元，僅在檢驗專一針對游離 cTnI 時適用。',
    },
    analyte: 'Cardiac troponin',
    form: 'Free cTnI',
    gramsPerMole: 24000,
    recommended: false,
    why: 'The isolated subunit — appropriate only when the assay is specific to free cTnI.',
    accession: 'P19429',
  },
  {
    id: 'psa-act',
    short: 'PSA',
    zhTW: {
      short: 'PSA',
      analyte: '攝護腺特異抗原（PSA）',
      form: 'PSA–ACT 複合體',
      why: '血清中大部分的 PSA 與 α1-抗胰凝乳蛋白酶結合。',
    },
    analyte: 'Prostate-specific antigen (PSA)',
    form: 'PSA–ACT complex',
    gramsPerMole: 90000,
    recommended: true,
    why: 'The majority of serum PSA is bound to α1-antichymotrypsin.',
    accession: 'P07288 + P01011',
  },
  {
    id: 'psa-free',
    short: 'PSA',
    zhTW: {
      short: 'PSA',
      analyte: '攝護腺特異抗原（PSA）',
      form: '游離 PSA',
      why: '未結合的部分，適用於專門量測游離 PSA 時。',
    },
    analyte: 'Prostate-specific antigen (PSA)',
    form: 'Free PSA',
    gramsPerMole: 28400,
    recommended: false,
    why: 'The unbound fraction — appropriate when free PSA is being measured specifically.',
    accession: 'P07288',
  },
  {
    id: 'insulin-mature',
    short: 'Insulin',
    zhTW: {
      short: '胰島素',
      analyte: '胰島素',
      form: '成熟胰島素',
      why: '實際在血液中循環的荷爾蒙。',
    },
    analyte: 'Insulin',
    form: 'Mature insulin',
    gramsPerMole: 5808,
    recommended: true,
    why: 'The circulating hormone.',
    accession: 'P01308',
  },
  {
    id: 'proinsulin',
    short: 'Insulin',
    zhTW: {
      short: '胰島素',
      analyte: '胰島素',
      form: '胰島素原',
      why: '前驅胜肽，在循環中僅佔免疫反應性胰島素的一小部分。',
    },
    analyte: 'Insulin',
    form: 'Proinsulin',
    gramsPerMole: 9390,
    recommended: false,
    why: 'Precursor peptide; a minor fraction of circulating immunoreactive insulin.',
    accession: 'P01308',
  },
  {
    id: 'tnf-trimer',
    short: 'TNF-α',
    zhTW: {
      short: 'TNF-α',
      analyte: '腫瘤壞死因子-α（TNF-α）',
      form: '可溶性同源三聚體',
      why: '具生物活性的形式為三聚體。',
    },
    analyte: 'TNF-α',
    form: 'Soluble homotrimer',
    gramsPerMole: 52000,
    recommended: true,
    why: 'The bioactive form is the trimer.',
    accession: 'P01375',
  },
  {
    id: 'tnf-monomer',
    short: 'TNF-α',
    zhTW: {
      short: 'TNF-α',
      analyte: '腫瘤壞死因子-α（TNF-α）',
      form: '單體',
      why: '單一次單元，並非與受體結合的形式。',
    },
    analyte: 'TNF-α',
    form: 'Monomer',
    gramsPerMole: 17400,
    recommended: false,
    why: 'Single subunit; not the form that binds receptor.',
    accession: 'P01375',
  },
  {
    id: 'haemoglobin-tetramer',
    short: 'HbA',
    zhTW: {
      short: '血紅素 A',
      analyte: '血紅素 A',
      form: 'α₂β₂ 四聚體',
      why: '紅血球中具功能的四聚體形式。',
    },
    analyte: 'Haemoglobin A',
    form: 'α₂β₂ tetramer',
    gramsPerMole: 64500,
    recommended: true,
    why: 'The functional tetramer as found in erythrocytes.',
    accession: 'P69905 + P68871',
  },
  {
    id: 'haemoglobin-beta',
    short: 'HbA',
    zhTW: {
      short: '血紅素 A',
      analyte: '血紅素 A',
      form: 'β 次單元',
      why: '單一條血紅素鏈。',
    },
    analyte: 'Haemoglobin A',
    form: 'β subunit',
    gramsPerMole: 15900,
    recommended: false,
    why: 'A single globin chain.',
    accession: 'P68871',
  },
  {
    id: 'igg',
    short: 'IgG',
    zhTW: {
      short: 'IgG',
      analyte: '免疫球蛋白 G（IgG）',
      form: '完整抗體',
      why: '完整的免疫球蛋白，即血清中所量測的形式。',
    },
    analyte: 'Immunoglobulin G (IgG)',
    form: 'Whole antibody',
    gramsPerMole: 150000,
    recommended: true,
    why: 'Intact immunoglobulin, the form measured in serum.',
    accession: 'P01857',
  },
  {
    id: 'albumin-hsa',
    short: 'HSA',
    zhTW: {
      short: '人類血清白蛋白',
      analyte: '人類血清白蛋白',
      form: '成熟 HSA',
      why: '循環中僅有單一形式，不存在歧義。',
    },
    analyte: 'Human serum albumin',
    form: 'Mature HSA',
    gramsPerMole: 66437,
    recommended: true,
    why: 'Single circulating form; no ambiguity.',
    accession: 'P02768',
  },
  {
    id: 'il6',
    short: 'IL-6',
    zhTW: {
      short: 'IL-6',
      analyte: '介白素-6（IL-6）',
      form: '成熟單體',
      why: '以單體形式作用，醣化會使表觀分子量略為提高。',
    },
    analyte: 'Interleukin-6 (IL-6)',
    form: 'Mature monomer',
    gramsPerMole: 21000,
    recommended: true,
    why: 'Acts as a monomer; glycosylation raises the apparent mass somewhat.',
    accession: 'P05231',
  },
  {
    id: 'fibrinogen',
    short: 'Fibrinogen',
    zhTW: {
      short: '纖維蛋白原',
      analyte: '纖維蛋白原',
      form: '六聚體（Aα₂Bβ₂γ₂）',
      why: '在循環中僅以組裝完成的六聚體存在。',
    },
    analyte: 'Fibrinogen',
    form: 'Hexamer (Aα₂Bβ₂γ₂)',
    gramsPerMole: 340000,
    recommended: true,
    why: 'Circulates only as the assembled hexamer.',
    accession: 'P02671 + P02675 + P02679',
  },
  {
    id: 'thyroglobulin',
    short: 'Tg',
    zhTW: {
      short: '甲狀腺球蛋白',
      analyte: '甲狀腺球蛋白',
      form: '二聚體',
      why: '以二聚體的形式分泌並量測。',
    },
    analyte: 'Thyroglobulin',
    form: 'Dimer',
    gramsPerMole: 660000,
    recommended: true,
    why: 'Secreted and measured as the dimer.',
    accession: 'P01266',
  },
  {
    id: 'bsa',
    short: 'BSA',
    zhTW: {
      short: 'BSA',
      analyte: '牛血清白蛋白（BSA）',
      form: '成熟 BSA',
      why: '常用的阻斷與校正蛋白，僅有單一形式。',
    },
    analyte: 'Bovine serum albumin (BSA)',
    form: 'Mature BSA',
    gramsPerMole: 66433,
    recommended: true,
    why: 'Standard blocking and calibration protein; single form.',
    accession: 'P02769',
  },
  {
    id: 'glucose',
    short: 'Glucose',
    zhTW: {
      short: '葡萄糖',
      analyte: '葡萄糖',
      form: 'C₆H₁₂O₆',
      why: '小分子，具確定的化學式質量，無寡聚體歧義。',
    },
    analyte: 'Glucose',
    form: 'C₆H₁₂O₆',
    gramsPerMole: 180.156,
    recommended: true,
    why: 'Small molecule with an exact formula mass; no oligomeric ambiguity.',
    accession: null,
  },
  {
    id: 'cortisol',
    short: 'Cortisol',
    zhTW: {
      short: '皮質醇',
      analyte: '皮質醇',
      form: 'C₂₁H₃₀O₅',
      why: '小分子，具確定的化學式質量，無寡聚體歧義。',
    },
    analyte: 'Cortisol',
    form: 'C₂₁H₃₀O₅',
    gramsPerMole: 362.46,
    recommended: true,
    why: 'Small molecule with an exact formula mass; no oligomeric ambiguity.',
    accession: null,
  },
];

/**
 * A biomarker's fields in the active locale, falling back to English. The
 * molecular form is part of the entry's identity (ADR-0003), so it is
 * translated with it rather than left in English beside a translated name.
 */
export function localised(entry, locale = 'en') {
  const translation = locale === 'en' ? null : entry[locale.replace('-', '')];
  return {
    analyte: translation?.analyte ?? entry.analyte,
    // Short name so an option can lead with the molecule: "CRP Pentamer,
    // circulating — 115 kDa". Latin abbreviations stay Latin in Chinese —
    // CRP is written CRP in a Taiwanese lab report.
    short: translation?.short ?? entry.short,
    form: translation?.form ?? entry.form,
    why: translation?.why ?? entry.why,
  };
}

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
