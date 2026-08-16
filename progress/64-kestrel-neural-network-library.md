# Progress - Kestrel

- **Issue:** #64
- **Branch:** opencode/64-kestrel-neural-network-library
- **Status:** in-progress
- **Updated:** 2026-08-16T03:30:00Z

## Checklist
- [x] 1. Scaffolding: project skeleton (src/bin/test/js/examples/docs), progress + ideas entries, branch, PR
- [x] 2. Core reverse-mode autodiff: Var + tape, array ops (matmul, add, broadcast, relu, sigmoid, tanh, exp/log, softmax, cross-entropy, sum/mean/transpose/reshape), backward! walk - 17 finite-difference checks ALL PASS
- [x] 3. Layers/losses/optimizer/network: Dense, activations, SGD + momentum, MLP, training loop, predict, accuracy - XOR converges (acc 1.0), synthetic digits 97.2% in 8 epochs, model save/load bit-exact round-trip
- [x] 4. Data: deterministic synthetic digit generator + real MNIST IDX loader with download script
- [x] 5. CLI: `kestrel.jl` train/eval/export/autograd-check/selftest with strict arg validation
- [x] 6. Train real-MNIST model (98.64%), export weights JSON; JS forward-inference mirror + browser playground (index.html); JS mirror verified against Julia predictions on 8 real MNIST samples (max diff ~5e-7)
- [x] 7. Tests: runtests.jl covering autodiff (finite-difference check), layers, training convergence (XOR + digits), serialization round-trip, JSON codec, JS bundle - 32 tests ALL PASS
- [ ] 8. Docs: README, docs/index.html + index.md, architecture/autodiff reference; root landing page + root README entries
- [ ] 9. Iteration/improvement cycle + final polish, Status: complete

## Current step
Docs (M8) and iteration/polish (M9).

## Next steps
- Update root landing page + root README with a Kestrel entry.
- Final iteration/polish round (playground/UX), then Status: complete and hand to review.

## Agent log
- 2026-08-16T02:00:00Z (Builder, run 1): orientation done. Julia 1.12.6 present, internet OK.
  Started `opencode/64-kestrel-neural-network-library` from main.
- 2026-08-16T02:40:00Z (Builder, run 1): core engine complete. Built tape-based reverse
  autodiff (Var + FuncOp closures, post-order collection + reverse walk). Key bugs found
  and fixed: graph-walk order (consumers must seed output grads first), Base-function
  shadowing (import Base exp/log/tanh/sum/transpose/permutedims/reshape + Statistics.mean),
  a missing `+ shift` in the fused softmax_cross_entropy logsumexp (corrupted the max-logit
  gradient), and a glyph-sampler precedence bug. All 17 finite-difference checks pass;
  XOR converges to 100%; synthetic-digit training reaches 97.2% in 8 epochs; save/load
  round-trips bit-exact; web export rounds to 7 sig figs.
- 2026-08-16T03:00:00Z (Builder, run 2): CLI + real MNIST + playground. Wrote bin/kestrel.jl
  (strict arg validation, verified exit codes: 0 on success, 1 on bad command/option), trained
  a 784-128-10 MLP on real MNIST to 98.64% in 6 epochs (~17s), wrote js/net.js + js/main.js +
  index.html playground, exported weights to weights/mnist.js. Made the export wrapper and
  net.js environment-agnostic (window or globalThis) so both load in node. Verified the JS
  mirror matches Julia predictions on 8 real MNIST samples (max diff ~5e-7, 8/8 correct).
- 2026-08-16T03:30:00Z (Builder, run 2): test suite + examples. Wrote kestrel/test/runtests.jl
  (32 tests) and examples/xor.jl + examples/train.jl. Fixed three real library bugs the new
  tests exposed: Var lacked a scalar/AbstractArray constructor, the JSON decoder indexed by
  character instead of byte (crashed on multi-byte UTF-8 like `café`), and `step!` was not
  exported. Tested via both `julia --project=. test/runtests.jl` and `Pkg.test()`; all 32 pass.
  Updated README library-use example. All CLI commands verified (train/eval/export/
  autograd-check/selftest) still pass after the source changes.