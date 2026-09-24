# Rotoria

A small, dependency-free Python CLI that simulates a WWII Enigma cipher
machine. Rotoria reproduces the historical machine's rotor stepping (including
the famous "double-stepping" of the middle rotor), the plugboard (stecker),
ring settings, and reflectors, and can visualize the internal wiring path of
every letter as it travels through the machine. Nothing but the Python
standard library (`argparse`, `re`, `sys`) — no external packages, no assets.

- **Historically accurate stepping** — the rightmost rotor steps every
  keypress; the middle rotor is carried along at the right rotor's notch; the
  leftmost rotor steps when the middle rotor hits its own notch, producing the
  real Enigma "double-step". Verified step-for-step against the reference
  implementation across hundreds of random configurations.
- **Full configurability** — rotor order (I–V), ring settings, starting
  positions, plugboard pairs, and reflector B or C, all from the command line.
- **Encrypt and decrypt** — the Enigma is an involution, so one operation does
  both; the CLI offers `encrypt` and `decrypt` for clarity.
- **Internal wiring visualization** — `visualize` traces every letter's full
  signal path (stecker → each rotor's forward pass → reflector → each rotor's
  backward pass → stecker) and shows the rotor windows after every keypress.
- **Wiring tables** — `machine` prints the complete rotor and reflector wiring
  tables for reference.

## Quick start

```bash
# Encrypt a message with the default machine (rotors I II III, rings 1 1 1,
# positions AAA, reflector B, no plugboard)
python3 -m roteria encrypt "HELLO WORLD"
# -> ILBDAAMTAZ

# Decrypt is the same operation
python3 -m roteria decrypt "ILBDAAMTAZ"
# -> HELLOWORLD

# A wartime-style configuration, with ciphertext grouped in blocks of five
python3 -m roteria encrypt "ATTACK AT DAWN" \
  --rotors II III V --rings 2 3 4 --positions ABC \
  --stecker AB CD EF --group 5

# Watch the signal path of every letter
python3 -m roteria visualize "A" --positions AAA

# Interactive session
python3 -m roteria --interactive --rotors III II I --reflector C

# Print the wiring tables and current configuration
python3 -m roteria machine
```

The single file also runs directly: `python3 roteria/roteria.py --help`.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `-r, --rotors ORDER` | `I II III` | Rotor order left-to-right, e.g. `--rotors I III V`. Any subset/order of rotors I–V. |
| `--rings SETTINGS` | all `1` | Ring settings: letters A–Z (`A` = setting 1) or numbers 1–26. e.g. `--rings 1 2 3` or `--rings A B C`. |
| `--positions POSITIONS` | all `A` | Starting rotor positions: letters A–Z (A = 0) or numbers 0–25. e.g. `--positions AAA` or `--positions Q W E`. |
| `-s, --stecker PAIRS` | none | Plugboard pairs, e.g. `--stecker AB CD EF`. Each letter may appear at most once; at most 13 pairs. |
| `--reflector NAME` | `B` | Reflector to use: `B` or `C`. |
| `--group N` | `0` | Group ciphertext output in blocks of N letters (`0` disables). |
| `--interactive` | off | Start an interactive session (available with the global flags above). |
| `--version` | | Print the version and exit. |
| `--help` | | Print full help, including examples. |

Rings and positions also accept a contiguous letter string when it matches the
rotor count, e.g. `--positions QWE` is the same as `--positions Q W E`.

### Subcommands

- `encrypt MESSAGE` / `decrypt MESSAGE` — process a message (identical
  operations; the Enigma is an involution).
- `visualize MESSAGE` — step through the message and print every letter's
  signal path plus the rotor windows after each keypress.
- `machine` — print the machine configuration and the complete rotor and
  reflector wiring tables.

If no message is given to `encrypt`/`decrypt`/`visualize`, input is read from
standard input, so the tool pipes naturally.

## How it works

1. **The machine.** An Enigma machine is a cascade of substitution stages.
   A keystroke's electrical signal enters through the plugboard, passes
   through each rotor right-to-left, bounces off the reflector, passes back
   through each rotor left-to-right, and exits through the plugboard again.
2. **Stepping.** Before each letter, the rotors advance: the rightmost rotor
   always steps; when the rightmost rotor reaches its notch, the middle rotor
   steps too; when the middle rotor reaches its own notch, the leftmost rotor
   steps as well. Because the middle rotor can be carried and then immediately
   hit its own notch, it sometimes steps on two consecutive keypresses — the
   Enigma's famous "double-stepping".
3. **Ring settings.** Each rotor's wiring is rotated relative to its body by
   its ring setting, shifting the substitution without moving the window
   letter.
4. **The involution.** The plugboard swaps, the rotor passes are mirrored
   around the reflector, and the reflector is reciprocal, so the whole machine
   is symmetric: encrypting the ciphertext with the same settings recovers the
   plaintext.

### Example trace

```
$ python3 -m roteria visualize "A" --positions AAA
Machine: rotors:    I II III | rings:     1 1 1 | positions: A A A | reflector: B | plugboard: none

Key 1  plaintext A
  A --III.fwd--> C --II.fwd--> D --I.fwd--> F --refl--> S --I.back--> S --II.back--> E --III.back--> B --stecker-out--> B
  ciphertext B | windows: A A B
```

## Reproducibility and correctness

The stepping logic and wiring tables are validated against the well-known
reference implementation (py-enigma) across 300+ random configurations, and
the test suite embeds published test vectors (including the 26-letter
`AAAAAAAAAAAAAAAAAAAAAAAAAA` vector and the double-stepping window sequence).
The same settings always produce the same output — there is no randomness.

## Project layout

```
roteria/
  roteria.py          # the whole CLI: rotors, stepping, plugboard, reflector
  __main__.py         # enables `python -m roteria`
  __init__.py         # package marker
  README.md           # this guide
  tests/
    test_roteria.py
docs/
  index.md            # the documentation page (source)
  index.html          # rendered documentation page
ideas/
  2026-08-08-rotoria-terminal-enigma-simulator.md
```

## Development

```bash
python3 -m unittest discover -s roteria/tests
```

The 56 tests cover the wiring tables, rotor forward/backward passes, the
notch and double-stepping behavior, the documented stepping sequence,
known-answer ciphertexts, the involution property, plugboard validation, ring
and position parsing, and the full CLI surface (including error handling and
stdin input).

## Design notes

- **Single file, zero dependencies** — `argparse`, `re`, and `sys` only; the
  machine is a few plain classes.
- **Faithful, not approximate** — the double-stepping notch logic is
  implemented exactly as the physical machine behaves, not the simplified
  "rotate all rotors, carry on turnover" shortcut some simulators use.
- **Validation everywhere** — unknown rotors/reflectors, out-of-range ring or
  position settings, duplicate or self-connected plugboard letters, and wrong
  setting counts are all rejected with clear errors.
- **Educational by design** — `visualize` and `machine` expose the internal
  wiring so the cipher can be studied, not just executed.
