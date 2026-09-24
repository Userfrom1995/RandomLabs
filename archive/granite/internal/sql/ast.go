package sql

// Stmt is any parseable statement.
type Stmt interface{ stmt() }

// Expr is any expression node.
type Expr interface{ expr() }

// ---------- Expressions ----------

// Literal is a constant value.
type Literal struct {
	Val Value
}

// ColumnRef references a column, optionally qualified by a table name.
type ColumnRef struct {
	Table string
	Name  string
}

// Binary is an infix operator expression.
type Binary struct {
	Op   string
	L, R Expr
}

// Unary is a prefix operator expression (NOT, unary minus).
type Unary struct {
	Op string
	X  Expr
}

// IsNull is an IS NULL / IS NOT NULL test.
type IsNull struct {
	X   Expr
	Not bool
}

func (*Literal) expr()   {}
func (*ColumnRef) expr() {}
func (*Binary) expr()    {}
func (*Unary) expr()     {}
func (*IsNull) expr()    {}

// ---------- Column definitions ----------

// ColumnDef is a CREATE TABLE column.
type ColumnDef struct {
	Name string
	Type Type
}

// ---------- Statements ----------

// CreateTableStmt is CREATE TABLE.
type CreateTableStmt struct {
	Name string
	Cols []ColumnDef
}

// CreateIndexStmt is CREATE INDEX.
type CreateIndexStmt struct {
	Name   string
	Table  string
	Column string
}

// DropTableStmt is DROP TABLE.
type DropTableStmt struct {
	Name string
}

// InsertStmt is INSERT INTO.
type InsertStmt struct {
	Table string
	Cols  []string // empty means all columns
	Rows  [][]Expr // each row is a list of value expressions
}

// UpdateStmt is UPDATE.
type UpdateStmt struct {
	Table string
	Sets  []SetClause
	Where Expr
}

// SetClause is a single SET column = expr assignment.
type SetClause struct {
	Column string
	Value  Expr
}

// DeleteStmt is DELETE FROM.
type DeleteStmt struct {
	Table string
	Where Expr
}

// SelectItem is one entry in a SELECT list.
type SelectItem struct {
	Expr  Expr
	Alias string
}

// TableRef is a table in the FROM clause with an optional alias.
type TableRef struct {
	Name  string
	Alias string
}

// OrderItem is one ORDER BY term.
type OrderItem struct {
	Expr Expr
	Desc bool
}

// JoinClause is a JOIN ... ON ... clause.
type JoinClause struct {
	Table TableRef
	On    Expr
}

// SelectStmt is SELECT.
type SelectStmt struct {
	Items     []SelectItem
	Distinct  bool
	From      TableRef
	Joins     []JoinClause
	Where     Expr
	OrderBy   []OrderItem
	Limit     Expr
}

// ExplainStmt is EXPLAIN <statement>.
type ExplainStmt struct {
	Inner Stmt
}

// BeginStmt is BEGIN TRANSACTION.
type BeginStmt struct{}

// CommitStmt is COMMIT.
type CommitStmt struct{}

// RollbackStmt is ROLLBACK.
type RollbackStmt struct{}

func (*CreateTableStmt) stmt() {}
func (*CreateIndexStmt) stmt() {}
func (*DropTableStmt) stmt()   {}
func (*InsertStmt) stmt()      {}
func (*UpdateStmt) stmt()      {}
func (*DeleteStmt) stmt()      {}
func (*SelectStmt) stmt()      {}
func (*ExplainStmt) stmt()     {}
func (*BeginStmt) stmt()       {}
func (*CommitStmt) stmt()      {}
func (*RollbackStmt) stmt()    {}