package sql

import (
	"fmt"
	"strings"
)

// Parser is a recursive-descent parser over a token stream.
type Parser struct {
	toks []Token
	pos  int
}

// NewParser builds a parser from the given tokens.
func NewParser(toks []Token) *Parser {
	return &Parser{toks: toks}
}

// ParseAll parses a sequence of statements separated by semicolons.
func (p *Parser) ParseAll() ([]Stmt, error) {
	var stmts []Stmt
	for {
		p.skipSemicolons()
		if p.peek().Kind == TokEOF {
			return stmts, nil
		}
		s, err := p.parseStmt()
		if err != nil {
			return nil, err
		}
		stmts = append(stmts, s)
		p.skipSemicolons()
	}
}

func (p *Parser) skipSemicolons() {
	for p.peek().Kind == TokSemicolon {
		p.pos++
	}
}

func (p *Parser) peek() Token { return p.toks[p.pos] }

func (p *Parser) next() Token {
	t := p.toks[p.pos]
	if t.Kind != TokEOF {
		p.pos++
	}
	return t
}

func (p *Parser) expect(kind TokenKind) (Token, error) {
	t := p.peek()
	if t.Kind != kind {
		return t, fmt.Errorf("expected %s but got %s at byte %d", kindName(kind), t.String(), t.Pos)
	}
	return p.next(), nil
}

func kindName(k TokenKind) string {
	switch k {
	case TokIdent:
		return "identifier"
	case TokNumber:
		return "number"
	case TokString:
		return "string"
	case TokKeyword:
		return "keyword"
	case TokLParen:
		return "'('"
	case TokRParen:
		return "')'"
	case TokComma:
		return "','"
	case TokSemicolon:
		return "';'"
	case TokDot:
		return "'.'"
	default:
		return "token"
	}
}

func (p *Parser) isKw(kw string) bool {
	t := p.peek()
	return t.Kind == TokKeyword && t.Text == kw
}

func (p *Parser) acceptKw(kw string) bool {
	if p.isKw(kw) {
		p.pos++
		return true
	}
	return false
}

func (p *Parser) expectKw(kw string) error {
	if p.isKw(kw) {
		p.pos++
		return nil
	}
	t := p.peek()
	return fmt.Errorf("expected keyword %s but got %s at byte %d", kw, t.String(), t.Pos)
}

func (p *Parser) expectIdent() (string, error) {
	t := p.peek()
	if t.Kind != TokIdent {
		return "", fmt.Errorf("expected identifier but got %s at byte %d", t.String(), t.Pos)
	}
	p.pos++
	return t.Text, nil
}

func (p *Parser) parseStmt() (Stmt, error) {
	if p.isKw("EXPLAIN") {
		p.pos++
		inner, err := p.parseStmt()
		if err != nil {
			return nil, err
		}
		return &ExplainStmt{Inner: inner}, nil
	}
	switch p.peek().Text {
	case "SELECT":
		return p.parseSelect()
	case "INSERT":
		return p.parseInsert()
	case "UPDATE":
		return p.parseUpdate()
	case "DELETE":
		return p.parseDelete()
	case "CREATE":
		return p.parseCreate()
	case "DROP":
		return p.parseDrop()
	case "BEGIN":
		p.pos++
		p.acceptKw("TRANSACTION")
		return &BeginStmt{}, nil
	case "COMMIT":
		p.pos++
		p.acceptKw("TRANSACTION")
		return &CommitStmt{}, nil
	case "ROLLBACK":
		p.pos++
		p.acceptKw("TRANSACTION")
		return &RollbackStmt{}, nil
	}
	t := p.peek()
	return nil, fmt.Errorf("unexpected %s at byte %d", t.String(), t.Pos)
}

// ---------- CREATE / DROP ----------

func (p *Parser) parseCreate() (Stmt, error) {
	if err := p.expectKw("CREATE"); err != nil {
		return nil, err
	}
	if p.acceptKw("TABLE") {
		return p.parseCreateTable()
	}
	if p.acceptKw("INDEX") {
		return p.parseCreateIndex()
	}
	t := p.peek()
	return nil, fmt.Errorf("expected TABLE or INDEX after CREATE but got %s at byte %d", t.String(), t.Pos)
}

func (p *Parser) parseCreateTable() (Stmt, error) {
	name, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	if _, err := p.expect(TokLParen); err != nil {
		return nil, err
	}
	var cols []ColumnDef
	for {
		col, err := p.expectIdent()
		if err != nil {
			return nil, err
		}
		typeTok := p.next()
		if typeTok.Kind != TokIdent {
			return nil, fmt.Errorf("expected column type for %q at byte %d", col, typeTok.Pos)
		}
		typ, ok := columnType(typeTok.Text)
		if !ok {
			return nil, fmt.Errorf("unknown column type %q at byte %d", typeTok.Text, typeTok.Pos)
		}
		cols = append(cols, ColumnDef{Name: strings.ToLower(col), Type: typ})
		if p.acceptKw("NOT") && p.acceptKw("NULL") {
			// constraint accepted; engine treats NULL as allowed in this build
		}
		if p.peek().Kind == TokComma {
			p.pos++
			continue
		}
		break
	}
	if _, err := p.expect(TokRParen); err != nil {
		return nil, err
	}
	return &CreateTableStmt{Name: strings.ToLower(name), Cols: cols}, nil
}

func columnType(s string) (Type, bool) {
	switch strings.ToUpper(s) {
	case "INTEGER", "INT", "BIGINT", "SMALLINT":
		return TypeInt, true
	case "REAL", "FLOAT", "DOUBLE":
		return TypeReal, true
	case "TEXT", "VARCHAR", "CHAR", "STRING":
		return TypeText, true
	}
	return "", false
}

func (p *Parser) parseCreateIndex() (Stmt, error) {
	name, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	if err := p.expectKw("ON"); err != nil {
		return nil, err
	}
	table, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	if _, err := p.expect(TokLParen); err != nil {
		return nil, err
	}
	col, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	if _, err := p.expect(TokRParen); err != nil {
		return nil, err
	}
	return &CreateIndexStmt{
		Name:   strings.ToLower(name),
		Table:  strings.ToLower(table),
		Column: strings.ToLower(col),
	}, nil
}

func (p *Parser) parseDrop() (Stmt, error) {
	if err := p.expectKw("DROP"); err != nil {
		return nil, err
	}
	if err := p.expectKw("TABLE"); err != nil {
		return nil, err
	}
	name, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	return &DropTableStmt{Name: strings.ToLower(name)}, nil
}

// ---------- INSERT ----------

func (p *Parser) parseInsert() (Stmt, error) {
	if err := p.expectKw("INSERT"); err != nil {
		return nil, err
	}
	if err := p.expectKw("INTO"); err != nil {
		return nil, err
	}
	table, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	table = strings.ToLower(table)
	var cols []string
	if p.peek().Kind == TokLParen {
		p.pos++
		for {
			c, err := p.expectIdent()
			if err != nil {
				return nil, err
			}
			cols = append(cols, strings.ToLower(c))
			if p.peek().Kind == TokComma {
				p.pos++
				continue
			}
			break
		}
		if _, err := p.expect(TokRParen); err != nil {
			return nil, err
		}
	}
	if err := p.expectKw("VALUES"); err != nil {
		return nil, err
	}
	var rows [][]Expr
	for {
		if _, err := p.expect(TokLParen); err != nil {
			return nil, err
		}
		var row []Expr
		for {
			e, err := p.parseExpr()
			if err != nil {
				return nil, err
			}
			row = append(row, e)
			if p.peek().Kind == TokComma {
				p.pos++
				continue
			}
			break
		}
		if _, err := p.expect(TokRParen); err != nil {
			return nil, err
		}
		rows = append(rows, row)
		if p.peek().Kind == TokComma {
			p.pos++
			continue
		}
		break
	}
	return &InsertStmt{Table: table, Cols: cols, Rows: rows}, nil
}

// ---------- UPDATE ----------

func (p *Parser) parseUpdate() (Stmt, error) {
	if err := p.expectKw("UPDATE"); err != nil {
		return nil, err
	}
	table, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	if err := p.expectKw("SET"); err != nil {
		return nil, err
	}
	var sets []SetClause
	for {
		col, err := p.expectIdent()
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(TokEq); err != nil {
			return nil, err
		}
		val, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		sets = append(sets, SetClause{Column: strings.ToLower(col), Value: val})
		if p.peek().Kind == TokComma {
			p.pos++
			continue
		}
		break
	}
	var where Expr
	if p.acceptKw("WHERE") {
		w, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		where = w
	}
	return &UpdateStmt{Table: strings.ToLower(table), Sets: sets, Where: where}, nil
}

// ---------- DELETE ----------

func (p *Parser) parseDelete() (Stmt, error) {
	if err := p.expectKw("DELETE"); err != nil {
		return nil, err
	}
	if err := p.expectKw("FROM"); err != nil {
		return nil, err
	}
	table, err := p.expectIdent()
	if err != nil {
		return nil, err
	}
	var where Expr
	if p.acceptKw("WHERE") {
		w, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		where = w
	}
	return &DeleteStmt{Table: strings.ToLower(table), Where: where}, nil
}

// ---------- SELECT ----------

func (p *Parser) parseSelect() (Stmt, error) {
	if err := p.expectKw("SELECT"); err != nil {
		return nil, err
	}
	distinct := p.acceptKw("DISTINCT")
	var items []SelectItem
	for {
		item, err := p.parseSelectItem()
		if err != nil {
			return nil, err
		}
		items = append(items, item)
		if p.peek().Kind == TokComma {
			p.pos++
			continue
		}
		break
	}
	if err := p.expectKw("FROM"); err != nil {
		return nil, err
	}
	from, err := p.parseTableRef()
	if err != nil {
		return nil, err
	}
	var joins []JoinClause
	for p.isKw("JOIN") || (p.isKw("INNER")) {
		if p.isKw("INNER") {
			p.pos++
		}
		if err := p.expectKw("JOIN"); err != nil {
			return nil, err
		}
		jt, err := p.parseTableRef()
		if err != nil {
			return nil, err
		}
		if err := p.expectKw("ON"); err != nil {
			return nil, err
		}
		on, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		joins = append(joins, JoinClause{Table: jt, On: on})
	}
	var where Expr
	if p.acceptKw("WHERE") {
		w, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		where = w
	}
	var orderBy []OrderItem
	if p.isKw("ORDER") {
		p.pos++
		if err := p.expectKw("BY"); err != nil {
			return nil, err
		}
		for {
			e, err := p.parseExpr()
			if err != nil {
				return nil, err
			}
			desc := false
			if p.acceptKw("DESC") {
				desc = true
			} else {
				p.acceptKw("ASC")
			}
			orderBy = append(orderBy, OrderItem{Expr: e, Desc: desc})
			if p.peek().Kind == TokComma {
				p.pos++
				continue
			}
			break
		}
	}
	var limit Expr
	if p.acceptKw("LIMIT") {
		l, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		limit = l
	}
	return &SelectStmt{
		Items:    items,
		Distinct: distinct,
		From:     from,
		Joins:    joins,
		Where:    where,
		OrderBy:  orderBy,
		Limit:    limit,
	}, nil
}

func (p *Parser) parseSelectItem() (SelectItem, error) {
	t := p.peek()
	// Star projection.
	if t.Kind == TokStar {
		p.pos++
		return SelectItem{Expr: &ColumnRef{Name: "*"}}, nil
	}
	// Qualified star: table.*
	if t.Kind == TokIdent {
		save := p.pos
		first := p.next()
		if p.peek().Kind == TokDot {
			second := p.next()
			if second.Kind == TokStar {
				return SelectItem{Expr: &ColumnRef{Table: strings.ToLower(first.Text), Name: "*"}}, nil
			}
		}
		p.pos = save
	}
	e, err := p.parseExpr()
	if err != nil {
		return SelectItem{}, err
	}
	alias := ""
	if p.acceptKw("AS") {
		a, err := p.expectIdent()
		if err != nil {
			return SelectItem{}, err
		}
		alias = a
	} else if p.peek().Kind == TokIdent && p.pos > 0 {
		// bare alias: only treat a following identifier as alias when the
		// expression is not an infix continuation
		a := p.peek()
		if !isExprContinuation(a) {
			p.pos++
			alias = a.Text
		}
	}
	return SelectItem{Expr: e, Alias: alias}, nil
}

func isExprContinuation(t Token) bool {
	switch t.Kind {
	case TokKeyword:
		switch t.Text {
		case "FROM", "WHERE", "ORDER", "BY", "LIMIT", "AND", "OR", "AS", "JOIN", "INNER", "ON", "IS", "LIKE", "NOT", "DESC", "ASC", "INTO", "VALUES", "SET":
			return true
		}
	case TokEq, TokNeq, TokLt, TokLe, TokGt, TokGe, TokPlus, TokMinus, TokStar, TokSlash, TokPercent, TokComma, TokRParen, TokSemicolon:
		return true
	}
	return false
}

func (p *Parser) parseTableRef() (TableRef, error) {
	name, err := p.expectIdent()
	if err != nil {
		return TableRef{}, err
	}
	alias := ""
	if p.acceptKw("AS") {
		a, err := p.expectIdent()
		if err != nil {
			return TableRef{}, err
		}
		alias = a
	} else if p.peek().Kind == TokIdent {
		a := p.next()
		alias = a.Text
	}
	name = strings.ToLower(name)
	if alias != "" {
		alias = strings.ToLower(alias)
	} else {
		alias = name
	}
	return TableRef{Name: name, Alias: alias}, nil
}

// ---------- Expressions ----------

func (p *Parser) parseExpr() (Expr, error) {
	return p.parseOr()
}

func (p *Parser) parseOr() (Expr, error) {
	left, err := p.parseAnd()
	if err != nil {
		return nil, err
	}
	for p.isKw("OR") {
		p.pos++
		right, err := p.parseAnd()
		if err != nil {
			return nil, err
		}
		left = &Binary{Op: "OR", L: left, R: right}
	}
	return left, nil
}

func (p *Parser) parseAnd() (Expr, error) {
	left, err := p.parseNot()
	if err != nil {
		return nil, err
	}
	for p.isKw("AND") {
		p.pos++
		right, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		left = &Binary{Op: "AND", L: left, R: right}
	}
	return left, nil
}

func (p *Parser) parseNot() (Expr, error) {
	if p.isKw("NOT") {
		p.pos++
		x, err := p.parseNot()
		if err != nil {
			return nil, err
		}
		return &Unary{Op: "NOT", X: x}, nil
	}
	return p.parseComparison()
}

func (p *Parser) parseComparison() (Expr, error) {
	left, err := p.parseAdditive()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		switch {
		case t.Kind == TokEq || t.Kind == TokNeq || t.Kind == TokLt || t.Kind == TokLe || t.Kind == TokGt || t.Kind == TokGe:
			p.pos++
			right, err := p.parseAdditive()
			if err != nil {
				return nil, err
			}
			left = &Binary{Op: t.Text, L: left, R: right}
		case p.isKw("IS"):
			p.pos++
			not := p.acceptKw("NOT")
			if err := p.expectKw("NULL"); err != nil {
				return nil, err
			}
			left = &IsNull{X: left, Not: not}
		case p.isKw("LIKE"):
			p.pos++
			right, err := p.parseAdditive()
			if err != nil {
				return nil, err
			}
			left = &Binary{Op: "LIKE", L: left, R: right}
		default:
			return left, nil
		}
	}
}

func (p *Parser) parseAdditive() (Expr, error) {
	left, err := p.parseMultiplicative()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.Kind != TokPlus && t.Kind != TokMinus {
			return left, nil
		}
		p.pos++
		right, err := p.parseMultiplicative()
		if err != nil {
			return nil, err
		}
		left = &Binary{Op: t.Text, L: left, R: right}
	}
}

func (p *Parser) parseMultiplicative() (Expr, error) {
	left, err := p.parseUnary()
	if err != nil {
		return nil, err
	}
	for {
		t := p.peek()
		if t.Kind != TokStar && t.Kind != TokSlash && t.Kind != TokPercent {
			return left, nil
		}
		p.pos++
		right, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		left = &Binary{Op: t.Text, L: left, R: right}
	}
}

func (p *Parser) parseUnary() (Expr, error) {
	t := p.peek()
	if t.Kind == TokMinus {
		p.pos++
		x, err := p.parseUnary()
		if err != nil {
			return nil, err
		}
		return &Unary{Op: "-", X: x}, nil
	}
	if t.Kind == TokPlus {
		p.pos++
		return p.parseUnary()
	}
	return p.parsePrimary()
}

func (p *Parser) parsePrimary() (Expr, error) {
	t := p.peek()
	switch t.Kind {
	case TokNumber:
		p.pos++
		return &Literal{Val: ParseNumber(t.Text)}, nil
	case TokString:
		p.pos++
		return &Literal{Val: TextValue(t.Text)}, nil
	case TokLParen:
		p.pos++
		e, err := p.parseExpr()
		if err != nil {
			return nil, err
		}
		if _, err := p.expect(TokRParen); err != nil {
			return nil, err
		}
		return e, nil
	case TokKeyword:
		if t.Text == "NULL" {
			p.pos++
			return &Literal{Val: NullValue()}, nil
		}
		if t.Text == "NOT" {
			p.pos++
			x, err := p.parseUnary()
			if err != nil {
				return nil, err
			}
			return &Unary{Op: "NOT", X: x}, nil
		}
		return nil, fmt.Errorf("unexpected keyword %s at byte %d", t.String(), t.Pos)
	case TokIdent:
		p.pos++
		first := t.Text
		// Qualified column: table.column
		if p.peek().Kind == TokDot {
			p.pos++
			second, err := p.expectIdent()
			if err != nil {
				return nil, err
			}
			return &ColumnRef{Table: strings.ToLower(first), Name: strings.ToLower(second)}, nil
		}
		return &ColumnRef{Name: strings.ToLower(first)}, nil
	case TokStar:
		p.pos++
		return &ColumnRef{Name: "*"}, nil
	}
	return nil, fmt.Errorf("unexpected %s at byte %d", t.String(), t.Pos)
}