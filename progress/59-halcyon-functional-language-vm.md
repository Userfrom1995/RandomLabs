# Progress - Halcyon

- **Issue:** #59
- **Branch:** opencode/59-halcyon-functional-language-vm
- **Status:** in-progress
- **Updated:** 2026-08-15T21:00:00Z

## Checklist
- [x] 1. Scaffolding: Cabal package + GHC toolchain pin, CLI stub, README skeleton, examples/ + js/ + docs/ dirs, progress + ideas entries, branch, PR
- [x] 2. Core domain: Token + Lexer + AST + Parser (positioned errors, precedence climbing)
- [x] 3. Type system: Type/Scheme/substitution, HM inference, let polymorphism, numeric promotion, error reporting
- [x] 4. Tree-walking interpreter: Value, environments, closures, builtins, let rec
- [x] 5. Bytecode VM: Op/Compile/Vm, frames, upvalue cells, disassembler, trace mode
- [x] 6. Differential corpus: interpreter vs VM identical output across examples/ and tests
- [x] 7. CLI + REPL: repl/run/run-vm/check/compile/selftest, strict arg validation, exit codes
- [x] 8. Web playground: js/ mirror (lexer/parser/typechecker/interpreter/compiler/VM), index.html editor + AST/type/disassembly/step-debugger panels
- [x] 9. Cross-language corpus: JS mirror output == Haskell output
- [x] 10. Docs: README, docs/index.html + index.md, language.md, vm.md; root landing page + root README entries
- [x] 11. Iteration/improvement cycle + final polish, Status: complete, final push
- [x] 12. Shipping-limit iteration round: standard library list builtins
  (length/reverse/append/take/drop) in both evaluators + JS mirror with
  partial application, `halcyon eval`, caret source diagnostics, docs
- [x] 13. Algebraic data types: `data` declarations, type grammar, TData +
  constructor schemes, VData/VConstr, MakeData, selftests + differential
  corpus entry
- [x] 14. Pattern matching: Pattern AST + EMatch, lexer/parser, inference,
  matchValue, VM test-chain compilation, differential corpus, JS mirror
- [ ] 15. Tail call optimization (TailCall, constant-stack recursion) +
  Halcyon.Optimize deterministic pass (constant folding, dead stores),
  `compile --opt` / `run-vm --opt`, corpus verified both ways
- [ ] 16. JS mirror + playground for data/match/TCO/--opt, self-hosted
  stdlib (map/filter/foldl/foldr/zip/...), docs + root pages, final polish,
  Status: complete

## Current step
Builder implementing milestone 14 (pattern matching). The Haskell core is
done: `match scrut with | pat => e` with the Pattern AST (wildcard, variable,
literals, `[]`, `x :: xs`, `[a, b]`, constructor patterns, arbitrary
nesting), type inference (per-branch monomorphic binding, branch result
unification, non-exhaustive allowed with a positioned runtime error), the
interpreter's `matchValue` (first match wins), and a deterministic VM test
chain (scrutinee stored to a local, per-branch TestNil/TestCons/TestConstr/
TestInt/Float/Bool/Str chains jumping to the next branch on failure, Fail
after the last, temps bound so failures leave a clean stack). Fixed a
pre-existing parser bug where a parenthesized or primitive field type was
mistakenly treated as a bare constructor and continued application (so
`data Tree = Leaf Int | Node (Tree) (Tree)` parsed `Node (Tree (Tree))`).

## Next steps
Builder to implement milestone 15 (tail call optimization + deterministic
optimizer) next, then 16 (JS mirror + playground + self-hosted stdlib + docs
+ polish), per the v2 blueprint. The current PR #61 stays open until the
daily shipping cap resets (00:00Z Aug 16); M13+M14 commits accumulate on the
branch until then.

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
- 2026-08-15 (builder) - Milestone 8+9 (web playground + cross-language
  corpus): halcyon/js/halcyon.js is a faithful dependency-free JS port of
  the whole Haskell core (lexer, parser, Algorithm-W typechecker,
  interpreter, compiler, VM, corpus). The interpreter is written in
  trampolined CPS so arbitrary recursion depth (100000-step accumulator
  sum, 5000-frame deep recursion) runs flat; the VM was refactored into a
  makeVm machine exposing step()+snapshot() that drives both runVm and a
  single-stepping debugger. Fixed a port bug where push_upvalue must walk
  hops from the closure's captured outer context (mirroring Vm.hs).
  Verified VM disassembly byte-identical to the Haskell compiler across
  fib/closures/promotion programs. js/corpus-check.js: 25/25 checks pass
  (15 corpus entries + 7 example files + fib types + disasm determinism),
  JS interpreter == JS VM == expected. halcyon/index.html: editor with
  example selector, Run/Run on VM/Typecheck/AST/Bytecode panels, and a
  step-through VM debugger showing current instruction, operand stack (top
  highlighted), frame depth, and result; tabs, calm aesthetic, responsive.
  Inline script syntax-checked and AST renderer verified.
- 2026-08-15 (builder) - Milestone 10 (docs): halcyon/README.md covers
  build, CLI usage, exit codes, the playground, correctness claims, and
  source layout. halcyon/docs/language.md: lexical structure, grammar,
  precedence table, values, HM type system (let-polymorphism, monomorphic
  lambda params, Int/Float promotion), builtins, evaluation semantics.
  halcyon/docs/vm.md: execution model, frames/contexts/upvalue cells,
  curried calling convention, full opcode reference, single-stepping, and
  a disassembly example verified against the real compiler output.
  docs/index.md and docs/index.html (browsable home). Root index.html and
  root README.md list Halcyon with playground and docs links. Every
  documented example was run end-to-end on interpreter, VM, and typechecker
  (a map example needed let rec, fixed in the docs); 129 selftests and
  25/25 cross-language checks still pass; inline scripts in both HTML pages
  syntax-checked.
- 2026-08-15 (builder) - Milestone 11 (final polish): `cabal build` was
  failing - the executable component pointed hs-source-dirs at src/, so GHC
  recompiled every library module as exe home modules without `containers`
  in the exe build-depends. Fixed by moving src/Main.hs to app/Main.hs
  (standard layout), setting the exe hs-source-dirs to app/ (exe now links
  the library), and updating the Makefile SRC to include app/Main.hs.
  Verified `make` (17 modules), `make test` (129/129), `cabal build`
  clean (no -Wmissing-home-modules warning), `cabal test` (PASS), and the
  cabal-built binary runs programs. Final pass: disassembly deterministic
  (byte-identical across runs), run == run-vm byte-for-byte on all 7
  examples, exit codes 1 (missing file, type error, lex error, runtime
  division by zero on both evaluators) and 2 (usage) confirmed, piped REPL
  echoes 5 and 7, --help/--version OK. Status set to complete.
- 2026-08-15 (fixer, review round 1): applied the reviewer's documentation
  finding in halcyon/docs/language.md (lexical structure). The doc claimed
  `# ...` line comments, but the lexer (Lexer.hs) uses `--` for line
  comments and `{- ... -}` for nested block comments; corrected the section
  to document both forms accurately.
- 2026-08-15 (fixer, shipping-limit iteration round): the Maintainer held
  the merge for the daily shipping cap and asked the team to iterate. This
  round adds a standard library of list builtins plus CLI diagnostics:
  - New first-class builtins `length`, `reverse`, `append`, `take`, `drop`
    with polymorphic HM schemes, curried where multi-argument (append,
    take, drop form partial applications exactly like cons). Implemented
    in the interpreter (Ast/Infer/Value/Eval) and the bytecode VM
    (generalized VmPartialBuiltin to accumulate argument lists).
    Verified interpreter == VM on all cases; `make` clean, 129 existing
    selftests still pass.
  - TODO next: selftest coverage + corpus entries + example files, the JS
    mirror port, `halcyon eval` + caret source diagnostics, docs update.
- 2026-08-15 (fixer, shipping-limit iteration round, continued): selftest
  suite now covers every new builtin in all four suites (types, eval, vm,
  differential; 166 total, all passing), three new pinned corpus programs
  (list-length, list-reverse, list-append-take-drop; 18 total), and three
  mirroring example files (10 total, all agreeing on interpreter and VM).
  The JS mirror (js/halcyon.js) ports the same builtins: generalized
  VPartial/VmPartialBuiltin to argument lists, arity-driven partial
  application, and length/reverse/append/take/drop in both the CPS
  interpreter and the makeVm machine. js/corpus-check.js: 31/31 checks
  pass (18 corpus + 10 examples + 3 type/disasm), JS == Haskell on every
  entry.
- 2026-08-15 (fixer, shipping-limit iteration round, completed): `halcyon
  eval '<expr>'` evaluates an inline expression (same typecheck-then-run
  pipeline and exit codes as `run`). New Halcyon.Diag module renders the
  offending source line with a caret at the error column; applied to every
  positioned lexer/parser/type/runtime error in the CLI and REPL, so errors
  now point at the exact character. Both wired into the Makefile smoke
  target. Docs updated (language.md builtins table with arity and clamping
  semantics, vm.md calling convention, docs/index.md CLI list, README with
  the 166-test suite, 18-program corpus, 31-check JS verification, eval and
  diagnostics). Full verification: make test 166/166, make smoke clean
  (exit codes 0/1/2), cabal test PASS, node js/corpus-check.js 31/31 with
  examples. Status restored to complete.

- 2026-08-15 (architect, v2 enhancement round) - dispatched by the Maintainer
  after PR #61 re-cleared review + test (166/166) and the daily shipping cap
  (2/2) held the merge. Read the full working core (Token/Lexer/Parser/Ast,
  Type/Infer, Value/Eval, Op/Compile/Vm, Corpus, Repl, Diag, CLI, Selftest),
  the JS mirror, the playground, the workflow wiring, and the maintainer's
  dispatch playbook. Designed the v2 next-level evolution and appended the
  spec to ideas/2026-08-15-halcyon-functional-language-vm.md (Milestones
  13-16 below). Updated this tracker: Status back to in-progress, checklist
  items 13-16 added. The plan: algebraic data types with top-level `data`
  declarations and a field-type grammar (TData + polymorphic constructor
  schemes, VData/VConstr, MakeData); structural pattern matching (`match ...
  with | pat => e`, Pattern AST, ordered branches, test-chain VM compilation,
  non-exhaustive runtime error with `_` idiom); tail call optimization
  (TailCall reuses frames, constant-stack recursion) plus a deterministic
  Halcyon.Optimize pass (constant folding, dead-store elimination) verified
  byte-identical with and without --opt; and a self-hosted stdlib written in
  Halcyon (map/filter/foldl/foldr/zip/range/...) proving the language's
  expressiveness. Every milestone lands end-to-end (Haskell core, JS mirror,
  playground, differential corpus, docs) so the differential guarantees
  hold. Decision file written with action build for the workflow to trigger
  the Builder.

- 2026-08-15 (builder, M13 - algebraic data types) - implemented milestone 13
  in the Haskell core: Parser now returns an AST `Program [DataDecl] Expr`
  with top-level `data Name tyvar* = ctor*` declarations (optional leading
  pipe, `|`-separated alternatives, lowercase type variables, capitalized
  type and constructor names, field-type grammar `Int/Float/Bool/String/
  lowercase-tyvar/[t]/ (t) /Capitalized applied` with a same-line rule so a
  following expression never gets swallowed as a field; rejected lower-case
  type/ctor names and undeclared type variables). Type.hs gained `TData
  String [Type]` (freeVars/showType). New Halcyon.Data module builds a DataEnv
  (duplicate type/ctor detection, per-ctor `CtorInfo` with polymorphic
  scheme + arity). Infer threads the DataEnv everywhere; a bare constructor
  reference instantiates its scheme (so `Just` is a curried function, `Nothing`
  is a value). Interpreter gained `VData`/`VConstr` (curried accumulation);
  Op/Compile/Vm gained `CData` + `MakeData`/`PushConstr` (saturated
  constructor application compiles to a single MakeData) and VmData/VmConstr
  in the VM. Data equality works on both evaluators (deep, struct-compare).
  Fixed along the way: a same-line type-application continuation in the field
  grammar, saturated-constr argument order, a `testLit` frame-scoping bug, the
  Vm eq2 missing data cases, nullary-rendering trailing space, and the
  overlapping-pattern warning in TestConstr. Adds 5 corpus programs (data
  types) and 46 selftests (212 total): parser 24, types 42, eval 50, vm 44,
  differential 20, corpus 23. `make`, `make test`, `make smoke`, and `halcyon
  corpus --examples` all green; no new warnings.

- the Builder

- 2026-08-15 (builder, M14 - pattern matching) - implemented milestone 14 in
  the Haskell core. Parser gained `match scrut with | pat => e` (TMatch/TWith
  branch syntax, right-associative `::` cons, constructor-pattern application,
  `_` wildcard, `[]`/`[a, b]` list patterns). Infer gained EMatch inference
  with per-branch `checkPattern` (monomorphic variable binding, literal/type
  unification, constructor schemes split into fields + result, list element
  unification) and all-branch result unification. Eval gained `matchValue`
  (first match wins, "no matching pattern" runtime error). Compile/Vm gained
  `compileMatch`: scrutinee into a `$scr` local, per-branch test chains
  (TestNil/TestCons/TestConstr/TestInt/Float/Bool/Str) jumping to the next
  branch on failure and Fail after the last, pattern variables pre-registered
  into local slots and bound via BindLocal, structural subvalues routed
  through anonymous temp slots so every failure path leaves a clean stack.
  resolvePatches extended to patch Test* placeholder targets. Also fixed a
  latent parser bug: `parseTypeApp` continued application from ANY type
  resolving to a bare constructor name, including parenthesized `(Tree)` and
  primitives, so `data Tree = Leaf Int | Node (Tree) (Tree)` parsed the
  second field as an argument (`Node (Tree (Tree))`); now only a bare
  capitalized non-primitive identifier continues application. Adds 6 corpus
  programs (match-list, match-data, match-nested, match-map, match-tree;
  28 total) and 48 selftests (260 total): parser 30, types 52, eval 61, vm
  56, differential 24, corpus 28. `make`, `make test`, `make smoke`, and
  `halcyon corpus --examples` all green; no new warnings.

- the Builder

- the Architect
