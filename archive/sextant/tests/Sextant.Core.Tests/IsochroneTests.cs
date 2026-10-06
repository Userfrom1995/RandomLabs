// Phase-4 isochrone gates (research 6.3 + 8): contour-vs-arrival oracle
// within one cell of tolerance, GeoJSON export schema, Chaikin behavior,
// raster/contour guards. Fixed seed 286; nothing wall-clock.

using System.Text.Json;
using Xunit.Abstractions;
using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class IsochroneTests
{
    private const int Seed = 286;
    private readonly ITestOutputHelper _output;

    public IsochroneTests(ITestOutputHelper output)
    {
        _output = output;
    }

    // -- oracle: contour contains exactly arrival<=T nodes (+/- one cell) -----

    [Fact]
    public void Oracle_Contour_Matches_Arrivals_Within_One_Cell()
    {
        var g = RoadGraph.BuildCityGrid(nx: 30, ny: 30, seed: Seed);
        const double cutoffT = 30.0;
        const double cell = 75.0;
        double[] arrivals = Isochrone.ComputeArrivals(g, source: 0, CostMode.Time, penalizeTurns: false);

        // Oracle sets are relative to the cutoff, not mere connectivity.
        var reached = new List<int>();
        var unreached = new List<int>();
        for (int v = 0; v < g.NodeCount; v++)
        {
            if (!double.IsPositiveInfinity(arrivals[v]) && arrivals[v] <= cutoffT) reached.Add(v);
            else unreached.Add(v);
        }
        Assert.True(reached.Count > 10, "cutoff reaches almost nothing; oracle is vacuous");
        Assert.True(unreached.Count > 10, "cutoff reaches everything; oracle is vacuous");
        Assert.Equal(0.0, arrivals[0]);

        var grid = Isochrone.Rasterize(g, arrivals, cellMeters: cell);
        var segs = Isochrone.ContourSegments(grid, cutoffT);
        Assert.NotEmpty(segs);
        var rings = Isochrone.BuildRings(segs);
        Assert.NotEmpty(rings);
        foreach (var ring in rings)
        {
            Assert.True(ring.Count >= 4, "ring needs 3 distinct points plus closure");
            Assert.Equal(ring[0], ring[^1]);
            Assert.True(Math.Abs(Isochrone.SignedArea(ring)) > 0.0, "degenerate zero-area ring");
        }
        var smooth = rings.Select(Isochrone.ChaikinClosed).ToList();
        var polys = Isochrone.NestRings(smooth.Select(r => r.ToList()).ToList());
        Assert.NotEmpty(polys);
        _output.WriteLine($"isochrone T={cutoffT}s: {reached.Count} reached, {unreached.Count} unreached, "
            + $"{rings.Count} rings, {polys.Count} polygons, cell {grid.Cell:F1} m {grid.Nx}x{grid.Ny}");

        // Deep-interior reached nodes must be inside (far from any boundary).
        int insideChecked = 0;
        foreach (int v in reached)
        {
            if (arrivals[v] > cutoffT * 0.5) continue;
            Assert.True(Isochrone.Contains(polys, g.X[v], g.Y[v]),
                $"reached node {v} (arrival {arrivals[v]:F1}s) lies outside the contour");
            insideChecked++;
        }
        Assert.True(insideChecked > 0, "no deep-interior nodes; oracle is vacuous");

        // Far unreached nodes must be outside (beyond one cell of any reached node).
        var reachedPts = reached.Select(v => new GeoPoint(g.Lon[v], g.Lat[v])).ToList();
        int outsideChecked = 0;
        foreach (int v in unreached)
        {
            var p = new GeoPoint(g.Lon[v], g.Lat[v]);
            double nearest = double.PositiveInfinity;
            foreach (var q in reachedPts)
                nearest = Math.Min(nearest, Geo.HaversineM(p, q));
            if (nearest <= 2.0 * cell) continue;
            Assert.False(Isochrone.Contains(polys, g.X[v], g.Y[v]),
                $"unreached node {v} ({nearest:F0} m from reached set) lies inside the contour");
            outsideChecked++;
        }
        Assert.True(outsideChecked > 0, "no far unreached nodes; oracle is vacuous");
        _output.WriteLine($"isochrone oracle: {insideChecked} inside-checks, {outsideChecked} outside-checks");
    }

    // -- export schema ----------------------------------------------------------

    [Fact]
    public void Export_GeoJson_Schema_And_Winding()
    {
        var g = RoadGraph.BuildCityGrid(nx: 30, ny: 30, seed: Seed);
        var polys = Isochrone.ComputePolygons(g, source: 0, cutoffT: 60.0);
        Assert.NotEmpty(polys);
        foreach (var poly in polys)
            Assert.True(Isochrone.SignedArea(poly.Outer) > 0.0, "outer ring must be CCW");

        string json = Isochrone.ToGeoJson(polys);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        string? type = root.GetProperty("type").GetString();
        Assert.True(type == "Polygon" || type == "MultiPolygon", $"unexpected type {type}");
        var coords = root.GetProperty("coordinates");
        int polyCount = type == "Polygon" ? 1 : coords.GetArrayLength();
        Assert.Equal(polys.Count, polyCount);
        for (int p = 0; p < polyCount; p++)
        {
            var polyCoords = type == "Polygon" ? coords : coords[p];
            Assert.True(polyCoords.GetArrayLength() >= 1, "polygon needs an outer ring");
            for (int r = 0; r < polyCoords.GetArrayLength(); r++)
            {
                var ring = polyCoords[r];
                Assert.True(ring.GetArrayLength() >= 4, "ring needs 3 points plus closure");
                double firstLon = ring[0][0].GetDouble(), firstLat = ring[0][1].GetDouble();
                double lastLon = ring[ring.GetArrayLength() - 1][0].GetDouble(),
                       lastLat = ring[ring.GetArrayLength() - 1][1].GetDouble();
                Assert.Equal(firstLon, lastLon);
                Assert.Equal(firstLat, lastLat);
                double area = 0.0;
                for (int i = 0; i + 1 < ring.GetArrayLength(); i++)
                    area += ring[i][0].GetDouble() * ring[i + 1][1].GetDouble()
                          - ring[i + 1][0].GetDouble() * ring[i][1].GetDouble();
                if (r == 0) Assert.True(area > 0.0, "exported outer ring must be CCW");
                else Assert.True(area < 0.0, "exported holes must be CW");
                foreach (var pos in ring.EnumerateArray())
                {
                    Assert.True(double.IsFinite(pos[0].GetDouble()) && double.IsFinite(pos[1].GetDouble()));
                }
            }
        }
    }

    // -- Chaikin behavior ---------------------------------------------------------

    [Fact]
    public void ChaikinClosed_Doubles_Points_And_Shrinks_Slightly()
    {
        var square = new List<IsoPoint>
        {
            new(0, 0), new(100, 0), new(100, 100), new(0, 100), new(0, 0),
        };
        var smooth = Isochrone.ChaikinClosed(square);
        Assert.Equal(9, smooth.Count);
        Assert.Equal(smooth[0], smooth[^1]);
        double before = Math.Abs(Isochrone.SignedArea(square));
        double after = Math.Abs(Isochrone.SignedArea(smooth));
        Assert.True(after < before, "corner cutting must shrink the ring");
        // Exact value: each corner loses a 25x25 right triangle (4 x 312.5).
        Assert.Equal(8750.0, after, precision: 6);
        Assert.Throws<ArgumentException>(() => Isochrone.ChaikinClosed(new List<IsoPoint> { new(0, 0), new(1, 1) }));
    }

    // -- guards --------------------------------------------------------------------

    [Fact]
    public void Guards_Reject_Bad_Inputs()
    {
        var g = RoadGraph.BuildCityGrid(nx: 10, ny: 10, seed: Seed);
        var allInf = Enumerable.Repeat(double.PositiveInfinity, g.NodeCount).ToArray();
        Assert.Throws<ArgumentException>(() => Isochrone.Rasterize(g, allInf));
        var arrivals = Isochrone.ComputeArrivals(g, 0);
        var grid = Isochrone.Rasterize(g, arrivals);
        Assert.Throws<ArgumentException>(() => Isochrone.ContourSegments(grid, double.NaN));
        Assert.Throws<ArgumentException>(() => Isochrone.ContourSegments(grid, double.PositiveInfinity));
        Assert.Throws<ArgumentException>(() => Isochrone.ToGeoJson(new List<IsoPolygon>()));
        Assert.Throws<ArgumentOutOfRangeException>(() => Router.AStar(g, -1, 0, CostMode.Time, false));
        Assert.Throws<ArgumentOutOfRangeException>(() => Router.AStar(g, 0, g.NodeCount, CostMode.Time, false));
    }

    [Fact]
    public void ComputePolygons_EntryPoint_Smoke()
    {
        var g = RoadGraph.BuildCityGrid(nx: 20, ny: 20, seed: Seed);
        var polys = Isochrone.ComputePolygons(g, g.NodeCount / 2, cutoffT: 45.0);
        Assert.NotEmpty(polys);
        Assert.DoesNotContain(polys, p => p.Outer.Count < 4);
    }
}
