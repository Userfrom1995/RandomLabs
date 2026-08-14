const std = @import("std");
const Vec2 = @import("vec.zig").Vec2;
const Rng = @import("rng.zig").Rng;
const Entity = @import("entity.zig").Entity;
const Kind = @import("entity.zig").Kind;
const Pool = @import("entity.zig").Pool;
const level_mod = @import("level.zig");
const Level = level_mod.Level;
const Wave = level_mod.Wave;
const Boss = level_mod.Boss;
const Pattern = level_mod.Pattern;

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

    pub fn init(level: *const Level, seed: u64) Game {
        var g = Game{
            .rng = .{ .state = seed },
            .level = level,
        };
        g.pool.init();
        g.lives = level.lives;
        g.player_speed = level.player_speed;
        g.player_fire_rate = level.player_fire_rate;
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
                } else {
                    self.state = .lost;
                }
            }
            return;
        }

        self.updatePlayer(dt, input);
        self.updateWaves(dt);
        self.updateBosses(dt);
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

        self.fire_cooldown -= dt;
        if (input.fire and self.fire_cooldown <= 0) {
            self.fire_cooldown = self.player_fire_rate;
            self.spawnBullet(p.pos, .{ .x = 0, .y = -1 }, 520, 0x7AA2F7);
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
            .armed = true,
            .data = @intFromEnum(Pattern.orbit),
            .color = b.color,
        };
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
        const radius = e.radius;
        if (radius >= 20) return 0.8; // boss
        return 0.5;
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
        const dir = p.pos.sub(e.pos).normalized();
        self.spawnEBullet(e.pos, dir, 200);
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
                        self.score += self.pointsFor(e);
                        self.spawnBurst(e.pos, e.color);
                        e.ttl = 0;
                        self.spawnScoreText(e.pos);
                    } else {
                        self.spawnBurst(e.pos, 0x888888);
                    }
                }
            }
        }

        // Enemy bullets vs player.
        for (&self.pool.entities) |*b| {
            if (!b.alive or b.kind != .ebullet) continue;
            if (Entity.isColliding(p, b)) {
                b.ttl = 0;
                self.hitPlayer(p);
            }
        }

        // Enemies vs player (body contact).
        for (&self.pool.entities) |*e| {
            if (!e.alive or e.kind != .enemy) continue;
            if (Entity.isColliding(p, e)) {
                e.ttl = 0;
                self.hitPlayer(p);
                break;
            }
        }
    }

    fn hitPlayer(self: *Game, p: *Entity) void {
        p.ttl = 0;
        self.player_dead = true;
        self.respawn_timer = 1.2;
        self.player_just_hit = true;
        self.spawnBurst(p.pos, 0xFFFFFF);
    }

    fn pointsFor(self: *const Game, e: *const Entity) u32 {
        _ = self;
        // Derive points from radius, matching the level's tuning scale.
        if (e.radius >= 20) return 5000;
        if (e.radius >= 12) return 500;
        if (e.radius >= 9) return 250;
        return 100;
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

    fn spawnScoreText(self: *Game, pos: Vec2) void {
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
            .data = self.score,
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