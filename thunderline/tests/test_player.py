#!/usr/bin/env python3
"""Thunderline Phase 4 player gate: preview provenance plus Pages player.

Verifies the committed player tree (player/audio/ + index.html +
player/player.js + player/player.css) without touching production logic:
preview exports are deterministic, preview audio is valid and audible,
provenance hashes bind the player audio back to dist/, the player page has
no stubs and wires every control the engine needs, and headless Chromium
plays the track end to end (selftest), shows the empty card with no data,
and fails closed on corrupt audio.
"""
import functools
import http.server
import json
import os
import re
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools"))

import export_preview  # noqa: E402

AUDIO = os.path.join(ROOT, "player", "audio")
INDEX = os.path.join(ROOT, "index.html")
PLAYER_JS = os.path.join(ROOT, "player", "player.js")
PLAYER_CSS = os.path.join(ROOT, "player", "player.css")
DRIVER = os.path.join(HERE, "cdp_selftest.mjs")
EXPORT_PREVIEW = os.path.join(ROOT, "tools", "export_preview.py")
SUBPROCESS_TIMEOUT = 120
BROWSER_TIMEOUT = 180

STEMS = ("vocals", "guitars", "bass", "drums")
STUB_MARKERS = ("TODO", "FIXME", "XXX", "coming soon", "Coming soon",
                "lorem ipsum", "placeholder", "not implemented")


def preview_files():
    out = ["master.wav", "lyrics.json", "song.json", "song.mid",
           "sheet.html", "preview.json"]
    out += [os.path.join("stems", n + ".wav") for n in STEMS]
    return out


def read_wav_header(path):
    with open(path, "rb") as f:
        data = f.read(44)
    if len(data) < 44:
        raise ValueError("short header")
    if data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not RIFF/WAVE")
    (fmt_len, audio, ch, sr, _br, _ba, bits) = struct.unpack(
        "<IHHIIHH", data[16:36])
    (nbytes,) = struct.unpack("<I", data[40:44])
    return sr, ch, bits, nbytes


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve_tree(root):
    port = free_port()
    handler = functools.partial(QuietHandler, directory=root)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def stop_server(server):
    server.shutdown()
    server.server_close()


def chrome_binary():
    for name in ("google-chrome", "chromium", "chromium-browser"):
        if shutil.which(name):
            return shutil.which(name)
    return None


def wait_for_cdp(port, timeout=25):
    import time
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(
                    "http://127.0.0.1:%d/json/version" % port,
                    timeout=3) as resp:
                if resp.status == 200:
                    return True
        except OSError:
            pass
        time.sleep(0.5)
    return False


def drive_page(page_url):
    port = free_port()
    profile = tempfile.mkdtemp(prefix="thunderline-chrome-")
    proc = subprocess.Popen(
        [chrome_binary(), "--headless=new", "--no-sandbox", "--disable-gpu",
         "--mute-audio", "--autoplay-policy=no-user-gesture-required",
         "--remote-debugging-port=%d" % port,
         "--user-data-dir=%s" % profile, "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not wait_for_cdp(port):
            raise AssertionError("chrome CDP never came up")
        proc2 = subprocess.run(
            ["node", DRIVER, page_url, str(port)],
            capture_output=True, text=True, cwd=REPO,
            timeout=BROWSER_TIMEOUT)
        if proc2.returncode != 0:
            raise AssertionError("cdp driver failed: %s" %
                                 proc2.stderr[-1000:])
        return json.loads(proc2.stdout.strip().splitlines()[-1])
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def browser_available(testcase):
    if chrome_binary() is None:
        testcase.skipTest("no chromium binary on PATH")
    if shutil.which("node") is None:
        testcase.skipTest("no node on PATH")


class PreviewExport(unittest.TestCase):
    def test_export_twice_bit_identical(self):
        with tempfile.TemporaryDirectory() as a, \
                tempfile.TemporaryDirectory() as b:
            self.assertEqual(export_preview.export_all(
                os.path.join(ROOT, "dist"), a), 0)
            self.assertEqual(export_preview.export_all(
                os.path.join(ROOT, "dist"), b), 0)
            for rel in preview_files():
                with open(os.path.join(a, rel), "rb") as f:
                    da = f.read()
                with open(os.path.join(b, rel), "rb") as f:
                    db = f.read()
                self.assertEqual(da, db, "nondeterministic: %s" % rel)

    def test_committed_audio_valid_and_audible(self):
        sr, ch, bits, nbytes = read_wav_header(
            os.path.join(AUDIO, "master.wav"))
        self.assertEqual((sr, ch, bits), (22050, 1, 16))
        dur = nbytes / 2 / sr
        self.assertAlmostEqual(dur, 156.0, delta=0.2)
        with open(os.path.join(AUDIO, "master.wav"), "rb") as f:
            body = f.read()[44:]
        peak = max(abs(v) for v in
                   struct.unpack("<%dh" % (len(body) // 2), body)) / 32767.0
        self.assertGreater(peak, 0.3, "master preview silent")
        self.assertLessEqual(peak, 1.0, "master preview clipped")
        for name in STEMS:
            sr, ch, bits, nbytes = read_wav_header(
                os.path.join(AUDIO, "stems", name + ".wav"))
            self.assertEqual((sr, ch, bits), (22050, 1, 8), name)
            self.assertAlmostEqual(nbytes / sr, 156.0, delta=0.2, msg=name)
            with open(os.path.join(AUDIO, "stems", name + ".wav"),
                      "rb") as f:
                seg = f.read()[44 + 15 * 22050:44 + 16 * 22050]
            vals = [(b - 128) / 128.0 for b in seg]
            rms = (sum(v * v for v in vals) / len(vals)) ** 0.5
            self.assertGreater(rms, 0.02, "stem silent at 15 s: %s" % name)

    def test_provenance_binds_player_to_dist(self):
        with open(os.path.join(AUDIO, "preview.json"),
                  encoding="utf-8") as f:
            manifest = json.load(f)
        self.assertEqual(manifest["generator"],
                         "tools/export_preview.py (stdlib only)")
        dist = os.path.join(ROOT, "dist")
        for rel in (["master.wav"] + [os.path.join("stems", n + ".wav")
                                      for n in STEMS]):
            self.assertEqual(manifest["sources"][rel],
                             export_preview.sha_file(
                                 os.path.join(dist, rel)),
                             "player audio drifted from dist: %s" % rel)
        for rel in manifest["files"]:
            with open(os.path.join(AUDIO, rel), "rb") as f:
                data = f.read()
            import hashlib
            self.assertEqual(hashlib.sha256(data).hexdigest(),
                             manifest["files"][rel],
                             "hash mismatch: %s" % rel)

    def test_text_copies_match_dist_and_score(self):
        dist = os.path.join(ROOT, "dist")
        for rel in ("lyrics.json", "song.mid", "sheet.html"):
            with open(os.path.join(AUDIO, rel), "rb") as f:
                a = f.read()
            with open(os.path.join(dist, rel), "rb") as f:
                b = f.read()
            self.assertEqual(a, b, "copy drifted: %s" % rel)
        with open(os.path.join(AUDIO, "song.json"), "rb") as f:
            a = f.read()
        with open(os.path.join(ROOT, "score", "song.json"), "rb") as f:
            b = f.read()
        self.assertEqual(a, b, "score copy drifted")

    def test_cli_contract(self):
        proc = subprocess.run(
            [sys.executable, EXPORT_PREVIEW, "--bogus"],
            capture_output=True, text=True, cwd=REPO, timeout=60)
        self.assertNotEqual(proc.returncode, 0)
        with tempfile.TemporaryDirectory() as tmp:
            proc = subprocess.run(
                [sys.executable, EXPORT_PREVIEW, "--dist",
                 os.path.join(tmp, "nope"), "--out",
                 os.path.join(tmp, "out")],
                capture_output=True, text=True, cwd=REPO, timeout=60)
            self.assertEqual(proc.returncode, 1)
            self.assertNotIn("Traceback", proc.stdout + proc.stderr)


class PlayerStatic(unittest.TestCase):
    def test_entrypoint_wires_everything(self):
        with open(INDEX, encoding="utf-8") as f:
            html = f.read()
        for needle in ("player/player.js", "player/player.css",
                       "player/audio/master.wav", "player/audio/song.json",
                       "player/audio/song.mid", "player/audio/sheet.html",
                       "player/audio/lyrics.json", 'id="playBtn"',
                       'id="seek"', 'id="lyricList"', 'id="overview"',
                       'id="volume"', 'id="state-loading"',
                       'id="state-empty"', 'id="state-error"',
                       'id="transport"', 'id="selftest"'):
            self.assertIn(needle, html, "index.html missing %r" % needle)
        for stem in STEMS:
            self.assertIn('id="mute-%s"' % stem, html)
            self.assertIn('id="solo-%s"' % stem, html)
        for marker in STUB_MARKERS:
            self.assertNotIn(marker, html, "stub marker in index.html")

    def test_engine_ids_all_exist(self):
        with open(PLAYER_JS, encoding="utf-8") as f:
            js = f.read()
        with open(INDEX, encoding="utf-8") as f:
            html = f.read()
        for marker in STUB_MARKERS:
            self.assertNotIn(marker, js, "stub marker in player.js")
        ids = set(re.findall(r'\$\("([A-Za-z-]+)"\)', js))
        ids |= set(re.findall(r'getElementById\([\'"]([A-Za-z-]+)[\'"]\)',
                              js))
        dynamic = {"mute-", "solo-"}
        for i in ids:
            if any(i.startswith(p) for p in ("mute-", "solo-")):
                continue
            if i in ("selftest",):
                continue
            self.assertIn('id="%s"' % i, html,
                          "player.js needs #%s, missing in HTML" % i)
        self.assertEqual(dynamic, {"mute-", "solo-"})

    def test_css_mobile_and_focus(self):
        with open(PLAYER_CSS, encoding="utf-8") as f:
            css = f.read()
        self.assertIn("@media (max-width: 480px)", css)
        self.assertIn("focus-visible", css)
        self.assertIn("grid-template-columns: 1fr", css)
        for marker in STUB_MARKERS:
            self.assertNotIn(marker, css, "stub marker in player.css")

    def test_js_syntax(self):
        if shutil.which("node") is None:
            self.skipTest("no node on PATH")
        proc = subprocess.run(["node", "--check", PLAYER_JS],
                              capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0, proc.stderr[-500:])

    def test_lyric_timing_matches_score(self):
        with open(os.path.join(AUDIO, "lyrics.json"),
                  encoding="utf-8") as f:
            lines = json.load(f)
        with open(os.path.join(AUDIO, "song.json"),
                  encoding="utf-8") as f:
            song = json.load(f)
        self.assertEqual(len(lines), len(song["lyrics"]))
        prev = 0.0
        for entry, src in zip(lines, song["lyrics"]):
            self.assertEqual(entry["line"], src["line"])
            self.assertGreaterEqual(entry["startSec"], prev)
            self.assertLessEqual(entry["endSec"], song["durationSec"])
            prev = entry["startSec"]


class PlayerHeadless(unittest.TestCase):
    def test_selftest_passes_end_to_end(self):
        browser_available(self)
        server, port = serve_tree(REPO)
        try:
            verdict = drive_page(
                "http://127.0.0.1:%d/thunderline/index.html?selftest=1"
                % port)
        finally:
            stop_server(server)
        self.assertEqual(verdict["verdict"], "PASS",
                         "player selftest: %r" % verdict)

    def test_empty_tree_shows_empty_card(self):
        browser_available(self)
        with tempfile.TemporaryDirectory() as tmp:
            tree = os.path.join(tmp, "thunderline")
            os.makedirs(os.path.join(tree, "player"))
            shutil.copy(INDEX, tree)
            shutil.copy(PLAYER_JS, os.path.join(tree, "player"))
            shutil.copy(PLAYER_CSS, os.path.join(tree, "player"))
            server, port = serve_tree(tmp)
            try:
                verdict = drive_page(
                    "http://127.0.0.1:%d/thunderline/index.html" % port)
            finally:
                stop_server(server)
        self.assertEqual(verdict["verdict"], "EMPTY",
                         "missing audio should show empty card: %r" % verdict)

    def test_corrupt_audio_fails_closed(self):
        browser_available(self)
        with tempfile.TemporaryDirectory() as tmp:
            tree = os.path.join(tmp, "thunderline")
            shutil.copytree(ROOT, tree,
                            ignore=shutil.ignore_patterns("dist"))
            for rel in (["player/audio/master.wav"] +
                        ["player/audio/stems/%s.wav" % n for n in STEMS]):
                with open(os.path.join(tree, rel), "r+b") as f:
                    f.seek(0)
                    f.write(b"XXXX")
            server, port = serve_tree(tmp)
            try:
                verdict = drive_page(
                    "http://127.0.0.1:%d/thunderline/index.html" % port)
            finally:
                stop_server(server)
        self.assertEqual(verdict["verdict"], "ERROR",
                         "corrupt audio should fail closed: %r" % verdict)


if __name__ == "__main__":
    unittest.main()
