# Meridian: a full-text search engine in Rust

Meridian is a full-text search engine built **from scratch in Rust**: a
crawler, an inverted index with a compressed postings codec, BM25 and TF-IDF
ranking, a boolean query parser, Porter stemming, fuzzy (typo-tolerant)
retrieval, wildcard and fielded search, phrase slop and term boosting,
stopword filtering, CJK ideographic segmentation, and relevance snippets. The
entire engine is mirrored one-to-one in dependency-free JavaScript, so the
static web UI at [`index.html`](index.html) runs real searches entirely in the
browser over a 112-document corpus of the factory's own documentation.

Zero dependencies: the Rust crate is pure `std`, and the JS mirror is pure
ES5, so both build and run with nothing else installed.

## Build

```sh
cd meridian
cargo build --release
cargo test                    # 126 tests, all pass
cargo clippy --all-targets    # zero warnings
node tests/consistency.test.mjs   # 21226 JS-vs-Rust checks, all pass
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
the engine, and searches the crawled corpus. Switch BM25/TF-IDF, toggle
stemming, ranking signals, and stopword filtering, page through results,
use prefix typeahead, click a did-you-mean suggestion, click a result to open
the full document with your terms highlighted, and use the query chips to
explore the grammar (`term~` fuzzy, `search*` wildcards, `title:rust` fields,
`"a b"~2` slop, `rust^3` boost, and CJK queries).

## CLI

```sh
meridian crawl --src ../ --out corpus --threads 4     # crawl a directory into a corpus
meridian index --corpus corpus --out data/index.json --threads 4   # build + export the index
meridian search --corpus corpus --query "rust AND seismic" --top 5 --stem on
meridian search-index --index data/index.json --query "\"search engine\"" --format json
meridian search-index --index data/index.json --query '"inverted index"~2' --offset 0 --limit 5
meridian search-index --index data/index.json --query "title:rust^2 OR source:docs*"
meridian suggest --index data/index.json --prefix sear --top 6    # prefix typeahead
meridian plan --query "searching~ engine"             # show the parsed query plan
meridian stats --corpus corpus                        # corpus + index statistics
meridian bench --index data/index.json                # built-in query benchmark
meridian verify-index --index data/index.json --corpus corpus   # prove the index round-trips
meridian check                                        # built-in runtime self-checks
```

`search` crawls first (or reuses `corpus/`); `search-index` skips straight to
the exported index for speed. `--scoring bm25|tfidf` picks the ranker,
`--stem on` expands query terms to whole word families, `--stopwords off`
keeps common function words in ranked queries, `--offset`/`--limit` page the
results, `--signals off` disables the title-boost and proximity signals,
`--threads N` sets the worker count for crawl/index/search, `--time` prints
wall-clock ms per phase, and `--format json` prints machine-readable results
with `total_hits`, `pages`, per-term score breakdowns, and byte-exact snippet
highlight ranges.

## What Meridian is

- **Corpus crawler** (`crawl`). Walks a directory deterministically, skips
  hidden/build/out paths, reads UTF-8 text and Markdown, and writes a
  manifest plus one plain-text file per document. The shipped corpus is the
  factory's own repo: 112 documents, 127,441 tokens, 7,859 terms.
- **Tokenizer**. Unicode-aware word rule: `\p{L}`/`\p{N}` runs with
  apostrophes kept inside words (`don't` stays one token), everything else is
  a separator, case is folded. Consecutive CJK characters (Han, Hiragana,
  Katakana, Hangul) are segmented into unigrams plus bigrams, so Chinese and
  Japanese text with no word spaces still finds its terms. Positions are
  tracked per document.
- **Inverted index**. A BTreeMap vocabulary maps each term to a sorted postings
  list of `(doc_id, term_frequency, positions)`. `AND` joins postings by
  intersection (planned rarest-first), phrases require consecutive positions.
- **Postings compression**. Term-gap encoding with variable-length integers
  (LEB128), bit-packed into a JSON-safe base64 payload on export. The shipped
  index stores 127,441 postings in 271 KB, a 5.5x reduction over the raw
  estimate, and `verify-index` proves the decode round-trips byte-for-byte.
- **Ranking**. BM25 (k1=1.2, b=0.75) and TF-IDF, computed from document
  frequency, term frequency, and document length; both are exposed on the CLI
  and in the UI with per-term score breakdowns.
- **Ranking signals**. With `--signals on` (default), titles are boosted 1.5x
  and terms appearing close together in a document earn a proximity bonus
  (weight 0.5), so tight result sets rank sensibly; a `(proximity)` breakdown
  row makes the bonus visible. `--signals off` restores pure BM25/TF-IDF.
- **Stemming**. A faithful Porter stemmer (`src/stem.rs`, unit-tested against
  the canonical 23,531-word reference set) collapses word families: with
  `--stem on`, `searching` also matches `search` and `searches`. A stem-group
  table maps each dictionary term to its family for expansion.
- **Fuzzy retrieval**. `term~` and `term~2` run a Levenshtein + BK-tree lookup
  over the vocabulary (edit distance 1 or 2), so a typo like `inverted~` still
  finds `inverted`. When a plain query term matches nothing, the engine
  proposes did-you-mean suggestions in both the CLI JSON and the web UI.
- **Wildcard retrieval**. `term*` (any run) and `term?` (one char) expand
  against the vocabulary at query time via a dynamic-programming pattern match,
  keeping the fixed prefix before the first wildcard for a cheap dictionary
  scan; `*ing` works but scans the whole vocabulary.
- **Fielded search**. `title:rust` and `source:docs*` restrict matches to a
  metadata field using per-document field token sets, so a field match is a
  hard filter while still contributing score in ranked queries. Fielded terms
  accept wildcards and boosts.
- **Phrase slop**. `"search engine"~2` allows up to N intervening positions
  between phrase words (N=0 is exact), anchored on the rarest phrase term for
  speed.
- **Term boosting**. `rust^3` multiplies a term's score in any ranked query;
  boosts combine with wildcards, fields, fuzz, and phrases. Orphan boosts are
  rejected.
- **Stopword filtering**. A 41-word list drops common function words from
  ranked plain terms only (boolean, phrase, and fielded terms are untouched);
  `--stopwords off` keeps them. On by default.
- **Boolean queries**. Plain words are a ranked OR-style search; any
  `AND`/`OR`/`NOT`/parentheses make it strict boolean (e.g.
  `rust AND NOT chess`), and `"quoted phrases"` match consecutive positions.
  `NOT` is unary prefix. The parser is a hand-written recursive-descent
  grammar, mirrored exactly in JS. `meridian plan` prints the parsed plan.
- **Snippets**. Each hit gets a relevance snippet: byte-exact `[start, end)`
  ranges for every matched term, used by both the CLI text renderer and the
  browser UI to place `<mark>` highlights at exact word boundaries, including
  multi-byte UTF-8 text.
- **Pagination**. `--offset N --limit M` slices the ranked page, reports
  `total_hits` and `pages` in JSON, and renders "showing X..Y of Z" in text;
  the web UI mirrors it with a pager.
- **Concurrency & instrumentation**. `--threads N` parallelizes crawl, index,
  and search over a worker pool with a deterministic merge, so any `N` yields
  the same output (search threads are verified byte-identical). `--time`
  prints per-phase wall-clock ms, and `meridian bench` runs a built-in query
  benchmark against the exported index.
- **JS mirror**. `js/meridian.js` re-implements the engine (tokenizer incl.
  CJK n-grams, base64 varint postings, boolean parser, BM25/TF-IDF, Porter
  stemmer, Levenshtein + BK-tree, wildcards, fields, phrase slop, term boosts,
  stopwords, suggestions, ranking signals, pagination, snippets) in
  dependency-free JavaScript. A consistency harness runs 50 queries through
  both engines with both rankers and a matrix of stem/signals/stopwords
  settings and asserts identical doc sets, order, scores, matches,
  suggestions, and snippet highlights (21,226 checks).

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
postings compression, CJK full-text search, wildcard and fielded search, and
phrase slop and term boosting) plus this README and the crawl of the factory
itself.

MIT licensed.