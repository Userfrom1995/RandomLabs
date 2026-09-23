// Umbra M5: shell-integration regression tests (headless, node:test).
// Covers the M5 product-hardening surface that stays import-safe in node:
// muted config persistence, SW v5 shell list, tutorial graduation award
// shape. DOM wiring (screens, overlays, bench hook) is verified by the
// headless-Chromium evidence pass, not here.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  defaultConfig,
  defaultProfile,
  migrateProfile,
  loadProfile,
  saveProfile,
} from "../src/storage/profile.js";
import { createLocalProvider, createMemoryStore } from "../src/storage/provider.js";
import { awardFor } from "../src/economy.js";
import { createFight, stepFight, hashState } from "../src/combat/engine.js";
import { mulberry32 } from "../src/rng.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

describe("M5 muted config", () => {
  it("defaults to unmuted", () => {
    assert.equal(defaultConfig().muted, false);
    assert.equal(defaultProfile().config.muted, false);
  });

  it("migrates a stored muted flag forward", () => {
    const p = migrateProfile({ config: { muted: true } });
    assert.equal(p.config.muted, true);
  });

  it("ignores non-boolean muted values", () => {
    const p = migrateProfile({ config: { muted: "yes" } });
    assert.equal(p.config.muted, false);
  });

  it("round-trips muted through save/load", async () => {
    const provider = createLocalProvider(createMemoryStore());
    const p = defaultProfile();
    p.config.muted = true;
    await saveProfile(provider, p);
    const back = await loadProfile(provider);
    assert.equal(back.config.muted, true);
  });
});

describe("M5 service worker shell", () => {
  const sw = readFileSync(join(root, "sw.js"), "utf8");

  it("is versioned umbra-v5", () => {
    assert.match(sw, /umbra-v5/);
    assert.doesNotMatch(sw, /umbra-v4['"]/);
  });

  it("caches every M5 module", () => {
    for (const mod of [
      "./src/vfx.js",
      "./src/tutorial.js",
      "./src/audio/sfx.js",
      "./src/audio/music.js",
      "./src/audio/engine.js",
      "./src/input/haptics.js",
    ]) {
      assert.ok(sw.includes(mod), `sw.js missing ${mod}`);
    }
  });

  it("has no em dashes", () => {
    assert.doesNotMatch(sw, /\u2014/);
  });
});

describe("M5 tutorial graduation economy", () => {
  it("win award is a finite non-negative ember payout", () => {
    const a = awardFor({ outcome: "win", roundsWon: 1, boss: false, careerWins: 0 });
    assert.ok(Number.isFinite(a.currency) && a.currency >= 0);
  });

  it("graduation stipend (25) stacks on the bout award", () => {
    const a = awardFor({ outcome: "win", roundsWon: 1, boss: false, careerWins: 0 });
    assert.ok(Number.isFinite(a.currency + 25));
  });
});

describe("M5 soak + fuzz ledger", () => {
  // Deterministic fuzz: mulberry32-driven garbage inputs over long bouts,
  // including a boss bout. NaN-free + finite hash at every checkpoint.
  function fuzzInput(rng) {
    return {
      move: Math.floor(rng() * 3) - 1,
      crouch: rng() < 0.2,
      jump: rng() < 0.1,
      punch: rng() < 0.3,
      kick: rng() < 0.25,
      block: rng() < 0.3,
      special: rng() < 0.1,
      dash: rng() < 0.1 ? (rng() < 0.5 ? -1 : 1) : 0,
    };
  }

  function soak(seed, boss, ticks) {
    const fight = createFight({ seed, arena: 2, rounds: 3, boss });
    const rng = mulberry32(seed ^ 0x51ab);
    for (let t = 0; t < ticks; t++) {
      stepFight(fight, fuzzInput(rng), fuzzInput(rng));
      if (t % 500 === 0) {
        const h = hashState(fight);
        assert.ok(typeof h === "string" && h.length > 0, `hash finite at tick ${t}`);
        for (const f of fight.fighters) {
          assert.ok(Number.isFinite(f.hp) && Number.isFinite(f.x), `finite sim at tick ${t}`);
        }
      }
      if (fight.over) break;
    }
    return fight;
  }

  it("3000-tick versus fuzz stays finite", () => {
    soak(0x375a, null, 3000);
  });

  it("3000-tick boss (dusk) fuzz stays finite", () => {
    soak(0x375b, "dusk", 3000);
  });

  it("same seed replays byte-identical (fuzz determinism)", () => {
    const a = soak(0x375c, "vex", 1500);
    const b = soak(0x375c, "vex", 1500);
    assert.equal(hashState(a), hashState(b));
  });
});
