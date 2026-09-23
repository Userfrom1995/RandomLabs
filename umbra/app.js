/**
 * Umbra app.js: boot, tier probe, screen state machine, fixed-step fight
 * loop, resolution ladder, settings + bindings persistence, touch overlay,
 * gamepad polling, HUD, pause/result flow. M2 adds the playable versus
 * bout (player vs seeded AI, best of 3) on top of the M1 render shell.
 */

import { buildSceneDesc } from './src/render/scene.js';
import { arenaAt } from './src/arenas.js';
import { resolveTier, tierForFailure, TIER_NAMES } from './src/render/tiers.js';
import { probeCapabilities } from './src/render/caps.js';
import { LADDER, ladderSize, nextLadderIndex, updateEwma } from './src/render/resolution.js';
import { createLocalProvider } from './src/storage/provider.js';
import { loadProfile, saveProfile } from './src/storage/profile.js';
import { summarize } from './src/perf/stats.js';
import { createFight, stepFight } from './src/combat/engine.js';
import { createAI, aiInput } from './src/combat/ai.js';
import {
  defaultBindings,
  loadBindings,
  serializeBindings,
  rebind,
  describeBindings,
} from './src/input/bindings.js';
import { createKeyboard } from './src/input/keyboard.js';
import { createGamepadPoller } from './src/input/gamepad.js';
import { createTouchState, shouldVibrate } from './src/input/touch.js';
import { mergeInputs } from './src/input/combine.js';

const $ = (id) => document.getElementById(id);
const BINDINGS_PATH = 'bindings.json';

const boot = {
  renderer: null,
  tier: 2,
  probed: 2,
  tick: 0,
  acc: 0,
  lastFrameMs: 0,
  ewma: 16.7,
  lastSwitchMs: 0,
  ladderIndex: 1,
  ladderLock: null,
  frameSamples: [],
  screen: 'title',
  returnTo: 'title',
  profile: null,
  provider: null,
  // M2 fight state.
  fight: null,
  ai: null,
  paused: false,
  keyboard: null,
  touch: null,
  pad: null,
  bindings: null,
  lastVibrateMs: null,
  seenEvents: 0,
  bannerUntil: 0,
  remapCapture: null,
  prevPadPause: false,
  joyJumpFired: false,
};

function announce(msg) {
  $('status-line').textContent = msg;
}

function isTouchDevice() {
  try {
    if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
  } catch {
    // URL parsing is best-effort; fall through to device detection.
  }
  if (typeof window === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if (typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }
  return false;
}

function showScreen(name) {
  boot.screen = name;
  for (const s of ['title', 'fight', 'settings']) {
    $(`screen-${s}`).hidden = s !== name;
  }
  const inFight = name === 'fight';
  $('touch-ui').hidden = !(inFight && isTouchDevice());
  if (!inFight) {
    drainInputs();
    boot.fight = null;
    boot.paused = false;
    $('pause-overlay').hidden = true;
    $('result-overlay').hidden = true;
    hideBanner();
  }
}

/**
 * Consume-and-discard one tick from every input source so edges queued
 * while paused, finished, or off-screen never fire stale on resume.
 */
function drainInputs() {
  try {
    if (boot.keyboard) boot.keyboard.consumeTick();
  } catch {
    // Draining is best-effort; a wedged driver must not break screens.
  }
  try {
    if (boot.touch) boot.touch.consumeTick();
  } catch {
    // Touch drain is best-effort.
  }
  try {
    if (boot.pad) boot.pad.poll();
  } catch {
    // Pad drain is best-effort.
  }
}

function showBanner(text, ticksVisible) {
  const el = $('banner');
  el.textContent = text;
  el.hidden = false;
  boot.bannerUntil = boot.fight ? boot.fight.tick + ticksVisible : ticksVisible;
}

function hideBanner() {
  $('banner').hidden = true;
  boot.bannerUntil = 0;
}

function updateHud() {
  const f = boot.fight;
  if (!f) return;
  for (let side = 0; side < 2; side++) {
    const p = f.fighters[side];
    const maxHp = Number.isFinite(p.maxHp) && p.maxHp > 0 ? p.maxHp : 1;
    const hp = Number.isFinite(p.hp) ? p.hp : 0;
    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    $(`hud-health-${side}`).style.width = `${hpPct}%`;
    $(`hud-health-${side}`).setAttribute('aria-valuenow', String(Math.round(hpPct)));
    const stPct = Math.max(0, Math.min(100, Number.isFinite(p.stamina) ? p.stamina : 0));
    $(`hud-stamina-${side}`).style.width = `${stPct}%`;
    const won = f.wins[side];
    const needed = Math.floor(f.rounds / 2) + 1;
    $(`hud-pips-${side}`).textContent = '●'.repeat(won) + '○'.repeat(Math.max(0, needed - won));
  }
  $('hud-timer').textContent = String(Math.max(0, Math.ceil(f.timer / 60)));
  // Combo: the freshest attacker combo inside the 90-tick window wins,
  // so a newer P1 combo always replaces a stale P0 one (and vice versa).
  let comboText = '';
  let freshest = Number.NEGATIVE_INFINITY;
  for (let side = 0; side < 2; side++) {
    const p = f.fighters[side];
    if (p.combo > 1 && f.tick - p.comboTick < 90 && p.comboTick > freshest) {
      freshest = p.comboTick;
      comboText = side === 0 ? `${p.combo} HITS` : `HIT x${p.combo}`;
    }
  }
  $('hud-combo').textContent = comboText;
}

function handleFightEvents() {
  const f = boot.fight;
  if (!f) return;
  const fresh = f.events.slice(boot.seenEvents);
  boot.seenEvents = f.events.length;
  for (const e of fresh) {
    if (e.t === 'round') {
      if (f.over) {
        showResult();
      } else {
        showBanner(e.side === -1 ? 'DRAW' : e.side === 0 ? 'YOU TAKE THE ROUND' : 'ECHO TAKES THE ROUND', 110);
      }
    } else if (e.t === 'hit' || e.t === 'parried') {
      // Haptics: sharp buzz when the player is hit, light tick when landing.
      const heavy = e.side === 1;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (shouldVibrate(boot.lastVibrateMs, now) && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(heavy ? 40 : 15);
          boot.lastVibrateMs = now;
        } catch {
          // Haptics are enhancement-only.
        }
      }
    }
  }
  if (f.phase === 'intro' && f.phaseTick === 1) {
    showBanner(f.round === 1 ? 'ROUND 1 — FIGHT' : `ROUND ${f.round} — FIGHT`, 70);
  }
  if (f.tick >= boot.bannerUntil && !$('banner').hidden) hideBanner();
}

function showResult() {
  const f = boot.fight;
  if (!f) return;
  const title = f.winner === 0 ? 'Victory' : f.winner === 1 ? 'Defeat' : 'Draw';
  $('result-title').textContent = title;
  $('result-sub').textContent =
    f.winner === 0
      ? `You best Echo ${f.wins[0]}–${f.wins[1]} in the moonlit temple.`
      : f.winner === 1
        ? `Echo prevails ${f.wins[1]}–${f.wins[0]}. Study the guard, then rematch.`
        : 'Neither shadow yields. Rematch to settle it.';
  $('result-overlay').hidden = false;
  announce(`Bout over: ${title} (${f.wins[0]}–${f.wins[1]}).`);
}

function startFight() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  boot.fight = createFight({ seed, arena: 0, rounds: 3 });
  boot.ai = createAI({ seed: (seed ^ 0x9e3779b9) >>> 0, difficulty: 1, archetype: 'brawler' });
  boot.paused = false;
  boot.seenEvents = 0;
  boot.lastVibrateMs = null;
  drainInputs();
  if (boot.touch) boot.touch.reset();
  if (boot.pad) boot.pad.reset();
  $('pause-overlay').hidden = true;
  $('result-overlay').hidden = true;
  showScreen('fight');
  updateHud();
  announce('Fight! Best of three against Echo. J punch, K kick, L block, U special, Space dash.');
}

function togglePause(force) {
  if (boot.screen !== 'fight' || !boot.fight || boot.fight.over) return;
  boot.paused = typeof force === 'boolean' ? force : !boot.paused;
  $('pause-overlay').hidden = !boot.paused;
  announce(boot.paused ? 'Paused.' : 'Resumed.');
}

function pollPadPause() {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return false;
    const pads = navigator.getGamepads();
    if (!pads) return false;
    // Any connected pad's Start button pauses (hot-plug tolerant: all indexes).
    let down = false;
    for (const pad of pads) {
      const b = pad && pad.buttons && pad.buttons[9];
      if (b && (b.pressed === true || (typeof b.value === 'number' && b.value > 0.5))) {
        down = true;
        break;
      }
    }
    const edge = down && !boot.prevPadPause;
    boot.prevPadPause = down;
    return edge;
  } catch {
    return false;
  }
}

/** Pause codes from the remappable bindings table (defaults to Escape). */
function pauseCodes() {
  const codes = boot.bindings && Array.isArray(boot.bindings.pause) ? boot.bindings.pause : null;
  return codes && codes.length > 0 ? codes : ['Escape'];
}

/** One fixed-step sim tick: gather universal input, sample AI, advance. */
function tickFight() {
  // Drain first even when paused/finished: stale edges must never fire later.
  const kb = boot.keyboard ? boot.keyboard.consumeTick() : null;
  const touch = boot.touch ? boot.touch.consumeTick() : null;
  const pad = boot.pad ? boot.pad.poll() : null;
  const f = boot.fight;
  if (!f || boot.paused || f.over) return;
  const p1 = mergeInputs(kb, touch, pad);
  const p2 = aiInput(boot.ai, f.fighters[1], f.fighters[0], undefined, f.tick);
  stepFight(f, p1, p2);
  handleFightEvents();
  updateHud();
}

async function initRenderer(tier) {
  if (boot.renderer) {
    try {
      boot.renderer.dispose();
    } catch {
      // Disposal is best-effort; continue to the replacement renderer.
    }
    boot.renderer = null;
  }
  const canvas = $('umbra-canvas');
  if (tier === 0) {
    const { createWebGPURenderer } = await import('./src/render/webgpu/pipeline.js');
    boot.renderer = await createWebGPURenderer(canvas);
  } else if (tier === 1) {
    const { createWebGL2Renderer } = await import('./src/render/webgl2/renderer.js');
    boot.renderer = createWebGL2Renderer(canvas);
  } else {
    const { createCanvas2DRenderer } = await import('./src/render/canvas2d/painter.js');
    boot.renderer = createCanvas2DRenderer(canvas);
  }
  boot.tier = tier;
  $('hud-tier').textContent = `tier: ${tier} ${TIER_NAMES[tier]}`;
}

/** Initialize with fallback chain: requested tier, then lower tiers. */
async function initRendererWithFallback(want) {
  let tier = want;
  for (;;) {
    try {
      await initRenderer(tier);
      return;
    } catch (err) {
      const next = tierForFailure(tier);
      announce(`Renderer tier ${tier} failed (${err.message}); trying tier ${next}.`);
      if (next < 0) throw err;
      tier = next;
    }
  }
}

function applyCanvasSize() {
  const size = boot.ladderLock != null ? ladderSize(boot.ladderLock) : ladderSize(boot.ladderIndex);
  const canvas = $('umbra-canvas');
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
}

function frame(nowMs) {
  requestAnimationFrame(frame);
  if (!boot.lastFrameMs) boot.lastFrameMs = nowMs;
  const dt = Math.min(100, nowMs - boot.lastFrameMs);
  boot.lastFrameMs = nowMs;

  // Fixed-step clock: 60 Hz, max 3 ticks per frame. Fight sim ticks here;
  // edges are consumed once per tick so input latency stays <= 2 ticks.
  boot.acc += dt;
  let steps = 0;
  while (boot.acc >= 16.667 && steps < 3) {
    boot.acc -= 16.667;
    boot.tick += 1;
    steps += 1;
    if (boot.screen === 'fight') {
      if (pollPadPause()) togglePause();
      tickFight();
    }
  }
  if (steps === 3) boot.acc = 0;

  // Resolution governor.
  boot.ewma = updateEwma(boot.ewma, dt);
  const next = nextLadderIndex({
    index: boot.ladderIndex,
    ewma: boot.ewma,
    nowMs,
    lastSwitchMs: boot.lastSwitchMs,
    batterySaver: boot.profile.config.batterySaver,
  });
  if (next !== boot.ladderIndex) {
    boot.ladderIndex = next;
    boot.lastSwitchMs = nowMs;
  }
  applyCanvasSize();

  // Render the shared SceneDesc: live fight when bouting, ambient otherwise.
  if (boot.renderer && boot.screen !== 'title') {
    const scene =
      boot.screen === 'fight' && boot.fight
        ? buildSceneDesc({ tick: boot.fight.tick, arena: 0, fight: boot.fight })
        : buildSceneDesc({ tick: boot.tick, arena: 0 });
    try {
      boot.renderer.render(scene, arenaAt(0), {
        batterySaver: boot.profile.config.batterySaver,
        reducedMotion: boot.profile.config.reducedMotion,
      });
    } catch (err) {
      announce(`Render error: ${err.message}`);
    }
  } else if (boot.renderer && boot.screen === 'title') {
    // Title keeps a live ambient frame behind the menu (frozen clock).
    const scene = buildSceneDesc({ tick: 0, arena: 0 });
    try {
      boot.renderer.render(scene, arenaAt(0), {
        batterySaver: boot.profile.config.batterySaver,
        reducedMotion: true,
      });
    } catch {
      // Title backdrop is decorative; the demo loop reports errors.
    }
  }

  // FPS meter (rolling 60 samples).
  boot.frameSamples.push(dt);
  if (boot.frameSamples.length > 60) boot.frameSamples.shift();
  if (boot.tick % 30 === 0) {
    const s = summarize(boot.frameSamples);
    if (Number.isFinite(s.mean) && s.mean > 0) {
      $('hud-fps').textContent = `${Math.round(1000 / s.mean)} fps (${LADDER[boot.ladderIndex].w}x${LADDER[boot.ladderIndex].h})`;
    }
  }
}

function readSettingsForm() {
  const tierVal = $('set-tier').value;
  const ladVal = $('set-ladder').value;
  boot.profile.config.tier = tierVal === 'auto' ? 'auto' : Number(tierVal);
  boot.ladderLock = ladVal === 'auto' ? null : Number(ladVal);
  boot.profile.config.ladderIndex = boot.ladderLock != null ? boot.ladderLock : boot.ladderIndex;
  boot.profile.config.batterySaver = $('set-battery').checked;
  boot.profile.config.reducedMotion = $('set-motion').checked;
}

function writeSettingsForm() {
  const c = boot.profile.config;
  $('set-tier').value = String(c.tier);
  $('set-ladder').value = boot.ladderLock != null ? String(boot.ladderLock) : 'auto';
  $('set-battery').checked = c.batterySaver;
  $('set-motion').checked = c.reducedMotion;
}

async function applySettingsAndRender() {
  readSettingsForm();
  await saveProfile(boot.provider, boot.profile);
  const want = resolveTier({ override: boot.profile.config.tier, cached: boot.tier, probed: boot.probed });
  await initRendererWithFallback(want);
  applyCanvasSize();
  announce(`Settings saved. Renderer: ${TIER_NAMES[boot.tier]}.`);
}

async function persistBindings() {
  try {
    await boot.provider.writeJSON(BINDINGS_PATH, serializeBindings(boot.bindings));
  } catch {
    // Bindings persistence is best-effort; the session table still applies.
  }
}

function renderRemap() {
  const list = $('remap-list');
  list.innerHTML = '';
  for (const { action, label, codes } of describeBindings(boot.bindings)) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = label;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.action = action;
    btn.textContent = boot.remapCapture === action ? 'press a key…' : codes.join(' · ') || 'unbound';
    btn.addEventListener('click', () => {
      boot.remapCapture = action;
      renderRemap();
      announce(`Press a key for ${label}. Escape cancels.`);
    });
    li.append(name, btn);
    list.append(li);
  }
}

function wireTouch() {
  const joy = $('joystick');
  const knob = $('joy-knob');
  const setKnob = (dx, dy) => {
    const max = 40;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, max);
    knob.style.transform = `translate(${(dx / len) * cl}px, ${(dy / len) * cl}px)`;
  };
  joy.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    try {
      joy.setPointerCapture(ev.pointerId);
    } catch {
      // Capture is enhancement; state tracking still works.
    }
    const r = joy.getBoundingClientRect();
    boot.touch.joyStart(ev.pointerId, r.left + r.width / 2, r.top + r.height / 2);
    boot.joyJumpFired = false;
    setKnob(0, 0);
  });
  joy.addEventListener('pointermove', (ev) => {
    if (!boot.touch.joy.active || boot.touch.joy.pointerId !== ev.pointerId) return;
    ev.preventDefault();
    boot.touch.joyMove(ev.pointerId, ev.clientX, ev.clientY);
    setKnob(boot.touch.joy.dx, boot.touch.joy.dy);
    // Swipe-up jump: a hard upward flick fires one jump edge per touch.
    if (!boot.joyJumpFired && boot.touch.joy.dy < -48) {
      boot.joyJumpFired = true;
      boot.touch.press('jump');
    }
  });
  const endJoy = (ev) => {
    boot.touch.joyEnd(ev.pointerId);
    setKnob(0, 0);
  };
  joy.addEventListener('pointerup', endJoy);
  joy.addEventListener('pointercancel', endJoy);

  for (const btn of ['punch', 'kick', 'block', 'special', 'jump', 'dash']) {
    const el = $(`btn-${btn}`);
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      boot.touch.press(btn);
    });
    const release = (ev) => {
      ev.preventDefault();
      boot.touch.release(btn);
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', (ev) => {
      if (ev.buttons !== 0) boot.touch.release(btn);
    });
    // Touch buttons must never take keyboard focus mid-bout.
    el.addEventListener('mousedown', (ev) => ev.preventDefault());
  }
}

function wireUI() {
  $('btn-versus').addEventListener('click', () => startFight());
  $('btn-settings').addEventListener('click', () => {
    boot.returnTo = boot.screen === 'settings' ? 'title' : boot.screen;
    writeSettingsForm();
    renderRemap();
    showScreen('settings');
  });
  $('btn-pause').addEventListener('click', () => togglePause(true));
  $('btn-fight-quit').addEventListener('click', () => showScreen('title'));
  $('btn-resume').addEventListener('click', () => togglePause(false));
  $('btn-quit').addEventListener('click', () => showScreen('title'));
  $('btn-rematch').addEventListener('click', () => startFight());
  $('btn-result-title').addEventListener('click', () => showScreen('title'));
  $('btn-settings-back').addEventListener('click', () => {
    boot.remapCapture = null;
    showScreen(boot.returnTo || 'title');
  });
  $('settings-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    applySettingsAndRender().catch((err) => announce(`Settings failed: ${err.message}`));
  });

  // Remap capture: the next keydown rebinds the pending action (Esc cancels).
  // stopImmediatePropagation (not stopPropagation) so the generic pause
  // handler on the same node below never sees the capture keystroke.
  document.addEventListener(
    'keydown',
    (ev) => {
      if (!boot.remapCapture) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const action = boot.remapCapture;
      boot.remapCapture = null;
      if (ev.code !== 'Escape') {
        boot.bindings = rebind(boot.bindings, action, ev.code);
        if (boot.keyboard) {
          boot.keyboard.detach();
          boot.keyboard = createKeyboard(boot.bindings);
          boot.keyboard.attach(document);
        }
        persistBindings().catch(() => {});
        announce(`Bound ${action} to ${ev.code}.`);
      } else {
        announce('Rebind cancelled.');
      }
      renderRemap();
    },
    true,
  );

  document.addEventListener('keydown', (ev) => {
    if (boot.remapCapture) return;
    const codes = pauseCodes();
    if (ev.key === 'Enter' && boot.screen === 'title') $('btn-versus').click();
    else if ((ev.key === 's' || ev.key === 'S') && boot.screen === 'title') $('btn-settings').click();
    else if (codes.includes(ev.code) && boot.screen === 'fight') togglePause();
    else if (codes.includes(ev.code) && boot.screen !== 'title') {
      showScreen(boot.screen === 'settings' ? boot.returnTo || 'title' : 'title');
    }
  });

  const clearStuckInputs = () => {
    if (boot.keyboard) boot.keyboard.clear();
    if (boot.touch) boot.touch.reset();
    if (boot.pad) boot.pad.reset();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && boot.screen === 'fight' && boot.fight && !boot.fight.over) {
      clearStuckInputs();
      togglePause(true);
    } else if (document.hidden) {
      clearStuckInputs();
    }
  });
  window.addEventListener('blur', () => {
    if (boot.screen === 'fight' && boot.fight && !boot.fight.over) {
      clearStuckInputs();
      togglePause(true);
    } else {
      clearStuckInputs();
    }
  });
}

async function bootApp() {
  boot.touch = createTouchState();
  boot.pad = createGamepadPoller();
  wireTouch();
  wireUI();
  showScreen('title');

  // Test hook (also handy for debugging): ?tier=0|1|2|auto&screen=fight|settings
  // overrides the stored config for this load without persisting it.
  const params = new URLSearchParams(window.location.search);
  const paramTier = params.get('tier');
  const paramScreen = params.get('screen');

  boot.provider = createLocalProvider(window.localStorage);
  try {
    boot.profile = await loadProfile(boot.provider);
  } catch {
    const { defaultProfile } = await import('./src/storage/profile.js');
    boot.profile = defaultProfile();
  }
  try {
    const raw = await boot.provider.readJSON(BINDINGS_PATH);
    const loaded = raw == null ? { ok: true, bindings: defaultBindings() } : loadBindings(raw);
    boot.bindings = loaded.ok ? loaded.bindings : defaultBindings();
  } catch {
    boot.bindings = defaultBindings();
  }
  boot.keyboard = createKeyboard(boot.bindings);
  boot.keyboard.attach(document);
  boot.ladderIndex = boot.profile.config.ladderIndex || 1;

  // Persist tier probe for next boot, then resolve with override support.
  try {
    boot.probed = await probeCapabilities();
    try {
      window.localStorage.setItem('umbra/tier-probe', String(boot.probed));
    } catch {
      // Probe cache is best-effort.
    }
  } catch {
    const cached = window.localStorage.getItem('umbra/tier-probe');
    boot.probed = cached === '0' || cached === '1' ? Number(cached) : 2;
  }
  const want = resolveTier({
    override: paramTier != null ? paramTier : boot.profile.config.tier,
    cached: null,
    probed: boot.probed,
  });
  try {
    await initRendererWithFallback(want);
    announce(`Umbra ready on ${TIER_NAMES[boot.tier]}. Versus fight or Settings.`);
  } catch (err) {
    announce(`No renderer available: ${err.message}`);
    return;
  }

  if (paramScreen === 'fight' || paramScreen === 'settings') {
    if (paramScreen === 'settings') {
      writeSettingsForm();
      renderRemap();
      showScreen(paramScreen);
    } else {
      startFight();
    }
  }

  applyCanvasSize();
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch {
      // Offline shell is enhancement; the game runs without it.
    }
  }
  requestAnimationFrame(frame);
}

bootApp().catch((err) => {
  announce(`Boot failed: ${err && err.message ? err.message : err}`);
});
