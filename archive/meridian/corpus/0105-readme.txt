# Regexplorer

A small, dependency-free Python CLI that implements a **regular-expression
engine from scratch** and renders it as a living diagram. Parse a pattern into
an AST, build the **Thompson NFA**, draw the state machine in the terminal as
an ASCII graph, and **step a string through it frame-by-frame** to watch which
transitions fire, where backtracks happen, and whether the match succeeds.

Nothing but the Python standard library (`argparse`, `collections`,
`itertools`, `math`, `sys`, `time`) — no dependencies, no build step.

## Quick start

```bash
# Render the NFA once, then animate the match frame by frame (needs a TTY)
python3 -m regexplorer 'a(b|c)*d' 'abccbd'

# Just print the state machine
python3 -m regexplorer --diagram-only 'a(b|c)*d'

# Watch classic greedy backtracking (and the backtrack it takes)
python3 -m regexplorer --engine backtrack 'ab|ac' 'ac'

# Demonstrate catastrophic backtracking: (a+)+b explodes, the NFA does not
python3 -m regexplorer --engine backtrack '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' --max-steps 1000
python3 -m regexplorer '(a+)+b' 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

# Plain, script-friendly result
python3 -m regexplorer --quiet '[a-c]+' 'xxabcx'      # -> MATCH 2-3  (NFA, shortest)
python3 -m regexplorer --quiet --engine backtrack '[a-c]+' 'xxabcx'   # -> MATCH 2-5  (greedy)
python3 -m regexplorer --quiet '^ab$' 'ac'            # -> NO MATCH
```

The single file also runs directly: `python3 regexplorer/regexplorer.py --help`.

## What you're watching

The default `--engine nfa` animation draws the automaton once, then for every
step shows the input with a caret, the machine with the **active states**
highlighted (`[n]`), the transitions that just fired, and a running stats line:

```text
regexplorer · pattern 'a(b|c)*d' · input 'abccbd' · engine: NFA simulation (no backtracking) · step 1/13
  text: "abccbd"
         ^
  (n) state  (n)* accepting  → start  [n] active  ε empty transition

   →(0)-a--(1)-ε--(8)-ε--(6)----(2)---ε-(3)------(7)
                    ...
  ▸ consume 'a'  ·  fired: 0 -a-> 1
  stats: states visited 8 · steps 2 · max active set 7
```

The `--engine backtrack` animation instead shows the **AST as a tree** with the
node the engine is currently working on marked (`◀`), and an explicit
`branch 0 failed; trying the next alternative` note whenever the engine gives
back input and tries another path.

## The two engines

| Engine | Semantics | Complexity | What you see |
| --- | --- | --- | --- |
| `--engine nfa` (default) | Leftmost **shortest** match: a set of active states is advanced together and the run stops at the first offset where an accepting state is reached. No backtracking. | O(n·m) per input over the NFA | Active states spreading through the machine; the "fresh match can begin here" restarts. |
| `--engine backtrack` | Leftmost **longest** (greedy) match, like Python's `re.search`: quantifiers eat as much as possible first, then give input back one step at a time. | Potentially exponential (see the step cap) | The AST tree, the current path, and every backtrack. |

The two can disagree on the same input, and that is the point: the NFA engine
is what makes real engines linear, while backtracking is what makes them
predictable-but-slow. For example, on `abccbd` with the pattern `a(b|c)*`:

```bash
python3 -m regexplorer --quiet 'a(b|c)*' 'abccbd'        # MATCH 0-1  (shortest)
python3 -m regexplorer --quiet --engine backtrack 'a(b|c)*' 'abccbd'   # MATCH 0-5  (greedy)
```

### Catastrophic backtracking

Patterns like `(a+)+b` on a long run of `a`'s have exponentially many ways to
split the input into `a+` groups, so a backtracking engine explores them all
before concluding there is no match. Regexplorer bounds this with
`--max-steps` (default 200,000): when the budget is exhausted the run is
**aborted** with a clear message instead of hanging. The same input is
instant for the NFA engine — that contrast is the whole lesson.

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
alphabetic escapes (e.g. `\b`, `\q`) are rejected as pattern errors rather
than silently ignored. There are no backreferences, look-around, or bounded
repetition — keeping the NFA construction textbook-clean.

## Options

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
the backtracking engine at `--max-steps` calls, so an accidental
exponential pattern can never hang the process.

## Development

```bash
python3 -m unittest discover -s regexplorer/tests
```

The 63 tests cover the parser (literals, classes, ranges, escapes, anchors,
precedence, and every error case), NFA construction (reachability, epsilon
closures, the `*` back edge), both engines against a shared table of ~50
match/no-match cases, the documented shortest-vs-greedy difference,
catastrophic backtracking aborts, statistics, both renderers, and the CLI
surface (quiet output, exit codes, flags, validation).

## Design notes

- **Pure core, terminal on top** — parsing, NFA construction, both engines,
  and the diagram renderer are side-effect-free functions; only the CLI plays
  frames. Everything is driven by an explicit *trace*: a list of steps that
  the engines record and the renderer turns into frames, which makes the
  animation deterministic and trivially testable.
- **Leftmost start tracking in the NFA** — the set-based simulation carries,
  for every active state, the *minimum start offset* of a thread that reached
  it; epsilon-closure propagates it monotonically. That single-pass trick is
  what lets the engine find the leftmost (shortest) match without the O(n²)
  "try every start offset" loop.
- **CPS backtracking** — greedy repetition is implemented with explicit
  continuations so a `*` naturally "gives back" one character at a time when
  the rest of the pattern fails; an empty-match guard (`q > p`) keeps `(a*)*`
  from spinning.
- **Two honest engines** — Regexplorer deliberately keeps the NFA and
  backtracking semantics *different* rather than papering over them, and
  documents the difference, because that difference *is* the educational
  content: linear time vs. exponential blow-up, and where it comes from.
