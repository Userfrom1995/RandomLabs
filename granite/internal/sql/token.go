package sql

import "fmt"

// TokenKind identifies a lexical token.
type TokenKind uint8

const (
	TokEOF TokenKind = iota
	TokIdent
	TokKeyword
	TokNumber
	TokString
	TokPunct
	TokSemicolon
	TokComma
	TokDot
	TokLParen
	TokRParen
	TokEq
	TokNeq
	TokLt
	TokLe
	TokGt
	TokGe
	TokPlus
	TokMinus
	TokStar
	TokSlash
	TokPercent
)

// Token is a single lexical token with position info.
type Token struct {
	Kind TokenKind
	Text string
	Pos  int
}

func (t Token) String() string {
	switch t.Kind {
	case TokEOF:
		return "<EOF>"
	default:
		return fmt.Sprintf("%q", t.Text)
	}
}

// keywords maps uppercase SQL keywords to a canonical form.
var keywords = map[string]string{
	"SELECT":     "SELECT",
	"FROM":       "FROM",
	"WHERE":      "WHERE",
	"INSERT":     "INSERT",
	"INTO":       "INTO",
	"VALUES":     "VALUES",
	"UPDATE":     "UPDATE",
	"SET":        "SET",
	"DELETE":     "DELETE",
	"CREATE":     "CREATE",
	"TABLE":      "TABLE",
	"INDEX":      "INDEX",
	"ON":         "ON",
	"DROP":       "DROP",
	"AND":        "AND",
	"OR":         "OR",
	"NOT":        "NOT",
	"NULL":       "NULL",
	"AS":         "AS",
	"JOIN":       "JOIN",
	"INNER":      "INNER",
	"ORDER":      "ORDER",
	"BY":         "BY",
	"LIMIT":      "LIMIT",
	"ASC":        "ASC",
	"DESC":       "DESC",
	"DISTINCT":   "DISTINCT",
	"LIKE":       "LIKE",
	"IS":         "IS",
	"EXPLAIN":    "EXPLAIN",
	"BEGIN":      "BEGIN",
	"COMMIT":     "COMMIT",
	"ROLLBACK":   "ROLLBACK",
	"TRANSACTION": "TRANSACTION",
}

// isKeyword reports whether s is a SQL keyword (case-insensitive).
func isKeyword(s string) (string, bool) {
	up := uppercase(s)
	k, ok := keywords[up]
	return k, ok
}

func uppercase(s string) string {
	b := []byte(s)
	for i := range b {
		if b[i] >= 'a' && b[i] <= 'z' {
			b[i] -= 'a' - 'A'
		}
	}
	return string(b)
}