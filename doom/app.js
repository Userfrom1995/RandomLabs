// M4 boot: tier-aware presenter (WebGL paletted -> RGBA -> Canvas2D),
// 35 Hz ticcmd pipeline (keyboard + Pointer Lock mouse + touch overlay),
// resolution ladder with battery saver, persisted remapping, WebAudio SFX
// plus FM music behind a gesture unlock, OPFS/IDB/local save persistence,
// and the multi-WAD loadout (load order, per-map isolation, onboarding).
import { buildDemoWad } from './tools/make-demo-wad.mjs';
import { buildLoadout, assembleWad, probeMaps, identifyWad, findDehacked, describeLoadOrder, describeDehacked } from './src/wad/loadout.js';
import { resolveShellState, loadingLine, emptyLoadOrderLine, droppedLines, ONBOARDED_KEY } from './src/ui/shellStates.js';
import { initEngine } from './src/engine/doomEngine.js';
import { createLoop } from './src/core/loop.js';
import { createPresenter } from './src/render/present2d.js';
import { probeCapabilities, resolveTier, tierForFailure } from './src/render/tiers.js';
import { createGLPresenter, GlUnavailable } from './src/render/glQuad.js';
import { chooseUploadFormat } from './src/render/upload.js';
import { LADDER, createResolutionGovernor, initialStepIndex } from './src/render/resolution.js';
import { buildTiccmd } from './src/input/tic.js';
import { defaultBindings, loadBindings, saveBindings, resetBindings, BINDINGS_KEY } from './src/input/bindings.js';
import { createKeyState, sampleToInput, attachKeyboard } from './src/input/keyboard.js';
import { createMouseLook, pixelsToAngleTurn, attachPointerLock } from './src/input/mouse.js';
import { createTouchState, shouldShowTouchOverlay } from './src/input/touch.js';
import { renderRemapTable } from './src/input/remap-ui.js';
import { precacheWad, loadCachedWad } from './src/storage/wad-cache.js';
import { parseWadDirectory, lumpBytes } from './src/wad/index.js';
import { musToMidi } from './src/audio/mus2mid.js';
import { createSfxCache } from './src/audio/sfxCache.js';
import { createSfxEngine, renderSfxFrame } from './src/audio/sfxEngine.js';
import { createMixer, buildMixerGraph, applyMixerGraph } from './src/audio/mixer.js';
import { createAudioUnlock } from './src/audio/audioUnlock.js';
import { createMusicEngine } from './src/audio/musicEngine.js';
import { selectProvider, createMemoryProvider, PATHS } from './src/storage/provider.js';
import { createOpfsProvider } from './src/storage/storage-opfs.js';
import { createIdbProvider } from './src/storage/storage-idb.js';
import { createLocalProvider } from './src/storage/storage-local.js';
import { createSaveManager, captureEngine, restoreEngine } from './src/storage/saves.js';
import { exportBundle, serializeBundle, parseBundle, applyBundle } from './src/storage/saveBundle.js';

const $ = (id) => document.getElementById(id);
const status = (msg) => { $('status-line').textContent = msg; };
const notice = (msg) => { $('remap-notice').textContent = msg; };

function storageBackend() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItem: (k) => window.localStorage.getItem(k),
        setItem: (k, v) => window.localStorage.setItem(k, v),
        removeItem: (k) => window.localStorage.removeItem(k),
      };
    }
  } catch { /* storage blocked */ }
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, v); },
    removeItem: (k) => { mem.delete(k); },
  };
}
const store = storageBackend();

function loadVideoPrefs() {
  try {
    const raw = store.getItem('doom-video');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        res: p.res === undefined ? 'auto' : p.res,
        battery: !!p.battery,
      };
    }
  } catch { /* fall through */ }
  return { res: 'auto', battery: false };
}

function saveVideoPrefs(prefs) {
  try { store.setItem('doom-video', JSON.stringify(prefs)); } catch { /* ignore */ }
}

// M4 loadout state: ordered in-memory file set (base first, patches in
// drop order) plus the last assembled boot bytes. The set is session
// scoped; the assembled result persists through the WAD cache.
let wadSet = [];
let mergedBytesCurrent = null;
let shellFatal = null;

function showFatal(msg) {
  shellFatal = msg;
  $('wad-error').textContent = msg || '';
}

function setLoading(fileName) {
  const line = fileName ? loadingLine(fileName) : '';
  $('wad-loading').textContent = line;
  $('status-line').setAttribute('aria-busy', fileName ? 'true' : 'false');
  if (fileName) status(line);
}

// Paint one frame so the loading line actually appears before the
// (synchronous) parse + assemble + boot work below it.
function paintLoading() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function renderWadOrder() {
  const ol = $('wad-order');
  ol.textContent = '';
  if (wadSet.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyLoadOrderLine();
    ol.appendChild(li);
    return;
  }
  const lines = describeLoadOrder(wadSet);
  wadSet.forEach((file, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = lines[i];
    li.appendChild(span);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${file.name} from the load order`);
    remove.addEventListener('click', () => { void removeWad(file.name); });
    li.appendChild(remove);
    ol.appendChild(li);
  });
}

function renderDehacked(dehacked) {
  $('dehacked-note').textContent = dehacked.length === 0
    ? ''
    : dehacked.map(describeDehacked).join(' ');
}

function renderClamp(identity) {
  if (!identity) { $('wad-clamp').textContent = ''; return; }
  $('wad-clamp').textContent = identity.sharewareLikely && identity.kind === 'doom1'
    ? 'Shareware WAD detected: map list clamps to Episode 1.'
    : '';
}

function mapPassesClamp(name, identity) {
  if (!identity || !(identity.sharewareLikely && identity.kind === 'doom1')) return true;
  return /^E1M[1-9]$/.test(name);
}

function isOnboarded() {
  try { return store.getItem(ONBOARDED_KEY) === '1'; } catch { return false; }
}

function markOnboarded() {
  try { store.setItem(ONBOARDED_KEY, '1'); } catch { /* onboarding flag optional */ }
  $('onboard-panel').hidden = true;
}

function showErrors(report, fatalMsg) {
  const ul = $('error-list');
  ul.innerHTML = '';
  const add = (text, cls) => {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    li.textContent = text;
    ul.appendChild(li);
  };
  if (fatalMsg) add(fatalMsg, 'fatal');
  if (!report) return;
  for (const w of report.warnings || []) add(`warning ${w.code} ${w.lump || ''}: ${w.actual} (${w.fallback})`);
  for (const m of report.toJSON ? report.toJSON().maps : []) {
    for (const e of m.errors) add(`map ${m.map}: ${e.code} ${e.lump}: ${e.actual}`);
  }
}

let engine = null;
let loop = null;
let presenter = null;
let presenterKind = 'canvas2d';
let paused = false;
let tier = 2;
let governor = null;
let videoPrefs = loadVideoPrefs();
let bindings = loadBindings(store);
let keyState = createKeyState(bindings);
let mouse = createMouseLook();
let touch = createTouchState();
let mouseButtons = new Set();
let skipFrame = false;

// M3 audio state: pure engines (headless-tested) plus browser graph nodes
// created only inside the unlock gesture. Nothing schedules before unlock.
const unlockPolicy = (() => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.getAutoplayPolicy === 'function') {
      return navigator.getAutoplayPolicy('audiocontext');
    }
  } catch { /* probe optional */ }
  return 'unknown';
})();
const unlock = createAudioUnlock({ policy: unlockPolicy });
const mixer = createMixer();
const sfx = createSfxEngine();
const sfxCache = createSfxCache();
const music = createMusicEngine();
let audioCtx = null;
let mixNodes = null;
let musicNode = null;
let prevAttack = false;

// M3 persistence state: provider ladder (OPFS -> IDB -> local -> memory)
// resolved at boot; current WAD bytes plus lump index back DS*/D_* lookups.
let saveManager = null;
let storageTier = 'memory';
let storageFallbacks = [];
let wadBytesCurrent = null;
let wadLumpIndex = new Map();
// Progression resume target for the next boot() call (consumed once).
let resumeMapPref;

const audioStatus = (msg) => { $('audio-status').textContent = msg; };
const saveStatus = (msg) => { $('save-status').textContent = msg; };

function wadLumpBytes(name) {
  const entry = wadLumpIndex.get(name);
  if (!entry || !wadBytesCurrent) return null;
  try {
    return lumpBytes(wadBytesCurrent, entry);
  } catch {
    return null;
  }
}

function indexWadLumps(bytes) {
  wadBytesCurrent = bytes;
  wadLumpIndex = new Map();
  try {
    const dir = parseWadDirectory(bytes);
    for (const lump of dir.lumps) {
      if (!wadLumpIndex.has(lump.name)) wadLumpIndex.set(lump.name, lump);
    }
  } catch { /* corrupt WAD: boot reports it; audio lookups stay empty */ }
}

function firstSoundLump() {
  if (wadLumpIndex.has('DSPISTOL')) return 'DSPISTOL';
  for (const name of wadLumpIndex.keys()) {
    if (name.startsWith('DS')) return name;
  }
  return null;
}

// Fire edge drives the SFX voice pool: decode the pistol lump lazily into
// the LRU cache, allocate a voice at full close-range volume, and let the
// per-frame pump schedule it on the SFX bus.
function playFireSound() {
  if (!unlock.trySchedule()) return;
  const name = firstSoundLump();
  if (!name) return;
  const lump = wadLumpBytes(name);
  if (!lump) return;
  let entry;
  try {
    entry = sfxCache.get(name, lump);
  } catch {
    return;
  }
  if (!entry) return;
  sfx.play({ name, buffer: entry, volume: 96, separation: 128, pitch: 128, distance: 0 });
}

function pumpAudioFrame() {
  sfx.update(typeof performance !== 'undefined' ? performance.now() : 0);
  if (audioCtx && mixNodes) {
    try {
      renderSfxFrame(sfx, sfxCache, audioCtx, mixNodes.sfx);
    } catch { /* a failed schedule must never break the frame loop */ }
  }
}

function stopMapMusic() {
  if (musicNode) {
    try { musicNode.stop(); } catch { /* already stopped */ }
    try { musicNode.disconnect(); } catch { /* ignore */ }
    musicNode = null;
  }
  music.stop();
}

// Map music: D_<MAP> MUS lump converted to SMF, rendered through the JS-FM
// core over the GENMIDI bank, looped on the music bus. Demo WADs carry no
// music lumps, so the engine idles honestly and the status line says so.
function startMapMusic() {
  stopMapMusic();
  if (!engine) return false;
  if (!unlock.canSchedule() || !audioCtx || !mixNodes) return false;
  const lumpName = `D_${engine.map}`;
  const musBytes = wadLumpBytes(lumpName);
  if (!musBytes) {
    audioStatus(`Audio running. No music lump ${lumpName} in this WAD.`);
    return false;
  }
  let midi;
  try {
    midi = musToMidi(musBytes).midi;
  } catch (e) {
    audioStatus(`Audio running. Music lump ${lumpName} would not convert (${e.code || 'error'}).`);
    return false;
  }
  const bankBytes = wadLumpBytes('GENMIDI');
  if (bankBytes) {
    try { music.loadBank(bankBytes); } catch { /* FM core plays without the bank */ }
  }
  const info = music.loadSong(lumpName, midi);
  const seconds = Math.min(20, Math.max(4, music.songDurationSec() || 8));
  const pcm = music.renderChunk(seconds);
  const buf = audioCtx.createBuffer(1, pcm.length, audioCtx.sampleRate);
  buf.getChannelData(0).set(pcm);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.loop = music.loop;
  src.connect(mixNodes.music);
  src.start();
  musicNode = src;
  music.play();
  audioStatus(`Audio running. Playing ${lumpName} (${info.notes} notes, JS-FM${bankBytes ? ' with GENMIDI' : ''}).`);
  return true;
}

async function enableAudio() {
  unlock.gesture();
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      audioStatus('WebAudio unavailable in this browser; the game stays silent.');
      return;
    }
    audioCtx = new AC();
    mixNodes = buildMixerGraph(audioCtx, mixer);
  }
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch { /* stay suspended, overlay persists */ }
  }
  if (mixNodes) applyMixerGraph(audioCtx, mixer, mixNodes);
  if (audioCtx.state === 'running') {
    audioStatus(`Audio running (mixer live, music ${music.songName || 'pending map tune'}).`);
    startMapMusic();
  } else {
    audioStatus('Audio still suspended. Press Enable audio again from a real click.');
  }
}

function persistAudioPrefs() {
  if (!saveManager) return;
  saveManager.writeSoon(PATHS.config, {
    audio: mixer.toJSON(),
    updatedAt: new Date().toISOString(),
  });
}

function applyAudioStateToUi(audio) {
  if (!audio) return;
  mixer.set('master', audio.master ?? mixer.state.master);
  mixer.set('sfx', audio.sfx ?? mixer.state.sfx);
  mixer.set('music', audio.music ?? mixer.state.music);
  mixer.set('muted', !!audio.muted);
  $('vol-master').value = String(mixer.state.master);
  $('vol-sfx').value = String(mixer.state.sfx);
  $('vol-music').value = String(mixer.state.music);
  $('mute-all').checked = mixer.state.muted;
  if (audioCtx && mixNodes) applyMixerGraph(audioCtx, mixer, mixNodes);
}

function bindMapSelect(maps, current, identity) {
  const sel = $('map-select');
  sel.innerHTML = '';
  const visible = (maps || []).filter((m) => mapPassesClamp(m, identity));
  for (const m of visible.length > 0 ? visible : (maps || [])) {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    if (m === current) o.selected = true;
    sel.appendChild(o);
  }
}

function probeGL() {
  // Probe on a throwaway canvas (never the visible one): acquiring one WebGL
  // context type locks the canvas, so probing webgl then webgl2 on the same
  // canvas always reports webgl2 as missing. Try webgl2 first, then webgl.
  try {
    const probe = document.createElement('canvas');
    const webgl2 = !!probe.getContext('webgl2');
    const probe2 = document.createElement('canvas');
    const webgl = !!probe2.getContext('webgl');
    return { webgl, webgl2 };
  } catch {
    return { webgl: false, webgl2: false };
  }
}

function makePresenter(view, tierValue, palette) {
  if (tierValue <= 1) {
    const glProbe = probeGL();
    const format = tierValue === 0 ? 'r8' : chooseUploadFormat(glProbe);
    try {
      const glp = createGLPresenter(view, { format: format === 'r8' ? 'r8' : 'rgba', palette });
      return { presenter: glp, kind: glp.kind, tier: tierValue };
    } catch (e) {
      if (!(e instanceof GlUnavailable)) throw e;
      const next = tierForFailure(tierValue);
      return makePresenter(view, next, palette);
    }
  }
  if (tierValue === 4) {
    view.width = 256; view.height = 160;
  }
  return { presenter: createPresenter(view, palette), kind: 'canvas2d', tier: tierValue };
}

function describeTier(t) {
  return ['Tier 0 WebGL2 paletted', 'Tier 1 WebGL1 RGBA', 'Tier 2 Canvas2D', 'Tier 3 Canvas2D 30 FPS', 'Tier 4 emergency'][t] || `Tier ${t}`;
}

// Merge desktop keys, touch stick/buttons, and mouse buttons into one
// normalized sample; mouse deltas convert to angleturn units.
function sampleInput() {
  const keys = sampleToInput(keyState.actions());
  const ts = touch.sample();
  const attack = keys.attack || ts.attack || mouseButtons.has(0);
  const use = keys.use || ts.use || mouseButtons.has(2);
  const moveF = Math.max(-1, Math.min(1, keys.moveF + ts.moveF));
  const moveS = Math.max(-1, Math.min(1, keys.moveS + ts.moveS));
  const turn = Math.max(-1, Math.min(1, keys.turn + ts.turn));
  return {
    moveF, moveS, turn,
    run: keys.run || ts.run,
    attack, use,
    weapon: ts.weapon !== null && ts.weapon !== undefined ? ts.weapon : keys.weapon,
  };
}

function pumpInput() {
  if (!engine) return;
  const sample = sampleInput();
  const cmd = buildTiccmd(sample, { alwaysRun: true });
  const md = mouse.consume();
  const mouseTurn = pixelsToAngleTurn(md.dx, mouse.sensitivity);
  touch.consumeWeapon();
  engine.injectTiccmd({
    forwardmove: cmd.forwardmove,
    sidemove: cmd.sidemove,
    angleturn: cmd.angleturn + mouseTurn,
    buttons: cmd.buttons,
    weaponSelect: cmd.weaponSelect,
  });
  // Rising fire edge triggers one pistol voice (SFX pool, unlock-gated).
  const attacking = (cmd.buttons & 1) !== 0 || mouseButtons.has(0);
  if (attacking && !prevAttack) playFireSound();
  prevAttack = attacking;
}

function setPaused(v, reason) {
  paused = v;
  const overlay = $('pause-overlay');
  if (v) {
    if (loop) loop.pause();
    overlay.hidden = false;
    status(reason || 'Paused. Press Resume.');
  } else {
    overlay.hidden = true;
    if (engine && presenter) {
      loop = createLoop({
        tick: () => { pumpInput(); engine.tickOnce(); },
        render: () => {
          // Tier 3 caps presentation at 30 FPS by drawing every other frame.
          if (tier === 3) { skipFrame = !skipFrame; if (skipFrame) return; }
          presenter.present(engine.__fb);
          pumpAudioFrame();
        },
      });
      loop.start();
      status(`${engine.map} running (${describeTier(tier)}, ${governor.size.label})`);
    }
  }
}

async function boot(wadBytes, label) {
  const hadEngine = !!(engine && presenter);
  if (loop) loop.stop();
  stopMapMusic();
  try {
    // resumeMapPref carries the progression resume target (set by the boot
    // call sites, consumed once); undefined keeps the engine default map.
    engine = await initEngine({ wadBytes, episode: 1, map: resumeMapPref });
    resumeMapPref = undefined;
  } catch (e) {
    // M4 error state: a failed load never kills the running level. Resume
    // the previous loop and report through the alert box plus diagnostics.
    const msg = `Load failed: ${e.message}`;
    showErrors(e.details ? { warnings: [], toJSON: () => ({ maps: [{ map: '', errors: e.details }] }) } : null, msg);
    showFatal(`${msg} The previous level keeps running.`);
    setLoading(null);
    status(msg);
    if (hadEngine) setPaused(false);
    return;
  }
  indexWadLumps(wadBytes);
  mergedBytesCurrent = wadBytes;
  const view = $('doom-canvas');
  const gl = probeGL();
  tier = resolveTier(probeCapabilities(gl));
  const made = makePresenter(view, tier, engine.__palette);
  presenter = made.presenter;
  presenterKind = made.kind;
  tier = made.tier;
  // M4 ecosystem report: identity (shareware clamp), per-map isolation
  // survivors for the map list, dropped-map warnings, DEHACKED notes.
  let identity = null;
  let viableMaps = engine.maps;
  let dropped = [];
  try {
    identity = identifyWad(parseWadDirectory(wadBytes));
    const probe = probeMaps(wadBytes);
    if (probe.viable.length > 0) viableMaps = probe.viable;
    dropped = probe.dropped;
    renderDehacked(findDehacked(parseWadDirectory(wadBytes).lumps));
  } catch { /* diagnostics are best-effort; the level already runs */ }
  bindMapSelect(viableMaps, engine.map, identity);
  // The clamp note names a staged file set; the built-in sample level
  // boots without it (E1-only by construction, nothing to clamp).
  renderClamp(wadSet.length > 0 ? identity : null);
  showErrors(engine.report, null);
  for (const line of droppedLines(dropped)) {
    const li = document.createElement('li');
    li.textContent = line;
    $('error-list').appendChild(li);
  }
  showFatal(null);
  setLoading(null);
  applyResolution(true);
  status(`${label}: ${engine.map} running (${describeTier(tier)}, ${presenterKind}, ${view.width}x${view.height}, ${engine.__geo.linedefs.length} lines)`);
  setPaused(false);
  presenter.present(engine.__fb);
  // Persist progression (episode/map/skill) debounced; restart map music.
  if (saveManager) {
    saveManager.writeSoon(PATHS.progression, {
      episode: engine.episode,
      map: engine.map,
      skill: engine.skill,
      updatedAt: new Date().toISOString(),
    });
    void refreshSlotsList();
  }
  startMapMusic();
}

function applyResolution(first = false) {
  const view = $('doom-canvas');
  if (!governor) {
    const coarse = shouldShowTouchOverlay();
    governor = createResolutionGovernor({
      initial: initialStepIndex({ mobile: coarse, batterySaver: videoPrefs.battery }),
      batterySaver: videoPrefs.battery,
      onChange: () => {
        if (!engine || !presenter || presenterKind !== 'canvas2d') return;
        view.width = governor.size.w;
        view.height = governor.size.h;
        presenter = createPresenter(view, engine.__palette);
        presenter.present(engine.__fb);
      },
    });
    if (videoPrefs.res !== 'auto') governor.setManual(Number(videoPrefs.res));
  }
  if (first && presenterKind === 'canvas2d' && tier !== 4) {
    view.width = governor.size.w;
    view.height = governor.size.h;
    presenter = createPresenter(view, engine.__palette);
  }
}

async function readFile(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

// M4 ingest pipeline: stage the file in load order, merge with map-group
// replacement plus last-wins resources, isolate bad maps, then boot the
// survivors. A rejected file keeps the running level untouched.
async function ingest(file) {
  if (!file || !/\.wad$/i.test(file.name)) {
    showFatal('Not a .WAD file; load rejected. The current level keeps running.');
    status('Not a .WAD file; load rejected.');
    return;
  }
  setLoading(file.name);
  await paintLoading();
  showFatal(null);
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    showFatal(`Could not read ${file.name}. The current level keeps running.`);
    setLoading(null);
    return;
  }
  const staged = wadSet.filter((f) => f.name !== file.name).concat([{ name: file.name, bytes }]);
  const layout = buildLoadout(staged);
  const hit = layout.rejected.find((r) => r.name === file.name);
  if (hit) {
    showFatal(`${file.name} rejected (${hit.code}): ${hit.message} The current level keeps running.`);
    showErrors(null, `${hit.code} in ${file.name}: ${hit.message}`);
    setLoading(null);
    return;
  }
  const magic = staged.length === 1
    ? (layout.valid.length > 0 ? parseWadDirectory(staged[0].bytes).magic : 'PWAD')
    : 'PWAD';
  const merged = assembleWad(layout.merged, magic);
  let probe;
  try {
    probe = probeMaps(merged);
  } catch (e) {
    showFatal(`${file.name} produced no bootable maps (${(e && e.code) || 'E_MAP'}). The current level keeps running.`);
    setLoading(null);
    return;
  }
  if (probe.viable.length === 0) {
    const first = probe.dropped[0];
    showFatal(`${file.name} has no bootable maps${first ? ` (${first.code}: ${first.message})` : ''}. The current level keeps running.`);
    setLoading(null);
    return;
  }
  wadSet = staged;
  renderWadOrder();
  await precacheWad(merged);
  $('wad-info').textContent = `${file.name} staged (${merged.length} bytes merged, ${probe.viable.length} playable maps${probe.dropped.length ? `, ${probe.dropped.length} skipped` : ''}).`;
  markOnboarded();
  await boot(merged, file.name);
}

function buildWeaponStrip() {
  const strip = $('weapon-strip');
  strip.textContent = '';
  for (let i = 1; i <= 7; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i);
    b.setAttribute('aria-label', `Select weapon ${i}`);
    b.addEventListener('click', () => {
      touch.setWeapon(i);
      strip.classList.remove('collapsed');
      scheduleStripCollapse();
    });
    strip.appendChild(b);
  }
}

let stripTimer = 0;
function scheduleStripCollapse() {
  window.clearTimeout(stripTimer);
  // Landscape touch layout auto-collapses the strip after 3s (blueprint E2E).
  stripTimer = window.setTimeout(() => {
    if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
      $('weapon-strip').classList.add('collapsed');
    }
  }, 3000);
}

function wireTouchOverlay() {
  const root = $('touch-ui');
  if (!shouldShowTouchOverlay()) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  buildWeaponStrip();
  scheduleStripCollapse();
  const zone = $('joystick');
  const nub = $('stick-nub');
  const radius = 56;
  const moveNub = () => {
    nub.style.transform = `translate(${touch.stick.dx * radius * 0.6}px, ${touch.stick.dy * radius * 0.6}px)`;
  };
  zone.addEventListener('pointerdown', (e) => {
    zone.setPointerCapture(e.pointerId);
    const r = zone.getBoundingClientRect();
    touch.joystickStart(e.pointerId, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    touch.joystickMove(e.pointerId, 0, 0);
    moveNub();
  });
  zone.addEventListener('pointermove', (e) => {
    if (!touch.stick.active) return;
    const r = zone.getBoundingClientRect();
    touch.joystickMove(e.pointerId, e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    moveNub();
    if (touch.hapticTick(performance.now()) && navigator.vibrate) {
      try { navigator.vibrate(5); } catch { /* haptics optional */ }
    }
  });
  const end = (e) => { touch.joystickEnd(e.pointerId); moveNub(); };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('keydown', (e) => {
    const step = 14;
    const r = zone.getBoundingClientRect();
    if (e.key === 'ArrowUp') touch.joystickMove(undefined, touch.stick.dx * radius, touch.stick.dy * radius - step);
    else if (e.key === 'ArrowDown') touch.joystickMove(undefined, touch.stick.dx * radius, touch.stick.dy * radius + step);
    else if (e.key === 'ArrowLeft') touch.joystickMove(undefined, touch.stick.dx * radius - step, touch.stick.dy * radius);
    else if (e.key === 'ArrowRight') touch.joystickMove(undefined, touch.stick.dx * radius + step, touch.stick.dy * radius);
    else return;
    void r;
    e.preventDefault();
    moveNub();
  });
  const hold = (id, name) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); touch.press(name); });
    el.addEventListener('pointerup', () => touch.release(name));
    el.addEventListener('pointercancel', () => touch.release(name));
    el.addEventListener('pointerleave', () => touch.release(name));
  };
  hold('btn-fire', 'fire');
  hold('btn-use', 'use');
  hold('btn-strafe-l', 'strafeL');
  hold('btn-strafe-r', 'strafeR');
  $('btn-menu').addEventListener('click', () => setPaused(true, 'Menu. Press Resume.'));
}

async function refreshSlotsList() {
  const ul = $('slots-list');
  ul.textContent = '';
  if (!saveManager) {
    const li = document.createElement('li');
    li.textContent = 'Save storage unavailable.';
    ul.appendChild(li);
    return;
  }
  const slots = await saveManager.listSlots();
  for (const s of slots) {
    const li = document.createElement('li');
    li.textContent = s.present
      ? `Slot ${s.slot}: ${s.meta && s.meta.name ? s.meta.name : ''} ${s.meta && s.meta.map ? s.meta.map : ''} (${s.bytes} bytes)`
      : `Slot ${s.slot}: empty`;
    ul.appendChild(li);
  }
}

function selectedSlot() {
  return Math.max(0, Math.min(5, Number($('save-slot').value) || 0));
}

async function setupSaves() {
  const picked = await selectProvider([
    async () => createOpfsProvider(),
    async () => createIdbProvider(),
    async () => createLocalProvider(store),
    async () => createMemoryProvider(),
  ]);
  saveManager = createSaveManager(picked.provider);
  storageTier = picked.tier;
  storageFallbacks = picked.fallbacks;
  saveStatus(`Save storage: ${storageTier}${storageFallbacks.length ? ` (fell back past ${storageFallbacks.join(', ')})` : ''}. 6 slots, export/import ready.`);

  // Restore persisted config (audio prefs) and bindings migrated to the
  // provider ladder; progression picks the resume map at boot.
  try {
    const config = await saveManager.readOr(PATHS.config, null);
    if (config && config.audio) applyAudioStateToUi(config.audio);
  } catch { /* corrupt config keeps mixer defaults */ }
  try {
    const savedBindings = await saveManager.readOr(PATHS.bindings, null);
    if (savedBindings && savedBindings.format === 'doom-bindings') {
      bindings = savedBindings;
      keyState.setBindings(bindings);
      try { saveBindings(store, bindings); } catch { /* store optional */ }
    }
  } catch { /* corrupt bindings keep device defaults */ }

  $('btn-save').addEventListener('click', async () => {
    if (!engine || !saveManager) return;
    const slot = selectedSlot();
    try {
      const bytes = captureEngine(engine);
      await saveManager.saveSlot(slot, bytes, { name: engine.map, episode: engine.episode, map: engine.map, skill: engine.skill });
      saveStatus(`Saved slot ${slot} (${bytes.length} bytes) to ${storageTier}.`);
    } catch (e) {
      saveStatus(`Save failed: ${e.code || e.message}.`);
    }
    void refreshSlotsList();
  });
  $('btn-load').addEventListener('click', async () => {
    if (!saveManager) return;
    const slot = selectedSlot();
    try {
      const { data, meta } = await saveManager.loadSlot(slot);
      if (!meta || meta.map !== (engine && engine.map)) {
        const bytes = (await loadCachedWad()) || buildDemoWad();
        resumeMapPref = meta && meta.map ? meta.map : undefined;
        await boot(bytes, `Save slot ${slot}`);
      }
      const r = restoreEngine(engine, data);
      saveStatus(`Loaded slot ${slot} (${r.map}, tick ${r.ticks}).`);
    } catch (e) {
      saveStatus(e.code === 'E_NOENT' ? `Slot ${slot} is empty.` : `Load failed: ${e.code || e.message}.`);
    }
  });
  $('btn-save-delete').addEventListener('click', async () => {
    if (!saveManager) return;
    const slot = selectedSlot();
    await saveManager.deleteSlot(slot);
    saveStatus(`Deleted slot ${slot}.`);
    void refreshSlotsList();
  });
  $('btn-export').addEventListener('click', async () => {
    if (!saveManager) return;
    try {
      const slots = await saveManager.listSlots();
      const saves = [];
      for (const s of slots) {
        if (!s.present) continue;
        const { data, meta } = await saveManager.loadSlot(s.slot);
        saves.push({ slot: s.slot, name: (meta && meta.name) || `slot${s.slot}`, data });
      }
      const bundle = exportBundle({
        config: await saveManager.readOr(PATHS.config, {}),
        bindings: await saveManager.readOr(PATHS.bindings, bindings),
        progression: await saveManager.readOr(PATHS.progression, {}),
        saves,
      });
      const blob = new Blob([serializeBundle(bundle)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'doom-save-bundle-v1.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      saveStatus(`Exported ${saves.length} saves plus config to doom-save-bundle-v1.json.`);
    } catch (e) {
      saveStatus(`Export failed: ${e.code || e.message}.`);
    }
  });
  $('save-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !saveManager) return;
    try {
      const text = await file.text();
      const parsed = parseBundle(text);
      const r = await applyBundle(saveManager.provider, parsed);
      if (parsed.bindings && parsed.bindings.format === 'doom-bindings') {
        bindings = parsed.bindings;
        keyState.setBindings(bindings);
        try { saveBindings(store, bindings); } catch { /* store optional */ }
      }
      if (parsed.config && parsed.config.audio) applyAudioStateToUi(parsed.config.audio);
      saveStatus(`Imported ${r.saves} saves plus config. Reloading.`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      saveStatus(`Import rejected: ${err.code || err.message}. Nothing was changed.`);
    }
  });
  await refreshSlotsList();
}

function setupAudioControls() {
  $('vol-master').value = String(mixer.state.master);
  $('vol-sfx').value = String(mixer.state.sfx);
  $('vol-music').value = String(mixer.state.music);
  $('btn-audio-enable').addEventListener('click', () => { void enableAudio(); });
  // First gesture anywhere also unlocks (canvas click counts for Pointer Lock).
  window.addEventListener('pointerdown', () => {
    if (!unlock.canSchedule()) void enableAudio();
  }, { once: true });
  const bindVol = (id, part) => {
    $(id).addEventListener('input', (e) => {
      mixer.set(part, Number(e.target.value));
      if (audioCtx && mixNodes) applyMixerGraph(audioCtx, mixer, mixNodes);
      persistAudioPrefs();
    });
  };
  bindVol('vol-master', 'master');
  bindVol('vol-sfx', 'sfx');
  bindVol('vol-music', 'music');
  $('mute-all').addEventListener('change', (e) => {
    mixer.set('muted', e.target.checked);
    if (audioCtx && mixNodes) applyMixerGraph(audioCtx, mixer, mixNodes);
    persistAudioPrefs();
  });
  if (unlockPolicy === 'allowed') audioStatus('Audio policy allows output. Press Enable audio to start the mixer.');
}

function wireVideoControls() {
  const tierSel = $('tier-select');
  const resSel = $('res-select');
  const battery = $('battery-saver');
  tierSel.value = 'auto';
  resSel.value = videoPrefs.res === 'auto' ? 'auto' : String(videoPrefs.res);
  battery.checked = videoPrefs.battery;
  tierSel.addEventListener('change', async () => {
    try {
      if (tierSel.value === 'auto') store.removeItem('doom-tier');
      else store.setItem('doom-tier', tierSel.value);
    } catch { /* ignore */ }
    const bytes = (await loadCachedWad()) || buildDemoWad();
    await boot(bytes, 'Renderer switch');
  });
  resSel.addEventListener('change', () => {
    videoPrefs.res = resSel.value === 'auto' ? 'auto' : Number(resSel.value);
    saveVideoPrefs(videoPrefs);
    if (!governor) return;
    if (videoPrefs.res === 'auto') governor.setAuto();
    else governor.setManual(videoPrefs.res);
    applyResolution(true);
    if (engine && presenter) presenter.present(engine.__fb);
  });
  battery.addEventListener('change', () => {
    videoPrefs.battery = battery.checked;
    saveVideoPrefs(videoPrefs);
    if (governor) governor.setBatterySaver(videoPrefs.battery);
    if (engine) status(`${engine.map} running (${describeTier(tier)}, ${governor.size.label}${videoPrefs.battery ? ', saver' : ''})`);
  });
}

// M4 load-order removal: drop the file, re-merge the survivors, and boot
// the result. Removing the last file returns to the cached WAD or the
// built-in sample level; the running level survives a removal that yields
// no bootable maps.
async function removeWad(name) {
  const rest = wadSet.filter((f) => f.name !== name);
  setLoading(name);
  await paintLoading();
  if (rest.length === 0) {
    wadSet = [];
    renderWadOrder();
    const cached = await loadCachedWad();
    if (cached) {
      wadSet = [{ name: 'cached.wad', bytes: cached }];
      renderWadOrder();
      await boot(cached, 'Cached WAD');
    } else {
      await boot(buildDemoWad(), 'Sample level');
    }
    return;
  }
  const layout = buildLoadout(rest);
  const merged = assembleWad(layout.merged, 'PWAD');
  let probe;
  try {
    probe = probeMaps(merged);
  } catch (e) {
    showFatal(`Removal left no bootable maps (${(e && e.code) || 'E_MAP'}). ${name} stays staged.`);
    setLoading(null);
    return;
  }
  if (probe.viable.length === 0) {
    showFatal(`Removal left no bootable maps. ${name} stays staged.`);
    setLoading(null);
    return;
  }
  wadSet = rest;
  renderWadOrder();
  await precacheWad(merged);
  await boot(merged, 'Load order updated');
}

window.addEventListener('DOMContentLoaded', async () => {
  // Drag-and-drop window protection: only the dropzone accepts files.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { if (e.target.id !== 'wad-drop') e.preventDefault(); });

  wireTouchOverlay();
  wireVideoControls();
  setupAudioControls();
  await setupSaves();
  const syncBindingsToManager = (next) => {
    if (saveManager) saveManager.writeSoon(PATHS.bindings, next);
  };
  renderRemapTable($('remap-table'), bindings, {
    onChange: (next) => { bindings = next; keyState.setBindings(next); saveBindings(store, next); syncBindingsToManager(next); },
    onNotice: (msg) => notice(msg),
  });
  $('btn-bindings-reset').addEventListener('click', () => {
    bindings = resetBindings();
    keyState.setBindings(bindings);
    saveBindings(store, bindings);
    syncBindingsToManager(bindings);
    renderRemapTable($('remap-table'), bindings, {
      onChange: (next) => { bindings = next; keyState.setBindings(next); saveBindings(store, next); syncBindingsToManager(next); },
      onNotice: (msg) => notice(msg),
    });
    notice('Bindings reset to defaults.');
  });

  attachKeyboard(window, keyState, {
    onAction: (code) => {
      const pauseKeys = (bindings.actions.pause || { keys: [] }).keys;
      if (pauseKeys.includes(code)) setPaused(!paused);
    },
  });
  attachPointerLock($('doom-canvas'), mouse, {
    onPauseRequest: () => { if (engine && !paused) setPaused(true, 'Mouse released. Click Resume to recapture.'); },
  });
  const view = $('doom-canvas');
  view.addEventListener('mousedown', (e) => {
    if (mouse.locked) mouseButtons.add(e.button);
  });
  window.addEventListener('mouseup', (e) => { mouseButtons.delete(e.button); });
  view.addEventListener('contextmenu', (e) => e.preventDefault());

  const cached = await loadCachedWad();
  // Resume the persisted map when the WAD still carries it.
  let resumeMap;
  if (saveManager) {
    try {
      const prog = await saveManager.readOr(PATHS.progression, null);
      if (prog && typeof prog.map === 'string') resumeMap = prog.map;
    } catch { /* fresh boot */ }
  }
  // M4 onboarding: first visit (no cache, never dismissed) opens the
  // getting-started panel; returning visitors go straight to the level.
  renderWadOrder();
  const shellState = resolveShellState({
    loading: false, fatal: null, seenBefore: !!(cached || isOnboarded()), droppedCount: 0,
  });
  if (shellState === 'onboarding') {
    $('onboard-panel').hidden = false;
  }
  if (cached) {
    // A persisted cache counts as a previous visit: seed the load order
    // so remove/reorder semantics stay honest from the first frame.
    wadSet = [{ name: 'cached.wad', bytes: cached }];
    renderWadOrder();
    resumeMapPref = resumeMap;
    await boot(cached, 'Cached WAD');
  } else {
    const demo = buildDemoWad();
    resumeMapPref = resumeMap;
    await boot(demo, 'Demo level');
  }

  $('wad-picker').addEventListener('change', (e) => ingest(e.target.files[0]));
  const drop = $('wad-drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); });
  drop.addEventListener('drop', (e) => { e.preventDefault(); ingest(e.dataTransfer.files[0]); });
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') $('wad-picker').click();
  });

  $('map-select').addEventListener('change', async (e) => {
    const bytes = mergedBytesCurrent || (await loadCachedWad()) || buildDemoWad();
    if (loop) loop.stop();
    try {
      engine = await initEngine({ wadBytes: bytes, map: e.target.value });
      const made = makePresenter($('doom-canvas'), tier, engine.__palette);
      presenter = made.presenter;
      presenterKind = made.kind;
      showErrors(engine.report, null);
      status(`${engine.map} running (${engine.__geo.linedefs.length} lines)`);
      setPaused(false);
      presenter.present(engine.__fb);
    } catch (err) {
      status(`Map load failed: ${err.message}`);
    }
  });

  $('btn-pause').addEventListener('click', () => setPaused(true));
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-recapture').addEventListener('click', () => {
    setPaused(false);
    $('doom-canvas').click();
  });

  // M4 onboarding plus sample controls.
  $('btn-sample-load').addEventListener('click', async () => {
    markOnboarded();
    const demo = buildDemoWad();
    wadSet = [];
    renderWadOrder();
    await precacheWad(demo);
    await boot(demo, 'Sample level');
  });
  $('btn-sample-download').addEventListener('click', () => {
    const demo = buildDemoWad();
    const blob = new Blob([demo], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sample-level.wad';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    markOnboarded();
  });
  $('btn-onboard-dismiss').addEventListener('click', () => markOnboarded());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && loop) setPaused(true, 'Paused (tab hidden). Press Resume.');
    if (document.hidden && saveManager) void saveManager.flush();
  });
  window.addEventListener('pagehide', () => {
    if (saveManager) void saveManager.flush();
  });

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch { /* offline pass is M4 */ }
  }
});
