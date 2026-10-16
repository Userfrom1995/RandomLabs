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
//! Phase 3 (shipped): the four authored warden personalities
//! ([`personalities`]), the scatter/chase [`modes::WaveClock`] with
//! reversals, eyes that drift home, bonus [`relish`]es, pursuer stages,
//! and extra [`modes::GameMode`] rules. [`steering::WanderSteering`]
//! remains as the tested deterministic baseline behind the
//! [`steering::Steer`] trait; frightened wardens wander from their own
//! seeded stream while personalities hunt.

pub mod actors;
pub mod game;
pub mod ghosts;
pub mod maze;
pub mod modes;
pub mod personalities;
pub mod relish;
pub mod replay;
pub mod rng;
pub mod sha256;
pub mod steering;
pub mod tuning;
pub mod verify;

pub use actors::{Actor, Dir, TickInput};
pub use game::Game;
pub use maze::Maze;
