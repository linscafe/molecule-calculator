# Linear uncertainty propagation with a clamped lower bound

The molecule count is a pure product of independent factors, so we combine
relative uncertainties in quadrature and report an expanded interval of
`N ± 2u_N`, following GUM. This is the form every textbook the audience will
have uses, which matters for a teaching tool.

The approximation degrades as relative uncertainty grows, and past 50% the
lower bound goes negative — a 60% concentration uncertainty on `N = 3.01e8`
yields `-6.0e7 molecules`. We therefore clamp the lower bound at zero and,
above 30% relative uncertainty, warn that the linear approximation is
unreliable rather than silently presenting a truncated interval as if it were
sound.

## Considered options

A log-normal (multiplicative) interval, `N / exp(2u_rel)` to `N * exp(2u_rel)`,
is better behaved for products and never goes negative. We rejected it because
the asymmetric interval is harder to explain to students and diverges from the
`±` form they will meet everywhere else. The cost of that rejection is the
clamp and the threshold warning, which are the price of staying conventional.

Monte Carlo propagation is deferred to v2, where it will handle asymmetric,
correlated, and log-normal inputs properly — including the high-uncertainty
regime this ADR can only warn about.

## Consequences

The 30% threshold is a judgement, not a derived constant. It should be a named
export, not a literal buried in `uncertainty.js`.

Do not "fix" the clamp by removing it. A negative molecule count is not a
meaningful quantity, and displaying one destroys the tool's credibility more
than a truncated interval does.
