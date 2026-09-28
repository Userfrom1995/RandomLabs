// Mythduel final integration suite (Final Phase: Integration and End-to-end Audit).
// Run: node mythduel/tests/phase6-final.mjs - exit non-zero on failure.
// Covers: frame-step transport markup and wiring, full keyboard map,
// keyboard-operable storyboard cards plus focus styles, frame-step lattice
// math on both clocks, the full-timeline headless stage sweep (arena plus
// rigs plus particles on a stub canvas, stable reruns inside budgets, every
// trailer sample inside its cut beat), public-docs unity (no milestone
// markers, no em dashes, Watch documents stepping), and the 390 px pass.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { buildTrailerPlan, trailerCutAt } from '../engine/trailer.js';
import { paintArena, compositionFor } from '../engine/arena.js';
import { paintFighterRig, paintImpactParticles } from '../engine/fighters.js';

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
const html = readFileSync(join(root, 'index.html'), 'utf8');
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
const galleryJs = readFileSync(join(root, 'player/gallery.js'), 'utf8');
const css = readFileSync(join(root, 'player/player.css'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');

// 1. frame-step transport markup.
ok('markup carries step-back control', html.includes('id="btnStepBack"'), 'btnStepBack');
ok('markup carries step-forward control', html.includes('id="btnStepFwd"'), 'btnStepFwd');
ok('step controls name the frame keys', html.includes('Step back one frame') && html.includes('Step forward one frame'), 'aria labels');
ok('step controls name the arrow keys', html.includes('Left arrow') && html.includes('Right arrow'), 'key hints');

// 2. player wiring.
ok('player wires stepFrame', playerJs.includes('stepFrame'), 'stepFrame');
ok('player wires both step buttons', playerJs.includes('btnStepBack') && playerJs.includes('btnStepFwd'), 'buttons');
ok('player maps ArrowLeft and ArrowRight', playerJs.includes('ArrowLeft') && playerJs.includes('ArrowRight'), 'arrows');
ok('player maps Home and End', playerJs.includes("'Home'") && playerJs.includes("'End'"), 'home/end');
ok('player maps fullscreen key', playerJs.includes('toggleFullscreen') && playerJs.includes("'f'"), 'F key');
ok('step math stays on the lattice', (() => {
  for (const b of tl.beats) {
    const stepped = frameTime(frameTime(b.start + 1) + 1 / 24);
    if (Math.abs(stepped * 24 - Math.round(stepped * 24)) > 1e-9) return false;
    const back = frameTime(frameTime(b.start + 1) - 1 / 24);
    if (Math.abs(back * 24 - Math.round(back * 24)) > 1e-9) return false;
  }
  return true;
})(), '8 beats stepped both ways');
ok('trailer step math stays on the lattice', (() => {
  for (let t = 0; t < plan.total - 0.1; t += 2.5) {
    const stepped = frameTime(frameTime(t) + 1 / 24);
    if (Math.abs(stepped * 24 - Math.round(stepped * 24)) > 1e-9) return false;
    const mapped = trailerCutAt(plan, stepped);
    if (beatAt(tl, mapped.duelTime).beat.id !== mapped.cut.beat) return false;
  }
  return true;
})(), 'trailer steps resolve in-beat');

// 3. storyboard card keyboard access plus focus styles.
ok('cards are focusable buttons', galleryJs.includes('tabIndex') && galleryJs.includes("role', 'button'"), 'tab+role');
ok('cards name their hero jump', galleryJs.includes('aria-label') && galleryJs.includes('Jump the stage'), 'aria label');
ok('cards activate on Enter', galleryJs.includes('keydown') && galleryJs.includes('Enter'), 'keyboard activation');
ok('focus rings styled', css.includes(':focus-visible') && css.includes('outline'), 'focus-visible');
ok('390px pass retained', css.includes('390px'), 'mobile query');

// 4. full-timeline headless stage sweep: arena plus both rigs plus particles
// at three instants per beat on a stub canvas, stable across reruns.
const stubCtx = () => {
  const calls = { count: 0 };
  const grad = { addColorStop() { calls.count++; } };
  return new Proxy({ calls }, {
    get(t, k) {
      if (k === 'calls') return t.calls;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'canvas') return undefined;
      if (typeof k === 'string') return (...a) => { t.calls.count++; };
      return undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
};
let sweepOk = true;
let sweepWorst = 0;
let sweepPaints = 0;
try {
  for (const b of tl.beats) {
    const comp = compositionFor(b.id);
    for (const lt of [0.05, b.dur / 2, b.dur - 0.05]) {
      const t = b.start + lt;
      const q = frameTime(t);
      const paintOnce = () => {
        const ctx = stubCtx();
        const panel = board.panels.find((p) => p.beat === b.id) || board.panels[0];
        const arena = paintArena(ctx, tl.seed, q, b, panel.palette);
        paintFighterRig(ctx, tl.seed, q, b, 'thor', 0.44, arena.ground, b.wind, b.continuity.exit.thor.fatigue);
        paintFighterRig(ctx, tl.seed, q, b, 'zeus', 0.56, arena.ground, b.wind, b.continuity.exit.zeus.fatigue);
        paintImpactParticles(ctx, tl.seed, q, b, { crossX: 480, crossY: arena.ground - 110, ground: arena.ground });
        return ctx.calls.count;
      };
      const n1 = paintOnce();
      const n2 = paintOnce();
      sweepPaints++;
      sweepWorst = Math.max(sweepWorst, n1);
      if (n1 !== n2 || n1 <= 0) sweepOk = false;
    }
  }
  if (!(sweepWorst > 0 && sweepWorst < 12000)) sweepOk = false;
} catch {
  sweepOk = false;
}
ok('full stage sweep paints headless, stable', sweepOk, sweepPaints + ' paints worst ' + sweepWorst);
ok('every trailer sample sits in its cut beat', (() => {
  for (let t = 0; t < plan.total; t += 0.5) {
    const m = trailerCutAt(plan, frameTime(t));
    if (Math.abs(m.duelTime * 24 - Math.round(m.duelTime * 24)) > 1e-9) return false;
    if (beatAt(tl, m.duelTime).beat.id !== m.cut.beat) return false;
  }
  return true;
})(), '0.5s trailer grid');

// 5. public docs unity: no internal milestone markers, no em dashes, and the
// Watch section documents the step and keyboard controls.
const markerRe = /\bM[1-7]\b|milestone|this milestone|sprint|changelog|Phase [0-9]\b/i;
const pubDocs = ['README.md', 'docs/pipeline.md', 'docs/craft.md', 'docs/story.md', 'docs/index.md'];
ok('public docs carry no milestone markers', pubDocs.every((f) => {
  const lines = readFileSync(join(root, f), 'utf8').split('\n');
  return lines.every((ln) => !markerRe.test(ln));
}), pubDocs.length + ' files');
ok('mythduel sources carry no em dashes', (() => {
  const bad = [];
  const dash = String.fromCharCode(8212);
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      if (n === 'dist' || n === 'node_modules') continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(json|md|js|mjs|html|css|svg)$/i.test(n)) continue;
      if (readFileSync(p, 'utf8').includes(dash)) bad.push(p.slice(root.length + 1));
    }
  };
  walk(root);
  if (bad.length) console.log('  em dash in: ' + bad.join(','));
  return bad.length === 0;
})(), 'full tree scan');
ok('Watch documents stepping', readme.includes('single-frame step') && readme.includes('Left'), 'step docs');
ok('Watch documents fullscreen key', readme.includes('(button or F)'), 'F docs');
ok('Watch documents card keyboard use', readme.includes('Enter to jump'), 'card docs');

if (failures) {
  console.error('FINAL RED: ' + failures + ' probe(s) failed');
  process.exit(1);
}
console.log('FINAL GREEN');
