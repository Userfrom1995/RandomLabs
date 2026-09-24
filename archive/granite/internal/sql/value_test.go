package sql

import "testing"

func TestValueString(t *testing.T) {
	cases := []struct {
		v    Value
		want string
	}{
		{NullValue(), "NULL"},
		{IntValue(42), "42"},
		{RealValue(3.5), "3.5"},
		{RealValue(2), "2.0"},
		{TextValue("hi"), "hi"},
	}
	for _, c := range cases {
		if got := c.v.String(); got != c.want {
			t.Errorf("Value(%v).String() = %q, want %q", c.v, got, c.want)
		}
	}
}

func TestCompareOrdering(t *testing.T) {
	// NULL < INT < REAL < TEXT, numeric cross-compare by value.
	cases := []struct {
		a, b Value
		want int
	}{
		{NullValue(), NullValue(), 0},
		{NullValue(), IntValue(1), -1},
		{IntValue(1), NullValue(), 1},
		{IntValue(2), IntValue(3), -1},
		{IntValue(3), IntValue(3), 0},
		{IntValue(5), RealValue(4.0), 1},
		{IntValue(4), RealValue(4.0), 0},
		{RealValue(2.5), IntValue(3), -1},
		{IntValue(1), TextValue("a"), -1},
		{TextValue("a"), IntValue(1), 1},
		{TextValue("a"), TextValue("b"), -1},
		{TextValue("a"), TextValue("a"), 0},
	}
	for _, c := range cases {
		if got := Compare(c.a, c.b); got != c.want {
			t.Errorf("Compare(%v, %v) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestArithmetic(t *testing.T) {
	// integer stays integer
	v, err := EvalBinary("+", IntValue(2), IntValue(3))
	if err != nil || v.String() != "5" {
		t.Fatalf("2+3 = %v, %v", v, err)
	}
	// mixed becomes real
	v, err = EvalBinary("+", IntValue(2), RealValue(0.5))
	if err != nil || v.String() != "2.5" {
		t.Fatalf("2+0.5 = %v, %v", v, err)
	}
	// NULL propagation
	v, _ = EvalBinary("+", NullValue(), IntValue(1))
	if !v.IsNull() {
		t.Errorf("NULL + 1 should be NULL, got %v", v)
	}
	// integer division stays real
	v, err = EvalBinary("/", IntValue(7), IntValue(2))
	if err != nil || v.String() != "3.5" {
		t.Fatalf("7/2 = %v, %v", v, err)
	}
	// division by zero errors
	if _, err := EvalBinary("/", IntValue(1), IntValue(0)); err == nil {
		t.Errorf("1/0 should error")
	}
	// modulo requires ints
	if _, err := EvalBinary("%", IntValue(7), RealValue(2)); err == nil {
		t.Errorf("7%%2.0 should error")
	}
	v, err = EvalBinary("%", IntValue(7), IntValue(3))
	if err != nil || v.String() != "1" {
		t.Fatalf("7%%3 = %v, %v", v, err)
	}
}

func TestComparisons(t *testing.T) {
	if v, _ := EvalBinary(">", IntValue(5), IntValue(3)); v.String() != "1" {
		t.Errorf("5>3 should be 1, got %v", v)
	}
	if v, _ := EvalBinary(">=", IntValue(3), IntValue(3)); v.String() != "1" {
		t.Errorf("3>=3 should be 1, got %v", v)
	}
	if v, _ := EvalBinary("!=", IntValue(3), IntValue(3)); v.String() != "0" {
		t.Errorf("3!=3 should be 0, got %v", v)
	}
	// NULL comparison is unknown
	if v, _ := EvalBinary("=", NullValue(), NullValue()); !v.IsNull() {
		t.Errorf("NULL = NULL should be NULL, got %v", v)
	}
}

func TestLike(t *testing.T) {
	cases := []struct {
		pattern, text string
		want          string
	}{
		{"%", "anything", "1"},
		{"a%", "abc", "1"},
		{"%c", "abc", "1"},
		{"%b%", "abc", "1"},
		{"a_c", "abc", "1"},
		{"a_c", "abXc", "0"},
		{"abc", "abc", "1"},
		{"abc", "abd", "0"},
	}
	for _, c := range cases {
		v, err := EvalBinary("LIKE", TextValue(c.text), TextValue(c.pattern))
		if err != nil {
			t.Fatalf("LIKE %q %q: %v", c.pattern, c.text, err)
		}
		if got := v.String(); got != c.want {
			t.Errorf("LIKE %q on %q = %s, want %s", c.pattern, c.text, got, c.want)
		}
	}
}

func TestBooleanLogic(t *testing.T) {
	if v, _ := EvalBinary("AND", IntValue(1), IntValue(1)); v.String() != "1" {
		t.Errorf("1 AND 1 should be 1")
	}
	if v, _ := EvalBinary("AND", IntValue(1), IntValue(0)); v.String() != "0" {
		t.Errorf("1 AND 0 should be 0")
	}
	if v, _ := EvalBinary("OR", IntValue(0), IntValue(1)); v.String() != "1" {
		t.Errorf("0 OR 1 should be 1")
	}
	if v, _ := EvalBinary("OR", IntValue(0), IntValue(0)); v.String() != "0" {
		t.Errorf("0 OR 0 should be 0")
	}
}

func TestAsColumn(t *testing.T) {
	if v, err := AsColumn(IntValue(3), TypeInt); err != nil || v.String() != "3" {
		t.Errorf("int into INTEGER failed: %v %v", v, err)
	}
	if v, err := AsColumn(IntValue(3), TypeReal); err != nil || v.String() != "3.0" {
		t.Errorf("int into REAL failed: %v %v", v, err)
	}
	if v, err := AsColumn(IntValue(3), TypeText); err != nil || v.String() != "3" {
		t.Errorf("int into TEXT failed: %v %v", v, err)
	}
	if _, err := AsColumn(TextValue("abc"), TypeInt); err == nil {
		t.Errorf("text into INTEGER should fail")
	}
	if _, err := AsColumn(RealValue(3.5), TypeInt); err == nil {
		t.Errorf("non-integral real into INTEGER should fail")
	}
	if v, err := AsColumn(NullValue(), TypeInt); err != nil || !v.IsNull() {
		t.Errorf("NULL into INTEGER failed: %v %v", v, err)
	}
}

func TestParseNumber(t *testing.T) {
	if v := ParseNumber("42"); v.String() != "42" {
		t.Errorf("42 parsed as %v", v)
	}
	if v := ParseNumber("3.14"); v.String() != "3.14" {
		t.Errorf("3.14 parsed as %v", v)
	}
	if v := ParseNumber("1e3"); v.String() != "1000.0" {
		t.Errorf("1e3 parsed as %v", v)
	}
}

func TestTruthy(t *testing.T) {
	if Truthy(IntValue(1)) != true || Truthy(IntValue(0)) != false {
		t.Errorf("integer truthiness wrong")
	}
	if Truthy(NullValue()) != false {
		t.Errorf("NULL should be falsy")
	}
	if Truthy(TextValue("")) != false || Truthy(TextValue("x")) != true {
		t.Errorf("text truthiness wrong")
	}
}
