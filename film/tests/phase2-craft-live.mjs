// Hearthlight Phase 2 live regression suite (Tester).
// Run: node film/tests/phase2-craft-live.mjs - exit non-zero on any failure.
// Covers what the static gates do not: the shipped renderAnimatic entrypoint
// across every shot x start/mid/end x reduced-motion on/off x 960/390px widths
// (240 live frames, no throws), hostile timeline clamps, scrub-exact draw-log
// identity, and the gallery wall under a DOM stub (5 act stills, honest
// null-timeline path, watch-from-here jump drives seek).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { paintGallery } from '../player/gallery.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

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

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

// 1. live matrix: every shot renders without throwing
let frames = 0; let threw = null;
for (const s of tl.shots) {
  for (const f of [0.01, 0.5, 0.99]) {
    for (const rm of [false, true]) {
      for (const w of [960, 390]) {
        try {
          const { ctx } = makeRecorder();
          renderAnimatic(ctx, tl, s.start + s.dur * f,
            { width: w, height: Math.round(w * 9 / 16), reducedMotion: rm });
          frames++;
        } catch (e) { threw = s.id + '@' + f + '/rm=' + rm + '/w=' + w + ': ' + e.message; }
      }
    }
  }
}
ok('live matrix renders 240 frames', frames === 240 && !threw, frames + ' frames' + (threw ? ' - ' + threw : ''));

// 2. hostile timeline clamps render without throwing
let hostileOk = true;
for (const t of [-50, 0, tl.total - 0.001, tl.total, 1e9]) {
  try {
    const { ctx } = makeRecorder();
    renderAnimatic(ctx, tl, t, { width: 960, height: 540 });
  } catch { hostileOk = false; }
}
ok('hostile timeline clamps render', hostileOk);

// 3. scrub-exact: same t twice yields identical draw logs
{
  const t = tl.shots[7].start + tl.shots[7].dur / 2;
  const a = makeRecorder(); renderAnimatic(a.ctx, tl, t, { width: 960, height: 540 });
  const b = makeRecorder(); renderAnimatic(b.ctx, tl, t, { width: 960, height: 540 });
  ok('scrub-exact draw log', JSON.stringify(a.log) === JSON.stringify(b.log), a.log.length + ' calls');
}

// 4. gallery wall under a DOM stub
function mkEl(tag) {
  return {
    tag, children: [], attrs: {}, textContent: '', hidden: false, width: 0, height: 0,
    append(...c) { this.children.push(...c); },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] || null; },
    addEventListener(e, f) { this['on_' + e] = f; },
    dispatchEvent() {}, click() {},
    getContext() {
      const g = () => ({ addColorStop() {} });
      const st = {};
      return new Proxy({}, {
        get(t, p) {
          if (typeof p !== 'string') return undefined;
          if (p in st) return st[p];
          return (...a) => { if (String(p).startsWith('create')) return g(); };
        },
        set(t, p, v) { st[p] = v; return true; },
      });
    },
    scrollIntoView() {},
  };
}
{
  const els = {};
  globalThis.document = {
    getElementById: (id) => (els[id] || (els[id] = mkEl('div'))),
    createElement: (t) => mkEl(t),
  };
  globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
  let galleryOk = true;
  try {
    paintGallery(tl, false);
    if (els.galleryGrid.children.length !== tl.acts.length) galleryOk = false;
  } catch { galleryOk = false; }
  ok('gallery paints one still per act', galleryOk, tl.acts.length + ' acts');
  let nullOk = true;
  try { paintGallery(null, false); } catch { nullOk = false; }
  ok('gallery null-timeline no-throw', nullOk);
  let jumpOk = false;
  try {
    const cap = els.galleryGrid.children[0].children[1];
    const jump = cap.children.find((c) => c.tag === 'button');
    els.seek = mkEl('input'); els.seek.dispatchEvent = () => {};
    els.btnPlay = mkEl('button'); els.btnPlay.attrs['aria-label'] = 'Play the film';
    els.stageWrap = mkEl('div');
    jump['on_click']();
    jumpOk = els.seek.value === String(tl.acts[0].start + 0.01);
  } catch { jumpOk = false; }
  ok('gallery watch-from-here drives seek', jumpOk);
  delete globalThis.document;
}

if (failures) { console.error('PHASE2-LIVE RED: ' + failures + ' failures'); process.exit(1); }
console.log('PHASE2-LIVE GREEN');
