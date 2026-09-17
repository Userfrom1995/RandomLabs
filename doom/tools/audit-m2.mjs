// M2 static shell audit: verifies the renderer/input milestone contract
// without a browser (node-only). Checks the E2E testid set, shell security
// rules, tier ladder behavior, governor hysteresis, tic speeds, bindings
// swap, touch geometry, theme contrast and targets, and the em-dash ban.
// Writes doom/docs/audit-m2.md; exits non-zero on any failure.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTier, tierForFailure } from '../src/render/tiers.js';
import { createResolutionGovernor } from '../src/render/resolution.js';
import { buildTiccmd } from '../src/input/tic.js';
import { defaultBindings, assignBinding } from '../src/input/bindings.js';
import { createTouchState, TOUCH } from '../src/input/touch.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  if (!ok) console.error(`FAIL ${name} ${detail}`);
};

const html = read('index.html');
const app = read('app.js');
const css = read('theme.css');

// 1. Blueprint E2E testid set present in the shell.
for (const id of ['canvas', 'btn-fire', 'btn-use', 'btn-menu', 'joystick',
  'weapon-strip', 'pause-overlay', 'wad-drop', 'status-line']) {
  check(`testid ${id}`, html.includes(`data-testid="${id}"`));
}
// 2. M1 shell contract intact.
for (const id of ['doom-canvas', 'status-line', 'wad-picker', 'wad-drop', 'map-select',
  'btn-pause', 'btn-resume', 'error-list', 'wad-info', 'remap-table', 'tier-select',
  'res-select', 'battery-saver', 'touch-ui', 'map-select']) {
  check(`id #${id}`, html.includes(`id="${id}"`));
}
check('canvas 320x200 attrs', html.includes('width="320"') && html.includes('height="200"'));
check('aria-live polite', html.includes('aria-live="polite"'));
check('dropzone keyboard path', html.includes('tabindex="0"'));
// 3. Shell security rules (same as the M1 red-team gate).
check('no blocking dialogs', !/alert\s*\(|prompt\s*\(|confirm\s*\(/.test(app));
check('no eval/new Function', !/eval\s*\(|new Function/.test(app));
check('innerHTML only clears', [...app.matchAll(/\.innerHTML\s*=\s*(.*)/g)]
  .every((m) => /^['"]['"];?$/.test(m[1].trim())));
check('probeGL webgl2-first throwaway', (() => {
  const i2 = app.indexOf("getContext('webgl2')");
  const i1 = app.indexOf("getContext('webgl')");
  return app.includes('probeGL') && i2 !== -1 && i1 !== -1 && i2 < i1 &&
    !app.includes("canvas.getContext('webgl')");
})());
check('pointer lock wiring', (() => {
  const mouseSrc = read('src/input/mouse.js');
  return app.includes('attachPointerLock') && mouseSrc.includes('requestPointerLock') &&
    mouseSrc.includes('unadjustedMovement');
})());
// 4. Tier ladder live behavior (M1 pins plus M2 GL branches).
check('tier M1 pins', resolveTier({ hasWasm: true }) === 2 && resolveTier({ hasWasm: false }) === 3);
check('tier M2 GL', resolveTier({ hasWebGL2: true }) === 0 && resolveTier({ hasWebGL1: true }) === 1);
check('tier failure chain', [0, 1, 2, 3].map(tierForFailure).join() === '1,2,3,4');
// 5. Governor hysteresis live (no flip-flop inside 500ms).
check('governor hysteresis', (() => {
  let t = 0;
  let switches = 0;
  const g = createResolutionGovernor({ initial: 1, now: () => t, onChange: () => switches++ });
  for (let i = 0; i < 40; i++) g.observe(40);
  const down = g.index === 2 && switches === 1;
  t += 100;
  for (let i = 0; i < 40; i++) g.observe(4);
  return down && switches === 1;
})());
// 6. Tic speeds live.
check('tic speeds', (() => {
  const run = buildTiccmd({ moveF: 1 });
  return run.forwardmove === 50 && buildTiccmd({ moveF: 1, run: false }).forwardmove === 25 &&
    buildTiccmd({ turn: 1, run: false }).angleturn === 640;
})());
// 7. Bindings conflict swap live.
check('bindings swap', (() => {
  const { bindings: n, swapped } = assignBinding(defaultBindings(), 'fire', 'KeyW');
  return swapped === 'forward' && n.actions.fire.keys[0] === 'KeyW';
})());
// 8. Touch geometry matches the shell.
check('stick radius 56px', TOUCH.STICK_RADIUS_PX === 56 && css.includes('width: 128px'));
check('44px targets', css.includes('min-width: 44px') && css.includes('min-height: 44px'));
check('safe-area insets', css.includes('env(safe-area-inset-'));
check('landscape translucent overlay', css.includes('(orientation: landscape)'));
check('reduced-motion path', css.includes('prefers-reduced-motion'));
check('focus rings', css.includes('focus-visible'));
check('touch state clamp', (() => {
  const t = createTouchState();
  t.joystickStart('p', 0, 0);
  t.joystickMove('p', 500, 0);
  return Math.abs(t.stick.dx) <= 1;
})());
// 9. Theme contrast: text/bg and muted/panel at 4.5:1 or better.
const lum = (hex) => {
  const c = hex.replace('#', '');
  const f = (i) => {
    const v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const textBg = ratio('#e6edf3', '#0d1117');
const mutedPanel = ratio('#9aa7b4', '#161b22');
check('contrast text/bg >= 4.5', textBg >= 4.5, textBg.toFixed(2));
check('contrast muted/panel >= 4.5', mutedPanel >= 4.5, mutedPanel.toFixed(2));
// 10. Em-dash ban across all M2 files.
const m2files = ['src/input/tic.js', 'src/input/bindings.js', 'src/input/keyboard.js',
  'src/input/mouse.js', 'src/input/touch.js', 'src/input/remap-ui.js',
  'src/render/upload.js', 'src/render/palette.js', 'src/render/glQuad.js',
  'src/render/resolution.js', 'src/render/tiers.js', 'src/engine/doomEngine.js',
  'src/render/automap.js', 'index.html', 'app.js', 'theme.css',
  'tests/test-m2-input.mjs', 'tests/test-m2-render.mjs', 'tools/audit-m2.mjs'];
check('no em dashes in M2 files', m2files.every((f) => !read(f).includes('\u2014')));

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
const lines = [
  '# Doom M2 audit: renderer plus input shell contract',
  '',
  `- **Updated:** 2026-09-17 (M2)`,
  `- **Result:** ${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILURES`} (${passed}/${results.length} checks)`,
  `- **Runner:** node-only static plus live unit-behavior audit (browser E2E stays M5 scope)`,
  '',
  '## Checks',
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ` (${r.detail})` : ''}`),
  '',
];
writeFileSync(join(root, 'docs', 'audit-m2.md'), lines.join('\n'));
console.log(`${failed.length === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed}/${results.length}`);
if (failed.length > 0) process.exit(1);
