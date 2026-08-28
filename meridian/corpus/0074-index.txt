# Kestrel - zero-dependency neural networks in Julia

## Build

```sh
julia --project=. test/runtests.jl
```

## Layout

- `src/autodiff.jl` - reverse-mode tape: `Var`, op registry, `backward!`
- `src/layers.jl` - `Dense`, activations
- `src/losses.jl` - softmax + cross-entropy, MSE
- `src/optim.jl` - SGD with momentum and weight decay
- `src/net.jl` - `MLP`, training loop, prediction helpers
- `src/data.jl` - synthetic digit generator + MNIST IDX loader
- `src/json.jl` - tiny JSON encoder/decoder
- `src/serialize.jl` - model save/load/export
- `src/Kestrel.jl` - module entry point
- `bin/kestrel.jl` - the CLI
- `test/runtests.jl` - the test suite
- `js/`, `index.html` - the browser playground
- `docs/` - project documentation