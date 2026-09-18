// M5 audit: static gates for the integration and end-to-end audit
// milestone. Checks module presence plus pinned exports, the bench-m5.json
// cell schema (every H-cell resolved, no bare pending rows, ECO 4/4 pass),
// the two M5 shell fixes (stored tier override, stale-status restore), the
// M5 docs plus proofs, and the no-em-dash plus sealed-pin guards from
// M1-M4. Exits non-zero on any failure.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const EMDASH = String.fromCharCode(8212);
let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL: ${name}`);
  }
};

for (const f of [
  'src/perf/m5gates.js',
  'tools/cdp-m5.mjs',
  'tools/capture-m5.mjs',
  'tools/bench-m5.mjs',
  'tests/test-m5-integration.mjs',
  'docs/bench-m5.json',
  'docs/render-m5.md',
  'docs/shell-m5-1280.png',
  'docs/shell-m5-390.png',
]) {
  check(`M5 artifact present: ${f}`, existsSync(join(root, f)));
}

// Gate verdicts pinned in source.
const gates = read('src/perf/m5gates.js');
check('frame budget 1000/60', gates.includes('FRAME_BUDGET_MS = 1000 / 60'));
check('four cell states', gates.includes("'MEASURED',") && gates.includes("'SATURATION_COLLAPSE',")
  && gates.includes("'UNSUPPORTED_BY_DESIGN',") && gates.includes("'INVALID_SPECIFICATION'"));
check('four TTFF bands', gates.includes('broadband:') && gates.includes('solid4g:')
  && gates.includes('weak4g:') && gates.includes('warm:'));
for (const fn of ['classifyTTFF', 'summarizeTTFF', 'evaluateFrameTrace', 'compareRenderPaths',
  'ingestVerdict', 'corruptVerdict', 'onboardingVerdict', 'audioUnlockVerdict', 'savePersistVerdict']) {
  check(`gate export present: ${fn}`, gates.includes(`export function ${fn}`));
}

// CDP driver is dependency-free (Node built-ins only).
const cdp = read('tools/cdp-m5.mjs');
check('cdp uses global WebSocket', cdp.includes('new WebSocket('));
check('cdp spawns system chromium', cdp.includes('CHROME_BIN'));
check('cdp serves the repo root', cdp.includes('startServer'));
check('no npm imports in cdp driver', !cdp.includes("from 'playwright") && !cdp.includes('puppeteer'));

// bench-m5.json: every cell resolved, no bare pending rows.
const bench = JSON.parse(read('docs/bench-m5.json'));
const cells = bench.cells || {};
for (const k of ['H1', 'H2browser', 'H3', 'H4', 'H5', 'ecosystem']) {
  check(`bench cell present: ${k}`, !!cells[k]);
  check(`bench cell resolved: ${k}`, !!cells[k] && ['MEASURED', 'SATURATION_COLLAPSE', 'UNSUPPORTED_BY_DESIGN', 'INVALID_SPECIFICATION'].includes(cells[k].state));
}
check('no pending rows in bench json', !JSON.stringify(bench).includes('pending'));
check('H1 zero dropped vsyncs', cells.H1 && cells.H1.pooled && cells.H1.pooled.droppedVsyncs === 0);
check('H4 cold within broadband', cells.H4 && cells.H4.cold && cells.H4.cold.within === true);
check('H4 warm within warm band', cells.H4 && cells.H4.warm && cells.H4.warm.within === true);
const eco = cells.ecosystem || {};
for (const k of ['ingest', 'corrupt', 'onboarding', 'save']) {
  check(`ecosystem passes: ${k}`, !!eco[k] && !!eco[k].verdict && eco[k].verdict.pass === true);
}

// M5 shell fixes pinned in source.
const app = read('app.js');
check('boot honors stored doom-tier', app.includes("store.getItem('doom-tier')") && app.includes('/^[0-4]$/'));
check('selector reflects stored tier', app.includes("store.getItem('doom-tier') || 'auto'"));
check('reject paths restore the running status', app.includes('restoreRunningStatus()'));
const html = read('index.html');
check('inline favicon kills the 404', html.includes('rel="icon" href="data:,"'));
check('m5 scope section present', html.includes('Milestone 5 scope'));

// M4 sealed strings intact.
check('m4 scope text intact', html.includes('WAD ecosystem and polish'));
check('old M3 scope text still gone', !html.includes('WAD ecosystem polish (M4) is the next milestone'));

// Scoreboard carries the M5 ledger.
const score = read('docs/scoreboard.md');
check('scoreboard has M5 ledger', score.includes('M5 ledger') && score.includes('bench-m5.json'));
check('scoreboard resolves H1-H5', score.includes('H1 ') && score.includes('H5 '));

// No em dashes anywhere in the M5 surface.
for (const f of ['src/perf/m5gates.js', 'tools/cdp-m5.mjs', 'tools/capture-m5.mjs',
  'tools/bench-m5.mjs', 'tests/test-m5-integration.mjs', 'tools/audit-m5.mjs',
  'docs/render-m5.md', 'docs/scoreboard.md', 'app.js', 'index.html']) {
  check(`no em dashes in ${f}`, !read(f).includes(EMDASH));
}

// Sealed pins from M1-M4 stay intact.
check('boot header pin intact', app.includes('async function boot(wadBytes, label) {'));
check('droppedLines import-surface pin intact', app.includes("droppedLines, ONBOARDED_KEY } from './src/ui/shellStates.js'"));
check('ladder still starts with OPFS', app.includes('createOpfsProvider()'));
check('unlock gate intact', app.includes('unlock.trySchedule()'));
check('sw version still m4 (untouched in M5)', read('sw.js').includes("VERSION = 'doom-m4-v1'"));
check('loadout version pinned', read('src/wad/loadout.js').includes('LOADOUT_VERSION = 1'));

console.log(`\naudit-m5: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
