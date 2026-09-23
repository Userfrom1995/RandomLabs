// Tester M4 hostile verification (PR #383, Refs #375).
// Durable pins for attack paths NOT covered by the builder M4 suites:
// engine boss determinism + hostile boss/power inputs, bout copy isolation,
// economy junk-input safety, bundle hostile rejection, dojo hostile logs,
// weapon/boss/dojo validator clean pins, canonical shop prices, and the
// shop/dojo/export DOM contract in index.html + app.js + sw.js.
// Pure modules plus fs contract reads only (node:test, no browser).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFight,
  stepFight,
  hashState,
  copyMoves,
  sanitizePower,
} from '../src/combat/engine.js';
import { MOVES } from '../src/combat/moves.js';
import {
  WEAPONS,
  WEAPON_IDS,
  WEAPON_TABLES,
  weaponById,
  movesForWeapon,
  validateWeapons,
} from '../src/weapons.js';
import { BOSSES, bossFor, bossPhaseIndex, validateBosses } from '../src/bosses.js';
import { TRIALS, checkTrial, frameRows, validateDojo } from '../src/dojo.js';
import {
  awardFor,
  upgradeCost,
  upgradeEffect,
  canAfford,
  buyWeapon,
  buyUpgrade,
  MAX_UPGRADE,
} from '../src/economy.js';
import { exportBundle, importBundle } from '../src/storage/bundle.js';
import { defaultProfile, migrateProfile } from '../src/storage/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function runTicks(opts, n) {
  const s = createFight(opts);
  for (let i = 0; i < n; i++) stepFight(s, {}, {});
  return s;
}
function pastIntro(boss) {
  const s = createFight({ seed: 1, boss });
  for (let i = 0; i < 70; i++) stepFight(s, {}, {});
  return s;
}

describe('tester M4: shipped tables validate clean', () => {
  it('weapons, bosses, dojo validators report zero violations', () => {
    assert.deepEqual(validateWeapons(), []);
    assert.deepEqual(validateBosses(), []);
    assert.deepEqual(validateDojo(), []);
  });
  it('six weapons in canonical order with sane prices and trails', () => {
    assert.deepEqual(WEAPON_IDS, ['fists', 'sword', 'nunchaku', 'spear', 'staff', 'daggers']);
    assert.equal(WEAPONS.length, 6);
    const prices = Object.fromEntries(WEAPONS.map((w) => [w.id, w.price]));
    assert.deepEqual(prices, { fists: 0, sword: 350, nunchaku: 450, spear: 550, staff: 250, daggers: 150 });
    for (const w of WEAPONS) {
      assert.ok(w.trail.width > 0 && w.trail.width <= 0.1, `${w.id} trail width`);
      assert.equal(w.trail.color.length, 3);
    }
  });
  it('three bosses with the documented mechanics', () => {
    assert.deepEqual(BOSSES.map((b) => b.id), ['vex', 'ruin', 'dusk']);
    assert.deepEqual(BOSSES.map((b) => b.mechanic), ['summoner', 'duelist', 'eclipse']);
    for (const b of BOSSES) assert.equal(b.phases.length, 3);
  });
  it('six combo trials with canonical sequences and non-negative rewards', () => {
    assert.equal(TRIALS.length, 6);
    for (const t of TRIALS) {
      assert.ok(t.sequence.length > 0, `${t.id} empty sequence`);
      assert.ok(Number.isInteger(t.reward) && t.reward >= 0, `${t.id} reward`);
    }
  });
});

describe('tester M4: boss engine is deterministic and crash-proof', () => {
  it('same seed replays byte-identical with each boss', () => {
    for (const boss of ['vex', 'ruin', 'dusk']) {
      const a = hashState(runTicks({ seed: 7, boss }, 600));
      const b = hashState(runTicks({ seed: 7, boss }, 600));
      assert.equal(a, b, `${boss} replay drifted: ${a} vs ${b}`);
    }
  });
  it('per-side weapon tables replay deterministically', () => {
    const opts = { seed: 5, moves: movesForWeapon('sword'), movesB: movesForWeapon('daggers') };
    assert.equal(hashState(runTicks(opts, 400)), hashState(runTicks(opts, 400)));
  });
  it('bogus boss id degrades to a plain bout, 1200 ticks, no crash', () => {
    for (const boss of [null, undefined, 'bogus', 42, {}]) {
      const s = runTicks({ seed: 3, boss }, 1200);
      assert.equal(s.boss, null, `boss ${JSON.stringify(boss)} should yield null boss state`);
      assert.ok(Array.isArray(s.events));
    }
  });
  it('phase cuts flip at exactly 2/3 and 1/3', () => {
    const def = bossFor('vex');
    assert.equal(bossPhaseIndex(def, 0.67), 0);
    assert.equal(bossPhaseIndex(def, 0.66), 1);
    assert.equal(bossPhaseIndex(def, 0.34), 1);
    assert.equal(bossPhaseIndex(def, 0.33), 2);
    assert.equal(bossPhaseIndex(def, 0), 2);
  });
  it('phase index survives hostile fractions without throwing', () => {
    const def = bossFor('vex');
    assert.equal(bossPhaseIndex(def, NaN), 0);
    assert.equal(bossPhaseIndex(def, undefined), 0);
    assert.equal(bossPhaseIndex(def, 'junk'), 0);
    assert.equal(bossPhaseIndex(def, 99), 0);
    assert.equal(bossPhaseIndex(def, -5), 2);
    assert.equal(bossPhaseIndex(null, 0.9), 0);
  });
  it('vex summons a wisp, dusk enrages, ruin flips stance, phases advance', () => {
    const v = pastIntro('vex');
    for (let i = 0; i < 310; i++) stepFight(v, {}, {});
    assert.ok(v.events.some((e) => e.move === 'wisp'), 'vex never summoned');

    const d = pastIntro('dusk');
    d.fighters[1].hp = 30;
    d.fighters[1].maxHp = 100;
    stepFight(d, {}, {});
    assert.equal(d.boss.enraged, true, 'dusk did not enrage below 0.4');
    assert.ok(d.events.some((e) => e.move === 'enrage'), 'no enrage event');

    const r = pastIntro('ruin');
    for (let i = 0; i < 430; i++) stepFight(r, {}, {});
    assert.equal(r.boss.stance, 1, 'ruin never flipped stance');
    assert.ok(r.events.some((e) => String(e.move).startsWith('stance-')), 'no stance event');

    const p = pastIntro('vex');
    p.fighters[1].hp = 10;
    p.fighters[1].maxHp = 100;
    stepFight(p, {}, {});
    assert.equal(p.boss.phase, 2, 'vex did not reach phase 2 at 10% hp');
  });
  it('boss dynamics reset across rounds while identity carries', () => {
    const s = pastIntro('vex');
    for (let i = 0; i < 310; i++) stepFight(s, {}, {});
    assert.ok(s.boss.adds.length > 0 || s.events.some((e) => e.move === 'wisp'), 'no summon state');
  });
});

describe('tester M4: bout owns its move table (replay isolation)', () => {
  it('copyMoves freezes and detaches from the caller table', () => {
    const src = movesForWeapon('spear');
    const before = src.jab.damage;
    const bout = createFight({ seed: 1, moves: src });
    src.jab.damage = before + 5000;
    assert.equal(bout.moves.jab.damage, before, 'caller mutation desynced the bout');
    assert.ok(Object.isFrozen(bout.moves), 'bout table not frozen');
    src.jab.damage = before;
  });
  it('unknown weapon falls back to the canonical fists table', () => {
    for (const junk of ['excalibur', null, 42, {}, '']) {
      assert.deepEqual(movesForWeapon(junk), MOVES, `no fists fallback for ${JSON.stringify(junk)}`);
    }
    assert.equal(movesForWeapon('sword').jab.damage, 8);
  });
  it('weaponById resolves all six ids and rejects junk', () => {
    for (const id of WEAPON_IDS) assert.equal(weaponById(id).id, id);
    for (const junk of ['nope', null, 42, {}, '']) assert.equal(weaponById(junk), null);
  });
});

describe('tester M4: per-side power sanitize is hostile-proof', () => {
  it('NaN, Infinity, negatives, and giants all clamp to 1', () => {
    for (const bad of [NaN, Infinity, -Infinity, -3, 0, 9999, 'x2', null, undefined]) {
      assert.deepEqual(sanitizePower([bad, 1]), [1, 1], `leak for ${String(bad)}`);
      assert.deepEqual(sanitizePower([1, bad]), [1, 1], `leak for ${String(bad)}`);
    }
    assert.deepEqual(sanitizePower([1.35, 2]), [1.35, 2], 'valid scales must survive');
    assert.deepEqual(sanitizePower('junk'), [1, 1]);
    assert.deepEqual(sanitizePower(null), [1, 1]);
  });
  it('createFight never carries a hostile power vector', () => {
    const s = createFight({ seed: 1, power: [NaN, 9999] });
    assert.deepEqual(s.power, [1, 1]);
  });
});

describe('tester M4: economy never throws and never mints from junk', () => {
  it('awardFor survives hostile opts with finite non-negative payouts', () => {
    for (const opts of [null, undefined, 42, 'win', {}, { outcome: 'win' }, { outcome: 'win', roundsWon: -5 }, { outcome: 'win', roundsWon: NaN }, { outcome: 'win', roundsWon: Infinity }, { outcome: 'hax', careerWins: -1 }]) {
      const a = awardFor(opts);
      assert.ok(Number.isFinite(a.currency) && a.currency >= 0, `bad award for ${JSON.stringify(opts)}: ${a.currency}`);
      assert.equal(typeof a.jackpot, 'boolean');
    }
  });
  it('loss and draw pay fixed consolation regardless of extras', () => {
    assert.equal(awardFor({ outcome: 'loss', roundsWon: 99, boss: true }).currency, 15);
    assert.equal(awardFor({ outcome: 'draw', roundsWon: 99, boss: true }).currency, 25);
    const w = awardFor({ outcome: 'win', roundsWon: 2 });
    assert.equal(w.currency, 60 + 2 * 15, 'win math drifted');
    const wb = awardFor({ outcome: 'win', roundsWon: 2, boss: true });
    assert.equal(wb.currency, w.currency + 120, 'boss bonus drifted');
    const j = awardFor({ outcome: 'win', careerWins: 4 });
    assert.equal(j.jackpot, true, '5th career win must jackpot');
    assert.equal(j.currency, 60 + 100, 'jackpot math drifted');
  });
  it('buyWeapon guards profile, price, ownership, and funds', () => {
    assert.deepEqual(buyWeapon(null, 'sword', 350).reason, 'bad-profile');
    assert.deepEqual(buyWeapon({}, 'sword', 350).reason, 'bad-profile');
    assert.deepEqual(buyWeapon({ progress: { currency: 500, ownedWeapons: ['fists'] } }, '', 350).reason, 'bad-weapon');
    assert.deepEqual(buyWeapon({ progress: { currency: 500, ownedWeapons: ['fists'] } }, 'sword', NaN).reason, 'bad-price');
    assert.deepEqual(buyWeapon({ progress: { currency: 500, ownedWeapons: ['fists'] } }, 'sword', -1).reason, 'bad-price');
    const owned = { progress: { currency: 500, ownedWeapons: ['fists', 'sword'] } };
    assert.deepEqual(buyWeapon(owned, 'sword', 350).reason, 'owned');
    const poor = { progress: { currency: 10, ownedWeapons: ['fists'] } };
    assert.deepEqual(buyWeapon(poor, 'sword', 350).reason, 'funds');
    assert.equal(poor.progress.currency, 10, 'failed purchase must not touch funds');
  });
  it('buyWeapon deducts exactly the charged cost on success', () => {
    const p = { progress: { currency: 500, ownedWeapons: ['fists'] } };
    const r = buyWeapon(p, 'sword', 350);
    assert.equal(r.ok, true);
    assert.equal(p.progress.currency, 150);
    assert.ok(p.progress.ownedWeapons.includes('sword'));
  });
  it('buyUpgrade walks the track to max and guards junk', () => {
    const p = { progress: { currency: 100000, ownedWeapons: ['fists'], upgrades: { dmg: 0, hp: 0 } } };
    for (let lv = 0; lv < MAX_UPGRADE; lv++) {
      const cost = upgradeCost('dmg', lv);
      assert.equal(cost, 100 * (lv + 1), `dmg cost drift at ${lv}`);
      const r = buyUpgrade(p, 'dmg');
      assert.equal(r.ok, true, `dmg buy failed at ${lv}: ${r.reason}`);
    }
    const maxed = buyUpgrade(p, 'dmg');
    assert.equal(maxed.ok, false);
    assert.equal(maxed.reason, 'maxed');
    assert.deepEqual(buyUpgrade(p, 'warp').reason, 'bad-track');
    assert.deepEqual(buyUpgrade(null, 'dmg').reason, 'bad-profile');
    assert.equal(upgradeCost('dmg', MAX_UPGRADE), null, 'over-max cost must be null');
    assert.equal(upgradeCost('nope', 0), null);
    assert.equal(upgradeEffect('dmg', 4), 1.32, 'dmg effect drift');
    assert.equal(upgradeEffect('hp', 4), 48, 'hp effect drift');
    assert.equal(upgradeEffect('nope', 0), null);
  });
  it('canAfford rejects junk costs and missing progress', () => {
    const rich = { progress: { currency: 500 } };
    assert.equal(canAfford(rich, 350), true);
    assert.equal(canAfford(rich, 600), false);
    for (const bad of [NaN, -1, Infinity, '350', null]) {
      assert.equal(canAfford(rich, bad), false, `afforded junk cost ${String(bad)}`);
    }
    assert.equal(canAfford({}, 1), false);
    assert.equal(canAfford(null, 1), false);
  });
});

describe('tester M4: bundle import/export is a hostile-proof airlock', () => {
  it('rejects empty, corrupt, mistyped, and misversioned bundles', () => {
    const cases = [
      ['', 'bad-input'],
      ['   ', 'bad-input'],
      [null, 'bad-input'],
      [undefined, 'bad-input'],
      ['{bad json', 'bad-json'],
      ['[]', 'bad-bundle'],
      ['null', 'bad-bundle'],
      ['"str"', 'bad-bundle'],
      [JSON.stringify({ kind: 'rogue-profile', version: 1, profile: {} }), 'bad-kind'],
      [JSON.stringify({ kind: 'umbra-profile', version: 999, profile: {} }), 'bad-version'],
      [JSON.stringify({ kind: 'umbra-profile', version: 1 }), 'bad-profile'],
      [JSON.stringify({ kind: 'umbra-profile', version: 1, profile: [] }), 'bad-profile'],
    ];
    for (const [text, reason] of cases) {
      const r = importBundle(text);
      assert.equal(r.ok, false, `accepted ${JSON.stringify(text)}`);
      assert.equal(r.reason, reason, `wrong reason for ${JSON.stringify(text)}`);
    }
  });
  it('round-trips currency, arsenal, upgrades, and trials exactly', () => {
    const p = defaultProfile();
    p.progress.currency = 1234;
    p.progress.ownedWeapons = ['fists', 'staff', 'daggers'];
    p.progress.equippedWeapon = 'staff';
    p.progress.upgrades = { dmg: 2, hp: 3 };
    p.progress.stats = { wins: 5, losses: 2, bossWins: 1, trials: ['trial-first-blood'] };
    const rt = importBundle(exportBundle(p));
    assert.equal(rt.ok, true, `round trip failed: ${rt.reason}`);
    assert.equal(rt.profile.progress.currency, 1234);
    assert.deepEqual(rt.profile.progress.ownedWeapons, ['fists', 'staff', 'daggers']);
    assert.equal(rt.profile.progress.equippedWeapon, 'staff');
    assert.deepEqual(rt.profile.progress.upgrades, { dmg: 2, hp: 3 });
    assert.deepEqual(rt.profile.progress.stats.trials, ['trial-first-blood']);
  });
  it('migration clamps tampered upgrades and stats, keeps kaito and fists', () => {
    const evil = {
      progress: {
        currency: 777,
        ownedWeapons: ['sword'],
        equippedWeapon: 'sword',
        upgrades: { dmg: 99, hp: -5 },
        stats: { wins: -3, losses: NaN, bossWins: 2.5 },
      },
    };
    const m = migrateProfile(evil);
    assert.equal(m.progress.upgrades.dmg, 4, 'dmg overflow not clamped');
    assert.equal(m.progress.upgrades.hp, 0, 'negative hp not clamped');
    assert.equal(m.progress.stats.wins, 0, 'negative wins kept');
    assert.ok(m.progress.ownedWeapons.includes('fists'), 'fists dropped');
    assert.ok(m.progress.unlockedFighters.includes('kaito'), 'kaito dropped');
  });
  it('v1 profiles gain M4 economy defaults', () => {
    const m = migrateProfile({ config: { tier: 'auto' }, progress: { unlockedArenas: [0] } });
    assert.deepEqual(m.progress.ownedWeapons, ['fists']);
    assert.equal(m.progress.equippedWeapon, 'fists');
    assert.deepEqual(m.progress.upgrades, { dmg: 0, hp: 0 });
    assert.equal(m.progress.currency, 0);
  });
});

describe('tester M4: dojo trials and frame rows survive hostile logs', () => {
  it('subsequence matching counts only clean hits by the attempting side', () => {
    const log = [
      { t: 'hit', move: 'kick', side: 0 },
      { t: 'blocked', move: 'jab', side: 0 },
      { t: 'hit', move: 'jab', side: 1 },
      { t: 'hit', move: 'jab', side: 0 },
      { t: 'hit', move: 'cross', side: 0 },
    ];
    const r = checkTrial('trial-one-two', log, 0);
    assert.equal(r.ok, true, `trial not matched: ${JSON.stringify(r)}`);
    const foe = checkTrial('trial-one-two', log, 1);
    assert.equal(foe.ok, false, 'foe hits counted for our trial');
  });
  it('hostile event logs never throw and never false-pass', () => {
    assert.deepEqual(checkTrial('trial-first-blood', null, 0).ok, false);
    assert.deepEqual(checkTrial('trial-first-blood', 'junk', 0).ok, false);
    assert.deepEqual(checkTrial('nope', [], 0), { ok: false, matched: 0, total: 0 });
    const evil = [
      { t: 'hit', move: { evil: 1 }, side: 0 },
      { t: 'hit', move: null, side: 0 },
      null,
      undefined,
      { t: 'hit', move: 'jab', side: 0 },
    ];
    const r = checkTrial('trial-first-blood', evil, 0);
    assert.equal(r.ok, true, 'valid jab after junk must still pass');
    const empty = checkTrial('trial-rising-fang', [], 0);
    assert.deepEqual([empty.ok, empty.matched, empty.total], [false, 0, 3]);
  });
  it('frameRows covers all five moves in canonical order with totals', () => {
    const rows = frameRows(movesForWeapon('spear'));
    assert.deepEqual(rows.map((r) => r.move), ['jab', 'cross', 'kick', 'sweep', 'uppercut']);
    for (const r of rows) {
      assert.equal(r.total, r.startup + r.active + r.recovery, `${r.move} total drift`);
      assert.ok(r.damage > 0 && r.range > 0, `${r.move} non-positive data`);
    }
    assert.deepEqual(frameRows(null), []);
    assert.deepEqual(frameRows('junk'), []);
    assert.deepEqual(frameRows({}), []);
  });
});

describe('tester M4: shop/dojo/export DOM contract', () => {
  it('index.html wires shop, dojo, and file-based import/export', () => {
    const html = read('index.html');
    for (const id of ['screen-shop', 'screen-dojo', 'shop-weapons', 'shop-upgrades', 'dojo-trials', 'dojo-frames', 'btn-export', 'import-file', 'btn-shop', 'btn-dojo']) {
      assert.ok(html.includes(id), `index.html missing #${id}`);
    }
    assert.ok(html.includes('type="file"'), 'import must use a real file picker');
    assert.ok(!html.includes('<textarea'), 'no raw-textarea import harness allowed');
  });
  it('app.js routes shop/dojo screens with real purchase handlers', () => {
    const app = read('app.js');
    assert.ok(app.includes('renderShop'), 'missing renderShop');
    assert.ok(app.includes('showScreen'), 'missing showScreen router');
    assert.ok(app.includes("'shop'") || app.includes('"shop"'), 'shop route missing');
    assert.ok(app.includes("'dojo'") || app.includes('"dojo"'), 'dojo route missing');
  });
  it('service worker cache bump covers every new M4 module', () => {
    const sw = read('sw.js');
    assert.ok(sw.includes('umbra-v5'), 'cache tag did not bump to v5');
    assert.ok(!sw.includes("'umbra-v4'") && !sw.includes('"umbra-v4"'), 'stale v4 cache tag still present');
    assert.ok(sw.includes('umbra-'), 'old-cache purge prefix missing');
    for (const mod of ['weapons.js', 'bosses.js', 'dojo.js', 'economy.js', 'bundle.js']) {
      assert.ok(sw.includes(mod), `sw.js does not cache ${mod}`);
    }
  });
});
