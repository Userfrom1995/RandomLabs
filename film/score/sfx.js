// Hearthlight SFX bed (Phase 4): procedural foley, no samples.
// Maps every screenplay sfx tag to a deterministic generator event, then
// renders each event to samples offline. All randomness comes from the
// per-event seeded rng (score seed + shot + tag), so the bed is
// byte-reproducible and scrub-exact. Stylized where honest: cheers become a
// warm cairn-row swell, laughter a soft pitched blip, never a fake crowd.
import { mulberry32, hashSeed } from '../engine/rng.js';
import { frameTime } from '../engine/frames.js';
import { semitoneToFreq } from './themes.js';

export const SFX_VERSION = 'hearthlight-sfx/1';
export const SFX_SEED = '20260927';
export const SFX_SAMPLE_RATE = 22050;

export const SFX_NAMES = [
  'windBed', 'crickets', 'ping', 'flutter', 'scratch', 'rustle', 'gutter',
  'steps', 'crackle', 'knock', 'creak', 'water', 'whoom', 'cheerSwell',
  'laughBlip', 'birds', 'breath', 'chuff', 'ironClank', 'waveShimmer',
];

// Screenplay tag -> generator recipe. place is the [from, to] fraction of
// the shot the bed may occupy; count bounds the impulses/footfalls.
const TAG_MAP = {
  'evening-crickets': { gen: 'crickets', gain: 0.30, place: [0, 1] },
  'distant-lantern-tink': { gen: 'ping', gain: 0.35, place: [0.2, 0.9], f: 1568, count: 2 },
  'hill-wind': { gen: 'windBed', gain: 0.5, place: [0, 1], cutoff: 900, lfo: 0.15 },
  'ribbon-flutter': { gen: 'flutter', gain: 0.4, place: [0.1, 0.9], count: 5 },
  'charcoal-scratch': { gen: 'scratch', gain: 0.4, place: [0.1, 0.8], count: 6 },
  'paper-rustle': { gen: 'rustle', gain: 0.35, place: [0.2, 0.9], count: 3 },
  'lantern-gutter': { gen: 'gutter', gain: 0.5, place: [0.3, 0.7] },
  // s04: Nia sprints downhill shouting. Ten hard footfalls under the run;
  // the run starts before her first line and carries through it (action
  // over words), so the bed stays wide and the mix duck keeps her audible.
  'running-steps': { gen: 'steps', gain: 0.55, place: [0.15, 0.9], count: 10, hard: true },
  'fire-crackle': { gen: 'crackle', gain: 0.5, place: [0, 1] },
  'kettle-tick': { gen: 'ping', gain: 0.22, place: [0.1, 0.9], f: 2093, count: 4 },
  'lantern-latch': { gen: 'knock', gain: 0.55, place: [0.4, 0.6], f: 320, count: 2 },
  'flame-lean': { gen: 'rustle', gain: 0.3, place: [0.3, 0.9], count: 2, airy: true },
  'parchment-unroll': { gen: 'rustle', gain: 0.45, place: [0.1, 0.6], count: 2 },
  'brush-tap': { gen: 'knock', gain: 0.35, place: [0.5, 0.9], f: 180, count: 3 },
  'door-creak': { gen: 'creak', gain: 0.45, place: [0.2, 0.7] },
  'night-wind-rise': { gen: 'windBed', gain: 0.55, place: [0.3, 1], cutoff: 700, lfo: 0.1 },
  'marsh-wind': { gen: 'windBed', gain: 0.5, place: [0, 1], cutoff: 1100, lfo: 0.2 },
  'reed-rustle': { gen: 'rustle', gain: 0.4, place: [0.1, 0.9], count: 4 },
  'footsteps-mud': { gen: 'steps', gain: 0.45, place: [0.1, 0.9], count: 6 },
  'grove-silence': null,
  'heavy-breath': { gen: 'breath', gain: 0.5, place: [0.2, 0.8], count: 3 },
  'stone-settle': { gen: 'knock', gain: 0.5, place: [0.3, 0.7], f: 95, count: 2 },
  'snuffle': { gen: 'chuff', gain: 0.5, place: [0.3, 0.8], count: 2 },
  'chart-paper': { gen: 'rustle', gain: 0.35, place: [0.4, 0.8], count: 2 },
  'small-laugh': { gen: 'laughBlip', gain: 0.4, place: [0.5, 0.8], count: 3 },
  // s12 gorge ford (the crossing set-piece): the party of four wades the
  // white water while Tam shouts holds and Lumi answers. Water leads at a
  // set-piece gain; spray thickens to six gusts against the painted fall.
  'white-water': { gen: 'water', gain: 0.7, place: [0, 1] },
  'timber-groan': { gen: 'creak', gain: 0.5, place: [0.2, 0.8], low: true },
  'spray': { gen: 'rustle', gain: 0.45, place: [0, 1], count: 6, airy: true },
  // s13 the storm takes (carry set-piece): sleet and howl at full menace,
  // nine crunching boots for the staggering carry; breath-steady answers.
  'sleet': { gen: 'windBed', gain: 0.6, place: [0, 1], cutoff: 2400, lfo: 0.35 },
  'wind-howling': { gen: 'windBed', gain: 0.7, place: [0, 1], cutoff: 1400, lfo: 0.3 },
  'boots-snow': { gen: 'steps', gain: 0.55, place: [0.1, 0.9], count: 9, crunch: true },
  'gust-hit': { gen: 'windBed', gain: 0.6, place: [0.1, 0.5], cutoff: 1800, lfo: 0.5 },
  'breath-steady': { gen: 'breath', gain: 0.4, place: [0.2, 0.9], count: 4 },
  'flame-catch': { gen: 'rustle', gain: 0.45, place: [0.5, 0.9], count: 2, airy: true },
  'wind-drop': { gen: 'windBed', gain: 0.4, place: [0, 0.6], cutoff: 800, lfo: 0.12 },
  'snow-spiral': { gen: 'rustle', gain: 0.3, place: [0.2, 0.8], count: 3, airy: true },
  'deep-chuff': { gen: 'chuff', gain: 0.55, place: [0.5, 0.9], count: 2 },
  'stone-steps': { gen: 'steps', gain: 0.5, place: [0.1, 0.9], count: 8 },
  'cloak-wind': { gen: 'flutter', gain: 0.35, place: [0.2, 0.9], count: 4 },
  'brazier-iron': { gen: 'ironClank', gain: 0.45, place: [0.3, 0.8], count: 2 },
  // s17 rekindling (climax): the ignition whoom leads the whole valley
  // answering; the brazier catches under it through the back half.
  'ignition-whoom': { gen: 'whoom', gain: 0.7, place: [0.25, 0.6] },
  'brazier-catch': { gen: 'crackle', gain: 0.55, place: [0.4, 1] },
  'wind-choir': { gen: 'windBed', gain: 0.4, place: [0, 1], cutoff: 1000, lfo: 0.08 },
  'lantern-wave': { gen: 'waveShimmer', gain: 0.5, place: [0.1, 0.9] },
  // s18 the valley answers: cheers swell warmer and the dawn chorus
  // thickens to eight calls behind the narrator's homecoming beat.
  'distant-cheers': { gen: 'cheerSwell', gain: 0.45, place: [0.3, 0.9] },
  'dawn-birds': { gen: 'birds', gain: 0.45, place: [0.2, 1], count: 8 },
  'morning-wind': { gen: 'windBed', gain: 0.4, place: [0, 1], cutoff: 900, lfo: 0.12 },
  'door-open': { gen: 'creak', gain: 0.35, place: [0.2, 0.5] },
  // s19 homecoming: three keepers walk the bright path, six soft footfalls
  // under the narrator and Lumi's knot line; the door opens before them.
  'soft-steps': { gen: 'steps', gain: 0.3, place: [0.3, 0.9], count: 6 },
  'sunrise-wind': { gen: 'windBed', gain: 0.35, place: [0, 1], cutoff: 800, lfo: 0.1 },
  'paper-fresh': { gen: 'rustle', gain: 0.3, place: [0.4, 0.8], count: 2 },
  'title-hush': null,
};

export function tagRecipe(tag) {
  if (!(tag in TAG_MAP)) throw new Error('unknown sfx tag: ' + tag);
  return TAG_MAP[tag];
}

// Build the deterministic SFX event list for a timeline.
// Event: { shot, tag, gen, t, dur, gain, f, count, opts }.
export function buildSfxEvents(tl) {
  const events = [];
  for (const shot of tl.shots) {
    for (const tag of shot.sfx || []) {
      const recipe = tagRecipe(tag);
      if (!recipe) continue;
      const dur = (recipe.place[1] - recipe.place[0]) * shot.dur;
      if (dur <= 0.05) continue;
      const t = frameTime(shot.start + recipe.place[0] * shot.dur);
      events.push({
        shot: shot.id,
        tag,
        gen: recipe.gen,
        t, // frameTime output verbatim (see orchestra.js): never re-round.
        dur: Math.round(dur * 1000000) / 1000000,
        gain: recipe.gain,
        f: recipe.f || 0,
        count: recipe.count || 0,
        cutoff: recipe.cutoff || 0,
        lfo: recipe.lfo || 0,
        hard: !!recipe.hard,
        crunch: !!recipe.crunch,
        low: !!recipe.low,
        airy: !!recipe.airy,
      });
    }
  }
  events.sort((a, b) => (a.t - b.t) || (a.tag < b.tag ? -1 : 1));
  return events;
}

function sfxRng(ev) {
  return mulberry32(hashSeed(SFX_SEED + '|sfx|' + ev.shot + '|' + ev.tag));
}

function noiseBuf(rng, n) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = rng() * 2 - 1;
  return b;
}

function renderWindBed(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const cutoff = ev.cutoff || 900;
  const alpha = Math.min(0.9, Math.max(0.02, cutoff / sr));
  const lfoRate = ev.lfo || 0.15;
  const ph = rng() * Math.PI * 2;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += alpha * (w[i] - lp);
    const gust = 0.65 + 0.35 * Math.sin(2 * Math.PI * lfoRate * (i / sr) + ph);
    out[i] = lp * gust * 0.9;
  }
  return out;
}

function renderCrickets(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const pulses = 3 + Math.floor(rng() * 4);
  for (let p = 0; p < pulses; p++) {
    const at = Math.floor(rng() * N * 0.9);
    const chirps = 4 + Math.floor(rng() * 5);
    for (let c = 0; c < chirps; c++) {
      const start = at + Math.floor(c * sr * 0.055);
      const len = Math.floor(sr * 0.03);
      const f = 4100 + rng() * 500;
      for (let i = 0; i < len && start + i < N; i++) {
        out[start + i] += Math.sin(2 * Math.PI * f * (i / sr)) * Math.exp(-i / len * 4) * 0.35;
      }
    }
  }
  return out;
}

function renderPing(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count);
  const f = ev.f || 1568;
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.15 * rng()) / count * N * 0.85);
    const len = Math.min(N - at, Math.floor(sr * 0.7));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += (Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 6) +
        0.3 * Math.sin(2 * Math.PI * f * 2.71 * t + ph) * Math.exp(-t * 9)) * 0.5;
    }
  }
  return out;
}

function renderFlutter(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count);
  let bp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(sr * (0.1 + rng() * 0.15)));
    for (let i = 0; i < len; i++) {
      bp += 0.3 * (w[at + i] - bp);
      const am = Math.sin(Math.PI * i / len);
      out[at + i] += bp * am * 0.9;
    }
  }
  return out;
}

function renderScratch(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + rng() * 0.5) / count * N * 0.9);
    const len = Math.min(N - at, Math.floor(sr * (0.06 + rng() * 0.1)));
    let hp = 0;
    let prev = 0;
    for (let i = 0; i < len; i++) {
      hp = 0.7 * (hp + w[at + i] - prev);
      prev = w[at + i];
      out[at + i] += hp * 0.6;
    }
  }
  return out;
}

function renderRustle(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count || 2);
  let lp = 0;
  const alpha = ev.airy ? 0.35 : 0.12;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(N / count * 0.8));
    for (let i = 0; i < len; i++) {
      lp += alpha * (w[at + i] - lp);
      out[at + i] += lp * Math.sin(Math.PI * i / len) * 0.8;
    }
  }
  return out;
}

function renderGutter(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    lp += 0.2 * (w[i] - lp);
    const dip = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.8 * t);
    out[i] = lp * dip * 0.8;
  }
  return out;
}

function renderSteps(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 4);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.1 * rng()) / count * N * 0.92);
    const len = Math.min(N - at, Math.floor(sr * 0.16));
    const f = ev.hard ? 95 : 70;
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let v = Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 28);
      if (ev.crunch) v += (rng() * 2 - 1) * Math.exp(-t * 40) * 0.5;
      out[at + i] += v * 0.7;
    }
  }
  return out;
}

function renderCrackle(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  let lp = 0;
  const snaps = Math.floor(ev.dur * (6 + rng() * 4));
  const atSet = new Set();
  for (let s = 0; s < snaps; s++) atSet.add(Math.floor(rng() * N));
  for (let i = 0; i < N; i++) {
    lp += 0.06 * (w[i] - lp);
    out[i] = lp * 0.5;
    if (atSet.has(i)) out[i] += (rng() * 2 - 1) * 0.55;
  }
  return out;
}

function renderKnock(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 1);
  const f = ev.f || 180;
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.1 * rng()) / count * N * 0.85);
    const len = Math.min(N - at, Math.floor(sr * 0.25));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 30) * 0.7;
    }
  }
  return out;
}

function renderCreak(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const f0 = ev.low ? 90 : 220;
  const f1 = ev.low ? 60 : 330;
  const ph = rng() * Math.PI * 2;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const f = f0 + (f1 - f0) * u;
    const wob = 1 + 0.06 * Math.sin(2 * Math.PI * 7 * (i / sr));
    out[i] = Math.sin(2 * Math.PI * f * wob * (i / sr) + ph) *
      Math.sin(Math.PI * u) * 0.4;
  }
  return out;
}

function renderWater(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let bp = 0;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.5 * (w[i] - lp);
    bp += 0.25 * ((w[i] - lp) - bp);
    const surge = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.4 * (i / sr) + ph);
    out[i] = (lp * 0.4 + bp * 0.9) * surge;
  }
  return out;
}

function renderWhoom(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const ph = rng() * Math.PI * 2;
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const f = 50 + 45 * u;
    lp += 0.15 * (w[i] - lp);
    out[i] = (Math.sin(2 * Math.PI * f * (i / sr) + ph) * 0.7 + lp * 0.6) *
      Math.sin(Math.PI * Math.min(1, u * 1.05)) * 0.8;
  }
  return out;
}

function renderCheerSwell(ev, sr, rng) {
  // Stylized distant rejoicing: a warm swell on the cairn hymn row, never a
  // fake crowd sample.
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const row = [0, 2, 4, 5, 7, 9, 7, 5];
  const voices = 5;
  for (let v = 0; v < voices; v++) {
    const deg = v * 2;
    const semi = row[deg % row.length];
    const f = semitoneToFreq(261.63, semi) * (v % 2 ? 1 : 2);
    const ph = rng() * Math.PI * 2;
    const det = 1 + (rng() - 0.5) * 0.004;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      out[i] += Math.sin(2 * Math.PI * f * det * (i / sr) + ph) *
        Math.sin(Math.PI * u) * 0.09;
    }
  }
  return out;
}

function renderLaughBlip(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 2);
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const f = 660 + k * 90;
    const len = Math.min(N - at, Math.floor(sr * 0.12));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 25) * 0.5;
    }
  }
  return out;
}

function renderBirds(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 4);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + rng() * 0.6) / count * N * 0.9);
    const len = Math.min(N - at, Math.floor(sr * 0.28));
    const f0 = 2400 + rng() * 1200;
    const glide = (rng() - 0.3) * 1200;
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const u = i / len;
      const f = f0 + glide * u;
      out[at + i] += Math.sin(2 * Math.PI * f * (i / sr) + ph) *
        Math.sin(Math.PI * u) * 0.32;
    }
  }
  return out;
}

function renderBreath(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count || 3);
  let lp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(N / count * 0.85));
    for (let i = 0; i < len; i++) {
      lp += 0.1 * (w[at + i] - lp);
      out[at + i] += lp * Math.sin(Math.PI * i / len) * 0.85;
    }
  }
  return out;
}

function renderChuff(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const w = noiseBuf(rng, N);
  const count = Math.max(1, ev.count || 2);
  let lp = 0;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N);
    const len = Math.min(N - at, Math.floor(sr * 0.3));
    for (let i = 0; i < len; i++) {
      lp += 0.25 * (w[at + i] - lp);
      out[at + i] += lp * Math.exp(-i / len * 3) * 0.9;
    }
  }
  return out;
}

function renderIronClank(ev, sr, rng) {
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const count = Math.max(1, ev.count || 1);
  for (let k = 0; k < count; k++) {
    const at = Math.floor((k + 0.1 * rng()) / count * N * 0.8);
    const len = Math.min(N - at, Math.floor(sr * 0.5));
    const f = 340 + rng() * 60;
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += (Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 10) +
        0.4 * Math.sin(2 * Math.PI * f * 2.4 * t) * Math.exp(-t * 16)) * 0.45;
    }
  }
  return out;
}

function renderWaveShimmer(ev, sr, rng) {
  // The rekindling wave: rising cairn-row pings panning across the valley.
  const N = Math.floor(ev.dur * sr);
  const out = new Float32Array(N);
  const row = [0, 2, 4, 5, 7, 9, 7, 5, 7, 9, 12];
  const count = row.length;
  for (let k = 0; k < count; k++) {
    const at = Math.floor(k / count * N * 0.85);
    const f = semitoneToFreq(523.25, row[k]);
    const len = Math.min(N - at, Math.floor(sr * 0.9));
    const ph = rng() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      out[at + i] += Math.sin(2 * Math.PI * f * t + ph) * Math.exp(-t * 4) * 0.3;
    }
  }
  return out;
}

const SFX_RENDERERS = {
  windBed: renderWindBed,
  crickets: renderCrickets,
  ping: renderPing,
  flutter: renderFlutter,
  scratch: renderScratch,
  rustle: renderRustle,
  gutter: renderGutter,
  steps: renderSteps,
  crackle: renderCrackle,
  knock: renderKnock,
  creak: renderCreak,
  water: renderWater,
  whoom: renderWhoom,
  cheerSwell: renderCheerSwell,
  laughBlip: renderLaughBlip,
  birds: renderBirds,
  breath: renderBreath,
  chuff: renderChuff,
  ironClank: renderIronClank,
  waveShimmer: renderWaveShimmer,
};

// Render one SFX event to samples (mono, roughly [-1, 1]).
export function renderSfxEvent(ev, sr) {
  const fn = SFX_RENDERERS[ev.gen];
  if (!fn) throw new Error('unknown sfx generator: ' + ev.gen);
  return fn(ev, sr, sfxRng(ev));
}
