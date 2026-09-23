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
import { PLAYABLES, ENEMIES, fighterById } from './src/roster.js';
import { WEAPONS, weaponById, movesForWeapon } from './src/weapons.js';
import { bossFor } from './src/bosses.js';
import {
  awardFor,
  upgradeCost,
  upgradeEffect,
  buyWeapon,
  buyUpgrade,
  MAX_UPGRADE,
  UPGRADE_TRACKS,
} from './src/economy.js';
import { exportBundle, importBundle } from './src/storage/bundle.js';
import { TRIALS, trialById, checkTrial, frameRows } from './src/dojo.js';
import {
  STORY_NODES,
  nodeById,
  storyCursor,
  completeNode,
  applyStoryUnlocks,
} from './src/story.js';
import {
  createDialogue,
  dialogueDone,
  currentLine,
  visibleText,
  advanceDialogue,
  nextDialogueLine,
} from './src/dialogue.js';
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
  // M3 bout setup + story flow.
  bout: null,
  selectMode: 'versus',
  versusP0: 'kaito',
  storyP0: 'kaito',
  versusFoe: 'echo',
  versusArena: 0,
  // M4 loadout + progression.
  versusWeapon: 'fists',
  claimedTrials: null,
  dialogue: null,
  dialogueOnDone: null,
  ambientArena: 0,
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

const SCREENS = ['title', 'select', 'story', 'versus', 'fight', 'settings', 'shop', 'dojo'];

function showScreen(name) {
  boot.screen = name;
  for (const s of SCREENS) {
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
    closeDialogue();
  }
  if (boot.profile) updateEmber();
}

/**
 * Consume-and-discard one tick from every input source so edges queued
 * while paused, finished, or off-screen never fire stale on resume.
 * Held keyboard levels are fully released here as well: block/move held
 * across a screen transition must not leak into the next fight.
 */
function drainInputs() {
  try {
    if (boot.keyboard) boot.keyboard.clear();
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

/** Banner text for a boss phase event (null when not a boss moment). */
function bossBanner(e) {
  const b = boot.bout;
  if (!b || !b.boss) return null;
  const def = bossFor(b.boss);
  if (!def) return null;
  if (typeof e.move !== 'string') return null;
  if (e.move === 'wisp') return 'A HOLLOW WISP RISES';
  if (e.move === 'enrage') return 'THE ECLIPSE RAGES';
  if (e.move === 'stance-0' || e.move === 'stance-1') return 'RUIN SHIFTS ITS STANCE';
  const m = /^phase-(\d)$/.exec(e.move);
  if (m) {
    const ph = def.phases[Number(m[1])];
    return ph ? ph.banner : null;
  }
  return null;
}

/** Claim freshly completed dojo trials (side-0 hits only). */
function claimTrials() {
  const f = boot.fight;
  if (!f || !boot.bout || boot.bout.mode !== 'dojo') return;
  if (!boot.claimedTrials) boot.claimedTrials = new Set();
  for (const t of TRIALS) {
    if (boot.claimedTrials.has(t.id)) continue;
    if (!checkTrial(t.id, f.events, 0).ok) continue;
    boot.claimedTrials.add(t.id);
    const stats = boot.profile.progress.stats || (boot.profile.progress.stats = {});
    const done = Array.isArray(stats.trials) ? stats.trials : (stats.trials = []);
    if (!done.includes(t.id)) done.push(t.id);
    boot.profile.progress.currency = Math.max(0, (boot.profile.progress.currency || 0) + t.reward);
    persistProfile();
    updateEmber();
    showBanner(`TRIAL COMPLETE: ${t.name} (+${t.reward} ember)`, 110);
    announce(`Trial complete: ${t.name}. Plus ${t.reward} ember.`);
  }
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
    } else if (e.t === 'phase') {
      const banner = bossBanner(e);
      if (banner) showBanner(banner, 110);
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
    if (boot.bout && boot.bout.boss) {
      const def = bossFor(boot.bout.boss);
      showBanner(def ? def.name.toUpperCase() : 'BOSS FIGHT', 110);
    } else {
      showBanner(f.round === 1 ? 'ROUND 1 - FIGHT' : `ROUND ${f.round} - FIGHT`, 70);
    }
  }
  claimTrials();
  if (f.tick >= boot.bannerUntil && !$('banner').hidden) hideBanner();
}

function showResult() {
  const f = boot.fight;
  if (!f) return;
  const b = boot.bout || { p0: 'kaito', p1: 'echo', mode: 'versus', nodeId: null, boss: null };
  const n0 = fighterName(b.p0, 'You');
  const n1 = fighterName(b.p1, 'Echo');
  const title = f.winner === 0 ? 'Victory' : f.winner === 1 ? 'Defeat' : 'Draw';
  $('result-title').textContent = title;
  // M4 progression: ember awards + career stats (dojo pays via trials only).
  let awardLine = '';
  if (b.mode !== 'dojo') {
    const outcome = f.winner === 0 ? 'win' : f.winner === 1 ? 'loss' : 'draw';
    const stats = boot.profile.progress.stats || (boot.profile.progress.stats = {});
    const careerWins = Number.isInteger(stats.wins) ? stats.wins : 0;
    const award = awardFor({
      outcome,
      roundsWon: f.wins[0],
      boss: !!b.boss && f.winner === 0,
      careerWins,
    });
    boot.profile.progress.currency = Math.max(0, (boot.profile.progress.currency || 0) + award.currency);
    if (f.winner === 0) stats.wins = careerWins + 1;
    else if (f.winner === 1) stats.losses = (Number.isInteger(stats.losses) ? stats.losses : 0) + 1;
    if (b.boss && f.winner === 0) stats.bossWins = (Number.isInteger(stats.bossWins) ? stats.bossWins : 0) + 1;
    awardLine = ` Plus ${award.currency} ember${award.jackpot ? ' (jackpot)' : ''}.`;
    persistProfile();
    updateEmber();
  }
  $('result-sub').textContent =
    f.winner === 0
      ? `${n0} bests ${n1} ${f.wins[0]}-${f.wins[1]}.${awardLine}`
      : f.winner === 1
        ? `${n1} prevails ${f.wins[1]}-${f.wins[0]}. Study the guard, then rematch.${awardLine}`
        : `Neither shadow yields. Rematch to settle it.${awardLine}`;
  // Story bouts won by the player continue the tale; everything else
  // offers rematch/title only (a loss earns no progress).
  const storyWin = b.mode === 'story' && f.winner === 0 && b.nodeId != null;
  $('btn-result-continue').hidden = !storyWin;
  $('result-overlay').hidden = false;
  announce(`Bout over: ${title} (${f.wins[0]}-${f.wins[1]}).`);
}

/** Display name for a roster id (falls back for legacy bouts). */
function fighterName(id, fallback) {
  const def = fighterById(id);
  return def ? def.name : fallback;
}

/**
 * M4 bout setup: versus (chosen fighter/enemy/arena/weapon), story
 * (scripted act fight, boss mechanics when the foe is vex/ruin/dusk), or
 * dojo (unresisting dummy for trial practice). Roster stats apply per
 * side; the player side wields the chosen weapon table, the foe fights
 * barehanded; upgrade tracks apply as side-0 power and bonus hp.
 */
function startFight(opts = {}) {
  const profile = boot.profile;
  const mode = opts.mode === 'story' ? 'story' : opts.mode === 'dojo' ? 'dojo' : 'versus';
  const p0 = fighterById(opts.p0) || fighterById('kaito');
  const p1 = fighterById(opts.p1) || fighterById('echo');
  const arena = Number.isInteger(opts.arena) && opts.arena >= 0 ? opts.arena : 0;
  const rounds = mode === 'dojo' ? 1 : Number.isInteger(opts.rounds) && opts.rounds >= 1 ? opts.rounds : 3;
  const roundTicks = mode === 'dojo' ? 5400 : undefined;
  const weapon0 = weaponById(opts.weapon0) ? opts.weapon0 : equippedWeapon();
  const weapon1 = 'fists';
  const upgrades = (profile.progress && profile.progress.upgrades) || { dmg: 0, hp: 0 };
  const dmgLvl = Number.isInteger(upgrades.dmg) ? Math.max(0, Math.min(MAX_UPGRADE, upgrades.dmg)) : 0;
  const hpLvl = Number.isInteger(upgrades.hp) ? Math.max(0, Math.min(MAX_UPGRADE, upgrades.hp)) : 0;
  const power = [upgradeEffect('dmg', dmgLvl) || 1, 1];
  const boss = mode === 'dojo' ? null : (bossFor(p1.id) ? bossFor(p1.id).id : null);
  const seed = (Math.random() * 0xffffffff) >>> 0;
  const fight = createFight({
    seed,
    arena,
    rounds,
    ...(roundTicks ? { roundTicks } : {}),
    moves: movesForWeapon(weapon0),
    movesB: movesForWeapon(weapon1),
    power,
    boss,
  });
  fight.fighters[0].hp = p0.hp + (upgradeEffect('hp', hpLvl) || 0);
  fight.fighters[0].maxHp = fight.fighters[0].hp;
  const foeHp = mode === 'dojo' ? 200 : p1.hp;
  fight.fighters[1].hp = foeHp;
  fight.fighters[1].maxHp = foeHp;
  boot.fight = fight;
  boot.ai = createAI({ seed: (seed ^ 0x9e3779b9) >>> 0, difficulty: p1.difficulty, archetype: p1.ai });
  boot.bout = { mode, p0: p0.id, p1: p1.id, arena, nodeId: opts.nodeId || null, weapon0, weapon1, boss };
  boot.claimedTrials = new Set((profile.progress.stats && profile.progress.stats.trials) || []);
  boot.paused = false;
  boot.seenEvents = 0;
  boot.lastVibrateMs = null;
  drainInputs();
  if (boot.keyboard) boot.keyboard.clear();
  if (boot.touch) boot.touch.reset();
  if (boot.pad) boot.pad.reset();
  $('pause-overlay').hidden = true;
  $('result-overlay').hidden = true;
  $('btn-result-continue').hidden = true;
  $('fname-0').textContent = mode === 'story' ? p0.name : mode === 'dojo' ? `${p0.name} (dojo)` : `You (${p0.name})`;
  $('fname-1').textContent = mode === 'dojo' ? `${p1.name} (dummy)` : p1.name;
  $('fight-title').innerHTML = '';
  const modeLabel = mode === 'story' ? 'Story' : mode === 'dojo' ? 'Dojo' : 'Versus';
  $('fight-title').append(
    document.createTextNode(`${modeLabel}: ${p0.name} vs ${p1.name} `),
    Object.assign(document.createElement('span'), { className: 'pill', textContent: mode === 'dojo' ? weaponName(weapon0) : `best of ${rounds}` }),
  );
  const arenaName = arenaAt(arena).name;
  $('hud-scene').textContent = arenaName;
  showScreen('fight');
  updateHud();
  announce(`Fight! ${p0.name} versus ${p1.name}. J punch, K kick, L block, U special, Space dash.`);
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
  let p2;
  if (boot.bout && boot.bout.mode === 'dojo') {
    // The dojo dummy never acts: neutral input every tick.
    p2 = { move: 0, crouch: false, jump: false, punch: false, kick: false, block: false, special: false, dash: 0 };
  } else {
    // Duelist boss stance overrides the AI temperament live.
    if (f.boss && boot.ai) {
      const def = bossFor(f.boss.id);
      if (def && def.mechanic === 'duelist' && def.duel) {
        const stance = f.boss.stance === 1 ? 1 : 0;
        if (def.duel.stances[stance]) boot.ai.archetype = def.duel.stances[stance];
      }
    }
    p2 = aiInput(boot.ai, f.fighters[1], f.fighters[0], undefined, f.tick, tableForBout(1));
  }
  stepFight(f, p1, p2);
  handleFightEvents();
  updateHud();
}

/** Bout move table for a side (defaults to the shared table). */
function tableForBout(side) {
  const t = boutTables();
  return t ? t[side] : undefined;
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
  $('hud-tier').textContent = TIER_NAMES[tier] || 'Canvas2D';
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
  // M3: the bout arena + roster rigs drive the scene; menus show the
  // ambient arena (story screens preview the current act's ground).
  // M4: per-side move tables (pose timing) + weapon defs (trails) ride along.
  if (boot.renderer && boot.screen !== 'title') {
    const arena = boot.screen === 'fight' && boot.bout ? boot.bout.arena : boot.ambientArena;
    const scene =
      boot.screen === 'fight' && boot.fight
        ? buildSceneDesc({ tick: boot.fight.tick, arena, fight: boot.fight, rigs: boutRigs(), tables: boutTables(), weapons: boutWeaponDefs() })
        : buildSceneDesc({ tick: boot.tick, arena });
    try {
      boot.renderer.render(scene, arenaAt(arena), {
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

  // Typewriter: reveal dialogue text while the box is open.
  if (boot.dialogue) tickDialogue();

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

/** Per-side roster rigs for the live bout (identity when unknown). */
function boutRigs() {
  if (!boot.bout) return undefined;
  const r0 = fighterById(boot.bout.p0);
  const r1 = fighterById(boot.bout.p1);
  return [r0 ? r0.rig : undefined, r1 ? r1.rig : undefined];
}

/* ---- M4 loadout + progression helpers ---- */

/** Owned weapon ids (always includes fists). */
function ownedWeapons() {
  const have = (boot.profile.progress.ownedWeapons || []).filter((id) => weaponById(id));
  if (!have.includes('fists')) have.unshift('fists');
  return have;
}

/** Currently equipped weapon id (falls back to fists). */
function equippedWeapon() {
  const id = boot.profile.progress.equippedWeapon;
  return weaponById(id) ? id : 'fists';
}

/** Display name for a weapon id. */
function weaponName(id) {
  const w = weaponById(id);
  return w ? w.name : 'Fists';
}

/** Per-side move tables for the live bout (player weapon vs foe fists). */
function boutTables() {
  if (!boot.bout) return undefined;
  return [movesForWeapon(boot.bout.weapon0), movesForWeapon(boot.bout.weapon1)];
}

/** Per-side weapon defs for trail rendering. */
function boutWeaponDefs() {
  if (!boot.bout) return undefined;
  return [weaponById(boot.bout.weapon0) || weaponById('fists'), weaponById(boot.bout.weapon1) || weaponById('fists')];
}

/** Refresh the ember balance pill. */
function updateEmber() {
  const n = Number.isFinite(boot.profile.progress.currency) ? Math.max(0, Math.floor(boot.profile.progress.currency)) : 0;
  $('hud-ember').textContent = `${n} ember`;
}

/** Persist the profile; failures surface as a status note, never a crash. */
function persistProfile(note) {
  saveProfile(boot.provider, boot.profile).catch(() => {
    announce(note || 'Progress save failed; continuing in memory.');
  });
}

function unlockedFighters() {
  const have = (boot.profile.progress.unlockedFighters || []).filter((id) => fighterById(id));
  if (!have.includes('kaito')) have.unshift('kaito');
  return have;
}

function unlockedArenas() {
  const have = (boot.profile.progress.unlockedArenas || []).filter((n) => Number.isInteger(n));
  if (!have.includes(0)) have.unshift(0);
  return [...new Set(have)].sort((a, b) => a - b);
}

function ratingMeter(v) {
  return '●'.repeat(v) + '○'.repeat(5 - v);
}

/** Fighter select grid (story or versus P1). Locked cards name their price. */
function renderSelect() {
  $('select-title').textContent = boot.selectMode === 'story' ? 'Story: choose your shadow' : 'Versus: choose your fighter';
  $('hud-scene').textContent = arenaAt(boot.ambientArena).name;
  const have = new Set(unlockedFighters());
  const grid = $('select-grid');
  grid.innerHTML = '';
  for (const f of PLAYABLES) {
    const open = have.has(f.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.disabled = !open;
    const lines = open
      ? `${f.name}, ${f.epithet}`
      : `${f.name}, ${f.epithet} (locked)`;
    btn.setAttribute('aria-label', lines);
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = open ? `${f.name}, ${f.epithet}` : `${f.name} (locked)`;
    const lore = document.createElement('span');
    lore.className = 'csub';
    lore.textContent = f.lore;
    const stats = document.createElement('span');
    stats.className = 'cstats';
    stats.textContent = `HP ${f.hp} PWR ${ratingMeter(f.ratings.power)} SPD ${ratingMeter(f.ratings.speed)} TEC ${ratingMeter(f.ratings.technique)}`;
    btn.append(name, lore, stats);
    if (!open && f.unlock) {
      const lock = document.createElement('span');
      lock.className = 'clock';
      const node = nodeById(f.unlock.node);
      lock.textContent = `Unlock: complete "${node ? node.title : f.unlock.node}"`;
      btn.append(lock);
    }
    if (open) {
      btn.addEventListener('click', () => {
        if (boot.selectMode === 'story') {
          boot.storyP0 = f.id;
          boot.ambientArena = currentActArena();
          renderStory();
          showScreen('story');
        } else {
          boot.versusP0 = f.id;
          renderVersus();
          showScreen('versus');
        }
      });
    }
    grid.append(btn);
  }
}

/** Act index of the story cursor (prologue counts as act 0 ground). */
function currentActArena() {
  const cur = storyCursor(boot.profile);
  if (cur.done || !cur.current) return 4;
  if (cur.current.kind === 'fight') return cur.current.arena;
  const idx = STORY_NODES.indexOf(cur.current);
  const fight = STORY_NODES.slice(idx).find((n) => n.kind === 'fight');
  return fight ? fight.arena : 0;
}

/** Story map: all 17 nodes with done/current/locked marks. */
function renderStory() {
  const cursor = storyCursor(boot.profile);
  const doneSet = new Set(cursor.completed);
  const list = $('story-list');
  list.innerHTML = '';
  // Keep the arena label honest on menu screens (it names the ground shown).
  $('hud-scene').textContent = arenaAt(boot.ambientArena).name;
  for (const n of STORY_NODES) {
    const li = document.createElement('li');
    const done = doneSet.has(n.id);
    const now = !cursor.done && cursor.current && cursor.current.id === n.id;
    li.className = done ? 'done' : now ? 'now' : 'locked';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = done ? '✓' : now ? '▶' : '·';
    const title = document.createElement('span');
    let label = n.title;
    if (n.kind === 'fight') {
      const foe = fighterById(n.enemy);
      label += ` (vs ${foe ? foe.name : n.enemy}, best of ${n.rounds || 3})`;
    }
    title.textContent = label;
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = n.kind;
    li.append(mark, title, kind);
    list.append(li);
  }
  const p0 = fighterById(boot.storyP0) || fighterById('kaito');
  $('story-picks').textContent = `fighting as ${p0.name}`;
  const play = $('btn-story-play');
  if (cursor.done) {
    play.disabled = true;
    play.textContent = 'The Veil holds (complete)';
  } else {
    play.disabled = false;
    play.textContent = `Play: ${cursor.current.title}`;
  }
}

/** Versus setup: enemies gated by reached acts, arenas by unlocks. */
function renderVersus() {
  const arenas = new Set(unlockedArenas());
  const foes = $('versus-foes');
  foes.innerHTML = '';
  // An act guardian enters versus once you reach their ground.
  const foeOpen = (id) => {
    const node = STORY_NODES.find((n) => n.kind === 'fight' && n.enemy === id);
    return !node || arenas.has(node.arena);
  };
  for (const e of ENEMIES) {
    const open = foeOpen(e.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.disabled = !open;
    btn.setAttribute('aria-pressed', String(boot.versusFoe === e.id));
    btn.setAttribute('aria-label', open ? `Opponent ${e.name}` : `Opponent ${e.name} (locked)`);
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = e.name + (open ? '' : ' (locked)');
    const sub = document.createElement('span');
    sub.className = 'csub';
    sub.textContent = open ? `${e.epithet}. HP ${e.hp}.` : 'Reach their act in story mode.';
    btn.append(name, sub);
    if (open) btn.addEventListener('click', () => {
      boot.versusFoe = e.id;
      renderVersus();
    });
    foes.append(btn);
  }
  if (!foeOpen(boot.versusFoe)) boot.versusFoe = 'echo';
  const box = $('versus-arenas');
  box.innerHTML = '';
  for (const a of unlockedArenas()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('aria-pressed', String(boot.versusArena === a));
    btn.setAttribute('aria-label', `Arena ${arenaAt(a).name}`);
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = arenaAt(a).name;
    btn.append(name);
    btn.addEventListener('click', () => {
      boot.versusArena = a;
      renderVersus();
    });
    box.append(btn);
  }
  if (!arenas.has(boot.versusArena)) boot.versusArena = 0;
  if (!weaponById(boot.versusWeapon)) boot.versusWeapon = equippedWeapon();
  const p0 = fighterById(boot.versusP0) || fighterById('kaito');
  const foe = fighterById(boot.versusFoe) || fighterById('echo');
  $('versus-picks').textContent = `${p0.name} [${weaponName(boot.versusWeapon)}] vs ${foe.name} at ${arenaAt(boot.versusArena).name}`;
  // Weapon picker: owned weapons only, equipped default.
  const wbox = $('versus-weapons');
  wbox.innerHTML = '';
  for (const id of ownedWeapons()) {
    const w = weaponById(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('aria-pressed', String(boot.versusWeapon === id));
    btn.setAttribute('aria-label', `Weapon ${w.name}`);
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = w.name;
    const sub = document.createElement('span');
    sub.className = 'csub';
    sub.textContent = w.epithet;
    btn.append(name, sub);
    btn.addEventListener('click', () => {
      boot.versusWeapon = id;
      renderVersus();
    });
    wbox.append(btn);
  }
}

/* ---- M4 shop: weapons, upgrades, export/import ---- */

/** Shop screen: owned arsenal, upgrade tracks, backup controls. */
function renderShop() {
  updateEmber();
  const owned = new Set(ownedWeapons());
  const equipped = equippedWeapon();
  const grid = $('shop-weapons');
  grid.innerHTML = '';
  for (const w of WEAPONS) {
    const has = owned.has(w.id);
    const card = document.createElement('div');
    card.className = 'card';
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = w.name;
    const sub = document.createElement('span');
    sub.className = 'csub';
    sub.textContent = `${w.epithet}. ${w.lore}`;
    card.append(name, sub);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.shopBuy = w.id;
    if (equipped === w.id) {
      btn.textContent = 'Equipped';
      btn.disabled = true;
    } else if (has) {
      btn.textContent = 'Equip';
      btn.setAttribute('aria-label', `Equip ${w.name}`);
      btn.addEventListener('click', () => {
        boot.profile.progress.equippedWeapon = w.id;
        persistProfile();
        announce(`${w.name} equipped.`);
        renderShop();
      });
    } else {
      btn.textContent = `Buy (${w.price} ember)`;
      btn.setAttribute('aria-label', `Buy ${w.name} for ${w.price} ember`);
      btn.addEventListener('click', () => {
        const res = buyWeapon(boot.profile, w.id, w.price);
        if (res.ok) {
          boot.profile.progress.equippedWeapon = w.id;
          persistProfile();
          updateEmber();
          announce(`${w.name} bought and equipped.`);
        } else {
          announce(`Cannot buy: ${res.reason}.`);
        }
        renderShop();
      });
    }
    card.append(btn);
    grid.append(card);
  }
  const upg = $('shop-upgrades');
  upg.innerHTML = '';
  const levels = (boot.profile.progress && boot.profile.progress.upgrades) || { dmg: 0, hp: 0 };
  const labels = { dmg: 'Edge training (damage)', hp: 'Iron body (health)' };
  for (const track of UPGRADE_TRACKS) {
    const lvl = Number.isInteger(levels[track]) ? levels[track] : 0;
    const cost = upgradeCost(track, lvl);
    const row = document.createElement('div');
    row.className = 'card';
    const name = document.createElement('span');
    name.className = 'cname';
    name.textContent = `${labels[track]} ${'●'.repeat(lvl)}${'○'.repeat(MAX_UPGRADE - lvl)}`;
    row.append(name);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.shopBuy = `upgrade-${track}`;
    if (cost == null) {
      btn.textContent = 'Maxed';
      btn.disabled = true;
    } else {
      btn.textContent = `Train (${cost} ember)`;
      btn.setAttribute('aria-label', `Train ${labels[track]} for ${cost} ember`);
      btn.addEventListener('click', () => {
        const res = buyUpgrade(boot.profile, track);
        if (res.ok) {
          persistProfile();
          updateEmber();
          announce(`${labels[track]} raised to ${lvl + 1}.`);
        } else {
          announce(`Cannot train: ${res.reason}.`);
        }
        renderShop();
      });
    }
    row.append(btn);
    upg.append(row);
  }
}

/** Download the versioned profile bundle as JSON. */
function exportProfile() {
  try {
    const text = exportBundle(boot.profile);
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'umbra-profile.json';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    announce('Profile exported as umbra-profile.json.');
  } catch {
    announce('Export failed; continuing in memory.');
  }
}

/** Import a profile bundle file (validated, atomic, never half-applied). */
function importProfileFile(file) {
  if (!file) return;
  file.text().then(
    (text) => {
      const res = importBundle(text);
      if (!res.ok) {
        announce(`Import rejected: ${res.reason}.`);
        return;
      }
      boot.profile = res.profile;
      persistProfile();
      updateEmber();
      renderShop();
      announce('Profile imported.');
    },
    () => announce('Import failed: unreadable file.'),
  );
}

/* ---- M4 dojo: frame data + combo trials ---- */

/** Dojo screen: frame-data table for the equipped weapon + trial list. */
function renderDojo() {
  const wid = equippedWeapon();
  $('dojo-weapon').textContent = `Wielding ${weaponName(wid)} (change in the shop)`;
  const table = $('dojo-frames');
  table.innerHTML = '';
  const head = document.createElement('tr');
  for (const h of ['move', 'startup', 'active', 'recovery', 'total', 'dmg', 'reach']) {
    const th = document.createElement('th');
    th.textContent = h;
    head.append(th);
  }
  table.append(head);
  for (const r of frameRows(movesForWeapon(wid))) {
    const tr = document.createElement('tr');
    for (const v of [r.move, r.startup, r.active, r.recovery, r.total, r.damage, r.range]) {
      const td = document.createElement('td');
      td.textContent = String(v);
      tr.append(td);
    }
    table.append(tr);
  }
  const done = new Set((boot.profile.progress.stats && boot.profile.progress.stats.trials) || []);
  const list = $('dojo-trials');
  list.innerHTML = '';
  for (const t of TRIALS) {
    const li = document.createElement('li');
    li.className = done.has(t.id) ? 'done' : 'todo';
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = done.has(t.id) ? '✓' : '·';
    const title = document.createElement('span');
    title.textContent = `${t.name} (+${t.reward} ember): ${t.hint}`;
    li.append(mark, title);
    list.append(li);
  }
}

/* ---- Dialogue box (typewriter over the ambient canvas) ---- */

function openDialogue(node, onDone) {
  boot.dialogue = createDialogue(node.lines || []);
  boot.dialogueOnDone = typeof onDone === 'function' ? onDone : null;
  paintDialogue();
  $('dialogue-box').hidden = false;
  $('btn-dlg-next').focus();
}

function paintDialogue() {
  const line = currentLine(boot.dialogue);
  $('dlg-speaker').textContent = line && line.speaker ? line.speaker : '';
  $('dlg-text').textContent = visibleText(boot.dialogue);
  const last = boot.dialogue && boot.dialogue.lineIndex >= boot.dialogue.lines.length - 1;
  $('btn-dlg-next').textContent = last ? 'Finish' : 'Continue';
}

function tickDialogue() {
  if ($('dialogue-box').hidden || dialogueDone(boot.dialogue)) return;
  advanceDialogue(boot.dialogue, boot.profile.config.reducedMotion ? 99 : 2);
  paintDialogue();
}

function stepDialogue() {
  if (!boot.dialogue || $('dialogue-box').hidden) return;
  if (nextDialogueLine(boot.dialogue)) {
    paintDialogue();
    return;
  }
  const done = boot.dialogueOnDone;
  closeDialogue();
  if (done) done();
}

function closeDialogue() {
  boot.dialogue = null;
  boot.dialogueOnDone = null;
  const box = $('dialogue-box');
  if (box) box.hidden = true;
}

/* ---- Story advancement ---- */

/** Complete a non-fight node, persist, and move to whatever follows. */
function finishStoryNode(nodeId) {
  const res = completeNode(boot.profile, nodeId);
  if (!res.ok) {
    announce(`Story blocked: ${res.reason}`);
    return;
  }
  applyStoryUnlocks(boot.profile.progress, res.unlocks, nodeId);
  persistProfile();
  const earned = [
    ...res.unlocks.arenas.map((a) => arenaAt(a).name),
    ...res.unlocks.fighters.map((f) => fighterName(f, f)),
  ];
  if (earned.length > 0) announce(`Unlocked: ${earned.join(', ')}.`);
  if (res.next == null) {
    renderStory();
    if (boot.screen === 'story') renderStory();
    announce('The Ashen Veil rests. The Gate still stands: versus awaits.');
    return;
  }
  if (res.next.kind === 'fight') {
    startStoryFight(res.next);
  } else {
    openDialogue(res.next, () => finishStoryNode(res.next.id));
  }
}

/** Start the scripted act fight for a story fight node. */
function startStoryFight(node) {
  const foe = fighterById(node.enemy) || fighterById('echo');
  const p0 = fighterById(boot.storyP0) || fighterById('kaito');
  startFight({ mode: 'story', p0: p0.id, p1: foe.id, arena: node.arena, rounds: node.rounds || 3, nodeId: node.id });
}

/** Play whatever the cursor points at (dialogue now, fight now). */
function playCurrentScene() {
  const cursor = storyCursor(boot.profile);
  if (cursor.done || !cursor.current) return;
  const node = cursor.current;
  boot.ambientArena = currentActArena();
  if (node.kind === 'fight') {
    startStoryFight(node);
  } else {
    if (boot.screen !== 'story') {
      renderStory();
      showScreen('story');
    }
    openDialogue(node, () => finishStoryNode(node.id));
  }
}

/** After a won story bout: bank the victory, then play the outro chain. */
function continueStory() {
  const nodeId = boot.bout && boot.bout.nodeId;
  if (!nodeId) return;
  $('result-overlay').hidden = true;
  const res = completeNode(boot.profile, nodeId);
  if (!res.ok) {
    announce(`Story blocked: ${res.reason}`);
    showScreen('story');
    return;
  }
  applyStoryUnlocks(boot.profile.progress, res.unlocks, nodeId);
  persistProfile();
  const earned = [
    ...res.unlocks.arenas.map((a) => arenaAt(a).name),
    ...res.unlocks.fighters.map((f) => fighterName(f, f)),
  ];
  boot.ambientArena = currentActArena();
  renderStory();
  showScreen('story');
  if (earned.length > 0) announce(`Victory banked. Unlocked: ${earned.join(', ')}.`);
  if (res.next == null) {
    announce('Story complete: dawn keeps. Versus and rematches remain.');
    return;
  }
  openDialogue(res.next, () => finishStoryNode(res.next.id));
}

function wireUI() {
  $('btn-versus').addEventListener('click', () => {
    boot.selectMode = 'versus';
    renderSelect();
    showScreen('select');
  });
  $('btn-story').addEventListener('click', () => {
    boot.selectMode = 'story';
    boot.ambientArena = currentActArena();
    renderSelect();
    showScreen('select');
  });
  $('btn-shop').addEventListener('click', () => {
    renderShop();
    showScreen('shop');
  });
  $('btn-dojo').addEventListener('click', () => {
    renderDojo();
    showScreen('dojo');
  });
  $('btn-shop-back').addEventListener('click', () => showScreen('title'));
  $('btn-dojo-back').addEventListener('click', () => showScreen('title'));
  $('btn-dojo-fight').addEventListener('click', () => {
    startFight({ mode: 'dojo', p0: boot.versusP0 || boot.storyP0 || 'kaito', p1: 'echo', arena: 0, weapon0: equippedWeapon() });
  });
  $('btn-export').addEventListener('click', () => exportProfile());
  $('import-file').addEventListener('change', (ev) => {
    const file = ev.target && ev.target.files && ev.target.files[0];
    importProfileFile(file);
    ev.target.value = '';
  });
  $('btn-select-back').addEventListener('click', () => showScreen('title'));
  $('btn-story-back').addEventListener('click', () => showScreen('title'));
  $('btn-story-play').addEventListener('click', () => playCurrentScene());
  $('btn-versus-back').addEventListener('click', () => {
    renderSelect();
    showScreen('select');
  });
  $('btn-versus-fight').addEventListener('click', () => {
    startFight({ mode: 'versus', p0: boot.versusP0 || 'kaito', p1: boot.versusFoe, arena: boot.versusArena, rounds: 3, weapon0: boot.versusWeapon || equippedWeapon() });
  });
  $('btn-dlg-next').addEventListener('click', () => stepDialogue());
  $('btn-result-continue').addEventListener('click', () => continueStory());
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
  $('btn-rematch').addEventListener('click', () => {
    // Rematch replays the same bout (same mode, fighters, arena, weapon, node).
    const b = boot.bout;
    if (b) startFight({ mode: b.mode, p0: b.p0, p1: b.p1, arena: b.arena, rounds: 3, nodeId: b.nodeId, weapon0: b.weapon0 });
    else startFight({});
  });
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
      if (boot.screen === 'settings') showScreen(boot.returnTo || 'title');
      else if (boot.screen === 'versus') {
        renderSelect();
        showScreen('select');
      } else showScreen('title');
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

  // Test hook (also handy for debugging): ?tier=0|1|2|auto&screen=fight|settings|shop|dojo
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
    announce(`Umbra ready on ${TIER_NAMES[boot.tier]}. Versus, story, shop, or dojo.`);
  } catch (err) {
    announce(`No renderer available: ${err.message}`);
    return;
  }

  if (paramScreen === 'fight' || paramScreen === 'settings' || paramScreen === 'shop' || paramScreen === 'dojo') {
    if (paramScreen === 'settings') {
      writeSettingsForm();
      renderRemap();
      showScreen(paramScreen);
    } else if (paramScreen === 'shop') {
      renderShop();
      showScreen(paramScreen);
    } else if (paramScreen === 'dojo') {
      renderDojo();
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
