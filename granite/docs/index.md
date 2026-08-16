# Granite — a SQL database engine in Go

**Granite** is a SQL database engine built from scratch in **Go**: a lexer
and recursive-descent parser, a query planner and executor, and a paged
B-tree storage engine that persists real `.db` files — all driven from a
terminal CLI. It is the lab's first Go project and its first database
engine, and it makes the entire stack tangible, from token stream to storage
layout.

## What it is

- **A real SQL pipeline.** `internal/sql` hand-rolls the lexer and a
  recursive-descent parser for `CREATE TABLE` / `CREATE INDEX` / `DROP TABLE`,
  `INSERT`, `UPDATE`, `DELETE`, and `SELECT` with joins, `WHERE`, `ORDER BY`,
  `LIMIT`, `DISTINCT`, `LIKE`, `IS NULL`, arithmetic, and aliases — plus
  `EXPLAIN` and `BEGIN` / `COMMIT` / `ROLLBACK`.
- **A query planner.** `internal/planner` compiles statements into an
  executable plan tree and prints `EXPLAIN` output; when a `WHERE` predicate
  hits an indexed column it plans an index scan instead of a full scan.
- **A query executor.** `internal/executor` evaluates the operator tree —
  scan, index scan, filter, nested-loop join, projection, sort, distinct,
  limit — and runs every DML statement.
- **A storage engine.** `internal/storage` is a paged file with a free list,
  transactional writes, a B-tree with split/borrow/merge rebalancing,
  order-preserving index keys, record serialization, a schema catalog, and a
  `Database` facade with secondary indexes. All of it persists to a real
  `.db` file that survives closing and reopening.
- **A terminal CLI.** `cmd/granite` drives the engine: `init`, `exec`
  (arguments, `-f` scripts, or stdin), `explain`, `info`, `version`, and a
  `demo` command that builds a bookstore database and tours every feature.

## Using it

```sh
cd granite
go build ./cmd/granite
go test ./...                 # 81 unit + end-to-end tests
./granite demo bookshop.db    # build a demo db and print a full tour
./granite exec bookshop.db "SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id WHERE authors.country = 'UK';"
./granite explain bookshop.db "SELECT title, price FROM books WHERE price >= 25;"
```

Statements outside an explicit `BEGIN ... COMMIT` are auto-committed, so each
one persists immediately. The demo database built by `granite demo` is a real
file you can inspect with `granite info`.

## How it works

The full pipeline runs per statement: `sql.Parse` tokenizes and parses the
source into an AST; `planner.Plan` resolves tables and columns, selects
indexes, and builds an operator tree; `executor.Execute` evaluates it against
a `storage.Database`. Query results print as column-aligned tables.

- **Storage layout.** A Granite database is a sequence of 4096-byte pages.
  Page 0 is a magic header (`GRANITE1`) carrying the catalog root, page count,
  and free-list head. Tables, secondary indexes, and the schema catalog are
  each a B-tree over pages. The catalog maps table names to serialized
  schemas, so reopening a file recovers everything.
- **Transactions.** The pager buffers all writes in a page cache. `Begin`
  snapshots the cache and dirty set; `Commit` flushes dirty pages (data first,
  header last) and syncs; `Rollback` restores the snapshot exactly, discarding
  mid-transaction work. `Close` persists any unflushed auto-committed writes.
- **The B-tree.** Keys are arbitrary byte slices ordered by `bytes.Compare`.
  Leaves and internal nodes split when a page overflows; deletes borrow from
  siblings before merging, and a root with a single child shrinks.
- **Indexes.** Index keys encode `(column value, rowid)`, and the value
  serialization is order-preserving, so `=` and range predicates walk a
  contiguous key span. Inserts, updates, and deletes maintain every secondary
  index in the same transaction.

## Design choices

- **Go, standard library only.** No third-party dependencies; the whole engine
  is plain Go.
- **Honest file format.** Data lives in a real file you can keep, copy, and
  reopen — not in memory.
- **Explicit transactions with safe auto-commit.** Outside `BEGIN`, each
  statement persists immediately; inside one, nothing reaches disk until
  `COMMIT`, and `ROLLBACK` is exact even when prior auto-committed writes are
  still unflushed.
- **Order-preserving encodings.** Value byte order matches value order, which
  is what makes index scans correct.

## Key files

- `granite/cmd/granite/main.go` — the CLI (init/exec/explain/info/demo).
- `granite/cmd/granite/demo.go` — the bookstore demo tour.
- `granite/internal/sql/lexer.go`, `parser.go`, `ast.go`, `value.go` — the
  front end.
- `granite/internal/storage/pager.go`, `btree.go`, `record.go`, `db.go` — the
  engine.
- `granite/internal/planner/planner.go`, `plan.go` — plan compilation and
  EXPLAIN output.
- `granite/internal/executor/executor.go` — operator-tree evaluation.
- `granite/internal/*/*_test.go` — 81 unit and end-to-end tests.
- `granite/README.md` — quickstart and reference.

## Source

The project lives in [`granite/`](https://github.com/Userfrom1995/Random/tree/main/granite)
with a [`README`](https://github.com/Userfrom1995/Random/blob/main/granite/README.md)
and a full writeup in
[`ideas/`](https://github.com/Userfrom1995/Random/blob/main/ideas/2026-08-13-granite-sql-database-engine.md).
