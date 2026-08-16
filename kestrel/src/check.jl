# Kestrel.Check - numerical verification: autodiff gradients vs finite
# differences, and a XOR convergence self-test.

module Check

using ..Autodiff
using ..Layers
using ..Net
using Random

export autograd_check, selftest_xor

const Float = Float64

# `f` builds a scalar (length-1) loss graph from the SAME persistent leaf Vars
# every time it is called. We perturb one leaf element, recompute the loss with
# `f`, and compare the analytic gradient (from `backward!` of the first loss)
# against a central finite difference.
function _check_scalar(f::Function, leaves::Vector{Var}; rtol::Float = 1e-4, atol::Float = 1e-6)
    loss = f()
    Autodiff.backward!(loss)
    eps = 1e-6
    for leaf in leaves
        for i in eachindex(leaf.data)
            x0 = leaf.data[i]
            leaf.data[i] = x0 + eps
            fp = value(f())[1]
            leaf.data[i] = x0 - eps
            fm = value(f())[1]
            leaf.data[i] = x0
            numeric = (fp - fm) / (2eps)
            analytic = leaf.grad[i]
            abs(numeric - analytic) <= atol + rtol * abs(numeric) || return false
        end
    end
    return true
end

"""
    autograd_check(; quiet = false)

Run a finite-difference check of every autodiff operation. Returns
`(failures, total)`. Used by the CLI `autograd-check` command.
"""
function autograd_check(; quiet::Bool = false)
    rng = MersenneTwister(7)
    failures = 0
    total = 0

    function run(name::String, f::Function, leaves::Vector{Var})
        total += 1
        ok = try
            _check_scalar(f, leaves)
        catch err
            quiet || println(rpad(name, 44), "FAIL (", err, ")")
            false
        end
        quiet || println(rpad(name, 44), ok ? "ok" : "FAIL")
        ok || (failures += 1)
        return nothing
    end

    leaf(dims...) = Var(rand(rng, dims...))

    a = leaf(3, 4); b = leaf(4, 2)
    run("matmul + sum", () -> Autodiff.sum(Autodiff.matmul(a, b)), [a, b])

    a = leaf(3, 4); b = leaf(3, 1)
    run("broadcast add + sum", () -> Autodiff.sum(Autodiff.add(a, b)), [a, b])

    a = leaf(3, 4); b = leaf(1, 4)
    run("broadcast subtract + sum", () -> Autodiff.sum(Autodiff.subtract(a, b)), [a, b])

    a = leaf(3, 4)
    run("negate + sum", () -> Autodiff.sum(Autodiff.negate(a)), [a])

    a = leaf(3, 4); b = leaf(3, 4)
    run("elementwise mul + sum", () -> Autodiff.sum(Autodiff.elementwise_mul(a, b)), [a, b])

    a = leaf(3, 4)
    run("relu + sum", () -> Autodiff.sum(Autodiff.relu(a)), [a])

    a = leaf(3, 4)
    run("sigmoid + sum", () -> Autodiff.sum(Autodiff.sigmoid(a)), [a])

    a = leaf(3, 4)
    run("tanh + sum", () -> Autodiff.sum(Autodiff.tanh(a)), [a])

    a = leaf(3, 4)
    run("exp + sum", () -> Autodiff.sum(Autodiff.exp(a)), [a])

    a = Var(rand(rng, 3, 4) .+ 1.0)
    run("log + sum", () -> Autodiff.sum(Autodiff.log(a)), [a])

    a = leaf(3, 4)
    run("mean", () -> Autodiff.mean(a), [a])

    a = leaf(3, 4)
    run("transpose + sum", () -> Autodiff.sum(Autodiff.transpose(a)), [a])

    a = leaf(2, 3, 4)
    run("permutedims + sum", () -> Autodiff.sum(Autodiff.permutedims(a, (3, 1, 2))), [a])

    a = leaf(2, 6)
    run("reshape + sum", () -> Autodiff.sum(Autodiff.reshape(a, (3, 4))), [a])

    logits = leaf(4, 5)
    run("softmax -> cross_entropy", () -> begin
        probs = Autodiff.softmax(logits)
        Autodiff.cross_entropy(probs, [2, 1, 4, 3, 1])
    end, [logits])

    logits = leaf(4, 5)
    run("fused softmax_cross_entropy", () -> Autodiff.softmax_cross_entropy(logits, [2, 1, 4, 3, 1]), [logits])

    a = leaf(4, 3); b = leaf(4, 2)
    run("transposed matmul + sum", () -> Autodiff.sum(Autodiff.matmul(Autodiff.transpose(a), b)), [a, b])

    return (failures = failures, total = total)
end

"""
    selftest_xor(; epochs = 2000, seed = 3)

Train a 2-4-2 MLP on XOR with softmax + cross-entropy and assert it reaches
100% accuracy. Returns the final accuracy; throws if training fails to converge.
Used by the CLI `selftest` command.
"""
function selftest_xor(; epochs::Int = 2000, seed::Int = 3)
    rng = MersenneTwister(seed)
    x = Float64[0 0 1 1; 0 1 0 1]
    y = [1, 2, 2, 1]  # 1-based classes: 0 -> (0,0) and (1,1), 1 -> (0,1) and (1,0)
    model = MLP([2, 4, 2]; activation = sigmoid)
    train!(model, x, y; epochs = epochs, batch = 4, lr = 0.5, momentum = 0.9,
        rng = rng, verbose = false)
    acc = accuracy(model, x, y)
    acc == 1.0 || error("selftest_xor: XOR did not converge (accuracy $acc)")
    return acc
end

end # module Check