// Hearthlight acting engine (Rebuild Phase 2).
//
// Anticipation / action / reaction / hold beats, weight shifts, exertion,
// and secondary-motion drivers, all pure functions of (shot, progress,
// local time). Per-shot wind from the background painter feeds the cloth
// and hair lag: the caller passes windK through, this module shapes it
// into belly, drift, and bounce coefficients with a two-frame-feel delay
// (analytic lag, still scrub-exact).
//
// Beat tables are keyed by the screenplay's own shot ids. Unknown ids get
// a neutral hold so new shots never throw.
import { easeInOut, clamp01 } from './rigs.js';

export const PHASES = ['anticipation', 'action', 'reaction', 'hold'];

// Per-shot beat map: where anticipation ends and action peaks, plus base
// exertion (0 rest .. 1 storm carry) and weight travel (-1 .. 1).
const BEATS = {
  s01: { anti: 0.3, peak: 0.6, exert: 0.2, travel: 0.3 },
  s02: { anti: 0.4, peak: 0.7, exert: 0.3, travel: -0.4 },
  s03: { anti: 0.2, peak: 0.5, exert: 0, travel: 0 },
  s04: { anti: 0.35, peak: 0.65, exert: 0.4, travel: 0.5 },
  s05: { anti: 0.3, peak: 0.55, exert: 0, travel: 0 },
  s06: { anti: 0.25, peak: 0.6, exert: 0.1, travel: 0 },
  s07: { anti: 0.3, peak: 0.6, exert: 0, travel: 0 },
  s08: { anti: 0.3, peak: 0.55, exert: 0.2, travel: 0.2 },
  s09: { anti: 0.2, peak: 0.5, exert: 0.5, travel: 0.5 },
  s10: { anti: 0.3, peak: 0.6, exert: 0.3, travel: 0.2 },
  s11: { anti: 0.25, peak: 0.55, exert: 0.2, travel: 0 },
  s12: { anti: 0.2, peak: 0.55, exert: 0.9, travel: 0.6 },
  s13: { anti: 0.25, peak: 0.6, exert: 0.8, travel: 0.5 },
  s14: { anti: 0.45, peak: 0.7, exert: 0.1, travel: 0 },
  s15: { anti: 0.2, peak: 0.55, exert: 0.7, travel: 0.6 },
  s16: { anti: 0.25, peak: 0.6, exert: 1, travel: 0.5 },
  s17: { anti: 0.35, peak: 0.65, exert: 0.4, travel: 0 },
  s18: { anti: 0.2, peak: 0.5, exert: 0, travel: 0 },
  s19: { anti: 0.3, peak: 0.6, exert: 0.2, travel: 0.2 },
  s20: { anti: 0.3, peak: 0.6, exert: 0.1, travel: 0 },
};

export function beatFor(shotId) {
  return BEATS[shotId] || { anti: 0.3, peak: 0.6, exert: 0.2, travel: 0 };
}

export function phaseAt(p, beat) {
  if (p < beat.anti) return 'anticipation';
  if (p < beat.peak) return 'action';
  if (p < Math.min(1, beat.peak + 0.25)) return 'reaction';
  return 'hold';
}

// Full acting state for a shot instant. weight: lateral shift target;
// exertion: eased effort curve peaking at the action peak; secondary:
// cloth/hair lag drivers shaped from windK with analytic delay.
export function actFor(shot, p, local) {
  const id = shot ? shot.id : 'unknown';
  const beat = beatFor(id);
  const pc = clamp01(p);
  const phase = phaseAt(pc, beat);
  const rise = easeInOut(Math.min(1, pc / Math.max(0.01, beat.peak)));
  const fall = easeInOut(clamp01((pc - beat.peak) / Math.max(0.01, 1 - beat.peak)));
  const exertion = beat.exert * (0.35 + 0.65 * (rise * (1 - fall * 0.6)));
  const weight = beat.travel * Math.sin(pc * Math.PI) * (phase === 'reaction' ? -0.4 : 1);
  const lt = Number.isFinite(local) ? local : 0;
  const windK = shot && Number.isFinite(shot.windK) ? shot.windK : 0.5;
  return {
    phase,
    weight,
    exertion: clamp01(exertion),
    secondary: secondaryFor(windK, lt, exertion),
  };
}

// Secondary-motion drivers: cloth belly, shawl drift, hair/topknot lag.
// Lag is an analytic function of (local - delay): smooth in playback,
// exact on scrub, frozen under reduced motion by the caller.
// Off-contract numerics clamp to safe defaults (windK to 0.5, exertion to
// 0) so every input still yields finite drivers, like blendExpression.
export function secondaryFor(windK, local, exertion) {
  const w = Number(windK);
  const wk = Number.isFinite(w) ? w : 0.5;
  const e = Number(exertion);
  const ex = Number.isFinite(e) ? e : 0;
  const lt = Number.isFinite(local) ? Math.max(0, local) : 0;
  const lag = (d) => Math.max(0, lt - d);
  return {
    cloth: wk * (0.6 + 0.4 * Math.sin(lag(0.08) * 3.1)) + ex * 0.15,
    drift: wk * 0.5 * (0.6 + 0.4 * Math.sin(lag(0.16) * 2.2)),
    bounce: 0.5 + 0.5 * Math.sin(lag(0.1) * 5.2),
  };
}
