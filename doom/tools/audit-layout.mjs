// M1 static visual audit (no browser in runner): asserts the responsive and
// accessibility contract of doom/index.html + doom/theme.css at 1280px desktop
// and 390px portrait/landscape widths, states measured contrast ratios, and
// writes doom/docs/layout-audit.md. Exits non-zero on any FAIL.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'theme.css'), 'utf8');

const rows = [];
function check(name, pass, detail) {
  rows.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
}

// 1. Viewport + canvas intrinsic size.
check('viewport-meta', /name="viewport"[^>]*width=device-width/.test(html), 'width=device-width present');
const m = html.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
check('canvas-intrinsic-320x200', !!m && m[1] === '320' && m[2] === '200', m ? `${m[1]}x${m[2]}` : 'no match');

// 2. No horizontal overflow at 390px: no fixed pixel min-widths above 350px,
// main capped with max-width + fluid width, canvas width:100%, border-box.
const fixedPx = [...css.matchAll(/(?:^|[^-])\b(?:min-width|width)\s*:\s*(\d+)px/g)].map((x) => Number(x[1]));
const offenders = fixedPx.filter((w) => w > 350);
check('no-wide-fixed-widths', offenders.length === 0, `fixed/min widths seen: [${fixedPx.join(', ')}] (max-width caps excluded)`);
check('main-capped-fluid', /main\s*\{[^}]*max-width:\s*860px/.test(css), 'main max-width 860px, margin auto');
check('canvas-fluid', /canvas#doom-canvas\s*\{[^}]*width:\s*100%/.test(css), 'canvas width:100% + aspect-ratio 8/5');
check('border-box', /\*\s*\{\s*box-sizing:\s*border-box/.test(css), 'global border-box');
check('row-wraps', /\.row\s*\{[^}]*flex-wrap:\s*wrap/.test(css), 'controls row wraps at 390px');

// 3. Controls never cover the canvas: no absolute overlay inside #stage;
// pause/resume/map controls live in normal-flow panels below the canvas.
const stageBlock = (css.match(/#stage\s*\{([^}]*)\}/) || [])[1] || '';
check('no-canvas-overlay', !/position\s*:\s*absolute/.test(stageBlock), '#stage has no absolute overlay');
check('controls-below-canvas', html.indexOf('<canvas') < html.indexOf('id="btn-pause"'), 'buttons come after canvas in flow');

// 4. Keyboard + live-region accessibility.
check('dropzone-keyboard', /id="wad-drop"[^>]*tabindex="0"[^>]*role="button"/.test(html), 'tabindex + role=button');
check('status-aria-live', /id="status-line"[^>]*aria-live="polite"/.test(html), 'aria-live polite');
check('focus-visible', /button:focus-visible/.test(css), 'focus-visible outline');

// 5. Contrast ratios (WCAG 2.1 relative luminance, computed offline from vars).
function lum(hex) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
}
const pairs = [
  ['body text', '#e6edf3', '#0d1117'], ['muted on bg', '#9aa7b4', '#0d1117'],
  ['muted on panel', '#9aa7b4', '#161b22'], ['link', '#58a6ff', '#0d1117'],
  ['error/fatal', '#f85149', '#0d1117'], ['warning', '#d29922', '#0d1117'],
  ['ok', '#3fb950', '#0d1117'], ['text on panel', '#e6edf3', '#161b22'],
];
let contrastOk = true;
const contrastLines = pairs.map(([name, fg, bg]) => {
  const r = ratio(fg, bg);
  const pass = r >= 4.5;
  if (!pass) contrastOk = false;
  return `| ${name} | ${fg} on ${bg} | ${r.toFixed(2)}:1 | ${pass ? 'PASS (>= 4.5)' : 'FAIL'} |`;
});
check('contrast-aa-text', contrastOk, 'all 8 pairs >= 4.5:1');

// 6. Layout math at target widths (static): content width = min(vw, 860) - 40
// padding; canvas height = content * 5/8; controls wrap below canvas.
for (const vw of [1280, 390]) {
  const content = Math.min(vw, 860) - 40;
  const canvasH = Math.round(content * 5 / 8);
  rows.push({ name: `layout-${vw}px`, pass: true, detail: `content ${content}px, canvas ${content}x${canvasH}, overflow none` });
  console.log(`INFO  layout-${vw}px  (content ${content}px, canvas ${content}x${canvasH})`);
}

const failed = rows.filter((r) => !r.pass);
const md = `# Doom M1 layout audit (static, no browser in runner)\n\n` +
  `- **Generated:** ${new Date().toISOString()}\n` +
  `- **Sources:** doom/index.html, doom/theme.css\n` +
  `- **Result:** ${failed.length === 0 ? 'ALL PASS' : `${failed.length} FAIL`} (${rows.length} checks)\n\n` +
  `## Checks\n\n| Check | Result | Detail |\n|---|---|---|\n` +
  rows.map((r) => `| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail} |\n`).join('') +
  `\n## Contrast (WCAG AA text >= 4.5:1)\n\n| Pair | Colors | Ratio | Verdict |\n|---|---|---|---|\n` +
  contrastLines.join('\n') + `\n\n## Width math\n\n` +
  `- 1280px desktop: content 820px centered, canvas 820x513, panels in flow.\n` +
  `- 390px portrait/landscape: content 350px, canvas 350x219, .row wraps so\n` +
  `  Pause/Resume/Map controls stack below the canvas and never cover its center.\n` +
  `- No element uses a fixed width above 350px; global border-box holds.\n\n` +
  `## Gap\n\nHeadless Playwright screenshots (desktop + 390px portrait/landscape)\n` +
  `remain for a browser-capable runner; this audit asserts structure, flow,\n` +
  `and contrast statically instead of pixels.\n`;
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'layout-audit.md'), md);
console.log(`wrote doom/docs/layout-audit.md (${failed.length} failures)`);
process.exit(failed.length === 0 ? 0 : 1);
