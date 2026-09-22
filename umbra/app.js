/**
 * Umbra app.js: boot, tier probe, screen state machine, fixed-step ambient
 * loop, resolution ladder, settings persistence. M1 shows title +
 * versus-demo (ambient) + settings only; later-milestone screens do not
 * exist in the UI until their milestone.
 */

import { buildSceneDesc } from './src/render/scene.js';
import { arenaAt } from './src/arenas.js';
import { resolveTier, tierForFailure, TIER_NAMES } from './src/render/tiers.js';
import { probeCapabilities } from './src/render/caps.js';
import { LADDER, ladderSize, nextLadderIndex, updateEwma } from './src/render/resolution.js';
import { createLocalProvider } from './src/storage/provider.js';
import { loadProfile, saveProfile } from './src/storage/profile.js';
import { summarize } from './src/perf/stats.js';

const $ = (id) => document.getElementById(id);

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
};

function announce(msg) {
  $('status-line').textContent = msg;
}

function showScreen(name) {
  boot.screen = name;
  for (const s of ['title', 'demo', 'settings']) {
    $(`screen-${s}`).hidden = s !== name;
  }
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

  // Fixed-step presentation clock: 60 Hz ticks, max 3 per frame.
  boot.acc += dt;
  let steps = 0;
  while (boot.acc >= 16.667 && steps < 3) {
    boot.acc -= 16.667;
    boot.tick += 1;
    steps += 1;
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

  // Render the shared SceneDesc.
  if (boot.renderer && boot.screen !== 'title') {
    const scene = buildSceneDesc({ tick: boot.tick, arena: 0 });
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

function wireUI() {
  $('btn-versus-demo').addEventListener('click', () => {
    showScreen('demo');
    announce('Versus demo: Wanderer vs Echo, ambient preview. Combat arrives in M2.');
  });
  $('btn-settings').addEventListener('click', () => {
    boot.returnTo = boot.screen === 'settings' ? 'title' : boot.screen;
    writeSettingsForm();
    showScreen('settings');
  });
  $('btn-demo-back').addEventListener('click', () => showScreen('title'));
  $('btn-demo-settings').addEventListener('click', () => {
    boot.returnTo = 'demo';
    writeSettingsForm();
    showScreen('settings');
  });
  $('btn-settings-back').addEventListener('click', () => showScreen(boot.returnTo || 'title'));
  $('settings-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    applySettingsAndRender().catch((err) => announce(`Settings failed: ${err.message}`));
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && boot.screen === 'title') $('btn-versus-demo').click();
    else if ((ev.key === 's' || ev.key === 'S') && boot.screen !== 'settings') $('btn-settings').click();
    else if (ev.key === 'Escape' && boot.screen !== 'title') {
      showScreen(boot.screen === 'settings' ? boot.returnTo || 'title' : 'title');
    }
  });
}

async function bootApp() {
  wireUI();
  showScreen('title');

  // Test hook (also handy for debugging): ?tier=0|1|2|auto&screen=demo|settings
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
    announce(`Umbra ready on ${TIER_NAMES[boot.tier]}. Choose Versus demo or Settings.`);
  } catch (err) {
    announce(`No renderer available: ${err.message}`);
    return;
  }

  if (paramScreen === 'demo' || paramScreen === 'settings') {
    if (paramScreen === 'settings') writeSettingsForm();
    showScreen(paramScreen);
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
