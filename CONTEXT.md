# Molecule Calculator

An educational calculator that estimates how many molecules are present in a
given volume, for microfluidic, nanofluidic, laboratory, and teaching use.

## Language

**Molecule count**:
The number of molecules expected in the sample volume. This is the tool's
central output.
_Avoid_: entity count, particle count, N (in prose)

**Sample volume**:
The volume the molecule count applies to, either entered directly or derived
from height, width, and length.
_Avoid_: channel volume, chamber volume

## Concentration

**Molar concentration**:
Amount of substance per unit volume, in mol/L. Needs no molecular weight.
_Avoid_: molarity

**Mass concentration**:
Mass of solute per unit volume, in g/L. Requires a molecular weight to reach a
molecule count.
_Avoid_: mass/volume concentration, w/v

**Molecular weight**:
The mass of one mole of the analyte, in g/mol. Always qualified by molecular
form, because a monomer and its circulating complex are different analytes.
_Avoid_: molar mass, MW (in prose), size

**Molecular form**:
Which physical species a molecular weight refers to — monomer, pentamer, whole
antibody, bound complex. Part of a biomarker's identity, never an annotation
on it.
_Avoid_: state, variant, isoform

**Recommended form**:
The molecular form of a biomarker that is actually present in the physiological
matrix being measured, offered as the default and always accompanied by the
reason it was chosen. Alternates stay selectable.
_Avoid_: default form, canonical form, primary form

## Uncertainty

**Estimated uncertainty interval**:
The range the molecule count could span given the uncertainty of the inputs.
Deliberately not a confidence interval, which would require an uncertainty
model this tool does not have.
_Avoid_: confidence interval, error bar, margin of error

**Input uncertainty**:
A user-supplied uncertainty on one measured quantity, as a percentage or an
absolute value.
_Avoid_: error, tolerance

**Occupancy probability**:
The chance that an individual sample volume contains exactly k molecules, given
the expected molecule count. Distinct from input uncertainty: it describes the
randomness of the sample itself, not doubt about the measurements.
_Avoid_: Poisson probability, hit rate

**Plausibility warning**:
A non-blocking notice that an input or result lies outside physically realistic
bounds. Never prevents a calculation.
_Avoid_: validation error (that term is reserved for blocking problems)
