# Progress - Halcyon

- **Issue:** #59
- **Branch:** opencode/59-halcyon-functional-language-vm
- **Status:** in-progress
- **Updated:** 2026-08-15T19:45:00Z

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
- [x] 15. Tail call optimization (TailCall, constant-stack recursion) +
  Halcyon.Optimize deterministic pass (constant folding, dead stores),
  `compile --opt` / `run-vm --opt`, corpus verified both ways
- [x] 16. JS mirror + playground for data/match/TCO/--opt, self-hosted
  stdlib (map/filter/foldl/foldr/zip/...), docs + root pages, final polish,
  Status: complete
- [x] 17. Top-level definitions + module system: program = decl* expr
  (let/let rec top-level bindings), `import "..."` resolution with --lib,
  split the self-hosted stdlib into halcyon/lib/*.hly modules, differential
  corpus entries
- [x] 18. Record types: record decls, { f = e } literals, e.f projection,
  { e with f = e' } update, record patterns, TRec + VRec + MakeRecord/
  GetField/UpdateField opcodes, selftests + corpus
- [x] 19. Type classes with dictionary passing: class/instance decls,
  constraint contexts on schemes, instance resolution, VDict/VmDict +
  DictGet, intToStr/floatToStr/boolToStr builtins, Show class in stdlib,
  differential tests
- [x] 20. Char type + string operations: 'a' literals, TChar/VChar, strLen/
  charAt/substr/strAppend/strContains/str builtins, stdlib growth
  (string.hly, list.hly, maybe.hly), corpus entries
- [ ] 21. VM profiler (--profile/--stats), optimizer expansion (DCE + copy/
  constant propagation), JS mirror + playground sync for all v3 features,
  docs, final polish, Status: complete

## Current step
v3 enhancement round (shipping-limit round 2) is designed and ready for the
Builder. Milestones 17-21 were added to the checklist: M17 top-level
definitions + module system, M18 record types, M19 type classes with
dictionary passing, M20 Char + string operations, M21 VM profiler +
optimizer expansion + JS/playground/docs sync. M17 through M20 are complete.
Next up: M21 VM profiler + optimizer expansion + JS mirror/playground/docs
sync. The merge is still held by the Aug 15 shipping cap (2/2); the v3 round
must land and pass a fresh review + test on the new head before the Maintainer
merges after the 00:00Z Aug 16 cap reset.

## Next steps
Builder to implement M21 (VM profiler --profile/--stats, optimizer expansion:
DCE + copy/constant propagation, JS mirror + playground sync for ALL v3
features - records, modules, classes, chars, strings, profiler - plus docs
and final polish) on the existing branch, pushing milestone-by-milestone and
updating this tracker as it goes. After M21, the Reviewer + Tester cycle runs
on the fresh head and the Maintainer merges once the cap resets, closing #59.

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

- 2026-08-15 (builder, M15 part 1 - tail call optimization) - compiler
  threads a tail-position flag through compileExpr: a call whose result is
  immediately the enclosing function's result compiles to TailCall instead of
  Call. Tail positions are the lambda body, both if branches, every match
  branch body, let/let-rec bodies, and the program's top-level call;
  subexpressions consumed by an operation (call arguments, operator operands,
  scrutinees, bound values) stay non-tail. The VM's existing TailCall handler
  reuses the current frame (constant-stack recursion) and returns partial
  applications/builtins/constructors by popping the frame exactly like
  Return. Added selftests: 1M-step accumulator recursion in bounded stack,
  tail calls through nested ifs and match branches, a differential corpus
  program verified on both evaluators, and disassembly checks proving
  tail_call is emitted in tail positions and call in non-tail positions
  (fib's recursive adds). 268 selftests green; make smoke green.

- the Builder

- 2026-08-15 (builder, M15 part 2 - deterministic optimizer) - new
  Halcyon.Optimize pass plus `--opt` wiring. rewriteCode folds
  push_const;push_const;<binop> and push_const;neg/not into constants
  (division by zero never folds, so runtime errors survive), replaces
  store_local to a slot nothing reads and no directly-nested closure
  captures with pop, drops dead new_cell and push_const;pop pairs, and
  removes jumps to the very next instruction. A fixpoint iterates the
  rewrite (each round strictly shrinks code) threading original instruction
  offsets so jump targets stay in original coordinates and the returned
  position map patches the final code directly. rebuildPool keeps only
  referenced constants, dedups plain values (never functions), and remaps
  every index. Fixed two real bugs found by the corpus: a reversed
  fold-constant list misaligned pool indices (wrong arithmetic), and a
  position-map composition error that left jump targets stale after nested
  folding (`if 2 > 1 then ...` jumped out of bounds). Wired `run-vm --opt`,
  `compile --opt`, and `corpus --opt` into the CLI, added an opt selftest
  group (24 tests: folding, promotion, comparisons, dead let, live
  closure/rec captures kept, if/match/data/tail-call survival, differential
  vs the plain VM, and opt-corpus 28 programs byte-identical both ways).
  halcyon.cabal exposes Halcyon.Optimize; the Makefile smoke target runs
  the corpus and examples with and without --opt. 320 selftests green; make
  smoke green.

- the Builder

- 2026-08-15 (builder, M16a - JS mirror for data/match/TCO) - ported the
  v2 core to the JS mirror (js/halcyon.js): values (VData/VConstr + showValue),
  lexer tokens (`data`/`match`/`with`, `::`, `|`, `=>`), parser (`parseProgram`
  now returns `{decls, expr}`; data declarations with a same-line field-type
  grammar, `match ... with | pat => e` branches, constructor/list/literal/
  wildcard patterns), typechecker (TData, DataEnv with duplicate detection,
  constructor schemes instantiated like functions, checkPattern per branch),
  interpreter (curried VConstr, matchValue), and compiler/VM (CData consts,
  MakeData/PushConstr/Test*/BindLocal/Fail ops, Test* patch resolution, tail
  position threading incl. tail_call in the JS VM with constant-stack
  recursion and empty-frame return semantics). Fixed port bugs found by the
  new tests: test-* fail labels were never patched; parseTypeApp greedily
  swallowed a following capitalized name across lines; saturatedConstr built
  args in the wrong order (P 1 true came out as P true 1); the entry
  function's trailing return emptied the frame stack. js/corpus-check.js now
  has 28 corpus entries (10 data/match programs mirroring the Haskell
  corpus) plus 30 feature checks (match patterns, TCO deep recursion, bounded
  frame depth via the stepper, data/match typechecking). 60/60 checks green;
  JS interpreter == JS VM == Haskell on every program; Haskell make test 320
and make smoke still green.

- the Builder

- 2026-08-15 (builder, M16b - self-hosted standard library) - wrote
  examples/stdlib.hly, a standard library written entirely in Halcyon,
  proving the language's expressiveness: foldl, foldr, map, filter, zip
  (with a Pair data type), range, sum, product, myLength, myReverse, all,
  any, and elem, all defined with let rec and match and chained with in.
  The demo expression exercises them end-to-end (sum of squares filtered
  through range, length, zip/destructure, and any), yielding 1601. Added it
  as the 29th corpus entry in both Corpus.hs and the JS corpus, and as a
  JS playground example (stdlib.hly). Verified run/run-vm/run-vm --opt all
  give 1601; make test 322 (29 corpus + 29 opt-corpus) green; make smoke
  green; JS corpus-check 104 checks green with the examples dir.

- the Builder

- 2026-08-15 (builder, M16a part 2 - JS --opt optimizer) - ported
  Halcyon.Optimize to the JS mirror: optimizeProgram/optimizeFunc,
  fixpoint over original-code coordinates (instructions tagged with their
  original offset, jump targets naming original offsets, no position-map
  composition), rewriteCode (fold push_const;push_const;<binop> and
  push_const;neg/not, dead store_local to pop, dead new_cell, push_const;pop,
  jump-to-next removal), foldBin/foldUnary/numFold/divFold/cmpFold/eqFold/
  boolFold mirroring the interpreter and VM exactly (Int+Float promotion,
  division by zero never folds), and rebuildPool with constKey dedup (values
  by rendered form, data by name/arity, functions never). compileProgram
  gained an opt flag. Added 5 optimizer checks to corpus-check (opt-corpus
  runs all 28 programs on the optimized VM, opt disassembly deterministic,
  constant folding shrinks code, division-by-zero survives). 91 checks green
  (with examples dir 101); JS optimized disassembly is byte-identical to the
  Haskell --opt compiler on every corpus program that the CLI typecheck
  accepts; Haskell make test 320 and make smoke still green.

- the Builder

- 2026-08-15 (builder, M16c - playground + docs) - playground: added data
  decl / match / all pattern kinds (pconstr, pcons, plist, ...) to the AST
  renderer with a pattern renderer and a renderProgram that prints each
  data decl followed by the expression tree, fixed the type renderer for
  the schema the JS mirror actually emits (k/n/args), made parse's AST
  panel use the new {decls, expr} shape, exported inferProgram as an alias
  so the typecheck path works in the browser, and added an --opt checkbox
  that runs the deterministic optimizer before Run on VM or disassembling
  bytecode (documented with a hover tooltip). Verified the inline script
  syntax and end-to-end panel behavior (stdlib example: interp 222, type
  Int, opt vs plain bytecode 258 vs 264 lines, debugger resets and runs to
  halt with the result). Docs: language.md gained the dataDecl/type/match/
  pattern grammar, constructor values, and a pattern-matching section
  (pattern kinds, rightmost-binding shadowing, no compile-time
  exhaustiveness with a no matching pattern runtime error, test-and-jump
  compile model); vm.md gained the tail_call, make_data, test_constr/
  test_int/test_float/test_bool/test_str, test_nil/test_cons, bind_local,
  and fail opcodes plus tail-call and data-value sections; README and the
  docs index (md/html) updated with the new feature list, the data/match
  example, --opt usage, and the correct 322/104 counts. Verified a
  million-step tail-recursive loop runs in constant stack on both
  evaluators. make test 322 and JS corpus-check 104 still green.

- the Builder

- 2026-08-15 (builder, M16d - root pages) - moved Halcyon to the current
  project on both root pages: index.html now shows Halcyon under Current
  Project with the Live now tag (feature copy updated for data types,
  pattern matching, TCO, the optimizer, and the self-hosted stdlib; 322
  tests), and Beambus moved to the top of Previous Projects; the meta
  description names Halcyon as the hosted project. README.md got the same
  current/previous swap with matching copy and links.

- the Builder

- 2026-08-15 (builder, M16e - final polish) - finished milestone 16:
  verified the full matrix once more (make test 322 green incl. 29 corpus
  + 29 opt-corpus, make smoke green, JS corpus-check 104 green with the
  examples dir, playground script syntax-checked), updated this tracker
  (checklist 16 complete, Status: complete, next steps now merge-focused),
  and wrote the decision file /tmp/random-factory-decision.json with
  action build for the workflow. All milestone-16 commits are on PR #61,
  which stays open for the Maintainer to merge after the shipping cap
  resets at 00:00Z Aug 16 and to close issue #59.

- the Builder
- 2026-08-15 (architect, v3 enhancement round) - dispatched by the Maintainer
  after PR #61 re-cleared review + test on head b1897b1 (322/322, Reviewer
  approve 16:36Z, Tester approve-test 16:41Z) and the Aug 15 shipping cap
  (2/2) again held the merge. Per the owner's playbook (f1fbae9), designed
  the v3 next-level evolution and appended the spec to
  ideas/2026-08-15-halcyon-functional-language-vm.md (Milestones 17-21
  below). Updated this tracker: Status back to in-progress, checklist items
  17-21 added. The plan: top-level definitions + a module system (`import`
  with `--lib`, the self-hosted stdlib split into `halcyon/lib/*.hly`
  modules); record types with named fields (construction, projection,
  functional update, record patterns, TRec/VRec/MakeRecord/GetField/
  UpdateField); type classes with dictionary passing (class/instance decls,
  constraint contexts on schemes, instance resolution, VDict/VmDict/DictGet,
  the standard dictionary-passing translation); a Char type + string
  operations (strLen/charAt/substr/strAppend/strContains/str builtins);
  and a VM profiler (`--profile`/`--stats`) plus optimizer expansion
  (dead-code elimination, copy/constant propagation). Every milestone lands
  end-to-end (Haskell core, JS mirror, playground, differential corpus,
  docs) so the byte-identical guarantees hold. Decision file written with
  action build for the workflow to trigger the Builder.

- the Architect
- 2026-08-15 (builder) - Milestone 17 (top-level definitions + module
  system): Program grew to imports + top-level defs (DefData/DefLet) + final
  expr; defs-only modules allowed. Ambiguous `let` disambiguated: a let whose
  next token is `in` is an expression form, otherwise a top-level def; def RHS
  bodies parse with a same-line application rule (psBound) while final exprs
  and `let ... in ...` bodies keep the unrestricted grammar. inferProgram/
  evalProgram return Maybe (Nothing for defs-only); compileProgram returns
  Program always. Module resolution (Module.hs): providers (diskProvider/
  memProvider), root dir + lib dir fallback, per-module dir threading for
  child imports, inProgress/completed cycle detection with duplicate-import
  dedup, checkProgram (dup data/ctor/let names) on merged defs. Fixed a real
  generalization bug: schemeFtv counted quantified vars as free, so
  polymorphic defs in lib/list.hly (all/myReverse/append) produced false
  "infinite type" errors. Split the self-hosted stdlib into halcyon/lib/
  (pair.hly, list.hly, maybe.hly, compose.hly); examples/stdlib.hly is now a
  thin import-based demo (still 1601). New corpus entries topdefs (5021) and
  topdefs-order (50); new modules selftest group via memProvider (10 tests).
  JS mirror synced: parser (imports/defs/expr, bound-mode parseAppRest),
  infer/eval/compile handle defs, schemeFtv fix, walkOuter scope-advance
  fix, resolveProgram/memProvider + bundled lib modules, new corpus/examples
  entries. make test: 354 pass; make smoke green (corpus 31/31 both ways,
  examples 11/11); js corpus-check.js examples: 121 checks, 0 failures.

- 2026-08-15 (builder) - Milestone 19 (type classes with dictionary passing):
  new Classes.hs (ClassEnv/ClassDecl/InstanceDecl/InstanceInfo, buildClassEnv,
  overlap rejection, builtinClass Show with Int/Float/Bool/String/List instances,
  builtinShowList via string + concat). Lexer: class/instance/where keywords,
  `->`/`=>` lex as a single TArrow token (for `size : a -> Int` signatures).
  Parser: class decl (methods with type signatures), instance decl (optional
  context `C a =>`, head with type args, where body), head strips a repeated
  class name, head vars encode to the reserved classTypeVar (2000000000) so
  they never collide with inference metavariables (which start at 0 again).
  Type: Scheme gains a context field (cn, type) list; showType handles large
  var ids. Infer: checkClass/checkInstance/checkMethod, dischargeCtx (contexts
  on head vars are discharged; runtime vars keep constraints), solveConstraints
  with per-class-var resolution + ambiguity/no-instance errors, resolveInstance
  (head matching + head bindings + unification), unifyHead/unifyHeadB/partitionCtx.
  Value: VMethod/VDict; Eval threads a ClassEnv, dispatchMethod dispatches by
  value type tag (ctorFor/ciType) and runs method bodies in the entry context,
  Add on two strings concatenates, new intToStr/floatToStr/boolToStr/
  strToStr/listToStr builtins. Op/Compile: CMethod const, compileDicts emits
  method funcs into the entry pool and returns the dict table, Program gains
  pDicts + pCtors (constructor-name -> type map so VM dispatch tags match
  instance heads); resolveRef falls back to a CMethod for class methods; entry
  pool built from the post-dict state. Optimize: optimizeProgram keeps dict
  method consts as extra rebuildPool roots and remaps pDicts indices.
  Vm: VmVMethod/VmDict, dispatchMethod/dispatchMethodTail look up the dict by
  runtime tag, then apply the method func as a curried closure (fixes a
  no-local-at-slot-1 bug for 2-arg methods like `eq = fn a b => a == b`).
  Class-var collision originally worked around with a 10000 inference start,
  replaced by the dedicated classTypeVar sentinel so user-facing types stay
  clean (`a -> a`, not `t10000 -> t10000`). Selftests: 33 new checks
  (builtin Show, string concat, basic/context/curried/tail-position class
  usage, overlap + missing-instance rejection) plus 5 new corpus entries
  (show-int/float/list/bool, class-size-pair); lib/maybe.hly gained a
  `Show a => Show (Maybe a)` instance demo. make test: 473 pass; make
  smoke green; recursive-context Pair class verified on eval/run-vm/--opt.

- 2026-08-15 (builder) - Milestone 20 (Char type + string operations):
  end-to-end in the Haskell core. Lexer: `'a'` literals with escapes
  (\n \t \r \\ \') and unterminated/empty/multi-char/bad-escape errors;
  TChar token. Parser: char expression and pattern atoms, `Char` as a type
  atom and (non-data) name. Type: TChar + "Char" rendering. Value: VChar with
  a shared showCharLit so interpreter and VM render chars identically
  ('a', '\n', ...). Eval/VM: char equality, char-list values, TestChar
  bytecode for char patterns (with optimizer folding and constant remapping).
  New first-class builtins (both evaluators): strLen (String->Int), charAt
  (String->Int->Char, 0-based, bounds-checked), substr (String->Int->Int->
  String, clamps start, rejects negative length), strAppend, strContains
  (isInfixOf), and the polymorphic reflection builtin str (forall a. a->
  String) that renders any value exactly as the CLI prints it. Classes.hs
  gained a built-in `Show Char` instance (str-based) and TChar cases in
  instance-head unification/shape enumeration. lib/string.hly added (chars,
  fromChars with quote-stripping fromChar, toUpper/toUpperStr, countChar,
  repeat, startsWith); list.hly grew concat/zipWith/takeWhile/dropWhile;
  maybe.hly grew maybe/mapMaybe/join. Selftests: char/string coverage in
  every suite (lexer, parser, types, eval, vm, differential, opt, modules)
  plus 6 self-contained corpus entries (char-basics, char-pattern,
  string-ops, str-reflection, char-string-show, string-table). Fixed a
  pre-existing optimizer bug surfaced by toUpperStr: dead-store analysis
  only counted depth-0 upvalues of directly nested closures, so a grandchild
  closure capturing a slot of the outermost frame had its store dropped
  ("upvalue cell not found"). capturedByNested now walks the full
  nested-function tree matching each upvalue hop against its depth
  (hop d-1 reaches the function's own cells). Reproduced on the M19 baseline
  with an Int-only program; fixed and covered by a dedicated differential
  opt test. make test: 585 pass; make smoke green; cabal test PASS.

- the Builder
