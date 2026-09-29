#!/usr/bin/env python3
"""Thunderline Phase 5 Tester gate: final-integration hostile regression pins.

Locks in what Phase 5 shipped without touching production logic: the fixed
render opens and closes at digital zero (edge-fade invariant on the real
dist/ master), the player page plus committed preview audio serve cleanly
over HTTP, every docs-hub link resolves over HTTP (not just on disk), and
hostile inputs fail closed (unknown render flag exits nonzero with no
traceback, a missing stem is a plain 404 while the page shell still
serves 200).
"""

import functools
import http.server
import json
import os
import re
import socket
import struct
import subprocess
import sys
import threading
import unittest
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REPO = os.path.dirname(ROOT)
HREF = re.compile(r'href="([^"#:]+)"')


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


def http_get(port, path):
    with urllib.request.urlopen(
            "http://127.0.0.1:%d%s" % (port, path), timeout=10) as resp:
        return resp.status, resp.read()


class EdgeFadeLive(unittest.TestCase):
    def test_dist_master_opens_and_closes_at_zero(self):
        master = os.path.join(ROOT, "dist", "master.wav")
        if not os.path.isfile(master):
            self.skipTest("no dist/ render; run bash thunderline/repro.sh")
        with open(os.path.join(ROOT, "score", "mix.json"),
                  encoding="utf-8") as f:
            mix = json.load(f)
        self.assertEqual(mix["fadeInSec"], 0.02)
        self.assertEqual(mix["fadeOutSec"], 0.25)
        with wave.open(master, "rb") as w:
            sr = w.getframerate()
            n = w.getnframes()
            ch = w.getnchannels()
            raw = w.readframes(n)
        vals = struct.unpack("<%dh" % (n * ch), raw)
        mono = [v / 32768.0 for v in vals[::ch]]
        raw_mono = vals[::ch]
        # Matches the render-gate invariant, pinned here against the real
        # shipped dist/ master: exact zeros at both edges plus 2 ms edge
        # probes near zero (linear ramps rise from / fall to silence).
        self.assertEqual(raw_mono[0], 0, "master must start at zero")
        self.assertEqual(raw_mono[-1], 0, "master must end at zero")
        probe = int(sr * 0.002)
        onset = max(abs(v) for v in mono[:probe])
        offset = max(abs(v) for v in mono[-probe:])
        self.assertLess(onset, 0.15, "master onset too hot: %r" % onset)
        self.assertLess(offset, 0.05, "master offset too hot: %r" % offset)


class ServeLive(unittest.TestCase):
    def test_player_and_preview_serve_over_http(self):
        server, port = serve_tree(REPO)
        try:
            for path in ("/thunderline/index.html",
                         "/thunderline/player/audio/preview.json",
                         "/thunderline/player/audio/master.wav",
                         "/thunderline/player/audio/lyrics.json"):
                status, body = http_get(port, path)
                self.assertEqual(status, 200, path)
                self.assertGreater(len(body), 0, "empty body: %s" % path)
            status, body = http_get(port, "/thunderline/index.html")
            html = body.decode("utf-8")
            self.assertIn('href="docs/"', html,
                          "player footer never links the docs hub")
        finally:
            stop_server(server)

    def test_docs_hub_links_resolve_over_http(self):
        server, port = serve_tree(REPO)
        try:
            status, body = http_get(port, "/thunderline/docs/index.html")
            self.assertEqual(status, 200)
            links = [h for h in HREF.findall(body.decode("utf-8"))
                     if not h.startswith("http")]
            self.assertGreater(len(links), 5)
            import posixpath
            for href in links:
                if href.startswith("../"):
                    target = posixpath.normpath("/thunderline/docs/" + href)
                elif href.startswith("/"):
                    target = href
                else:
                    target = "/thunderline/docs/" + href
                status, _ = http_get(port, target)
                self.assertEqual(status, 200, "dead hub link: %s" % href)
        finally:
            stop_server(server)


class HostileLive(unittest.TestCase):
    def test_render_unknown_flag_fails_closed(self):
        proc = subprocess.run(
            [sys.executable, os.path.join(ROOT, "tools", "render.py"),
             "--bogus"],
            capture_output=True, text=True, cwd=REPO, timeout=120)
        self.assertNotEqual(proc.returncode, 0)
        self.assertNotIn("Traceback", proc.stdout + proc.stderr)

    def test_missing_stem_is_404_while_shell_serves(self):
        server, port = serve_tree(REPO)
        try:
            try:
                http_get(port, "/thunderline/player/audio/stems/nope.wav")
                self.fail("missing stem should 404")
            except Exception as exc:
                self.assertEqual(getattr(exc, "code", None), 404,
                                 "missing stem is not a 404: %r" % exc)
            status, _ = http_get(port, "/thunderline/index.html")
            self.assertEqual(status, 200)
        finally:
            stop_server(server)


if __name__ == "__main__":
    unittest.main()
