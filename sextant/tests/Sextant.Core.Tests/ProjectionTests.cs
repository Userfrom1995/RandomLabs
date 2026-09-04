// Phase-0 projection gate: control-point goldens + seeded roundtrip fuzz.
// Full matrix (PROJ cross-check, Albers area preservation, tile goldens) lands
// in Phases 1-2 per ideas/2026-09-04-sextant-gis-engine.md.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class ProjectionTests
{
    private const double WorldEdge = 20037508.342789244; // R * PI

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
        var p = new WebMercatorProjection().Forward(0, 85.05112878);
        Assert.True(p.Valid);
        Assert.Equal(0.0, p.X, precision: 6);
        Assert.Equal(WorldEdge, p.Y, precision: 2);
    }

    [Fact]
    public void Mercator_EastEdge_MatchesWorldExtent()
    {
        var p = new WebMercatorProjection().Forward(180, 0);
        Assert.True(p.Valid);
        Assert.Equal(WorldEdge, p.X, precision: 2);
        Assert.Equal(0.0, p.Y, precision: 6);
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
}
