/**
 * Umbra shared SceneDesc: the single frame description feeding all three
 * render tiers (WebGPU, WebGL2, Canvas2D). Pure, deterministic, no DOM.
 */

import { idleAngles, solveRig, combatAngles } from '../poses.js';
import { arenaAt, ARENAS } from '../arenas.js';
import { frac, hash01 } from '../rng.js';
import { MOVES } from '../combat/moves.js';

const moveLenOf = (id) => {
  const m = (id != null && MOVES[id]) || null;
  return m ? m.startup + m.active + m.recovery : 14;
};

/**
 * Hit-flash uniform from recent fight events: 1 at the hit tick,
 * linear decay over 6 ticks. Knockdown/KO adds screen shake 0..1.
 * @param {Array<{t: string, tick: number}>} events fight event log
 * @param {number} tick current tick
 * @returns {{flash: number, shake: number}}
 */
export function flashShake(events, tick) {
  let flash = 0;
  let shake = 0;
  if (!Array.isArray(events)) return { flash, shake };
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e || !Number.isFinite(e.tick)) continue;
    const age = tick - e.tick;
    if (age < 0 || age > 12) {
      if (age > 12) break;
      continue;
    }
    if (e.t === 'hit' || e.t === 'parried') {
      flash = Math.max(flash, 1 - age / 6);
    }
    if (e.t === 'ko' || e.t === 'round') {
      shake = Math.max(shake, 1 - age / 12);
    } else if (e.t === 'hit') {
      shake = Math.max(shake, 0.45 * (1 - age / 6));
    }
  }
  return { flash, shake };
}

export const PARTICLE_COUNT = 48;
export const GROUND_Y = 0.14;

/**
 * @typedef {object} RigPose
 * @property {Array<{ax:number, ay:number, bx:number, by:number, w:number, name:string}>} segs
 * @property {0|1} side
 * @property {1|-1} facing
 */

/**
 * @typedef {object} SceneDesc
 * @property {number} tick 60 Hz presentation tick
 * @property {number} time seconds (tick / 60)
 * @property {number} arena arena index
 * @property {RigPose[2]} fighters
 * @property {Array[]} weapons motion-trail polylines per fighter (empty in M1)
 * @property {number[]} layers parallax layer offsets 0..1
 * @property {Array<{x:number,y:number,s:number,b:number}>} particles ambient motes
 * @property {number} flash hit-flash uniform (0 in M1)
 * @property {number} shake screen-shake amplitude (0 in M1)
 */

/**
 * Build one deterministic frame description. Same tick + arena always yields
 * the identical SceneDesc (ambient particles are hash-indexed, not stateful).
 * When `fight` (a combat FightState) is passed, fighter placement and poses
 * come from the live sim: x/facing/y per fighter, pose from fighter state,
 * flash/shake from recent fight events. Without `fight` the M1 ambient
 * tableau renders (two idle fighters), unchanged.
 * @param {{tick?: number, arena?: number, fight?: object|null, rigs?: [{height?:number,bulk?:number,head?:number,limb?:number},{height?:number,bulk?:number,head?:number,limb?:number}]}} opts
 * @returns {SceneDesc}
 */
export function buildSceneDesc(opts = {}) {
  const rawTick = Number(opts.tick ?? 0);
  const tick = Number.isFinite(rawTick) ? Math.max(0, Math.floor(rawTick)) : 0;
  const arena = ARENAS.indexOf(arenaAt(opts.arena ?? 0));
  const time = tick / 60;
  const fight = opts.fight && typeof opts.fight === 'object' ? opts.fight : null;
  const rigs = Array.isArray(opts.rigs) ? opts.rigs : [];
  const fighters = [0, 1].map((side) => {
    const sim = fight && Array.isArray(fight.fighters) ? fight.fighters[side] : null;
    const facing = sim ? (sim.facing === -1 ? -1 : 1) : side === 0 ? 1 : -1;
    const x = sim && Number.isFinite(sim.x) ? sim.x : side === 0 ? -0.34 : 0.34;
    const groundY = GROUND_Y + (sim && Number.isFinite(sim.y) ? Math.max(0, sim.y) * 0.6 : 0);
    const phase = side === 0 ? 0 : 2.4;
    // M3 roster identity: per-side silhouette proportions (undefined rig
    // is the exact M1/M2 path, so ambient + fight goldens hold).
    const rig = rigs[side] && typeof rigs[side] === 'object' ? rigs[side] : undefined;
    const angles = sim ? combatAngles(sim, time, phase, moveLenOf) : idleAngles(time, phase);
    return { segs: solveRig(angles, { x, groundY, facing, rig }), side, facing };
  });
  const fx = fight ? flashShake(fight.events, fight.tick) : { flash: 0, shake: 0 };

  // Ambient dust motes: stateless drift, wraps via frac so the field loops.
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const drift = 0.004 + hash01(arena, i, 7) * 0.01;
    const rise = 0.001 + hash01(arena, i, 13) * 0.004;
    particles.push({
      x: frac(hash01(arena, i, 1) + time * drift * (i % 2 === 0 ? 1 : -1)),
      y: frac(0.1 + hash01(arena, i, 2) * 0.8 + time * rise),
      s: 0.004 + hash01(arena, i, 3) * 0.01,
      b: 0.25 + hash01(arena, i, 4) * 0.55,
    });
  }

  const layers = [frac(time * 0.002), frac(time * 0.005), frac(time * 0.011)];

  return {
    tick,
    time,
    arena,
    fighters,
    weapons: [[], []],
    layers,
    particles,
    flash: Math.max(0, Math.min(1, fx.flash)),
    shake: Math.max(0, Math.min(1, fx.shake)),
  };
}

/**
 * Flatten both fighters' segments into a fixed 22-entry array for GPU
 * uniform upload (11 segments x 2 fighters, order: fighter 0 then 1).
 * @param {SceneDesc} scene
 * @returns {Array<{ax:number, ay:number, bx:number, by:number, w:number}>}
 */
export function flattenSegments(scene) {
  const out = [];
  for (const f of scene.fighters) {
    for (const s of f.segs) out.push({ ax: s.ax, ay: s.ay, bx: s.bx, by: s.by, w: s.w });
  }
  while (out.length < 22) out.push({ ax: 0, ay: -1, bx: 0, by: -1, w: 0 });
  return out.slice(0, 22);
}
