//! rANS entropy coding (the definitive formulation from the architecture).
//!
//! Variable-total rANS with a 32-bit state. For a table with total `sum`:
//!
//! - encoder invariant `x < L` where `L = 2^32 / sum`; `put` computes
//!   `x' = (x / f) * sum + (x % f) + c` and renorms down while `x' >= L`,
//!   emitting low bytes first into a stack that `finish` reverses and appends
//!   the 4-byte big-endian trailing state to.
//! - decoder invariant `x < L`; `get` renorms up while `x < L` reading bytes
//!   forward, computes `t = x % sum`, finds the symbol whose cumulative range
//!   contains `t`, and recovers the pre-put state exactly.
//!
//! Tables keep `sum <= M = 4096`. Static tables (effort >= 6) are normalized
//! to `sum == M` and use a precomputed slot table for O(1) lookup; adaptive
//! tables start uniform (every symbol at frequency 1), update per symbol via a
//! Fenwick tree (O(log A) per symbol), and halve with a floor of 1 whenever
//! `sum > M`. Encoder and decoder update identically and stay in lockstep.

use crate::error::CodecError;

/// Number of bits of frequency precision: table totals are capped at `M`.
pub const TBITS: u32 = 12;
/// The table total cap (1 << TBITS).
pub const M: u64 = 1 << TBITS;

/// A rANS frequency/cumulative table for one context.
pub struct RansTable {
    size: usize,
    freq: Vec<u32>,
    /// Fenwick tree over `freq` (1-indexed), used by adaptive tables.
    bit: Vec<u32>,
    /// Cumulative frequencies (sum of freq[0..s)); valid for static tables and
    /// lazily maintained for adaptive ones.
    cum: Vec<u32>,
    sum: u64,
    /// Precomputed slot table for static tables (`slot[t]` for t in 0..M).
    slot: Option<Vec<u16>>,
    /// True for tables built from a fixed histogram (no adaptation).
    is_static: bool,
    /// Renorm bound `L = 2^32 / sum`.
    limit: u32,
}

impl RansTable {
    /// Create an adaptive table over `size` symbols, uniform start (freq 1).
    pub fn new_adaptive(size: usize) -> RansTable {
        let freq = vec![1u32; size];
        let sum = size as u64;
        let mut table = RansTable {
            size,
            freq,
            bit: Vec::new(),
            cum: Vec::new(),
            sum,
            slot: None,
            is_static: false,
            limit: ((1u64 << 32) / sum) as u32,
        };
        table.rebuild_bit();
        table
    }

    /// Create a static table from a histogram normalized to `sum == M`.
    pub fn new_static(hist: &[u32]) -> RansTable {
        let size = hist.len();
        let freq = normalize_histogram(hist);
        let sum = freq.iter().map(|&x| x as u64).sum::<u64>();
        debug_assert_eq!(sum, M);
        let mut table = RansTable {
            size,
            freq,
            bit: Vec::new(),
            cum: Vec::new(),
            sum,
            slot: None,
            is_static: true,
            limit: ((1u64 << 32) / sum) as u32,
        };
        table.rebuild_cum();
        table.rebuild_slot();
        table
    }

    pub fn size(&self) -> usize {
        self.size
    }

    pub fn sum(&self) -> u64 {
        self.sum
    }

    pub fn limit(&self) -> u32 {
        self.limit
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
        debug_assert_eq!(self.sum, M);
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
        let c = if self.slot.is_some() {
            self.cum[s]
        } else {
            self.bit_prefix(s)
        };
        (f, c)
    }

    /// Find the symbol whose cumulative range contains `t` (t in [0, sum)).
    pub fn find(&self, t: u32) -> usize {
        if let Some(slot) = &self.slot {
            slot[t as usize] as usize
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

    /// Adaptive update after coding symbol `s`: increment and renormalize when
    /// the total would exceed `M`.
    pub fn adapt(&mut self, s: usize) {
        self.freq[s] += 1;
        self.bit_update(s, 1);
        self.sum += 1;
        if self.sum > M {
            self.renorm();
        }
        self.limit = ((1u64 << 32) / self.sum) as u32;
    }

    fn renorm(&mut self) {
        for f in self.freq.iter_mut() {
            *f = (*f >> 1).max(1);
        }
        self.sum = self.freq.iter().map(|&x| x as u64).sum::<u64>();
        self.rebuild_bit();
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

/// rANS encoder: pushes symbols in reverse order; `finish` emits the
/// byte-reversed stack plus the 4-byte big-endian trailing state.
pub struct RansEncoder {
    state: u32,
    out: Vec<u8>,
}

impl RansEncoder {
    pub fn new() -> RansEncoder {
        RansEncoder {
            state: 1,
            out: Vec::new(),
        }
    }

    pub fn put(&mut self, s: usize, table: &mut RansTable) {
        let (f, c) = table.lookup(s);
        let sum = table.sum();
        let limit = table.limit();
        let x = self.state as u64;
        let xp = (x / f as u64) * sum + (x % f as u64) + c as u64;
        let mut x = xp as u32;
        while x >= limit {
            self.out.push((x & 0xFF) as u8);
            x >>= 8;
        }
        self.state = x;
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

    pub fn get(&mut self, table: &mut RansTable) -> Result<usize, CodecError> {
        let limit = table.limit();
        while self.state < limit {
            if self.pos >= self.input.len() - 4 {
                return Err(CodecError::InvalidStream("rANS stream exhausted".into()));
            }
            self.state = (self.state << 8) | self.input[self.pos] as u32;
            self.pos += 1;
        }
        let sum = table.sum() as u32;
        let t = self.state % sum;
        let s = table.find(t);
        let (f, c) = table.lookup(s);
        let x = (f as u64) * ((self.state as u64) / sum as u64) + ((t - c) as u64);
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
        // Tables evolved identically.
        assert_eq!(table_e.sum, table_d.sum);
        assert_eq!(table_e.freq, table_d.freq);
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
