// Hearthlight synth voices (Phase 4): offline, sample-accurate, fully
// deterministic. Each renderer takes (freq, durSec, sampleRate, rng) and
// returns a Float32Array of mono samples in [-1, 1]. Vibrato LFO phase and
// breath noise both derive from the per-event rng, never from wall-clock or
// playhead state, so renders are byte-reproducible and scrub-exact.
//
// These are original synthesized timbres (stacked sines/saws, inharmonic
// bells, membrane percussion); no samples, no quoted material.
import { mulberry32, hashSeed } from '../engine/rng.js';

export const VOICE_NAMES = ['woodwind', 'strings', 'bass', 'brass', 'bells', 'pad', 'timpani', 'shaker'];

function adsr(n, sr, dur, a, d, s, r) {
  const N = Math.floor(dur * sr);
  const env = new Float32Array(N);
  const aN = Math.max(1, Math.floor(a * sr));
  const dN = Math.max(1, Math.floor(d * sr));
  const rN = Math.max(1, Math.floor(r * sr));
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    let v;
    if (i < aN) v = i / aN;
    else if (i < aN + dN) v = 1 - (1 - s) * ((i - aN) / dN);
    else if (i < N - rN) v = s;
    else v = s * Math.max(0, 1 - (i - (N - rN)) / rN);
    void t;
    env[i] = v;
  }
  return env;
}

// Deterministic vibrato: depth in fractional frequency, delayed onset.
function vibrato(i, sr, rngPhase, rate, depth, delaySec) {
  const t = i / sr;
  if (t < delaySec) return 1;
  const ramp = Math.min(1, (t - delaySec) / 0.25);
  return 1 + depth * ramp * Math.sin(2 * Math.PI * rate * t + rngPhase);
}

function sawPhase(phase) {
  const p = phase % 1;
  return 2 * p - 1;
}

const SCORE_RNG_TAG = '20260927';

function renderHarmonic(freq, dur, sr, rng, partials, env, vibRate, vibDepth) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const phase = rng() * Math.PI * 2;
  const phases = partials.map(() => rng() * Math.PI * 2);
  for (let i = 0; i < N; i++) {
    const mult = vibrato(i, sr, phase, vibRate, vibDepth, 0.15);
    const t = i / sr;
    let v = 0;
    for (let p = 0; p < partials.length; p++) {
      const [ratio, amp] = partials[p];
      v += amp * Math.sin(2 * Math.PI * freq * ratio * mult * t + phases[p]);
    }
    out[i] = v * env[i];
  }
  return out;
}

function renderSawStack(freq, dur, sr, rng, detuneCents, env, vibRate, vibDepth, bright) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const phase = rng() * Math.PI * 2;
  const detunes = detuneCents.map((c) => Math.pow(2, c / 1200));
  // Fixed per-stack phase offsets (golden-ratio multiples): deterministic
  // without consuming the event rng, so isolated and sequence renders agree.
  const offsets = detunes.map((_, k) => (k + 1) * 0.618033988749 * 2);
  let lp = 0;
  const alpha = Math.min(0.99, Math.max(0.01, bright));
  for (let i = 0; i < N; i++) {
    const mult = vibrato(i, sr, phase, vibRate, vibDepth, 0.12);
    const t = i / sr;
    let v = 0;
    for (let s = 0; s < detunes.length; s++) {
      const ph = freq * detunes[s] * mult * t + offsets[s];
      v += sawPhase(ph);
    }
    v /= detunes.length;
    lp += alpha * (v - lp);
    out[i] = (lp * 0.7 + v * 0.3) * env[i];
  }
  return out;
}

export function renderWoodwind(freq, dur, sr, rng) {
  const env = adsr(0, sr, dur, 0.06, 0.08, 0.85, Math.min(0.15, dur * 0.3));
  const tone = renderHarmonic(freq, dur, sr, rng,
    [[1, 0.8], [2, 0.28], [3, 0.12]], env, 5.2, 0.004);
  // Breath: faint seeded noise under the tone.
  const N = tone.length;
  let bp = 0;
  for (let i = 0; i < N; i++) {
    const w = rng() * 2 - 1;
    bp += 0.12 * (w - bp);
    tone[i] = tone[i] * 0.92 + bp * 0.08 * env[i];
  }
  return tone;
}

export function renderStrings(freq, dur, sr, rng) {
  const env = adsr(0, sr, dur, 0.09, 0.12, 0.8, Math.min(0.25, dur * 0.3));
  return renderSawStack(freq, dur, sr, rng, [-5, 0, 5], env, 5.6, 0.005, 0.25);
}

export function renderBass(freq, dur, sr, rng) {
  const env = adsr(0, sr, dur, 0.05, 0.1, 0.9, Math.min(0.2, dur * 0.3));
  return renderSawStack(freq / 2, dur, sr, rng, [-3, 3], env, 4.8, 0.003, 0.12);
}

export function renderBrass(freq, dur, sr, rng) {
  const env = adsr(0, sr, dur, 0.04, 0.06, 0.85, Math.min(0.18, dur * 0.3));
  return renderSawStack(freq, dur, sr, rng, [-4, 4], env, 5.0, 0.003, 0.6);
}

export function renderBells(freq, dur, sr, rng) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const partials = [[1, 0.7, 3.2], [2.76, 0.25, 2.1], [5.4, 0.14, 1.4], [8.9, 0.08, 0.9]];
  const phases = partials.map(() => rng() * Math.PI * 2);
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    let v = 0;
    for (let p = 0; p < partials.length; p++) {
      const [ratio, amp, decay] = partials[p];
      v += amp * Math.exp(-t * decay) * Math.sin(2 * Math.PI * freq * ratio * t + phases[p]);
    }
    out[i] = v;
  }
  return out;
}

export function renderPad(freq, dur, sr, rng) {
  const env = adsr(0, sr, dur, Math.min(0.8, dur * 0.3), 0.4, 0.7, Math.min(0.8, dur * 0.3));
  return renderHarmonic(freq / 2, dur, sr, rng,
    [[1, 0.5], [1.5, 0.2], [2, 0.25], [3, 0.1]], env, 4.2, 0.006);
}

export function renderTimpani(freq, dur, sr, rng) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const f0 = Math.max(45, Math.min(120, freq / 2));
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const glide = 1 + 0.35 * Math.exp(-t * 9);
    const v = Math.sin(2 * Math.PI * f0 * glide * t + ph) * Math.exp(-t * 3.2);
    const click = (rng() * 2 - 1) * Math.exp(-t * 60) * 0.4;
    out[i] = v * 0.9 + click;
  }
  return out;
}

export function renderShaker(freq, dur, sr, rng) {
  void freq;
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const env = adsr(0, sr, dur, 0.005, 0.03, 0.5, Math.min(0.06, dur * 0.4));
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < N; i++) {
    const w = rng() * 2 - 1;
    hp = 0.85 * (hp + w - prev);
    prev = w;
    out[i] = hp * 0.5 * env[i];
  }
  return out;
}

const RENDERERS = {
  woodwind: renderWoodwind,
  strings: renderStrings,
  bass: renderBass,
  brass: renderBrass,
  bells: renderBells,
  pad: renderPad,
  timpani: renderTimpani,
  shaker: renderShaker,
};

// Score-voice names (orchestra.js) to renderers. violin/cello ride the
// strings renderer: their octave lives in the event frequency already.
const SCORE_VOICE_ALIAS = { violin: 'strings', cello: 'strings' };

export function resolveVoice(scoreVoice) {
  const name = SCORE_VOICE_ALIAS[scoreVoice] || scoreVoice;
  if (!RENDERERS[name]) throw new Error('unknown voice: ' + scoreVoice);
  return name;
}

// Render one score event to samples.
export function renderVoice(scoreVoice, freq, dur, sr, seedParts) {
  const fn = RENDERERS[resolveVoice(scoreVoice)];
  const rng = mulberry32(hashSeed(seedParts));
  return fn(freq, dur, sr, rng);
}

export function voiceSeed(shot, voice, deg, freq) {
  return SCORE_RNG_TAG + '|' + shot + '|' + voice + '|' + deg + '|' + freq.toFixed(3);
}
