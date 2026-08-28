//! Beambus core: the deterministic, headless-testable game simulation.
//! No SDL, no allocator in the per-frame hot path. The platform layer
//! (src/main.zig + src/platform/) renders and drives this.
pub const vec = @import("vec.zig");
pub const Vec2 = vec.Vec2;
pub const rng = @import("rng.zig");
pub const Rng = rng.Rng;
pub const rect = @import("rect.zig");
pub const Rect = rect.Rect;
pub const entity = @import("entity.zig");
pub const Entity = entity.Entity;
pub const Kind = entity.Kind;
pub const Pool = entity.Pool;
pub const level = @import("level.zig");
pub const Level = level.Level;
pub const Wave = level.Wave;
pub const Boss = level.Boss;
pub const Pattern = level.Pattern;
pub const PowerKind = level.PowerKind;
pub const PowerupSpawn = level.PowerupSpawn;
pub const game = @import("game.zig");
pub const Game = game.Game;
pub const Input = game.Input;
pub const GameState = game.GameState;
pub const arena_w = game.arena_w;
pub const arena_h = game.arena_h;

test {
    _ = @import("vec.zig");
    _ = @import("rng.zig");
    _ = @import("rect.zig");
    _ = @import("entity.zig");
    _ = @import("level.zig");
    _ = @import("game.zig");
}