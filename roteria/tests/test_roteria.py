"""Unit and CLI tests for Rotoria.

Run from the repository root with::

    python -m unittest discover -s roteria/tests
"""

import subprocess
import sys
import unittest

from roteria.roteria import (
    ALPHABET,
    REFLECTOR_WIRINGS,
    ROTOR_NOTCHES,
    ROTOR_WIRINGS,
    Plugboard,
    Reflector,
    Rotor,
    build_machine,
    parse_plugboard,
    parse_positions,
    parse_rings,
    sanitise_message,
)

ROOT = "/".join(__file__.split("/")[:-3])


def _run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "roteria"] + list(args),
        capture_output=True,
        text=True,
        cwd=ROOT,
    )


def _machine(**kwargs):
    return build_machine(**kwargs)


# ---------------------------------------------------------------------------
# Wiring tables
# ---------------------------------------------------------------------------


class WiringTests(unittest.TestCase):
    def test_rotor_wiring_tables(self):
        expected = {
            "I": "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
            "II": "AJDKSIRUXBLHWTMCQGZNPYFVOE",
            "III": "BDFHJLCPRTXVZNYEIWGAKMUSQO",
            "IV": "ESOVPZJAYQUIRHXLNFTGKDCMWB",
            "V": "VZBRGITYUPSDNHLXAWMJQOFECK",
        }
        self.assertEqual(ROTOR_WIRINGS, expected)

    def test_reflector_wiring_tables(self):
        expected = {
            "B": "YRUHQSLDPXNGOKMIEBFZCWVJAT",
            "C": "FVPJIAOYEDRZXWGCTKUQSBNMHL",
        }
        self.assertEqual(REFLECTOR_WIRINGS, expected)

    def test_notch_letters(self):
        self.assertEqual(ROTOR_NOTCHES, {"I": "Q", "II": "E", "III": "V", "IV": "J", "V": "Z"})

    def test_rotor_forward_at_rest_matches_published_wiring(self):
        for name, wiring in ROTOR_WIRINGS.items():
            rotor = Rotor(name)
            for index in range(26):
                self.assertEqual(
                    rotor.forward(index),
                    ALPHABET.index(wiring[index]),
                    "rotor %s forward of %s" % (name, ALPHABET[index]),
                )

    def test_rotor_backward_is_inverse(self):
        for name in ROTOR_WIRINGS:
            rotor = Rotor(name)
            for index in range(26):
                self.assertEqual(rotor.backward(rotor.forward(index)), index)

    def test_reflector_is_reciprocal(self):
        for name in REFLECTOR_WIRINGS:
            reflector = Reflector(name)
            for index in range(26):
                self.assertEqual(reflector.forward(reflector.forward(index)), index)
                self.assertNotEqual(reflector.forward(index), index)

    def test_wiring_is_a_permutation(self):
        for name, wiring in ROTOR_WIRINGS.items():
            self.assertEqual(sorted(wiring), list(ALPHABET), "rotor %s" % name)
        for name, wiring in REFLECTOR_WIRINGS.items():
            self.assertEqual(sorted(wiring), list(ALPHABET), "reflector %s" % name)

    def test_unknown_rotor_and_reflector_rejected(self):
        with self.assertRaises(ValueError):
            Rotor("VI")
        with self.assertRaises(ValueError):
            Reflector("D")


# ---------------------------------------------------------------------------
# Stepping
# ---------------------------------------------------------------------------


class SteppingTests(unittest.TestCase):
    def test_rightmost_rotor_steps_every_keypress(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        for expected in ["AAB", "AAC", "AAD", "AAE", "AAF", "AAG", "AAH"]:
            machine.encrypt_letter(0)
            self.assertEqual("".join(machine.windows()), expected)

    def test_documented_stepping_sequence(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        expected = (
            "AAB AAC AAD AAE AAF AAG AAH AAI AAJ AAK AAL AAM AAN AAO AAP AAQ AAR "
            "AAS AAT AAU AAV ABW ABX ABY ABZ ABA ABB ABC"
        ).split()
        seen = []
        for _ in range(len(expected)):
            machine.encrypt_letter(0)
            seen.append("".join(machine.windows()))
        self.assertEqual(seen, expected)

    def test_middle_rotor_carried_at_right_notch(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAV")
        machine.encrypt_letter(0)
        self.assertEqual("".join(machine.windows()), "ABW")

    def test_left_rotor_carried_at_middle_notch(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AEV")
        machine.encrypt_letter(0)
        self.assertEqual("".join(machine.windows()), "BFW")

    def test_double_stepping_of_middle_rotor(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="ADV")
        machine.encrypt_letter(0)  # right at notch -> middle + right
        self.assertEqual("".join(machine.windows()), "AEW")
        machine.encrypt_letter(0)  # middle now at its notch -> all three
        self.assertEqual("".join(machine.windows()), "BFX")

    def test_windows_wrap_around(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="ABZ")
        machine.encrypt_letter(0)
        self.assertEqual("".join(machine.windows()), "ABA")

    def test_single_rotor_steps_each_press(self):
        machine = _machine(rotor_spec="I", ring_spec="1", position_spec="A")
        for expected in ["B", "C", "D", "E", "F"]:
            machine.encrypt_letter(0)
            self.assertEqual("".join(machine.windows()), expected)


# ---------------------------------------------------------------------------
# Cryptography
# ---------------------------------------------------------------------------


class CipherTests(unittest.TestCase):
    def test_known_vector_no_plugboard(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        self.assertEqual(
            machine.process("HELLOWORLD"),
            "ILBDAAMTAZ",
        )

    def test_known_vector_26_letters(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        self.assertEqual(
            machine.process("A" * 26),
            "BDZGOWCXLTKSBTMCDLPBMUQOFX",
        )

    def test_known_vector_with_plugboard(self):
        machine = _machine(
            rotor_spec="I II III",
            ring_spec="1 1 1",
            position_spec="AAA",
            plugboard_spec="AB CD EF",
        )
        self.assertEqual(machine.process("HELLOWORLD"), "IKACBBMTBF")

    def test_known_vector_mixed_rotors_rings_plugboard(self):
        machine = _machine(
            rotor_spec="II III V",
            ring_spec="2 3 4",
            position_spec="ABC",
            plugboard_spec="AB CD EF",
        )
        self.assertEqual(machine.process("ATTACKATDAWN"), "IMIYHIZLCUBI")

    def test_known_vector_reflector_c(self):
        machine = _machine(rotor_spec="III II I", ring_spec="3 3 3", position_spec="QWE", reflector="C")
        self.assertEqual(machine.process("THEQUICKBROWNFOX"), "IDPOFJPLHBYCJIAQ")

    def test_known_vector_four_rotors(self):
        machine = _machine(
            rotor_spec="V IV III II",
            ring_spec="1 1 1 1",
            position_spec="AAAA",
            plugboard_spec="AB CD EF GH",
        )
        self.assertEqual(machine.process("FOURROTORTEST"), "RTGYUHPMCRGFB")

    def test_involution(self):
        configs = [
            dict(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA"),
            dict(rotor_spec="IV II V", ring_spec="3 9 15", position_spec="QWE", reflector="C"),
            dict(
                rotor_spec="III II I",
                ring_spec="2 4 6",
                position_spec="XYZ",
                plugboard_spec="AB CD EF GH IJ KL",
            ),
        ]
        for config in configs:
            with self.subTest(config=config):
                machine = _machine(**config)
                message = "THEENIGMAMACHINEISANINVOLUTION"
                ciphertext = machine.process(message)
                fresh = _machine(**config)
                self.assertEqual(fresh.process(ciphertext), message)

    def test_process_returns_uppercase_only(self):
        dirty = _machine().process("hello world 123!")
        clean = _machine().process("HELLOWORLD")
        self.assertEqual(dirty, clean)

    def test_plugboard_swaps_are_reciprocal(self):
        plugboard = Plugboard(["AB", "CD"])
        for index in range(26):
            self.assertEqual(plugboard.swap(plugboard.swap(index)), index)

    def test_signal_path_structure(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        path = machine.signal_path("A")
        stages = [stage for stage, _ in path]
        self.assertEqual(
            stages,
            ["stecker-in", "III.fwd", "II.fwd", "I.fwd", "refl", "I.back", "II.back", "III.back", "stecker-out"],
        )
        # no stepping happened: windows unchanged
        self.assertEqual("".join(machine.windows()), "AAA")

    def test_signal_path_matches_encryption(self):
        machine = _machine(rotor_spec="I II III", ring_spec="1 1 1", position_spec="AAA")
        # encrypt_letter steps the rotors and encrypts; signal_path reflects
        # the same (already stepped) state without advancing.
        output = machine.encrypt_letter(ALPHABET.index("A"))
        path = machine.signal_path("A")
        self.assertEqual(ALPHABET[path[-1][1]], ALPHABET[output])


# ---------------------------------------------------------------------------
# Parsing and validation
# ---------------------------------------------------------------------------


class ParsingTests(unittest.TestCase):
    def test_ring_letters_and_numbers(self):
        self.assertEqual(parse_rings("1 2 3", 3), [0, 1, 2])
        self.assertEqual(parse_rings("A B C", 3), [0, 1, 2])
        self.assertEqual(parse_rings("26 1 13", 3), [25, 0, 12])
        self.assertEqual(parse_rings(None, 3), [0, 0, 0])

    def test_ring_contiguous_letters(self):
        self.assertEqual(parse_rings("ABC", 3), [0, 1, 2])
        self.assertEqual(parse_rings("qwe", 3), [16, 22, 4])

    def test_position_letters_numbers_and_contiguous(self):
        self.assertEqual(parse_positions("A B C", 3), [0, 1, 2])
        self.assertEqual(parse_positions("AAA", 3), [0, 0, 0])
        self.assertEqual(parse_positions("0 1 25", 3), [0, 1, 25])
        self.assertEqual(parse_positions(None, 3), [0, 0, 0])

    def test_ring_count_mismatch_rejected(self):
        with self.assertRaises(ValueError):
            parse_rings("1 2", 3)

    def test_position_count_mismatch_rejected(self):
        with self.assertRaises(ValueError):
            parse_positions("A B", 3)

    def test_invalid_ring_and_position_rejected(self):
        with self.assertRaises(ValueError):
            parse_rings("0", 1)
        with self.assertRaises(ValueError):
            parse_rings("27", 1)
        with self.assertRaises(ValueError):
            parse_positions("26", 1)
        with self.assertRaises(ValueError):
            parse_rings("!", 1)

    def test_plugboard_parsing(self):
        plugboard = parse_plugboard("AB CD EF")
        self.assertEqual(plugboard.pairs, ("AB", "CD", "EF"))
        self.assertEqual(parse_plugboard(None).pairs, ())
        self.assertEqual(parse_plugboard("").pairs, ())

    def test_plugboard_validation(self):
        with self.assertRaises(ValueError):
            parse_plugboard("AA")
        with self.assertRaises(ValueError):
            parse_plugboard("ABC")
        with self.assertRaises(ValueError):
            parse_plugboard("A1")
        with self.assertRaises(ValueError):
            parse_plugboard("AB AC")
        with self.assertRaises(ValueError):
            parse_plugboard(" ".join("AB CD EF GH IJ KL MN OP QR ST UV WX YZ ZA".split()[:14]))

    def test_sanitise_message(self):
        self.assertEqual(sanitise_message("Hello, World!"), "HELLOWORLD")
        self.assertEqual(sanitise_message("abc 123"), "ABC")
        self.assertEqual(sanitise_message(""), "")


class BuildTests(unittest.TestCase):
    def test_default_machine(self):
        machine = _machine()
        self.assertEqual([r.name for r in machine.rotors], ["I", "II", "III"])
        self.assertEqual(machine.reflector.name, "B")
        self.assertEqual(machine.plugboard.pairs, ())

    def test_rotor_order_respected(self):
        machine = _machine(rotor_spec="III II I")
        self.assertEqual([r.name for r in machine.rotors], ["III", "II", "I"])

    def test_ring_and_position_applied(self):
        machine = _machine(rotor_spec="I II III", ring_spec="2 3 4", position_spec="QWE")
        self.assertEqual([r.ring for r in machine.rotors], [1, 2, 3])
        self.assertEqual([r.position for r in machine.rotors], [16, 22, 4])

    def test_single_rotor_allowed(self):
        machine = _machine(rotor_spec="IV")
        self.assertEqual(len(machine.rotors), 1)

    def test_no_rotors_rejected(self):
        with self.assertRaises(ValueError):
            _machine(rotor_spec="")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


class CliTests(unittest.TestCase):
    def test_encrypt_and_decrypt_round_trip(self):
        setup = ["--rotors", "I", "II", "III", "--rings", "1", "2", "3", "--positions", "ABC", "--stecker", "AB", "CD"]
        enc = _run_cli("encrypt", "HELLOWORLD", *setup)
        self.assertEqual(enc.returncode, 0, enc.stderr)
        ciphertext = enc.stdout.strip()
        dec = _run_cli("decrypt", ciphertext, *setup)
        self.assertEqual(dec.returncode, 0, dec.stderr)
        self.assertEqual(dec.stdout.strip(), "HELLOWORLD")

    def test_encrypt_decrypt_are_identical_operations(self):
        enc = _run_cli("encrypt", "ATTACKATDAWN", "--rotors", "II", "III", "V")
        dec = _run_cli("decrypt", "ATTACKATDAWN", "--rotors", "II", "III", "V")
        self.assertEqual(enc.stdout, dec.stdout)
        self.assertEqual(enc.returncode, dec.returncode)

    def test_group_output(self):
        result = _run_cli("encrypt", "HELLOWORLD", "--group", "5")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip().replace(" ", ""), "ILBDAAMTAZ")
        self.assertIn(" ", result.stdout.strip())

    def test_reads_message_from_stdin(self):
        proc = subprocess.run(
            [sys.executable, "-m", "roteria", "encrypt"],
            input="HELLOWORLD\n",
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.strip(), "ILBDAAMTAZ")

    def test_empty_message_errors(self):
        result = _run_cli("encrypt", "")
        self.assertEqual(result.returncode, 2)
        self.assertIn("nothing to process", result.stderr)

    def test_invalid_rotor_rejected(self):
        result = _run_cli("encrypt", "HI", "--rotors", "VI", "II", "III")
        self.assertEqual(result.returncode, 2)
        self.assertIn("unknown rotor", result.stderr)

    def test_invalid_ring_rejected(self):
        result = _run_cli("encrypt", "HI", "--rings", "0", "1", "1")
        self.assertEqual(result.returncode, 2)
        self.assertIn("ring setting", result.stderr)

    def test_invalid_position_rejected(self):
        result = _run_cli("encrypt", "HI", "--positions", "A", "B")
        self.assertEqual(result.returncode, 2)
        self.assertIn("expected 3 position", result.stderr)

    def test_self_plugboard_pair_rejected(self):
        result = _run_cli("encrypt", "HI", "--stecker", "AA")
        self.assertEqual(result.returncode, 2)
        self.assertIn("itself", result.stderr)

    def test_reused_plugboard_letter_rejected(self):
        result = _run_cli("encrypt", "HI", "--stecker", "AB", "AC")
        self.assertEqual(result.returncode, 2)
        self.assertIn("more than once", result.stderr)

    def test_unknown_reflector_rejected(self):
        result = _run_cli("encrypt", "HI", "--reflector", "D")
        self.assertEqual(result.returncode, 2)
        self.assertIn("unknown reflector", result.stderr)

    def test_version(self):
        result = _run_cli("--version")
        self.assertEqual(result.returncode, 0)
        self.assertIn("roteria", result.stdout)

    def test_help_lists_subcommands(self):
        result = _run_cli("--help")
        self.assertEqual(result.returncode, 0)
        for name in ("encrypt", "decrypt", "visualize", "machine"):
            self.assertIn(name, result.stdout)

    def test_visualize_prints_path_and_windows(self):
        result = _run_cli("visualize", "A", "--positions", "AAA")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("III.fwd", result.stdout)
        self.assertIn("refl", result.stdout)
        self.assertIn("windows:", result.stdout)

    def test_machine_prints_wiring_tables(self):
        result = _run_cli("machine", "--reflector", "C")
        self.assertEqual(result.returncode, 0, result.stderr)
        compact = result.stdout.replace(" ", "")
        self.assertIn("EKMFLGDQVZNTOWYHXUSPAIBRCJ", compact)
        self.assertIn("YRUHQSLDPXNGOKMIEBFZCWVJAT", compact)

    def test_no_command_prints_help(self):
        result = _run_cli()
        self.assertEqual(result.returncode, 0)
        self.assertIn("usage", result.stdout.lower())


if __name__ == "__main__":
    unittest.main()
