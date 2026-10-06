// Phase-0 projection gate: control-point goldens + seeded roundtrip fuzz.
// Full matrix (PROJ cross-check, Albers area preservation, tile goldens) lands
// in Phases 1-2 per ideas/2026-09-04-sextant-gis-engine.md.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class ProjectionTests
{

    [Fact]
    public void Mercator_Origin_Is_Zero()
    {
        var p = new WebMercatorProjection().Forward(0, 0);
        Assert.True(p.Valid);
        Assert.Equal(0.0, p.X, precision: 9);
        Assert.Equal(0.0, p.Y, precision: 6); // tan(PI/4) is one ulp off 1.0 in doubles
    }

    [Theory]
    [InlineData(-73.9857, 40.7484)] // NYC
    [InlineData(13.4050, 52.5200)]  // Berlin
    [InlineData(139.6917, 35.6895)] // Tokyo
    [InlineData(-0.1278, 51.5074)]  // London
    public void Mercator_KnownCities_AgreeWithFormula(double lon, double lat)
    {
        // Spherical-formula goldens (PROJ cross-check to 1 mm deferred to Phase 1).
        var m = new WebMercatorProjection();
        var p = m.Forward(lon, lat);
        Assert.True(p.Valid);
        double x = Geo.R * Geo.Deg2Rad(lon);
        double y = Geo.R * Math.Log(Math.Tan(Math.PI / 4.0 + Geo.Deg2Rad(lat) / 2.0));
        Assert.Equal(x, p.X, precision: 6);
        Assert.Equal(y, p.Y, precision: 6);
    }

    [Fact]
    public void Mercator_NorthEdge_MatchesWorldExtent()
    {
        var p = new WebMercatorProjection().Forward(0, ProjectionControlPoints.NorthEdgeLat);
        Assert.True(p.Valid);
        Assert.Equal(0.0, p.X, precision: 6);
        Assert.Equal(ProjectionControlPoints.WorldEdge, p.Y, precision: 2); // 0.01 m
    }

    [Fact]
    public void Mercator_EastEdge_MatchesWorldExtent()
    {
        var p = new WebMercatorProjection().Forward(180, 0);
        Assert.True(p.Valid);
        Assert.Equal(ProjectionControlPoints.WorldEdge, p.X, precision: 2); // 0.01 m
        Assert.Equal(0.0, p.Y, precision: 6);
    }

    [Fact]
    public void Mercator_ControlPoints_MatchProjGoldens()
    {
        // PROJ cross-check gate (research 3.3): NYC/Berlin within 1.0 m.
        var m = new WebMercatorProjection();
        var nyc = m.Forward(-73.9857, 40.7484);
        Assert.True(nyc.Valid);
        Assert.Equal(ProjectionControlPoints.NycX, nyc.X, precision: 0);
        Assert.Equal(ProjectionControlPoints.NycY, nyc.Y, precision: 0);
        var berlin = m.Forward(13.4050, 52.5200);
        Assert.True(berlin.Valid);
        Assert.Equal(ProjectionControlPoints.BerlinX, berlin.X, precision: 0);
        Assert.Equal(ProjectionControlPoints.BerlinY, berlin.Y, precision: 0);
    }

    [Fact]
    public void Mercator_OutOfDomain_ReturnsInvalid_NotThrow()
    {
        var p = new WebMercatorProjection().Forward(0, 86.0);
        Assert.False(p.Valid);
    }

    [Fact]
    public void Mercator_RoundtripFuzz_MaxErrorBelowGate()
    {
        var m = new WebMercatorProjection();
        var rng = new Random(286);
        double maxErr = 0.0;
        for (int i = 0; i < 10_000; i++)
        {
            double lon = rng.NextDouble() * 360.0 - 180.0;
            double lat = rng.NextDouble() * 2.0 * 85.05112878 - 85.05112878;
            var fwd = m.Forward(lon, lat);
            Assert.True(fwd.Valid);
            var (rlon, rlat, valid) = m.Inverse(fwd.X, fwd.Y);
            Assert.True(valid);
            maxErr = Math.Max(maxErr, Math.Max(Math.Abs(rlon - lon), Math.Abs(rlat - lat)));
        }
        Assert.True(maxErr < 1e-9, $"max roundtrip error {maxErr:E} exceeds 1e-9 deg gate");
    }

    [Fact]
    public void Albers_Origin_Maps_To_Zero()
    {
        var a = new AlbersProjection();
        var p = a.Forward(-96.0, 23.0);
        Assert.True(p.Valid);
        Assert.Equal(0.0, p.X, precision: 6);
        Assert.Equal(0.0, p.Y, precision: 6);
    }

    [Fact]
    public void Albers_DegenerateParallels_Throw()
    {
        Assert.Throws<ArgumentException>(() => new AlbersProjection(30.0, -30.0));
    }

    [Fact]
    public void Albers_OnParallel_Scale_Is_One()
    {
        // Standard parallels have zero scale error along the parallel (research 3.3b).
        // Analytic parallel scale k = n*rho/cos(phi) == 1, re-derived here from the
        // published Snyder constants (independent of AlbersProjection internals).
        foreach (double parallel in new[] { ProjectionControlPoints.AlbersPhi1, ProjectionControlPoints.AlbersPhi2 })
        {
            double phi1 = Geo.Deg2Rad(ProjectionControlPoints.AlbersPhi1);
            double phi2 = Geo.Deg2Rad(ProjectionControlPoints.AlbersPhi2);
            double phi0 = Geo.Deg2Rad(ProjectionControlPoints.AlbersPhi0);
            double n = (Math.Sin(phi1) + Math.Sin(phi2)) / 2.0;
            double c = Math.Cos(phi1) * Math.Cos(phi1) + 2.0 * n * Math.Sin(phi1);
            double rho0 = Math.Sqrt(c - 2.0 * n * Math.Sin(phi0)) / n;
            Assert.NotEqual(0.0, n);
            double phi = Geo.Deg2Rad(parallel);
            double rho = Math.Sqrt(c - 2.0 * n * Math.Sin(phi)) / n;
            double k = n * rho / Math.Cos(phi);
            Assert.Equal(1.0, k, precision: 12);

            // Numeric confirmation: projected easting rate over a 1e-4 deg step
            // matches the true parallel arc rate R*cos(phi) to 1e-9 relative.
            var a = new AlbersProjection();
            var p1 = a.Forward(ProjectionControlPoints.AlbersLambda0, parallel);
            var p2 = a.Forward(ProjectionControlPoints.AlbersLambda0 + 1e-4, parallel);
            Assert.True(p1.Valid && p2.Valid);
            double numeric = (p2.X - p1.X) / Geo.Deg2Rad(1e-4);
            double analytic = Geo.R * Math.Cos(phi);
            Assert.True(Math.Abs(numeric / analytic - 1.0) < 1e-9,
                $"parallel {parallel}: relative scale error {numeric / analytic - 1.0:E}");
        }
    }

    [Fact]
    public void Albers_EqualArea_Cells_Preserved()
    {
        // Equal-area gate (research 3.2): planar shoelace area of projected 1x1 deg
        // cells equals the cos-weighted spherical area within 0.5 percent.
        var a = new AlbersProjection();
        foreach (var (lon0, lat0) in new[] { (-100.0, 25.0), (-80.0, 25.0), (-100.0, 35.0), (-80.0, 35.0), (-100.0, 45.0) })
        {
            var ring = new[]
            {
                new GeoPoint(lon0, lat0), new GeoPoint(lon0 + 1, lat0),
                new GeoPoint(lon0 + 1, lat0 + 1), new GeoPoint(lon0, lat0 + 1),
            };
            double spherical = Geo.SphericalAreaM2(ring);
            var pts = ring.Select(p => a.Forward(p.Lon, p.Lat)).ToArray();
            Assert.All(pts, p => Assert.True(p.Valid));
            double shoelace = 0.0;
            for (int i = 0; i < 4; i++)
            {
                var p1 = pts[i];
                var p2 = pts[(i + 1) % 4];
                shoelace += p1.X * p2.Y - p2.X * p1.Y;
            }
            shoelace = Math.Abs(shoelace) / 2.0;
            Assert.True(Math.Abs(shoelace / spherical - 1.0) < 0.005,
                $"cell ({lon0},{lat0}): planar {shoelace:E} vs spherical {spherical:E}");
        }
    }

    [Fact]
    public void Albers_RoundtripFuzz_MaxErrorBelowGate()
    {
        var a = new AlbersProjection();
        var rng = new Random(286);
        double maxErr = 0.0;
        int tested = 0;
        for (int i = 0; i < 10_000; i++)
        {
            double lon = rng.NextDouble() * 360.0 - 180.0;
            double lat = rng.NextDouble() * 178.0 - 89.0;
            var fwd = a.Forward(lon, lat);
            if (!fwd.Valid) continue;
            var (rlon, rlat, valid) = a.Inverse(fwd.X, fwd.Y);
            Assert.True(valid);
            double dLon = Math.Abs(rlon - lon);
            if (dLon > 180.0) dLon = 360.0 - dLon;
            maxErr = Math.Max(maxErr, Math.Max(dLon, Math.Abs(rlat - lat)));
            tested++;
        }
        Assert.True(tested > 9_000);
        Assert.True(maxErr < 1e-9, $"max Albers roundtrip error {maxErr:E} exceeds 1e-9 deg gate");
    }

    [Fact]
    public void TileMath_Zoom0_CoversWorld()
    {
        var t = TileMath.LonLatToTile(0, 0, 0);
        Assert.Equal(new TileId(0, 0, 0), t);
        var b = TileMath.Bounds(0, 0, 0);
        Assert.Equal(-180.0, b.West, precision: 9);
        Assert.Equal(180.0, b.East, precision: 9);
    }

    [Fact]
    public void TileMath_OverzoomScale_IsPowerOfTwo()
    {
        Assert.Equal(2.0, TileMath.OverzoomScale(15.0, 14), precision: 12);
        Assert.Equal(1.0, TileMath.OverzoomScale(14.0, 14), precision: 12);
    }

    [Theory]
    [InlineData(-122.6765, 45.5152, 14, 2608, 5860)] // downtown Portland
    [InlineData(-73.9857, 40.7484, 10, 301, 384)]    // NYC
    [InlineData(0.0, 0.0, 1, 1, 1)]
    public void TileMath_ControlTiles_MatchSlippy(double lon, double lat, int z, int x, int y)
    {
        Assert.Equal(new TileId(z, x, y), TileMath.LonLatToTile(lon, lat, z));
    }

    [Fact]
    public void TileMath_Bounds_ContainCenter()
    {
        // Tile bounds invert the addressing: center of Portland tile maps back into it.
        var b = TileMath.Bounds(14, 2608, 5860);
        Assert.True(b.West < -122.6765 && -122.6765 < b.East);
        Assert.True(b.South < 45.5152 && 45.5152 < b.North);
        Assert.True(b.MinX < b.MaxX && b.MinY < b.MaxY);
        Assert.Equal(TileMath.DataMaxZ, TileMath.DataZoom(16.7)); // overzoom clamps to bundled data
    }
}
