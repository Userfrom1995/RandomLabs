// Mythduel QC-fix regression suite (Tester, Phase 1 re-test, Refs #470).
//
// Pins the five Quality Council remedies so they cannot regress:
// V1 - theatre user strings show "Beat k of N", never internal ids (b01..).
// V2 - 390px tuning present (.big-play scaled, dedicated 390px query).
// V3 - gallery scroll branches on prefers-reduced-motion (auto vs smooth).
// V4 - capture/render/render-captions honor --help (exit 0) and reject
//      unknown flags on stderr with exit 2, without side effects.
// V5 - vttStamp guards non-finite input (NaN/Infinity -> 00:00.000).
// Pure node, no network, no wall-clock: exits 0 green, 1 red.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { vttStamp } from '../tools/render-captions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
const galleryJs = readFileSync(join(root, 'player/gallery.js'), 'utf8');
const playerCss = readFileSync(join(root, 'player/player.css'), 'utf8');

// V1: user-visible strings use positional "Beat k of N"; beat.id only for lookup/dataset.
check('V1 player.js positional beat title', playerJs.includes("'Beat ' + beatPos + ' of '"));
check('V1 gallery.js positional beat title', galleryJs.includes("'Beat ' + pos + ' of '"));
{
  // No textContent assignment may embed an internal beat id literal.
  const leaky = [...playerJs.matchAll(/textContent\s*=[^\n]*\bbeat\.id\b/g)];
  const galleryLeaky = [...galleryJs.matchAll(/textContent\s*=[^\n]*\bp\.beat\b/g)];
  check('V1 no beat.id in textContent (player.js)', leaky.length === 0, String(leaky.length));
  check('V1 no p.beat in textContent (gallery.js)', galleryLeaky.length === 0, String(galleryLeaky.length));
}

// V2: small-viewport craft - big-play scaled down, dedicated 390px query.
check('V2 big-play scaled under breakpoint', /@media[^{]*max-width:\s*480px[\s\S]*?\.big-play\s*\{\s*width:\s*56px/.test(playerCss));
check('V2 dedicated 390px query', /@media\s*\(\s*max-width:\s*390px\s*\)/.test(playerCss));
check('V2 big-play 48px at 390px', /max-width:\s*390px[\s\S]*?\.big-play\s*\{\s*width:\s*48px/.test(playerCss));

// V3: reduced-motion branch for gallery scroll.
check('V3 gallery branches on prefers-reduced-motion', galleryJs.includes('prefers-reduced-motion') && galleryJs.includes("reduced ? 'auto' : 'smooth'"));

// V4: argv contract on all three tools.
for (const tool of ['tools/capture.mjs', 'tools/render.mjs', 'tools/render-captions.mjs']) {
  let helpExit = -1;
  try { execFileSync(process.execPath, [join(root, tool), '--help'], { cwd: root, stdio: 'pipe' }); helpExit = 0; }
  catch (e) { helpExit = e.status ?? -1; }
  check('V4 ' + tool + ' --help exits 0', helpExit === 0, 'exit ' + helpExit);
  let bogusExit = -1;
  let bogusErr = '';
  try { execFileSync(process.execPath, [join(root, tool), '--bogus'], { cwd: root, stdio: 'pipe' }); bogusExit = 0; }
  catch (e) { bogusExit = e.status ?? -1; bogusErr = String(e.stderr || ''); }
  check('V4 ' + tool + ' --bogus exits 2', bogusExit === 2, 'exit ' + bogusExit);
  check('V4 ' + tool + ' --bogus writes stderr', bogusErr.length > 0);
}
// V4 side-effect guard: render-captions --bogus must not rewrite captions.vtt.
{
  const before = createHash('sha256').update(readFileSync(join(root, 'captions.vtt'))).digest('hex');
  try { execFileSync(process.execPath, [join(root, 'tools/render-captions.mjs'), '--bogus'], { cwd: root, stdio: 'pipe' }); } catch { /* expect exit 2 */ }
  const after = createHash('sha256').update(readFileSync(join(root, 'captions.vtt'))).digest('hex');
  check('V4 render-captions --bogus leaves captions.vtt untouched', before === after);
}

// V5: vttStamp finite guard.
check('V5 vttStamp(NaN) clamps', vttStamp(NaN) === '00:00.000', vttStamp(NaN));
check('V5 vttStamp(Infinity) clamps', vttStamp(Infinity) === '00:00.000', vttStamp(Infinity));
check('V5 vttStamp(-Infinity) clamps', vttStamp(-Infinity) === '00:00.000', vttStamp(-Infinity));
check('V5 vttStamp(1.5) exact', vttStamp(1.5) === '00:01.500', vttStamp(1.5));
check('V5 vttStamp(0) exact', vttStamp(0) === '00:00.000', vttStamp(0));

if (failed) {
  console.error('QC-FIX RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('QC-FIX GREEN: all Quality Council remedy pins hold');
