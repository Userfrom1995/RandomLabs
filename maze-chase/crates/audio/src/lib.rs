//! Audio layer for Maze Chase: engine event mapping, original music/SFX
//! data, and backend-agnostic sinks.
//!
//! The deterministic engine (`maze-chase-engine`) emits plain string events
//! (see [`cue::cue_for_event`]). This crate translates those strings into
//! [`cue::Cue`] values, describes original tunes and one-shot effects in
//! [`score`], and accepts them through the [`sink::Audio`] trait so real
//! backends (or the bundled [`sink::NullSink`] / [`sink::RecordSink`])
//! can play them.
//!
//! Pure Rust, std only, no I/O: safe to drive from replays and tests.

pub mod cue;
pub mod score;
pub mod sink;
