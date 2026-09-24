package planner_test

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/Userfrom1995/Random/granite/internal/executor"
	"github.com/Userfrom1995/Random/granite/internal/planner"
	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

type harness struct {
	db   *storage.Database
	plan *planner.Planner
	exec *executor.Executor
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	db, err := storage.CreateDatabase(filepath.Join(t.TempDir(), "p.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return &harness{db: db, plan: planner.New(db), exec: executor.New(db)}
}

// run parses, plans, and executes a statement.
func (h *harness) run(t *testing.T, src string) {
	t.Helper()
	stmts, err := sql.Parse(src)
	if err != nil {
		t.Fatal(err)
	}
	for _, st := range stmts {
		pl, err := h.plan.Plan(st)
		if err != nil {
			t.Fatalf("plan %q: %v", src, err)
		}
		if _, err := h.exec.Execute(pl); err != nil {
			t.Fatalf("exec %q: %v", src, err)
		}
	}
}

// explain parses and plans a statement, returning its plan tree.
func (h *harness) explain(t *testing.T, src string) string {
	t.Helper()
	stmts, err := sql.Parse(src)
	if err != nil {
		t.Fatal(err)
	}
	if len(stmts) != 1 {
		t.Fatalf("expected 1 statement, got %d", len(stmts))
	}
	pl, err := h.plan.Plan(stmts[0])
	if err != nil {
		t.Fatalf("plan %q: %v", src, err)
	}
	return pl.Explain()
}

func TestPlanSelectShape(t *testing.T) {
	h := newHarness(t)
	h.run(t, "CREATE TABLE t (id INTEGER, v TEXT);")
	got := h.explain(t, "SELECT id FROM t WHERE id > 5 ORDER BY id DESC LIMIT 3;")
	for _, want := range []string{"LIMIT 3", "SORT", "FILTER", "SCAN t", "PROJECT id"} {
		if !strings.Contains(got, want) {
			t.Errorf("explain missing %q:\n%s", want, got)
		}
	}
}

func TestPlanDistinctShape(t *testing.T) {
	h := newHarness(t)
	h.run(t, "CREATE TABLE t (id INTEGER, v TEXT);")
	got := h.explain(t, "SELECT DISTINCT v FROM t;")
	if !strings.Contains(got, "DISTINCT") {
		t.Errorf("explain missing DISTINCT:\n%s", got)
	}
}

func TestPlanIndexSelection(t *testing.T) {
	h := newHarness(t)
	h.run(t, "CREATE TABLE t (id INTEGER, v TEXT);")
	h.run(t, "INSERT INTO t VALUES (1, 'a');")
	h.run(t, "CREATE INDEX ix_id ON t (id);")
	// Range predicate uses the index.
	got := h.explain(t, "SELECT id FROM t WHERE id >= 1;")
	if !strings.Contains(got, "INDEX SCAN t (ix_id)") {
		t.Errorf("range query should use INDEX SCAN:\n%s", got)
	}
	// Equality predicate uses the index.
	got = h.explain(t, "SELECT id FROM t WHERE id = 1;")
	if !strings.Contains(got, "INDEX SCAN t (ix_id)") {
		t.Errorf("equality query should use INDEX SCAN:\n%s", got)
	}
	// Non-indexed predicate still full scans.
	got = h.explain(t, "SELECT id FROM t WHERE v = 'a';")
	if strings.Contains(got, "INDEX SCAN") {
		t.Errorf("unindexed predicate should full scan:\n%s", got)
	}
}

func TestPlanJoinShape(t *testing.T) {
	h := newHarness(t)
	h.run(t, "CREATE TABLE a (id INTEGER);")
	h.run(t, "CREATE TABLE b (id INTEGER, a_id INTEGER);")
	got := h.explain(t, "SELECT a.id FROM a JOIN b ON a.id = b.a_id;")
	if !strings.Contains(got, "JOIN ON") || !strings.Contains(got, "SCAN b") {
		t.Errorf("join plan wrong:\n%s", got)
	}
}

func TestPlanValidation(t *testing.T) {
	h := newHarness(t)
	h.run(t, "CREATE TABLE t (id INTEGER, v TEXT);")
	// Unknown column in WHERE is caught at plan time.
	if _, err := h.plan.Plan(&sql.SelectStmt{
		From:  sql.TableRef{Name: "t"},
		Items: []sql.SelectItem{{Expr: &sql.ColumnRef{Name: "id"}}},
		Where: &sql.Binary{Op: "=", L: &sql.ColumnRef{Name: "nope"}, R: &sql.Literal{Val: sql.IntValue(1)}},
	}); err == nil {
		t.Fatal("unknown column should error at plan time")
	}
	// Qualified ref to a missing alias errors.
	if _, err := h.plan.Plan(&sql.SelectStmt{
		From:  sql.TableRef{Name: "t"},
		Items: []sql.SelectItem{{Expr: &sql.ColumnRef{Table: "ghost", Name: "id"}}},
	}); err == nil {
		t.Fatal("unknown alias should error at plan time")
	}
}
