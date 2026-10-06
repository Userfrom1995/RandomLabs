// Phase-4 routing gates (research 6.2 + 8): A* == Dijkstra on 1000 seeded
// pairs within 1e-6 relative (build fails on any mismatch), turn-penalty
// admissibility (cost_with >= cost_without), unreachable NoPath, heap
// tie-break determinism, graph.bin roundtrip, TurnTable unit pins.

using Xunit.Abstractions;
using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class RoutingTests
{
    private const int Seed = 286;
    private readonly ITestOutputHelper _output;

    public RoutingTests(ITestOutputHelper output)
    {
        _output = output;
    }

    private static RoadGraph TestGrid() => RoadGraph.BuildCityGrid(nx: 40, ny: 40, seed: Seed);

    private static List<(int O, int D)> SeededPairs(RoadGraph g, int count, int seed)
    {
        var rng = new Random(seed);
        var pairs = new List<(int, int)>(count);
        while (pairs.Count < count)
        {
            int o = rng.Next(g.NodeCount);
            int d = rng.Next(g.NodeCount);
            if (o != d) pairs.Add((o, d));
        }
        return pairs;
    }

    private static void CostsAgree(double aStar, double dijkstra, int o, int d, string what)
    {
        if (double.IsPositiveInfinity(aStar) && double.IsPositiveInfinity(dijkstra))
            return;
        Assert.False(double.IsPositiveInfinity(aStar), $"{what} pair ({o},{d}): A* NoPath but Dijkstra found {dijkstra}");
        Assert.False(double.IsPositiveInfinity(dijkstra), $"{what} pair ({o},{d}): Dijkstra NoPath but A* found {aStar}");
        double denom = Math.Max(1.0, Math.Abs(dijkstra));
        double rel = Math.Abs(aStar - dijkstra) / denom;
        Assert.True(rel <= 1e-6, $"{what} pair ({o},{d}): A*={aStar} Dijkstra={dijkstra} rel={rel:E2}");
    }

    // -- binding oracle: A* == Dijkstra on 1000 pairs --------------------------

    [Fact]
    public void Oracle_AStar_Equals_Dijkstra_Time_1000Pairs()
    {
        var g = TestGrid();
        var pairs = SeededPairs(g, 1000, Seed);
        int found = 0;
        foreach (var (o, d) in pairs)
        {
            var a = Router.AStar(g, o, d, CostMode.Time, penalizeTurns: false);
            var b = Router.Dijkstra(g, o, d, CostMode.Time, penalizeTurns: false);
            Assert.Equal(b.Found, a.Found);
            if (a.Found)
            {
                found++;
                CostsAgree(a.Cost, b.Cost, o, d, "time");
                AssertPathValid(g, a.Path, o, d);
                // A* must expand no more states than Dijkstra (guided search).
                Assert.True(a.Expanded <= b.Expanded, $"pair ({o},{d}): A* expanded {a.Expanded} > Dijkstra {b.Expanded}");
            }
        }
        _output.WriteLine($"oracle time/no-turns: {found}/1000 pairs reachable on 40x40 grid");
        Assert.True(found >= 900, $"only {found}/1000 pairs reachable; grid may be fragmented");
    }

    [Fact]
    public void Oracle_AStar_Equals_Dijkstra_Distance_1000Pairs()
    {
        var g = TestGrid();
        var pairs = SeededPairs(g, 1000, Seed + 1);
        int found = 0;
        foreach (var (o, d) in pairs)
        {
            var a = Router.AStar(g, o, d, CostMode.Distance, penalizeTurns: false);
            var b = Router.Dijkstra(g, o, d, CostMode.Distance, penalizeTurns: false);
            Assert.Equal(b.Found, a.Found);
            if (a.Found)
            {
                found++;
                CostsAgree(a.Cost, b.Cost, o, d, "distance");
            }
        }
        _output.WriteLine($"oracle distance/no-turns: {found}/1000 pairs reachable on 40x40 grid");
        Assert.True(found >= 900, $"only {found}/1000 pairs reachable; grid may be fragmented");
    }

    [Fact]
    public void Oracle_AStar_Equals_Dijkstra_WithTurns_200Pairs()
    {
        var g = TestGrid();
        var pairs = SeededPairs(g, 200, Seed + 2);
        int found = 0;
        foreach (var (o, d) in pairs)
        {
            var a = Router.AStar(g, o, d, CostMode.Time, penalizeTurns: true);
            var b = Router.Dijkstra(g, o, d, CostMode.Time, penalizeTurns: true);
            Assert.Equal(b.Found, a.Found);
            if (a.Found)
            {
                found++;
                CostsAgree(a.Cost, b.Cost, o, d, "time+turns");
                AssertPathValid(g, a.Path, o, d);
            }
        }
        _output.WriteLine($"oracle time/turns: {found}/200 pairs reachable on 40x40 grid");
        Assert.True(found >= 150, $"only {found}/200 pairs reachable; grid may be fragmented");
    }

    // -- turn-penalty admissibility: penalties only increase true cost ---------

    [Fact]
    public void TurnPenalties_Never_Reduce_Optimal_Cost()
    {
        var g = TestGrid();
        var pairs = SeededPairs(g, 200, Seed + 3);
        int compared = 0;
        foreach (var (o, d) in pairs)
        {
            var plain = Router.AStar(g, o, d, CostMode.Time, penalizeTurns: false);
            var penalized = Router.AStar(g, o, d, CostMode.Time, penalizeTurns: true);
            Assert.Equal(plain.Found, penalized.Found);
            if (plain.Found)
            {
                compared++;
                Assert.True(penalized.Cost + 1e-6 >= plain.Cost,
                    $"pair ({o},{d}): with-turns {penalized.Cost} < without {plain.Cost}");
            }
        }
        Assert.True(compared >= 150, $"only {compared}/200 pairs reachable");
    }

    // -- unreachable returns NoPath (never an exception) -----------------------

    [Fact]
    public void Unreachable_Returns_NoPath()
    {
        var b = new RoadGraphBuilder();
        int a0 = b.AddNode(-122.6765, 45.5152);
        int a1 = b.AddNode(-122.6760, 45.5152);
        b.AddEdge(a0, a1, RoadClass.Residential);
        int b0 = b.AddNode(-122.6700, 45.5200);
        int b1 = b.AddNode(-122.6695, 45.5200);
        b.AddEdge(b0, b1, RoadClass.Residential);
        var g = b.Build();
        foreach (bool turns in new[] { false, true })
        {
            foreach (CostMode mode in new[] { CostMode.Time, CostMode.Distance })
            {
                var a = Router.AStar(g, a0, b0, mode, turns);
                var d = Router.Dijkstra(g, a0, b0, mode, turns);
                Assert.False(a.Found);
                Assert.False(d.Found);
                Assert.Empty(a.Path);
                Assert.True(double.IsPositiveInfinity(a.Cost));
            }
        }
        // Same-component control still routes.
        Assert.True(Router.AStar(g, a0, a1, CostMode.Time, false).Found);
    }

    // -- heap tie-break determinism --------------------------------------------

    [Fact]
    public void FixedPair_Replays_Identical_Path_And_Frontier()
    {
        var g = TestGrid();
        foreach (bool turns in new[] { false, true })
        {
            foreach (CostMode mode in new[] { CostMode.Time, CostMode.Distance })
            {
                var first = Router.AStar(g, 0, g.NodeCount - 1, mode, turns);
                var second = Router.AStar(g, 0, g.NodeCount - 1, mode, turns);
                Assert.Equal(first.Found, second.Found);
                Assert.Equal(first.Path, second.Path);
                Assert.Equal(first.Frontier, second.Frontier);
                Assert.Equal(first.Cost, second.Cost);
            }
        }
    }

    // -- TurnTable unit pins ----------------------------------------------------

    [Fact]
    public void TurnTable_Straight_Left_UTurn_Downgrade()
    {
        // Straight north, same class: free.
        Assert.Equal(0.0, TurnTable.Penalty(0, 0, 0, 10, 0, 20, RoadClass.Residential, RoadClass.Residential));
        // U-turn (out and back): +8.
        Assert.Equal(8.0, TurnTable.Penalty(0, 0, 0, 10, 0, 0, RoadClass.Residential, RoadClass.Residential));
        // Right turn (clockwise): +4.
        Assert.Equal(4.0, TurnTable.Penalty(0, 0, 0, 10, 10, 10, RoadClass.Residential, RoadClass.Residential));
        // Left turn (counter-clockwise, crosses traffic): +8.
        Assert.Equal(8.0, TurnTable.Penalty(0, 0, 0, 10, -10, 10, RoadClass.Residential, RoadClass.Residential));
        // Straight with class downgrade: +2.
        Assert.Equal(2.0, TurnTable.Penalty(0, 0, 0, 10, 0, 20, RoadClass.Primary, RoadClass.Residential));
        // Upgrade is not penalized.
        Assert.Equal(0.0, TurnTable.Penalty(0, 0, 0, 10, 0, 20, RoadClass.Residential, RoadClass.Primary));
    }

    // -- graph.bin roundtrip -----------------------------------------------------

    [Fact]
    public void GraphBin_Roundtrip_Preserves_Routes()
    {
        var g = TestGrid();
        byte[] bin = g.ToGraphBin();
        var h = RoadGraph.LoadGraphBin(bin);
        Assert.Equal(g.NodeCount, h.NodeCount);
        Assert.Equal(g.EdgeCount, h.EdgeCount);
        Assert.Equal(g.ToGraphBin(), h.ToGraphBin());
        var pairs = SeededPairs(g, 50, Seed + 4);
        foreach (var (o, d) in pairs)
        {
            var a = Router.AStar(g, o, d, CostMode.Time, true);
            var c = Router.AStar(h, o, d, CostMode.Time, true);
            Assert.Equal(a.Found, c.Found);
            if (a.Found) CostsAgree(a.Cost, c.Cost, o, d, "bin-roundtrip");
        }
    }

    [Fact]
    public void GraphBin_Rejects_BadMagic_And_TrailingBytes()
    {
        var g = TestGrid();
        byte[] bin = g.ToGraphBin();
        var bad = (byte[])bin.Clone();
        bad[0] = (byte)'X';
        Assert.Throws<FormatException>(() => RoadGraph.LoadGraphBin(bad));
        var trailing = new byte[bin.Length + 1];
        Array.Copy(bin, trailing, bin.Length);
        Assert.Throws<FormatException>(() => RoadGraph.LoadGraphBin(trailing));
        Assert.Throws<FormatException>(() => RoadGraph.LoadGraphBin(new byte[3]));
    }

    [Fact]
    public void SpeedTable_Matches_Research()
    {
        Assert.Equal(30.0, RoadGraph.SpeedKmh(RoadClass.Residential));
        Assert.Equal(40.0, RoadGraph.SpeedKmh(RoadClass.Tertiary));
        Assert.Equal(50.0, RoadGraph.SpeedKmh(RoadClass.Secondary));
        Assert.Equal(60.0, RoadGraph.SpeedKmh(RoadClass.Primary));
        Assert.Equal(80.0, RoadGraph.SpeedKmh(RoadClass.Trunk));
        Assert.Equal(100.0, RoadGraph.SpeedKmh(RoadClass.Motorway));
    }

    // -- throughput (numbers frozen in docs/routing.md) --------------------------

    [Fact]
    public void Throughput_Median_P95_On_CityGraph()
    {
        RoutingBenchmarks.Report(_output.WriteLine);
    }

    // -- manifest graph fields (Phase 4 pack assets) -----------------------------

    [Fact]
    public void PackManifest_GraphFields_Roundtrip_And_BackwardCompat()
    {
        var g = TestGrid();
        var manifest = new PackManifest(
            PackManifest.CurrentVersion, 286, -122.6765, 45.5152,
            new Dictionary<string, int> { ["roads"] = 23 }, "synthetic-v1",
            g.NodeCount, g.EdgeCount);
        var back = PackManifest.FromJson(manifest.ToJson());
        Assert.Equal(g.NodeCount, back.GraphNodes);
        Assert.Equal(g.EdgeCount, back.GraphEdges);
        // Pre-Phase-4 manifests without graph fields still parse (null = no graph).
        var legacy = PackManifest.FromJson(
            "{\"Version\":\"sextant-pack/1\",\"Seed\":286,\"CenterLon\":-122.6765,\"CenterLat\":45.5152,"
            + "\"FeatureCounts\":{\"roads\":23},\"Source\":\"synthetic-v1\"}");
        Assert.Null(legacy.GraphNodes);
        Assert.Null(legacy.GraphEdges);
    }

    private static void AssertPathValid(RoadGraph g, int[] path, int origin, int goal)
    {
        Assert.True(path.Length >= 2, "path needs at least origin + goal");
        Assert.Equal(origin, path[0]);
        Assert.Equal(goal, path[^1]);
        for (int k = 0; k + 1 < path.Length; k++)
        {
            bool linked = false;
            foreach (int e in g.OutEdges(path[k]))
            {
                if (g.Heads[e] == path[k + 1]) { linked = true; break; }
            }
            Assert.True(linked, $"path step {path[k]} -> {path[k + 1]} is not an edge");
        }
    }
}
