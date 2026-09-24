# Kestrel.Layers - dense layers and activations on top of the autodiff tape.

module Layers

using ..Autodiff
using ..Autodiff: relu, sigmoid, tanh
using Random

export Dense, relu, sigmoid, tanh

# Glorot-style uniform init: uniform in (-limit, limit) with
# limit = sqrt(6 / (fan_in + fan_out)). ReLU layers use the He bound
# sqrt(6 / fan_in) instead, which keeps the pre-activation variance stable.
function _init_limit(fan_in::Int, fan_out::Int, activation::Function)
    activation === relu && return sqrt(6.0 / fan_in)
    return sqrt(6.0 / (fan_in + fan_out))
end

"""
    Dense(inputs, outputs, activation = identity)

An affine layer `y = W * x .+ b` with a weight matrix of shape
`(outputs, inputs)` and a bias column of shape `(outputs, 1)`, followed by the
given activation (which must accept both `Var` and plain arrays).
"""
mutable struct Dense
    w::Var
    b::Var
    activation::Function
    function Dense(inputs::Int, outputs::Int, activation::Function = identity)
        @assert inputs > 0 "Dense: inputs must be positive, got $inputs"
        @assert outputs > 0 "Dense: outputs must be positive, got $outputs"
        limit = _init_limit(inputs, outputs, activation)
        w = Var((rand(Float64, inputs, outputs) .* 2 .- 1) .* limit |> transpose |> Matrix)
        b = Var(zeros(Float64, outputs, 1))
        return new(w, b, activation)
    end
end

function Base.show(io::IO, l::Dense)
    print(io, "Dense(", size(l.w.data, 2), " -> ", size(l.w.data, 1), ")")
end

params(l::Dense) = [l.w, l.b]

(l::Dense)(x::Var) = l.activation(add(matmul(l.w, x), l.b))

# Plain-array forward pass for fast inference (no graph).
function (l::Dense)(x::AbstractArray{Float64})
    z = l.w.data * x
    z = z .+ l.b.data
    return l.activation(z)
end

end # module Layers