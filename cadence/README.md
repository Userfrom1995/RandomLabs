# Cadence

A small, dependency-free Python CLI that **animates classic sorting algorithms
live in the terminal as ASCII bars** and **sonifies every comparison and swap**
as a pitch-mapped tone — turning an algorithm run into a *musical* performance.
Watch bubble sort's largest values climb, *hear* quicksort's partitioning
thrash, and hear why O(n log n) beats O(n²).

Nothing but the Python standard library (`argparse`, `math`, `os`, `random`,
`shutil`, `sys`, `time`, `wave`, `array`, `dataclasses`) — no dependencies,
no build step.

## Quick start

```bash
# Animate bubble sort with sound (needs a TTY; writes cadence.wav)
python3 -m cadence

# A different algorithm, a bigger list, a fixed seed
python3 -m cadence --algo quick-hoare --size 80 --seed 42

# Head-to-head scorecard of every algorithm on the same input
python3 -m cadence --race --size 64

# Silent, script-friendly summary
python3 -m cadence --algo merge --size 100 --seed 7 --sound none --quiet
```

The single file also runs directly: `python3 cadence/cadence.py --help`.

## What you're watching

Cadence draws the list as a bar chart and replays the algorithm one **event**
at a time. Colored highlights mark what is happening (colors on a TTY only):

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

The bottom line tracks live **comparisons, swaps, reads, writes, accesses and
elapsed time**, so you can watch an O(n²) algorithm's counters run away while a
merge sort stays flat.

## The sound

Every compare, swap and write rings out a short note whose **pitch maps to the
value being touched**: high values are high notes, low values are low notes,
so an ascending sort audibly "rises" as it converges. Compares are sine notes,
swaps are triangle notes (the beat you can clap along to), writes are quieter.

- `--sound wav` (default) — renders the whole run to a WAV file (default
  `cadence.wav`). The wav self-scales so a run lasts roughly 15 seconds, so
  bubble sort sounds long and labored while merge sort stays short and crisp —
  the duration difference *is* the complexity lesson.
- `--sound bell` — live terminal beeps as the animation runs (rhythm only;
  pitch needs the WAV, most terminals have a fixed-pitch bell).
- `--sound none` — silent.

```bash
# Render to a file you can play anywhere
python3 -m cadence --algo selection --size 40 --seed 3 --sound wav --out selection.wav

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
| `bogo` | O((n+1)!) | Shuffle until sorted — a running joke for tiny lists only. |

## Options

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

## Development

```bash
python3 -m unittest discover -s cadence/tests
```

The 36 tests cover every algorithm's correctness and permutation preservation
across many sizes, determinism of stats, event streams and WAV bytes, the
stats accounting (reads/writes/accesses, bogo attempts), the pitch mapping and
note-length clamping, WAV validity (mono, 16-bit, frame counts, clipping) and
truncation, the renderer's replay-to-sorted and frame building for every size,
and the full CLI surface (quiet output, exit codes, aliases, race, validation).

## Design notes

- **Trace-first architecture** — each algorithm is a generator that drives a
  `Tracer`, which mutates the array and returns one `Event` per observable
  action. The same deterministic event stream feeds the stats, the WAV
  sonification and the animation, so everything stays in lock-step and the run
  is fully reproducible from the seed.
- **Zero recursion depth risk** — quicksort (both variants) uses an explicit
  stack with larger-subarray-first ordering, and merge sort is bottom-up, so
  `--size 1000` cannot blow the interpreter stack.
- **Honest audio accounting** — the WAV self-scales to a fixed target duration
  and is bounded by `--max-audio`, so an O(n²) sort on a large list can never
  produce an unbounded file; it truncates with a warning instead.
