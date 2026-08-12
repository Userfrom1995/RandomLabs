# Cadence — watch and hear sorting algorithms come alive in the terminal

**Cadence** is a small, dependency-free Python CLI that **animates classic
sorting algorithms live in the terminal as ASCII bars** and **sonifies every
comparison and swap** as a pitch-mapped tone — turning an algorithm run into a
*musical* performance. Watch bubble sort's largest values climb, *hear*
quicksort's partitioning thrash, and hear why O(n log n) beats O(n²).

It runs on nothing but the Python standard library (`argparse`, `math`, `os`,
`random`, `shutil`, `sys`, `time`, `wave`, `array`, `dataclasses`) — no
dependencies, no build step.

```text
python3 -m cadence
python3 -m cadence --algo quick-hoare --size 80 --seed 42
python3 -m cadence --race --size 64
```

---

## What it is

- **Nine algorithms from scratch** — bubble, insertion, selection, quicksort
  (Hoare and Lomuto partitioning), bottom-up merge sort, heapsort, cocktail
  sort, and bogo sort for fun. Both quicksorts are iterative and merge is
  bottom-up, so `--size 1000` never blows the recursion stack.
- **Live bar-chart animation** — the list is drawn as a bar chart and the sort
  is replayed one *event* at a time. Green marks the finalized sorted prefix,
  yellow the current compare pair, red a single write, magenta the pivot, cyan
  the sweep pointer and blue a partition boundary, with a live stats line
  (compares, swaps, reads, writes, accesses, time) under every frame.
- **Pitch-mapped sonification** — every compare/swap/write rings out a note
  whose frequency maps the array value onto two octaves, so an ascending sort
  audibly "rises". `--sound wav` renders the whole run to a WAV file that
  auto-scales to ~15 seconds — bubble sort's song is long and labored, merge
  sort's is short and crisp, and that *duration difference is the complexity
  lesson*. `--sound bell` streams live terminal beeps; `--sound none` is silent.
- **`--race` scorecard** — runs every algorithm head-to-head on the same seeded
  input and prints a side-by-side table. With `--sound wav` it writes one song
  per algorithm (`race.bubble.wav`, `race.merge.wav`, …) so you can literally
  *listen* to why O(n²) loses.
- **Deterministic and honest** — the same seed produces the same input, the
  same event stream, the same stats, and byte-identical audio. Nothing hangs or
  balloons: audio is bounded by `--max-audio`, bogo is capped at size 9.

## Running it

Cadence is a Python package in `cadence/`. Python 3.8+ is all you need.

```bash
# Animate bubble sort with sound (needs a TTY; writes cadence.wav)
python3 -m cadence

# A different algorithm, a bigger list, a fixed seed
python3 -m cadence --algo quick-hoare --size 80 --seed 42

# Head-to-head scorecard of every algorithm on the same input
python3 -m cadence --race --size 64

# List the available algorithms
python3 -m cadence --list

# Render to a file you can play anywhere
python3 -m cadence --algo selection --size 40 --seed 3 --sound wav --out selection.wav

# Silent, script-friendly summary
python3 -m cadence --algo merge --size 100 --seed 7 --sound none --quiet
```

The single file also runs directly: `python3 cadence/cadence.py --help`.

### Running the tests

```bash
python3 -m unittest discover -s cadence/tests
```

36 tests cover every algorithm's correctness and permutation preservation,
determinism of stats / event streams / WAV bytes, the stats accounting, pitch
mapping and note-length clamping, WAV validity and truncation, the renderer's
replay-to-sorted and frame building, and the full CLI surface.

## What you're watching

```text
Cadence · bubble · n=40 · seed=42 · sound: wav → cadence.wav · event 42/781
    █████  ██ █ ██  █  ██ ██ ██ ██ ██
    ...
    ────────────────────────────────────
    values: 5 10 7 6 15 18 19 2 3 16 ...
    ▸ compare 3 vs 4 (6 vs 15)
    stats: compares 42 · swaps 13 · reads 110 · writes 26 · accesses 136 · 1.02s
    legend: green=sorted · yellow=compare · red=write · magenta=pivot · cyan=sweep · blue=boundary
```

- **green** — the sorted prefix that has been finalized
- **yellow** — the pair currently being compared
- **red** — a single position being written (insertion shifts, merge write-back)
- **magenta** — the current quicksort pivot
- **cyan** — the current sweep / scanning pointer
- **blue** — a partition boundary

## The sound

| Mode | What you get |
| --- | --- |
| `--sound wav` (default) | The whole run rendered to a WAV file. Compares are sine notes, swaps are triangle notes (the beat), writes are quieter. Pitch maps value → frequency, so the sort audibly "rises" as it converges. Auto-scales so a run lasts ~15s. |
| `--sound bell` | Live terminal beeps as the animation runs (rhythm only — pitch needs the WAV; most terminals have a fixed-pitch bell). |
| `--sound none` | Silent. |

```bash
# Compare the *length* of each algorithm's song on the same input
python3 -m cadence --race --size 100 --sound wav --out race.wav
# writes race.bubble.wav, race.merge.wav, ... — hear bubble sort take forever
```

## Algorithms

| Name | Complexity | What you see |
| --- | --- | --- |
| `bubble` | O(n²) | The largest value bubbles to the end of each pass; the sorted prefix grows from the right. |
| `insertion` | O(n²) | A sorted prefix grows left-to-right as each key slides home, shifting writes in red. |
| `selection` | O(n²) | A sweep pointer scans for the smallest remaining value, then parks it on the left. |
| `quick-hoare` | O(n log n) avg | Hoare partitioning on a middle pivot (magenta) with blue boundaries. |
| `quick-lomuto` | O(n log n) avg | Lomuto partitioning on a last-element pivot (magenta). |
| `merge` | O(n log n) | Bottom-up merge sort; watch runs merge and get written back through the buffer. |
| `heap` | O(n log n) | Build a max-heap, then extract the root to the sorted end and sift down. |
| `cocktail` | O(n²) | Bidirectional bubble sort shrinking the range from both ends. |
| `bogo` | O((n+1)!) | Shuffle until sorted — a running joke for tiny lists only (capped at size 9). |

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `--algo NAME` | `bubble` | Algorithm to run (`--list` for all; alias `quick` → `quick-hoare`, or `all` for the scorecard). |
| `--size N` | `40` | Number of elements to sort (2–1000; bogo is capped at 9). |
| `--speed FPS` | `30` | Animation speed in events/second (0 = as fast as possible). |
| `--seed N` | random | Seed for the input permutation (reproducible runs & audio). |
| `--sound MODE` | `wav` | `wav`, `bell`, or `none`. |
| `--out PATH` | `cadence.wav` | WAV output path (in `--race` mode: `<stem>.<algo><ext>`). |
| `--tempo N` | auto | Fixed notes/second for the WAV (default auto-scales a run to ~15s). |
| `--max-audio SECS` | `30` | Hard cap on generated audio length (truncates with a warning). |
| `--race` | off | Run every algorithm head-to-head and print a scorecard. |
| `--list` | off | List the available algorithms and exit. |
| `--no-animate` | off | Print every frame without screen clears or delays. |
| `--quiet` | off | One compact summary line only. |
| `--color` | `auto` | `auto` (TTY only), `always`, or `never`. |
| `--chars` | `blocks` | `blocks` (█) or `ascii` (#) bars. |
| `--rows N` | `12` | Height of the bar chart. |
| `--version` | | Print the version and exit. |

Exit codes: `0` = success, `2` = usage/validation error, `130` = interrupted.
Safety: bogo sort is refused above size 9, audio is capped at `--max-audio`
seconds, and quicksort/merge never recurse on the interpreter stack, so no
command can hang or allocate unbounded memory.

## How it works

### 1. The event stream

Each algorithm is a generator that drives a `Tracer`, which mutates the working
array and returns one `Event(kind, a, b, value, result)` per observable
action — `compare`, `swap`, `write`, plus markers (`sorted`, `pivot`, `sweep`,
`boundary`). A `compare` event is simultaneously a yellow frame highlight, a
pitch-mapped note, and one increment of the comparisons counter. The same
deterministic stream feeds the stats, the WAV and the animation, so everything
stays in lock-step.

### 2. Stats accounting

The tracer counts every array access through `read`, `compare`, `swap` and
`write`, so the per-frame line is exact: compares, swaps, reads, writes and
accesses (= reads + writes). Watch an O(n²) counter run away while a merge sort
stays flat.

### 3. Sonification

`value_to_freq(value, max_value)` maps `1..n` exponentially onto two octaves
(220–880 Hz). Notes are synthesized per-sample with a 2 ms attack and an
exponential decay; `compute_note_seconds(events, tempo)` auto-scales so a whole
run lasts ~15 seconds (or honors `--tempo`). The `WavWriter` streams 16-bit
mono PCM to a WAV file, bounded by `--max-audio` so an O(n²) sort on a large
list truncates with a warning instead of producing an unbounded file.

### 4. Rendering

`FrameRenderer` replays events onto its own array copy and draws the list as a
bar chart whose columns auto-bucket when `n` exceeds the terminal width.
Highlight precedence per column: compare/write > pivot > sweep > boundary >
sorted > normal. Frames are strings printed with an ANSI clear + sleep on a
TTY, or dumped sequentially with `--no-animate`.

### 5. Reprocessing without storing

Because the stream is regenerated on demand from `make_run(algo, size, seed)`
(a fresh seeded shuffle plus a seeded RNG for bogo), a run is consumed in
passes — count, then audio, then frames — without ever storing the trace in
memory. That is why `--size 1000` stays cheap and why the output is
byte-for-byte reproducible.

## Project layout

```text
cadence/
  cadence.py             # the whole tool: events, sorts, audio, renderer, CLI
  __main__.py            # enables `python -m cadence`
  __init__.py            # package marker / public exports
  README.md              # project quick-start and option reference
  tests/
    test_cadence.py      # 36 stdlib-unittest tests
docs/
  index.md               # this documentation page (source)
  index.html             # rendered documentation page
ideas/
  2026-08-12-cadence-sorting-visualizer-with-sound.md
```

## Design notes

- **Trace-first architecture** — the algorithm and the presentation are
  decoupled by an explicit event stream, so the renderer and the audio writer
  never re-derive what the algorithm "means": one `Event` drives the highlight,
  the note and the counter together. This is what makes the animation
  deterministic and trivially testable.
- **One-pass memory safety** — the trace is never stored; each pass re-runs the
  generator. Combined with `--max-audio` and the bogo size cap, nothing in the
  tool can hang or balloon, even at `--size 1000`.
- **Zero recursion-depth risk** — both quicksorts use an explicit stack with
  larger-subarray-first ordering and merge is bottom-up, so the largest legal
  input cannot hit Python's recursion limit.
- **The duration is the lesson** — Cadence deliberately makes a run's WAV
  length reflect its event count, so bubble sort sounds long and labored while
  merge sort stays short and crisp. The same input, two songs, and the
  difference *is* the complexity.
