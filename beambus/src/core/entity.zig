const std = @import("std");
const Vec2 = @import("vec.zig").Vec2;

/// Identifies what an entity is and which behaviour it gets. Kept as a flat
/// enum so the core loop can dispatch with a single switch (no vtables, no
/// allocator pressure, fully deterministic).
pub const Kind = enum {
    player,
    enemy,
    bullet,
    ebullet,
    particle,
    powerup,
    text,
};

/// A single live object in the world. All fields are plain data; behaviour is
/// selected by `kind`. Every entity has a position, a velocity, a collision
/// radius (0 = non-colliding) and a colour so the renderer never needs game
/// logic.
pub const Entity = struct {
    kind: Kind,
    alive: bool = false,
    pos: Vec2 = .zero,
    vel: Vec2 = .zero,
    radius: f32 = 0,
    /// Health; <= 0 entities are culled by the core loop.
    hp: f32 = 1,
    /// Maximum health at spawn, for boss health bars / damage gauges.
    max_hp: f32 = 1,
    /// Base shots per second for enemies, from the level def; 0 = never fires.
    fire_rate: f32 = 0,
    /// Points awarded when this enemy is destroyed, from the level def.
    points: u32 = 0,
    /// Life left in ticks-ish seconds; <= 0 kills the entity (e.g. particles).
    ttl: f32 = 0,
    /// Whether enemies fire at the player (set from the spawning wave).
    armed: bool = true,
    /// Whether this enemy bullet has already scored a near-miss graze.
    grazed: bool = false,
    /// Volley size: bullets fired per enemy trigger (1 = single aimed shot).
    shots: u32 = 1,
    /// Total fan angle in radians for a volley, centered on the player.
    spread: f32 = 0,
    /// HP fraction (0..1) at which a boss enters its enrage phase; 0 = never.
    rage_hp: f32 = 0,
    /// True once this boss has enraged (fire rate and volley buffed).
    enraged: bool = false,
    /// Opaque per-kind tuning/state payload.
    data: u32 = 0,
    /// RGB colour for the sprite renderer.
    color: u32 = 0xFFFFFF,

    pub fn isColliding(a: *const Entity, b: *const Entity) bool {
        if (a.radius <= 0 or b.radius <= 0) return false;
        const rr = a.radius + b.radius;
        return a.pos.sub(b.pos).lengthSq() <= rr * rr;
    }
};

/// Arena of entities with a free list. Capacity is fixed at compile time so
/// the game never allocates during a frame: deterministic, cache-friendly,
/// no OOM states.
pub const Pool = struct {
    entities: [capacity]Entity = undefined,
    free_list: [capacity]usize = undefined,
    free_count: usize = 0,
    /// High-water mark of live entities, for tests/statistics.
    peak_live: usize = 0,
    live: usize = 0,

    pub const capacity = 1024;

    pub fn init(self: *Pool) void {
        var i: usize = 0;
        while (i < capacity) : (i += 1) {
            self.free_list[i] = i;
            self.entities[i] = .{ .kind = .particle };
            self.entities[i].alive = false;
        }
        self.free_count = capacity;
        self.live = 0;
        self.peak_live = 0;
    }

    pub fn spawn(self: *Pool) ?*Entity {
        if (self.free_count == 0) return null;
        self.free_count -= 1;
        const idx = self.free_list[self.free_count];
        const e = &self.entities[idx];
        e.* = .{ .kind = .particle };
        e.alive = true;
        self.live += 1;
        if (self.live > self.peak_live) self.peak_live = self.live;
        return e;
    }

    pub fn kill(self: *Pool, e: *Entity) void {
        if (!e.alive) return;
        const base: [*]Entity = @ptrCast(&self.entities);
        const idx: usize = @intCast(@intFromPtr(e) - @intFromPtr(base));
        const index = idx / @sizeOf(Entity);
        e.alive = false;
        self.live -= 1;
        self.free_list[self.free_count] = index;
        self.free_count += 1;
    }

    /// Cull entities whose ttl expired or hp dropped to <= 0. Returns count
    /// of entities that were removed. Bullets and ebullets are removed when
    /// their ttl expires too (they are marked ttl=0 on impact / off-screen).
    pub fn cull(self: *Pool) usize {
        var removed: usize = 0;
        for (&self.entities) |*e| {
            if (!e.alive) continue;
            const expires = switch (e.kind) {
                .player => false,
                .enemy => e.hp <= 0,
                .bullet, .ebullet => e.ttl <= 0 or e.hp <= 0,
                else => e.ttl <= 0,
            };
            if (expires) {
                self.kill(e);
                removed += 1;
            }
        }
        return removed;
    }

    pub fn countByKind(self: *const Pool, kind: Kind) usize {
        var n: usize = 0;
        for (&self.entities) |*e| {
            if (e.alive and e.kind == kind) n += 1;
        }
        return n;
    }
};

test "pool spawn and free list reuse" {
    var p: Pool = undefined;
    p.init();
    const a = p.spawn().?;
    const b = p.spawn().?;
    try std.testing.expect(a != b);
    try std.testing.expectEqual(@as(usize, 2), p.live);
    p.kill(a);
    try std.testing.expectEqual(@as(usize, 1), p.live);
    const c = p.spawn().?;
    try std.testing.expect(c == a);
}

test "pool exhausts at capacity" {
    var p: Pool = undefined;
    p.init();
    var spawned: usize = 0;
    while (p.spawn()) |_| spawned += 1;
    try std.testing.expectEqual(Pool.capacity, spawned);
    try std.testing.expect(p.spawn() == null);
}

test "pool cull respects live kinds" {
    var p: Pool = undefined;
    p.init();
    const e = p.spawn().?;
    e.kind = .particle;
    e.ttl = -1;
    const player = p.spawn().?;
    player.kind = .player;
    const removed = p.cull();
    try std.testing.expectEqual(@as(usize, 1), removed);
    try std.testing.expectEqual(@as(usize, 1), p.live);
}

test "entity circle collision" {
    var a = Entity{ .kind = .bullet, .pos = .{ .x = 0, .y = 0 }, .radius = 5 };
    var b = Entity{ .kind = .enemy, .pos = .{ .x = 3, .y = 4 }, .radius = 5 };
    try std.testing.expect(Entity.isColliding(&a, &b));
    a.pos = .{ .x = 0, .y = 0 };
    b.pos = .{ .x = 100, .y = 100 };
    try std.testing.expect(!Entity.isColliding(&a, &b));
}