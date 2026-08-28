# Rotoria

A terminal Enigma machine cipher simulator — a small, dependency-free Python
CLI that reproduces a WWII Enigma cipher machine: configurable rotor order,
ring settings, plugboard stecker pairs, and a reflector, letting you encrypt
and decrypt messages and visualize the internal wiring path of every letter.
Educational, cryptography-focused, and self-contained enough for a single
coding session.

## What Was Built

A single-file Python CLI (`roteria/roteria.py`) that simulates the classic
Wehrmacht three-rotor Enigma (plus support for up to five rotors), using
nothing but the Python standard library (`argparse`, `re`, `sys`):

- **Accurate rotor stepping** — the rightmost rotor steps every keypress; the
  middle rotor is carried along when the rightmost rotor reaches its notch;
  the leftmost rotor steps when the middle rotor reaches its own notch. This
  reproduces the Enigma's famous "double-stepping", where the middle rotor can
  advance twice across two consecutive keypresses. The implementation is
  validated step-for-step against the reference py-enigma implementation over
  hundreds of random configurations, plus the documented window sequence
  `AAB AAC ... AAV ABW ...`.
- **Full configurability** — rotor order (I–V, any subset), ring settings
  (letters or 1–26), starting positions (letters or 0–25), plugboard pairs,
  and reflector B or C. Every option is validated up front with clear error
  messages.
- **Encrypt and decrypt** — the Enigma is an involution, so `encrypt` and
  `decrypt` are the same operation; the CLI offers both for clarity, reads
  messages from the command line or stdin, and can group ciphertext in blocks
  (`--group 5`).
- **Internal wiring visualization** — `visualize` steps through a message and
  prints each letter's full signal path (stecker-in → each rotor's forward
  pass → reflector → each rotor's backward pass → stecker-out) with the rotor
  windows after every keypress. `machine` prints the complete wiring tables of
  every rotor and reflector for reference.
- **Interactive mode** — `--interactive` starts a session that encrypts line
  by line and reports the ciphertext and rotor windows after every keypress.

## Why

The repo so far covered a web game (Tic-Tac-Toe), terminal cellular automata
(Automatarium), Markov-chain music (Arpeggio), and a genetic algorithm
(Homunculus). Rotoria fills the **cryptography / history-of-computing** niche:
a real, historically important cipher machine with genuinely interesting
mechanical behavior (rotor turnover, the double-step, the ring-setting
subtlety) that is small enough to build faithfully in one session and runs on
the stdlib only. It is also a great educational artifact — you can watch a
letter's electrical path trace through the wiring instead of treating the
machine as a black box.

## How It Works

- **Components** — a `Rotor` holds its published wiring, inverse wiring,
  notch letter, ring setting, and current position; a `Reflector` is a
  reciprocal wiring with no fixed points; a `Plugboard` is a set of
  reciprocal letter swaps applied at both ends of the signal path.
- **Stepping** — `EnigmaMachine.step()` implements the double-stepping logic:
  if the middle rotor's window shows its notch letter, all three rightmost
  rotors advance; else if the right rotor's window shows its notch, the middle
  and right rotors advance; else only the right rotor advances.
- **Signal path** — `encrypt_letter` runs the letter through plugboard →
  rotors right-to-left (each `forward`) → reflector → rotors left-to-right
  (each `backward`) → plugboard. Ring settings shift the wiring relative to
  the rotor body via `(index + position - ring) % 26` before and after the
  substitution.
- **Input formats** — rings and positions accept letters or numbers (`--rings
  A B C` / `--rings 1 2 3`, `--positions QWE` / `--positions 0 1 2`), and the
  message sanitizer uppercases and discards non-alphabet characters, just as
  the real machine's operators dropped spaces and punctuation.
- **Validation** — unknown rotors/reflectors, out-of-range ring/position
  values, wrong setting counts, and duplicate or self-connected plugboard
  letters are all rejected with specific errors (exit code 2).

## Key Files

- `roteria/roteria.py` — the entire CLI: Rotor, Reflector, Plugboard,
  EnigmaMachine, parsing/validation, rendering, and argument handling.
- `roteria/__main__.py` + `roteria/__init__.py` — package entry points for
  `python3 -m roteria`.
- `roteria/README.md` — tool-specific usage guide and option reference.
- `roteria/tests/test_roteria.py` — 56 stdlib-`unittest` tests.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- **Correctness** — the stepping and wiring were cross-checked against the
  well-known reference implementation (py-enigma): 300+ random 3-rotor
  configurations matched for both encryption output and the rotor window
  sequence, plus the published 26-letter `AAAAAAAAAAAAAAAAAAAAAAAAAA` known
  vector. The test suite pins down the wiring tables, the documented stepping
  sequence, the double-step at `ADV → AEW → BFX`, the involution property,
  plugboard/ring/position validation, and the CLI surface.
- **Faithful, not simplified** — unlike many educational simulators, Rotoria
  implements the real notch/double-stepping logic instead of a "rotate all
  rotors, carry on turnover" approximation, so long messages behave exactly
  like the physical machine.
- **Scope choice** — reflectors B and C and rotors I–V (the standard set)
  keep the tool self-contained; the M4 extra rotors and a real cryptanalysis
  mode would be natural future extensions.
- End-to-end check: `python3 -m roteria encrypt "HELLO WORLD"` →
  `ILBDAAMTAZ`, and `python3 -m roteria decrypt ILBDAAMTAZ` recovers
  `HELLOWORLD`.
