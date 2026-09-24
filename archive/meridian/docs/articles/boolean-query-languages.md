# Boolean query languages

Modern search boxes are forgiving: type words, get ranked results. But the
first serious search engines were boolean, and boolean logic is still the
precise way to express what you want. Meridian supports both styles.

A plain query like `rust seismic` has no operators, so Meridian treats it as
a ranked search: every term contributes to the score, and results are
ordered by relevance. This is the familiar search-engine default.

Add an operator and the query becomes exact. `rust AND seismic` requires
both terms in every result - implemented as the intersection of two sorted
postings lists. `rust OR seismic` returns documents with either, merged like
a sorted union. `rust NOT seismic` takes every document with rust and
removes those that mention seismic. Parentheses set precedence, so
`rust AND (cargo OR bm25)` groups the alternative before intersecting.

Quoted phrases are the precision tool: `"search engine"` matches only
documents where the two words appear consecutively, in order. Meridian
resolves phrases by anchoring on the rarest word and checking that each
following word sits exactly one position later - an operation that is only
possible because the index stores positions.

Two details keep evaluation fast. Set operations run over sorted lists, so
they are linear in the smaller list. And an AND is always planned
rarest-first: intersect by the least common term first, because the result
of an intersection can never be larger than its smallest input, and every
subsequent intersection only shrinks the working set. Query optimization in
a search engine is largely this - picking the order that touches the fewest
postings.

The grammar is a small recursive-descent parser: or-expressions over
and-expressions over unary not over primaries, where a primary is a term, a
phrase, or a parenthesized expression. Parsing is exact and errors are
clear: an unclosed parenthesis or a dangling operator is reported, never
silently accepted.