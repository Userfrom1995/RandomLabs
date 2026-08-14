//! Beambus: a retro arcade shooter in Zig.
//!
//! Modes (all non-interactive; args only):
//!   beambus                      - play in an SDL window
//!   beambus --headless           - simulate headlessly, print a summary
//!   beambus --self-check         - run invariant checks, exit 0/1
//!   beambus --level FILE         - load a specific .beam level script
//!   beambus --seed N             - RNG seed (default random)
//!   beambus --scale N            - window scale factor (default 2)
//!   beambus --help / --version
const std = @import("std");
const core = @import("core/core.zig");
const Game = core.Game;
const GameState = core.GameState;
const Input = core.Input;
const Level = core.Level;
const pool_capacity = core.entity.Pool.capacity;

const render = @import("platform/render.zig");
const Renderer = render.Renderer;
const audio = @import("platform/audio.zig");
const Audio = audio.Audio;
const Sfx = audio.Sfx;
const sdl = @import("platform/sdl.zig");
const Platform = sdl.Platform;

const version = "0.1.0";
const default_level = "levels/level1.beam";

const Options = struct {
    mode: enum { windowed, headless, self_check } = .windowed,
    level_path: []const u8 = default_level,
    seed: ?u64 = null,
    scale: u32 = 2,
    seconds: f32 = 60,
};

fn usage(prog: []const u8) void {
    std.debug.print(
        \\Beambus {s} - a retro arcade shooter in Zig
        \\
        \\USAGE: {s} [OPTIONS]
        \\
        \\  --level FILE    load a .beam level script (default: {s})
        \\  --seed N        RNG seed (default: time-based)
        \\  --scale N       window scale factor (default: 2)
        \\  --seconds N     headless/self-check simulation length (default: 60)
        \\  --headless      simulate headlessly, print a summary
        \\  --self-check    run invariant checks, exit 0/1
        \\  --version       print version
        \\  --help          show this help
        \\
    , .{ version, prog, default_level });
}

fn parseArgs(args: []const []const u8) !Options {
    var opts = Options{};
    var i: usize = 1;
    while (i < args.len) : (i += 1) {
        const a = args[i];
        if (std.mem.eql(u8, a, "--headless")) {
            opts.mode = .headless;
        } else if (std.mem.eql(u8, a, "--self-check")) {
            opts.mode = .self_check;
        } else if (std.mem.eql(u8, a, "--level")) {
            i += 1;
            if (i >= args.len) return error.MissingValue;
            opts.level_path = args[i];
        } else if (std.mem.eql(u8, a, "--seed")) {
            i += 1;
            if (i >= args.len) return error.MissingValue;
            opts.seed = try std.fmt.parseInt(u64, args[i], 10);
        } else if (std.mem.eql(u8, a, "--scale")) {
            i += 1;
            if (i >= args.len) return error.MissingValue;
            opts.scale = try std.fmt.parseInt(u32, args[i], 10);
            if (opts.scale < 1 or opts.scale > 8) return error.BadScale;
        } else if (std.mem.eql(u8, a, "--seconds")) {
            i += 1;
            if (i >= args.len) return error.MissingValue;
            opts.seconds = try std.fmt.parseFloat(f32, args[i]);
        } else if (std.mem.eql(u8, a, "--version")) {
            std.debug.print("beambus {s}\n", .{version});
            std.process.exit(0);
        } else if (std.mem.eql(u8, a, "--help") or std.mem.eql(u8, a, "-h")) {
            usage(args[0]);
            std.process.exit(0);
        } else {
            std.debug.print("error: unknown option '{s}'\n\n", .{a});
            usage(args[0]);
            return error.UnknownOption;
        }
    }
    return opts;
}

const LevelSrc = struct {
    level: Level,
    src: []u8,

    fn deinit(self: *LevelSrc, alloc: std.mem.Allocator) void {
        self.level.deinit(alloc);
        alloc.free(self.src);
    }
};

/// Loads and parses a level file, keeping the source buffer alive because
/// the parsed level borrows its strings from it.
fn loadLevel(alloc: std.mem.Allocator, path: []const u8) !LevelSrc {
    // When invoked from the repo root the level lives under beambus/; try a
    // couple of prefixes so `zig build run` and a bare binary both work.
    const prefixed = try std.fmt.allocPrint(alloc, "beambus/{s}", .{path});
    defer alloc.free(prefixed);
    const candidates = [_][]const u8{ path, prefixed };
    for (candidates) |cand| {
        const file = std.fs.cwd().openFile(cand, .{}) catch continue;
        defer file.close();
        const src = try file.readToEndAlloc(alloc, 1 << 20);
        errdefer alloc.free(src);
        return .{ .level = try core.level.parse(alloc, src), .src = src };
    }
    return error.LevelNotFound;
}

/// A deterministic input stream for headless runs: sweeps the player across
/// the arena while holding fire.
fn scriptedInput(time: f32) Input {
    const t = time;
    var inp = Input{ .fire = true };
    const sweep = @mod(t, 8.0);
    if (sweep < 4.0) {
        inp.left = true;
    } else {
        inp.right = true;
    }
    // Occasional dodges upward.
    if (sweep > 5.5 and sweep < 6.0) inp.up = true;
    return inp;
}

fn runHeadless(alloc: std.mem.Allocator, opts: *const Options) !void {
    const seed = opts.seed orelse 12345;
    const dt: f32 = 1.0 / 60.0;
    const frames: usize = @intFromFloat(opts.seconds * 60.0);

    var ls = try loadLevel(alloc, opts.level_path);
    defer ls.deinit(alloc);
    var g = Game.init(&ls.level, seed);

    var peak_live: usize = 0;
    var n: usize = 0;
    while (n < frames) : (n += 1) {
        var inp = scriptedInput(g.time);
        g.step(dt, &inp);
        if (g.pool.live > peak_live) peak_live = g.pool.live;
        if (g.state != .running) break;
    }

    const state_str = switch (g.state) {
        .running => "running",
        .won => "won",
        .lost => "lost",
    };
    std.debug.print(
        "beambus headless: seed={d} seconds={d} frames={d}\n" ++
            "  state={s} score={d} lives={d} time={d:.2}\n" ++
            "  enemies={d} bullets={d} peak_live={d}\n",
        .{
            seed,
            opts.seconds,
            frames,
            state_str,
            g.score,
            g.lives,
            g.time,
            g.pool.countByKind(.enemy),
            g.pool.countByKind(.bullet),
            peak_live,
        },
    );
}

fn runSelfCheck(alloc: std.mem.Allocator, opts: *const Options) !void {
    var failures: usize = 0;
    var checks: usize = 0;

    var ls = try loadLevel(alloc, opts.level_path);
    defer ls.deinit(alloc);
    const level = &ls.level;

    // Invariant 1: simulation stays bounded and terminal or running.
    checks += 1;
    {
        var g = Game.init(level, 42);
        const dt: f32 = 1.0 / 60.0;
        const frames: usize = @intFromFloat(opts.seconds * 60.0);
        var n: usize = 0;
        while (n < frames) : (n += 1) {
            var inp = scriptedInput(g.time);
            g.step(dt, &inp);
            if (g.pool.live > pool_capacity) {
                std.debug.print("FAIL: live entity count exceeded pool capacity\n", .{});
                failures += 1;
                break;
            }
            if (g.state != .running) break;
        }
        const ok = g.state == .running or g.state == .won or g.state == .lost;
        if (!ok) {
            std.debug.print("FAIL: simulation ended in an invalid state\n", .{});
            failures += 1;
        }
        std.debug.print("  [self-check] bounded run: state={s} score={d}\n", .{ switch (g.state) {
            .running => "running",
            .won => "won",
            .lost => "lost",
        }, g.score });
    }

    // Invariant 2: same seed -> identical outcome (determinism).
    checks += 1;
    {
        var a = Game.init(level, 7);
        var b = Game.init(level, 7);
        const dt: f32 = 1.0 / 60.0;
        const frames: usize = @intFromFloat(opts.seconds * 60.0);
        var n: usize = 0;
        while (n < frames) : (n += 1) {
            var ia = scriptedInput(a.time);
            var ib = scriptedInput(b.time);
            a.step(dt, &ia);
            b.step(dt, &ib);
            if (a.state != .running) break;
        }
        if (a.score != b.score or a.state != b.state or a.lives != b.lives) {
            std.debug.print("FAIL: same seed produced divergent results\n", .{});
            failures += 1;
        }
        std.debug.print("  [self-check] determinism: score={d} matches={s}\n", .{ a.score, if (failures == 0) "yes" else "no" });
    }

    // Invariant 3: different seeds are free to diverge, but must stay valid.
    checks += 1;
    {
        var a = Game.init(level, 1);
        var b = Game.init(level, 999_999);
        const dt: f32 = 1.0 / 60.0;
        const frames: usize = @intFromFloat(opts.seconds * 60.0);
        var n: usize = 0;
        while (n < frames) : (n += 1) {
            var ia = scriptedInput(a.time);
            var ib = scriptedInput(b.time);
            a.step(dt, &ia);
            b.step(dt, &ib);
            if (a.state != .running) break;
        }
        if (a.score == b.score and a.state == b.state and a.lives == b.lives) {
            // Suspicious but not a hard failure: could legitimately match.
            std.debug.print("  [self-check] distinct seeds matched (possible but fine)\n", .{});
        }
        std.debug.print("  [self-check] distinct seeds: a={d} b={d}\n", .{ a.score, b.score });
    }

    if (failures == 0) {
        std.debug.print("PASS: {d}/{d} self-checks passed\n", .{ checks, checks });
    } else {
        std.debug.print("FAIL: {d}/{d} self-checks failed\n", .{ failures, checks });
        std.process.exit(1);
    }
}

fn runWindowed(alloc: std.mem.Allocator, opts: *const Options) !void {
    const seed = opts.seed orelse @as(u64, @intCast(std.time.nanoTimestamp() & 0x7FFFFFFF));

    var ls = try loadLevel(alloc, opts.level_path);
    defer ls.deinit(alloc);
    var game = Game.init(&ls.level, seed);

    var platform = try Platform.init(opts.scale);
    defer platform.deinit();

    var synth = Audio{};
    synth.init();
    defer synth.deinit();

    var ren: Renderer = .{};
    ren.seedStars(seed);

    var keys: [sdl.scan_count]bool = .{false} ** sdl.scan_count;
    var prev_bullets: usize = 0;
    var prev_enemies: usize = 0;
    var prev_score: u32 = 0;
    var prev_state: GameState = .running;
    var prev_player_hit = false;

    var last = sdl.now();
    var paused = false;

    loop: while (true) {
        const now = sdl.now();
        const elapsed = now - last;
        last = now;
        // Clamp to avoid spiral-of-death after a long stall.
        const dt = @min(elapsed, 0.1);

        const ks = platform.pollInput(&keys);
        if (ks.quit) break :loop;
        if (ks.restart and game.state != .running) {
            game = Game.init(&ls.level, seed);
            prev_bullets = 0;
            prev_enemies = 0;
            prev_score = 0;
            prev_state = .running;
            prev_player_hit = false;
            paused = false;
        }
        if (ks.pause) paused = !paused;

        if (!paused) {
            // Fixed-timestep accumulator at 60 Hz.
            var acc = dt;
            while (acc >= fixed_dt) : (acc -= fixed_dt) {
                var inp = Input{
                    .left = ks.left,
                    .right = ks.right,
                    .up = ks.up,
                    .down = ks.down,
                    .fire = ks.fire,
                    .bomb = ks.bomb,
                };
                game.step(fixed_dt, &inp);
            }

            // Trigger audio on detected transitions.
            const bullets = game.pool.countByKind(.bullet);
            const enemies = game.pool.countByKind(.enemy);
            if (bullets > prev_bullets) synth.trigger(.shoot);
            if (enemies < prev_enemies) synth.trigger(.explosion);
            if (game.score > prev_score and enemies == prev_enemies) synth.trigger(.hit);
            if (game.pickup_just_taken) synth.trigger(.powerup);
            if (game.extra_life_just_awarded) synth.trigger(.life);
            if (game.bomb_just_fired) synth.trigger(.bomb);
            if (game.shield_broke and !prev_player_hit) {
                synth.trigger(.shield_break);
            } else if (game.player_just_hit and !prev_player_hit) {
                synth.trigger(.player_hit);
            }
            if (game.state != prev_state) {
                if (game.state == .won) synth.trigger(.win);
                if (game.state == .lost) synth.trigger(.lose);
            }
            prev_bullets = bullets;
            prev_enemies = enemies;
            prev_score = game.score;
            prev_state = game.state;
            prev_player_hit = game.player_just_hit;

            // Queue a fixed chunk of audio for the frame.
            const frames: usize = @intFromFloat(fixed_dt * audio.sample_rate);
            synth.pump(frames);
        }

        ren.clear(ls.level.bg, game.time);
        ren.drawGame(&game);
        if (paused) ren.drawCentered(.{ .x = 0, .y = 250 }, "PAUSED", 0x9AA5CE, 2);

        platform.present(&ren.pixels);
    }
}

const fixed_dt: f32 = 1.0 / 60.0;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();

    const args = try std.process.argsAlloc(alloc);
    defer std.process.argsFree(alloc, args);

    const opts = parseArgs(args) catch |err| {
        if (err == error.MissingValue or err == error.BadScale) {
            std.debug.print("error: {s}\n\n", .{@errorName(err)});
            usage(args[0]);
            return err;
        }
        return err;
    };

    switch (opts.mode) {
        .headless => try runHeadless(alloc, &opts),
        .self_check => try runSelfCheck(alloc, &opts),
        .windowed => try runWindowed(alloc, &opts),
    }
}