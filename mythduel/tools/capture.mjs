// Mythduel capture: per-beat hero-frame cards for Builder self-review,
// plus arena plates proving the painted geography is deterministic.
//
// Deterministic and headless: resolves each storyboard heroTime through the
// timeline and the frame grid, then reports the exact frame index, beat
// local time, caption line, and boil slot the renderer will paint. The
// browser stage paints the same instants, so cards and canvas agree.
// Arena plates pin the four-pass arena per storm grade: composition values
// plus a checksum over the seeded facet tables, so the painted geography is
// reproducible without a canvas. Usage: node mythduel/tools/capture.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt, captionAt } from '../engine/timeline.js';
import { frameTime, frameIndex } from '../engine/frames.js';
import { boilSlot } from '../engine/ink.js';
import { arenaGrade, compositionFor, facetTable } from '../engine/arena.js';

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

// Arena plates: one per sampled storm grade, pinning the painted geography
// headless. The facet checksum folds every ridge table into one number, so
// any drift in the seeded geography fails the audit without needing a canvas.
export const ARENA_PLATE_BEATS = ['b01', 'b05', 'b06'];

export function facetChecksum(seed, beatId) {
  let h = 2166136261 >>> 0;
  for (const ridge of ['far', 'mid', 'near']) {
    for (const v of facetTable(seed, beatId + '|' + ridge, 30, 34)) {
      h ^= Math.floor(v * 1e6);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function capturePlates() {
  const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
  const tl = buildTimeline(duel);
  return ARENA_PLATE_BEATS.map((bid) => {
    const beat = tl.beats.find((b) => b.id === bid);
    const comp = compositionFor(bid);
    const g = arenaGrade(beat.storm);
    return {
      plate: 'arena-' + g.grade,
      beat: bid,
      heroTime: frameTime(beat.start + beat.dur / 2),
      grade: g.grade,
      storm: g.storm,
      ground: comp.ground,
      horizon: comp.horizon,
      checksum: facetChecksum(tl.seed, bid),
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
  for (const p of capturePlates()) {
    console.log(p.plate + ' ' + p.beat + ' t=' + p.heroTime + 's ground=' + p.ground + ' horizon=' + p.horizon + ' #' + p.checksum);
  }
}
