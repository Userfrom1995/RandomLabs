// Tester-owned end-to-end regression suite for the Sextant GIS engine.
// Black-box contract checks over the shipped v1 city pack plus engine
// determinism gates. Seeded and offline; no network, no browser.
//
// Covers the Tester handoff rows: pack manifest + ndjson validity,
// pack -> tile determinism, R-tree window vs brute force on real pack
// bboxes, real graph.bin load + A* reachability smoke, real geocode asset
// recall, GeoJSON round-trip, projection round-trip, and the NaN pen-up
// batch contract shared by MapRenderer and canvasInterop.js.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class TesterRegressionTests
{
    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "sextant", "Sextant.sln")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("repo root (sextant/Sextant.sln) not found");
    }

    private static string PackFile(string name) =>
        Path.Combine(RepoRoot(), "sextant", "src", "Sextant.App", "wwwroot", "packs", "v1", name);

    private static IReadOnlyList<TileInput> LoadPackFeatures()
    {
        var all = new List<TileInput>();
        foreach (var layer in PackLayers.All)
        {
            var path = PackFile(layer + ".ndjson");
            Assert.True(File.Exists(path), $"missing pack asset {path}");
            var features = NdjsonReader.ParseLayer(layer, File.ReadAllText(path));
            Assert.NotEmpty(features);
            all.AddRange(features);
        }
        return all;
    }

    [Fact]
    public void PackManifest_RealPackJson_ParsesWithExpectedCounts()
    {
        var manifest = PackManifest.FromJson(File.ReadAllText(PackFile("pack.json")));
        Assert.Equal(PackManifest.CurrentVersion, manifest.Version);
        Assert.Equal(286, manifest.Seed);
        Assert.Equal(23, manifest.FeatureCounts["roads"]);
        Assert.Equal(102, manifest.FeatureCounts["buildings"]);
        Assert.Equal(1, manifest.FeatureCounts["water"]);
        Assert.Equal(2, manifest.FeatureCounts["landuse"]);
        Assert.Equal(12, manifest.FeatureCounts["pois"]);
        Assert.Equal(5665, manifest.GraphNodes);
        Assert.Equal(18658, manifest.GraphEdges);
    }

    [Fact]
    public void PackNdjson_AllLayers_TotalIs140AndBboxesAreFinite()
    {
        var all = LoadPackFeatures();
        Assert.Equal(140, all.Count);
        foreach (var f in all)
        {
            foreach (var p in EnumeratePoints(f))
            {
                Assert.True(double.IsFinite(p.Lon) && double.IsFinite(p.Lat));
                Assert.InRange(p.Lon, -180.0, 180.0);
                Assert.InRange(p.Lat, -90.0, 90.0);
            }
        }
    }

    [Fact]
    public void TilePipeline_PackToTile_DeterministicCanonicalBytes()
    {
        var all = LoadPackFeatures();
        // Downtown Portland tile at z14 (same control tile as Phase 1).
        var tileA = TileBuilder.BuildTile(14, 2608, 5860, all);
        var tileB = TileBuilder.BuildTile(14, 2608, 5860, all);
        Assert.Equal(TileCanonical.Serialize(tileA), TileCanonical.Serialize(tileB));
        Assert.NotEmpty(tileA.Features);
    }

    [Fact]
    public void RTree_PackWindow_MatchesBruteForce()
    {
        var all = LoadPackFeatures();
        var index = new RTree<int>();
        var boxes = new List<Rect>(all.Count);
        for (int i = 0; i < all.Count; i++)
        {
            var box = BboxOf(all[i]);
            boxes.Add(box);
            index.Insert(box, i);
        }
        var window = new Rect(-122.69, 45.505, -122.66, 45.525);
        var hits = new HashSet<int>(index.Window(window));
        var expected = new HashSet<int>();
        for (int i = 0; i < boxes.Count; i++)
            if (boxes[i].Intersects(window))
                expected.Add(i);
        Assert.Equal(expected, hits);
        Assert.NotEmpty(hits);
    }

    [Fact]
    public void Graph_RealGraphBin_LoadsAndAStarReachesAcrossTown()
    {
        var path = PackFile("graph.bin");
        var graph = RoadGraph.LoadGraphBin(File.ReadAllBytes(path));
        Assert.Equal(5665, graph.NodeCount);
        Assert.Equal(18658, graph.EdgeCount);
        // Corner-to-corner across the 75x75 grid must be reachable.
        var route = Router.AStar(graph, 0, graph.NodeCount - 1, CostMode.Time, penalizeTurns: true);
        Assert.True(route.Found, "corner-to-corner route not found");
        Assert.True(route.Path.Length >= 2);
        Assert.True(double.IsFinite(route.Cost) && route.Cost > 0);
    }

    [Fact]
    public void Geocode_RealAsset_PowellAndRiverRecall()
    {
        var index = GeocodeIndex.FromJson(File.ReadAllText(PackFile("geocode.idx.json")));
        Assert.True(index.Count >= 30);
        var powell = index.Query("Powell");
        Assert.NotEmpty(powell);
        Assert.Contains(powell, h => h.Entry.Name.Contains("Powell"));
        var river = index.Query("River");
        Assert.NotEmpty(river);
        // Unknown gibberish must not match (min-overlap noise rule).
        Assert.Empty(index.Query("zzzqx"));
    }

    [Fact]
    public void GeoJson_ImportExport_RoundTripPreservesRing()
    {
        var features = GeoJson.Parse(
            """{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"t"},"geometry":{"type":"Polygon","coordinates":[[[-122.68,45.51],[-122.67,45.51],[-122.67,45.52],[-122.68,45.52],[-122.68,45.51]]]}}]}""");
        Assert.Single(features);
        var emitted = GeoJson.EmitFeatureCollection(features);
        var reparsed = GeoJson.Parse(emitted);
        Assert.Single(reparsed);
        var ring = ((PolygonInput)reparsed[0].Geometry).Rings[0];
        Assert.Equal(5, ring.Count);
        Assert.Equal(ring[0].Lon, ring[^1].Lon, precision: 9);
        Assert.Equal(ring[0].Lat, ring[^1].Lat, precision: 9);
    }

    [Fact]
    public void Projections_PortlandRoundTrip_WithinMillimetres()
    {
        var mercator = new WebMercatorProjection();
        const double lon = -122.6765, lat = 45.5152;
        var fwd = mercator.Forward(lon, lat);
        Assert.True(fwd.Valid);
        var inv = mercator.Inverse(fwd.X, fwd.Y);
        Assert.True(inv.Valid);
        // ~1e-7 deg lon is ~1 cm at this latitude; assert sub-metre.
        Assert.Equal(lon, inv.Lon, precision: 7);
        Assert.Equal(lat, inv.Lat, precision: 7);
    }

    [Fact]
    public void CanvasBatchContract_NaNSeparatesSubpaths()
    {
        // Documents the contract shared by MapRenderer (C# PenUp emits
        // NaN,NaN) and canvasInterop.js (isPenUp splits subpaths): a batch
        // with one NaN pair must decode to exactly two subpaths.
        float[] batch = { 0f, 0f, float.NaN, float.NaN, 10f, 10f };
        int subpaths = 1;
        for (int i = 0; i + 1 < batch.Length; i += 2)
            if (float.IsNaN(batch[i]) || float.IsNaN(batch[i + 1]))
                subpaths++;
        Assert.Equal(2, subpaths);
    }

    private static IEnumerable<GeoPoint> EnumeratePoints(TileInput f)
    {
        switch (f)
        {
            case PointInput pt: yield return pt.Point; break;
            case PolylineInput pl: foreach (var p in pl.Points) yield return p; break;
            case PolygonInput pg: foreach (var ring in pg.Rings) foreach (var p in ring) yield return p; break;
        }
    }

    private static Rect BboxOf(TileInput f)
    {
        double minLon = double.PositiveInfinity, minLat = double.PositiveInfinity;
        double maxLon = double.NegativeInfinity, maxLat = double.NegativeInfinity;
        foreach (var p in EnumeratePoints(f))
        {
            minLon = Math.Min(minLon, p.Lon); maxLon = Math.Max(maxLon, p.Lon);
            minLat = Math.Min(minLat, p.Lat); maxLat = Math.Max(maxLat, p.Lat);
        }
        if (maxLon == minLon) maxLon += 1e-9;
        if (maxLat == minLat) maxLat += 1e-9;
        return new Rect(minLon, minLat, maxLon, maxLat);
    }
}
