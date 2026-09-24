package executor_test

import (
	"path/filepath"
	"reflect"
	"testing"

	"github.com/Userfrom1995/Random/granite/internal/executor"
	"github.com/Userfrom1995/Random/granite/internal/planner"
	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// engine wires a fresh database, planner, and executor for one test.
type engine struct {
	db   *storage.Database
	plan *planner.Planner
	ex *executor.Executor
}

func newEngine(t *testing.T) *engine {
	t.Helper()
	path := filepath.Join(t.TempDir(), "e2e.db")
	db, err := storage.CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return &engine{db: db, plan: planner.New(db), ex: executor.New(db)}
}

func (e *engine) exec(t *testing.T, src string) *executor.Result {
	t.Helper()
	stmts, err := sql.Parse(src)
	if err != nil {
		t.Fatalf("parse %q: %v", src, err)
	}
	var last *executor.Result
	for _, st := range stmts {
		p, err := e.plan.Plan(st)
		if err != nil {
			t.Fatalf("plan %q: %v", src, err)
		}
		last, err = e.ex.Execute(p)
		if err != nil {
			t.Fatalf("exec %q: %v", src, err)
		}
	}
	return last
}

func (e *engine) mustExec(t *testing.T, src string) {
	t.Helper()
	if _, err := sql.Parse(src); err != nil {
		t.Fatalf("parse %q: %v", src, err)
	}
	e.exec(t, src)
}

func rows(rs [][]string) [][]string { return rs }

func displayRows(r *executor.Result) [][]string {
	out := make([][]string, len(r.Rows))
	for i, row := range r.Rows {
		vals := make([]string, len(row))
		for j, v := range row {
			vals[j] = v.Display()
		}
		out[i] = vals
	}
	return out
}

func setupBookstore(t *testing.T, e *engine) {
	t.Helper()
	e.mustExec(t, "CREATE TABLE authors (id INTEGER, name TEXT, country TEXT);")
	e.mustExec(t, "CREATE TABLE books (id INTEGER, title TEXT, author_id INTEGER, price REAL, stock INTEGER);")
	for _, s := range []string{
		"INSERT INTO authors VALUES (1, 'Ada', 'UK');",
		"INSERT INTO authors VALUES (2, 'Alan', 'UK');",
		"INSERT INTO authors VALUES (3, 'Grace', 'US');",
		"INSERT INTO books VALUES (101, 'Notes', 1, 24.99, 7);",
		"INSERT INTO books VALUES (102, 'Computing', 2, 19.50, 12);",
		"INSERT INTO books VALUES (103, 'Numbers', 2, 29.00, 3);",
		"INSERT INTO books VALUES (104, 'Compiler', 3, 15.75, 20);",
	} {
		e.mustExec(t, s)
	}
}

func TestSelectStar(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT * FROM authors;")
	if !res.IsQuery || len(res.Rows) != 3 {
		t.Fatalf("rows = %d", len(res.Rows))
	}
	if !reflect.DeepEqual(res.Columns, []string{"id", "name", "country"}) {
		t.Fatalf("columns = %v", res.Columns)
	}
}

func TestSelectProjectionAndAlias(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT name AS who, country FROM authors;")
	if !reflect.DeepEqual(res.Columns, []string{"who", "country"}) {
		t.Fatalf("columns = %v", res.Columns)
	}
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Ada", "UK"}, {"Alan", "UK"}, {"Grace", "US"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectWhereAnd(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT title FROM books WHERE price > 20 AND stock < 10;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Notes"}, {"Numbers"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectOrderByLimit(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT title FROM books ORDER BY price DESC LIMIT 2;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Numbers"}, {"Notes"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectDistinct(t *testing.T) {
	e := newEngine(t)
	e.mustExec(t, "CREATE TABLE t (c TEXT);")
	e.mustExec(t, "INSERT INTO t VALUES ('a'), ('b'), ('a'), ('c'), ('b');")
	res := e.exec(t, "SELECT DISTINCT c FROM t ORDER BY c;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"a"}, {"b"}, {"c"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectJoin(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT authors.name, books.title FROM authors JOIN books ON authors.id = books.author_id WHERE authors.country = 'UK' ORDER BY books.price;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Alan", "Computing"}, {"Ada", "Notes"}, {"Alan", "Numbers"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectJoinQualifiedStar(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT books.* FROM authors JOIN books ON authors.id = books.author_id WHERE authors.id = 2 ORDER BY books.id;")
	if !reflect.DeepEqual(res.Columns, []string{"id", "title", "author_id", "price", "stock"}) {
		t.Fatalf("columns = %v", res.Columns)
	}
	if len(res.Rows) != 2 {
		t.Fatalf("rows = %d", len(res.Rows))
	}
}

func TestSelectArithmetic(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT title, price * stock AS value FROM books WHERE id = 101;")
	got := displayRows(res)
	if len(got) != 1 || got[0][1] == "" {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectLike(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT title FROM books WHERE title LIKE '%put%';")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Computing"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestSelectIsNull(t *testing.T) {
	e := newEngine(t)
	e.mustExec(t, "CREATE TABLE t (v INTEGER);")
	e.mustExec(t, "INSERT INTO t VALUES (NULL), (5), (NULL);")
	res := e.exec(t, "SELECT v FROM t WHERE v IS NULL;")
	if len(res.Rows) != 2 {
		t.Fatalf("NULL rows = %d", len(res.Rows))
	}
	res = e.exec(t, "SELECT v FROM t WHERE v IS NOT NULL;")
	if len(res.Rows) != 1 {
		t.Fatalf("NOT NULL rows = %d", len(res.Rows))
	}
}

func TestInsertAffected(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "INSERT INTO authors VALUES (4, 'Edsger', 'NL');")
	if res.RowsAffected != 1 {
		t.Fatalf("affected = %d", res.RowsAffected)
	}
}

func TestUpdateAffected(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "UPDATE books SET stock = stock + 1 WHERE price < 20;")
	if res.RowsAffected != 2 {
		t.Fatalf("affected = %d", res.RowsAffected)
	}
	check := e.exec(t, "SELECT stock FROM books WHERE title = 'Computing';")
	if got := displayRows(check); !reflect.DeepEqual(got, [][]string{{"13"}}) {
		t.Fatalf("rows = %v", got)
	}
}

func TestDeleteAffected(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "DELETE FROM books WHERE stock = 3;")
	if res.RowsAffected != 1 {
		t.Fatalf("affected = %d", res.RowsAffected)
	}
	check := e.exec(t, "SELECT title FROM books WHERE stock = 3;")
	if len(check.Rows) != 0 {
		t.Fatalf("expected no rows, got %d", len(check.Rows))
	}
}

func TestCreateIndexThenIndexScan(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	e.mustExec(t, "CREATE INDEX ix_price ON books (price);")
	res := e.exec(t, "SELECT title FROM books WHERE price >= 25;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Numbers"}}) {
		t.Fatalf("rows = %v", got)
	}
	res = e.exec(t, "SELECT title FROM books WHERE price = 19.50;")
	if got := displayRows(res); !reflect.DeepEqual(got, [][]string{{"Computing"}}) {
		t.Fatalf("eq rows = %v", got)
	}
}

func TestExplainOutput(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	e.mustExec(t, "CREATE INDEX ix_price ON books (price);")
	res := e.exec(t, "EXPLAIN SELECT title FROM books WHERE price >= 25;")
	if res.Explain == "" {
		t.Fatal("EXPLAIN returned empty output")
	}
	if res.Explain != "PROJECT title\n    FILTER (price >= 25)\n        INDEX SCAN books (ix_price)" {
		t.Fatalf("explain = %q", res.Explain)
	}
}

func TestTransactionCommit(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	e.mustExec(t, "BEGIN;")
	e.exec(t, "INSERT INTO authors VALUES (9, 'Nine', 'XX');")
	e.mustExec(t, "COMMIT;")
	res := e.exec(t, "SELECT name FROM authors WHERE id = 9;")
	if len(res.Rows) != 1 {
		t.Fatalf("committed row missing")
	}
}

func TestTransactionRollback(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	e.mustExec(t, "BEGIN;")
	e.exec(t, "INSERT INTO authors VALUES (9, 'Nine', 'XX');")
	e.mustExec(t, "ROLLBACK;")
	res := e.exec(t, "SELECT name FROM authors WHERE id = 9;")
	if len(res.Rows) != 0 {
		t.Fatalf("rolled-back row still present")
	}
	// The pre-transaction data must survive the rollback.
	res = e.exec(t, "SELECT name FROM authors WHERE id = 1;")
	if len(res.Rows) != 1 {
		t.Fatalf("pre-transaction row lost")
	}
}

func TestCommitWithoutBeginErrors(t *testing.T) {
	e := newEngine(t)
	if _, err := sql.Parse("COMMIT;"); err != nil {
		t.Fatal(err)
	}
	plan, err := e.plan.Plan(&sql.CommitStmt{})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.ex.Execute(plan); err == nil {
		t.Fatal("COMMIT without BEGIN should error")
	}
}

func TestValidationErrors(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	cases := []string{
		"SELECT nope FROM authors;",
		"SELECT name FROM authors WHERE bogus = 1;",
		"INSERT INTO authors VALUES (1);",
		"INSERT INTO authors (id) VALUES (1, 2);",
		"SELECT a.x FROM authors a JOIN books b ON a.id = b.author_id;",
	}
	for _, c := range cases {
		if _, err := sql.Parse(c); err != nil {
			continue // parse error is fine too
		}
		if err := func() error {
			stmts, err := sql.Parse(c)
			if err != nil {
				return err
			}
			for _, st := range stmts {
				p, err := e.plan.Plan(st)
				if err != nil {
					return err
				}
				if _, err := e.ex.Execute(p); err != nil {
					return err
				}
			}
			return nil
		}(); err == nil {
			t.Errorf("statement %q should have errored", c)
		}
	}
}

func TestDropTable(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	e.mustExec(t, "DROP TABLE authors;")
	if _, err := e.plan.Plan(&sql.SelectStmt{From: sql.TableRef{Name: "authors"}}); err == nil {
		t.Fatal("select from dropped table should error")
	}
	res := e.exec(t, "SELECT title FROM books LIMIT 1;")
	if len(res.Rows) != 1 {
		t.Fatalf("books should still work, got %d rows", len(res.Rows))
	}
}

func TestTypeCoercion(t *testing.T) {
	e := newEngine(t)
	e.mustExec(t, "CREATE TABLE t (i INTEGER, r REAL, s TEXT);")
	e.mustExec(t, "INSERT INTO t VALUES (3, 2.5, 'x');")
	// REAL into INTEGER is truncated.
	e.mustExec(t, "INSERT INTO t (r) VALUES (2.5);")
	// TEXT into TEXT is fine; INT into TEXT renders.
	e.mustExec(t, "INSERT INTO t (s) VALUES (42);")
	res := e.exec(t, "SELECT s FROM t WHERE s = '42';")
	if len(res.Rows) != 1 {
		t.Fatalf("text coercion rows = %d", len(res.Rows))
	}
}

func TestZeroLimit(t *testing.T) {
	e := newEngine(t)
	setupBookstore(t, e)
	res := e.exec(t, "SELECT title FROM books LIMIT 0;")
	if len(res.Rows) != 0 {
		t.Fatalf("LIMIT 0 returned %d rows", len(res.Rows))
	}
}