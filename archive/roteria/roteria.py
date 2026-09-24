#!/usr/bin/env python3
"""Rotoria - a terminal Enigma machine cipher simulator.

Rotoria simulates a WWII Enigma cipher machine with nothing but the Python
standard library. It reproduces the real machine's stepping mechanism
(including the famous "double-stepping" of the middle rotor), the plugboard
(stecker), ring settings, and reflectors, letting you encrypt and decrypt
messages and inspect the machine's internal wiring at every keystroke.

Rotors I-V, reflectors B and C, and the standard notch positions are included.
The stepping and wiring code is validated against several published Enigma
test vectors and is bit-for-bit compatible with the well-known reference
implementations for the classic three-rotor (M3) configuration.

Run `python3 -m roteria --help` for usage, or see the README and the `docs/`
folder for the full guide.
"""

from __future__ import annotations

import argparse
import re
import sys
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

__version__ = "1.0.0"

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# Published Enigma wiring tables (letter A..Z -> the letter on the contact
# ring). These are the standard Wehrmacht/Luftwaffe rotor and reflector
# wirings, matching the tables printed in the Crypto Museum references.
ROTOR_WIRINGS: Dict[str, str] = {
    "I": "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
    "II": "AJDKSIRUXBLHWTMCQGZNPYFVOE",
    "III": "BDFHJLCPRTXVZNYEIWGAKMUSQO",
    "IV": "ESOVPZJAYQUIRHXLNFTGKDCMWB",
    "V": "VZBRGITYUPSDNHLXAWMJQOFECK",
}

# The notch letter for each rotor: when the window shows this letter the rotor
# to its left is about to be carried along one step.
ROTOR_NOTCHES: Dict[str, str] = {
    "I": "Q",
    "II": "E",
    "III": "V",
    "IV": "J",
    "V": "Z",
}

REFLECTOR_WIRINGS: Dict[str, str] = {
    "B": "YRUHQSLDPXNGOKMIEBFZCWVJAT",
    "C": "FVPJIAOYEDRZXWGCTKUQSBNMHL",
}

DEFAULT_ROTORS = "I II III"
DEFAULT_REFLECTOR = "B"
MAX_PLUGBOARD_PAIRS = 13


class Rotor:
    """A single Enigma rotor: wiring, notch, ring setting, and position.

    ``position`` is the letter shown in the window (0 for A), ``ring`` is the
    ring setting offset (0 for ring setting 1 / 'A'). Both are stored 0-25.
    """

    __slots__ = ("name", "wiring", "inverse", "notch", "position", "ring")

    def __init__(self, name: str, position: int = 0, ring: int = 0) -> None:
        if name not in ROTOR_WIRINGS:
            raise ValueError(
                "unknown rotor %r (choose from %s)"
                % (name, ", ".join(sorted(ROTOR_WIRINGS)))
            )
        self.name = name
        self.wiring = _string_to_ints(ROTOR_WIRINGS[name])
        self.inverse = [0] * 26
        for index, output in enumerate(self.wiring):
            self.inverse[output] = index
        self.notch = _letter_index(ROTOR_NOTCHES[name])
        self.position = _wrap(position)
        self.ring = _wrap(ring)

    def step(self) -> None:
        """Advance the rotor one position (wrapping Z -> A)."""
        self.position = (self.position + 1) % 26

    def is_at_notch(self) -> bool:
        """True when the window shows the rotor's notch letter."""
        return self.position == self.notch

    def forward(self, index: int) -> int:
        """Scramble a signal travelling right-to-left through the rotor."""
        shift = self.position - self.ring
        index = (index + shift) % 26
        index = self.wiring[index]
        return (index - shift) % 26

    def backward(self, index: int) -> int:
        """Scramble a signal travelling left-to-right through the rotor."""
        shift = self.position - self.ring
        index = (index + shift) % 26
        index = self.inverse[index]
        return (index - shift) % 26

    def window_letter(self) -> str:
        """The letter currently shown in the rotor window."""
        return ALPHABET[self.position]


class Reflector:
    """A reciprocal substitution with no fixed points (Umkehrwalze)."""

    __slots__ = ("name", "wiring")

    def __init__(self, name: str) -> None:
        if name not in REFLECTOR_WIRINGS:
            raise ValueError(
                "unknown reflector %r (choose from %s)"
                % (name, ", ".join(sorted(REFLECTOR_WIRINGS)))
            )
        self.name = name
        self.wiring = _string_to_ints(REFLECTOR_WIRINGS[name])

    def forward(self, index: int) -> int:
        return self.wiring[index]


class Plugboard:
    """The stecker: a set of reciprocal letter swaps applied at the ends."""

    __slots__ = ("mapping", "pairs")

    def __init__(self, pairs: Iterable[Tuple[str, str]] = ()) -> None:
        mapping = list(range(26))
        seen: List[str] = []
        used: set = set()
        for pair in pairs:
            a, b = _normalise_stecker_pair(pair, used)
            used.add(a)
            used.add(b)
            mapping[_letter_index(a)] = _letter_index(b)
            mapping[_letter_index(b)] = _letter_index(a)
            seen.append("%s%s" % (a, b))
        self.mapping = mapping
        self.pairs = tuple(seen)

    def swap(self, index: int) -> int:
        return self.mapping[index]

    def describe(self) -> str:
        if not self.pairs:
            return "none"
        return ", ".join(self.pairs)


class EnigmaMachine:
    """A configurable Enigma machine.

    ``rotors`` is the list of Rotor instances in left-to-right order (the
    leftmost is the slowest-moving). ``reflector`` is a Reflector and
    ``plugboard`` a Plugboard.
    """

    def __init__(
        self,
        rotors: Sequence[Rotor],
        reflector: Reflector,
        plugboard: Optional[Plugboard] = None,
    ) -> None:
        if not rotors:
            raise ValueError("an Enigma machine needs at least one rotor")
        self.rotors = list(rotors)
        self.reflector = reflector
        self.plugboard = plugboard if plugboard is not None else Plugboard()

    def step(self) -> None:
        """Advance the rotors for one keypress (full stepping logic).

        The rightmost rotor steps on every keypress. The middle rotor is
        carried along when the rightmost rotor reaches its notch, and the
        leftmost rotor is carried when the middle rotor reaches its notch.
        Because the middle rotor can be carried and then reach its own notch,
        it sometimes steps on two consecutive keypresses - the famous Enigma
        "double-stepping".
        """
        count = len(self.rotors)
        if count == 1:
            self.rotors[0].step()
            return
        if self.rotors[-2].is_at_notch():
            for rotor in self.rotors[-3:]:
                rotor.step()
        elif self.rotors[-1].is_at_notch():
            self.rotors[-2].step()
            self.rotors[-1].step()
        else:
            self.rotors[-1].step()

    def encrypt_letter(self, index: int) -> int:
        """Encrypt one plaintext letter index, advancing the rotors first."""
        self.step()
        index = self.plugboard.swap(index)
        for rotor in reversed(self.rotors):  # right to left
            index = rotor.forward(index)
        index = self.reflector.forward(index)
        for rotor in self.rotors:  # left to right
            index = rotor.backward(index)
        index = self.plugboard.swap(index)
        return index

    def process(self, message: str) -> str:
        """Encrypt or decrypt a message (the machine is an involution).

        Non-alphabet characters are discarded first, so any text can be fed
        in; only A-Z reach the machine.
        """
        result = []
        for letter in sanitise_message(message):
            result.append(ALPHABET[self.encrypt_letter(_letter_index(letter))])
        return "".join(result)

    def signal_path(self, letter: str) -> List[Tuple[str, int]]:
        """Trace the path of one letter through the machine without advancing.

        Returns ``(stage, letter_index)`` pairs describing the journey:
        stecker-in, each rotor's forward pass (right to left), the reflector,
        each rotor's backward pass (left to right), and stecker-out.
        """
        index = _letter_index(letter)
        path = [("stecker-in", self.plugboard.swap(index))]
        index = path[-1][1]
        for rotor in reversed(self.rotors):
            index = rotor.forward(index)
            path.append(("%s.fwd" % rotor.name, index))
        index = self.reflector.forward(index)
        path.append(("refl", index))
        for rotor in self.rotors:
            index = rotor.backward(index)
            path.append(("%s.back" % rotor.name, index))
        index = self.plugboard.swap(index)
        path.append(("stecker-out", index))
        return path

    def windows(self) -> List[str]:
        """The letters currently shown in each rotor window, left to right."""
        return [rotor.window_letter() for rotor in self.rotors]


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def _string_to_ints(wiring: str) -> List[int]:
    return [_letter_index(ch) for ch in wiring]


def _letter_index(letter: str) -> int:
    value = ord(letter) - ord("A")
    if value < 0 or value > 25:
        raise ValueError("letter must be A-Z, got %r" % letter)
    return value


def _wrap(value: int) -> int:
    return value % 26


def _parse_ring(value: str) -> int:
    """Parse a ring setting: a letter A-Z (A = setting 1) or an int 1-26."""
    token = value.strip().upper()
    if re.fullmatch(r"[A-Z]", token):
        return _letter_index(token)
    if re.fullmatch(r"(?:[1-9]|1\d|2[0-6])", token):
        return (int(token) - 1) % 26
    raise ValueError(
        "invalid ring setting %r (use a letter A-Z or a number 1-26)" % value
    )


def _parse_position(value: str) -> int:
    """Parse a rotor position: a letter A-Z (A = 0) or an int 0-25."""
    token = value.strip().upper()
    if re.fullmatch(r"[A-Z]", token):
        return _letter_index(token)
    if re.fullmatch(r"(?:0|[1-9]|1\d|2[0-5])", token):
        return int(token) % 26
    raise ValueError(
        "invalid position %r (use a letter A-Z or a number 0-25)" % value
    )


def _normalise_stecker_pair(pair: str, used: set) -> Tuple[str, str]:
    pair = pair.strip().upper()
    if len(pair) != 2:
        raise ValueError(
            "each plugboard pair must be two letters, got %r" % pair
        )
    a, b = pair[0], pair[1]
    if not (a.isalpha() and b.isalpha()):
        raise ValueError(
            "each plugboard pair must be two letters, got %r" % pair
        )
    if a == b:
        raise ValueError(
            "plugboard pair %r cannot connect a letter to itself" % pair
        )
    for ch in (a, b):
        if ch in used:
            raise ValueError(
                "plugboard letter %r used more than once (pair %r)" % (ch, pair)
            )
    return a, b


def parse_rotors(spec: str) -> List[Rotor]:
    """Parse a rotor order string like ``"I II III"`` into Rotor instances."""
    names = spec.replace(",", " ").split()
    if not names:
        raise ValueError("at least one rotor is required")
    rotors = []
    for name in names:
        name = name.upper()
        if name not in ROTOR_WIRINGS:
            raise ValueError(
                "unknown rotor %r (choose from %s)"
                % (name, ", ".join(sorted(ROTOR_WIRINGS)))
            )
        rotors.append(Rotor(name))
    return rotors


def parse_rings(spec: Optional[str], count: int) -> List[int]:
    if spec is None:
        return [0] * count
    values = spec.replace(",", " ").split()
    if (
        len(values) == 1
        and count > 1
        and len(values[0]) == count
        and all(ch.upper() in ALPHABET for ch in values[0])
    ):
        values = list(values[0].upper())
    if len(values) != count:
        raise ValueError(
            "expected %d ring setting(s), got %d"
            % (count, len(values))
        )
    return [_parse_ring(value) for value in values]


def parse_positions(spec: Optional[str], count: int) -> List[int]:
    if spec is None:
        return [0] * count
    values = spec.replace(",", " ").split()
    if (
        len(values) == 1
        and count > 1
        and len(values[0]) == count
        and all(ch.upper() in ALPHABET for ch in values[0])
    ):
        values = list(values[0].upper())
    if len(values) != count:
        raise ValueError(
            "expected %d position(s), got %d"
            % (count, len(values))
        )
    return [_parse_position(value) for value in values]


def parse_plugboard(spec: Optional[str]) -> Plugboard:
    if not spec:
        return Plugboard()
    pairs = [p for p in re.split(r"[,\s]+", spec.strip()) if p]
    if len(pairs) > MAX_PLUGBOARD_PAIRS:
        raise ValueError(
            "too many plugboard pairs (max %d)" % MAX_PLUGBOARD_PAIRS
        )
    return Plugboard(pairs)


def build_machine(
    rotor_spec: str = DEFAULT_ROTORS,
    ring_spec: Optional[str] = None,
    position_spec: Optional[str] = None,
    plugboard_spec: Optional[str] = None,
    reflector: str = DEFAULT_REFLECTOR,
) -> EnigmaMachine:
    """Build a configured EnigmaMachine from human-readable settings."""
    rotors = parse_rotors(rotor_spec)
    rings = parse_rings(ring_spec, len(rotors))
    positions = parse_positions(position_spec, len(rotors))
    for rotor, ring, position in zip(rotors, rings, positions):
        rotor.ring = ring
        rotor.position = position
    return EnigmaMachine(rotors, Reflector(reflector.upper()), parse_plugboard(plugboard_spec))


def sanitise_message(message: str) -> str:
    """Uppercase the message and drop everything outside A-Z.

    The historical Enigma had no spaces or punctuation; operators grouped
    ciphertext in blocks. Non-letter characters are silently discarded.
    """
    return "".join(ch for ch in message.upper() if ch in ALPHABET)


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


def describe_machine(machine: EnigmaMachine) -> List[str]:
    """Human-readable one-line summary of a machine's configuration."""
    names = " ".join(rotor.name for rotor in machine.rotors)
    rings = " ".join(str(_ring_setting(rotor.ring)) for rotor in machine.rotors)
    windows = " ".join(machine.windows())
    return [
        "rotors:    %s" % names,
        "rings:     %s" % rings,
        "positions: %s" % windows,
        "reflector: %s" % machine.reflector.name,
        "plugboard: %s" % machine.plugboard.describe(),
    ]


def _ring_setting(ring: int) -> int:
    """Ring setting as the 1-based number operators wrote (1 = A)."""
    return ring + 1


def render_wiring_table(name: str, wiring: str, title: str) -> str:
    """Render a rotor/reflector wiring table as aligned text."""
    rows = []
    rows.append("%s  (%s)" % (title, name))
    rows.append("  " + "  ".join(ALPHABET))
    rows.append("  " + "  ".join(wiring))
    return "\n".join(rows)


def render_path_simple(machine: EnigmaMachine, letter: str) -> str:
    """Render the signal path as a compact single-line chain."""
    path = machine.signal_path(letter)
    chain = []
    for index, (stage, value) in enumerate(path):
        if index:
            chain.append(" --%s--> " % stage)
        chain.append(ALPHABET[value])
    return "".join(chain)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _add_machine_options(parser: argparse.ArgumentParser) -> None:
    group = parser.add_argument_group("machine settings")
    group.add_argument(
        "-r",
        "--rotors",
        nargs="+",
        default=DEFAULT_ROTORS.split(),
        metavar="ROTOR",
        help="rotor order left-to-right, e.g. --rotors I II III (default: %(default)s)",
    )
    group.add_argument(
        "--rings",
        nargs="+",
        metavar="SETTING",
        help="ring settings, e.g. --rings 1 2 3 or --rings A B C (default: all 1)",
    )
    group.add_argument(
        "--positions",
        "--pos",
        dest="positions",
        nargs="+",
        metavar="POSITION",
        help="initial rotor positions, e.g. --positions AAA or --positions Q W E (default: all A)",
    )
    group.add_argument(
        "-s",
        "--stecker",
        "--plugboard",
        dest="plugboard",
        nargs="+",
        metavar="PAIR",
        help="plugboard pairs, e.g. --stecker AB CD EF (default: none)",
    )
    group.add_argument(
        "--reflector",
        default=DEFAULT_REFLECTOR,
        metavar="NAME",
        help="reflector name, B or C (default: %(default)s)",
    )


def _machine_spec(args: argparse.Namespace):
    """Turn parsed CLI option lists back into the parser's string forms."""
    return dict(
        rotor_spec=" ".join(args.rotors),
        ring_spec=" ".join(args.rings) if args.rings else None,
        position_spec=" ".join(args.positions) if args.positions else None,
        plugboard_spec=" ".join(args.plugboard) if args.plugboard else None,
        reflector=args.reflector,
    )


def _build_machine_cli(args: argparse.Namespace):
    """Build the machine for a CLI run, reporting validation errors cleanly."""
    try:
        return build_machine(**_machine_spec(args))
    except ValueError as exc:
        print("roteria: %s" % exc, file=sys.stderr)
        return None


def _add_message_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "message",
        nargs="?",
        help="text to process; if omitted, read from stdin",
    )
    parser.add_argument(
        "--group",
        type=_validate_group,
        default=0,
        metavar="N",
        help="group output in blocks of N letters, 0 disables (default: %(default)s)",
    )


def _group_output(text: str, group: int) -> str:
    if group <= 0:
        return text
    return " ".join(text[i : i + group] for i in range(0, len(text), group))


def _read_message(args: argparse.Namespace) -> str:
    if args.message is not None:
        return sanitise_message(args.message)
    if not sys.stdin.isatty():
        return sanitise_message(sys.stdin.read())
    return ""


def _validate_group(value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("group must be an integer, got %r" % value)
    if number < 0 or number > 100:
        raise argparse.ArgumentTypeError("group must be between 0 and 100")
    return number


def run_process(args: argparse.Namespace) -> int:
    machine = _build_machine_cli(args)
    if machine is None:
        return 2
    message = _read_message(args)
    if not message:
        print("roteria: nothing to process (pass a message or pipe stdin)", file=sys.stderr)
        return 2
    result = machine.process(message)
    print(_group_output(result, args.group))
    return 0


def run_visualize(args: argparse.Namespace) -> int:
    machine = _build_machine_cli(args)
    if machine is None:
        return 2
    message = _read_message(args)
    if not message:
        print("roteria: nothing to visualize (pass a message or pipe stdin)", file=sys.stderr)
        return 2
    print("Machine: %s" % " | ".join(describe_machine(machine)))
    print()
    for index, letter in enumerate(message):
        output = machine.encrypt_letter(_letter_index(letter))
        print("Key %d  plaintext %s" % (index + 1, letter))
        print("  %s" % render_path_simple(machine, letter))
        print("  ciphertext %s | windows: %s"
              % (ALPHABET[output], " ".join(machine.windows())))
        print()
    return 0


def run_machine(args: argparse.Namespace) -> int:
    machine = _build_machine_cli(args)
    if machine is None:
        return 2
    print("Rotoria machine configuration")
    for line in describe_machine(machine):
        print("  " + line)
    print()
    print("Rotor wirings (A-Z across, contact ring below):")
    for name, wiring in ROTOR_WIRINGS.items():
        print()
        print(render_wiring_table(name, wiring, "rotor"))
    print()
    print("Reflector wirings:")
    for name, wiring in REFLECTOR_WIRINGS.items():
        print()
        print(render_wiring_table(name, wiring, "reflector"))
    return 0


def run_interactive(args: argparse.Namespace) -> int:
    machine = _build_machine_cli(args)
    if machine is None:
        return 2
    print("Rotoria interactive session - type a line of letters (blank line to exit)")
    print("Machine: %s" % " | ".join(describe_machine(machine)))
    print()
    while True:
        try:
            line = input("> ")
        except EOFError:
            print()
            return 0
        message = sanitise_message(line)
        if not message:
            continue
        result = []
        for letter in message:
            output = machine.encrypt_letter(_letter_index(letter))
            result.append(ALPHABET[output])
            print("  %s -> %s | windows: %s"
                  % (letter, ALPHABET[output], " ".join(machine.windows())))
        print("  result: %s" % "".join(result))
        print()


def main(argv: Optional[Sequence[str]] = None) -> int:
    # Machine settings are available both globally (e.g. for --interactive)
    # and on every subcommand, so the same flags work everywhere.
    machine_parent = argparse.ArgumentParser(add_help=False)
    _add_machine_options(machine_parent)

    parser = argparse.ArgumentParser(
        prog="roteria",
        description=(
            "Rotoria - a terminal Enigma machine cipher simulator. "
            "Encrypts and decrypts messages with the historical rotor "
            "stepping, plugboard, ring settings, and reflectors, and can "
            "visualize the internal wiring path of every letter."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[machine_parent],
    )
    parser.add_argument(
        "--version",
        action="version",
        version="roteria %s" % __version__,
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="start an interactive session instead of a one-shot command",
    )
    subparsers = parser.add_subparsers(dest="command", metavar="COMMAND")

    for name in ("encrypt", "decrypt"):
        sub = subparsers.add_parser(
            name,
            parents=[machine_parent],
            help="process a message (encrypt and decrypt are the same operation)",
            description=(
                "Process a message through the machine. The Enigma is an "
                "involution: 'decrypt' is the exact same operation as "
                "'encrypt', so the same command handles both directions."
            ),
        )
        _add_message_argument(sub)
        sub.set_defaults(func=run_process)

    sub = subparsers.add_parser(
        "visualize",
        parents=[machine_parent],
        help="show the internal wiring path of every letter",
        description=(
            "Step through a message and print the full signal path of every "
            "letter: stecker, each rotor's forward and backward pass, the "
            "reflector, and the rotor windows after each keypress."
        ),
    )
    _add_message_argument(sub)
    sub.set_defaults(func=run_visualize)

    sub = subparsers.add_parser(
        "machine",
        parents=[machine_parent],
        help="print the machine configuration and wiring tables",
        description=(
            "Print the current machine configuration and the complete wiring "
            "tables of every available rotor and reflector."
        ),
    )
    sub.set_defaults(func=run_machine)

    args = parser.parse_args(argv)

    if args.interactive:
        return run_interactive(args)

    if args.command is None:
        parser.print_help()
        return 0
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
