// Mythduel synth voices (Phase 4): offline, sample-accurate, fully
// deterministic. Each renderer takes (freq, durSec, sampleRate, rng) and
// returns a Float32Array of mono samples in [-1, 1]. Vibrato LFO phase and
// breath noise both derive from the per-event rng, never from wall-clock or
// playhead state, so renders are byte-reproducible and scrub-exact.
//
// These are original synthesized timbres for the duel (frame drum, northern
// horn call, plucked gut string, struck bronze, war shaker, deep storm pad);
// no samples, no quoted material.
import { mulberry32, hashSeed } from '../engine/rng.js';

export const VOICE_NAMES = ['drum', 'horn', 'pluck', 'bronze', 'shaker', 'deeppad'];

function adsr(sr, dur, a, d, s, r) {
  const N = Math.floor(dur * sr);
  const env = new Float32Array(N);
  const aN = Math.max(1, Math.floor(a * sr));
  const dN = Math.max(1, Math.floor(d * sr));
  const rN = Math.max(1, Math.floor(r * sr));
  for (let i = 0; i < N; i++) {
    let v;
    if (i < aN) v = i / aN;
    else if (i < aN + dN) v = 1 - (1 - s) * ((i - aN) / dN);
    else if (i < N - rN) v = s;
    else v = s * Math.max(0, 1 - (i - (N - rN)) / rN);
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

const SCORE_RNG_TAG = 'mythduel-470-phase4';

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

// Frame drum: membrane tone with a pitch glide down to the struck head plus
// a short skin click. Frequency arrives an octave high (orchestra octave -1
// is applied in the event pitch); the head sounds at freq/2 here.
export function renderDrum(freq, dur, sr, rng) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const f0 = Math.max(45, Math.min(140, freq / 2));
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const glide = 1 + 0.4 * Math.exp(-t * 10);
    const v = Math.sin(2 * Math.PI * f0 * glide * t + ph) * Math.exp(-t * 3.4);
    const click = (rng() * 2 - 1) * Math.exp(-t * 70) * 0.35;
    out[i] = v * 0.95 + click;
  }
  return out;
}

// Northern horn call: broad detuned-saw stack through a dark one-pole,
// slow bloom attack.
export function renderHorn(freq, dur, sr, rng) {
  const env = adsr(sr, dur, 0.08, 0.12, 0.82, Math.min(0.3, dur * 0.3));
  return renderSawStack(freq, dur, sr, rng, [-4, 4], env, 4.6, 0.003, 0.3);
}

// Plucked gut string: fast-decay harmonic stack, bright attack, short ring.
export function renderPluck(freq, dur, sr, rng) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const phases = [0, 1, 2, 3].map(() => rng() * Math.PI * 2);
  const partials = [[1, 0.75, 5.5], [2, 0.35, 9], [3, 0.16, 14], [4.2, 0.07, 20]];
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

// Struck bronze: inharmonic long-ringing partials for the Olympian metal.
export function renderBronze(freq, dur, sr, rng) {
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const partials = [[1, 0.65, 2.6], [2.71, 0.28, 1.8], [4.95, 0.15, 1.2], [7.9, 0.08, 0.8]];
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

// War shaker: highpassed noise ticks under the weapon beats.
export function renderShaker(freq, dur, sr, rng) {
  void freq;
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const env = adsr(sr, dur, 0.005, 0.03, 0.5, Math.min(0.06, dur * 0.4));
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

// Deep storm pad: slow-attack stacked sub tones that hold the crag air.
export function renderDeeppad(freq, dur, sr, rng) {
  const env = adsr(sr, dur, Math.min(0.9, dur * 0.3), 0.4, 0.7, Math.min(0.9, dur * 0.3));
  return renderHarmonic(freq / 2, dur, sr, rng,
    [[1, 0.5], [1.5, 0.2], [2, 0.25], [3, 0.1]], env, 3.8, 0.006);
}

const RENDERERS = {
  drum: renderDrum,
  horn: renderHorn,
  pluck: renderPluck,
  bronze: renderBronze,
  shaker: renderShaker,
  deeppad: renderDeeppad,
};

export function resolveVoice(scoreVoice) {
  if (!RENDERERS[scoreVoice]) throw new Error('unknown voice: ' + scoreVoice);
  return scoreVoice;
}

// Render one score event to samples.
export function renderVoice(scoreVoice, freq, dur, sr, seedParts) {
  const fn = RENDERERS[resolveVoice(scoreVoice)];
  const rng = mulberry32(hashSeed(seedParts));
  return fn(freq, dur, sr, rng);
}

export function voiceSeed(beat, voice, deg, freq) {
  return SCORE_RNG_TAG + '|' + beat + '|' + voice + '|' + deg + '|' + freq.toFixed(3);
}
