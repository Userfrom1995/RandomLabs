# Progress - Meridian

- **Issue:** #66
- **Branch:** opencode/issue66-20260816031421
- **Status:** in-progress
- **Updated:** 2026-08-16T11:30:00Z

## Checklist
- [x] 1. Scaffolding: Cargo project skeleton (src/js/tests/corpus/docs), progress + ideas entries, branch, PR
- [x] 2. Core engine: tokenizer (unicode, positions), corpus crawler, inverted index with postings
- [x] 3. Postings compression (varint gap encoding) + compact JSON export + hand-written JSON parser round-trip
- [x] 4. Ranking: tf-idf and BM25 scoring
- [x] 5. Boolean query parser + evaluator (AND/OR/NOT, quoted phrases, rarest-first planning) + snippet generation
- [x] 6. CLI: crawl / index / search / search-index / stats / verify-index / selftest, strict arg validation
- [x] 7. Corpus: crawl repo docs into a curated real-text corpus + prebuilt `data/index.json`
- [x] 8. Web UI: `index.html` + JS mirror (varint decode, tokenizer, boolean parser, BM25, snippets)
- [x] 9. Tests: Rust unit + integration + JS mirror consistency vs CLI search results
- [x] 10. Docs: README, docs/index.html + index.md; root landing page + root README entries
- [x] 11. Iteration/improvement cycle + final polish; Status: complete
- [x] 12. Stemming & morphological expansion: Porter stemmer (`src/stem.rs` + `Meridian.stem`), stem-group table, `--stem` flag, expansion in ranked + boolean Term leaves, JS mirror + consistency
- [x] 13. Fuzzy & typo-tolerant retrieval: Levenshtein + BK-tree (`src/fuzzy.rs` + JS mirror), `term~`/`term~2` syntax, `Fuzzy` plan/expr variant, did-you-mean suggestions in JSON + UI
- [x] 14. CJK ideographic segmentation: Han/Kana/Hangul run detection, unigram + bigram tokens, CJK seed article, re-crawl corpus + rebuild index (`INDEX_VERSION` -> 2)
- [x] 15. Ranking signals: title boost (TITLE_BOOST 1.5) + proximity scoring (PROX_WEIGHT 0.5), `--signals on|off`, breakdown rows, JS mirror + consistency
- [x] 16. Concurrency & instrumentation: `--threads N` thread pool for crawl/index with deterministic merge, `--time` phase timing, `bench` command
- [x] 17. UI evolution & cleanup: stem/fuzzy/signals toggles, did-you-mean line, ms timing, CJK/fuzzy chips, help update; remove unused fns (`unique_terms`, `document_tokens`), wire `posting_repr` into `stats --format json`, document `plan` in usage + README
- [x] 18. Re-verification & handoff: cargo test (90) + clippy 0, consistency suite (9296), ui.test (25), verify-index on v2, README/docs updates, hand off to Reviewer
- [x] 19. Wildcard & prefix retrieval: `src/wildcard.rs` pattern matching (`*`, `?`), prefix range expansion over sorted vocab, `TermSpec::Wildcard` / `BoolExpr::Wildcard`, ranked + boolean evaluation, JS mirror + consistency
- [x] 20. Fielded search: `src/fields.rs` load-time per-field token sets (title/source from exported docs), `title:` / `source:` lexer + boolean leaf + ranked filter, breakdown field tags, JS mirror + consistency
- [x] 21. Phrase slop: `"a b"~N` ordered-slop position intersection (N 0..=9, default ~0 = exact), parser + evaluator, JS mirror + consistency
- [x] 22. Query term boosting: `term^N`, `"phrase"^N`, `title:x^N`, `term~^N` boost multiplier in scorer + breakdown, validation errors, JS mirror + consistency
- [x] 23. Pagination & result metadata: `--offset` / `--limit`, `total_hits` / `pages` in JSON + text, UI pager
- [x] 24. Search-as-you-type: `suggest` command (prefix -> vocab ranked by df desc, term asc), UI typeahead dropdown (debounced), JS mirror helper + consistency
- [x] 25. Concurrency, stopwords, docs & polish: `--threads` on search (deterministic merge), `--stopwords on|off` (built-in list, ranked-only), two new IR seed articles + deterministic re-crawl + rebuilt v2 index, README/docs/usage updates, full re-verify (cargo test grows, clippy 0, consistency grows, ui.test grows, verify-index v2) + handoff

## Current step
Level 3 round complete: all 25 milestones done and verified. Handing off to the
Reviewer.

## Next steps
Reviewer to review PR #67. Decision file written: /tmp/random-factory-decision.json
- action: review.

## Agent log
- 2026-08-16T11:30:00Z (Builder, Level 3 round): milestones 23-25 done and
  pushed. Updated consistency harness (total->total_hits, --stopwords args,
  stopwords in the opts matrix, 50 Level 3 queries: wildcards, fields, slop,
  boosts, stopwords): 21226/21226 pass. Fixed a real mirror bug the suite caught
  (fielded inner term specs used type 'term', specEffective expected 'word').
  Rewrote js/ui.js for pagination (searchWithMeta, page-size 10, pager with
  prev/next + windowed page buttons, absolute ranks), typeahead via
  suggestPrefix, stopwords toggle, and updated help/chips; extended
  tests/ui.test.mjs (wildcard/field/slop/boost/stopwords/pagination checks):
  40/40 pass. Wrote the two IR seed articles (wildcard-and-fielded-search.md,
  phrase-slop-and-term-boosting.md), re-crawled the corpus and rebuilt the index
  deterministically (112 docs, 127,441 tokens, 7,859 terms, 271 KB postings,
  5.5x, index format stays v2; verify-index OK). Updated README, docs/index.md
  + docs/index.html, meridian/index.html, and usage text with the Level 3
  surface. Full re-verify: 126 Rust tests, clippy 0, 21226/21226 consistency,
  40/40 UI, verify-index OK, bench runs, search threads 1 vs 8 byte-identical
  apart from ms. Handing off to the Reviewer with action=review.
- 2026-08-16T09:15:00Z (Builder, Level 3 round): milestones 19-22 core done.
  Wrote `src/wildcard.rs` (pattern_matches DP, fixed_prefix range expansion,
  suggest_prefix) and `src/fields.rs` (per-doc title/source token sets,
  field_docs, expand_wildcard over field vocab). Rewrote `src/query.rs` for the
  full Level 3 surface: `TermSpec::Wildcard/Field`, `BoolExpr::Wildcard/Field/
  Phrase(words,slop)/Boost`, lexer additions (`*`/`?` in read_word, `~N` slop
  after phrases, `^N` boost, `title:`/`source:` field prefixes), rarest-anchor
  ordered-slop phrase_docs (span - (len-1) <= slop), `TermGroup` scoring slots
  with field restriction + boost multiplier, fielded wildcards expanded against
  the field vocabulary, 41-word ranked-only stopword list, and
  `search_with(threads)` with a deterministic doc-order merge via
  std::thread::scope. Fixed real bugs the first test run caught (fielded
  wildcard vocab, bare `^` with no primary, `~x` slop, wrong test data in four
  tests). 126 Rust tests pass, clippy 0 warnings. CLI/JS/UI/docs milestones
  23-25 still pending.
- 2026-08-16T05:00:00Z (Builder, run 1): orientation done. Rust 1.97.1, node 22,
  git identity is github-actions[bot]. No existing branch/PR for issue #66
  (branch created locally only). Reading repo conventions; Aftershock is the
  reference Rust project (zero dependencies, lib.rs + cli modules). Starting
  `opencode/issue66-20260816031421` from main.
- 2026-08-16T06:00:00Z (Builder, run 1): core engine complete. Wrote tokenizer
  (unicode word rule incl. apostrophes), corpus crawler (deterministic, manifest
  based, out-dir/hidden/target skips), inverted index (BTreeMap vocab, sorted
  postings with positions), varint gap postings codec, hand-written JSON
  reader/writer, BM25 + tf-idf scoring, recursive-descent boolean parser
  (AND/OR/NOT/parens/phrases, rarest-first AND planning, ranked default), snippet
  generation with highlight ranges, compact JSON index export + rebuild, and the
  full CLI. 60 lib tests pass, clippy clean. Verified end-to-end on a temp corpus:
  crawl -> index -> search -> search-index (JSON) -> verify-index; postings
  compress ~4.2x.
- 2026-08-16T07:00:00Z (Builder, run 1): corpus + mirror + consistency. Crawled
  the repo root (skipping corpus/data/target/hidden) into a 105-document corpus
  (113,946 tokens, 6,880 terms); prebuilt data/index.json (824 KB; postings
  5.5x compressed). Wrote js/meridian.js: a byte-exact JS mirror of the Rust
  engine (base64 varint postings decode, tokenizer, boolean parser, BM25/tf-idf,
  snippet generation with byte offsets). Fixed a real Rust bug the consistency
  test caught: the query lexer never advanced past a bare separator, hanging on
  "variable-length integer". Added regression test. 2245/2245 JS-vs-Rust
  consistency checks now pass across bm25 and tfidf for 20 queries.
- 2026-08-16T08:00:00Z (Builder, run 1): web UI + docs complete. Built
  index.html + js/ui.js: dark search UI with suggestions, BM25/TF-IDF toggle,
  example query chips, score-breakdown bars, a full-document viewer with
  per-term highlighting, query help, and a stats panel. Refactored ui.js to
  export its pure byte-offset/highlight helpers for headless node tests;
  tests/ui.test.mjs verifies UTF-8 byte-to-char mapping, snippet markup
  round-tripping against the real index, and word-bound spans (18 checks).
  Served the static site and confirmed every asset resolves (index, JS, index
  JSON, corpus docs). Docs: meridian/README.md, meridian/docs/index.html +
  index.md, and root README.md + index.html updated to make Meridian the
  current project (Kestrel moved to Previous).
- 2026-08-16T09:00:00Z (Builder, run 1): final polish + handoff. Iteration pass
  probed parser edge cases (NOT-only, dangling AND/OR, empty quoted phrases,
  `a NOT b NOT c`, double negation, symbol-only and CJK queries): every one
  fails with a clear message or behaves correctly, and the JS mirror reports
  byte-identical errors. Final state: 61 Rust tests, clippy 0 warnings,
  2245/2245 consistency checks, 18/18 UI checks, `meridian check` passes.
  Status: complete. Handing off to the Reviewer with action=review.
- 2026-08-16T05:30:00Z (Architect, Level 2 round): PR #67 approved (Reviewer +
  Tester) but held by the Maintainer at the 2/2 daily shipping cap; Architect
  triggered on the existing PR for next-level improvements. Verified the
  baseline green (61 tests, clippy 0, 2245/2245, 18/18). Designed the
  retrieval power-up: Porter stemming with stem-group expansion, BK-tree fuzzy
  search (`term~N`) with did-you-mean, CJK unigram+bigram segmentation, title
  boost + proximity ranking signals (`--signals`), `--threads`/`--time`/`bench`
  instrumentation, and UI toggles + cleanup. Key decision: all capabilities are
  load-time derived structures or scorer/parser changes, so the exported index
  format stays stable except a v1->v2 bump for the re-crawled CJK-aware corpus.
  Blueprint appended to the ideas entry; milestones 12-18 added; Status back to
  in-progress. Handing off to the Builder with action=continue.
- 2026-08-16T08:35:00Z (Architect, Level 3 round): owner manually re-triggered
  `/oc architect` on PR #67 at 08:27Z, overriding the Maintainer's earlier
  no-re-trigger decision (Level 2 already delivered its improvement round).
  Re-verified the baseline green (90 tests, clippy 0, 9296/9296, 25/25,
  verify-index on v2, release build). Designed the retrieval-depth round:
  wildcard & prefix search (`term*`, `term?`), fielded search (`title:` /
  `source:`), phrase slop (`"a b"~N`), query term boosting (`term^N`),
  pagination (`--offset`/`--limit`, `total_hits`/`pages`) + UI pager,
  search-as-you-type (`suggest` command + UI typeahead), and
  `--threads`/`--stopwords` on search plus docs/polish. Key decision: every
  capability is a load-time derived structure or parser/scorer/output change,
  so the exported index format stays v2 and the 9296 consistency baseline holds
  and grows. Blueprint appended to the ideas entry; milestones 19-25 added;
  Status stays in-progress. Handing off to the Builder with action=continue.
- 2026-08-16T11:30:00Z (Fixer, Level 3 review round): applied the Reviewer's
  findings on the Level 3 head. Finding 1 (blocking): updated the root
  landing page stats to 112 docs / 21,226 consistency checks / 126 tests.
  Finding 2 (blocking): clamped `--limit` to at least 1 in `run_search` so
  `total.div_ceil(limit)` no longer panics on `--limit 0`. Finding 3 (minor):
  removed the unused `export::build_and_compare`; skipped the JS
  `fieldTerms()` item after verifying it is live on the fielded-search path
  (`meridian.js:1206`, called by `fieldExpandWildcard`, used by
  `specEffective`/`effectiveLists`/`evaluate`). Re-verified green: 126 Rust
  tests, clippy 0, 21226/21226 consistency, 40/40 UI, `meridian check`,
  `verify-index` OK on v2, and `--limit 0` now returns a clean result. Handing
  back to the Reviewer.