//! Layer-neutral configuration for Maze Chase.
//!
//! This crate maps player-facing settings onto the shipped engine API only:
//! difficulty selects a [`crate::settings::EnginePreset`] (a
//! `maze_chase_engine::modes::GameMode` plus a start level), which layers
//! pass to `Game::with_mode(seed, level, mode)`. It never reimplements or
//! branches gameplay itself, so replays recorded from the preset stay
//! portable across layers.
//!
//! - [`settings`]: difficulty presets, volume / theme / accessibility flags.
//! - [`keymap`]: layer-neutral key bindings (arrows plus WASD by default).
//! - [`persist`]: hand-rolled `key = value` text save / load (std only).

pub mod keymap;
pub mod persist;
pub mod settings;

pub use keymap::{Action, Key, Keymap};
pub use settings::{preset, Difficulty, EnginePreset, Settings};
