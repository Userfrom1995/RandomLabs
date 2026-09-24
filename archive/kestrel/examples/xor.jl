# Train a 2-4-2 MLP to learn XOR using softmax + cross-entropy.
# Run from the kestrel/ directory:
#   julia --project=. examples/xor.jl
using Kestrel
using Random

x = Float64[0 0 1 1; 0 1 0 1]
y = [1, 2, 2, 1]  # 1-based classes: 0 -> (0,0) and (1,1), 1 -> (0,1) and (1,0)

model = MLP([2, 4, 2]; activation = sigmoid)
train!(model, x, y; epochs = 2000, batch = 4, lr = 0.5, momentum = 0.9,
    rng = MersenneTwister(3), verbose = false)

acc = accuracy(model, x, y)
println("XOR accuracy: ", round(acc, digits = 4))
println("predict (0,0) -> class ", classify(model, [0.0, 0.0]), " (expect 1)")
println("predict (0,1) -> class ", classify(model, [0.0, 1.0]), " (expect 2)")
println("predict (1,0) -> class ", classify(model, [1.0, 0.0]), " (expect 2)")
println("predict (1,1) -> class ", classify(model, [1.0, 1.0]), " (expect 1)")