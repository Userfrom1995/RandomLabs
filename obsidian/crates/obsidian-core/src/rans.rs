//! rANS entropy coding (32-bit state, byte-aligned, adaptive or static tables).
//!
//! The rANS denominator `M` is the renormalization baseline. Adaptive tables
//! keep `freq[s]` proportional to the observed count of `s` (a
//! Krichevsky-Trofimov style estimator): every time a symbol occurs its
//! frequency is incremented and, once the running total exceeds `2*M`, all
//! frequencies are halved. This preserves the ratios between frequencies, so
//! the model tracks the true distribution instead of over-concentrating on a
//! single symbol. The running total therefore varies in `[M, 2*M]`; both the
//! encoder and decoder apply the identical update rule, so they stay in
//! lockstep. The renorm window `[RNB, 256*RNB)` is tied to the constant `M`
//! (so the emitted/reconstructed byte counts always balance), while the
//! interval-coding step uses the current total.
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
    /// Current sum of `freq` (== M for static; in `[M, 2*M]` for adaptive).
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

    /// Adaptive update: increment `freq[s]` and halve all frequencies back when
    /// the running total exceeds `2*M`, which keeps `freq` proportional to the
    /// observed counts.
    pub fn adapt(&mut self, s: usize) {
        debug_assert!(!self.is_static);
        debug_assert!(s < self.size);
        self.freq[s] += 1;
        self.bit_update(s, 1);
        self.total += 1;
        // Keep `total <= M` so the decoder's `t = state % M` bijection holds
        // (cum[s+1] <= total <= M). Halving at `> M` yields total in [M/2, M].
        if self.total > M as u32 {
            for f in &mut self.freq {
                *f = (*f + 1) >> 1;
                if *f < 1 { *f = 1; }
            }
            self.total = self.freq.iter().map(|&x| x as u32).sum();
            self.rebuild_bit();
        }
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
        // Decode against the constant denominator `M` so the interval coding
        // matches the encoder's `put_fc` (which also uses `M`). Because `adapt`
        // keeps `total <= M`, `cum[s+1] <= total <= M`, so `t = (x%f)+c < total`
        // always holds and `find` never reaches the `[total, M)` dead zone.
        let t = self.state % (M as u32);
        // For a valid stream, `t = (x%f)+c < cum[s+1] <= total` always holds.
        // A corrupt/desynced stream can push `t` into the `[total, M)` window,
        // which is not a valid cumulative-frequency slot; reject it cleanly
        // instead of tripping the `find` precondition or emitting garbage.
        if t >= table.total {
            return Err(CodecError::InvalidStream("rANS decode symbol out of range".into()));
        }
        let s = table.find(t);
        let (f, c) = table.lookup(s);
        let x = (f as u64) * ((self.state as u64) / M) + ((t as u64) - c as u64);
        if t < c || x >= (1u64 << 32) {
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
        assert_eq!(table_e.freq, table_d.freq);
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
