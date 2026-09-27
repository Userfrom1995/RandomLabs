// Hearthlight tester hostile regression suite (Phase 4 voice continuity, PR #467).
// Run: node film/tests/tester-phase4-voice-hostile.mjs - exit non-zero on failure.
// Distinct from film/tests/dialogue-voice.mjs (builder delivery gates) and
// film/tests/tester-phase4-audio.mjs (PR #458 synthesis determinism): this is
// the Tester's adversarial pass over the Phase 4 live-parity fixes. It sweeps
// livePeakFor against duckLevelAt across the whole timeline (wind bed must
// duck with the SFX floor everywhere, notes with the score floor), hammers
// livePhrasesForStep with degenerate grids, and asserts the duck envelope
// never returns NaN or throws on hostile inputs.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { livePhrasesForStep } from '../score/animatic-audio.js';
import { buildScoreEvents } from '../score/orchestra.js';
import { buildSfxEvents } from '../score/sfx.js';
import { renderMix } from '../score/mix.js';
import {
  dialogueWindows, duckLevelAt, shotWindows, livePeakFor,
  SCORE_FLOOR, SFX_FLOOR, DUCK_ATTACK, DUCK_RELEASE,
} from '../score/duck.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);
const W = dialogueWindows(tl);

// 1. live score-peak parity across the full timeline: every shot, every
// quarter second, livePeakFor with the score floor must equal the offline
// duckLevelAt at the matching absolute time. Any drift means the theatre
// plays louder than the WAV under dialogue.
let maxScoreDiff = 0;
for (const s of tl.shots) {
  const sw = shotWindows(s);
  for (let t = 0; t < s.dur; t += 0.25) {
    const live = livePeakFor(sw, t, SCORE_FLOOR);
    const off = duckLevelAt(s.start + t, W, SCORE_FLOOR);
    maxScoreDiff = Math.max(maxScoreDiff, Math.abs(live - off));
  }
}
ok('hostile live score peak matches offline everywhere', maxScoreDiff === 0, String(maxScoreDiff));

// 2. live wind-bed parity: the SFX floor must agree everywhere too. A
// full-strength wind bed under dialogue (the pre-fix Finding 1) fails here.
let maxSfxDiff = 0;
for (const s of tl.shots) {
  const sw = shotWindows(s);
  for (let t = 0; t < s.dur; t += 0.25) {
    const live = livePeakFor(sw, t, SFX_FLOOR);
    const off = duckLevelAt(s.start + t, W, SFX_FLOOR);
    maxSfxDiff = Math.max(maxSfxDiff, Math.abs(live - off));
  }
}
ok('hostile live wind bed matches offline sfx floor everywhere', maxSfxDiff === 0, String(maxSfxDiff));

// 3. duck audibly favors words at the envelope level on this head.
let dSum = 0; let dN = 0; let oSum = 0; let oN = 0;
for (let t = 0; t < tl.total; t += 0.1) {
  const v = duckLevelAt(t, W, SCORE_FLOOR);
  if (W.some(([a, b]) => t >= a && t <= b)) { dSum += v; dN++; }
  else { oSum += v; oN++; }
}
ok('hostile envelope favors words', dSum / dN < 0.55 && oSum / oN > 0.9,
  'under ' + (dSum / dN).toFixed(2) + ' vs out ' + (oSum / oN).toFixed(2));

// 4. offline stem direction: the rendered score stem must not play louder
// under dialogue than outside it (downsampled render for speed).
{
  const score = buildScoreEvents(tl);
  const sfx = buildSfxEvents(tl);
  const sr = 8000;
  const { stems } = renderMix(tl, score, sfx, sr);
  const sc = stems.score;
  const rms = (a, b) => {
    let s = 0;
    for (let i = a; i < b; i++) s += sc[i] * sc[i];
    return Math.sqrt(s / Math.max(1, b - a));
  };
  let du = 0; let dn = 0; let ou = 0; let on = 0;
  for (const [a, b] of W) {
    const x = Math.floor(a * sr); const y = Math.min(sc.length, Math.ceil(b * sr));
    if (y > x) { du += rms(x, y); dn++; }
  }
  for (let t = 0; t < tl.total; t += 5) {
    if (W.some(([a, b]) => t >= a - 1 && t <= b + 1)) continue;
    const x = Math.floor(t * sr);
    ou += rms(x, Math.min(sc.length, x + sr)); on++;
  }
  ok('hostile score stem not louder under dialogue', du / dn <= ou / on,
    'under ' + (du / dn).toFixed(4) + ' vs out ' + (ou / on).toFixed(4));
}

// 5. degenerate trigger grids never throw and never emit: zero, negative,
// NaN, and missing beats-per-note; empty and inverted ranges; steps outside.
let degenOk = true;
try {
  const bad = [
    { voice: 'x', beatsPerNote: 0, fromBeat: 0, toBeat: 4 },
    { voice: 'x', beatsPerNote: -1, fromBeat: 0, toBeat: 4 },
    { voice: 'x', beatsPerNote: NaN, fromBeat: 0, toBeat: 4 },
    { voice: 'x', fromBeat: 0, toBeat: 4 },
    { voice: 'x', beatsPerNote: 1, fromBeat: 5, toBeat: 3 },
    { voice: 'x', beatsPerNote: 1, fromBeat: 0, toBeat: 0 },
  ];
  for (const ln of bad) {
    for (const s of [0, 2, 10]) {
      const tr = livePhrasesForStep(ln, s);
      if (!Array.isArray(tr) || tr.length !== 0) degenOk = false;
    }
  }
  const gate = { voice: 'x', beatsPerNote: 1, fromBeat: 2, toBeat: 5 };
  if (livePhrasesForStep(gate, 0).length !== 0) degenOk = false;
  if (livePhrasesForStep(gate, 5).length !== 0) degenOk = false;
  if (livePhrasesForStep(gate, 2).length !== 1) degenOk = false;
} catch { degenOk = false; }
ok('hostile degenerate grids emit nothing without throwing', degenOk);

// 6. sub-beat expansion: bpn 0.5 yields two hits per beat with honest delays,
// phrases advance by one, and resolve lands on the true last phrase only.
{
  const ln = { voice: 'shaker', beatsPerNote: 0.5, fromBeat: 0, toBeat: 4, degreeOffset: 0 };
  const hits = livePhrasesForStep(ln, 1);
  const span = Math.floor(4 / 0.5);
  ok('hostile sub-beat expands to two hits with delays',
    hits.length === 2 && hits[0].delayBeats === 0 && hits[1].delayBeats === 0.5 &&
    hits[1].phrase === hits[0].phrase + 1 && hits[0].span === span);
  let lastCount = 0;
  for (let s = 0; s < 4; s++) {
    for (const tr of livePhrasesForStep(ln, s)) {
      if (tr.isLast) {
        lastCount++;
        if (tr.phrase !== span - 1) lastCount += 100;
      }
    }
  }
  ok('hostile sub-beat resolves exactly once on the last phrase', lastCount === 1, String(lastCount));
}

// 7. duck envelope hostile inputs: NaN, infinities, empty windows, and zero
// attack/release must stay finite and never throw.
let envOk = true;
try {
  const probes = [
    duckLevelAt(NaN, W, SCORE_FLOOR),
    duckLevelAt(Infinity, W, SCORE_FLOOR),
    duckLevelAt(-Infinity, W, SCORE_FLOOR),
    duckLevelAt(5, [], SCORE_FLOOR),
    duckLevelAt(W[0][0], W, SCORE_FLOOR, 0, DUCK_RELEASE),
    duckLevelAt(W[0][1] + 0.1, W, SCORE_FLOOR, DUCK_ATTACK, 0),
    duckLevelAt(W[0][0], W, SCORE_FLOOR, 0, 0),
    livePeakFor([], 3, SFX_FLOOR),
  ];
  for (const v of probes) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) envOk = false;
  }
  if (dialogueWindows({ shots: [] }).length !== 0) envOk = false;
} catch { envOk = false; }
ok('hostile duck inputs stay finite in [0,1]', envOk);

// 8. corrupt screenplay rejected instead of rendering garbage.
let corruptOk = false;
try { buildTimeline({ nope: 1 }); } catch { corruptOk = true; }
ok('hostile corrupt screenplay rejected', corruptOk);

if (failures) { console.error('TESTER-PHASE4-VOICE-HOSTILE RED'); process.exit(1); }
console.log('TESTER-PHASE4-VOICE-HOSTILE GREEN');
