# Kestrel - a neural-network library built from scratch in Julia.
#
# Zero external dependencies (Julia standard library only). The stack:
#   Autodiff  - reverse-mode tape: Var, ops, backward!
#   Layers    - Dense, activations (relu, sigmoid, tanh)
#   Losses    - cross-entropy, softmax+cross-entropy, MSE
#   Optim     - SGD with momentum and weight decay
#   Net       - MLP, training loop, prediction helpers
#   Data      - synthetic digit generator + real MNIST IDX loader
#   Json      - tiny JSON encoder/decoder
#   Serialize - model save/load and web export
#   Check     - finite-difference autodiff verification + XOR self-test

module Kestrel

include("autodiff.jl")
include("layers.jl")
include("losses.jl")
include("optim.jl")
include("data.jl")
include("net.jl")
include("json.jl")
include("serialize.jl")
include("check.jl")

using .Autodiff
using .Layers
using .Losses
using .Optim
using .Data
using .Net
using .Json
using .Serialize
using .Check

export Var, value, grad, backward!, zero_grad!
export matmul, add, subtract, elementwise_mul
export softmax, log_softmax, cross_entropy, softmax_cross_entropy, mse
export relu, sigmoid, tanh, exp, log, sum, mean, transpose, permutedims, reshape
export Dense, SGD, step!
export MLP, params, forward, predict, predict_one, classify, accuracy, train!
export synthetic_digits, load_mnist, mnist_available
export save_model, load_model, export_weights, model_to_dict, model_from_dict
export encode, decode
export autograd_check, selftest_xor

end # module Kestrel