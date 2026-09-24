//! Aggregates every SDL-free module for the headless test step: the
//! deterministic core plus the pure renderer and synth. The SDL glue
//! (platform/sdl.zig, platform/audio.zig) is exercised by the exe build.
const std = @import("std");

test {
    // All modules live in the same root module, so these path imports
    // transitively collect every test block (module-boundary imports do not).
    _ = @import("core/core.zig");
    _ = @import("platform/render.zig");
    _ = @import("platform/synth.zig");
}