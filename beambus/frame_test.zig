const std = @import("std");
const core = @import("src/core/core.zig");
const render = @import("src/platform/render.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();
    const file = try std.fs.cwd().openFile("levels/level1.beam", .{});
    defer file.close();
    const src = try file.readToEndAlloc(alloc, 1 << 20);
    var level = try core.level.parse(alloc, src);
    defer level.deinit(alloc);
    var g = core.Game.init(&level, 42);
    var inp = core.Input{ .fire = true, .left = true };
    var n: usize = 0;
    while (n < 60 * 12) : (n += 1) {
        g.step(1.0/60.0, &inp);
        if (n > 60 * 10) inp.left = false;
    }
    var ren: render.Renderer = .{};
    ren.seedStars(42);
    ren.clear(level.bg, g.time);
    ren.drawGame(&g);
    // write PPM
    const out = try std.fs.cwd().createFile("/tmp/opencode/frame.ppm", .{});
    defer out.close();
    try out.writer().print("P6\n{d} {d}\n255\n", .{ core.arena_w, core.arena_h });
    var buf: [core.arena_w * core.arena_h * 3]u8 = undefined;
    for (ren.pixels, 0..) |px, i| {
        buf[i*3] = @truncate(px >> 16);
        buf[i*3+1] = @truncate(px >> 8);
        buf[i*3+2] = @truncate(px);
    }
    try out.writeAll(&buf);
    std.debug.print("score={d} state={any} wrote frame.ppm\n", .{g.score, g.state});
}
