// Every user-facing string, in both locales.
//
// The calculation modules never build a sentence — they return codes, and the
// text is chosen here. That is what makes a second locale a data change rather
// than a rewrite, and it is why validation.js hands back `{ field, code }`
// instead of an English message.
//
// No DOM (ADR-0002).

export const LOCALES = ['en', 'zh-TW'];
export const DEFAULT_LOCALE = 'en';

const STRINGS = {
  en: {
    'lang.en': 'English',
    'lang.zh-TW': '繁體中文',
    'lang.aria': 'Interface language',

    'app.title': 'Number of Molecules Calculator',
    'app.subtitle': 'Estimate how many molecules are present in a given volume.',

    'section.inputs': 'Inputs',
    'group.volume': 'Sample volume',
    'group.concentration': 'Concentration',
    'group.molecularWeight': 'Molecular weight',
    'group.uncertainty': 'Uncertainty',

    'mode.aria': 'How to specify the volume',
    'mode.dimensions': 'Calculate from dimensions',
    'mode.volume': 'Enter volume directly',

    'field.height': 'Height',
    'field.width': 'Width',
    'field.length': 'Length',
    'field.volume': 'Volume',
    'field.concentration': 'Concentration',
    'field.molecularWeight': 'Molecular weight',

    'unit.height': 'Height unit',
    'unit.width': 'Width unit',
    'unit.length': 'Length unit',
    'unit.volume': 'Volume unit',
    'unit.concentration': 'Concentration unit',
    'unit.molecularWeight': 'Molecular weight unit',

    'placeholder.height': 'e.g. 100',
    'placeholder.width': 'e.g. 50',
    'placeholder.length': 'e.g. 10',
    'placeholder.volume': 'e.g. 5',
    'placeholder.concentration': 'e.g. 10',
    'placeholder.molecularWeight': 'e.g. 150,000',
    'placeholder.uncertaintyDimension': 'e.g. 2',
    'placeholder.uncertaintyConcentration': 'e.g. 5',

    'label.concentrationType': 'Concentration type',
    'conc.molar': 'Molar concentration',
    'conc.mass': 'Mass concentration',

    'mw.note':
      'Molecular weight is needed only when concentration is expressed as mass per volume, such as ng/mL.',
    'mw.biomarker': 'Common biomarker',
    'mw.custom': 'Custom / not listed',
    'mw.recommended': 'recommended',

    'uncertainty.enable': 'Include input uncertainty',
    'uncertainty.note': 'Leave any field blank to treat that input as exact.',
    'uncertainty.preset':
      'Fill a typical laboratory estimate (an assumption, not a measurement)',
    'uncertainty.height': 'Height uncertainty',
    'uncertainty.width': 'Width uncertainty',
    'uncertainty.length': 'Length uncertainty',
    'uncertainty.volume': 'Volume uncertainty',
    'uncertainty.concentration': 'Concentration uncertainty',
    'uncertainty.molecularWeight': 'Molecular-weight uncertainty',
    'kind.percent': '%',
    'kind.absolute': 'absolute',
    'kind.aria': '{label} kind',

    'action.reset': 'Reset',
    'action.copy': 'Copy result',
    'copy.done': 'Copied.',
    'copy.failed': 'Could not copy.',
    'copy.nothing': 'Nothing to copy yet.',

    'result.heading': 'Number of molecules',
    'result.molecules': 'molecules',
    'result.empty': '—',
    'result.approximately': 'Approximately {value}',
    'result.withheld': 'No result yet: {reason}',

    'error.required': '{label} is required.',
    'error.notNumber': '{label} must be a number.',
    'error.negative': '{label} cannot be negative.',
    'error.zero': '{label} must be greater than zero.',

    'warn.sub-atomic-dimension':
      'One or more dimensions are smaller than a single atom — check the unit selector.',
    'warn.implausible-concentration':
      'This concentration exceeds any realistic solution. For reference, pure water is 55.5 M and saturated NaCl is about 6.1 M.',
    'warn.below-one-molecule':
      'The expected count is below one. In a real sample, some equivalent volumes may contain zero molecules and others may contain one or more.',

    'occupancy.heading': 'In equivalent volumes:',
    'occupancy.zero': 'contain 0 molecules',
    'occupancy.one': 'contain 1',
    'occupancy.twoOrMore': 'contain 2 or more',
    'occupancy.note':
      'Assumes molecules are randomly and independently distributed (Poisson).',

    'interval.heading': 'Estimated uncertainty interval',
    'interval.range': '{lower} to {upper} molecules',
    'interval.relative':
      'Combined relative uncertainty: {percent} (k = 2, approximately 95% coverage).',
    'interval.linearity':
      'Relative uncertainty is {percent}. At this magnitude the linear approximation is unreliable; treat the interval as indicative only.',
    'interval.clamped':
      'The interval is truncated at zero. A molecule count cannot be negative.',
    'interval.explanation':
      'This interval describes how much the estimated molecule count could vary because the inputs are uncertain. It is not a guarantee that the true value falls inside the range. The estimate assumes the input errors are independent and approximately normally distributed.',
    'assumptions.heading': 'Assumptions',
    'assumptions.uniform': 'Molecules are uniformly distributed in the volume',
    'assumptions.free': 'Concentration represents freely available molecules',
    'assumptions.independent': 'Input uncertainties are independent',
    'assumptions.interval':
      'The reported interval is an approximate 95% uncertainty interval',

    'breakdown.summary': 'Calculation details',
    'step.dimensions': 'Dimensions entered',
    'step.volumeConverted': 'Converted volume',
    'step.volume': 'Volume',
    'step.concentration': 'Concentration',
    'step.massConcentration': 'Mass concentration',
    'step.molecularWeight': 'Molecular weight',
    'step.amount': 'Amount of substance',
    'step.molecules': 'Number of molecules',
    'breakdown.volumeEntered': 'Volume entered = {value}',
    'breakdown.equivalence': '{unit} is exactly {others}',
    'breakdown.from': 'From {analyte} — {form}',
    'breakdown.calculation': 'Calculation',
    'volume.equivalence': '1 {unit} is exactly 1 {others}.',

    'footer.source': 'Source on GitHub',
    'warnings.heading': 'Warnings',
    'occupancy.title': 'Occupancy',
  },

  'zh-TW': {
    'lang.en': 'English',
    'lang.zh-TW': '繁體中文',
    'lang.aria': '介面語言',

    'app.title': '分子數量計算機',
    'app.subtitle': '估算給定體積中約含有多少個分子。',

    'section.inputs': '輸入',
    'group.volume': '樣品體積',
    'group.concentration': '濃度',
    'group.molecularWeight': '分子量',
    'group.uncertainty': '不確定度',

    'mode.aria': '體積的指定方式',
    'mode.dimensions': '由尺寸計算',
    'mode.volume': '直接輸入體積',

    'field.height': '高度',
    'field.width': '寬度',
    'field.length': '長度',
    'field.volume': '體積',
    'field.concentration': '濃度',
    'field.molecularWeight': '分子量',

    'unit.height': '高度單位',
    'unit.width': '寬度單位',
    'unit.length': '長度單位',
    'unit.volume': '體積單位',
    'unit.concentration': '濃度單位',
    'unit.molecularWeight': '分子量單位',

    'placeholder.height': '例如 100',
    'placeholder.width': '例如 50',
    'placeholder.length': '例如 10',
    'placeholder.volume': '例如 5',
    'placeholder.concentration': '例如 10',
    'placeholder.molecularWeight': '例如 150,000',
    'placeholder.uncertaintyDimension': '例如 2',
    'placeholder.uncertaintyConcentration': '例如 5',

    'label.concentrationType': '濃度類型',
    'conc.molar': '莫耳濃度',
    'conc.mass': '質量濃度',

    'mw.note':
      '只有當濃度以每單位體積的質量表示（例如 ng/mL）時，才需要分子量。',
    'mw.biomarker': '常見生物標記',
    'mw.custom': '自訂／未列出',
    'mw.recommended': '建議',

    'uncertainty.enable': '納入輸入不確定度',
    'uncertainty.note': '任一欄位留白，即視為該輸入為精確值。',
    'uncertainty.preset': '填入典型實驗室估計值（此為假設，並非量測結果）',
    'uncertainty.height': '高度不確定度',
    'uncertainty.width': '寬度不確定度',
    'uncertainty.length': '長度不確定度',
    'uncertainty.volume': '體積不確定度',
    'uncertainty.concentration': '濃度不確定度',
    'uncertainty.molecularWeight': '分子量不確定度',
    'kind.percent': '%',
    'kind.absolute': '絕對值',
    'kind.aria': '{label}的表示方式',

    'action.reset': '重設',
    'action.copy': '複製結果',
    'copy.done': '已複製。',
    'copy.failed': '無法複製。',
    'copy.nothing': '目前沒有可複製的結果。',

    'result.heading': '分子數量',
    'result.molecules': '個分子',
    'result.empty': '—',
    'result.approximately': '約 {value}',
    'result.withheld': '尚無結果：{reason}',

    'error.required': '請填寫{label}。',
    'error.notNumber': '{label}必須是數字。',
    'error.negative': '{label}不可為負值。',
    'error.zero': '{label}必須大於零。',

    'warn.sub-atomic-dimension':
      '有一個以上的尺寸小於單一原子，請檢查單位選擇是否正確。',
    'warn.implausible-concentration':
      '此濃度超出任何實際溶液的範圍。作為參考，純水為 55.5 M，飽和食鹽水約為 6.1 M。',
    'warn.below-one-molecule':
      '預期數量小於一。在真實樣品中，部分相同體積可能不含任何分子，另一些則可能含有一個以上。',

    'occupancy.heading': '在相同體積的樣品中：',
    'occupancy.zero': '不含任何分子',
    'occupancy.one': '含 1 個分子',
    'occupancy.twoOrMore': '含 2 個以上分子',
    'occupancy.note': '此處假設分子在體積中隨機且獨立分布（卜瓦松分布）。',

    'interval.heading': '估計不確定區間',
    'interval.range': '{lower} 至 {upper} 個分子',
    'interval.relative':
      '合併相對不確定度：{percent}（k = 2，涵蓋率約 95%）。',
    'interval.linearity':
      '相對不確定度為 {percent}。在此量級下線性近似並不可靠，此區間僅供參考。',
    'interval.clamped': '此區間已截斷於零。分子數量不可能為負值。',
    'interval.explanation':
      '此區間描述的是：由於輸入值本身存在不確定度，估計的分子數量可能有多大的變動範圍。它並不保證真實值必定落在此範圍內。此估計假設各項輸入誤差彼此獨立，且近似常態分布。',
    'assumptions.heading': '假設',
    'assumptions.uniform': '分子在體積中均勻分布',
    'assumptions.free': '濃度代表可自由取得的分子',
    'assumptions.independent': '各項輸入不確定度彼此獨立',
    'assumptions.interval': '所報告的區間為約 95% 的不確定區間',

    'breakdown.summary': '計算細節',
    'step.dimensions': '輸入的尺寸',
    'step.volumeConverted': '換算後的體積',
    'step.volume': '體積',
    'step.concentration': '濃度',
    'step.massConcentration': '質量濃度',
    'step.molecularWeight': '分子量',
    'step.amount': '物質的量',
    'step.molecules': '分子數量',
    'breakdown.volumeEntered': '輸入體積 = {value}',
    'breakdown.equivalence': '{unit} 恰等於 {others}',
    'breakdown.from': '來源：{analyte} — {form}',
    'breakdown.calculation': '計算過程',
    'volume.equivalence': '1 {unit} 恰等於 1 {others}。',

    'footer.source': 'GitHub 原始碼',
    'warnings.heading': '警告',
    'occupancy.title': '佔據機率',
  },
};

let current = DEFAULT_LOCALE;

export function setLocale(locale) {
  if (!LOCALES.includes(locale)) {
    throw new RangeError(`Unknown locale "${locale}"`);
  }
  current = locale;
}

export const getLocale = () => current;

/**
 * Look up a string and substitute {named} parameters.
 * Missing keys throw rather than rendering "undefined" into the page — a
 * missing translation is a bug, and silence is how it ships.
 */
export function t(key, params = {}, locale = current) {
  const template = STRINGS[locale]?.[key];
  if (template === undefined) {
    throw new RangeError(`Missing string "${key}" for locale "${locale}"`);
  }
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/** Exposed for the test that proves the locales have not drifted apart. */
export const keysFor = (locale) => Object.keys(STRINGS[locale]);
