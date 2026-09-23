/**
 * Umbra M5 combat VFX model: deterministic burst descriptors, point
 * expansion, and KO slow-motion. Pure math, no DOM, unit-testable in Node.
 *
 * Event shape matches flashShake input in src/render/scene.js:
 *   { t: string, tick: number, x?: number, y?: number, side?: number }
 *
 * The render shell calls burstsFor(events, tick) once per frame, then
 * sparkPoints(burst, tick) for each live burst. slowMoFor(events, tick)
 * scales the presentation clock after a KO.
 */

import { hash01 } from './rng.js';

/** Ticks a KO burst stays alive (and the slow-mo window, see below). */
export const BURST_LIFE = 18;

/** Ticks of 0.25x slow motion after a 'ko' event. */
export const SLOWMO_TICKS = 45;

/** Hard cap on live bursts per frame (renderer uniform budget). */
export const MAX_BURSTS = 12;

/** Render points per burst kind. */
const POINTS_PER_KIND = { spark: 12, dust: 10, ring: 16 };

/** Arena clamp box for burst origins. */
const X_MIN = -1;
const X_MAX = 1;
const Y_MIN = 0;
const Y_MAX = 1.2;

/** Default contact point when an event carries no finite coords. */
const DEFAULT_X = 0;
const DEFAULT_Y = 0.6;

const KIND_CODE = { spark: 11, dust: 22, ring: 33 };

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Live burst descriptors for fight events within the last BURST_LIFE ticks.
 * Kind map: hit/parried -> spark at the contact point, block -> ring,
 * ko/round -> dust + ring. Unknown event types are ignored. Origins with
 * non-finite coords fall back to (0, 0.6); finite coords are clamped to
 * x[-1,1] y[0,1.2]. Capped at the 12 most recent bursts. Deterministic:
 * identical input yields identical output.
 * @param {Array<{t: string, tick: number, x?: number, y?: number}>} events
 * @param {number} tick current tick
 * @returns {Array<{kind: string, x: number, y: number, age: number, life: number, n: number, seed: number}>}
 */
export function burstsFor(events, tick) {
  if (!Array.isArray(events)) return [];
  const now = Number.isFinite(tick) ? Math.floor(tick) : 0;
  const out = [];
  for (const e of events) {
    if (!e || typeof e.t !== 'string' || !Number.isFinite(e.tick)) continue;
    const age = now - Math.floor(e.tick);
    if (age < 0 || age > BURST_LIFE) continue;
    let kinds = null;
    if (e.t === 'hit' || e.t === 'parried') kinds = ['spark'];
    else if (e.t === 'block') kinds = ['ring'];
    else if (e.t === 'ko' || e.t === 'round') kinds = ['dust', 'ring'];
    else continue;
    const cx = Number.isFinite(e.x) ? clamp(e.x, X_MIN, X_MAX) : DEFAULT_X;
    const cy = Number.isFinite(e.y) ? clamp(e.y, Y_MIN, Y_MAX) : DEFAULT_Y;
    for (const kind of kinds) {
      const code = KIND_CODE[kind] || 0;
      const seed =
        (Math.imul(Math.floor(e.tick), 2654435761) ^
          Math.imul(out.length + 1, 40503) ^
          code) >>>
        0;
      out.push({ kind, x: cx, y: cy, age, life: BURST_LIFE, n: POINTS_PER_KIND[kind] || 8, seed });
    }
  }
  if (out.length > MAX_BURSTS) return out.slice(out.length - MAX_BURSTS);
  return out;
}

const SPREAD = { spark: 0.34, dust: 0.26, ring: 0 };
const TAU = Math.PI * 2;

/**
 * Expand one burst into N render points {x, y, a} (a = alpha 0..1).
 * Positions radiate from the burst origin with age/life progress; alpha
 * fades linearly (1 at age 0, 0 at age >= life). Ring bursts sit on an
 * expanding circle outline; spark/dust scatter outward from the origin.
 * `now` is the render tick (accepted for shell API symmetry and folded in
 * as sub-pixel jitter salt only, so identical (burst, now) always yields
 * identical points). Uses hash01 from src/rng.js for all randomness.
 * @param {{kind: string, x: number, y: number, age: number, life: number, n: number, seed: number}} burst
 * @param {number} now render tick
 * @returns {Array<{x: number, y: number, a: number}>}
 */
export function sparkPoints(burst, now) {
  const b = burst && typeof burst === 'object' ? burst : {};
  const kind = typeof b.kind === 'string' ? b.kind : 'spark';
  const ox = Number.isFinite(b.x) ? b.x : DEFAULT_X;
  const oy = Number.isFinite(b.y) ? b.y : DEFAULT_Y;
  const life = Number.isFinite(b.life) && b.life > 0 ? b.life : BURST_LIFE;
  const age = Number.isFinite(b.age) ? Math.max(0, b.age) : 0;
  const n = Number.isFinite(b.n) ? clamp(Math.floor(b.n), 1, 32) : 8;
  const seed = Number.isFinite(b.seed) ? b.seed >>> 0 : 0;
  const nowTick = Number.isFinite(now) ? Math.floor(now) : 0;
  const p = clamp(age / life, 0, 1);
  const alpha = 1 - p;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = hash01(seed, i, 11) * TAU;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    let px;
    let py;
    if (kind === 'ring') {
      const r = 0.06 + p * 0.3;
      px = ox + ca * r;
      py = oy + sa * r * 0.6;
    } else {
      const spread = SPREAD[kind] !== undefined ? SPREAD[kind] : 0.3;
      const frac = hash01(seed, i, 23);
      const r = p * spread * (0.25 + 0.75 * frac);
      const jitter = (hash01(seed, i, nowTick) - 0.5) * 0.006 * p;
      px = ox + ca * r + jitter;
      py = oy + sa * r * 0.7 + jitter * 0.5;
      if (kind === 'dust') py += p * 0.06 * hash01(seed, i, 37);
    }
    pts.push({ x: px, y: py, a: alpha });
  }
  return pts;
}

/**
 * KO slow-motion factor: 0.25 during the SLOWMO_TICKS ticks after a 'ko'
 * event (age 0..44), else 1. Pure function of (events, tick). Only 'ko'
 * triggers slow motion; 'round' and other types do not.
 * @param {Array<{t: string, tick: number}>} events fight event log
 * @param {number} tick current tick
 * @returns {number} 0.25 or 1
 */
export function slowMoFor(events, tick) {
  if (!Array.isArray(events)) return 1;
  const now = Number.isFinite(tick) ? Math.floor(tick) : 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e || e.t !== 'ko' || !Number.isFinite(e.tick)) continue;
    const age = now - Math.floor(e.tick);
    if (age >= 0 && age < SLOWMO_TICKS) return 0.25;
  }
  return 1;
}
