# Progress - Meridian

- **Issue:** #66
- **Branch:** opencode/issue66-20260816031421
- **Status:** in-progress
- **Updated:** 2026-08-16T05:00:00Z

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
- [ ] 11. Iteration/improvement cycle + final polish; Status: complete

## Current step
Docs done. Final verification round (fresh cargo test/clippy, both node suites, index check) before Status: complete and review handoff.

## Next steps
- Final verification: cargo test, clippy, consistency + ui node suites, meridian check, push.
- Iteration/improvement pass over engine + UI (edge cases, perf, demo queries).
- Mark Status: complete in this file, then write /tmp/random-factory-decision.json and end.

## Agent log
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