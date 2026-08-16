# Progress — Granite

- **Issue:** #47
- **Branch:** opencode/issue47-20260813185035
- **Status:** complete
- **Updated:** 2026-08-13T19:30:00Z

## Checklist
- [x] scaffold + progress file + go.mod
- [x] sql layer: lexer, AST, recursive-descent parser
- [x] storage engine: pager, b-tree, records, catalog, db
- [x] planner: statement -> plan tree, EXPLAIN output
- [x] executor: SELECT/INSERT/UPDATE/DELETE + joins + ORDER BY/LIMIT/DISTINCT
- [x] indexes: CREATE INDEX, index lookups in planner/executor
- [x] transactions: BEGIN/COMMIT/ROLLBACK
- [x] CLI (cmd/granite) + demo db
- [x] unit tests + end-to-end tests
- [x] README + docs/ (index.md + index.html) + ideas/ entry
- [x] landing index.html updated, go vet/test clean, PR with Closes #47

## Current step
All work complete: 81 unit and end-to-end tests pass, `go vet` clean, README +
docs site + ideas writeup written, root landing page and README promoted to
Granite. PR #50 (branch opencode/issue47-20260813185035) closes #47.

## Next steps
- (none) - build complete; awaiting review and merge.

## Agent log
- 2026-08-13 (build run 1) — orientation: read builder.md, AGENTS.md, LAB.md,
  orrery example; rebased branch onto origin/main; no existing branch/PR/progress
  for #47. Scaffolded the module and this progress file.
- 2026-08-13 (build run 2) — wrote the SQL front end (value, token, lexer, ast,
  parser, parse), the storage engine (pager with transactions and a free list,
  a full B-tree with split/borrow/merge, record encoding, catalog, db layer with
  secondary indexes), the planner (DDL/DML/query plan tree with EXPLAIN, index
  selection on equality/range predicates), and the executor (operator tree
  evaluation, joins, sort, distinct, limit). Everything compiles.
- 2026-08-13 (build run 3, resume) — read the PR, progress file, and all core
  sources. Built the CLI (cmd/granite): init, exec (arg/-f/stdin), explain,
  info, version; demo database runner with a bookstore tour. Fixed three real
  bugs found by running the engine: (1) initCatalog never wrote the catalog
  root leaf page; (2) join predicates and projections with qualified column
  refs failed validation/resolution (added colScope + table alias threading
  through ScanNode and executor rows); (3) pager Rollback deleted unflushed
  pre-transaction pages from the cache, so a rollback after writes destroyed
  prior data - the pager now snapshots cache+dirty at Begin, auto-commits
  statements outside explicit transactions, and flushes on Close. Pushed CLI
  milestone; the demo now runs end to end and data persists across reopen.
- 2026-08-13 (build run 4, resume) - wrote 81 tests: sql value/parser, storage
  btree/pager/db, executor e2e, CLI e2e, and planner plan-shape tests (index
  selection, joins, validation). Fixed two more real bugs surfaced by tests:
  the qualified-star parser branch had an off-by-one, and btree deleteFrom
  treated a child page number as a slice index. Wrote README, docs/index.md +
  docs/index.html, ideas/2026-08-13-granite-sql-database-engine.md, promoted
  Granite on the root README and index.html, and marked this file complete.
  Final state: go build/vet/test all clean.
