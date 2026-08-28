import { simulate } from './headless.js';
import { buildScene } from './scenes.js';
import { hashState } from '../core/checksum.js';

export interface StackResult {
  maxLateralDrift: number;
  settledKE: number;
  checksum: string;
  pass: boolean;
}

export function runStacking(seed = 123, steps = 600): StackResult {
  const world = buildScene('stack', seed);
  const dt = world.dt;
  for (let i = 0; i < steps; i++) world.step(dt);
  const boxW = 1.0; // 2*hw =1
  // lateral drift: bodies 1..10 (skip ground/walls) - find stack bodies: those near center initial?
  // We'll check all dynamic bodies for drift from x=0
  let maxDrift = 0;
  for (const b of world.bodies) {
    if (b.isStatic) continue;
    const d = Math.abs(b.p.x);
    if (d > maxDrift) maxDrift = d;
  }
  // settled KE: mean KE per body in last steps (approx final)
  let ke = world.kineticEnergy();
  const settledKE = ke / world.bodies.filter(b => !b.isStatic).length;
  const checksum = hashState(world.bodies);
  const pass = maxDrift < 0.5 * boxW + 0.1 && settledKE < 0.5; // fairly permissive
  return { maxLateralDrift: maxDrift, settledKE, checksum, pass };
}

export interface EnergyResult {
  initialKE: number;
  finalKE: number;
  relDrift: number;
  pass: boolean;
}

export function runEnergyFree(seed = 111, steps = 1000): EnergyResult {
  const world = buildScene('free', seed);
  const initialKE = world.kineticEnergy();
  for (let i = 0; i < steps; i++) world.step(world.dt);
  const finalKE = world.kineticEnergy();
  const relDrift = Math.abs(finalKE - initialKE) / Math.max(initialKE, 1e-9);
  const pass = relDrift < 1e-5;
  return { initialKE, finalKE, relDrift, pass };
}

export function runEnergyPendulum(seed = 456, steps = 1200): EnergyResult {
  const world = buildScene('pendulum', seed);
  // compute initial mechanical energy KE + PE (m*g*y)
  let initKE = world.kineticEnergy();
  let initPE = 0;
  for (const b of world.bodies) if (!b.isStatic) initPE += b.mass * 9.81 * b.p.y;
  const initE = initKE + initPE;
  for (let i = 0; i < steps; i++) world.step(world.dt);
  let finalKE = world.kineticEnergy();
  let finalPE = 0;
  for (const b of world.bodies) if (!b.isStatic) finalPE += b.mass * 9.81 * b.p.y;
  const finalE = finalKE + finalPE;
  const relDrift = Math.abs(finalE - initE) / Math.max(Math.abs(initE), 1);
  return { initialKE: initE, finalKE: finalE, relDrift, pass: relDrift < 0.15 };
}

export function runDeterminism(seed = 42, scene: 'stack' | 'free' | 'mixed' = 'stack', steps = 600): boolean {
  const a = simulate(seed, scene, steps).checksum;
  const b = simulate(seed, scene, steps).checksum;
  return a === b;
}

export function runPerf(seed = 789, steps = 200): { stepsPerSecond: number } {
  const world = buildScene('mixed', seed);
  const t0 = Date.now();
  for (let i = 0; i < steps; i++) world.step(world.dt);
  const elapsed = (Date.now() - t0) / 1000;
  const sps = elapsed > 0 ? steps / elapsed : Infinity;
  return { stepsPerSecond: sps };
}
