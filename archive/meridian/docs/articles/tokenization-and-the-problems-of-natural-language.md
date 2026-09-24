# Tokenization and the problems of natural language

Before a document can be indexed, it must be cut into terms. That sounds
trivial and is not: natural language is messy, and every choice in the
tokenizer shapes what the search engine can find.

The core decision is what counts as a word. Meridian treats unicode letters
and digits as word characters, folds them to lowercase, and keeps an
apostrophe that sits between two word characters - so "don't" survives as
one token while a leading apostrophe in "'tis" is dropped. Everything else
is a separator. That single rule already handles most real text: punctuation
splits, URLs break into their pieces, code fragments like `k1=1.2` become
the tokens `k1`, `1`, and `2`.

Why not keep "The" and "the" separate? Case folding merges them, so a query
for "the" matches a document that wrote "The". The cost is that case can
carry meaning - "Poland" and "poland" collapse - but for general full-text
search the recall win far outweighs the precision loss.

Positions are part of tokenization too. Every token records where it sits in
the stream, because phrases and proximity need that information later. If
"search" and "engine" both occur in a document but far apart, a ranked query
still matches - but a quoted phrase does not.

Tokenizers in real engines face more exotic problems: languages without word
boundaries, compound words, stemming that merges inflections, diacritic
folding, and stop-word removal. Meridian deliberately keeps the rules small
and deterministic. Stop words are left in the index rather than removed,
because BM25 already downweights them statistically through inverse document
frequency. Small and deterministic is a feature: every choice is testable,
and two runs over the same corpus produce identical indexes.