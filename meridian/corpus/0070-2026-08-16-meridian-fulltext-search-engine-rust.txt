# Meridian: a full-text search engine built from scratch in Rust

- **Date:** 2026-08-16
- **Issue:** #66
- **Language:** Rust (zero dependencies) + dependency-free JavaScript mirror
- **Category:** Search engine / information retrieval (first for the factory)

## What it is

Meridian is a complete full-text search engine written from scratch in Rust,
in the spirit of a mini Google: a corpus crawler, a unicode-aware tokenizer,
an inverted index with position-bearing postings lists, tf-idf and BM25
ranking, a boolean query parser (AND/OR/NOT, parentheses, quoted phrases), and
snippet generation - all wrapped in a statically-hostable web search UI that
runs over a curated document set (the factory's own documentation, plus
information-retrieval articles written for the project).

## Why it fits

Search is the invisible backbone of the internet. Meridian makes every layer
tangible: tokenizing a document, building and compressing an inverted index,
scoring a ranked result list, and resolving boolean queries against postings.
It is a fresh category (search engine) and a fresh language relative to the
last three picks (Julia, Haskell, Kotlin). Rust is proven factory tooling
(Aftershock), and a zero-dependency crate compiles cleanly and tests fast.

## How it works

The pipeline is a real crawl -> index -> search pipeline, all driven from the
CLI:

1. **Crawler** (`meridian crawl --src <dir> --out <corpus>`): walks a
   directory tree, picks up text/markdown documents, normalizes them into a
   clean corpus directory plus a `manifest.json` (id, title, source, url).
2. **Indexer** (`meridian index --corpus <dir> --out <json>`): tokenizes every
   document, builds an in-memory inverted index (term -> postings list of
   `{doc_id, term_frequency, positions}`), sorts the vocabulary and postings
   deterministically, and exports a compact JSON index.
3. **Postings compression**: postings are serialized with varint gap encoding
   (LEB128): doc ids and positions as deltas, term frequency inline. The
   exported `index.json` carries these as base64 varint byte strings, giving a
   real, measurable compression ratio. A hand-written JSON parser in Rust
   rebuilds the index from the exported file to verify the round trip.
4. **Search** (`meridian search --corpus <dir> --query "..."` or
   `meridian search-index --index <json> --query "..."`): the boolean query
   parser (recursive descent over AND/OR/NOT/parens/phrases) compiles to a
   plan that is evaluated against the postings with sorted-list set operations.
   AND intersections are ordered rarest-term-first (query optimization).
   Default space-separated queries are OR-scored like a real search engine.
5. **Ranking**: BM25 (k1=1.2, b=0.75) is the default scorer, tf-idf is
   available via a flag; snippets are generated around the best cluster of
   matched term positions with highlight offsets.
6. **Web UI**: `index.html` + a dependency-free JS mirror (same tokenizer,
   boolean parser, BM25, snippet rules) decodes the exported index and
   searches entirely in the browser. A node-based test proves the JS mirror
   returns the same ranked results as the Rust CLI on the same corpus.

## Key files

- `src/tokenizer.rs` - unicode-aware tokenizer (positions, case folding).
- `src/corpus.rs` - crawler + corpus loading (manifest.json).
- `src/index.rs` - inverted index construction and accessors.
- `src/postings.rs` - varint gap encoding/decoding.
- `src/scoring.rs` - tf-idf and BM25.
- `src/query.rs` - lexer, parser, plan, evaluator.
- `src/snippet.rs` - snippet + highlight generation.
- `src/jsonx.rs` - hand-written JSON reader/writer.
- `src/export.rs` - index serialization to the web JSON format.
- `src/cli.rs`, `src/main.rs` - the CLI.
- `js/` - the browser mirror (index loader, search, UI).
- `corpus/` - the curated document set; `data/index.json` - the prebuilt index.

## Notes

- Zero external crates; pure Rust standard library.
- Everything is deterministic: same corpus + query -> same results.
- The web UI is statically hostable on GitHub Pages at
  `https://userfrom1995.github.io/Random/meridian/`.
- MIT licensed.