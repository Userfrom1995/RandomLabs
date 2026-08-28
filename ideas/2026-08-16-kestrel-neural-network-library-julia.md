# Kestrel - a neural-network library built from scratch in Julia

The lab's first Julia project and its first machine-learning project.
Kestrel is a small, sharp, fast numeric core where every computation stays
visible: a reverse-mode automatic differentiation tape, dense layers,
activations, softmax + cross-entropy, mini-batch SGD with momentum, a fully
headless training loop, and a statically-hosted browser playground where you
draw a digit and a real-MNIST-trained model classifies it live.

## What it is

An ML library with **zero external dependencies** (Julia standard library
only), built "from first principles" the way the lab likes it:

- **Reverse-mode autodiff** (`src/autodiff.jl`): a tape of `Var` nodes
  holding values and gradients. Each operation records a backward closure;
  `backward!` walks the graph in reverse applying the chain rule. Ops:
  matmul, add, subtract, negate, broadcast multiply, broadcast unary
  (relu, sigmoid, tanh, exp, log), sum, mean, transpose, permutedims,
  reshape, and fused stable `softmax` and `cross_entropy` (max-shifted for
  numerical stability). Gradients are validated against finite differences
  in the test suite.
- **Layers** (`src/layers.jl`): `Dense` (weight + bias, Glorot-ish init) and
  activations. `src/losses.jl`: cross-entropy and MSE. `src/optim.jl`: SGD
  with optional momentum and weight decay.
- **Network** (`src/net.jl`): `MLP` (a list of layers), `forward`, `train!`
  (mini-batch SGD over epochs with per-epoch loss/accuracy reporting and a
  deterministic RNG), `predict`, `accuracy`.
- **Data** (`src/data.jl`): a deterministic **synthetic digit generator**
  (renders a built-in 5x7 bitmap font into 28x28 with random affine
  perturbations, noise, and anti-aliasing) so the whole pipeline runs
  offline and reproducibly, plus a real **MNIST IDX loader** with a
  `scripts/download_mnist.jl` fetcher. Both produce `(images, labels)` with
  images flattened to `784`-vectors normalized to `[0, 1]`.
- **Serialization** (`src/json.jl` + `src/serialize.jl`): a tiny hand-written
  JSON encoder/decoder (no package) so models save/load as portable
  `model.json` files, and weights export for the browser.
- **CLI** (`bin/kestrel.jl`): `train`, `eval`, `export`, `autograd-check`,
  `selftest`. Everything from flags, strict validation, non-zero exit on
  missing/unknown args, no interactive input.

## Why it fits

Fresh language (Julia - first for the lab) and a completely untouched
category (machine learning). ML is usually a black box imported from a
framework; Kestrel is backprop you can read line by line, and Julia's
just-in-time numeric performance is genuinely the right tool. The
draw-to-classify web client makes the payoff visceral, and Julia's syntax
reads almost like pseudocode, which suits an "every computation visible"
philosophy.

## The web playground

`kestrel/index.html` + `js/`: a Canvas where you draw a digit with mouse or
touch. A dependency-free JS forward-inference mirror (`js/net.js`) mirrors
the Julia math exactly (matmul, relu, softmax) and runs the exported,
real-MNIST-trained weights to show the per-class probability bars and the
top-1 guess live as you draw. No network calls, fully static, hostable on
GitHub Pages.

## Key files

- `src/autodiff.jl` - the tape: `Var`, op registry, `backward!`.
- `src/layers.jl`, `src/losses.jl`, `src/optim.jl`, `src/net.jl` - the stack.
- `src/data.jl` - synthetic generator + MNIST loader.
- `src/json.jl`, `src/serialize.jl` - zero-dependency JSON + model save/load.
- `bin/kestrel.jl` - the CLI.
- `test/runtests.jl` - autodiff finite-difference checks, convergence, round-trips.
- `js/net.js`, `js/main.js`, `index.html` - the playground.

## Notes

- Everything is seeded and deterministic (fixed RNG stream via `Random.seed!`
  throughout), so training reproduces bit-for-bit given the same seed.
- The committed `weights/mnist.json` comes from a real-MNIST-trained 784-128-10
  MLP; the synthetic generator keeps the CLI trainable with zero downloads.
- MIT-licensed, matching the lab.