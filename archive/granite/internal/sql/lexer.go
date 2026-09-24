package sql

import (
	"fmt"
	"strconv"
	"strings"
)

// Lexer turns SQL source text into a slice of tokens.
type Lexer struct {
	src  string
	pos  int
	toks []Token
}

// NewLexer creates a lexer for the given SQL source.
func NewLexer(src string) *Lexer {
	return &Lexer{src: src}
}

// Tokenize scans the whole input, returning all tokens (ends with TokEOF).
func (lx *Lexer) Tokenize() ([]Token, error) {
	for {
		t, err := lx.next()
		if err != nil {
			return nil, err
		}
		lx.toks = append(lx.toks, t)
		if t.Kind == TokEOF {
			return lx.toks, nil
		}
	}
}

func (lx *Lexer) next() (Token, error) {
	lx.skipSpace()
	start := lx.pos
	if lx.pos >= len(lx.src) {
		return Token{Kind: TokEOF, Text: "", Pos: start}, nil
	}
	c := lx.src[lx.pos]

	// Identifier or keyword.
	if isIdentStart(c) {
		j := lx.pos
		for j < len(lx.src) && isIdentPart(lx.src[j]) {
			j++
		}
		word := lx.src[lx.pos:j]
		lx.pos = j
		if kw, ok := isKeyword(word); ok {
			return Token{Kind: TokKeyword, Text: kw, Pos: start}, nil
		}
		return Token{Kind: TokIdent, Text: word, Pos: start}, nil
	}

	// Number literal.
	if c >= '0' && c <= '9' {
		j := lx.pos
		for j < len(lx.src) && (lx.src[j] >= '0' && lx.src[j] <= '9') {
			j++
		}
		// Optional decimal point.
		if j < len(lx.src) && lx.src[j] == '.' && j+1 < len(lx.src) && lx.src[j+1] >= '0' && lx.src[j+1] <= '9' {
			j++
			for j < len(lx.src) && (lx.src[j] >= '0' && lx.src[j] <= '9') {
				j++
			}
		}
		// Optional exponent.
		if j < len(lx.src) && (lx.src[j] == 'e' || lx.src[j] == 'E') {
			k := j + 1
			if k < len(lx.src) && (lx.src[k] == '+' || lx.src[k] == '-') {
				k++
			}
			if k < len(lx.src) && lx.src[k] >= '0' && lx.src[k] <= '9' {
				j = k
				for j < len(lx.src) && (lx.src[j] >= '0' && lx.src[j] <= '9') {
					j++
				}
			}
		}
		text := lx.src[lx.pos:j]
		lx.pos = j
		return Token{Kind: TokNumber, Text: text, Pos: start}, nil
	}

	// String literal with '' escaping.
	if c == '\'' {
		j := lx.pos + 1
		var sb strings.Builder
		for j < len(lx.src) {
			if lx.src[j] == '\'' {
				if j+1 < len(lx.src) && lx.src[j+1] == '\'' {
					sb.WriteByte('\'')
					j += 2
					continue
				}
				j++
				lx.pos = j
				return Token{Kind: TokString, Text: sb.String(), Pos: start}, nil
			}
			sb.WriteByte(lx.src[j])
			j++
		}
		return Token{}, fmt.Errorf("unterminated string literal at byte %d", start)
	}

	// Punctuation and operators.
	switch c {
	case ';':
		lx.pos++
		return Token{Kind: TokSemicolon, Text: ";", Pos: start}, nil
	case ',':
		lx.pos++
		return Token{Kind: TokComma, Text: ",", Pos: start}, nil
	case '.':
		lx.pos++
		return Token{Kind: TokDot, Text: ".", Pos: start}, nil
	case '(':
		lx.pos++
		return Token{Kind: TokLParen, Text: "(", Pos: start}, nil
	case ')':
		lx.pos++
		return Token{Kind: TokRParen, Text: ")", Pos: start}, nil
	case '+':
		lx.pos++
		return Token{Kind: TokPlus, Text: "+", Pos: start}, nil
	case '-':
		lx.pos++
		return Token{Kind: TokMinus, Text: "-", Pos: start}, nil
	case '*':
		lx.pos++
		return Token{Kind: TokStar, Text: "*", Pos: start}, nil
	case '/':
		lx.pos++
		return Token{Kind: TokSlash, Text: "/", Pos: start}, nil
	case '%':
		lx.pos++
		return Token{Kind: TokPercent, Text: "%", Pos: start}, nil
	case '=':
		lx.pos++
		return Token{Kind: TokEq, Text: "=", Pos: start}, nil
	case '<':
		lx.pos++
		if lx.pos < len(lx.src) && lx.src[lx.pos] == '=' {
			lx.pos++
			return Token{Kind: TokLe, Text: "<=", Pos: start}, nil
		}
		if lx.pos < len(lx.src) && lx.src[lx.pos] == '>' {
			lx.pos++
			return Token{Kind: TokNeq, Text: "<>", Pos: start}, nil
		}
		return Token{Kind: TokLt, Text: "<", Pos: start}, nil
	case '>':
		lx.pos++
		if lx.pos < len(lx.src) && lx.src[lx.pos] == '=' {
			lx.pos++
			return Token{Kind: TokGe, Text: ">=", Pos: start}, nil
		}
		return Token{Kind: TokGt, Text: ">", Pos: start}, nil
	case '!':
		lx.pos++
		if lx.pos < len(lx.src) && lx.src[lx.pos] == '=' {
			lx.pos++
			return Token{Kind: TokNeq, Text: "!=", Pos: start}, nil
		}
		return Token{}, fmt.Errorf("unexpected character '!' at byte %d", start)
	}

	return Token{}, fmt.Errorf("unexpected character %q at byte %d", string(c), start)
}

func (lx *Lexer) skipSpace() {
	for lx.pos < len(lx.src) {
		c := lx.src[lx.pos]
		if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
			lx.pos++
			continue
		}
		// Line comment.
		if c == '-' && lx.pos+1 < len(lx.src) && lx.src[lx.pos+1] == '-' {
			for lx.pos < len(lx.src) && lx.src[lx.pos] != '\n' {
				lx.pos++
			}
			continue
		}
		// Block comment.
		if c == '/' && lx.pos+1 < len(lx.src) && lx.src[lx.pos+1] == '*' {
			lx.pos += 2
			for lx.pos+1 < len(lx.src) && !(lx.src[lx.pos] == '*' && lx.src[lx.pos+1] == '/') {
				lx.pos++
			}
			if lx.pos+1 < len(lx.src) {
				lx.pos += 2
			}
			continue
		}
		break
	}
}

func isIdentStart(c byte) bool {
	return c == '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

func isIdentPart(c byte) bool {
	return isIdentStart(c) || (c >= '0' && c <= '9')
}

// ParseNumber converts a numeric token text to a Value.
func ParseNumber(text string) Value {
	if i, err := strconv.ParseInt(text, 10, 64); err == nil {
		return IntValue(i)
	}
	if f, err := strconv.ParseFloat(text, 64); err == nil {
		return RealValue(f)
	}
	return NullValue()
}