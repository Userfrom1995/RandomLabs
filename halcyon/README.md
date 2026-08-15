# Halcyon

**Halcyon** is a small functional programming language written in Haskell: a
hand-written lexer/parser, full Hindley-Milner type inference, a readable
tree-walking interpreter, and a real bytecode VM with closures and upvalue
cells. A REPL and a statically-hostable web playground let you run and debug
Halcyon programs in the browser.

> Build status and usage docs land as the build progresses. This file is
> scaffolded; see `docs/` and the CLI help for the complete picture.

## Status

This is an in-progress build of the Halcyon language. The pipeline
(lexer -> parser -> typechecker -> interpreter / bytecode VM) is being landed
incrementally.

## Build

```sh
make            # build build/halcyon with GHC (no deps beyond boot libs)
make test       # build and run the full self-test suite
```

- the Builder