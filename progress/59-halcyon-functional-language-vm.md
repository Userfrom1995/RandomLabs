# Progress - Halcyon

- **Issue:** #59
- **Branch:** opencode/59-halcyon-functional-language-vm
- **Status:** in-progress
- **Updated:** 2026-08-15T12:15:00Z

## Checklist
- [ ] 1. Scaffolding: Cabal package + GHC toolchain pin, CLI stub, README skeleton, examples/ + js/ + docs/ dirs, progress + ideas entries, branch, PR
- [ ] 2. Core domain: Token + Lexer + AST + Parser (positioned errors, precedence climbing)
- [ ] 3. Type system: Type/Scheme/substitution, HM inference, let polymorphism, numeric promotion, error reporting
- [ ] 4. Tree-walking interpreter: Value, environments, closures, builtins, let rec
- [ ] 5. Bytecode VM: Op/Compile/Vm, frames, upvalue cells, disassembler, trace mode
- [ ] 6. Differential corpus: interpreter vs VM identical output across examples/ and tests
- [ ] 7. CLI + REPL: repl/run/run-vm/check/compile/selftest, strict arg validation, exit codes
- [ ] 8. Web playground: js/ mirror (lexer/parser/typechecker/interpreter/compiler/VM), index.html editor + AST/type/disassembly/step-debugger panels
- [ ] 9. Cross-language corpus: JS mirror output == Haskell output
- [ ] 10. Docs: README, docs/index.html + index.md, language.md, vm.md; root landing page + root README entries
- [ ] 11. Iteration/improvement cycle + final polish, Status: complete, final push

## Current step
Ready for initial build

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

- the Architect
