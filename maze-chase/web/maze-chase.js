'use strict';
/* Maze Chase browser harness (Phase 7 of issue #582).
 *
 * Plain script, no modules, no bundler, no external deps. Presentation and
 * input mapping only: zero gameplay logic lives here; the Rust crate
 * `maze-chase-web` (built to web/maze-chase.wasm, C ABI, no wasm-bindgen)
 * owns the simulation, screens, scores table logic, and settings blob.
 *
 * BINDING CONTRACT NOTES (must match the Rust side exactly):
 * - mc_version()->u32 must equal 3.
 * - mc_reset takes (seed_lo:u32, seed_hi:u32, level:u32, mode:u32). JS numbers
 *   cannot hold a u64 precisely, hence the split seed. Start uses the
 *   sentinel level=0, mode=99 meaning "use current difficulty preset"
 *   (Rust implements the preset mapping).
 * - mc_rebind cancel: while armed, this harness intercepts Escape (and any
 *   key with no web key id) and calls mc_rebind(99) (never forwarded as
 *   mc_key) to cancel capture, so the visible UI and the Rust capture never
 *   diverge. Chosen because 99 is outside the action range 0..7 and can
 *   never collide with a real arm request.
 * - Rebind action labels 0..7 mirror Rust `Action::ALL`:
 *   0 Up, 1 Down, 2 Left, 3 Right, 4 Pause, 5 Confirm, 6 Back, 7 Mute.
 *   The Rust side completes capture on the next forwarded mc_key.
 * - Menu key ownership: in non-playing screens arrows and their WASD twins
 *   move DOM focus and Enter/Space click the focused button (DOM owns menu
 *   activation, so Enter/Space are NOT forwarded there); P dispatches the
 *   Back button and M forwards its key to the live keymap (default Mute),
 *   so a focused control cannot swallow either. While playing, P/Esc toggle
 *   pause and every other handled key is forwarded; DOM activation is
 *   suppressed.
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
  var EXPECT_VERSION = 3;
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
  var FRIGHT_SEGMENTS = 30;
  var WARDEN_CUE = 4; // WardenEaten: pitch doubling lives in Rust (mc_sfx_from/to already carry the chain arm); mc_last_chain is display-only.
  var CUE_MUTE_TOGGLE = 22; // MuteToggle: apply the new mix before the confirmation cue.
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
          'mc_scratch', 'mc_scratch_len', 'mc_theme_name', 'mc_fright_segments',
          'mc_fright_flash', 'mc_reduced_flash', 'mc_reduced_motion', 'mc_high_contrast',
          'mc_theme', 'mc_theme_count', 'mc_difficulty', 'mc_dots_total',
          'mc_show_fps', 'mc_set_show_fps', 'mc_settings_len', 'mc_settings_read',
          'mc_settings_write', 'mc_score_count', 'mc_score_get_score',
          'mc_score_get_level', 'mc_score_get_name', 'mc_can_add_score',
          'mc_score_add', 'mc_scores_clear', 'mc_scores_push',
          'mc_poll_cue', 'mc_poll_music', 'mc_cue_is_music', 'mc_cue_tune', 'mc_last_chain',
          'mc_muted', 'mc_master', 'mc_music', 'mc_sfx', 'mc_set_master', 'mc_set_music',
          'mc_set_sfx', 'mc_sfx_wave', 'mc_sfx_from', 'mc_sfx_to', 'mc_sfx_ms',
          'mc_sfx_tone_count', 'mc_sfx_tone_field', 'mc_tune_len', 'mc_tune_midi',
          'mc_tune_beats', 'mc_tune_looped', 'mc_tune_bpm', 'mc_tune_meta', 'mc_fade_ms',
          'memory'];
        for (var i = 0; i < need.length; i++) {
          if (typeof exp[need[i]] === 'undefined') throw new Error('missing export: ' + need[i]);
        }
        var v = exp.mc_version() >>> 0;
        if (v !== EXPECT_VERSION) throw new Error('version mismatch: wasm=' + v + ' harness=' + EXPECT_VERSION);
        importSettings();
        importScores();
        // If audio was unlocked before the wasm booted, apply the imported
        // settings now; otherwise the unlock path primes them.
        primeVolumes();
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

  function themeName() {
    try {
      var s = scratchBytes();
      var n = exp.mc_theme_name(s.ptr, s.cap) >>> 0;
      return new TextDecoder().decode(new Uint8Array(exp.memory.buffer, s.ptr, n));
    } catch (e) { return 'Theme'; }
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
    if (s !== 3) cancelRebind();
    Object.keys(SCREEN_PANELS).forEach(function (k) {
      $(SCREEN_PANELS[k]).hidden = (Number(k) !== s);
    });
    var pauseBtn = $('btn-pause');
    if (pauseBtn) pauseBtn.hidden = (s !== 4);
    if (s === 2 || s === 6) { renderScores(); refreshOver(); }
    if (s === 3) { syncSettingsUI(); }
    if (s === 4) {
      // Drop button focus on entering play so Space/Enter cannot re-click it.
      var ae0 = document.activeElement;
      if (ae0 && ae0.tagName === 'BUTTON') ae0.blur();
    }
    // Every screen panel opens scrolled to its top; the action row is a
    // pinned footer outside that scroll area, so Back is always reachable.
    var pid = SCREEN_PANELS[s];
    if (pid) {
      var body = document.querySelector('#' + pid + ' .panel-scroll');
      if (body) body.scrollTop = 0;
    }
    // Move keyboard focus to the new panel's primary button when focus was on body.
    // preventScroll keeps the board in view: focusing must never yank the
    // page away from the canvas on load or on small screens.
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
      var left = exp.mc_dots_left() >>> 0;
      var total = exp.mc_dots_total() >>> 0;
      txt('hud-dots', String(left));
      var dotsBar = $('hud-dots-bar');
      var dotsFill = $('hud-dots-fill');
      if (dotsBar && dotsFill) {
        var cleared = Math.max(0, total - left);
        dotsBar.setAttribute('aria-valuemax', String(total || 0));
        dotsBar.setAttribute('aria-valuenow', String(cleared));
        dotsFill.style.width = (total ? (cleared * 100 / total) : 0) + '%';
      }
      var fr = exp.mc_fright_active() >>> 0;
      var meter = $('fright-meter');
      var frel = $('hud-fright');
      var reduced = ((exp.mc_reduced_flash() >>> 0) !== 0) ||
        ((exp.mc_reduced_motion() >>> 0) !== 0);
      var segs = fr ? (exp.mc_fright_segments() >>> 0) : 0;
      if (meter) meter.hidden = !fr;
      if (frel) frel.hidden = !fr;
      if (fr && reduced && segs > 0) txt('hud-fright', 'THE TURN ENDS');
      else if (fr && (exp.mc_fright_flash() >>> 0)) txt('hud-fright', 'FRIGHT ENDING');
      else if (fr) txt('hud-fright', 'FRIGHT!');
      var segEl = $('fright-segs');
      if (segEl) segEl.hidden = !fr || segs === 0;
      if (segEl && segEl.children.length === FRIGHT_SEGMENTS) {
        for (var si = 0; si < FRIGHT_SEGMENTS; si++) {
          segEl.children[si].className = si < segs ? 'on' : '';
        }
        segEl.setAttribute('aria-valuenow', String(segs));
      }
      var rel = $('hud-relish');
      if (rel) {
        var ra = exp.mc_relish_active() >>> 0;
        rel.hidden = !ra;
        if (ra) txt('hud-relish', 'RELISH +' + (exp.mc_relish_value() >>> 0));
      }
      var showFps = (exp.mc_show_fps() >>> 0) !== 0;
      txt('hud-fps', String(fpsShown));
      var fpsLabel = $('hud-fps-label');
      if (fpsLabel) fpsLabel.hidden = !showFps;
      var fpsValue = $('hud-fps');
      if (fpsValue) fpsValue.hidden = !showFps;
      txt('hud-tune', lastTuneText);
      var muted = (exp.mc_muted() >>> 0) !== 0;
      txt('btn-mute', muted ? 'Unmute' : 'Mute');
      applyVolumes();
      updateAudioChip();
      // Settings labels follow Rust (single source of truth).
      var th = exp.mc_theme() >>> 0, thc = exp.mc_theme_count() >>> 0;
      var hc = exp.mc_high_contrast() >>> 0;
      txt('theme-label', hc
        ? 'Moonwake (high contrast)'
        : themeName() + ' (' + (th + 1) + '/' + thc + ')');
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
      $('chk-motion').checked = (exp.mc_reduced_motion() >>> 0) !== 0;
      $('chk-contrast').checked = (exp.mc_high_contrast() >>> 0) !== 0;
      $('chk-fps').checked = (exp.mc_show_fps() >>> 0) !== 0;
    } catch (e) { /* ignore */ }
  }

  // ---------- audio ----------
  var AC = null, gMaster = null, gMusic = null, gSfx = null;
  var tuneJob = null;
  var tuneGainCache = {};
  var volumesPrimed = false;
  var MUSIC_CEILING = 0.32;
  var SFX_CEILING = 0.50;

  // Test/E2E seam: the page never reads these, the browser harness does.
  function syncAudioDebug() {
    try {
      window.__mcAudio = {
        state: AC ? AC.state : 'none',
        music: musicState,
        tune: tuneJob ? tuneJob.id : -1,
        loop: !!(tuneJob && tuneJob.loop),
        gains: {
          master: gMaster ? gMaster.gain.value : 0,
          music: gMusic ? gMusic.gain.value : 0,
          sfx: gSfx ? gSfx.gain.value : 0,
          primed: volumesPrimed
        }
      };
    } catch (e) { /* ignore */ }
  }

  function updateAudioChip() {
    var chip = $('btn-audio');
    syncAudioDebug();
    if (!chip) return;
    var supported = !!(window.AudioContext || window.webkitAudioContext);
    var asleep = !AC || AC.state !== 'running';
    chip.hidden = !supported || !asleep;
  }

  function unlockAudio() {
    if (AC) {
      if (AC.state === 'suspended') {
        try { AC.resume().then(updateAudioChip, updateAudioChip); } catch (e) { /* ignore */ }
      }
      updateAudioChip();
      return;
    }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      var note = $('audio-note');
      if (note) note.hidden = false;
      updateAudioChip();
      return;
    }
    try {
      AC = new Ctor();
    } catch (e) {
      var n2 = $('audio-note');
      if (n2) n2.hidden = false;
      updateAudioChip();
      return;
    }
    // Start every bus at zero and apply the saved mix before any sound is
    // scheduled: a muted or low-volume session must never leak full gain
    // during the first fade.
    gMaster = AC.createGain();
    gMusic = AC.createGain();
    gSfx = AC.createGain();
    gMaster.gain.setValueAtTime(0, AC.currentTime);
    gMusic.gain.setValueAtTime(0, AC.currentTime);
    gSfx.gain.setValueAtTime(0, AC.currentTime);
    gMusic.connect(gMaster);
    gSfx.connect(gMaster);
    gMaster.connect(AC.destination);
    primeVolumes();
    // The title loop is queued by the session before the first gesture:
    // poll now that the context exists so the pending music is not lost.
    pollMusic();
    try { AC.resume().then(updateAudioChip, updateAudioChip); } catch (e) { /* ignore */ }
    updateAudioChip();
  }

  var crumbTick = 0;

  function fadeSeconds() {
    try {
      var ms = exp.mc_fade_ms() >>> 0;
      if (ms > 0 && ms < 2000) return ms / 1000;
    } catch (e) { /* fall through */ }
    return 0.12;
  }

  function rampParam(param, target, secs) {
    var t = AC.currentTime;
    var from = param.value;
    if (Math.abs(from - target) < 0.002) {
      param.setValueAtTime(target, t);
      return;
    }
    param.cancelScheduledValues(t);
    param.setValueAtTime(from, t);
    param.linearRampToValueAtTime(target, t + Math.max(0.01, secs));
  }

  // Apply the saved mix instantly. The first application must not ramp
  // from the bus defaults: the title starts 60 ms after unlock, so a ramp
  // would play it at full gain while a muted session fades to zero.
  function primeVolumes() {
    if (!AC || !exp) return false;
    try {
      var t = AC.currentTime;
      var muted = (exp.mc_muted() >>> 0) !== 0;
      gMaster.gain.cancelScheduledValues(t);
      gMaster.gain.setValueAtTime(muted ? 0 : exp.mc_master(), t);
      gMusic.gain.cancelScheduledValues(t);
      gMusic.gain.setValueAtTime(exp.mc_music(), t);
      gSfx.gain.cancelScheduledValues(t);
      gSfx.gain.setValueAtTime(exp.mc_sfx(), t);
      volumesPrimed = true;
      return true;
    } catch (e) { return false; }
  }

  function applyVolumes() {
    if (!AC || !exp) return;
    if (!volumesPrimed && primeVolumes()) return;
    try {
      var muted = (exp.mc_muted() >>> 0) !== 0;
      var fade = fadeSeconds();
      rampParam(gMaster.gain, muted ? 0 : exp.mc_master(), fade);
      rampParam(gMusic.gain, exp.mc_music(), fade);
      rampParam(gSfx.gain, exp.mc_sfx(), fade);
    } catch (e) { /* ignore */ }
  }

  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function voiceParams(voice) {
    switch (voice) {
      case 1: return { type: 'sine', ratio: 2.00, mix: 0.10, attack: 0.003, decay: 7.0 };
      case 2: return { type: 'triangle', ratio: 2.00, mix: 0.18, attack: 0.030, decay: 2.2 };
      case 3: return { type: 'sine', ratio: 0.50, mix: 0.28, attack: 0.080, decay: 1.2 };
      case 4: return { type: 'sine', ratio: 2.01, mix: 0.26, attack: 0.005, decay: 4.0 };
      case 5: return { type: 'sine', ratio: 2.76, mix: 0.24, attack: 0.006, decay: 2.6 };
      case 6: return { type: 'triangle', ratio: 0.00, mix: 0.00, attack: 0.004, decay: 5.0 };
      default: return { type: 'triangle', ratio: 2.00, mix: 0.20, attack: 0.004, decay: 5.0 };
    }
  }

  // One voice family: a fundamental plus an optional partial, shaped by
  // the shared attack and decay envelope. `ctx` defaults to the live
  // context (the offline E2E hook passes its own). Returns the started
  // oscillators so scheduled tunes can stop them on a transition.
  function playVoice(voice, f0, f1, t, dur, gain, dest, ctx) {
    var C = ctx || AC;
    if (!C) return null;
    var p = voiceParams(voice);
    var attack = Math.min(p.attack, dur * 0.4);
    // Match the desktop envelope's exponential decay: the note reaches
    // exp(-decay * (dur - attack)) at its end instead of a fixed ramp.
    var decayEnd = Math.max(0.0001, gain * Math.exp(-p.decay * Math.max(0, dur - attack)));
    var nodes = [];
    var g = C.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, gain), t + Math.max(0.002, attack));
    var endT = t + Math.max(0.02, dur);
    g.gain.exponentialRampToValueAtTime(decayEnd, endT);
    g.gain.exponentialRampToValueAtTime(0.0001, endT + 0.02);
    g.connect(dest);
    var o = C.createOscillator();
    o.type = p.type;
    // Seed the frequency before the scheduled start: a future
    // setValueAtTime leaves the oscillator on the 440 Hz default for the
    // first render quantum, which detunes the onset and shifts the
    // partial's phase relative to the fundamental.
    o.frequency.value = Math.max(20, f0);
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    o.frequency.linearRampToValueAtTime(Math.max(20, f1), t + Math.max(0.01, dur));
    o.connect(g);
    try { o.start(t); o.stop(endT + 0.02); } catch (e) { /* ignore */ }
    nodes.push(o);
    if (p.ratio > 0 && p.mix > 0) {
      var h = C.createGain();
      h.gain.setValueAtTime(0.0001, t);
      h.gain.linearRampToValueAtTime(Math.max(0.0002, gain * p.mix), t + Math.max(0.002, attack));
      h.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, gain * p.mix * Math.exp(-p.decay * Math.max(0, dur - attack))),
        endT
      );
      h.gain.exponentialRampToValueAtTime(0.0001, endT + 0.02);
      h.connect(dest);
      var ho = C.createOscillator();
      ho.type = 'sine';
      ho.frequency.value = Math.max(20, f0 * p.ratio);
      ho.frequency.setValueAtTime(Math.max(20, f0 * p.ratio), t);
      ho.frequency.linearRampToValueAtTime(Math.max(20, f1 * p.ratio), t + Math.max(0.01, dur));
      ho.connect(h);
      try { ho.start(t); ho.stop(endT + 0.02); } catch (e) { /* ignore */ }
      nodes.push(ho);
    }
    return nodes;
  }

  // Model the exact oscillator phase at 44.1 kHz: envelope-only sums assume
  // every partial peaks in phase, but real sine/triangle pairs cancel, so
  // the old model overestimated peaks by 1.3-1.4x. Rendering the scheduled
  // oscillators at sample level gives each recipe the same normalization
  // the desktop gets from its rendered PCM.
  var MODEL_SR = 44100;

  function modelEnv(t, start, dur, gain, p) {
    var attack = Math.min(p.attack, dur * 0.4);
    var atk = Math.max(0.002, attack);
    var peak = Math.max(0.0002, gain);
    var endT = start + Math.max(0.02, dur);
    var decayEnd = Math.max(0.0001, gain * Math.exp(-p.decay * Math.max(0, dur - attack)));
    if (t < start) return 0;
    if (t < start + atk) return 0.0001 + (peak - 0.0001) * ((t - start) / atk);
    if (t < endT) {
      var f = (t - (start + atk)) / Math.max(1e-9, endT - (start + atk));
      return peak * Math.pow(decayEnd / peak, f);
    }
    if (t < endT + 0.02) {
      return decayEnd * Math.pow(0.0001 / decayEnd, (t - endT) / 0.02);
    }
    return 0;
  }

  function modelPhase(t, start, dur, f0, f1) {
    var dt = t - start;
    if (dt <= 0) return 0;
    var fT = Math.max(0.01, dur);
    var d = Math.min(dt, fT);
    var phase = 2 * Math.PI * (f0 * d + 0.5 * (f1 - f0) / fT * d * d);
    if (dt > fT) phase += 2 * Math.PI * f1 * (dt - fT);
    return phase;
  }

  function modelWave(type, phase) {
    if (type === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase));
    return Math.sin(phase);
  }

  function modelTone(out, voice, f0, f1, start, dur, gain) {
    var p = voiceParams(voice);
    var tail = start + Math.max(0.02, dur) + 0.02;
    var i0 = Math.max(0, Math.floor(start * MODEL_SR));
    var i1 = Math.min(out.length - 1, Math.ceil(tail * MODEL_SR));
    var fA = Math.max(20, f0);
    var fB = Math.max(20, f1);
    var partialA = p.ratio > 0 ? Math.max(20, f0 * p.ratio) : 0;
    var partialB = p.ratio > 0 ? Math.max(20, f1 * p.ratio) : 0;
    var partialGain = gain * p.mix;
    for (var i = i0; i <= i1; i++) {
      var t = i / MODEL_SR;
      var env = modelEnv(t, start, dur, gain, p);
      if (env <= 0) continue;
      out[i] += modelWave(p.type, modelPhase(t, start, dur, fA, fB)) * env;
      if (partialA > 0 && partialGain > 0) {
        var penv = modelEnv(t, start, dur, partialGain, p);
        out[i] += Math.sin(modelPhase(t, start, dur, partialA, partialB)) * penv;
      }
    }
  }

  function modelPeak(notes, seconds) {
    var n = Math.max(1, Math.ceil(seconds * MODEL_SR) + 1);
    var out = new Float32Array(n);
    for (var i = 0; i < notes.length; i++) {
      var nt = notes[i];
      if (!(nt.dur > 0) || !(nt.gain > 0)) continue;
      modelTone(out, nt.voice, nt.f0, nt.f1, nt.start, nt.dur, nt.gain);
    }
    var peak = 0;
    for (i = 0; i < n; i++) {
      var a = Math.abs(out[i]);
      if (a > peak) peak = a;
    }
    return peak;
  }

  // Per-recipe normalization: render every tone at sample level with the
  // exact pitch this play will use and scale the recipe so the loudest
  // overlap lands just under the 0.50 SFX bus ceiling instead of a
  // blanket 0.5 multiplier (desktop normalizes its rendered PCM the same
  // way and lands on the ceiling; the browser keeps a small headroom for
  // its band-limited oscillators).
  // Never cached across plays: `mc_sfx_tone_field` already carries the
  // warden chain pitch (up to 8x) and the crumb variation, so a gain
  // normalized for one play is wrong for the next pitched one.
  function sfxGain(cue, pitch) {
    var gain = 1;
    try {
      var count = exp.mc_sfx_tone_count(cue) >>> 0;
      if (count > 0) {
        var notes = [], end = 0;
        for (var i = 0; i < count; i++) {
          var ms = exp.mc_sfx_tone_field(cue, i, 3) >>> 0;
          var delay = exp.mc_sfx_tone_field(cue, i, 4) >>> 0;
          var toneGain = exp.mc_sfx_tone_field(cue, i, 5);
          if (!(ms > 0) || !(toneGain > 0)) continue;
          var start = delay / 1000;
          var dur = ms / 1000;
          notes.push({
            voice: exp.mc_sfx_tone_field(cue, i, 7) >>> 0,
            f0: exp.mc_sfx_tone_field(cue, i, 1) * pitch,
            f1: exp.mc_sfx_tone_field(cue, i, 2) * pitch,
            start: start,
            dur: dur,
            gain: toneGain
          });
          if (start + dur + 0.02 > end) end = start + dur + 0.02;
        }
        var peak = modelPeak(notes, end);
        // 1.5% headroom: the sample model assumes an ideal triangle, while
        // the browser's band-limited Pluck can peak ~1.2% above it. The
        // conservative target keeps every chain pitch under the ceiling.
        if (peak > 0) gain = (SFX_CEILING * 0.985) / peak;
      }
    } catch (e) { gain = 1; }
    return gain;
  }

  function playSfx(cue, dest, ctx, at, pitchOverride) {
    var C = ctx || AC;
    if (!C) return;
    var count = 0;
    try { count = exp.mc_sfx_tone_count(cue) >>> 0; } catch (e) { return; }
    if (!count) return; // cue has no SFX component.
    var t0 = (at === undefined ? C.currentTime : at) + 0.005;
    var variation = 0;
    try { variation = exp.mc_sfx_tone_field(cue, 0, 6) || 0; } catch (e) { /* ignore */ }
    if (at === undefined) crumbTick++;
    var pitch = pitchOverride !== undefined
      ? Math.max(0.01, pitchOverride)
      : (variation > 0 ? 1 + ((crumbTick % 5) - 2) * variation : 1);
    var recipeGain = sfxGain(cue, pitch);
    for (var i = 0; i < count; i++) {
      var voice, f0, f1, ms, delay, gain;
      try {
        voice = exp.mc_sfx_tone_field(cue, i, 7) >>> 0;
        f0 = exp.mc_sfx_tone_field(cue, i, 1) * pitch;
        f1 = exp.mc_sfx_tone_field(cue, i, 2) * pitch;
        ms = exp.mc_sfx_tone_field(cue, i, 3) >>> 0;
        delay = exp.mc_sfx_tone_field(cue, i, 4) >>> 0;
        gain = exp.mc_sfx_tone_field(cue, i, 5) * recipeGain;
      } catch (e) { return; }
      if (!(ms > 0) || !(gain > 0)) continue;
      playVoice(voice, f0, f1, t0 + delay / 1000, ms / 1000, gain, dest || gSfx, ctx);
    }
  }

  function tuneBpm() {
    try {
      var b = exp.mc_tune_bpm();
      if (b > 0 && b < 400) return b;
    } catch (e) { /* fall through */ }
    return 108;
  }

  // Per-tune normalization: sample-render the scheduled notes at 44.1 kHz and
  // scale so the web music bus honors the shared 0.32 ceiling instead of
  // riding raw velocity (the desktop normalizes rendered PCM the same way).
  function tuneGain(id) {
    if (tuneGainCache[id] !== undefined) return tuneGainCache[id];
    var gain = 1;
    try {
      var len = exp.mc_tune_len(id) >>> 0;
      if (len > 0) {
        var beatSec = 60 / tuneBpm();
        var notes = [], cursors = [0, 0, 0, 0], end = 0, i;
        for (i = 0; i < len; i++) {
          var beats = exp.mc_tune_beats(id, i);
          if (!(beats > 0)) beats = 0.5;
          var track = exp.mc_tune_meta(id, i, 1) >>> 0;
          if (track > 3) track = 3;
          var dur = beats * beatSec;
          var midi = exp.mc_tune_midi(id, i) >>> 0;
          var velocity = exp.mc_tune_meta(id, i, 2);
          if (midi > 0 && velocity > 0) {
            notes.push({
              voice: exp.mc_tune_meta(id, i, 0) >>> 0,
              f0: midiHz(midi),
              f1: midiHz(midi),
              start: cursors[track] * beatSec,
              dur: dur,
              gain: velocity
            });
          }
          cursors[track] += beats;
          if (cursors[track] * beatSec > end) end = cursors[track] * beatSec;
        }
        var peak = modelPeak(notes, end + 0.02);
        if (peak > 0) gain = (MUSIC_CEILING * 0.999) / peak;
      }
    } catch (e) { gain = 1; }
    tuneGainCache[id] = gain;
    return gain;
  }

  function scheduleNote(midi, t, dur, voice, velocity, job, ctx) {
    var nodes = playVoice(voice, midiHz(midi), midiHz(midi), t, dur,
      velocity * (job.gain || 1), job.out, ctx);
    if (nodes) {
      for (var i = 0; i < nodes.length; i++) {
        job.nodes.push({ node: nodes[i], end: t + dur + 0.02 });
      }
    }
  }

  function scheduleTuneIteration(job, t0, ctx) {
    var len = 0;
    try { len = exp.mc_tune_len(job.id) >>> 0; } catch (e) { return t0 + 0.1; }
    var beatSec = 60 / tuneBpm();
    var cursors = [0, 0, 0, 0];
    var end = t0;
    for (var i = 0; i < len; i++) {
      var midi = 0, beats = 0, track = 0, voice = 0, velocity = 0;
      try {
        midi = exp.mc_tune_midi(job.id, i) >>> 0;
        beats = exp.mc_tune_beats(job.id, i);
        track = exp.mc_tune_meta(job.id, i, 1) >>> 0;
        voice = exp.mc_tune_meta(job.id, i, 0) >>> 0;
        velocity = exp.mc_tune_meta(job.id, i, 2);
      } catch (e) { return t0 + 0.1; }
      if (!(beats > 0)) beats = 0.5;
      if (track > 3) track = 3;
      var dur = beats * beatSec;
      if (midi > 0 && velocity > 0) scheduleNote(midi, t0 + cursors[track], dur, voice, velocity, job, ctx);
      cursors[track] += dur;
      if (t0 + cursors[track] > end) end = t0 + cursors[track];
    }
    return end;
  }

  function releaseTune(job) {
    if (!job || !AC) return;
    var t = AC.currentTime;
    try {
      job.out.gain.cancelScheduledValues(t);
      job.out.gain.setValueAtTime(job.out.gain.value, t);
      job.out.gain.linearRampToValueAtTime(0.0001, t + 0.02);
    } catch (e) { /* ignore */ }
    setTimeout(function () {
      try { job.out.disconnect(); } catch (e) { /* ignore */ }
    }, 80);
  }

  function pumpTuneJob(job) {
    if (!tuneJob || tuneJob !== job || !AC) return;
    // A background-throttled tab can leave nextIter in the past; jump it to
    // the present instead of scheduling a huge catch-up burst.
    if (job.nextIter < AC.currentTime) job.nextIter = AC.currentTime + 0.02;
    var horizon = AC.currentTime + 0.5;
    var guard = 0;
    while (job.nextIter < horizon && guard++ < 4) {
      var end = scheduleTuneIteration(job, job.nextIter);
      if (end <= job.nextIter) end = job.nextIter + 0.1;
      job.nextIter = end;
      if (!job.loop) break;
    }
    var now = AC.currentTime;
    job.nodes = job.nodes.filter(function (n) { return n.end > now; });
    if (job.loop) {
      var wait = Math.max(50, (job.nextIter - AC.currentTime - 0.25) * 1000);
      job.timer = setTimeout(function () { pumpTuneJob(job); }, wait);
    } else {
      var stopIn = Math.max(50, (job.nextIter - AC.currentTime + 0.12) * 1000);
      job.timer = setTimeout(function () {
        if (tuneJob === job) {
          tuneJob = null;
          releaseTune(job);
          syncAudioDebug();
        }
      }, stopIn);
    }
  }

  // Stings get their own output on the music bus so they overlap the
  // active loop (desktop uses a separate stings sink for the same reason)
  // and never stop it.
  function startSting(id) {
    if (!AC) return;
    var len = 0;
    try { len = exp.mc_tune_len(id) >>> 0; } catch (e) { return; }
    if (!len) return;
    var out = AC.createGain();
    out.gain.setValueAtTime(1, AC.currentTime);
    out.connect(gMusic);
    var job = { id: id, loop: false, nextIter: AC.currentTime + 0.01, timer: null, out: out, gain: tuneGain(id), nodes: [] };
    var end = scheduleTuneIteration(job, job.nextIter);
    job.timer = setTimeout(function () {
      releaseTune(job);
      for (var i = 0; i < job.nodes.length; i++) {
        try { job.nodes[i].node.stop(AC.currentTime); } catch (e) { /* ignore */ }
      }
    }, Math.max(50, (end - AC.currentTime + 0.12) * 1000));
  }

  function startTune(id, loop) {
    if (!AC) return;
    var len = 0;
    try { len = exp.mc_tune_len(id) >>> 0; } catch (e) { return; }
    if (!len) return;
    stopTune();
    var dataLoop = false;
    try { dataLoop = (exp.mc_tune_looped(id) >>> 0) !== 0; } catch (e) { /* ignore */ }
    var out = AC.createGain();
    out.gain.setValueAtTime(1, AC.currentTime);
    out.connect(gMusic);
    var job = {
      id: id,
      loop: !!loop && dataLoop,
      nextIter: AC.currentTime + 0.06,
      timer: null,
      out: out,
      gain: tuneGain(id),
      nodes: []
    };
    tuneJob = job;
    syncAudioDebug();
    pumpTuneJob(job);
  }

  function stopTune() {
    if (!tuneJob) return;
    var old = tuneJob;
    tuneJob = null;
    if (old.timer) clearTimeout(old.timer);
    if (AC) {
      var t = AC.currentTime;
      try {
        old.out.gain.cancelScheduledValues(t);
        old.out.gain.setValueAtTime(old.out.gain.value, t);
        old.out.gain.linearRampToValueAtTime(0.0001, t + 0.02);
      } catch (e) { /* ignore */ }
      for (var i = 0; i < old.nodes.length; i++) {
        try { old.nodes[i].node.stop(t + 0.03); } catch (e) { /* already stopped */ }
      }
      setTimeout(function () {
        try { old.out.disconnect(); } catch (e) { /* ignore */ }
      }, 80);
    }
    syncAudioDebug();
  }

  // Offline E2E seam: render one scheduler iteration of a tune through the
  // real voice graph and return its peak, proving the bus ceiling.
  window.__mcRenderTunePeak = function (id, seconds) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!exp || !OAC) return Promise.resolve(-1);
    var secs = seconds > 0 ? seconds : 6;
    var ctx;
    try { ctx = new OAC(1, Math.ceil(44100 * secs), 44100); } catch (e) { return Promise.resolve(-1); }
    var out = ctx.createGain();
    out.gain.setValueAtTime(1, 0);
    out.connect(ctx.destination);
    var job = { id: id, loop: false, nextIter: 0, timer: null, out: out, gain: tuneGain(id), nodes: [] };
    scheduleTuneIteration(job, 0, ctx);
    return ctx.startRendering().then(function (buf) {
      var data = buf.getChannelData(0), peak = 0;
      for (var i = 0; i < data.length; i++) {
        var a = Math.abs(data[i]);
        if (a > peak) peak = a;
      }
      return peak;
    }).catch(function () { return -1; });
  };

  // Offline E2E seam: render one SFX recipe through the real playSfx
  // envelope and return its peak, proving the 0.50 bus ceiling. An
  // optional pitch override renders a warden chain arm exactly as the
  // live tone fields would.
  window.__mcRenderSfxPeak = function (cue, seconds, pitch) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!exp || !OAC) return Promise.resolve(-1);
    var secs = seconds > 0 ? seconds : 2;
    var ctx;
    try { ctx = new OAC(1, Math.ceil(44100 * secs), 44100); } catch (e) { return Promise.resolve(-1); }
    var out = ctx.createGain();
    out.gain.setValueAtTime(1, 0);
    out.connect(ctx.destination);
    var saved = crumbTick;
    playSfx(cue, out, ctx, 0, pitch);
    crumbTick = saved;
    return ctx.startRendering().then(function (buf) {
      var data = buf.getChannelData(0), peak = 0;
      for (var i = 0; i < data.length; i++) {
        var a = Math.abs(data[i]);
        if (a > peak) peak = a;
      }
      return peak;
    }).catch(function () { return -1; });
  };

  function onCue(cue) {
    var isMusic = false, tune = 0;
    try {
      isMusic = (exp.mc_cue_is_music(cue) >>> 0) !== 0;
      tune = exp.mc_cue_tune(cue) >>> 0;
    } catch (e) { /* ignore */ }
    // Mirror the desktop: settle the new mix before the confirmation
    // cue, so unmuting is audible instead of starting at master 0.
    if (cue === CUE_MUTE_TOGGLE) {
      primeVolumes();
      // Test/E2E seam: the target scheduled before the confirmation cue
      // (AudioParam.value can lag a scheduled event by one render quantum,
      // so read the target, not the live param).
      try {
        window.__mcMuteCueTarget = (exp.mc_muted() >>> 0) !== 0 ? 0 : exp.mc_master();
      } catch (e) { /* ignore */ }
    }
    if (isMusic) startSting(tune); // one-shot sting; loops are driven by mc_poll_music.
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
    // Keep the pending music poll for the unlock: draining it before the
    // AudioContext exists would store the state with no tune job.
    if (!AC) return;
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

  // Cancel both sides of an armed capture: the Rust session (99) and the
  // visible prompt. Leaving Settings must never leave the capture live, or
  // the next movement key silently rebinds Pause.
  function cancelRebind() {
    if (armedRebind < 0) return;
    try { if (exp) exp.mc_rebind(99); } catch (err) { /* ignore */ }
    disarmRebind();
    refreshBindingLabels();
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
    // Rebind capture: next keydown completes it (Rust side). Escape cancels
    // even from a focused form control; other keys inside a field return to
    // native handling so typing and slider arrows are never trapped.
    if (armedRebind >= 0 && (e.code === 'Escape' || !inField(e.target))) {
      e.preventDefault();
      if (e.code === 'Escape' || !id) {
        cancelRebind();
      } else {
        if (exp) { try { exp.mc_key(id, 1); exp.mc_key(id, 0); } catch (err) { /* ignore */ } }
        disarmRebind();
        refreshBindingLabels();
        saveSettings();
      }
      return;
    }
    if (!id) return; // unmapped key: leave to the browser.
    if (inField(e.target)) return; // never trap keys inside the name input field.
    var playing = isPlaying();
    var onBody = e.target === document.body || e.target === canvas;
    // Menus: P is the menu Back action and M the mute shortcut, global from
    // buttons and scroll regions so a focused primary action can never
    // swallow the documented keys. Escape backs out too, like the Back
    // button, rather than relying on its current keymap binding.
    if (!playing && (id === 11 || id === 12 || id === 13)) {
      e.preventDefault();
      if (id === 13) {
        if (exp) { try { exp.mc_key(13, 1); exp.mc_key(13, 0); } catch (err) { /* ignore */ } }
        saveSettings();
      } else if (exp) {
        try { exp.mc_press(1); } catch (err) { /* ignore */ }
      }
      return;
    }
    // Menus: arrows and their WASD twins move focus from buttons/body; a
    // focused scroll region keeps the browser's native scrolling. Never
    // dispatch a gameplay action here, or a rebound key would fire its
    // bound action instead of moving focus.
    var inScroll = !!(e.target.classList && e.target.classList.contains('panel-scroll'));
    if (!playing && id >= 1 && id <= 8 && !(inScroll && id <= 4)) {
      e.preventDefault();
      moveFocus((id === 2 || id === 4 || id === 7 || id === 8) ? 1 : -1);
      return;
    }
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
    if (id === 13) saveSettings();
    if (playing || onBody) e.preventDefault();
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
    var down = function (e) {
      e.preventDefault(); unlockAudio();
      // A live capture owns the next key press: cancel it instead of
      // completing the Rust-side rebind behind the prompt's back.
      if (armedRebind >= 0) { cancelRebind(); return; }
      if (exp) { try { exp.mc_key(id, 1); } catch (err) {} }
    };
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
    var segs = $('fright-segs');
    if (segs && segs.children.length === 0) {
      for (var si = 0; si < FRIGHT_SEGMENTS; si++) {
        var sp = document.createElement('span');
        sp.setAttribute('aria-hidden', 'true');
        segs.appendChild(sp);
      }
    }

    // Keep overlay cards clear of the sticky header on every viewport.
    var header = document.querySelector('header');
    var syncHeaderHeight = function () {
      if (!header) return;
      var h = header.offsetHeight || 0;
      document.documentElement.style.setProperty('--header-h', h + 'px');
      document.documentElement.style.setProperty('--header-half', (h / 2) + 'px');
    };
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('orientationchange', syncHeaderHeight);
    if (window.ResizeObserver) {
      try { new ResizeObserver(syncHeaderHeight).observe(header); } catch (e) { /* ignore */ }
    }

    var audioChip = $('btn-audio');
    if (audioChip) audioChip.addEventListener('click', unlockAudio);
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
    // Title: each action updates the selected-item description strip.
    var titleIds = ['btn-start', 'btn-title-help', 'btn-title-scores', 'btn-title-settings'];
    titleIds.forEach(function (id) {
      var btn = $(id);
      var describe = function () {
        var desc = btn.getAttribute('data-desc');
        if (desc) { $('title-desc').textContent = desc; }
      };
      btn.addEventListener('mouseenter', describe);
      btn.addEventListener('focus', describe);
    });
    $('btn-start').addEventListener('click', doStart);
    press('btn-title-help', ['mc_goto', 1]);
    press('btn-title-scores', ['mc_goto', 2]);
    press('btn-title-settings', ['mc_goto', 3]);
    // Pause / over.
    $('btn-pause').addEventListener('click', function () {
      unlockAudio();
      if (exp) { try { exp.mc_press(2); } catch (e) { /* ignore */ } }
    });
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
    $('chk-motion').addEventListener('change', function () {
      if (!exp) return;
      try { exp.mc_set_reduced_motion($('chk-motion').checked ? 1 : 0); } catch (e) { /* ignore */ }
      saveSettings();
    });
    $('chk-contrast').addEventListener('change', function () {
      if (!exp) return;
      try { exp.mc_set_high_contrast($('chk-contrast').checked ? 1 : 0); } catch (e) { /* ignore */ }
      saveSettings();
    });
    $('chk-fps').addEventListener('change', function () {
      if (!exp) return;
      try { exp.mc_set_show_fps($('chk-fps').checked ? 1 : 0); } catch (e) { /* ignore */ }
      saveSettings();
      updateHud();
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
        refreshBindingLabels();
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
