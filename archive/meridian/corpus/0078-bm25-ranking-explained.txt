# BM25 ranking explained

BM25 is the Okapi Best Matching 25 ranking function, introduced by
Robertson and Sparck Jones in the 1990s. After thirty years it remains the
default for many production search systems - a testament to how well its
simple formula captures relevance.

The score of a document for a query is a sum over the query terms it
contains:

```
score = sum over terms of  idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl))
```

Every piece has a purpose. The inverse document frequency, `idf`, rewards
terms that are rare across the corpus and punishes stop-word-ish terms that
appear everywhere. Meridian uses the standard smoothed form
`ln(1 + (N - df + 0.5) / (df + 0.5))`.

The fraction is where the magic lives. `tf` is the term frequency in the
document. Because `tf` sits in both the numerator and the denominator, the
contribution saturates: the tenth mention of a term still helps, but far
less than the first. That models how real text works - repetition matters,
but not linearly.

The constants tune the model. `k1` (1.2) controls saturation: higher values
let term frequency matter longer. `b` (0.75) controls length normalization:
`dl / avgdl` is the document length relative to the average, so longer
documents are penalized for having more chances to mention a term. With
`b = 0` the length term vanishes and BM25 degenerates toward a plain
tf-idf-like model; Meridian exposes both, so the difference is easy to feel.

tf-idf is the simpler ancestor: `sum of tf * idf`, with no saturation and no
length normalization. A term appearing ten times scores exactly ten times as
much as once. BM25's length normalization is why a short document that
mentions a term once can beat a long document that mentions it several
times - exactly the behavior users expect from a search engine.