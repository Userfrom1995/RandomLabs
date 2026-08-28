const std = @import("std");

/// Directory that contains SDL2 headers (SDL.h). Tries common system paths.
fn sdlIncludePath() []const u8 {
    const candidates = [_][]const u8{
        "/usr/include/SDL2",
        "/usr/local/include/SDL2",
        "/opt/homebrew/include/SDL2",
        "/opt/local/include/SDL2",
    };
    inline for (candidates) |p| {
        if (std.fs.cwd().access(p ++ "/SDL.h", .{})) |_| {
            return p;
        } else |_| {}
    }
    std.debug.print(
        \\error: SDL2 headers (SDL.h) were not found in any standard location.
        \\Install libsdl2-dev (Debian/Ubuntu), sdl2-devel (Fedora), or the SDL2
        \\development package for your system, then rebuild.
        \\
    , .{});
    std.process.exit(2);
}

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseSafe });

    // Everything lives in one module so the headless test step collects every
    // module's test blocks transitively (module-boundary imports do not).
    const exe = b.addExecutable(.{
        .name = "beambus",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    exe.linkSystemLibrary("SDL2");
    exe.linkLibC();
    exe.root_module.addIncludePath(.{ .cwd_relative = sdlIncludePath() });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| run_cmd.addArgs(args);
    const run_step = b.step("run", "Run the game (windowed by default)");
    run_step.dependOn(&run_cmd.step);

    // Headless self-check: asserts core invariants without opening a window.
    const check_cmd = b.addRunArtifact(exe);
    check_cmd.addArgs(&.{ "--self-check" });
    check_cmd.step.dependOn(b.getInstallStep());
    const check_step = b.step("check", "Run the headless self-check (no window)");
    check_step.dependOn(&check_cmd.step);

    const tests = b.addTest(.{
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/test_all.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    const run_tests = b.addRunArtifact(tests);
    const test_step = b.step("test", "Run core logic tests (headless, no SDL)");
    test_step.dependOn(&run_tests.step);
}
