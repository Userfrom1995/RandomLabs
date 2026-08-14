const std = @import("std");
const Vec2 = @import("vec.zig").Vec2;

pub const Rect = struct {
    x: f32,
    y: f32,
    w: f32,
    h: f32,

    pub fn containsPoint(self: Rect, p: Vec2) bool {
        return p.x >= self.x and p.x <= self.x + self.w and
            p.y >= self.y and p.y <= self.y + self.h;
    }

    pub fn overlaps(self: Rect, other: Rect) bool {
        return self.x < other.x + other.w and
            self.x + self.w > other.x and
            self.y < other.y + other.h and
            self.y + self.h > other.y;
    }

    /// Distance from a point to the rect, 0 when inside.
    pub fn distanceToPoint(self: Rect, p: Vec2) f32 {
        const dx = @max(@max(self.x - p.x, 0), p.x - (self.x + self.w));
        const dy = @max(@max(self.y - p.y, 0), p.y - (self.y + self.h));
        return @sqrt(dx * dx + dy * dy);
    }
};

test "rect contains point" {
    const r = Rect{ .x = 0, .y = 0, .w = 10, .h = 10 };
    try std.testing.expect(r.containsPoint(.{ .x = 5, .y = 5 }));
    try std.testing.expect(!r.containsPoint(.{ .x = 11, .y = 5 }));
    try std.testing.expect(!r.containsPoint(.{ .x = -1, .y = 5 }));
}

test "rect overlap" {
    const a = Rect{ .x = 0, .y = 0, .w = 10, .h = 10 };
    const b = Rect{ .x = 5, .y = 5, .w = 10, .h = 10 };
    const c = Rect{ .x = 20, .y = 20, .w = 1, .h = 1 };
    try std.testing.expect(a.overlaps(b));
    try std.testing.expect(!a.overlaps(c));
}

test "rect distance to point" {
    const r = Rect{ .x = 0, .y = 0, .w = 10, .h = 10 };
    try std.testing.expectApproxEqAbs(@as(f32, 0), r.distanceToPoint(.{ .x = 5, .y = 5 }), 1e-5);
    try std.testing.expectApproxEqAbs(@as(f32, 5), r.distanceToPoint(.{ .x = 15, .y = 5 }), 1e-5);
}