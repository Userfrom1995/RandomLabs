import { hashState } from '../core/checksum.js';
import { buildScene, type SceneName } from './scenes.js';
import type { World } from '../core/world.js';

export interface SimResult {
  checksum: string;
  world: World;
  steps: number;
}

export function simulate(seed: number, scene: SceneName | World, steps: number): SimResult {
  const world: World = typeof scene === 'string' ? buildScene(scene as SceneName, seed) : scene;
  for (let i = 0; i < steps; i++) world.step(world.dt);
  const checksum = hashState(world.bodies);
  return { checksum, world, steps };
}

// CLI entry for --checksum
if (typeof process !== 'undefined' && process.argv) {
  const args = process.argv.slice(2);
  if (args.includes('--checksum') || args.includes('--seed')) {
    const seedIdx = args.indexOf('--seed');
    const sceneIdx = args.indexOf('--scene');
    const stepsIdx = args.indexOf('--steps');
    const seed = seedIdx >= 0 ? Number(args[seedIdx + 1]) : 42;
    const scene = (sceneIdx >= 0 ? args[sceneIdx + 1] : 'stack') as SceneName;
    const steps = stepsIdx >= 0 ? Number(args[stepsIdx + 1]) : 600;
    const res = simulate(seed, scene, steps);
    console.log(res.checksum);
  }
}
