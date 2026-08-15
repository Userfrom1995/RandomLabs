# Progress - Halcyon

- **Issue:** #59
- **Branch:** opencode/59-halcyon-functional-language-vm
- **Status:** in-progress
- **Updated:** 2026-08-15T12:15:00Z

## Checklist
- [x] 1. Scaffolding: Cabal package + GHC toolchain pin, CLI stub, README skeleton, examples/ + js/ + docs/ dirs, progress + ideas entries, branch, PR
- [x] 2. Core domain: Token + Lexer + AST + Parser (positioned errors, precedence climbing)
- [x] 3. Type system: Type/Scheme/substitution, HM inference, let polymorphism, numeric promotion, error reporting
- [ ] 4. Tree-walking interpreter: Value, environments, closures, builtins, let rec
- [ ] 5. Bytecode VM: Op/Compile/Vm, frames, upvalue cells, disassembler, trace mode
- [ ] 6. Differential corpus: interpreter vs VM identical output across examples/ and tests
- [ ] 7. CLI + REPL: repl/run/run-vm/check/compile/selftest, strict arg validation, exit codes
- [ ] 8. Web playground: js/ mirror (lexer/parser/typechecker/interpreter/compiler/VM), index.html editor + AST/type/disassembly/step-debugger panels
- [ ] 9. Cross-language corpus: JS mirror output == Haskell output
- [ ] 10. Docs: README, docs/index.html + index.md, language.md, vm.md; root landing page + root README entries
- [ ] 11. Iteration/improvement cycle + final polish, Status: complete, final push

## Current step
Type system done (HM inference with let polymorphism + numeric promotion,
45 embedded selftests passing); interpreter + bytecode VM next

## Next steps
Builder to scaffold project tree (halcyon/ Cabal package, CLI stub, examples/,
js/, docs/) and implement core domain logic (lexer, parser, AST), then the
type system, interpreter, bytecode VM, differential corpus, REPL/CLI, the JS
web playground, docs, and the final iteration cycle, per the blueprint in
ideas/2026-08-15-halcyon-functional-language-vm.md.

## Agent log
- 2026-08-15 (architect) - read architect.md, FACTORY.md, builder.md, previous
  project conventions (Glyphforge, Gambit, Granite), confirmed prior Builder PR
  #60 for #59 was closed without merging and its branch deleted; created branch
  opencode/59-halcyon-functional-language-vm, wrote the architectural blueprint
  (ideas/2026-08-15-halcyon-functional-language-vm.md) and this progress
  tracker, committed, pushed, opened the blueprint PR (Closes #59).
- 2026-08-15 (builder) - Milestone 1 (scaffold): halcyon/ with Makefile
  (ghc --make, no deps beyond boot libs), halcyon.cabal, src/Main.hs + CLI
  stub (help/version/unknown-command with exit codes), README skeleton,
  examples/ js/ docs/ test/ dirs, build/ + obj .gitignore. Verified
  `make` builds and CLI responds. Pushed milestone-by-milestone per the
  Maintainer's continue mandate.
- 2026-08-15 (builder) - Milestone 2 (core domain): Token.hs (Pos/Token/Tok),
  hand-written Lexer.hs (literals, names, operators, keywords, -- line and
  {- -} nested block comments, string escapes, positioned lex errors, precise
  numeric scanner so 1-2 is two tokens), Ast.hs (Expr/Op/Builtin with
  per-node positions), Parser.hs (parser monad, recursive descent with
  precedence climbing 1..6, left-assoc application, let/let rec, if, fn,
  lists, unary -/!, positioned parse errors). Verified by ghc scratch harness
  over 15 sample programs incl. fib, curried closures, comments, floats.
  Removed Halcyon.Main in favor of src/Main.hs entry.
- 2026-08-15 (builder) - Milestone 3 (type system): Type.hs (Type with
  TVar/TInt/TFloat/TBool/TStr/TList/TFun, Scheme with explicit quantified
  vars), Infer.hs (Algorithm W in an Infer monad over subst+counter:
  unification with occurs check, let polymorphism, let rec, numeric
  promotion Int+Float -> Float with metavariable binding/sharing,
  positioned errors, final substitution applied to the reported principal
  type). Builtin names now parse to EBuiltin and typecheck via polymorphic
  schemes. First embedded selftest suite (Halcyon.Selftest wired into
  `halcyon selftest` + Makefile test target): 45 tests (lexer 9, parser 14,
  types 22) all passing. Pretty-printer renders right-assoc function types
  (a -> a -> a).

- the Architect
