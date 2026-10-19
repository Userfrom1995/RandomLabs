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
  exists with its recorded sha256 and dimensions, and no committed
  ``events.log`` carries the runner's scratch paths.

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
                 transcript=b"", checkpoint="title"):
    """Build a minimal run directory shaped like drive.sh's output."""
    session = os.path.join(root, "session")
    shots = os.path.join(session, "screenshots")
    os.makedirs(shots, exist_ok=True)
    with open(os.path.join(session, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(
            {
                "emulator_version": "test",
                "arch": "x86_64",
                "transcript": "session/pty.log",
                "geometry": {},
                "extra_env": [],
                "runner": {"host": "test", "id": "compat-harness"},
                "exit": {"code": 0, "killed": False, "game_exited": True,
                         "process_exited": True},
            },
            fh,
        )
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


def run_collect(run_dir, evidence_dir, *extra):
    return subprocess.run(
        [sys.executable, COLLECT_PY, "--run-dir", run_dir,
         "--emulator", "xterm", "--os", "linux", "--tier", "auto",
         "--evidence-dir", evidence_dir, "--row-name", "unit-test-row",
         *extra],
        capture_output=True, text=True,
    )


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
            # pip #FFE182 (exact) then an off-by-one red that must not
            # count as anything.
            "rows": bytes([255, 225, 130, 255, 250, 225, 130, 255]),
        }
        census = collect.sprite_census(decoded)
        self.assertEqual(census["pixels"], 1)
        self.assertEqual(census["by_color"]["pip"], 1)
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
        transcript = (
            b"\x1b[?2026h"
            b"\x1b[2J\x1b_Ga=d\x1b\\"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            b"\x1b[?2026l"
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
        )
        # One exact pip pixel on an otherwise dark board.
        pixels = [24, 16, 12] * 3 + [255, 225, 130]
        png = make_rgb_png(2, 2, pixels)
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
        self.assertEqual(row["disposition"], "pass")
        self.assertEqual(
            row["sprite_visibility"]["playing_captures_with_sprites"],
            ["playing"],
        )
        playing = next(p for p in row["phases"] if p["name"] == "playing")
        self.assertEqual(playing["sprite_census"]["by_color"]["pip"], 1)


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
