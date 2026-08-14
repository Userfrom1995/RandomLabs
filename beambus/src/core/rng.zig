const std = @import("std");

pub const Rng = struct {
    state: u64,

    /// SplitMix64 step, deterministic for a given seed.
    pub fn next(self: *Rng) u64 {
        self.state +%= 0x9E3779B97F4A7C15;
        var z = self.state;
        z = (z ^ (z >> 30)) *% 0xBF58476D1CE4E5B9;
        z = (z ^ (z >> 27)) *% 0x94D049BB133111EB;
        return z ^ (z >> 31);
    }

    /// Uniform float in [0, 1).
    pub fn nextF32(self: *Rng) f32 {
        return @as(f32, @floatFromInt(self.next() >> 40)) / @as(f32, 1 << 24);
    }

    /// Uniform float in [lo, hi).
    pub fn range(self: *Rng, lo: f32, hi: f32) f32 {
        return lo + (hi - lo) * self.nextF32();
    }

    /// Uniform integer in [lo, hi] inclusive.
    pub fn intInclusive(self: *Rng, lo: usize, hi: usize) usize {
        const span = hi - lo + 1;
        return lo + @as(usize, @intCast(self.next() % span));
    }

    /// Random point on the unit circle.
    pub fn onUnitCircle(self: *Rng) Vec2 {
        const ang = self.range(0, std.math.tau);
        return .{ .x = @cos(ang), .y = @sin(ang) };
    }
};

const Vec2 = @import("vec.zig").Vec2;

test "rng is deterministic per seed" {
    var a = Rng{ .state = 42 };
    var b = Rng{ .state = 42 };
    var i: usize = 0;
    while (i < 1000) : (i += 1) {
        try std.testing.expectEqual(a.next(), b.next());
    }
}

test "rng differs across seeds" {
    var a = Rng{ .state = 1 };
    var b = Rng{ .state = 2 };
    var same: usize = 0;
    var i: usize = 0;
    while (i < 100) : (i += 1) {
        if (a.next() == b.next()) same += 1;
    }
    try std.testing.expect(same < 10);
}

test "rng f32 stays in [0,1)" {
    var r = Rng{ .state = 7 };
    var i: usize = 0;
    while (i < 1000) : (i += 1) {
        const v = r.nextF32();
        try std.testing.expect(v >= 0 and v < 1);
    }
}

test "rng range respects bounds" {
    var r = Rng{ .state = 99 };
    var i: usize = 0;
    while (i < 1000) : (i += 1) {
        const v = r.range(-5, 5);
        try std.testing.expect(v >= -5 and v < 5);
    }
}

test "rng onUnitCircle has unit length" {
    var r = Rng{ .state = 123 };
    var i: usize = 0;
    while (i < 100) : (i += 1) {
        const v = r.onUnitCircle();
        try std.testing.expectApproxEqAbs(@as(f32, 1), v.length(), 1e-4);
    }
}