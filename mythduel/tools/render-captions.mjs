// Mythduel caption export: beat caption lines to WebVTT.
//
// Reads story/duel.json and writes mythduel/captions.vtt (committed): one
// WebVTT cue per beat caption line at absolute duel times with <v Speaker>
// voice tags. Same inputs => byte-identical bytes (sorted cues, fixed line
// endings), so the audit pins the committed file against a rebuild.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Absolute seconds -> WebVTT timestamp (MM:SS.mmm, duel is under an hour).
export function vttStamp(t) {
  if (!Number.isFinite(t)) return '00:00.000';
  const clamped = Math.max(0, t);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n, w) => String(n).padStart(w, '0');
  return pad(m, 2) + ':' + pad(s, 2) + '.' + pad(ms === 1000 ? 999 : ms, 3);
}

function vttText(line) {
  return String(line).replace(/-->/g, '->').replace(/\r?\n/g, ' ').trim();
}

export function buildVtt(tl) {
  const cues = [];
  for (const b of tl.beats) {
    for (const c of b.captions || []) {
      const start = b.start + c.t;
      const end = start + (c.dur || 4.0);
      cues.push({ start, end, who: c.who || 'NARRATOR', line: vttText(c.line || ''), beat: b.id });
    }
  }
  cues.sort((a, b) => a.start - b.start);
  let vtt = 'WEBVTT - Mythduel: Thor vs Zeus (original work)\n\n';
  for (const c of cues) {
    vtt += vttStamp(c.start) + ' --> ' + vttStamp(c.end) + '\n';
    vtt += '<v ' + c.who + '>[' + c.beat + '] ' + c.line + '\n\n';
  }
  return { vtt, cues };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node mythduel/tools/render-captions.mjs [--help]');
    console.log('Rebuilds mythduel/captions.vtt; exits 0 green, 2 on unknown flag.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag);
    process.exit(2);
  }
  const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
  const { vtt, cues } = buildVtt(buildTimeline(duel));
  writeFileSync(join(root, 'captions.vtt'), vtt);
  console.log('wrote captions.vtt (' + cues.length + ' cues)');
}
