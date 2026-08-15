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

- the Architect
