# The inverted index

The inverted index is the data structure that makes full-text search fast.
The name is the point: a normal index maps a document to its contents, while
an inverted index maps each term to the documents that contain it.

Building one is straightforward. Tokenize every document into terms with
positions, then group by term. For the term "meridian" you end up with a
postings list: one entry per document that uses the word, and for each entry
the term frequency and the positions at which the term appears. Positions
matter because they are what make phrase queries possible - to find "search
engine" you look for documents where "search" appears immediately before
"engine".

The vocabulary is stored sorted, which is what makes evaluation cheap. To
resolve a query you look up each term, get its sorted postings list, and
combine lists with the set operations of boolean logic: intersection for
AND, union for OR, complement for NOT. Sorted lists intersect in linear
time by walking both at once.

Real indexes are large, so postings are compressed. Since postings are
sorted, consecutive document ids are close together, and their gaps are
small. Encoding each gap as a varint - a variable-length integer that uses
one byte for values under 128 - shrinks the list dramatically. The same
trick applies to positions: within a single document, positions are sorted,
so their deltas are small too. Meridian does exactly this: a postings list
becomes a compact byte stream of gap-encoded varints, which is then
base64-embedded in the exported index.

The index Meridian builds keeps the vocabulary in a sorted map, each term's
postings sorted by document id, and every posting's positions sorted. That
invariant is what lets all the query operators be implemented as clean,
correct list operations.