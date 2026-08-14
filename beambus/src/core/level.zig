const std = @import("std");
const Vec2 = @import("vec.zig").Vec2;

/// Movement pattern an enemy follows once spawned. Drives how the entity
/// curves through the play field; defined in the scripted level format.
pub const Pattern = enum {
    none,
    sine,
    zigzag,
    swoop,
    drift,
    orbit,
    spiral,

    pub fn parse(s: []const u8) !Pattern {
        const map = std.StaticStringMap(Pattern).initComptime(.{
            .{ "none", .none },
            .{ "sine", .sine },
            .{ "zigzag", .zigzag },
            .{ "swoop", .swoop },
            .{ "drift", .drift },
            .{ "orbit", .orbit },
            .{ "spiral", .spiral },
        });
        return map.get(s) orelse error.UnknownPattern;
    }
};

pub const EnemyDef = struct {
    /// Symbolic name referenced by waves (e.g. "grunt").
    name: []const u8 = "",
    hp: f32 = 1,
    speed: f32 = 80,
    points: u32 = 100,
    radius: f32 = 8,
    /// Base shots per second; 0 = never fires.
    fire_rate: f32 = 0.5,
    color: u32 = 0xE8594F,
};

pub const Wave = struct {
    /// Wall-clock seconds into the level when the wave starts spawning.
    at: f32 = 0,
    /// Enemy def name to spawn.
    kind: []const u8 = "grunt",
    count: u32 = 5,
    /// Seconds between individual spawns.
    interval: f32 = 0.4,
    pattern: Pattern = .drift,
    /// Whether enemies fire at the player.
    armed: bool = true,
};

pub const Boss = struct {
    at: f32 = 0,
    kind: []const u8 = "queen",
    hp: f32 = 80,
    speed: f32 = 40,
    points: u32 = 5000,
    radius: f32 = 24,
    fire_rate: f32 = 0.8,
    color: u32 = 0xFFD23F,
};

/// What a power-up pickup grants. `spread` raises the player's fire level
/// (single -> double -> triple) up to a cap of 3; `shield` grants a one-hit
/// shield that absorbs the next hit instead of a life.
pub const PowerKind = enum {
    spread,
    shield,

    pub fn parse(s: []const u8) !PowerKind {
        const map = std.StaticStringMap(PowerKind).initComptime(.{
            .{ "spread", .spread },
            .{ "shield", .shield },
        });
        return map.get(s) orelse error.UnknownPowerup;
    }
};

/// A timed power-up drop declared in the level script.
pub const PowerupSpawn = struct {
    /// Wall-clock seconds into the level when the drop appears.
    at: f32 = 0,
    kind: PowerKind = .spread,
};

/// A fully parsed level. Strings point into the caller-provided source buffer
/// (the level file text), so `Level` borrows from it and must not outlive it.
pub const Level = struct {
    name: []const u8 = "untitled",
    player_speed: f32 = 260,
    player_fire_rate: f32 = 0.16,
    lives: u32 = 3,
    /// Score at which a bonus life is awarded; 0 disables bonus lives.
    life_every: u32 = 10000,
    bg: [3]u8 = .{ 0x0B, 0x0E, 0x14 },
    enemies: std.ArrayList(EnemyDef),
    waves: std.ArrayList(Wave),
    bosses: std.ArrayList(Boss),
    powerups: std.ArrayList(PowerupSpawn),

    pub fn init() Level {
        return .{
            .enemies = .empty,
            .waves = .empty,
            .bosses = .empty,
            .powerups = .empty,
        };
    }

    pub fn deinit(self: *Level, alloc: std.mem.Allocator) void {
        self.enemies.deinit(alloc);
        self.waves.deinit(alloc);
        self.bosses.deinit(alloc);
        self.powerups.deinit(alloc);
    }

    pub fn enemyDef(self: *const Level, name: []const u8) ?EnemyDef {
        for (self.enemies.items) |e| {
            if (std.mem.eql(u8, e.name, name)) return e;
        }
        return null;
    }
};

pub const ParseError = error{
    UnknownDirective,
    UnknownEnemy,
    OutOfMemory,
    BadNumber,
    BadColor,
    MissingName,
    EmptyLevel,
    DuplicateName,
};

/// Line-based, brace-delimited level script. See docs/level-format.md.
///
///   name "First Contact"
///   player { speed 260 fire_rate 0.16 lives 3 }
///   background #0b0e14
///   enemy grunt { hp 1 speed 90 points 100 radius 8 fire_rate 0.5 color #e8594f }
///   wave  { at 2 kind grunt count 6 interval 0.4 pattern sine armed true }
///   boss  { at 30 kind queen hp 80 speed 40 points 5000 fire_rate 0.8 color #ffd23f }
///
/// `#` starts a comment to end of line. Block bodies are `key value` pairs.
pub fn parse(alloc: std.mem.Allocator, src: []const u8) !Level {
    var level = Level.init();
    errdefer level.deinit(alloc);

    var line_it = std.mem.tokenizeScalar(u8, src, '\n');
    var line_no: usize = 0;
    while (line_it.next()) |raw_line| {
        line_no += 1;
        const line = stripComment(raw_line);
        if (std.mem.trim(u8, line, " \t\r").len == 0) continue;

        const directive = firstToken(line);
        if (std.mem.eql(u8, directive, "name")) {
            const v = try takeString(line, "name");
            level.name = v;
            continue;
        }
        if (std.mem.eql(u8, directive, "background")) {
            level.bg = try takeColor(line, "background");
            continue;
        }
        if (std.mem.eql(u8, directive, "player")) {
            const body = try blockBody(line, "player");
            var it = KvIter{ .line = body };
            while (it.next()) |kv| {
                if (std.mem.eql(u8, kv.key, "speed")) {
                    level.player_speed = try std.fmt.parseFloat(f32, kv.value);
                } else if (std.mem.eql(u8, kv.key, "fire_rate")) {
                    level.player_fire_rate = try std.fmt.parseFloat(f32, kv.value);
                } else if (std.mem.eql(u8, kv.key, "lives")) {
                    level.lives = try std.fmt.parseInt(u32, kv.value, 10);
                } else if (std.mem.eql(u8, kv.key, "life_every")) {
                    level.life_every = try std.fmt.parseInt(u32, kv.value, 10);
                } else {
                    return error.UnknownDirective;
                }
            }
            continue;
        }
        if (std.mem.eql(u8, directive, "enemy")) {
            const def = try parseEnemy(line);
            for (level.enemies.items) |existing| {
                if (std.mem.eql(u8, existing.name, def.name)) return error.DuplicateName;
            }
            try level.enemies.append(alloc, def);
            continue;
        }
        if (std.mem.eql(u8, directive, "wave")) {
            try level.waves.append(alloc, try parseWave(line));
            continue;
        }
        if (std.mem.eql(u8, directive, "boss")) {
            try level.bosses.append(alloc, try parseBoss(line));
            continue;
        }
        if (std.mem.eql(u8, directive, "powerup")) {
            try level.powerups.append(alloc, try parsePowerup(line));
            continue;
        }
        return error.UnknownDirective;
    }

    if (level.enemies.items.len == 0) return error.EmptyLevel;
    for (level.waves.items) |w| {
        if (level.enemyDef(w.kind) == null) return error.UnknownEnemy;
    }
    return level;
}

fn stripComment(line: []const u8) []const u8 {
    var i: usize = 0;
    while (i < line.len) : (i += 1) {
        if (line[i] != '#') continue;
        // A '#' only starts a comment when followed by whitespace or EOL,
        // otherwise it is a hex color like #0b0e14.
        if (i + 1 == line.len or line[i + 1] == ' ' or line[i + 1] == '\t') {
            return line[0..i];
        }
    }
    return line;
}

/// Parses the string after `prefix "..."` (the prefix is matched with a space
/// to avoid matching "name_x"). Returns the quoted value.
fn takeString(line: []const u8, prefix: []const u8) ![]const u8 {
    const rest = std.mem.trim(u8, line[prefix.len..], " \t");
    if (rest.len < 2 or rest[0] != '"') return error.MissingName;
    const end = std.mem.indexOfScalarPos(u8, rest, 1, '"') orelse return error.MissingName;
    return rest[1..end];
}

fn takeColor(line: []const u8, prefix: []const u8) ![3]u8 {
    const rest = std.mem.trim(u8, line[prefix.len..], " \t");
    if (rest.len != 7 or rest[0] != '#') return error.BadColor;
    var out: [3]u8 = undefined;
    for (0..3) |i| {
        out[i] = std.fmt.parseInt(u8, rest[1 + i * 2 .. 3 + i * 2], 16) catch return error.BadColor;
    }
    return out;
}

const KeyValue = struct { key: []const u8, value: []const u8 };

const KvIter = struct {
    line: []const u8,
    pos: usize = 0,

    fn next(self: *KvIter) ?KeyValue {
        const rest = self.line[self.pos..];
        const trimmed = std.mem.trimLeft(u8, rest, " \t");
        const rel = rest.len - trimmed.len;
        if (trimmed.len == 0) return null;
        const sp = std.mem.indexOfScalar(u8, trimmed, ' ') orelse return null;
        const k = trimmed[0..sp];
        const val_start = std.mem.trimLeft(u8, trimmed[sp + 1 ..], " \t");
        const val_end = std.mem.indexOfAny(u8, val_start, " \t") orelse val_start.len;
        const val = val_start[0..val_end];
        const consumed = rel + sp + 1 + val_end;
        self.pos += consumed;
        return .{ .key = k, .value = val };
    }
};

fn firstToken(line: []const u8) []const u8 {
    const trimmed = std.mem.trim(u8, line, " \t");
    const end = std.mem.indexOfAny(u8, trimmed, " \t{") orelse trimmed.len;
    return trimmed[0..end];
}

/// Parses an enemy line: `enemy <name> { key value ... }`.
fn parseEnemy(line: []const u8) !EnemyDef {
    const after = std.mem.trim(u8, line["enemy".len..], " \t");
    const name_end = std.mem.indexOfAny(u8, after, " \t{") orelse return error.MissingName;
    const name = after[0..name_end];
    const body = std.mem.trim(u8, after[name_end..], " \t");
    if (body.len < 2 or body[0] != '{' or body[body.len - 1] != '}') {
        return error.UnknownDirective;
    }
    var def = EnemyDef{ .name = name };
    var it = KvIter{ .line = body[1 .. body.len - 1] };
    while (it.next()) |kv| {
        if (std.mem.eql(u8, kv.key, "hp")) {
            def.hp = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "speed")) {
            def.speed = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "points")) {
            def.points = try std.fmt.parseInt(u32, kv.value, 10);
        } else if (std.mem.eql(u8, kv.key, "radius")) {
            def.radius = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "fire_rate")) {
            def.fire_rate = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "color")) {
            def.color = try parseHexColor(kv.value);
        } else {
            return error.UnknownDirective;
        }
    }
    return def;
}

fn parseWave(line: []const u8) !Wave {
    const body = try blockBody(line, "wave");
    var w = Wave{};
    var it = KvIter{ .line = body };
    while (it.next()) |kv| {
        if (std.mem.eql(u8, kv.key, "at")) {
            w.at = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "kind")) {
            w.kind = kv.value;
        } else if (std.mem.eql(u8, kv.key, "count")) {
            w.count = try std.fmt.parseInt(u32, kv.value, 10);
        } else if (std.mem.eql(u8, kv.key, "interval")) {
            w.interval = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "pattern")) {
            w.pattern = try Pattern.parse(kv.value);
        } else if (std.mem.eql(u8, kv.key, "armed")) {
            w.armed = std.mem.eql(u8, kv.value, "true");
        } else {
            return error.UnknownDirective;
        }
    }
    return w;
}

fn parseBoss(line: []const u8) !Boss {
    const body = try blockBody(line, "boss");
    var b = Boss{};
    var it = KvIter{ .line = body };
    while (it.next()) |kv| {
        if (std.mem.eql(u8, kv.key, "at")) {
            b.at = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "kind")) {
            b.kind = kv.value;
        } else if (std.mem.eql(u8, kv.key, "hp")) {
            b.hp = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "speed")) {
            b.speed = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "points")) {
            b.points = try std.fmt.parseInt(u32, kv.value, 10);
        } else if (std.mem.eql(u8, kv.key, "radius")) {
            b.radius = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "fire_rate")) {
            b.fire_rate = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "color")) {
            b.color = try parseHexColor(kv.value);
        } else {
            return error.UnknownDirective;
        }
    }
    return b;
}

fn parsePowerup(line: []const u8) !PowerupSpawn {
    const body = try blockBody(line, "powerup");
    var p = PowerupSpawn{};
    var it = KvIter{ .line = body };
    while (it.next()) |kv| {
        if (std.mem.eql(u8, kv.key, "at")) {
            p.at = try std.fmt.parseFloat(f32, kv.value);
        } else if (std.mem.eql(u8, kv.key, "kind")) {
            p.kind = try PowerKind.parse(kv.value);
        } else {
            return error.UnknownDirective;
        }
    }
    return p;
}

/// Returns the text inside `{ ... }` following the directive keyword.
fn blockBody(line: []const u8, directive: []const u8) ![]const u8 {
    const rest = std.mem.trim(u8, line[directive.len..], " \t");
    if (rest.len < 2 or rest[0] != '{' or rest[rest.len - 1] != '}') {
        return error.UnknownDirective;
    }
    return rest[1 .. rest.len - 1];
}

fn parseHexColor(s: []const u8) !u32 {
    if (s.len != 7 or s[0] != '#') return error.BadColor;
    return std.fmt.parseInt(u32, s[1..], 16);
}

test "parse a full level" {
    const src =
        \\name "First Contact"
        \\background #0b0e14
        \\player { speed 260 fire_rate 0.16 lives 3 }
        \\enemy grunt { hp 1 speed 90 points 100 radius 8 fire_rate 0.5 color #e8594f }
        \\enemy dart { hp 2 speed 160 points 250 radius 9 fire_rate 1.2 color #7aa2f7 }
        \\wave { at 2 kind grunt count 6 interval 0.4 pattern sine armed true }
        \\wave { at 10 kind dart count 8 interval 0.25 pattern zigzag armed false }
        \\boss { at 30 kind grunt hp 80 speed 40 points 5000 fire_rate 0.8 color #ffd23f }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    try std.testing.expectEqualStrings("First Contact", level.name);
    try std.testing.expectEqual(@as(u32, 3), level.lives);
    try std.testing.expectEqual(@as(usize, 2), level.enemies.items.len);
    try std.testing.expectEqual(@as(usize, 2), level.waves.items.len);
    try std.testing.expectEqual(@as(usize, 1), level.bosses.items.len);
    const dart = level.enemyDef("dart").?;
    try std.testing.expectEqual(@as(f32, 160), dart.speed);
    try std.testing.expectEqual(@as(u32, 250), dart.points);
    try std.testing.expectEqual(Pattern.zigzag, level.waves.items[1].pattern);
}

test "comments are stripped" {
    const src =
        \\# header comment
        \\name "Spam" # trailing comment
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    try std.testing.expectEqualStrings("Spam", level.name);
}

test "unknown enemy referenced by a wave errors" {
    const src =
        \\name "Bad"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind nope count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.UnknownEnemy, parse(gpa.allocator(), src));
}

test "bad number errors" {
    const src =
        \\name "Bad"
        \\enemy bug { hp 1 }
        \\wave { at abc kind bug count 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.InvalidCharacter, parse(gpa.allocator(), src));
}

test "unknown directive errors" {
    const src =
        \\name "Bad"
        \\frobnicate 5
        \\enemy bug { hp 1 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.UnknownDirective, parse(gpa.allocator(), src));
}

test "empty level errors" {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.EmptyLevel, parse(gpa.allocator(), "name \"x\"\n"));
}

test "duplicate enemy name errors" {
    const src =
        \\name "Dup"
        \\enemy bug { hp 1 }
        \\enemy bug { hp 2 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.DuplicateName, parse(gpa.allocator(), src));
}

test "parse powerup drops" {
    const src =
        \\name "Power"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\powerup { at 15 kind spread }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    try std.testing.expectEqual(@as(usize, 1), level.powerups.items.len);
    try std.testing.expectEqual(@as(f32, 15), level.powerups.items[0].at);
    try std.testing.expectEqual(PowerKind.spread, level.powerups.items[0].kind);
}

test "unknown powerup kind errors" {
    const src =
        \\name "Bad"
        \\enemy bug { hp 1 }
        \\powerup { at 0 kind nuke }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    try std.testing.expectError(error.UnknownPowerup, parse(gpa.allocator(), src));
}

test "pattern parse" {
    try std.testing.expectEqual(Pattern.sine, try Pattern.parse("sine"));
    try std.testing.expectEqual(Pattern.orbit, try Pattern.parse("orbit"));
    try std.testing.expectError(error.UnknownPattern, Pattern.parse("blob"));
}

test "parse player life_every" {
    const src =
        \\name "Life"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\player { lives 5 life_every 5000 }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    try std.testing.expectEqual(@as(u32, 5), level.lives);
    try std.testing.expectEqual(@as(u32, 5000), level.life_every);
}

test "parse shield powerup kind" {
    const src =
        \\name "Shield"
        \\enemy bug { hp 1 }
        \\wave { at 0 kind bug count 1 }
        \\powerup { at 5 kind shield }
        \\
    ;
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    var level = try parse(gpa.allocator(), src);
    defer level.deinit(gpa.allocator());
    try std.testing.expectEqual(@as(usize, 1), level.powerups.items.len);
    try std.testing.expectEqual(PowerKind.shield, level.powerups.items[0].kind);
}