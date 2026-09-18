// M4 audit: static gates for the WAD ecosystem and polish milestone.
// Checks module presence plus pinned exports, shell testid coverage for
// onboarding/load-order/loading/error states, load-order wiring in app.js
// (merge, isolation, clamp, error-resume), the service-worker offline pass
// (version bump plus WAD-cache preservation), and the no-em-dash plus
// sealed-pin guards. Exits non-zero on any failure.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
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

for (const f of ['src/wad/loadout.js', 'src/ui/shellStates.js']) {
  check(`M4 module present: ${f}`, existsSync(join(root, f)));
}

const html = read('index.html');
for (const id of [
  'onboard-panel', 'btn-sample-load', 'btn-sample-download', 'btn-onboard-dismiss',
  'wad-order', 'wad-clamp', 'dehacked-note', 'wad-loading', 'wad-error',
]) {
  check(`M4 shell id present: ${id}`, html.includes(`id="${id}"`));
}
check('wad error box is an alert', html.includes('id="wad-error"') && html.includes('role="alert"'));
check('loading line is live', html.includes('id="wad-loading"') && html.includes('aria-live="polite"'));
check('onboard panel labelled', html.includes('aria-label="Getting started"'));
check('m4 scope section names ecosystem', html.includes('WAD ecosystem and polish'));
check('old M3 scope text gone', !html.includes('WAD ecosystem polish (M4) is the next milestone'));

const app = read('app.js');
// Load-order pipeline: stage, merge, isolate, assemble, precache, boot.
check('ingest stages files in order', app.includes('wadSet.filter') && app.includes('.concat([{ name: file.name, bytes }])'));
check('ingest merges via buildLoadout', app.includes('buildLoadout(staged)'));
check('ingest isolates via probeMaps', app.includes('probeMaps(merged)'));
check('ingest assembles merged bytes', app.includes('assembleWad(layout.merged'));
check('no bootable maps keeps the running level', app.includes('The current level keeps running'));
check('boot failure resumes the previous loop', app.includes('if (hadEngine) setPaused(false)'));
check('removeWad rebuilds survivors', app.includes('async function removeWad(name)'));
check('map select reads merged bytes first', app.includes('mergedBytesCurrent ||'));
check('shareware clamp filters the map list', app.includes('mapPassesClamp'));
check('clamp note rendered', app.includes("Shareware WAD detected: map list clamps to Episode 1."));
check('onboarding dismiss persists', app.includes('ONBOARDED_KEY') && app.includes("getItem(ONBOARDED_KEY)"));
check('sample download names a .wad file', app.includes("sample-level.wad"));
check('loading line paints before parse', app.includes('paintLoading()') && app.includes('requestAnimationFrame'));
check('shell state resolver drives onboarding', app.includes("resolveShellState({"));
check('DEHACKED surfaced, never applied', app.includes('renderDehacked(findDehacked('));
check('droppedLines imported from shellStates (import-surface pin)', app.includes("droppedLines, ONBOARDED_KEY } from './src/ui/shellStates.js'"));

// Service worker offline pass.
const sw = read('sw.js');
check('sw version bumped to m4', sw.includes("VERSION = 'doom-m4-v1'"));
check('sw preserves the WAD cache', sw.includes("startsWith('doom-m')") && sw.includes('doom-wad-v1'));

// Loadout golden constants pinned in source.
const lo = read('src/wad/loadout.js');
check('loadout version pinned', lo.includes('LOADOUT_VERSION = 1'));
check('five required map lumps', lo.includes("REQUIRED_MAP_LUMPS = ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SECTORS']"));
check('doom2 family note', lo.includes('Doom 2 family markers'));
check('dehacked never applied note', lo.includes('never applied'));
check('no em dashes in loadout', !lo.includes(String.fromCharCode(8212)));
const shell = read('src/ui/shellStates.js');
check('five shell states pinned', shell.includes("'loading', 'onboarding', 'ready', 'ready-warnings', 'error'"));
check('no em dashes in shellStates', !shell.includes(String.fromCharCode(8212)));

// Sealed pins from M1/M2/M3 stay intact.
check('boot header pin intact', app.includes('async function boot(wadBytes, label) {'));
check('ladder still starts with OPFS', app.includes('createOpfsProvider()'));
check('unlock gate intact', app.includes('unlock.trySchedule()'));
check('no em dashes in app shell', !app.includes(String.fromCharCode(8212)));
check('no em dashes in index shell', !html.includes(String.fromCharCode(8212)));
check('no em dashes in sw', !sw.includes(String.fromCharCode(8212)));

// M4 tests exist and the shell CSS covers the new states.
check('m4 test suite present', existsSync(join(root, 'tests/test-m4-ecosystem.mjs')));
const css = read('theme.css');
check('onboard highlight styled', css.includes('#onboard-panel'));
check('wad error styled', css.includes('#wad-error'));
check('loading pulse respects reduced motion', css.includes('prefers-reduced-motion'));

console.log(`\naudit-m4: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
