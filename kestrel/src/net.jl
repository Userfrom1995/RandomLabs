# Kestrel.Net - MLP, the training loop, and prediction helpers.

module Net

using ..Autodiff
using ..Layers
using ..Optim
using Random

export MLP, params, forward, predict, predict_one, classify, accuracy, train!

"""
    MLP(arch::Vector{Int}; activation = relu)

A feed-forward network whose layer sizes are `arch` (`[input, hidden..., output]`).
Hidden layers use `activation`; the final layer is linear so that its output can
be fed to `softmax`/`cross_entropy`.
"""
struct MLP
    layers::Vector{Layers.Dense}
    function MLP(arch::Vector{Int}; activation::Function = Layers.relu)
        @assert length(arch) >= 2 "MLP: arch must have at least an input and an output size"
        @assert all(>(0), arch) "MLP: all layer sizes must be positive"
        layers = Layers.Dense[]
        for i in 1:(length(arch) - 1)
            act = i == length(arch) - 1 ? identity : activation
            push!(layers, Layers.Dense(arch[i], arch[i + 1], act))
        end
        return new(layers)
    end
end

function Base.show(io::IO, m::MLP)
    sizes = [size(l.w.data, 2) for l in m.layers]
    push!(sizes, size(m.layers[end].w.data, 1))
    print(io, "MLP(", join(sizes, " -> "), ")")
end

params(m::MLP) = vcat((Layers.params(l) for l in m.layers)...)

# Forward pass through the autodiff graph (for training).
function forward(m::MLP, x::Var)
    z = x
    for l in m.layers
        z = l(z)
    end
    return z
end

# Fast plain-array forward pass for inference: returns (classes, batch)
# probabilities via a stable softmax.
function predict(m::MLP, x::AbstractMatrix{Float64})
    @assert size(x, 1) == size(m.layers[1].w.data, 2) "predict: input rows $(size(x,1)) != expected $(size(m.layers[1].w.data, 2))"
    z = Float64.(x)
    for l in m.layers
        z = l(z)
    end
    return Autodiff.softmax(z)
end

predict_one(m::MLP, x::AbstractVector{Float64}) = predict(m, reshape(x, :, 1))[:, 1]

classify(m::MLP, x::AbstractVector{Float64}) = argmax(predict_one(m, x))
classify(m::MLP, x::AbstractMatrix{Float64}) = [argmax(predict(m, x)[:, j]) for j in 1:size(x, 2)]

function accuracy(m::MLP, images::AbstractMatrix{Float64}, labels::Vector{Int})
    @assert length(labels) == size(images, 2) "accuracy: $(length(labels)) labels for $(size(images,2)) images"
    probs = predict(m, images)
    correct = 0
    for j in 1:size(probs, 2)
        argmax(probs[:, j]) == labels[j] && (correct += 1)
    end
    return correct / size(probs, 2)
end

"""
    train!(model, images, labels; epochs, batch, lr, momentum, weight_decay,
           rng, loss_curve, verbose)

Mini-batch SGD over `epochs`. `images` is `(input, samples)`, `labels` is a
`Vector{Int}` of 1-based class indices. Returns `(losses, accuracies)` per epoch;
if `loss_curve` is a path, also writes a CSV of per-epoch loss and accuracy.
"""
function train!(model::MLP, images::AbstractMatrix{Float64}, labels::Vector{Int};
        epochs::Int = 10, batch::Int = 32, lr::Real = 0.1, momentum::Real = 0.0,
        weight_decay::Real = 0.0, rng::Random.AbstractRNG = Random.default_rng(),
        loss_curve::Union{AbstractString,Nothing} = nothing, verbose::Bool = true)
    n = size(images, 2)
    @assert n > 0 "train!: no training samples"
    @assert length(labels) == n "train!: $(length(labels)) labels for $n images"
    @assert batch > 0 "train!: batch size must be positive"
    @assert epochs > 0 "train!: epochs must be positive"
    opt = Optim.SGD(lr, momentum, weight_decay)
    losses = Float64[]
    accs = Float64[]
    order = collect(1:n)
    for epoch in 1:epochs
        Random.shuffle!(rng, order)
        epoch_loss = 0.0
        count = 0
        for start in 1:batch:n
            stop = min(start + batch - 1, n)
            idx = view(order, start:stop)
            Xb = images[:, idx]
            lb = labels[idx]
            logits = forward(model, Var(Xb))
            loss = Autodiff.softmax_cross_entropy(logits, lb)
            Autodiff.backward!(loss)
            Optim.step!(opt, params(model))
            Autodiff.zero_grad!(params(model))
            epoch_loss += value(loss)[1] * length(idx)
            count += length(idx)
        end
        epoch_loss /= count
        acc = accuracy(model, images, labels)
        push!(losses, epoch_loss)
        push!(accs, acc)
        verbose && println(rpad("epoch $epoch", 12), rpad("loss " * string(round(epoch_loss, digits=6)), 26),
            "acc ", round(acc, digits=4))
    end
    if loss_curve !== nothing
        _write_curve(String(loss_curve), losses, accs)
    end
    return (losses = losses, accuracies = accs)
end

function _write_curve(path::AbstractString, losses::Vector{Float64}, accs::Vector{Float64})
    open(path, "w") do io
        println(io, "epoch,loss,accuracy")
        for i in eachindex(losses)
            println(io, i, ",", losses[i], ",", accs[i])
        end
    end
    return nothing
end

end # module Net