# Regexplorer

A small, dependency-free Python CLI that implements a regular-expression engine
from scratch and renders it as a living diagram: parse a pattern into an AST,
build the Thompson NFA, draw the state machine in the terminal as an ASCII
graph, and step a string through it frame-by-frame to watch which transitions
fire, where backtracks happen, and whether the match succeeds. It runs on
nothing but the Python standard library (`argparse`, `collections`,
`itertools`, `math`, `sys`, `time`).

## What Was Built

A single Python package (`regexplorer/regexplorer.py`, ~1500 lines) with a
pure core and a thin CLI on top:

- **Parser + AST** — `parse()` tokenizes the pattern and runs a
  recursive-descent parser with the standard precedence chain (alternation →
  sequence → repetition). Every construct becomes a typed node (`Lit`,
  `AnyChar`, `CharClass`, `Anchor`, `Seq`, `Alt`, `Star`, `Plus`, `Opt`), and
  `_pattern_str` can render an AST back into a regex-like string for round-trip
  tests. Unknown escapes like `\b` are rejected as errors instead of silently
  ignored.
- **Thompson NFA builder** — `build_nfa(ast)` is the textbook fragment
  algebra: each node builds a small state graph and returns its *start* and
  *accept* states; parents wire fragments together with ε-transitions. A `*`
  gets a fresh loop-start state, an ε-split into and out of the child, and an
  ε **back-edge** from the child's accept to the loop start — the edge every
  NFA test pokes at.
- **The NFA engine** (default) — `nfa_simulate()` keeps a *set of active
  states* and advances it one character at a time. Each active state carries
  the *minimum start offset* of a thread that reached it (propagated through
  the ε-closure), so the leftmost *shortest* match falls out of a single pass —
  no O(n²) "try every start offset" loop. Runs in O(n·m).
- **The backtracking engine** — `backtrack_simulate()` is written in
  continuation-passing style: a `Star`/`Plus` consumes greedily and returns a
  continuation that re-enters the loop, so when the rest of the pattern fails
  the continuation naturally "gives back" one character at a time. Greedy,
  leftmost *longest* matching like Python's `re`. An empty-match guard
  (`q > p`) keeps `(a*)*` from spinning.
- **Trace-driven animation** — both engines record an explicit *trace* (every
  closure, fired transition, fresh thread, and backtrack), and the renderer
  replays it as frames. The default NFA view draws the machine with active
  states highlighted (`[n]`), the fired transitions, a caret on the input, and
  a stats line; the backtracking view shows the AST as a tree with the working
  node marked and an explicit `branch 0 failed; trying the next alternative`.
  Because the animation is pure function-of-trace, it is deterministic and
  unit-testable.
- **ASCII diagram renderer** — a dependency-free `spring_layout` (balanced
  forces on the ε skeleton) lays the machine out left-to-right; the stroke
  renderer draws it onto a character grid with rounded corners for cycles.
  `--diagram-only` prints just the machine.
- **Catastrophic backtracking demo** — `(a+)+b` on a run of `a`s has
  exponentially many ways to split the input, so backtracking explodes (bounded
  by `--max-steps`, default 200,000, which **aborts** with a clear message) yet
  the same input is instant for the NFA engine. One command apart, and that
  contrast is the lesson.
- **Script-friendly CLI** — `--quiet` emits one machine-readable line
  (`MATCH a-b`, `NO MATCH`, `ABORTED n`) with distinct exit codes; patterns and
  inputs are capped (200 / 2,000 chars) so nothing can hang.

## Why

The repo so far held Markov music (Arpeggio), cellular automata
(Automatarium), a genetic algorithm (Homunculus), an Enigma cipher (Rotoria),
minimax tic-tac-toe, a raycasting engine (Shaftcast), a racing game, and an
L-system garden (Fernwald) — but nothing from formal language theory, the
backbone of compilers and text processing. Regexplorer turns one of the driest
CS topics into a visual, interactive demo: you can literally watch a machine
thread through input, watch a greedy quantifier give characters back, and watch
a catastrophic pattern blow up — an algorithm showcase and a small educational
tool in one, exactly the niche the issue proposed.

## How It Works

- **Parsing** (`parse`) — recursive descent over a token stream, precedence
  alternation → concat → repetition, `[`-class parsing with ranges, negation,
  and predefined classes, and a strict escape table (control chars plus
  escaped metacharacters; anything else alphabetic is a `PatternError`).
- **Thompson construction** (`build_nfa`) — a `Fragment(start, accept)` flows
  up the AST: `Seq` fuses child fragments with an ε edge, `Alt` ε-splits start
  into each branch and ε-merges their accepts, `Star` adds the loop-start and
  back edge, and `^`/`$` compile to special anchor states.
- **NFA simulation** (`nfa_simulate`) — per input offset: take the ε-closure
  of the active set, then advance every state that can consume the character,
  threading each state's minimum start offset through the closure; a fresh
  thread starts at offset 0 if the start state is reachable at the current
  offset. First accepting thread → immediate stop (leftmost shortest). The
  anchor states consume no character but filter the thread offsets by position.
- **Backtracking** (`backtrack_simulate`) — recursive match over the AST with
  continuations. `Seq` passes a continuation down; `Alt` records a backtrack
  point at the next branch; `Star`/`Plus` loop greedily and capture a
  continuation so "give back one char" is just calling the continuation with
  the previous offset. Step budget aborts the run with a `BacktrackAbort`.
- **Layout + rendering** — the NFA's ε edges are replaced by light springs and
  the state positions relaxed until stable, then snapped to a grid; each
  transition is stroked with a corner-turning glyph (e.g. a `*` back edge
  becomes a rounded loop). The trace is replayed into frames, each rendered to
  a string and printed (with a clear + sleep on a TTY).
- **Stats** — states visited, steps taken, max active-set size (NFA), and step
  budget consumed (backtrack) are tracked throughout and shown per frame.

## Key Files

- `regexplorer/regexplorer.py` — the entire engine + CLI: tokenizer, parser,
  AST, Thompson NFA builder, both simulators, spring layout, diagram renderer,
  AST tree renderer, frame player, and argument parser.
- `regexplorer/__main__.py` + `regexplorer/__init__.py` — package entry points
  for `python3 -m regexplorer` and the public exports.
- `regexplorer/README.md` — project README with quick-start, the two-engine
  table, pattern-syntax reference, option table, and design notes.
- `regexplorer/tests/test_regexplorer.py` — 63 stdlib-`unittest` tests covering
  the parser, NFA construction, both engines against a shared ~50-case match
  table, the shortest-vs-greedy difference, catastrophic backtracking aborts,
  statistics, both renderers, and the CLI surface.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- **Everything is pure at the core** — parsing, NFA construction, both engines,
  and the diagram renderer are side-effect-free; the only impure code is the
  CLI frame player. Combined with the explicit trace, that made the 63-test
  suite straightforward and keeps the door open for reuse (e.g. a web front
  end could run the same engines and render into a `<canvas>`).
- **The two engines disagree on purpose** — `a(b|c)*` on `abccbd` gives
  `MATCH 0-1` (NFA, shortest) vs `MATCH 0-5` (backtrack, greedy). Regexplorer
  keeps that difference visible and documented rather than papering over it,
  because it *is* the educational content: linear vs. exponential, shortest vs.
  greedy, and where each comes from.
- **Default experience** — `python3 -m regexplorer 'a(b|c)*d' 'abccbd'` renders
  the machine once, then animates the match frame by frame; `--engine backtrack
  'ab|ac' 'ac'` shows a branch fail and the engine try the alternative;
  `--engine backtrack '(a+)+b' 'aaaa…a'` shows the abort that proves
  catastrophic backtracking.
- **Scope choice** — no backreferences, look-around, or bounded repetition,
  which keeps the NFA construction textbook-clean and the docs digestible;
  unknown escapes are loud errors rather than silent behavior.
- **Name origin** — "Regexplorer" blends *regex* and *explorer*, evoking an
  engine you explore through. It is distinct from Arpeggio, Automatarium,
  Homunculus, Rotoria, Shaftcast, Fernwald, and Qubicle so future ideation
  agents won't collide.
