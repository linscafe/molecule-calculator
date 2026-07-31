# Number of Molecules Calculator

An educational calculator that estimates how many molecules are present in a
given volume, for microfluidic, nanofluidic, laboratory, and teaching use.

Enter a volume directly or let the tool compute one from a channel's height,
width, and length; give a molar or mass concentration; and it reports the
expected molecule count with every conversion shown.

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

## Languages

English and Traditional Chinese (Taiwan), switchable from the header tab.

Note that the Chinese readable line uses myriad grouping — 3.01e8 is
「3.01億」, not 「301 百萬」. The scale tables in `formatters.js` are two
different systems, not translations of one another.

## How it works

| Concentration | Formula |
| :-- | :-- |
| Molar | `n = C × V`, then `N = n × Nᴀ` |
| Mass | `n = (C × V) / MW`, then `N = n × Nᴀ` |

`Nᴀ = 6.02214076 × 10²³ mol⁻¹`, exact by definition since the 2019 SI
redefinition.

Below an expected count of 10, the mean stops being a useful answer on its own
— "0.03 molecules" describes no possible sample — so the tool reports the
Poisson occupancy breakdown instead: the chance a given volume holds zero, one,
or two or more molecules.

## Things worth knowing before changing it

- **Entries in the biomarker list that look like duplicates are not.** "CRP
  (pentamer)" and "CRP (monomer)" differ by 5×. Consolidating them would
  silently produce results wrong by that factor while every displayed step
  still looked correct. See
  [ADR-0003](./docs/adr/0003-molecular-weights-qualified-by-form.md).
- **The uncertainty interval's lower bound is clamped at zero on purpose.** The
  linear approximation drives it negative past 50% relative uncertainty. See
  [ADR-0001](./docs/adr/0001-linear-uncertainty-propagation.md).
- **There is deliberately no submit button.** Results calculate automatically,
  debounced by 500 ms so the `aria-live` region announces once per settled
  edit rather than once per keystroke. `plan.md` explains why one should not be
  added back.
- **Calculation modules must never touch the DOM**, or they stop being
  importable by Node and the whole no-build arrangement collapses.

## Documents

- [plan.md](./plan.md) — the specification, and the reasoning behind the
  decisions in it
- [CONTEXT.md](./CONTEXT.md) — the project glossary
- [docs/adr/](./docs/adr/) — architectural decision records

## Disclaimer

This tool provides an estimate. It does not account for molecular aggregation,
binding, losses, or concentration gradients unless modeled explicitly.
