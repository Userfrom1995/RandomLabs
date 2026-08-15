# Halcyon language reference

Halcyon is a small, strictly-evaluated, statically-typed functional language
with a bytecode VM. This page describes the syntax, type system, and runtime
semantics as implemented by the Haskell core and mirrored one-to-one by the
JavaScript playground.

## 1. Lexical structure

Programs are sequences of whitespace- and comment-separated tokens. Comments:

- `-- ...` to end of line
- `{- ... -}` for block comments (nestable)

Tokens:

| Category  | Examples                                        |
|-----------|-------------------------------------------------|
| Integer   | `0` `42` `-7` `1000000000000`                   |
| Float     | `3.14` `-0.5` `2.0` (written with a `.`)        |
| String    | `"hello"` `"a\nb"` (escape sequences supported) |
| Ident     | `x` `fib` `myVar` `isNil`                       |
| Keywords  | `let` `rec` `in` `fn` `if` `then` `else` `true` `false` |
| Operators | `+` `-` `*` `/` `<` `<=` `>` `>=` `==` `/=` `&&` `\|\|` `!` |
| Symbols   | `=` `=>` `(` `)` `[` `]` `,`                   |

Integers are arbitrary precision. Every token carries a 1-based `line:col`
position so lexer, parser, type, and runtime errors all point at the exact
source location.

## 2. Grammar

```
program   := dataDecl* expr EOF
dataDecl  := 'data' TypeName tyvar* '=' ['|'] ctor ('|' ctor)*
ctor      := CtorName type*
type      := tyvar | TypeName type* | '[' type ']' | '(' type ')' | Int | Float | Bool | String
expr      := letExpr | ifExpr | lambda | matchExpr | orExpr
letExpr   := 'let' ['rec'] ident '=' expr 'in' expr
ifExpr    := 'if' expr 'then' expr 'else' expr
lambda    := 'fn' ident+ '=>' expr
matchExpr := 'match' expr 'with' '|' pattern '=>' expr ('|' pattern '=>' expr)*
orExpr    := andExpr ('||' andExpr)*
andExpr   := cmpExpr ('&&' cmpExpr)*
cmpExpr   := addExpr (('==' | '/=' | '<' | '<=' | '>' | '>=') addExpr)*
addExpr   := mulExpr (('+' | '-') mulExpr)*
mulExpr   := unary (('*' | '/') unary)*
unary     := ('!' | '-') unary | apply
apply     := atom (atom)*                 (left-associative application)
atom      := int | float | string | ident | CtorName | 'true' | 'false'
           | '(' expr ')' | '[' (expr (',' expr)*)? ']'
pattern   := int | float | string | 'true' | 'false' | '_' | ident | '[]'
           | CtorName pattern* | pattern '::' pattern | '[' pattern (',' pattern)* ']'
```

Notes:

- Application is left-associative and binds tighter than any operator:
  `fib n - 1` parses as `(fib n) - 1`.
- `fn a b => e` is sugar for a curried function; it typechecks as
  `a -> b -> T`.
- Operator precedence, lowest to highest: `||`, `&&`, comparison/equality,
  `+` `-`, `*` `/`, unary `!` and `-`, application.
- `==` and `/=` are structural: they work on any value of the same type.
- Type names and constructor names start with a capital letter and are
  distinguished from ordinary identifiers by that case. Constructor
  application uses the same syntax as function application: `Pair 1 2`.
- `data` declarations may appear anywhere before the closing expression;
  a program has one or more optional declarations followed by exactly one
  expression. Inside a constructor, uppercase names mean a constructor,
  lowercase names mean type variables, and `Int`/`Float`/`Bool`/`String`
  are the base types. `[T]` is the list type.

## 3. Values and literals

| Literal       | Value        |
|---------------|--------------|
| `42`          | Int          |
| `3.14`        | Float        |
| `true`/`false`| Bool         |
| `"hi"`        | String       |
| `[1, 2, 3]`   | List of Int  |
| `Pair 1 2`    | `Pair Int Int` (a constructor value) |
| `fn x => x`   | Closure      |

Empty lists write as `[]`. There is no `nil` literal; the builtin `isNil`
tests for emptiness.

Output rendering is deterministic and shared by the interpreter, the VM, and
the playground: integers plain, floats always with a `.0` when integral
(`2.0` not `2`), strings printed raw (no quotes), lists as `[a, b, c]`,
closures as `<function>`, builtins as `<builtin: name>`, and constructor
values as `Name a b ...` (the constructor name followed by its rendered
fields, space separated).

## 4. Type system

Halcyon uses Hindley-Milner type inference (Algorithm W) with:

- Base types: `Int`, `Float`, `Bool`, `String`.
- List types: `[T]`.
- Function types: `A -> B`, right-associative.
- User-defined algebraic data types from `data` declarations. A data type
  is introduced by name, optionally with type variables, followed by one or
  more constructors:

```
data Maybe a = Nothing | Just a
data Tree = Leaf Int | Node Tree Tree
```

  The constructors are the values' tags. A constructor can have zero or
  more fields; fields are declared as type names, type variables, or list
  types, e.g. `data Box a = Box (Pair a a)`. Data types may be recursive
  (`Node Tree Tree`), mutually recursive, and polymorphic (`Maybe a`). All
  constructors of a type must be declared together in one `data` line.
- `let` generalizes its binding, so `let` gives real polymorphism:

```
let id = fn x => x in
if id true then id 1 else 0
```

  infers `id : forall a. a -> a` and uses it at both `Bool` and `Int`.

- Lambda parameters are monomorphic: a parameter has one type per
  `let`-binding occurrence, so the classic

```
let f = fn g => (g 1, g true) in ...
```

  fails with a type error, exactly as in ML.
- `let rec` binds the name inside its own body, monomorphically, then
  generalizes for the enclosing expression. This lets `fib` call itself.
- List literals unify their element types: `[1, 2.0]` becomes `[Float]`.
- Numeric operators promote: `Int` and `Float` mix to `Float`. Comparisons
  work numerically across the two types. `==`/`/=` require identical types.
- `&&`/`||` require both operands `Bool`; `!` requires `Bool`; unary `-`
  requires a numeric type.
- Every free type variable renders as a lowercase letter (`a`, `b`, ...);
  schemes print as `forall a. ...`.

### 4.1 Pattern matching

`match` is the one way to inspect a data value. It has the form

```
match expr with
  | pattern1 => expr1
  | pattern2 => expr2
```

Patterns are tried in order; the first one that matches the scrutinee wins
and its body runs with the pattern's variables bound. Patterns can be:

| Pattern            | Matches                                |
|--------------------|----------------------------------------|
| `42`, `3.14`, `"s"`, `true` | that literal value           |
| `_`                | anything (wildcard, binds nothing)     |
| `x` (lowercase)    | anything, bound to name `x`            |
| `[]`               | the empty list                         |
| `h :: t`           | a non-empty list (head and tail)       |
| `[a, b]`           | a list of exactly that many elements   |
| `Nothing`          | a constructor with no fields           |
| `Just x`           | a constructor with fields              |
| `Pair x y`         | nested constructor patterns            |

A `match` does not require exhaustive coverage at compile time: a
scrutinee whose constructors are not all covered simply falls through with
a runtime error (`no matching pattern`). A wildcard `_` (or a variable)
matches anything and makes the match exhaustive. If a pattern binds the
same name more than once, the rightmost binding wins (later bindings
shadow earlier ones); matching itself never compares the values.

When the scrutinee is a `[T]` list, `[]` and cons patterns are available.
When it is an algebraic data type, every branch must be a constructor
pattern for one of that type's constructors (or a wildcard). Pattern
matching compiles to a test-and-jump chain (Haskell and the JS mirror
alike): the scrutinee is tested against each pattern's tags in source
order, a failing test jumps straight to the next branch, and only the
matched branch's body ever runs. A chain that reaches the end without a
match executes `fail`, raising the `no matching pattern` runtime error.

Errors are reported with a position and a message such as:

```
type error at line 3, col 9: cannot unify Bool with Int
```

## 5. Builtins

Nine first-class list functions, exposed as names that resolve to builtin
values in expressions:

| Name       | Type                        | Behavior                                    |
|------------|-----------------------------|---------------------------------------------|
| `cons`     | `a -> [a] -> [a]`           | curried cons: `cons 1 (cons 2 [])`          |
| `head`     | `[a] -> a`                  | first element; errors on `[]`               |
| `tail`     | `[a] -> [a]`                | rest of the list; errors on `[]`            |
| `isNil`    | `[a] -> Bool`               | true when the list is empty                 |
| `length`   | `[a] -> Int`                | number of elements                          |
| `reverse`  | `[a] -> [a]`                | the list in reverse order                   |
| `append`   | `[a] -> [a] -> [a]`         | concatenate two lists                       |
| `take`     | `Int -> [a] -> [a]`         | the first `n` elements                      |
| `drop`     | `Int -> [a] -> [a]`         | the list without its first `n` elements     |

`length`, `reverse`, `head`, `tail`, and `isNil` are unary. The curried
builtins (`cons`, `append`, `take`, `drop`) apply one argument at a time:
`cons 1` or `append [1]` is a partial application that completes when the
remaining argument arrives. `take`/`drop` clamp negative counts to zero, so
`take (-1) xs` is `[]` and `drop (-1) xs` is `xs`; counts past the end
behave as expected (`take 9 [1]` is `[1]`, `drop 9 [1]` is `[]`).

All nine are polymorphic: `length` and `take`/`drop` work on lists of any
element type, `reverse`/`append` preserve it, and `let`-generalization
means `let l = fn xs => length xs in l [true]` typechecks. Runtime misuse
still errors precisely: `length 5` is a type error, while
`head []` / `tail []` are runtime errors.

## 6. Evaluation semantics

- Strict (eager) evaluation, left-to-right. There is no laziness.
- Closures capture their defining environment. `let rec` uses a
  self-referential cell so recursive functions see themselves.
- A `let` chain is nested: `let a = e1 in let b = e2 in body` is the idiom
  (no top-level `let` lists).
- `if c then t else e`: `c` must be `Bool`; only the taken branch evaluates.
- Division: integer `/` on two `Int` operands is Euclidean-ish truncating
  integer division; division by zero is a runtime error
  (`division by zero`). Any `Float` operand makes the result `Float`.
- `head`/`tail` on an empty list raise `head of empty list` /
  `tail of empty list` at runtime.
- Type errors are caught before execution by `check`; the VM never sees an
  ill-typed program.

## 7. Example

```
let rec fib = fn n =>
  if n < 2 then n
  else fib (n - 1) + fib (n - 2)
in fib 25
```

prints `75025`.