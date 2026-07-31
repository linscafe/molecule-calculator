# Number of Molecules Calculator

An educational calculator that estimates how many molecules are present in a
given volume, for microfluidic, nanofluidic, laboratory, and teaching use.

Enter a volume directly or let the tool compute one from a channel's height,
width, and length; give a molar or mass concentration; and it reports the
expected molecule count with every conversion shown.

The page opens on a worked example rather than an empty form — a 10 × 10 × 50 µm
channel of CRP at 100 pg/mL, which holds 2.618 ± 0.059 molecules and splits
7.3% empty / 19.1% one / 73.6% two or more. **Reset returns there** rather than
blanking the form, so "default" means one thing.

## Running it

There is no build step and no dependencies, but the calculation modules are ES
modules, which browsers refuse to load over `file://`. Serve the directory:

```sh
python3 -m http.server
# then open http://localhost:8000
```

Opening `index.html` by double-clicking it will fail with a CORS error. That is
expected, not a bug — see [ADR-0002](./docs/adr/0002-no-build-step.md).

## Tests

```sh
node --test
```

No `npm install`, no `package.json`, no runner to configure. The same modules
the browser loads are the ones Node imports.

> Use bare `node --test`, not `node --test tests/` — on Node 24 a directory
> argument is resolved as a module path and fails.

## How it works

| Concentration | Formula |
| :-- | :-- |
| Molar | `n = C × V`, then `N = n × Nᴀ` |
| Mass | `n = (C × V) / MW`, then `N = n × Nᴀ` |

`Nᴀ = 6.02214076 × 10²³ mol⁻¹`, exact by definition since the 2019 SI
redefinition — a defined value, not a measurement, so it contributes no
uncertainty of its own.

Below an expected count of 10 the mean stops being a useful answer on its own —
"0.03 molecules" describes no possible sample — so the tool reports the Poisson
occupancy breakdown instead: the chance a given volume holds zero, one, or two
or more molecules. This is the regime microfluidics actually works in.

### Uncertainty

Relative uncertainties combine in quadrature and the tool reports `N ± 2u`, the
GUM expanded interval at roughly 95% coverage. One rule covers both volume
modes: volume contributes either its own entered uncertainty or the summed
contributions of height, width and length.

The lower bound is **clamped at zero**, because the linear approximation drives
it negative past 50% relative uncertainty and a negative molecule count is not a
meaningful quantity. Above 30% the tool says the approximation is no longer
reliable rather than quietly presenting a truncated interval as sound. See
[ADR-0001](./docs/adr/0001-linear-uncertainty-propagation.md), including why the
log-normal alternative was rejected.

## Languages

English and Traditional Chinese (Taiwan), switchable from the header tab and
remembered in `localStorage`.

This is a data change rather than a rewrite because the calculation modules
never build a sentence: `validation.js` returns codes and `plausibilityWarnings`
returns `{ code }`, and `js/i18n.js` chooses the words.

Note that the Chinese readable line uses **myriad** grouping — 3.01e8 is
「3.01億」, not 「301 百萬」. The two scale tables in `formatters.js` are
different systems, not translations of one another, and share no boundary above
10⁴. The "(short scale)" qualifier is English-only: it disambiguates short from
long scale, which the myriad system does not need. Unit symbols (`µm`) and
chemical formulas (`C₆H₁₂O₆`) are deliberately left untranslated.

## Copying a result

"Copy result" puts Markdown on the clipboard — `#` for the result, `##` for
warnings, occupancy, calculation, interval and assumptions, `###` for each
numbered step, with the formulae in fenced `text` blocks so the alignment
survives the paste into a notebook or an issue.

## Things worth knowing before changing it

- **Entries in the biomarker list that look like duplicates are not.** "CRP
  (pentamer)" and "CRP (monomer)" differ by 5×. Consolidating them would
  silently produce results wrong by that factor while every displayed step still
  looked correct — confidently wrong with a clean audit trail is the worst
  failure this tool can produce. Each entry names its molecular form and marks
  the physiologically representative one as recommended. See
  [ADR-0003](./docs/adr/0003-molecular-weights-qualified-by-form.md).
- **The uncertainty interval's lower bound is clamped at zero on purpose.** Do
  not "fix" it.
- **There is deliberately no submit button.** Once recalculation is debounced
  and automatic, a submit button computes nothing that has not already been
  computed 500 ms earlier. Removing it also dissolves an accessibility problem
  rather than mitigating one: a button disabled until the form is valid leaves
  the tab order entirely and becomes unreachable by keyboard and screen reader.
  Two consequences are load-bearing — the inputs are **not** wrapped in a
  `<form>` (<kbd>Enter</kbd> behaves inconsistently there without a submit
  button), and <kbd>Enter</kbd> is bound explicitly to flush the debounce.
- **Values are held as full-precision doubles everywhere and rounded only when
  displayed.** `formatters.js` is the only module permitted to round, and
  `tests/precision.test.js` enforces that structurally: no rounding primitive
  may appear in the calculation modules, and every `roundToUncertainty` call in
  `app.js` must sit inside a `render*` function.
- **Calculation modules must never touch the DOM**, or they stop being
  importable by Node and the whole no-build arrangement collapses.

## Layout

```text
index.html          the page
css/styles.css      all styling; light theme only
js/
  app.js            the only module that touches the DOM
  calculations.js   Avogadro, Poisson occupancy
  conversions.js    unit tables
  uncertainty.js    propagation, the zero-clamp
  formatters.js     the only module that rounds
  validation.js     error codes and plausibility warnings
  biomarkers.js     curated molecular weights, qualified by form
  i18n.js           every user-facing string, both locales
tests/              node --test, no dependencies
docs/adr/           architectural decision records
CONTEXT.md          project glossary
```

## Scope

This tool reports an expected count from the inputs given. It does not model
aggregation, surface binding, losses, or concentration gradients — the
uncertainty card states the assumptions each result rests on, and the
calculation panel shows every step, so what is and is not accounted for is
visible in the result itself rather than in a blanket caveat.
