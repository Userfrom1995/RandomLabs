# Progress — Granite

- **Issue:** #47
- **Branch:** opencode/issue47-20260813185035
- **Status:** in-progress
- **Updated:** 2026-08-13T18:52:00Z

## Checklist
- [x] scaffold + progress file + go.mod
- [x] sql layer: lexer, AST, recursive-descent parser
- [x] storage engine: pager, b-tree, records, catalog, db
- [x] planner: statement -> plan tree, EXPLAIN output
- [x] executor: SELECT/INSERT/UPDATE/DELETE + joins + ORDER BY/LIMIT/DISTINCT
- [x] indexes: CREATE INDEX, index lookups in planner/executor
- [x] transactions: BEGIN/COMMIT/ROLLBACK
- [ ] CLI (cmd/granite) + demo db
- [ ] unit tests + end-to-end tests
- [ ] README + docs/ (index.md + index.html) + ideas/ entry
- [ ] landing index.html updated, go vet/test clean, PR with Closes #47

## Current step
Core engine written: sql front-end, storage (pager + b-tree + catalog + db),
planner, executor all compile. Writing the CLI and tests next.

## Next steps
- Write the CLI (cmd/granite) with init/exec/explain/dump/info/demo commands.
- Write unit tests (btree, db, parser, executor e2e).
- Write docs + ideas entry, update landing page, mark complete.

## Agent log
- 2026-08-13 (build run 1) — orientation: read builder.md, AGENTS.md, FACTORY.md,
  orrery example; rebased branch onto origin/main; no existing branch/PR/progress
  for #47. Scaffolded the module and this progress file.
- 2026-08-13 (build run 2) — wrote the SQL front end (value, token, lexer, ast,
  parser, parse), the storage engine (pager with transactions and a free list,
  a full B-tree with split/borrow/merge, record encoding, catalog, db layer with
  secondary indexes), the planner (DDL/DML/query plan tree with EXPLAIN, index
  selection on equality/range predicates), and the executor (operator tree
  evaluation, joins, sort, distinct, limit). Everything compiles.
