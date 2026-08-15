# Halcyon virtual machine

Halcyon compiles expressions to bytecode for a stack machine with frames,
lexical upvalue cells, and closures. The same instruction set is implemented
in Haskell (`halcyon/src/Halcyon/Vm.hs`) and, op-for-op, in JavaScript
(`halcyon/js/halcyon.js`); both produce byte-identical output and identical
disassembly.

## 1. Execution model

- **Operand stack**: holds intermediate values. Every instruction that
  produces a result pushes it; binary operators pop two and push one.
- **Frames**: one per active function call, holding the running function
  (`fCode`, `fConstants`), the context, and the instruction pointer (`ip`).
  A call pushes a frame; `Return` pops it and the result stays on the
  operand stack.
- **Contexts and cells**: a context is a map of local *cells* plus the
  captured context of the closure that created the frame (the lexical
  chain). A cell is a mutable reference slot: `PushLocal`/`StoreLocal`
  access it, `NewCell` creates an empty cell (used by `let rec`),
  `PushUpvalue` walks `hops` outer contexts and reads `index` inside the
  target context, giving closures shared, updatable captures.
- **Constants**: a per-function pool of values and nested functions.
  Closures are made from `CFunc` constants; recursion works because a
  function can be its own constant.
- **Calling convention**: curried, one argument per `Call`. A `Call` pops
  the argument then the callable, and:
  - a single-parameter closure starts a new frame immediately;
  - a multi-parameter closure produces a partial application value that
    accumulates arguments until the arity is satisfied;
  - builtins dispatch directly; the curried builtins (`cons`, `append`,
    `take`, `drop`) form partial applications that accumulate arguments
    until the arity is satisfied, and unary builtins (`length`, `reverse`,
    `head`, `tail`, `isNil`) complete immediately.
  - method calls (`show v`, `size v`) dispatch through the dictionary that
    inference attached to the value. The compiler resolves the class and
    method to a constant and the VM looks the method up in the value's
    dictionary at the call site (`vm_method`); with `--opt` the compiler
    rewrites the site into a direct `call` to the resolved instance's
    method, skipping the runtime lookup entirely.

A program is a single entry function whose body is a whole expression; the
top-level executes it and `Halt`s.

## 2. Single-stepping

The machine is factored into a `makeVm` unit that exposes `step()` and a
`snapshot()` of the current instruction, operand stack (top marked), and
frame depth. Both `halcyon run-vm --trace` (Haskell) and the web playground
debugger (JavaScript) drive this same machine, so every step in the browser
matches exactly what the CLI would print.

## 3. Opcode reference

Operands: `s` = local slot, `i` = constant-pool index, `h` = hops (outer
contexts to walk), `n` = count, `o` = instruction offset.

| Opcode         | Operands | Stack effect                      | Behavior |
|----------------|----------|-----------------------------------|----------|
| `push_const`   | `i`      | `-> v`                            | push constant-pool value (never a function constant) |
| `push_local`   | `s`      | `-> v`                            | push local cell `s` |
| `store_local`  | `s`      | `v ->`                            | pop into local cell `s` |
| `new_cell`     | `s`      | `->`                              | create an empty cell at slot `s` (`let rec` binding) |
| `push_upvalue` | `h:i`    | `-> v`                            | walk `h` outer contexts, read cell `i` |
| `pop`          |          | `v ->`                            | discard top |
| `add` `sub` `mul` `div` |  | `a b -> r`            | numeric; any `Float` promotes to `Float`; integer `div` truncates, zero is an error |
| `lt` `le` `gt` `ge` |   | `a b -> Bool`          | numeric comparison across `Int`/`Float` |
| `eq` `ne`      |          | `a b -> Bool`                      | structural equality |
| `and` `or`     |          | `Bool Bool -> Bool`               | boolean conjunction/disjunction |
| `not`          |          | `Bool -> Bool`                    | logical negation |
| `neg`          |          | `n -> n`                          | numeric negation |
| `jump`         | `o`      | `->`                              | unconditional jump to offset `o` |
| `jump_if_false`| `o`      | `Bool ->`                         | pop; jump when false |
| `call`         |          | `arg fn -> r`                     | apply one argument (curried) |
| `tail_call`    |          | `arg fn -> r`                     | tail call: reuse the current frame when the caller has nothing pending |
| `make_closure` | `i`      | `-> closure`                      | build closure from constant `i`, capturing current context |
| `return`       |          | `r -> r`                          | pop frame; result stays on stack |
| `cons`         |          | `x [xs] -> [x,xs...]`             | prepend |
| `head`         |          | `[a] -> a`                        | first element; `head of empty list` on `[]` |
| `tail`         |          | `[a] -> [a]`                      | rest; `tail of empty list` on `[]` |
| `is_nil`       |          | `[a] -> Bool`                     | true when empty |
| `make_list`    | `n`      | `v1..vn -> [v1..vn]`              | pop `n` values in order, push list |
| `make_data`    | `i`      | `args -> Data i args`             | build a constructor value for data-pool index `i` |
| `test_constr`  | `i:o`    | `Data ->`                         | jump to `o` when the value's constructor index is `i`, else pop and continue |
| `test_int` `test_float` `test_bool` `test_str` `test_char` | `i:o` | `v ->` | jump to `o` when the value equals constant `i`, else pop |
| `test_nil`     | `o`      | `[a] ->`                          | jump to `o` when the list is empty |
| `test_cons`    | `o`      | `[a] ->`                          | jump to `o` when the list is non-empty |
| `make_record`  | `i`      | `args -> Record i args`           | build a record value for record-pool index `i` |
| `get_field`    | `i`      | `Rec -> v`                        | push the field at constant index `i`; `get_field on non-record value` on a non-record |
| `update_field` | `i`      | `Rec v -> Rec'`                   | replace field `i` with `v` in a new record |
| `test_record`  | `i:o`    | `Rec ->`                          | jump to `o` when the value's record index is `i`, else pop and continue |
| `vm_method`    | `i`      | `dict v -> fn`                    | look up method constant `i` in `dict`, push it applied to `v` |
| `bind_local`   | `s`      | `v ->`                            | pop into slot `s` without creating a cell |
| `fail`         |          | `v ->`                            | raise `no matching pattern` |
| `halt`         |          | `->`                              | stop; result is the stack top |

### Tail calls

Calls in tail position compile to `tail_call`, which replaces the current
frame instead of pushing a new one. Recursive tail calls therefore run in
constant stack space: a program like `let rec loop = fn n => if n == 0 then
0 else loop (n - 1) in loop 1000000` completes without growing frames.
Non-tail calls still push frames as usual.

### Data values

Constructor values carry a tag (the data-pool index) and their fields, so
`make_data` pops the fields in order and `test_constr` dispatches on the
tag. `match` compiles each branch to a `test_*` + `jump` chain, exactly as
documented in the language reference.

### Records

Record values carry a tag (the record-pool index) and their fields, in
declaration order. `make_record` pops the fields in order; `get_field`
picks one field out by constant index; `update_field` pops the new value
and the record and pushes a fresh record with that field replaced (the
original is untouched, matching the immutable semantics). `test_record`
dispatches on the record tag for record patterns. Field and record-pool
constants render in disassembly as `(field x)` and `(record Point)`.

### Classes and dictionaries

Class method calls compile to `vm_method`, whose constant is the resolved
method entry (class name plus method name). The value's dictionary carries
the method as a closure; `vm_method` looks it up and applies it to the
value, so `size rect` executes `size` with `rect` bound. Dictionaries are
built at program start from the `instance` declarations. The optimizer
replaces `vm_method` with a direct `call` to the specific instance's
method when it can resolve the constraint at compile time; the output is
identical, only faster.

### Profiling

`halcyon run-vm --profile` (and the playground's Profile panel) count
instructions executed, calls made, and peak operand-stack and frame depth.
The profiler wraps the machine without changing its execution: the same
programs produce byte-identical output with and without profiling, and the
reported counters are stable across runs of the same input. The summary is
a one-line `profile: N instructions, peak stack S, peak frames F` followed
by per-function call counts and per-opcode instruction counts.

## 4. Example disassembly

`halcyon compile` prints the program disassembly. For

```
let rec fib = fn n => if n < 2 then n else fib (n - 1) + fib (n - 2) in fib 5
```

the entry function begins:

```
main() upvals=0 consts=2
  0: new_cell 0
  1: make_closure 0
  2: store_local 0
  3: push_local 0
  4: push_const 1        ; 5
  5: call
  6: halt
```

and the `fib` closure in the constant pool holds the recursive body plus its
own upvalue capture spec for slot 0, so calls to `fib` read the same cell the
top level just stored.