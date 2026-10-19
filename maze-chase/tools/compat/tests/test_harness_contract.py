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
            any(">=98% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_bitmap_blank_playing_capture_is_downgraded(self):
        # One sprite pixel cannot rescue a playing surface that is
        # otherwise one flat color: the board itself is blank.
        pixels = [24, 16, 12] * 9999 + [255, 225, 130]
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
            any(">=98% one color" in note for note in row["notes"]),
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
            any(">=98% one color" in note for note in row["notes"]),
            f"missing blank-board reason in {row['notes']}",
        )

    def test_kitty_paused_media_with_menu_capture_stays_pass(self):
        # A paused capture with no sprite pixels and >=90% one color is
        # the text menu on a solid background, so trailing placements
        # attributed to the paused slice are checkpoint-boundary noise.
        playing = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
        )
        paused = (
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            b"\x1b[1;1HPAUSED RESUME QUIT TO TITLE"
        )
        transcript = playing + paused
        playing_px = [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [255, 225, 130]
        paused_px = [24, 16, 12] * 9500 + [230, 230, 230] * 500
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

    def test_kitty_paused_phase_with_media_is_downgraded(self):
        # The pause menu is text; a paused phase that still places the
        # opaque board can cover it. The collector refuses to sign that
        # shape even when the sprite census looks healthy.
        transcript = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b[?2026h\x1b[2J"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
            + b" " * 20
            + b"\x1b[?2026l\x1b[1;1HPAUSED"
            + b" " * 200
        )
        png = make_rgb_png(100, 100, [24, 16, 12] * 9999 + [255, 225, 130])
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
            any("still carries sprite pixels or is not a near-solid menu panel"
                in note for note in row["notes"]),
            f"missing pause-surface reason in {row['notes']}",
        )

    def _kitty_paused_row(self, paused_png, *, paused_events, playing_png=None):
        """Shared shape for the capture-first paused-gate cases: a
        playing slice with one board placement, then a paused slice."""
        playing = (
            b"\x1b[1;1HVIDEO  kitty-graphics\r\n"
            b"\x1b_Ga=p,i=3,p=1,x=0,y=0,w=1120,h=1240,c=140,r=62,z=0,C=1,q=2\x1b\\"
        )
        paused = b"\x1b[1;1HPAUSED RESUME QUIT TO TITLE" + b" " * 200
        transcript = playing + paused
        if playing_png is None:
            playing_png = make_rgb_png(
                100, 100,
                [24, 16, 12] * 5000 + [230, 230, 230] * 4999 + [255, 225, 130],
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

    def test_kitty_paused_zero_media_but_sprite_capture_is_downgraded(self):
        # A regression that keeps the previous playing frame's board
        # composed emits no new transmit or placement in the paused
        # slice; the media-first gate skipped it. The capture still
        # carries a sprite pixel, so a pass is refused.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 9999 + [255, 225, 130]
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        kit = paused.get("kitty") or {}
        self.assertEqual(kit.get("transmits", 0), 0)
        self.assertEqual(kit.get("placements", 0), 0)
        self.assertGreater(paused["sprite_census"]["pixels"], 0)
        self.assertTrue(
            any("still carries sprite pixels or is not a near-solid menu panel"
                in note for note in row["notes"]),
            f"missing capture-first pause reason in {row['notes']}",
        )

    def test_kitty_paused_completely_flat_capture_is_downgraded(self):
        # A 100% flat capture cannot distinguish a menu panel from a
        # blank screen, so the accepted share range is [90%, 100%).
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
            any("still carries sprite pixels or is not a near-solid menu panel"
                in note for note in row["notes"]),
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
        # The accepted band is [90%, 100%): the narrowest acceptable menu
        # panel is exactly 90% one color.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 9000 + [230, 230, 230] * 1000
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "pass")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.9)

    def test_kitty_paused_share_below_the_lower_bound_is_downgraded(self):
        # 89.99% one color is a board, not a menu panel.
        paused_png = make_rgb_png(
            100, 100, [24, 16, 12] * 8999 + [230, 230, 230] * 1001
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.8999)

    def test_kitty_paused_share_rounding_cannot_cross_the_gate(self):
        # A true 89.9975% share rounds up to 0.9000 at four decimals;
        # the recorded share truncates downward, so it fails the gate
        # instead of being accepted by a rounding artifact.
        paused_png = make_rgb_png(
            200, 200, [24, 16, 12] * 35999 + [230, 230, 230] * 4001
        )
        row = self._kitty_paused_row(
            paused_png,
            paused_events=("200\tcheckpoint\tpaused\t200\t"
                           "session/screenshots/paused.png\n"),
        )
        self.assertEqual(row["disposition"], "partial")
        paused = next(p for p in row["phases"] if p["name"] == "paused")
        self.assertEqual(paused["dominant_share"], 0.8999)


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
