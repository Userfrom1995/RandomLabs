// Umbra M4: economy awards, upgrades, shop, bundles, M4 migration.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AWARD_WIN,
  AWARD_ROUND_BONUS,
  AWARD_LOSS,
  AWARD_DRAW,
  AWARD_BOSS_BONUS,
  JACKPOT_EVERY,
  JACKPOT_BONUS,
  UPGRADE_TRACKS,
  MAX_UPGRADE,
  awardFor,
  upgradeCost,
  upgradeEffect,
  buyWeapon,
  buyUpgrade,
  canAfford,
} from '../src/economy.js';
import { defaultProfile, migrateProfile, PROFILE_VERSION } from '../src/storage/profile.js';
import { exportBundle, importBundle, BUNDLE_KIND, BUNDLE_VERSION } from '../src/storage/bundle.js';

describe('awardFor', () => {
  it('exposes the award constants', () => {
    assert.equal(AWARD_WIN, 60);
    assert.equal(AWARD_ROUND_BONUS, 15);
    assert.equal(AWARD_LOSS, 15);
    assert.equal(AWARD_DRAW, 25);
    assert.equal(AWARD_BOSS_BONUS, 120);
    assert.equal(JACKPOT_EVERY, 5);
    assert.equal(JACKPOT_BONUS, 100);
  });
  it('win: base plus per-round bonus', () => {
    const r = awardFor({ outcome: 'win', roundsWon: 2 });
    assert.equal(r.currency, 90);
    assert.equal(r.jackpot, false);
    assert.deepEqual(r.parts, { base: 60, rounds: 30, boss: 0, jackpot: 0 });
  });
  it('win with zero rounds is the base award', () => {
    const r = awardFor({ outcome: 'win' });
    assert.equal(r.currency, 60);
    assert.deepEqual(r.parts, { base: 60, rounds: 0, boss: 0, jackpot: 0 });
  });
  it('win against a boss adds the boss bonus', () => {
    const r = awardFor({ outcome: 'win', roundsWon: 2, boss: true });
    assert.equal(r.currency, 210);
    assert.equal(r.parts.boss, 120);
  });
  it('jackpot lands on every 5th career win', () => {
    const fifth = awardFor({ outcome: 'win', roundsWon: 0, careerWins: 4 });
    assert.equal(fifth.jackpot, true);
    assert.equal(fifth.parts.jackpot, 100);
    assert.equal(fifth.currency, 160);
    const fourth = awardFor({ outcome: 'win', roundsWon: 0, careerWins: 3 });
    assert.equal(fourth.jackpot, false);
    assert.equal(fourth.currency, 60);
    const tenth = awardFor({ outcome: 'win', roundsWon: 1, boss: true, careerWins: 9 });
    assert.equal(tenth.jackpot, true);
    assert.equal(tenth.currency, 60 + 15 + 120 + 100);
  });
  it('loss is flat consolation and draw is flat', () => {
    assert.equal(awardFor({ outcome: 'loss' }).currency, 15);
    assert.equal(awardFor({ outcome: 'loss', roundsWon: 5, boss: true }).currency, 15);
    assert.equal(awardFor({ outcome: 'draw' }).currency, 25);
    assert.equal(awardFor({ outcome: 'draw', roundsWon: 5, boss: true }).currency, 25);
  });
  it('unknown outcomes are treated as a loss and never throw', () => {
    for (const outcome of ['victory', '', 'WIN', null, undefined, 42, {}]) {
      const r = awardFor({ outcome });
      assert.equal(r.currency, 15);
      assert.equal(r.jackpot, false);
    }
    assert.equal(awardFor().currency, 15);
    assert.equal(awardFor(null).currency, 15);
    assert.equal(awardFor('win').currency, 15);
    assert.equal(awardFor(42).currency, 15);
  });
  it('hostile numerics clamp to sane ranges', () => {
    assert.equal(awardFor({ outcome: 'win', roundsWon: -3 }).currency, 60);
    assert.equal(awardFor({ outcome: 'win', roundsWon: NaN }).currency, 60);
    assert.equal(awardFor({ outcome: 'win', roundsWon: Infinity }).currency, 60);
    assert.equal(awardFor({ outcome: 'win', careerWins: -5 }).jackpot, false);
    assert.equal(awardFor({ outcome: 'win', careerWins: NaN }).jackpot, false);
    assert.equal(awardFor({ outcome: 'win', roundsWon: 2.9 }).currency, 90);
  });
});

describe('upgrades', () => {
  it('cost curve is 100,200,300,400 then null at max', () => {
    assert.deepEqual([0, 1, 2, 3].map((lv) => upgradeCost('dmg', lv)), [100, 200, 300, 400]);
    assert.deepEqual([0, 1, 2, 3].map((lv) => upgradeCost('hp', lv)), [100, 200, 300, 400]);
    assert.equal(upgradeCost('dmg', 4), null);
    assert.equal(upgradeCost('hp', 5), null);
    assert.equal(upgradeCost('dmg', 99), null);
  });
  it('unknown tracks cost null and never throw', () => {
    assert.equal(upgradeCost('speed', 0), null);
    assert.equal(upgradeCost(null, 0), null);
    assert.equal(upgradeCost(undefined, 0), null);
    assert.equal(upgradeCost('dmg', NaN), null);
    assert.equal(upgradeCost('dmg', Infinity), null);
  });
  it('dmg effect runs 1.0 to 1.32', () => {
    assert.deepEqual(UPGRADE_TRACKS, ['dmg', 'hp']);
    assert.equal(MAX_UPGRADE, 4);
    const got = [0, 1, 2, 3, 4].map((lv) => upgradeEffect('dmg', lv));
    const want = [1.0, 1.08, 1.16, 1.24, 1.32];
    for (let i = 0; i < want.length; i += 1) {
      assert.ok(Math.abs(got[i] - want[i]) < 1e-9, `dmg lv ${i}: got ${got[i]}`);
    }
  });
  it('hp effect runs 0 to 48', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map((lv) => upgradeEffect('hp', lv)), [0, 12, 24, 36, 48]);
  });
  it('unknown track effects are null and levels clamp', () => {
    assert.equal(upgradeEffect('speed', 2), null);
    assert.equal(upgradeEffect(null, 0), null);
    assert.ok(Math.abs(upgradeEffect('dmg', 99) - 1.32) < 1e-9);
    assert.equal(upgradeEffect('hp', -5), 0);
    assert.equal(upgradeEffect('hp', NaN), 0);
  });
});

describe('shop', () => {
  it('buyWeapon succeeds and mutates currency plus ownership', () => {
    const p = defaultProfile();
    p.progress.currency = 500;
    const r = buyWeapon(p, 'katana', 200);
    assert.equal(r.ok, true);
    assert.equal(p.progress.currency, 300);
    assert.ok(p.progress.ownedWeapons.includes('katana'));
  });
  it('buyWeapon rejects duplicates and short funds', () => {
    const p = defaultProfile();
    p.progress.currency = 500;
    assert.equal(buyWeapon(p, 'katana', 200).ok, true);
    const dup = buyWeapon(p, 'katana', 200);
    assert.equal(dup.ok, false);
    assert.equal(typeof dup.reason, 'string');
    const poor = defaultProfile();
    poor.progress.currency = 50;
    const noFunds = buyWeapon(poor, 'katana', 200);
    assert.equal(noFunds.ok, false);
    assert.equal(poor.progress.currency, 50);
    assert.ok(!poor.progress.ownedWeapons.includes('katana'));
  });
  it('buyWeapon rejects bad ids and prices without throwing', () => {
    const p = defaultProfile();
    p.progress.currency = 500;
    assert.equal(buyWeapon(p, '', 100).ok, false);
    assert.equal(buyWeapon(p, null, 100).ok, false);
    assert.equal(buyWeapon(p, 42, 100).ok, false);
    assert.equal(buyWeapon(p, 'spear', -5).ok, false);
    assert.equal(buyWeapon(p, 'spear', NaN).ok, false);
    assert.equal(buyWeapon(p, 'spear', Infinity).ok, false);
    assert.equal(buyWeapon(p, 'spear', 'free').ok, false);
  });
  it('buyWeapon survives hostile profiles', () => {
    assert.equal(buyWeapon(null, 'katana', 100).ok, false);
    assert.equal(buyWeapon({}, 'katana', 100).ok, false);
    assert.equal(buyWeapon({ progress: null }, 'katana', 100).ok, false);
    assert.equal(buyWeapon({ progress: 'nope' }, 'katana', 100).ok, false);
  });
  it('buyUpgrade walks the cost curve then maxes out', () => {
    const p = defaultProfile();
    p.progress.currency = 1000;
    const first = buyUpgrade(p, 'dmg');
    assert.equal(first.ok, true);
    assert.equal(first.cost, 100);
    assert.equal(p.progress.upgrades.dmg, 1);
    assert.equal(p.progress.currency, 900);
    const second = buyUpgrade(p, 'dmg');
    assert.equal(second.ok, true);
    assert.equal(second.cost, 200);
    assert.equal(p.progress.upgrades.dmg, 2);
    p.progress.upgrades.hp = 4;
    const maxed = buyUpgrade(p, 'hp');
    assert.equal(maxed.ok, false);
    assert.equal(maxed.cost, null);
    assert.equal(typeof maxed.reason, 'string');
  });
  it('buyUpgrade rejects short funds and unknown tracks', () => {
    const poor = defaultProfile();
    poor.progress.currency = 50;
    const r = buyUpgrade(poor, 'dmg');
    assert.equal(r.ok, false);
    assert.equal(r.cost, 100);
    assert.equal(poor.progress.upgrades.dmg, 0);
    assert.equal(buyUpgrade(defaultProfile(), 'speed').ok, false);
    assert.equal(buyUpgrade(defaultProfile(), null).ok, false);
  });
  it('buyUpgrade survives hostile profiles', () => {
    assert.equal(buyUpgrade(null, 'dmg').ok, false);
    assert.equal(buyUpgrade({}, 'dmg').ok, false);
    assert.equal(buyUpgrade({ progress: null }, 'dmg').ok, false);
  });
  it('canAfford checks funds without throwing', () => {
    const p = defaultProfile();
    p.progress.currency = 150;
    assert.equal(canAfford(p, 100), true);
    assert.equal(canAfford(p, 200), false);
    assert.equal(canAfford(null, 10), false);
    assert.equal(canAfford({}, 10), false);
    assert.equal(canAfford(p, NaN), false);
    assert.equal(canAfford(p, -1), false);
    assert.equal(canAfford(p, Infinity), false);
  });
});

describe('bundle', () => {
  it('round-trips a profile through export and import', () => {
    const p = defaultProfile();
    p.progress.currency = 275;
    p.progress.ownedWeapons.push('katana');
    p.progress.upgrades.dmg = 2;
    p.progress.stats.wins = 4;
    const text = exportBundle(p);
    assert.equal(typeof text, 'string');
    const back = importBundle(text);
    assert.equal(back.ok, true);
    assert.deepEqual(back.profile, migrateProfile(p));
    assert.deepEqual(back.profile, p);
  });
  it('exports are always clean v2 via migrateProfile', () => {
    const raw = { progress: { currency: 10 } };
    const back = importBundle(exportBundle(raw));
    assert.equal(back.ok, true);
    assert.equal(back.profile.version, 2);
    assert.deepEqual(back.profile.progress.ownedWeapons, ['fists']);
  });
  it('exportBundle never throws on hostile input', () => {
    for (const hostile of [null, undefined, 42, 'junk', []]) {
      const text = exportBundle(hostile);
      assert.equal(typeof text, 'string');
      const back = importBundle(text);
      assert.equal(back.ok, true);
    }
  });
  it('importBundle rejects hostile payloads', () => {
    assert.equal(importBundle('not json{{').ok, false);
    assert.equal(importBundle('{}').ok, false);
    assert.equal(importBundle('[]').ok, false);
    assert.equal(importBundle('null').ok, false);
    assert.equal(importBundle('').ok, false);
    assert.equal(importBundle('   ').ok, false);
    assert.equal(importBundle(null).ok, false);
    assert.equal(importBundle(42).ok, false);
    assert.equal(importBundle({}).ok, false);
    const wrongKind = JSON.stringify({ kind: 'nope', version: 1, profile: defaultProfile() });
    assert.equal(importBundle(wrongKind).ok, false);
    const v2 = JSON.stringify({ kind: BUNDLE_KIND, version: 2, profile: defaultProfile() });
    assert.equal(importBundle(v2).ok, false);
    const asArray = JSON.stringify([1, 2, 3]);
    assert.equal(importBundle(asArray).ok, false);
    const noProfile = JSON.stringify({ kind: BUNDLE_KIND, version: 1 });
    assert.equal(importBundle(noProfile).ok, false);
    const nullProfile = JSON.stringify({ kind: BUNDLE_KIND, version: 1, profile: null });
    assert.equal(importBundle(nullProfile).ok, false);
    assert.equal(BUNDLE_KIND, 'umbra-profile');
    assert.equal(BUNDLE_VERSION, 1);
  });
});

describe('migration M4', () => {
  it('defaults carry the M4 economy shell', () => {
    const p = defaultProfile();
    assert.equal(p.version, PROFILE_VERSION);
    assert.equal(PROFILE_VERSION, 2);
    assert.deepEqual(p.progress.ownedWeapons, ['fists']);
    assert.equal(p.progress.equippedWeapon, 'fists');
    assert.deepEqual(p.progress.upgrades, { dmg: 0, hp: 0 });
    assert.deepEqual(p.progress.stats, { wins: 0, losses: 0, bossWins: 0, trials: [] });
  });
  it('a v1-style blob gains M4 fields while staying v2', () => {
    const v1 = {
      version: 1,
      config: { tier: '1', ladderIndex: 2, batterySaver: true, reducedMotion: false },
      progress: { unlockedArenas: [0], unlockedFighters: [], currency: 0 },
    };
    const p = migrateProfile(v1);
    assert.equal(p.version, 2);
    assert.deepEqual(p.progress.unlockedFighters, ['kaito']);
    assert.deepEqual(p.progress.ownedWeapons, ['fists']);
    assert.equal(p.progress.equippedWeapon, 'fists');
    assert.deepEqual(p.progress.upgrades, { dmg: 0, hp: 0 });
    assert.deepEqual(p.progress.stats, { wins: 0, losses: 0, bossWins: 0, trials: [] });
  });
  it('sanitizes malformed M4 fields', () => {
    const p = migrateProfile({
      version: 2,
      progress: {
        ownedWeapons: ['katana', '', 42, null],
        equippedWeapon: 'spear',
        upgrades: { dmg: 99, hp: -3 },
        stats: { wins: -1, losses: 2.5, bossWins: 3, trials: ['t1', 42, null] },
      },
    });
    assert.deepEqual(p.progress.ownedWeapons, ['fists', 'katana']);
    assert.equal(p.progress.equippedWeapon, 'fists');
    assert.deepEqual(p.progress.upgrades, { dmg: 4, hp: 0 });
    assert.deepEqual(p.progress.stats, { wins: 0, losses: 0, bossWins: 3, trials: ['t1'] });
  });
  it('keeps a valid equipped weapon and valid M4 values', () => {
    const base = defaultProfile();
    base.progress.ownedWeapons = ['fists', 'katana'];
    base.progress.equippedWeapon = 'katana';
    base.progress.upgrades = { dmg: 2, hp: 3 };
    base.progress.stats = { wins: 5, losses: 1, bossWins: 2, trials: ['prologue'] };
    const p = migrateProfile(base);
    assert.equal(p.progress.equippedWeapon, 'katana');
    assert.deepEqual(p.progress.upgrades, { dmg: 2, hp: 3 });
    assert.deepEqual(p.progress.stats, { wins: 5, losses: 1, bossWins: 2, trials: ['prologue'] });
  });
});
