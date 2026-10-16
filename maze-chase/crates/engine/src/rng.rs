//! Seeded PRNG with split streams.
//!
//! Simulation determinism rule: visual-only changes must never alter
//! simulation hashes. Each subsystem (wander steering, fright choice, future
//! fruit timing) draws from its own named stream forked from one master
//! seed, so adding a new consumer cannot shift the sequence of an existing
//! one. Name mixing uses SHA-256 over the stream name, never a salted
//! hasher, so streams are identical across processes and machines.
//!
//! The stream core is mulberry32 with wrapping 32-bit arithmetic, kept
//! bit-exact with the Python feel reference (`pacman/src/engine/rng.py`)
//! so cross-implementation vectors can be compared during development.
//! Behavior implementations must never depend on matching the Python
//! reference's outputs; the vectors below only pin this crate's own
//! determinism.

use crate::sha256;

/// One deterministic 32-bit stream (mulberry32).
#[derive(Clone, Debug)]
pub struct RngStream {
    state: u32,
}

impl RngStream {
    /// Seed a stream directly (already mixed).
    pub fn new(seed: u32) -> Self {
        Self { state: seed }
    }

    /// Next raw word. Textbook mulberry32: advance, then temper.
    ///
    /// Bit-exactness note: the reference port (`pacman/src/engine/rng.py`)
    /// runs the middle `z ^ (z + m)` step in unbounded integers, so bit 32
    /// of the sum leaks into the final shift-xor. This port replicates the
    /// leak with a 64-bit middle step and masks only at the end; a plain
    /// wrapping-u32 temper diverges whenever `z + m` overflows.
    pub fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_add(0x6D2B_79F5);
        let z = self.state;
        let z = (z ^ (z >> 15)).wrapping_mul(z | 1);
        let m = (z ^ (z >> 7)).wrapping_mul(z | 61);
        let wide = (z as u64) ^ (z as u64 + m as u64);
        ((wide ^ (wide >> 14)) & 0xFFFF_FFFF) as u32
    }

    /// Uniform integer in `0..n`. Panics for `n == 0`.
    pub fn next_bounded(&mut self, n: usize) -> usize {
        assert!(n >= 1, "next_bounded needs n >= 1");
        (self.next_u32() as usize) % n
    }

    /// Uniform float in `[0, 1)`.
    pub fn next_f32(&mut self) -> f32 {
        self.next_u32() as f32 / 4_294_967_296.0
    }
}

fn splitmix32(seed: u32) -> u32 {
    let seed = seed.wrapping_add(0x9E37_79B9);
    let mut z = seed;
    z = (z ^ (z >> 16)).wrapping_mul(0x21F0_AAAD);
    z = (z ^ (z >> 15)).wrapping_mul(0x735A_2D97);
    let z = z ^ (z >> 15);
    if z == 0 {
        1
    } else {
        z
    }
}

/// Master seed with forkable named subsystem streams.
#[derive(Clone, Debug)]
pub struct Rng {
    seed: u32,
    streams: Vec<(String, RngStream)>,
}

impl Rng {
    /// Master seed (low 32 bits significant).
    pub fn new(seed: u64) -> Self {
        Self {
            seed: seed as u32,
            streams: Vec::new(),
        }
    }

    /// Fork (or re-fetch) the named subsystem stream. The first fork for a
    /// name mixes `seed XOR sha256(name)[..4]` through splitmix32; later
    /// forks of the same name return the live stream, so sequence position
    /// is preserved across ticks.
    pub fn fork(&mut self, name: &str) -> &mut RngStream {
        if let Some(pos) = self.streams.iter().position(|(n, _)| n == name) {
            return &mut self.streams[pos].1;
        }
        let digest = sha256::digest(name.as_bytes());
        let mix = u32::from_le_bytes([digest[0], digest[1], digest[2], digest[3]]);
        let stream = RngStream::new(splitmix32(self.seed ^ mix));
        self.streams.push((name.to_string(), stream));
        let last = self.streams.len() - 1;
        &mut self.streams[last].1
    }

    /// Canonical seed string for hashes and logs.
    pub fn seed(&self) -> u32 {
        self.seed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Vectors generated from the Python feel reference
    /// (`RngStream(0).next_u32()` x5 and `RngStream(12345)` x3). They pin
    /// bit-exactness of this port; gameplay must never depend on them.
    #[test]
    fn mulberry32_matches_reference_vectors() {
        let mut s = RngStream::new(0);
        let first_five: Vec<u32> = (0..5).map(|_| s.next_u32()).collect();
        assert_eq!(
            first_five,
            [
                0x4430_B462,
                0x0159_C37,
                0x392C_5B08,
                0x2569_8104,
                0x77A6_CBD4
            ],
            "mulberry32(0) drifted from the reference port"
        );
        let mut t = RngStream::new(12345);
        let three: Vec<u32> = (0..3).map(|_| t.next_u32()).collect();
        assert_eq!(three, [0xFACF_78C5, 0x4E87_5100, 0x7BF0_E2F2]);
    }

    #[test]
    fn fork_is_stable_and_independent() {
        let mut a = Rng::new(7);
        let x: Vec<u32> = (0..4).map(|_| a.fork("wander").next_u32()).collect();
        let mut b = Rng::new(7);
        let y: Vec<u32> = (0..4).map(|_| b.fork("wander").next_u32()).collect();
        assert_eq!(x, y, "same seed+name must replay");
        // A second stream must not disturb the first.
        let mut c = Rng::new(7);
        for _ in 0..4 {
            c.fork("wander").next_u32();
        }
        let mut d = Rng::new(7);
        d.fork("other").next_u32();
        let z: Vec<u32> = (0..4).map(|_| d.fork("wander").next_u32()).collect();
        assert_eq!(x, z, "new consumers must not shift existing streams");
    }
}
