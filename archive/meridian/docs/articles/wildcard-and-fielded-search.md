# Wildcard and fielded search

A plain word query is exact: the postings for that term. Wildcards and fields
are the two cheapest ways to widen or narrow that match without leaving the
engine's core data structure.

## Wildcards

A wildcard query is a term pattern with one of two metacharacters. `*`
matches any run of characters, `?` matches exactly one. `search*` matches
`search`, `searching`, `searcher`; `sear?h` matches `search` but not
`searches`.

The engine expands a pattern against the vocabulary once, at query time, then
treats the result as a normal OR over the matching terms. Two rules keep the
expansion cheap. First, a pattern must keep a fixed prefix before its first
wildcard: `*ing` is legal but forces a scan of the whole vocabulary. Second,
only terms already in the postings list are expanded - wildcards never
invent terms that do not exist in the index.

Expansion uses a classic dynamic program. The pattern is compiled into a
table of match states, then each candidate term is walked against it in
`O(pattern * term)` time, with the `*` "match nothing" and "match one more"
transitions forming the two halves of the recurrence. A dictionary scan with
the fixed prefix prunes most candidates before the table is ever touched.

Because the expansion happens against the vocabulary, wildcard terms pick up
the same `df`, `idf`, and postings as their concrete counterparts. A wildcard
hit is scored exactly like an OR of those terms - there is no separate
"wildcard bonus" to tune.

## Fielded search

A fielded query restricts matches to a metadata field. Meridian indexes two:
`title` and `source`. `title:rust` matches only documents whose title
contains `rust`; `source:docs*` matches documents whose source path starts
with `docs`.

Fields are implemented as an auxiliary structure built alongside the main
index. For each field the engine keeps a per-document token set, derived from
the same tokenizer so field terms and body terms agree exactly. A fielded
query is therefore a containment test: does the document's field token set
contain any of the query terms?

Fielded terms are checked against the field token sets, never against the
main postings. That means `title:rust` cannot be satisfied by a document that
mentions rust only in its body - the field is a hard filter. A fielded
wildcard like `source:docs*` expands against the field vocabulary, the same
way a body wildcard expands against the main vocabulary.

In the ranked path, fielded terms still contribute score, so documents that
match in the title can outrank documents that match only in the body. The
field constraint narrows the candidate set; the ranking then orders whatever
survives. In the boolean path (`AND`, `OR`, `NOT`), a fielded term is pure
set membership: the field token set decides, score is irrelevant.

Fielded and plain terms can be combined freely in one query, and a fielded
term accepts the same wildcard and boost operators as a plain term. The
combination of field filtering with wildcard expansion is what makes
`source:docs*` useful for slicing a corpus by directory without enumerating
every path.