const std = @import("std");
const Vec2 = @import("vec.zig").Vec2;
const Rng = @import("rng.zig").Rng;
const Entity = @import("entity.zig").Entity;
const Pool = @import("entity.zig").Pool;
const level_mod = @import("level.zig");
const Level = level_mod.Level;
const Wave = level_mod.Wave;
const Boss = level_mod.Boss;
const Pattern = level_mod.Pattern;
const PowerKind = level_mod.PowerKind;

pub const arena_w = 480;
pub const arena_h = 600;

/// Compact player input snapshot, produced by the platform layer and consumed
/// by the deterministic core. Movement is normalized so diagonal speed is not
/// boosted.
pub const Input = struct {
    left: bool = false,
    right: bool = false,
    up: bool = false,
    down: bool = false,
    fire: bool = false,
    bomb: bool = false,

    pub fn axis(self: *const Input) Vec2 {
        var x: f32 = 0;
        var y: f32 = 0;
        if (self.left) x -= 1;
        if (self.right) x += 1;
        if (self.up) y -= 1;
        if (self.down) y += 1;
        if (x != 0 and y != 0) {
            const inv = 1.0 / @sqrt(2.0);
            x *= inv;
            y *= inv;
        }
        return .{ .x = x, .y = y };
    }
};

pub const GameState = enum { running, won, lost };

/// The complete, deterministic game simulation. Rendered via a `View` into
/// the entity pool; nothing here touches SDL or the allocator during a step.
pub const Game = struct {
    pool: Pool = undefined,
    rng: Rng,
    level: *const Level,
    time: f32 = 0,
    state: GameState = .running,
    score: u32 = 0,
    lives: u32 = 0,
    /// Remaining seconds before the player can fire again.
    fire_cooldown: f32 = 0,
    /// Wave index currently being spawned (index into level.waves).
    wave_idx: usize = 0,
    /// Remaining seconds before the next individual enemy in a wave spawns.
    spawn_timer: f32 = 0,
    /// Remaining seconds before the next boss spawns.
    boss_timer: f32 = 0,
    boss_idx: usize = 0,
    /// Number of enemies still alive this wave, for "wave cleared" logic.
    wave_remaining: usize = 0,
    /// Set when the final boss has been defeated and the field is empty.
    level_done: bool = false,
    /// Index of the next power-up drop to spawn (into level.powerups).
    powerup_idx: usize = 0,
    /// Player weapon tier: 1 = single, 2 = twin, 3 = triple spread.
    /// Reset to 1 whenever the player dies.
    player_fire_level: u32 = 1,
    /// Entities to render as text: "{points}".
    /// Player's paused/explosion flash state.
    player_dead: bool = false,
    respawn_timer: f32 = 0,
    /// Player speed, from the level.
    player_speed: f32 = 260,
    /// Player fire rate (shots/sec).
    player_fire_rate: f32 = 0.16,
    /// Bookkeeping for "player hit this frame" to let audio/react visually.
    player_just_hit: bool = false,
    /// Consecutive kills without taking a hit; drives the combo multiplier.
    combo: u32 = 0,
    /// Whether the player carries a shield that absorbs one hit.
    has_shield: bool = false,
    /// Score at which the next bonus life is awarded (0 = disabled).
    next_life_at: u32 = 0,
    /// Set when the player collects a power-up drop this step.
    pickup_just_taken: bool = false,
    /// Set when a shield absorbed a hit this step.
    shield_broke: bool = false,
    /// Set when a bonus life was awarded this step.
    extra_life_just_awarded: bool = false,
    /// Remaining smart bombs.
    bombs: u32 = 0,
    /// Set when a bomb detonated this step (audio/vfx hook).
    bomb_just_fired: bool = false,
    /// Seconds of invulnerability remaining after a respawn.
    invuln_timer: f32 = 0,
    /// Seconds of white screen flash after a bomb detonation.
    bomb_flash: f32 = 0,
    /// Enemy bullets that passed within the graze band without hitting.
    graze: u32 = 0,
    /// Set when a bullet scored a graze this step (audio/vfx hook).
    graze_just_happened: bool = false,

    /// Width of the near-miss band around the player, in pixels.
    pub const graze_band: f32 = 5;
    /// Points awarded per grazed bullet.
    pub const graze_points: u32 = 50;

    pub fn init(level: *const Level, seed: u64) Game {
        var g = Game{
            .rng = .{ .state = seed },
            .level = level,
        };
        g.pool.init();
        g.lives = level.lives;
        g.player_speed = level.player_speed;
        g.player_fire_rate = level.player_fire_rate;
        g.next_life_at = level.life_every;
        g.bombs = level.bombs;
        g.spawnPlayer();
        g.boss_timer = if (level.bosses.items.len > 0) level.bosses.items[0].at else std.math.inf(f32);
        return g;
    }

    /// Resets per-run state, keeping the level. Used for replays/headless.
    pub fn reset(self: *Game, seed: u64) void {
        self.* = Game.init(self.level, seed);
    }

    pub fn player(self: *Game) ?*Entity {
        for (&self.pool.entities) |*e| {
            if (e.alive and e.kind == .player) return e;
        }
        return null;
    }

    fn spawnPlayer(self: *Game) void {
        const p = self.pool.spawn() orelse return;
        p.* = .{
            .kind = .player,
            .alive = true,
            .pos = .{ .x = arena_w / 2, .y = arena_h - 48 },
            .vel = .zero,
            .radius = 10,
            .hp = 1,
            .color = 0x4FC1A0,
        };
    }

    /// Advances the simulation by `dt` seconds. Fully deterministic for a
    /// given seed and input stream. Returns a list of events for audio/vfx
    /// (see Event).
    pub fn step(self: *Game, dt: f32, input: *const Input) void {
        self.time += dt;
        self.player_just_hit = false;
        self.pickup_just_taken = false;
        self.shield_broke = false;
        self.extra_life_just_awarded = false;
        self.bomb_just_fired = false;
        self.graze_just_happened = false;
        if (self.bomb_flash > 0) self.bomb_flash -= dt;

        if (self.state == .lost or self.state == .won) {
            // Still let particles tick so death/powerup effects finish.
            self.updateParticles(dt);
            return;
        }

        if (self.player_dead) {
            self.respawn_timer -= dt;
            self.updateParticles(dt);
            if (self.respawn_timer <= 0) {
                if (self.lives > 0) {
                    self.lives -= 1;
                    self.spawnPlayer();
                    self.player_dead = false;
                    // Brief invulnerability so a fresh spawn is not instantly
                    // killed by a bullet crossing the spawn point.
                    self.invuln_timer = 2.0;
                } else {
                    self.state = .lost;
                }
            }
            return;
        }

        if (self.invuln_timer > 0) self.invuln_timer = @max(0, self.invuln_timer - dt);

        self.updatePlayer(dt, input);
        if (input.bomb) self.detonateBomb();
        self.updateWaves(dt);
        self.updateBosses(dt);
        self.updatePowerups(dt);
        self.updateEnemies(dt);
        self.updateBullets(dt);
        self.updateCollisions();
        self.updateParticles(dt);
        _ = self.pool.cull();
        self.checkLevelEnd();
    }

    fn updatePlayer(self: *Game, dt: f32, input: *const Input) void {
        const p = self.player() orelse return;
        const axis = input.axis();
        p.vel = axis.scale(self.player_speed);
        p.pos = p.pos.add(p.vel.scale(dt)).clamp(0, 0, @as(f32, @floatFromInt(arena_w)), @as(f32, @floatFromInt(arena_h)));

        // Thruster trail: a tiny drifting ember behind the ship, emitted on
        // alternating frames with a deterministic time-based jitter so it does
        // not consume the RNG stream (keeping gameplay outcomes unchanged).
        if (@mod(self.time, 0.03) < dt) {
            const part = self.pool.spawn() orelse return;
            part.* = .{
                .kind = .particle,
                .alive = true,
                .pos = .{ .x = p.pos.x + @sin(self.time * 40.0) * 2.0, .y = p.pos.y + p.radius + 2 },
                .vel = .{ .x = 0, .y = 60 },
                .radius = 0,
                .hp = 1,
                .ttl = 0.22,
                .color = 0x7AA2F7,
            };
        }

        self.fire_cooldown -= dt;
        if (input.fire and self.fire_cooldown <= 0) {
            self.fire_cooldown = self.player_fire_rate;
            self.firePlayer(p);
        }
    }

    fn firePlayer(self: *Game, p: *const Entity) void {
        const speed: f32 = 520;
        const y = p.pos.y - 10;
        switch (self.player_fire_level) {
            1 => self.spawnBullet(.{ .x = p.pos.x, .y = y }, .{ .x = 0, .y = -1 }, speed, 0x7AA2F7),
            2 => {
                self.spawnBullet(.{ .x = p.pos.x - 6, .y = y }, .{ .x = 0, .y = -1 }, speed, 0x7AA2F7);
                self.spawnBullet(.{ .x = p.pos.x + 6, .y = y }, .{ .x = 0, .y = -1 }, speed, 0x7AA2F7);
            },
            else => {
                // Triple spread: straight plus two canted shots.
                self.spawnBullet(.{ .x = p.pos.x, .y = y }, .{ .x = 0, .y = -1 }, speed, 0x7AA2F7);
                self.spawnBullet(.{ .x = p.pos.x - 5, .y = y }, .{ .x = -1, .y = -1 }, speed, 0x7AA2F7);
                self.spawnBullet(.{ .x = p.pos.x + 5, .y = y }, .{ .x = 1, .y = -1 }, speed, 0x7AA2F7);
            },
        }
    }

    fn spawnBullet(self: *Game, origin: Vec2, dir: Vec2, speed: f32, color: u32) void {
        const b = self.pool.spawn() orelse return;
        b.* = .{
            .kind = .bullet,
            .alive = true,
            .pos = origin,
            .vel = dir.normalized().scale(speed),
            .radius = 3,
            .hp = 1,
            .ttl = 3,
            .color = color,
        };
    }

    fn spawnEBullet(self: *Game, origin: Vec2, dir: Vec2, speed: f32) void {
        const b = self.pool.spawn() orelse return;
        b.* = .{
            .kind = .ebullet,
            .alive = true,
            .pos = origin,
            .vel = dir.normalized().scale(speed),
            .radius = 3,
            .hp = 1,
            .ttl = 6,
            .color = 0xFF6B57,
        };
    }

    fn updateWaves(self: *Game, dt: f32) void {
        while (self.wave_idx < self.level.waves.items.len) {
            const w = &self.level.waves.items[self.wave_idx];
            if (self.time < w.at) break;
            // Wave is active: spawn its enemies one at a time.
            if (self.wave_remaining == 0) {
                // Begin spawning.
                self.wave_remaining = w.count;
                self.spawn_timer = 0;
            }
            if (self.wave_remaining > 0) {
                self.spawn_timer -= dt;
                while (self.spawn_timer <= 0 and self.wave_remaining > 0) {
                    self.spawnEnemy(w);
                    self.wave_remaining -= 1;
                    self.spawn_timer += w.interval;
                }
            }
            if (self.wave_remaining == 0) {
                self.wave_idx += 1;
                continue;
            }
            break;
        }
    }

    fn spawnEnemy(self: *Game, w: *const Wave) void {
        const def = self.level.enemyDef(w.kind) orelse return;
        const e = self.pool.spawn() orelse return;
        const x = self.rng.range(30, @as(f32, @floatFromInt(arena_w)) - 30);
        e.* = .{
            .kind = .enemy,
            .alive = true,
            .pos = .{ .x = x, .y = -20 },
            .vel = .{ .x = 0, .y = def.speed },
            .radius = def.radius,
            .hp = def.hp,
            .max_hp = def.hp,
            .fire_rate = def.fire_rate,
            .points = def.points,
            .shots = def.shots,
            .spread = def.spread,
            .armed = w.armed,
            .data = @intFromEnum(w.pattern),
            .color = def.color,
        };
    }

    fn updateBosses(self: *Game, dt: f32) void {
        _ = dt;
        if (self.boss_idx < self.level.bosses.items.len) {
            const b = &self.level.bosses.items[self.boss_idx];
            if (self.time >= b.at) {
                self.spawnBoss(b);
                self.boss_idx += 1;
                self.boss_timer = if (self.boss_idx < self.level.bosses.items.len)
                    self.level.bosses.items[self.boss_idx].at
                else
                    std.math.inf(f32);
            }
        }
    }

    fn spawnBoss(self: *Game, b: *const Boss) void {
        const e = self.pool.spawn() orelse return;
        e.* = .{
            .kind = .enemy,
            .alive = true,
            .pos = .{ .x = arena_w / 2, .y = -30 },
            .vel = .{ .x = 0, .y = b.speed },
            .radius = b.radius,
            .hp = b.hp,
            .max_hp = b.hp,
            .fire_rate = b.fire_rate,
            .points = b.points,
            .shots = b.shots,
            .spread = b.spread,
            .armed = true,
            .data = @intFromEnum(Pattern.orbit),
            .color = b.color,
        };
    }

    fn updatePowerups(self: *Game, dt: f32) void {
        if (self.powerup_idx < self.level.powerups.items.len) {
            const ps = &self.level.powerups.items[self.powerup_idx];
            if (self.time >= ps.at) {
                self.spawnPowerup(ps.kind);
                self.powerup_idx += 1;
            }
        }
        for (&self.pool.entities) |*e| {
            if (!e.alive or e.kind != .powerup) continue;
            e.pos = e.pos.add(e.vel.scale(dt));
            // Missed drops drift off the bottom of the arena.
            if (e.pos.y > arena_h + 30) {
                e.ttl = 0;
                continue;
            }
            const p = self.player() orelse continue;
            if (Entity.isColliding(p, e)) {
                e.ttl = 0;
                self.applyPowerup(e);
                self.pickup_just_taken = true;
                self.spawnBurst(e.pos, e.color);
            }
        }
    }

    fn spawnPowerup(self: *Game, kind: PowerKind) void {
        const e = self.pool.spawn() orelse return;
        const x = self.rng.range(40, @as(f32, @floatFromInt(arena_w)) - 40);
        const color: u32 = switch (kind) {
            .spread => 0xBB9AF7,
            .shield => 0x4FD6D6,
        };
        e.* = .{
            .kind = .powerup,
            .alive = true,
            .pos = .{ .x = x, .y = -16 },
            .vel = .{ .x = 0, .y = 90 },
            .radius = 8,
            .hp = 1,
            .ttl = 20,
            .color = color,
            .data = @intFromEnum(kind),
        };
    }

    /// Applies what a picked-up drop grants. `spread` raises the fire tier;
    /// `shield` equips a one-hit shield (refreshing an existing one).
    fn applyPowerup(self: *Game, e: *const Entity) void {
        const kind: PowerKind = @enumFromInt(e.data);
        switch (kind) {
            .spread => self.upgradePlayerFire(),
            .shield => self.has_shield = true,
        }
    }

    fn upgradePlayerFire(self: *Game) void {
        self.player_fire_level = @min(self.player_fire_level + 1, 3);
    }

    fn updateEnemies(self: *Game, dt: f32) void {
        for (&self.pool.entities) |*e| {
            if (!e.alive or e.kind != .enemy) continue;
            const pattern: Pattern = @enumFromInt(e.data);
            self.applyPattern(e, pattern, dt);
            // Enemies that slip past the player fly off-screen; despawn them
            // so the level can still be cleared.
            if (e.pos.y > arena_h + 40) {
                self.pool.kill(e);
                continue;
            }
            if (e.armed and self.rng.nextF32() < dt * self.fireRateFor(e)) {
                self.enemyFire(e);
            }
        }
    }

    fn fireRateFor(self: *const Game, e: *const Entity) f32 {
        _ = self;
        return e.fire_rate;
    }

    fn applyPattern(self: *Game, e: *Entity, pattern: Pattern, dt: f32) void {
        const fall_speed = e.vel.y;
        switch (pattern) {
            .sine => {
                // Drift down while oscillating horizontally.
                e.vel.x = @sin(self.time * 3.0 + e.pos.y * 0.02) * 120;
                e.pos = e.pos.add(e.vel.scale(dt));
            },
            .zigzag => {
                e.vel.x = if (@mod(e.pos.y, 80) < 40) 140 else -140;
                e.pos = e.pos.add(e.vel.scale(dt));
            },
            .swoop => {
                // Arc across the screen in a smooth curve.
                e.vel.x = @sin(e.pos.y * 0.01) * 300;
                e.pos = e.pos.add(e.vel.scale(dt));
            },
            .drift => {
                e.vel.x = @sin(e.pos.y * 0.015) * 60;
                e.pos = e.pos.add(e.vel.scale(dt));
            },
            .orbit => {
                // Boss: sweep side to side near the top, hold altitude.
                e.vel.x = @sin(self.time * 1.2) * 160;
                e.pos = e.pos.add(e.vel.scale(dt));
                if (e.pos.y > 70) {
                    e.pos.y = 70;
                }
            },
            .spiral => {
                const ang = self.time * 4.0 + e.pos.y * 0.02;
                e.vel.x = @cos(ang) * 200;
                e.vel.y = @sin(ang) * 40 + fall_speed * 0.3;
                e.pos = e.pos.add(e.vel.scale(dt));
            },
            .none => {
                e.pos = e.pos.add(e.vel.scale(dt));
            },
        }
    }

    fn enemyFire(self: *Game, e: *const Entity) void {
        const p = self.player() orelse return;
        const base = p.pos.sub(e.pos).normalized();
        const shots = @max(e.shots, 1);
        if (shots == 1) {
            self.spawnEBullet(e.pos, base, 200);
            return;
        }
        // Fan volley: `shots` bullets spread across `spread` radians, centered
        // on the direction to the player.
        const start = -e.spread / 2.0;
        var i: u32 = 0;
        while (i < shots) : (i += 1) {
            const t = @as(f32, @floatFromInt(i)) / @as(f32, @floatFromInt(shots - 1));
            const ang = start + e.spread * t;
            self.spawnEBullet(e.pos, base.rotate(ang), 200);
        }
    }

    fn updateBullets(self: *Game, dt: f32) void {
        for (&self.pool.entities) |*e| {
            if (!e.alive) continue;
            if (e.kind != .bullet and e.kind != .ebullet) continue;
            e.pos = e.pos.add(e.vel.scale(dt));
            if (e.pos.y < -20 or e.pos.y > arena_h + 20 or
                e.pos.x < -20 or e.pos.x > arena_w + 20)
            {
                e.ttl = 0;
            }
        }
    }

    fn updateCollisions(self: *Game) void {
        const p = self.player() orelse return;

        // Player bullets vs enemies.
        for (&self.pool.entities) |*e| {
            if (!e.alive or e.kind != .enemy) continue;
            for (&self.pool.entities) |*b| {
                if (!b.alive or b.kind != .bullet) continue;
                if (Entity.isColliding(e, b)) {
                    b.ttl = 0;
                    e.hp -= 1;
                    if (e.hp <= 0) {
                        self.killEnemy(e);
                    } else {
                        self.spawnBurst(e.pos, 0x888888);
                    }
                }
            }
        }

        // Enemy bullets vs player. A bullet that misses by a hair grazes:
        // it scores small points once, rewarding close dodging (the classic
        // bullet-hell risk/reward). Only bullets, never particles.
        if (self.invuln_timer <= 0) {
            for (&self.pool.entities) |*b| {
                if (!b.alive or b.kind != .ebullet) continue;
                if (Entity.isColliding(p, b)) {
                    b.ttl = 0;
                    self.damagePlayer(p);
                } else if (!b.grazed) {
                    const dist = p.pos.sub(b.pos).length();
                    const hit_dist = p.radius + b.radius;
                    if (dist < hit_dist + Game.graze_band) {
                        self.grazeBullet(b);
                    }
                }
            }
        }

        // Enemies vs player (body contact).
        if (self.invuln_timer <= 0) {
            for (&self.pool.entities) |*e| {
                if (!e.alive or e.kind != .enemy) continue;
                if (Entity.isColliding(p, e)) {
                    e.ttl = 0;
                    self.damagePlayer(p);
                    break;
                }
            }
        }
    }

    /// Scores a graze: a bullet that passed within the near-miss band without
    /// hitting. Awards points scaled by the combo multiplier (a long clean run
    /// makes dodging pay), and marks the bullet so it only grazes once.
    fn grazeBullet(self: *Game, b: *Entity) void {
        b.grazed = true;
        self.graze += 1;
        self.graze_just_happened = true;
        const gained = Game.graze_points * self.comboMult();
        self.score += gained;
        self.spawnScoreText(b.pos, gained);
        self.spawnBurst(b.pos, 0x4FD6D6);
    }

    /// Applies a hit to the player. A shield absorbs it; otherwise the player
    /// takes the full death. Either way the combo resets.
    fn damagePlayer(self: *Game, p: *Entity) void {
        self.combo = 0;
        if (self.has_shield) {
            self.has_shield = false;
            self.shield_broke = true;
            self.player_just_hit = true;
            self.spawnBurst(p.pos, 0x4FD6D6);
            return;
        }
        self.hitPlayer(p);
    }

    fn hitPlayer(self: *Game, p: *Entity) void {
        p.ttl = 0;
        self.player_dead = true;
        self.respawn_timer = 1.2;
        self.player_just_hit = true;
        self.combo = 0;
        self.has_shield = false;
        // Death costs the current weapon tier; classic arcade reset.
        self.player_fire_level = 1;
        self.spawnBurst(p.pos, 0xFFFFFF);
    }

    fn pointsFor(self: *const Game, e: *const Entity) u32 {
        _ = self;
        return e.points;
    }

    /// Shared enemy-destruction path: bumps the combo, awards points (scaled by
    /// the combo multiplier), spawns a burst and floating score, and may grant
    /// a bonus life. Used by bullet kills and bomb kills alike.
    fn killEnemy(self: *Game, e: *Entity) void {
        self.combo += 1;
        const gained = self.pointsFor(e) * self.comboMult();
        self.score += gained;
        self.spawnBurst(e.pos, e.color);
        e.ttl = 0;
        self.spawnScoreText(e.pos, gained);
        self.awardBonusLife();
    }

    /// Detonates a smart bomb: clears every enemy bullet on screen and deals
    /// heavy damage to every enemy. Costs one bomb; the level's `bombs` count
    /// gates how often this can be used.
    fn detonateBomb(self: *Game) void {
        if (self.bombs == 0) return;
        if (self.state != .running or self.player_dead) return;
        self.bombs -= 1;
        self.bomb_just_fired = true;
        self.bomb_flash = 0.25;

        // Clear enemy bullets on screen.
        for (&self.pool.entities) |*b| {
            if (!b.alive or b.kind != .ebullet) continue;
            b.ttl = 0;
        }

        // Damage every enemy; survivors take a stun burst, kills score.
        for (&self.pool.entities) |*e| {
            if (!e.alive or e.kind != .enemy) continue;
            e.hp -= 2;
            self.spawnBurst(e.pos, 0xFFFFFF);
            if (e.hp <= 0) {
                self.killEnemy(e);
            } else {
                self.spawnBurst(e.pos, 0x888888);
            }
        }
    }

    /// Combo multiplier: x1 base, +1 every 5 consecutive kills, capped at x4.
    pub fn comboMult(self: *const Game) u32 {
        const extra: u32 = @min(self.combo / 5, @as(u32, 3));
        return 1 + extra;
    }

    /// Awards a bonus life each time the score crosses a multiple of the
    /// level's `life_every` threshold (skipped when the level disables it).
    fn awardBonusLife(self: *Game) void {
        if (self.next_life_at == 0) return;
        while (self.score >= self.next_life_at) {
            self.lives += 1;
            self.next_life_at += self.level.life_every;
            self.extra_life_just_awarded = true;
        }
    }

    fn spawnBurst(self: *Game, pos: Vec2, color: u32) void {
        var i: usize = 0;
        while (i < 12) : (i += 1) {
            const part = self.pool.spawn() orelse return;
            const dir = self.rng.onUnitCircle();
            part.* = .{
                .kind = .particle,
                .alive = true,
                .pos = pos,
                .vel = dir.scale(self.rng.range(40, 180)),
                .radius = 0,
                .hp = 1,
                .ttl = self.rng.range(0.3, 0.8),
                .color = color,
            };
        }
    }

    fn spawnScoreText(self: *Game, pos: Vec2, points: u32) void {
        const t = self.pool.spawn() orelse return;
        t.* = .{
            .kind = .text,
            .alive = true,
            .pos = pos,
            .vel = .{ .x = 0, .y = -40 },
            .radius = 0,
            .hp = 1,
            .ttl = 0.8,
            .color = 0xFFFFFF,
            .data = points,
        };
    }

    fn updateParticles(self: *Game, dt: f32) void {
        for (&self.pool.entities) |*e| {
            if (!e.alive) continue;
            if (e.kind == .particle or e.kind == .text) {
                e.pos = e.pos.add(e.vel.scale(dt));
                e.ttl -= dt;
                if (e.kind == .particle) {
                    e.vel = e.vel.scale(1.0 - dt * 3.0);
                }
            }
        }
    }

    fn checkLevelEnd(self: *Game) void {
        if (self.state != .running) return;
        const all_waves_spawned = self.wave_idx >= self.level.waves.items.len;
        const all_bosses_spawned = self.boss_idx >= self.level.bosses.items.len;
        if (all_waves_spawned and all_bosses_spawned and self.pool.countByKind(.enemy) == 0) {
            self.state = .won;
        }
    }

    /// True when the player is alive and the game is running (renderer help).
    pub fn isPlayerAlive(self: *const Game) bool {
        return self.player() != null;
    }
};

test "game starts with a player and 3 lives" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 1);
    try std.testing.expectEqual(@as(u32, 3), g.lives);
    try std.testing.expect(g.player() != null);
    try std.testing.expectEqual(GameState.running, g.state);
}

test "firing spawns a bullet" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 1);
    var input = Input{ .fire = true };
    var n: usize = 0;
    while (n < 5) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expect(g.pool.countByKind(.bullet) >= 1);
}

test "player movement clamped to arena" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 1);
    var input = Input{ .left = true, .up = true };
    var n: usize = 0;
    while (n < 120) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    const p = g.player().?;
    try std.testing.expect(p.pos.x >= 0);
    try std.testing.expect(p.pos.y >= 0);
}

test "deterministic across identical seeds" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 4 pattern drift }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());

    var a = Game.init(&level, 999);
    var b = Game.init(&level, 999);
    var input = Input{ .fire = true };
    var n: usize = 0;
    while (n < 1200) : (n += 1) {
        a.step(1.0 / 60.0, &input);
        b.step(1.0 / 60.0, &input);
    }
    try std.testing.expectEqual(a.score, b.score);
    try std.testing.expectEqual(a.state, b.state);
    try std.testing.expectEqual(a.time, b.time);
    try std.testing.expectEqual(a.pool.live, b.pool.live);
}

test "winning level triggers won state" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 points 10 }
        \\wave { at 0 kind bug count 2 interval 0.01 pattern drift armed false }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 5);
    // Fire a lot: quickly kill the two weak enemies.
    var input = Input{ .fire = true };
    var n: usize = 0;
    while (n < 60 * 20 and g.state == .running) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expectEqual(GameState.won, g.state);
    try std.testing.expect(g.score > 0);
}

test "enemy kills award points" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 points 10 }
        \\wave { at 0 kind bug count 1 pattern drift armed false }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 5);
    var input = Input{ .fire = true };
    // Step until the enemy has been dealt with (killed or despawned).
    var n: usize = 0;
    var seen_enemy = false;
    while (n < 60 * 30) : (n += 1) {
        g.step(1.0 / 60.0, &input);
        if (g.pool.countByKind(.enemy) > 0) seen_enemy = true;
        if (seen_enemy and g.pool.countByKind(.enemy) == 0) break;
    }
    try std.testing.expectEqual(@as(usize, 0), g.pool.countByKind(.enemy));
    try std.testing.expect(g.score > 0);
}

test "headless 60s run stays bounded" {
    const src =
        \\name "T"
        \\player { lives 5 }
        \\enemy bug { hp 1 }
        \\enemy dart { hp 2 speed 160 points 250 radius 9 fire_rate 1.2 }
        \\wave { at 0 kind bug count 6 interval 0.4 pattern sine }
        \\wave { at 5 kind dart count 8 interval 0.25 pattern zigzag }
        \\boss { at 20 kind dart hp 40 speed 30 points 5000 fire_rate 1.5 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 42);
    var input = Input{ .fire = true };
    var n: usize = 0;
    while (n < 60 * 60) : (n += 1) {
        g.step(1.0 / 60.0, &input);
        try std.testing.expect(g.pool.live <= Pool.capacity);
    }
    // Game must have reached a terminal state or still be running, never crash.
    try std.testing.expect(g.state == .running or g.state == .won or g.state == .lost);
}

test "player death with no lives loses the game" {
    const src =
        \\name "T"
        \\player { lives 1 }
        \\enemy bug { hp 1 fire_rate 0.5 }
        \\wave { at 0 kind bug count 3 pattern orbit armed true }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 7);
    var input = Input{};
    var n: usize = 0;
    while (n < 60 * 60 and g.state == .running) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expectEqual(GameState.lost, g.state);
}

test "input axis normalization prevents diagonal boost" {
    var input = Input{ .left = true, .up = true };
    const axis = input.axis();
    try std.testing.expectApproxEqAbs(@as(f32, 1), axis.length(), 1e-4);
    var straight = Input{ .right = true };
    try std.testing.expectEqual(@as(f32, 1), straight.axis().x);
}

test "wave enemies inherit fire rate and points from the level def" {
    const src =
        \\name "T"
        \\enemy dart { hp 2 speed 160 points 250 radius 9 fire_rate 1.2 }
        \\wave { at 0 kind dart count 1 interval 0.01 pattern drift armed true }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 7);
    var input = Input{};
    g.step(1.0 / 60.0, &input);
    var checked: usize = 0;
    for (&g.pool.entities) |*e| {
        if (!e.alive or e.kind != .enemy) continue;
        checked += 1;
        try std.testing.expectApproxEqAbs(@as(f32, 1.2), e.fire_rate, 1e-4);
        try std.testing.expectEqual(@as(u32, 250), e.points);
    }
    try std.testing.expectEqual(@as(usize, 1), checked);
}

test "bosses inherit fire rate and points from the boss def" {
    const src =
        \\name "T"
        \\enemy tank { hp 4 speed 60 points 500 radius 12 fire_rate 0.35 }
        \\boss { at 1 kind tank hp 80 speed 40 points 5000 radius 24 fire_rate 0.8 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    var input = Input{};
    var n: usize = 0;
    while (g.boss_idx == 0 and n < 60 * 60) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expect(g.boss_idx == 1);
    var checked: usize = 0;
    for (&g.pool.entities) |*e| {
        if (!e.alive or e.kind != .enemy) continue;
        checked += 1;
        try std.testing.expectApproxEqAbs(@as(f32, 0.8), e.fire_rate, 1e-4);
        try std.testing.expectEqual(@as(u32, 5000), e.points);
    }
    try std.testing.expectEqual(@as(usize, 1), checked);
}

test "picking up a power-up upgrades the player's fire level" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 9999 kind bug count 1 }
        \\powerup { at 0 kind spread }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expectEqual(@as(u32, 1), g.player_fire_level);
    var input = Input{};
    var n: usize = 0;
    while (n < 60 * 10 and g.player_fire_level == 1) : (n += 1) {
        // Steer the player under the falling power-up.
        var target_x: f32 = arena_w / 2;
        for (&g.pool.entities) |*e| {
            if (e.alive and e.kind == .powerup) target_x = e.pos.x;
        }
        const p = g.player().?;
        input.left = p.pos.x > target_x + 2;
        input.right = p.pos.x < target_x - 2;
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expectEqual(@as(u32, 2), g.player_fire_level);
}

test "fire level three fires a three-way spread" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.player_fire_level = 3;
    var input = Input{ .fire = true };
    var n: usize = 0;
    while (n < 5) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    try std.testing.expectEqual(@as(usize, 3), g.pool.countByKind(.bullet));
}

test "player death resets the fire level" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.player_fire_level = 3;
    g.hitPlayer(g.player().?);
    try std.testing.expectEqual(@as(u32, 1), g.player_fire_level);
}

test "enemy shot volleys fire the configured number of bullets" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expect(g.player() != null);

    const regular = g.pool.spawn().?;
    regular.* = .{
        .kind = .enemy,
        .alive = true,
        .pos = .{ .x = 100, .y = 100 },
        .radius = 8,
        .hp = 1,
    };
    g.enemyFire(regular);
    try std.testing.expectEqual(@as(usize, 1), g.pool.countByKind(.ebullet));

    const boss = g.pool.spawn().?;
    boss.* = .{
        .kind = .enemy,
        .alive = true,
        .pos = .{ .x = 200, .y = 80 },
        .radius = 24,
        .hp = 10,
        .shots = 3,
        .spread = 0.8,
    };
    g.enemyFire(boss);
    try std.testing.expectEqual(@as(usize, 4), g.pool.countByKind(.ebullet));
}

test "combo multiplier scales with consecutive kills" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.combo = 0;
    try std.testing.expectEqual(@as(u32, 1), g.comboMult());
    g.combo = 4;
    try std.testing.expectEqual(@as(u32, 1), g.comboMult());
    g.combo = 5;
    try std.testing.expectEqual(@as(u32, 2), g.comboMult());
    g.combo = 10;
    try std.testing.expectEqual(@as(u32, 3), g.comboMult());
    g.combo = 20;
    try std.testing.expectEqual(@as(u32, 4), g.comboMult());
}

test "shield power-up grants the player a shield" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\powerup { at 0 kind shield }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    const pu = g.pool.spawn().?;
    pu.* = .{
        .kind = .powerup,
        .alive = true,
        .pos = .{ .x = 0, .y = 0 },
        .data = @intFromEnum(PowerKind.shield),
    };
    try std.testing.expect(!g.has_shield);
    g.applyPowerup(pu);
    try std.testing.expect(g.has_shield);
}

test "shield absorbs a hit without costing a life" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.has_shield = true;
    g.combo = 8;
    const lives_before = g.lives;
    g.damagePlayer(g.player().?);
    try std.testing.expectEqual(lives_before, g.lives);
    try std.testing.expect(!g.has_shield);
    try std.testing.expect(!g.player_dead);
    try std.testing.expect(g.player() != null);
    try std.testing.expectEqual(@as(u32, 0), g.combo);
    try std.testing.expect(g.shield_broke);
}

test "bonus life awarded when score crosses the life_every threshold" {
    const src =
        \\name "T"
        \\player { lives 3 life_every 500 }
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expectEqual(@as(u32, 3), g.lives);
    try std.testing.expectEqual(@as(u32, 500), g.next_life_at);
    g.score = 499;
    g.awardBonusLife();
    try std.testing.expectEqual(@as(u32, 3), g.lives);
    g.score = 500;
    g.awardBonusLife();
    try std.testing.expectEqual(@as(u32, 4), g.lives);
    try std.testing.expect(g.extra_life_just_awarded);
    // Crossing two thresholds at once awards both lives.
    g.score = 1500;
    g.awardBonusLife();
    try std.testing.expectEqual(@as(u32, 6), g.lives);
}

test "player death resets the combo" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.combo = 12;
    g.has_shield = false;
    g.hitPlayer(g.player().?);
    try std.testing.expectEqual(@as(u32, 0), g.combo);
    try std.testing.expect(g.player_dead);
}

test "bomb clears enemy bullets and costs a stock" {
    const src =
        \\name "T"
        \\player { bombs 2 }
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expectEqual(@as(u32, 2), g.bombs);

    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = .{ .x = 100, .y = 100 },
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    var input = Input{ .bomb = true };
    g.step(1.0 / 60.0, &input);
    try std.testing.expectEqual(@as(u32, 1), g.bombs);
    try std.testing.expectEqual(@as(usize, 0), g.pool.countByKind(.ebullet));
    try std.testing.expect(g.bomb_just_fired);
}

test "bomb damages enemies and awards points for kills" {
    const src =
        \\name "T"
        \\player { bombs 1 }
        \\enemy weak { hp 1 points 100 }
        \\enemy tough { hp 5 points 500 }
        \\wave { at 0 kind weak count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    const weak = g.pool.spawn().?;
    weak.* = .{ .kind = .enemy, .alive = true, .pos = .{ .x = 100, .y = 100 }, .radius = 8, .hp = 1, .points = 100 };
    const tough = g.pool.spawn().?;
    tough.* = .{ .kind = .enemy, .alive = true, .pos = .{ .x = 200, .y = 100 }, .radius = 12, .hp = 5, .points = 500 };
    var input = Input{ .bomb = true };
    g.step(1.0 / 60.0, &input);
    // The 1-hp enemy dies and scores; the 5-hp enemy drops to 3.
    try std.testing.expectEqual(@as(f32, 3), tough.hp);
    try std.testing.expectEqual(@as(u32, 0), g.bombs);
    try std.testing.expect(g.score > 0);
}

test "bomb with no stock does nothing" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expectEqual(@as(u32, 0), g.bombs);
    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = .{ .x = 100, .y = 100 },
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    var input = Input{ .bomb = true };
    g.step(1.0 / 60.0, &input);
    try std.testing.expectEqual(@as(usize, 1), g.pool.countByKind(.ebullet));
    try std.testing.expect(!g.bomb_just_fired);
}

test "respawn grants a short invulnerability window" {
    const src =
        \\name "T"
        \\player { lives 3 }
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.hitPlayer(g.player().?);
    try std.testing.expectEqual(@as(f32, 0), g.invuln_timer);
    var n: usize = 0;
    while (n < 60 * 5 and g.player_dead) : (n += 1) {
        g.step(1.0 / 60.0, &Input{});
    }
    try std.testing.expect(!g.player_dead);
    try std.testing.expect(g.invuln_timer > 1.0);
}

test "invulnerability window blocks a hit" {
    const src =
        \\name "T"
        \\player { lives 3 }
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.invuln_timer = 2.0;
    const lives_before = g.lives;

    // Fire an enemy bullet straight at the player during the window.
    const p = g.player().?;
    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = p.pos,
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expectEqual(lives_before, g.lives);
    try std.testing.expect(!g.player_dead);
    try std.testing.expect(g.player() != null);

    // After the window elapses the same bullet hurts the player.
    var n: usize = 0;
    while (n < 60 * 5 and g.invuln_timer > 0) : (n += 1) {
        g.step(1.0 / 60.0, &Input{});
    }
    try std.testing.expectEqual(@as(f32, 0), g.invuln_timer);
    const p2 = g.player().?;
    const eb2 = g.pool.spawn().?;
    eb2.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = p2.pos,
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expect(g.player_dead or g.lives < lives_before);
}

test "enemies and bosses carry their max_hp at spawn" {
    const src =
        \\name "T"
        \\enemy tank { hp 4 speed 60 points 500 radius 12 fire_rate 0.35 }
        \\wave { at 0 kind tank count 1 interval 0.01 pattern drift armed true }
        \\boss { at 1 kind tank hp 80 speed 40 points 5000 radius 24 fire_rate 0.8 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    var input = Input{};
    g.step(1.0 / 60.0, &input);
    var n: usize = 0;
    while (g.boss_idx == 0 and n < 60 * 60) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    var saw_wave_max = false;
    var saw_boss_max = false;
    for (&g.pool.entities) |*e| {
        if (!e.alive or e.kind != .enemy) continue;
        if (e.radius >= 20) {
            if (e.max_hp == 80) saw_boss_max = true;
        } else {
            if (e.max_hp == 4) saw_wave_max = true;
        }
    }
    try std.testing.expect(saw_wave_max);
    try std.testing.expect(saw_boss_max);
}

test "a near-miss bullet grazes and scores points" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    try std.testing.expectEqual(@as(u32, 0), g.graze);
    const score_before = g.score;

    // Place an enemy bullet just outside the player's hit circle but inside
    // the graze band.
    const p = g.player().?;
    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = .{ .x = p.pos.x + p.radius + 4, .y = p.pos.y },
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expectEqual(@as(u32, 1), g.graze);
    try std.testing.expect(g.graze_just_happened);
    try std.testing.expectEqual(score_before + Game.graze_points, g.score);
    try std.testing.expect(!g.player_dead);
    try std.testing.expectEqual(@as(u32, 3), g.lives);
}

test "each bullet grazes at most once" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);

    const p = g.player().?;
    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = .{ .x = p.pos.x + p.radius + 4, .y = p.pos.y },
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    // One step grazes; a second step must not double-count.
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expectEqual(@as(u32, 1), g.graze);
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expectEqual(@as(u32, 1), g.graze);
}

test "graze points scale with the combo multiplier" {
    const src =
        \\name "T"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    g.combo = 10; // x3 multiplier

    const p = g.player().?;
    const eb = g.pool.spawn().?;
    eb.* = .{
        .kind = .ebullet,
        .alive = true,
        .pos = .{ .x = p.pos.x + p.radius + 4, .y = p.pos.y },
        .radius = 3,
        .hp = 1,
        .ttl = 5,
    };
    g.step(1.0 / 60.0, &Input{});
    try std.testing.expectEqual(Game.graze_points * 3, g.score);
}

test "wave enemies and bosses inherit shots and spread from the level" {
    const src =
        \\name "T"
        \\enemy gunner { hp 1 points 100 radius 8 fire_rate 0.5 shots 3 spread 0.9 }
        \\wave { at 0 kind gunner count 1 interval 0.01 pattern drift armed true }
        \\boss { at 1 kind gunner hp 80 speed 40 points 5000 radius 24 fire_rate 0.8 shots 5 spread 1.2 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    var g = Game.init(&level, 3);
    var input = Input{};
    g.step(1.0 / 60.0, &input);
    var n: usize = 0;
    while (g.boss_idx == 0 and n < 60 * 60) : (n += 1) {
        g.step(1.0 / 60.0, &input);
    }
    var saw_wave_shots = false;
    var saw_boss_shots = false;
    for (&g.pool.entities) |*e| {
        if (!e.alive or e.kind != .enemy) continue;
        if (e.radius >= 20) {
            if (e.shots == 5 and e.spread > 1.1) saw_boss_shots = true;
        } else {
            if (e.shots == 3 and e.spread > 0.8) saw_wave_shots = true;
        }
    }
    try std.testing.expect(saw_wave_shots);
    try std.testing.expect(saw_boss_shots);
}

test "level parser reads shots and spread for enemies and bosses" {
    const src =
        \\name "T"
        \\enemy gunner { hp 1 shots 3 spread 0.9 }
        \\wave { at 0 kind gunner count 1 }
        \\boss { at 1 kind gunner hp 80 shots 5 spread 1.2 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try level_mod.parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    const def = level.enemyDef("gunner").?;
    try std.testing.expectEqual(@as(u32, 3), def.shots);
    try std.testing.expectApproxEqAbs(@as(f32, 0.9), def.spread, 1e-4);
    try std.testing.expectEqual(@as(u32, 5), level.bosses.items[0].shots);
    try std.testing.expectApproxEqAbs(@as(f32, 1.2), level.bosses.items[0].spread, 1e-4);
}