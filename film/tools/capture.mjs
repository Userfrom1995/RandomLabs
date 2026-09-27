// Hearthlight capture tool (Phase 2): the watch-and-iterate loop.
//
// For every shot it captures the hero frame (shot midpoint) two ways:
//   1. dist/capture/heroes.json: sha256 of the exact canvas draw-call log
//      at that instant. Re-run after a craft tweak and diff: any hash that
//      moved names the shot whose look changed.
//   2. dist/capture/stills/<shot>.svg: a deterministic review card (shot
//      id, title, act, background, cast, camera move, music cue, caption
//      lines, hero time, draw hash) for human self-review.
//
// Same inputs => byte-identical outputs (sorted keys, no timestamps).
// Outputs live under dist/ (gitignored build artifact, like render.mjs).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (s) => createHash('sha256').update(s).digest('hex');

const cliArgs = process.argv.slice(2);
if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log('Usage: node film/tools/capture.mjs [--help]');
  console.log('Captures one hero frame per shot into dist/capture/ (heroes.json + stills/*.svg).');
  console.log('Takes no flags; exits 2 on unknown flags.');
  process.exit(0);
}
const unknownCaptureFlag = cliArgs.find((a) => a.startsWith('-'));
if (unknownCaptureFlag) {
  console.error('Unknown flag: ' + unknownCaptureFlag + ' (usage: node film/tools/capture.mjs [--help])');
  process.exit(2);
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
}

function makeRecorder() {
  const log = [];
  const norm = (a) => (typeof a === 'number' ? Number(a.toFixed(6)) : String(a));
  const grad = () => ({ addColorStop: (o, c) => { log.push(['addColorStop', norm(o), String(c)]); } });
  const stored = {};
  const ctx = new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in stored) return stored[prop];
      return (...args) => {
        log.push([prop, ...args.map(norm)]);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return grad();
        return undefined;
      };
    },
    set(t, prop, v) { log.push(['set', prop, norm(v)]); stored[prop] = v; return true; },
  });
  return { ctx, log };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function reviewCard(shot, heroT, hash) {
  const pal = shot.palette;
  const capLines = (shot.captions || []).map((c, i) =>
    '<text x="40" y="' + (400 + i * 30) + '" font-size="20" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    esc(c.who) + ': ' + esc(c.line.slice(0, 90)) + '</text>').join('\n');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">\n' +
    '<rect width="960" height="540" fill="' + pal.sky + '"/>\n' +
    '<rect y="360" width="960" height="180" fill="' + pal.wash + '" opacity="0.55"/>\n' +
    '<circle cx="820" cy="110" r="54" fill="' + pal.lantern + '" opacity="0.85"/>\n' +
    '<text x="40" y="80" font-size="40" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    esc(shot.id.toUpperCase()) + ' - ' + esc(shot.title) + '</text>\n' +
    '<text x="40" y="118" font-size="20" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    'Act ' + shot.act + ' | bg ' + esc(shot.bg) + ' | cast ' + esc(shot.cast.join('+') || 'none') +
    ' | cam ' + esc(shot.camera.move) + ' | cue ' + esc(shot.music.cue) + ' ' + shot.music.tempo + 'bpm</text>\n' +
    '<text x="40" y="152" font-size="18" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    'hero t=' + heroT.toFixed(2) + 's of ' + shot.dur + 's | draw ' + hash.slice(0, 12) + '</text>\n' +
    capLines + '\n</svg>\n';
}

const sp = loadJson(join(root, 'story/screenplay.json'), 'story/screenplay.json');
const tl = buildTimeline(sp);

const out = join(root, 'dist', 'capture');
mkdirSync(join(out, 'stills'), { recursive: true });

const frames = {};
for (const s of tl.shots) {
  const heroT = s.start + s.dur / 2;
  const { ctx, log } = makeRecorder();
  renderAnimatic(ctx, tl, heroT, { width: 960, height: 540, reducedMotion: false });
  const hash = sha(JSON.stringify(log));
  frames[s.id] = { t: Number(heroT.toFixed(3)), hash };
  writeFileSync(join(out, 'stills', s.id + '.svg'), reviewCard(s, heroT, hash));
}

const heroes = { format: 'hearthlight-heroes/1', seed: sp.seed, frames };
const sorted = { format: heroes.format, seed: heroes.seed, frames: {} };
for (const k of Object.keys(frames).sort()) sorted.frames[k] = frames[k];
writeFileSync(join(out, 'heroes.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log('capture ok: ' + Object.keys(frames).length + ' hero frames in dist/capture/');
