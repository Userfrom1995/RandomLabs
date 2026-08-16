# A short history of full-text search

The problem of finding text predates computers. Card catalogs indexed books
by author and title; full-text search demanded that every word be findable.

The mid-twentieth century brought the first information retrieval research.
The idea that became the inverted index was already clear in the 1960s:
precompute, for every term, the list of documents containing it, so that a
query touches only the relevant lists. Meanwhile Gerald Salton's SMART
system at Cornell introduced the vector-space model and term weighting, the
ancestor of tf-idf. The formula that would later bear the name - term
frequency times inverse document frequency - was a fixture of retrieval
textbooks by the 1970s.

The 1990s were the turning point. In 1994 Karen Sparck Jones wrote that
"we must take account of the information-retrieval literature"; in the same
era Robertson and Walker published the Okapi BM25 function at the City
University of London, distilling years of probabilistic retrieval theory
into a handful of tunable parameters. BM25's longevity is remarkable - it
still anchors ranking pipelines today. And in 1998 Google shipped
PageRank-driven search at scale, proving that web-scale retrieval was not
just an academic exercise.

Boolean query languages are older still. Before relevance ranking was
practical, commercial systems like STAIRS and Dialog made users write
AND/OR/NOT expressions against inverted indexes. The syntax is recognizable
in every modern search bar, even though most users never type it - which is
why search engines quietly support it for power users while defaulting to
ranked search.

Meridian is a small homage to that lineage. An inverted index with
gap-encoded varint postings, BM25 and tf-idf scorers, a boolean grammar with
phrases, and snippet generation: each piece is a deliberate reimplementation
of a technique with a real history. Search engines look like magic, but they
are just well-understood data structures and math, and building one from
scratch makes every layer legible.