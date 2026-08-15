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
program   := expr EOF
expr      := letExpr | ifExpr | lambda | orExpr
letExpr   := 'let' ['rec'] ident '=' expr 'in' expr
ifExpr    := 'if' expr 'then' expr 'else' expr
lambda    := 'fn' ident+ '=>' expr
orExpr    := andExpr ('||' andExpr)*
andExpr   := cmpExpr ('&&' cmpExpr)*
cmpExpr   := addExpr (('==' | '/=' | '<' | '<=' | '>' | '>=') addExpr)*
addExpr   := mulExpr (('+' | '-') mulExpr)*
mulExpr   := unary (('*' | '/') unary)*
unary     := ('!' | '-') unary | apply
apply     := atom (atom)*                 (left-associative application)
atom      := int | float | string | ident | 'true' | 'false'
           | '(' expr ')' | '[' (expr (',' expr)*)? ']'
```

Notes:

- Application is left-associative and binds tighter than any operator:
  `fib n - 1` parses as `(fib n) - 1`.
- `fn a b => e` is sugar for a curried function; it typechecks as
  `a -> b -> T`.
- Operator precedence, lowest to highest: `||`, `&&`, comparison/equality,
  `+` `-`, `*` `/`, unary `!` and `-`, application.
- `==` and `/=` are structural: they work on any value of the same type.

## 3. Values and literals

| Literal       | Value        |
|---------------|--------------|
| `42`          | Int          |
| `3.14`        | Float        |
| `true`/`false`| Bool         |
| `"hi"`        | String       |
| `[1, 2, 3]`   | List of Int  |
| `fn x => x`   | Closure      |

Empty lists write as `[]`. There is no `nil` literal; the builtin `isNil`
tests for emptiness.

Output rendering is deterministic and shared by the interpreter, the VM, and
the playground: integers plain, floats always with a `.0` when integral
(`2.0` not `2`), strings printed raw (no quotes), lists as `[a, b, c]`,
closures as `<function>`, builtins as `<builtin: name>`.

## 4. Type system

Halcyon uses Hindley-Milner type inference (Algorithm W) with:

- Base types: `Int`, `Float`, `Bool`, `String`.
- List types: `[T]`.
- Function types: `A -> B`, right-associative.
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