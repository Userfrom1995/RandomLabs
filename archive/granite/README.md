# Granite

A SQL database engine built from scratch in **Go**: a lexer and
recursive-descent parser, a query planner and executor, and a paged B-tree
storage engine that persists real `.db` files — all driven from a terminal
CLI.

```sh
go build ./cmd/granite
./granite demo bookshop.db      # build a demo database and tour every feature
./granite init mydb.db          # create an empty database file
./granite exec mydb.db "CREATE TABLE books (id INTEGER, title TEXT, price REAL);"
./granite exec mydb.db "INSERT INTO books VALUES (1, 'Granite', 19.99);" "SELECT * FROM books;"
./granite explain mydb.db "SELECT title FROM books WHERE price > 10;"
./granite info mydb.db
```

## What it does

The whole SQL pipeline is here, from token stream to disk blocks:

- **SQL front end** (`internal/sql`) — a hand-written lexer and a
  recursive-descent parser for `CREATE TABLE` / `CREATE INDEX` / `DROP TABLE`,
  `INSERT`, `UPDATE`, `DELETE`, and `SELECT` with joins, `WHERE`, `ORDER BY`,
  `LIMIT`, `DISTINCT`, `LIKE`, `IS NULL`, arithmetic, and aliases, plus
  `EXPLAIN` and `BEGIN` / `COMMIT` / `ROLLBACK`. Values are dynamically typed:
  `NULL`, `INTEGER`, `REAL`, `TEXT`.
- **Query planner** (`internal/planner`) — compiles each statement into an
  executable plan tree and prints `EXPLAIN` output. For `WHERE` predicates on
  an indexed column it selects an index scan over a full scan.
- **Query executor** (`internal/executor`) — evaluates the operator tree:
  scan, index scan, filter, nested-loop join, projection, sort, distinct, and
  limit, plus all DML.
- **Storage engine** (`internal/storage`) — paged file I/O with a free list,
  transactions (auto-commit outside an explicit `BEGIN`), a B-tree with
  split/borrow/merge rebalancing, order-preserving index keys, record
  serialization, a schema catalog, and a `Database` facade with secondary
  indexes. Everything persists to a real `.db` file.

## Running it

```sh
cd granite
go build ./cmd/granite        # produces ./granite
go test ./...                 # unit + end-to-end tests
```

Commands:

| Command | What it does |
| --- | --- |
| `granite init <path>` | Create a new empty database file. |
| `granite exec <db> <sql...>` | Run SQL, printing tabular results. |
| `granite exec <db> -f <file>` | Run SQL from a script file. |
| `granite exec <db> -` | Run SQL from standard input. |
| `granite explain <db> <sql>` | Show the query plan for a statement. |
| `granite info <db>` | Show tables, indexes, row counts, page counts. |
| `granite demo <path>` | Build a demo bookstore database and run a tour. |

Statements outside an explicit `BEGIN ... COMMIT` transaction are
auto-committed, so each one persists immediately.

## How it's built

```
granite/
  go.mod
  cmd/granite/          CLI: init/exec/explain/info/demo + the demo tour
  internal/
    sql/                lexer, tokenizer, AST, recursive-descent parser, values
    storage/            pager, b-tree, record encoding, schema catalog, database
    planner/            statement -> plan tree, EXPLAIN, index selection
    executor/           operator-tree evaluation + DML
  docs/                 this documentation site (index.md + index.html)
```

## Notes & design choices

- **A real file format.** The database is a sequence of 4096-byte pages. Page
  0 holds a magic header with the catalog root, page count, and free-list
  head; tables, indexes, and the schema catalog are B-trees living on pages.
- **Transactional pager.** Writes are buffered in a page cache. `Begin`
  snapshots the cache; `Commit` flushes dirty pages in order and syncs;
  `Rollback` restores the exact pre-transaction state. Closing a database
  persists any pending auto-committed writes.
- **Order-preserving index keys.** Index entries encode `(column value,
  rowid)` with a serialization whose byte order matches value order, so
  equality and range lookups walk a contiguous key span.
- **Deterministic B-tree.** Keys are arbitrary byte slices ordered by
  `bytes.Compare`; leaves and internal nodes split when full and borrow or
  merge on delete underflow, and the root shrinks when it has a single child.
- **Go first.** Granite is the lab's first Go project — the standard
  library only, no third-party dependencies.

## License

MIT — see the repository root [`LICENSE`](../LICENSE).
