# Kestrel.Data - datasets: a deterministic synthetic digit generator and a real
# MNIST IDX loader.

module Data

using Random

export synthetic_digits, load_mnist, mnist_available

# 5x7 bitmap glyphs for the ten digits (row strings, '1' = ink).
const GLYPHS = Dict{Int,Vector{String}}(
    0 => ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    1 => ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    2 => ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    3 => ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    4 => ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    5 => ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    6 => ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    7 => ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    8 => ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    9 => ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
)

function _glyph_array(digit::Int)
    rows = GLYPHS[digit]
    g = zeros(Float64, 7, 5)
    for (i, row) in enumerate(rows)
        for (j, ch) in enumerate(row)
            g[i, j] = ch == '1' ? 1.0 : 0.0
        end
    end
    return g
end

# Bilinear sample of a glyph at a fractional (row, col) position in glyph space.
function _glyph_sample(g::Matrix{Float64}, gy::Float64, gx::Float64)
    r0 = floor(Int, gy)
    c0 = floor(Int, gx)
    if r0 < 1 || c0 < 1 || r0 > 6 || c0 > 4
        return 0.0
    end
    fr = gy - r0
    fc = gx - c0
    r1 = min(r0 + 1, 7)
    c1 = min(c0 + 1, 5)
    v = g[r0, c0] * (1 - fr) * (1 - fc) +
        g[r1, c0] * fr * (1 - fc) +
        g[r0, c1] * (1 - fr) * fc +
        g[r1, c1] * fr * fc
    return v
end

# Render one 28x28 sample from a digit with random affine perturbation.
function _render_digit(g::Matrix{Float64}, rng::Random.AbstractRNG)
    img = zeros(Float64, 28, 28)
    scale = 0.9 + rand(rng) * 0.5            # 0.9 .. 1.4
    dx = (rand(rng) * 2 - 1) * 3.0           # ±3 px
    dy = (rand(rng) * 2 - 1) * 3.0
    cx = 14.0 + dx
    cy = 14.0 + dy
    x0 = cx - 2.5 * scale
    y0 = cy - 3.5 * scale
    noise = 0.05
    for r in 1:28, c in 1:28
        gx = (c - x0) / scale
        gy = (r - y0) / scale
        if 0.0 <= gx <= 5.0 && 0.0 <= gy <= 7.0
            v = _glyph_sample(g, gy, gx)
            v += randn(rng) * noise
            img[r, c] = clamp(v, 0.0, 1.0)
        end
    end
    return img
end

"""
    synthetic_digits(n; seed = nothing, rng = Random.default_rng())

Generate `n` 28x28 digit images from the built-in bitmap font with random
scale/shift/noise. Returns `(images, labels)` where `images` is `(784, n)` with
values in [0, 1] and `labels` is a `Vector{Int}` of 1-based class indices.
Deterministic for a given `seed`/`rng`.
"""
function synthetic_digits(n::Int; seed::Union{Integer,Nothing} = nothing, rng::Random.AbstractRNG = Random.default_rng())
    @assert n > 0 "synthetic_digits: n must be positive"
    r = seed === nothing ? rng : MersenneTwister(seed)
    images = zeros(Float64, 784, n)
    labels = Vector{Int}(undef, n)
    glyphs = [_glyph_array(d) for d in 0:9]
    for i in 1:n
        d = rand(r, 0:9)
        labels[i] = d + 1
        img = _render_digit(glyphs[d + 1], r)
        images[:, i] .= vec(img)
    end
    return images, labels
end

# --- Real MNIST (IDX format) ---------------------------------------------------

"""
    mnist_available(dir = "data")

Whether both MNIST IDX files (`train-images-idx3-ubyte`, `train-labels-idx1-ubyte`)
exist under `dir`. Fetch them with `scripts/download_mnist.jl`.
"""
function mnist_available(dir::AbstractString = "data")
    return isfile(joinpath(dir, "train-images-idx3-ubyte")) &&
           isfile(joinpath(dir, "train-labels-idx1-ubyte"))
end

function _read_idx_images(path::AbstractString)
    images = open(path, "r") do f
        magic = ntoh(read(f, UInt32))
        @assert magic == 0x00000803 "not an IDX image file: $path (magic $magic)"
        n = ntoh(read(f, UInt32))
        rows = ntoh(read(f, UInt32))
        cols = ntoh(read(f, UInt32))
        bytes = read(f, n * rows * cols)
        imgs = zeros(Float64, rows * cols, n)
        stride = rows * cols
        for i in 0:(n - 1), k in 1:stride
            imgs[k, i + 1] = bytes[i * stride + k] / 255.0
        end
        imgs
    end
    return images
end

function _read_idx_labels(path::AbstractString)
    labels = open(path, "r") do f
        magic = ntoh(read(f, UInt32))
        @assert magic == 0x00000801 "not an IDX label file: $path (magic $magic)"
        n = ntoh(read(f, UInt32))
        Int.(read(f, n)) .+ 1
    end
    return labels
end

"""
    load_mnist(dir = "data")

Load the MNIST training set from the IDX files under `dir`. Returns
`(images, labels)`: `images` is `(784, 60000)` with values in [0, 1], `labels`
is a `Vector{Int}` of 1-based class indices. Throws a descriptive error if the
files are missing (see `scripts/download_mnist.jl`).
"""
function load_mnist(dir::AbstractString = "data")
    img_path = joinpath(dir, "train-images-idx3-ubyte")
    lab_path = joinpath(dir, "train-labels-idx1-ubyte")
    if !isfile(img_path) || !isfile(lab_path)
        error("MNIST data not found in $dir. Run `julia scripts/download_mnist.jl` first.")
    end
    return _read_idx_images(img_path), _read_idx_labels(lab_path)
end

end # module Data