package planner

import (
	"fmt"

	"github.com/Userfrom1995/Random/granite/internal/sql"
	"github.com/Userfrom1995/Random/granite/internal/storage"
)

// Planner compiles SQL AST statements into executable plans.
type Planner struct {
	db *storage.Database
}

// New creates a planner bound to a database.
func New(db *storage.Database) *Planner {
	return &Planner{db: db}
}

// Plan compiles a single statement.
func (p *Planner) Plan(stmt sql.Stmt) (Plan, error) {
	switch s := stmt.(type) {
	case *sql.CreateTableStmt:
		return p.planCreateTable(s)
	case *sql.CreateIndexStmt:
		return p.planCreateIndex(s)
	case *sql.DropTableStmt:
		return p.planDropTable(s)
	case *sql.InsertStmt:
		return p.planInsert(s)
	case *sql.UpdateStmt:
		return p.planUpdate(s)
	case *sql.DeleteStmt:
		return p.planDelete(s)
	case *sql.SelectStmt:
		return p.planSelect(s)
	case *sql.ExplainStmt:
		inner, err := p.Plan(s.Inner)
		if err != nil {
			return nil, err
		}
		return &ExplainPlan{Inner: inner}, nil
	case *sql.BeginStmt:
		return &BeginPlan{}, nil
	case *sql.CommitStmt:
		return &CommitPlan{}, nil
	case *sql.RollbackStmt:
		return &RollbackPlan{}, nil
	}
	return nil, fmt.Errorf("unsupported statement %T", stmt)
}

func (p *Planner) planCreateTable(s *sql.CreateTableStmt) (Plan, error) {
	cols := make([]storage.Column, len(s.Cols))
	for i, c := range s.Cols {
		cols[i] = storage.Column{Name: c.Name, Type: c.Type}
	}
	return &CreateTablePlan{Name: s.Name, Cols: cols}, nil
}

func (p *Planner) planCreateIndex(s *sql.CreateIndexStmt) (Plan, error) {
	return &CreateIndexPlan{Name: s.Name, Table: s.Table, Column: s.Column}, nil
}

func (p *Planner) planDropTable(s *sql.DropTableStmt) (Plan, error) {
	return &DropTablePlan{Name: s.Name}, nil
}

func (p *Planner) planInsert(s *sql.InsertStmt) (Plan, error) {
	t, err := p.db.GetTable(s.Table)
	if err != nil {
		return nil, err
	}
	// Resolve the column list.
	colIdx := make([]int, len(t.Cols))
	for i := range colIdx {
		colIdx[i] = i
	}
	if len(s.Cols) > 0 {
		colIdx = make([]int, len(s.Cols))
		seen := map[string]bool{}
		for i, c := range s.Cols {
			idx := -1
			for j, col := range t.Cols {
				if col.Name == c {
					idx = j
					break
				}
			}
			if idx < 0 {
				return nil, fmt.Errorf("no such column: %s", c)
			}
			if seen[c] {
				return nil, fmt.Errorf("duplicate column: %s", c)
			}
			seen[c] = true
			colIdx[i] = idx
		}
	}
	// Evaluate row expressions to constants.
	rows := make([][]sql.Value, len(s.Rows))
	for ri, row := range s.Rows {
		if len(row) != len(colIdx) {
			return nil, fmt.Errorf("insert: expected %d values, got %d", len(colIdx), len(row))
		}
		vals := make([]sql.Value, len(t.Cols))
		for ci, e := range row {
			cidx := colIdx[ci]
			v, err := evalConst(e)
			if err != nil {
				return nil, fmt.Errorf("insert: %w", err)
			}
			coerced, err := sql.AsColumn(v, t.Cols[cidx].Type)
			if err != nil {
				return nil, err
			}
			vals[cidx] = coerced
		}
		rows[ri] = vals
	}
	return &InsertPlan{Table: t, Cols: colIdx, Rows: rows}, nil
}

// evalConst evaluates an expression with no column references.
func evalConst(e sql.Expr) (sql.Value, error) {
	switch x := e.(type) {
	case *sql.Literal:
		return x.Val, nil
	case *sql.Binary:
		l, err := evalConst(x.L)
		if err != nil {
			return sql.Value{}, err
		}
		r, err := evalConst(x.R)
		if err != nil {
			return sql.Value{}, err
		}
		return sql.EvalBinary(x.Op, l, r)
	case *sql.Unary:
		v, err := evalConst(x.X)
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
		case "NOT":
			return sql.BoolToInt(!sql.Truthy(v)), nil
		}
	}
	return sql.Value{}, fmt.Errorf("expression must be a constant")
}

func (p *Planner) planUpdate(s *sql.UpdateStmt) (Plan, error) {
	t, err := p.db.GetTable(s.Table)
	if err != nil {
		return nil, err
	}
	sets := make([]SetTerm, len(s.Sets))
	seen := map[string]bool{}
	for i, sc := range s.Sets {
		idx := -1
		for j, col := range t.Cols {
			if col.Name == sc.Column {
				idx = j
				break
			}
		}
		if idx < 0 {
			return nil, fmt.Errorf("no such column: %s", sc.Column)
		}
		if seen[sc.Column] {
			return nil, fmt.Errorf("duplicate SET column: %s", sc.Column)
		}
		seen[sc.Column] = true
		sets[i] = SetTerm{Col: idx, Value: sc.Value}
	}
	if err := validateExprRefs(s.Where, t); err != nil {
		return nil, err
	}
	for _, st := range sets {
		if err := validateExprRefs(st.Value, t); err != nil {
			return nil, err
		}
	}
	return &UpdatePlan{Table: t, Sets: sets, Where: s.Where}, nil
}

func (p *Planner) planDelete(s *sql.DeleteStmt) (Plan, error) {
	t, err := p.db.GetTable(s.Table)
	if err != nil {
		return nil, err
	}
	if err := validateExprRefs(s.Where, t); err != nil {
		return nil, err
	}
	return &DeletePlan{Table: t, Where: s.Where}, nil
}

// validateExprRefs checks that every column reference in e exists in the
// given table.
func validateExprRefs(e sql.Expr, t *storage.TableMeta) error {
	scope := &colScope{tables: []*storage.TableMeta{t}, aliases: []string{t.Name}}
	return scope.validate(e)
}

// colScope resolves column references against an ordered list of joined
// tables, honouring table qualifiers and aliases.
type colScope struct {
	tables  []*storage.TableMeta
	aliases []string
}

func (s *colScope) validate(e sql.Expr) error {
	if e == nil {
		return nil
	}
	switch x := e.(type) {
	case *sql.ColumnRef:
		if x.Name == "*" {
			return fmt.Errorf("wildcard not allowed here")
		}
		if x.Table != "" {
			for i, a := range s.aliases {
				if a == x.Table {
					for _, c := range s.tables[i].Cols {
						if c.Name == x.Name {
							return nil
						}
					}
					return fmt.Errorf("no such column: %s.%s", x.Table, x.Name)
				}
			}
			return fmt.Errorf("no such table or alias: %s", x.Table)
		}
		for _, t := range s.tables {
			for _, c := range t.Cols {
				if c.Name == x.Name {
					return nil
				}
			}
		}
		return fmt.Errorf("no such column: %s", x.Name)
	case *sql.Binary:
		if err := s.validate(x.L); err != nil {
			return err
		}
		return s.validate(x.R)
	case *sql.Unary:
		return s.validate(x.X)
	case *sql.IsNull:
		return s.validate(x.X)
	}
	return nil
}

func (p *Planner) planSelect(s *sql.SelectStmt) (Plan, error) {
	t, err := p.db.GetTable(s.From.Name)
	if err != nil {
		return nil, err
	}
	// The whole FROM list forms the scope used to validate WHERE, ON, and the
	// projection.
	scope := &colScope{tables: []*storage.TableMeta{t}, aliases: []string{s.From.Alias}}
	// Base scan.
	var root QueryNode = &ScanNode{Table: t, Alias: s.From.Alias, Index: -1}
	// Joins.
	if len(s.Joins) > 0 {
		for _, j := range s.Joins {
			jt, err := p.db.GetTable(j.Table.Name)
			if err != nil {
				return nil, err
			}
			scope.tables = append(scope.tables, jt)
			scope.aliases = append(scope.aliases, j.Table.Alias)
			root = &JoinNode{
				Left:  root,
				Right: &ScanNode{Table: jt, Alias: j.Table.Alias, Index: -1},
				On:    j.On,
			}
		}
	}
	// Index selection: use an index for the base table when WHERE has a
	// simple equality or range predicate on an indexed column.
	if len(s.Joins) == 0 && s.Where != nil && root != nil {
		if sn, ok := root.(*ScanNode); ok {
			p.applyIndex(sn, t, s.Where)
		}
	}
	// WHERE filter.
	if s.Where != nil {
		if err := scope.validate(s.Where); err != nil {
			return nil, err
		}
		root = &FilterNode{Child: root, Pred: s.Where}
	}
	// ORDER BY.
	if len(s.OrderBy) > 0 {
		keys := make([]SortKey, len(s.OrderBy))
		for i, oi := range s.OrderBy {
			keys[i] = SortKey{Expr: oi.Expr, Desc: oi.Desc}
		}
		root = &SortNode{Child: root, Keys: keys}
	}
	// Projection.
	items, names, err := buildProjection(s.Items, scope, t)
	if err != nil {
		return nil, err
	}
	root = &ProjectNode{Child: root, Items: items}
	if s.Distinct {
		root = &DistinctNode{Child: root}
	}
	// LIMIT.
	if s.Limit != nil {
		n, err := evalConst(s.Limit)
		if err != nil {
			return nil, fmt.Errorf("LIMIT must be a constant: %w", err)
		}
		i, _ := n.Int()
		root = &LimitNode{Child: root, N: int(i)}
	}
	return &SelectPlan{Root: root, OutNames: names}, nil
}

// applyIndex looks for a usable index on the base table.
func (p *Planner) applyIndex(sn *ScanNode, t *storage.TableMeta, where sql.Expr) {
	// Only conjunctive predicates that directly reference a column equal to a
	// literal or compare against a literal are eligible.
	type candidate struct {
		ix   int
		col  int
		op   string
		val  sql.Value
	}
	var cands []candidate
	collect := func(e sql.Expr) {
		if b, ok := e.(*sql.Binary); ok {
			if cr, ok := b.L.(*sql.ColumnRef); ok && cr.Table == "" {
				if lit, ok := b.R.(*sql.Literal); ok {
					if b.Op == "=" || b.Op == "<" || b.Op == "<=" || b.Op == ">" || b.Op == ">=" {
						cands = append(cands, candidate{col: -1, op: b.Op, val: lit.Val})
						for ix, im := range t.Indexes {
							if t.Cols[im.Column].Name == cr.Name {
								cands[len(cands)-1].ix = ix
								cands[len(cands)-1].col = im.Column
							}
						}
					}
				}
			}
		}
	}
	splitConjuncts(where, collect)
	if len(cands) == 0 {
		return
	}
	// Prefer an equality predicate.
	for _, c := range cands {
		if c.ix >= 0 && c.col >= 0 {
			if c.op == "=" {
				sn.Index = c.ix
				v := c.val
				sn.IndexKey = &v
				return
			}
		}
	}
	// Otherwise use the first range predicate.
	for _, c := range cands {
		if c.ix >= 0 && c.col >= 0 {
			v := c.val
			switch c.op {
			case ">", ">=":
				sn.Index = c.ix
				sn.Lo = &v
				return
			case "<", "<=":
				sn.Index = c.ix
				sn.Hi = &v
				return
			}
		}
	}
}

// splitConjuncts calls fn for each top-level AND operand of e.
func splitConjuncts(e sql.Expr, fn func(sql.Expr)) {
	if b, ok := e.(*sql.Binary); ok && b.Op == "AND" {
		splitConjuncts(b.L, fn)
		splitConjuncts(b.R, fn)
		return
	}
	fn(e)
}

// buildProjection computes the projection items and output names.
func buildProjection(items []sql.SelectItem, scope *colScope, t *storage.TableMeta) ([]ProjectItem, []string, error) {
	var out []ProjectItem
	var names []string
	for _, it := range items {
		if cr, ok := it.Expr.(*sql.ColumnRef); ok && cr.Name == "*" {
			// Unqualified star expands the FROM table.
			if cr.Table == "" {
				for _, c := range t.Cols {
					ref := &sql.ColumnRef{Name: c.Name}
					out = append(out, ProjectItem{Expr: ref, Alias: c.Name})
					names = append(names, c.Name)
				}
				continue
			}
			// Qualified star (alias.*) expands that table's columns.
			tab, found := scope.lookup(cr.Table)
			if !found {
				return nil, nil, fmt.Errorf("no such table or alias: %s", cr.Table)
			}
			for _, c := range tab.Cols {
				ref := &sql.ColumnRef{Table: cr.Table, Name: c.Name}
				out = append(out, ProjectItem{Expr: ref, Alias: c.Name})
				names = append(names, c.Name)
			}
			continue
		}
		if err := scope.validate(it.Expr); err != nil {
			return nil, nil, err
		}
		name := it.Alias
		if name == "" {
			name = exprName(it.Expr)
		}
		out = append(out, ProjectItem{Expr: it.Expr, Alias: it.Alias})
		names = append(names, name)
	}
	return out, names, nil
}

// lookup finds the table with the given alias or name.
func (s *colScope) lookup(alias string) (*storage.TableMeta, bool) {
	for i, a := range s.aliases {
		if a == alias {
			return s.tables[i], true
		}
	}
	return nil, false
}

func exprName(e sql.Expr) string {
	if cr, ok := e.(*sql.ColumnRef); ok {
		return cr.Name
	}
	return exprString(e)
}