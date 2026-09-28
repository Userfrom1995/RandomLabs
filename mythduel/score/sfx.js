// Mythduel SFX bed (Phase 4): procedural foley, no samples.
// Maps every duel.json sfx tag to a deterministic generator event, then
// renders each event to samples offline. All randomness comes from the
// per-event seeded rng (score seed + beat + tag + occurrence index), so the
// byte-reproducible and scrub-exact. Stylized where honest: the skyburst is
// layered weather, never a quoted thunder sample; the b07 held beat keeps
// its scripted hush (silence-hold maps to null, honestly empty).
import { mulberry32, hashSeed } from '../engine/rng.js';
import { frameTime } from '../engine/frames.js';

export const SFX_VERSION = 'mythduel-sfx/2';
export const SFX_SEED = 'mythduel-470-phase4';

export const SFX_NAMES = [
  'surfWash', 'clothFlutter', 'gravelSteps', 'haftSwing', 'shaftBlock',
  'sparkSpray', 'throwWhoosh', 'skyCrack', 'catchThud', 'bodyBlow',
  'skidFall', 'exhaleHit', 'rainWall', 'rockfall', 'shieldBrace',
  'windRelease', 'distantThunder', 'quietWash',
];

// Duel tag -> generator recipe. place is the [from, to] fraction of the
// beat the bed may occupy; count bounds the impulses/footfalls.
const TAG_MAP = {
  'surf-bed': { gen: 'surfWash', gain: 0.45, place: [0, 1] },
  'cloak-gust': { gen: 'clothFlutter', gain: 0.35, place: [0.1, 0.9], count: 4 },
  'footfall-gravel': { gen: 'gravelSteps', gain: 0.5, place: [0.1, 0.9], count: 6 },
  'swing-haft': { gen: 'haftSwing', gain: 0.5, place: [0.2, 0.7] },
  'impact-shaft-block': { gen: 'shaftBlock', gain: 0.6, place: [0.4, 0.6] },
  'spark-spray': { gen: 'sparkSpray', gain: 0.4, place: [0.45, 0.65] },
  'throw-whoosh': { gen: 'throwWhoosh', gain: 0.5, place: [0.1, 0.5], count: 2 },
  'sky-crack': { gen: 'skyCrack', gain: 0.7, place: [0.45, 0.75] },
  'catch-thud': { gen: 'catchThud', gain: 0.5, place: [0.7, 0.9], count: 2 },
  'impact-body': { gen: 'bodyBlow', gain: 0.65, place: [0.4, 0.6] },
  'knockdown-skid': { gen: 'skidFall', gain: 0.5, place: [0.6, 0.9] },
  'exhale-hit': { gen: 'exhaleHit', gain: 0.45, place: [0.5, 0.8], count: 2 },
  'rain-wall': { gen: 'rainWall', gain: 0.55, place: [0, 1] },
  'rockfall': { gen: 'rockfall', gain: 0.55, place: [0.2, 0.8], count: 5 },
  'shield-brace': { gen: 'shieldBrace', gain: 0.5, place: [0.3, 0.6] },
  'wind-release': { gen: 'windRelease', gain: 0.5, place: [0, 0.8] },
  'distant-thunder': { gen: 'distantThunder', gain: 0.4, place: [0.4, 1] },
  'quiet-wash': { gen: 'quietWash', gain: 0.3, place: [0, 1] },
  // b07: the withheld blow lands in scripted hush; the bed stays out.
  'silence-hold': null,
};

export function tagRecipe(tag) {
  if (!(tag in TAG_MAP)) throw new Error('unknown sfx tag: ' + tag);
  return TAG_MAP[tag];
}

// Build the deterministic SFX event list for a timeline.
// Event: { beat, tag, gen, t, dur, gain, count, n } where n is the
// zero-based occurrence index of this (beat, tag) pair. Duel beats repeat
// tags within a beat (b02 footfall-gravel x2, b04 throw-whoosh x2 and
// catch-thud x2, b05 impact-body x2); without n the two events would share
// one RNG seed and render identical noise summed coherently (+6 dB).
// count carries the generator recipe (impulses/footfalls per event).
export function buildSfxEvents(tl) {
  const events = [];
  const seen = new Map();
  for (const beat of tl.beats) {
    for (const tag of beat.sfx || []) {
      const recipe = tagRecipe(tag);
      if (!recipe) continue;
      const dur = (recipe.place[1] - recipe.place[0]) * beat.dur;
      if (dur <= 0.05) continue;
      const t = frameTime(beat.start + recipe.place[0] * beat.dur);
      const key = beat.id + '|' + tag;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      events.push({
        beat: beat.id,
        tag,
        gen: recipe.gen,
        t, // frameTime output verbatim (see orchestra.js): never re-round.
        dur: Math.round(dur * 1000000) / 1000000,
        gain: recipe.gain,
        count: recipe.count || 0,
        n,
      });
    }
  }
  events.sort((a, b) => (a.t - b.t) || (a.tag < b.tag ? -1 : 1) || (a.n - b.n));
  return events;
}

function sfxRng(ev) {
  return mulberry32(hashSeed(SFX_SEED + '|sfx|' + ev.beat + '|' + ev.tag + '|' + (ev.n || 0)));
}

function noiseBuf(rng, n) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = rng() * 2 - 1;
  return b;
}

function renderSurfWash(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.4 * (w[i] - lp);
    const surge = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.25 * (i / sr) + ph);
    out[i] = lp * surge * 0.8;
  }
  return out;
}

function renderClothFlutter(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count);
  let bp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(sr * (0.15 + rng() * 0.2)));
    for (let i = 0; i < len; i++) {
      bp += 0.3 * (w[at + i] - bp);
      out[at + i] += bp * Math.sin(Math.PI * i / len) * 0.9;
    }
  }
  return out;
}

function renderGravelSteps(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 4);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.1 * rng()) / count * N * 0.92);
    const len = Math.min(N - at, Math.floor(sr * 0.14));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = Math.sin(2 * Math.PI * 82 * t + ph) * Math.exp(-t * 30);
      v += (rng() * 2 - 1) * Math.exp(-t * 55) * 0.5;
      out[at + i] += v * 0.65;
    }
  }
  return out;
}

function renderHaftSwing(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let bp = 0;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    bp += 0.2 * (w[i] - bp);
    out[i] = bp * Math.sin(Math.PI * u) * 1.1;
  }
  return out;
}

function renderShaftBlock(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const f = 355 + rng() * 40;
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    out[i] = (Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 22) +
      0.4 * Math.sin(2 * Math.PI * f * 2.43 * t) * Math.exp(-t * 34)) * 0.6;
  }
  return out;
}

function renderSparkSpray(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < N; i++) {
    hp = 0.75 * (hp + w[i] - prev);
    prev = w[i];
    out[i] = hp * Math.exp(-i / N * 2.5) * 0.7;
  }
  return out;
}

function renderThrowWhoosh(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count || 1);
  let lp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(N / count * 0.9));
    for (let i = 0; i < len; i++) {
      lp += 0.18 * (w[at + i] - lp);
      out[at + i] += lp * Math.sin(Math.PI * i / len) * 1.0;
    }
  }
  return out;
}

function renderSkyCrack(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const f = 55 + 40 * u;
    lp += 0.12 * (w[i] - lp);
    out[i] = (Math.sin(2 * Math.PI * f * (i / sr) + ph) * 0.7 + lp * 0.7) *
      Math.exp(-u * 3.2) * 0.95;
  }
  return out;
}

function renderCatchThud(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 1);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.1 * rng()) / count * N * 0.85);
    const len = Math.min(N - at, Math.floor(sr * 0.2));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += Math.sin(2 * Math.PI * 110 * t + ph) * Math.exp(-t * 32) * 0.7;
    }
  }
  return out;
}

function renderBodyBlow(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const v = Math.sin(2 * Math.PI * 68 * t + ph) * Math.exp(-t * 20);
    const thump = (rng() * 2 - 1) * Math.exp(-t * 90) * 0.3;
    out[i] = v * 0.85 + thump;
  }
  return out;
}

function renderSkidFall(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let bp = 0;
  for (let i = 0; i < N; i++) {
    bp += 0.22 * (w[i] - bp);
    out[i] = bp * Math.exp(-i / N * 2) * 0.9;
  }
  return out;
}

function renderExhaleHit(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count || 2);
  let lp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(N / count * 0.8));
    for (let i = 0; i < len; i++) {
      lp += 0.12 * (w[at + i] - lp);
      out[at + i] += lp * Math.sin(Math.PI * i / len) * 0.9;
    }
  }
  return out;
}

function renderRainWall(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < N; i++) {
    hp = 0.5 * (hp + w[i] - prev);
    prev = w[i];
    const gust = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.3 * (i / sr) + ph);
    out[i] = hp * gust * 0.75;
  }
  return out;
}

function renderRockfall(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 3);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + rng() * 0.5) / count * N * 0.9);
    const len = Math.min(N - at, Math.floor(sr * (0.2 + rng() * 0.3)));
    const f = 70 + rng() * 50;
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 12) * 0.5;
    }
  }
  return out;
}

function renderShieldBrace(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const f = 240 + rng() * 30;
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    out[i] = (Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 18) +
      0.35 * Math.sin(2 * Math.PI * f * 1.5 * t) * Math.exp(-t * 26)) * 0.55;
  }
  return out;
}

function renderWindRelease(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    lp += 0.08 * (w[i] - lp);
    out[i] = lp * (1 - u * 0.7) * 0.9;
  }
  return out;
}

function renderDistantThunder(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    lp += 0.05 * (w[i] - lp);
    out[i] = (lp * 0.8 + 0.2 * Math.sin(2 * Math.PI * 48 * (i / sr) + ph)) *
      Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.7;
  }
  return out;
}

function renderQuietWash(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.25 * (w[i] - lp);
    out[i] = lp * 0.5;
  }
  return out;
}

const SFX_RENDERERS = {
  surfWash: renderSurfWash,
  clothFlutter: renderClothFlutter,
  gravelSteps: renderGravelSteps,
  haftSwing: renderHaftSwing,
  shaftBlock: renderShaftBlock,
  sparkSpray: renderSparkSpray,
  throwWhoosh: renderThrowWhoosh,
  skyCrack: renderSkyCrack,
  catchThud: renderCatchThud,
  bodyBlow: renderBodyBlow,
  skidFall: renderSkidFall,
  exhaleHit: renderExhaleHit,
  rainWall: renderRainWall,
  rockfall: renderRockfall,
  shieldBrace: renderShieldBrace,
  windRelease: renderWindRelease,
  distantThunder: renderDistantThunder,
  quietWash: renderQuietWash,
};

// Render one SFX event to samples (mono, roughly [-1, 1]).
export function renderSfxEvent(ev, sr) {
  const fn = SFX_RENDERERS[ev.gen];
  if (!fn) throw new Error('unknown sfx generator: ' + ev.gen);
  return fn(ev, sr, sfxRng(ev));
}
