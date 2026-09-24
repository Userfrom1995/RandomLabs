# Train an MLP on synthetic digits and export the weights for the web playground.
# Run from the kestrel/ directory:
#   julia --project=. examples/train.jl
using Kestrel
using Random

images, labels = synthetic_digits(4000; seed = 1)
model = MLP([784, 128, 10])

train!(model, images, labels; epochs = 8, batch = 128, lr = 0.25, momentum = 0.9,
    rng = MersenneTwister(42))

println("final accuracy: ", round(accuracy(model, images, labels), digits = 4))

save_model(model, "model.json")
export_weights(model, "weights/demo.js")
println("saved model.json and weights/demo.js")