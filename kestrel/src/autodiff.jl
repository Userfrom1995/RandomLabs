# Kestrel.Autodiff - reverse-mode automatic differentiation on a tape.
#
# A `Var` wraps an array value and an equal-shaped gradient, and remembers the
# operation that produced it. Every operation records a backward closure that,
# given the gradient of its output, accumulates the gradient of its inputs.
# `backward!` walks the graph in reverse (post-order collection, then reverse
# topological order) and every Var ends up holding dL/dx. There is no global
# tape: the graph lives on the Vars themselves and is collected when the caller
# drops its references.
#
# Ops: matmul, add, subtract, negate, elementwise multiply, elementwise unary
# (relu, sigmoid, plus Base exp/log/tanh extended to Var), Base sum/mean, Base
# transpose/permutedims/reshape, and fused stable softmax and
# softmax+cross-entropy. Shapes may differ from their inputs via broadcasting;
# gradients are reduced back to each input's shape by summing over the broadcast
# dims.

module Autodiff

export Var, value, grad, backward!, zero_grad!,
       matmul, add, subtract, negate, elementwise_mul,
       relu, sigmoid, exp, log, tanh,
       sum, mean, transpose, permutedims, reshape,
       softmax, cross_entropy, softmax_cross_entropy

import Base: exp, log, tanh, sum, transpose, permutedims, reshape
import Statistics: mean

# --- Operation records --------------------------------------------------------

abstract type Op end

# --- Var ---------------------------------------------------------------------

mutable struct Var
    data::Array{Float64}
    grad::Array{Float64}
    op::Union{Nothing,Op}
end

Var(data::Array{Float64}) = Var(data, zeros(Float64, size(data)), nothing)
Var(data::AbstractArray{<:Real}) = Var(Float64.(data))
Var(x::Real) = Var([Float64(x)])

value(v::Var) = v.data
grad(v::Var) = v.grad

function zero_grad!(v::Var)
    fill!(v.grad, 0.0)
    return v
end
zero_grad!(vs::AbstractVector{Var}) = (foreach(zero_grad!, vs); vs)

# A function-op produced by an operation: holds the input Vars and a closure
# that, given the output gradient, accumulates into the inputs' gradients.
mutable struct FuncOp <: Op
    inputs::Vector{Var}
    backward!::Function
end

# --- Graph walk ---------------------------------------------------------------

# Collect the producing ops of every Var in post-order (inputs before outputs),
# then run their backward closures in REVERSE order, so each op sees its output
# gradient fully accumulated by its consumers first.
function backward!(y::Var)
    fill!(y.grad, 1.0)
    visited = Set{Op}()
    order = Var[]
    _order!(y, visited, order)
    for v in Iterators.reverse(order)
        v.op.backward!(v.grad)
    end
    return y
end

function _order!(v::Var, visited::Set{Op}, order::Vector{Var})
    op = v.op
    op === nothing && return
    op in visited && return
    push!(visited, op)
    for x in op.inputs
        _order!(x, visited, order)
    end
    push!(order, v)
    return nothing
end

# --- Internals ----------------------------------------------------------------

function _var(data::Array{Float64}, inputs::Vector{Var}, backward!::Function)
    return Var(data, zeros(Float64, size(data)), FuncOp(inputs, backward!))
end

# Reduce a gradient array `g` (shaped like the op output) back to the shape of
# an input that the output was broadcast from: sum over any dim that was
# broadcast (input size 1 but output size > 1).
function bcast_reduce(g::Array{Float64}, inshape::Dims)
    size(g) == inshape && return g
    out = g
    nd = max(length(inshape), ndims(g))
    for d in 1:nd
        id = d <= length(inshape) ? inshape[d] : 1
        gd = d <= ndims(g) ? size(g, d) : 1
        if id == 1 && gd > 1
            out = sum(out; dims=d)
        end
    end
    return reshape(out, inshape...)
end

# --- Elementwise unary/binary ops ---------------------------------------------

function _unary(x::Var, f::Function, df::Function)
    data = f.(x.data)
    return _var(data, [x], g -> begin
        x.grad .+= g .* df.(x.data)
    end)
end

function _binary(a::Var, b::Var, f::Function, da::Function, db::Function)
    data = f.(a.data, b.data)
    return _var(data, [a, b], g -> begin
        a.grad .+= bcast_reduce(g .* da.(a.data, b.data), size(a.data))
        b.grad .+= bcast_reduce(g .* db.(a.data, b.data), size(b.data))
    end)
end

# --- Public elementwise ops ---------------------------------------------------

function add(a::Var, b::Var)
    data = a.data .+ b.data
    return _var(data, [a, b], g -> begin
        a.grad .+= bcast_reduce(g, size(a.data))
        b.grad .+= bcast_reduce(g, size(b.data))
    end)
end

function subtract(a::Var, b::Var)
    data = a.data .- b.data
    return _var(data, [a, b], g -> begin
        a.grad .+= bcast_reduce(g, size(a.data))
        b.grad .+= bcast_reduce(-g, size(b.data))
    end)
end

function negate(x::Var)
    data = -x.data
    return _var(data, [x], g -> begin
        x.grad .+= -g
    end)
end

elementwise_mul(a::Var, b::Var) = _binary(a, b, .*, (_, y) -> y, (x, _) -> x)

relu(x::Var) = _unary(x, z -> max(z, 0.0), z -> z > 0.0 ? 1.0 : 0.0)
sigmoid(x::Var) = _unary(x, z -> 1.0 / (1.0 + exp(-z)), z -> begin
    s = 1.0 / (1.0 + exp(-z))
    s * (1.0 - s)
end)
tanh(x::Var) = _unary(x, tanh, z -> 1.0 - tanh(z)^2)
exp(x::Var) = _unary(x, exp, exp)
log(x::Var) = _unary(x, log, z -> 1.0 / z)

# --- Reduction ops ------------------------------------------------------------

function sum(x::Var)
    data = fill(sum(x.data), (1,))
    return _var(data, [x], g -> begin
        x.grad .+= g[1] .* ones(Float64, size(x.data))
    end)
end

function mean(x::Var)
    n = length(x.data)
    data = fill(sum(x.data) / n, (1,))
    return _var(data, [x], g -> begin
        x.grad .+= (g[1] / n) .* ones(Float64, size(x.data))
    end)
end

# --- Shape ops -----------------------------------------------------------------

function matmul(a::Var, b::Var)
    data = a.data * b.data
    return _var(data, [a, b], g -> begin
        a.grad .+= g * transpose(b.data)
        b.grad .+= transpose(a.data) * g
    end)
end

function transpose(x::Var)
    data = permutedims(x.data)
    return _var(data, [x], g -> begin
        x.grad .+= permutedims(g)
    end)
end

function permutedims(x::Var, perm::NTuple{N,Int}) where {N}
    data = permutedims(x.data, perm)
    return _var(data, [x], g -> begin
        x.grad .+= permutedims(g, invperm(perm))
    end)
end

function reshape(x::Var, dims::Dims)
    data = reshape(x.data, dims)
    return _var(data, [x], g -> begin
        x.grad .+= reshape(g, size(x.data))
    end)
end

# --- Fused softmax / cross-entropy ---------------------------------------------
#
# Both are max-shifted so the exponentials can never overflow. `softmax`
# normalizes each COLUMN (each column is one sample's logits over classes).

function softmax(x::Var)
    data = _softmax_plain(x.data)
    return _var(data, [x], g -> begin
        s = data
        x.grad .+= s .* (g .- sum(g .* s; dims=1))
    end)
end

function _softmax_plain(z::AbstractArray{Float64})
    shift = maximum(z; dims=1)
    e = exp.(z .- shift)
    return e ./ sum(e; dims=1)
end

# Cross-entropy of probabilities `probs` (each column sums to 1) against integer
# class targets (1-based class index per column).
function cross_entropy(probs::Var, targets::Vector{Int})
    p = probs.data
    n = size(p, 2)
    @assert length(targets) == n "cross_entropy: got $(length(targets)) targets for $(n) samples"
    loss = 0.0
    for j in 1:n
        loss -= log(p[targets[j], j])
    end
    loss /= n
    data = fill(loss, (1,))
    return _var(data, [probs], g -> begin
        d = zeros(Float64, size(p))
        for j in 1:n
            d[targets[j], j] = -1.0 / (p[targets[j], j] * n)
        end
        probs.grad .+= g[1] .* d
    end)
end

# Fused softmax + cross-entropy over raw logits: numerically stable, and the
# gradient is just (softmax(logits) - onehot(targets)) / n.
function softmax_cross_entropy(logits::Var, targets::Vector{Int})
    z = logits.data
    n = size(z, 2)
    @assert length(targets) == n "softmax_cross_entropy: got $(length(targets)) targets for $(n) samples"
    shift = maximum(z; dims=1)
    lse = shift .+ log.(sum(exp.(z .- shift); dims=1))
    loss = 0.0
    for j in 1:n
        loss += lse[j] - z[targets[j], j]
    end
    loss /= n
    data = fill(loss, (1,))
    return _var(data, [logits], g -> begin
        s = _softmax_plain(z)
        for j in 1:n
            s[targets[j], j] -= 1.0
        end
        s ./= n
        logits.grad .+= g[1] .* s
    end)
end

# --- Pure-array helpers (inference without building a graph) -------------------

function softmax(z::AbstractArray{Float64})
    return _softmax_plain(z)
end

function log_softmax(z::AbstractArray{Float64})
    shift = maximum(z; dims=1)
    return (z .- shift) .- log.(sum(exp.(z .- shift); dims=1))
end

function relu(z::AbstractArray{Float64})
    return max.(z, 0.0)
end

function sigmoid(z::AbstractArray{Float64})
    return 1.0 ./ (1.0 .+ exp.(-z))
end

end # module Autodiff