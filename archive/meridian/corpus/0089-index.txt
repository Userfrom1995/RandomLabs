# Meridian: a full-text search engine in Rust

**Meridian** is a full-text search engine written **from scratch in Rust**:
a corpus crawler, an inverted index with a compressed varint postings codec,
BM25 and TF-IDF ranking, a boolean query parser, Porter stemming, fuzzy
(typo-tolerant) retrieval, wildcard and fielded search, phrase slop and term
boosting, stopword filtering, CJK ideographic segmentation, ranking signals,
pagination, and relevance snippets. The engine is mirrored one-to-one in
dependency-free JavaScript, so the static web UI searches a 112-document
corpus of the factory's own documentation entirely in the browser. Zero
dependencies: the crate is pure `std`, the mirror is pure ES5.

## What it is

- **Corpus crawler.** Walks a directory deterministically (skipping hidden,
  build, and out paths), reads UTF-8 text and Markdown, and writes a manifest
  plus one plain-text file per document. The shipped corpus is the factory's
  repo: 112 documents, 127,441 tokens, 7,859 terms.
- **Tokenizer.** Unicode-aware word rule: `\p{L}`/`\p{N}` runs with
  apostrophes kept inside words (`don't` stays one token), everything else is
  a separator, case is folded, and per-document positions are tracked.
  Consecutive CJK characters (Han, Hiragana, Katakana, Hangul) are segmented
  into unigrams plus bigrams so spaceless Chinese and Japanese text finds its
  terms.
- **Inverted index.** A BTreeMap vocabulary maps each term to a sorted postings
  list of `(doc_id, term_frequency, positions)`. `AND` joins postings by
  intersection (planned rarest-first), phrases require consecutive positions.
- **Postings compression.** Term-gap encoding with variable-length integers
  (LEB128), bit-packed into a JSON-safe base64 payload on export. The shipped
  index stores 127,441 postings in 271 KB (a 5.5x reduction over the raw
  estimate), and `verify-index` proves the decode round-trips byte-for-byte.
- **Ranking.** BM25 (k1=1.2, b=0.75) and TF-IDF from document frequency, term
  frequency, and document length, with per-term score breakdowns in both the
  CLI and the UI.
- **Ranking signals.** Titles are boosted 1.5x and near-neighbor terms earn a
  proximity bonus (weight 0.5), with a visible `(proximity)` breakdown row;
  `--signals off` restores pure BM25/TF-IDF.
- **Stemming.** A faithful Porter stemmer (tested against the canonical
  23,531-word reference set) collapses word families; `--stem on` makes
  `searching` match `search` too, in both ranked and boolean queries.
- **Fuzzy retrieval.** `term~` (edit distance 1) and `term~2` (distance 2) run
  a Levenshtein + BK-tree lookup, and misspelled plain terms get did-you-mean
  suggestions in the CLI and the UI.
- **Wildcard retrieval.** `term*` (any run) and `term?` (one char) expand
  against the vocabulary at query time, keeping the fixed prefix before the
  first wildcard; `*ing` scans the whole vocabulary but still works.
- **Fielded search.** `title:` and `source:` restrict matches to a metadata
  field via per-document field token sets; fielded wildcards (`source:docs*`)
  expand against the field vocabulary. Fielded terms still score in ranked
  queries, and combine with boost.
- **Phrase slop.** `"a b"~N` allows up to N intervening positions between
  phrase words, anchored on the rarest term for speed; `~0` is exact.
- **Term boosting.** `term^N` multiplies a term's score (plain, fuzzy,
  wildcard, fielded, or phrase), and `"a b"^2` boosts a phrase. Orphan boosts
  are rejected.
- **Stopword filtering.** A 41-word list drops common function words from
  ranked plain terms only (never boolean, phrase, or fielded terms); toggle
  with `--stopwords on|off`, on by default.
- **Boolean queries.** Plain words are a ranked OR-style search; any
  `AND`/`OR`/`NOT`/parentheses make it strict boolean, and `"quoted phrases"`
  match consecutive positions. `NOT` is unary prefix. The parser is a
  hand-written recursive-descent grammar, mirrored exactly in JS.
- **Snippets.** Byte-exact `[start, end)` ranges for every matched term, used
  to place `<mark>` highlights at exact word boundaries in both the CLI and
  the browser, including multi-byte UTF-8 text.
- **Concurrency & instrumentation.** `--threads N` parallelizes crawl, index,
  and search (with a deterministic, byte-identical merge), `--time` prints
  per-phase ms, and `meridian bench` runs a built-in query benchmark.
- **JS mirror.** `js/meridian.js` re-implements the engine in dependency-free
  JavaScript; a consistency harness runs 50 queries through both engines with
  both rankers and a stem/signals/stopwords matrix and asserts identical doc
  sets, order, scores, matches, suggestions, and snippet highlights (21,226
  checks).

## Try it

```sh
cd meridian
python3 -m http.server 8000        # open http://localhost:8000 for the web UI

cargo build --release
cargo test                    # 126 tests, all pass
cargo clippy --all-targets    # zero warnings
node tests/consistency.test.mjs   # 21226 JS-vs-Rust checks
node tests/ui.test.mjs            # headless UI rendering checks
```

## CLI commands

| Command | What it does |
|---|---|
| `meridian crawl --src <dir> --out <corpus> [--threads N]` | Crawl a directory into a corpus (manifest + plain-text docs). |
| `meridian index --corpus <dir> --out <json> [--threads N]` | Build the inverted index and export the compressed JSON index. |
| `meridian search --corpus <dir> --query <q> [--scoring bm25\|tfidf] [--top N] [--offset N] [--limit N] [--threads N] [--format text\|json] [--stem on\|off] [--signals on\|off] [--stopwords on\|off]` | Crawl (or reuse) the corpus and search it. |
| `meridian search-index --index <json> --query <q> [--corpus <dir>] [...]` | Search an exported index directly. |
| `meridian suggest --index <json> --prefix <p> [--top N]` | Suggest terms by prefix (typeahead). |
| `meridian plan --query <q>` | Print the parsed query plan. |
| `meridian stats --corpus <dir>` | Corpus and index statistics (docs, tokens, vocabulary, compression). |
| `meridian bench --index <json> [--iterations N]` | Run the built-in query benchmark. |
| `meridian verify-index --index <json> --corpus <dir>` | Prove the exported index round-trips byte-for-byte. |
| `meridian check` | Run the built-in runtime self-checks. |
| `meridian help` | Show usage and all options. |

Example:

```sh
./target/release/meridian search --corpus corpus --query "rust AND seismic" --top 5 --stem on
./target/release/meridian search-index --index data/index.json --query "searching~ engine" --format json
./target/release/meridian search-index --index data/index.json --query '"inverted index"~2' --offset 0 --limit 5
./target/release/meridian search-index --index data/index.json --query "title:rust^2 OR source:docs*"
./target/release/meridian suggest --index data/index.json --prefix sear --top 6
```

## How it works

- **Crawl.** Each document becomes one plain-text file plus a manifest entry
  with a stable source path, title (first heading or filename), and URL. The
  output is deterministic: same tree, same corpus.
- **Tokenize.** Chars are walked once; `\p{L}`/`\p{N}` starts a word,
  apostrophes between letters stay inside it, case is folded, and the byte
  offset of every word boundary is recorded so snippets can be byte-exact.
  CJK runs are split into unigrams and bigrams sharing positions.
- **Index.** A postings list per term is kept sorted by document id; document
  frequency, term frequency, and positions fall out of the construction.
  `AND` plans the intersection rarest-first, `OR` unions, `NOT` subtracts, and
  phrases intersect consecutive positions. Stemmed queries expand each term to
  its stem family; fuzzy leaves expand via the BK-tree.
- **Compress.** Postings store `(doc_id gap, tf, position gaps)` as LEB128
  varints packed into a byte array, base64-encoded for JSON. Decoding is the
  exact inverse; `verify-index` re-encodes and compares.
- **Expand.** Query terms are expanded before scoring: wildcards run a
  dynamic-programming pattern match against the vocabulary (pruned by the
  fixed prefix), stemmed terms widen to their stem family, fuzzy leaves query
  the BK-tree, and fielded terms resolve against the per-field token sets.
  Boost and slop are resolved at parse time into the plan.
- **Rank.** BM25 scores `idf * tf*(k1+1) / (tf + k1*(1 - b + b*len/avgLen))`
  and TF-IDF scores `tf * log(N/df)`. Ranked queries sum per-term scores
  (multiplied by any boost); boolean queries compute matches first and rank
  the surviving set. With signals on, title terms get a 1.5x boost and
  co-located terms a 0.5x proximity bonus.
- **Page.** Search ranks the top `max(top, offset + limit)` scored documents
  (`--threads N` splits the postings merge deterministically), then slices the
  page `[offset, offset + limit)` and reports `total_hits` and `pages` so the
  CLI and UI pagers stay consistent.
- **Snippet.** The best window around the densest cluster of matches is
  chosen, snapped to word boundaries, and returned with the byte ranges of
  every matched term so renderers can highlight without re-tokenizing.

## Design choices

- **From scratch.** No crates, no node packages, no search library: the whole
  pipeline is written against the Rust standard library and browser JS. This
  is what makes the cross-language mirror possible.
- **One engine, two languages.** Instead of a web server, the ranking,
  parsing, and snippet logic is ported line-by-line to JS so the UI is a
  static site. A consistency suite keeps the two implementations honest.
- **Deterministic end to end.** Crawl order, token positions, and scores are
  fully deterministic; the same command always produces the same index and
  ranked output.
- **Self-verifying.** `meridian check` re-runs core invariants at runtime, and
  the test suite covers every module plus the JS mirror.

## Source

The project lives in
[`meridian/`](https://github.com/Userfrom1995/Random/tree/main/meridian) with
the web UI at
[`meridian/index.html`](https://github.com/Userfrom1995/Random/tree/main/meridian/index.html),
a [README](https://github.com/Userfrom1995/Random/blob/main/meridian/README.md),
and a full writeup in
[`ideas/2026-08-16-meridian-fulltext-search-engine-rust.md`](https://github.com/Userfrom1995/Random/blob/main/ideas/2026-08-16-meridian-fulltext-search-engine-rust.md).