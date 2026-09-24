package planner

import (
	"fmt"
	"strings"

	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// Plan is a compiled, executable plan.
type Plan interface {
	// Explain returns a human-readable plan tree.
	Explain() string
}

// ---------- DDL plans ----------

// CreateTablePlan implements CREATE TABLE.
type CreateTablePlan struct {
	Name string
	Cols []storage.Column
}

// CreateIndexPlan implements CREATE INDEX.
type CreateIndexPlan struct {
	Name   string
	Table  string
	Column string
}

// DropTablePlan implements DROP TABLE.
type DropTablePlan struct {
	Name string
}

// BeginPlan implements BEGIN.
type BeginPlan struct{}

// CommitPlan implements COMMIT.
type CommitPlan struct{}

// RollbackPlan implements ROLLBACK.
type RollbackPlan struct{}

func (p *CreateTablePlan) Explain() string {
	cols := make([]string, len(p.Cols))
	for i, c := range p.Cols {
		cols[i] = c.Name + " " + string(c.Type)
	}
	return "CREATE TABLE " + p.Name + " (" + strings.Join(cols, ", ") + ")"
}

func (p *CreateIndexPlan) Explain() string {
	return "CREATE INDEX " + p.Name + " ON " + p.Table + " (" + p.Column + ")"
}

func (p *DropTablePlan) Explain() string {
	return "DROP TABLE " + p.Name
}

func (p *BeginPlan) Explain() string    { return "BEGIN TRANSACTION" }
func (p *CommitPlan) Explain() string   { return "COMMIT" }
func (p *RollbackPlan) Explain() string { return "ROLLBACK" }

// ExplainPlan wraps a statement for EXPLAIN output.
type ExplainPlan struct {
	Inner Plan
}

func (p *ExplainPlan) Explain() string {
	return "EXPLAIN\n" + indentLines(p.Inner.Explain(), 2)
}

// ---------- data manipulation plans ----------

// InsertPlan implements INSERT.
type InsertPlan struct {
	Table  *storage.TableMeta
	Cols   []int // column indices being set
	Rows   [][]sql.Value
}

func (p *InsertPlan) Explain() string {
	return fmt.Sprintf("INSERT INTO %s (%d rows)", p.Table.Name, len(p.Rows))
}

// UpdatePlan implements UPDATE.
type UpdatePlan struct {
	Table *storage.TableMeta
	Sets  []SetTerm
	Where sql.Expr
}

// SetTerm is one SET column = expr assignment with a bound index.
type SetTerm struct {
	Col   int
	Value sql.Expr
}

func (p *UpdatePlan) Explain() string {
	return fmt.Sprintf("UPDATE %s SET %d columns WHERE %s", p.Table.Name, len(p.Sets), exprString(p.Where))
}

// DeletePlan implements DELETE.
type DeletePlan struct {
	Table *storage.TableMeta
	Where sql.Expr
}

func (p *DeletePlan) Explain() string {
	return fmt.Sprintf("DELETE FROM %s WHERE %s", p.Table.Name, exprString(p.Where))
}

// SelectPlan implements SELECT as an operator tree.
type SelectPlan struct {
	Root QueryNode
	// Output names of the final projection.
	OutNames []string
}

func (p *SelectPlan) Explain() string {
	return p.Root.Explain()
}

// QueryNode is a node in the query operator tree.
type QueryNode interface {
	Explain() string
}

// ScanNode reads rows from a table or an index.
type ScanNode struct {
	Table *storage.TableMeta
	// Alias is the table alias used for qualified column references.
	Alias string
	// Index usage: -1 means full table scan.
	Index    int
	IndexKey *sql.Value // equality lookups
	Lo, Hi   *sql.Value // range lookups (inclusive)
}

func (n *ScanNode) Explain() string {
	if n.Index >= 0 {
		ix := n.Table.Indexes[n.Index]
		return fmt.Sprintf("INDEX SCAN %s (%s)", n.Table.Name, ix.Name)
	}
	return fmt.Sprintf("SCAN %s", n.Table.Name)
}

// FilterNode applies a WHERE predicate.
type FilterNode struct {
	Child QueryNode
	Pred  sql.Expr
}

func (n *FilterNode) Explain() string {
	return "FILTER " + exprString(n.Pred) + "\n" + indentLines(n.Child.Explain(), 2)
}

// JoinNode is a nested-loop join over two scans.
type JoinNode struct {
	Left  QueryNode
	Right QueryNode
	On    sql.Expr
}

func (n *JoinNode) Explain() string {
	return "JOIN ON " + exprString(n.On) + "\n" +
		indentLines(n.Left.Explain(), 2) + "\n" +
		indentLines(n.Right.Explain(), 2)
}

// ProjectNode computes the SELECT list.
type ProjectNode struct {
	Child QueryNode
	Items []ProjectItem
}

// ProjectItem is one SELECT item with an output name.
type ProjectItem struct {
	Expr  sql.Expr
	Alias string
}

func (n *ProjectNode) Explain() string {
	var items []string
	for _, it := range n.Items {
		if it.Alias != "" {
			items = append(items, exprString(it.Expr)+" AS "+it.Alias)
		} else {
			items = append(items, exprString(it.Expr))
		}
	}
	return "PROJECT " + strings.Join(items, ", ") + "\n" + indentLines(n.Child.Explain(), 2)
}

// SortNode sorts by one or more expressions.
type SortNode struct {
	Child QueryNode
	Keys  []SortKey
}

// SortKey is one ORDER BY term.
type SortKey struct {
	Expr sql.Expr
	Desc bool
}

func (n *SortNode) Explain() string {
	var keys []string
	for _, k := range n.Keys {
		dir := "ASC"
		if k.Desc {
			dir = "DESC"
		}
		keys = append(keys, exprString(k.Expr)+" "+dir)
	}
	return "SORT " + strings.Join(keys, ", ") + "\n" + indentLines(n.Child.Explain(), 2)
}

// LimitNode applies LIMIT.
type LimitNode struct {
	Child QueryNode
	N     int
}

func (n *LimitNode) Explain() string {
	return fmt.Sprintf("LIMIT %d\n%s", n.N, indentLines(n.Child.Explain(), 2))
}

// DistinctNode removes duplicate rows.
type DistinctNode struct {
	Child QueryNode
}

func (n *DistinctNode) Explain() string {
	return "DISTINCT\n" + indentLines(n.Child.Explain(), 2)
}

func indentLines(s string, n int) string {
	pad := strings.Repeat("  ", n)
	lines := strings.Split(s, "\n")
	for i := range lines {
		lines[i] = pad + lines[i]
	}
	return strings.Join(lines, "\n")
}

// exprString renders an expression for EXPLAIN output.
func exprString(e sql.Expr) string {
	if e == nil {
		return "<all>"
	}
	switch x := e.(type) {
	case *sql.Literal:
		return x.Val.Display()
	case *sql.ColumnRef:
		if x.Table != "" {
			return x.Table + "." + x.Name
		}
		return x.Name
	case *sql.Binary:
		return "(" + exprString(x.L) + " " + x.Op + " " + exprString(x.R) + ")"
	case *sql.Unary:
		return x.Op + "(" + exprString(x.X) + ")"
	case *sql.IsNull:
		not := ""
		if x.Not {
			not = " NOT"
		}
		return "(" + exprString(x.X) + " IS" + not + " NULL)"
	}
	return "?"
}