# Kestrel.Losses - loss functions.

module Losses

using ..Autodiff
using ..Autodiff: cross_entropy, softmax_cross_entropy

export cross_entropy, softmax_cross_entropy, mse

# Mean squared error between a predicted Var and a plain target array of the
# same shape.
function mse(y::Var, target::AbstractArray{Float64})
    @assert size(y.data) == size(target) "mse: prediction size $(size(y.data)) != target size $(size(target))"
    diff = subtract(y, Var(copy(target)))
    return mean(elementwise_mul(diff, diff))
end

end # module Losses