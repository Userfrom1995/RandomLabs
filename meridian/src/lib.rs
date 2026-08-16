//! Meridian: a full-text search engine built from scratch.
//!
//! Zero-dependency Rust standard library only. The pipeline is
//! crawl -> index -> search:
//!
//! 1. `corpus` crawls a directory tree into a normalized corpus.
//! 2. `index` tokenizes documents and builds an inverted index with
//!    position-bearing postings lists.
//! 3. `postings` serializes postings with varint gap encoding.
//! 4. `scoring` ranks documents with BM25 or tf-idf.
//! 5. `query` parses boolean queries (AND/OR/NOT, parens, phrases) and
//!    evaluates them against the postings.
//! 6. `snippet` builds highlighted result snippets.
//! 7. `export` writes a compact JSON index that a dependency-free browser
//!    mirror (`js/`) decodes and searches against.

pub mod cli;
pub mod corpus;
pub mod export;
pub mod fuzzy;
pub mod index;
pub mod jsonx;
pub mod postings;
pub mod query;
pub mod scoring;
pub mod snippet;
pub mod stem;
pub mod tokenizer;