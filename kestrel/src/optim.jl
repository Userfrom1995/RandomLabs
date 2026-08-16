# Kestrel.Optim - mini-batch SGD with momentum and optional weight decay.

module Optim

using ..Autodiff

export SGD, step!

"""
    SGD(lr, momentum = 0.0, weight_decay = 0.0)

Stochastic gradient descent with momentum and optional L2 weight decay. Velocities
are keyed by parameter `Var` identity and persist for the whole training run, so
momentum accumulates across steps.
"""
mutable struct SGD
    lr::Float64
    momentum::Float64
    weight_decay::Float64
    velocities::Dict{Var,Array{Float64}}
end

function SGD(lr::Real, momentum::Real = 0.0, weight_decay::Real = 0.0)
    @assert lr > 0 "SGD: learning rate must be positive, got $lr"
    @assert momentum >= 0 && momentum < 1 "SGD: momentum must be in [0, 1), got $momentum"
    @assert weight_decay >= 0 "SGD: weight_decay must be non-negative, got $weight_decay"
    return SGD(Float64(lr), Float64(momentum), Float64(weight_decay), Dict{Var,Array{Float64}}())
end

"""
    step!(opt, params)

Apply one gradient-descent update to each parameter `Var` using the gradients
accumulated on it, then leave the parameters ready for `zero_grad!`.
"""
function step!(opt::SGD, ps::AbstractVector{Var})
    for p in ps
        v = get!(opt.velocities, p) do
            zeros(Float64, size(p.data))
        end
        g = opt.weight_decay > 0.0 ? p.grad .+ opt.weight_decay .* p.data : p.grad
        v .*= opt.momentum
        v .-= opt.lr .* g
        p.data .+= v
    end
    return nothing
end

end # module Optim