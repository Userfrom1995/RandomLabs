package sql

import (
	"reflect"
	"strings"
	"testing"
)

func parseOK(t *testing.T, src string) []Stmt {
	t.Helper()
	stmts, err := Parse(src)
	if err != nil {
		t.Fatalf("Parse(%q): %v", src, err)
	}
	return stmts
}

func parseErr(t *testing.T, src string) {
	t.Helper()
	if _, err := Parse(src); err == nil {
		t.Fatalf("Parse(%q) should have failed", src)
	}
}

func TestParseCreateTable(t *testing.T) {
	stmts := parseOK(t, "CREATE TABLE users (id INTEGER, name TEXT, score REAL);")
	if len(stmts) != 1 {
		t.Fatalf("expected 1 statement, got %d", len(stmts))
	}
	s, ok := stmts[0].(*CreateTableStmt)
	if !ok {
		t.Fatalf("expected CreateTableStmt, got %T", stmts[0])
	}
	if s.Name != "users" {
		t.Errorf("table name = %q, want users", s.Name)
	}
	if len(s.Cols) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(s.Cols))
	}
	if s.Cols[0].Name != "id" || s.Cols[0].Type != TypeInt {
		t.Errorf("col 0 = %+v", s.Cols[0])
	}
	if s.Cols[1].Type != TypeText || s.Cols[2].Type != TypeReal {
		t.Errorf("col types wrong: %+v", s.Cols)
	}
}

func TestParseInsert(t *testing.T) {
	stmts := parseOK(t, "INSERT INTO t (a, b) VALUES (1, 'x'), (2, NULL);")
	s := stmts[0].(*InsertStmt)
	if s.Table != "t" {
		t.Errorf("table = %q", s.Table)
	}
	if !reflect.DeepEqual(s.Cols, []string{"a", "b"}) {
		t.Errorf("cols = %v", s.Cols)
	}
	if len(s.Rows) != 2 || len(s.Rows[0]) != 2 {
		t.Fatalf("rows = %v", s.Rows)
	}
	if lit, ok := s.Rows[0][0].(*Literal); !ok || lit.Val.String() != "1" {
		t.Errorf("row0 col0 = %v", s.Rows[0][0])
	}
	if lit, ok := s.Rows[1][1].(*Literal); !ok || !lit.Val.IsNull() {
		t.Errorf("row1 col1 should be NULL")
	}
}

func TestParseUpdate(t *testing.T) {
	stmts := parseOK(t, "UPDATE t SET a = a + 1, b = 'z' WHERE id > 5;")
	s := stmts[0].(*UpdateStmt)
	if len(s.Sets) != 2 || s.Sets[0].Column != "a" {
		t.Fatalf("sets = %+v", s.Sets)
	}
	if s.Where == nil {
		t.Fatal("expected WHERE clause")
	}
}

func TestParseDelete(t *testing.T) {
	stmts := parseOK(t, "DELETE FROM t;")
	if _, ok := stmts[0].(*DeleteStmt); !ok {
		t.Fatalf("expected DeleteStmt, got %T", stmts[0])
	}
}

func TestParseSelectFull(t *testing.T) {
	src := "SELECT DISTINCT a, b AS bee FROM t WHERE a > 1 AND b LIKE '%x' ORDER BY a DESC, b LIMIT 10;"
	stmts := parseOK(t, src)
	s := stmts[0].(*SelectStmt)
	if !s.Distinct {
		t.Error("expected DISTINCT")
	}
	if len(s.Items) != 2 || s.Items[1].Alias != "bee" {
		t.Errorf("items = %+v", s.Items)
	}
	if s.From.Name != "t" {
		t.Errorf("from = %+v", s.From)
	}
	if len(s.OrderBy) != 2 || !s.OrderBy[0].Desc {
		t.Errorf("order = %+v", s.OrderBy)
	}
	if s.Limit == nil {
		t.Error("expected LIMIT")
	}
}

func TestParseJoin(t *testing.T) {
	src := "SELECT a.name, b.title FROM authors a INNER JOIN books b ON a.id = b.author_id WHERE a.country = 'UK';"
	stmts := parseOK(t, src)
	s := stmts[0].(*SelectStmt)
	if len(s.Joins) != 1 {
		t.Fatalf("joins = %d", len(s.Joins))
	}
	if s.Joins[0].Table.Name != "books" || s.Joins[0].Table.Alias != "b" {
		t.Errorf("join table = %+v", s.Joins[0].Table)
	}
	if s.From.Alias != "a" {
		t.Errorf("from alias = %q", s.From.Alias)
	}
}

func TestParseQualifiedStar(t *testing.T) {
	stmts := parseOK(t, "SELECT t.*, id FROM t;")
	s := stmts[0].(*SelectStmt)
	if cr, ok := s.Items[0].Expr.(*ColumnRef); !ok || cr.Table != "t" || cr.Name != "*" {
		t.Errorf("first item = %+v", s.Items[0].Expr)
	}
}

func TestParseExplain(t *testing.T) {
	stmts := parseOK(t, "EXPLAIN SELECT * FROM t;")
	if _, ok := stmts[0].(*ExplainStmt); !ok {
		t.Fatalf("expected ExplainStmt, got %T", stmts[0])
	}
	if _, ok := stmts[0].(*ExplainStmt).Inner.(*SelectStmt); !ok {
		t.Errorf("inner should be a select")
	}
}

func TestParseTransactions(t *testing.T) {
	stmts := parseOK(t, "BEGIN; COMMIT; ROLLBACK;")
	if len(stmts) != 3 {
		t.Fatalf("expected 3 statements, got %d", len(stmts))
	}
	if _, ok := stmts[0].(*BeginStmt); !ok {
		t.Errorf("stmt0 = %T", stmts[0])
	}
	if _, ok := stmts[1].(*CommitStmt); !ok {
		t.Errorf("stmt1 = %T", stmts[1])
	}
	if _, ok := stmts[2].(*RollbackStmt); !ok {
		t.Errorf("stmt2 = %T", stmts[2])
	}
}

func TestParseMultipleStatements(t *testing.T) {
	stmts := parseOK(t, "CREATE TABLE a (x INTEGER); CREATE TABLE b (y TEXT);")
	if len(stmts) != 2 {
		t.Fatalf("expected 2 statements, got %d", len(stmts))
	}
}

func TestParseComments(t *testing.T) {
	stmts := parseOK(t, "-- a comment\nCREATE TABLE t (x INTEGER); /* block */ SELECT * FROM t;")
	if len(stmts) != 2 {
		t.Fatalf("expected 2 statements, got %d", len(stmts))
	}
}

func TestParseErrors(t *testing.T) {
	parseErr(t, "CREATE TABLE;")
	parseErr(t, "SELECT FROM t;")
	parseErr(t, "INSERT t VALUES (1);")
	parseErr(t, "SELECT * FROM;")
	parseErr(t, "BOGUS STUFF;")
	parseErr(t, "CREATE TABLE t (x NOTYPE);")
	parseErr(t, "SELECT 'unterminated;")
}

func TestParseStringEscaping(t *testing.T) {
	stmts := parseOK(t, "INSERT INTO t VALUES ('it''s');")
	s := stmts[0].(*InsertStmt)
	lit, ok := s.Rows[0][0].(*Literal)
	if !ok || lit.Val.String() != "it's" {
		t.Errorf("escaped string = %v", s.Rows[0][0])
	}
}

func TestParseNumberKinds(t *testing.T) {
	stmts := parseOK(t, "SELECT 1, 2.5, 1e3 FROM t;")
	s := stmts[0].(*SelectStmt)
	lits := []string{"1", "2.5", "1000.0"}
	for i, want := range lits {
		lit, ok := s.Items[i].Expr.(*Literal)
		if !ok || lit.Val.String() != want {
			t.Errorf("item %d = %v, want %s", i, s.Items[i].Expr, want)
		}
	}
}

func TestParseEmpty(t *testing.T) {
	if stmts, err := Parse("  -- nothing\n  "); err != nil || len(stmts) != 0 {
		t.Errorf("empty input: stmts=%d err=%v", len(stmts), err)
	}
}

func TestLikePredicate(t *testing.T) {
	stmts := parseOK(t, "SELECT * FROM t WHERE name LIKE '%oo%';")
	s := stmts[0].(*SelectStmt)
	if b, ok := s.Where.(*Binary); !ok || b.Op != "LIKE" {
		t.Errorf("where = %+v", s.Where)
	}
	if _, ok := s.Where.(*Binary); ok && strings.Contains(s.Where.(*Binary).Op, "AND") {
		t.Errorf("unexpected op")
	}
}
