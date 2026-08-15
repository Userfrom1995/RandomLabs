# Progress - Halcyon

- **Issue:** #59
- **Branch:** opencode/59-halcyon-functional-language-vm
- **Status:** in-progress
- **Updated:** 2026-08-15T13:05:00Z

## Checklist
- [x] 1. Scaffolding: Cabal package + GHC toolchain pin, CLI stub, README skeleton, examples/ + js/ + docs/ dirs, progress + ideas entries, branch, PR
- [x] 2. Core domain: Token + Lexer + AST + Parser (positioned errors, precedence climbing)
- [x] 3. Type system: Type/Scheme/substitution, HM inference, let polymorphism, numeric promotion, error reporting
- [x] 4. Tree-walking interpreter: Value, environments, closures, builtins, let rec
- [x] 5. Bytecode VM: Op/Compile/Vm, frames, upvalue cells, disassembler, trace mode
- [x] 6. Differential corpus: interpreter vs VM identical output across examples/ and tests
- [x] 7. CLI + REPL: repl/run/run-vm/check/compile/selftest, strict arg validation, exit codes
- [ ] 8. Web playground: js/ mirror (lexer/parser/typechecker/interpreter/compiler/VM), index.html editor + AST/type/disassembly/step-debugger panels
- [ ] 9. Cross-language corpus: JS mirror output == Haskell output
- [ ] 10. Docs: README, docs/index.html + index.md, language.md, vm.md; root landing page + root README entries
- [ ] 11. Iteration/improvement cycle + final polish, Status: complete, final push

## Current step
CLI + REPL done (Halcyon.Repl: stdin-driven line-buffered loop with
multi-line continuation via "end of input" parse-error detection, prompt
only on a tty, piped input scriptable; CLI dispatch for repl/run/run-vm/
run-vm --trace/check/compile/corpus/corpus --examples/selftest/help/version;
strict arg validation with exit code 2 for usage errors and 1 for
lex/parse/type/runtime/IO errors; positioned error messages; Makefile smoke
target exercising every command; verified all exit codes and traces).
Web playground next

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
- 2026-08-15 (builder) - Milestone 4 (tree-walking interpreter): Value.hs
  (VInt/VFloat/VBool/VStr/VList/VClosure/VBuiltin/VPartial, canonical
  deterministic showValue shared with VM and later JS mirror, whole-float
  rendering 5.0 not 5), Eval.hs (pure eval over Map env, curried closures
  binding one param at a time, let rec via lazy self-referential env knot,
  cons/head/tail/isNil with VPartial for cons's second arg, Int/Float
  promotion at runtime incl. truncating Int division, positioned runtime
  errors). Verified: fib 25, count 100000 (deep recursion), map/filter over
  lists, closures. 30 eval selftests added (75 total).
- 2026-08-15 (builder) - Milestone 5 (bytecode VM): Op.hs (Instr set incl.
  PushUpvalue hops:index, NewCell, MakeClosure, Call, MakeList, Halt; Const
  CValue/CFunc; Func with code/constants/upvals; constEquiv dedup; showInstr),
  Compile.hs (CompileM over CompileState, per-function scope chains with
  locals + upvalues, resolveRef emitting PushLocal/PushUpvalue with
  (hops,index) capture paths, lambda compile with save/restore + MakeClosure
  into enclosing pool, rec as NewCell+MakeClosure+StoreLocal, jump labels +
  forward patch resolution, EList to MakeList, disassemble), Vm.hs (frame
  stack machine in IO; Context = cells IntMap of IORefs + captured outer
  chain; closures capture defining frame's Context by reference so recursion
  via the rec cell works; MakeClosure resolves upvalue paths from the frame
  context; PushUpvalue walks hops then reads cell; curried Call applying one
  arg per Call with VmPartial for multi-param lambdas; arithmetic/comparison/
  builtins mirroring the interpreter incl. Int/Float promotion and truncating
  Int div; trace mode printing ip+instruction+stack; vmShowValue byte-equal
  to showValue). 29 VM selftests + 10 differential (interpreter==VM) tests
  added, 114 total all passing. Verified: deep recursion 100k in ~0.55s,
  10-level nested closure captures, closures created inside called functions,
  fib 25 = 75025 on both evaluators. Known limitation documented: mutual
  recursion between separate let recs is rejected by the typechecker on both
  sides.
- 2026-08-15 (builder) - Milestone 6 (differential corpus): added
  Halcyon.Corpus (15 canonical programs with cName/cSource/cExpected - fib,
  fact, map, filter, closure-counter, compose, partial-application, numeric
  and function promotion, list surgery, lists-of-lists, string conditional,
  100k-step tail-recursive sum, mixed arithmetic, 5000-frame deep recursion),
  wrote examples/fib.hly, map.hly, filter.hly, closures.hly, lists.hly,
  promotion.hly, recursion.hly as the on-disk mirror of the corpus, wired
  corpusTests into Selftest (each entry must produce interpreter output == VM
  output == expected; 15 corpus tests, 129 total all passing), exposed
  Halcyon.Corpus in halcyon.cabal. Verified both evaluators agree on all 15
  programs including the 100k-step accumulator recursion and the 5000-frame
  deep recursion.
- 2026-08-15 (builder) - Milestone 7 (CLI + REPL): added Halcyon.Repl
  (stdin-driven loop, buffer + parse each line, keep buffering while the
  parse error mentions end of input so multi-line programs work, prompt only
  on a tty, blank-line reset, typecheck-then-evaluate printing the value),
  rewrote Halcyon.CLI with full command dispatch (repl/run/run-vm/
  run-vm --trace/check/compile/corpus/corpus --examples <dir>/selftest/
  --help/--version), strict argument counts, positioned errors
  (line L, col C), exit codes 0/1/2 (success/error/usage), readSource with
  IOException handling, corpus runner + examples-dir checker reusing one
  runBoth (interpreter output == VM output). Verified every command and
  every exit code by hand; added Makefile smoke target (set -e; corpus,
  corpus --examples, run, run-vm, check, compile, piped repl, bad-input
  non-zero exits). cabal now depends on directory + filepath for the
  examples checker.

- the Builder

- the Architect
