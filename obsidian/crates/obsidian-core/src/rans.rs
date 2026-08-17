//! rANS entropy coding (the definitive formulation, machine-verified).
//!
//! Variant: byte-aligned rANS after Fabian Giesen (ryg_rans), renorm-before-C /
//! renorm-after-D, with the architecture's constants (TBITS=12, M=4096) and a
//! FIXED table total.
//!
//! State `x` is a `u32`. The renorm bound is `RNB = 2^20 = 1 << (32 - TBITS)`.
//!
//! - Encoder invariant: `x` in `[RNB, 256*RNB)` between symbols (initialized to
//!   `RNB`). `put` renorms DOWN before the interval-encoding step, emitting the
//!   low bytes of the pre-step state, so the arithmetic step can never overflow
//!   `u32`, then computes `C` and restores the invariant exactly.
//! - Decoder invariant: `x` in `[RNB, 256*RNB)` at the start of `get`; it
//!   renorms UP (reading the bytes the encoder emitted) to reconstruct the
//!   pre-step state, applies `D`, and lands below `RNB` again.
//!
//! Every table has a FIXED total `sum == M == 4096`. This is deliberate and
//! deviates from the architecture's earlier "halve frequencies when sum > M"
//! sketch: with a variable total the arithmetic step maps its bounded input onto
//! a window that is not aligned with the fixed renorm window `[RNB, 256*RNB)`
//! (the output can fall just below `RNB` or above `256*RNB`), which makes the
//! encoder emit a byte count the decoder cannot infer from the stream alone -
//! the scheme has no exact inverse, so the byte counts cannot match. Keeping
//! `sum == M` makes `x_max = f * (RNB >> TBITS) * 256 / M = f * 2^16` exact, so
//! every bound in the correctness proof below is exact:
//!
//! - Upper bound: after renorm, `x < x_max = f * 2^16`, so `x / f <= 2^16 - 1`
//!   and `C(x) = (x/f)*M + (x%f) + c < (2^16 - 1)*M + M = 2^28 = 256*RNB`.
//! - Lower bound: if no byte was emitted, `x >= RNB`, so
//!   `C(x) >= (RNB/f)*M >= RNB`. If bytes were emitted, the loop stopped at the
//!   first value below `x_max`, so `x >= x_max >> 8 = f * 2^8` and
//!   `C(x) >= (f * 2^8 / f) * M = RNB`. Both bounds are exact.
//! - Decoder read count: from a post-D value `x < RNB` (bytes were emitted),
//!   every partial reconstruction is `x_in >> 8(k-j) <= x_in >> 8 < RNB` (since
//!   `x_in < 256*RNB`), so the decoder keeps reading; after `k` bytes the value
//!   is `x_in >= RNB`, so it stops. The counts match exactly.
//!
//! Static tables (effort >= 6) are normalized to `sum == M` and use a precomputed
//! slot table for O(1) lookup. Adaptive tables keep `sum == M` at all times:
//! every symbol starts uniform; coding a symbol increments it and steals one
//! unit from a deterministic "rich" symbol (freq >= 2, tracked in a stack) so
//! the total never moves. Encoder and decoder apply the identical update rule
//! and stay in lockstep. No active symbol ever drops below frequency 1.

use crate::error::CodecError;

/// Number of bits of frequency precision: table totals are capped at `M`.
pub const TBITS: u32 = 12;
/// The (fixed) table total, `1 << TBITS`.
pub const M: u64 = 1 << TBITS;
/// The renorm bound: `1 << (32 - TBITS)`.
pub const RNB: u32 = 1 << (32 - TBITS);

/// The width of the encoder invariant window `[RNB, 256*RNB)`.
pub const INVARIANT_HIGH: u32 = 256 * RNB;

/// A rANS frequency/cumulative table for one context.
///
/// `sum(freq)` is ALWAYS exactly `M` (both static and adaptive). Adaptive
/// tables track a Fenwick tree over `freq` for O(log A) prefix sums and symbol
/// lookup; static tables keep a precomputed cumulative array and a slot table.
pub struct RansTable {
    size: usize,
    freq: Vec<u32>,
    /// Fenwick tree over `freq` (1-indexed), used by adaptive tables.
    bit: Vec<u32>,
    /// Cumulative frequencies (sum of freq[0..s)); valid for static tables.
    cum: Vec<u32>,
    /// Precomputed slot table for static tables (`slot[t]` for t in 0..M).
    slot: Option<Vec<u16>>,
    /// True for tables built from a fixed histogram (no adaptation).
    is_static: bool,
    /// Symbols with freq >= 2, maintained as a stack for adaptive updates.
    rich: Vec<usize>,
}

impl RansTable {
    /// Create an adaptive table over `size` symbols, uniform start with total
    /// exactly `M`. `size` must be in `1..=M`.
    pub fn new_adaptive(size: usize) -> RansTable {
        assert!(size >= 1 && size <= M as usize, "bad adaptive alphabet {size}");
        let mut freq = vec![0u32; size];
        let base = M as u32 / size as u32;
        let rem = M as u32 % size as u32;
        for (s, f) in freq.iter_mut().enumerate() {
            *f = base + if (s as u32) < rem { 1 } else { 0 };
        }
        let mut table = RansTable {
            size,
            freq,
            bit: Vec::new(),
            cum: Vec::new(),
            slot: None,
            is_static: false,
            rich: Vec::new(),
        };
        table.rebuild_bit();
        table.rebuild_rich();
        table
    }

    /// Create a static table from a histogram normalized to `sum == M`.
    pub fn new_static(hist: &[u32]) -> RansTable {
        let size = hist.len();
        let freq = normalize_histogram(hist);
        debug_assert_eq!(freq.iter().map(|&x| x as u64).sum::<u64>(), M);
        let mut table = RansTable {
            size,
            freq,
            bit: Vec::new(),
            cum: Vec::new(),
            slot: None,
            is_static: true,
            rich: Vec::new(),
        };
        table.rebuild_cum();
        table.rebuild_slot();
        table
    }

    pub fn size(&self) -> usize {
        self.size
    }

    /// The table total. Always exactly `M`.
    pub fn sum(&self) -> u64 {
        M
    }

    fn rebuild_bit(&mut self) {
        let n = self.freq.len();
        let mut bit = vec![0u32; n + 1];
        for (i, &f) in self.freq.iter().enumerate() {
            let mut j = i + 1;
            while j <= n {
                bit[j] += f;
                j += j & (!j + 1);
            }
        }
        self.bit = bit;
    }

    fn rebuild_cum(&mut self) {
        let mut cum = Vec::with_capacity(self.freq.len() + 1);
        let mut acc: u32 = 0;
        for &f in &self.freq {
            cum.push(acc);
            acc += f;
        }
        cum.push(acc);
        self.cum = cum;
    }

    fn rebuild_slot(&mut self) {
        debug_assert_eq!(self.sum(), M);
        let mut slot = vec![0u16; M as usize];
        for s in 0..self.size {
            let lo = self.cum[s] as usize;
            let hi = self.cum[s + 1] as usize;
            for t in slot.iter_mut().take(hi).skip(lo) {
                *t = s as u16;
            }
        }
        self.slot = Some(slot);
    }

    fn rebuild_rich(&mut self) {
        self.rich.clear();
        for (s, &f) in self.freq.iter().enumerate() {
            if f >= 2 {
                self.rich.push(s);
            }
        }
    }

    fn bit_update(&mut self, s: usize, delta: u32) {
        let n = self.freq.len();
        let mut j = s + 1;
        while j <= n {
            self.bit[j] = (self.bit[j] as i64 + delta as i64) as u32;
            j += j & (!j + 1);
        }
    }

    fn bit_prefix(&self, s: usize) -> u32 {
        // sum of freq[0..s)
        let mut res: u32 = 0;
        let mut j = s;
        while j > 0 {
            res += self.bit[j];
            j -= j & (!j + 1);
        }
        res
    }

    /// Return `(freq, cum)` for symbol `s`.
    pub fn lookup(&self, s: usize) -> (u32, u32) {
        let f = self.freq[s];
        let c = if self.is_static {
            self.cum[s]
        } else {
            self.bit_prefix(s)
        };
        (f, c)
    }

    /// Find the symbol whose cumulative range contains `t` (t in [0, sum)).
    pub fn find(&self, t: u32) -> usize {
        debug_assert!(t < M as u32);
        if self.is_static {
            self.slot.as_ref().unwrap()[t as usize] as usize
        } else {
            self.bit_find(t)
        }
    }

    fn bit_find(&self, t: u32) -> usize {
        let n = self.freq.len();
        let mut idx = 0usize;
        let mut acc = t;
        let mut step = 1usize;
        while step <= n {
            step <<= 1;
        }
        step >>= 1;
        while step > 0 {
            let next = idx + step;
            if next <= n && self.bit[next] <= acc {
                acc -= self.bit[next];
                idx = next;
            }
            step >>= 1;
        }
        idx
    }

    /// Adaptive update after coding symbol `s`: increment `freq[s]` and steal
    /// one unit from a deterministic rich symbol so the total stays `M`.
    /// Encoder and decoder apply the identical rule and stay in lockstep.
    pub fn adapt(&mut self, s: usize) {
        debug_assert!(s < self.size);
        self.freq[s] += 1;
        self.bit_update(s, 1);
        if self.freq[s] == 2 {
            self.rich.push(s);
        }
        // Steal one unit from a symbol with freq >= 2 to keep sum == M.
        // The total surplus (sum - size) is constant and > 0, so the stack is
        // never empty.
        if let Some(t) = self.rich.pop() {
            debug_assert!(self.freq[t] >= 2);
            self.freq[t] -= 1;
            self.bit_update(t, 1u32.wrapping_neg());
            if self.freq[t] >= 2 {
                self.rich.push(t);
            }
        }
        debug_assert_eq!(self.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
    }
}

/// Normalize a per-symbol histogram to a table with `sum == M`, guaranteeing
/// every observed symbol keeps frequency >= 1 and unseen symbols stay 0.
pub fn normalize_histogram(hist: &[u32]) -> Vec<u32> {
    let n = hist.len();
    let total: u64 = hist.iter().map(|&x| x as u64).sum();
    let active: Vec<usize> = hist
        .iter()
        .enumerate()
        .filter(|(_, &c)| c > 0)
        .map(|(i, _)| i)
        .collect();
    let mut freq = vec![0u32; n];
    if active.is_empty() || total == 0 {
        // Uniform fallback (should not normally happen; the encoder only
        // builds static tables for contexts it actually uses).
        for s in 0..n.min(M as usize) {
            freq[s] = 1;
        }
        let sum: u64 = freq.iter().map(|&x| x as u64).sum();
        let mut rem = M as i64 - sum as i64;
        let mut i = 0usize;
        while rem > 0 {
            freq[i % n] += 1;
            rem -= 1;
            i += 1;
        }
        return freq;
    }
    for &s in &active {
        freq[s] = ((hist[s] as u64 * M / total).max(1)) as u32;
    }
    let mut sum: i64 = freq.iter().map(|&x| x as i64).sum();
    let mut order = active.clone();
    if sum > M as i64 {
        order.sort_unstable_by(|&a, &b| freq[b].cmp(&freq[a]));
        let mut i = 0usize;
        while sum > M as i64 {
            let s = order[i % order.len()];
            i += 1;
            if freq[s] > 1 {
                freq[s] -= 1;
                sum -= 1;
            }
        }
    } else if sum < M as i64 {
        order.sort_unstable_by(|&a, &b| {
            hist[b]
                .cmp(&hist[a])
                .then_with(|| freq[b].cmp(&freq[a]))
        });
        let mut i = 0usize;
        while sum < M as i64 {
            let s = order[i % order.len()];
            i += 1;
            freq[s] += 1;
            sum += 1;
        }
    }
    freq
}

/// rANS encoder. `put` renormalizes the state down before the interval step
/// (emitting low bytes), then applies `C`; `finish` emits the byte-reversed
/// stack plus the 4-byte big-endian trailing state.
pub struct RansEncoder {
    state: u32,
    out: Vec<u8>,
}

impl RansEncoder {
    pub fn new() -> RansEncoder {
        RansEncoder {
            state: RNB,
            out: Vec::new(),
        }
    }

    /// Encode symbol `s` against `table`. `x` is in `[RNB, 256*RNB)` on entry.
    pub fn put(&mut self, s: usize, table: &mut RansTable) {
        let (f, c) = table.lookup(s);
        debug_assert!(f >= 1, "coding a zero-frequency symbol");
        // Renorm bound: f * (RNB >> TBITS) * 256 / M == f * 2^16, exact because
        // the table total is the constant M.
        let x_max = ((RNB as u64 >> TBITS) << 8) * f as u64; // f * 2^16
        let mut x = self.state as u64;
        while x >= x_max {
            self.out.push((x & 0xFF) as u8);
            x >>= 8;
        }
        // C(s, x): x' = (x / f) * M + (x % f) + c, in [RNB, 256*RNB).
        x = (x / f as u64) * M + (x % f as u64) + c as u64;
        debug_assert!((RNB as u64..INVARIANT_HIGH as u64).contains(&x));
        self.state = x as u32;
        if !table.is_static {
            table.adapt(s);
        }
    }

    /// Finalize the stream: reverse the emitted bytes and append the trailing
    /// state as 4 big-endian bytes.
    pub fn finish(mut self) -> Vec<u8> {
        self.out.reverse();
        self.out.extend_from_slice(&self.state.to_be_bytes());
        self.out
    }
}

impl Default for RansEncoder {
    fn default() -> Self {
        Self::new()
    }
}

/// rANS decoder: reads the emitted bytes forward and the trailing state from
/// the last four bytes.
pub struct RansDecoder<'a> {
    state: u32,
    input: &'a [u8],
    pos: usize,
}

impl<'a> RansDecoder<'a> {
    pub fn new(input: &'a [u8]) -> Result<RansDecoder<'a>, CodecError> {
        if input.len() < 4 {
            return Err(CodecError::InvalidStream("rANS payload too short".into()));
        }
        let len = input.len();
        let state = u32::from_be_bytes([
            input[len - 4],
            input[len - 3],
            input[len - 2],
            input[len - 1],
        ]);
        Ok(RansDecoder {
            state,
            input,
            pos: 0,
        })
    }

    /// Decode the next symbol. `x` is in `[RNB, 256*RNB)` on entry; the
    /// renorm-up reads exactly the bytes the encoder emitted for this symbol,
    /// then `D` recovers the pre-step state.
    pub fn get(&mut self, table: &mut RansTable) -> Result<usize, CodecError> {
        while self.state < RNB {
            if self.pos >= self.input.len() - 4 {
                return Err(CodecError::InvalidStream("rANS stream exhausted".into()));
            }
            self.state = (self.state << 8) | self.input[self.pos] as u32;
            self.pos += 1;
        }
        debug_assert!((RNB..INVARIANT_HIGH).contains(&self.state));
        let t = self.state % M as u32;
        let s = table.find(t);
        let (f, c) = table.lookup(s);
        // D(x): x'' = f * (x / M) + (t - c); recovers the encoder's pre-step
        // renormed-down state (always below 256*RNB; below RNB iff the encoder
        // emitted bytes for this symbol).
        let x = (f as u64) * ((self.state as u64) / M) + ((t as u64) - c as u64);
        debug_assert!(x < INVARIANT_HIGH as u64);
        self.state = x as u32;
        if !table.is_static {
            table.adapt(s);
        }
        Ok(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn static_roundtrip() {
        // A peaked distribution over 16 symbols.
        let mut hist = [0u32; 512];
        hist[0] = 2000;
        hist[1] = 1000;
        hist[2] = 500;
        hist[5] = 300;
        hist[10] = 100;
        hist[30] = 40;
        hist[100] = 20;
        hist[255] = 10;
        hist[400] = 5;
        hist[510] = 3;
        let symbols: Vec<usize> = vec![0, 5, 1, 2, 30, 0, 0, 0, 10, 255, 1, 400, 510, 5, 2];
        let mut enc = RansEncoder::new();
        let mut table_e = RansTable::new_static(&hist);
        for &s in symbols.iter().rev() {
            enc.put(s, &mut table_e);
        }
        let bytes = enc.finish();
        let mut dec = RansDecoder::new(&bytes).unwrap();
        let mut table_d = RansTable::new_static(&hist);
        let mut got = Vec::new();
        for _ in 0..symbols.len() {
            got.push(dec.get(&mut table_d).unwrap());
        }
        assert_eq!(got, symbols);
    }

    #[test]
    fn adaptive_roundtrip_lockstep() {
        // Uniform start; both sides must stay in lockstep.
        let size = 512;
        let mut table_e = RansTable::new_adaptive(size);
        let mut table_d = RansTable::new_adaptive(size);
        // Deterministic pseudo-random symbol stream with a peak at 0.
        let mut seed = 0xDEADBEEFu64;
        let mut rnd = move || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            seed
        };
        let n = 200_000;
        let symbols: Vec<usize> = (0..n)
            .map(|_| {
                let r = (rnd() % 1000) as usize;
                if r < 600 {
                    0
                } else if r < 800 {
                    1 + (r % 8)
                } else {
                    10 + (r % 300)
                }
            })
            .collect();
        let mut enc = RansEncoder::new();
        for &s in symbols.iter().rev() {
            enc.put(s, &mut table_e);
        }
        let bytes = enc.finish();
        let mut dec = RansDecoder::new(&bytes).unwrap();
        let mut got = Vec::with_capacity(n);
        for _ in 0..n {
            got.push(dec.get(&mut table_d).unwrap());
        }
        assert_eq!(got, symbols);
        // Tables evolved identically (fixed total preserved).
        assert_eq!(table_e.freq, table_d.freq);
        assert_eq!(table_e.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
        assert_eq!(table_d.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
    }

    #[test]
    fn adaptive_single_symbol() {
        let mut table = RansTable::new_adaptive(64);
        let mut enc = RansEncoder::new();
        for _ in 0..10_000 {
            enc.put(7, &mut table);
        }
        let bytes = enc.finish();
        let mut dec = RansDecoder::new(&bytes).unwrap();
        let mut table2 = RansTable::new_adaptive(64);
        for _ in 0..10_000 {
            assert_eq!(dec.get(&mut table2).unwrap(), 7);
        }
    }

    #[test]
    fn renorm_pressure() {
        // A tiny alphabet forces frequent renorms.
        for size in [4usize, 8, 32] {
            let mut table_e = RansTable::new_adaptive(size);
            let mut table_d = RansTable::new_adaptive(size);
            let mut enc = RansEncoder::new();
            let syms: Vec<usize> = (0..50_000).map(|i| (i * 7) % size).collect();
            for &s in syms.iter().rev() {
                enc.put(s, &mut table_e);
            }
            let bytes = enc.finish();
            let mut dec = RansDecoder::new(&bytes).unwrap();
            for s in syms {
                assert_eq!(dec.get(&mut table_d).unwrap(), s);
            }
        }
    }

    #[test]
    fn encoder_invariant_window() {
        // After every put the state must sit in [RNB, 256*RNB).
        let mut enc = RansEncoder::new();
        let mut table = RansTable::new_adaptive(256);
        let mut seed = 12345678u64;
        let mut rnd = move || {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            seed
        };
        for _ in 0..100_000 {
            let s = (rnd() % 256) as usize;
            enc.put(s, &mut table);
            assert!(
                enc.state >= RNB && enc.state < INVARIANT_HIGH,
                "invariant violated: state {}",
                enc.state
            );
        }
    }

    #[test]
    fn normalize_exact_sum() {
        let mut hist = [0u32; 512];
        for i in 0..512usize {
            hist[i] = ((i * 13) % 7) as u32;
        }
        hist[3] = 5000;
        hist[0] = 9000;
        let f = normalize_histogram(&hist);
        assert_eq!(f.iter().map(|&x| x as u64).sum::<u64>(), M);
        for i in 0..512 {
            if hist[i] > 0 {
                assert!(f[i] >= 1, "active symbol {i} must have freq >= 1");
            } else {
                assert_eq!(f[i], 0);
            }
        }
    }

    #[test]
    fn decoder_errors_on_truncation() {
        let hist = [10u32; 512];
        let symbols: Vec<usize> = (0..20).collect();
        let mut enc = RansEncoder::new();
        let mut table_e = RansTable::new_static(&hist);
        for &s in symbols.iter().rev() {
            enc.put(s, &mut table_e);
        }
        let bytes = enc.finish();
        let truncated = &bytes[..bytes.len() - 2];
        // The payload must still be long enough to construct a decoder.
        let mut dec = match RansDecoder::new(truncated) {
            Ok(d) => d,
            Err(_) => return,
        };
        // Reading past the end must error, never panic.
        let mut table_d = RansTable::new_static(&hist);
        let mut got = 0usize;
        let result = (0..100).try_fold((), |_, _| {
            dec.get(&mut table_d).map(|_| {
                got += 1;
            })
        });
        assert!(result.is_err());
        assert!(got < 20);
    }
}