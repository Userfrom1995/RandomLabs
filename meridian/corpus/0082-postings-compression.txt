# Postings compression

An inverted index is only useful if it fits in memory. A corpus of millions
of documents has hundreds of millions of postings, and storing each as a
tuple of integers wastes bytes that could serve as cache. The classic answer
is gap encoding with variable-length integers.

Postings lists are sorted by document id. Sorted means the gaps between
consecutive ids are typically tiny: if a term appears in documents 100, 102,
and 103, the gaps are 100, 2, and 1. A 32-bit integer stores all three with
plenty of waste; a varint stores each in one byte. The same applies to
positions inside a document, which are also sorted and therefore also have
small deltas.

A varint - LEB128, in the standard formulation - writes an integer seven
bits at a time. The low seven bits of each byte carry data and the high bit
says whether more bytes follow. Values under 128 occupy a single byte,
values up to 16383 occupy two, and so on. Decoding is a loop that shifts and
masks; encoding is the reverse. It is almost the cheapest possible
compression, and it is exactly what inverted-index postings need.

Meridian serializes a postings list as: for each posting, the document-id
gap, the term frequency, then the position deltas. The whole stream is
base64-encoded into the exported JSON index, so the browser mirror decodes
real compressed postings rather than a hand-expanded approximation. On a
typical corpus the compressed postings run about four to five times smaller
than the raw arrays - visible in `meridian stats`.

Compression has a second benefit beyond size: it is the format, not an
afterthought. The Rust engine, the verification tool, and the JavaScript
mirror all speak the same byte format. `meridian verify-index` rebuilds the
index from the exported JSON and compares it against a fresh build, proving
that what the browser searches is exactly what the Rust engine would have
searched - no drift, no second implementation to trust on faith.