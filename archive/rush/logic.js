/*
 * Redline Rush — core game logic.
 *
 * A small, dependency-free module of pure functions (no DOM, no canvas, no
 * global state) so every gameplay rule can be unit-tested under Node and
 * reused verbatim by the browser game loop. Browser consumers get
 * `window.Redline`; Node consumers get the module export.
 */
(function (root) {
  'use strict';

  // ---- Math helpers ---------------------------------------------------------

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Clamped smoothstep; eases difficulty ramps so they start slow and feel
  // natural at high speed instead of being linear.
  function smoothstep(t) {
    var x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  // ---- Tunables -------------------------------------------------------------

  // Every gameplay number lives here. The renderer and update loop only read
  // these values; none of them are magic literals scattered through code.
  var CONFIG = Object.freeze({
    lanes: 4,
    roadWidth: 560,            // design-time road width in CSS px
    playerCarWidth: 46,
    playerCarHeight: 80,
    trafficCarWidth: 46,
    trafficCarHeight: 84,
    collisionShrink: 0.78,     // fraction of each hitbox kept (forgiving)
    minScrollSpeed: 230,       // px/s at the start of a run
    maxScrollSpeed: 900,       // px/s at max difficulty
    speedRampDistance: 16000,  // px of travel until max speed
    spawnIntervalMin: 0.42,    // s between spawn batches at max difficulty
    spawnIntervalMax: 0.95,    // s at the start
    spawnRampDistance: 16000,
    maxGroupSize: 3,           // max cars per batch (a lane is always free)
    groupRampDistance: 12000,
    brakeMultiplier: 0.55,     // speed kept while braking
    nearMissDistance: 60,       // lateral px (centre-to-centre) for a near miss
    nearMissScore: 25,
    fuelPickupScore: 15,
    fuelMax: 100,
    fuelPickupAmount: 40,
    fuelDrainBase: 1.2,        // fuel/s at base speed
    fuelDrainPerSpeed: 0.006,  // extra fuel/s per px/s of scroll speed
    fuelPickupEvery: 8,        // s between fuel-can spawns (avg, with jitter)
    fuelPickupJitter: 3,
    fuelLowThreshold: 30,      // below this, a fuel can is spawned sooner
    lives: 3,
    invincibleTime: 2.0,       // s of invulnerability after a hit
    scorePerPixel: 0.01,
    speedToKmh: 0.32,
    highScoreKey: 'redline-rush.highscore',
    muteKey: 'redline-rush.muted'
  });

  // ---- Difficulty -----------------------------------------------------------

  // Road scroll speed (px/s) after travelling `distance` px.
  function scrollSpeedAt(distance) {
    var t = clamp(distance / CONFIG.speedRampDistance, 0, 1);
    return lerp(CONFIG.minScrollSpeed, CONFIG.maxScrollSpeed, smoothstep(t));
  }

  // Seconds between traffic batches at `distance`.
  function spawnIntervalAt(distance) {
    var t = clamp(distance / CONFIG.spawnRampDistance, 0, 1);
    return lerp(CONFIG.spawnIntervalMax, CONFIG.spawnIntervalMin, smoothstep(t));
  }

  // Number of cars in a batch at `distance`. Never exceeds lanes - 1 so a
  // passable gap always exists.
  function groupSizeAt(distance, rng) {
    var t = clamp(distance / CONFIG.groupRampDistance, 0, 1);
    var max = 1 + Math.round(smoothstep(t) * (CONFIG.maxGroupSize - 1));
    return 1 + Math.floor(rng() * max);
  }

  // ---- Geometry -------------------------------------------------------------

  // AABB overlap test. `shrink` (0..1) is the fraction of each box's size that
  // counts, making hitboxes forgiving by a symmetric margin on both axes.
  function collides(ax, ay, aw, ah, bx, by, bw, bh, shrink) {
    var s = typeof shrink === 'number' ? shrink : 1;
    var pad = (1 - s) / 2;
    var aX1 = ax + aw * pad, aX2 = aX1 + aw * s;
    var aY1 = ay + ah * pad, aY2 = aY1 + ah * s;
    var bX1 = bx + bw * pad, bX2 = bX1 + bw * s;
    var bY1 = by + bh * pad, bY2 = bY1 + bh * s;
    return aX1 < bX2 && aX2 > bX1 && aY1 < bY2 && aY2 > bY1;
  }

  // Centre of the road at lane `lane` as a fraction of road width (0..1).
  function laneCenterFraction(lane, laneCount) {
    return (lane + 0.5) / laneCount;
  }

  // Lane index under an x offset measured from the road's left edge.
  function laneIndexForOffset(x, roadWidth, laneCount) {
    var t = clamp(x / roadWidth, 0, 0.999999);
    return Math.min(laneCount - 1, Math.floor(t * laneCount));
  }

  // ---- Scoring --------------------------------------------------------------

  function scoreForDistance(distance) {
    return Math.max(0, Math.floor(distance * CONFIG.scorePerPixel));
  }

  function formatScore(score) {
    var n = Math.max(0, Math.floor(score));
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ---- High score persistence ----------------------------------------------

  // Coerce any stored value to a safe non-negative integer; anything else
  // (missing, NaN, Infinity, negative, junk) falls back to `fallback`.
  function sanitizeScore(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return sanitizeScore(fallback, 0);
    }
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0) return sanitizeScore(fallback, 0);
    return Math.floor(n);
  }

  // Load a high score from a Storage-like object. Storage access can throw in
  // private browsing, so every touch is guarded.
  function loadScore(storage, key, fallback) {
    var fb = sanitizeScore(fallback, 0);
    try {
      return sanitizeScore(storage.getItem(key), fb);
    } catch (err) {
      return fb;
    }
  }

  function saveScore(storage, key, value) {
    try {
      storage.setItem(key, String(sanitizeScore(value, 0)));
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadFlag(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      if (raw === null) return !!fallback;
      return raw === '1' || raw === 'true';
    } catch (err) {
      return !!fallback;
    }
  }

  function saveFlag(storage, key, value) {
    try {
      storage.setItem(key, value ? '1' : '0');
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---- Fuel -----------------------------------------------------------------

  // Fuel burned per second while driving at `scrollSpeed`.
  function fuelDrainPerSecond(scrollSpeed) {
    return CONFIG.fuelDrainBase + CONFIG.fuelDrainPerSpeed * scrollSpeed;
  }

  function fuelAfter(fuel, dt, scrollSpeed) {
    var next = fuel - fuelDrainPerSecond(scrollSpeed) * dt;
    return clamp(next, 0, CONFIG.fuelMax);
  }

  function fuelWithPickup(fuel) {
    return clamp(fuel + CONFIG.fuelPickupAmount, 0, CONFIG.fuelMax);
  }

  // ---- Traffic spawner ------------------------------------------------------

  /*
   * Plans traffic batches. Guarantees:
   *   - every batch leaves at least one lane free (a passable row),
   *   - consecutive batches tend to reuse the previous free lane, creating
   *     gentle corridors the player can follow instead of dead-end walls.
   * `rng` may be injected for deterministic tests.
   */
  function createSpawner(rng, laneCount) {
    var r = typeof rng === 'function' ? rng : Math.random;
    var lanes = typeof laneCount === 'number' && laneCount > 1 ? laneCount : CONFIG.lanes;
    var corridorBias = 0.65;
    var lastFreeLane = -1;

    function plan(groupSize) {
      var size = clamp(Math.floor(groupSize), 1, lanes - 1);
      var freeTarget = lanes - size;
      var free = [];
      // Carrying the previous free lane forward creates corridors to follow.
      if (lastFreeLane >= 0 && r() < corridorBias) {
        free.push(lastFreeLane);
      }
      // Randomly fill the remaining free lanes; a sequential pass afterwards
      // guarantees progress even with a degenerate (constant) rng.
      var guard = 0;
      while (free.length < freeTarget && guard++ < 100) {
        var lane = Math.floor(r() * lanes);
        if (free.indexOf(lane) === -1) free.push(lane);
      }
      for (var li = 0; li < lanes && free.length < freeTarget; li++) {
        if (free.indexOf(li) === -1) free.push(li);
      }
      var taken = [];
      for (var i = 0; i < lanes; i++) {
        if (free.indexOf(i) === -1) taken.push(i);
      }
      lastFreeLane = free[Math.floor(r() * free.length)];
      return taken;
    }

    return { plan: plan };
  }

  // ---- Near miss ------------------------------------------------------------

  // True when `car` has just passed the player's front while staying within
  // `nearMissDist` px (lateral, centre-to-centre) of the player, and the
  // reward has not already been claimed for this car.
  function nearMissed(player, car, nearMissDist) {
    if (car.passedNearMiss) return false;
    if (car.y <= player.y + player.h) return false;
    var pcx = player.x + player.w / 2;
    var ccx = car.x + car.w / 2;
    return Math.abs(pcx - ccx) <= nearMissDist;
  }

  // ---- Exports ---------------------------------------------------------------

  var Redline = {
    CONFIG: CONFIG,
    clamp: clamp,
    lerp: lerp,
    smoothstep: smoothstep,
    scrollSpeedAt: scrollSpeedAt,
    spawnIntervalAt: spawnIntervalAt,
    groupSizeAt: groupSizeAt,
    collides: collides,
    laneCenterFraction: laneCenterFraction,
    laneIndexForOffset: laneIndexForOffset,
    scoreForDistance: scoreForDistance,
    formatScore: formatScore,
    sanitizeScore: sanitizeScore,
    loadScore: loadScore,
    saveScore: saveScore,
    loadFlag: loadFlag,
    saveFlag: saveFlag,
    fuelDrainPerSecond: fuelDrainPerSecond,
    fuelAfter: fuelAfter,
    fuelWithPickup: fuelWithPickup,
    createSpawner: createSpawner,
    nearMissed: nearMissed
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Redline;
  } else {
    root.Redline = Redline;
  }
})(typeof window !== 'undefined' ? window : globalThis);
