package sql

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Type is a declared column type.
type Type string

const (
	TypeInt  Type = "INTEGER"
	TypeReal Type = "REAL"
	TypeText Type = "TEXT"
)

// Kind is the runtime type of a Value.
type Kind uint8

const (
	KindNull Kind = iota
	KindInt
	KindReal
	KindText
)

// Value is a dynamically typed SQL value.
type Value struct {
	kind Kind
	i    int64
	f    float64
	s    string
}

func NullValue() Value            { return Value{kind: KindNull} }
func IntValue(i int64) Value      { return Value{kind: KindInt, i: i} }
func RealValue(f float64) Value   { return Value{kind: KindReal, f: f} }
func TextValue(s string) Value    { return Value{kind: KindText, s: s} }

func (v Value) Kind() Kind   { return v.kind }
func (v Value) IsNull() bool { return v.kind == KindNull }

func (v Value) Int() (int64, bool) {
	if v.kind != KindInt {
		return 0, false
	}
	return v.i, true
}

func (v Value) Real() (float64, bool) {
	switch v.kind {
	case KindReal:
		return v.f, true
	case KindInt:
		return float64(v.i), true
	}
	return 0, false
}

func (v Value) Text() (string, bool) {
	if v.kind != KindText {
		return "", false
	}
	return v.s, true
}

// String renders a value for display.
func (v Value) String() string {
	switch v.kind {
	case KindNull:
		return "NULL"
	case KindInt:
		return strconv.FormatInt(v.i, 10)
	case KindReal:
		return formatReal(v.f)
	case KindText:
		return v.s
	}
	return ""
}

// Display renders a value for query output.
func (v Value) Display() string {
	switch v.kind {
	case KindNull:
		return "NULL"
	case KindInt:
		return strconv.FormatInt(v.i, 10)
	case KindReal:
		return formatReal(v.f)
	case KindText:
		return v.s
	}
	return ""
}

func formatReal(f float64) string {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return strconv.FormatFloat(f, 'g', -1, 64)
	}
	s := strconv.FormatFloat(f, 'f', -1, 64)
	if !strings.Contains(s, ".") {
		s += ".0"
	}
	return s
}

// Compare defines a total order: NULL < INT < REAL < TEXT. Two numeric values
// compare by value even if one is INT and the other REAL.
func Compare(a, b Value) int {
	ak, bk := a.kind, b.kind
	if ak == bk {
		switch ak {
		case KindNull:
			return 0
		case KindInt:
			if a.i < b.i {
				return -1
			} else if a.i > b.i {
				return 1
			}
			return 0
		case KindReal:
			if a.f < b.f {
				return -1
			} else if a.f > b.f {
				return 1
			}
			return 0
		case KindText:
			return strings.Compare(a.s, b.s)
		}
	}
	if ak == KindNull {
		return -1
	}
	if bk == KindNull {
		return 1
	}
	if isNumericKind(ak) && isNumericKind(bk) {
		af, _ := a.Real()
		bf, _ := b.Real()
		if af < bf {
			return -1
		} else if af > bf {
			return 1
		}
		return 0
	}
	if ak < bk {
		return -1
	}
	return 1
}

func isNumericKind(k Kind) bool { return k == KindInt || k == KindReal }

func isNumeric(v Value) bool { return isNumericKind(v.kind) }

// AsColumn coerces a value to the declared column type, returning an error on
// a type mismatch.
func AsColumn(v Value, t Type) (Value, error) {
	switch t {
	case TypeInt:
		switch v.kind {
		case KindNull:
			return NullValue(), nil
		case KindInt:
			return v, nil
		case KindReal:
			if math.Trunc(v.f) == v.f && !math.IsInf(v.f, 0) {
				return IntValue(int64(v.f)), nil
			}
			return Value{}, fmt.Errorf("cannot store %s as INTEGER", v.Display())
		default:
			return Value{}, fmt.Errorf("cannot store %q as INTEGER", v.Display())
		}
	case TypeReal:
		switch v.kind {
		case KindNull:
			return NullValue(), nil
		case KindInt, KindReal:
			return RealValue(realOf(v)), nil
		default:
			return Value{}, fmt.Errorf("cannot store %q as REAL", v.Display())
		}
	case TypeText:
		switch v.kind {
		case KindNull:
			return NullValue(), nil
		case KindText:
			return v, nil
		default:
			return TextValue(v.Display()), nil
		}
	}
	return Value{}, fmt.Errorf("unknown type %q", t)
}

func realOf(v Value) float64 {
	if f, ok := v.Real(); ok {
		return f
	}
	return 0
}

var errNotNumeric = errors.New("value is not numeric")
var errDivZero = errors.New("division by zero")

// arithmetic performs + - * / % with NULL propagation.
func arithmetic(op string, a, b Value) (Value, error) {
	if a.IsNull() || b.IsNull() {
		return NullValue(), nil
	}
	bothInt := a.kind == KindInt && b.kind == KindInt
	switch op {
	case "+":
		if bothInt {
			return IntValue(a.i + b.i), nil
		}
		af, _ := a.Real()
		bf, _ := b.Real()
		return RealValue(af + bf), nil
	case "-":
		if bothInt {
			return IntValue(a.i - b.i), nil
		}
		af, _ := a.Real()
		bf, _ := b.Real()
		return RealValue(af - bf), nil
	case "*":
		if bothInt {
			return IntValue(a.i * b.i), nil
		}
		af, _ := a.Real()
		bf, _ := b.Real()
		return RealValue(af * bf), nil
	case "/":
		if !isNumeric(a) || !isNumeric(b) {
			return Value{}, errNotNumeric
		}
		af, _ := a.Real()
		bf, _ := b.Real()
		if bf == 0 {
			return Value{}, errDivZero
		}
		return RealValue(af / bf), nil
	case "%":
		if !bothInt {
			return Value{}, errors.New("modulo requires integer operands")
		}
		if b.i == 0 {
			return Value{}, errDivZero
		}
		return IntValue(a.i % b.i), nil
	}
	return Value{}, fmt.Errorf("unknown operator %q", op)
}

// compareValues applies an operator to two values, returning a bool. A NULL
// operand makes any comparison unknown, reported via the bool return.
func compareValues(op string, a, b Value) (bool, bool) {
	if a.IsNull() || b.IsNull() {
		return false, true
	}
	c := Compare(a, b)
	switch op {
	case "=":
		return c == 0, false
	case "!=", "<>":
		return c != 0, false
	case "<":
		return c < 0, false
	case "<=":
		return c <= 0, false
	case ">":
		return c > 0, false
	case ">=":
		return c >= 0, false
	}
	return false, false
}

// truthy converts a value to a boolean for WHERE/AND/OR/NOT. NULL is false.
func truthy(v Value) bool {
	switch v.kind {
	case KindNull:
		return false
	case KindInt:
		return v.i != 0
	case KindReal:
		return v.f != 0
	case KindText:
		return v.s != ""
	}
	return false
}

// EvalBinary applies an operator to two values, returning a bool. A NULL
// operand makes any comparison unknown, reported via the bool return.
func EvalBinary(op string, a, b Value) (Value, error) {
	switch op {
	case "AND":
		if !truthy(a) {
			return IntValue(0), nil
		}
		if !truthy(b) {
			return IntValue(0), nil
		}
		return IntValue(1), nil
	case "OR":
		if truthy(a) {
			return IntValue(1), nil
		}
		if truthy(b) {
			return IntValue(1), nil
		}
		return IntValue(0), nil
	case "=", "!=", "<>", "<", "<=", ">", ">=":
		res, null := compareValues(op, a, b)
		if null {
			return NullValue(), nil
		}
		if res {
			return IntValue(1), nil
		}
		return IntValue(0), nil
	case "LIKE":
		at, ok := a.Text()
		if !ok {
			return IntValue(0), nil
		}
		pt, ok := b.Text()
		if !ok {
			return IntValue(0), nil
		}
		if likeMatches(pt, at) {
			return IntValue(1), nil
		}
		return IntValue(0), nil
	}
	return arithmetic(op, a, b)
}

// Truthy converts a value to a boolean for WHERE/AND/OR/NOT. NULL is false.
func Truthy(v Value) bool { return truthy(v) }

// BoolToInt converts a boolean to an INTEGER value.
func BoolToInt(b bool) Value {
	if b {
		return IntValue(1)
	}
	return IntValue(0)
}

// likeMatches implements SQL LIKE with % (any sequence) and _ (single char).
func likeMatches(pattern, text string) bool {
	return likeMatch(pattern, text)
}

func likeMatch(p, s string) bool {
	pi, si := 0, 0
	starPi, starSi := -1, 0
	for si < len(s) {
		if pi < len(p) && (p[pi] == '_' || p[pi] == s[si]) {
			pi++
			si++
		} else if pi < len(p) && p[pi] == '%' {
			starPi = pi
			pi++
			starSi = si
		} else if starPi != -1 {
			pi = starPi + 1
			starSi++
			si = starSi
		} else {
			return false
		}
	}
	for pi < len(p) && p[pi] == '%' {
		pi++
	}
	return pi == len(p)
}