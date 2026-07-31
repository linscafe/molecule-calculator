# Molecular weights are qualified by molecular form

Every entry in the biomarker list names the molecular form its weight refers to
— "CRP (pentamer, circulating)", not "CRP" — and carries a UniProt accession.
Where more than one form is in common use, one is marked **Recommended**: the
form actually present in the physiological matrix being measured. Alternates
remain selectable, and a "Why this form" column explains the choice at the
point of selection rather than in documentation nobody reads.

For several of the most-requested biomarkers there is no single correct
molecular weight, and the spread is large enough to invalidate a result:

| Biomarker | Recommended form | MW | Why this form | Also available |
| :-- | :-- | :-- | :-- | :-- |
| CRP | Pentamer | ~115 kDa | Circulates almost entirely as the pentraxin pentamer; the monomer is essentially absent from serum | Monomer, 25 kDa |
| Troponin | T-I-C ternary complex | ~77 kDa | Released into blood as the intact complex after myocardial injury | cTnI alone, 24 kDa |
| PSA | PSA-ACT complex | ~90 kDa | The majority of serum PSA is bound to alpha-1-antichymotrypsin | Free PSA, 28.4 kDa |
| Insulin | Mature insulin | 5.8 kDa | The circulating hormone; proinsulin is a precursor and a minor fraction | Proinsulin, 9.4 kDa |
| IgG | Whole antibody | ~150 kDa | Intact immunoglobulin as measured in serum | Fab, ~50 kDa |
| Albumin | Mature HSA | 66.5 kDa | Single circulating form; no ambiguity | — |

CRP is the dangerous case. It circulates almost entirely as a pentamer, but
"CRP molecular weight" returns the 25 kDa monomer value nearly everywhere. A
user selecting a bare "CRP" entry would compute 4.6x too many molecules while
the calculation-details panel showed every step correctly. Confidently wrong
with a clean audit trail is the worst failure this tool can produce.

Presenting the forms neutrally, with no recommendation, was rejected: it pushes
a pharmacology judgement onto a user who came here for arithmetic, and the
user most at risk is precisely the one least equipped to make it.

## Consequences

Do not consolidate duplicate-looking entries. Two rows beginning "CRP" is the
design working, not a data-entry error.

The recommendation is a default, not a constraint. Selecting an entry prefills
the molecular-weight field but never locks it, and any alternate form stays one
click away — a researcher measuring free PSA specifically must not be argued
with. The chosen entry and its accession are recorded in the calculation
details, so a result can always be traced to the exact form assumed.

Auto-importing the list from UniProt was rejected for the same reason: UniProt
masses are per-chain, so every oligomeric protein would silently arrive as its
monomer — the wrong default, at scale, with no rationale column to catch it.
