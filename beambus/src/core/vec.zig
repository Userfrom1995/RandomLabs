const std = @import("std");

pub const Vec2 = struct {
    x: f32,
    y: f32,

    pub const zero: Vec2 = .{ .x = 0, .y = 0 };

    pub fn add(a: Vec2, b: Vec2) Vec2 {
        return .{ .x = a.x + b.x, .y = a.y + b.y };
    }

    pub fn sub(a: Vec2, b: Vec2) Vec2 {
        return .{ .x = a.x - b.x, .y = a.y - b.y };
    }

    pub fn scale(a: Vec2, s: f32) Vec2 {
        return .{ .x = a.x * s, .y = a.y * s };
    }

    pub fn lengthSq(a: Vec2) f32 {
        return a.x * a.x + a.y * a.y;
    }

    pub fn length(a: Vec2) f32 {
        return @sqrt(a.lengthSq());
    }

    pub fn normalized(a: Vec2) Vec2 {
        const len = a.length();
        if (len <= std.math.floatEps(f32)) return .zero;
        return a.scale(1.0 / len);
    }

    pub fn distance(a: Vec2, b: Vec2) f32 {
        return a.sub(b).length();
    }

    pub fn lerp(a: Vec2, b: Vec2, t: f32) Vec2 {
        return .{ .x = a.x + (b.x - a.x) * t, .y = a.y + (b.y - a.y) * t };
    }

    pub fn clamp(v: Vec2, min_x: f32, min_y: f32, max_x: f32, max_y: f32) Vec2 {
        return .{
            .x = std.math.clamp(v.x, min_x, max_x),
            .y = std.math.clamp(v.y, min_y, max_y),
        };
    }

    /// Rotates a vector by `ang` radians (counter-clockwise).
    pub fn rotate(v: Vec2, ang: f32) Vec2 {
        const c = @cos(ang);
        const s = @sin(ang);
        return .{ .x = v.x * c - v.y * s, .y = v.x * s + v.y * c };
    }
};

test "vec arithmetic" {
    const a = Vec2{ .x = 3, .y = 4 };
    try std.testing.expectApproxEqAbs(@as(f32, 5), a.length(), 1e-5);
    const n = a.normalized();
    try std.testing.expectApproxEqAbs(@as(f32, 1), n.length(), 1e-5);
    const c = a.clamp(0, 0, 2, 2);
    try std.testing.expectEqual(@as(f32, 2), c.x);
    try std.testing.expectEqual(@as(f32, 2), c.y);
    const l = Vec2.lerp(.{ .x = 0, .y = 0 }, .{ .x = 10, .y = 10 }, 0.5);
    try std.testing.expectEqual(@as(f32, 5), l.x);
}

test "vec zero normalized is zero" {
    const z = Vec2.zero.normalized();
    try std.testing.expectEqual(@as(f32, 0), z.x);
    try std.testing.expectEqual(@as(f32, 0), z.y);
}

test "vec rotate keeps length" {
    const v = Vec2{ .x = 1, .y = 0 };
    const r = v.rotate(0.5);
    try std.testing.expectApproxEqAbs(@as(f32, 1), r.length(), 1e-5);
    const quarter = v.rotate(0.5 * std.math.pi);
    try std.testing.expectApproxEqAbs(@as(f32, 0), quarter.x, 1e-5);
    try std.testing.expectApproxEqAbs(@as(f32, 1), quarter.y, 1e-5);
}