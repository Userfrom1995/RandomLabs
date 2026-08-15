# Halcyon

A small functional programming language with Hindley-Milner type inference
and a bytecode VM, written from scratch in Haskell with zero external
dependencies, and mirrored one-to-one in plain JavaScript so the whole
language runs in a static web page.

The pipeline is `lex` -> `parse` -> `infer` -> `eval`, or `lex` -> `parse`
-> `compile` -> `vm`. Two Haskell evaluators (tree-walking interpreter and
stack VM) and one JavaScript mirror all agree byte-for-byte, proven by a
15-program differential corpus.

## Features

- Hand-written lexer and recursive-descent parser with exact `line:col`
  error positions.
- Full Hindley-Milner type inference (Algorithm W): `Int`, `Float`, `Bool`,
  `String`, lists, functions, `let`-polymorphism, `let rec`, numeric
  Int/Float promotion, and readable error messages like
  `cannot unify Bool with Int`.
- Strict evaluation, first-class closures, curried multi-parameter
  functions, and partial application.
- A real bytecode VM: operand stack, frames, mutable upvalue cells shared
  with the defining frame, closures, and a single-steppable machine.
- A differential corpus of 15 programs whose outputs are pinned, plus 7
  example programs.
- A REPL and a browser playground with a step-through VM debugger.

## Build

Requires only GHC (boot libraries plus `containers`).

```sh
make            # build build/halcyon
make test       # build and run the 129-test self-test suite
make smoke      # exercise every CLI command and exit code
make clean
```

## Usage

```sh
halcyon run <file.hly>            # interpret
halcyon run-vm <file.hly>         # run the bytecode VM
halcyon run-vm --trace <file.hly> # ... with a per-instruction trace
halcyon check <file.hly>          # typecheck only
halcyon compile <file.hly>        # print the compiled program disassembly
halcyon corpus                    # run the 15-program differential corpus
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
let rec fib = fn n => if n < 2 then n
                      else fib (n - 1) + fib (n - 2)
in fib 25
```

## Web playground

`index.html` is a dependency-free page that embeds the entire language as
`js/halcyon.js`: an editor with example selector, panels to Run / Run on
VM / Typecheck / show the AST / show the Bytecode, and a single-stepping
VM debugger with the live operand stack, frame depth, and result. Open it
in any browser or serve the `halcyon/` directory statically.

## Correctness

- 129 Haskell self-tests cover the lexer, parser, type inference, both
  evaluators, and the corpus.
- The differential corpus runs the same 15 programs through the
  interpreter and the VM and compares against pinned expected output.
- `js/corpus-check.js` verifies the JavaScript mirror: JS interpreter ==
  JS VM == Haskell expected output across corpus programs, examples, types,
  and disassembly determinism (25 checks), and the VM disassembly is
  byte-identical to the Haskell compiler.

## Layout

```
src/Halcyon/Token.hs      tokens and positions
src/Halcyon/Lexer.hs      lexer
src/Halcyon/Ast.hs        expression AST
src/Halcyon/Parser.hs     recursive-descent parser
src/Halcyon/Type.hs       types and schemes
src/Halcyon/Infer.hs      HM type inference
src/Halcyon/Value.hs      interpreter values and output rendering
src/Halcyon/Eval.hs       tree-walking interpreter
src/Halcyon/Op.hs         bytecode instructions, constants, programs
src/Halcyon/Compile.hs    expression-to-bytecode compiler
src/Halcyon/Vm.hs         stack machine
src/Halcyon/Corpus.hs     differential corpus
src/Halcyon/Selftest.hs   self-test suite
src/Halcyon/Repl.hs       REPL
src/Halcyon/CLI.hs        command dispatch
js/halcyon.js             the whole language, mirrored in JavaScript
js/corpus-check.js        cross-language corpus check
index.html                web playground
docs/                     language and VM references
```

## License

MIT. See the repository root `LICENSE`.

- the Builder