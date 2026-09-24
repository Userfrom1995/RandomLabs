# Kestrel.Serialize - model save/load and web export.

module Serialize

using ..Autodiff
using ..Net
using ..Layers
using ..Json

export save_model, load_model, export_weights, model_to_dict, model_from_dict

const FORMAT = "kestrel-model"
const VERSION = 1

function _activation_name(f::Function)::String
    f === identity && return "identity"
    f === Layers.relu && return "relu"
    f === Layers.sigmoid && return "sigmoid"
    f === Layers.tanh && return "tanh"
    return "custom"
end

function _activation_from_name(name::String)::Function
    name == "identity" && return identity
    name == "relu" && return Layers.relu
    name == "sigmoid" && return Layers.sigmoid
    name == "tanh" && return Layers.tanh
    error("serialize: unknown activation '$name'")
end

"""
    model_to_dict(model; sigdigits = nothing)

Convert an `MLP` into a plain nested structure (arch + weight matrices) that the
JSON encoder can serialize. With `sigdigits`, weights are rounded to that many
significant digits (used for compact web exports).
"""
function model_to_dict(model::Net.MLP; sigdigits::Union{Int,Nothing} = nothing)
    arch = Vector{Any}(undef, length(model.layers))
    weights = Vector{Any}(undef, length(model.layers))
    r(x) = sigdigits === nothing ? x : round.(x; sigdigits = sigdigits)
    for (i, l) in enumerate(model.layers)
        arch[i] = Dict{String,Any}(
            "input" => size(l.w.data, 2),
            "output" => size(l.w.data, 1),
            "activation" => _activation_name(l.activation),
        )
        weights[i] = Dict{String,Any}(
            "w" => collect(r(l.w.data)),
            "b" => collect(r(l.b.data)),
        )
    end
    return Dict{String,Any}(
        "format" => FORMAT,
        "version" => VERSION,
        "arch" => arch,
        "weights" => weights,
    )
end

"""
    model_from_dict(d)

Rebuild an `MLP` from the structure produced by `model_to_dict`.
"""
function model_from_dict(d::AbstractDict)
    arch_raw = d["arch"]
    weights_raw = d["weights"]
    @assert length(arch_raw) == length(weights_raw) "model: arch/weights length mismatch"
    sizes = Vector{Int}(undef, length(arch_raw) + 1)
    acts = Vector{Function}(undef, length(arch_raw))
    for (i, a) in enumerate(arch_raw)
        sizes[i] = Int(a["input"])
        acts[i] = _activation_from_name(String(a["activation"]))
    end
    sizes[end] = Int(arch_raw[end]["output"])
    model = Net.MLP(sizes; activation = Layers.relu)
    for (i, l) in enumerate(model.layers)
        w = _to_matrix(weights_raw[i]["w"])
        b = _to_matrix(weights_raw[i]["b"])
        @assert size(w) == size(l.w.data) "model: layer $i weight size $(size(w)) != $(size(l.w.data))"
        @assert size(b) == size(l.b.data) "model: layer $i bias size $(size(b)) != $(size(l.b.data))"
        l.w.data .= w
        l.b.data .= b
        l.activation = acts[i]
    end
    return model
end

function _to_matrix(x)::Matrix{Float64}
    rows = Vector{Any}(x)
    isempty(rows) && return zeros(Float64, 0, 0)
    m = reduce(hcat, [Float64.(Vector{Any}(r)) for r in rows])
    return permutedims(m)
end

"""
    save_model(model, path)

Serialize `model` to a portable `model.json` file.
"""
function save_model(model::Net.MLP, path::AbstractString)
    json = encode(model_to_dict(model))
    open(path, "w") do io
        println(io, json)
    end
    return path
end

"""
    load_model(path)

Load an `MLP` from a file written by `save_model` (or `export_weights`).
"""
function load_model(path::AbstractString)
    s = read(path, String)
    return model_from_dict(decode(s))
end

"""
    export_weights(model, path)

Export the model's weights for the web playground. If `path` ends in `.js`, the
file assigns `window.<name>` (or `globalThis` outside a browser, default
`KESTREL`) so it can be loaded with a plain `<script src>` tag with no server;
otherwise a bare JSON file is written.
"""
function export_weights(model::Net.MLP, path::AbstractString; name::String = "KESTREL", sigdigits::Int = 7)
    body = encode(model_to_dict(model; sigdigits = sigdigits))
    if endswith(String(path), ".js")
        open(path, "w") do io
            println(io, "(function(){ (typeof window !== \"undefined\" ? window : globalThis).", name, " = ", body, "; })();")
        end
    else
        open(path, "w") do io
            println(io, body)
        end
    end
    return path
end

end # module Serialize