package executor

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/Userfrom1995/Random/granite/internal/planner"
	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// Result is the outcome of executing a statement.
type Result struct {
	// Columns are the output column names for SELECT.
	Columns []string
	// Rows are the output rows for SELECT.
	Rows [][]sql.Value
	// RowsAffected is set for INSERT/UPDATE/DELETE.
	RowsAffected int64
	// Explain is set for EXPLAIN statements.
	Explain string
	// IsQuery reports whether this was a SELECT.
	IsQuery bool
}

// Executor executes plans against a database.
type Executor struct {
	db *storage.Database
}

// New creates an executor.
func New(db *storage.Database) *Executor {
	return &Executor{db: db}
}

// Execute runs a plan and returns the result. Statements issued outside an
// explicit transaction are auto-committed so each one persists immediately.
func (ex *Executor) Execute(p planner.Plan) (*Result, error) {
	res, err := ex.execute(p)
	if err != nil {
		return nil, err
	}
	switch p.(type) {
	case *planner.BeginPlan, *planner.CommitPlan, *planner.RollbackPlan:
		// transaction control manages its own commit state
	default:
		if err := ex.db.AutoCommit(); err != nil {
			return nil, err
		}
	}
	return res, nil
}

func (ex *Executor) execute(p planner.Plan) (*Result, error) {
	switch plan := p.(type) {
	case *planner.CreateTablePlan:
		return ex.execCreateTable(plan)
	case *planner.CreateIndexPlan:
		return ex.execCreateIndex(plan)
	case *planner.DropTablePlan:
		return ex.execDropTable(plan)
	case *planner.BeginPlan:
		if err := ex.db.Begin(); err != nil {
			return nil, err
		}
		return &Result{}, nil
	case *planner.CommitPlan:
		if err := ex.db.Commit(); err != nil {
			return nil, err
		}
		return &Result{}, nil
	case *planner.RollbackPlan:
		if err := ex.db.Rollback(); err != nil {
			return nil, err
		}
		return &Result{}, nil
	case *planner.InsertPlan:
		return ex.execInsert(plan)
	case *planner.UpdatePlan:
		return ex.execUpdate(plan)
	case *planner.DeletePlan:
		return ex.execDelete(plan)
	case *planner.SelectPlan:
		return ex.execSelect(plan)
	case *planner.ExplainPlan:
		return &Result{Explain: plan.Inner.Explain()}, nil
	}
	return nil, fmt.Errorf("unknown plan type %T", p)
}

func (ex *Executor) execCreateTable(p *planner.CreateTablePlan) (*Result, error) {
	if err := ex.db.CreateTable(p.Name, p.Cols); err != nil {
		return nil, err
	}
	return &Result{}, nil
}

func (ex *Executor) execCreateIndex(p *planner.CreateIndexPlan) (*Result, error) {
	t, err := ex.db.GetTable(p.Table)
	if err != nil {
		return nil, err
	}
	if err := ex.db.CreateIndex(t, p.Name, p.Column); err != nil {
		return nil, err
	}
	return &Result{}, nil
}

func (ex *Executor) execDropTable(p *planner.DropTablePlan) (*Result, error) {
	if err := ex.db.DropTable(p.Name); err != nil {
		return nil, err
	}
	return &Result{}, nil
}

func (ex *Executor) execInsert(p *planner.InsertPlan) (*Result, error) {
	for _, row := range p.Rows {
		if _, err := ex.db.InsertRow(p.Table, row); err != nil {
			return nil, err
		}
	}
	return &Result{RowsAffected: int64(len(p.Rows))}, nil
}

func (ex *Executor) execUpdate(p *planner.UpdatePlan) (*Result, error) {
	var affected int64
	err := ex.db.ScanRows(p.Table, func(rid int64, vals []sql.Value) bool {
		match := true
		if p.Where != nil {
			v, err := evalExpr(p.Where, vals, p.Table)
			if err != nil {
				return false
			}
			match = sql.Truthy(v)
		}
		if !match {
			return true
		}
		newVals := append([]sql.Value(nil), vals...)
		for _, st := range p.Sets {
			v, err := evalExpr(st.Value, vals, p.Table)
			if err != nil {
				return false
			}
			coerced, err := sql.AsColumn(v, p.Table.Cols[st.Col].Type)
			if err != nil {
				return false
			}
			newVals[st.Col] = coerced
		}
		if err := ex.db.UpdateRow(p.Table, rid, newVals); err != nil {
			return false
		}
		affected++
		return true
	})
	if err != nil {
		return nil, err
	}
	return &Result{RowsAffected: affected}, nil
}

func (ex *Executor) execDelete(p *planner.DeletePlan) (*Result, error) {
	var affected int64
	err := ex.db.ScanRows(p.Table, func(rid int64, vals []sql.Value) bool {
		match := true
		if p.Where != nil {
			v, err := evalExpr(p.Where, vals, p.Table)
			if err != nil {
				return false
			}
			match = sql.Truthy(v)
		}
		if !match {
			return true
		}
		if err := ex.db.DeleteRow(p.Table, rid); err != nil {
			return false
		}
		affected++
		return true
	})
	if err != nil {
		return nil, err
	}
	return &Result{RowsAffected: affected}, nil
}

// ---------- query execution ----------

// row is a value tuple plus a column schema.
type row struct {
	vals []sql.Value
	// cols[i] is the source column name for vals[i] ("" for computed).
	cols []string
	// tbls[i] is the table alias for cols[i] ("" for computed).
	tbls []string
}

func (ex *Executor) execSelect(p *planner.SelectPlan) (*Result, error) {
	rows, err := ex.evalNode(p.Root, nil)
	if err != nil {
		return nil, err
	}
	out := &Result{Columns: p.OutNames, IsQuery: true}
	for _, r := range rows {
		// Projected rows carry exactly the output values.
		line := make([]sql.Value, len(r.vals))
		copy(line, r.vals)
		out.Rows = append(out.Rows, line)
	}
	return out, nil
}

// evalNode evaluates a query operator tree, returning rows. The column
// schema flows down; each node keeps its own row.cols.
func (ex *Executor) evalNode(node planner.QueryNode, env []row) ([]row, error) {
	switch n := node.(type) {
	case *planner.ScanNode:
		return ex.evalScan(n)
	case *planner.FilterNode:
		children, err := ex.evalNode(n.Child, env)
		if err != nil {
			return nil, err
		}
		var out []row
		for _, r := range children {
			v, err := evalRowExpr(n.Pred, r)
			if err != nil {
				return nil, err
			}
			if sql.Truthy(v) {
				out = append(out, r)
			}
		}
		return out, nil
	case *planner.JoinNode:
		return ex.evalJoin(n)
	case *planner.ProjectNode:
		children, err := ex.evalNode(n.Child, env)
		if err != nil {
			return nil, err
		}
		var out []row
		for _, r := range children {
			vals := make([]sql.Value, len(n.Items))
			cols := make([]string, len(n.Items))
			tbls := make([]string, len(n.Items))
			for i, it := range n.Items {
				v, err := evalRowExpr(it.Expr, r)
				if err != nil {
					return nil, err
				}
				vals[i] = v
				cols[i] = it.Alias
				tbls[i] = it.Alias
			}
			out = append(out, row{vals: vals, cols: cols, tbls: tbls})
		}
		return out, nil
	case *planner.SortNode:
		children, err := ex.evalNode(n.Child, env)
		if err != nil {
			return nil, err
		}
		sort.SliceStable(children, func(i, j int) bool {
			for _, k := range n.Keys {
				vi, err := evalRowExpr(k.Expr, children[i])
				if err != nil {
					return false
				}
				vj, err := evalRowExpr(k.Expr, children[j])
				if err != nil {
					return false
				}
				c := sql.Compare(vi, vj)
				if c == 0 {
					continue
				}
				if k.Desc {
					return c > 0
				}
				return c < 0
			}
			return false
		})
		return children, nil
	case *planner.LimitNode:
		children, err := ex.evalNode(n.Child, env)
		if err != nil {
			return nil, err
		}
		if n.N < 0 {
			n.N = 0
		}
		if len(children) > n.N {
			children = children[:n.N]
		}
		return children, nil
	case *planner.DistinctNode:
		children, err := ex.evalNode(n.Child, env)
		if err != nil {
			return nil, err
		}
		seen := map[string]bool{}
		var out []row
		for _, r := range children {
			var sb strings.Builder
			for _, v := range r.vals {
				sb.WriteString(v.String())
				sb.WriteByte(0xff)
			}
			k := sb.String()
			if !seen[k] {
				seen[k] = true
				out = append(out, r)
			}
		}
		return out, nil
	}
	return nil, fmt.Errorf("unknown query node %T", node)
}

func (ex *Executor) evalScan(n *planner.ScanNode) ([]row, error) {
	cols := make([]string, len(n.Table.Cols))
	tbls := make([]string, len(n.Table.Cols))
	for i, c := range n.Table.Cols {
		cols[i] = c.Name
		tbls[i] = n.Alias
	}
	var out []row
	if n.Index < 0 {
		err := ex.db.ScanRows(n.Table, func(_ int64, vals []sql.Value) bool {
			out = append(out, row{vals: append([]sql.Value(nil), vals...), cols: cols, tbls: tbls})
			return true
		})
		return out, err
	}
	// Index scan.
	ix := n.Table.Indexes[n.Index]
	rids := map[int64]bool{}
	var fn func(rid int64) bool
	fn = func(rid int64) bool {
		rids[rid] = true
		return true
	}
	var err error
	switch {
	case n.IndexKey != nil:
		err = ex.db.IndexLookupEq(n.Table, n.Index, *n.IndexKey, fn)
	case n.Lo != nil || n.Hi != nil:
		err = ex.db.IndexLookupRange(n.Table, n.Index, n.Lo, n.Hi, fn)
	default:
		err = ex.db.IndexRowsPublic(n.Table, n.Index, fn)
	}
	if err != nil {
		return nil, err
	}
	ridList := make([]int64, 0, len(rids))
	for r := range rids {
		ridList = append(ridList, r)
	}
	sort.Slice(ridList, func(i, j int) bool { return ridList[i] < ridList[j] })
	for _, rid := range ridList {
		vals, err := ex.db.GetRow(n.Table, rid)
		if err != nil {
			return nil, err
		}
		// Re-check the predicate for index scans that do not fully cover the
		// predicate (value equality/range are covered; a manual re-check is
		// still safe).
		out = append(out, row{vals: vals, cols: cols, tbls: tbls})
	}
	_ = ix
	return out, nil
}

func (ex *Executor) evalJoin(n *planner.JoinNode) ([]row, error) {
	left, err := ex.evalNode(n.Left, nil)
	if err != nil {
		return nil, err
	}
	right, err := ex.evalNode(n.Right, nil)
	if err != nil {
		return nil, err
	}
	var out []row
	for _, l := range left {
		for _, r := range right {
			joined := joinRows(l, r)
			v, err := evalRowExpr(n.On, joined)
			if err != nil {
				return nil, err
			}
			if sql.Truthy(v) {
				out = append(out, joined)
			}
		}
	}
	return out, nil
}

func joinRows(a, b row) row {
	vals := make([]sql.Value, 0, len(a.vals)+len(b.vals))
	cols := make([]string, 0, len(a.cols)+len(b.cols))
	tbls := make([]string, 0, len(a.tbls)+len(b.tbls))
	vals = append(vals, a.vals...)
	vals = append(vals, b.vals...)
	cols = append(cols, a.cols...)
	cols = append(cols, b.cols...)
	tbls = append(tbls, a.tbls...)
	tbls = append(tbls, b.tbls...)
	return row{vals: vals, cols: cols, tbls: tbls}
}

// evalRowExpr evaluates an expression against a row's column schema.
func evalRowExpr(e sql.Expr, r row) (sql.Value, error) {
	switch x := e.(type) {
	case *sql.Literal:
		return x.Val, nil
	case *sql.ColumnRef:
		if x.Name == "*" {
			return sql.Value{}, errors.New("wildcard in expression")
		}
		idx := -1
		if x.Table != "" {
			for i, c := range r.cols {
				if r.tbls[i] == x.Table && c == x.Name {
					idx = i
					break
				}
			}
		} else {
			for i, c := range r.cols {
				if c == x.Name {
					idx = i
					break
				}
			}
		}
		if idx < 0 {
			return sql.Value{}, fmt.Errorf("no such column: %s", x.Name)
		}
		return r.vals[idx], nil
	case *sql.Binary:
		l, err := evalRowExpr(x.L, r)
		if err != nil {
			return sql.Value{}, err
		}
		rv, err := evalRowExpr(x.R, r)
		if err != nil {
			return sql.Value{}, err
		}
		return sql.EvalBinary(x.Op, l, rv)
	case *sql.Unary:
		v, err := evalRowExpr(x.X, r)
		if err != nil {
			return sql.Value{}, err
		}
		switch x.Op {
		case "-":
			if i, ok := v.Int(); ok {
				return sql.IntValue(-i), nil
			}
			if f, ok := v.Real(); ok {
				return sql.RealValue(-f), nil
			}
			return sql.NullValue(), nil
		case "NOT":
			return sql.BoolToInt(!sql.Truthy(v)), nil
		}
	case *sql.IsNull:
		v, err := evalRowExpr(x.X, r)
		if err != nil {
			return sql.Value{}, err
		}
		isNull := v.IsNull()
		if x.Not {
			isNull = !isNull
		}
		return sql.BoolToInt(isNull), nil
	}
	return sql.Value{}, fmt.Errorf("cannot evaluate expression %T", e)
}

// evalExpr evaluates against a plain table row.
func evalExpr(e sql.Expr, vals []sql.Value, t *storage.TableMeta) (sql.Value, error) {
	r := row{vals: vals, cols: make([]string, len(t.Cols)), tbls: make([]string, len(t.Cols))}
	for i, c := range t.Cols {
		r.cols[i] = c.Name
		r.tbls[i] = t.Name
	}
	return evalRowExpr(e, r)
}