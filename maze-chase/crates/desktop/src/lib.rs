//! Native desktop publication layer for Maze Chase.
//!
//! A windowed/fullscreen GUI on the shared deterministic engine: the
//! simulation runs in the session layer (input maps to `TickInput`,
//! rendering reads `Game` state plus drained events), so no gameplay
//! logic lives here. The board pixels come from the shared rasterizer
//! (`maze_chase_terminal::raster`, the same core behind the Kitty and
//! Sixel terminal tiers), so desktop, terminal-bitmap, and (next phase)
//! browser pixels are identical for identical game states.
//!
//! Module map:
//!
//! - [`font`]: original 5x7 pixel typeface for HUD and menus (no font
//!   files, no system dependency).
//! - [`frame`]: XRGB8888 software framebuffer: fill, scaled blits of
//!   [`maze_chase_terminal::raster::PixelFrame`], text, panels.
//! - [`render`]: pure layout plus play-surface composition (board, HUD,
//!   too-small card).
//!
//! Window presentation (winit + softbuffer), keyboard/gamepad input,
//! rodio audio, screens, and the binary arrive as later modules in this
//! phase; each lands with its own tests.

pub mod app;
pub mod cli;
pub mod font;
pub mod frame;
pub mod gamepad;
pub mod input;
pub mod render;
pub mod screens;
pub mod sound;
pub mod window;
