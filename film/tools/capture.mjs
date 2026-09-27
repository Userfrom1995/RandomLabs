// Hearthlight capture tool (Phase 3): the watch-and-iterate loop.
//
// For every shot it captures the hero frame (shot midpoint) two ways:
//   1. dist/capture/heroes.json: sha256 of the exact canvas draw-call log
//      at that instant. Re-run after a craft tweak and diff: any hash that
//      moved names the shot whose look changed.
//   2. dist/capture/stills/<shot>.svg: a deterministic review card (shot
//      id, title, act, background, cast, camera move, music cue, caption
//      lines, hero time, draw hash) for human self-review.
//
// Plus face close-up cards per lead per bible emotion (faces.json) and
// background plates per painted location (plates.json +
// stills/plate-<bg>.svg): the pure background paint at 960 px hashed with
// op counts, re-rendered at 390 px to pin honest density scaling.
//
// Same inputs => byte-identical outputs (sorted keys, no timestamps).
// Outputs live under dist/ (gitignored build artifact, like render.mjs).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameIndex } from '../engine/frames.js';
import { renderAnimatic } from '../engine/animatic.js';
import { drawFace, FACE_CARDS, expressionFor, mouthShapeFor } from '../engine/faces.js';
import { modelFor } from '../engine/humans.js';
import { paintBackground, PAINTED_BACKGROUNDS, compositionFor, detailCountFor } from '../engine/backgrounds.js';

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

function reviewCard(shot, heroT, hash, frame) {
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
    'hero t=' + heroT.toFixed(2) + 's (frame ' + frame + ') of ' + shot.dur + 's | draw ' + hash.slice(0, 12) + '</text>\n' +
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
  frames[s.id] = { t: Number(heroT.toFixed(3)), frame: frameIndex(heroT), hash };
  writeFileSync(join(out, 'stills', s.id + '.svg'), reviewCard(s, heroT, hash, frameIndex(heroT)));
}

const heroes = { format: 'hearthlight-heroes/1', seed: sp.seed, frames };
const sorted = { format: heroes.format, seed: heroes.seed, frames: {} };
for (const k of Object.keys(frames).sort()) sorted.frames[k] = frames[k];
writeFileSync(join(out, 'heroes.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log('capture ok: ' + Object.keys(frames).length + ' hero frames in dist/capture/');

// Face close-up cards: one per lead per bible emotion. Each card hashes
// the exact face-engine draw log at a fixed head radius, so an expression
// regression names its (lead, emotion) pair. SVG review cards carry the
// expression parameters for human self-review.
function faceCard(name, emotion) {
  const model = modelFor(name);
  const exp = expressionFor(emotion);
  const mouth = mouthShapeFor('A');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">\n' +
    '<rect width="480" height="480" fill="#1a1410"/>\n' +
    '<circle cx="240" cy="230" r="120" fill="' + model.skin + '"/>\n' +
    '<text x="40" y="60" font-size="34" font-family="Georgia,serif" fill="#f2e8d5">' +
    esc(name.toUpperCase()) + ' - ' + esc(emotion) + '</text>\n' +
    '<text x="40" y="420" font-size="18" font-family="Georgia,serif" fill="#f2e8d5">' +
    'brow ' + exp.brow.toFixed(2) + ' pinch ' + exp.pinch.toFixed(2) + ' lid ' + exp.lid.toFixed(2) +
    ' mouth A open ' + mouth.open.toFixed(2) + '</text>\n</svg>\n';
}

const faceFrames = {};
for (const name of Object.keys(FACE_CARDS).sort()) {
  const model = modelFor(name);
  for (const emotion of FACE_CARDS[name]) {
    const { ctx, log } = makeRecorder();
    drawFace(ctx, {
      cx: 240, cy: 230, r: 120, skin: model.skin, hair: model.hair, eye: model.eye,
      hairStyle: model.hairStyle, emotion, phoneme: 'A',
      gaze: expressionFor(emotion).gaze, blink: 1,
      boil: { x: 0, y: 0 }, inkW: 2, windK: 0.5, still: 1,
    });
    const hash = sha(JSON.stringify(log));
    faceFrames[name + '|' + emotion] = { hash };
    writeFileSync(join(out, 'stills', 'face-' + name + '-' + emotion + '.svg'), faceCard(name, emotion));
  }
}
const faces = { format: 'hearthlight-faces/1', seed: sp.seed, frames: faceFrames };
const facesSorted = { format: faces.format, seed: faces.seed, frames: {} };
for (const k of Object.keys(faceFrames).sort()) facesSorted.frames[k] = faceFrames[k];
writeFileSync(join(out, 'faces.json'), JSON.stringify(facesSorted, null, 1) + '\n');
console.log('capture ok: ' + Object.keys(faceFrames).length + ' face cards in dist/capture/');

// Background plates: one per painted location, from the first shot that
// stages it. The pure paint (no cast, no weather, dead-still boil) is
// hashed at 960 px with stroke/gradient counts, then re-rendered at 390 px
// to pin the honest density scale-down. SVG review cards carry the
// composition sketch values for human self-review.
function plateCard(bg, shot, hash, strokes, strokes390) {
  const comp = compositionFor(bg);
  const pal = shot.palette;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">\n' +
    '<rect width="960" height="540" fill="' + pal.sky + '"/>\n' +
    '<rect y="360" width="960" height="180" fill="' + pal.wash + '" opacity="0.55"/>\n' +
    '<text x="40" y="80" font-size="40" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    'PLATE - ' + esc(bg) + '</text>\n' +
    '<text x="40" y="118" font-size="20" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    'from ' + esc(shot.id) + ' | horizon ' + comp.horizon + ' | focal ' + comp.focal +
    ' | light ' + comp.light + ' | atmo ' + esc(comp.atmo) + '</text>\n' +
    '<text x="40" y="152" font-size="18" font-family="Georgia,serif" fill="' + pal.ink + '">' +
    'draw ' + hash.slice(0, 12) + ' | strokes 960/390: ' + strokes + '/' + strokes390 +
    ' | detail budget 960/390: ' + detailCountFor(bg, 960) + '/' + detailCountFor(bg, 390) + '</text>\n</svg>\n';
}

const plateFrames = {};
for (const bg of PAINTED_BACKGROUNDS) {
  const shot = tl.shots.find((s) => s.bg === bg);
  if (!shot) { console.error('no shot stages background ' + bg); process.exit(1); }
  const heroT = shot.start + shot.dur / 2;
  const p = 0.5;
  const paint = (W) => {
    const { ctx, log } = makeRecorder();
    paintBackground(ctx, String(tl.seed), shot, W, Math.round(W * 9 / 16), heroT, p, { x: 0, y: 0 });
    return log;
  };
  const log960 = paint(960);
  const log390 = paint(390);
  const hash = sha(JSON.stringify(log960));
  const strokes = log960.filter((e) => e[0] === 'stroke').length;
  const gradients = log960.filter((e) => e[0] === 'createRadialGradient' || e[0] === 'createLinearGradient').length;
  const strokes390 = log390.filter((e) => e[0] === 'stroke').length;
  plateFrames[bg] = { shot: shot.id, t: Number(heroT.toFixed(3)), hash, strokes, gradients, strokes390 };
  writeFileSync(join(out, 'stills', 'plate-' + bg + '.svg'), plateCard(bg, shot, hash, strokes, strokes390));
}
const plates = { format: 'hearthlight-plates/1', seed: sp.seed, plates: {} };
for (const k of Object.keys(plateFrames).sort()) plates.plates[k] = plateFrames[k];
writeFileSync(join(out, 'plates.json'), JSON.stringify(plates, null, 1) + '\n');
console.log('capture ok: ' + Object.keys(plateFrames).length + ' background plates in dist/capture/');
