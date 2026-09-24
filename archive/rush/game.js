/*
 * Redline Rush — a top-down arcade car racing game.
 *
 * Dependency-free: everything (graphics, audio, input) is rendered with
 * Canvas 2D and Web Audio from plain ES5-ish JS. Gameplay rules live in
 * logic.js; this file only wires them to the screen and input.
 */
(function () {
  'use strict';

  var Redline = window.Redline;
  if (!Redline) {
    throw new Error('Redline Rush: logic.js must be loaded before game.js');
  }
  var C = Redline.CONFIG;

  // ---- DOM references --------------------------------------------------------

  var canvas = document.getElementById('redline-canvas');
  var ctx = canvas.getContext('2d');

  var hudScore = document.getElementById('hud-score');
  var hudBest = document.getElementById('hud-best');
  var hudSpeed = document.getElementById('hud-speed');
  var hudFuelFill = document.getElementById('hud-fuel-fill');
  var hudFuelLow = document.getElementById('hud-fuel');
  var hudLives = document.getElementById('hud-lives');

  var screenMenu = document.getElementById('screen-menu');
  var screenPause = document.getElementById('screen-pause');
  var screenOver = document.getElementById('screen-over');
  var menuBest = document.getElementById('menu-best');
  var overScore = document.getElementById('over-score');
  var overBest = document.getElementById('over-best');
  var overReason = document.getElementById('over-reason');
  var overNewBest = document.getElementById('over-new-best');

  var btnStart = document.getElementById('btn-start');
  var btnResume = document.getElementById('btn-resume');
  var btnPauseQuit = document.getElementById('btn-pause-quit');
  var btnOverRestart = document.getElementById('btn-over-restart');
  var btnOverQuit = document.getElementById('btn-over-quit');
  var btnMuteMenu = document.getElementById('btn-mute-menu');
  var btnMutePause = document.getElementById('btn-mute-pause');
  var btnMuteOver = document.getElementById('btn-mute-over');

  var steerL = document.getElementById('steer-l');
  var steerR = document.getElementById('steer-r');
  var brakeBtn = document.getElementById('brake');

  // ---- Persistent settings ---------------------------------------------------

  var storage;
  try {
    storage = window.localStorage;
  } catch (e) {
    storage = null;
  }
  var store = storage || { getItem: function () { return null; }, setItem: function () {} };

  var highScore = Redline.loadScore(store, C.highScoreKey, 0);

  // ---- Mutable game state ----------------------------------------------------

  var game = {
    state: 'menu', // 'menu' | 'playing' | 'paused' | 'over'
    time: 0,
    distance: 0,
    score: 0,
    fuel: C.fuelMax,
    lives: C.lives,
    invincible: 0,
    throttle: 1,
    speed: C.minScrollSpeed,
    cars: [],
    pickups: [],
    floaters: [],
    spawnTimer: 1.4,
    fuelTimer: 6,
    shake: 0,
    flash: 0,
    reason: '',
    lastTime: 0
  };

  var world = {
    w: 0,
    h: 0,
    dpr: 1,
    roadLeft: 0,
    roadWidth: 0,
    scale: 1,
    laneWidth: 0,
    car: { w: 0, h: 0 },
    player: { x: 0, y: 0, w: 0, h: 0 }
  };

  var input = { left: false, right: false, brake: false };

  var TRAFFIC_COLORS = ['#e5484d', '#f0a321', '#46a758', '#5b8def', '#8e4ec6', '#e93d82', '#e1e8f0'];
  var PLAYER_COLOR = '#38d9ff';

  // Render-tuning values that don't belong in logic.js (purely visual).
  var RENDER = {
    steerCarWidthsPerSec: 4.4,
    treeSpacing: 340,
    treeRadius: 10,
    treeMargin: 30,
    stripeHeight: 120,
    edgeLineWidth: 5,
    dashLength: 44,
    dashGap: 30,
    floaterSize: 14
  };

  // ---- Spawner ----------------------------------------------------------------

  var spawner = Redline.createSpawner(Math.random, C.lanes);

  // ---- Helpers -----------------------------------------------------------------

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function clamp(v, lo, hi) {
    return Redline.clamp(v, lo, hi);
  }

  function laneCenterX(lane) {
    return world.roadLeft + Redline.laneCenterFraction(lane, C.lanes) * world.roadWidth;
  }

  function rect(ctx2, x, y, w, h, r) {
    var rr = r === undefined ? 0 : r;
    ctx2.beginPath();
    if (rr > 0) {
      ctx2.moveTo(x + rr, y);
      ctx2.arcTo(x + w, y, x + w, y + h, rr);
      ctx2.arcTo(x + w, y + h, x, y + h, rr);
      ctx2.arcTo(x, y + h, x, y, rr);
      ctx2.arcTo(x, y, x + w, y, rr);
    } else {
      ctx2.rect(x, y, w, h);
    }
    ctx2.closePath();
  }

  // ---- World geometry ---------------------------------------------------------

  function recomputeWorld() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    world.w = w;
    world.h = h;
    world.dpr = dpr;
    world.roadWidth = Math.min(C.roadWidth, Math.max(240, w - 20));
    world.roadLeft = (w - world.roadWidth) / 2;
    world.scale = world.roadWidth / C.roadWidth;
    world.laneWidth = world.roadWidth / C.lanes;

    world.car.w = C.trafficCarWidth * world.scale;
    world.car.h = C.trafficCarHeight * world.scale;

    world.player.w = C.playerCarWidth * world.scale;
    world.player.h = C.playerCarHeight * world.scale;
    world.player.y = h - world.player.h - Math.max(28, 92 * world.scale);

    clampPlayer();
  }

  function clampPlayer() {
    var minX = world.roadLeft + 4;
    var maxX = world.roadLeft + world.roadWidth - world.player.w - 4;
    world.player.x = clamp(world.player.x, minX, Math.max(minX, maxX));
  }

  // ---- Run lifecycle ------------------------------------------------------------

  function resetRun() {
    game.time = 0;
    game.distance = 0;
    game.score = 0;
    game.fuel = C.fuelMax;
    game.lives = C.lives;
    game.invincible = 0;
    game.throttle = 1;
    game.speed = C.minScrollSpeed;
    game.cars = [];
    game.pickups = [];
    game.floaters = [];
    game.spawnTimer = 1.4;
    game.fuelTimer = 6;
    game.shake = 0;
    game.flash = 0;
    game.reason = '';
    world.player.x = laneCenterX(Math.floor(C.lanes / 2)) - world.player.w / 2;
    clampPlayer();
  }

  function setState(state) {
    game.state = state;
    document.body.dataset.state = state;

    screenMenu.hidden = state !== 'menu';
    screenPause.hidden = state !== 'paused';
    screenOver.hidden = state !== 'over';

    if (state === 'menu') {
      menuBest.textContent = Redline.formatScore(highScore);
    }
    if (state === 'over') {
      overScore.textContent = Redline.formatScore(game.score);
      overBest.textContent = Redline.formatScore(highScore);
      overNewBest.hidden = game.score <= highScore;
      overReason.textContent = game.reason;
    }
  }

  function startGame() {
    AudioSys.init();
    resetRun();
    AudioSys.startEngine();
    setState('playing');
  }

  function togglePause() {
    if (game.state === 'playing') {
      AudioSys.stopEngine();
      setState('paused');
    } else if (game.state === 'paused') {
      AudioSys.startEngine();
      setState('playing');
    }
  }

  function gameOver(reason) {
    game.reason = reason;
    if (game.score > highScore) {
      highScore = game.score;
      Redline.saveScore(store, C.highScoreKey, highScore);
    }
    AudioSys.stopEngine();
    AudioSys.gameOver();
    setState('over');
  }

  // ---- Update ------------------------------------------------------------------

  function update(dt) {
    game.time += dt;

    var baseSpeed = Redline.scrollSpeedAt(game.distance);
    var targetThrottle = input.brake ? C.brakeMultiplier : 1;
    game.throttle += (targetThrottle - game.throttle) * Math.min(1, dt * 3);
    var targetSpeed = baseSpeed * game.throttle;
    game.speed += (targetSpeed - game.speed) * Math.min(1, dt * 2.5);

    game.distance += game.speed * dt;
    game.score += game.speed * dt * C.scorePerPixel;

    game.fuel = Redline.fuelAfter(game.fuel, dt, game.speed);
    if (game.fuel <= 0) {
      gameOver('You ran out of fuel.');
      return;
    }
    if (game.fuel < C.fuelLowThreshold) {
      game.fuelTimer = Math.min(game.fuelTimer, 2);
    }

    game.invincible = Math.max(0, game.invincible - dt);

    updateSpawns(dt);
    updateCars(dt);
    updatePickups(dt);
    updateFloaters(dt);

    game.shake = Math.max(0, game.shake - dt * 60);
    game.flash = Math.max(0, game.flash - dt * 1.5);

    AudioSys.setEngineSpeed((game.speed - C.minScrollSpeed) / (C.maxScrollSpeed - C.minScrollSpeed));
  }

  function updateSpawns(dt) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnBatch();
      game.spawnTimer = Redline.spawnIntervalAt(game.distance) * rand(0.8, 1.2);
    }

    game.fuelTimer -= dt;
    if (game.fuelTimer <= 0) {
      spawnFuelCan();
      game.fuelTimer = C.fuelPickupEvery * rand(0.7, 1.3);
    }
  }

  function spawnBatch() {
    var lanes = spawner.plan(Redline.groupSizeAt(game.distance, Math.random));
    for (var i = 0; i < lanes.length; i++) {
      game.cars.push({
        x: laneCenterX(lanes[i]) - world.car.w / 2,
        y: -world.car.h - rand(0, 140),
        w: world.car.w,
        h: world.car.h,
        speedFactor: rand(0.5, 1.85),
        passedNearMiss: false,
        color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]
      });
    }
  }

  function spawnFuelCan() {
    var lane = Math.floor(Math.random() * C.lanes);
    var s = 34 * world.scale;
    game.pickups.push({
      x: laneCenterX(lane) - s / 2,
      y: -s,
      w: s,
      h: s * 1.2,
      phase: rand(0, Math.PI * 2)
    });
  }

  function updateCars(dt) {
    var player = world.player;
    var nearMissDist = C.nearMissDistance * world.scale;

    for (var i = game.cars.length - 1; i >= 0; i--) {
      var car = game.cars[i];
      car.y += game.speed * car.speedFactor * dt;

      if (car.y > world.h + car.h * 2) {
        game.cars.splice(i, 1);
        continue;
      }

      // Award a near miss the moment a car first clears the player's row.
      var near = Redline.nearMissed(player, car, nearMissDist);
      if (car.y > player.y + player.h) {
        car.passedNearMiss = true;
      }
      if (near) {
        game.score += C.nearMissScore;
        addFloater(car.x + car.w / 2, car.y + car.h / 2, '+' + C.nearMissScore + ' NEAR MISS', '#7ee787');
        AudioSys.nearMiss();
      }

      if (Redline.collides(player.x, player.y, player.w, player.h, car.x, car.y, car.w, car.h, C.collisionShrink)) {
        if (game.invincible <= 0) {
          game.cars.splice(i, 1);
          onHit();
          return;
        }
        // Overlapped during invulnerability: never reward this car as a near miss.
        car.passedNearMiss = true;
      }
    }
  }

  function updatePickups(dt) {
    var player = world.player;

    for (var i = game.pickups.length - 1; i >= 0; i--) {
      var p = game.pickups[i];
      p.y += game.speed * 0.85 * dt;

      if (p.y > world.h + p.h) {
        game.pickups.splice(i, 1);
        continue;
      }

      if (Redline.collides(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h, 0.7)) {
        game.fuel = Redline.fuelWithPickup(game.fuel);
        game.score += C.fuelPickupScore;
        addFloater(p.x + p.w / 2, p.y, '+FUEL', '#ffd33d');
        AudioSys.pickup();
        game.pickups.splice(i, 1);
      }
    }
  }

  function updateFloaters(dt) {
    for (var i = game.floaters.length - 1; i >= 0; i--) {
      var f = game.floaters[i];
      f.life -= dt;
      f.y -= 42 * dt;
      if (f.life <= 0) {
        game.floaters.splice(i, 1);
      }
    }
  }

  function addFloater(x, y, text, color) {
    game.floaters.push({ x: x, y: y, text: text, color: color, life: 1.1 });
  }

  function onHit() {
    game.lives -= 1;
    game.invincible = C.invincibleTime;
    game.shake = 16;
    game.flash = 0.6;
    AudioSys.collide();
    if (game.lives <= 0) {
      gameOver('You crashed.');
    }
  }

  // ---- Rendering ---------------------------------------------------------------

  function render(dt) {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }

    drawBackground();
    drawScenery();
    drawRoad();
    drawPickups();
    drawCars();
    drawPlayer();
    drawFloaters();

    ctx.restore();

    if (game.flash > 0) {
      ctx.fillStyle = 'rgba(255, 40, 40, ' + (game.flash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, world.w, world.h);
    }

    updateHud();
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, world.h);
    g.addColorStop(0, '#101623');
    g.addColorStop(1, '#0b0e14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.w, world.h);
  }

  function drawScenery() {
    var sideWidth = (world.w - world.roadWidth) / 2;
    ctx.fillStyle = '#0e2a1e';
    ctx.fillRect(0, 0, world.roadLeft, world.h);
    ctx.fillRect(world.roadLeft + world.roadWidth, 0, sideWidth, world.h);

    // Mowing stripes on the verges scroll down with the road.
    var stripe = RENDER.stripeHeight * world.scale;
    var offset = (game.distance * 0.6) % (stripe * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (var y = -stripe + offset; y < world.h + stripe; y += stripe * 2) {
      ctx.fillRect(0, y, world.roadLeft, stripe);
      ctx.fillRect(world.roadLeft + world.roadWidth, y, sideWidth, stripe);
    }

    drawTrees();
  }

  function drawTrees() {
    var spacing = RENDER.treeSpacing * world.scale;
    var treeR = RENDER.treeRadius * world.scale;
    var margin = RENDER.treeMargin * world.scale;
    var first = Math.floor((game.distance - margin) / spacing);
    var count = Math.ceil((world.h + 2 * margin) / spacing) + 2;

    for (var i = 0; i < count; i++) {
      var slot = first + i;
      var y = slot * spacing - game.distance;
      var side = slot % 2 === 0 ? -1 : 1;
      var x = side < 0 ? world.roadLeft - treeR * 3.4 : world.roadLeft + world.roadWidth + treeR * 3.4;
      if (x < -treeR * 2 || x > world.w + treeR * 2) continue;

      ctx.fillStyle = '#3f2c22';
      ctx.fillRect(x - treeR * 0.3, y - treeR * 0.4, treeR * 0.6, treeR * 1.4);
      ctx.fillStyle = '#1f4a33';
      ctx.beginPath();
      ctx.arc(x, y - treeR * 0.8, treeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoad() {
    var left = world.roadLeft;
    var width = world.roadWidth;

    var g = ctx.createLinearGradient(0, 0, 0, world.h);
    g.addColorStop(0, '#2b2f3a');
    g.addColorStop(1, '#1c1f28');
    ctx.fillStyle = g;
    ctx.fillRect(left, 0, width, world.h);

    // Edge lines.
    ctx.fillStyle = '#e8e9ed';
    var edge = Math.max(3, RENDER.edgeLineWidth * world.scale);
    ctx.fillRect(left + edge * 0.5, 0, edge, world.h);
    ctx.fillRect(left + width - edge * 1.5, 0, edge, world.h);

    // Dashed lane separators scroll with the road.
    var dashLen = RENDER.dashLength * world.scale;
    var dashGap = RENDER.dashGap * world.scale;
    var cycle = dashLen + dashGap;
    var scroll = game.distance % cycle;
    ctx.fillStyle = 'rgba(232,233,237,0.75)';
    for (var lane = 1; lane < C.lanes; lane++) {
      var x = left + lane * world.laneWidth;
      for (var y = scroll - cycle; y < world.h; y += cycle) {
        ctx.fillRect(x - 2, y, 4, dashLen);
      }
    }
  }

  function drawCar(x, y, w, h, color, frontUp, isPlayer) {
    var cx = x + w / 2;
    var frontY = y + h / 2;

    ctx.save();
    ctx.translate(cx, frontY);
    // Oncoming traffic faces down-screen (towards the player); everything else
    // faces up-screen (direction of travel).
    if (!frontUp) ctx.rotate(Math.PI);

    // Wheels.
    ctx.fillStyle = '#11151d';
    ctx.fillRect(-w * 0.46, -h * 0.34, w * 0.18, h * 0.16);
    ctx.fillRect(w * 0.28, -h * 0.34, w * 0.18, h * 0.16);
    ctx.fillRect(-w * 0.46, h * 0.18, w * 0.18, h * 0.16);
    ctx.fillRect(w * 0.28, h * 0.18, w * 0.18, h * 0.16);

    // Body.
    var bodyGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bodyGrad.addColorStop(0, lighten(color, 0.25));
    bodyGrad.addColorStop(1, darken(color, 0.25));
    ctx.fillStyle = bodyGrad;
    rect(ctx, -w / 2, -h / 2, w, h, 6 * world.scale);
    ctx.fill();

    // Cabin (windshield + roof).
    ctx.fillStyle = 'rgba(20,24,34,0.9)';
    rect(ctx, -w * 0.3, -h * 0.2, w * 0.6, h * 0.4, 3 * world.scale);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,140,170,0.55)';
    rect(ctx, -w * 0.3, -h * 0.2, w * 0.6, h * 0.12, 2 * world.scale);
    ctx.fill();

    // Lights.
    ctx.fillStyle = isPlayer ? '#cffaff' : '#ffd23d';
    ctx.fillRect(-w * 0.34, -h * 0.46, w * 0.14, h * 0.06);
    ctx.fillRect(w * 0.2, -h * 0.46, w * 0.14, h * 0.06);
    ctx.fillStyle = '#ff4545';
    ctx.fillRect(-w * 0.34, h * 0.4, w * 0.14, h * 0.06);
    ctx.fillRect(w * 0.2, h * 0.4, w * 0.14, h * 0.06);

    // Player spoiler stripe.
    if (isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      rect(ctx, -w * 0.5, h * 0.3, w, h * 0.12, 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function lighten(hex, amt) {
    return shade(hex, amt);
  }
  function darken(hex, amt) {
    return shade(hex, -amt);
  }

  function shade(hex, amt) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var f = function (c) { return clamp(Math.round(c + 255 * amt), 0, 255); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  function drawCars() {
    for (var i = 0; i < game.cars.length; i++) {
      var car = game.cars[i];
      // Oncoming traffic (faster than the road) faces the player; slower
      // same-direction cars face up-screen.
      drawCar(car.x, car.y, car.w, car.h, car.color, car.speedFactor < 1, false);
    }
  }

  function drawPlayer() {
    // Blink while invulnerable.
    if (game.invincible > 0 && Math.floor(game.time * 8) % 2 === 0) {
      return;
    }
    drawCar(world.player.x, world.player.y, world.player.w, world.player.h, PLAYER_COLOR, true, true);
  }

  function drawPickups() {
    for (var i = 0; i < game.pickups.length; i++) {
      var p = game.pickups[i];
      var bob = Math.sin(game.time * 5 + p.phase) * 3;
      var s = p.w;

      ctx.save();
      ctx.translate(p.x + s / 2, p.y + p.h / 2 + bob);

      ctx.fillStyle = 'rgba(255,211,61,0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d0312d';
      rect(ctx, -s * 0.42, -s * 0.32, s * 0.84, s * 0.64, 4);
      ctx.fill();
      ctx.fillStyle = '#ffd33d';
      rect(ctx, -s * 0.3, -s * 0.14, s * 0.6, s * 0.28, 2);
      ctx.fill();
      ctx.fillStyle = '#1c1f28';
      ctx.font = 'bold ' + Math.max(8, s * 0.42) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('F', 0, 0);

      ctx.restore();
    }
  }

  function drawFloaters() {
    ctx.font = 'bold ' + Math.max(11, RENDER.floaterSize * world.scale) + 'px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < game.floaters.length; i++) {
      var f = game.floaters[i];
      var alpha = Math.min(1, f.life);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  var lastLivesShown = -1;

  function updateHud() {
    hudScore.textContent = Redline.formatScore(game.score);
    hudBest.textContent = Redline.formatScore(highScore);
    hudSpeed.textContent = String(Math.round(game.speed * C.speedToKmh));
    hudFuelFill.style.width = (game.fuel / C.fuelMax * 100).toFixed(1) + '%';
    hudFuelLow.classList.toggle('low', game.fuel < C.fuelLowThreshold);
    if (game.lives !== lastLivesShown) {
      lastLivesShown = game.lives;
      hudLives.textContent = '';
      for (var i = 0; i < C.lives; i++) {
        var span = document.createElement('span');
        span.className = 'life' + (i < game.lives ? '' : ' lost');
        hudLives.appendChild(span);
      }
    }
  }

  // ---- Audio -------------------------------------------------------------------

  var AudioSys = (function () {
    var ctx2 = null;
    var master = null;
    var engine = null;
    var muted = Redline.loadFlag(store, C.muteKey, false);

    function masterGain() {
      if (!ctx2) return null;
      if (!master) {
        master = ctx2.createGain();
        master.connect(ctx2.destination);
      }
      master.gain.value = muted ? 0 : 0.8;
      return master;
    }

    function init() {
      if (ctx2) {
        if (ctx2.state === 'suspended') ctx2.resume();
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx2 = new AC();
        masterGain();
      } catch (e) {
        ctx2 = null;
      }
    }

    function noiseBuffer(seconds) {
      var length = Math.max(1, Math.floor(ctx2.sampleRate * seconds));
      var buffer = ctx2.createBuffer(1, length, ctx2.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function playNoise(seconds, type, freq) {
      if (!ctx2) return;
      var src = ctx2.createBufferSource();
      src.buffer = noiseBuffer(seconds);
      var filter = ctx2.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      var gain = ctx2.createGain();
      gain.gain.setValueAtTime(0.5, ctx2.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + seconds);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain());
      src.start();
    }

    function playTone(freq, seconds, type, vol) {
      if (!ctx2) return;
      var osc = ctx2.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      var gain = ctx2.createGain();
      gain.gain.setValueAtTime(vol || 0.2, ctx2.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + seconds);
      osc.connect(gain);
      gain.connect(masterGain());
      osc.start();
      osc.stop(ctx2.currentTime + seconds);
    }

    function startEngine() {
      init();
      if (!ctx2 || engine) return;
      var osc = ctx2.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      var osc2 = ctx2.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 110;
      var filter = ctx2.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      var gain = ctx2.createGain();
      gain.gain.value = 0.05;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain());
      osc.start();
      osc2.start();
      engine = { osc: osc, osc2: osc2, filter: filter };
    }

    function setEngineSpeed(ratio) {
      if (!ctx2 || !engine) return;
      var r = Math.max(0, Math.min(1, ratio));
      engine.osc.frequency.value = 55 + r * 130;
      engine.osc2.frequency.value = 110 + r * 90;
      engine.filter.frequency.value = 250 + r * 600;
    }

    function stopEngine() {
      if (!ctx2 || !engine) return;
      try {
        engine.osc.stop();
        engine.osc2.stop();
      } catch (e) { /* already stopped */ }
      engine = null;
    }

    function setMuted(m) {
      muted = m;
      Redline.saveFlag(store, C.muteKey, m);
      if (master) master.gain.value = m ? 0 : 0.8;
      syncMuteButtons();
    }

    function isMuted() { return muted; }

    function collide() {
      playNoise(0.25, 'lowpass', 700);
      playTone(90, 0.2, 'square', 0.2);
    }

    function pickup() {
      playTone(660, 0.1, 'sine', 0.2);
      setTimeout(function () { playTone(880, 0.12, 'sine', 0.2); }, 70);
    }

    function nearMiss() {
      playNoise(0.15, 'bandpass', 2200);
    }

    function gameOver() {
      var t = [392, 330, 262, 196];
      for (var i = 0; i < t.length; i++) {
        (function (f, d) {
          setTimeout(function () { playTone(f, 0.3, 'sine', 0.18); }, d);
        })(t[i], i * 160);
      }
    }

    return {
      init: init,
      startEngine: startEngine,
      stopEngine: stopEngine,
      setEngineSpeed: setEngineSpeed,
      setMuted: setMuted,
      isMuted: isMuted,
      collide: collide,
      pickup: pickup,
      nearMiss: nearMiss,
      gameOver: gameOver
    };
  })();

  function syncMuteButtons() {
    var muted = AudioSys.isMuted();
    [btnMuteMenu, btnMutePause, btnMuteOver].forEach(function (b) {
      if (b) b.textContent = muted ? 'Sound: Off' : 'Sound: On';
    });
  }

  // ---- Input ----------------------------------------------------------------------

  function keydown(e) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'KeyD': input.right = true; e.preventDefault(); break;
      case 'ArrowDown': case 'KeyS': input.brake = true; e.preventDefault(); break;
      case 'KeyM': AudioSys.init(); AudioSys.setMuted(!AudioSys.isMuted()); break;
      case 'KeyP': case 'Escape': togglePause(); break;
      case 'Enter': case 'Space':
        if (game.state === 'menu' || game.state === 'over') {
          e.preventDefault();
          startGame();
        } else if (game.state === 'paused') {
          togglePause();
        }
        break;
      default: break;
    }
  }

  function keyup(e) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = false; break;
      case 'ArrowRight': case 'KeyD': input.right = false; break;
      case 'ArrowDown': case 'KeyS': input.brake = false; break;
      default: break;
    }
  }

  function bindHold(el, on, off) {
    if (!el) return;
    var active = false;
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      active = true;
      on();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    });
    el.addEventListener('pointerup', function () { active = false; off(); });
    el.addEventListener('pointercancel', function () { active = false; off(); });
    el.addEventListener('pointerleave', function () { if (active) { active = false; off(); } });
  }

  bindHold(steerL, function () { input.left = true; }, function () { input.left = false; });
  bindHold(steerR, function () { input.right = true; }, function () { input.right = false; });
  bindHold(brakeBtn, function () { input.brake = true; }, function () { input.brake = false; });

  // Drag / touch steering directly on the road.
  (function () {
    var dragging = false;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      steerByPointer(e.clientX);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (dragging) steerByPointer(e.clientX);
    });
    window.addEventListener('pointerup', function () {
      dragging = false;
      input.left = false;
      input.right = false;
    });
    window.addEventListener('pointercancel', function () { dragging = false; });
  })();

  function steerByPointer(x) {
    var pcx = world.player.x + world.player.w / 2;
    if (x < pcx - 14) {
      input.left = true;
      input.right = false;
    } else if (x > pcx + 14) {
      input.right = true;
      input.left = false;
    } else {
      input.left = false;
      input.right = false;
    }
  }

  function handleSteer(dt) {
    var speed = world.player.w * RENDER.steerCarWidthsPerSec;
    if (input.left) world.player.x -= speed * dt;
    if (input.right) world.player.x += speed * dt;
    clampPlayer();
  }

  // ---- Buttons ---------------------------------------------------------------------

  btnStart.addEventListener('click', startGame);
  btnResume.addEventListener('click', togglePause);
  btnPauseQuit.addEventListener('click', function () { AudioSys.stopEngine(); setState('menu'); });
  btnOverRestart.addEventListener('click', startGame);
  btnOverQuit.addEventListener('click', function () { setState('menu'); });
  btnMuteMenu.addEventListener('click', function () { AudioSys.init(); AudioSys.setMuted(!AudioSys.isMuted()); });
  btnMutePause.addEventListener('click', function () { AudioSys.init(); AudioSys.setMuted(!AudioSys.isMuted()); });
  btnMuteOver.addEventListener('click', function () { AudioSys.init(); AudioSys.setMuted(!AudioSys.isMuted()); });

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('resize', recomputeWorld);
  window.addEventListener('blur', function () { if (game.state === 'playing') togglePause(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && game.state === 'playing') togglePause();
  });

  // ---- Main loop ---------------------------------------------------------------------

  function loop(ts) {
    if (!game.lastTime) game.lastTime = ts;
    var dt = Math.min((ts - game.lastTime) / 1000, 0.05);
    game.lastTime = ts;

    if (game.state === 'playing') {
      handleSteer(dt);
      update(dt);
    }

    render(dt);
    requestAnimationFrame(loop);
  }

  // ---- Boot ----------------------------------------------------------------------------

  recomputeWorld();
  syncMuteButtons();
  setState('menu');

  // Opt-in debug/test hook: /rush/?debug exposes live state so automated
  // smoke tests can drive the game deterministically.
  if (/[?&]debug=/.test(window.location.search)) {
    window.RedlineRush = { game: game, world: world };
  }

  requestAnimationFrame(loop);
})();
