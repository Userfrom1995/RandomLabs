#!/usr/bin/env python3
"""Durable contract tests for the maze-chase terminal compatibility harness.

These tests pin the harness contracts that were established by the PR
review rounds and exercised live by the Tester:

- the runner entrypoints documented in ``tools/compat/README.md`` (the
  "Running" section shows bare ``tools/compat/run-linux.sh ...``
  commands) are directly executable, matching the lab convention of the
  755-mode ``.github/scripts/*.sh`` runners;
- the collector's honesty gates: a proposed ``pass`` with zero accepted
  captures is downgraded to ``partial``, an undecodable capture is
  rejected from the bundle (never copied), and ``--result unverified``
  without a reason is refused;
- kitty protocol stats accumulate every continuation chunk of a chunked
  transmit, not just the first 4096-byte chunk;
- the committed evidence bundle stays internally consistent: per-phase
  bytes reconcile with the transcript total, every cited screenshot
  exists with its recorded sha256 and dimensions, no committed
  ``events.log`` carries the runner's scratch paths, and every row
  records its generating build (commit, binary sha256, clean sources);
- a bitmap-tier (kitty-graphics/sixel) ``pass`` requires a decodable
  playing capture, so a menu-only capture set can never sign one.

Run from the repository root (no third-party dependencies):

    python3 -m unittest discover -s maze-chase/tools/compat/tests -v
"""

import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
COMPAT_DIR = os.path.dirname(TEST_DIR)
EVIDENCE_DIR = os.path.join(COMPAT_DIR, "evidence")
COLLECT_PY = os.path.join(COMPAT_DIR, "collect.py")
PROBE_PY = os.path.join(COMPAT_DIR, "probe-graphics.py")

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def load_collect_module():
    spec = importlib.util.spec_from_file_location("compat_collect", COLLECT_PY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def png_ihdr_dims(path):
    with open(path, "rb") as fh:
        head = fh.read(24)
    if head[:8] != PNG_SIG or head[12:16] != b"IHDR":
        raise AssertionError(f"{path}: not a PNG with IHDR first")
    return (
        int.from_bytes(head[16:20], "big"),
        int.from_bytes(head[20:24], "big"),
    )


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_run_dir(root, *, screenshot_name="title.png", create_png=None,
                 transcript=b"", checkpoint="title", meta_extra=None):
    """Build a minimal run directory shaped like drive.sh's output."""
    session = os.path.join(root, "session")
    shots = os.path.join(session, "screenshots")
    os.makedirs(shots, exist_ok=True)
    meta = {
        "emulator_version": "test",
        "arch": "x86_64",
        "transcript": "session/pty.log",
        "geometry": {},
        "extra_env": [],
        "runner": {"host": "test", "id": "compat-harness"},
        "exit": {"code": 0, "killed": False, "game_exited": True,
                 "process_exited": True},
    }
    if meta_extra:
        meta.update(meta_extra)
    with open(os.path.join(session, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh)
    with open(os.path.join(session, "events.log"), "w", encoding="utf-8") as fh:
        fh.write(f"100\tcheckpoint\t{checkpoint}\t{len(transcript)}\t"
                 f"session/screenshots/{screenshot_name}\n")
        fh.write(f"200\texit\texited=true killed=false\t{len(transcript)}\t\n")
    if create_png is not None:
        with open(os.path.join(shots, screenshot_name), "wb") as fh:
            fh.write(create_png)
    if transcript:
        with open(os.path.join(session, "pty.log"), "wb") as fh:
            fh.write(transcript)
    return root


FIXED_SESSION_CHECKPOINTS = (
    "title",
    "playing",
    "paused",
    "title-return",
    "help",
    "scores",
    "settings",
)
RESIZE_CHECKPOINTS = ("resized-wide", "too-small", "refit")


def make_fixed_session_run_dir(root, *, driver="x11", resize=False,
                               omit=(), empty=(), uncaptured=(),
                               readiness="ready", waited_ms=1234):
    """Build a run directory shaped like a complete drive.sh session.

    Every checkpoint carries its own transcript bytes and a distinct
    decodable capture unless the caller asks for it to be missing
    (`omit`), zero-byte (`empty`), or capture-less (`uncaptured`).
    `readiness` selects a successful first-output event, a timeout, or
    no event at all.
    """
    session = os.path.join(root, "session")
    shots = os.path.join(session, "screenshots")
    os.makedirs(shots, exist_ok=True)
    names = list(FIXED_SESSION_CHECKPOINTS)
    if resize:
        names.extend(RESIZE_CHECKPOINTS)
    meta = {
        "emulator_version": "test",
        "arch": "arm64" if driver == "macos" else "x86_64",
        "driver": driver,
        "transcript": "session/pty.log",
        "geometry": {"resize_exercised": bool(resize)},
        "extra_env": [],
        "runner": {"host": "test", "id": "compat-harness"},
        "exit": {"code": 0, "killed": False, "game_exited": True,
                 "process_exited": True},
    }
    with open(os.path.join(session, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh)
    transcript = bytearray()
    events = []
    if readiness == "ready":
        events.append(
            f"10\treadiness\twaited_ms={waited_ms} baseline_bytes=0 "
            f"first_output_bytes=1\t0\t"
        )
    elif readiness == "timeout":
        events.append(
            f"10\treadiness-timeout\twaited_ms={waited_ms} baseline_bytes=0 "
            f"first_output_bytes=0\t0\t"
        )
    if readiness != "timeout":
        for index, name in enumerate(names):
            if name in omit:
                continue
            if name not in empty:
                transcript.extend(f"{name} frame {index}\r\n".encode())
            shot = (
                None
                if name in uncaptured
                else f"session/screenshots/{name}.png"
            )
            events.append(
                f"{100 + index}\tcheckpoint\t{name}\t{len(transcript)}\t"
                f"{shot or ''}"
            )
            if shot:
                base = 10 + index * 10
                pixels = bytes(
                    min(255, value + base)
                    for value in (10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
                                  110, 120)
                )
                with open(os.path.join(shots, f"{name}.png"), "wb") as fh:
                    fh.write(make_rgb_png(2, 2, pixels))
    transcript.extend(b"video tier: truecolor-cells\r\n")
    events.append(
        f"900\texit\texited=true killed=false\t{len(transcript)}\t"
    )
    with open(os.path.join(session, "events.log"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(events) + "\n")
    with open(os.path.join(session, "pty.log"), "wb") as fh:
        fh.write(bytes(transcript))
    return root


def make_rgb_png(width, height, pixels):
    """A minimal truecolor PNG from a flat RGB byte sequence (one
    filter-0 scanline per row), enough for the collector's decoder."""
    import struct
    import zlib

    if len(pixels) != width * height * 3:
        raise AssertionError("pixel buffer size mismatch")
    raw = b"".join(
        b"\x00" + bytes(pixels[y * width * 3:(y + 1) * width * 3])
        for y in range(height)
    )

    def chunk(kind, payload):
        return (
            len(payload).to_bytes(4, "big")
            + kind
            + payload
            + (zlib.crc32(kind + payload) & 0xFFFFFFFF).to_bytes(4, "big")
        )

    return (
        PNG_SIG
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def _png_chunk(kind, payload):
    import zlib

    return (
        len(payload).to_bytes(4, "big")
        + kind
        + payload
        + (zlib.crc32(kind + payload) & 0xFFFFFFFF).to_bytes(4, "big")
    )


def make_gray_png(width, height, bit_depth, samples):
    """A minimal grayscale PNG (color type 0) at bit depth 1/2/4/8."""
    import struct
    import zlib

    mask = (1 << bit_depth) - 1
    if len(samples) != width * height:
        raise AssertionError("sample buffer size mismatch")
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        if bit_depth == 8:
            raw.extend(samples[y * width:(y + 1) * width])
        else:
            per_byte = 8 // bit_depth
            for x0 in range(0, width, per_byte):
                byte = 0
                for slot in range(per_byte):
                    x = x0 + slot
                    if x >= width:
                        break
                    byte |= (samples[y * width + x] & mask) << (
                        8 - bit_depth * (slot + 1)
                    )
                raw.append(byte)
    return (
        PNG_SIG
        + _png_chunk(b"IHDR",
                     struct.pack(">IIBBBBB", width, height, bit_depth, 0, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw)))
        + _png_chunk(b"IEND", b"")
    )


def make_gray_alpha_png(width, height, gray, alpha=255, bit_depth=8):
    """A minimal gray+alpha PNG (color type 4) from one flat pair.

    At depths 1/2/4 each pixel packs its gray sample then its alpha
    sample, MSB-first, so a test can prove the same all-ones-is-white
    classification the 8-bit path uses.
    """
    import struct
    import zlib

    mask = (1 << bit_depth) - 1
    raw = bytearray()
    for _ in range(height):
        raw.append(0)
        if bit_depth == 8:
            raw.extend(bytes([gray, alpha]) * width)
        else:
            per_byte = 8 // (2 * bit_depth)
            for x0 in range(0, width, per_byte):
                byte = 0
                for slot in range(per_byte):
                    x = x0 + slot
                    if x >= width:
                        break
                    gray_shift = 8 - bit_depth - slot * 2 * bit_depth
                    byte |= (gray & mask) << gray_shift
                    byte |= (alpha & mask) << (gray_shift - bit_depth)
                raw.append(byte)
    return (
        PNG_SIG
        + _png_chunk(b"IHDR",
                     struct.pack(">IIBBBBB", width, height, bit_depth, 4, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw)))
        + _png_chunk(b"IEND", b"")
    )


def run_collect(run_dir, evidence_dir, *extra, os_name="linux"):
    return subprocess.run(
        [sys.executable, COLLECT_PY, "--run-dir", run_dir,
         "--emulator", "xterm", "--os", os_name, "--tier", "auto",
         "--evidence-dir", evidence_dir, "--row-name", "unit-test-row",
         *extra],
        capture_output=True, text=True,
    )


class TestFixedSessionHonestyGates(unittest.TestCase):
    """A transcript-driven pass must prove the fixed session rendered.

    The macOS cold-start failure (issue #786) captured an empty title
    phase and duplicate pre-render captures while still signing a pass.
    These tests pin the required-checkpoint and first-paint gates that
    make that shape partial or unverified.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="compat-contract-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def _collect(self, **kwargs):
        run_dir = make_fixed_session_run_dir(
            os.path.join(self.tmp, "run"), **kwargs
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            return json.load(fh)

    def test_complete_fixed_session_stays_pass(self):
        row = self._collect()
        self.assertEqual(row["disposition"], "pass")
        self.assertEqual(row["readiness"]["timed_out"], False)
        self.assertEqual(row["readiness"]["waited_ms"], 1234)
        self.assertEqual(row["readiness"]["first_output_bytes"], 1)

    def test_missing_checkpoint_is_partial(self):
        row = self._collect(omit=("help",))
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("missing required checkpoint(s): help" in note
                for note in row["notes"]),
            f"missing required-checkpoint reason in {row['notes']}",
        )

    def test_zero_byte_checkpoint_is_partial(self):
        row = self._collect(empty=("title",))
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("carried no transcript output: title" in note
                for note in row["notes"]),
            f"missing zero-byte reason in {row['notes']}",
        )

    def test_uncaptured_checkpoint_is_partial(self):
        row = self._collect(uncaptured=("scores",))
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("produced no decodable capture: scores" in note
                for note in row["notes"]),
            f"missing uncaptured reason in {row['notes']}",
        )

    def test_resize_checkpoints_are_required_when_exercised(self):
        row = self._collect(resize=True, omit=("refit",))
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("missing required checkpoint(s): refit" in note
                for note in row["notes"]),
            f"missing resize reason in {row['notes']}",
        )

    def test_complete_resized_session_stays_pass(self):
        row = self._collect(resize=True)
        self.assertEqual(row["disposition"], "pass")

    def test_macos_session_does_not_require_resize_checkpoints(self):
        row = self._collect(driver="macos", resize=False)
        self.assertEqual(row["disposition"], "pass")

    def test_readiness_timeout_is_unverified_not_partial(self):
        row = self._collect(readiness="timeout", waited_ms=30000)
        self.assertEqual(row["disposition"], "unverified")
        self.assertEqual(row["readiness"]["timed_out"], True)
        self.assertIn("never painted its first frame",
                      row.get("unverified_reason", ""))

    def test_required_checkpoints_follow_the_driver(self):
        module = load_collect_module()
        self.assertEqual(module.required_checkpoints({}), ())
        self.assertEqual(
            module.required_checkpoints({"driver": "windows"}), ()
        )
        self.assertEqual(
            module.required_checkpoints({"driver": "none"}), ()
        )
        self.assertEqual(
            module.required_checkpoints({"driver": "x11"}),
            FIXED_SESSION_CHECKPOINTS,
        )
        self.assertEqual(
            module.required_checkpoints({"driver": "macos"}),
            FIXED_SESSION_CHECKPOINTS,
        )
        self.assertEqual(
            module.required_checkpoints(
                {"driver": "x11", "geometry": {"resize_exercised": True}}
            ),
            FIXED_SESSION_CHECKPOINTS + RESIZE_CHECKPOINTS,
        )

    def test_readiness_events_parse_into_ints(self):
        module = load_collect_module()
        events = [
            {"type": "readiness",
             "detail": "waited_ms=250 baseline_bytes=0 first_output_bytes=64"},
            {"type": "exit", "detail": "exited=true"},
        ]
        self.assertEqual(
            module.readiness_from_events(events),
            {
                "waited_ms": 250,
                "baseline_bytes": 0,
                "first_output_bytes": 64,
                "timed_out": False,
            },
        )
        timeout = [
            {"type": "readiness-timeout",
             "detail": "waited_ms=30000 baseline_bytes=0 first_output_bytes=0"},
        ]
        self.assertTrue(module.readiness_from_events(timeout)["timed_out"])
        self.assertIsNone(module.readiness_from_events([]))


class TestDriveReadiness(unittest.TestCase):
    """The real drive.sh first-output wait, exercised with --driver none.

    A cold macOS terminal accepted the session keys before the game had
    painted, so the title phase was 0 bytes and the row still passed.
    These tests run the shipped driver (no emulator needed) and prove the
    bounded wait logs `readiness`, a timeout logs `readiness-timeout` and
    skips the title checkpoint, and the collector grades a timed-out
    session unverified.
    """

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="compat-drive-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def _run_drive(self, launch, *extra):
        outdir = os.path.join(self.tmp, "run")
        transcript = os.path.join(outdir, "session", "pty.log")
        proc = subprocess.run(
            ["bash", os.path.join(COMPAT_DIR, "drive.sh"),
             "--driver", "none", "--launch", launch, "--outdir", outdir,
             "--emulator", "unit-test", "--transcript", transcript,
             *extra],
            capture_output=True, text=True, timeout=60,
        )
        return proc, outdir

    def _events(self, outdir):
        path = os.path.join(outdir, "session", "events.log")
        with open(path, encoding="utf-8") as fh:
            return [line.rstrip("\n").split("\t")
                    for line in fh if line.strip()]

    def test_ready_seconds_must_be_positive(self):
        for value in ("0", "-1", "abc", ""):
            outdir = os.path.join(self.tmp, "bad")
            proc = subprocess.run(
                ["bash", os.path.join(COMPAT_DIR, "drive.sh"),
                 "--driver", "none", "--launch", "true", "--outdir", outdir,
                 "--ready-seconds", value],
                capture_output=True, text=True,
            )
            self.assertEqual(proc.returncode, 2, value)
            self.assertIn("positive integer", proc.stderr)

    @unittest.skipUnless(shutil.which("jq"), "drive.sh needs jq")
    def test_readiness_timeout_skips_the_title_checkpoint(self):
        proc, outdir = self._run_drive("sleep 3", "--ready-seconds", "1")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("no transcript output", proc.stderr)
        events = self._events(outdir)
        self.assertTrue(
            any(event[1] == "readiness-timeout" for event in events),
            events,
        )
        self.assertFalse(
            any(event[1] == "checkpoint" and event[2] == "title"
                for event in events),
            "a timed-out session must not capture a blank title checkpoint",
        )
        evidence = os.path.join(self.tmp, "evidence")
        collected = run_collect(outdir, evidence, "--result", "pass")
        self.assertEqual(collected.returncode, 0, collected.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "unverified")
        self.assertEqual(row["readiness"]["timed_out"], True)

    @unittest.skipUnless(shutil.which("jq"), "drive.sh needs jq")
    def test_first_output_is_logged_before_the_title_checkpoint(self):
        transcript = os.path.join(self.tmp, "run", "session", "pty.log")
        launch = "printf 'boot\\r\\n' >> '%s'; sleep 0.2" % transcript
        proc, outdir = self._run_drive(launch, "--ready-seconds", "5")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        events = self._events(outdir)
        types = [event[1] for event in events]
        self.assertIn("readiness", types)
        self.assertLess(
            types.index("readiness"), types.index("checkpoint"),
            "the readiness event must precede the title checkpoint",
        )
        readiness = next(event for event in events
                         if event[1] == "readiness")
        detail = dict(token.split("=", 1)
                      for token in readiness[2].split())
        self.assertGreater(int(detail["first_output_bytes"]), 0)


class TestRunnerEntrypoints(unittest.TestCase):
    """The README's bare-path commands must be executable as shown."""

    def test_documented_runners_are_executable(self):
        for name in ("run-linux.sh", "run-macos.sh"):
            path = os.path.join(COMPAT_DIR, name)
            mode = os.stat(path).st_mode & 0o777
            self.assertTrue(
                mode & 0o111,
                f"{name} is not executable (mode {oct(mode)}); "
                f"tools/compat/README.md documents "
                f"`tools/compat/{name} ...` as a direct command, and the "
                f"lab convention (.github/scripts/*.sh, setup.sh) is 755. "
                f"Direct invocation fails with: Permission denied",
            )

    def test_macos_initial_rejects_extra_separators(self):
        proc = subprocess.run(
            ["bash", os.path.join(COMPAT_DIR, "run-macos.sh"),
             "--initial", "100x40x50"],
            capture_output=True, text=True,
        )
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("COLSxROWS", proc.stderr)
        with open(os.path.join(COMPAT_DIR, "run-macos.sh"),
                  encoding="utf-8") as fh:
            body = fh.read()
        self.assertIn(r"=~ ^[0-9]+x[0-9]+$", body)
        self.assertNotIn("[0-9]*x[0-9]*", body)


class TestCollectorHonestyGates(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="compat-contract-")
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def test_zero_capture_pass_is_downgraded_to_partial(self):
        run_dir = make_run_dir(os.path.join(self.tmp, "run"), create_png=None)
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("no checkpoint capture entered the bundle" in note
                for note in row["notes"]),
            f"missing zero-capture reason in {row['notes']}",
        )

    def test_too_small_only_session_is_unverified_not_partial(self):
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            create_png=make_rgb_png(2, 2, bytes([10, 10, 10]) * 4),
            transcript=(
                b"window 120x30 is too small\r\n"
                b"needs at least 62x35\r\n"
            ),
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "unverified")
        self.assertIn("too-small", row.get("unverified_reason", ""))
        self.assertEqual(
            row["phases"][0]["surfaces"]["too_small"]["paints"], 1
        )

    def test_session_that_plays_after_the_too_small_card_keeps_its_result(self):
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            create_png=make_rgb_png(2, 2, bytes([10, 10, 10]) * 4),
            transcript=(
                b"window 120x30 is too small\r\n"
                b"video tier: truecolor-cells\r\n"
                b"VIDEO  truecolor-cells\r\n"
            ),
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "pass")
        self.assertFalse(row.get("unverified_reason"))

    def test_undecodable_capture_is_rejected_not_copied(self):
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            create_png=PNG_SIG + b"\x00" * 16,
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertEqual(row.get("rejected_captures"), ["title"])
        copied = os.path.join(evidence, "unit-test-row", "screenshots")
        self.assertFalse(
            os.path.isfile(os.path.join(copied, "title.png")),
            "a rejected capture must never be copied into the bundle",
        )

    def test_unverified_without_reason_is_refused(self):
        run_dir = make_run_dir(os.path.join(self.tmp, "run"))
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "unverified")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("--unverified-reason is required", proc.stderr)
        self.assertFalse(
            os.path.isfile(os.path.join(evidence, "unit-test-row.json")),
            "a refused unverified row must not be written",
        )

    def test_kitty_payload_accumulates_every_chunk(self):
        collect = load_collect_module()
        stream = (
            b"\x1b_Ga=T,m=1;AAAA\x1b\\"
            b"\x1b_Gm=1;BBBB\x1b\\"
            b"\x1b_Gm=0;CCCC\x1b\\"
        )
        stats = collect.kitty_stats(stream)
        self.assertEqual(stats["transmits"], 1)
        self.assertEqual(stats["payload_bytes"], 12)
        self.assertEqual(stats["first_chunks_bytes"], 4)
        self.assertTrue(stats["chunked"])

    def test_kitty_quiet_transmit_counts_as_a_transmit(self):
        # The placement pipeline ships the static layer and atlas with
        # `a=t`; a collector that only counts `a=T` would report zero
        # transmits for every placement-mode row.
        collect = load_collect_module()
        stream = (
            b"\x1b_Ga=t,f=100,i=1,m=1;AAAA\x1b\\"
            b"\x1b_Gm=0;BBBB\x1b\\"
            b"\x1b_Ga=p,i=1,p=1,x=0,y=0,w=2,h=2\x1b\\"
        )
        stats = collect.kitty_stats(stream)
        self.assertEqual(stats["transmits"], 1)
        self.assertEqual(stats["placements"], 1)
        self.assertEqual(stats["payload_bytes"], 8)

    def test_sprite_census_matches_only_exact_palette_pixels(self):
        collect = load_collect_module()
        decoded = {
            "width": 2,
            "height": 1,
            "bit_depth": 8,
            "color_type": 6,
            "palette": None,
            "stride": 8,
            # Rill #7ED957 (exact) then an off-by-one red that must not
            # count as anything.
            "rows": bytes([126, 217, 87, 255, 250, 217, 87, 255]),
        }
        census = collect.sprite_census(decoded)
        self.assertEqual(census["pixels"], 1)
        self.assertEqual(census["by_color"]["rill"], 1)
        self.assertEqual(census["by_color"]["bram"], 0)

    def test_kitty_pass_without_visible_sprites_is_downgraded(self):
        # Placements on the wire plus a valid non-white board capture
        # used to record a clean `pass` even when every sprite was hidden
        # behind the static board (the equal-z Ghostty collapse). The
        # collector must refuse to sign sprite visibility without a
        # sprite-palette pixel in a playing capture.
        transcript = (
            b"\x1b[?2026h"
            b"\x1b[2J\x1b_Ga=d\x1b\\"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            b"\x1b[?2026l"
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
        )
        png = make_rgb_png(2, 2, [24, 16, 12] * 4)
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["tier_observed"], "kitty-graphics")
        self.assertGreater(row["protocol_totals"]["kitty"]["placements"], 0)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("sprite-palette pixel" in note for note in row["notes"]),
            f"missing sprite-visibility reason in {row['notes']}",
        )
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["sprite_census"]["pixels"], 0)

    def test_kitty_pass_with_visible_sprites_stays_pass(self):
        # One exact pip pixel on an otherwise dark board, plus the paused
        # checkpoint every real session takes (the pause-surface claim is
        # part of a kitty-graphics pass).
        playing_png = make_rgb_png(2, 2, [24, 16, 12] * 3 + [126, 217, 87])
        paused_png = make_rgb_png(
            100, 100,
            [24, 16, 12] * 9000
            + [230, 230, 230] * 996
            + [126, 217, 87] * 4,
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
            playing_png=playing_png,
        )
        self.assertEqual(row["disposition"], "pass")
        self.assertEqual(
            row["sprite_visibility"]["playing_captures_with_sprites"],
            ["playing"],
        )
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["sprite_census"]["by_color"]["rill"], 1)


    def test_bitmap_pass_without_a_playing_capture_is_downgraded(self):
        # A kitty-graphics or sixel pass whose only decodable captures
        # are static menus must not sign a clean pass: the blank-board
        # and sprite gates only inspect captures that exist, so the
        # playing surface itself has to be on record.
        for tier_name, transcript in (
            ("kitty",
             b"\x1b[?2026h\x1b[2J\x1b[?2026l\x1b[1;1HVIDEO  kitty-graphics\r\n"),
            ("sixel",
             b"\x1b[?2026h\x1b[2J\x1b[?2026l\x1b[1;1HVIDEO  sixel\r\n"),
        ):
            run_dir = make_run_dir(
                os.path.join(self.tmp, f"run-{tier_name}"),
                screenshot_name="title.png",
                create_png=make_rgb_png(2, 2, [24, 16, 12] * 4),
                transcript=transcript,
                checkpoint="title",
            )
            evidence = os.path.join(self.tmp, f"evidence-{tier_name}")
            proc = run_collect(run_dir, evidence, "--result", "pass",
                               "--tier", tier_name)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(os.path.join(evidence, "unit-test-row.json"),
                      encoding="utf-8") as fh:
                row = json.load(fh)
            self.assertEqual(
                row["disposition"], "partial",
                f"{tier_name}: a pass without a playing capture must downgrade",
            )
            self.assertTrue(
                any("no decodable playing capture" in note
                    for note in row["notes"]),
                f"{tier_name}: missing playing-capture reason in {row['notes']}",
            )

    def test_bitmap_pass_with_a_playing_capture_stays_pass(self):
        # The same shape with the playing capture present stays pass: the
        # gate requires the playing surface, not every checkpoint. The
        # paused checkpoint is present because the fixed session always
        # takes it and a kitty-graphics pass must prove the pause surface.
        row = self._kitty_paused_row(
            make_rgb_png(
                100, 100,
                [24, 16, 12] * 9000
                + [230, 230, 230] * 996
                + [126, 217, 87] * 4,
            ),
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "pass")

    def test_pass_without_an_observed_tier_is_downgraded(self):
        # Every bitmap honesty gate is keyed on the observed tier, so a
        # transcript that never names its tier would skip all of them. A
        # pass cannot rest on a surface the collector cannot classify.
        for tier_name in ("sixel", "kitty", "auto"):
            run_dir = make_run_dir(
                os.path.join(self.tmp, f"run-notier-{tier_name}"),
                screenshot_name="playing.png",
                create_png=make_rgb_png(
                    2, 2, [24, 16, 12] * 3 + [126, 217, 87]),
                transcript=b"\x1b[?2026h\x1b[2J\x1b[?2026l",
                checkpoint="playing",
            )
            evidence = os.path.join(self.tmp, f"evidence-notier-{tier_name}")
            proc = run_collect(run_dir, evidence, "--result", "pass",
                               "--tier", tier_name)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(os.path.join(evidence, "unit-test-row.json"),
                      encoding="utf-8") as fh:
                row = json.load(fh)
            self.assertIsNone(
                row["tier_observed"],
                f"{tier_name}: fixture unexpectedly named its tier",
            )
            self.assertEqual(
                row["disposition"], "partial",
                f"{tier_name}: a pass with no observed tier must downgrade",
            )
            self.assertTrue(
                any("never named the active video tier" in note
                    for note in row["notes"]),
                f"{tier_name}: missing unobserved-tier reason in {row['notes']}",
            )

    def test_pass_with_a_named_tier_is_not_downgraded_by_the_tier_gate(self):
        # The positive twin: the same playing-capture shape with the tier
        # line present still passes, so the gate is scoped to the missing
        # observation and nothing else. The sixel tier stands in here
        # because it carries no paused-checkpoint requirement (the kitty
        # twin lives in test_kitty_pass_with_visible_sprites_stays_pass).
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-tier-named"),
            screenshot_name="playing.png",
            create_png=make_rgb_png(2, 2, [24, 16, 12] * 3 + [126, 217, 87]),
            transcript=(
                b"\x1b[?2026h\x1b[2J\x1b[?2026l"
                b"\x1b[1;1HVIDEO  sixel\r\n"
            ),
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence-tier-named")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["tier_observed"], "sixel")
        self.assertEqual(row["disposition"], "pass")
        self.assertFalse(
            any("never named the active video tier" in note
                for note in row["notes"]),
            f"tier gate fired with an observed tier: {row['notes']}",
        )

    def test_windows_pass_without_a_transcript_is_not_downgraded(self):
        # Windows rows carry no pty transcript by design (run-windows.ps1)
        # and are graded from the process record plus the capture set, so
        # the tier-observation gate must not misgrade every Windows pass.
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-windows-notier"),
            screenshot_name="playing.png",
            create_png=make_rgb_png(2, 2, [24, 16, 12] * 3 + [126, 217, 87]),
            transcript=b"",
            checkpoint="playing",
            meta_extra={"transcript": None},
        )
        evidence = os.path.join(self.tmp, "evidence-windows-notier")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty", os_name="windows")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["os"], "windows")
        self.assertIsNone(row["tier_observed"])
        self.assertEqual(
            row["disposition"], "pass",
            "a Windows pass with no transcript was misgraded by the "
            "tier-observation gate",
        )
        self.assertFalse(
            any("never named the active video tier" in note
                for note in row["notes"]),
            f"tier gate fired on a Windows row: {row['notes']}",
        )

    def test_playing_gates_match_phase_names_case_insensitively(self):
        # Phase names are generator-controlled, but a `Playing`-cased
        # checkpoint must not silently drop out of the playing gates (a
        # bitmap pass whose playing surface is excluded would downgrade
        # as if the capture were missing).
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-playing-case"),
            screenshot_name="Playing.png",
            create_png=make_rgb_png(2, 2, [24, 16, 12] * 3 + [126, 217, 87]),
            transcript=(
                b"\x1b[?2026h\x1b[2J\x1b[?2026l"
                b"\x1b[1;1HVIDEO  sixel\r\n"
            ),
            checkpoint="Playing",
        )
        evidence = os.path.join(self.tmp, "evidence-playing-case")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "pass")
        self.assertFalse(
            any("no decodable playing capture" in note
                for note in row["notes"]),
            f"playing gates missed a cased phase name: {row['notes']}",
        )

    def test_rows_record_their_generating_build(self):
        # Provenance: the bundle carries the run metadata's build
        # identity (commit, binary hash, dirty flag), never an implied one.
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-build"),
            meta_extra={
                "build": {
                    "commit": "0" * 40,
                    "commit_short": "000000000000",
                    "binary_sha256": "a" * 64,
                    "sources_dirty": False,
                },
            },
        )
        evidence = os.path.join(self.tmp, "evidence-build")
        proc = run_collect(run_dir, evidence, "--result", "partial")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["build"]["commit"], "0" * 40)
        self.assertEqual(row["build"]["binary_sha256"], "a" * 64)
        self.assertFalse(row["build"]["sources_dirty"])

    def test_rows_without_build_identity_say_so(self):
        # A pre-identity metadata block records `recorded: false` with the
        # reason instead of leaving provenance to inference; an empty or
        # partial build block is the same unrecorded state.
        shapes = (
            ("absent", None),
            ("empty", {"build": {}}),
            ("partial", {"build": {"commit": "0" * 40}}),
            ("blank", {"build": {"commit": "", "binary_sha256": "a" * 64}}),
            ("whitespace", {"build": {"commit": " " * 40,
                                      "binary_sha256": " " * 64}}),
        )
        for name, meta_extra in shapes:
            run_dir = make_run_dir(
                os.path.join(self.tmp, f"run-nobuild-{name}"),
                meta_extra=meta_extra,
            )
            evidence = os.path.join(self.tmp, f"evidence-nobuild-{name}")
            proc = run_collect(run_dir, evidence, "--result", "partial")
            self.assertEqual(proc.returncode, 0, proc.stderr)
            with open(os.path.join(evidence, "unit-test-row.json"),
                      encoding="utf-8") as fh:
                row = json.load(fh)
            self.assertIs(
                row["build"]["recorded"], False,
                f"{name}: build identity presented as recorded",
            )
            self.assertTrue(row["build"]["reason"])

    def test_dominant_share_detects_one_flat_color(self):
        # The sixel `resized-wide` checkpoint was a single flat
        # background color yet signed pass; the collector now measures
        # the most common pixel color directly.
        collect = load_collect_module()
        path = os.path.join(self.tmp, "flat.png")
        with open(path, "wb") as fh:
            fh.write(make_rgb_png(4, 4, [24, 16, 12] * 16))
        facts = collect.screenshot_facts(path)
        self.assertEqual(facts["dominant_share"], 1.0)
        self.assertLess(facts["white_share"], 0.98)

    def test_dominant_share_classifies_all_decodable_grayscale_depths(self):
        # Bit depths other than 8 used to return 0.0 ("not dominant"),
        # so a blank grayscale capture bypassed the E4 gate.
        collect = load_collect_module()
        for bit in (1, 2, 4, 8):
            path = os.path.join(self.tmp, f"flat-gray-{bit}.png")
            with open(path, "wb") as fh:
                fh.write(make_gray_png(8, 8, bit, [0] * 64))
            facts = collect.screenshot_facts(path)
            self.assertEqual(
                facts["dominant_share"], 1.0,
                f"{bit}-bit grayscale blank capture not classified",
            )

    def test_dominant_share_classifies_gray_alpha(self):
        collect = load_collect_module()
        path = os.path.join(self.tmp, "flat-gray-alpha.png")
        with open(path, "wb") as fh:
            fh.write(make_gray_alpha_png(8, 8, 24, alpha=0))
        facts = collect.screenshot_facts(path)
        self.assertEqual(facts["dominant_share"], 1.0)

    def test_white_share_classifies_all_decodable_grayscale_depths(self):
        # Packed 2- and 4-bit grayscale used to report 0.0 white, so a
        # blank capture in those shapes could never trip the 0.98
        # light-background gate even though it promises all-ones white.
        collect = load_collect_module()
        for bit in (1, 2, 4, 8):
            path = os.path.join(self.tmp, f"white-gray-{bit}.png")
            samples = [(1 << bit) - 1] * 64
            with open(path, "wb") as fh:
                fh.write(make_gray_png(8, 8, bit, samples))
            facts = collect.screenshot_facts(path)
            self.assertEqual(
                facts["white_share"], 1.0,
                f"{bit}-bit all-ones grayscale not classified as white",
            )
            self.assertTrue(facts["light_background"])

    def test_white_share_classifies_all_decodable_gray_alpha_depths(self):
        # The same fail-open existed for packed gray+alpha captures.
        collect = load_collect_module()
        for bit in (1, 2, 4, 8):
            level = (1 << bit) - 1
            path = os.path.join(self.tmp, f"white-gray-alpha-{bit}.png")
            with open(path, "wb") as fh:
                fh.write(make_gray_alpha_png(8, 8, level, alpha=level,
                                             bit_depth=bit))
            facts = collect.screenshot_facts(path)
            self.assertEqual(
                facts["white_share"], 1.0,
                f"{bit}-bit all-ones gray+alpha not classified as white",
            )
            self.assertTrue(facts["light_background"])
            # Gray decides and alpha never does: an all-ones gray with a
            # zero alpha is white, while a zero gray with all-ones alpha
            # is not. This pins sample order and MSB-first packing; a
            # swapped or LSB-first unpack would fail one of the two.
            path = os.path.join(self.tmp, f"gray-white-alpha-zero-{bit}.png")
            with open(path, "wb") as fh:
                fh.write(make_gray_alpha_png(8, 8, level, alpha=0,
                                             bit_depth=bit))
            self.assertEqual(
                collect.screenshot_facts(path)["white_share"], 1.0,
                f"{bit}-bit all-ones gray with zero alpha is still white",
            )
            path = os.path.join(self.tmp, f"gray-zero-alpha-white-{bit}.png")
            with open(path, "wb") as fh:
                fh.write(make_gray_alpha_png(8, 8, 0, alpha=level,
                                             bit_depth=bit))
            self.assertEqual(
                collect.screenshot_facts(path)["white_share"], 0.0,
                f"{bit}-bit all-ones alpha with zero gray is not white",
            )

    def test_gray_alpha_blank_playing_capture_is_downgraded(self):
        # A blank gray+alpha capture must trip the blank-board gate, not
        # slip through as an unverifiable "not dominant" surface.
        png = make_gray_alpha_png(100, 100, 24)
        transcript = b"\x1b[1;1HVIDEO  sixel\r\n" + b" " * 200
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_bitmap_blank_playing_capture_is_downgraded(self):
        # One sprite pixel cannot rescue a playing surface that is
        # otherwise one flat color: the board itself is blank.
        pixels = [24, 16, 12] * 9999 + [126, 217, 87]
        png = make_rgb_png(100, 100, pixels)
        transcript = (
            b"\x1b[?2026h"
            b"\x1b[2J\x1b_Ga=d\x1b\\"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            b"\x1b[?2026l"
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
        )
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["dominant_share"], 0.9999)

    def test_sixel_blank_resize_capture_is_downgraded(self):
        pixels = [24, 16, 12] * (100 * 100)
        png = make_rgb_png(100, 100, pixels)
        transcript = b"\x1b[1;1HVIDEO  sixel\r\n" + b" " * 200
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="resized-wide.png",
            create_png=png,
            transcript=transcript,
            checkpoint="resized-wide",
        )
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def _sixel_cased_resize_row(self, phase_name):
        """A sixel row with a mixed playing capture and a flat
        resize-phase capture under the given phase-name casing."""
        mixed = make_rgb_png(
            100, 100,
            [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [126, 217, 87],
        )
        flat = make_rgb_png(100, 100, [24, 16, 12] * (100 * 100))
        transcript = b"\x1b[1;1HVIDEO  sixel\r\n" + b" " * 200
        run_dir = make_run_dir(
            os.path.join(self.tmp, f"run-cased-{phase_name}"),
            screenshot_name="playing.png",
            create_png=mixed,
            transcript=transcript,
            checkpoint="playing",
        )
        shots = os.path.join(run_dir, "session", "screenshots")
        with open(os.path.join(shots, f"{phase_name}.png"), "wb") as fh:
            fh.write(flat)
        with open(os.path.join(run_dir, "session", "events.log"),
                  "w", encoding="utf-8") as fh:
            fh.write("100\tcheckpoint\tplaying\t100\t"
                     "session/screenshots/playing.png\n")
            fh.write(f"200\tcheckpoint\t{phase_name}\t200\t"
                     f"session/screenshots/{phase_name}.png\n")
            fh.write("300\texit\texited=true killed=false\t200\t\n")
        evidence = os.path.join(self.tmp, f"evidence-cased-{phase_name}")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            return json.load(fh)

    def test_sixel_cased_refit_capture_is_downgraded(self):
        # The resized/refit predicates must normalize their phase names
        # like the playing predicate; a `Refit`-cased phase used to skip
        # the blank-board gate entirely.
        row = self._sixel_cased_resize_row("Refit")
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_sixel_cased_resized_capture_is_downgraded(self):
        # The same hole for a `Resized-Wide`-cased phase name.
        row = self._sixel_cased_resize_row("Resized-Wide")
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_bitmap_blank_share_in_the_old_gap_is_downgraded(self):
        # A blank board with a few stale pixels sat between 0.90 and 0.98
        # dominant share and slipped past the old 0.98 bound; the
        # committed bitmap-tier playing-family maximum is 0.6427, so
        # the bound is 0.90.
        pixels = [24, 16, 12] * 9500 + [230, 230, 230] * 500
        png = make_rgb_png(100, 100, pixels)
        transcript = b"\x1b[1;1HVIDEO  sixel\r\n" + b" " * 200
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-blank-gap"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence-blank-gap")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["dominant_share"], 0.95)
        self.assertTrue(
            any(">=90% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_bitmap_share_below_the_new_bound_stays_pass(self):
        # The negative twin of the new bound: a playing capture just
        # below 0.90 is not a blank board and stays pass.
        pixels = [24, 16, 12] * 8999 + [230, 230, 230] * 1001
        png = make_rgb_png(100, 100, pixels)
        transcript = b"\x1b[1;1HVIDEO  sixel\r\n" + b" " * 200
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-share-below"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence-share-below")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "sixel")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "pass")
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["dominant_share"], 0.8999)

    def test_kitty_paused_media_with_menu_capture_stays_pass(self):
        # A paused capture with four sprite-palette pixels and >=90% one
        # color is the text menu on a solid background, so trailing
        # placements attributed to the paused slice are checkpoint-boundary
        # noise (the census still proves the paused slice is not a board).
        playing = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
        )
        paused = (
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            b"\x1b[1;1HPAUSED RESUME QUIT TO TITLE"
        )
        transcript = playing + paused
        playing_px = [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [126, 217, 87]
        paused_px = (
            [24, 16, 12] * 9500
            + [230, 230, 230] * 496
            + [126, 217, 87] * 4
        )
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="playing.png",
            create_png=make_rgb_png(100, 100, playing_px),
            transcript=transcript,
            checkpoint="playing",
        )
        shots = os.path.join(run_dir, "session", "screenshots")
        with open(os.path.join(shots, "paused.png"), "wb") as fh:
            fh.write(make_rgb_png(100, 100, paused_px))
        p1 = len(playing)
        p2 = len(transcript)
        with open(os.path.join(run_dir, "session", "events.log"),
                  "w", encoding="utf-8") as fh:
            fh.write(f"100\tcheckpoint\tplaying\t{p1}\t"
                     "session/screenshots/playing.png\n")
            fh.write(f"200\tcheckpoint\tpaused\t{p2}\t"
                     "session/screenshots/paused.png\n")
            fh.write(f"300\texit\texited=true killed=false\t{p2}\t\n")
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "pass")
        self.assertTrue(
            any("checkpoint-boundary attribution" in note
                for note in row["notes"]),
            f"missing attribution note in {row['notes']}",
        )
        self.assertTrue(
            any("4 sprite pixels at 95.00% one color" in note
                for note in row["notes"]),
            f"attribution note must name the measured census in {row['notes']}",
        )

    def test_kitty_paused_media_without_a_playing_capture_is_downgraded(self):
        # The paused slice may carry board media (the frozen-board hub),
        # but a bitmap pass still needs a playing capture: a bundle made
        # only of menu surfaces cannot sign the rendered playing surface.
        transcript = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b[?2026h\x1b[2J"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            + b" " * 20
            + b"\x1b[?2026l\x1b[1;1HPAUSED"
            + b" " * 200
        )
        png = make_rgb_png(100, 100, [24, 16, 12] * 9999 + [126, 217, 87])
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="paused.png",
            create_png=png,
            transcript=transcript,
            checkpoint="paused",
        )
        with open(os.path.join(run_dir, "session", "events.log"),
                  "w", encoding="utf-8") as fh:
            fh.write("100\tcheckpoint\tpaused\t120\t"
                     "session/screenshots/paused.png\n")
            fh.write(f"200\texit\texited=true killed=false\t"
                     f"{len(transcript)}\t\n")
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("no decodable playing capture" in note
                for note in row["notes"]),
            f"missing playing-capture reason in {row['notes']}",
        )

    def _kitty_paused_row(self, paused_png, *, paused_events, playing_png=None,
                          paused_text=b"PAUSED RESUME QUIT TO TITLE"):
        """Shared shape for the capture-first paused-gate cases: a
        playing slice with one board placement, then a paused slice."""
        playing = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
        )
        paused = b"\x1b[1;1H" + paused_text + b" " * 200
        transcript = playing + paused
        if playing_png is None:
            playing_png = make_rgb_png(
                100, 100,
                [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [126, 217, 87],
            )
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run"),
            screenshot_name="playing.png",
            create_png=playing_png,
            transcript=transcript,
            checkpoint="playing",
        )
        shots = os.path.join(run_dir, "session", "screenshots")
        if paused_png is not None:
            with open(os.path.join(shots, "paused.png"), "wb") as fh:
                fh.write(paused_png)
        with open(os.path.join(run_dir, "session", "events.log"),
                  "w", encoding="utf-8") as fh:
            fh.write(f"100\tcheckpoint\tplaying\t{len(playing)}\t"
                     "session/screenshots/playing.png\n")
            fh.write(paused_events)
            fh.write(f"300\texit\texited=true killed=false\t"
                     f"{len(transcript)}\t\n")
        evidence = os.path.join(self.tmp, "evidence")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            return json.load(fh)

    def test_kitty_paused_zero_media_with_frozen_board_stays_pass(self):
        # The pause hub freezes the dimmed board and exempts actors, so a
        # sprite pixel in the paused capture is expected. The PAUSED card
        # paint plus a non-flat capture prove the surface; no new media is
        # a normal checkpoint-boundary shape, not a failure.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 9996 + [126, 217, 87] * 4
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "pass")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        kit = paused.get("kitty") or {}
        self.assertEqual(kit.get("transmits", 0), 0)
        self.assertEqual(kit.get("placements", 0), 0)
        self.assertEqual(paused["sprite_census"]["pixels"], 4)
        self.assertEqual(paused["surfaces"]["paused"]["paints"], 1)

    def test_kitty_paused_near_blank_capture_is_downgraded(self):
        # One sprite pixel in a 99.99%-flat capture is a near-blank
        # frame, not a frozen board. The census floor keeps a lone
        # antialiased pixel from signing the pause surface.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 9999 + [126, 217, 87]
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["sprite_census"]["pixels"], 1)
        self.assertTrue(
            any("fewer than 4 sprite pixels" in note
                for note in row["notes"]),
            f"missing near-blank pause reason in {row['notes']}",
        )

    def test_kitty_paused_capture_without_the_card_is_downgraded(self):
        # A stale playing frame left on screen after the pause key never
        # paints the PAUSED card. Even with a valid capture, a pass cannot
        # claim the pause surface.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 9999 + [126, 217, 87]
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
            paused_text=b"FRIGHT!",
        )
        self.assertEqual(row["disposition"], "partial")
        self.assertTrue(
            any("never painted the PAUSED card" in note
                for note in row["notes"]),
            f"missing card-first pause reason in {row['notes']}",
        )

    def test_kitty_paused_completely_flat_capture_is_downgraded(self):
        # A 100% flat capture cannot distinguish a menu panel from a
        # blank screen, so the accepted share range is [55%, 100%).
        paused_png = make_rgb_png(100, 100, [24, 16, 12] * (100 * 100))
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 1.0)
        self.assertTrue(
            any("never painted the PAUSED card" in note
                for note in row["notes"]),
            f"missing flat-capture pause reason in {row['notes']}",
        )

    def test_kitty_paused_missing_capture_is_downgraded(self):
        row = self._kitty_paused_row(
            None,
            paused_events="200\tcheckpoint\tpaused\t200\t\n",
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertIsNone(paused.get("screenshot"))
        self.assertTrue(
            any("no decodable paused capture" in note
                for note in row["notes"]),
            f"missing absent-capture pause reason in {row['notes']}",
        )

    def test_kitty_paused_share_at_the_lower_bound_stays_pass(self):
        # The accepted band is [55%, 100%): the frozen, 55%-dimmed board
        # leaves the dominant background at exactly that share.
        paused_png = make_rgb_png(
            100, 100,
            [24, 16, 12] * 5500
            + [230, 230, 230] * 4496
            + [126, 217, 87] * 4,
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "pass")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.55)

    def test_kitty_paused_share_below_the_lower_bound_is_downgraded(self):
        # 54.99% one color is an unmounted or stale board, not the hub.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 5499 + [230, 230, 230] * 4501
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.5499)

    def test_kitty_paused_share_rounding_cannot_cross_the_gate(self):
        # A true 54.9975% share rounds up to 0.5500 at four decimals;
        # the recorded share truncates downward, so it fails the gate
        # instead of being accepted by a rounding artifact.
        paused_png = make_rgb_png(
            200, 200, [24, 16, 12] * 21999 + [230, 230, 230] * 18001
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.5499)

    def test_kitty_pass_without_a_paused_checkpoint_is_downgraded(self):
        # The fixed session always takes the paused checkpoint, so a
        # kitty-graphics phase list without one means the pause-surface
        # claim (the board is released for the text menu) was never
        # checked; the pass downgrades instead of silently skipping the
        # gate.
        transcript = (
            b"\x1b[?2026h\x1b[2J\x1b_Ga=d\x1b\\"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,"
            b"c=140,r=62,z=0,C=1,q=2\x1b\\\x1b[?2026l"
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
        )
        png = make_rgb_png(
            100, 100,
            [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [126, 217, 87],
        )
        run_dir = make_run_dir(
            os.path.join(self.tmp, "run-no-paused"),
            screenshot_name="playing.png",
            create_png=png,
            transcript=transcript,
            checkpoint="playing",
        )
        evidence = os.path.join(self.tmp, "evidence-no-paused")
        proc = run_collect(run_dir, evidence, "--result", "pass",
                           "--tier", "kitty")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        with open(os.path.join(evidence, "unit-test-row.json"),
                  encoding="utf-8") as fh:
            row = json.load(fh)
        self.assertEqual(row["disposition"], "partial")
        self.assertFalse(
            any(p["name"] == "paused" for p in row["phases"]),
            "fixture unexpectedly carries a paused phase",
        )
        self.assertTrue(
            any("expected exactly one" in note for note in row["notes"]),
            f"missing paused-coverage reason in {row['notes']}",
        )

    def test_kitty_pass_with_extra_paused_checkpoints_is_downgraded(self):
        # The fixed session takes exactly one paused checkpoint; a phase
        # list with two is not the recorded session shape the pause
        # verdict was designed around, so it fails closed too.
        row = self._kitty_paused_row(
            make_rgb_png(
                100, 100,
                [24, 16, 12] * 9000
                + [230, 230, 230] * 996
                + [126, 217, 87] * 4,
            ),
            paused_events=(
                "200\tcheckpoint\tpaused\t200\t"
                "session/screenshots/paused.png\n"
                "250\tcheckpoint\tpaused\t200\t"
                "session/screenshots/paused.png\n"
            ),
        )
        self.assertEqual(row["disposition"], "partial")
        self.assertEqual(
            sum(1 for p in row["phases"] if p["name"] == "paused"), 2
        )
        self.assertTrue(
            any("expected exactly one" in note for note in row["notes"]),
            f"missing paused-count reason in {row['notes']}",
        )


class TestProbeGraphicsArguments(unittest.TestCase):
    """The probe experiment must run under its documented invocation.

    The usage block in ``probe-graphics.py`` documents
    ``probe-graphics.py [WINDOW_S] [OUT_PATH]``; an out-path-only
    invocation must reach the tty check (exit 2) instead of being
    misparsed as a float window (exit 3).
    """

    def run_probe(self, *args):
        return subprocess.run(
            [sys.executable, PROBE_PY, *args],
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=10,
        )

    def test_out_path_only_is_not_a_window_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "probe.bin")
            proc = self.run_probe(out)
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("stdin is not a terminal", proc.stderr)

    def test_non_positive_window_is_a_usage_error(self):
        proc = self.run_probe("0")
        self.assertEqual(proc.returncode, 3, proc.stderr)
        self.assertIn("bad window seconds", proc.stderr)


class TestCommittedEvidenceBundle(unittest.TestCase):
    def rows(self):
        for name in sorted(os.listdir(EVIDENCE_DIR)):
            if name.endswith(".json"):
                yield os.path.join(EVIDENCE_DIR, name)

    def test_phase_bytes_reconcile_with_transcript_total(self):
        checked = 0
        for path in self.rows():
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            total = sum(phase["bytes"] for phase in row["phases"])
            self.assertEqual(
                total, row["protocol_totals"]["transcript_bytes"],
                f"{os.path.basename(path)}: phase byte sum {total} != "
                f"transcript_bytes",
            )
            checked += 1
        self.assertGreaterEqual(checked, 8)

    def test_phase_frame_counts_reconcile_with_transcript_total(self):
        checked = 0
        for path in self.rows():
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            total = sum(
                phase.get("frames", {}).get("count", 0)
                for phase in row["phases"]
            )
            self.assertEqual(
                total, row["protocol_totals"]["frames"]["count"],
                f"{os.path.basename(path)}: phase frame sum {total} != "
                f"protocol total",
            )
            checked += 1
        self.assertGreaterEqual(checked, 8)

    def test_every_cited_screenshot_matches_its_recorded_hash(self):
        checked = 0
        for path in self.rows():
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            row_dir = os.path.join(EVIDENCE_DIR, row["row"])
            for phase in row["phases"]:
                if not phase.get("screenshot_sha256"):
                    continue
                shot = os.path.join(row_dir, phase["screenshot"])
                self.assertTrue(
                    os.path.isfile(shot),
                    f"{os.path.basename(path)}: {phase['screenshot']} missing",
                )
                self.assertEqual(
                    sha256_file(shot), phase["screenshot_sha256"],
                    f"{os.path.basename(path)}: {phase['name']} hash drift",
                )
                width, height = png_ihdr_dims(shot)
                self.assertEqual((width, height),
                                 (phase["screenshot_width"],
                                  phase["screenshot_height"]))
                checked += 1
        self.assertGreater(checked, 0)

    def test_kitty_graphics_passes_prove_sprite_visibility(self):
        checked = 0
        for path in self.rows():
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            if row.get("disposition") != "pass":
                continue
            if row.get("tier_observed") != "kitty-graphics":
                continue
            if row["protocol_totals"]["kitty"]["placements"] == 0:
                continue
            with_sprites = row.get("sprite_visibility", {}).get(
                "playing_captures_with_sprites", []
            )
            self.assertTrue(
                with_sprites,
                f"{os.path.basename(path)}: a kitty-graphics pass must carry "
                "a playing capture with sprite-palette pixels; the static "
                "board layer alone can hide every sprite",
            )
            checked += 1
        self.assertGreater(checked, 0)

    def test_every_committed_row_records_its_generating_build(self):
        # Provenance: a committed bundle must name the commit, the exact
        # release binary hash, and that the Rust sources were clean, so a
        # row can never silently imply the current head generated it.
        checked = 0
        for path in self.rows():
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            build = row.get("build")
            self.assertIsInstance(
                build, dict,
                f"{os.path.basename(path)}: bundle carries no build block",
            )
            self.assertIsNot(
                build.get("recorded"), False,
                f"{os.path.basename(path)}: bundle records no generating build",
            )
            self.assertRegex(
                build.get("commit", ""), r"^[0-9a-f]{40}$",
                f"{os.path.basename(path)}: bad build.commit",
            )
            self.assertRegex(
                build.get("binary_sha256", ""), r"^[0-9a-f]{64}$",
                f"{os.path.basename(path)}: bad build.binary_sha256",
            )
            self.assertIs(
                build.get("sources_dirty"), False,
                f"{os.path.basename(path)}: generating Rust sources were dirty",
            )
            checked += 1
        self.assertGreaterEqual(checked, 8)

    def test_forced_tier_rows_move_the_pause_cursor(self):
        # The second executed row of an emulator would otherwise commit a
        # byte-identical paused capture; those rows move the cursor to
        # "Quit to title" before the checkpoint and record it.
        for row_name in ("kitty-linux-truecolor", "ghostty-linux-kitty",
                         "xterm-linux-sixel"):
            path = os.path.join(EVIDENCE_DIR, f"{row_name}.json")
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            self.assertEqual(
                row.get("pause_select"), 1,
                f"{row_name}: the forced-tier row must move the pause cursor",
            )
            self.assertTrue(
                any("menu cursor on" in note for note in row["notes"]),
                f"{row_name}: pause choreography missing from notes",
            )
        for row_name in ("kitty-linux-auto", "ghostty-linux-auto",
                         "xterm-linux-auto", "xterm-dark-linux-auto",
                         "xterm-vt340-linux-auto"):
            path = os.path.join(EVIDENCE_DIR, f"{row_name}.json")
            with open(path, encoding="utf-8") as fh:
                row = json.load(fh)
            self.assertEqual(row.get("pause_select"), 0, row_name)

    def test_events_logs_carry_no_scratch_paths(self):
        for root, _dirs, files in os.walk(EVIDENCE_DIR):
            for name in files:
                if name != "events.log":
                    continue
                path = os.path.join(root, name)
                with open(path, encoding="utf-8") as fh:
                    text = fh.read()
                for marker in ("/tmp/", "/home/", "/Users/", "C:\\"):
                    self.assertNotIn(
                        marker, text,
                        f"{path}: committed events.log embeds a scratch path "
                        f"({marker})",
                    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
