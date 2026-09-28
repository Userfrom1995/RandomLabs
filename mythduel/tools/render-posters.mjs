// Mythduel poster renderer: deterministic original key art.
//
// Paints three committed SVG posters from in-repo sources only (the duel
// seed plus the storyboard palettes): the duel key art, a Thor character
// sheet poster, and a Zeus character sheet poster. Every fleck, rain slant,
// and fork vertex comes from the seeded RNG, so rebuilding writes
// byte-identical files. Usage: node mythduel/tools/render-posters.mjs
// (writes designs/posters/*.svg) or --check (rebuilds in memory and diffs).
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { substream } from '../engine/rng.js';
import { buildTimeline } from '../engine/timeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' missing or corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Seeded scatter: n points in [0,w]x[0,h] from one substream draw each.
function scatter(seed, tag, n, w, h) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const rx = substream(seed, tag + '|x|' + i, 4)();
    const ry = substream(seed, tag + '|y|' + i, 4)();
    pts.push([Math.floor(rx * w * 100) / 100, Math.floor(ry * h * 100) / 100]);
  }
  return pts;
}

// The skyburst fork: a jagged polyline from the cloud band to the crown.
function forkPath(seed, w, crownX, crownY) {
  const rnd = (tag) => substream(seed, 'poster|fork|' + tag, 6)();
  let d = 'M ' + (w / 2 + (rnd('lean') - 0.5) * 120).toFixed(1) + ' 150';
  let x = w / 2;
  let y = 150;
  for (let i = 0; i < 6; i++) {
    x += (rnd('jx' + i) - 0.5) * 130;
    y += (crownY - 150) / 6 + (rnd('jy' + i) - 0.5) * 30;
    d += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  d += ' L ' + crownX.toFixed(1) + ' ' + crownY.toFixed(1);
  return d;
}

// Original fighter mark: a hooded storm-figure with its weapon line.
// Thor carries the haft-hammer across the shoulder; Zeus raises the thin
// shaft-bolt. Geometric and iconic, drawn for the poster, not traced.
function fighterMark(who, cx, baseY, s, fill, ink) {
  const head = '<circle cx="' + cx + '" cy="' + (baseY - 86 * s) + '" r="' + (11 * s) + '" fill="' + fill + '" stroke="' + ink + '" stroke-width="' + (3 * s) + '"/>';
  const cloak = '<path d="M ' + (cx - 20 * s) + ' ' + (baseY - 74 * s) +
    ' L ' + (cx - 26 * s) + ' ' + baseY +
    ' L ' + (cx + 26 * s) + ' ' + baseY +
    ' L ' + (cx + 20 * s) + ' ' + (baseY - 74 * s) + ' Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="' + (3 * s) + '"/>';
  const beard = who === 'thor'
    ? '<path d="M ' + (cx - 8 * s) + ' ' + (baseY - 78 * s) + ' L ' + cx + ' ' + (baseY - 58 * s) + ' L ' + (cx + 8 * s) + ' ' + (baseY - 78 * s) + ' Z" fill="' + ink + '"/>'
    : '';
  const weapon = who === 'thor'
    ? '<line x1="' + (cx - 34 * s) + '" y1="' + (baseY - 70 * s) + '" x2="' + (cx + 34 * s) + '" y2="' + (baseY - 96 * s) + '" stroke="' + ink + '" stroke-width="' + (5 * s) + '"/>' +
      '<rect x="' + (cx + 22 * s) + '" y="' + (baseY - 108 * s) + '" width="' + (20 * s) + '" height="' + (14 * s) + '" fill="' + ink + '"/>'
    : '<line x1="' + cx + '" y1="' + baseY + '" x2="' + (cx + 10 * s) + '" y2="' + (baseY - 132 * s) + '" stroke="' + ink + '" stroke-width="' + (4 * s) + '"/>' +
      '<circle cx="' + (cx + 10 * s) + '" cy="' + (baseY - 136 * s) + '" r="' + (5 * s) + '" fill="#f4e9c8"/>';
  return head + cloak + beard + weapon;
}

function ridge(seed, tag, w, baseY, amp, fill, opacity) {
  const rnd = (k) => substream(seed, 'poster|' + tag + '|' + k, 6)();
  let pts = '0,' + (baseY + 200);
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const x = (w / steps) * i;
    const y = baseY - rnd('h' + i) * amp;
    pts += ' ' + x.toFixed(1) + ',' + y.toFixed(1);
  }
  pts += ' ' + w + ',' + (baseY + 200);
  return '<polygon points="' + pts + '" fill="' + fill + '" opacity="' + opacity + '"/>';
}

function grain(seed, tag, w, h, n) {
  return scatter(seed, tag, n, w, h)
    .map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="1.4" fill="#000" opacity="0.16"/>')
    .join('');
}

function rainLines(seed, tag, w, h, n, slant) {
  return scatter(seed, tag, n, w, h)
    .map(([x, y]) => '<line x1="' + x + '" y1="' + y + '" x2="' + (x - slant) + '" y2="' + (y + 18) + '" stroke="rgba(220,232,245,0.5)" stroke-width="1.2"/>')
    .join('');
}

function titleBlock(title, sub) {
  return '<text x="320" y="856" text-anchor="middle" font-family="Georgia,serif" font-size="64" letter-spacing="10" fill="#f2ecdc">' + esc(title) + '</text>' +
    '<text x="320" y="892" text-anchor="middle" font-family="Georgia,serif" font-size="20" letter-spacing="3" fill="#c9cfdd">' + esc(sub) + '</text>';
}

const W = 640;
const H = 960;

export function buildPoster(kind, seed, pal) {
  const ink = pal.ink || '#232a36';
  const sky = pal.sky || '#4a5468';
  const wash = pal.wash || '#8a93a8';
  const thorFill = pal.thor || '#a03c2e';
  const zeusFill = pal.zeus || '#2e5f8a';
  const gid = 'poster-' + kind;
  const bg = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#141a26"/><stop offset="0.45" stop-color="' + esc(sky) +
    '"/><stop offset="0.78" stop-color="' + esc(wash) + '"/></linearGradient></defs>' +
    '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#' + gid + ')"/>';
  if (kind === 'duel') {
    const fork = forkPath(seed, W, 320, 560);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960" role="img" aria-label="Mythduel key art: Thor and Zeus facing off on the storm-crag under a splitting sky">' +
      bg +
      '<path d="' + fork + '" stroke="#f4e9c8" stroke-width="5" fill="none" opacity="0.9"/>' +
      '<path d="' + fork + '" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.7"/>' +
      rainLines(seed, 'duel|rain', W, H, 90, 7) +
      ridge(seed, 'duel|far', W, 640, 90, ink, 0.75) +
      ridge(seed, 'duel|near', W, 730, 70, '#1a2030', 1) +
      '<line x1="0" y1="700" x2="640" y2="700" stroke="rgba(235,242,248,0.4)" stroke-width="2"/>' +
      fighterMark('thor', 210, 700, 1.5, thorFill, ink) +
      fighterMark('zeus', 430, 700, 1.5, zeusFill, ink) +
      grain(seed, 'duel|grain', W, H, 120) +
      titleBlock('MYTHDUEL', 'an original Thor vs Zeus duel - the storm chooses no master') +
      '</svg>';
  }
  if (kind === 'thor') {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960" role="img" aria-label="Mythduel poster: Thor, storm-bringer of the north">' +
      bg +
      rainLines(seed, 'thor|rain', W, H, 60, 10) +
      ridge(seed, 'thor|far', W, 660, 100, ink, 0.8) +
      ridge(seed, 'thor|near', W, 750, 60, '#1a2030', 1) +
      fighterMark('thor', 320, 720, 3.2, thorFill, ink) +
      grain(seed, 'thor|grain', W, H, 110) +
      titleBlock('THOR', 'storm-bringer of the north - the haft-hammer hafra') +
      '</svg>';
  }
  if (kind === 'zeus') {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 960" role="img" aria-label="Mythduel poster: Zeus, storm-lord of Olympus">' +
      bg +
      '<path d="' + forkPath(seed, W, 320, 480) + '" stroke="#f4e9c8" stroke-width="4" fill="none" opacity="0.85"/>' +
      rainLines(seed, 'zeus|rain', W, H, 70, 5) +
      ridge(seed, 'zeus|far', W, 660, 80, '#e8e2d2', 0.5) +
      ridge(seed, 'zeus|near', W, 750, 60, ink, 1) +
      fighterMark('zeus', 320, 720, 3.2, zeusFill, ink) +
      grain(seed, 'zeus|grain', W, H, 110) +
      titleBlock('ZEUS', 'storm-lord of Olympus - the shaft-bolt keraunos-rod') +
      '</svg>';
  }
  throw new Error('unknown poster kind: ' + kind);
}

export const POSTER_KINDS = ['duel', 'thor', 'zeus'];

export function posterSources() {
  const duel = loadJson(join(root, 'story/duel.json'), 'story/duel.json');
  const board = loadJson(join(root, 'story/storyboard.json'), 'story/storyboard.json');
  const pal = (board.panels.find((p) => p.beat === 'b06') || board.panels[0]).palette || {};
  buildTimeline(duel);
  return { seed: duel.seed, pal };
}

export function renderPosters(checkOnly) {
  const { seed, pal } = posterSources();
  const out = POSTER_KINDS.map((kind) => ({ kind, svg: buildPoster(kind, seed, pal), file: 'designs/posters/' + kind + '.svg' }));
  if (checkOnly) {
    const bad = [];
    for (const p of out) {
      let committed;
      try {
        committed = readFileSync(join(root, p.file), 'utf8');
      } catch {
        bad.push(p.file + ':missing');
        continue;
      }
      if (committed !== p.svg) bad.push(p.file + ':differs-from-rebuild');
    }
    return bad;
  }
  mkdirSync(join(root, 'designs/posters'), { recursive: true });
  for (const p of out) writeFileSync(join(root, p.file), p.svg);
  return out.map((p) => p.file);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const cliArgs = process.argv.slice(2);
  if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
    console.log('Usage: node mythduel/tools/render-posters.mjs [--check]');
    console.log('Renders the three deterministic premiere posters into designs/posters/.');
    process.exit(0);
  }
  const unknownFlag = cliArgs.find((a) => a.startsWith('-') && a !== '--check');
  if (unknownFlag) {
    console.error('Unknown flag: ' + unknownFlag);
    process.exit(2);
  }
  if (cliArgs.includes('--check')) {
    const bad = renderPosters(true);
    if (bad.length) {
      console.error('POSTERS RED: ' + bad.join(', '));
      process.exit(1);
    }
    console.log('POSTERS GREEN: 3 posters match rebuild');
  } else {
    const files = renderPosters(false);
    console.log('posters rendered: ' + files.join(', '));
  }
}
