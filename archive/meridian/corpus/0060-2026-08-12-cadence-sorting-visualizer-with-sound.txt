# Cadence

A small, dependency-free Python CLI that animates classic sorting algorithms
live in the terminal as ASCII bars **and** sonifies every comparison and swap
as a pitch-mapped tone — turning an algorithm run into a *musical* performance.
Watch bubble sort's largest values climb, *hear* quicksort's partitioning
thrash, and hear why O(n log n) beats O(n²). It runs on nothing but the Python
standard library (`argparse`, `math`, `os`, `random`, `shutil`, `sys`, `time`,
`wave`, `array`, `dataclasses`).

## What Was Built

A single Python package (`cadence/cadence.py`, ~1200 lines) with a
trace-first architecture and a thin CLI on top:

- **Nine sorting algorithms from scratch** — bubble, insertion, selection,
  quicksort with **Hoare** partitioning (middle pivot) and with **Lomuto**
  partitioning (last-element pivot), bottom-up merge sort, heapsort, cocktail
  (bidirectional bubble) sort, and bogo sort for fun. Both quicksorts are
  iterative (explicit stack, larger-subarray-first) and merge is bottom-up, so
  `--size 1000` can never hit Python's recursion limit.
- **Trace-first event model** — every algorithm is a generator that drives a
  `Tracer`, which mutates the working array and returns one `Event` per
  observable action (`compare`, `swap`, `write`, plus markers for the sorted
  prefix, pivot, sweep pointer and partition boundary). The *same*
  deterministic event stream feeds the live stats, the WAV sonification and the
  animation, so everything stays in lock-step and a run is fully reproducible
  from its seed.
- **Honest stats accounting** — the tracer counts comparisons, swaps, reads and
  writes (accesses = reads + writes), so the per-frame stats line is exact, not
  estimated: watch an O(n²) counter run away while a merge sort stays flat.
- **ASCII bar renderer** — a `FrameRenderer` replays events onto its own array
  copy and draws the list as a height-scaled bar chart (columns auto-bucket
  when n exceeds the terminal width). Green marks the finalized sorted prefix,
  yellow the current compare pair, red a single write, magenta the pivot, cyan
  the sweep pointer and blue a partition boundary — with a live stats line and
  legend under each frame.
- **Pitch-mapped sonification** — every compare/swap/write rings out a short
  sine/triangle note whose frequency maps the array value onto two octaves
  (220–880 Hz), so an ascending sort audibly "rises". `--sound wav` renders the
  whole run to a WAV file (default `cadence.wav`), auto-scaling so a run lasts
  ~15 seconds — bubble sort's song is long and labored, merge sort's is short
  and crisp, and that *duration difference is the complexity lesson*.
  `--sound bell` streams live terminal beeps; `--sound none` is silent. Audio
  is hard-bounded by `--max-audio` (truncates with a warning instead of writing
  a giant file).
- **`--race` scorecard** — runs every algorithm head-to-head on the same seeded
  input and prints a side-by-side table (compares, swaps, reads, writes,
  accesses, time). With `--sound wav` it writes one song per algorithm
  (`race.bubble.wav`, `race.merge.wav`, …) so you can literally *listen* to why
  bubble sort loses. Bogo sort is auto-skipped above size 9.
- **Script-friendly CLI** — `--quiet` emits one compact summary line with
  distinct exit codes (0 success, 2 error, 130 interrupted); `--list`,
  `--no-animate`, `--seed`, `--speed`, `--tempo`, `--chars` and `--color`
  round out the surface.

## Why

The repo already held Markov music (Arpeggio), cellular automata
(Automatarium), a genetic algorithm (Homunculus), an Enigma cipher (Rotoria),
raycasting (Shaftcast), L-systems (Fernwald), a regex engine (Regexplorer) and
a QR generator (Qubicle) — but nothing touched sorting algorithms or
data-structure visualization. Cadence fills that niche and combines **two
senses** (sight + sound) to teach how a sort actually proceeds: you can *hear*
bubble sort's early small values, *hear* quicksort's partitioning thrash, and
*hear* why O(n log n) beats O(n²). It is an algorithm showcase and a small
educational tool in one, exactly the niche the issue proposed.

## How It Works

- **Event stream** — each algorithm yields `Event(kind, a, b, value, result)`
  objects. `compare` records both positions, the value at `a` and the
  comparison sign; `swap`/`write` mutate the array; marker events (`sorted`,
  `pivot`, `sweep`, `boundary`) carry render state. Because the stream is
  regenerated on demand from `make_run(algo, size, seed)` (fresh seeded shuffle
  + seeded RNG for bogo), the run is consumed in passes — count, then audio,
  then frames — without ever storing the trace in memory.
- **Sorting details worth noting** — Hoare partitions on the middle value and
  returns the boundary `j` (recurse `[lo..j]`, `[j+1..hi]`); Lomuto pivots on
  the last element and returns the pivot's final index. Merge uses an auxiliary
  buffer with runs merged and written back in place, so it is swap-free by
  construction (a nice invariant the tests assert). Heap builds a max-heap then
  swaps the root to the sorted end and sifts down. Bogo does a Fisher–Yates
  shuffle after each failed sortedness check, counting attempts.
- **Pitch mapping** — `value_to_freq(value, max_value)` maps `1..n` onto
  `F_MIN·(F_MAX/F_MIN)^frac` (exponential so octaves are perceptually even).
  Notes are synthesized per-sample with a 2 ms attack and exponential decay;
  compares are sine (+ 2nd harmonic), swaps a triangle-ish wave at higher gain
  so they read as the beat.
- **WAV self-scaling** — `compute_note_seconds(total_events, tempo)` clamps
  `TARGET_AUDIO_SECONDS / events` to `[0.006, 0.25]` so short runs get long
  notes and huge runs stay audible, then the `WavWriter` streams notes up to a
  `--max-audio` frame budget. The 16-bit mono PCM output is written with the
  stdlib `wave` module.
- **Rendering** — columns map contiguous position ranges when `n` exceeds the
  terminal width; column height is the range maximum scaled to `--rows`.
  Highlight precedence per column: compare/write > pivot > sweep > boundary >
  sorted > normal. Frames are strings printed with an ANSI clear + sleep on a
  TTY, or dumped sequentially with `--no-animate`.
- **Reproducibility** — same seed → same shuffled input → identical event
  stream, identical stats, and byte-identical WAV output (the test suite
  asserts this).

## Key Files

- `cadence/cadence.py` — the whole tool: event model, tracer, the nine sort
  generators, pitch mapping, note synthesis, `WavWriter`, `FrameRenderer`,
  run orchestration (count / audio / animate passes), the race scorecard, and
  the argument parser.
- `cadence/__main__.py` + `cadence/__init__.py` — package entry points for
  `python3 -m cadence` and the public exports.
- `cadence/README.md` — project README with quick-start, the event-highlight
  legend, the sound explanation, the algorithm table, the option reference and
  design notes.
- `cadence/tests/test_cadence.py` — 36 stdlib-`unittest` tests covering every
  algorithm's correctness and permutation preservation across many sizes,
  determinism of stats/events/WAV bytes, stats accounting, pitch mapping and
  note-length clamping, WAV validity and truncation, the renderer's
  replay-to-sorted and frame building, and the full CLI surface.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- **Trace-first is the payoff** — because the algorithm and the presentation
  are decoupled by an explicit event stream, the renderer and the audio writer
  never need to re-derive what the algorithm "means": a `compare` event is a
  yellow frame highlight *and* a pitch-mapped note *and* one increment of the
  comparisons counter, all from the same object.
- **One-pass memory safety** — the trace is never stored; each pass re-runs the
  generator. Combined with `--max-audio` and the bogo size cap, nothing in the
  tool can hang or balloon, even at `--size 1000`.
- **Default experience** — `python3 -m cadence` animates bubble sort on 40
  elements and writes `cadence.wav`; `--race --size 100 --sound wav --out
  race.wav` then lets you *listen* to the O(n²) vs O(n log n) difference as
  file lengths.
- **Name origin** — "Cadence" is the rhythm and pitch pattern of a run, and a
  memorable one-word name in the style of Arpeggio, Automatarium, Homunculus,
  Rotoria, Shaftcast, Fernwald, Regexplorer and Qubicle — no collisions for
  future ideation agents.
