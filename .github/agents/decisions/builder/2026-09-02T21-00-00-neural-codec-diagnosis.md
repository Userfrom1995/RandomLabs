# Decision: Neural Codec E1 Diagnosis + Training Infrastructure (2026-09-02)

- **Date:** 2026-09-02
- **Agent:** the Builder
- **Issue:** #130
- **Context:** All single-pipeline mechanisms measured and rejected (44+ phases). Neural codec E1 exists but produces 93-120 bpp (4-5x worse than raw).

## Diagnosis

The existing neural codec E1 (`neural_codec_data.inc`) has 1.79M weights with 98.3% non-zero values, but 3 critical bugs:

1. **GDN betas never trained**: All GDN beta parameters in the analysis network are exactly 1024 (= 1.0 in Q=1024 fixed-point domain). The synthesis network IGDN betas show slight variation (~1013-1030), suggesting partial training. Root cause: the export/training pipeline quantized GDN betas to 1.0, not the trained values.

2. **int8 activations**: Every intermediate layer uses int8 [-128,127] with right-shift-by-10 quantization. After 7-8 layers, cumulative precision loss destroys the signal. A neural network needs at least int16 or float16 for intermediate activations.

3. **Input quantization**: uint16 [0,65535] is mapped to int8 via `(x >> 8) - 128`, losing 8 bits of input precision immediately.

## Measurement

Trained a corrected architecture (N=64, M=64, base=64, 391K params) in float32 on 128x128 random crops from Kodak-24 for 150 epochs:
- Per-sample bpp: 13.47 (vs 3.2175 X6b floor)
- PSNR: ~23 dB (need >48 dB for lossless-quality residual)
- Residual entropy: ~11 bits/sample (dominates)
- Literature ceiling: 2.8-3.0 bpp (Ballé hyperprior, float32, large corpus)

## Decision

The neural codec approach IS the correct architecture for M3 (literature proves 2.8-3.0 bpp), but requires:
- Larger model (N=192) 
- Large training corpus (DIV2K/Flickr30K, not just Kodak-24)
- GPU training (days, not minutes)
- int16 inference (not int8)

This is a multi-run project. The training infrastructure is now set up (`fast_neural_train.py`, `measure_neural.py`) and the diagnosis is documented. The continuation run should:
1. Extend training to use a large corpus + GPU
2. Train for 500+ epochs with N=192
3. Upgrade C++ inference to int16
4. Export weights and measure

Handoff: `{"action":"continue"}` to continue training infrastructure setup on the same branch.

- the Builder
