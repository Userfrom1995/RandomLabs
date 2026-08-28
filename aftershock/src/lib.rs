//! Aftershock: a seismic network simulator in Rust.
//!
//! Models an earthquake on a fault grid, propagates P, S, and surface waves
//! to stations at physically-motivated travel times, renders terminal
//! seismograms, and exports waveform CSVs. Standard library only.

pub mod cli;
pub mod export;
pub mod model;
pub mod physics;
pub mod render;
pub mod rng;
pub mod waveform;
