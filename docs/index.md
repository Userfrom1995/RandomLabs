# Regexplorer — a visual regex engine that animates NFA matching in the terminal

**Regexplorer** is a small, dependency-free Python CLI that implements a
regular-expression engine from scratch and renders it as a living diagram.
It parses a pattern into an AST, builds the **Thompson NFA**, draws the state
machine in the terminal as an ASCII graph, and **steps a string through it
frame-by-frame** so you can watch which transitions fire, where the engine
backtracks, and whether the match succeeds.

It runs on nothing but the Python standard library (`argparse`, `collections`,
`itertools`, `math`, `sys`, `time`) — no dependencies, no build step.

```text
python3 -m regexplorer 'a(b|c)*d' 'abccbd'
python3 -m regexplorer --diagram-only 'a(b|c)*d'
python3 -m regexplorer --quiet --engine backtrack '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
```

---

## What it is

- **Parser + AST** — a recursive-descent parser turns a small regex subset
  (literals, `.`, character classes, `*` `+` `?`, `|`, grouping, `^` `$` anchors,
  escapes) into a typed AST with correct precedence. Unknown escapes like `\b`
  are rejected instead of silently ignored.
- **Thompson NFA builder** — the classic textbook construction: one state per
  atomic position, ε-edges wiring literals into sequences, alternations, and
  quantifiers. The machine is drawn as an ASCII graph in the terminal.
- **Two honest engines** — the default NFA simulation keeps a *set of active
  states* and advances it one input character at a time (linear time, leftmost
  *shortest* match, no backtracking); `--engine backtrack` does greedy,
  leftmost *longest* matching like Python's `re` — and you can watch it give
  input back step by step.
- **Step animation** — every consumed character, fired transition, restarted
  thread, and backtrack is recorded as an explicit trace and replayed
  frame-by-frame, so the animation is deterministic and fully testable.
- **The catastrophic-backtracking lesson** — `(a+)+b` on a run of `a`s explodes
  under backtracking (bounded by `--max-steps`, which aborts the run with a
  clear message) yet is instant for the NFA engine. Both are one command apart.
- **Script-friendly** — `--quiet` prints one machine-readable line
  (`MATCH 2-5`, `NO MATCH`, `ABORTED 200000`) with distinct exit codes.

## Running it

Regexplorer is a Python package in `regexplorer/`. Python 3.8+ is all you need.

```bash
# Render the NFA once, then animate the match frame by frame (needs a TTY)
python3 -m regexplorer 'a(b|c)*d' 'abccbd'

# Just print the state machine
python3 -m regexplorer --diagram-only 'a(b|c)*d'

# Watch classic greedy backtracking (and the backtrack it takes)
python3 -m regexplorer --engine backtrack 'ab|ac' 'ac'

# Demonstrate catastrophic backtracking: (a+)+b explodes, the NFA does not
python3 -m regexplorer --engine backtrack '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
python3 -m regexplorer '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

# Plain, script-friendly results
python3 -m regexplorer --quiet '[a-c]+' 'xxabcx'    # -> MATCH 2-3   (shortest)
python3 -m regexplorer --quiet --engine backtrack '[a-c]+' 'xxabcx'   # -> MATCH 2-5   (greedy)
python3 -m regexplorer --quiet '^ab$' 'ac'          # -> NO MATCH
```

The single file also runs directly: `python3 regexplorer/regexplorer.py --help`.

### Running the tests

```bash
python3 -m unittest discover -s regexplorer/tests
```

The 63 tests cover the parser (literals, classes, ranges, escapes, anchors,
precedence, and every error case), NFA construction (reachability, epsilon
closures, the `*` back edge), both engines against a shared table of ~50
match/no-match cases, the documented shortest-vs-greedy difference,
catastrophic backtracking aborts, statistics, both renderers, and the CLI
surface (quiet output, exit codes, flags, validation).

## The two engines

| Engine | Semantics | Complexity | What you see |
| --- | --- | --- | --- |
| `--engine nfa` (default) | Leftmost **shortest** match: a set of active states is advanced together and the run stops at the first offset where an accepting state is reached. No backtracking. | O(n·m) per input over the NFA | Active states spreading through the machine; the "fresh match can begin here" restarts. |
| `--engine backtrack` | Leftmost **longest** (greedy) match, like Python's `re.search`: quantifiers eat as much as possible first, then give input back one step at a time. | Potentially exponential (see the step cap) | The AST tree, the current path, and every backtrack. |

The two can disagree on the same input, and that is the point: the NFA engine
is what makes real engines linear, while backtracking is what makes them
predictable-but-slow. On `abccbd` with the pattern `a(b|c)*`:

```bash
python3 -m regexplorer --quiet 'a(b|c)*' 'abccbd'        # MATCH 0-1   (shortest)
python3 -m regexplorer --quiet --engine backtrack 'a(b|c)*' 'abccbd'   # MATCH 0-5   (greedy)
```

### Catastrophic backtracking

Patterns like `(a+)+b` on a long run of `a`'s have exponentially many ways to
split the input into `a+` groups, so a backtracking engine explores them all
before concluding there is no match. Regexplorer bounds this with `--max-steps`
(default 200,000): when the budget is exhausted the run is **aborted** with a
clear message instead of hanging. The same input is instant for the NFA engine
— that contrast is the whole lesson.

```bash
python3 -m regexplorer --engine backtrack '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
# ...
# ABORTED after 200000 steps — the pattern likely causes catastrophic backtracking
```

## Supported pattern syntax

A deliberately small, documented subset:

| Construct | Example | Meaning |
| --- | --- | --- |
| Literals | `a`, `1`, `_` | Match that exact character (metacharacters like `+` are literal when escaped). |
| Any character | `.` | Any character except newline. |
| Character class | `[abc]`, `[a-z]`, `[0-9_]` | One of the listed characters / ranges. |
| Negated class | `[^abc]`, `[^0-9]` | Any character *not* listed. |
| Predefined classes | `\d` `\w` `\s` `\D` `\W` `\S` | Digit / word / whitespace (and complements). |
| Quantifiers | `a*` `a+` `a?` | Zero or more, one or more, zero or one (greedy in the backtracking engine). |
| Alternation | `a|b|c` | First branch that matches wins. |
| Grouping | `(ab|c)*` | Grouping only (no capture extraction). |
| Anchors | `^a`, `a$` | Start / end of the input. |
| Escapes | `\n` `\t` `\r` `\f` `\v` `\0` `\.` `\*` `\[` `\\` … | Control characters and escaped metacharacters. |

Bare `-`, `{`, `}`, `]` outside a class are literal characters. Unknown
alphabetic escapes (e.g. `\b`, `\q`) are rejected as pattern errors rather than
silently ignored. There are no backreferences, look-around, or bounded
repetition — keeping the NFA construction textbook-clean.

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `PATTERN` | | The regular expression to compile and match. |
| `TEXT` | `""` | The input to match against (optional; `--diagram-only` doesn't need it). |
| `--engine` | `nfa` | `nfa` (set of active states, linear) or `backtrack` (greedy recursion). |
| `--diagram-only` | off | Print just the NFA state machine and exit. |
| `--quiet` | off | One machine-readable line: `MATCH a-b`, `NO MATCH`, or `ABORTED n`. |
| `--no-animate` | off | Print every frame without screen clears or delays. |
| `--delay SECS` | `0.25` | Seconds between animation frames on a TTY. |
| `--max-steps N` | `200000` | Stop the backtracking engine after N steps (reveals catastrophic backtracking). |
| `--color` | `auto` | `auto` (only on a TTY), `always`, or `never`. |
| `--version` | | Print the version and exit. |

Exit codes: `0` = match, `1` = no match, `2` = error or an aborted run.

Safety: patterns are capped at 200 characters, inputs at 2,000 characters, and
the backtracking engine at `--max-steps` calls, so an accidental exponential
pattern can never hang the process.

## How it works

### 1. Parsing

`parse()` tokenizes the pattern and runs a recursive-descent parser with the
usual precedence chain — alternation (lowest) → sequence → repetition
(highest). Every construct becomes a small AST node (`Lit`, `AnyChar`,
`CharClass`, `Anchor`, `Seq`, `Alt`, `Star`, `Plus`, `Opt`). A `_pattern_str`
renderer can turn an AST back into a regex-like string, which the test suite
uses for round-trip checks.

### 2. Thompson NFA construction

`build_nfa(ast)` applies the textbook fragment algebra: each node builds a
small state graph and returns its *start* and *accept* states, and parents wire
fragments together with ε-transitions. A `Star` starts a fresh "loop start"
state, ε-splits into the child (and out the bottom), and adds an ε back-edge
from the child's accept to the loop start — the back edge that makes `*`
actually loop, and the one every NFA test pokes at.

### 3. The NFA engine

`nfa_simulate(nfa, text)` is the set-of-states algorithm, done in a single
pass with leftmost tracking: each active state carries the *minimum start
offset* of a thread that reached it, and the ε-closure propagates those offsets
monotonically. At each input offset a fresh thread may begin at the start
state; when any thread reaches an accepting state the run stops immediately —
that is what makes it leftmost-*shortest*. Every closure, transition, and
restart is recorded in the trace for the animator.

### 4. The backtracking engine

`backtrack_simulate(ast, text)` is written in continuation-passing style: a
`Star`/`Plus` consumes greedily and returns a *continuation* that re-enters
the loop, so when the rest of the pattern fails, the continuation naturally
"gives back" one character at a time. An empty-match guard (`q > p`) keeps
`(a*)*` from spinning forever. Each step records which node is being tried and
whether input was given back, which the AST-tree view turns into an explicit
`branch 0 failed; trying the next alternative` message.

### 5. Rendering and animation

The NFA is laid out left-to-right by a dependency-free `spring_layout`
(balanced forces on the ε skeleton) and stroked onto a character grid with
rounded corners for cycles. Animation frames are built from the recorded trace:
the input line with a caret, the machine with active states highlighted, the
transitions that just fired, and a stats line (`states visited · steps · max
active set`). The backtracking view shows the AST as a tree with the working
node marked. `--diagram-only` prints just the machine; `--quiet` skips the
screen entirely.

## Project layout

```text
regexplorer/
  regexplorer.py         # the whole engine + CLI
  __main__.py            # enables `python -m regexplorer`
  __init__.py            # package marker / public exports
  README.md              # project quick-start and option reference
  tests/
    test_regexplorer.py  # 63 stdlib-unittest tests
docs/
  index.md               # this documentation page (source)
  index.html             # rendered documentation page
ideas/
  2026-08-11-regexplorer-visual-regex-engine.md
```

## Design notes

- **Pure core, terminal on top** — parsing, NFA construction, both engines,
  and the diagram renderer are side-effect-free functions; only the CLI plays
  frames. Everything is driven by an explicit *trace*: a list of steps that the
  engines record and the renderer turns into frames, which makes the animation
  deterministic and trivially testable.
- **Leftmost start tracking in the NFA** — the set-based simulation carries,
  for every active state, the *minimum start offset* of a thread that reached
  it; ε-closure propagates it monotonically. That single-pass trick is what
  lets the engine find the leftmost (shortest) match without the O(n²) "try
  every start offset" loop.
- **CPS backtracking** — greedy repetition is implemented with explicit
  continuations so a `*` naturally "gives back" one character at a time when
  the rest of the pattern fails; an empty-match guard keeps `(a*)*` from
  spinning.
- **Two honest engines** — Regexplorer deliberately keeps the NFA and
  backtracking semantics *different* rather than papering over them, and
  documents the difference, because that difference *is* the educational
  content: linear time vs. exponential blow-up, and where it comes from.
