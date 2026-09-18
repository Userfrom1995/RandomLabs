// M3 audit: static gates for the audio plus persistence milestone. Checks
// module presence plus pinned exports, shell testid coverage for the new
// Audio and Saves panels, the unlock-gated scheduling rule (no SFX or music
// voice schedules before a gesture), persistence path coverage, and the
// no-em-dash plus sealed-pin guards. Exits non-zero on any failure.
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

const audioFiles = [
  'src/audio/wadAudio.js',
  'src/audio/mus2mid.js',
  'src/audio/sfxCache.js',
  'src/audio/sfxEngine.js',
  'src/audio/mixer.js',
  'src/audio/audioUnlock.js',
  'src/audio/musicEngine.js',
];
for (const f of audioFiles) check(`audio module present: ${f}`, existsSync(join(root, f)));

const storageFiles = [
  'src/storage/provider.js',
  'src/storage/storage-opfs.js',
  'src/storage/storage-idb.js',
  'src/storage/storage-local.js',
  'src/storage/saves.js',
  'src/storage/saveBundle.js',
];
for (const f of storageFiles) check(`storage module present: ${f}`, existsSync(join(root, f)));

const html = read('index.html');
for (const id of [
  'audio-enable', 'audio-status', 'vol-master', 'vol-sfx', 'vol-music', 'mute-all',
  'save-slot', 'btn-save', 'btn-load', 'btn-save-delete', 'btn-export',
  'save-import', 'save-status', 'slots-list',
]) {
  check(`shell testid present: ${id}`, html.includes(`id="${id}"`));
}
check('audio panel labelled', html.includes('aria-label="Audio"'));
check('saves panel labelled', html.includes('aria-label="Saved games"'));
check('native range inputs for volumes', (html.match(/type="range"/g) || []).length >= 3);

const app = read('app.js');
// Unlock gate: fire path and music path both consult the unlock machine.
check('fire SFX gated on trySchedule', app.includes('unlock.trySchedule()'));
check('music start requires canSchedule', app.includes('unlock.canSchedule()'));
check('gesture entry via Enable audio', app.includes("getElementById('btn-audio-enable')") || app.includes("$('btn-audio-enable')"));
check('mixer graph built once inside gesture path', app.includes('buildMixerGraph(audioCtx, mixer)'));
// Persistence: ladder order OPFS -> IDB -> local -> memory.
const ladder = app.indexOf('createOpfsProvider()');
check('ladder starts with OPFS', ladder !== -1
  && app.indexOf('createIdbProvider()') > ladder
  && app.indexOf('createLocalProvider(store)') > app.indexOf('createIdbProvider()'));
check('debounced writes plus pagehide flush', app.includes('writeSoon(PATHS.progression') && app.includes("pagehide'") !== false);
check('progression resume honored', app.includes('resumeMapPref'));
check('bundle export names versioned file', app.includes('doom-save-bundle-v1.json'));
check('import rejects whole on bad bundle', app.includes('Nothing was changed'));

// Sealed pins from M1/M2 stay intact.
check('boot header pin intact', app.includes('async function boot(wadBytes, label) {'));
check('no em dashes in app shell', !app.includes(String.fromCharCode(8212)));
check('no em dashes in index shell', !html.includes(String.fromCharCode(8212)));

// Golden constants pinned in source.
const wad = read('src/audio/wadAudio.js');
check('DMX format constant 3', wad.includes('DMX_FORMAT_PCM = 3'));
const mus = read('src/audio/mus2mid.js');
check('MUS 140 Hz plus division 70', mus.includes('MUS_HZ = 140') && mus.includes('MIDI_DIVISION = 70'));
const eng = read('src/audio/sfxEngine.js');
check('8 voices, 200/1200 distances', eng.includes('SFX_VOICES = 8') && eng.includes('SFX_CLOSE_DIST = 200') && eng.includes('SFX_CLIP_DIST = 1200'));
const pro = read('src/storage/provider.js');
check('6 save slots pinned', pro.includes('SAVE_SLOTS = 6'));
check('ladder races tier probes with timeout', pro.includes('probeTimeoutMs') && pro.includes('Promise.race'));
check('opfs carries a round-trip probe', read('src/storage/storage-opfs.js').includes('async probe()'));
check('idb carries a round-trip probe', read('src/storage/storage-idb.js').includes('async probe()'));
check('wad cache races wedged backends with timeout', read('src/storage/wad-cache.js').includes('CACHE_TIMEOUT_MS'));
const bun = read('src/storage/saveBundle.js');
check('bundle format v1 pinned', bun.includes("BUNDLE_FORMAT = 'doom-save-bundle'") && bun.includes('BUNDLE_VERSION = 1'));

// Docs: scoreboard carries the M3 ledger, research spec untouched.
const score = read('docs/scoreboard.md');
check('scoreboard has M3 ledger', score.includes('M3 ledger') && score.includes('H5'));

console.log(`\naudit-m3: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
