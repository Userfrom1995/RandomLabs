#!/usr/bin/env python3
"""Cadence - a terminal sorting-algorithm visualizer with audio sonification.

Animate classic sorting algorithms live in the terminal as ASCII bars while
every comparison and swap rings out as a pitch-mapped tone, turning an
algorithm run into a musical performance. Watch bubble sort's largest values
climb, hear quicksort's partitioning thrash, and hear why O(n log n) beats
O(n^2).

Nothing but the Python standard library (argparse, math, os, random, shutil,
sys, time, wave, array, dataclasses). Run with ``--help`` for the full
option reference, or see the README and the ``docs/`` folder for details.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import shutil
import sys
import time
import wave
from array import array
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, TextIO, Tuple

__version__ = "1.0.0"

# --------------------------------------------------------------------------
# Tunables (deliberately named so tests and docs can reason about them).
# --------------------------------------------------------------------------

DEFAULT_SIZE = 40
MIN_SIZE = 2
MAX_SIZE = 1000
MAX_BOGO_SIZE = 9

DEFAULT_SPEED = 30.0            # animation events per second
DEFAULT_OUT = "cadence.wav"
DEFAULT_ROWS = 12

TARGET_AUDIO_SECONDS = 15.0     # wav self-scales so a whole run lasts ~this long
MIN_NOTE_SECONDS = 0.006
MAX_NOTE_SECONDS = 0.25
DEFAULT_MAX_AUDIO_SECONDS = 30.0

SAMPLE_RATE = 44100
F_MIN = 220.0
F_MAX = 880.0
PEAK_AMPLITUDE = 0.45
COMPARE_GAIN = 1.0
SWAP_GAIN = 1.25
WRITE_GAIN = 0.70
ATTACK_SECONDS = 0.002
DECAY_TIME = 0.40
HARMONIC_GAIN = 0.30

BAR_BLOCK = "\u2588"
BAR_ASCII = "#"
BASELINE_BLOCK = "\u2500"
BASELINE_ASCII = "-"

COLOR_CODES = {
    "compare": "33",    # yellow
    "write": "31",      # red
    "pivot": "35",      # magenta
    "sweep": "36",      # cyan
    "boundary": "34",   # blue
    "sorted": "32",     # green
    "accent": "32",
    "dim": "2",
}

# --------------------------------------------------------------------------
# Core data model
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Event:
    """One observable action of a running sort.

    ``a``/``b`` are array positions (``b == -1`` when unused), ``value`` is the
    array value that drives the sound pitch, and ``result`` is the comparison
    sign ``arr[a] - arr[b]`` (or ``arr[a] - key`` for a key comparison).
    """

    kind: str  # compare | swap | write | sorted | pivot | sweep | boundary | shuffle | done
    a: int = -1
    b: int = -1
    value: int = 0
    result: int = 0

    @property
    def toned(self) -> bool:
        """Whether this event should produce a sound."""
        return self.kind in ("compare", "swap", "write")


@dataclass
class Stats:
    comparisons: int = 0
    swaps: int = 0
    reads: int = 0
    writes: int = 0
    bogo_attempts: int = 0

    @property
    def accesses(self) -> int:
        return self.reads + self.writes


class Tracer:
    """Mutates the working array while recording stats and events.

    Algorithms are generators that drive the tracer: every array read, compare,
    swap and write goes through this object so it can be counted, and every
    action is returned as an :class:`Event` for the renderer and the audio
    pipeline. Determinism is guaranteed: with a fixed seed the exact same event
    stream is produced on every replay.
    """

    def __init__(self, arr: List[int], rng: Optional[random.Random] = None) -> None:
        self.arr = arr
        self.rng = rng
        self.stats = Stats()

    def read(self, pos: int) -> int:
        self.stats.reads += 1
        return self.arr[pos]

    def compare(self, a: int, b: int) -> Event:
        self.stats.comparisons += 1
        self.stats.reads += 2
        va, vb = self.arr[a], self.arr[b]
        return Event("compare", a, b, va, va - vb)

    def compare_key(self, a: int, value: int) -> Event:
        """Compare ``arr[a]`` against a cached ``value`` (1 read)."""
        self.stats.comparisons += 1
        self.stats.reads += 1
        return Event("compare", a, -1, self.arr[a], self.arr[a] - value)

    def swap(self, a: int, b: int) -> Event:
        self.stats.swaps += 1
        self.stats.reads += 2
        self.stats.writes += 2
        self.arr[a], self.arr[b] = self.arr[b], self.arr[a]
        return Event("swap", a, b, self.arr[a])

    def write(self, pos: int, value: int) -> Event:
        self.stats.writes += 1
        self.arr[pos] = value
        return Event("write", pos, -1, value)

    def mark_sorted(self, a: int, b: int) -> Event:
        return Event("sorted", a, b)

    def mark_pivot(self, pos: int) -> Event:
        return Event("pivot", pos, -1, self.arr[pos])

    def mark_sweep(self, pos: int) -> Event:
        return Event("sweep", pos, -1, self.arr[pos])

    def mark_boundary(self, pos: int) -> Event:
        return Event("boundary", pos, -1, self.arr[pos])

    def mark_shuffle(self) -> Event:
        return Event("shuffle")

    def mark_done(self) -> Event:
        return Event("done")


# --------------------------------------------------------------------------
# The sorting algorithms
# --------------------------------------------------------------------------


def bubble(tr: Tracer):
    """Bubble sort: the largest value bubbles to the end of each pass."""
    arr, n = tr.arr, len(tr.arr)
    for i in range(n - 1, 0, -1):
        for j in range(i):
            ev = tr.compare(j, j + 1)
            yield ev
            if ev.result > 0:
                yield tr.swap(j, j + 1)
        yield tr.mark_sorted(i, n - 1)
    yield tr.mark_sorted(0, n - 1)


def insertion(tr: Tracer):
    """Insertion sort: grow a sorted prefix by sliding each new key home."""
    arr, n = tr.arr, len(tr.arr)
    yield tr.mark_sorted(0, 0)
    for i in range(1, n):
        key = tr.read(i)
        j = i - 1
        yield tr.mark_sorted(0, i - 1)
        yield tr.mark_sweep(i)
        while j >= 0:
            ev = tr.compare_key(j, key)
            yield ev
            if ev.result <= 0:
                break
            yield tr.write(j + 1, arr[j])
            j -= 1
        if j + 1 != i:
            yield tr.write(j + 1, key)
    yield tr.mark_sorted(0, n - 1)


def selection(tr: Tracer):
    """Selection sort: repeatedly pick the smallest remaining value."""
    arr, n = tr.arr, len(tr.arr)
    for i in range(n - 1):
        if i > 0:
            yield tr.mark_sorted(0, i - 1)
        min_idx = i
        yield tr.mark_sweep(min_idx)
        for j in range(i + 1, n):
            yield tr.mark_sweep(j)
            ev = tr.compare(j, min_idx)
            yield ev
            if ev.result < 0:
                min_idx = j
        if min_idx != i:
            yield tr.swap(i, min_idx)
    yield tr.mark_sorted(0, n - 1)


def _hoare_partition(tr: Tracer, lo: int, hi: int):
    arr, mid = tr.arr, (lo + hi) // 2
    pivot = tr.read(mid)
    yield tr.mark_pivot(mid)
    i, j = lo, hi
    while True:
        while True:
            ev = tr.compare_key(i, pivot)
            yield ev
            if ev.result >= 0:
                break
            i += 1
        while True:
            ev = tr.compare_key(j, pivot)
            yield ev
            if ev.result <= 0:
                break
            j -= 1
        if i >= j:
            return j
        yield tr.swap(i, j)
        i += 1
        j -= 1


def quick_hoare(tr: Tracer):
    """Quicksort with Hoare partitioning on a middle pivot (iterative)."""
    arr = tr.arr
    stack = [(0, len(arr) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            if lo == hi:
                yield tr.mark_sorted(lo, hi)
            continue
        p = yield from _hoare_partition(tr, lo, hi)
        yield tr.mark_boundary(p)
        if (p - lo) < (hi - p):
            stack.append((p + 1, hi))
            stack.append((lo, p))
        else:
            stack.append((lo, p))
            stack.append((p + 1, hi))
    yield tr.mark_sorted(0, len(arr) - 1)


def _lomuto_partition(tr: Tracer, lo: int, hi: int):
    arr = tr.arr
    pivot = tr.read(hi)
    yield tr.mark_pivot(hi)
    i = lo
    yield tr.mark_sweep(i)
    for j in range(lo, hi):
        yield tr.mark_sweep(j)
        ev = tr.compare_key(j, pivot)
        yield ev
        if ev.result < 0:
            if i != j:
                yield tr.swap(i, j)
            i += 1
            yield tr.mark_sweep(i)
    if i != hi:
        yield tr.swap(i, hi)
    yield tr.mark_sweep(i)
    return i


def quick_lomuto(tr: Tracer):
    """Quicksort with Lomuto partitioning on a last-element pivot (iterative)."""
    arr = tr.arr
    stack = [(0, len(arr) - 1)]
    while stack:
        lo, hi = stack.pop()
        if lo >= hi:
            if lo == hi:
                yield tr.mark_sorted(lo, hi)
            continue
        p = yield from _lomuto_partition(tr, lo, hi)
        yield tr.mark_boundary(p)
        if (p - lo) < (hi - p):
            stack.append((p + 1, hi))
            stack.append((lo, p - 1))
        else:
            stack.append((lo, p - 1))
            stack.append((p + 1, hi))
    yield tr.mark_sorted(0, len(arr) - 1)


def merge(tr: Tracer):
    """Bottom-up (iterative) merge sort with an auxiliary buffer."""
    arr, n = tr.arr, len(tr.arr)
    tmp = [0] * n
    width = 1
    while width < n:
        for lo in range(0, n, width * 2):
            mid = min(lo + width, n)
            hi = min(lo + width * 2, n)
            if mid >= hi:
                continue
            yield tr.mark_boundary(lo)
            yield tr.mark_boundary(mid)
            yield tr.mark_boundary(hi - 1)
            i, j, k = lo, mid, lo
            while i < mid and j < hi:
                ev = tr.compare(i, j)
                yield ev
                if ev.result <= 0:
                    tmp[k] = tr.read(i)
                    i += 1
                else:
                    tmp[k] = tr.read(j)
                    j += 1
                k += 1
            while i < mid:
                tmp[k] = tr.read(i)
                i += 1
                k += 1
            while j < hi:
                tmp[k] = tr.read(j)
                j += 1
                k += 1
            for p in range(lo, hi):
                yield tr.write(p, tmp[p])
            yield tr.mark_sorted(lo, hi - 1)
        width *= 2
    yield tr.mark_sorted(0, n - 1)


def heap(tr: Tracer):
    """Heapsort: build a max-heap, then repeatedly extract the max to the end."""

    def sift_down(start: int, end: int):
        root = start
        while True:
            child = 2 * root + 1
            if child >= end:
                break
            yield tr.mark_sweep(root)
            if child + 1 < end:
                ev = tr.compare(child + 1, child)
                yield ev
                if ev.result > 0:
                    child += 1
            ev = tr.compare(child, root)
            yield ev
            if ev.result <= 0:
                break
            yield tr.swap(root, child)
            root = child

    arr, n = tr.arr, len(tr.arr)
    for start in range(n // 2 - 1, -1, -1):
        yield from sift_down(start, n)
    for end in range(n - 1, 0, -1):
        yield tr.swap(0, end)
        yield tr.mark_sorted(end, n - 1)
        yield from sift_down(0, end)
    yield tr.mark_sorted(0, n - 1)


def cocktail(tr: Tracer):
    """Cocktail (bidirectional bubble) sort, shrinking the range from both ends."""
    arr, n = tr.arr, len(tr.arr)
    lo, hi = 0, n - 1
    while lo < hi:
        for j in range(lo, hi):
            ev = tr.compare(j, j + 1)
            yield ev
            if ev.result > 0:
                yield tr.swap(j, j + 1)
        yield tr.mark_sorted(hi, n - 1)
        hi -= 1
        for j in range(hi, lo, -1):
            ev = tr.compare(j - 1, j)
            yield ev
            if ev.result > 0:
                yield tr.swap(j - 1, j)
        yield tr.mark_sorted(0, lo)
        lo += 1
    yield tr.mark_sorted(0, n - 1)


def bogo(tr: Tracer):
    """Bogo sort: shuffle until sorted. O((n+1)!) — for small lists only."""
    n = len(tr.arr)
    rng = tr.rng
    while True:
        tr.stats.bogo_attempts += 1
        sorted_ok = True
        for j in range(n - 1):
            ev = tr.compare(j, j + 1)
            yield ev
            if ev.result > 0:
                sorted_ok = False
        if sorted_ok:
            break
        yield tr.mark_shuffle()
        for j in range(n - 1, 0, -1):
            k = rng.randint(0, j)
            yield tr.swap(j, k)
    yield tr.mark_sorted(0, n - 1)
    yield tr.mark_done()


@dataclass(frozen=True)
class Algorithm:
    fn: Callable[[Tracer], object]
    complexity: str
    description: str


ALGORITHMS: Dict[str, Algorithm] = {
    "bubble": Algorithm(
        bubble,
        "O(n²)",
        "Repeatedly swap adjacent out-of-order pairs; the largest value bubbles to the end of each pass.",
    ),
    "insertion": Algorithm(
        insertion,
        "O(n²)",
        "Grow a sorted prefix by sliding each new key left to its place.",
    ),
    "selection": Algorithm(
        selection,
        "O(n²)",
        "Repeatedly scan for the smallest remaining value and park it on the left.",
    ),
    "quick-hoare": Algorithm(
        quick_hoare,
        "O(n log n) avg",
        "Quicksort with Hoare partitioning on a middle pivot (iterative).",
    ),
    "quick-lomuto": Algorithm(
        quick_lomuto,
        "O(n log n) avg",
        "Quicksort with Lomuto partitioning on a last-element pivot (iterative).",
    ),
    "merge": Algorithm(
        merge,
        "O(n log n)",
        "Bottom-up merge sort that repeatedly merges runs through an auxiliary buffer.",
    ),
    "heap": Algorithm(
        heap,
        "O(n log n)",
        "Build a max-heap, then repeatedly swap the root to the sorted end and sift down.",
    ),
    "cocktail": Algorithm(
        cocktail,
        "O(n²)",
        "Bidirectional bubble sort that shrinks the unsorted range from both ends.",
    ),
    "bogo": Algorithm(
        bogo,
        "O((n+1)!)",
        "Shuffle until sorted — a running joke; feasible for tiny lists only.",
    ),
}

ALIASES = {"quick": "quick-hoare", "all": None}


def resolve_algo(name: str) -> str:
    """Map a user-supplied name (with aliases) to a canonical registry key."""
    if name in ALGORITHMS:
        return name
    if name in ALIASES:
        if ALIASES[name] is None:
            raise ValueError(name)
        return ALIASES[name]
    raise KeyError(name)


# --------------------------------------------------------------------------
# Audio sonification
# --------------------------------------------------------------------------


def value_to_freq(value: int, max_value: int) -> float:
    """Map an array value (1..max_value) onto the [F_MIN, F_MAX] pitch range."""
    if max_value <= 1:
        return F_MIN
    frac = (value - 1) / (max_value - 1)
    frac = max(0.0, min(1.0, frac))
    return F_MIN * (F_MAX / F_MIN) ** frac


def compute_note_seconds(total_events: int, tempo: Optional[float]) -> float:
    """Per-note duration.

    With an explicit ``--tempo`` (notes/second) it is ``1/tempo``; otherwise the
    wav self-scales so that a whole run lasts about ``TARGET_AUDIO_SECONDS``,
    clamped to a sane range.
    """
    if tempo is not None:
        return 1.0 / max(1e-9, tempo)
    return min(MAX_NOTE_SECONDS, max(MIN_NOTE_SECONDS, TARGET_AUDIO_SECONDS / max(total_events, 1)))


def _note_samples(freq: float, note_seconds: float, kind: str) -> List[int]:
    """Render one 16-bit PCM note: sine (+ 2nd harmonic) with an AD-ish envelope."""
    n = int(note_seconds * SAMPLE_RATE)
    if freq <= 0 or n <= 0:
        return []
    gain = {
        "compare": COMPARE_GAIN,
        "swap": SWAP_GAIN,
        "write": WRITE_GAIN,
    }.get(kind, COMPARE_GAIN)
    attack = max(1, int(ATTACK_SECONDS * SAMPLE_RATE))
    step = 2.0 * math.pi * freq / SAMPLE_RATE
    decay = 1.0 / max(1.0, DECAY_TIME * n)
    samples: List[int] = []
    append = samples.append
    if kind == "swap":
        # Triangle-ish waveform so swaps stand out as the beat.
        for i in range(n):
            p = i * step
            env = (i / attack) if i < attack else 1.0
            if i >= attack:
                env *= math.exp(-(i - attack) * decay)
            tri = 2.0 / math.pi * math.asin(math.sin(p))
            v = 0.75 * tri + 0.25 * math.sin(p)
            append(int(PEAK_AMPLITUDE * gain * env * v * 32767))
    else:
        for i in range(n):
            p = i * step
            env = (i / attack) if i < attack else 1.0
            if i >= attack:
                env *= math.exp(-(i - attack) * decay)
            v = math.sin(p) + HARMONIC_GAIN * math.sin(2 * p)
            append(int(PEAK_AMPLITUDE * gain * env * v * 32767))
    return samples


class WavWriter:
    """Accumulates pitch-mapped notes into a mono 16-bit PCM WAV file.

    Bounded by ``max_frames`` so a pathological run (e.g. bubble sort on a large
    list) cannot produce an unbounded file; when the budget runs out the writer
    stops and reports truncation.
    """

    def __init__(self, note_seconds: float, max_value: int, max_frames: int) -> None:
        self.note_seconds = note_seconds
        self.max_value = max_value
        self.max_frames = max_frames
        self._samples: List[int] = []
        self.notes = 0
        self.frames = 0
        self.truncated = False

    def add(self, ev: Event) -> None:
        if not ev.toned:
            return
        if self.frames >= self.max_frames:
            self.truncated = True
            return
        freq = value_to_freq(ev.value, self.max_value)
        n = int(self.note_seconds * SAMPLE_RATE)
        take = min(n, self.max_frames - self.frames)
        if take <= 0:
            self.truncated = True
            return
        self._samples.extend(_note_samples(freq, take / SAMPLE_RATE, ev.kind))
        self.frames += take
        self.notes += 1

    def save(self, path: str) -> int:
        data = array("h", self._samples)
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SAMPLE_RATE)
            w.writeframes(data.tobytes())
        return len(data)


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------


def _paint(text: str, key: Optional[str], enabled: bool) -> str:
    if not enabled or key not in COLOR_CODES:
        return text
    return f"\x1b[{COLOR_CODES[key]}m{text}\x1b[0m"


class FrameRenderer:
    """Replays events onto its own array copy and turns each into a frame."""

    def __init__(
        self,
        arr: List[int],
        rows: int = DEFAULT_ROWS,
        cols: Optional[int] = None,
        color: bool = False,
        chars: str = "blocks",
    ) -> None:
        self.arr = arr[:]
        self.n = len(arr)
        self.rows = max(3, int(rows))
        self.max_value = max(arr) if arr else 1
        self.cols = max(1, min(self.n, int(cols) if cols else self.n))
        self.color = color
        self.bar = BAR_BLOCK if chars == "blocks" else BAR_ASCII
        self.baseline = BASELINE_BLOCK if chars == "blocks" else BASELINE_ASCII
        self.sorted_ranges: List[Tuple[int, int]] = []
        self.pivot: Optional[int] = None
        self.sweep: Optional[int] = None
        self.boundary: Optional[int] = None
        self.compare: Optional[Tuple[int, int]] = None
        self.write_pos: Optional[int] = None

    def apply(self, ev: Event) -> None:
        if ev.kind == "swap":
            self.arr[ev.a], self.arr[ev.b] = self.arr[ev.b], self.arr[ev.a]
        elif ev.kind == "write":
            self.arr[ev.a] = ev.value
        elif ev.kind == "sorted":
            self.sorted_ranges.append((ev.a, ev.b))
        elif ev.kind == "pivot":
            self.pivot = ev.a
        elif ev.kind == "sweep":
            self.sweep = ev.a
        elif ev.kind == "boundary":
            self.boundary = ev.a
        elif ev.kind == "compare":
            self.compare = (ev.a, ev.b)

    def _clear_transient(self) -> None:
        self.compare = None
        self.write_pos = None

    def _column_of(self, pos: int) -> int:
        return pos * self.cols // self.n if self.n else 0

    def _is_sorted(self, lo: int, hi: int) -> bool:
        for a, b in self.sorted_ranges:
            if a <= lo and hi <= b + 1:
                return True
        return False

    def _flag(self, c: int) -> Optional[str]:
        if self.compare is not None:
            if self._column_of(self.compare[0]) == c or (
                self.compare[1] >= 0 and self._column_of(self.compare[1]) == c
            ):
                return "compare"
        if self.write_pos is not None and self._column_of(self.write_pos) == c:
            return "write"
        if self.pivot is not None and self._column_of(self.pivot) == c:
            return "pivot"
        if self.sweep is not None and self._column_of(self.sweep) == c:
            return "sweep"
        if self.boundary is not None and self._column_of(self.boundary) == c:
            return "boundary"
        lo = c * self.n // self.cols
        hi = ((c + 1) * self.n) // self.cols
        if self._is_sorted(lo, hi):
            return "sorted"
        return None

    def bars(self) -> List[str]:
        heights = []
        for c in range(self.cols):
            lo = c * self.n // self.cols
            hi = ((c + 1) * self.n) // self.cols
            if hi <= lo:
                hi = lo + 1
            v = max(self.arr[lo:hi])
            h = max(1, round(v / max(1, self.max_value) * self.rows))
            heights.append(h)
        lines: List[str] = []
        for r in range(self.rows - 1, -1, -1):
            row = []
            for c in range(self.cols):
                ch = self.bar if heights[c] > r else " "
                row.append(_paint(ch, self._flag(c), self.color))
            lines.append("".join(row))
        return lines

    def frame(
        self,
        ev: Event,
        index: int,
        total: int,
        stats: Stats,
        elapsed: float,
        header: str,
    ) -> List[str]:
        self.apply(ev)
        if ev.kind == "write":
            self.write_pos = ev.a

        lines = [f"{header} · event {index}/{total}"]
        lines.extend(self.bars())
        lines.append(self.baseline * self.cols)

        if self.n <= 24:
            lines.append("values: " + " ".join(str(v) for v in self.arr))

        if ev.kind == "compare" and ev.b >= 0:
            vb = ev.value - ev.result
            info = f"compare {ev.a} vs {ev.b} ({ev.value} vs {vb})"
        elif ev.kind == "compare":
            key = ev.value - ev.result
            info = f"compare pos {ev.a} ({ev.value}) vs key ({key})"
        elif ev.kind == "swap":
            info = f"swap {ev.a} ↔ {ev.b}"
        elif ev.kind == "write":
            info = f"write pos {ev.a} = {ev.value}"
        elif ev.kind == "sorted":
            info = f"sorted {ev.a}..{ev.b}"
        elif ev.kind == "pivot":
            info = f"pivot pos {ev.a} = {ev.value}"
        elif ev.kind == "sweep":
            info = f"sweep {ev.a}"
        elif ev.kind == "boundary":
            info = f"boundary {ev.a}"
        elif ev.kind == "shuffle":
            info = "shuffle deck (bogo)"
        elif ev.kind == "done":
            info = "done — it's sorted!"
        lines.append(_paint("▸ " + info, "accent", self.color))

        stat_parts = [
            f"compares {stats.comparisons}",
            f"swaps {stats.swaps}",
            f"reads {stats.reads}",
            f"writes {stats.writes}",
            f"accesses {stats.accesses}",
            f"{elapsed:.2f}s",
        ]
        if stats.bogo_attempts:
            stat_parts.append(f"attempts {stats.bogo_attempts}")
        lines.append("stats: " + " · ".join(stat_parts))

        legend = (
            "legend: green=sorted · yellow=compare · red=write · "
            "magenta=pivot · cyan=sweep · blue=boundary"
        )
        lines.append(_paint(legend, "dim", self.color))

        self._clear_transient()
        return lines


def event_label(ev: Event) -> str:
    if ev.kind == "compare":
        if ev.b >= 0:
            return f"compare {ev.a} vs {ev.b} ({ev.value} vs {ev.value - ev.result})"
        return f"compare pos {ev.a} vs key {ev.value - ev.result}"
    if ev.kind == "swap":
        return f"swap {ev.a} ↔ {ev.b}"
    if ev.kind == "write":
        return f"write pos {ev.a} = {ev.value}"
    if ev.kind == "sorted":
        return f"sorted {ev.a}..{ev.b}"
    if ev.kind == "pivot":
        return f"pivot pos {ev.a} = {ev.value}"
    if ev.kind == "sweep":
        return f"sweep {ev.a}"
    if ev.kind == "boundary":
        return f"boundary {ev.a}"
    if ev.kind == "shuffle":
        return "shuffle deck (bogo)"
    if ev.kind == "done":
        return "done"
    return ev.kind


# --------------------------------------------------------------------------
# Run orchestration
# --------------------------------------------------------------------------


def make_run(
    algo_name: str, size: int, seed: int
) -> Tuple[List[int], Tracer, object]:
    """Build a freshly shuffled array and an event generator for one pass."""
    arr = list(range(1, size + 1))
    random.Random(seed).shuffle(arr)
    tr = Tracer(arr, random.Random(seed))
    return arr, tr, ALGORITHMS[algo_name].fn(tr)


def run_count(algo_name: str, size: int, seed: int) -> Tuple[int, Stats, float, List[int]]:
    """Pass 1: consume the event stream, returning count, stats and wall time."""
    arr, tr, evs = make_run(algo_name, size, seed)
    start = time.perf_counter()
    count = 0
    for _ in evs:
        count += 1
    elapsed = time.perf_counter() - start
    return count, tr.stats, elapsed, arr


def generate_wav(
    algo_name: str,
    size: int,
    seed: int,
    note_seconds: float,
    path: str,
    max_frames: int,
    warn: Callable[[str], None],
) -> WavWriter:
    """Pass 2: re-run the stream, turning every toned event into a WAV note."""
    _, tr, evs = make_run(algo_name, size, seed)
    writer = WavWriter(note_seconds, size, max_frames)
    for ev in evs:
        writer.add(ev)
    writer.save(path)
    if writer.truncated:
        warn(
            f"audio for {algo_name} was truncated at {writer.notes} notes "
            f"({writer.frames / SAMPLE_RATE:.1f}s) because the full run would be "
            f"too long; lower --size or raise --max-audio"
        )
    return writer


def compute_cols(size: int) -> int:
    try:
        width = shutil.get_terminal_size().columns
    except Exception:
        width = 80
    return max(10, min(size, width - 6))


def animate(
    args: argparse.Namespace,
    algo: str,
    size: int,
    seed: int,
    total: int,
    header: str,
    stdout: TextIO,
) -> Tuple[Stats, List[int]]:
    """Pass 3: replay the stream frame by frame (live TTY animation or dump)."""
    arr, tr, evs = make_run(algo, size, seed)
    renderer = FrameRenderer(
        arr,
        rows=args.rows,
        cols=args.cols,
        color=args._color,
        chars=args.chars,
    )
    start = time.perf_counter()
    delay = 1.0 / args.speed if args.speed > 0 else 0.0
    tty = stdout.isatty() and not args.no_animate
    for i, ev in enumerate(evs, 1):
        elapsed = time.perf_counter() - start
        lines = renderer.frame(ev, i, total, tr.stats, elapsed, header)
        if tty:
            stdout.write("\x1b[2J\x1b[H")
            stdout.write("\n".join(lines))
            stdout.write("\n")
            stdout.flush()
        else:
            stdout.write("\n".join(lines))
            stdout.write("\n")
            stdout.flush()
        if args.sound == "bell" and ev.toned:
            stdout.write("\a")
            stdout.flush()
        if delay:
            time.sleep(delay)
    return tr.stats, renderer.arr


def summary_line(
    algo: str, size: int, seed: int, stats: Stats, elapsed: float, audio: Optional[str]
) -> str:
    parts = [
        "cadence",
        algo,
        f"n={size}",
        f"seed={seed}",
        f"compares={stats.comparisons}",
        f"swaps={stats.swaps}",
        f"reads={stats.reads}",
        f"writes={stats.writes}",
        f"accesses={stats.accesses}",
        f"time={elapsed:.3f}s",
    ]
    if stats.bogo_attempts:
        parts.append(f"attempts={stats.bogo_attempts}")
    parts.append(f"audio={audio or '-'}")
    return "  ".join(parts)


def per_algo_out(out: str, algo: str) -> str:
    stem, ext = os.path.splitext(out)
    if not ext:
        ext = ".wav"
    return f"{stem}.{algo}{ext}"


def race(args: argparse.Namespace, seed: int) -> int:
    """Run every algorithm head-to-head on the same input and print a scorecard."""
    if args.sound == "bell":
        print("cadence: note: --sound bell is ignored in --race mode", file=sys.stderr)
    rows: List[Tuple[str, Algorithm, Optional[Tuple[int, Stats, float, str]]]] = []
    for name, spec in ALGORITHMS.items():
        if name == "bogo" and args.size > MAX_BOGO_SIZE:
            rows.append((name, spec, None))
            continue
        count, stats, elapsed, _ = run_count(name, args.size, seed)
        audio = ""
        if args.sound == "wav":
            note_seconds = compute_note_seconds(count, args.tempo)
            path = per_algo_out(args.out, name)
            writer = generate_wav(
                name,
                args.size,
                seed,
                note_seconds,
                path,
                int(args.max_audio * SAMPLE_RATE),
                _warn,
            )
            audio = f"{path} ({writer.notes} notes)"
        rows.append((name, spec, (count, stats, elapsed, audio)))

    headers = ["algorithm", "complexity", "compares", "swaps", "reads", "writes", "accesses", "time", "audio"]
    data: List[List[str]] = []
    for name, spec, row in rows:
        if row is None:
            data.append([name, spec.complexity, "-", "-", "-", "-", "-", "-", "skipped (n>9)"])
            continue
        count, stats, elapsed, audio = row
        data.append([
            name,
            spec.complexity,
            f"{stats.comparisons:,}",
            f"{stats.swaps:,}",
            f"{stats.reads:,}",
            f"{stats.writes:,}",
            f"{stats.accesses:,}",
            f"{elapsed:.4f}s",
            audio or "-",
        ])

    widths = [max(len(str(r[i])) for r in data + [headers]) for i in range(len(headers))]
    line = "  ".join(h.ljust(w) for h, w in zip(headers, widths))
    print(line)
    print("  ".join("-" * w for w in widths))
    for d in data:
        print("  ".join(c.ljust(w) for c, w in zip(d, widths)))

    scored = [(r[0], r[2]) for r in rows if r[2] is not None]
    if scored:
        fastest = min(scored, key=lambda x: x[1][2])
        fewest = min(scored, key=lambda x: x[1][1].comparisons)
        print()
        print(
            f"fastest: {fastest[0]} ({fastest[1][2]:.4f}s)  ·  "
            f"fewest comparisons: {fewest[0]} ({fewest[1][1].comparisons})"
        )
    return 0


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


class UsageError(Exception):
    pass


def _warn(msg: str) -> None:
    print(f"cadence: warning: {msg}", file=sys.stderr)


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="cadence",
        description=(
            "Animate classic sorting algorithms as ASCII bars while every "
            "comparison and swap rings out as a pitch-mapped tone — hear a sort."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--algo",
        default="bubble",
        help="algorithm to run (or 'all'); see --list",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=DEFAULT_SIZE,
        help=f"number of elements to sort ({MIN_SIZE}..{MAX_SIZE})",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=DEFAULT_SPEED,
        help="animation speed in events/second (0 = as fast as possible)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="random seed for the input permutation (default: random)",
    )
    parser.add_argument(
        "--sound",
        choices=("wav", "bell", "none"),
        default="wav",
        help="wav = render tones to a file; bell = live terminal beeps; none = silent",
    )
    parser.add_argument(
        "--out",
        default=DEFAULT_OUT,
        help="output WAV path (in --race mode each algorithm gets <stem>.<algo><ext>)",
    )
    parser.add_argument(
        "--tempo",
        type=float,
        default=None,
        help="fixed notes/second for the WAV (default: auto-scale so a run ~15s)",
    )
    parser.add_argument(
        "--max-audio",
        type=float,
        default=DEFAULT_MAX_AUDIO_SECONDS,
        help="hard cap on generated audio length in seconds",
    )
    parser.add_argument(
        "--race",
        action="store_true",
        help="run every algorithm head-to-head on the same input and print a scorecard",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="list the available algorithms and exit",
    )
    parser.add_argument(
        "--no-animate",
        action="store_true",
        help="print every frame without screen clears or delays",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="print one compact summary line and nothing else",
    )
    parser.add_argument(
        "--color",
        choices=("auto", "always", "never"),
        default="auto",
        help="when to use ANSI colors in the animation",
    )
    parser.add_argument(
        "--chars",
        choices=("blocks", "ascii"),
        default="blocks",
        help="bar glyph set: unicode blocks or plain ASCII #",
    )
    parser.add_argument(
        "--rows",
        type=int,
        default=DEFAULT_ROWS,
        help="height of the bar chart",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"cadence {__version__}",
    )
    return parser.parse_args(argv)


def validate(args: argparse.Namespace) -> None:
    if not MIN_SIZE <= args.size <= MAX_SIZE:
        raise UsageError(f"size must be between {MIN_SIZE} and {MAX_SIZE} (got {args.size})")
    if args.speed < 0:
        raise UsageError(f"speed must be >= 0 (got {args.speed})")
    if args.tempo is not None and args.tempo <= 0:
        raise UsageError(f"tempo must be > 0 (got {args.tempo})")
    if not 3 <= args.rows <= 40:
        raise UsageError(f"rows must be between 3 and 40 (got {args.rows})")
    if args.max_audio <= 0:
        raise UsageError(f"max-audio must be > 0 (got {args.max_audio})")
    if args.sound == "wav":
        parent = os.path.dirname(os.path.abspath(args.out))
        if not os.path.isdir(parent):
            raise UsageError(f"cannot write audio to {args.out!r}: directory {parent!r} does not exist")
        if os.path.isdir(args.out):
            raise UsageError(f"cannot write audio to {args.out!r}: it is a directory")
    if not args.race and args.algo not in ("all",):
        try:
            resolve_algo(args.algo)
        except KeyError:
            raise UsageError(
                f"unknown algorithm {args.algo!r}; choose from: {', '.join(ALGORITHMS)}"
            )
    if not args.race and args.algo not in ("all",) and resolve_algo(args.algo) == "bogo":
        if args.size > MAX_BOGO_SIZE:
            raise UsageError(
                f"bogo sort is only feasible up to size {MAX_BOGO_SIZE} "
                f"(got {args.size}); O((n+1)!) is cruel"
            )


def print_algorithms() -> None:
    print("cadence algorithms:")
    width = max(len(n) for n in ALGORITHMS)
    for name in ALGORITHMS:
        spec = ALGORITHMS[name]
        print(f"  {name.ljust(width)}  {spec.complexity.ljust(14)}  {spec.description}")


def run_single(args: argparse.Namespace, seed: int) -> int:
    algo = resolve_algo(args.algo)
    count, stats, elapsed, _ = run_count(algo, args.size, seed)

    audio_path: Optional[str] = None
    if args.sound == "wav":
        note_seconds = compute_note_seconds(count, args.tempo)
        writer = generate_wav(
            algo,
            args.size,
            seed,
            note_seconds,
            args.out,
            int(args.max_audio * SAMPLE_RATE),
            _warn,
        )
        audio_path = args.out

    header = (
        f"Cadence · {algo} · n={args.size} · seed={seed} · "
        f"sound: {'wav → ' + args.out if args.sound == 'wav' else args.sound}"
    )

    if args.quiet:
        print(summary_line(algo, args.size, seed, stats, elapsed, audio_path))
        return 0

    if sys.stdout.isatty() or args.no_animate:
        animate(args, algo, args.size, seed, count, header, sys.stdout)

    print(summary_line(algo, args.size, seed, stats, elapsed, audio_path))
    if args.sound == "wav":
        print(
            f"audio: {audio_path} written ({writer.notes} notes, "
            f"{writer.frames / SAMPLE_RATE:.1f}s of sound)"
        )
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    if args.list:
        print_algorithms()
        return 0

    try:
        validate(args)
    except UsageError as exc:
        print(f"cadence: error: {exc}", file=sys.stderr)
        return 2

    seed = args.seed if args.seed is not None else random.randrange(2**31)

    args._color = args.color == "always" or (args.color == "auto" and sys.stdout.isatty())
    args.cols = compute_cols(args.size)

    try:
        if args.race or args.algo == "all":
            return race(args, seed)
        return run_single(args, seed)
    except KeyboardInterrupt:
        print("\ncadence: interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
