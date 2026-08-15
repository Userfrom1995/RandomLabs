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
| Char      | `'a'` `'0'` `'\n'` (escape sequences supported) |
| Ident     | `x` `fib` `myVar` `isNil`                       |
| Keywords  | `let` `rec` `in` `fn` `if` `then` `else` `true` `false` `data` `match` `with` `class` `instance` `record` |
| Operators | `+` `-` `*` `/` `<` `<=` `>` `>=` `==` `/=` `&&` `\|\|` `!` `.` |
| Symbols   | `=` `=>` `(` `)` `[` `]` `,` `:` `{` `}` `|`   |

Integers are arbitrary precision. Every token carries a 1-based `line:col`
position so lexer, parser, type, and runtime errors all point at the exact
source location.

## 2. Grammar

```
program   := import* decl* expr EOF
import    := 'import' '"' fileName '"'
decl      := dataDecl | recordDecl | classDecl | instanceDecl | letDecl
dataDecl  := 'data' TypeName tyvar* '=' ['|'] ctor ('|' ctor)*
ctor      := CtorName type*
recordDecl := 'record' TypeName tyvar* '=' '{' field (',' field)* '}'
field     := ident ':' type
classDecl := 'class' TypeName tyvar 'where' sig+
sig       := ident ':' type
instanceDecl := 'instance' tyvar '=>' TypeName type 'where' method+
method    := ident '=' expr
letDecl   := 'let' ['rec'] ident '=' expr
type      := tyvar | TypeName type* | '[' type ']' | 'Char' | 'Int' | 'Float' | 'Bool' | 'String'
expr      := letExpr | ifExpr | lambda | matchExpr | recordExpr | orExpr
letExpr   := 'let' ['rec'] ident '=' expr 'in' expr
ifExpr    := 'if' expr 'then' expr 'else' expr
lambda    := 'fn' ident+ '=>' expr
matchExpr := 'match' expr 'with' '|' pattern '=>' expr ('|' pattern '=>' expr)*
recordExpr := '{' field ('=' expr) (',' field '=' expr)* '}'
fieldAssign := ident '=' expr
orExpr    := andExpr ('||' andExpr)*
andExpr   := cmpExpr ('&&' cmpExpr)*
cmpExpr   := addExpr (('==' | '/=' | '<' | '<=' | '>' | '>=') addExpr)*
addExpr   := mulExpr (('+' | '-') mulExpr)*
mulExpr   := unary (('*' | '/') unary)*
unary     := ('!' | '-') unary | apply
apply     := atom (atom)*                 (left-associative application)
atom      := int | float | string | char | ident | CtorName | 'true' | 'false'
           | '(' expr ')' | '[' (expr (',' expr)*)? ']'
           | recordExpr | expr '.' ident | expr '#' ident
pattern   := int | float | string | char | 'true' | 'false' | '_' | ident | '[]'
           | CtorName pattern* | pattern '::' pattern | '[' pattern (',' pattern)* ']'
           | '{' field '=' ident (',' field '=' ident)* '}'
```

Notes:

- Application is left-associative and binds tighter than any operator:
  `fib n - 1` parses as `(fib n) - 1`.
- `fn a b => e` is sugar for a curried function; it typechecks as
  `a -> b -> T`.
- Operator precedence, lowest to highest: `||`, `&&`, comparison/equality,
  `+` `-`, `*` `/`, unary `!` and `-`, application, and field projection
  `.` (and record update `#`) bind tightest of all.
- `==` and `/=` are structural: they work on any value of the same type.
- Type names and constructor names start with a capital letter and are
  distinguished from ordinary identifiers by that case. Constructor
  application uses the same syntax as function application: `Pair 1 2`.
- `data`, `record`, `class`, `instance`, and `let` declarations may appear
  in any order before the closing expression; a program has zero or more
  optional declarations followed by exactly one expression. Inside a
  constructor, uppercase names mean a constructor, lowercase names mean
  type variables, and `Char`/`Int`/`Float`/`Bool`/`String` are the base
  types. `[T]` is the list type.

## 3. Values and literals

| Literal       | Value        |
|---------------|--------------|
| `42`          | Int          |
| `3.14`        | Float        |
| `true`/`false`| Bool         |
| `"hi"`        | String       |
| `'a'`         | Char         |
| `[1, 2, 3]`   | List of Int  |
| `{ x = 1 }`   | Record with field `x` |
| `Pair 1 2`    | `Pair Int Int` (a constructor value) |
| `fn x => x`   | Closure      |

Empty lists write as `[]`. There is no `nil` literal; the builtin `isNil`
tests for emptiness.

Output rendering is deterministic and shared by the interpreter, the VM, and
the playground: integers plain, floats always with a `.0` when integral
(`2.0` not `2`), strings printed raw (no quotes), chars printed with quotes
(`'a'`), lists as `[a, b, c]`, closures as `<function>`, builtins as
`<builtin: name>`, constructor values as `Name a b ...` (the constructor
name followed by its rendered fields, space separated), and records as
`{ x = v, y = w }` with the fields sorted by name.

## 4. Type system

Halcyon uses Hindley-Milner type inference (Algorithm W) with:

- Base types: `Int`, `Float`, `Bool`, `String`, `Char`.
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

- Records are nominal, immutable structs declared with `record`:

```
record Point = { x : Int, y : Int }
```

  A record value is written `{ x = 1, y = 2 }`; fields are projected with
  `.` (`p.x`), and a new record with one field changed is written with `#`
  (`p # y = 5` keeps `p.x`). Field order is irrelevant: `{ y = 2, x = 1 }`
  is the same value as `{ x = 1, y = 2 }`. Record types may be
  polymorphic (`record Box a = { item : a, tag : Int }`) and are nominal,
  so `{ x = 1 }` only typechecks against a declared `record` type. A
  `record` and a `data` type with the same name collide; two declarations
  of the same record name, or two records with the same field, are errors.

- Type classes provide bounded (ad-hoc) polymorphism through dictionaries:

```
class Size a where
  size : a -> Int

instance Size Int where
  size = fn n => n

instance Size Shape where
  size = fn s => match s with
    | Circle => 1
    | Rect => 2
```

  A `class` declares a type variable and one or more method signatures.
  An `instance` picks a concrete type (or a constrained type variable,
  `instance Show a => Show (Maybe a) where ...`) and gives a definition
  for every method. Calling a method `size v` dispatches on the dictionary
  attached to `v`'s type. The interpreter and VM implement instances as
  dictionaries passed alongside the value, so method dispatch is a
  first-class runtime lookup. Class and instance names must be unique,
  instance heads cannot be record types or duplicate, and a method body
  must use only its own class's other methods.

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
| `42`, `3.14`, `"s"`, `'a'`, `true` | that literal value       |
| `_`                | anything (wildcard, binds nothing)     |
| `x` (lowercase)    | anything, bound to name `x`            |
| `[]`               | the empty list                         |
| `h :: t`           | a non-empty list (head and tail)       |
| `[a, b]`           | a list of exactly that many elements   |
| `{ x = a, y = b }` | a record with those fields bound       |
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

The standard library ships as Halcyon source modules plus a set of
first-class list and string functions exposed as builtin values. Modules
are imported with `import "path"` at the top of a program; the import
resolves relative to the importing file, then falls back to the library
directory (`halcyon/lib/`, or `--lib DIR`). The CLI loads modules from
disk; the JavaScript mirror bundles the same modules (`stdlib`, `string`,
`maybe`, ...) so `import "string.hly"` works identically in the
playground. The library modules are written in Halcyon itself and layer
`chars`/`fromChars`, `repeat`, `countChar`, `startsWith` (string), and
the `Maybe` type and helpers (maybe), over the core builtins.

The builtin list functions, exposed as names that resolve to builtin values
in expressions:

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

The builtin string functions (also available as names that resolve to
builtin values):

| Name          | Type                  | Behavior                                    |
|---------------|-----------------------|---------------------------------------------|
| `strLen`      | `String -> Int`       | number of characters                        |
| `charAt`      | `String -> Int -> Char` | the character at an index; errors out of range |
| `substr`      | `String -> Int -> Int -> String` | characters from `i` up to `j`    |
| `strAppend`   | `String -> String -> String` | concatenate two strings             |
| `strContains` | `String -> String -> Bool` | whether the first contains the second |
| `str`         | `a -> String`         | the canonical rendering of any value        |

The `string` module (`lib/string.hly`) layers `chars`/`fromChars` (String
to `[Char]` and back), `fromChar`, `toUpper`/`toLower` (Char to Char),
`toUpperStr`/`toLowerStr` (String to String), `repeat`, `countChar`, and
`startsWith` over these. String literals support the same escapes as
Haskell char/string literals (`\n`, `\t`, `\\`, `\"`, `\'`). The `str`
builtin renders a char with quotes (`str 'a'` is `"'a'"`), so a single
character's text is `substr (str c) 1 (strLen (str c) - 2)`; that is
exactly what the `string` module's `fromChar` does.

A builtin `Show` class with a single `show : a -> String` method renders
any value to its canonical output form; `show 42` is `"42"`, `show 'a'` is
`"'a'"`, and `show [1, 2]` is `"[1, 2]"`. The class ships with instances
for `Int`, `Float`, `Bool`, `String`, `Char`, and the polymorphic
`Show a => Show [a]` list instance (which dispatches `show` on elements, so
user element instances are honored). It is always available (no import
needed). Declaring your own `class Show` is a duplicate-class error, and
records (like all nominal types) are not instance heads. For user data
types, write your own `instance Show MyType where ...`; the `str` builtin
additionally renders any value (closures as `<function>`, data values as
`Name f1 f2`) without going through the class.

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
- Records evaluate all fields, then project or update field by field.
  Field updates keep every other field and rebind the pattern-bound
  fields in record patterns (later bindings shadow earlier ones, as with
  any pattern).
- Class method dispatch is a runtime dictionary lookup: calling `size v`
  looks up `size` in the dictionary that inference attached to the value.
  With `--opt`, method call sites become direct calls to the resolved
  instance's method, so the dictionary lookup is done once at compile time
  (this is an optimization: the observable result is identical).

## 7. Example

```
let rec fib = fn n =>
  if n < 2 then n
  else fib (n - 1) + fib (n - 2)
in fib 25
```

prints `75025`.

A records-and-classes example (see `examples/records-classes.hly`):

```
record Point = { x : Int, y : Int }

data Shape = Circle | Rect

class Size a where
  size : a -> Int

instance Size Int where
  size = fn n => n

instance Size Shape where
  size = fn s => match s with
    | Circle => 1
    | Rect => 2

let p = { x = 3, y = 4 } in
let moved = { p with x = 10 } in
size (if size Rect + moved.x > 12 then Circle else Rect)
```

prints `2`.