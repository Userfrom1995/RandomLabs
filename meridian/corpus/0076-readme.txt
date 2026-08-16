# Meridian: a full-text search engine in Rust

Meridian is a full-text search engine built **from scratch in Rust**: a
crawler, an inverted index with a compressed postings codec, BM25 and TF-IDF
ranking, a boolean query parser, and relevance snippets. The entire engine is
mirrored one-to-one in dependency-free JavaScript, so the static web UI at
[`index.html`](index.html) runs real searches entirely in the browser over a
105-document corpus of the factory's own documentation.

Zero dependencies: the Rust crate is pure `std`, and the JS mirror is pure
ES5, so both build and run with nothing else installed.

## Build

```sh
cd meridian
cargo build --release
cargo test                    # 61 tests, all pass
cargo clippy --all-targets    # zero warnings
node tests/consistency.test.mjs   # 2245 JS-vs-Rust checks, all pass
node tests/ui.test.mjs            # headless UI rendering checks
```

Requires a stable Rust toolchain (1.70+) and node (for the mirror tests).
No external crates.

## Try the web UI

```sh
cd meridian
python3 -m http.server 8000        # then open http://localhost:8000
```

The page loads the prebuilt index (`data/index.json`), runs the JS mirror of
the engine, and searches the crawled corpus. Switch BM25/TF-IDF, click a result
to open the full document with your terms highlighted, and use the query chips
to explore the boolean grammar.

## CLI

```sh
meridian crawl --src ../ --out corpus              # crawl a directory into a corpus
meridian index --corpus corpus --out data/index.json   # build + export the index
meridian search --corpus corpus --query "rust AND seismic" --top 5
meridian search-index --index data/index.json --query "\"search engine\"" --format json
meridian stats --corpus corpus                     # corpus + index statistics
meridian verify-index --index data/index.json --corpus corpus   # prove the index round-trips
meridian check                                     # built-in runtime self-checks
```

`search` crawls first (or reuses `corpus/`); `search-index` skips straight to
the exported index for speed. `--scoring bm25|tfidf` picks the ranker,
`--format json` prints machine-readable results with per-term score breakdowns
and byte-exact snippet highlight ranges.

## What Meridian is

- **Corpus crawler** (`crawl`). Walks a directory deterministically, skips
  hidden/build/out paths, reads UTF-8 text and Markdown, and writes a
  manifest plus one plain-text file per document. The shipped corpus is the
  factory's own repo: 105 documents, 113,946 tokens, 6,880 terms.
- **Tokenizer**. Unicode-aware word rule: `\p{L}`/`\p{N}` runs with
  apostrophes kept inside words (`don't` stays one token), everything else is
  a separator, case is folded. Positions are tracked per document.
- **Inverted index**. A BTreeMap vocabulary maps each term to a sorted postings
  list of `(doc_id, term_frequency, positions)`. `AND` joins postings by
  intersection (planned rarest-first), phrases require consecutive positions.
- **Postings compression**. Term-gap encoding with variable-length integers
  (LEB128), bit-packed into a JSON-safe base64 payload on export. The shipped
  index stores 113,946 postings in 248 KB, a 5.5x reduction over the raw
  estimate, and `verify-index` proves the decode round-trips byte-for-byte.
- **Ranking**. BM25 (k1=1.2, b=0.75) and TF-IDF, computed from document
  frequency, term frequency, and document length; both are exposed on the CLI
  and in the UI with per-term score breakdowns.
- **Boolean queries**. Plain words are a ranked OR-style search; any
  `AND`/`OR`/`NOT`/parentheses make it strict boolean (e.g.
  `rust AND NOT chess`), and `"quoted phrases"` match consecutive positions.
  `NOT` is unary prefix. The parser is a hand-written recursive-descent
  grammar, mirrored exactly in JS.
- **Snippets**. Each hit gets a relevance snippet: byte-exact `[start, end)`
  ranges for every matched term, used by both the CLI text renderer and the
  browser UI to place `<mark>` highlights at exact word boundaries, including
  multi-byte UTF-8 text.
- **JS mirror**. `js/meridian.js` re-implements the engine (tokenizer, base64
  varint postings, boolean parser, BM25/TF-IDF, snippets) in dependency-free
  JavaScript. A consistency harness runs 20 queries through both engines with
  both rankers and asserts identical doc sets, order, scores, matches, and
  snippet highlights (2,245 checks).

## Design choices

- **From scratch.** No crates, no node packages, no search library: the whole
  pipeline is written against the Rust standard library and browser JS. This
  is what makes the cross-language mirror possible, and it makes every part
  inspectable.
- **One engine, two languages.** Rather than a web server, the ranking,
  parsing, and snippet logic is ported line-by-line to JS so the UI is a
  static site. The consistency suite keeps the two honest.
- **Deterministic end to end.** Crawl order, token positions, and scores are
  fully deterministic; the same command always produces the same index and the
  same ranked output.
- **Self-verifying.** `meridian check` re-runs the core invariants at runtime,
  and the test suite covers every module plus the JS mirror.

## Docs

The [docs/](docs/) folder is the project's full documentation and doubles as a
searchable corpus: it includes an article series on how search engines work
(the inverted index, BM25, boolean query languages, tokenization, snippets,
postings compression) plus this README and the crawl of the factory itself.

MIT licensed.