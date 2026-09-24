# Halcyon

A small functional programming language with Hindley-Milner type inference
and a bytecode VM, written from scratch in Haskell with zero external
dependencies, and mirrored one-to-one in plain JavaScript so the whole
language runs in a static web page.

The pipeline is `lex` -> `parse` -> `infer` -> `eval`, or `lex` -> `parse`
-> `compile` -> `vm`. Two Haskell evaluators (tree-walking interpreter and
stack VM) and one JavaScript mirror all agree byte-for-byte, proven by a
differential corpus.

## Features

- Hand-written lexer and recursive-descent parser with exact `line:col`
  error positions.
- Full Hindley-Milner type inference (Algorithm W): `Int`, `Float`, `Bool`,
  `String`, `Char`, lists, functions, `let`-polymorphism, `let rec`,
  numeric Int/Float promotion, and readable error messages like
  `cannot unify Bool with Int`.
- User-defined algebraic data types and pattern matching: `data Maybe a =
  Nothing | Just a` plus `match` with literal, wildcard, variable, list,
  cons, record, and nested constructor patterns.
- Nominal records: `record Point = { x : Int, y : Int }`, immutable field
  projection (`p.x`) and functional update (`{ p with x = 5 }`), and
  record patterns.
- Type classes with dictionaries: `class`/`instance`, method dispatch at
  runtime, and contextual instances like `instance Show a => Show (Maybe a)`.
- A builtin `Show` class with instances for every base type, lists, and
  data types, plus char and string literals and a full string builtin set.
- Effects and `do` blocks: `return`, `print`, `printLine`, and `readLine`
  desugar onto `return`/`bind`, so input-driven programs run identically
  on both evaluators (scripted stdin in the CLI and playground).
- User-defined operators: `infixl`/`infixr`/`infix` declarations register
  operators in a dynamic precedence table (levels 0-9), with
  parenthesized references like `let pick = (<->)`.
- Parse-time type synonyms: `type Name = ...` expands at every use, so
  records, classes, and instances can be written against named types.
- An auto-imported standard prelude (`lib/prelude.hly`) that brings the
  list/maybe/string/compose helpers into every program without an
  explicit import, including effectful combinators like `seq_` and `when`.
- Serialized bytecode artifacts: `compile -o file.hbc` writes a
  self-describing artifact (magic `HALCYONBC1`) that `run`, `run-vm`,
  `check`, and `compile` load directly, and `bench` compares the
  interpreter, VM, and optimized VM on a source file or an artifact.
- Tail-call optimization: calls in tail position reuse the current frame,
  so recursive loops run in constant stack space.
- A deterministic optimizer (`--opt`) that runs before the VM: constant
  folding, dead-code elimination, jump threading, and method resolution
  that never changes the result.
- Strict evaluation, first-class closures, curried multi-parameter
  functions, and partial application.
- A real bytecode VM: operand stack, frames, mutable upvalue cells shared
  with the defining frame, closures, a single-steppable machine, and an
  instruction profiler (`--profile`).
- A standard library of polymorphic list builtins (`cons`, `head`,
  `tail`, `isNil`, `length`, `reverse`, `append`, `take`, `drop`) and
  string functions (`charAt`, `stringLength`, `concat`, `substring`,
  `toUpper`, and friends), the curried ones supporting partial application
  like any other function.
- Caret diagnostics: every lexer, parser, type, and runtime error in the
  CLI and REPL shows the offending source line with a `^` at the column.
- A differential corpus of programs whose outputs are pinned, plus example
  programs (including a self-hosted standard library written in Halcyon
  itself: foldl, foldr, map, filter, zip, range, and friends).
- A REPL, an `eval` command for inline expressions, and a browser
  playground with a step-through VM debugger, an `--opt` toggle, an
  Input/Output panel for effects, and profiler and bytecode-artifact
  panels.

## Build

Requires only GHC (boot libraries plus `containers`).

```sh
make            # build build/halcyon
make test       # build and run the 684-test self-test suite
make smoke      # exercise every CLI command and exit code
make clean
```

## Usage

```sh
halcyon run <file.hly>            # interpret
halcyon run-vm <file.hly>         # run the bytecode VM
halcyon run-vm --trace <file.hly> # ... with a per-instruction trace
halcyon eval '<expr>'             # typecheck and evaluate inline
halcyon check <file.hly>          # typecheck only
halcyon compile <file.hly>        # print the compiled program disassembly
halcyon compile <file.hly> -o out.hbc # write a bytecode artifact
halcyon run out.hbc               # run a bytecode artifact
halcyon bench <file.hly>          # time interpreter, VM, and optimized VM
halcyon bench out.hbc             # ... including the artifact VM runs
halcyon run-vm --opt <file.hly>   # optimize, then run the bytecode VM
halcyon run-vm --profile <file.hly> # run with instruction/call profiling
halcyon corpus                    # run the differential corpus
halcyon corpus --examples <dir>   # run a directory of .hly example files
halcyon selftest                  # full self-test suite
halcyon repl                      # interactive loop (piped input supported)
```

Exit codes: `0` success, `1` lex/parse/type/runtime/IO error, `2` usage
error.

```sh
$ halcyon run examples/fib.hly
75025
```

## Example program

```hs
data Tree = Leaf Int | Node Tree Tree
let rec height = fn t => match t with
  | Leaf n => 1
  | Node l r => let hl = height l in
                let hr = height r in
                if hl > hr then hl + 1 else hr + 1
in height (Node (Node (Leaf 1) (Leaf 2)) (Leaf 3))
```

prints `3`. See `examples/stdlib.hly` for a standard library written in
Halcyon itself: `foldl`, `foldr`, `map`, `filter`, `zip`, `range`, `sum`,
`product`, `myLength`, `myReverse`, `all`, `any`, and `elem`.

## Web playground

`index.html` is a dependency-free page that embeds the entire language as
`js/halcyon.js`: an editor with example selector (including effects,
prelude, and operator/synonym examples), panels to Run / Run on VM /
Typecheck / show the AST / show the Bytecode / download a `.hbc` Bytecode
Artifact / Profile, an Input box that scripts stdin for effect programs,
an `--opt` toggle that optimizes before running or disassembling, and a
single-stepping VM debugger with the live operand stack, frame depth, and
result. Open it in any browser or serve the `halcyon/` directory
statically.

## Correctness

- 684 Haskell self-tests cover the lexer, parser, type inference, both
  evaluators, the optimizer, the profiler, records, classes, chars, the
  prelude, effects, bytecode artifacts, and the corpus.
- The differential corpus runs the same programs through the interpreter
  and the VM (plain and `--opt`) and compares against pinned expected
  output.
- `js/corpus-check.js` verifies the JavaScript mirror: JS interpreter ==
  JS VM == Haskell expected output across corpus programs, examples,
  types, disassembly, profiler output, and bytecode artifact round-trips
  (269 checks).

## Layout

```
src/Halcyon/Token.hs      tokens and positions
src/Halcyon/Lexer.hs      lexer
src/Halcyon/Ast.hs        expression AST and data types
src/Halcyon/Parser.hs     recursive-descent parser
src/Halcyon/Type.hs       types and schemes
src/Halcyon/Infer.hs      HM type inference
src/Halcyon/Value.hs      interpreter values and output rendering
src/Halcyon/Eval.hs       tree-walking interpreter
src/Halcyon/Op.hs         bytecode instructions, constants, programs
src/Halcyon/Compile.hs    expression-to-bytecode compiler
src/Halcyon/Optimize.hs   deterministic optimizer
src/Halcyon/Vm.hs         stack machine
src/Halcyon/Corpus.hs     differential corpus
src/Halcyon/Artifact.hs   serialized bytecode artifact format
src/Halcyon/Diag.hs       caret source diagnostics
src/Halcyon/Selftest.hs   self-test suite
src/Halcyon/Repl.hs       REPL
src/Halcyon/CLI.hs        command dispatch
app/Main.hs               entry point
js/halcyon.js             the whole language, mirrored in JavaScript
js/corpus-check.js        cross-language corpus check
examples/                 sample .hly programs, incl. the self-hosted stdlib
index.html                web playground
docs/                     language and VM references
```

## License

MIT. See the repository root `LICENSE`.

- the Builder