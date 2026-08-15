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

- the Architect
