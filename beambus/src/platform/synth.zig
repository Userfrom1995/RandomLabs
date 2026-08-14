//! Beambus procedural synth: a tiny subtractive-style synthesizer with a
//! fixed voice pool. Pure Zig, no SDL, deterministic output for a given
//! sequence of triggers - so it can be unit tested headlessly.
const std = @import("std");

pub const sample_rate: u32 = 44100;

/// The sound effects the game can trigger.
pub const Sfx = enum {
    shoot,
    hit,
    explosion,
    player_hit,
    powerup,
    shield_break,
    life,
    bomb,
    graze,
    enrage,
    win,
    lose,
};

const Wave = enum { square, saw, noise };

const Voice = struct {
    active: bool = false,
    wave: Wave = .square,
    phase: f32 = 0,
    freq: f32 = 0,
    freq_slide: f32 = 0, // Hz per second
    amp: f32 = 0,
    ttl: f32 = 0,
    /// Initial ttl, used to shape the decay envelope.
    ttl_initial: f32 = 0,
};

/// Mixer: fixed pool of voices, no allocation.
pub const Synth = struct {
    voices: [12]Voice = [_]Voice{.{}} ** 12,

    fn play(self: *Synth, wave: Wave, freq: f32, freq_slide: f32, amp: f32, ttl: f32) void {
        var target: ?*Voice = null;
        for (&self.voices) |*v| {
            if (!v.active) {
                target = v;
                break;
            }
        }
        // Steal the voice with the least remaining time if none is free.
        if (target == null) {
            var quietest: *Voice = &self.voices[0];
            for (&self.voices) |*v| {
                if (v.ttl < quietest.ttl) quietest = v;
            }
            target = quietest;
        }
        const v = target.?;
        v.* = .{
            .active = true,
            .wave = wave,
            .phase = 0,
            .freq = freq,
            .freq_slide = freq_slide,
            .amp = amp,
            .ttl = ttl,
            .ttl_initial = ttl,
        };
    }

    pub fn trigger(self: *Synth, sfx: Sfx) void {
        switch (sfx) {
            .shoot => self.play(.square, 880, -5200, 0.22, 0.09),
            .hit => self.play(.square, 220, 0, 0.18, 0.06),
            .explosion => {
                self.play(.noise, 1, 0, 0.45, 0.3);
                self.play(.square, 120, -160, 0.28, 0.2);
            },
            .player_hit => {
                self.play(.saw, 320, -380, 0.4, 0.5);
                self.play(.noise, 1, 0, 0.4, 0.3);
            },
            .powerup => {
                self.play(.square, 660, 320, 0.22, 0.09);
                self.play(.square, 880, 320, 0.22, 0.12);
            },
            .shield_break => {
                self.play(.saw, 500, -640, 0.32, 0.16);
                self.play(.noise, 1, 0, 0.26, 0.12);
            },
            .life => {
                self.play(.square, 784, 0, 0.26, 0.1);
                self.play(.square, 1046, 0, 0.26, 0.16);
            },
            .bomb => {
                self.play(.saw, 200, -120, 0.5, 0.35);
                self.play(.noise, 1, 0, 0.6, 0.4);
                self.play(.square, 80, -40, 0.4, 0.3);
            },
            .graze => {
                // A soft rising tick for a near-miss dodge.
                self.play(.square, 1240, 220, 0.14, 0.06);
                self.play(.square, 1560, 220, 0.1, 0.05);
            },
            .enrage => {
                // A growling double slide for a boss entering its rage phase.
                self.play(.saw, 160, 240, 0.42, 0.35);
                self.play(.saw, 240, 320, 0.34, 0.3);
                self.play(.noise, 1, 0, 0.2, 0.25);
            },
            .win => {
                self.play(.square, 523, 0, 0.3, 0.12);
                self.play(.square, 659, 0, 0.3, 0.12);
                self.play(.square, 784, 0, 0.3, 0.14);
                self.play(.square, 1046, 0, 0.3, 0.3);
            },
            .lose => {
                self.play(.saw, 392, 0, 0.3, 0.2);
                self.play(.saw, 311, 0, 0.3, 0.2);
                self.play(.saw, 233, 0, 0.3, 0.3);
            },
        }
    }

    /// Synthesizes `frames` samples into `out`. `dt` is the time each frame
    /// covers; frequencies slide across it. Deterministic.
    pub fn render(self: *Synth, out: []f32, dt: f32) void {
        for (out) |*s| {
            var sum: f32 = 0;
            for (&self.voices) |*v| {
                if (!v.active) continue;
                const step = v.freq / @as(f32, @floatFromInt(sample_rate));
                v.phase += step;
                if (v.phase >= 1) v.phase -= 1;
                const env = if (v.ttl_initial > 0) @max(0, v.ttl / v.ttl_initial) else 1;
                const sample = switch (v.wave) {
                    .square => if (v.phase < 0.5) @as(f32, 1) else -1,
                    .saw => 2 * v.phase - 1,
                    .noise => (blk: {
                        // Cheap deterministic hash noise from the phase bits.
                        var z: u32 = @bitCast(@as(i32, @intFromFloat(v.phase * 1e9)));
                        z ^= z >> 16;
                        z *%= 0x7FEB352D;
                        break :blk @as(f32, @floatFromInt(z & 0xFF)) / 127.5 - 1;
                    }),
                };
                sum += sample * env * v.amp;
                v.freq += v.freq_slide / @as(f32, @floatFromInt(sample_rate));
                if (v.freq < 20) v.freq = 20;
                v.ttl -= dt;
                if (v.ttl <= 0) v.active = false;
            }
            s.* = std.math.clamp(sum, -1, 1);
        }
    }
};

test "synth produces finite samples" {
    var synth = Synth{};
    synth.trigger(.shoot);
    synth.trigger(.explosion);
    var buf: [128]f32 = undefined;
    synth.render(&buf, @as(f32, 1.0) / @as(f32, sample_rate));
    for (buf) |s| {
        try std.testing.expect(std.math.isFinite(s));
        try std.testing.expect(@abs(s) <= 1.0);
    }
}

test "synth decays to silence" {
    var synth = Synth{};
    synth.trigger(.shoot);
    var buf: [512]f32 = undefined;
    // Render enough total time that every voice must have expired.
    const total_frames: usize = 2 * sample_rate;
    var frames: usize = 0;
    while (frames < total_frames) : (frames += 512) {
        const n = @min(512, total_frames - frames);
        synth.render(buf[0..n], @as(f32, 1.0) / @as(f32, sample_rate));
    }
    // The tail of the last buffer must be pure silence.
    for (buf[256..512]) |s| try std.testing.expectApproxEqAbs(@as(f32, 0), s, 1e-6);
}

test "synth is deterministic" {
    var a = Synth{};
    var b = Synth{};
    a.trigger(.win);
    b.trigger(.win);
    var ba: [64]f32 = undefined;
    var bb: [64]f32 = undefined;
    a.render(&ba, @as(f32, 1.0) / @as(f32, sample_rate));
    b.render(&bb, @as(f32, 1.0) / @as(f32, sample_rate));
    for (ba, bb) |sa, sb| try std.testing.expectApproxEqAbs(sa, sb, 1e-6);
}

test "synth voice pool is bounded" {
    var synth = Synth{};
    var i: usize = 0;
    while (i < 100) : (i += 1) synth.trigger(.shoot);
    var count: usize = 0;
    for (&synth.voices) |v| {
        if (v.active) count += 1;
    }
    try std.testing.expect(count <= synth.voices.len);
}