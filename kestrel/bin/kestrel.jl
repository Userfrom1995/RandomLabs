#!/usr/bin/env julia
# Kestrel CLI. Run with the project active:
#   julia --project=. bin/kestrel.jl <command> [--opt value ...]
#
# Commands: train, eval, export, autograd-check, selftest.
# All options are validated; a missing or unknown option is a clear error with
# a non-zero exit. No interactive input.

using Kestrel
using Kestrel: MLP, Dense, train!, accuracy, predict, classify
using Random

const USAGE = """
usage: kestrel.jl <command> [options]

commands:
  train  --epochs N [--batch N] [--lr F] [--momentum F] [--weight-decay F]
              [--layers L1,L2,...,Lk] [--data synth|mnist] [--samples N]
              [--seed N] [--out FILE] [--loss-curve FILE]
         Train an MLP and write the trained model to FILE.
  eval   --model FILE [--data synth|mnist] [--samples N] [--seed N]
         Load a model and report loss and accuracy on a dataset.
  export --model FILE --out FILE [--name STR]
         Export model weights as JSON (or a window.<name> JS file for the web).
  autograd-check
         Verify autodiff gradients against finite differences.
  selftest
         Train a tiny XOR network and assert it converges.
"""

struct ArgError <: Exception
    msg::String
end

# Parse `--key value` pairs into a Dict. Rejects positional and unknown args.
function parse_flags(args::Vector{String}; allowed::Set{String})
    opts = Dict{String,String}()
    i = 1
    while i <= length(args)
        a = args[i]
        startswith(a, "--") || throw(ArgError("unexpected positional argument '$a' (expected --option value)"))
        key = a
        key in allowed || throw(ArgError("unknown option '$key'"))
        i + 1 <= length(args) || throw(ArgError("missing value for '$key'"))
        opts[key] = args[i + 1]
        i += 2
    end
    return opts
end

function get_int(opts::Dict{String,String}, key::String, default::Int; min::Int = -1)
    haskey(opts, key) || return default
    v = tryparse(Int, opts[key])
    v === nothing && throw(ArgError("option '$key' expects an integer, got '$(opts[key])'"))
    min >= 0 && v < min && throw(ArgError("option '$key' must be >= $min, got $v"))
    return v
end

function get_float(opts::Dict{String,String}, key::String, default::Float64; min::Float64 = NaN)
    haskey(opts, key) || return default
    v = tryparse(Float64, opts[key])
    v === nothing && throw(ArgError("option '$key' expects a number, got '$(opts[key])'"))
    !isnan(min) && v < min && throw(ArgError("option '$key' must be >= $min, got $v"))
    return v
end

function get_str(opts::Dict{String,String}, key::String, default::String = "")
    return haskey(opts, key) ? opts[key] : default
end

function get_required(opts::Dict{String,String}, key::String)
    haskey(opts, key) || throw(ArgError("missing required option '$key'"))
    return opts[key]
end

function parse_layers(s::String)
    parts = split(s, ',')
    layers = Int[]
    for p in parts
        v = tryparse(Int, strip(p))
        v === nothing && throw(ArgError("option '--layers' expects a comma-separated list of integers, got '$s'"))
        v > 0 || throw(ArgError("layer sizes must be positive, got $v"))
        push!(layers, v)
    end
    length(layers) >= 2 || throw(ArgError("--layers needs at least an input and output size"))
    return layers
end

function load_dataset(kind::String, samples::Int, seed::Int; dir::String = "data")
    rng = MersenneTwister(seed)
    if kind == "synth"
        return synthetic_digits(samples; rng = rng)
    elseif kind == "mnist"
        mnist_available(dir) || throw(ArgError("MNIST data not found in '$dir'. Run `julia scripts/download_mnist.jl` first."))
        img, lab = load_mnist(dir)
        if samples < size(img, 2)
            idx = rand(rng, 1:size(img, 2), samples)
            return img[:, idx], lab[idx]
        end
        return img, lab
    else
        throw(ArgError("unknown dataset '$kind' (use synth or mnist)"))
    end
end

# --- commands -----------------------------------------------------------------

function cmd_train(args)
    opts = parse_flags(args; allowed = Set([
        "--epochs", "--batch", "--lr", "--momentum", "--weight-decay",
        "--layers", "--data", "--samples", "--seed", "--out", "--loss-curve"]))
    epochs = get_int(opts, "--epochs", 3; min = 1)
    batch = get_int(opts, "--batch", 64; min = 1)
    lr = get_float(opts, "--lr", 0.1; min = 0.0)
    momentum = get_float(opts, "--momentum", 0.9; min = 0.0)
    wd = get_float(opts, "--weight-decay", 0.0; min = 0.0)
    layers = parse_layers(get_str(opts, "--layers", "784,128,10"))
    kind = get_str(opts, "--data", "synth")
    samples = get_int(opts, "--samples", 5000; min = 1)
    seed = get_int(opts, "--seed", 42)
    out = get_str(opts, "--out", "model.json")
    curve = get_str(opts, "--loss-curve", "")
    Random.seed!(seed)

    println("Kestrel train: data=$kind layers=$(join(layers, "->")) epochs=$epochs batch=$batch lr=$lr momentum=$momentum seed=$seed")
    img, lab = load_dataset(kind, samples, seed)
    input_dim = size(img, 1)
    layers[1] == input_dim || throw(ArgError("first layer size $(layers[1]) does not match input dim $input_dim"))
    layers[end] == 10 || throw(ArgError("last layer size $(layers[end]) must be 10 (digit classes)"))

    model = MLP(layers)
    result = train!(model, img, lab; epochs = epochs, batch = batch, lr = lr,
        momentum = momentum, weight_decay = wd, rng = MersenneTwister(seed),
        loss_curve = isempty(curve) ? nothing : curve, verbose = true)
    final_acc = result.accuracies[end]
    println("final accuracy: ", round(final_acc, digits = 4))
    save_model(model, out)
    println("model written to $out")
    return nothing
end

function cmd_eval(args)
    opts = parse_flags(args; allowed = Set(["--model", "--data", "--samples", "--seed", "--dir"]))
    path = get_required(opts, "--model")
    kind = get_str(opts, "--data", "synth")
    samples = get_int(opts, "--samples", 1000; min = 1)
    seed = get_int(opts, "--seed", 42)
    dir = get_str(opts, "--dir", "data")
    isfile(path) || throw(ArgError("model file not found: $path"))
    model = load_model(path)
    img, lab = load_dataset(kind, samples, seed)
    acc = accuracy(model, img, lab)
    # per-class accuracy
    classes = 10
    per = zeros(Int, classes)
    tot = zeros(Int, classes)
    probs = predict(model, img)
    for j in 1:size(probs, 2)
        c = lab[j]
        tot[c] += 1
        argmax(probs[:, j]) == c && (per[c] += 1)
    end
    println("model: $path")
    println("dataset: $kind ($(size(img, 2)) samples)")
    println("overall accuracy: ", round(acc, digits = 4))
    for c in 1:classes
        tot[c] > 0 && println(rpad("digit $(c - 1)", 12), round(per[c] / tot[c], digits = 4), "  (n=$(tot[c]))")
    end
    return nothing
end

function cmd_export(args)
    opts = parse_flags(args; allowed = Set(["--model", "--out", "--name"]))
    path = get_required(opts, "--model")
    out = get_required(opts, "--out")
    name = get_str(opts, "--name", "KESTREL")
    isfile(path) || throw(ArgError("model file not found: $path"))
    model = load_model(path)
    export_weights(model, out; name = name)
    println("weights exported to $out")
    return nothing
end

function cmd_autograd_check(args)
    isempty(args) || throw(ArgError("autograd-check takes no options"))
    r = autograd_check()
    println("\nautograd-check: $(r.failures) failures across $(r.total) checks")
    r.failures == 0 || exit(1)
    return nothing
end

function cmd_selftest(args)
    isempty(args) || throw(ArgError("selftest takes no options"))
    acc = selftest_xor()
    println("selftest passed: XOR converged to accuracy $acc")
    return nothing
end

# --- entry --------------------------------------------------------------------

function main(argv::Vector{String})
    isempty(argv) && (println(stderr, USAGE); exit(1))
    cmd = argv[1]
    rest = argv[2:end]
    try
        if cmd == "train"
            cmd_train(rest)
        elseif cmd == "eval"
            cmd_eval(rest)
        elseif cmd == "export"
            cmd_export(rest)
        elseif cmd == "autograd-check"
            cmd_autograd_check(rest)
        elseif cmd == "selftest"
            cmd_selftest(rest)
        elseif cmd in ("--help", "-h", "help")
            println(USAGE)
        else
            throw(ArgError("unknown command '$cmd'"))
        end
    catch err
        if err isa ArgError
            println(stderr, "error: ", err.msg)
            println(stderr, USAGE)
            exit(1)
        else
            rethrow()
        end
    end
    exit(0)
end

main(ARGS)