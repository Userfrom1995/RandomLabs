# Halcyon: a small functional programming language and VM in Haskell

## Summary

**Halcyon** is the factory's first compiler/language project and its first
Haskell build: a small, calm, well-typed functional programming language whose
entire machinery is visible. You write Halcyon source, the toolchain type
checks it with full Hindley-Milner inference (including `let` polymorphism,
closures, and a small numeric type-class/promotion system), and you run it two
ways: through a readable tree-walking interpreter and through a real stack
bytecode VM with closures and upvalue cells. A REPL and a statically-hostable
web playground (pure client-side, no backend) let you run and debug Halcyon
programs in the browser on GitHub Pages. The entire core - lexer, parser,
typechecker, interpreter, VM - is fully headless-testable, and the two
evaluators are cross-checked for byte-identical output, as is a faithful
JavaScript mirror of the language that powers the playground.

## Deliverables

- **Haskell project** in `halcyon/`: a Cabal package built with GHC
  (no runtime deps beyond the GHC boot libraries) exposing a `halcyon` CLI.
- **CLI commands** (all args/flags/stdin-driven, zero interactive prompts):
  - `halcyon repl` - read/eval/print loop (stdin-driven, scriptable).
  - `halcyon run <file>` - typecheck then tree-walk evaluate a `.hly` file.
  - `halcyon run-vm <file>` - typecheck then execute on the bytecode VM.
  - `halcyon check <file>` - typecheck only; print the inferred top-level types.
  - `halcyon compile <file>` - compile to bytecode; print the disassembly.
  - `halcyon selftest` - run the entire embedded test suite, non-zero exit on
    any failure.
- **The language core** (headless, no display): lexer, parser, AST, HM
  typechecker, tree-walking interpreter, bytecode compiler + VM, REPL.
- **Bytecode VM**: a stack machine with frames, upvalue cells for closures,
  and a deterministic disassembler; a VM trace mode for debugging.
- **Web playground** at `halcyon/index.html` (hosted on Pages): a pure
  client-side editor that lexes/parses/typechecks/runs Halcyon in the browser
  via a faithful JS mirror of the language core, with AST view, inferred-type
  view, bytecode disassembly, and a step-through VM debugger.
- **Docs**: `halcyon/README.md`, `halcyon/docs/` (index.html + index.md,
  language.md grammar/semantics, vm.md opcode reference), plus `ideas/` entry
  and `progress/` tracker. Root `index.html` and root `README.md` gain a
  Halcyon entry on completion.
- **Examples**: a handful of `halcyon/examples/*.hly` programs (fibonacci,
  higher-order `map`/`filter`, closures, list demos, numeric promotion).

## Why it fits

A brand-new language for the factory (Haskell - the first time) and a
completely untouched category (compilers/languages). Compilers are the
definitive "learn how the machine thinks" project, and Haskell is the language
compilers are made for: the type checker, evaluator, and VM are each a few
hundred readable lines that demystify how `map`, `let` polymorphism, and
closures actually work. The result is a real artifact: a working language you
can write programs in, plus a VM to run them, plus a browser playground. No
overlap with anything in `ideas/`.

## How it works

**Pipeline.** Halcyon source text flows through: lexer -> parser (AST) ->
HM typechecker (rejects ill-typed programs with positioned errors) -> one of
two evaluators: the tree-walking interpreter (direct AST evaluation) or the
bytecode compiler + stack VM (compile AST to a flat opcode program, then
execute it). A REPL runs the same pipeline interactively. The web playground
runs the identical pipeline in JavaScript.

**Language surface.** A small ML-flavored expression language: integer, float,
boolean, string and list literals; variables; `let <name> = <expr> in <expr>`
(recursive via `let rec`); anonymous functions `fn <x> => <expr>`; application;
binary operators (arithmetic `+ - * /`, comparison `< <= > >= == /=`,
boolean `&& || !`); `if <c> then <a> else <b>`; `cons`, `head`, `tail`,
`isNil` builtins for lists. Every expression is an expression - no statements,
pure-functional semantics, deterministic evaluation order.

**Type system.** Full Hindley-Milner inference (Algorithm W): fresh type
variables, unification, and generalization at `let` boundaries gives `let`
polymorphism (so `map` is usable at many types) and first-class function
types with closures. Two numeric types, `Int` and `Float`, with a small
promotion/type-class layer: a numeric operator applied to an `Int` and a
`Float` promotes to `Float`; an arithmetic expression is rejected only when
it is statically ill-typed. Type errors carry source positions and a readable
message. The checker is a separate pure module so `check`/`compile`/`run`
share one implementation.

**Two evaluators, one semantics.**
- *Tree-walking interpreter* (`Eval.hs`): evaluates the AST directly with
  environments (lexical scopes) and closure capture. Simple to read, the
  reference semantics.
- *Bytecode VM* (`Compile.hs` + `Vm.hs`): the compiler lowers the AST to a
  flat, deterministic instruction stream (loads/stores, apply, closures via
  upvalue cells, arithmetic, jumps, builtins, halt). The VM runs it with an
  operand stack plus a call-stack of frames; closures capture their free
  variables as mutable upvalue cells shared with the defining frame. A
  `--trace` mode prints each executed instruction with the stack state.
- *Cross-checking*: a test corpus of `.hly` programs is run through both the
  interpreter and the VM, and the outputs must match exactly. This is the
  project's strongest correctness guarantee.

**Web playground (pure client-side).** `halcyon/index.html` embeds a faithful
JS mirror of the language core (lexer/parser/typechecker/interpreter/compiler/
VM, ported by hand to plain JS, no deps) so every Halcyon program runs
entirely in the browser. The playground offers: an editor with the example
programs, a Run button (interpreter), a Run VM button, a typecheck button
showing inferred types, the AST as nested text, the bytecode disassembly, and
a single-step VM debugger with a visible stack/upvalue panel. Because the
mirror and the Haskell core are cross-checked against the same test corpus in
CI, the browser behavior is the verified behavior.

## Module breakdown (Haskell, in `halcyon/src/Halcyon/`)

| Module | Responsibility |
|---|---|
| `Token.hs` | Token type, source positions |
| `Lexer.hs` | Hand-written lexer: literals, names, operators, keywords, whitespace, comments; positioned lex errors |
| `Ast.hs` | Expression AST data types |
| `Parser.hs` | Recursive-descent parser with precedence climbing; AST; positioned parse errors |
| `Type.hs` | Type data type (TVar/TInt/TFloat/TBool/TStr/TList/TFun), type schemes, substitution |
| `Infer.hs` | Hindley-Milner inference: unification, generalization, `let` polymorphism, numeric promotion, error reporting |
| `Value.hs` | Runtime values: numbers, bools, strings, lists, closures, builtins |
| `Eval.hs` | Tree-walking interpreter |
| `Op.hs` | Bytecode opcodes + operand types |
| `Compile.hs` | AST -> flat bytecode, free-variable/closure analysis |
| `Vm.hs` | Stack VM: operand stack, frames, upvalue cells, tracing |
| `Repl.hs` | Read-eval-print loop over the shared pipeline |
| `CLI.hs` | Argument parsing + command dispatch (repl/run/run-vm/check/compile/selftest) |
| `Main.hs` | Entry point |
| `Test.hs` + `test/` | Embedded self-test suite (lexer, parser, typechecker, interpreter, VM, differential corpus) |

JS mirror mirrors these under `halcyon/js/` (single dependency-free
`halcyon.js` plus `index.html`).

## Test matrix

| Layer | What is exercised | How |
|---|---|---|
| Lexer | Tokens, positions, error cases (unterminated string, bad char) | unit tests |
| Parser | Precedence, associativity, all syntax forms, error recovery messages | unit tests |
| Typechecker | Principal types, `let` polymorphism (`map` at multiple types), numeric promotion (`1 + 2.5` = Float), ill-typed rejections with positions | unit tests |
| Interpreter | Values, closures, recursion (`let rec`), lists, builtins, pure evaluation order | unit tests |
| Compiler/VM | Every opcode, closures/upvalues (shared cell mutation), recursion, stack discipline, disassembly determinism | unit tests |
| Differential | Interpreter output == VM output across the whole `.hly` corpus | corpus test |
| Cross-language | JS mirror output == Haskell output across the same corpus | corpus test (node) |
| CLI | `repl` (piped stdin), `run`, `run-vm`, `check`, `compile`, error exit codes, `selftest` green | integration tests |
| Web | Playground loads, Run/Run VM/typecheck/AST/disassembly/step-debugger produce expected results | node scripted checks + documented manual spec |

**Determinism:** no randomness, no IO inside evaluation, fixed evaluation
order - identical input always produces identical output and identical
disassembly, verified by the differential corpus.

## Name origin

"Halcyon" - a calm, golden age; the name gestures at a small, peaceful,
well-typed language where the machinery is fully visible.

## Next-level evolution: Halcyon v2 - data types, pattern matching, tail calls

Dispatched by Mae (shipping-limit round, 2026-08-15): the merge is held until
the daily cap resets, so the Architect designs the next level of the language.
This evolves Halcyon from "a small expression language with lists" into a
proper ML-flavored language: user-defined algebraic data types, structural
pattern matching, and a tail-call-optimizing VM. Every feature is delivered
end-to-end across the whole stack (Haskell core, JS mirror, playground,
corpus, docs) so the existing differential guarantees hold.

### Milestone 13 - Algebraic data types

**Syntax (top-level `data` declarations).** A Halcyon program becomes
`dataDecl* expr EOF`; a bare expression (today's programs) is the zero-decl
case, so every existing example and corpus entry keeps working unchanged.

```
data Maybe a = Nothing | Just a
data Pair a b = Pair a b
data Tree a = Leaf | Node (Tree a) a (Tree a)
```

- `data <TypeName> <tyvar>* = ('|'? <Ctor> <fieldType>*)+` (constructor
  alternatives separated by `|`, optional leading `|`).
- Constructor and type names are capitalized (parser-enforced); type
  variables are lowercase identifiers.
- Field types use a small type-expression grammar: `Int` `Float` `Bool`
  `String`, list `[T]`, type variables, data-type application `Tree a`,
  function types `A -> B`, parenthesized types. Add a type-expression parser
  producing `Halcyon.Type.Type`.
- New lexer token: `data` keyword; standalone `|` pipe token (disambiguated
  from `||`).

**Type system.**
- `Type` gains `TData String [Type]` (data type name + applied arguments).
- A data environment maps type name -> constructors and constructor name ->
  a polymorphic scheme: `Just : forall a. a -> Maybe a`,
  `Nothing : forall a. Maybe a`, `Pair : forall a b. a -> b -> Pair a b`.
- Unification: `TData n as` with `TData n bs` unifies arguments pointwise;
  names must match. Constructor names are globally unique within a program
  (enforced at parse time). `let` polymorphism already generalizes the
  constructor schemes.

**Values / interpreter.**
- New `Value` forms: `VData String [Value]` (constructor name + fields) and
  `VConstr String Int [Value]` (constructor name, total arity, accumulated
  arguments), mirroring `VPartial`.
- Constructors are first-class curried values: `Just` alone is a function;
  `Just 5` is `VData "Just" [VInt 5]`; partial `Just x` behaves exactly like
  the curried builtins.
- `showValue` renders in application style without parens: `Just 5`,
  `Nothing`, `Pair 1 2`.

**VM.**
- Constant pool gains `CData String Int` (constructor name + arity) and an
  instruction `MakeData Int` that pops `arity` values and pushes `VData`.
- `VmVal` gains the two value forms above; curried partial application of a
  constructor works arity-driven like `VmPartialBuiltin`.

**Tests.** New selftests for the type grammar, constructor schemes,
unification, data-value evaluation, VM construction, and a differential
corpus entry using `Maybe`/`Pair`. The existing 166 tests must stay green.

### Milestone 14 - Pattern matching

**Syntax.** `match` is the new expression form.

```
match e with
| Nothing => 0
| Just x  => x
```

- `match <expr> with (<'|'>? <pat> '=>' <expr>)+` (ordered branches, optional
  leading `|` on the first).
- New tokens: `match` and `with` keywords; `_` wildcard; `::` cons pattern.
- Patterns: `_`; variable `x`; literals (`42`, `3.14`, `true`, `false`,
  `"str"`); `[]`; `x :: xs` cons patterns and `[a, b]` list patterns;
  constructor patterns `Just x`, `Nothing`, `Pair a b`; arbitrary nesting.
- New `Pattern` AST type; `EMatch Pos Expr [(Pattern, Expr)]` (scrutinee
  evaluated once, ordered branch list).

**Inference.** Each branch's pattern is checked against the scrutinee type:
variable patterns bind monomorphically inside the branch; constructor
patterns check the constructor's scheme; list patterns unify with `[T]`;
literal patterns unify with their literal type. All branch bodies unify to a
single result type. Non-exhaustive matches are allowed and raise a positioned
runtime error (`no matching pattern`); a trailing `_` wildcard is the
documented idiom for exhaustive handling.

**Interpreter.** `matchValue :: Value -> Pattern -> Maybe [(String, Value)]`;
evaluate the scrutinee once, walk branches in order, first match binds and
evaluates its body.

**Compiler / VM.** Compile `match` to a deterministic test chain: evaluate the
scrutinee once into a local, then per branch emit pattern-test code (push the
value, test, on success bind variables into locals and jump to the branch
body, on failure jump to the next branch), ending in an error path. The
Builder picks the exact instruction encoding (e.g. `TestNil`, `TestCons`,
`TestConstr idx`, literal `TestEq` with a constant) but must keep
disassembly deterministic, extend `showInstr`, the VM loop, the JS mirror,
and the playground step-debugger together, and add differential tests.

**Differential.** Corpus grows with `match` programs (`Maybe` handling, tree
functions, list recursion via `x :: xs`); interpreter output == VM output ==
JS output on all of them.

### Milestone 15 - Tail call optimization + deterministic optimizer pass

**TCO in the VM.** A `Call` in tail position (its result is immediately the
enclosing function's result) compiles to a new `TailCall` instruction: the VM
applies the argument and reuses the current frame instead of pushing a new
one, so `let rec loop = fn n => if n == 0 then 0 else loop (n - 1)` runs in
constant stack. The compiler detects tail positions (function body tail, both
`if` branches, every `match` branch body). Semantics are identical to `Call`
(curried, one argument at a time; partial application and closures unchanged).

**Deterministic optimizer pass.** A new `Halcyon.Optimize` module runs a
constant-folding + dead-store-elimination pass over a compiled `Program`:
`PushConst 1; PushConst 2; Add` folds to `PushConst 3`; stores to locals never
read are dropped; `Jump` to the next instruction is removed. The pass is
total and semantics-preserving (never folds a division by zero). `halcyon
compile --opt` prints the optimized disassembly and `halcyon run-vm --opt`
runs it; the differential corpus is re-verified with and without `--opt` so
the optimizer provably changes nothing observable.

**Tests.** The corpus gains a constant-space tail-recursive program (1M
steps) that must run in bounded stack on the VM; differential tests run the
full corpus twice (optimized vs not) and assert byte-identical output plus
deterministic disassembly.

### Milestone 16 - JS mirror, playground, self-hosted stdlib, docs, polish

**JS mirror + playground.** Port `data`/constructors/`match`/TCO/`--opt` to
`js/halcyon.js` (values, pattern matching, `MakeData` and match opcodes, tail
call loop, optimizer); extend `js/corpus-check.js` with the new corpus
entries. `halcyon/index.html`: add data-declaration and `match` example
programs, render `VData` values, and make the step-through VM debugger handle
the new instructions (marking frame reuse when TCO fires).

**Self-hosted standard library.** With pattern matching and recursion now in
the language, deliver a Halcyon-written stdlib (`halcyon/stdlib.hly`)
defining `map`, `filter`, `foldl`, `foldr`, `zip`, `sum`, `product`, `range`,
`compose`, `flip`, `id` using `match` over lists - the strongest proof the
language is expressive. Wire it into the corpus (stdlib-defined programs run
on all three evaluators) and into `examples/`; document it.

**Docs + polish.** `docs/language.md`: data declarations, pattern matching,
new tokens, TCO, stdlib. `docs/vm.md`: `MakeData`, match opcodes, `TailCall`,
the optimizer pass. `docs/index.md`/`docs/index.html`, `README.md`, and the
root `index.html` updated. Final pass: `make test`, `make smoke`,
`cabal test`, `node js/corpus-check.js examples` all green, exit codes 0/1/2,
clean tree, `Status: complete`.

## Next-level evolution: Halcyon v3 - modules, records, type classes, strings

Dispatched by Mae (second shipping-limit round, 2026-08-15): the merge is
again held by the daily cap (2/2 on Aug 15; cap resets 00:00Z Aug 16), and
per the owner's playbook the Architect designs the next level instead of a
Fixer round. v2 made Halcyon a proper ML-flavored language (ADTs, structural
pattern matching, TCO, a deterministic optimizer, a self-hosted stdlib). v3
evolves it from "a language you write one expression in" into "a language you
write real programs in": **top-level definitions and a module system**, so
programs become sequences of bindings and can import a growing standard
library; **record types**, the classic named-field data-modeling feature that
complements ADTs; **type classes with dictionary passing**, the defining
feature of the Haskell family, giving overloaded methods with principal
typing; **Char and string operations**, filling the last data-type gap; and a
**VM profiler plus optimizer expansion**, giving observable performance
instrumentation and stronger dead-code elimination. Every milestone lands
end-to-end (Haskell core, JS mirror, playground, differential corpus, docs)
so the existing byte-identical guarantees hold across all three evaluators.

### Milestone 17 - Top-level definitions and a module system

**Top-level definitions.** A Halcyon program currently is `dataDecl* expr`,
forcing every binding into one giant nested `let ... in`. v3 generalizes the
program grammar to a sequence of top-level definitions followed by an
optional final expression:

```
program  := decl* expr
decl     := dataDecl | recordDecl | classDecl | instanceDecl
          | 'let' name '=' expr          -- non-recursive top-level binding
          | 'let' 'rec' name '=' expr    -- recursive top-level binding
```

The final `expr` may be absent when the last `let` defines a function (the
program then has no printed result; useful for libraries). Each top-level
binding generalizes like a `let` (schemes, polymorphic), is visible to every
later definition and the final expression, and must be used consistently.
Ambiguity rule for the parser: after parsing `let <name> = <bindingExpr>`, a
following `in` token means it was an expression (the existing form); any other
next token (a definition keyword or EOF) means it was a top-level definition.
Every existing program (a single `let ... in ...` expression) parses
unchanged, so the 29-program corpus is untouched.

**Module system.** New `import` declaration at the top of a file:

```
import "lib/list.hly"
import "lib/maybe.hly"
```

`import "..."` resolves the path (relative to the current file when it is a
file, else relative to the lib directory given by `--lib <dir>`, defaulting to
`halcyon/lib/`), lexes, parses, and merges the imported file's top-level
definitions into the importing program's data/record/class/instance
environments and the type/value environments. Imports are transitive and
order-independent; a definition name imported twice (or colliding with a local
definition) is a positioned error. A `.hly` file that contains only
definitions (no final expression) is a valid *module*; importing one runs no
code. The CLI gains `--lib <dir>` on the file commands and `run`/`run-vm`/
`check`/`compile` all resolve imports. The self-hosted stdlib
(`examples/stdlib.hly`) is split into real importable modules under
`halcyon/lib/` (e.g. `list.hly`, `maybe.hly`, `pair.hly`, `compose.hly`) and
rewritten with top-level `let rec` definitions instead of nested `let ... in`
chains; `examples/stdlib.hly` becomes a thin `import`-based demo.

**Interpreter / compiler / VM.** The tree-walking interpreter threads one
environment: evaluate definitions in order, bind each name, then evaluate the
final expression (nothing printed when there is none). The compiler lowers
the definition list to the entry function by emitting each binding as
`NewCell`+`StoreLocal` (or `MakeClosure` for `let rec`) into the entry frame's
cell space and then compiling the final expression; the REPL and `eval` treat
a definitions-only program as type-check-and-reject-with-no-result instead of
a runtime error.

**Tests.** New selftests: top-level generalization (a top-level polymorphic
function used at two types), definition ordering, duplicate-name errors,
import resolution, transitive imports, module-with-no-expression, and the
rewritten stdlib still yielding the pinned result. The differential corpus
grows with multi-definition programs and an import-based program, all
verified byte-identical across interpreter, VM, and (after M18's JS sync) the
JS mirror. `make test`, `make smoke`, `make smoke --opt` green.

### Milestone 18 - Record types (named fields)

**Syntax.** The classic named-field data type, complementing positional ADTs:

```
record Point = { x : Int, y : Int }
{ x = 1, y = 2 }          -- construction
p.x                        -- projection
{ p with x = 3 }           -- functional update (new record, p unchanged)
```

- `record <Name> <tyvar>* = { <field> : <type> , ... }` with the existing
  field-type grammar (primitives, `[T]`, type variables, data-type
  application, parenthesized, function types).
- A record literal `{ f1 = e1, ..., fn = en }` requires every declared field,
  in any order, and resolves its type by the *globally unique field set*
  (the parser/environment rejects two records sharing a field name set, like
  the existing global-uniqueness rule for constructors). If no declared
  record has exactly that field set, it is a positioned type error.
- Projection `e.f` selects field `f`; `f` must exist in the record's declared
  field set. Functional update `{ e with f = e' }` returns a new record with
  exactly field `f` replaced; `with` is already a keyword (match syntax), so
  no new keyword is needed.
- Record patterns in `match`: `| { x = a, y = b } => ...` binds `a`, `b` to
  the field values; the pattern's field set must equal the scrutinee record's
  declared set (a `_` or a record pattern with all fields is the exhaustive
  idiom).

**Lexer / parser / AST.** New tokens `{`, `}`, `.`. Lexer care: `{-` still
starts a block comment; a bare `{` becomes the record-open token, `}` the
record-close token, `.` the dot token (no other operator uses `.`). Parser:
`record` declarations, record literals, projection as a postfix at
application precedence, functional update via the existing `with` token
disambiguated from `match ... with`, record patterns in the pattern grammar.
AST: `DataDecl` gains a sibling `RecordDecl` (name, tyvars, fields); `Expr`
gains `ERecord`, `EProj`, `EUpdate`; `Pattern` gains `PRecord`.

**Type system.** `Type` gains `TRec String [Type]` (nominal, like `TData`),
with a new `Halcyon.Record` environment mirroring `Halcyon.Data`: record
name -> field list with polymorphic field types (fields may depend on the
record's type parameters, e.g. `record Pair a b = { fst : a, snd : b }`).
Unification on `TRec` compares name + applied arguments pointwise. Record
literal inference: collect the field names, find the unique declared record
with that field set, unify each literal field's inferred type with the
declared field type (instantiating the record's scheme). Projection: unify
the scrutinee's type with `TRec n args` where `n` declares field `f`, return
the field's instantiated type. Update: unify scrutinee and the replacement
with the record type; result type is the record type.

**Values / interpreter.** `Value` gains `VRec String [(String, Value)]`
(record name + ordered declared fields). `showValue` renders `{ x = 1, y = 2 }`
with the field values in declared order. Interpreter: literal evaluation,
projection (lookup by field name with a positioned "no such field" error),
functional update (rebuild the field list), record pattern matching in
`matchValue` (compare names, then match each field's sub-pattern).

**Compiler / VM.** Constant pool gains `CRec String [String]` (record name +
field names in declared order). Opcodes: `MakeRecord Int` (pop the declared
number of field values, push `VmRec`), `GetField Int` (field index), and
`UpdateField Int` (pop the replacement, pop the record, push the rebuilt
record). Projection compiles to `PushLocal/PushUpvalue/PushConst` for the
scrutinee then `GetField`; update compiles scrutinee, push replacement,
`UpdateField`. Records participate in equality (deep structural comparison on
both evaluators), and the differential corpus and optimizer are extended for
records (record constant folding is a no-op only for literal-symmetric cases;
field projection of a literal can fold to the field value).

**Tests.** Selftests for construction/order-independence, projection, update
immutability, record types and unification (incl. polymorphic records),
record patterns in match, duplicate-field-set errors, missing-field errors,
projection type errors; 4+ new differential corpus programs (point math, a
`Pair` record, a nested record, record-with-list). JS mirror, playground AST
renderer, and docs (`language.md` record section, `vm.md` opcode table) follow
in M21's sync milestone; corpus-check keeps the JS mirror honest until then.

### Milestone 19 - Type classes with dictionary passing

**Syntax.** The Haskell-family defining feature: overloaded methods with
principal typing, implemented by dictionary passing.

```
class Show a where
  show : a -> String

instance Show Int where
  show = fn x => intToStr x

instance Show a => Show [a] where
  show = fn xs => "[" ++ joinWith ", " (map show xs) ++ "]"
```

- `class <Name> <tyvar> where <method> : <type>`: one or more method
  signatures. Method signatures are function types mentioning the class type
  variable at least once.
- `instance <Name> <head> where <method> = <expr>`: `<head>` is a closed type
  (a primitive, a data/record type applied to type variables, a list type).
  Instance contexts `instance Ctx => Name T` are allowed with a single
  `ClassName tyvar` constraint. Instance heads must be unique per class
  (deterministic resolution; the checker rejects overlapping heads).
- Method references are first-class values; inside `instance` bodies the
  method's own name is *not* recursively re-dispatched (the implementation
  expression is used directly), but other class methods and all top-level
  definitions are in scope.

**Type system.** `Scheme` gains a constraint context `[(String, Type)]` (class
name + type argument). New `Halcyon.Classes` module builds the class
environment: class name -> methods with polymorphic types over the class
variable; instance name -> dictionary schema (head type, method
implementations, instance context). Inference changes:

- Referencing a class method `m` instantiates its scheme and emits a
  constraint `(Class, t)` where `t` unifies with the method's argument type
  (e.g. `show x` with `x : Int` emits `(Show, Int)`).
- Constraints on variables that stay free in a `let`/top-level binding are
  generalized into the binding's scheme context (so `let f = fn x => show x`
  gets scheme `forall a. Show a => a -> String`).
- After inference, constraints with fully resolved (concrete or
  type-constructor) types are solved against the instance environment by
  head-type unification (with recursive context resolution for instance
  contexts, depth-bounded). An unsolved non-variable constraint is a
  positioned type error: `no instance for Show (Pair Int Int)`.

**Dictionaries.** For each instance, the compiler/interpreter builds a
dictionary: a record-like value mapping method name -> method closure for
that instance (`VDict`/`VmDict`). A method call compiles to: push the
resolved instance's dictionary, `DictGet <methodIndex>`, then apply the
resulting closure to the arguments. A *constrained polymorphic function*
(e.g. `let f = fn x => show x`, scheme `forall a. Show a => a -> String`)
takes the dictionary as an extra leading argument: its closure captures the
dictionary, and every `show` inside it indexes that captured dictionary. A
call site whose argument type is concrete passes the concrete instance's
dictionary; a call site inside another constrained function re-threads the
in-scope dictionary. This is the standard dictionary-passing translation,
done deterministically and verified by the differential corpus.

**Builtins.** `intToStr`, `floatToStr`, `boolToStr`, `strToStr` (identity),
`listToStr` (renders `[...]`), and `concat`/`joinWith` string helpers (from
M20's string work where applicable) give instance bodies something to call;
the Show instances for the primitives are provided automatically as
built-in instances so `show` works out of the box on `Int`, `Float`, `Bool`,
`String`, lists, and user data/record types (whose instances users define).

**Tests.** New selftest group: constraint generation and generalization,
instance head resolution, context recursion (`Show a => Show [a]`), overlap
rejection, dictionary correctness in the interpreter, and VM
(dictionary-indexed method calls through polymorphic functions and at
concrete call sites), plus differential tests proving interpreter output ==
VM output for class-using programs. The self-hosted stdlib gains a `Show`
class with instances for the `lib/` data types (Maybe, Pair) and a demo
`show`-based `toStr`. JS mirror and corpus-check sync happens in M21.

### Milestone 20 - Char type and string operations

**Char.** New primitive type `Char` with single-quoted literals `'a'`, `'\n'`
(escape set matching the string escapes). Lexer rule: a `'` followed by a
single character (or escape) and a closing `'` is a char literal; a `'` inside
an identifier (`x'`) remains an identifier character, matching Haskell's
convention. `Type` gains `TChar`; `Value` gains `VChar`; show renders `'a'`.
Char participates in equality and (no ordering operators yet, documented as a
future step). Char in patterns: `match c with | 'a' => ...`.

**String operations.** Builtins `strLen : String -> Int`, `charAt : String ->
Int -> Char`, `substr : String -> Int -> Int -> String`, `strAppend : String
-> String -> String`, `strContains : String -> String -> Bool`, and `str :
a -> String` (canonical `showValue` as a string, the same rendering the CLI
prints, so `str` is the observable-reflection escape hatch). All are
first-class and curried like the existing builtins, present in the
interpreter, the VM (with `VmPartialBuiltin` arity handling), and the JS
mirror. `intToStr`/`floatToStr`/`boolToStr` (from M19) are aliases layered on
`str` where the type allows.

**Self-hosted stdlib growth.** `halcyon/lib/` gains `string.hly`
(`strLen`, `charAt`, `substr`, `split` by a separator implemented over the
builtins, `joinWith`, `toUpper`/`toLower` via char comparisons), `list.hly`
expands with `zipWith`, `flatten`, `last`, `init`, `takeWhile`, `dropWhile`,
`any`/`all` (already present) and `show`-based formatting helpers, and
`maybe.hly` expands with `fromMaybe`, `mapMaybe`, `catMaybes`. Every stdlib
function is exercised by a pinned example and a corpus entry.

**Tests.** Lexer/parser char tests, type tests (TChar in unification, `str`
polymorphism), eval + VM string-op tests, differential tests across all new
ops, and a corpus program printing a formatted table built purely from
strings and records. `make test`, `make smoke`, `cabal test` green.

### Milestone 21 - VM profiler, optimizer expansion, JS sync, playground, docs, polish

**VM profiler.** New `halcyon run-vm --profile <file>` mode. The VM counts,
per run: total instructions executed, per-opcode counts, per-function call
counts (by `fName`), peak operand-stack depth, and peak frame depth. Output
is a deterministic, sorted report to stdout (or stderr) with a `--stats`
sibling flag that prints only the summary line. Profiling adds no observable
behavior change (output of `run-vm` with and without `--profile` is
identical). The corpus's optimizer differential is re-verified under
profiling. JS mirror gains a matching `countOps`-style hook used by the
playground's new stats panel.

**Optimizer expansion.** `Halcyon.Optimize` gains two total,
semantics-preserving passes: **dead-code elimination** (remove unreachable
instruction blocks behind unconditional jumps, and drop the trailing
`Jump`/`Halt` dead paths), and **copy/constant propagation through locals**
(a `store_local` of a `push_const` followed by a single `push_local` read of
that slot folds to a direct `push_const`, removing the store; a `store_local`
feeding only `push_local` and never re-stored is a pure copy, resolved to the
source slot). Both passes keep the existing fixpoint coordinate discipline so
jump targets stay correct; every corpus program is re-verified byte-identical
with and without `--opt`, and `make smoke --opt` and the opt-corpus cover the
new rules.

**JS mirror + playground sync (records, modules, classes, chars, strings,
profiler).** Port to `js/halcyon.js`: top-level definitions and import
resolution (a bundled module map for the `lib/` files so the browser needs no
network), record types/literals/projection/update and record patterns, the
type-class checker (constraints, instance resolution) and dictionary passing
in both the CPS interpreter and `makeVm`, Char + string ops, and the
`countOps` profiler hook. `js/corpus-check.js` grows to run the full expanded
corpus (now ~40 programs) plus feature checks for every v3 addition, keeping
JS == Haskell byte-identical. Playground (`halcyon/index.html`): the editor's
example selector gains the new `lib/`-based examples, record/class/string
samples, a stats panel showing instruction/frame counts from the profiler
hook, and the AST renderer shows `record`, `class`/`instance`, top-level `let`,
record literals/projection/update, char literals, and string-op call nodes.

**Docs + polish.** `docs/language.md`: top-level definitions, imports, records,
type classes (constraints, instances, dictionaries), Char, string builtins,
updated grammar and precedence. `docs/vm.md`: `MakeRecord`/`GetField`/
`UpdateField`/`DictGet`, import lowering, profiler report format, new
optimizer rules. `docs/index.md`/`docs/index.html`, `README.md`, and the root
pages updated with the v3 feature list and correct test/corpus counts. Final
pass: `make test`, `make smoke`, `make smoke --opt`, `cabal test`,
`node js/corpus-check.js examples` all green, exit codes 0/1/2, clean tree,
`Status: complete`, decision file written.

## Next-level evolution: Halcyon v4 - effects, operators, prelude, bytecode

Dispatched by Mae (third shipping-limit round, 2026-08-15): the merge is again
held by the daily cap (2/2 on Aug 15; cap resets 00:00Z Aug 16), and per the
owner's playbook the Architect designs the next level instead of a Fixer
round. v3 made Halcyon "a language you write real programs in" with modules,
records, type classes, and strings. v4 makes it "a language whose programs can
*do* things": an **effect system** (`Effect a` type, `do` notation, `print`/
`readLine` builtins, `main`-style effectful entries), **user-defined operators
and type synonyms** (the two most-requested language-ergonomics features),
an **auto-imported standard prelude**, a **serialized bytecode artifact
format** (`compile -o out.hbc` + `run out.hbc`, no re-parse at load), and a
**benchmark harness** (`bench` comparing interpreter, VM, and optimized VM by
deterministic profiler instruction counts). The final milestone syncs the JS
mirror, playground, docs, and root pages and polishes everything. The
differential guarantee (interpreter output == VM output == JS output, both
plain and `--opt`) continues to gate every milestone.

### Milestone 22 - Effect system (programs that print and read)

**The gap.** Today every Halcyon program is pure: the only observable output
is the printed value of the final expression. There is no way to print from
inside a function, read input, or sequence operations. v4's headline is a
small, deterministic, purely-functional effect system in the ML/Haskell mold.

**Type and values.** New primitive type `TUnit` (rendered `Unit`) with the
literal `()` and value `VUnit` (rendered `()`, mirroring the interpreter and
JS). New type constructor `TEffect t` (rendered `Effect t`). The free-variable
rules and `showType` gain the two constructors; unification treats `TEffect`
like any other type constructor (invariant in its argument).

**Grammar.**

```
expr ::= ... | 'do' '{' stmt+ '}' | '(' ')'           -- () is VUnit
stmt  ::= 'let' name '=' expr ';'                     -- local, non-recursive
        | name '<-' expr ';'                          -- bind
        | expr ';'                                    -- sequence, discard result
```

`do { ... }` desugars in the parser to a chain of `bind` applications over
first-class effect builtins (see below), so the type checker, evaluators, and
VM need only the builtins, exactly like `cons`/`append`. The trailing
statement is the final effect value; `x <- e` binds within the rest; a bare
`expr ;` sequences with a discarded unit continuation. Rules: the block must
end in an expression (not a `<-` bind), and the whole block must have a single
`Effect t` type.

**Builtins (curried, first-class, in `Ast.Builtin`).**

- `return : a -> Effect a` - the unit of the monad.
- `bind : Effect a -> (a -> Effect b) -> Effect b` - sequencing.
- `print : a -> Effect Unit` - writes `showValue a` to stdout, no newline.
- `printLine : a -> Effect Unit` - writes `showValue a` plus a newline.
- `readLine : Effect String` - reads one line from stdin (a scripted,
  piped stream; the program never opens an interactive prompt).

**Representation.** Effects are *data*, not control flow. `Value` gains
`VEffect String [Value]` (tagged effect action; the builtin `print "hi"`
evaluates to `VEffect "print" [VStr "hi", VEffect "return" [VUnit]]`), and the
tree-walking interpreter's `bind`/`return`/`print`/`printLine`/`readLine`
cases build these values. A single pure driver
`runEffect :: Value -> Either EvalError String` interprets the tree in
deterministic order: `print`/`printLine` append to an output accumulator,
`readLine` draws from a supplied input list (consumed in order; running out is
a positioned runtime error), `bind` threads the accumulator through its left
effect then applies the continuation closure, `return` yields the value and
the accumulated output. The CLI feeds `getContents`-style scripted stdin as
the input list, so effect programs are fully scriptable and deterministic
(the existing REPL already reads stdin with `getLine`/`isEOF`; no interactive
prompts anywhere).

**Program entry.** When the inferred type of the program's final expression is
`Effect t`, `run`/`run-vm`/`eval` execute the effect (writing the output
stream) and then print the resulting `t` value (nothing when `t` is `Unit`);
when the final type is not an effect, behavior is exactly as today, so every
existing program and every pinned corpus entry is unchanged. A
definitions-only module stays no-output. The REPL runs a typed effect line the
same way.

**VM.** `Op.Const` gains nothing new (effects are built from the builtin
primitives), so the compiler needs only the existing `Call`/`TailCall`
machinery plus the five new builtin names in `builtinForName`/the VM builtin
table; the VM builds the same `VEffect` values and a
`runVmEffect` (mirroring `runEffect`) executes them, byte-identical to the
interpreter. No new opcodes, which keeps the optimizer's fixpoint rules,
disassembler, and profiler unchanged.

**JS mirror.** The five builtins and `VEffect`/`runEffect` port 1:1. The JS
`readLine` draws from a scripted input array (the playground supplies an input
box), never `prompt()`, keeping the no-interactive-input gate clean.

**Tests + corpus.** New selftest group: `()` literal typing, `do`-block
desugaring shapes, `return`/`bind` laws on small examples, `print`/
`printLine` output accumulation, `readLine` consuming a scripted input list,
exhausted-input error, effect-final-type vs pure-final-type program dispatch,
and differential tests (interpreter effect output == VM effect output). New
pinned corpus entries: a print loop, a read-then-echo program, a
do-block with local `let`, and a line-count program reading stdin. `make
test`, `make smoke` (piped stdin to an effect program), `cabal test` green.

### Milestone 23 - User-defined operators and type synonyms

**Operators.** Top-level declarations register an operator with the parser's
precedence table (levels 0-9; the built-in operators occupy 1-6):

```
infixl 3 <op>      -- left-associative at level N
infixr 6 <op>      -- right-associative at level N
infix  4 <op>      -- non-associative at level N
let (<op>) = fn a b => ...   -- define the operator's function
```

The lexer gains a rule for operator names: a maximal run of the symbol
characters `+ - * / < > = ! & | : .` (excluding comment/arrow/cons prefixes,
which keep their existing tokens) lexes as a `TOpName String` token. The
parser keeps a dynamic operator table: `infixl`/`infixr`/`infix`
declarations (collected with the other top-level defs before the final
expression parses) register name -> (level, assoc); precedence climbing then
parses `a <op> b` by looking up the table, and `(<op>)` parses as a parenthesized
operator reference (a first-class function). An operator used before it is
registered is a positioned parse error. Overriding the built-in symbol for a
built-in op (`+`, `*`, ...) is rejected; all other symbols are free. The
existing built-in operators keep their fixed table, so every current program
parses unchanged.

**Type synonyms.** Top-level `type <Name> <tyvar>* = <type>` declarations add
abbreviations (e.g. `type Pair a b = (a, b)` style records already exist, so
synonyms target concrete shapes like `type Dict = [String]`). Synonyms are
expanded at parse time into the existing `Type` constructors (no new `Type`
constructor, no inference change, no runtime cost); a synonym name may not
collide with a `data`/`record`/class name, and recursion/forward references
are rejected with positioned errors. `showType` renders the expanded form.

**Tests + corpus.** Lexer operator-name cases (longest-run, comment/arrow
interaction), parser precedence/associativity trees for user ops, operator
usage as a function reference, registration-before-use errors, synonym
expansion and name-collision errors, and differential corpus entries using a
user-defined operator and a synonym (byte-identical across interpreter, VM,
and `--opt`). `make test`, `make smoke` green.

### Milestone 24 - Auto-imported standard prelude and REPL enhancements

**Prelude.** A new `halcyon/lib/prelude.hly` is auto-imported ahead of every
user program by the module resolver (a synthetic first import that the
`diskProvider`/`memProvider` chain resolves; an explicit `import
"lib/prelude.hly"` is a harmless dedup). The prelude provides, written in
Halcyon itself and typechecked like any module: `id`, `const`, `flip`,
`compose`/`then`, `map`/`filter`/`foldl`/`foldr`/`zip`/`range`/`sum`/
`product` (re-exported or defined), `show` via the `Show` class, `when`/
`forever`/`seq_` effect combinators from M22, and the common list/string
helpers. The prelude is shadowable: a user top-level `let` or imported module
with the same name wins (documented, with a selftest proving shadowing). Every
prelude function is exercised by a corpus entry or an example, and the JS
mirror bundles it in its module map so the playground sees it too.

**REPL enhancements.** The REPL gains colon commands (all non-interactive,
stdin-driven): `:type <expr>` prints the inferred scheme, `:disasm <expr>`
prints the bytecode disassembly, `:opt <expr>` prints the optimized
disassembly, `:import "mod"` resolves and merges a module into the session,
and `:help`. Effect-typed expressions run as in `run`.

**Tests + corpus.** Prelude resolution order (prelude before user defs, user
defs shadow), prelude functions on the CLI (`eval`, `run`, `repl`), corpus
entries exercising `map`/`filter`/`foldl`/`seq_`/`when`, REPL `:type`/
`:disasm`/`:import` smoke entries, JS corpus-check including prelude examples.
`make test`, `make smoke` green.

### Milestone 25 - Serialized bytecode artifact and benchmark harness

**Bytecode format.** `halcyon compile -o out.hbc file.hly` writes a
deterministic, versioned artifact: a magic header (`HALCYONBC1`), the entry
`Func` (name, params, opcode list with constant indices), the recursively
nested function pool, the constant pool (values, data/record/field/method
constants by rendered form, functions by their sub-serialization), the dict
table, and the ctor map. The encoding is a stable, line-oriented text form
(no floats-as-text ambiguity: reuses the canonical `showValue` rendering that
already makes output byte-deterministic). `halcyon run out.hbc` (and
`run-vm out.hbc` / `run-vm --opt out.hbc`) detects the `.hbc` extension, loads
the artifact, rebuilds the `Op.Program` (no lex/parse/typecheck: the artifact
was produced from an already-typechecked program), and runs it on the VM;
`--opt` runs the loaded program through the existing optimizer (which operates
on the `Op.Program` structure, so it works unchanged). A round-trip selftest
serializes, loads, and re-runs every corpus program asserting byte-identical
output; a header/version mismatch or truncation is a positioned-ish IO error
with exit code 1.

**Benchmark harness.** `halcyon bench <file>` runs the program on the
interpreter, the VM, and the optimized VM, reporting deterministic metrics:
for each evaluator, total instructions executed and per-opcode top counts
(reusing the profiler machinery from v3, which already yields deterministic
counts) plus elapsed wall time (informational). `bench` exits 0 and prints a
stable report layout; a `--n N` repeats flag is optional. The smoke target
runs `bench` on `fib.hly` and greps the report.

**Tests + corpus.** Serialize/load/run round-trips for every corpus program
(both plain and `--opt`), corrupt-header and truncated-file errors, `.hbc`
dispatch in `run`/`run-vm`, and `bench` report shape. `make test`, `make
smoke` green.

### Milestone 26 - JS mirror, playground, docs, root pages, polish

**JS mirror.** Port to `js/halcyon.js`: the `Effect` type and the five effect
builtins with `VEffect`/`runEffect` (scripted input array, no `prompt()`),
`()` literal, user-defined operators (lexer `TOpName`, dynamic precedence
table, parenthesized operator references), type synonyms (parse-time
expansion), the auto-imported prelude in the bundled module map, and a
bytecode serializer/loader so `compile`-style artifacts can be produced and
loaded in the browser. `js/corpus-check.js` grows to cover every v4 feature
(effect programs with scripted input, operator/synonym programs, prelude
programs, and a bytecode round-trip), keeping JS == Haskell byte-identical.

**Playground.** `halcyon/index.html`: an Input/Output panel for effect programs
(scripted stdin box + stdout area, wired to `runEffect`), the prelude in the
example selector, operator-aware AST/type rendering, a type-synonym panel, a
Bytecode Artifact tab producing/downloading `.hbc` text, and the existing
tabs kept intact.

**Docs + polish.** `docs/language.md`: `Effect`/`do`/`()`, the five effect
builtins with exact signatures, operator declarations and precedence, type
synonyms, the auto-imported prelude, `bench`, `.hbc` usage, and the new REPL
commands. `docs/vm.md`: effect builtins (no new opcodes), the bytecode format,
`bench` report layout. `docs/index.md`/`docs/index.html`, `README.md`, and the
root `index.html`/`README.md` updated with the v4 feature list and the correct
test/corpus counts (Halcyon stays the Current Project/Live now entry). Final
pass: `make test`, `make smoke`, `make smoke --opt`, `cabal test`,
`node js/corpus-check.js examples` all green, exit codes 0/1/2, clean tree,
`Status: complete`, decision file written.

- the Architect
