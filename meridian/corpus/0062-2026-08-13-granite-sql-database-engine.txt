# Granite

A SQL database engine built from scratch in **Go**: a lexer and
recursive-descent parser, a query planner and executor, and a paged B-tree
storage engine that persists real `.db` files — all driven from a terminal
CLI. The factory's first Go project and its first database engine: the entire
stack is here, from token stream to disk layout, in ~6k lines of standard
library-only Go with 81 tests.

## What Was Built

A self-contained SQL engine (`granite/`) that you can build, test, and drive
from the terminal:

- **SQL front end** (`internal/sql`) — a hand-written lexer (11 token kinds)
  and a recursive-descent parser covering `CREATE TABLE`, `CREATE INDEX`,
  `DROP TABLE`, `INSERT`, `UPDATE`, `DELETE`, and `SELECT` with joins, `WHERE`,
  `ORDER BY`, `LIMIT`, `DISTINCT`, `LIKE`, `IS NULL`, arithmetic, and column
  aliases, plus `EXPLAIN` and `BEGIN`/`COMMIT`/`ROLLBACK`. Values are
  dynamically typed: `NULL`, `INTEGER`, `REAL`, `TEXT`.
- **Query planner** (`internal/planner`) — compiles each statement into an
  executable plan tree and prints `EXPLAIN` output. When a `WHERE` predicate
  matches a secondary index it plans an `INDEX SCAN`; otherwise a full scan.
- **Query executor** (`internal/executor`) — evaluates the operator tree
  (scan, index scan, filter, nested-loop join, projection, sort, distinct,
  limit) and runs every DML statement with row counts.
- **Storage engine** (`internal/storage`) — paged file I/O with a free list,
  transactional writes, a B-tree with split/borrow/merge rebalancing,
  order-preserving index keys, record serialization, a schema catalog, and a
  `Database` facade with secondary indexes. Everything persists to a real
  `.db` file that survives close and reopen.
- **CLI** (`cmd/granite`) — `init`, `exec` (SQL arguments, `-f` script files,
  or stdin), `explain`, `info`, `version`, and a `demo` command that builds a
  bookstore database and tours every feature.

## Why

The factory's recent streak was browser CLIs, a game, and a WebGL solar
system — all JavaScript or shell. Granite is deliberately the opposite: the
first **Go** project and the first **systems/back end** project. A database
engine is the classic "make everything tangible" build: it touches parsing,
query optimization, storage layout, transactions, and durability, and it ends
with a tool you can genuinely use at the terminal. It also gives the repo its
first honest binary file format, which lives on disk and survives restarts.

## How It Works

- **Pipeline.** Every statement runs the same path: `sql.Parse` tokenizes and
  parses the source into an AST; `planner.Plan` resolves tables and columns
  (tracking aliases and join scopes), selects indexes, and builds an operator
  tree; `executor.Execute` evaluates it against a `storage.Database` and
  returns rows or a row count. Results print as column-aligned tables.
- **Storage layout.** A Granite database is a sequence of 4096-byte pages.
  Page 0 is a magic header (`GRANITE1`) carrying the catalog root, page count,
  and free-list head. Tables, secondary indexes, and the schema catalog are
  each a B-tree over pages; the catalog maps table names to serialized
  schemas, so reopening a file recovers everything.
- **Transactions.** The pager buffers all writes in a page cache. `Begin`
  snapshots the cache and dirty set; `Commit` flushes dirty pages (data first,
  header last) and syncs; `Rollback` restores the snapshot exactly. Outside an
  explicit transaction, each statement auto-commits, so single-statement runs
  persist immediately; `Close` flushes any remaining auto-committed writes.
- **B-tree.** Keys are arbitrary byte slices ordered by `bytes.Compare`.
  Leaves and internal nodes split when a page overflows; deletes borrow from
  siblings before merging, and a root with a single child shrinks. Inserts,
  updates, and deletes maintain every secondary index in the same transaction.
- **Indexes.** Index keys encode `(column value, rowid)` with an
  order-preserving value serialization, so equality and range predicates walk
  a contiguous key span in the B-tree. The planner rewrites an indexed
  predicate into an `INDEX SCAN` + point filter.

## Key Files

- `granite/go.mod` — module `github.com/Userfrom1995/Random/granite`, Go 1.24.
- `granite/cmd/granite/main.go` — the CLI (init/exec/explain/info/demo).
- `granite/cmd/granite/demo.go` — the bookstore demo tour.
- `granite/internal/sql/lexer.go`, `parser.go`, `ast.go`, `value.go`,
  `parse.go` — the front end.
- `granite/internal/storage/pager.go`, `btree.go`, `record.go`, `db.go` — the
  engine.
- `granite/internal/planner/planner.go`, `plan.go` — plan compilation and
  EXPLAIN output.
- `granite/internal/executor/executor.go` — operator-tree evaluation.
- `granite/internal/*/*_test.go` — 81 unit and end-to-end tests.
- `granite/README.md` — quickstart; `granite/docs/index.md` +
  `granite/docs/index.html` — documentation site.

## Notes

- **Go first.** The whole engine is the standard library only — no third-party
  dependencies; the test suite needs nothing beyond `go test`.
- **Honest file format.** Data lives in a real 4096-byte-page file you can
  keep, copy, and reopen — `granite demo bookshop.db` builds one you can
  inspect with `granite info`.
- **Explicit transactions, safe auto-commit.** Outside `BEGIN`, each statement
  persists immediately; inside one, nothing reaches disk until `COMMIT`.
  `ROLLBACK` is exact even when prior auto-committed writes are still
  unflushed, because the pager snapshots the whole cache at `Begin`.
- **Order-preserving encodings.** Value byte order matches value order, which
  is what makes an index scan correct — no secondary hashing, no post-sort.
- **Bugs found by running it.** Three real ones were caught while driving the
  demo: the catalog root was never written as a leaf page (first table was
  orphaned), qualified join columns failed validation/resolution (added
  per-scope column checking threaded through planner and executor), and pager
  rollback could destroy unflushed pre-transaction data (fixed by the Begin
  snapshot). Each is covered by a regression test.
- **Name origin.** Granite is the bedrock under everything else — a fitting
  name for the storage layer a database stands on, and a nod to the factory's
  first Go project.
