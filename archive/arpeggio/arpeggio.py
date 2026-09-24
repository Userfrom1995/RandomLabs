#!/usr/bin/env python3
"""Arpeggio - a Markov-chain melody composer that renders tunes to WAV.

Compose original music straight from the terminal using nothing but the Python
standard library: a weighted Markov chain walks common chord progressions
(I-V-vi-IV, ii-V-I, ...), every melody note is arpeggiated from the current
chord so the harmony always fits, and the notes are synthesized as sine or
triangle tones with an attack-decay envelope (plus an optional octave-up
harmonic) and mixed into a mono 16-bit PCM WAV file.

Run with `--help` for the full option reference, or see the README and the
`docs/` folder for detailed usage.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
import wave
from array import array
from typing import Callable, Dict, List, Optional, Sequence, TextIO, Tuple

__version__ = "1.0.0"

DEFAULT_KEY = "C"
DEFAULT_SCALE = "major"
DEFAULT_BPM = 120
DEFAULT_BARS = 8
DEFAULT_NOTES_PER_BAR = 8
DEFAULT_OUTPUT = "arpeggio.wav"

SAMPLE_RATE = 44100
BEATS_PER_BAR = 4
MAX_BPM = 400
MAX_BARS = 128
MAX_NOTES_PER_BAR = 64
MAX_DURATION = 300.0
PEAK_AMPLITUDE = 0.8
ATTACK_SECONDS = 0.005
DECAY_DIVISOR = 6.0
FADE_SECONDS = 0.002
HARMONIC_GAIN = 0.35

NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

NOTE_ALIASES = {
    "C": 0, "B#": 0, "Cb": 11,
    "C#": 1, "Db": 1,
    "D": 2,
    "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "E#": 5,
    "F#": 6, "Gb": 6,
    "G": 7,
    "G#": 8, "Ab": 8,
    "A": 9,
    "A#": 10, "Bb": 10,
    "B": 11,
}

# Semitone intervals of each scale from its root.
SCALES: Dict[str, Tuple[int, ...]] = {
    "major": (0, 2, 4, 5, 7, 9, 11),
    "minor": (0, 2, 3, 5, 7, 8, 10),
    "pentatonic": (0, 2, 4, 7, 9),
}

SCALE_ALIASES = {
    "major": "major", "maj": "major", "ionian": "major",
    "minor": "minor", "min": "minor", "aeolian": "minor",
    "pentatonic": "pentatonic", "penta": "pentatonic", "pent": "pentatonic",
}

# Common chord progressions per scale type. Each entry is a tuple of
# (scale degrees, weight); the degrees are 1-based positions in the scale.
# The weighted Markov transition table is derived by counting the transitions
# that occur inside every progression, weighted by that progression's weight.
PROGRESSIONS: Dict[str, Tuple[Tuple[Tuple[int, ...], int], ...]] = {
    "major": (
        ((1, 5, 6, 4), 10),   # I-V-vi-IV
        ((1, 6, 4, 5), 8),    # I-vi-IV-V
        ((2, 5, 1), 8),       # ii-V-I
        ((1, 4, 5, 1), 6),    # I-IV-V-I
        ((6, 4, 1, 5), 6),    # vi-IV-I-V
        ((1, 5, 2, 4), 4),    # I-V-ii-IV
        ((5, 1), 4),          # V-I
        ((1, 2, 6, 5), 3),    # I-ii-vi-V
    ),
    "minor": (
        ((1, 6, 3, 7), 10),   # i-VI-III-VII
        ((1, 4, 5, 1), 8),    # i-iv-v-i
        ((2, 5, 1), 8),       # ii-V-i
        ((1, 6, 4, 5), 6),    # i-VI-iv-v
        ((3, 6, 4, 5), 4),    # III-VI-iv-v
        ((6, 4, 1), 4),       # VI-iv-i
    ),
    "pentatonic": (
        ((1, 4, 1), 6),
        ((1, 3, 1), 5),
        ((1, 2, 1), 4),
        ((5, 1), 4),
        ((1, 5, 1), 4),
    ),
}

# Chord-tone indices of each arpeggio pattern. Indices 0-2 are the triad
# (root, third, fifth); index 3 is the root one octave up.
ARPEGGIO_PATTERNS: Tuple[Tuple[int, ...], ...] = (
    (0, 1, 2, 1),
    (0, 2, 1, 2),
    (0, 1, 2, 3, 2, 1),
    (0, 1, 2, 3),
    (2, 1, 0, 1),
    (3, 2, 1, 0),
    (0, 1, 2, 1, 0, 2),
)

_ROMAN_UPPER = ("I", "II", "III", "IV", "V", "VI", "VII")
_ROMAN_LOWER = ("i", "ii", "iii", "iv", "v", "vi", "vii")


def parse_note(value: str) -> int:
    """Return the pitch class (0-11) for a note name like ``"C"`` or ``"Db"``."""
    token = value.strip().capitalize()
    if token not in NOTE_ALIASES:
        raise ValueError(f"unknown note {value!r}")
    return NOTE_ALIASES[token]


def note_frequency(midi: int) -> float:
    """Convert a MIDI note number to its frequency in Hz (A4 = 440 Hz)."""
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def chord(scale: Tuple[int, ...], degree: int) -> Tuple[int, Tuple[int, ...]]:
    """Return ``(root, tones)`` for a diatonic triad on ``degree`` (1-based).

    ``root`` is the chord's semitone offset from the scale root and ``tones``
    are the triad's intervals relative to the chord root, so the root tone is
    always ``0`` and the other two are stacked by skipping scale steps.
    """
    n = len(scale)
    root = scale[degree - 1]
    tones = tuple(
        scale[i % n] + 12 * (i // n) - root for i in (degree - 1, degree + 1, degree + 3)
    )
    return root, tones


def build_transitions(
    scale_type: str,
) -> Tuple[Dict[int, int], Dict[Tuple[int, int], int]]:
    """Derive Markov-chain start weights and transition weights.

    Returns ``(start, trans)`` where ``start[degree]`` is the weight of that
    degree opening a piece and ``trans[(a, b)]`` is the weight of moving from
    chord ``a`` to chord ``b``, both accumulated from the common progressions.
    """
    start: Dict[int, int] = {}
    trans: Dict[Tuple[int, int], int] = {}
    for degrees, weight in PROGRESSIONS[scale_type]:
        start[degrees[0]] = start.get(degrees[0], 0) + weight
        for first, second in zip(degrees, degrees[1:]):
            trans[(first, second)] = trans.get((first, second), 0) + weight
    reachable = set(start) | {b for _, b in trans}
    for degree in reachable:
        if not any(a == degree for a, _ in trans):
            trans[(degree, 1)] = trans.get((degree, 1), 0) + 1  # resolve to tonic
    return start, trans


def _weighted_choice(rng: random.Random, weights: Dict[int, int]) -> int:
    total = float(sum(weights.values()))
    pick = rng.random() * total
    running = 0.0
    for key, weight in weights.items():
        running += weight
        if pick < running:
            return key
    return next(iter(weights))


def compose_progression(
    rng: random.Random,
    scale_type: str,
    bars: int,
    on_chord: Optional[Callable[[int, int], None]] = None,
) -> List[int]:
    """Walk the weighted Markov chain, returning ``bars`` scale degrees."""
    start, trans = build_transitions(scale_type)
    degree = _weighted_choice(rng, start)
    progression: List[int] = [degree]
    if on_chord is not None:
        on_chord(0, degree)
    for index in range(1, bars):
        candidates = {b: w for (a, b), w in trans.items() if a == degree}
        if not candidates:
            candidates = {1: 1}  # fallback: resolve any dead end to the tonic
        degree = _weighted_choice(rng, candidates)
        progression.append(degree)
        if on_chord is not None:
            on_chord(index, degree)
    return progression


def compose_piece(
    rng: random.Random,
    key_pc: int,
    scale_type: str,
    bpm: int,
    bars: int,
    notes_per_bar: int,
) -> Tuple[List[int], List[Tuple[int, int]]]:
    """Compose a progression and arrange it into a sequence of notes.

    Returns ``(progression, notes)`` where ``notes`` is a list of
    ``(midi, samples)`` pairs, each note arpeggiated from its bar's chord.
    """
    scale = SCALES[scale_type]
    progression = compose_progression(rng, scale_type, bars)
    note_samples = int(round(BEATS_PER_BAR * 60.0 / bpm / notes_per_bar * SAMPLE_RATE))
    notes: List[Tuple[int, int]] = []
    for degree in progression:
        root_rel, tones = chord(scale, degree)
        root_midi = 60 + key_pc + root_rel
        pattern = rng.choice(ARPEGGIO_PATTERNS)
        for slot in range(notes_per_bar):
            index = pattern[slot % len(pattern)]
            if index == 3:
                midi = root_midi + tones[0] + 12
            else:
                midi = root_midi + tones[index]
            notes.append((midi, note_samples))
    return progression, notes


def roman_numeral(degree: int, tones: Tuple[int, ...]) -> str:
    """Roman numeral for a chord on ``degree``, cased by its quality."""
    third, fifth = tones[1] % 12, tones[2] % 12
    if third == 3 and fifth == 6:
        return "vii\u00b0"
    return _ROMAN_LOWER[degree - 1] if third == 3 else _ROMAN_UPPER[degree - 1]


def describe_chord(key_pc: int, scale: Tuple[int, ...], degree: int) -> str:
    """Human-readable label for a chord, e.g. ``C   (I)   [C E G]``."""
    root_rel, tones = chord(scale, degree)
    root_name = NOTE_NAMES[(key_pc + root_rel) % 12]
    tone_names = " ".join(NOTE_NAMES[(key_pc + root_rel + tone) % 12] for tone in tones)
    return f"{root_name:<3} ({roman_numeral(degree, tones):<5}) [{tone_names}]"


def render_note(
    frequency: float,
    n_samples: int,
    wave_shape: str,
    harmonic: bool,
) -> List[float]:
    """Synthesize one note as a list of ``n_samples`` floats in [-1, 1]."""
    if n_samples < 1:
        return []
    attack = max(1, int(ATTACK_SECONDS * SAMPLE_RATE))
    fade = max(1, int(FADE_SECONDS * SAMPLE_RATE))
    decay_tau = (n_samples / SAMPLE_RATE) / DECAY_DIVISOR
    two_pi = 2.0 * math.pi
    samples = [0.0] * n_samples
    for i in range(n_samples):
        phase = two_pi * frequency * (i / SAMPLE_RATE)
        if wave_shape == "triangle":
            signal = (2.0 / math.pi) * math.asin(math.sin(phase))
        else:
            signal = math.sin(phase)
        if harmonic:
            signal = (signal + HARMONIC_GAIN * math.sin(2.0 * phase)) / (1.0 + HARMONIC_GAIN)
        envelope = math.exp(-i / SAMPLE_RATE / decay_tau)
        if i < attack:
            envelope *= i / attack
        remaining = n_samples - i
        if remaining <= fade:
            envelope *= remaining / fade
        samples[i] = signal * envelope
    return samples


def synthesize(
    notes: Sequence[Tuple[int, int]],
    wave_shape: str,
    harmonic: bool,
) -> List[float]:
    """Render every note into a single mono float mix."""
    total = sum(samples for _, samples in notes)
    mix = [0.0] * total
    cursor = 0
    for midi, n_samples in notes:
        note = render_note(note_frequency(midi), n_samples, wave_shape, harmonic)
        for i, value in enumerate(note):
            mix[cursor + i] += value
        cursor += n_samples
    return mix


def write_wav(path: str, mix: Sequence[float]) -> None:
    """Normalize the mix and write a 16-bit mono PCM WAV file."""
    peak = max((abs(value) for value in mix), default=0.0)
    scale = 32767.0 * PEAK_AMPLITUDE / peak if peak > 0 else 0.0
    frames = array("h", (int(value * scale) for value in mix))
    with wave.open(path, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(frames.tobytes())


def _positive_int(name: str, maximum: int) -> Callable[[str], int]:
    def _check(value: str) -> int:
        try:
            number = int(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{name} must be an integer, got {value!r}")
        if number < 1 or number > maximum:
            raise argparse.ArgumentTypeError(f"{name} must be between 1 and {maximum}, got {number}")
        return number

    return _check


def _bpm(value: str) -> int:
    return _positive_int("bpm", MAX_BPM)(value)


def _bars(value: str) -> int:
    return _positive_int("bars", MAX_BARS)(value)


def _notes_per_bar(value: str) -> int:
    return _positive_int("notes-per-bar", MAX_NOTES_PER_BAR)(value)


def _duration(value: str) -> float:
    try:
        number = float(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"duration must be a number, got {value!r}")
    if not 0.0 < number <= MAX_DURATION:
        raise argparse.ArgumentTypeError(
            f"duration must be between 0 and {MAX_DURATION:.0f} seconds, got {number}"
        )
    return number


def _scale(value: str) -> str:
    token = value.strip().lower()
    if token not in SCALE_ALIASES:
        raise argparse.ArgumentTypeError(
            f"unknown scale {value!r}; choose 'major', 'minor', or 'pentatonic'"
        )
    return SCALE_ALIASES[token]


def _note(value: str) -> int:
    try:
        return parse_note(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc))


def _wave(value: str) -> str:
    token = value.strip().lower()
    if token not in ("sine", "triangle"):
        raise argparse.ArgumentTypeError(f"unknown wave {value!r}; choose 'sine' or 'triangle'")
    return token


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="arpeggio",
        description="Compose original music with a Markov chain and render it to a WAV file.",
        epilog=(
            "examples:\n"
            "  arpeggio\n"
            "  arpeggio --key F --scale minor --bpm 90\n"
            "  arpeggio --bars 16 --preview\n"
            "  arpeggio --key Db --seed 42 --output my_tune.wav\n"
            "  arpeggio --wave triangle --harmonic --duration 30\n"
            "\n"
            "The chord progression is built by a weighted Markov chain over classic\n"
            "progressions, then each bar is arpeggiated from its chord. Without --seed\n"
            "the chosen seed is printed to stderr so any tune can be replayed exactly.\n"
            "Use --duration to cap the output length and keep files bounded."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--key",
        type=_note,
        default=DEFAULT_KEY,
        metavar="KEY",
        help=f"root note of the key, e.g. C, F#, Db (default: {DEFAULT_KEY})",
    )
    parser.add_argument(
        "--scale",
        type=_scale,
        default=DEFAULT_SCALE,
        metavar="SCALE",
        help="'major', 'minor', or 'pentatonic' (default: major)",
    )
    parser.add_argument(
        "--bpm",
        type=_bpm,
        default=DEFAULT_BPM,
        metavar="N",
        help=f"tempo in beats per minute, 1-{MAX_BPM} (default: {DEFAULT_BPM})",
    )
    parser.add_argument(
        "--bars",
        type=_bars,
        default=DEFAULT_BARS,
        metavar="N",
        help=f"number of bars (4/4 measures), 1-{MAX_BARS} (default: {DEFAULT_BARS})",
    )
    parser.add_argument(
        "--notes-per-bar",
        type=_notes_per_bar,
        default=DEFAULT_NOTES_PER_BAR,
        metavar="N",
        help=(
            "arpeggio grid density per bar, 1-64 (default: "
            f"{DEFAULT_NOTES_PER_BAR}); patterns tile to fill this many slots"
        ),
    )
    parser.add_argument(
        "--wave",
        type=_wave,
        default="sine",
        metavar="WAVE",
        help="'sine' or 'triangle' oscillator (default: sine)",
    )
    parser.add_argument(
        "--harmonic",
        action="store_true",
        default=False,
        help="add an octave-up harmonic at lower amplitude for warmth",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        metavar="N",
        help="random seed for a reproducible tune (default: random)",
    )
    parser.add_argument(
        "--duration",
        type=_duration,
        default=None,
        metavar="SEC",
        help=(
            f"cap the output at SEC seconds, 0-{MAX_DURATION:.0f}; "
            "truncates the piece to whole bars that fit within the limit"
        ),
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="print each chord of the progression as it is composed",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=DEFAULT_OUTPUT,
        metavar="FILE",
        help=f"output WAV file (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    return parser


def _choose_bars(args: argparse.Namespace) -> int:
    """Resolve the bar count, honoring --duration and the length cap."""
    bar_seconds = BEATS_PER_BAR * 60.0 / args.bpm
    bars = args.bars
    if args.duration is not None:
        capped = max(1, int(args.duration // bar_seconds))
        if capped < bars:
            print(
                f"arpeggio: --duration {args.duration:g}s caps output at {capped} "
                f"bars (was {bars})",
                file=sys.stderr,
            )
            bars = capped
    elif bar_seconds * bars > MAX_DURATION:
        capped = max(1, int(MAX_DURATION // bar_seconds))
        print(
            f"arpeggio: warning: piece exceeds {MAX_DURATION:.0f}s; "
            f"capped at {capped} bars",
            file=sys.stderr,
        )
        bars = capped
    return bars


def _print_preview(
    out: TextIO,
    progression: Sequence[int],
    key_pc: int,
    scale_type: str,
    bars: int,
) -> None:
    scale = SCALES[scale_type]
    width = len(str(bars))
    for index, degree in enumerate(progression):
        out.write(f"bar {index + 1:>{width}}/{bars}  {describe_chord(key_pc, scale, degree)}\n")
    out.flush()


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = make_parser()
    args = parser.parse_args(argv)

    if args.seed is None:
        seed = random.randrange(1 << 32)
        print(f"arpeggio: seed = {seed} (pass --seed {seed} to replay)", file=sys.stderr)
    else:
        seed = args.seed
    rng = random.Random(seed)

    bars = _choose_bars(args)

    progression, notes = compose_piece(
        rng, args.key, args.scale, args.bpm, bars, args.notes_per_bar
    )
    if args.preview:
        _print_preview(sys.stdout, progression, args.key, args.scale, bars)

    try:
        mix = synthesize(notes, args.wave, args.harmonic)
        write_wav(args.output, mix)
    except OSError as exc:
        print(f"arpeggio: cannot write {args.output!r}: {exc}", file=sys.stderr)
        return 1

    duration = len(mix) / SAMPLE_RATE
    print(
        f"arpeggio: wrote {args.output!r}: key={NOTE_NAMES[args.key]}, "
        f"scale={args.scale}, {bars} bars, {len(notes)} notes, "
        f"{duration:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
