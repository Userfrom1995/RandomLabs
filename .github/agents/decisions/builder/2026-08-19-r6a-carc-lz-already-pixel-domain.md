# Builder decision: R6-A blueprint premise is incorrect (CARC_LZ is already pixel-domain LZ77)

- **Issue:** #68 (Obsidian lossless codec), PR #83
- **Author:** the Builder
- **Date:** 2026-08-19
- **Context:** Resuming PR #83 via `/oc continue` to implement the R6 blueprint
  (`obsidian/docs/architect-r6-spatial-lz77-blueprint.md`), whose central diagnosis is:
  "the existing LZ77 (M3-A / CARC_LZ) is **residual-domain** ... it copies a prior
  *residual* value ... so it almost never fires, and it measures as a tie."

## Empirical finding (verified this run)

The diagnosis is **factually wrong**. CARC_LZ (`ENTROPY_MODE_CARC_LZ = 3`) already
performs **pixel-domain** spatial LZ77:

- Encoder (`encoder.rs:1088-1147`): the match finder runs on `buf =
  &coding_planes[pi]`, which is the coding plane holding **pixel values** in the
  current color space. A match emits a flag + Elias-gamma `(offset, length)` and
  the decoder copies reconstructed samples; the literal path computes
  `r = buf[i] - pred` and the decoder does `plane[i] = pred + r`.
- Decoder (`decoder.rs:517-571`): on a match it does
  `plane[i + l] = plane[i - off + l]`, i.e. it copies **reconstructed pixel
  values** from its own already-built `plane` prefix. This is the textbook
  pixel-domain back-reference (bit-exact by induction), identical in spirit to
  WebP/JPEG XL spatial LZ.

### Measured consequence on real Kodak (effort 4, kodim01)

- Default safety-net pick (CMARC/R5): **10.42 bpp**
- Forced `CARC_LZ` (mode 3): **13.62 bpp**

So CARC_LZ is already pixel-domain and it **loses / ties** on photographic Kodak
not because it is "residual-domain", but because photographic content has too few
exact pixel repeats of length >= `MIN_MATCH = 3` for the per-pixel match-flag
binary bin + Elias-gamma `(offset, length)` overhead to amortize. The safety net
correctly refuses to ship it.

## Implication for R6-A

Implementing `ENTROPY_MODE_CARC_SPATIAL = 5` exactly as the blueprint specifies
("copy `recon[c]` pixel values", "reuse `lz_find_match`", "reuse the CMARC
framing") would be a **byte-for-byte functional duplicate** of CARC_LZ: same
match finder, same token layout, same copy semantics. It would therefore also tie
on Kodak and would be dead/duplicate code (a reviewer finding). The blueprint's
predicted "-0.3 to -0.8 bpp" win for R6-A rests on the incorrect premise that
CARC_LZ is residual-domain; the real reason it ties is that pixel-exact repeats
are rare on photographs, which a renamed duplicate does not change.

## Recommendation (for the Maintainer / Architect)

The remaining ~0.45 bpp to WebP (9.61) and ~0.85 bpp to JPEG XL (8.71) cannot be
closed by a pixel-LZ duplicate. The genuine levers are:

1. **R6-B color cache (LRU):** genuinely new and additive with the literal path;
   captures repeated reconstructed values in smooth/photographic regions. This is
   the most plausible single R6 win and does not require the match machinery.
2. **A more aggressive match finder** (2D block copy, lower effective match cost,
   longer matches, richer match-flag/offset/length context modeling) - a real
   architecture task, not a rename. This is what actually moves the WebP number
   for WebP/JPEG XL, not a 1D pixel-LZ duplicate.
3. **Unstick R3-A residual-context** (the blueprint itself admits
   `cmarc-force+resctx` is currently byte-identical to `cmarc-force` - a NO-OP).
   That is a free additive win once the wiring is fixed, and must be done before
   stacking more layers.

I have NOT implemented R6-A as a duplicate. Standing by for a corrected R6
blueprint that prioritizes R6-B (color cache) + the R3-A fix + a genuinely
improved match finder, rather than a pixel-LZ rename.

- the Builder
