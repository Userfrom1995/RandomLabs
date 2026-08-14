//! Beambus procedural renderer: draws the game state into a software pixel
//! buffer at arena resolution (480x600), which the SDL layer then scales to
//! the window. No SDL dependency here: everything is pure Zig over a `u32`
//! pixel buffer, so the rendering math is testable headlessly.
const std = @import("std");
const core = @import("../core/core.zig");
const Game = core.Game;
const Entity = core.Entity;
const Vec2 = core.Vec2;
const arena_w = core.arena_w;
const arena_h = core.arena_h;

/// Pixels are 0xAARRGGBB so the buffer can be handed to an SDL texture
/// (SDL_PIXELFORMAT_ARGB8888) without a conversion pass.
pub const Pixel = u32;

pub const Renderer = struct {
    pixels: [arena_w * arena_h]Pixel = undefined,
    /// Number of stars and their layout, seeded so the backdrop is stable.
    stars: [64]Star = undefined,

    pub const Star = struct {
        x: i32,
        y: i32,
        /// 0..=3 brightness level for the twinkle banding.
        lvl: u8,
    };

    /// Seeds the starfield from a hash of `seed`; call once before first frame.
    pub fn seedStars(self: *Renderer, seed: u64) void {
        var s = seed;
        for (&self.stars) |*st| {
            s = splitmix(s);
            st.x = @intCast(@mod(@as(u64, s), arena_w));
            s = splitmix(s);
            st.y = @intCast(@mod(@as(u64, s), arena_h));
            s = splitmix(s);
            st.lvl = @intCast(@mod(@as(u64, s), 4));
        }
    }

    /// Clears the buffer to the background color and redraws the starfield
    /// scrolled by `time` seconds (stars drift slowly downward, wrapping).
    pub fn clear(self: *Renderer, bg: [3]u8, time: f32) void {
        const bg_px = packRgb(bg[0], bg[1], bg[2]);
        for (&self.pixels) |*px| px.* = bg_px;
        const scroll: i32 = @intFromFloat(@mod(time * 4.0, @as(f32, @floatFromInt(arena_h))));
        for (self.stars) |st| {
            const y = @mod(st.y + scroll, @as(i32, arena_h));
            const shade: u8 = switch (st.lvl) {
                0 => 24,
                1 => 40,
                2 => 60,
                else => 80,
            };
            self.plot(st.x, y, packRgb(shade, shade, shade + 6));
        }
    }

    /// Renders every alive entity in the pool plus the HUD.
    pub fn drawGame(self: *Renderer, g: *const Game) void {
        self.drawEntities(g);
        self.drawHud(g);
    }

    fn drawEntities(self: *Renderer, g: *const Game) void {
        for (&g.pool.entities) |*e| {
            if (!e.alive) continue;
            switch (e.kind) {
                .player => self.drawPlayer(e),
                .enemy => self.drawEnemy(e),
                .bullet => self.drawBullet(e),
                .ebullet => self.drawEBullet(e),
                .particle => self.drawParticle(e),
                .text => self.drawFloatingScore(e),
            }
        }
    }

    fn drawPlayer(self: *Renderer, e: *const Entity) void {
        const c: i32 = @intFromFloat(e.pos.x);
        const r: i32 = @intFromFloat(e.pos.y);
        // Triangle ship pointing up, sized from its collision radius.
        const s: i32 = @as(i32, @intFromFloat(e.radius)) + 3;
        self.fillTriangle(
            .{ .x = c, .y = r - s },
            .{ .x = c - s, .y = r + s },
            .{ .x = c + s, .y = r + s },
            e.color,
        );
        // Cockpit highlight.
        self.fillRect(c - 1, r - @divTrunc(s, 2), 2, 2, 0xFFFFFF);
        // Engine glow: a pair of small squares under the wings.
        self.fillRect(c - s + 1, r + s - 2, 2, 2, 0x7AA2F7);
        self.fillRect(c + s - 3, r + s - 2, 2, 2, 0x7AA2F7);
    }

    fn drawEnemy(self: *Renderer, e: *const Entity) void {
        const c: i32 = @intFromFloat(e.pos.x);
        const r: i32 = @intFromFloat(e.pos.y);
        const rad: i32 = @intFromFloat(e.radius);
        // Body.
        self.fillCircle(c, r, rad, e.color);
        // Outer ring for large enemies (bosses).
        if (rad >= 20) {
            self.strokeCircle(c, r, rad + 2, 0xFFFFFF);
        }
        // Detail dots: two "eyes", tinted toward white for contrast.
        self.fillRect(c - @divTrunc(rad, 2), r - 1, 2, 2, 0x1A1B26);
        self.fillRect(c + @divTrunc(rad, 2) - 1, r - 1, 2, 2, 0x1A1B26);
    }

    fn drawBullet(self: *Renderer, e: *const Entity) void {
        const c: i32 = @intFromFloat(e.pos.x);
        const r: i32 = @intFromFloat(e.pos.y);
        // Bright core with a dimmer trail.
        self.fillRect(c - 1, r - 6, 2, 5, 0x2E3B6B);
        self.fillRect(c, r - 6, 1, 6, e.color);
        self.fillRect(c - 1, r - 6, 3, 2, 0xFFFFFF);
    }

    fn drawEBullet(self: *Renderer, e: *const Entity) void {
        const c: i32 = @intFromFloat(e.pos.x);
        const r: i32 = @intFromFloat(e.pos.y);
        self.fillCircle(c, r, 3, e.color);
        self.fillRect(c, r, 1, 1, 0xFFFFFF);
    }

    fn drawParticle(self: *Renderer, e: *const Entity) void {
        const c: i32 = @intFromFloat(e.pos.x);
        const r: i32 = @intFromFloat(e.pos.y);
        // Fade toward black with remaining ttl.
        const fade = @min(1.0, @max(0.0, e.ttl / 0.8));
        const col = darkenRgb(e.color, fade);
        self.fillRect(c, r, 2, 2, col);
    }

    fn drawFloatingScore(self: *Renderer, e: *const Entity) void {
        var buf: [16]u8 = undefined;
        const text = std.fmt.bufPrint(&buf, "{d}", .{e.data}) catch return;
        self.drawString(e.pos, text, e.color, 1);
    }

    fn drawHud(self: *Renderer, g: *const Game) void {
        // Top bar: score (left), lives (center), level name (right).
        var buf: [16]u8 = undefined;
        const score = std.fmt.bufPrint(&buf, "SCORE {d}", .{g.score}) catch return;
        self.drawString(.{ .x = 6, .y = 6 }, score, 0x9AA5CE, 1);

        const lives = std.fmt.bufPrint(&buf, "LIVES {d}", .{g.lives}) catch return;
        self.drawString(.{ .x = 6, .y = 16 }, lives, 0x9AA5CE, 1);

        if (g.level.name.len > 0) {
            const name = g.level.name;
            const w = textWidth(name);
            self.drawString(.{ .x = @as(f32, @floatFromInt(arena_w)) - @as(f32, @floatFromInt(w)) - 6, .y = 6 }, name, 0x565F89, 1);
        }

        // Terminal states.
        const msg: ?[]const u8 = switch (g.state) {
            .won => "YOU WIN",
            .lost => "GAME OVER",
            .running => null,
        };
        if (msg) |m| {
            self.drawCentered(.{ .x = 0, .y = 250 }, m, 0xFFFFFF, 2);
            self.drawCentered(.{ .x = 0, .y = 284 }, "PRESS R TO RESTART", 0x9AA5CE, 1);
            self.drawCentered(.{ .x = 0, .y = 296 }, "ESC TO QUIT", 0x9AA5CE, 1);
        }
    }

    /// Draws a string centered horizontally around arena_w/2.
    pub fn drawCentered(self: *Renderer, at: Vec2, text: []const u8, color: u32, scale: u32) void {
        const w = textWidth(text) * scale;
        const x = @as(f32, @floatFromInt(arena_w)) / 2.0 - @as(f32, @floatFromInt(w)) / 2.0;
        self.drawString(.{ .x = x, .y = at.y }, text, color, scale);
    }

    /// Draws text at a world-space position using the 3x5 bitmap font.
    pub fn drawString(self: *Renderer, at: Vec2, text: []const u8, color: u32, scale: u32) void {
        var x: i32 = @intFromFloat(at.x);
        const y: i32 = @intFromFloat(at.y);
        for (text) |c| {
            const glyph = glyphFor(c);
            for (0..5) |row| {
                const bits = glyph[row];
                for (0..3) |col| {
                    if (bits & (@as(u8, 1) << @intCast(2 - col)) != 0) {
                        self.fillRect(x + @as(i32, @intCast(col * scale)), y + @as(i32, @intCast(row * scale)), @intCast(scale), @intCast(scale), color);
                    }
                }
            }
            x += @as(i32, @intCast(4 * scale));
        }
    }

    // -- Low-level drawing ----------------------------------------------

    fn plot(self: *Renderer, x: i32, y: i32, color: Pixel) void {
        if (x < 0 or x >= arena_w or y < 0 or y >= arena_h) return;
        self.pixels[@intCast(y * arena_w + x)] = color | 0xFF000000;
    }

    fn fillRect(self: *Renderer, x: i32, y: i32, w: i32, h: i32, color: Pixel) void {
        const px = color | 0xFF000000;
        var yy = @max(y, 0);
        const y_end = @min(y + h, arena_h);
        while (yy < y_end) : (yy += 1) {
            const row = self.pixels[@intCast(yy * arena_w)..];
            var xx = @max(x, 0);
            const x_end = @min(x + w, arena_w);
            while (xx < x_end) : (xx += 1) {
                row[@intCast(xx)] = px;
            }
        }
    }

    fn fillCircle(self: *Renderer, cx: i32, cy: i32, rad: i32, color: Pixel) void {
        if (rad <= 0) {
            self.plot(cx, cy, color);
            return;
        }
        const r2 = rad * rad;
        var y = -rad;
        while (y <= rad) : (y += 1) {
            const span = @sqrt(@as(f32, @floatFromInt(r2 - y * y)));
            const cx_f = @as(f32, @floatFromInt(cx));
            const x0: i32 = @intFromFloat(@floor(cx_f - span));
            const x1: i32 = @intFromFloat(@floor(cx_f + span));
            self.fillRect(x0, cy + y, x1 - x0 + 1, 1, color);
        }
    }

    fn strokeCircle(self: *Renderer, cx: i32, cy: i32, rad: i32, color: Pixel) void {
        const r2 = rad * rad;
        const outer = (rad + 1) * (rad + 1);
        var y = -rad - 1;
        while (y <= rad + 1) : (y += 1) {
            const y2 = y * y;
            var x = -rad - 1;
            while (x <= rad + 1) : (x += 1) {
                const d2 = x * x + y2;
                if (d2 >= r2 and d2 <= outer) self.plot(cx + x, cy + y, color);
            }
        }
    }

    fn fillTriangle(self: *Renderer, a: Point, b: Point, c: Point, color: Pixel) void {
        const min_x = @min(@min(a.x, b.x), c.x);
        const max_x = @max(@max(a.x, b.x), c.x);
        const min_y = @min(@min(a.y, b.y), c.y);
        const max_y = @max(@max(a.y, b.y), c.y);
        var y = min_y;
        while (y <= max_y) : (y += 1) {
            var x = min_x;
            while (x <= max_x) : (x += 1) {
                if (pointInTriangle(.{ .x = x, .y = y }, a, b, c)) self.plot(x, y, color);
            }
        }
    }

    const Point = struct { x: i32, y: i32 };
};

fn pointInTriangle(p: Renderer.Point, a: Renderer.Point, b: Renderer.Point, c: Renderer.Point) bool {
    const sign = struct {
        fn s(p1: Renderer.Point, p2: Renderer.Point, p3: Renderer.Point) i64 {
            return @as(i64, p1.x - p3.x) * @as(i64, p2.y - p3.y) -
                @as(i64, p2.x - p3.x) * @as(i64, p1.y - p3.y);
        }
    }.s;
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0);
    const has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0);
    return !(has_neg and has_pos);
}

fn splitmix(s: u64) u64 {
    var z = s +% 0x9E3779B97F4A7C15;
    z = (z ^ (z >> 30)) *% 0xBF58476D1CE4E5B9;
    z = (z ^ (z >> 27)) *% 0x94D049BB133111EB;
    return z ^ (z >> 31);
}

/// Scales each channel toward black by `k` (1 = unchanged, 0 = black).
fn darkenRgb(color: u32, k: f32) Pixel {
    const r: u32 = @intFromFloat(@as(f32, @floatFromInt(color >> 16 & 0xFF)) * k);
    const g: u32 = @intFromFloat(@as(f32, @floatFromInt(color >> 8 & 0xFF)) * k);
    const b: u32 = @intFromFloat(@as(f32, @floatFromInt(color & 0xFF)) * k);
    return 0xFF000000 | (r << 16) | (g << 8) | b;
}

fn packRgb(r: u8, g: u8, b: u8) Pixel {
    return 0xFF000000 | (@as(Pixel, r) << 16) | (@as(Pixel, g) << 8) | @as(Pixel, b);
}

pub fn textWidth(text: []const u8) usize {
    return text.len * 4;
}

/// 3x5 bitmap glyphs. Each of the 5 bytes holds 3 bits (bit2=left, bit0=right).
fn glyphFor(c: u8) [5]u8 {
    return switch (c) {
        'A' => .{ 0b111, 0b101, 0b111, 0b101, 0b101 },
        'B' => .{ 0b110, 0b101, 0b110, 0b101, 0b110 },
        'C' => .{ 0b111, 0b100, 0b100, 0b100, 0b111 },
        'D' => .{ 0b110, 0b101, 0b101, 0b101, 0b110 },
        'E' => .{ 0b111, 0b100, 0b111, 0b100, 0b111 },
        'F' => .{ 0b111, 0b100, 0b111, 0b100, 0b100 },
        'G' => .{ 0b111, 0b100, 0b101, 0b101, 0b111 },
        'H' => .{ 0b101, 0b101, 0b111, 0b101, 0b101 },
        'I' => .{ 0b111, 0b010, 0b010, 0b010, 0b111 },
        'J' => .{ 0b001, 0b001, 0b001, 0b101, 0b111 },
        'K' => .{ 0b101, 0b101, 0b110, 0b101, 0b101 },
        'L' => .{ 0b100, 0b100, 0b100, 0b100, 0b111 },
        'M' => .{ 0b101, 0b111, 0b111, 0b101, 0b101 },
        'N' => .{ 0b101, 0b111, 0b111, 0b101, 0b101 },
        'O' => .{ 0b111, 0b101, 0b101, 0b101, 0b111 },
        'P' => .{ 0b110, 0b101, 0b110, 0b100, 0b100 },
        'Q' => .{ 0b111, 0b101, 0b101, 0b111, 0b001 },
        'R' => .{ 0b110, 0b101, 0b110, 0b101, 0b101 },
        'S' => .{ 0b111, 0b100, 0b111, 0b001, 0b111 },
        'T' => .{ 0b111, 0b010, 0b010, 0b010, 0b010 },
        'U' => .{ 0b101, 0b101, 0b101, 0b101, 0b111 },
        'V' => .{ 0b101, 0b101, 0b101, 0b101, 0b010 },
        'W' => .{ 0b101, 0b101, 0b111, 0b111, 0b101 },
        'X' => .{ 0b101, 0b101, 0b010, 0b101, 0b101 },
        'Y' => .{ 0b101, 0b101, 0b010, 0b010, 0b010 },
        'Z' => .{ 0b111, 0b001, 0b010, 0b100, 0b111 },
        '0' => .{ 0b111, 0b101, 0b101, 0b101, 0b111 },
        '1' => .{ 0b010, 0b110, 0b010, 0b010, 0b111 },
        '2' => .{ 0b111, 0b001, 0b111, 0b100, 0b111 },
        '3' => .{ 0b111, 0b001, 0b111, 0b001, 0b111 },
        '4' => .{ 0b101, 0b101, 0b111, 0b001, 0b001 },
        '5' => .{ 0b111, 0b100, 0b111, 0b001, 0b111 },
        '6' => .{ 0b111, 0b100, 0b111, 0b101, 0b111 },
        '7' => .{ 0b111, 0b001, 0b010, 0b010, 0b010 },
        '8' => .{ 0b111, 0b101, 0b111, 0b101, 0b111 },
        '9' => .{ 0b111, 0b101, 0b111, 0b001, 0b111 },
        ' ' => .{ 0, 0, 0, 0, 0 },
        '-' => .{ 0, 0, 0b111, 0, 0 },
        ':' => .{ 0, 0b010, 0, 0b010, 0 },
        '.' => .{ 0, 0, 0, 0, 0b010 },
        '!' => .{ 0b010, 0b010, 0b010, 0, 0b010 },
        else => .{ 0b111, 0b101, 0b111, 0b101, 0b111 },
    };
}

test "buffer clear fills background" {
    var r: Renderer = .{};
    r.seedStars(42);
    r.clear(.{ 0x0B, 0x0E, 0x14 }, 0);
    const px = r.pixels[0];
    try std.testing.expectEqual(@as(Pixel, 0xFF0B0E14), px);
}

test "text width is proportional to length" {
    try std.testing.expectEqual(@as(usize, 12), textWidth("ABC"));
    try std.testing.expectEqual(@as(usize, 4), textWidth("1"));
}

test "drawString writes pixels" {
    var r: Renderer = .{};
    r.seedStars(1);
    r.clear(.{ 0, 0, 0 }, 0);
    r.drawString(.{ .x = 0, .y = 0 }, "!", 0xFFFFFF, 1);
    // '!' has its top pixel at row 0, col 1.
    try std.testing.expectEqual(@as(Pixel, 0xFFFFFFFF), r.pixels[1]);
}

test "fillCircle respects bounds" {
    var r: Renderer = .{};
    r.seedStars(2);
    r.clear(.{ 0, 0, 0 }, 0);
    r.fillCircle(-5, -5, 10, 0xFF0000); // entirely off-screen, must not crash
    r.fillCircle(5, 5, 4, 0xFF0000);
    try std.testing.expectEqual(@as(Pixel, 0xFFFF0000), r.pixels[5 * arena_w + 5]);
}