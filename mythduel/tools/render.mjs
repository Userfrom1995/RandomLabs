// Mythduel render: deterministic stills manifest (Phase 1).
//
// Lists the per-beat hero frames plus arena plates the capture loop exports.
// No pixels are painted here: the manifest is the contract the capture tool
// and the Builder self-review cards share. Usage: node mythduel/tools/render.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function stillsManifest() {
  const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
  const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
  const tl = buildTimeline(duel);
  const stills = board.panels.map((p) => {
    const beat = tl.beats.find((b) => b.id === p.beat);
    return { beat: p.beat, title: p.title, heroTime: p.heroTime, beatStart: beat.start, beatDur: beat.dur, seed: tl.seed };
  });
  return { seed: tl.seed, total: tl.total, stills };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node mythduel/tools/render.mjs [--help]');
    console.log('Prints the deterministic stills manifest; exits 0 green, 2 on unknown flag.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag);
    process.exit(2);
  }
  const m = stillsManifest();
  console.log('mythduel stills manifest: seed=' + m.seed + ' total=' + m.total + 's');
  for (const s of m.stills) console.log('  ' + s.beat + ' t=' + s.heroTime + 's :: ' + s.title);
}
