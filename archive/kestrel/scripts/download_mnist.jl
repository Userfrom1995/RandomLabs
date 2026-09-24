#!/usr/bin/env julia
# Kestrel.fetch_mnist - download the MNIST training set (IDX format) into ./data.
#
# Uses the Downloads stdlib; decompresses the .gz files by shelling out to
# `gzip` (available on virtually all systems). Requires no packages.

using Downloads

const BASE = "https://ossci-datasets.s3.amazonaws.com/mnist"
const FILES = [
    "train-images-idx3-ubyte.gz",
    "train-labels-idx1-ubyte.gz",
]

function main(args)
    dir = length(args) >= 1 ? args[1] : joinpath(@__DIR__, "..", "data")
    mkpath(dir)
    for f in FILES
        out = joinpath(dir, f)
        if isfile(out)
            println("cached $f")
        else
            url = "$BASE/$f"
            println("downloading $url")
            Downloads.download(url, out)
        end
    end
    for f in FILES
        gz = joinpath(dir, f)
        raw = joinpath(dir, replace(f, ".gz" => ""))
        if isfile(raw)
            println("already unpacked $f")
        else
            println("unpacking $f")
            run(`gzip -dk $gz`)
        end
    end
    ok = isfile(joinpath(dir, "train-images-idx3-ubyte")) &&
         isfile(joinpath(dir, "train-labels-idx1-ubyte"))
    ok || (println(stderr, "error: unpacked files missing in $dir"); exit(1))
    println("MNIST ready in $dir")
end

main(ARGS)