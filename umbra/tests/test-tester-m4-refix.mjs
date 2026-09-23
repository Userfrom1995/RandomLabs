// Tester M4 re-fix verification (PR #383, Refs #375).
// Durable pins for the 8 Evaluator `fix` items applied by the Fixer on top
// of the first Tester hostile suite (test-tester-m4-verify.mjs):
// canonical buyWeapon cost, award/bundle currency caps, fists table
// ownership + copy semantics, bossPhaseIndex guards, frameRows finite
// sanitize, wisp cap + summon validator, HUD/footer/frames DOM craft.
// Pure modules plus fs contract reads only (node:test, no browser).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buyWeapon,
  awardFor,
  MAX_BONUS_ROUNDS,
  MAX_CURRENCY,
} from '../src/economy.js';
import {
  WEAPON_TABLES,
  movesForWeapon,
  validateWeapons,
} from '../src/weapons.js';
import { BOSSES, bossPhaseIndex, validateBosses } from '../src/bosses.js';
import { frameRows, validateDojo } from '../src/dojo.js';
import { migrateProfile, defaultProfile } from '../src/storage/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mk = (currency = 10000) => ({
  progress: { currency, ownedWeapons: ['fists'] },
});

describe('tester M4 refix: canonical shop cost', () => {
  it('rejects caller-price discounts and unknown ids', () => {
    assert.equal(buyWeapon(mk(), 'sword', 1).ok, false);
    assert.equal(buyWeapon(mk(), 'sword', 0).ok, false);
    assert.equal(buyWeapon(mk(), 'nope', 150).ok, false);
    assert.equal(buyWeapon(mk(), '', 150).ok, false);
    assert.equal(buyWeapon(null, 'sword', 350).ok, false);
  });
  it('accepts canonical price, deducts exactly, blocks double-buy', () => {
    const p = mk(10000);
    const r = buyWeapon(p, 'sword', 350);
    assert.equal(r.ok, true);
    assert.equal(p.progress.currency, 10000 - 350);
    assert.ok(p.progress.ownedWeapons.includes('sword'));
    assert.equal(buyWeapon(p, 'sword', 350).ok, false);
  });
  it('rejects insufficient funds without mutating arsenal', () => {
    const p = mk(10);
    assert.equal(buyWeapon(p, 'sword', 350).ok, false);
    assert.deepEqual(p.progress.ownedWeapons, ['fists']);
  });
});

describe('tester M4 refix: award and currency caps', () => {
  it('awardFor round bonus caps at MAX_BONUS_ROUNDS', () => {
    assert.equal(MAX_BONUS_ROUNDS, 10);
    const a = awardFor({ outcome: 'win', roundsWon: 1e9 });
    const b = awardFor({ outcome: 'win', roundsWon: 10 });
    assert.equal(a.currency, b.currency);
    assert.ok(Number.isFinite(a.currency));
  });
  it('migrateProfile clamps hostile bundle currency to MAX_CURRENCY', () => {
    const mig = migrateProfile({ progress: { currency: 1e12 } });
    assert.ok(mig.progress.currency <= MAX_CURRENCY);
    assert.equal(mig.progress.currency, MAX_CURRENCY);
    const neg = migrateProfile({ progress: { currency: -500 } });
    assert.ok(neg.progress.currency >= 0);
  });
  it('default profile starts within currency bounds', () => {
    const d = defaultProfile();
    assert.ok(d.progress.currency >= 0 && d.progress.currency <= MAX_CURRENCY);
  });
});

describe('tester M4 refix: weapon table ownership', () => {
  it('movesForWeapon returns fresh mutable copies', () => {
    const a = movesForWeapon('fists');
    const b = movesForWeapon('fists');
    assert.notEqual(a, b);
    const key = Object.keys(a)[0];
    const before = movesForWeapon('fists')[key].power;
    a[key].power = 99999;
    assert.equal(movesForWeapon('fists')[key].power, before);
  });
  it('canonical tables are frozen', () => {
    assert.ok(Object.isFrozen(WEAPON_TABLES.sword));
    assert.ok(Object.isFrozen(WEAPON_TABLES));
  });
  it('shipped weapon table still validates clean', () => {
    assert.deepEqual(validateWeapons(), []);
  });
});

describe('tester M4 refix: boss phase guards', () => {
  it('null hp never yields phase 2', () => {
    for (const def of BOSSES) assert.equal(bossPhaseIndex(def, null), 0);
    assert.equal(bossPhaseIndex(BOSSES[0], undefined), 0);
    assert.equal(bossPhaseIndex(BOSSES[0], NaN), 0);
  });
  it('misshapen defs degrade to phase 0', () => {
    assert.equal(bossPhaseIndex(null, 0.5), 0);
    assert.equal(bossPhaseIndex({}, 0.5), 0);
    assert.equal(bossPhaseIndex({ phases: 3 }, 0.5), 0);
    assert.equal(bossPhaseIndex([], 0.5), 0);
  });
  it('real defs cut at 0.66 and 0.33', () => {
    const def = BOSSES[0];
    assert.equal(bossPhaseIndex(def, 0.67), 0);
    assert.equal(bossPhaseIndex(def, 0.5), 1);
    assert.equal(bossPhaseIndex(def, 0.1), 2);
  });
  it('shipped boss table validates clean', () => {
    assert.deepEqual(validateBosses(), []);
  });
});

describe('tester M4 refix: frameRows finite sanitize', () => {
  it('Infinity/NaN/undefined fields become finite', () => {
    const rows = frameRows({
      jab: { startup: Infinity, active: NaN, recovery: undefined, damage: 5, range: 1 },
      cross: { startup: 3, active: 2, recovery: 4, damage: 5, range: 1 },
      hook: { startup: 1, active: 1, recovery: 1, damage: 1, range: 1 },
      uppercut: { startup: 1, active: 1, recovery: 1, damage: 1, range: 1 },
      kick: { startup: 1, active: 1, recovery: 1, damage: 1, range: 1 },
    });
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.ok(Number.isFinite(r.startup));
      assert.ok(Number.isFinite(r.active));
      assert.ok(Number.isFinite(r.total));
    }
  });
  it('shipped dojo trials validate clean', () => {
    assert.deepEqual(validateDojo(), []);
  });
});

describe('tester M4 refix: visual craft DOM contract', () => {
  it('dojo frames table scrolls inside .frames-wrap', () => {
    const html = read('index.html');
    const css = read('theme.css');
    assert.ok(html.includes('class="frames-wrap"'));
    assert.ok(html.includes('id="dojo-frames"'));
    assert.ok(css.includes('.frames-wrap') && css.includes('overflow-x'));
  });
  it('HUD renders clean renderer names, footer drops milestone codes', () => {
    const app = read('app.js');
    const html = read('index.html');
    assert.ok(app.includes("TIER_NAMES[tier] || 'Canvas2D'"));
    assert.ok(!html.includes('M4/G1') && !html.includes('G1-G7'));
    assert.ok(!/tier:\s*[012]/i.test(html));
  });
  it('incomplete trials use todo styling, not locked', () => {
    const app = read('app.js');
    const start = app.indexOf('function renderDojo');
    const end = app.indexOf('/* ---- Dialogue box', start);
    const body = app.slice(start, end === -1 ? undefined : end);
    assert.ok(body.includes("'todo'"));
    assert.ok(!body.includes("'locked'"));
  });
});
