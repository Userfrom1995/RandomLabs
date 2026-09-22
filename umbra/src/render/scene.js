/**
 * Umbra shared SceneDesc: the single frame description feeding all three
 * render tiers (WebGPU, WebGL2, Canvas2D). Pure, deterministic, no DOM.
 */

import { idleAngles, solveRig } from '../poses.js';
import { arenaAt } from '../arenas.js';
import { frac, hash01 } from '../rng.js';

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
 * @param {{tick?: number, arena?: number}} opts
 * @returns {SceneDesc}
 */
export function buildSceneDesc(opts = {}) {
  const tick = Math.max(0, Math.floor(opts.tick ?? 0));
  const arena = opts.arena ?? 0;
  arenaAt(arena);
  const time = tick / 60;
  const fighters = [0, 1].map((side) => {
    const facing = side === 0 ? 1 : -1;
    const x = side === 0 ? -0.34 : 0.34;
    const phase = side === 0 ? 0 : 2.4;
    const angles = idleAngles(time, phase);
    return { segs: solveRig(angles, { x, groundY: GROUND_Y, facing }), side, facing };
  });

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
    flash: 0,
    shake: 0,
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
