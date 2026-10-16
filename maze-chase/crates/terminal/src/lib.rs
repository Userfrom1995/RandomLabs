//! Fullscreen terminal publication layer for Maze Chase.
//!
//! One terminal game on the shared deterministic engine: the simulation
//! runs in [`app::App`] (input maps to `TickInput`, rendering reads `Game`
//! state plus drained events), so no gameplay logic lives here. Rendering
//! picks one of three tiers in [`backend`]: bitmap [`kitty`] graphics on
//! Kitty-family terminals, [`sixel`] pixels where the terminal answers the
//! Sixel probe, and a 24-bit/16-color [`unicode`] cell renderer everywhere
//! else. [`layout`] fits the 28x31 maze plus HUD into any window and
//! re-fits on resize; [`screens`] owns menus, help, scores, and settings.

pub mod app;
pub mod backend;
pub mod chime;
pub mod chrome;
pub mod input;
pub mod kitty;
pub mod layout;
pub mod raster;
pub mod scores;
pub mod screens;
pub mod sixel;
pub mod unicode;
