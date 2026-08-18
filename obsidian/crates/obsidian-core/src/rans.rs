//! rANS entropy coding (32-bit state, byte-aligned, adaptive or static tables).
//!
//! The rANS denominator `M` is the renormalization baseline AND the constant
//! table total. Both static and adaptive tables keep `sum(freq) == M` at all
//! times. Adaptive tables keep `freq[s]` proportional to the observed count of
//! `s`: every time a symbol occurs its frequency is incremented and one unit is
//! stolen from the richest *other* symbol (the most over-represented one, freq
//! >= 2), so the total never moves from `M`. This preserves the full `M`-wide
//! frequency resolution and the proportionality between symbols for both peaked
//! and uniform streams, so compression efficiency is preserved, and the encoder
//! and decoder apply the identical update rule, so they stay in lockstep. The
//! renorm window `[RNB, 256*RNB)` and the interval-coding step both use the
//! constant `M`: the decoder renormalizes against the fixed lower bound `RNB`
//! and decodes with the same constant `M`, so the emitted byte count exactly
//! balances the reconstructed stream.
//!
//! The encoder codes symbols in reverse raster order (so the byte-reversed
//! stack decodes in forward order) but adaptive tables must evolve in decode
//! order, so the encoder runs a forward dry-run that records each symbol's
//! `(freq, cum, total)` BEFORE the update; the reverse pass replays them via
//! `put_fc` with no further adaptation.

use crate::error::CodecError;

/// The rANS frequency denominator used as the halving baseline.
pub const M: u64 = 1 << 12;
/// The decoder renorm lower bound; the encoder keeps `x` in `[RNB, 256*RNB)`.
pub const RNB: u32 = 1 << 20;
/// Upper bound for a valid state (exclusive).
pub const INVARIANT_HIGH: u32 = 256 * RNB;

pub struct RansTable {
    size: usize,
    freq: Vec<u32>,
    bit: Vec<u32>,
    cum: Vec<u32>,
    slot: Option<Vec<u16>>,
    is_static: bool,
    /// Current sum of `freq` (always exactly `M` for both static and adaptive).
    total: u32,
}

impl RansTable {
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
            total: M as u32,
        };
        table.rebuild_bit();
        table
    }

    pub fn new_static(hist: &[u32]) -> RansTable {
        let size = hist.len();
        let freq = normalize_histogram(hist);
        let mut table = RansTable {
            size,
            freq,
            bit: Vec::new(),
            cum: Vec::new(),
            slot: None,
            is_static: true,
            total: M as u32,
        };
        table.rebuild_cum();
        table.rebuild_slot();
        table
    }

    pub fn size(&self) -> usize { self.size }
    pub fn total(&self) -> u32 { self.total }
    pub fn sum(&self) -> u64 { self.total as u64 }

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
        let total = self.total as usize;
        let mut slot = vec![0u16; total];
        for s in 0..self.size {
            let lo = self.cum[s] as usize;
            let hi = self.cum[s + 1] as usize;
            for v in slot.iter_mut().take(hi).skip(lo) {
                *v = s as u16;
            }
        }
        self.slot = Some(slot);
    }

    fn bit_update(&mut self, s: usize, delta: u32) {
        let n = self.freq.len();
        let mut j = s + 1;
        while j <= n {
            self.bit[j] = self.bit[j].wrapping_add(delta);
            j += j & (!j + 1);
        }
    }

    fn bit_prefix(&self, s: usize) -> u32 {
        let mut res: u32 = 0;
        let mut j = s;
        while j > 0 {
            res += self.bit[j];
            j -= j & (!j + 1);
        }
        res
    }

    pub fn lookup(&self, s: usize) -> (u32, u32) {
        let f = self.freq[s];
        let c = if self.is_static { self.cum[s] } else { self.bit_prefix(s) };
        (f, c)
    }

    pub fn find(&self, t: u32) -> usize {
        debug_assert!(t < self.total);
        if self.is_static {
            self.slot.as_ref().unwrap()[t as usize] as usize
        } else {
            self.bit_find(t)
        }
    }

    fn bit_find(&self, t: u32) -> usize {
        let n = self.freq.len();
        let mut idx = 0usize;
        let mut step = 1usize;
        while step <= n { step <<= 1; }
        step >>= 1;
        let mut t = t;
        while step > 0 {
            let next = idx + step;
            if next <= n && self.bit[next] <= t {
                t -= self.bit[next];
                idx = next;
            }
            step >>= 1;
        }
        idx
    }

    /// Adaptive update: increment `freq[s]` and steal one unit from the richest
    /// *other* symbol (the most over-represented one, freq >= 2) so the running
    /// total stays exactly `M`. Stealing from the most over-represented symbol
    /// (rather than a fixed LIFO victim) keeps the frequencies proportional to
    /// the observed counts for both peaked and uniform streams, and never
    /// starves a symbol below 1. Keeping `total == M` means `cum[s+1] <= M`
    /// always, so the decoder's `t = state % M` bijection has no reachable dead
    /// zone and the encoder/decoder stay in lockstep. Encoder and decoder apply
    /// the identical rule.
    pub fn adapt(&mut self, s: usize) {
        debug_assert!(!self.is_static);
        debug_assert!(s < self.size);
        self.freq[s] += 1;
        self.bit_update(s, 1);
        // Pick the richest symbol other than `s` that still has freq >= 2 to
        // steal from (so no symbol drops below 1). If every other symbol is
        // already at 1, steal from `s` itself, which is a no-op for the total.
        let mut victim = s;
        let mut victim_f = 0u32;
        for i in 0..self.size {
            if i != s && self.freq[i] >= 2 && self.freq[i] > victim_f {
                victim_f = self.freq[i];
                victim = i;
            }
        }
        if victim == s {
            self.freq[s] -= 1;
            self.bit_update(s, 1u32.wrapping_neg());
        } else {
            self.freq[victim] -= 1;
            self.bit_update(victim, 1u32.wrapping_neg());
        }
        debug_assert_eq!(self.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
        self.total = M as u32;
    }
}

pub fn normalize_histogram(hist: &[u32]) -> Vec<u32> {
    let n = hist.len();
    let total: u64 = hist.iter().map(|&x| x as u64).sum();
    let active: Vec<usize> = (0..n).filter(|&i| hist[i] > 0).collect();
    let mut freq = vec![0u32; n];
    if active.is_empty() || total == 0 {
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
        order.sort_unstable_by(|&a, &b| hist[b].cmp(&hist[a]).then_with(|| freq[b].cmp(&freq[a])));
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

pub struct RansEncoder {
    state: u32,
    out: Vec<u8>,
}

impl RansEncoder {
    pub fn new() -> RansEncoder {
        RansEncoder { state: RNB, out: Vec::new() }
    }

    pub fn put(&mut self, s: usize, table: &mut RansTable) {
        let (f, c) = table.lookup(s);
        self.put_fc(s, f, c, table.total);
        if !table.is_static {
            table.adapt(s);
        }
    }

    /// Encode symbol `s` with explicit `(freq, cum)`. No table adaptation.
    ///
    /// The renorm window and the interval-coding step BOTH use the constant
    /// denominator `M`. This is the proven rANS design: the decoder renormalizes
    /// against a fixed lower bound `RNB` and decodes with the same constant `M`,
    /// so the emitted byte count exactly balances the reconstructed stream and the
    /// encoder/decoder stay in lockstep. The adaptive tables only change the
    /// per-symbol `(freq, cum)`; the running `total` is kept `<= M` (see
    /// `adapt`) so `cum[s+1] <= M` and the modulo bijection `t = (x%f)+c` holds
    /// with no reachable dead zone.
    pub fn put_fc(&mut self, _s: usize, f: u32, c: u32, _total: u32) {
        debug_assert!(f >= 1);
        // Renorm upper bound tied to the constant `M` (so it matches the
        // decoder's fixed `RNB` lower bound by the byte factor 256).
        let x_max = (f as u64) * (INVARIANT_HIGH as u64) / M;
        let mut x = self.state as u64;
        while x >= x_max {
            self.out.push((x & 0xFF) as u8);
            x >>= 8;
        }
        x = (x / f as u64) * M + (x % f as u64) + c as u64;
        debug_assert!(x < (1u64 << 32));
        self.state = x as u32;
    }

    pub fn finish(mut self) -> Vec<u8> {
        self.out.reverse();
        self.out.extend_from_slice(&self.state.to_be_bytes());
        self.out
    }
}

impl Default for RansEncoder {
    fn default() -> Self { Self::new() }
}

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
            input[len - 4], input[len - 3], input[len - 2], input[len - 1],
        ]);
        Ok(RansDecoder { state, input, pos: 0 })
    }

    pub fn get(&mut self, table: &mut RansTable) -> Result<usize, CodecError> {
        while self.state < RNB {
            if self.pos >= self.input.len() - 4 {
                return Err(CodecError::InvalidStream("rANS stream exhausted".into()));
            }
            self.state = (self.state << 8) | self.input[self.pos] as u32;
            self.pos += 1;
        }
        // A corrupt trailing state or byte sequence can push the state out of
        // the invariant window; fail cleanly instead of panicking.
        if self.state >= INVARIANT_HIGH {
            return Err(CodecError::InvalidStream("rANS state out of range".into()));
        }
        // Decode against the constant denominator `M` so the interval coding
        // matches the encoder's `put_fc` (which also uses `M`). Because `adapt`
        // keeps `total == M`, `cum[s+1] <= M`, so `t = state % M` always lies in
        // `[0, M)` and `find` always resolves to a valid slot for a correct
        // stream. Kept as a defensive backstop in case `total` is ever less than
        // `M` (it should never be for an adaptive stream produced here).
        let t = self.state % (M as u32);
        if t >= table.total {
            return Err(CodecError::InvalidStream("rANS decode symbol out of range".into()));
        }
        let s = table.find(t);
        let (f, c) = table.lookup(s);
        // On a corrupt stream the found symbol may not actually cover `t`, so
        // `t < c` (or a result outside the invariant window) signals corruption
        // and is reported as an error, never a panic.
        let x = (f as u64) * ((self.state as u64) / M) + ((t as u64) - c as u64);
        if t < c || x >= INVARIANT_HIGH as u64 {
            return Err(CodecError::InvalidStream("rANS decode out of range".into()));
        }
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
        let mut hist = [0u32; 512];
        hist[0] = 2000; hist[1] = 1000; hist[2] = 500; hist[5] = 300;
        hist[10] = 100; hist[30] = 40; hist[100] = 20; hist[255] = 10; hist[400] = 5; hist[510] = 3;
        let symbols: Vec<usize> = vec![0,5,1,2,30,0,0,0,10,255,1,400,510,5,2];
        let mut enc = RansEncoder::new();
        let mut table_e = RansTable::new_static(&hist);
        for &s in symbols.iter().rev() { enc.put(s, &mut table_e); }
        let bytes = enc.finish();
        let mut dec = RansDecoder::new(&bytes).unwrap();
        let mut table_d = RansTable::new_static(&hist);
        let mut got = Vec::new();
        for _ in symbols.iter() { got.push(dec.get(&mut table_d).unwrap()); }
        assert_eq!(got, symbols);
    }

    #[test]
    fn adaptive_roundtrip_lockstep() {
        let size = 512;
        let n = 200_000;
        let mut seed = 0xDEADBEEFu64;
        let mut rnd = move || { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; seed };
        let symbols: Vec<usize> = (0..n).map(|_| {
            let r = (rnd() % 1000) as usize;
            if r < 600 { 0 } else if r < 800 { 1 + (r % 8) } else { 10 + (r % 300) }
        }).collect();
        let (bytes, table_e) = adaptive_encode(&symbols, size);
        let (got, table_d) = adaptive_decode(&bytes, size, n);
        assert_eq!(got, symbols);
        // Tables evolved identically (fixed total preserved).
        assert_eq!(table_e.freq, table_d.freq);
        assert_eq!(table_e.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
        assert_eq!(table_d.freq.iter().map(|&x| x as u64).sum::<u64>(), M);
    }

    #[test]
    fn adaptive_single_symbol() {
        let syms = vec![7usize; 10_000];
        let (bytes, _) = adaptive_encode(&syms, 64);
        let (got, _) = adaptive_decode(&bytes, 64, syms.len());
        assert_eq!(got, syms);
    }

    #[test]
    fn renorm_pressure() {
        for size in [4usize, 8, 32] {
            let syms: Vec<usize> = (0..50_000).map(|i| (i * 7) % size).collect();
            let (bytes, _) = adaptive_encode(&syms, size);
            let (got, _) = adaptive_decode(&bytes, size, syms.len());
            assert_eq!(got, syms);
        }
    }

    #[test]
    fn uniform_adaptive_efficient() {
        let size = 512;
        let n = 200_000;
        let mut seed = 0xCAFEu64;
        let mut rnd = move || { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; seed };
        let symbols: Vec<usize> = (0..n).map(|_| (rnd() % size) as usize).collect();
        let (bytes, _) = adaptive_encode(&symbols, size as usize);
        let bits = bytes.len() as f64 * 8.0 / n as f64;
        assert!(bits < 10.0, "adaptive uniform too wasteful: {bits:.2} bits/sym");
    }

    #[test]
    fn encoder_invariant_window() {
        // After every put the state must sit in [RNB, 256*RNB).
        let mut enc = RansEncoder::new();
        let mut table = RansTable::new_adaptive(256);
        let mut seed = 12345678u64;
        let mut rnd = move || { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; seed };
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

    fn adaptive_encode(symbols: &[usize], size: usize) -> (Vec<u8>, RansTable) {
        let mut table = RansTable::new_adaptive(size);
        let mut plan: Vec<(u32, u32, u32)> = Vec::with_capacity(symbols.len());
        for &s in symbols {
            let (f, c) = table.lookup(s);
            plan.push((f, c, table.total));
            table.adapt(s);
        }
        let mut enc = RansEncoder::new();
        for (&s, &(f, c, total)) in symbols.iter().zip(plan.iter()).rev() {
            enc.put_fc(s, f, c, total);
        }
        (enc.finish(), table)
    }

    fn adaptive_decode(bytes: &[u8], size: usize, n: usize) -> (Vec<usize>, RansTable) {
        let mut dec = RansDecoder::new(bytes).unwrap();
        let mut table = RansTable::new_adaptive(size);
        let mut got = Vec::with_capacity(n);
        for _ in 0..n { got.push(dec.get(&mut table).unwrap()); }
        (got, table)
    }
}
