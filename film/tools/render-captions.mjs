// Hearthlight caption export (Phase 5): the full subtitle pass.
//
// Reads story/screenplay.json and writes film/captions.vtt (committed):
// one WebVTT cue per screenplay caption line, at absolute film times, with
// <v Speaker> voice tags. Same inputs => byte-identical bytes (sorted cues,
// fixed line endings, no timestamps), so the audit can pin the committed
// file against a rebuild exactly like the score stems.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Absolute seconds -> WebVTT timestamp (MM:SS.mmm, film is under an hour).
export function vttStamp(t) {
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
  for (const shot of tl.shots) {
    for (const c of shot.captions || []) {
      const dur = c.dur || 4.5;
      const start = shot.start + c.t;
      const end = Math.min(start + dur, shot.end);
      cues.push({
        start,
        end,
        who: c.who,
        line: c.line,
        text: '<v ' + c.who + '>' + vttText(c.line) + '</v>\n' +
          '<i>' + shot.id.toUpperCase() + ' - ' + shot.title + '</i>',
      });
    }
  }
  cues.sort((a, b) => a.start - b.start);
  let out = 'WEBVTT - Hearthlight captions (generated from story/screenplay.json)\n\n';
  for (const q of cues) {
    out += vttStamp(q.start) + ' --> ' + vttStamp(q.end) + '\n' + q.text + '\n\n';
  }
  return { vtt: out, cues };
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
}

// CLI entry: importing this module (for buildVtt/vttStamp in tests) must
// never write files or parse argv, so the main body runs only when the
// module itself is executed.
if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node film/tools/render-captions.mjs [--help]');
    console.log('Exports committed film/captions.vtt from story/screenplay.json.');
    console.log('Takes no flags; exits 2 on unknown flags.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-'));
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag + ' (usage: node film/tools/render-captions.mjs [--help])');
    process.exit(2);
  }
  const sp = loadJson(join(root, 'story/screenplay.json'), 'story/screenplay.json');
  const tl = buildTimeline(sp);
  const { cues } = buildVtt(tl);
  writeFileSync(join(root, 'captions.vtt'), buildVtt(tl).vtt);
  console.log('captions ok: ' + cues.length + ' cues in film/captions.vtt');
}
