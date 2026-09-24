package sql

// Parse parses a SQL source string into statements.
func Parse(src string) ([]Stmt, error) {
	lx := NewLexer(src)
	toks, err := lx.Tokenize()
	if err != nil {
		return nil, err
	}
	return NewParser(toks).ParseAll()
}