#!/usr/bin/env python3
"""Thunderline deterministic render engine (Phase 2, stdlib only).

Reads ``score/song.json`` + ``score/mix.json`` and renders::

    dist/master.wav               - 44.1 kHz 16-bit mono master, soft-limited
    dist/stems/vocals.wav         - isolated vocal bus (post gain+EQ, pre limiter)
    dist/stems/guitars.wav        - isolated guitar bus (rhythm + lead)
    dist/stems/bass.wav           - isolated bass bus
    dist/stems/drums.wav          - isolated drum bus
    dist/manifest.json            - provenance (generator, score hash, file hashes)
    dist/preview.ogg              - compressed preview via ffmpeg when available,
                                    else dist/preview.wav (22.05 kHz fallback)

Voices are honest subtractive synthesis: kick (sine pitch drop), snare (tone
plus seeded noise), hats (seeded noise ticks), bass (triangle/saw walking
line from chord roots), rhythm guitar (sawtooth power-chord chops), lead
guitar (sawtooth with vibrato), lead vocal (sawtooth stack through two
time-varying-by-syllable formant resonators; a synthesized voice, not a human
impersonation).

Determinism contract: no wall clock, no network, no unseeded randomness. Every
noise source draws from ``random.Random("<masterSeed>:<voice>")`` streams, so
event order never affects the stream state. WAV headers are hand-written fixed
bytes (no timestamps). Same score plus same script equals bit-identical audio,
verified by ``tests/test_render.py``.
"""
import array
import hashlib
import json
import math
import os
import random
import shutil
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SONG_PATH = os.path.join(ROOT, "score", "song.json")
MIX_PATH = os.path.join(ROOT, "score", "mix.json")
DIST = os.path.join(ROOT, "dist")
STEMS = ("vocals", "guitars", "bass", "drums")

CHORD_ROOTS = {"E7": 40, "A7": 45, "B7": 47}  # E2/A2/B2 MIDI
CHORD_TONES = (0, 4, 7, 10)  # dominant-7th stack above the root
VOWELS = {  # (F1, F2) formant centers; R fixed at 0.96
    "a": (730.0, 1090.0),
    "e": (530.0, 1840.0),
    "i": (270.0, 2290.0),
    "o": (570.0, 840.0),
}


def midi_to_freq(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write_wav_fixed(path, samples, sample_rate):
    """Write mono 16-bit PCM with a fixed 44-byte header (no timestamps)."""
    n = len(samples)
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + n * 2))
        f.write(b"WAVEfmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2,
                            2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", n * 2))
        f.write(struct.pack("<%dh" % n, *samples))


class Synth:
    """Wavetable voice renderer accumulate into float buses."""

    def __init__(self, sample_rate, seed):
        self.sr = sample_rate
        self.seed = seed
        self._tables = {}  # (kind, round(freq,2)) -> list[float] one period
        self.noise = None

    def stream(self, voice):
        return random.Random("%s:%s" % (self.seed, voice))

    def table(self, kind, freq):
        key = (kind, round(freq, 2))
        t = self._tables.get(key)
        if t is not None:
            return t
        sr = self.sr
        period = max(1, int(round(sr / freq)))
        if kind == "sine":
            t = [math.sin(2.0 * math.pi * i / period)
                 for i in range(period)]
        elif kind == "saw":
            t = [2.0 * (i / period) - 1.0 for i in range(period)]
        elif kind == "tri":
            t = [(4.0 * (i / period) - 1.0) if i < period / 2
                 else (3.0 - 4.0 * (i / period)) for i in range(period)]
        elif kind == "vocal":
            # saw stack f + 0.35*2f + 0.15*3f, still exactly one period
            t = []
            for i in range(period):
                p = i / period
                p2 = (2.0 * p) % 1.0
                p3 = (3.0 * p) % 1.0
                t.append((2.0 * p - 1.0) + 0.35 * (2.0 * p2 - 1.0)
                         + 0.15 * (2.0 * p3 - 1.0))
        else:
            raise ValueError("unknown table kind: %r" % kind)
        self._tables[key] = t
        return t

    def make_noise(self, rng, seconds=1.0):
        n = int(seconds * self.sr)
        return [rng.uniform(-1.0, 1.0) for _ in range(n)]

    @staticmethod
    def fit(bus, start, n):
        """Clamp a write span to the buffer end (the outro fill may ring
        past the last sample; it is truncated, never wrapped)."""
        if start < 0:
            return 0
        return max(0, min(n, len(bus) - start))

    @staticmethod
    def envelope(n, sr, attack=0.005, release=0.03, sustain=0.8):
        """Linear attack, flat sustain, linear release. Returns list[float]."""
        env = [sustain] * n
        na = min(n, max(1, int(attack * sr)))
        for i in range(na):
            env[i] = (i + 1) / na
        nr = min(n, max(1, int(release * sr)))
        for i in range(nr):
            env[n - 1 - i] = sustain * (nr - i) / nr
        return env

    @staticmethod
    def pluck_envelope(n, sr, attack=0.004, decay=0.25):
        """Fast attack then exponential decay toward 0.35 floor."""
        env = [0.0] * n
        na = min(n, max(1, int(attack * sr)))
        for i in range(na):
            env[i] = (i + 1) / na
        for i in range(na, n):
            t = (i - na) / sr
            env[i] = 0.35 + 0.65 * math.exp(-t / decay)
        return env

    def add_tone(self, bus, start, freq, dur, kind, level, env):
        """Add a static-pitch wavetable tone with a precomputed envelope."""
        n = Synth.fit(bus, start, len(env))
        if n == 0:
            return
        env = env[:n]
        t = self.table(kind, freq)
        p = len(t)
        idx = 0
        for i in range(n):
            bus[start + i] += t[idx] * env[i] * level
            idx += 1
            if idx == p:
                idx = 0

    def add_vibrato_tone(self, bus, start, freq, dur_sec, level, env,
                         vib_hz=5.5, vib_depth=0.006):
        """Saw tone whose phase advance wobbles (precomputed LFO, no per-sample sin)."""
        n = Synth.fit(bus, start, len(env))
        if n == 0:
            return
        env = env[:n]
        t = self.table("saw", freq)
        p = len(t)
        step = p / (self.sr / freq)  # table steps per sample at center pitch
        lfo_n = max(1, int(self.sr / vib_hz))
        lfo = [math.sin(2.0 * math.pi * i / lfo_n) for i in range(lfo_n)]
        pos = 0.0
        for i in range(n):
            bus[start + i] += t[int(pos) % p] * env[i] * level
            pos += step * (1.0 + vib_depth * lfo[i % lfo_n])

    def add_kick(self, bus, start, level):
        sr = self.sr
        n = Synth.fit(bus, start, int(0.14 * sr))
        phase = 0.0
        for i in range(n):
            t = i / sr
            f = 45.0 + 105.0 * math.exp(-t * 30.0)
            phase += 2.0 * math.pi * f / sr
            env = math.exp(-t * 28.0)
            bus[start + i] += math.sin(phase) * env * level

    def add_snare(self, bus, start, noise, noise_off, level):
        sr = self.sr
        n = Synth.fit(bus, start, int(0.20 * sr))
        t180 = self.table("sine", 180.0)
        for i in range(n):
            t = i / sr
            env = math.exp(-t * 22.0)
            tone = t180[i % len(t180)] * 0.6
            nz = noise[(noise_off + i) % len(noise)]
            bus[start + i] += (tone + nz * 0.55) * env * level

    def add_hat(self, bus, start, noise, noise_off, level, open_hat=False):
        n = Synth.fit(bus, start, int((0.25 if open_hat else 0.05) * self.sr))
        prev = 0.0
        decay = 0.25 if open_hat else 0.05
        for i in range(n):
            t = i / self.sr
            x = noise[(noise_off + i) % len(noise)]
            hp = x - prev  # crude highpass tick
            prev = x
            bus[start + i] += hp * math.exp(-t / decay) * level


def resonator_params(freq, bw, sr):
    r = math.exp(-math.pi * bw / sr)
    w = 2.0 * math.pi * freq / sr
    return r, 2.0 * r * math.cos(w), r * r


def apply_formants(synth, freq, vowel):
    """Run the vocal excitation table through two formant resonators and
    capture one settled period as a wavetable. Deterministic."""
    exc = synth.table("vocal", freq)
    p = len(exc)
    f1, f2 = VOWELS[vowel]
    r1, c1, d1 = resonator_params(f1, 90.0, synth.sr)
    r2, c2, d2 = resonator_params(f2, 110.0, synth.sr)
    y1a = y2a = y1b = y2b = 0.0
    settled = [0.0] * p
    for rep in range(3):  # run 3 periods, keep the last (settled) one
        for i in range(p):
            x = exc[i]
            y0 = x + c1 * y1a - d1 * y2a
            y2a, y1a = y1a, y0
            z0 = y0 + c2 * y1b - d2 * y2b
            y2b, y1b = y1b, z0
            if rep == 2:
                settled[i] = z0
    peak = max(1e-6, max(abs(v) for v in settled))
    scale = 0.9 / peak
    key = ("vox", vowel, round(freq, 2))
    synth._tables[key] = [v * scale for v in settled]
    return synth._tables[key]


def vowel_for_line(line):
    return "aeio"[int(hashlib.md5(line.encode("utf-8")).hexdigest(), 16) % 4]


def render_song(song, mix, out_dir):
    sr = mix["sampleRate"]
    bpm = song["tempo"]["bpm"]
    beat = 60.0 / bpm
    total_sec = song["durationSec"]
    n_total = int(round(total_sec * sr))
    seed = song["masterSeed"]
    synth = Synth(sr, seed)

    buses = {name: array.array("f", [0.0]) * n_total for name in STEMS}
    chords = song["chords"]
    roots = [CHORD_ROOTS[c["chord"]] for c in chords]
    bar_of_beat = {}
    for a in song["arrangement"]:
        bar_of_beat[a["bar"]] = a
    dyn_of_bar = {a["bar"]: a["dynamics"] for a in song["arrangement"]}
    front_of_bar = {a["bar"]: a["front"] for a in song["arrangement"]}
    drums_of_bar = {a["bar"]: a["drums"] for a in song["arrangement"]}

    def samp(beats):
        return int(round(beats * beat * sr))

    # --- seeded per-voice streams (order-independent determinism) ---
    r_vel = {v: synth.stream("vel-%s" % v)
             for v in ("drums", "bass", "guitar", "lead", "vocal")}
    noise = synth.make_noise(synth.stream("noise"), seconds=1.0)
    r_off = synth.stream("noise-offsets")
    # Pre-draw all noise offsets in bar order (deterministic sequence).
    hat_offs = {}
    snare_offs = {}
    for bar in range(song["totalBars"]):
        pat = drums_of_bar[bar]
        n_hat = 4 if pat == "halfTime" else 8
        hat_offs[bar] = [int(r_off.random() * (len(noise) - int(0.3 * sr)))
                         for _ in range(n_hat)]
        snare_offs[bar] = [int(r_off.random() * (len(noise) - int(0.3 * sr)))
                           for _ in range(4)]

    # --- drums ---
    drums = buses["drums"]
    for bar in range(song["totalBars"]):
        pat = drums_of_bar[bar]
        dyn = dyn_of_bar[bar]
        base = bar * 4.0
        last_of_section = (bar + 1 >= song["totalBars"]
                           or bar_of_beat[bar + 1]["section"] != bar_of_beat[bar]["section"])
        if pat == "backbeat":
            for q in (0.0, 2.0):
                drums_s = samp(base + q)
                synth.add_kick(drums, drums_s,
                               (0.9 + 0.2 * r_vel["drums"].random()) * dyn)
            for q in (1.0, 3.0):
                synth.add_snare(drums, samp(base + q), noise,
                                snare_offs[bar][int(q)], 0.8 * dyn)
            for h in range(8):
                synth.add_hat(drums, samp(base + h * 0.5), noise,
                              hat_offs[bar][h],
                              (0.5 if h % 2 else 0.32) * dyn)
            if last_of_section:  # bar-end fill: 16th snare run on beat 4
                for s in range(4):
                    synth.add_snare(drums, samp(base + 3.0 + s * 0.25),
                                    noise, snare_offs[bar][s],
                                    (0.45 + 0.12 * s) * dyn)
        elif pat == "halfTime":
            synth.add_kick(drums, samp(base),
                           (0.9 + 0.2 * r_vel["drums"].random()) * dyn)
            synth.add_snare(drums, samp(base + 2.0), noise,
                            snare_offs[bar][2], 0.85 * dyn)
            for h in range(4):
                synth.add_hat(drums, samp(base + h), noise, hat_offs[bar][h],
                              0.4 * dyn)
        else:  # breakDown: four-on-floor kicks, 8th hats, no snare
            for q in range(4):
                synth.add_kick(drums, samp(base + q),
                               (0.8 + 0.2 * r_vel["drums"].random()) * dyn)
            for h in range(8):
                synth.add_hat(drums, samp(base + h * 0.5), noise,
                              hat_offs[bar][h],
                              (0.42 if h == 0 else 0.3) * dyn,
                              open_hat=(h == 0))

    # --- bass: walking quarters from chord roots ---
    bass = buses["bass"]
    for bar in range(song["totalBars"]):
        root = roots[bar]
        nxt = roots[bar + 1] if bar + 1 < len(roots) else root
        dyn = dyn_of_bar[bar]
        steps = [root - 12, root - 12 + 7, root - 12 + 9,
                 nxt - 12 - 1 if abs((nxt - 1) - root) <= 7 else root - 12 + 7]
        for q, midi in enumerate(steps):
            f = midi_to_freq(midi)
            dur = beat * 0.95
            env = Synth.pluck_envelope(int(dur * sr), sr)
            vel = (0.75 + 0.25 * r_vel["bass"].random()) * dyn
            # triangle body plus a breath of saw edge
            synth.add_tone(bass, samp(bar * 4.0 + q), f, dur, "tri",
                           0.55 * vel, env)
            synth.add_tone(bass, samp(bar * 4.0 + q), f, dur, "saw",
                           0.18 * vel, env)

    # --- rhythm guitar: 8th-note power-chord chops ---
    guitars = buses["guitars"]
    for bar in range(song["totalBars"]):
        root = roots[bar]
        dyn = dyn_of_bar[bar]
        pcs = [root + 12, root + 19, root + 24]
        for h in range(8):
            down = (h % 2 == 0)
            dur = beat * (0.42 if down else 0.22)
            env = Synth.pluck_envelope(int(dur * sr), sr, decay=0.09)
            vel = ((0.5 + 0.2 * r_vel["guitar"].random())
                   if down else (0.32 + 0.12 * r_vel["guitar"].random()))
            vel *= dyn
            st = samp(bar * 4.0 + h * 0.5)
            for m in pcs:
                synth.add_tone(guitars, st, midi_to_freq(m), dur, "saw",
                               vel / len(pcs), env)

    # --- lead guitar: authored riff/solo/tag where front says so ---
    for note in song["leadGuitar"]:
        bar = int(note["startBeat"] // 4)
        if bar >= song["totalBars"]:
            continue
        if "leadGuitar" not in front_of_bar.get(bar, ""):
            continue
        dyn = dyn_of_bar[bar]
        n = int(note["durBeats"] * beat * sr)
        env = Synth.envelope(n, sr, sustain=0.85)
        vel = (0.5 + 0.15 * r_vel["lead"].random()) * dyn
        synth.add_vibrato_tone(guitars, samp(note["startBeat"]),
                               midi_to_freq(note["midi"]),
                               note["durBeats"] * beat, vel, env)

    # --- lead vocal: melody through per-syllable formants ---
    vocals = buses["vocals"]
    for note in song["melody"]:
        bar = int(note["startBeat"] // 4)
        if bar >= song["totalBars"]:
            continue
        if "leadVocal" not in front_of_bar.get(bar, ""):
            continue
        dyn = dyn_of_bar[bar]
        n = int(note["durBeats"] * beat * sr)
        env = Synth.envelope(n, sr, attack=0.02, release=0.06, sustain=0.9)
        vel = (0.55 + 0.15 * r_vel["vocal"].random()) * dyn
        wavetable = apply_formants(synth, midi_to_freq(note["midi"]),
                                   vowel_for_line(note.get("line", "")))
        p = len(wavetable)
        st = samp(note["startBeat"])
        idx = 0
        for i in range(n):
            if st + i < len(vocals):
                vocals[st + i] += wavetable[idx] * env[i] * vel
            idx += 1
            if idx == p:
                idx = 0

    # --- mix: per-bus one-pole highpass + presence shelf + gain (one pass) ---
    stems = {}
    for name in STEMS:
        cfg = mix["buses"][name]
        gain = cfg["gain"]
        a_hp = math.exp(-2.0 * math.pi * cfg["eqHighpassHz"] / sr)
        c_lp = 1.0 - math.exp(-2.0 * math.pi * cfg["eqPresenceHz"] / sr)
        pg = (10.0 ** (cfg["eqPresenceDb"] / 20.0)) - 1.0
        bus = buses[name]
        out = array.array("f", [0.0]) * n_total
        lp = 0.0
        hp_y = 0.0
        hp_xp = 0.0
        for i in range(n_total):
            x = bus[i]
            lp += c_lp * (x - lp)
            b = x + pg * (x - lp)
            hp_y = a_hp * (hp_y + b - hp_xp)
            hp_xp = b
            out[i] = hp_y * gain
        stems[name] = out

    # --- master: sum buses, soft knee at threshold, normalize to ceiling ---
    threshold = mix["limiter"]["threshold"]
    ceiling = mix["masterCeiling"]
    master = array.array("f", [0.0]) * n_total
    peak = 0.0
    for i in range(n_total):
        x = stems["vocals"][i] + stems["guitars"][i] + stems["bass"][i] \
            + stems["drums"][i]
        ax = abs(x)
        if ax <= threshold:
            y = x
        else:
            over = ax - threshold
            y = (threshold + over / (1.0 + over)) * (1.0 if x >= 0 else -1.0)
        master[i] = y
        if abs(y) > peak:
            peak = abs(y)
    if peak > ceiling:
        scale = ceiling / peak
        for i in range(n_total):
            master[i] *= scale
        peak = ceiling

    # --- write artifacts (fixed headers, deterministic int16 rounding) ---
    os.makedirs(out_dir, exist_ok=True)
    stem_dir = os.path.join(out_dir, "stems")
    os.makedirs(stem_dir, exist_ok=True)

    def quantize(buf):
        out = [0] * len(buf)
        for i in range(len(buf)):
            v = buf[i]
            if v > 1.0:
                v = 1.0
            elif v < -1.0:
                v = -1.0
            out[i] = int(round(v * 32767.0))
        return out

    write_wav_fixed(os.path.join(out_dir, "master.wav"), quantize(master), sr)
    for name in STEMS:
        write_wav_fixed(os.path.join(stem_dir, name + ".wav"),
                        quantize(stems[name]), sr)

    # --- compressed preview: pinned ffmpeg when present, else honest fallback
    preview_note = ""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        proc = subprocess.run(
            [ffmpeg, "-y", "-v", "error", "-i",
             os.path.join(out_dir, "master.wav"), "-c:a", "libvorbis",
             "-q:a", "4", os.path.join(out_dir, "preview.ogg")],
            capture_output=True, text=True, timeout=300)
        if proc.returncode == 0:
            preview_note = "preview.ogg via ffmpeg libvorbis q4"
        else:
            preview_note = "ffmpeg failed (%s); no preview written" % \
                proc.stderr.strip()[-200:]
    else:
        # deterministic 22.05 kHz mono downsample (2-tap lowpass, even-phase)
        half = [(master[i] + master[i + 1]) * 0.5
                for i in range(0, n_total - 1, 2)]
        write_wav_fixed(os.path.join(out_dir, "preview.wav"), quantize(half),
                        sr // 2)
        preview_note = ("no ffmpeg on PATH; preview.wav fallback "
                        "(22.05 kHz mono downsample of master)")

    manifest = {
        "title": song["title"],
        "generator": "tools/render.py (stdlib only)",
        "scoreSha256": sha_file(SONG_PATH),
        "mixSha256": sha_file(MIX_PATH),
        "masterSeed": seed,
        "sampleRate": sr,
        "durationSec": total_sec,
        "peak": round(peak, 6),
        "preview": preview_note,
        "files": {},
    }
    for rel in (["master.wav"] + [os.path.join("stems", n + ".wav")
                                  for n in STEMS]):
        manifest["files"][rel] = sha_file(os.path.join(out_dir, rel))
    with open(os.path.join(out_dir, "manifest.json"), "w",
              encoding="utf-8") as f:
        json.dump(manifest, f, indent=1, sort_keys=True)
        f.write("\n")
    print("rendered master.wav (peak %.3f, %.1f s) + 4 stems; %s"
          % (peak, total_sec, preview_note))
    return 0


def main(argv):
    out_dir = DIST
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--out":
            if not args:
                print("render.py: --out needs a directory", file=sys.stderr)
                return 2
            out_dir = args.pop(0)
        else:
            print("render.py: unknown arg %r" % a, file=sys.stderr)
            return 2
    with open(SONG_PATH, "r", encoding="utf-8") as f:
        song = json.load(f)
    with open(MIX_PATH, "r", encoding="utf-8") as f:
        mix = json.load(f)
    return render_song(song, mix, out_dir)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
