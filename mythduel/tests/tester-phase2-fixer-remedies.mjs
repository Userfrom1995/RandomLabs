// Mythduel Phase 2 fixer-remedy pins (Tester, Refs #470).
//
// Durable guards for the Quality Council rejection remedies: hero duel image
// carries no debug labels, caption band never paints empty, paintArena throws
// a typed error on bad ctx, fixture loaders fail with one-line actionable
// errors, plates pin all 5 storm grades. Pure node, no network, no
// wall-clock: exits 0 green, 1 red with the failing assertion named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { paintArena } from '../engine/arena.js';
import { capturePlates } from '../tools/capture.mjs';
import { stillsManifest } from '../tools/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const player = readFileSync(join(root, 'player/player.js'), 'utf8');
const gallery = readFileSync(join(root, 'player/gallery.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// 1. No debug labels in the hero render path.
check('player has no fillText/strokeText', !/fillText|strokeText/.test(player));
check('player has no THOR/ZEUS literals', !/THOR|ZEUS/.test(player));

// 2. Board cards render mini-scenes, not flat swatches.
check('gallery renders mini-scene svg', /<svg|createElementNS/.test(gallery) || gallery.includes('svg'));

// 3. Caption band never paints empty: boot HTML + draw() fallback.
{
  const boot = html.match(/id="captionLine"[^>]*>([^<]*)</);
  check('caption boot text non-empty', !!boot && boot[1].trim().length > 0, boot ? boot[1].trim().slice(0, 40) : 'missing');
  check('player draw() has beat-title fallback', player.includes("beat.title") && player.includes('the storm holds'));
}

// 4. paintArena typed error on null/bad ctx.
{
  let msg = '';
  try {
    paintArena(null, 'seed', 1, { id: 'b01', storm: 1, start: 0, dur: 10 },
      { sky: '#000', wash: '#111', sea: '#222', ridge: '#333' });
  } catch (e) { msg = String(e && e.message); }
  check('paintArena null-ctx typed error', msg === 'paintArena needs a canvas 2d context', msg);
}

// 5. Fixture loaders fail with one-line actionable errors (exit 1, no stack).
// Run from repo root so the tools resolve mythduel/story relatively.
for (const tool of ['mythduel/tools/capture.mjs', 'mythduel/tools/render.mjs']) {
  try {
    execFileSync('node', [tool, '--bogus-flag-xyz'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    check(tool + ' unknown flag exits non-zero', false, 'exited 0');
  } catch (e) {
    const err = String((e && e.stderr) || '');
    check(tool + ' unknown flag exits 2', e.status === 2, 'exit ' + e.status);
    check(tool + ' unknown flag one-line stderr', err.trim().split('\n').length <= 2 && /Unknown|Usage|unknown/i.test(err), err.trim().slice(0, 80));
  }
}

// 6. Plates pin all 5 storm grades; manifest agrees.
{
  const plates = capturePlates();
  const grades = new Set(plates.map((p) => p.grade));
  check('plates pin 5 grades', plates.length === 5 && grades.size === 5, [...grades].join(','));
  const m = stillsManifest();
  check('manifest pins 5 plates', m.plates.length === 5, String(m.plates.length));
}

// 7. Audit header states the true gate count.
{
  const audit = readFileSync(join(root, 'tools/audit.mjs'), 'utf8');
  check('audit header states 48 gates', audit.includes('48 binding gates'), 'header gate count');
}

console.log(failed === 0 ? 'TESTER FIXER-REMEDIES GREEN' : 'TESTER FIXER-REMEDIES RED: ' + failed + ' failures');
process.exit(failed === 0 ? 0 : 1);
