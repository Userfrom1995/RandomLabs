// Mythduel capture: per-beat hero-frame cards for Builder self-review.
//
// Deterministic and headless: resolves each storyboard heroTime through the
// timeline and the frame grid, then reports the exact frame index, beat
// local time, caption line, and boil slot the renderer will paint. The
// browser stage paints the same instants, so cards and canvas agree.
// Usage: node mythduel/tools/capture.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt, captionAt } from '../engine/timeline.js';
import { frameTime, frameIndex } from '../engine/frames.js';
import { boilSlot } from '../engine/ink.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function captureCards() {
  const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
  const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
  const tl = buildTimeline(duel);
  return board.panels.map((p) => {
    const t = frameTime(p.heroTime);
    const { beat, local } = beatAt(tl, t);
    const cap = captionAt(beat, local);
    return {
      beat: beat.id,
      title: p.title,
      heroTime: p.heroTime,
      frameTime: t,
      frameIndex: frameIndex(t),
      local: Math.round(local * 1000) / 1000,
      caption: cap ? cap.who + ': ' + cap.line : '(no caption)',
      boilSlot: boilSlot(t),
      seed: tl.seed,
    };
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node mythduel/tools/capture.mjs [--help]');
    console.log('Reports per-beat hero-frame cards; exits 0 green, 2 on unknown flag.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag);
    process.exit(2);
  }
  for (const c of captureCards()) {
    console.log(c.beat + ' f' + c.frameIndex + ' t=' + c.frameTime + 's local=' + c.local + 's :: ' + c.caption);
  }
}
