#!/usr/bin/env python3
"""Tester Phase 4 hostile regression pins for the Thunderline Pages player.

Durable black-box pins over the shipped entrypoint `thunderline/index.html`
plus the committed preview tree, going beyond the builder's own gate
(tests/test_player.py): exact WAV header math, preview.json completeness,
lyric timing invariants, no-eval/no-innerHTML hygiene, mobile viewport rules,
and a LIVE single-stem-missing run proving the master-only fallback shows its
honest notice with the transport still usable.

Added by the Tester on PR #485 (Refs #481). Never touches production logic.
"""
import functools
import hashlib
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

AUDIO = os.path.join(ROOT, "player", "audio")
INDEX = os.path.join(ROOT, "index.html")
PLAYER_JS = os.path.join(ROOT, "player", "player.js")
PLAYER_CSS = os.path.join(ROOT, "player", "player.css")
STEMS = ("vocals", "guitars", "bass", "drums")
SUBPROCESS_TIMEOUT = 120
BROWSER_TIMEOUT = 180

FALLBACK_DRIVER = """\
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const pageUrl = process.argv[2], port = process.argv[3];
  const CDP = "http://127.0.0.1:" + port;
  let id = 1;
  const rpc = (ws, method, params) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("rpc timeout " + method)), 15000);
    const mid = id++;
    const onMsg = (ev) => {
      let m; try { m = JSON.parse(ev.data.toString()); } catch (e) { return; }
      if (m.id === mid) { ws.removeEventListener("message", onMsg); clearTimeout(t);
        if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  const list = await (await fetch(CDP + "/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page) { console.error("no page target"); process.exit(2); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  try {
    await rpc(ws, "Runtime.enable"); await rpc(ws, "Page.enable");
    await rpc(ws, "Page.navigate", { url: pageUrl });
    let verdict = null;
    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      const r = await rpc(ws, "Runtime.evaluate", {
        expression: "({ready: !document.getElementById('transport').hidden, fb: !document.getElementById('fallbackNotice').hidden, muteOff: document.getElementById('mute-vocals').disabled, err: !document.getElementById('state-error').hidden, empty: !document.getElementById('state-empty').hidden})",
        returnByValue: true });
      const v = r.result.value;
      if (v.ready || v.err || v.empty) { verdict = v; verdict.polls = i + 1; break; }
    }
    if (!verdict) verdict = { ready: false, detail: "page never settled" };
    console.log(JSON.stringify(verdict));
  } finally { ws.close(); }
}
main().catch((e) => { console.error("driver error: " + (e && e.message)); process.exit(2); });
"""


def read_wav(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not RIFF/WAVE: %s" % path)
    (fmt_len, audio, ch, sr, br, ba, bits) = struct.unpack(
        "<IHHIIHH", data[16:36])
    (nbytes,) = struct.unpack("<I", data[40:44])
    return data, sr, ch, bits, br, ba, nbytes


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
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, port


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


class TesterPhase4WavMath(unittest.TestCase):
    def test_header_math_exact_all_files(self):
        targets = [("master.wav", 16)] + [
            (os.path.join("stems", n + ".wav"), 8) for n in STEMS]
        for rel, bits in targets:
            data, sr, ch, got_bits, br, ba, nbytes = read_wav(
                os.path.join(AUDIO, rel))
            self.assertEqual((sr, ch, got_bits), (22050, 1, bits), rel)
            self.assertEqual(br, sr * ch * bits // 8,
                             "byteRate wrong: %s" % rel)
            self.assertEqual(ba, ch * bits // 8,
                             "blockAlign wrong: %s" % rel)
            self.assertEqual(nbytes, len(data) - 44,
                             "data length mismatch: %s" % rel)
            dur = nbytes / (sr * ch * bits // 8)
            self.assertAlmostEqual(dur, 156.0, delta=0.2, msg=rel)

    def test_stems_are_unsigned_8bit_audible(self):
        for name in STEMS:
            with open(os.path.join(AUDIO, "stems", name + ".wav"),
                      "rb") as f:
                seg = f.read()[44 + 60 * 22050:44 + 61 * 22050]
            vals = [(b - 128) / 128.0 for b in seg]
            rms = (sum(v * v for v in vals) / len(vals)) ** 0.5
            self.assertGreater(rms, 0.02, "stem silent at 60 s: %s" % name)


class TesterPhase4ProvenanceCompleteness(unittest.TestCase):
    def test_preview_json_covers_exactly_committed_tree(self):
        with open(os.path.join(AUDIO, "preview.json"),
                  encoding="utf-8") as f:
            manifest = json.load(f)
        expected = {"master.wav", "lyrics.json", "song.json", "song.mid",
                    "sheet.html"} | {
                        os.path.join("stems", n + ".wav") for n in STEMS}
        self.assertEqual(set(manifest["files"]), expected)
        for rel, digest in manifest["files"].items():
            with open(os.path.join(AUDIO, rel), "rb") as f:
                self.assertEqual(hashlib.sha256(f.read()).hexdigest(),
                                 digest, "hash drift: %s" % rel)

    def test_no_eval_no_code_injection_surface(self):
        with open(PLAYER_JS, encoding="utf-8") as f:
            js = f.read()
        for needle in ("eval(", "new Function", "document.write"):
            self.assertNotIn(needle, js, "injection surface: %s" % needle)
        # innerHTML is used only to clear lists with an empty string;
        # all lyric/section content is built via createElement+textContent.
        for m in re.finditer(r"innerHTML\s*=\s*(.+?);", js):
            self.assertEqual(m.group(1).strip(), '""',
                             "innerHTML with content: %s" % m.group(0))
        self.assertIn("createElement", js)
        self.assertIn("textContent", js)
        with open(INDEX, encoding="utf-8") as f:
            html = f.read()
        self.assertIn('name="viewport"', html)


class TesterPhase4LyricInvariants(unittest.TestCase):
    def test_timing_monotonic_bounded(self):
        with open(os.path.join(AUDIO, "lyrics.json"),
                  encoding="utf-8") as f:
            lines = json.load(f)
        with open(os.path.join(AUDIO, "song.json"),
                  encoding="utf-8") as f:
            song = json.load(f)
        self.assertEqual(len(lines), 40)
        prev = 0.0
        for entry in lines:
            self.assertLess(entry["startSec"], entry["endSec"])
            self.assertGreaterEqual(entry["startSec"], prev)
            self.assertLessEqual(entry["endSec"], song["durationSec"])
            self.assertTrue(entry["line"].strip())
            prev = entry["startSec"]

    def test_css_mobile_and_canvas(self):
        with open(PLAYER_CSS, encoding="utf-8") as f:
            css = f.read()
        self.assertIn("@media (max-width: 480px)", css)
        self.assertIn(".overview", css)
        with open(INDEX, encoding="utf-8") as f:
            html = f.read()
        self.assertIn('id="overview"', html)
        self.assertIn('id="fallbackNotice"', html)


class TesterPhase4FallbackLive(unittest.TestCase):
    def test_single_stem_missing_falls_back_honestly(self):
        if chrome_binary() is None:
            self.skipTest("no chromium binary on PATH")
        if shutil.which("node") is None:
            self.skipTest("no node on PATH")
        with tempfile.TemporaryDirectory() as tmp:
            tree = os.path.join(tmp, "thunderline")
            shutil.copytree(ROOT, tree,
                            ignore=shutil.ignore_patterns("dist"))
            os.remove(os.path.join(tree, "player", "audio", "stems",
                                   "drums.wav"))
            server, srv_port = serve_tree(tmp)
            try:
                with tempfile.NamedTemporaryFile(
                        "w", suffix=".mjs", delete=False) as f:
                    f.write(FALLBACK_DRIVER)
                    driver = f.name
                cdp = free_port()
                profile = tempfile.mkdtemp(prefix="thunderline-fb-")
                proc = subprocess.Popen(
                    [chrome_binary(), "--headless=new", "--no-sandbox",
                     "--disable-gpu", "--mute-audio",
                     "--autoplay-policy=no-user-gesture-required",
                     "--remote-debugging-port=%d" % cdp,
                     "--user-data-dir=%s" % profile, "about:blank"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                try:
                    self.assertTrue(wait_for_cdp(cdp),
                                    "chrome CDP never came up")
                    proc2 = subprocess.run(
                        ["node", driver,
                         "http://127.0.0.1:%d/thunderline/index.html"
                         % srv_port, str(cdp)],
                        capture_output=True, text=True, cwd=REPO,
                        timeout=BROWSER_TIMEOUT)
                    self.assertEqual(proc2.returncode, 0,
                                     proc2.stderr[-500:])
                    verdict = json.loads(
                        proc2.stdout.strip().splitlines()[-1])
                finally:
                    proc.terminate()
                    try:
                        proc.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                    shutil.rmtree(profile, ignore_errors=True)
                    os.unlink(driver)
            finally:
                server.shutdown()
                server.server_close()
        self.assertTrue(verdict.get("ready"),
                        "transport must stay usable: %r" % verdict)
        self.assertTrue(verdict.get("fb"),
                        "fallback notice must show: %r" % verdict)
        self.assertTrue(verdict.get("muteOff"),
                        "stem toggles must disable: %r" % verdict)


if __name__ == "__main__":
    unittest.main()
