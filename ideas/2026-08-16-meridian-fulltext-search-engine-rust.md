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

---

# Architecture Level 2: retrieval power-up (enhancement round)

Triggered by the Maintainer on PR #67 after full approval: the merge waits on
the daily shipping cap, so this round ships real retrieval headroom before the
merge. Design goals: keep the zero-dependency, deterministic, dual-language
mirror ethos; add no external crates and no breaking changes to the exported
format or the 2245-check consistency suite.

## Summary

Six next-level capabilities:

1. **Morphological expansion** (Porter stemming): rank "rank/ranking/ranked"
   together via a from-scratch Porter stemmer and a stem-group table.
2. **Fuzzy and typo-tolerant retrieval**: `term~` / `term~2` syntax backed by a
   BK-tree over a Levenshtein metric, plus automatic "did you mean"
   suggestions when a query term matches nothing.
3. **CJK ideographic segmentation**: the tokenizer learns to segment Han/Kana/
   Hangul runs into unigram + bigram tokens so Chinese text is searchable.
4. **More ranking signals**: title-field boosting and phrase-proximity scoring
   on top of BM25/TF-IDF, both mirrored exactly in JS.
5. **Concurrency and instrumentation**: parallel crawl/index with a thread
   pool, `--time` phase timing, and a `bench` command for the Tester.
6. **UI evolution and cleanup**: stem/fuzzy/signals toggles, did-you-mean
   suggestions, timing readout, CJK demo, new seed docs; remove the three
   unused pub functions and document the `plan` command.

## The one architectural decision that keeps the risk low

Every Level 2 feature is a **load-time derived structure or a scorer/parser
change**; the exported index format is unchanged. Both engines already load the
term table, doc metadata, and positions; the new capability data is derived
from what is already there:

- Stem groups: `group terms by stem(word)` (built once at load, O(vocab)).
- BK-tree: built once over the loaded term table (no export needed).
- Title tokens: `tokenize(doc.title)` (titles are already exported).
- Proximity: computed from existing per-doc positions.
- CJK: a tokenizer change only. The shipped corpus must be re-crawled and the
  index rebuilt (`INDEX_VERSION` bumps 1 -> 2) because the token stream for any
  Han text changes; English tokens are byte-identical, so the 2245 consistency
  expectations hold for all existing queries.

This means the JS mirror can stay a faithful line-by-line port and the
consistency harness simply grows new queries.

## Why it fits

Each capability is a genuine, teachable IR topic: morphological normalization
is what real engines do before scoring; fuzzy retrieval is how typo-tolerant
search works; CJK segmentation is the classic hard problem for the modern web;
title/proximity signals are textbook "more ranking signals"; and a thread pool
moves the project from toy to systems-scale. All remain pure Rust std and
dependency-free ES5, so the factory's signature "from scratch" story holds.

## How it works

### 1. Stemming (`src/stem.rs`, `Meridian.stem`)

- Classic Porter stemmer, from scratch, applied to ASCII words of length >= 3;
  shorter and non-ASCII words pass through unchanged (deterministic).
- `pub fn stem(word: &str) -> String`. Unit-tested against the canonical
  Porter vectors ("caresses"->"caress", "ponies"->"poni", "ties"->"ti",
  "caress"->"caress", "cats"->"cat", "feed"->"feed", "agreed"->"agre",
  "plastered"->"plaster", "motoring"->"motor", "sing"->"sing",
  "conflated"->"conflat", "troubled"->"troubl", "sized"->"size",
  "hopping"->"hop", "tanned"->"tan", "falling"->"fall", "hissing"->"hiss",
  "fizzed"->"fizz", "failing"->"fail", "filing"->"file", "happy"->"happi",
  "sky"->"sky", "relational"->"relat", "conditional"->"condit",
  "rational"->"ration", "valenci"->"valenc", "hesitanci"->"hesit",
  "digitizer"->"digit", "conformabli"->"conform", "radicalli"->"radic",
  "differentli"->"differ", "vileli"->"vile", "analogousli"->"analog",
  "vietnamization"->"vietnam", "predication"->"predic", "operator"->"oper",
  "feudalism"->"feudal", "decisiveness"->"decis", "hopefulness"->"hope",
  "callousness"->"callous", "formaliti"->"formal", "sensitiviti"->"sensit",
  "sensibiliti"->"sensibl", "triplicate"->"triplic", "formative"->"form",
  "formalize"->"formal", "electriciti"->"electr", "electrical"->"electr",
  "hopeful"->"hope", "goodness"->"good", "revival"->"reviv",
  "allowance"->"allow", "inference"->"infer", "airliner"->"airlin",
  "gyroscopic"->"gyroscop", "adjustable"->"adjust", "defensible"->"defens",
  "irritant"->"irrit", "replacement"->"replac", "adjustment"->"adjust",
  "dependent"->"depend", "adoption"->"adopt", "homologou"->"homolog",
  "communism"->"commun", "activate"->"activ", "angulariti"->"angular",
  "homologous"->"homolog", "effective"->"effect", "bowdlerize"->"bowdler",
  "probate"->"probat", "rate"->"rate", "cease"->"ceas",
  "controll"->"control", "roll"->"roll").
- Stem groups: `pub fn stem_groups(terms) -> BTreeMap<String, Vec<String>>`
  maps `stem -> sorted vocab terms`. Built at load in both Rust and JS.
- Query path: `--stem on` (default off) expands each ranked query term `t` to
  `stem_groups[stem(t)]` (falling back to `[t]`); scoring, matches, and
  breakdown use the expanded vocab terms (so snippets highlight real document
  words). Phrase words are never stemmed (documented). Boolean `Term` leaves
  expand; quoted phrases stay exact.

### 2. Fuzzy retrieval (`src/fuzzy.rs`, `Meridian` fuzzy helpers)

- `pub fn levenshtein(a: &str, b: &str) -> usize` over char (unicode scalar)
  sequences. Plain Levenshtein is a true metric, so the BK-tree's
  triangle-inequality pruning is sound; transposition (Damerau) is deliberately
  not used for retrieval because it breaks that property.
- `pub struct BkTree` built from the loaded term table; `search(query, max) ->
  Vec<(String, usize)>` returns vocabulary terms within edit distance `max`,
  sorted by `(distance, term)`.
- Query syntax: `term~` -> distance 1, `term~2` -> distance 2 (validated: `~N`
  only accepts 1 or 2; anything else is a parse error). The lexer reads a `~`
  directly after a word (no space). `Plan` and `BoolExpr` gain a
  `Fuzzy(String, usize)` variant. A fuzzy term evaluates to the sorted union of
  the postings of every within-distance vocab term; in ranked mode each matched
  vocab term appears in `matches` and `breakdown`.
- Did you mean: any non-fuzzy query term with zero vocabulary hits triggers a
  BK search (distance <= 2); the nearest candidates are surfaced as
  `suggestions` in the JSON search output and as a clickable line in the UI.
- JS mirror: identical `levenshtein`, `buildBk`, `bkSearch`, same expansion
  order so candidate sets match exactly.

### 3. CJK ideographic segmentation (tokenizer change)

- CJK-run characters: Han ideographs (U+3400..U+4DBF, U+4E00..U+9FFF,
  U+F900..U+FAFF) plus Hiragana, Katakana, and Hangul syllables.
- Rule: a maximal run of consecutive CJK characters is segmented into unigram
  tokens (each char at its position) AND overlapping bigram tokens (c[i]c[i+1]
  at position i). Non-CJK alphanumeric runs keep the existing word rule. So
  "搜索引擎" yields unigrams "搜","索","引","擎" plus bigrams
  "搜索","索引","引擎"; "搜索引擎abc" yields the CJK run then the word "abc".
- Phrase matching over CJK is approximate (documented limitation): exact
  consecutive-position phrase checks still work where the segmentation aligns;
  ranked CJK search is the primary path and works via unigram + bigram
  scoring.
- Seed content: new article `meridian/docs/articles/cjk-and-ideographic-search.md`
  (mix of English prose and Chinese examples) so the corpus, the UI demo, and
  the tests all exercise CJK end to end. Re-crawl the corpus, rebuild
  `data/index.json`, bump `INDEX_VERSION` 1 -> 2 (the token stream semantics
  changed; `verify-index` against a stale index now fails loudly).

### 4. Ranking signals (`--signals on|off`, default on)

- Title boost: a scored term that also appears in the doc's tokenized title
  (titles are already in the export; tokenized at load) has its contribution
  multiplied by `TITLE_BOOST = 1.5`. Breakdown records it so the UI can show a
  "title" tag.
- Proximity: for ranked queries with >= 2 distinct terms, add
  `PROX_WEIGHT * sum over unordered term pairs (both present) of
  1/(1 + min pairwise absolute position distance)`. `PROX_WEIGHT = 0.5`.
  Reported in the breakdown as a pseudo-row `(proximity)`. Both engines use a
  two-pointer scan over sorted positions so the value is bit-identical.
- With `--signals off` the scorer returns classic pure BM25/TF-IDF (keeps the
  "ranked vs classic" toggle story and gives the consistency harness a stable
  baseline).

### 5. Concurrency and instrumentation

- `--threads N` on `crawl` and `index` (default `available_parallelism`):
  `std::thread::scope` with a fixed worker pool and a shared
  `Mutex<VecDeque<PathBuf>>` work queue. Determinism is preserved by
  collecting results and sorting them (crawl: by source path before manifest
  ids; index: per-doc tokenization chunks merged in doc order) so
  `--threads 1` and `--threads 8` produce byte-identical corpora and indexes.
  A Rust test asserts exactly that.
- `--time` prints wall-clock ms for each phase (crawl, index, search).
- New `bench` command: `meridian bench --index <json> [--iterations N]` runs a
  built-in query set, reports per-query average ms and throughput. The Tester
  uses it for performance checks.

### 6. UI evolution and cleanup

- Toolbar gains two segmented toggles: "word forms" (stem) and "titles &
  proximity" (signals); both re-run the current query.
- "Did you mean: X" line under the status when a term has zero hits; clicking
  it replaces the query term.
- Status line shows query time in ms; breakdown bars render title-boosted and
  proximity rows with labels.
- New example chips: `searching~` (fuzzy), `搜索引擎` (CJK), a proximity demo.
- Help panel documents `term~N`, the toggles, and the CJK limitation.
- Cleanup: remove `tokenizer::unique_terms` and `index::document_tokens` (both
  unused); wire `export::posting_repr` into `stats --format json`; document the
  `plan` command in `usage()` and the README.

## Module breakdown

- `src/stem.rs` (new) - Porter stemmer, stem-group table, `stem`/`stem_groups`.
- `src/fuzzy.rs` (new) - Levenshtein, BK-tree, `build_bk`, `search`, did-you-mean
  lookup.
- `src/tokenizer.rs` - CJK run detection + unigram/bigram segmentation.
- `src/query.rs` - lexer `~N` support, `Fuzzy` plan/expr variant, stem
  expansion, fuzzy evaluation, suggestions collection.
- `src/scoring.rs` - title boost + proximity, `--signals` gate.
- `src/corpus.rs`, `src/cli.rs` - thread pool, `--threads`, `--time`, `bench`.
- `src/export.rs` - `INDEX_VERSION = 2`; `posting_repr` wired into stats JSON.
- `js/meridian.js` - mirror stem/fuzzy/CJK/proximity/title logic.
- `js/ui.js`, `index.html` - toggles, did-you-mean, timing, chips, help.
- `tests/` - expanded consistency + UI suites; new Rust integration tests.
- `docs/articles/` - new CJK article (+ optional stemming/fuzzy article); README
  and docs pages updated.

## Test matrix

| Area | Rust | JS mirror / consistency | UI |
| --- | --- | --- | --- |
| Stemmer | canonical Porter vectors, non-ASCII/short passthrough, stem-group shape | `Meridian.stem` vectors, expansion equality | - |
| Fuzzy | Levenshtein vectors, BK recall == brute force, sort order, `~2`/`~3` bounds | `term~`, `term~2`, fuzzy-in-boolean, did-you-mean equality | did-you-mean helper + click |
| CJK | run segmentation, unigram+bigram positions, mixed runs, Kana/Hangul | `搜索引擎` ranked query equality | demo chip |
| Signals | title boost multiplier, proximity ordering, signals-off == classic | title + proximity breakdown equality (both rankers) | breakdown rows render |
| Concurrency | threads=1 == threads=8 (corpus + index byte-identical), bench runs | - | - |
| Export | v2 round-trip, verify-index on rebuilt index | index loads v2 | stats panel |
| End-to-end | `cargo test`, clippy 0 | 2245 baseline + new queries stay green | ui.test grows |

## Deliverables

- Two new Rust modules (stem, fuzzy), tokenizer/query/scoring/cli extensions,
  and 25-35 new Rust tests.
- Expanded JS mirror with matching helpers and a grown consistency suite.
- CJK seed article + re-crawled corpus + rebuilt v2 index.
- UI toggles, did-you-mean, timing, new chips, updated help.
- Cleanup of unused functions and `plan` documentation.
- Updated README, docs index, and this blueprint's milestone status.

## Handoff

Status moves back to in-progress; the Builder resumes on the existing PR branch
and works through milestones 12-18, re-verifying the full matrix before handing
to the Reviewer. Decision file: action=continue.