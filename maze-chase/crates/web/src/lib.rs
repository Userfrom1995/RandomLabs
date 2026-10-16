//! Browser WebAssembly publication layer for Maze Chase.
//!
//! One shared engine, zero gameplay logic here: this crate maps web input
//! (keyboard codes, touch swipes) to [`maze_chase_engine::actors::TickInput`],
//! runs the fixed-step session, and paints an RGBA board frame the
//! JavaScript harness blits to `<canvas>`. All menus, HUD text, and audio
//! synthesis live in the JS harness (`maze-chase/web/maze-chase.js`); Rust
//! owns game flow, scores logic, settings state, and the pixel board.
//!
//! The wasm boundary is a plain C ABI (`bridge`): no `wasm-bindgen`, no
//! build-time JS glue, so the `.wasm` artifact is reproducible with stock
//! `cargo build --target wasm32-unknown-unknown` and committed under
//! `maze-chase/web/` for GitHub Pages.

pub mod audio_map;
pub mod bridge;
pub mod input;
pub mod scores;
pub mod session;
pub mod video;
