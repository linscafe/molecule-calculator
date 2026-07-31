# Name

Molecule Calculator

Repository: `molecule-calculator`. Published at
`https://<user>.github.io/molecule-calculator/`.

## Project purpose

Create an educational “Number of Molecules Calculator” for microfluidic,
nanofluidic, laboratory, and teaching use cases.

The central output is the expected molecule count, calculated either from:

- A directly entered volume, or
- Dimensions (height, width, and depth/length), from which the volume is calculated.

One mole contains exactly $6.02214076 \times 10^{23}$ entities, using the fixed
SI value of the Avogadro constant.[^3]

Throughout the code and the interface, the thing being counted is a
**molecule**. See [CONTEXT.md](./CONTEXT.md) for the project glossary.

## Recommended stack

Use a deliberately simple static architecture:


| Area | Recommendation |
| :-- | :-- |
| Hosting | GitHub Pages |
| App structure | Single-page application |
| Front end | Vanilla HTML, CSS, and JavaScript |
| Styling | Custom CSS with CSS variables; no framework required |
| Graphics | Inline SVG icons and diagrams |
| Deployment | GitHub Actions, or GitHub Pages deployment from the `main` branch |
| Testing | `node --test` over ES modules; no build step |

Avoid React or a server framework for version 1. A vanilla JavaScript
implementation will be easy to audit scientifically, quick to load, and
straightforward for another AI to maintain.

The calculation modules are plain ES modules with no DOM access, imported
unchanged by both the browser and Node's built-in test runner. There is no
`package.json`, no lockfile, and no bundler. See
[ADR-0002](./docs/adr/0002-no-build-step.md).

> **Local development requires a static server.** ES modules do not load over
> `file://`, so opening `index.html` directly fails with a CORS error. Run
> `python3 -m http.server` and browse to `localhost:8000`. GitHub Pages serves
> over HTTP and is unaffected.

## Page layout

Use a clean, responsive two-column layout on desktop and a one-column layout on mobile.

1. **Header**
    - A full-bleed banner spanning both columns, carrying the favicon’s tile
      gradient and molecule emblem, with the title and subtitle set on top of it
      in flat white.
    - Title: “Number of Molecules Calculator”
    - Subtitle: “Estimate how many molecules are present in a given volume.”
    - Molecules scattered across the banner jitter in place rather than drifting
      — each with its own amplitude, period and phase, so no two move in step.
      Brownian motion is also what molecules in a channel actually do.
    - Language tabs sit in a thin bar above the banner.
2. **Input card**
    - Dimension/volume input controls
    - Concentration controls
    - Molecular-weight controls, shown only for mass concentration
    - Uncertainty controls
    - No submit button — results calculate automatically (see “Recalculation timing”)
3. **Results card**
    - Large primary result: “Number of molecules”
    - Scientific notation and readable notation, for example: `1.20 × 10¹² molecules`
    - Optional context: “This is approximately 1.2 trillion molecules.”
    - Occupancy probabilities when the count is below 10
4. **Calculation details card**
    - Step-by-step converted values in SI units
    - The selected formula
    - Intermediate result in moles
    - Final multiplication by Avogadro’s constant
    - The biomarker entry and molecular form used, where one was selected
5. **Uncertainty card**
    - Interval around the estimate
    - Plain-language explanation
    - Assumptions and warnings
6. **Footer**
    - Link to the GitHub repository
    - No scientific disclaimer. The uncertainty card already states the
      assumptions it relies on, and the calculation panel shows every step, so a
      blanket footer caveat added nothing the page was not already saying.

## Inputs

### Geometry and volume

Offer two mutually exclusive modes with a segmented control or tabs:

- **Calculate volume from dimensions**
- **Enter volume directly**

For dimensions mode, provide:


| Input | Units |
| :-- | :-- |
| Height | m, cm, mm, µm, nm |
| Width | m, cm, mm, µm, nm |
| Depth / length | m, cm, mm, µm, nm |

Use “length” rather than “depth” in the UI label if this is intended primarily for channels.

For direct-volume mode, provide:


| Input | Units |
| :-- | :-- |
| Volume | L, mL, µL, nL, pL, fL, m³, cm³, mm³, µm³ |

Important conversion rules:

- Convert all dimensions internally to metres.
- Calculate volume as $V = h \times w \times l$.
- Convert volume internally to litres or cubic metres consistently.
- State the converted volume clearly in the calculation panel.

> **Three pairs in the volume list are the same unit by definition**, not
> approximations: `1 mL ≡ 1 cm³`, `1 µL ≡ 1 mm³`, `1 fL ≡ 1 µm³`. Ten entries,
> seven distinct scales. Both spellings are kept because a chemist reaches for
> µL and an engineer for mm³. The calculation-details panel must not render a
> no-op line such as `V = 5.00 µL → V = 5.00 mm³`; where the source and target
> units are equivalent, state the equivalence instead.

### Concentration

Support two concentration types through a dropdown:


| Concentration type | Suggested units | Requires molecular weight? |
| :-- | :-- | :-- |
| Molar concentration | M, mM, µM, nM, pM, fM | No |
| Mass concentration | g/L, mg/mL, µg/mL, ng/mL, pg/mL, g/m³ | Yes |

For “molar concentration,” M means mol/L.

For “mass concentration,” molecular weight must be entered as g/mol, because
the calculator must convert mass to moles before estimating molecular count.

**Particle concentration is deferred to version 2.** It is the one mode that
never multiplies by Avogadro’s constant and the one whose output is not
molecules, so including it would cost a label override and a mode-specific
assumptions block throughout a codebase where “molecule” is otherwise
canonical. Version 1 ships the two modes that genuinely need the Avogadro
constant.

### Molecular weight

Show this field only for mass concentration:

- Label: “Molecular weight”
- Unit: g/mol
- Placeholder example: `150,000` for a 150 kDa protein
- Optional convenience selector: `g/mol` or `kDa`
- Convert kDa using 1 kDa = 1,000 g/mol.

Include a help tooltip: “Molecular weight is needed only when concentration is
expressed as mass per volume, such as ng/mL.”

#### Biomarker list

Offer a curated list of roughly 12–15 common biomarkers. Every entry names its
**molecular form** and cites a UniProt accession. Where more than one form is
in common use, mark the physiologically representative one **Recommended** and
give the reason in a “Why this form” column.

Option text leads with the molecule, not the form: `CRP Pentamer, circulating —
115 kDa (recommended)`. The optgroup label is easy to lose track of once the
list is scrolling, and “Pentamer, circulating” alone does not say what it is a
pentamer of.

Selecting an entry **prefills** the molecular-weight field. It never locks it.
The chosen entry and accession appear in the calculation details.

This is the tool's most dangerous failure mode: a bare “CRP” entry carrying the
25 kDa monomer value computes 4.6× too many molecules while every displayed
step looks correct. See
[ADR-0003](./docs/adr/0003-molecular-weights-qualified-by-form.md) for the full
rationale and the starting table.

## Calculation logic

Implement calculation functions separately from interface code, for example in
`js/calculations.js`. This makes the science easier to test and review, and is
what allows the same modules to run under `node --test`. **Calculation modules
must never touch the DOM.**

### Molar concentration

For concentration $C$ in mol/L and volume $V$ in L:

$$
n = C \times V
$$

$$
N = n \times N_\mathrm{A}
$$

where $N_\mathrm{A} = 6.02214076 \times 10^{23}\ \mathrm{mol}^{-1}$.[^4][^3]

### Mass concentration

For mass concentration $C_m$ in g/L, volume $V$ in L, and molecular weight $MW$ in g/mol:

$$
n = \frac{C_m \times V}{MW}
$$

$$
N = \frac{C_m \times V}{MW} \times N_\mathrm{A}
$$

### Occupancy probabilities

When the molecule count falls below 10, the expected value stops being a useful
answer on its own — “0.03 molecules” describes no possible sample. Show the
distribution instead:

$$
P(k) = \frac{e^{-N} N^{k}}{k!}
$$

Display $P(0)$, $P(1)$, and $P(\ge 2)$, with the assumption named explicitly:
molecules are randomly and independently distributed. This is the regime
microfluidics cares about — single-molecule detection, digital PCR, droplet
partitioning — and it needs no new inputs.

```text
V = 1 pL, C = 50 fM  →  N = 0.03 molecules

  In equivalent volumes:
    97.0%   contain 0 molecules
     2.9%   contain 1
     0.04%  contain 2 or more
```

Above N = 10 the breakdown is hidden; $P(0)$ is negligible and the expected
value is a fair summary.

## Results formatting

The primary result panel should contain:

```text
Number of molecules
1.20 × 10¹² molecules

Approximate readable value:
1.2 trillion molecules (short scale)
```

### Precision

- With uncertainty enabled, round the result to match the magnitude of the
  uncertainty. This is standard GUM practice and the genuinely correct rule.
- Without uncertainty, show 3 significant figures. State plainly that this is a
  display default, **not** a claim about the precision of the inputs — the tool
  does not track significant figures through the calculation.
- Preserve the unrounded internal result for calculation details.

### Notation

- Use scientific notation for values below $10^{-3}$ or above $10^6$.
- The readable line uses short-scale names up to $10^{18}$, always marked
  “(short scale)”, because *billion* and *trillion* mean different magnitudes on
  the long scale still used across much of Europe and this tool has a global
  audience.
- Above $10^{18}$, omit the readable line entirely. “602 sextillion” conveys
  less than $6.02 \times 10^{23}$ does.
- Below $10^6$, print the plain integer with thousands separators.

## Calculation breakdown

Show a transparent sequence such as:

```text
1. Dimensions entered:
   Height = 100 µm
   Width = 50 µm
   Length = 10 mm

2. Converted volume:
   V = 5.00 × 10⁻⁸ L

3. Concentration:
   C = 10 nM = 1.00 × 10⁻⁸ mol/L

4. Amount of substance:
   n = C × V
   n = 5.00 × 10⁻¹⁶ mol

5. Number of molecules:
   N = n × 6.02214076 × 10²³
   N = 3.01 × 10⁸ molecules
```

Use an expandable `<details>` element so the page stays uncluttered while
allowing users to inspect every conversion.

## Uncertainty interval

Do **not** present a confidence interval by default if users have entered only
single fixed values. A statistical confidence interval requires a defined
uncertainty model, repeated measurements, or assumptions about input
variability.

Instead, label this feature:

> **Estimated uncertainty interval**

Offer an “Include input uncertainty” switch. When enabled, show uncertainty
inputs for each relevant measured quantity:

- Height uncertainty, as percent or absolute value
- Width uncertainty
- Length uncertainty
- Volume uncertainty, if volume is entered directly
- Concentration uncertainty
- Molecular-weight uncertainty, if applicable

Default all uncertainty fields to blank—not an invented value. Optionally
provide an example preset such as “Typical laboratory estimate: ±5%
concentration, ±2% dimensions,” but label it clearly as an assumption.

### Propagation method

For version 1, implement an analytic relative-uncertainty calculation assuming
independent inputs. **One rule covers both volume modes:** the relative
variance of $N$ is the sum of the relative variances of every independent
factor, where volume contributes either its own entered uncertainty (direct
volume mode) or the summed contributions of height, width, and length
(dimensions mode).

$$
\left(\frac{u_N}{N}\right)^2 =
\left(\frac{u_C}{C}\right)^2 +
\left(\frac{u_V}{V}\right)^2
\quad\text{where}\quad
\left(\frac{u_V}{V}\right)^2 =
\left(\frac{u_h}{h}\right)^2 +
\left(\frac{u_w}{w}\right)^2 +
\left(\frac{u_l}{l}\right)^2
$$

For mass concentration, add molecular-weight uncertainty as one more
independent factor:

$$
\left(\frac{u_N}{N}\right)^2 =
\left(\frac{u_{C_m}}{C_m}\right)^2 +
\left(\frac{u_V}{V}\right)^2 +
\left(\frac{u_{MW}}{MW}\right)^2
$$

Then display an approximate 95% interval as $N \pm 2u_N$. Under
normal-distribution assumptions, multiplying the combined standard uncertainty
by approximately 2 corresponds to roughly 95% coverage.[^5]

#### Bounds and limits

**Clamp the lower bound at zero.** The linear approximation drives it negative
whenever relative uncertainty exceeds 50% — a ±60% concentration uncertainty on
`N = 3.01 × 10⁸` produces `−6.0 × 10⁷ molecules`. A negative molecule count is
not a meaningful quantity.

**Above 30% relative uncertainty, warn.** Expose the threshold as a named
export rather than a literal; it is a judgement, not a derived constant.

```text
Estimated uncertainty interval
  0  to  6.6 × 10⁸ molecules

! Relative uncertainty is 60%. At this magnitude the linear
  approximation is unreliable and the interval is truncated
  at zero. A molecule count cannot be negative.
```

See [ADR-0001](./docs/adr/0001-linear-uncertainty-propagation.md), including
why the log-normal alternative was rejected.

For a later version, add a **Monte Carlo simulation mode** (for example, 10,000
random draws) to accommodate asymmetric uncertainty, correlated dimensions,
log-normal concentrations, or non-linear input distributions — and to handle
the high-uncertainty regime version 1 can only warn about.

### Plain-language explanation

Place this text below the interval:

> “This interval describes how much the estimated molecule count could vary
> because the inputs are uncertain. It is not a guarantee that the true value
> falls inside the range. The estimate assumes the input errors are independent
> and approximately normally distributed.”

Also show the assumptions explicitly:

```text
Assumptions
• Molecules are uniformly distributed in the volume
• Concentration represents freely available molecules
• Input uncertainties are independent
• The reported interval is an approximate 95% uncertainty interval
```

## Validation behavior

Implement robust real-time validation. Distinguish **validation errors**, which
block calculation, from **plausibility warnings**, which never do.

### Validation errors

- Reject negative values.
- Require values greater than zero for all physical measurements.
- Require all three dimensions in dimension mode.
- Require molecular weight for mass concentration.
- Display errors beside the relevant field, not only as a global message.
- Show a field's error on blur, not while it is being typed into.
- Suppress the result while any required field is invalid, and say why.

Because there is no submit button, validation state is the only signal that a
result is being withheld. Pair the inline field errors with an `aria-live`
status region announcing which field is blocking and why, so the reason reaches
screen-reader users without a control to press.

### Plausibility warnings

Non-blocking, each anchored to a physical constant so the threshold is
defensible and testable:

| Condition | Anchor | Message |
| :-- | :-- | :-- |
| Any dimension < 0.1 nm | An atom is ~0.1–0.3 nm across; a C–C bond is ~0.15 nm | “Smaller than a single atom — check the unit selector.” |
| Molar concentration > 25 M | Pure water is 55.5 M; saturated NaCl is ~6.1 M | “Exceeds any realistic solution.” |
| Molecule count < 1 | — | “The expected count is below one. In a real sample, some equivalent volumes may contain zero molecules and others may contain one or more.” (shown with the occupancy probabilities) |

The most common real error these catch is not exotic physics but a **unit
slip** — meaning 100 µm and leaving the selector on nm, which makes the volume
10⁹× too small with no other complaint from the tool.

## SVG design direction

Use small original inline SVGs, avoiding external image dependencies:

- A beaker or pipette icon next to concentration
- A cube/cuboid icon next to dimensions
- A molecule icon next to the output
- A simple error-bar icon next to uncertainty

Keep illustrations decorative and non-interactive. Use CSS to color them
consistently with the application theme.

## Accessibility and UX

Require:

- Visible labels for every input; placeholders are not substitutes for labels.
- Keyboard navigation and focus states.
- High-contrast text and color choices.
- `aria-live="polite"` on the primary result area so screen-reader users hear updated results.
- `aria-live` on the validation summary, per “Validation errors” above.
- Unit selectors adjacent to their numeric input.
- Mobile-friendly numeric keyboard using `inputmode="decimal"`.
- A “Reset” button that restores sensible empty defaults.
- A “Copy result” button that copies **Markdown** — `#` for the result, `##`
  for warnings, occupancy, calculation, interval and assumptions, `###` for each
  numbered step, with the formulae in fenced `text` blocks so the alignment
  survives the paste.

### Recalculation timing

Auto-calculation and a polite live region conflict directly: typing `150000`
passes through six valid intermediate states, and because `aria-live="polite"`
**queues** rather than interrupts, a screen-reader user sits through five stale
wrong answers before hearing the real one.

- **Debounce recalculation and announcement together, 500 ms after typing stops.**
- Recalculate immediately on blur, on unit change, and on <kbd>Enter</kbd>.
- One announcement per settled edit.

### There is deliberately no submit button

The calculator has **no “Calculate Now!” button**. Once recalculation is
debounced and automatic, a submit button computes nothing that has not already
been computed 500 ms earlier — by the time every field is valid, the result is
already on screen and already announced. A control whose only remaining
function is to re-trigger work that has finished is not clarity, it is a dead
affordance.

Removing it also dissolves an accessibility problem rather than mitigating one.
A button disabled until the form is valid leaves the tab order entirely and
becomes unreachable by keyboard and screen reader, offering no statement of
why; a button left enabled invites presses that do nothing. Neither trade-off
has to be made if the control does not exist.

**Do not add one back.** The affordances that remain — “Reset” and “Copy
result” — are the ones that perform an action the page has not already taken.

Two consequences follow, and both must be handled:

- **Do not wrap the inputs in a `<form>`.** Without a submit button, <kbd>Enter</kbd>
  inside a form field behaves inconsistently across browsers. Use a plain
  container and bind <kbd>Enter</kbd> explicitly.
- **<kbd>Enter</kbd> must still do something**, because users will press it and
  mobile keyboards show a Go/Done key. Bind it to flush the debounce: calculate
  immediately, re-announce the result, and blur the field so the mobile keyboard
  dismisses.

## Default values

The page opens on a worked example rather than an empty form, so the first
thing a visitor sees is a real result with its reasoning beside it. **Reset
returns here** rather than blanking the form, so "default" means one thing.

```text
Height 10 µm   Width 10 µm   Length 50 µm
Mass concentration 100 pg/mL
Biomarker: CRP — pentamer, circulating (115 kDa)
Uncertainty enabled, 1% on each of the five inputs

→ 2.618 ± 0.059 molecules
→ 7.3% empty · 19.1% one · 73.6% two or more
```

This is deliberately the counting regime. A 10 × 10 × 50 µm channel at trace
immunoassay concentrations really does hold a couple of molecules, so the
occupancy breakdown is on screen from the first paint rather than hidden behind
an input the visitor has to guess at — and unlike a near-certain zero, it shows
a distribution with all three outcomes in play.

`pg/mL` was added to the mass-concentration units for this — the original list
stopped at ng/mL, three orders of magnitude above where clinical immunoassays
actually sit.

## Localisation

The interface ships in English and Traditional Chinese (Taiwan), switched by a
tab in the header and remembered in `localStorage`.

This is possible only because the calculation modules never build a sentence.
`validation.js` returns codes — `required`, `notNumber`, `negative`, `zero` —
and `plausibilityWarnings` returns `{ code }`; `js/i18n.js` chooses the words.
A module that returned English could not be localised without being rewritten.

Two things are deliberately **not** translated: unit symbols (µm is µm in every
language) and chemical formulas (C₆H₁₂O₆ is C₆H₁₂O₆ in Chinese).

One thing is not a translation at all. **English groups large numbers in
thousands; Chinese groups them in myriads.**

```text
3.01e8   ->  "301 million"      but  「3.01億」
6.02e14  ->  "602 trillion"     but  「602兆」
5.0e6    ->  "5 million"        but  「500萬」
```

The two scale tables share no boundary above 10⁴, so the zh-TW row is a
separate system rather than a word-for-word rendering of the English one.
The "(short scale)" qualifier is English-only: it exists because *billion* is
10⁹ on the short scale and 10¹² on the long scale, an ambiguity the Chinese
myriad system does not have.

## Placeholders

Every numeric input carries a placeholder in muted grey, prefixed `e.g.` /
「例如」 so it cannot be mistaken for a value. Placeholders are examples, not
defaults — the uncertainty fields in particular must still start blank, per
"Default all uncertainty fields to blank—not an invented value" above.

## Suggested repository structure

```text
molecule-calculator/
├── index.html
├── README.md
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-linear-uncertainty-propagation.md
│       ├── 0002-no-build-step.md
│       └── 0003-molecular-weights-qualified-by-form.md
├── assets/
│   ├── favicon.svg
│   └── illustrations.svg
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── biomarkers.js
│   ├── calculations.js
│   ├── i18n.js
│   ├── conversions.js
│   ├── uncertainty.js
│   ├── validation.js
│   └── formatters.js
└── tests/
    ├── conversions.test.js
    ├── calculations.test.js
    ├── i18n.test.js
    ├── precision.test.js
    ├── uncertainty.test.js
    └── formatters.test.js
```

Tests run with `node --test` from the repository root.

> Not `node --test tests/`. On Node 24 a bare directory argument is resolved as
> a module path and fails with `MODULE_NOT_FOUND`. Bare `node --test`
> auto-discovers `tests/`; `node --test tests/*.test.js` also works.

## Acceptance criteria

The implementation is complete when:

- Users can calculate molecule count from either dimensions or a directly entered volume.
- All listed length, volume, concentration, and molecular-weight units convert correctly, and equivalent units are reported as equivalent rather than converted.
- The calculation details display every conversion and formula used, including the biomarker molecular form where one was selected.
- Mass concentration requires molecular weight and correctly converts to molar quantity.
- Every biomarker entry names its molecular form, and ambiguous biomarkers mark a recommended form with a stated reason.
- Invalid inputs show clear, local validation messages, and the reason a result is being withheld is announced.
- The page has no submit button; results appear automatically, and <kbd>Enter</kbd> flushes the debounce.
- The calculator reports an uncertainty interval only when uncertainty inputs are supplied.
- The uncertainty interval never displays a negative lower bound, and warns above 30% relative uncertainty.
- Results below 10 molecules show occupancy probabilities.
- The readable value is never printed in a scale-ambiguous form.
- The uncertainty explanation avoids overstating statistical certainty.
- Recalculation is debounced so the live region announces once per settled edit.
- Tests pass under `node --test` with no dependencies installed.
- The page works without a backend and deploys successfully through GitHub Pages.[^2][^1]
- The design remains usable on desktop and mobile screens.

## Deferred to version 2

- Particle concentration mode (particles/mL, /µL, /L)
- Monte Carlo uncertainty propagation
- Significant-figure tracking through the calculation
