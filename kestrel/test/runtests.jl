using Kestrel
using Test
using Random

@testset "Kestrel" begin

    @testset "autodiff core" begin
        # Gradient checks are run by Check.autograd_check (finite differences);
        # run the full suite and assert it all passes.
        r = autograd_check(quiet = true)
        @test r.failures == 0
        @test r.total == 17

        # Elementary graph: y = (2x + 3)^2 at x = 4 -> y = 121, dy/dx = 44.
        x = Var(4.0)
        t = add(elementwise_mul(Var(2.0), x), Var(3.0))
        y = elementwise_mul(t, t)
        @test value(y)[1] ≈ 121.0
        backward!(y)
        @test grad(x)[1] ≈ 44.0

        # Elementwise ops on a vector.
        a = Var([1.0, 2.0, 3.0])
        b = add(elementwise_mul(a, Var(2.0)), Var(1.0))
        backward!(sum(b))
        @test value(b) == [3.0, 5.0, 7.0]
        @test grad(a) == [2.0, 2.0, 2.0]

        # softmax_cross_entropy gradient has the classic softmax - one-hot form.
        logits = Var([1.0, 2.0, 3.0])
        loss = softmax_cross_entropy(logits, [1])
        backward!(loss)
        p = softmax([1.0, 2.0, 3.0])
        @test grad(logits) ≈ p .- [1.0, 0.0, 0.0]
        @test value(loss)[1] ≈ -log(p[1])

        # mean / transpose / reshape / matmul graph.
        m = Var(reshape(collect(1.0:6.0), 3, 2))
        out = mean(matmul(transpose(m), m))
        backward!(out)
        expected = sum(reshape(collect(1.0:6.0), 3, 2)' *
                       reshape(collect(1.0:6.0), 3, 2)) / 4
        @test value(out)[1] ≈ expected
    end

    @testset "layers and optimizer" begin
        layer = Dense(4, 3, relu)
        @test size(layer.w.data) == (3, 4)
        @test size(layer.b.data) == (3, 1)
        x = Var(reshape(collect(1.0:4.0), 4, 1))
        out = layer(x)
        @test size(value(out)) == (3, 1)

        opt = SGD(0.1, 0.9)
        ps = Var[Var(1.0), Var(2.0)]
        grad(ps[1])[1] = 1.0
        step!(opt, ps)
        @test value(ps[1])[1] < 1.0  # weights moved along the gradient
    end

    @testset "JSON round-trip" begin
        d = Dict{String,Any}(
            "int" => 42,
            "float" => 3.14,
            "str" => "hello \"world\"",
            "arr" => [1, 2, 3],
            "nested" => Dict{String,Any}("a" => [true, false]),
            "bool" => true,
        )
        @test decode(encode(d)) == d

        # Unicode (multi-byte UTF-8) is handled.
        @test decode(encode("caf\u00e9")) == "caf\u00e9"
        @test decode(encode("digits: 0-9")) == "digits: 0-9"
    end

    @testset "synthetic data" begin
        images, labels = synthetic_digits(100; seed = 1)
        @test size(images) == (784, 100)
        @test length(labels) == 100
        @test all(0.0 .<= images .<= 1.0)
        @test all(1 .<= labels .<= 10)

        # Deterministic under the same seed.
        im2, lb2 = synthetic_digits(100; seed = 1)
        @test images == im2
        @test labels == lb2
    end

    @testset "training converges on synthetic digits" begin
        images, labels = synthetic_digits(400; seed = 1)
        model = MLP([784, 64, 10])
        losses, accs = train!(model, images, labels;
            epochs = 10, batch = 32, lr = 0.2, momentum = 0.9,
            rng = MersenneTwister(1), verbose = false)
        @test length(losses) == 10
        @test accs[end] > 0.9          # near-perfect on the synthetic task
        @test losses[end] < losses[1]  # loss decreases
        @test accuracy(model, images, labels) > 0.9
    end

    @testset "save/load bit-exact round-trip" begin
        dir = mktempdir()
        model = MLP([5, 3, 2]; activation = tanh)
        save_model(model, joinpath(dir, "m.json"))
        restored = load_model(joinpath(dir, "m.json"))
        @test model_to_dict(restored) == model_to_dict(model)

        m2 = MLP([8, 4, 3])
        path = joinpath(dir, "m2.json")
        save_model(m2, path)
        @test model_to_dict(load_model(path)) == model_to_dict(m2)
    end

    @testset "XOR self-test" begin
        acc = selftest_xor(epochs = 1500, seed = 3)
        @test acc > 0.9
    end

    @testset "export_weights JS bundle" begin
        m = MLP([4, 4, 2])
        path = tempname() * ".js"
        export_weights(m, path)
        content = read(path, String)
        # The bundle must be environment-agnostic (window or globalThis).
        @test occursin("globalThis", content)
        @test occursin("KESTREL", content)
        # A bare JSON export must also be loadable.
        json_path = tempname() * ".json"
        export_weights(m, json_path)
        @test startswith(read(json_path, String), "{")
        rm(path; force = true)
        rm(json_path; force = true)
    end

end