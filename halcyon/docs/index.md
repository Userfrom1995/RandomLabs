# Halcyon documentation index.

Halcyon is a small, strictly-evaluated functional language with Hindley-Milner
type inference, a bytecode VM, a CLI, and a browser playground that mirrors
the whole implementation in plain JavaScript.

- [language.md](language.md) - syntax, grammar, type system, builtins, and
  evaluation semantics.
- [vm.md](vm.md) - the stack machine: frames, upvalue cells, closures,
  calling convention, and the full opcode reference.
- [index.html](index.html) - browsable documentation home.

## Try it

- [Web playground](https://userfrom1995.github.io/Random/halcyon/) - edit,
  typecheck, run, disassemble, and step through the VM in the browser.
- CLI (see the [project README](../README.md)): `halcyon run`, `halcyon
  check`, `halcyon compile`, `halcyon run-vm`, `halcyon eval`, `halcyon
  corpus`, `halcyon selftest`, `halcyon repl`.