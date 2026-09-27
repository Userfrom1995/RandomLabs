// Hearthlight Phase 2 fixer-polish regression suite (Tester).
// Run: node film/tests/phase2-fixer-polish.mjs - exit non-zero on any failure.
// Pins the five Evaluator polish items: CLI citizenship (--help exit 0,
// unknown flags exit 2) and friendly corrupt-input diagnostics on all three
// tools, inkStroke canvas-state restore, gallery scrollIntoView null guard,
// and the deliberate non-finite timeline coercion (Infinity -> film start).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { inkStroke } from '../engine/ink.js';
import { paintGallery } from '../player/gallery.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const tools = ['capture.mjs', 'render.mjs', 'audit.mjs'];
for (const t of tools) {
  const p = join(root, 'tools', t === 'capture.mjs' ? 'capture.mjs' : t === 'render.mjs' ? 'render.mjs' : 'audit.mjs');
  let helpOk = false; let helpOut = '';
  try {
    helpOut = execFileSync(node, [p, '--help'], { encoding: 'utf8' });
    helpOk = /Usage:/.test(helpOut);
  } catch { helpOk = false; }
  ok(t + ' --help exits 0 with usage', helpOk, helpOut.split('\n')[0] || '');
  let bogusOk = false; let bogusOut = '';
  try {
    execFileSync(node, [p, '--bogus-flag'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    bogusOk = e.status === 2 && /Unknown flag/.test(String((e.stdout || '') + (e.stderr || '')));
    bogusOut = String((e.stdout || '') + (e.stderr || '')).split('\n')[0];
  }
  ok(t + ' --bogus-flag exits 2', bogusOk, bogusOut);
}

// Friendly corrupt-input diagnostics (backup + restore inside finally).
{
  const spPath = join(root, 'story/screenplay.json');
  const backup = readFileSync(spPath, 'utf8');
  try {
    writeFileSync(spPath, '{ corrupt json');
    for (const t of ['capture.mjs', 'render.mjs', 'audit.mjs']) {
      const p = join(root, 'tools', t);
      let diagOk = false; let out = '';
      try {
        execFileSync(node, [p], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        out = String((e.stdout || '') + (e.stderr || ''));
        diagOk = e.status === 1 && /is corrupt/.test(out) && !/at JSON\.parse/.test(out);
      }
      ok(t + ' corrupt screenplay is friendly exit 1', diagOk, out.split('\n')[0]);
    }
  } finally {
    writeFileSync(spPath, backup);
  }
  ok('screenplay restored after corrupt probe', readFileSync(spPath, 'utf8') === backup);
}

// inkStroke restores caller canvas state (save/restore, no leaked alpha).
{
  const calls = [];
  const state = { globalAlpha: 0.77 };
  const stack = [];
  const ctx = new Proxy({}, {
    get(t, prop) {
      if (prop === 'globalAlpha') return state.globalAlpha;
      if (prop === 'save') return () => { calls.push('save'); stack.push({ ...state }); };
      if (prop === 'restore') return () => { calls.push('restore'); Object.assign(state, stack.pop() || {}); };
      if (typeof prop !== 'string') return undefined;
      return (...a) => { calls.push(prop); };
    },
    set(t, prop, v) { if (prop === 'globalAlpha') state.globalAlpha = v; return true; },
  });
  inkStroke(ctx, '#111', 2, { x: 1, y: -1 });
  const saves = calls.filter((c) => c === 'save').length;
  const restores = calls.filter((c) => c === 'restore').length;
  ok('inkStroke save/restore balanced', saves >= 2 && saves === restores, saves + ' save / ' + restores + ' restore');
  ok('inkStroke restores caller globalAlpha', state.globalAlpha === 0.77, 'alpha=' + state.globalAlpha);
}

// Gallery jump survives a missing stageWrap (no-throw, seek still driven).
{
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
    };
  }
  const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
  const tl = buildTimeline(sp);
  const els = {};
  globalThis.document = {
    // stageWrap deliberately absent: getElementById returns null for it.
    getElementById: (id) => {
      if (id === 'stageWrap') return null;
      return els[id] || (els[id] = mkEl('div'));
    },
    createElement: (t) => mkEl(t),
  };
  globalThis.Event = globalThis.Event || class { constructor(t) { this.type = t; } };
  let noThrow = true;
  try {
    paintGallery(tl, false);
    const cap = els.galleryGrid.children[0].children[1];
    const jump = cap.children.find((c) => c.tag === 'button');
    els.seek = mkEl('input'); els.seek.dispatchEvent = () => {};
    els.btnPlay = mkEl('button'); els.btnPlay.attrs['aria-label'] = 'Play the film';
    jump['on_click']();
    noThrow = els.seek.value === String(tl.acts[0].start + 0.01);
  } catch { noThrow = false; }
  ok('gallery jump survives missing stageWrap', noThrow);
  delete globalThis.document;
}

// Deliberate non-finite coercion: Infinity maps to film start like NaN.
{
  const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
  const tl = buildTimeline(sp);
  const a = shotAt(tl, Infinity).shot.id;
  const b = shotAt(tl, NaN).shot.id;
  const c = shotAt(tl, 0).shot.id;
  ok('timeline Infinity maps to film start', a === c && b === c, 'inf=' + a + ' nan=' + b + ' zero=' + c);
  const src = readFileSync(join(root, 'engine/timeline.js'), 'utf8');
  ok('timeline coercion documented', /Deliberate.*non-finite/i.test(src));
}

if (failures) { console.error('PHASE2-POLISH RED: ' + failures + ' failures'); process.exit(1); }
console.log('PHASE2-POLISH GREEN');
