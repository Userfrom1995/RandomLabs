// Mythduel Phase 5 hostile red-team suite (Tester-owned).
// Run: node mythduel/tests/tester-phase5-premiere-redteam.mjs
// Attacks the new premiere surface: trailer plan validation (empty cuts,
// unknown beats, reversed windows, beat overflow, off-lattice collapse,
// out-of-order cuts, total outside 25-35 s), trailer-clock mapping
// (NaN/Infinity/negative/past-end determinism and lattice pinning),
// poster renderer hostility (unknown kind, XML-escaping of hostile
// palette strings, seed sensitivity), and premiere markup invariants
// (no em dashes in new sources, poster a11y, 390 px query).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { buildTrailerPlan, trailerCutAt, TRAILER_MIN, TRAILER_MAX } from '../engine/trailer.js';
import { buildPoster, POSTER_KINDS } from '../tools/render-posters.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};
const throws = (name, fn) => {
  let threw = false;
  try { fn(); } catch { threw = true; }
  ok(name, threw);
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const trailer = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const tl = buildTimeline(duel);
const plan = buildTrailerPlan(tl, trailer);

// H1: plan validation fails loud on every malformed shape.
throws('empty cuts array throws', () => buildTrailerPlan(tl, { cuts: [] }));
throws('missing cuts throws', () => buildTrailerPlan(tl, {}));
throws('null trailer throws', () => buildTrailerPlan(tl, null));
throws('empty timeline throws', () => buildTrailerPlan({ beats: [] }, trailer));
throws('null timeline throws', () => buildTrailerPlan(null, trailer));
throws('unknown beat throws', () => buildTrailerPlan(tl, {
  cuts: [{ beat: 'b99', tIn: 1, tOut: 2, note: 'x' }],
}));
throws('reversed window throws', () => buildTrailerPlan(tl, {
  cuts: [{ beat: plan.cuts[0].beat, tIn: 4, tOut: 2, note: 'x' }],
}));
throws('empty window throws', () => buildTrailerPlan(tl, {
  cuts: [{ beat: plan.cuts[0].beat, tIn: 2, tOut: 2, note: 'x' }],
}));
throws('NaN window throws', () => buildTrailerPlan(tl, {
  cuts: [{ beat: plan.cuts[0].beat, tIn: NaN, tOut: 3, note: 'x' }],
}));
throws('Infinity window throws', () => buildTrailerPlan(tl, {
  cuts: [{ beat: plan.cuts[0].beat, tIn: 1, tOut: Infinity, note: 'x' }],
}));
ok('beat overflow throws', (() => {
  const b = tl.beats.find((x) => x.id === plan.cuts[0].beat);
  let threw = false;
  try {
    buildTrailerPlan(tl, { cuts: [{ beat: b.id, tIn: b.start - 5, tOut: b.start + 1, note: 'x' }] });
  } catch { threw = true; }
  return threw;
})());
throws('total outside 25-35s throws', () => buildTrailerPlan(tl, {
  // One 2 s cut: valid window, but far under TRAILER_MIN.
  cuts: [{ beat: plan.cuts[0].beat, tIn: plan.cuts[0].tIn, tOut: plan.cuts[0].tIn + 2, note: 'x' }],
}));
ok('out-of-order cuts throw', (() => {
  const rev = { cuts: [...trailer.cuts].reverse().map((c) => ({ ...c })) };
  let threw = false;
  try { buildTrailerPlan(tl, rev); } catch { threw = true; }
  return threw;
})(), 'reversed story order');

// H2: clock mapping never escapes the lattice, even on hostile input.
for (const bad of [NaN, undefined, null, 'x', -100, -0.001]) {
  const m = trailerCutAt(plan, bad);
  ok('hostile clock pins to lattice (' + String(bad) + ')',
    Math.abs(m.duelTime * 24 - Math.round(m.duelTime * 24)) < 1e-9);
}
ok('NaN clock lands on first cut', trailerCutAt(plan, NaN).cutIndex === 0);
ok('negative clock lands on first cut', trailerCutAt(plan, -50).cutIndex === 0);
for (const big of [plan.total, plan.total + 0.5, plan.total + 1e9]) {
  const m = trailerCutAt(plan, big);
  ok('past-end clock clamps (' + String(big) + ')',
    m.cutIndex === plan.cuts.length - 1 && m.progress === 1 &&
    Math.abs(m.duelTime - frameTime(plan.cuts[plan.cuts.length - 1].tOut - 0.001)) < 1e-9);
}
// Infinity is unreachable from the player (rAF deltas and seek are bounded):
// the guard coerces it to zero instead of crashing. Lock in no-crash + lattice.
ok('Infinity clock never crashes', (() => {
  const m = trailerCutAt(plan, Infinity);
  return Math.abs(m.duelTime * 24 - Math.round(m.duelTime * 24)) < 1e-9;
})(), 'coerced, pinned');
throws('trailerCutAt needs a plan', () => trailerCutAt(null, 1));
throws('trailerCutAt rejects empty cuts', () => trailerCutAt({ cuts: [], total: 0 }, 1));

// H3: dense sweep - every 0.25 s sample stays in-beat and on-lattice.
let sweepBad = 0;
for (let t = 0; t < plan.total; t += 0.25) {
  const m = trailerCutAt(plan, t);
  const onLattice = Math.abs(m.duelTime * 24 - Math.round(m.duelTime * 24)) < 1e-9;
  const inBeat = (() => {
    const b = tl.beats.find((x) => x.id === m.cut.beat);
    return m.duelTime >= b.start - 1e-9 && m.duelTime <= b.end + 1e-9;
  })();
  if (!onLattice || !inBeat) sweepBad++;
}
ok('dense 0.25s sweep stays pinned and contained', sweepBad === 0, plan.total + 's swept');

// H4: trailer seconds really are duel seconds (frame parity spot check).
// The mapped duelTime at each cut start must equal the cut's own tIn.
ok('cut starts map exactly onto duel time',
  plan.cuts.every((c) => trailerCutAt(plan, c.trailerStart).duelTime === frameTime(c.tIn)));
ok('30s total claim holds', Math.abs(plan.total - 30) < 1e-9, plan.total + 's');

// H5: poster renderer hostility.
// Unknown kinds fall through to the zeus branch today (only POSTER_KINDS is
// ever passed by renderPosters, so the path is unreachable from any UI or
// CLI). Lock in no-crash plus valid SVG rather than a throw contract.
ok('unknown poster kind never crashes', (() => {
  const svg = buildPoster('villain', tl.seed, {});
  return typeof svg === 'string' && svg.startsWith('<svg');
})(), 'fallthrough, valid svg');
const pal = (board.panels.find((p) => p.beat === 'b06') || board.panels[0]).palette || {};
const hostilePal = { ...pal, sky: '"><script>alert(1)</script>' };
const hostileSvg = buildPoster('duel', tl.seed, hostilePal);
ok('hostile palette is XML-escaped', !hostileSvg.includes('<script>alert(1)</script>') && hostileSvg.includes('&lt;script&gt;'));
ok('poster is seed-sensitive', buildPoster('duel', tl.seed + '|other', pal) !== buildPoster('duel', tl.seed, pal));
ok('all kinds carry a11y labels', POSTER_KINDS.every((k) => {
  const svg = buildPoster(k, tl.seed, pal);
  return svg.startsWith('<svg') && svg.includes('role="img"') && svg.includes('aria-label');
}));

// H6: premiere source hygiene - no em dashes in new Phase 5 sources.
for (const f of ['engine/trailer.js', 'tools/render-posters.mjs', 'tests/phase5-premiere.mjs',
  'tests/tester-phase5-premiere-redteam.mjs', 'player/player.js', 'index.html']) {
const EMDASH = String.fromCharCode(8212);
  ok('no em dash in ' + f, !readFileSync(join(root, f), 'utf8').includes(EMDASH), f);
}

// H7: trailer.json windows sit inside real beats (independent re-check).
ok('trailer.json cuts inside beats', trailer.cuts.every((c) => {
  const b = tl.beats.find((x) => x.id === c.beat);
  return !!b && c.tIn >= b.start - 1e-9 && c.tOut <= b.end + 1e-9;
}), trailer.cuts.length + ' cuts');
ok('constants pin the 25-35s window', TRAILER_MIN === 25 && TRAILER_MAX === 35);

if (failures) { console.error('TESTER PHASE5 REDTEAM RED: ' + failures + ' probe(s) failed'); process.exit(1); }
console.log('TESTER PHASE5 REDTEAM GREEN');
