// Mythduel premiere regression suite (Phase 5).
// Run: node mythduel/tests/phase5-premiere.mjs - exit non-zero on failure.
// Covers: trailer plan math (total window, cut order, lattice edges, beat
// containment), trailer-clock mapping (lattice, beat agreement, end clamp,
// determinism), trailer caption notes, poster determinism and rebuild match,
// premiere markup (transport, end card, posters, noscript), player hooks
// (trailer mode, end card, canvas fallback, reduced motion, shortcut),
// behind-the-scenes links, root landing, and the 390 px mobile pass.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { buildTrailerPlan, trailerCutAt, TRAILER_MIN, TRAILER_MAX } from '../engine/trailer.js';
import { buildPoster, POSTER_KINDS, renderPosters } from '../tools/render-posters.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const trailer = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const tl = buildTimeline(duel);
const plan = buildTrailerPlan(tl, trailer);

// 1. plan math
ok('trailer total inside 25-35s', plan.total >= TRAILER_MIN && plan.total <= TRAILER_MAX, plan.total + 's');
ok('plan keeps all 7 cuts', plan.cuts.length === trailer.cuts.length, plan.cuts.length + ' cuts');
ok('cuts run in story order', plan.cuts.every((c, i) => i === 0 || plan.cuts[i - 1].trailerEnd <= c.trailerStart), 'monotonic');
ok('cut edges on the lattice', plan.cuts.every((c) =>
  Math.abs(c.tIn * 24 - Math.round(c.tIn * 24)) < 1e-9 &&
  Math.abs(c.tOut * 24 - Math.round(c.tOut * 24)) < 1e-9), 'edges pinned');
ok('cuts inside their beats', plan.cuts.every((c) => {
  const beat = tl.beats.find((b) => b.id === c.beat);
  return c.tIn >= beat.start - 1e-9 && c.tOut <= beat.end + 1e-9;
}), 'contained');
ok('plan deterministic', JSON.stringify(buildTrailerPlan(tl, trailer)) === JSON.stringify(plan), 'stable');

// 2. clock mapping
const samples = [];
for (let t = 0; t < plan.total; t += 0.5) samples.push(t);
samples.push(plan.total - 0.001);
ok('mapped instants on the lattice', samples.every((t) => {
  const m = trailerCutAt(plan, t);
  return Math.abs(m.duelTime * 24 - Math.round(m.duelTime * 24)) < 1e-9;
}), samples.length + ' samples');
ok('mapped instants agree with cut beats', samples.every((t) => {
  const m = trailerCutAt(plan, t);
  return beatAt(tl, m.duelTime).beat.id === m.cut.beat;
}), 'beat agreement');
ok('end clamps onto the final frame', (() => {
  const m = trailerCutAt(plan, plan.total + 10);
  return m.cutIndex === plan.cuts.length - 1 && m.progress === 1 &&
    Math.abs(m.duelTime - frameTime(plan.cuts[plan.cuts.length - 1].tOut - 0.001)) < 1e-9;
})(), 'clamped');
ok('negative clock clamps to zero', trailerCutAt(plan, -3).duelTime === frameTime(plan.cuts[0].tIn), 'clamped');
ok('mapping deterministic', JSON.stringify(trailerCutAt(plan, 7.25)) === JSON.stringify(trailerCutAt(plan, 7.25)), 'stable');
ok('every cut reachable on the clock', plan.cuts.every((c) =>
  trailerCutAt(plan, c.trailerStart + 0.001).cutIndex === c.index), 'reachable');

// 3. trailer captions
ok('every cut has a caption note', plan.cuts.every((c) => c.note && c.note.length > 0), plan.cuts.length + ' notes');

// 4. posters
const pal = (board.panels.find((p) => p.beat === 'b06') || board.panels[0]).palette || {};
for (const kind of POSTER_KINDS) {
  ok('poster deterministic: ' + kind, buildPoster(kind, tl.seed, pal) === buildPoster(kind, tl.seed, pal), kind);
}
ok('posters match committed rebuild', renderPosters(true).length === 0, '3 match');
ok('poster files parse as svg', POSTER_KINDS.every((k) => {
  const svg = readFileSync(join(root, 'designs/posters/' + k + '.svg'), 'utf8');
  return svg.startsWith('<svg') && svg.includes('role="img"') && svg.includes('aria-label');
}), 'a11y labels');

// 5. premiere markup
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const mark of ['id="btnTrailer"', 'id="endCard"', 'id="endReplay"', 'id="endTrailer"',
  'designs/posters/duel.svg', 'designs/posters/thor.svg', 'designs/posters/zeus.svg',
  'story/trailer.json', '<noscript>', 'aria-pressed']) {
  ok('markup has ' + mark, html.includes(mark), mark);
}

// 6. player hooks
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
for (const mark of ['trailerCutAt', 'buildTrailerPlan', 'setMode', 'showEndCard', 'hideEndCard',
  "getContext('2d')", 'prefers-reduced-motion', 'endReplay', 'endTrailer', 'drawTrailer']) {
  ok('player wires ' + mark, playerJs.includes(mark), mark);
}
ok('player guards a missing 2d context', /if\s*\(!ctx\)/.test(playerJs), 'null guard');

// 7. behind the scenes + landing
const docsIndex = readFileSync(join(root, 'docs/index.md'), 'utf8');
ok('docs link the posters', docsIndex.includes('designs/posters'), 'posters');
ok('docs link the trailer map', docsIndex.includes('story/trailer.json'), 'trailer');
const repoRoot = join(root, '..');
ok('root landing links the duel', readFileSync(join(repoRoot, 'index.html'), 'utf8').includes('/mythduel/'), 'landing');
ok('root readme lists the duel', readFileSync(join(repoRoot, 'README.md'), 'utf8').includes('mythduel/'), 'readme');

// 8. 390 px mobile pass
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
ok('css carries the 390px query', css.includes('max-width: 390px'), '390px');
ok('end card styled', css.includes('.end-card'), 'end card');
ok('end card hidden by default narrows correctly', css.includes('.end-card[hidden]'), 'hidden');

if (failures) {
  console.error('PREMIERE RED: ' + failures + ' probe(s) failed');
  process.exit(1);
}
console.log('PREMIERE GREEN');
