# Halcyon documentation index.

Halcyon is a small, strictly-evaluated functional language with Hindley-Milner
type inference, algebraic data types, pattern matching, nominal records, type
classes with dictionaries, user-defined operators and type synonyms, an
auto-imported standard prelude, effects with `do` blocks, serialized bytecode
artifacts, tail-call optimization, a deterministic optimizer, a bytecode VM
with a profiler, a CLI with benchmarking, and a browser playground that
mirrors the whole implementation in plain JavaScript.

- [language.md](language.md) - syntax, grammar, type system, data types,
  records, type classes, user operators, type synonyms, pattern matching,
  builtins, the prelude, effects and `do` blocks, bytecode artifacts, and
  evaluation semantics.
- [vm.md](vm.md) - the stack machine: frames, upvalue cells, closures,
  tail calls, data and record instructions, method dispatch, user
  operators and synonyms on the VM, effects, profiling, artifacts and
  benchmarking, and the full opcode reference.
- [index.html](index.html) - browsable documentation home.

## Try it

- [Web playground](https://userfrom1995.github.io/Random/halcyon/) - edit,
  typecheck, run, disassemble, profile, step through the VM, script stdin
  for effects, and download bytecode artifacts in the browser.
- CLI (see the [project README](../README.md)): `halcyon run`, `halcyon
  check`, `halcyon compile`, `halcyon run-vm`, `halcyon eval`, `halcyon
  bench`, `halcyon corpus`, `halcyon selftest`, `halcyon repl`. `run-vm
  --opt` and `compile --opt` exercise the deterministic optimizer;
  `run-vm --profile` prints instruction and call counts; `compile -o
  out.hbc` writes a bytecode artifact and `bench` compares the
  interpreter, VM, and optimized VM.