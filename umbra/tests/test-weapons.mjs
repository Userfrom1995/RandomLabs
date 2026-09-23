// Umbra M4: weapon defs plus one tuned move table per weapon.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_IDS,
  WEAPONS,
  WEAPON_TABLES,
  weaponById,
  movesForWeapon,
  validateWeapons,
} from '../src/weapons.js';
import { MOVES, validateMoves } from '../src/combat/moves.js';
import { movesDigest } from '../src/combat/engine.js';

const CANON = ['jab', 'cross', 'kick', 'sweep', 'uppercut'];
const PRICES = { fists: 0, daggers: 150, staff: 250, sword: 350, nunchaku: 450, spear: 550 };
const LENGTHS = { fists: 0.06, daggers: 0.16, nunchaku: 0.3, sword: 0.34, staff: 0.4, spear: 0.46 };

describe('weapon defs', () => {
  it('ships exactly the six canonical ids', () => {
    assert.deepEqual(WEAPON_IDS, ['fists', 'sword', 'nunchaku', 'spear', 'staff', 'daggers']);
    assert.equal(WEAPONS.length, 6);
  });
  it('validates clean on defaults', () => {
    assert.deepEqual(validateWeapons(), []);
  });
  it('every table passes validateMoves', () => {
    for (const id of WEAPON_IDS) {
      assert.deepEqual(validateMoves(WEAPON_TABLES[id]), [], `${id} fails validateMoves`);
    }
  });
  it('carries exact prices and lengths', () => {
    for (const w of WEAPONS) {
      assert.equal(w.price, PRICES[w.id], `${w.id} price`);
      assert.equal(w.length, LENGTHS[w.id], `${w.id} length`);
      assert.equal(w.unlock, null, `${w.id} unlock`);
    }
  });
  it('has non-empty names, epithets, lore and sane trails', () => {
    const colors = new Set();
    for (const w of WEAPONS) {
      for (const f of ['name', 'epithet', 'lore']) {
        assert.ok(typeof w[f] === 'string' && w[f].length > 0, `${w.id}.${f} empty`);
      }
      const [r, g, b] = w.trail.color;
      for (const c of [r, g, b]) assert.ok(c >= 0 && c <= 1, `${w.id} trail color out of range`);
      assert.ok(w.trail.width > 0, `${w.id} trail width`);
      assert.ok(w.length >= 0 && w.length <= 0.5, `${w.id} length range`);
      colors.add(w.trail.color.join(','));
    }
    assert.equal(colors.size, WEAPONS.length, 'trail colors must be distinct per weapon');
  });
});

describe('fists identity and digests', () => {
  it('fists table owns a detached frozen copy of MOVES content', () => {
    assert.deepEqual(WEAPON_TABLES.fists, MOVES);
    assert.notEqual(WEAPON_TABLES.fists, MOVES);
    assert.ok(Object.isFrozen(WEAPON_TABLES.fists), 'fists table not frozen');
    assert.deepEqual(movesForWeapon('fists'), MOVES);
  });
  it('movesDigest is stable and distinct per weapon', () => {
    const first = new Map();
    for (const id of WEAPON_IDS) {
      const a = movesDigest(WEAPON_TABLES[id]);
      const b = movesDigest(WEAPON_TABLES[id]);
      assert.equal(a, b, `${id} digest unstable`);
      assert.match(a, /^[0-9a-f]{8}$/, `${id} digest shape`);
      first.set(id, a);
    }
    assert.equal(new Set(first.values()).size, WEAPON_IDS.length, 'digests must differ per weapon');
  });
});

describe('weapon balance', () => {
  it('sword hits hardest with longer reach and slower recovery', () => {
    const t = WEAPON_TABLES.sword;
    assert.ok(t.uppercut.damage >= 20, `sword uppercut ${t.uppercut.damage}`);
    assert.ok(t.jab.range > MOVES.jab.range, 'sword jab reach');
    assert.ok(t.cross.range > MOVES.cross.range, 'sword cross reach');
    for (const m of CANON) {
      assert.ok(t[m].recovery > MOVES[m].recovery, `sword ${m} recovery not slower`);
    }
    const maxOther = Math.max(...WEAPON_IDS.filter((w) => w !== 'sword').map((w) => WEAPON_TABLES[w].uppercut.damage));
    assert.ok(t.uppercut.damage > maxOther, 'sword uppercut must be the highest single hit');
  });
  it('nunchaku is fastest with the richest cancel graph', () => {
    const t = WEAPON_TABLES.nunchaku;
    assert.ok(t.jab.startup <= MOVES.jab.startup, 'nunchaku jab startup');
    assert.ok(t.cross.startup <= MOVES.cross.startup, 'nunchaku cross startup');
    assert.ok(t.jab.cancelInto.includes('cross') && t.jab.cancelInto.includes('kick'), 'nunchaku jab cancels');
    assert.ok(t.cross.cancelInto.includes('uppercut'), 'nunchaku cross->uppercut');
    assert.ok(t.kick.cancelInto.includes('sweep'), 'nunchaku kick->sweep');
    const edges = (tab) => CANON.reduce((n, m) => n + tab[m].cancelInto.length, 0);
    const fistEdges = edges(MOVES);
    assert.ok(edges(t) > fistEdges, 'nunchaku must add at least one cancel edge over fists');
    for (const m of CANON) {
      assert.ok(t[m].damage < MOVES[m].damage, `nunchaku ${m} damage not below fists`);
    }
  });
  it('spear owns range with slow startup and high knockback', () => {
    const t = WEAPON_TABLES.spear;
    assert.ok(t.kick.range >= 0.42, `spear kick ${t.kick.range}`);
    assert.ok(t.sweep.range >= 0.42, `spear sweep ${t.sweep.range}`);
    assert.ok(t.sweep.startup >= 12, `spear sweep startup ${t.sweep.startup}`);
    for (const m of CANON) {
      assert.ok(t[m].knockback > MOVES[m].knockback, `spear ${m} knockback not high`);
    }
  });
  it('staff owns the best sweep with near spear reach', () => {
    const t = WEAPON_TABLES.staff;
    assert.ok(t.sweep.damage >= 13, `staff sweep ${t.sweep.damage}`);
    const maxSweep = Math.max(...WEAPON_IDS.map((w) => WEAPON_TABLES[w].sweep.damage));
    assert.equal(t.sweep.damage, maxSweep, 'staff sweep must be the best');
    assert.ok(t.kick.range > MOVES.kick.range && t.kick.range < WEAPON_TABLES.spear.kick.range, 'staff kick second to spear');
    assert.ok(t.sweep.range > MOVES.sweep.range && t.sweep.range < WEAPON_TABLES.spear.sweep.range, 'staff sweep second to spear');
  });
  it('daggers are fastest, shortest, weakest', () => {
    const t = WEAPON_TABLES.daggers;
    assert.ok(t.jab.startup <= 3, `daggers jab startup ${t.jab.startup}`);
    assert.ok(t.jab.range <= 0.18, `daggers jab range ${t.jab.range}`);
    assert.ok(t.uppercut.damage <= 12, `daggers uppercut ${t.uppercut.damage}`);
    for (const m of CANON) {
      const ranges = WEAPON_IDS.map((w) => WEAPON_TABLES[w][m].range);
      const damages = WEAPON_IDS.map((w) => WEAPON_TABLES[w][m].damage);
      assert.equal(t[m].range, Math.min(...ranges), `daggers ${m} not shortest`);
      assert.equal(t[m].damage, Math.min(...damages), `daggers ${m} not weakest`);
    }
  });
  it('all tables keep sane frames, local cancels, canonical poses, sfx', () => {
    for (const id of WEAPON_IDS) {
      const table = WEAPON_TABLES[id];
      assert.deepEqual(Object.keys(table).sort(), [...CANON].sort(), `${id} move keys`);
      for (const m of CANON) {
        const mv = table[m];
        for (const f of ['startup', 'active', 'recovery']) {
          assert.ok(Number.isInteger(mv[f]) && mv[f] > 0, `${id}.${m}.${f}`);
        }
        for (const f of ['range', 'damage', 'chip', 'knockback', 'stun']) {
          assert.ok(typeof mv[f] === 'number' && Number.isFinite(mv[f]) && mv[f] >= 0, `${id}.${m}.${f}`);
        }
        for (const target of mv.cancelInto) {
          assert.ok(target in table, `${id}.${m} cancel target missing`);
          assert.notEqual(target, m, `${id}.${m} self cancel`);
        }
        assert.ok(CANON.includes(mv.pose), `${id}.${m} pose ${mv.pose}`);
        assert.ok(typeof mv.sfx === 'string' && mv.sfx.length > 0, `${id}.${m} sfx`);
      }
    }
  });
});

describe('hostile lookups', () => {
  it('weaponById rejects hostile and unknown inputs', () => {
    assert.equal(weaponById(null), null);
    assert.equal(weaponById(42), null);
    assert.equal(weaponById({}), null);
    assert.equal(weaponById('nope'), null);
    assert.equal(weaponById(undefined), null);
    for (const w of WEAPONS) assert.equal(weaponById(w.id), w);
  });
  it('movesForWeapon returns owned copies with fists fallback', () => {
    for (const junk of [null, 42, {}, 'nope', undefined, '']) {
      assert.deepEqual(movesForWeapon(junk), WEAPON_TABLES.fists, `bad fallback for ${String(junk)}`);
    }
    for (const id of WEAPON_IDS) {
      const a = movesForWeapon(id);
      assert.deepEqual(a, WEAPON_TABLES[id], `${id} content drift`);
      assert.notEqual(a, WEAPON_TABLES[id], `${id} leaks the canonical table`);
      const b = movesForWeapon(id);
      assert.notEqual(a, b, `${id} reuses one shared copy`);
    }
    const src = movesForWeapon('sword');
    const before = src.jab.damage;
    src.jab.damage = before + 5000;
    assert.equal(movesForWeapon('sword').jab.damage, before, 'caller write polluted the canonical');
  });
});

describe('validateWeapons corruption', () => {
  it('catches a bad cancel target without throwing', () => {
    const tables = structuredClone({ ...WEAPON_TABLES, sword: structuredClone(WEAPON_TABLES.sword) });
    tables.sword.jab.cancelInto = ['nope'];
    let problems;
    assert.doesNotThrow(() => {
      problems = validateWeapons(WEAPONS, tables);
    });
    assert.ok(problems.some((p) => p.includes('cancel')), `expected cancel problem, got ${problems}`);
  });
  it('catches bad prices, trails, lengths, dupes', () => {
    const badPrice = WEAPONS.map((w) => (w.id === 'sword' ? { ...w, price: -5 } : w));
    assert.ok(validateWeapons(badPrice, WEAPON_TABLES).some((p) => p.includes('price')));
    const badTrail = WEAPONS.map((w) => (w.id === 'spear' ? { ...w, trail: { color: [2, 0, 0], width: 0 } } : w));
    assert.ok(validateWeapons(badTrail, WEAPON_TABLES).some((p) => p.includes('trail')));
    const badLength = WEAPONS.map((w) => (w.id === 'staff' ? { ...w, length: 0.9 } : w));
    assert.ok(validateWeapons(badLength, WEAPON_TABLES).some((p) => p.includes('length')));
    const dupes = [...WEAPONS, { ...WEAPONS[0] }];
    assert.ok(validateWeapons(dupes, WEAPON_TABLES).some((p) => p.includes('duplicate')));
    const missing = { ...WEAPON_TABLES };
    delete missing.spear;
    assert.ok(validateWeapons(WEAPONS, missing).some((p) => p.includes('spear')));
  });
});
