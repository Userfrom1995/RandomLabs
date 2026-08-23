# Prism M1-M4 - Adaptive FIFO Range Coder and Context Loop

- **Issue:** #117
- **What:** Continuation of Prism next-gen lossless codec (C++) from M0 bit-exact foundation to the benchmark-driven optimization loop that beats JPEG XL on Kodak. This build wires the FIFO adaptive range coder (`acoder.h`) that resolves the M0 LIFO/adaptive deferral, plus the B5 predictor bank + residual-DIFF + activity context and per-plane predictor selection. Later B6-B8 add CFL + 5/3 + Squeeze/MA-tree coupling (R11-A guard) + CM/LZP.
- **Why:** M0 uses a true 32-bit rANS with FIXED probabilities because rANS is LIFO - running adaptive state desyncs on decode (decoder pops in reverse). Per-context adaptive modeling is inherently FIFO (prefix-dependent). Adding a forward-adaptive binary range coder lets every MA-tree leaf carry its own 16-bit adaptive probabilities (WNC/CABS) and H(p)+epsilon efficiency, unlocking the ~2 bpp gap to WebP/JPEG-XL. Squeeze alone is inert without llc_class/sibling_class (Obsidian R11-A), so B7 lands them atomically.
- **How:**
  - **FIFO backend `include/prism/codec/acoder.h`**: 32-bit binary arithmetic coder (range coder) with byte-aligned flush, per-bin 16-bit probability adapted via JXL WNC-style `prob += (bit? -prob : 65535-prob) >> rate`. `AEncoder::put_bin(u16& prob,bool)` / `encode_residual(Models&,cx,e)` / `flush()` and matching `ADecoder::get_bin` / `decode_residual` / `init`. Same Elias-gamma decomposition as rANS but forward order.
  - **Backend selector**: `ContainerHeader.flags` bit2 = adaptive (acoder) vs static rANS, per payload. Encoder chooses acoder when context count >1 or effort >=1.
  - **Residual-DIFF context**: quantized neighbor residual class via `residual_context(dL,dU,dUl)` <=365 ids (sign-symmetry LUT), primary MA-tree feature feeding adaptive models (R3-A win).
  - **Activity class**: local variance bucket as context feature.
  - **Predictor bank PW**: 6x6 normal-equation accumulation per fine context, weighted predictor with bias, quantized i16.
  - **Per-plane predictor selection**: `analyze.h` evaluates P0..P8 summed |residual| and stores cheapest; zero bytes when single global wins.
  - **Squeeze+MA-tree coupling (B7)**: post-order emit so co-located LL is available for `llc_class`/`sibling_class` features, enforced by R11-A guard.
- **Key files:**
  - `prism/include/prism/codec/acoder.h` (NEW) + `prism/src/codec/acoder.cpp`
  - `prism/include/prism/codec/predict.h` + `prism/src/codec/predict.cpp` (PW + selection)
  - `prism/include/prism/codec/matree.h` / `prism/src/codec/matree.cpp` (llc/sibling features)
  - `prism/src/codec/analyze.cpp`, `prism/src/prism.cpp`, `prism/include/prism/codec/container.h`
  - `prism/docs/architecture-m1-m4.md` (companion doc)
- **Notes:** Quality is the only deadline; PR not merged until M0+M1+M2+M3 pass bit-exactly on real Kodak 24 with durable CSV + SHA256. Real Kodak harness stays at `prism/benchmarks/data/kodak/` (SHA256 pinned).
