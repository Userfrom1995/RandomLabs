//! Shared deterministic simulation engine for Maze Chase.
//!
//! Phase 2 (core loop): fixed 120 Hz timestep, original maze, tile-center
//! movement with buffered turns and cornering assist, dot/energizer pickup,
//! scoring with ghost chains and an extra life, lives with death/respawn,
//! level-clear flow, seeded per-subsystem RNG streams, replay log plus
//! SHA-256 state hash, and a headless verify harness.
//!
//! The engine performs no I/O and depends on no crates: replays and hashes
//! are identical on every platform. Publication layers (terminal, desktop,
//! WASM) map input to [`TickInput`] and render [`Game`] state plus events;
//! any gameplay branch inside a layer crate is a blocking review finding.
//!
//! Phase 3 owns: the four authored warden personalities, the scatter/chase
//! wave clock, fright flash staging, eyes that drift home, bonus relishes,
//! difficulty pursuer stages, and extra mode rules. This phase ships a
//! [`steering::WanderSteering`] baseline behind the [`steering::Steer`]
//! trait so Phase 3 upgrades steering without touching the core loop.

pub mod actors;
pub mod game;
pub mod ghosts;
pub mod maze;
pub mod replay;
pub mod rng;
pub mod sha256;
pub mod steering;
pub mod tuning;
pub mod verify;

pub use actors::{Actor, Dir, TickInput};
pub use game::Game;
pub use maze::Maze;
