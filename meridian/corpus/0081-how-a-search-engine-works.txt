# How a search engine works

A full-text search engine answers one question: given a query, which
documents in a collection are relevant, and in what order? Underneath the
familiar search box, four layers do the work.

First comes acquisition. A crawler finds documents and pulls their text into
a corpus. In Meridian the crawler is deliberately simple: it walks a
directory tree, picks up text and markdown files, and normalizes them into a
clean corpus with a manifest. Real search engines crawl the web, but the
problem is the same - gather text, remember where it came from, and hand it
to the indexer.

Second comes indexing. Naively answering a query would mean reading every
document each time, which does not scale. Instead the engine reads the whole
corpus once and builds an inverted index: for every term, a list of the
documents that contain it and where. A query then becomes a few list lookups
instead of a full scan. The index is the heart of every search engine, and
much of its engineering is about keeping it small and fast.

Third comes ranking. The candidate documents must be ordered by relevance.
Two classic families exist. tf-idf weights a term by how often it appears in
a document (term frequency) against how many documents contain it
(inverse document frequency), so a rare term in a document says more than a
common one. BM25 refines that with document-length normalization and
term-frequency saturation, and remains the default ranking function of many
production engines decades after it was published.

Fourth comes presentation. The engine must show why a document matched:
a snippet that contains the query terms, with highlights. A good snippet
lets the user judge relevance without opening the document.

Meridian implements all four layers from scratch, in Rust, with zero
dependencies. Crawl the text, build the index, compress the postings, rank
with BM25 or tf-idf, and render snippets - the whole chain is visible and
testable.