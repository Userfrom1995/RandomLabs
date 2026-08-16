# Phrase slop and term boosting

Two refinements sit on top of phrase search and plain-term ranking: slop
loosens a phrase, boosting emphasizes a term. Both are single-token
operators in the query language, and both are resolved without touching the
core postings format.

## Phrase slop

A phrase query matches consecutive words in order: `"inverted index"`
requires `inverted` immediately followed by `index`. Real documents are
messier, so phrases support a slop parameter: `"search engine"~2` allows the
two words to appear up to two positions apart.

Slop is defined on positions, not on word count. The span of a candidate
match is `last_position - first_position`; the number of intervening words is
`span - (phrase_length - 1)`. The phrase matches when that gap is at most the
slop. So `~0` is an exact phrase, `~1` permits one word between the terms,
and so on. The definition is symmetric about order too: a sloppy phrase finds
`engine search` as well as `search engine`, because positions are simply
compared, not ordered.

The matcher anchors on the rarest phrase term - the one with the smallest
document frequency - and walks the anchor's positions, extending forward and
backward through the phrase like a two-sided window. Anchoring on the rare
term is what keeps the search fast: the anchor postings list is the smallest
set that must be examined, and every candidate is verified against the other
terms' position lists in constant-ish time.

## Term boosting

Ranked queries score terms by tf-idf or BM25 alone. A boost operator lets
the user say that one term matters more: `rust^3` triples the contribution of
the term `rust`; `title:rust^2` boosts a fielded term; even a fuzzy term can
carry a boost, as in `searching~^2`.

A boost is a plain multiplier. The engine computes each term's normal score
and multiplies it by the boost before summing, so a boosted term behaves like
a term with that many extra occurrences. Boosts combine with the other
retrieval features without any interaction: a boosted wildcard expands to
terms that each carry the multiplier, a boosted phrase multiplies the phrase
score, a boosted fielded term scales the field contribution.

There is exactly one hard rule: a boost must follow a real term. `^2` alone
is rejected as an orphan, and so is `"a b"~x` where a bare `~` would be
ambiguous against a real number. The parser treats `~` and `^` as separate
lexical tokens precisely so these cases can be told apart cheaply.

Both operators stay entirely at the query layer. The postings, the
compression codec, and the stored index format are untouched; slop and boost
are resolved during query planning and scoring. That is why they are cheap to
add and cheap to combine.