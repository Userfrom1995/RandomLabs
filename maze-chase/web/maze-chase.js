'use strict';
/* Maze Chase browser harness (Phase 7 of issue #582).
 *
 * Plain script, no modules, no bundler, no external deps. Presentation and
 * input mapping only: zero gameplay logic lives here; the Rust crate
 * `maze-chase-web` (built to web/maze-chase.wasm, C ABI, no wasm-bindgen)
 * owns the simulation, screens, scores table logic, and settings blob.
 *
 * BINDING CONTRACT NOTES (must match the Rust side exactly):
 * - mc_version()->u32 must equal 1.
 * - mc_reset takes (seed_lo:u32, seed_hi:u32, level:u32, mode:u32). JS numbers
 *   cannot hold a u64 precisely, hence the split seed. Start uses the
 *   sentinel level=0, mode=99 meaning "use current difficulty preset"
 *   (Rust implements the preset mapping).
 * - mc_rebind cancel: while armed, this harness intercepts Escape and calls
 *   mc_rebind(99) (never forwarded as mc_key) to cancel capture. Chosen
 *   because 99 is outside the action range 0..7 and can never collide with a
 *   real arm request.
 * - Rebind action labels 0..7 are a harness-side assumption:
 *   0 Up, 1 Down, 2 Left, 3 Right, 4 Confirm, 5 Cancel, 6 Pause, 7 Mute.
 *   The Rust side completes capture on the next forwarded mc_key.
 * - Menu key ownership: in non-playing screens arrows move DOM focus and
 *   Enter/Space click the focused button (DOM owns menu activation, so
 *   Enter/Space are NOT forwarded there); P/Esc/M are always forwarded via
 *   mc_key so Rust handles pause/back/mute. While playing, every handled key
 *   is forwarded and DOM activation is suppressed.
 * - Tap (short touch without move on the canvas) equals Enter: it clicks the
 *   visible panel's [data-primary] button, and does nothing while playing.
 * - Canvas clip behavior: the Rust frame is exactly w*h*4 RGBA with
 *   letterboxing baked in, so the browser never clips content; CSS only
 *   enforces a minimum display size (280px) so tiny viewports scale the
 *   baked frame down instead of reflowing the layout.
 * - file:// note: browsers block fetch() of .wasm from file://, so this page
 *   must be served over http (e.g. `python3 -m http.server`, or
 *   `python -m http.server` on Windows, in maze-chase/).
 */
(function () {
  var EXPECT_VERSION = 1;
  var NO_CHANGE = 0xFFFFFFFF;

  // Key id table: e.code -> mc_key id.
  var CODE_TO_ID = {
    ArrowUp: 1, ArrowDown: 2, ArrowLeft: 3, ArrowRight: 4,
    KeyW: 5, KeyA: 6, KeyS: 7, KeyD: 8,
    Space: 9, Enter: 10, Escape: 11, KeyP: 12, KeyM: 13
  };
  // Key id -> human label (display only, for rebind buttons).
  var ID_TO_LABEL = {
    1: 'ArrowUp', 2: 'ArrowDown', 3: 'ArrowLeft', 4: 'ArrowRight',
    5: 'W', 6: 'A', 7: 'S', 8: 'D',
    9: 'Space', 10: 'Enter', 11: 'Esc', 12: 'P', 13: 'M'
  };
  // Action order MUST match Rust config Action::ALL (Up, Down, Left, Right,
  // Pause, Confirm, Back, Mute); indices arm mc_rebind captures.
  var REBIND_ACTIONS = ['Up', 'Down', 'Left', 'Right', 'Pause', 'Confirm', 'Back', 'Mute'];
  var MODE_NAMES = ['Classic', 'Time Attack', 'Sprint', 'Fright Frenzy'];
  var DIFF_NAMES = ['Cozy', 'Standard', 'Harsh'];
  var CUE_NAMES = [null,
    'Crumb', 'Sunseed', 'FrightStart', 'WardenEaten', 'RelishSpawn',
    'RelishEaten', 'RelishGone', 'Death', 'Respawn', 'ExtraLife',
    'LevelClear', 'LevelStart', 'Refill', 'SprintBonus', 'TimeUp',
    'GameOver', 'FrightEnd', 'EyesRevived', 'UiMove', 'UiSelect',
    'UiBack', 'MuteToggle'];
  // screen id -> panel element id (4 = playing shows no panel).
  var SCREEN_PANELS = {
    0: 'panel-title', 1: 'panel-help', 2: 'panel-scores',
    3: 'panel-settings', 5: 'panel-pause', 6: 'panel-over'
  };
  var WARDEN_CUE = 4; // WardenEaten: pitch doubling lives in Rust (mc_sfx_from/to already carry the chain arm); mc_last_chain is display-only.
  var SETTINGS_KEY = 'maze-chase-settings';
  var SCORES_KEY = 'maze-chase-scores';

  function $(id) { return document.getElementById(id); }

  var canvas, ctx, canvasWrap;
  var lastCssW = 0, lastCssH = 0; // style writes are dirty-checked per frame.
  var exp = null; // wasm exports once booted.
  var lastScreen = -1;
  var armedRebind = -1; // action index armed, or -1.
  var frames = 0, fpsShown = 0;
  var musicState = 0; // 0 stop, 1 title loop, 2 fright loop.
  var lastTuneText = 'OFF';
  var memStore = {}; // localStorage fallback when storage is unavailable.

  // ---------- storage (localStorage with memory fallback) ----------
  function storeGet(k) {
    try { return window.localStorage.getItem(k); }
    catch (e) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; }
  }
  function storeSet(k, v) {
    try { window.localStorage.setItem(k, v); }
    catch (e) { memStore[k] = v; }
  }
  function b64enc(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  }
  function b64dec(s) {
    var b = atob(s), o = new Uint8Array(b.length), i;
    for (i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
    return o;
  }

  // ---------- error card ----------
  function showError(reason, hint) {
    var panels = ['panel-title', 'panel-help', 'panel-scores', 'panel-settings', 'panel-pause', 'panel-over'];
    panels.forEach(function (id) { $(id).hidden = true; });
    $('error-reason').textContent = reason;
    $('error-hint').textContent = hint || '';
    $('panel-error').hidden = false;
  }

  // ---------- wasm boot ----------
  function scriptDir() {
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) return s.slice(0, s.lastIndexOf('/') + 1);
    } catch (e) { /* fall through */ }
    return null;
  }
  function fetchWasm(url) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      return WebAssembly.instantiateStreaming(fetch(url), {}).catch(function () {
        return fetch(url).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.arrayBuffer();
        }).then(function (buf) { return WebAssembly.instantiate(buf, {}); });
      });
    }
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(function (buf) { return WebAssembly.instantiate(buf, {}); });
  }
  function boot() {
    var primary = 'web/maze-chase.wasm';
    var dir = scriptDir();
    var fallback = dir ? dir + 'maze-chase.wasm' : 'maze-chase.wasm';
    // Primary is relative to the page (maze-chase/play.html -> maze-chase/web/...);
    // fallback is relative to this script's own directory (same file, robust to
    // pages served from a different base path).
    return fetchWasm(primary).catch(function () { return fetchWasm(fallback); })
      .then(function (mod) {
        exp = mod.instance ? mod.instance.exports : mod.exports || mod;
        var need = ['mc_version', 'mc_reset', 'mc_step', 'mc_frame', 'mc_frame_len',
          'mc_key', 'mc_swipe', 'mc_press', 'mc_goto', 'mc_rebind', 'mc_binding', 'mc_screen',
          'mc_scratch', 'mc_scratch_len', 'memory'];
        for (var i = 0; i < need.length; i++) {
          if (typeof exp[need[i]] === 'undefined') throw new Error('missing export: ' + need[i]);
        }
        var v = exp.mc_version() >>> 0;
        if (v !== EXPECT_VERSION) throw new Error('version mismatch: wasm=' + v + ' harness=1');
        importSettings();
        importScores();
        syncSettingsUI();
        refreshBindingLabels();
        sizeCanvas();
        requestAnimationFrame(loop);
        setInterval(updateHud, 250);
        setInterval(function () { fpsShown = frames; frames = 0; }, 1000);
        $('boot-status').textContent = 'Ready.';
      })
      .catch(function (err) {
        showError('Could not load the game engine (' + (err && err.message ? err.message : err) + ').',
          'Hint: this page must be served over http so the browser can fetch web/maze-chase.wasm ' +
          '(run `python3 -m http.server` (`python -m http.server` on Windows) inside maze-chase/ ' +
          'and open maze-chase/play.html). ' +
          'The engine file is built by the maze-chase-web Rust crate.');
      });
  }

  // ---------- settings blob via scratch ----------
  function scratchBytes() {
    var ptr = exp.mc_scratch() >>> 0;
    var cap = exp.mc_scratch_len() >>> 0;
    return { ptr: ptr, cap: cap };
  }
  function importSettings() {
    try {
      var raw = storeGet(SETTINGS_KEY);
      if (!raw) return;
      var bytes = b64dec(raw);
      var s = scratchBytes();
      if (bytes.length > s.cap) return;
      new Uint8Array(exp.memory.buffer, s.ptr, bytes.length).set(bytes);
      exp.mc_settings_write(s.ptr, bytes.length);
    } catch (e) { /* corrupt blob: keep Rust defaults */ }
  }
  function saveSettings() {
    if (!exp || typeof exp.mc_settings_len === 'undefined') return;
    try {
      var n = exp.mc_settings_len() >>> 0;
      if (!n) return;
      var s = scratchBytes();
      var len = exp.mc_settings_read(s.ptr, Math.min(n, s.cap)) >>> 0;
      if (!len) return;
      var view = new Uint8Array(exp.memory.buffer, s.ptr, len);
      storeSet(SETTINGS_KEY, b64enc(view));
    } catch (e) { /* storage or wasm error: settings simply do not persist */ }
  }

  // ---------- scores ----------
  function scratchWriteUtf8(str) {
    var enc = new TextEncoder().encode(str);
    var s = scratchBytes();
    var n = Math.min(enc.length, s.cap);
    new Uint8Array(exp.memory.buffer, s.ptr, n).set(enc.subarray(0, n));
    return { ptr: s.ptr, len: n };
  }
  function importScores() {
    try {
      var raw = storeGet(SCORES_KEY);
      if (!raw || typeof exp.mc_scores_push === 'undefined') return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      arr.forEach(function (e) {
        if (e && typeof e.name === 'string') {
          var w = scratchWriteUtf8(e.name.slice(0, 12));
          exp.mc_scores_push(w.ptr, w.len, e.score >>> 0, e.level >>> 0);
        }
      });
    } catch (e) { /* corrupt scores: start empty */ }
  }
  function exportScores() {
    try {
      var out = [], n = exp.mc_score_count() >>> 0, i;
      var dec = new TextDecoder();
      for (i = 0; i < n; i++) {
        var s = scratchBytes();
        var cap = Math.min(s.cap, 256);
        var len = exp.mc_score_get_name(i, s.ptr, cap) >>> 0;
        var name = dec.decode(new Uint8Array(exp.memory.buffer, s.ptr, len));
        out.push({ name: name, score: exp.mc_score_get_score(i) >>> 0, level: exp.mc_score_get_level(i) >>> 0 });
      }
      storeSet(SCORES_KEY, JSON.stringify(out));
    } catch (e) { /* ignore */ }
  }
  function renderScores() {
    ['scores-body', 'over-body'].forEach(function (bodyId) {
      var tb = $(bodyId);
      if (!tb) return;
      tb.textContent = '';
    try {
      var n = exp.mc_score_count() >>> 0;
      if (!n) {
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.colSpan = 3;
        td.textContent = 'No scores yet. Play a game.';
        tr.appendChild(td);
        tb.appendChild(tr);
        return;
      }
      var dec = new TextDecoder();
      for (var i = 0; i < n; i++) {
        var s = scratchBytes();
        var cap = Math.min(s.cap, 256);
        var len = exp.mc_score_get_name(i, s.ptr, cap) >>> 0;
        var row = document.createElement('tr');
        [['#' + (i + 1)],
          [dec.decode(new Uint8Array(exp.memory.buffer, s.ptr, len))],
          [String(exp.mc_score_get_score(i) >>> 0) + ' / L' + (exp.mc_score_get_level(i) >>> 0)]
        ].forEach(function (cell) {
          var c = document.createElement('td');
          c.textContent = cell[0];
          row.appendChild(c);
        });
        tb.appendChild(row);
      }
    } catch (e) { /* wasm not ready */ }
    });
  }

  // ---------- canvas sizing (DPR-aware) ----------
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var avail = (canvasWrap && canvasWrap.clientWidth) || window.innerWidth;
    var cssW = Math.max(280, Math.min(avail, window.innerWidth * 0.92));
    var cssH = Math.max(280, Math.round(cssW * 0.72));
    if (cssW !== lastCssW || cssH !== lastCssH) {
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      lastCssW = cssW;
      lastCssH = cssH;
    }
    var bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
  }

  // ---------- main loop ----------
  function loop() {
    requestAnimationFrame(loop);
    if (!exp) return;
    frames++;
    try {
      exp.mc_step(performance.now() >>> 0);
    } catch (e) { return; }
    sizeCanvas();
    try {
      var bw = canvas.width, bh = canvas.height;
      var ptr = exp.mc_frame(bw, bh) >>> 0;
      var len = exp.mc_frame_len() >>> 0;
      if (len === (bw * bh * 4) && ptr !== 0) {
        // Re-fetch memory EVERY frame: it can detach on growth.
        var view = new Uint8Array(exp.memory.buffer, ptr, len);
        var copy = new Uint8ClampedArray(view);
        ctx.putImageData(new ImageData(copy, bw, bh), 0, 0);
      }
    } catch (e) { /* transient blit failure: keep last frame */ }
    drainCues();
    pollMusic();
    try {
      var s = exp.mc_screen() >>> 0;
      if (s !== lastScreen) { lastScreen = s; syncPanels(s); }
    } catch (e) { /* ignore */ }
  }

  function syncPanels(s) {
    Object.keys(SCREEN_PANELS).forEach(function (k) {
      $(SCREEN_PANELS[k]).hidden = (Number(k) !== s);
    });
    if (s === 2 || s === 6) { renderScores(); refreshOver(); }
    if (s === 3) { syncSettingsUI(); }
    if (s === 4) {
      // Drop button focus on entering play so Space/Enter cannot re-click it.
      var ae0 = document.activeElement;
      if (ae0 && ae0.tagName === 'BUTTON') ae0.blur();
    }
    // Move keyboard focus to the new panel's primary button when focus was on body.
    // preventScroll keeps the board in view: focusing must never yank the
    // page away from the canvas on load or on small screens.
    var pid = SCREEN_PANELS[s];
    if (pid && (document.activeElement === document.body || document.activeElement === null)) {
      var prim = document.querySelector('#' + pid + ' [data-primary]');
      if (prim && prim.focus) {
        try { prim.focus({ preventScroll: true }); } catch (err) { prim.focus(); }
      }
    }
  }

  // ---------- HUD (~4Hz) ----------
  function txt(id, v) { var el = $(id); if (el && el.textContent !== v) el.textContent = v; }
  function updateHud() {
    if (!exp) return;
    try {
      txt('hud-score', String(exp.mc_score() >>> 0));
      txt('hud-best', String(exp.mc_best() >>> 0));
      txt('hud-wicks', String(exp.mc_lives() >>> 0));
      txt('hud-level', String(exp.mc_level() >>> 0));
      var m = exp.mc_mode() >>> 0;
      txt('hud-mode', MODE_NAMES[m] || ('Mode ' + m));
      txt('hud-dots', String(exp.mc_dots_left() >>> 0));
      var fr = exp.mc_fright_active() >>> 0;
      var frel = $('hud-fright');
      if (frel) frel.hidden = !fr;
      if (fr && (exp.mc_fright_flash() >>> 0)) txt('hud-fright', 'FRIGHT ENDING');
      else if (fr) txt('hud-fright', 'FRIGHT!');
      var rel = $('hud-relish');
      if (rel) {
        var ra = exp.mc_relish_active() >>> 0;
        rel.hidden = !ra;
        if (ra) txt('hud-relish', 'RELISH +' + (exp.mc_relish_value() >>> 0));
      }
      txt('hud-fps', String(fpsShown));
      txt('hud-tune', lastTuneText);
      var muted = (exp.mc_muted() >>> 0) !== 0;
      txt('btn-mute', muted ? 'Unmute' : 'Mute');
      applyVolumes();
      // Settings labels follow Rust (single source of truth).
      var th = exp.mc_theme() >>> 0, thc = exp.mc_theme_count() >>> 0;
      txt('theme-label', 'Theme ' + (th + 1) + '/' + thc);
      var d = exp.mc_difficulty() >>> 0;
      txt('diff-label', DIFF_NAMES[d] || ('Difficulty ' + d));
    } catch (e) { /* ignore */ }
  }

  function refreshOver() {
    if (!exp) return;
    try {
      txt('over-score', String(exp.mc_score() >>> 0));
      txt('over-level', String(exp.mc_level() >>> 0));
      txt('over-best', String(exp.mc_best() >>> 0));
      var can = (exp.mc_can_add_score() >>> 0) !== 0;
      $('save-row').hidden = !can;
    } catch (e) { /* ignore */ }
  }

  function syncSettingsUI() {
    if (!exp) return;
    try {
      $('rng-master').value = Math.round(exp.mc_master() * 100);
      $('rng-music').value = Math.round(exp.mc_music() * 100);
      $('rng-sfx').value = Math.round(exp.mc_sfx() * 100);
      $('chk-flash').checked = (exp.mc_reduced_flash() >>> 0) !== 0;
    } catch (e) { /* ignore */ }
  }

  // ---------- audio ----------
  var AC = null, gMaster = null, gMusic = null, gSfx = null, noiseBuf = null;
  var tuneTimer = null, tuneJob = null;

  function unlockAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      var note = $('audio-note');
      if (note) note.hidden = false;
      return;
    }
    try {
      AC = new Ctor();
    } catch (e) {
      var n2 = $('audio-note');
      if (n2) n2.hidden = false;
      return;
    }
    gMaster = AC.createGain();
    gMusic = AC.createGain();
    gSfx = AC.createGain();
    gMusic.connect(gMaster);
    gSfx.connect(gMaster);
    gMaster.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
  }

  function applyVolumes() {
    if (!AC || !exp) return;
    try {
      var muted = (exp.mc_muted() >>> 0) !== 0;
      gMaster.gain.value = muted ? 0 : exp.mc_master();
      gMusic.gain.value = exp.mc_music();
      gSfx.gain.value = exp.mc_sfx();
    } catch (e) { /* ignore */ }
  }

  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function playSfx(cue) {
    if (!AC) return;
    var wave;
    try { wave = exp.mc_sfx_wave(cue) >>> 0; } catch (e) { return; }
    if (wave === NO_CHANGE) return; // cue has no SFX component.
    var f0, f1, ms;
    try {
      f0 = exp.mc_sfx_from(cue);
      f1 = exp.mc_sfx_to(cue);
      ms = exp.mc_sfx_ms(cue) >>> 0;
    } catch (e) { return; }
    if (!(ms > 0)) return;
    var t = AC.currentTime, dur = ms / 1000;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    g.connect(gSfx);
    var src;
    if (wave === 3) {
      src = AC.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
    } else {
      src = AC.createOscillator();
      src.type = wave === 0 ? 'square' : wave === 1 ? 'triangle' : 'sine';
      src.frequency.setValueAtTime(Math.max(20, f0), t);
      src.frequency.linearRampToValueAtTime(Math.max(20, f1), t + dur);
    }
    src.connect(g);
    try { src.start(t); src.stop(t + dur + 0.02); } catch (e) { /* ignore */ }
  }

  function scheduleNote(midi, t, dur) {
    var o = AC.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midiHz(midi);
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.015);
    g.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, dur * 0.95));
    o.connect(g);
    g.connect(gMusic);
    try { o.start(t); o.stop(t + dur); } catch (e) { /* ignore */ }
  }

  function pumpTune() {
    if (!tuneJob || !AC) return;
    var bpm = 132;
    try {
      var b = exp.mc_tune_bpm();
      if (b > 0 && b < 400) bpm = b;
    } catch (e) { /* default 132 */ }
    var beatSec = 60 / bpm;
    var horizon = AC.currentTime + 0.3;
    var guard = 0;
    while (tuneJob.nextT < horizon && guard++ < 64) {
      var len = 0;
      try { len = exp.mc_tune_len(tuneJob.id) >>> 0; } catch (e) { stopTune(); return; }
      if (tuneJob.idx >= len) {
        var looped = false;
        try { looped = (exp.mc_tune_looped(tuneJob.id) >>> 0) !== 0; } catch (e) { /* ignore */ }
        if (looped && tuneJob.loop) { tuneJob.idx = 0; continue; }
        stopTune();
        return;
      }
      var midi = 69, beats = 1;
      try {
        midi = exp.mc_tune_midi(tuneJob.id, tuneJob.idx) >>> 0;
        beats = exp.mc_tune_beats(tuneJob.id, tuneJob.idx);
      } catch (e) { stopTune(); return; }
      if (!(beats > 0)) beats = 1;
      scheduleNote(midi, tuneJob.nextT, beats * beatSec);
      tuneJob.nextT += beats * beatSec;
      tuneJob.idx++;
    }
  }

  function startTune(id, loop) {
    if (!AC) return;
    stopTune();
    tuneJob = { id: id, idx: 0, nextT: AC.currentTime + 0.06, loop: !!loop };
    tuneTimer = setInterval(pumpTune, 80);
    pumpTune();
  }
  function stopTune() {
    if (tuneTimer) { clearInterval(tuneTimer); tuneTimer = null; }
    tuneJob = null;
  }

  function onCue(cue) {
    var isMusic = false, tune = 0;
    try {
      isMusic = (exp.mc_cue_is_music(cue) >>> 0) !== 0;
      tune = exp.mc_cue_tune(cue) >>> 0;
    } catch (e) { /* ignore */ }
    if (isMusic) startTune(tune, false); // one-shot sting; loops are driven by mc_poll_music.
    else playSfx(cue);
    if (cue > 0 && cue < CUE_NAMES.length && CUE_NAMES[cue] && !isMusic) {
      lastTuneText = musicState === 1 ? 'TITLE' : musicState === 2 ? 'FRIGHT' : 'OFF';
    }
  }
  function drainCues() {
    try {
      for (var i = 0; i < 64; i++) {
        var c = exp.mc_poll_cue() >>> 0;
        if (!c) break;
        onCue(c);
      }
    } catch (e) { /* ignore */ }
  }
  function pollMusic() {
    try {
      var m = exp.mc_poll_music() >>> 0;
      if (m === NO_CHANGE || m === musicState) return;
      musicState = m;
      if (m === 0) { stopTune(); lastTuneText = 'OFF'; }
      else if (m === 1) { startTune(0, true); lastTuneText = 'TITLE'; }
      else if (m === 2) { startTune(1, true); lastTuneText = 'FRIGHT'; }
    } catch (e) { /* ignore */ }
  }

  // ---------- game flow ----------
  function doStart() {
    if (!exp) return;
    unlockAudio();
    var lo = 0, hi = 0;
    try {
      var r = new Uint32Array(2);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(r);
      else { r[0] = (Math.random() * 0xFFFFFFFF) >>> 0; r[1] = (Math.random() * 0xFFFFFFFF) >>> 0; }
      lo = r[0] >>> 0; hi = r[1] >>> 0;
    } catch (e) { /* keep zeros */ }
    try { exp.mc_reset(lo, hi, 0, 99); } catch (e) { /* ignore */ }
  }

  function visibleButtons() {
    var all = document.querySelectorAll('button');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (!b.disabled && b.offsetParent !== null) out.push(b);
    }
    return out;
  }
  function moveFocus(dir) {
    var btns = visibleButtons();
    if (!btns.length) return;
    var idx = btns.indexOf(document.activeElement);
    idx = idx < 0 ? (dir > 0 ? 0 : btns.length - 1) : (idx + dir + btns.length) % btns.length;
    btns[idx].focus();
  }
  function clickPrimary() {
    var panels = document.querySelectorAll('main section:not([hidden])');
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i].querySelector('[data-primary]');
      if (p) { p.click(); return; }
    }
  }

  function inField(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  }
  function isPlaying() { return lastScreen === 4; }

  function disarmRebind() {
    armedRebind = -1;
  }

  // Show the live Rust-side binding on every rebind button (mc_binding
  // returns the first web-mappable key id, 0 when unmappable). Called at
  // boot and after every capture, since steals can move other rows too.
  function refreshBindingLabels() {
    if (!exp || typeof exp.mc_binding === 'undefined') return;
    var btns = document.querySelectorAll('#rebind-list button');
    for (var i = 0; i < btns.length && i < REBIND_ACTIONS.length; i++) {
      try {
        var id = exp.mc_binding(i) >>> 0;
        btns[i].textContent = REBIND_ACTIONS[i] + ': ' + (ID_TO_LABEL[id] || '(unmappable key)');
      } catch (err) { /* keep the previous label */ }
    }
  }

  function onKeyDown(e) {
    unlockAudio();
    var id = CODE_TO_ID[e.code];
    // Rebind capture: next keydown completes it (Rust side). Never trap typing.
    if (armedRebind >= 0 && !inField(e.target)) {
      e.preventDefault();
      if (e.code === 'Escape' || id === 11) {
        try { exp.mc_rebind(99); } catch (err) { /* ignore */ }
      } else if (id && exp) {
        try { exp.mc_key(id, 1); exp.mc_key(id, 0); } catch (err) { /* ignore */ }
      }
      var b = document.querySelectorAll('#rebind-list button')[armedRebind];
      disarmRebind();
      refreshBindingLabels();
      return;
    }
    if (!id) return; // unmapped key: leave to the browser.
    if (inField(e.target)) return; // never trap keys inside the name input field.
    var playing = isPlaying();
    var onBody = e.target === document.body || e.target === canvas;
    if (!playing && !onBody) return;
    // While playing, Esc/P pause via mc_press(2) (single toggle; NOT also
    // forwarded as mc_key, which would double-toggle). In menus they fall
    // through to mc_key so Rust handles back/pause there.
    if (playing && (id === 11 || id === 12)) {
      e.preventDefault();
      if (exp) { try { exp.mc_press(2); } catch (err) { /* ignore */ } }
      return;
    }
    // Menus: DOM owns activation for Enter/Space; P/Esc/M still go to Rust.
    if (!playing && (id === 10 || id === 9)) {
      e.preventDefault();
      var ae = document.activeElement;
      if (ae && (ae.tagName === 'BUTTON')) ae.click();
      return;
    }
    if (exp) { try { exp.mc_key(id, 1); } catch (err) { /* ignore */ } }
    if (playing || onBody) e.preventDefault();
    // Menus: arrows also move DOM focus between visible buttons.
    if (!playing && id >= 1 && id <= 4) {
      moveFocus((id === 2 || id === 4) ? 1 : -1);
    }
  }
  function onKeyUp(e) {
    var id = CODE_TO_ID[e.code];
    if (!id || inField(e.target)) return;
    if (exp && (isPlaying() || e.target === document.body || e.target === canvas)) {
      try { exp.mc_key(id, 0); } catch (err) { /* ignore */ }
    }
  }

  // ---------- touch ----------
  var touchStart = null;
  function onTouchStart(e) {
    unlockAudio();
    if (e.touches.length !== 1) { touchStart = null; return; }
    var t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    var s = touchStart;
    touchStart = null;
    var t = e.changedTouches[0];
    var dx = t.clientX - s.x, dy = t.clientY - s.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var dt = performance.now() - s.t;
    if (dist < 10 && dt < 300) { clickPrimary(); return; } // tap equals Enter.
    if (!exp) return;
    try { exp.mc_swipe(dx, dy); } catch (err) { /* ignore */ } // Rust applies the deadzone.
  }

  function padBind(btn, id) {
    var down = function (e) { e.preventDefault(); unlockAudio(); if (exp) { try { exp.mc_key(id, 1); } catch (err) {} } };
    var up = function (e) { e.preventDefault(); if (exp) { try { exp.mc_key(id, 0); } catch (err) {} } };
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up, { passive: false });
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', up);
  }

  // ---------- wiring ----------
  function wire() {
    canvas = $('game-canvas');
    ctx = canvas.getContext('2d');
    canvasWrap = $('canvas-wrap');

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    ['click', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function () { unlockAudio(); }, { passive: true });
    });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && isPlaying() && exp) {
        try { exp.mc_press(2); } catch (e) { /* ignore */ }
      }
    });
    window.addEventListener('resize', sizeCanvas);
    window.addEventListener('orientationchange', sizeCanvas);

    var press = function (id, fn) {
      $(id).addEventListener('click', function () {
        unlockAudio();
        if (exp) { try { exp[fn[0]](fn[1]); } catch (e) { /* ignore */ } }
        if (fn[0] === 'mc_press' && (fn[1] === 3 || fn[1] === 8 || fn[1] === 9)) {
          setTimeout(function () { saveSettings(); updateHud(); }, 60);
        }
      });
    };
    // Title.
    $('btn-start').addEventListener('click', doStart);
    press('btn-title-help', ['mc_goto', 1]);
    press('btn-title-scores', ['mc_goto', 2]);
    press('btn-title-settings', ['mc_goto', 3]);
    // Pause / over.
    press('btn-resume', ['mc_press', 5]);
    press('btn-pause-restart', ['mc_press', 6]);
    press('btn-pause-quit', ['mc_press', 7]);
    press('btn-over-restart', ['mc_press', 6]);
    press('btn-over-quit', ['mc_press', 7]);
    $('btn-over-start').addEventListener('click', doStart);
    // Back buttons.
    ['btn-help-back', 'btn-scores-back', 'btn-settings-back', 'btn-pause-back'].forEach(function (id) {
      press(id, ['mc_press', 1]);
    });
    // Theme / difficulty.
    press('btn-theme', ['mc_press', 8]);
    press('btn-diff', ['mc_press', 9]);
    // Mute (header + settings echo the same Rust toggle).
    press('btn-mute', ['mc_press', 3]);
    press('btn-mute-2', ['mc_press', 3]);
    // Retry.
    $('btn-retry').addEventListener('click', function () { window.location.reload(); });
    // Scores.
    $('btn-scores-clear').addEventListener('click', function () {
      if (!exp) return;
      try { exp.mc_scores_clear(); } catch (e) { /* ignore */ }
      exportScores();
      renderScores();
      refreshOver();
    });
    $('btn-save-score').addEventListener('click', function () {
      if (!exp) return;
      var name = $('name-input').value.slice(0, 12);
      if (!name) return;
      var w = scratchWriteUtf8(name);
      try { exp.mc_score_add(w.ptr, w.len); } catch (e) { /* ignore */ }
      exportScores();
      renderScores();
      refreshOver();
    });
    // Sliders / checkbox call setters; settings persist via the blob.
    var vol = function (id, fn) {
      $(id).addEventListener('input', function () {
        if (!exp) return;
        try { exp[fn](Number($(id).value) / 100); } catch (e) { /* ignore */ }
        saveSettings();
        applyVolumes();
      });
    };
    vol('rng-master', 'mc_set_master');
    vol('rng-music', 'mc_set_music');
    vol('rng-sfx', 'mc_set_sfx');
    $('chk-flash').addEventListener('change', function () {
      if (!exp) return;
      try { exp.mc_set_reduced_flash($('chk-flash').checked ? 1 : 0); } catch (e) { /* ignore */ }
      saveSettings();
    });
    // D-pad.
    padBind($('pad-up'), 1);
    padBind($('pad-down'), 2);
    padBind($('pad-left'), 3);
    padBind($('pad-right'), 4);
    $('btn-pad').addEventListener('click', function () {
      document.body.classList.toggle('pad-force');
    });
    // Rebind list (8 actions).
    var list = $('rebind-list');
    REBIND_ACTIONS.forEach(function (label, a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label + ': ?';
      b.addEventListener('click', function () {
        if (!exp) return;
        var prev = 0;
        try { prev = exp.mc_rebind(a) >>> 0; } catch (e) { /* ignore */ }
        armedRebind = a;
        b.textContent = 'press a key... (Esc cancels)';
        b.focus();
        if (prev >= 1 && prev <= 13) b.dataset.prev = ID_TO_LABEL[prev];
      });
      var li = document.createElement('li');
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { wire(); boot(); });
  } else {
    wire();
    boot();
  }
})();
