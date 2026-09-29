#!/usr/bin/env python3
"""Thunderline reproducibility audit (Phase 3, stdlib only).

Verifies a rendered ``dist/`` directory against ``score/song.json`` plus
``score/mix.json`` without re-rendering anything:

  artifacts      - every expected file exists (master, 4 stems, manifest,
                   preview wav/ogg, song.mid, sheet.html, lyrics.json)
  wav-format     - fixed 44-byte headers, mono 16-bit PCM, pinned rates
  duration       - master/stem lengths match the score duration (150-210 s gate)
  master-levels  - peak at/below the mix ceiling, no clipped samples, no DC
  stems-audible  - every stem bus is non-silent and matches master length
  stem-null      - sum of the shipped stem WAVs through the documented
                   soft-knee limiter reproduces the shipped master within
                   mix.json ``stemNullToleranceRms`` (proves the stems are
                   the real buses, not decoys)
  manifest       - generator string, score/mix hashes, seed, per-file hashes
  lyric-coverage - lyrics.json timings re-derive from the score; every lyric
                   line sits inside the track, starts ordered, and backs at
                   least one melody note; every melody ``line`` names a lyric
  ip-scan        - title plus lyrics contain no blocklist fragment
  energy         - no dead-air form section; final chorus lifts over verse 1

Exit 0 when every check passes, 1 otherwise. Prints one PASS/FAIL line per
check plus a summary. ``--report PATH`` additionally writes a JSON report.

No wall clock, no network, no randomness: the audit is a pure function of
the files it reads.
"""
import array
import hashlib
import json
import math
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SONG_PATH = os.path.join(ROOT, "score", "song.json")
MIX_PATH = os.path.join(ROOT, "score", "mix.json")
BLOCKLIST_PATH = os.path.join(ROOT, "score", "blocklist.txt")
DIST = os.path.join(ROOT, "dist")
STEMS = ("vocals", "guitars", "bass", "drums")


def sha_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read_mono16(path):
    """Parse a mono 16-bit PCM WAV; return (sample_rate, array('h'))."""
    with open(path, "rb") as f:
        data = f.read()
    if data[0:4] != b"RIFF":
        raise ValueError("missing RIFF")
    if data[8:12] != b"WAVE":
        raise ValueError("missing WAVE")
    if data[12:16] != b"fmt ":
        raise ValueError("missing fmt")
    (fmt_len, audio, ch, sr, _br, _ba, bits) = struct.unpack(
        "<IHHIIHH", data[16:36])
    if fmt_len != 16:
        raise ValueError("unexpected fmt len: %r" % fmt_len)
    if not (audio == 1 and ch == 1 and bits == 16):
        raise ValueError("not mono 16-bit PCM")
    if data[36:40] != b"data":
        raise ValueError("missing data chunk")
    (nbytes,) = struct.unpack("<I", data[40:44])
    raw = data[44:44 + nbytes]
    if len(raw) != nbytes:
        raise ValueError("truncated data chunk")
    return sr, array.array("h", raw)


def rms(samples):
    if not samples:
        return 0.0
    return (sum(v * v for v in samples) / len(samples)) ** 0.5 / 32767.0


def check(name, ok, detail=""):
    return {"check": name, "ok": bool(ok), "detail": str(detail)}


def audit(dist_dir=DIST, song_path=SONG_PATH, mix_path=MIX_PATH,
          blocklist_path=BLOCKLIST_PATH):
    results = []

    def need(path, label):
        if not os.path.isfile(path):
            results.append(check(label, False, "missing: %s" % path))
            return False
        return True

    # --- load score + mix (these gate everything else) ---
    try:
        with open(song_path, "r", encoding="utf-8") as f:
            song = json.load(f)
        with open(mix_path, "r", encoding="utf-8") as f:
            mix = json.load(f)
        results.append(check("score-load", True,
                             "%s bars, %.1f s" % (song["totalBars"],
                                                  song["durationSec"])))
    except (OSError, ValueError, KeyError) as e:
        results.append(check("score-load", False, str(e)))
        return results
    bpm = song["tempo"]["bpm"]
    beat = 60.0 / bpm
    sr_expect = mix["sampleRate"]
    ceiling = mix["masterCeiling"]
    threshold = mix["limiter"]["threshold"]
    null_tol = mix.get("stemNullToleranceRms", 0.02)

    # --- artifacts ---
    master_p = os.path.join(dist_dir, "master.wav")
    stem_ps = {s: os.path.join(dist_dir, "stems", s + ".wav") for s in STEMS}
    manifest_p = os.path.join(dist_dir, "manifest.json")
    preview_wav = os.path.join(dist_dir, "preview.wav")
    preview_ogg = os.path.join(dist_dir, "preview.ogg")
    mid_p = os.path.join(dist_dir, "song.mid")
    sheet_p = os.path.join(dist_dir, "sheet.html")
    lyrics_p = os.path.join(dist_dir, "lyrics.json")
    expected = ([master_p, manifest_p, mid_p, sheet_p, lyrics_p]
                + list(stem_ps.values()))
    missing = [p for p in expected if not os.path.isfile(p)]
    has_preview = os.path.isfile(preview_wav) or os.path.isfile(preview_ogg)
    ok = not missing and has_preview
    detail = "all present" if ok else "missing: %s%s" % (
        ", ".join(os.path.relpath(p, dist_dir) for p in missing),
        "" if has_preview else ("; " if missing else "") + "no preview")
    results.append(check("artifacts", ok, detail))

    # --- wav format + duration ---
    wav = {}
    wav_ok = True
    wav_notes = []
    n_expect = int(round(song["durationSec"] * sr_expect))
    for label, path in ([("master", master_p)]
                        + [("stems/" + s, stem_ps[s]) for s in STEMS]):
        if not os.path.isfile(path):
            wav_ok = False
            wav_notes.append("%s missing" % label)
            continue
        try:
            sr, data = read_mono16(path)
            wav[label] = (sr, data)
            if sr != sr_expect:
                wav_ok = False
                wav_notes.append("%s rate %d != %d" % (label, sr, sr_expect))
            if abs(len(data) - n_expect) > sr_expect // 100:
                wav_ok = False
                wav_notes.append("%s samples %d != %d" % (label, len(data),
                                                          n_expect))
        except (OSError, ValueError) as e:
            wav_ok = False
            wav_notes.append("%s corrupt: %s" % (label, e))
    dur = song["durationSec"]
    in_gate = 150.0 <= dur <= 210.0
    results.append(check("wav-format", wav_ok,
                         "; ".join(wav_notes) or "fixed headers, %d Hz" % sr_expect))
    results.append(check("duration", in_gate and wav_ok,
                         "%.1f s in 150-210 s gate" % dur if in_gate
                         else "%.1f s outside 150-210 s gate" % dur))

    # --- master levels ---
    if "master" in wav:
        _sr, master = wav["master"]
        peak = 0
        total = 0
        clipped = 0
        for v in master:
            a = abs(v)
            if a > peak:
                peak = a
            total += v
            if a >= 32767:
                clipped += 1
        peak_f = peak / 32767.0
        dc = total / len(master) / 32767.0
        ok = (peak_f <= ceiling + 1e-3 and peak_f > 0.3
              and clipped == 0 and abs(dc) < 0.01)
        results.append(check("master-levels", ok,
                             "peak %.3f (ceiling %.2f), clipped %d, dc %.4f"
                             % (peak_f, ceiling, clipped, dc)))
    else:
        results.append(check("master-levels", False, "no master.wav"))

    # --- stems audible ---
    stem_rms = {}
    stems_ok = bool(wav)
    notes = []
    for s in STEMS:
        label = "stems/" + s
        if label not in wav:
            stems_ok = False
            notes.append("%s missing" % s)
            continue
        _sr, data = wav[label]
        r = rms(data)
        stem_rms[s] = r
        if "master" in wav and len(data) != len(wav["master"][1]):
            stems_ok = False
            notes.append("%s length mismatch" % s)
        if r <= 0.03:
            stems_ok = False
            notes.append("%s near-silent (rms %.3f)" % (s, r))
    if stems_ok:
        notes = ["rms " + ", ".join("%s %.3f" % (s, stem_rms[s])
                                    for s in STEMS)]
    results.append(check("stems-audible", stems_ok, "; ".join(notes)))

    # --- stem-null: shipped stems through the documented limiter == master ---
    if all(("stems/" + s) in wav for s in STEMS) and "master" in wav:
        _sr, master = wav["master"]
        n = len(master)
        peak = 0.0
        recon = [0] * n
        acc = [0.0] * n
        for s in STEMS:
            data = wav["stems/" + s][1]
            for i in range(n):
                acc[i] += data[i] / 32767.0
        for i in range(n):
            x = acc[i]
            ax = abs(x)
            if ax <= threshold:
                y = x
            else:
                over = ax - threshold
                y = ((threshold + over / (1.0 + over))
                     * (1.0 if x >= 0 else -1.0))
            recon_f = y
            if abs(y) > peak:
                peak = abs(y)
            recon[i] = y  # float first; normalize below
        if peak > ceiling:
            scale = ceiling / peak
            recon = [y * scale for y in recon]
        se = 0.0
        for i in range(n):
            v = recon[i]
            if v > 1.0:
                v = 1.0
            elif v < -1.0:
                v = -1.0
            d = int(round(v * 32767.0)) - master[i]
            se += d * d
        null_rms = (se / n) ** 0.5 / 32767.0
        results.append(check("stem-null", null_rms <= null_tol,
                             "reconstruction rms %.5f (tolerance %.3f)"
                             % (null_rms, null_tol)))
    else:
        results.append(check("stem-null", False, "stems or master missing"))

    # --- manifest provenance ---
    if need(manifest_p, "manifest"):
        try:
            with open(manifest_p, "r", encoding="utf-8") as f:
                man = json.load(f)
            problems = []
            if man.get("generator") != "tools/render.py (stdlib only)":
                problems.append("generator %r" % man.get("generator"))
            if man.get("scoreSha256") != sha_file(song_path):
                problems.append("score hash drift")
            if man.get("mixSha256") != sha_file(mix_path):
                problems.append("mix hash drift")
            if man.get("masterSeed") != song.get("masterSeed"):
                problems.append("seed mismatch")
            for rel, digest in man.get("files", {}).items():
                p = os.path.join(dist_dir, rel)
                if not os.path.isfile(p):
                    problems.append("listed file missing: %s" % rel)
                elif sha_file(p) != digest:
                    problems.append("hash mismatch: %s" % rel)
            results.append(check("manifest", not problems,
                                 "; ".join(problems) or "hashes match"))
        except (OSError, ValueError) as e:
            results.append(check("manifest", False, str(e)))

    # --- lyric coverage ---
    try:
        with open(lyrics_p, "r", encoding="utf-8") as f:
            exported = json.load(f)
        lines = song["lyrics"]
        problems = []
        if len(exported) != len(lines):
            problems.append("lyrics.json has %d lines, score has %d"
                            % (len(exported), len(lines)))
        lyric_set = set(l["line"] for l in lines)
        prev_start = -1.0
        for lyr in lines:
            a = round(lyr["startBeat"] * beat, 3)
            b = round(lyr["endBeat"] * beat, 3)
            if not (a < b):
                problems.append("empty timing: %r" % lyr["line"][:30])
            if not (0.0 <= a and b <= dur + 1e-6):
                problems.append("out of range: %r" % lyr["line"][:30])
            if a < prev_start:
                problems.append("unordered: %r" % lyr["line"][:30])
            prev_start = a
        for i, lyr in enumerate(lines):
            if i < len(exported):
                exp = exported[i]
                if (exp.get("line") != lyr["line"]
                        or abs(exp.get("startSec", -1) - round(lyr["startBeat"] * beat, 3)) > 1e-6
                        or abs(exp.get("endSec", -1) - round(lyr["endBeat"] * beat, 3)) > 1e-6):
                    problems.append("lyrics.json drift at line %d" % i)
                    break
        sung = set()
        for note in song["melody"]:
            if note.get("line") not in lyric_set:
                problems.append("melody line missing from lyrics: %r"
                                % str(note.get("line"))[:30])
                break
            sung.add(note.get("line"))
        for lyr in lines:
            if lyr["line"] not in sung:
                problems.append("unsung lyric line: %r" % lyr["line"][:30])
                break
        results.append(check("lyric-coverage", not problems,
                             "%d lines, timings re-derive, all sung"
                             % len(lines) if not problems
                             else "; ".join(problems[:4])))
    except (OSError, ValueError, KeyError) as e:
        results.append(check("lyric-coverage", False, str(e)))

    # --- IP scan ---
    try:
        with open(blocklist_path, "r", encoding="utf-8") as f:
            frags = [l.strip().lower() for l in f
                     if l.strip() and not l.strip().startswith("#")]
        haystacks = [("title", song["title"])]
        haystacks += [("lyric", l["line"]) for l in song["lyrics"]]
        hits = []
        for frag in frags:
            for kind, text in haystacks:
                if frag and frag in text.lower():
                    hits.append("%s %r in %s %r"
                                % (frag, kind, kind, text[:40]))
        results.append(check("ip-scan", not hits,
                             "%d fragments clean" % len(frags) if not hits
                             else "; ".join(hits[:4])))
    except OSError as e:
        results.append(check("ip-scan", False, str(e)))

    # --- energy: no dead air, final lift ---
    if "master" in wav:
        _sr, master = wav["master"]
        problems = []
        energies = {}
        for sec in song["form"]:
            a = int(round(sec["startBar"] * 4 * beat * sr_expect))
            b = int(round((sec["startBar"] + sec["bars"]) * 4 * beat * sr_expect))
            seg = master[a:b]
            r = rms(seg)
            energies[sec["section"]] = r
            if r <= 0.05:
                problems.append("dead air in %s" % sec["section"])
        if (energies.get("finalchorus", 0) <= energies.get("verse1", 1)):
            problems.append("no final-chorus lift: %s"
                            % ", ".join("%s %.3f" % kv
                                        for kv in sorted(energies.items())))
        results.append(check("energy", not problems,
                             "; ".join(problems[:4]) if problems
                             else "final %.3f over verse1 %.3f"
                             % (energies.get("finalchorus", 0),
                                energies.get("verse1", 0))))
    else:
        results.append(check("energy", False, "no master.wav"))

    # --- score artifacts sanity ---
    if need(mid_p, "score-midi") and need(sheet_p, "score-sheet"):
        with open(mid_p, "rb") as f:
            head = f.read(4)
        with open(sheet_p, "r", encoding="utf-8") as f:
            sheet = f.read()
        ok = head == b"MThd" and song["title"] in sheet
        results.append(check("score-artifacts", ok,
                             "song.mid MThd, sheet names title" if ok
                             else "mid header %r, title in sheet: %s"
                             % (head, song["title"] in sheet)))

    return results


def main(argv):
    dist_dir = DIST
    song_path = SONG_PATH
    mix_path = MIX_PATH
    blocklist_path = BLOCKLIST_PATH
    report_path = None
    args = list(argv)
    while args:
        a = args.pop(0)
        if a in ("--dist", "--score", "--mix", "--blocklist", "--report"):
            if not args:
                print("audit.py: %s needs a value" % a, file=sys.stderr)
                return 2
            val = args.pop(0)
            if a == "--dist":
                dist_dir = val
            elif a == "--score":
                song_path = val
            elif a == "--mix":
                mix_path = val
            elif a == "--blocklist":
                blocklist_path = val
            else:
                report_path = val
        else:
            print("audit.py: unknown arg %r" % a, file=sys.stderr)
            return 2
    results = audit(dist_dir, song_path, mix_path, blocklist_path)
    failed = [r for r in results if not r["ok"]]
    for r in results:
        print("%s %-15s %s" % ("PASS" if r["ok"] else "FAIL", r["check"],
                               r["detail"]))
    print("audit: %d/%d checks passed" % (len(results) - len(failed),
                                          len(results)))
    if report_path:
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({"dist": dist_dir, "passed": not failed,
                       "results": results}, f, indent=1, sort_keys=True)
            f.write("\n")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
