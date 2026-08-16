# Kestrel

A neural-network library built from scratch in Julia: reverse-mode
automatic differentiation on a tape, dense layers, activations,
softmax + cross-entropy, mini-batch SGD with momentum, and a browser
playground where you draw a digit and a real-MNIST-trained model
classifies it live. Zero external dependencies - Julia standard library
only.

## Quick start

```sh
julia --project=. test/runtests.jl          # run the test suite
julia --project=. bin/kestrel.jl selftest   # CLI self-test (trains a tiny XOR net)
julia --project=. bin/kestrel.jl train --epochs 2   # train on synthetic digits -> model.json
julia --project=. bin/kestrel.jl eval --model model.json
julia --project=. bin/kestrel.jl export --model model.json --out weights/mnist.json
julia --project=. bin/kestrel.jl autograd-check
```

## Features

- **Reverse-mode autodiff from first principles**: a tape of `Var` nodes.
  Every operation records a backward closure; `backward!` walks the graph
  backwards applying the chain rule. Gradients are verified against finite
  differences in the test suite.
- **Layers**: `Dense` (Glorot-style init), `relu`, `sigmoid`, `tanh`.
- **Losses**: numerically-stable `softmax` + `cross_entropy`, and MSE.
- **Optimizers**: SGD with momentum and weight decay.
- **Training loop**: mini-batch SGD over epochs with per-epoch loss and
  accuracy, deterministic RNG, `predict`/`accuracy` helpers.
- **Data**: a deterministic synthetic digit generator (built-in 5x7 bitmap
  font rendered into 28x28 with affine noise) plus a real MNIST IDX loader
  (`scripts/download_mnist.jl` fetches the data).
- **Serialization**: a tiny hand-written JSON codec, so models save/load as
  portable `model.json` files with no packages.
- **Browser playground**: draw a digit, watch the model classify it live
  using exported weights and a dependency-free JS inference mirror. The JS
  mirror's probabilities are checked against Julia's `predict` in the test
  suite, and a Random digit button renders synthetic digits in-browser.

## CLI

```
usage: kestrel.jl <command> [options]

commands:
  train  <--epochs N [--batch N] [--lr F] [--momentum F] [--layers L]
           [--data synth|mnist] [--samples N] [--seed N] [--out FILE]>
           Train an MLP and write the trained model to FILE (model.json).
  eval   <--model FILE [--data synth|mnist] [--samples N] [--seed N]>
           Load a model and report loss/accuracy on a dataset.
  export <--model FILE --out FILE [--name STR]>
           Export model weights as a JSON file for the web playground.
  autograd-check
           Verify autodiff gradients against finite differences.
  selftest
           Train a tiny XOR network and assert it converges.
```

All options are validated; a missing or unknown option is a clear error
with a non-zero exit. No interactive input anywhere.

## Library use

```julia
using Kestrel

model = MLP([784, 128, 10])          # input -> hidden -> output sizes
images, labels = synthetic_digits(1000; seed = 1)
train!(model, images, labels; epochs = 5, batch = 32, lr = 0.1, momentum = 0.9,
    rng = MersenneTwister(1), verbose = false)
accuracy(model, images[:, 1:100], labels[1:100])
save_model(model, "model.json")
```

Ready-to-run scripts live in `examples/` (`xor.jl` trains a 2-4-2 net on XOR,
`train.jl` trains on synthetic digits and exports weights for the playground).

## The playground

Open `index.html` (or the hosted Pages URL) and draw a digit with the mouse
or your finger. The exported weights run through a dependency-free JS mirror
of the network, and the probability bars update live with the top-1 guess.
Hit **Random digit** to have the page render a synthetic digit (the same
bitmap-glyph generator the Julia library uses) and classify it, or **Clear**
to start over.

## Documentation

- `docs/` - index + how the autodiff tape works.
- `ideas/2026-08-16-kestrel-neural-network-library-julia.md` - full writeup.

## License

MIT. See the repo root `LICENSE`.