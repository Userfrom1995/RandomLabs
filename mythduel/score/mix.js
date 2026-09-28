// Mythduel mix (Phase 4): places score + SFX events onto the 172 s master
// timeline, rides per-beat levels, ducks both buses under voiced lines
// (score/duck.js: words first, music second, air third), and writes a
// soft-limited mono master plus per-bus stems. WAV encoding is plain 16-bit
// PCM with a deterministic header (no timestamps, no metadata chunks).
import { beatRideAt } from './orchestra.js';
import { renderVoice, voiceSeed } from './voices.js';
import { renderSfxEvent } from './sfx.js';
import { dialogueWindows, duckLevelAt, SCORE_FLOOR, SFX_FLOOR, DUCK_VERSION } from './duck.js';

export const MIX_SAMPLE_RATE = 22050;
export const MIX_VERSION = 'mythduel-mix/1';
export const MIX_DUCK = DUCK_VERSION;

// Bus levels: the score carries the duel, the bed stays underneath.
const SCORE_BUS = 0.8;
const SFX_BUS = 0.5;

export function mixDurationSec(totalSec) {
  return Math.ceil(totalSec * MIX_SAMPLE_RATE);
}

function placeInto(master, samples, startSec, gain, duckFn) {
  const at = Math.floor(startSec * MIX_SAMPLE_RATE);
  const n = Math.min(samples.length, master.length - at);
  if (!duckFn) {
    for (let i = 0; i < n; i++) master[at + i] += samples[i] * gain;
    return;
  }
  // Voiced-line-first duck: per-sample envelope so a note that starts under
  // a line but rings past it breathes back in instead of staying buried.
  for (let i = 0; i < n; i++) {
    const t = (at + i) / MIX_SAMPLE_RATE;
    master[at + i] += samples[i] * gain * duckFn(t);
  }
}

// Render the full mix. Returns { master, stems } where stems maps bus name
// (score, sfx, drums, horns, strings, bronze, perc) to Float32Arrays.
export function renderMix(tl, scoreEvents, sfxEvents, sr = MIX_SAMPLE_RATE) {
  const N = Math.ceil(tl.total * sr);
  const master = new Float32Array(N);
  const windows = dialogueWindows(tl);
  const stems = {
    score: new Float32Array(N),
    sfx: new Float32Array(N),
    drums: new Float32Array(N),
    horns: new Float32Array(N),
    strings: new Float32Array(N),
    bronze: new Float32Array(N),
    perc: new Float32Array(N),
  };
  const STEM_OF = {
    drum: 'drums', horn: 'horns', pluck: 'strings',
    bronze: 'bronze', shaker: 'perc', deeppad: 'horns',
  };
  for (const ev of scoreEvents) {
    const samples = renderVoice(ev.voice, ev.f, ev.dur, sr, voiceSeed(ev.beat, ev.voice, ev.deg, ev.f));
    const ride = beatRideAt(tl, ev.t);
    const duck = (t) => duckLevelAt(t, windows, SCORE_FLOOR);
    placeInto(stems.score, samples, ev.t, ev.g * SCORE_BUS * ride, duck);
    const stem = stems[STEM_OF[ev.voice]];
    if (stem) placeInto(stem, samples, ev.t, ev.g * SCORE_BUS * ride, duck);
  }
  for (const ev of sfxEvents) {
    const samples = renderSfxEvent(ev, sr);
    const ride = beatRideAt(tl, ev.t);
    const duck = (t) => duckLevelAt(t, windows, SFX_FLOOR);
    placeInto(stems.sfx, samples, ev.t, ev.gain * SFX_BUS * ride, duck);
  }
  for (let i = 0; i < N; i++) {
    master[i] = stems.score[i] + stems.sfx[i];
  }
  // Soft limit + normalize to a fixed ceiling so stems sum safely and no
  // sample clips. tanh keeps the deterministic shape; the ceiling is exact.
  let peak = 0;
  for (let i = 0; i < N; i++) {
    master[i] = Math.tanh(master[i]);
    const a = Math.abs(master[i]);
    if (a > peak) peak = a;
  }
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < N; i++) master[i] *= norm;
  for (const key of Object.keys(stems)) {
    const s = stems[key];
    for (let i = 0; i < N; i++) s[i] = Math.tanh(s[i]) * norm;
  }
  return { master, stems, peak: 0.89, norm };
}

export function analyze(samples) {
  let peak = 0;
  let sum = 0;
  let bad = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (!Number.isFinite(v)) { bad++; continue; }
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, samples.length)), bad };
}

// Minimal deterministic WAV writer: 44-byte header + int16 PCM.
export function encodeWav(samples, sr = MIX_SAMPLE_RATE) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}
