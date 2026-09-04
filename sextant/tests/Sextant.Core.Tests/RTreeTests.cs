// Phase-3 spatial index gate: I1..I7 invariants after every mutating op,
// STR-vs-incremental equivalence, seeded fuzz vs brute-force oracle for
// window + k-NN, fill/balance/degenerate/NaN guards, version-stamp guard,
// a pack-backed city window query, and throughput benchmarks whose numbers
// are frozen in sextant/docs/rtree.md. Seeded Random(286) throughout.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class RTreeTests
{
    private const int Seed = 286;

    private readonly Xunit.Abstractions.ITestOutputHelper _output;

    public RTreeTests(Xunit.Abstractions.ITestOutputHelper output)
    {
        _output = output;
    }

    private static Rect MakeRect(Random rng, double range, double maxSize)
    {
        double x = rng.NextDouble() * range;
        double y = rng.NextDouble() * range;
        double w = rng.NextDouble() * maxSize;
        double h = rng.NextDouble() * maxSize;
        return new Rect(x, y, x + w, y + h);
    }

    private static List<(Rect Rect, int Id)> RandomEntries(Random rng, int n)
    {
        var output = new List<(Rect, int)>(n);
        for (int i = 0; i < n; i++)
            output.Add((MakeRect(rng, 100.0, 10.0), i));
        return output;
    }

    private static HashSet<int> BruteWindow(IEnumerable<(Rect Rect, int Id)> entries, Rect query) =>
        entries.Where(e => e.Rect.Intersects(query)).Select(e => e.Id).ToHashSet();

    /// <summary>
    /// k-NN oracle: the tree must return k distinct ids whose distances match
    /// the true top-k distances exactly, in non-decreasing (nearest-first)
    /// order. Ids may differ from any id-tiebreak oracle on exact distance
    /// ties (common: a query point inside several overlapping rects has
    /// MinDist 0 to all of them), so distances - not ids - are compared.
    /// </summary>
    private static void AssertNearestMatches(
        RTree<int> tree,
        IEnumerable<(Rect Rect, int Id)> oracleEntries,
        Dictionary<int, Rect> byId,
        double x, double y, int k)
    {
        var got = tree.Nearest(x, y, k);
        Assert.Equal(Math.Min(k, byId.Count), got.Count);
        Assert.Equal(got.Count, got.ToHashSet().Count);
        var gotDists = got.Select(id => byId[id].MinDist(x, y)).ToList();
        for (int i = 1; i < gotDists.Count; i++)
            Assert.True(gotDists[i - 1] <= gotDists[i], "nearest-first order");
        var wantDists = oracleEntries
            .Select(e => e.Rect.MinDist(x, y))
            .OrderBy(d => d)
            .Take(k)
            .ToList();
        Assert.Equal(wantDists, gotDists.OrderBy(d => d).ToList());
    }

    // -- I1..I5 structural invariants --------------------------------------

    [Fact]
    public void Invariants_HoldAfterIncrementalBuild()
    {
        var rng = new Random(Seed);
        var tree = new RTree<int>();
        var entries = RandomEntries(rng, 200);
        foreach (var (rect, id) in entries)
        {
            tree.Insert(rect, id);
            Assert.Null(tree.CheckInvariants());
        }
        Assert.Equal(200, tree.Count);
        Assert.True(tree.Depth >= 1);
    }

    [Fact]
    public void Invariants_HoldAfterBulkLoadAndDeepSplits()
    {
        var rng = new Random(Seed);
        var entries = RandomEntries(rng, 5000);
        var tree = RTree<int>.BulkLoad(entries);
        Assert.Null(tree.CheckInvariants());
        Assert.Equal(5000, tree.Count);
        Assert.True(tree.Depth >= 2);
        // Incremental sibling holds the same invariants at depth.
        var incremental = new RTree<int>();
        foreach (var (rect, id) in entries)
            incremental.Insert(rect, id);
        Assert.Null(incremental.CheckInvariants());
        Assert.Equal(5000, incremental.Count);
    }

    [Fact]
    public void Invariants_HoldWithQuadraticFallback()
    {
        var rng = new Random(Seed);
        var tree = new RTree<int>(maxEntries: 32, minEntries: 13,
            splitStrategy: new QuadraticSplit(13));
        foreach (var (rect, id) in RandomEntries(rng, 500))
            tree.Insert(rect, id);
        Assert.Null(tree.CheckInvariants());
        Assert.Equal(500, tree.Count);
    }

    // -- I6 window completeness vs brute force ------------------------------

    [Fact]
    public void Window_MatchesBruteForceOracle()
    {
        var rng = new Random(Seed);
        var entries = RandomEntries(rng, 2000);
        var tree = RTree<int>.BulkLoad(entries);
        for (int q = 0; q < 100; q++)
        {
            var query = MakeRect(rng, 100.0, 25.0);
            var got = tree.Window(query).ToHashSet();
            Assert.Equal(BruteWindow(entries, query), got);
        }
    }

    // -- I7 nearest correctness vs brute force ------------------------------

    [Fact]
    public void Nearest_MatchesBruteForceOracle()
    {
        var rng = new Random(Seed);
        var entries = RandomEntries(rng, 2000);
        var tree = RTree<int>.BulkLoad(entries);
        var byId = entries.ToDictionary(e => e.Id, e => e.Rect);
        foreach (int k in new[] { 1, 5, 20 })
        {
            for (int q = 0; q < 30; q++)
            {
                double x = rng.NextDouble() * 100.0;
                double y = rng.NextDouble() * 100.0;
                AssertNearestMatches(tree, entries, byId, x, y, k);
            }
        }
    }

    // -- STR vs incremental equivalence -------------------------------------

    [Fact]
    public void StrVsIncremental_SameQueryResults()
    {
        var rng = new Random(Seed);
        var entries = RandomEntries(rng, 5000);
        var bulk = RTree<int>.BulkLoad(entries);
        var incremental = new RTree<int>();
        foreach (var (rect, id) in entries)
            incremental.Insert(rect, id);
        for (int q = 0; q < 200; q++)
        {
            var query = MakeRect(rng, 100.0, 25.0);
            Assert.Equal(
                bulk.Window(query).ToHashSet(),
                incremental.Window(query).ToHashSet());
        }
        var byId = entries.ToDictionary(e => e.Id, e => e.Rect);
        for (int q = 0; q < 50; q++)
        {
            double x = rng.NextDouble() * 100.0;
            double y = rng.NextDouble() * 100.0;
            AssertNearestMatches(bulk, entries, byId, x, y, 10);
            AssertNearestMatches(incremental, entries, byId, x, y, 10);
        }
    }

    // -- seeded fuzz: 1k mixed ops vs oracle ---------------------------------

    [Fact]
    public void Fuzz_MixedOpsMatchOracleAndHoldInvariants()
    {
        var rng = new Random(Seed);
        var tree = new RTree<int>();
        var oracle = new Dictionary<int, Rect>();
        int nextId = 0;
        var live = new List<int>();
        for (int op = 0; op < 1000; op++)
        {
            if (live.Count == 0 || rng.NextDouble() < 0.6)
            {
                var rect = MakeRect(rng, 100.0, 10.0);
                tree.Insert(rect, nextId);
                oracle[nextId] = rect;
                live.Add(nextId);
                nextId++;
            }
            else
            {
                int slot = rng.Next(live.Count);
                int id = live[slot];
                live.RemoveAt(slot);
                Assert.True(tree.Delete(oracle[id], id));
                oracle.Remove(id);
            }
            if (op % 100 == 99)
            {
                Assert.Null(tree.CheckInvariants());
                Assert.Equal(oracle.Count, tree.Count);
                var pairs = oracle.Select(kv => (kv.Value, kv.Key));
                for (int q = 0; q < 20; q++)
                {
                    var query = MakeRect(rng, 100.0, 25.0);
                    Assert.Equal(
                        BruteWindow(pairs, query),
                        tree.Window(query).ToHashSet());
                }
                for (int q = 0; q < 5; q++)
                {
                    double x = rng.NextDouble() * 100.0;
                    double y = rng.NextDouble() * 100.0;
                    var byId = oracle.ToDictionary(kv => kv.Key, kv => kv.Value);
                    AssertNearestMatches(tree, pairs, byId, x, y, 5);
                }
            }
        }
        Assert.Null(tree.CheckInvariants());
    }

    // -- guards: fill, balance, degenerate, NaN -------------------------------

    [Fact]
    public void Guards_RejectNanAndInfinite()
    {
        Assert.Throws<ArgumentException>(() => new Rect(0, 0, double.NaN, 1));
        Assert.Throws<ArgumentException>(() => new Rect(0, double.PositiveInfinity, 1, 1));
        Assert.Throws<ArgumentException>(() => new Rect(1, 0, 0, 1));
        var tree = new RTree<int>();
        Assert.Throws<ArgumentException>(() => tree.Insert(new Rect(0, 0, double.NaN, 1), 7));
        Assert.Throws<ArgumentException>(() => tree.Nearest(double.NaN, 0, 1));
        Assert.Throws<ArgumentOutOfRangeException>(() => tree.Nearest(0, 0, 0));
    }

    [Fact]
    public void Guards_DegeneratePointRectsQueryExactly()
    {
        var tree = new RTree<int>();
        tree.Insert(new Rect(5, 5, 5, 5), 1);
        tree.Insert(new Rect(6, 6, 6, 6), 2);
        Assert.Null(tree.CheckInvariants());
        Assert.Equal(new[] { 1 }, tree.Window(new Rect(5, 5, 5, 5)));
        Assert.Equal(new[] { 2 }, tree.Nearest(6.1, 6.1, 1));
        Assert.True(tree.Delete(new Rect(5, 5, 5, 5), 1));
        Assert.False(tree.Delete(new Rect(5, 5, 5, 5), 1));
        Assert.Null(tree.CheckInvariants());
    }

    [Fact]
    public void Guards_DeleteCondenseThenPackPreservesResults()
    {
        var rng = new Random(Seed);
        var entries = RandomEntries(rng, 2000);
        var tree = RTree<int>.BulkLoad(entries);
        for (int i = 0; i < 1500; i++)
            Assert.True(tree.Delete(entries[i].Rect, entries[i].Id));
        Assert.Null(tree.CheckInvariants());
        Assert.Equal(500, tree.Count);
        var rest = entries.Skip(1500).ToList();
        var query = new Rect(0, 0, 100, 100);
        var before = tree.Window(query).ToHashSet();
        Assert.Equal(BruteWindow(rest, query), before);
        tree.Pack();
        Assert.Null(tree.CheckInvariants());
        Assert.Equal(before, tree.Window(query).ToHashSet());
        Assert.Equal(500, tree.Count);
    }

    [Fact]
    public void Guards_ConcurrentModificationThrows()
    {
        var rng = new Random(Seed);
        var tree = new RTree<int>();
        foreach (var (rect, id) in RandomEntries(rng, 100))
            tree.Insert(rect, id);
        Assert.Throws<InvalidOperationException>(() =>
            tree.Window(new Rect(0, 0, 100, 100), _ =>
                tree.Insert(new Rect(1, 1, 2, 2), 100000)));
        Assert.Throws<InvalidOperationException>(() =>
            tree.Nearest(50, 50, 5, (_, _, _) =>
                tree.Insert(new Rect(1, 1, 2, 2), 100001)));
        Assert.Null(tree.CheckInvariants());
    }

    // -- pack-backed city window ----------------------------------------------

    [Fact]
    public void PackBacked_CityWindowMatchesBruteForce()
    {
        string dir = Path.Combine(AppContext.BaseDirectory, "packs");
        var pairs = new List<(Rect Rect, int Id)>();
        int id = 0;
        foreach (var layer in PackLayers.All)
        {
            string ndjson = File.ReadAllText(Path.Combine(dir, layer + ".ndjson"));
            foreach (var input in NdjsonReader.ParseLayer(layer, ndjson))
                pairs.Add((BBoxOf(input), id++));
        }
        Assert.True(pairs.Count >= 100);
        var tree = RTree<int>.BulkLoad(pairs);
        Assert.Null(tree.CheckInvariants());
        var downtown = new Rect(-122.69, 45.51, -122.66, 45.53);
        Assert.Equal(BruteWindow(pairs, downtown), tree.Window(downtown).ToHashSet());
        var world = new Rect(-180, -90, 180, 90);
        Assert.Equal(pairs.Count, tree.Window(world).Count);
    }

    private static Rect BBoxOf(TileInput input) => input switch
    {
        PointInput pt => new Rect(pt.Point.Lon, pt.Point.Lat, pt.Point.Lon, pt.Point.Lat),
        PolylineInput pl => BBoxOf(pl.Points),
        PolygonInput pg => BBoxOf(pg.Rings.SelectMany(r => r).ToList()),
        _ => throw new ArgumentOutOfRangeException(nameof(input)),
    };

    private static Rect BBoxOf(IReadOnlyList<GeoPoint> points)
    {
        double minX = points.Min(p => p.Lon);
        double minY = points.Min(p => p.Lat);
        double maxX = points.Max(p => p.Lon);
        double maxY = points.Max(p => p.Lat);
        return new Rect(minX, minY, maxX, maxY);
    }

    // -- throughput (numbers frozen in docs/rtree.md) --------------------------

    [Fact]
    public void Throughput_Bulk100k_WindowP95_NearestP95()
    {
        RTreeBenchmarks.Report(_output.WriteLine);
    }
}
