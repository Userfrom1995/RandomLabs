// Phase-2 tile pipeline gate: clip/simplify/quantize goldens, overzoom
// identity, determinism (same bytes twice), pack manifest + ndjson readers,
// and the Reprojector QGeom overload. Seeded Random(286) wherever sampling.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class TileBuilderTests
{
    private static TileBounds Portland14 => TileMath.Bounds(14, 2608, 5860);

    // -- clip goldens -----------------------------------------------------

    [Fact]
    public void ClipRing_ClampsOversizedRingToTile()
    {
        var b = Portland14;
        // Ring far larger than the tile on every side.
        var ring = new[]
        {
            new GeoPoint(b.West - 1.0, b.South - 1.0),
            new GeoPoint(b.East + 1.0, b.South - 1.0),
            new GeoPoint(b.East + 1.0, b.North + 1.0),
            new GeoPoint(b.West - 1.0, b.North + 1.0),
        };
        var clipped = Clipper.ClipRing(ring, b);
        Assert.True(clipped.Count >= 3);
        foreach (var p in clipped)
        {
            Assert.InRange(p.Lon, b.West - 1e-9, b.East + 1e-9);
            Assert.InRange(p.Lat, b.South - 1e-9, b.North + 1e-9);
        }
        // Clipped to exactly the tile rect (4 corners, order may rotate).
        Assert.Equal(4, clipped.Count);
    }

    [Fact]
    public void ClipRing_OutsideRing_YieldsEmpty()
    {
        var b = Portland14;
        var ring = new[]
        {
            new GeoPoint(b.East + 0.5, b.North + 0.5),
            new GeoPoint(b.East + 1.0, b.North + 0.5),
            new GeoPoint(b.East + 1.0, b.North + 1.0),
        };
        Assert.Empty(Clipper.ClipRing(ring, b));
    }

    [Fact]
    public void ClipPolyline_DiameterCrossing_YieldsOnePieceOnBounds()
    {
        var b = Portland14;
        var line = new[]
        {
            new GeoPoint(b.West - 0.5, (b.South + b.North) / 2.0),
            new GeoPoint(b.East + 0.5, (b.South + b.North) / 2.0),
        };
        var pieces = Clipper.ClipPolyline(line, b);
        Assert.Single(pieces);
        Assert.Equal(2, pieces[0].Count);
        Assert.Equal(b.West, pieces[0][0].Lon, precision: 9);
        Assert.Equal(b.East, pieces[0][1].Lon, precision: 9);
    }

    [Fact]
    public void ClipPolyline_DipInAndOut_YieldsTwoPieces()
    {
        var b = Portland14;
        double midLat = (b.South + b.North) / 2.0;
        var line = new[]
        {
            // Starts inside, exits east, re-enters east, ends inside.
            new GeoPoint((b.West + b.East) / 2.0, midLat),
            new GeoPoint(b.East + 0.5, midLat),
            new GeoPoint(b.East + 0.5, midLat + 0.001),
            new GeoPoint((b.West + b.East) / 2.0, midLat + 0.001),
        };
        var pieces = Clipper.ClipPolyline(line, b);
        Assert.Equal(2, pieces.Count);
        foreach (var piece in pieces)
            foreach (var p in piece)
                Assert.InRange(p.Lon, b.West - 1e-9, b.East + 1e-9);
    }

    [Fact]
    public void ContainsPoint_InsideTrue_OutsideFalse()
    {
        var b = Portland14;
        Assert.True(Clipper.ContainsPoint(new GeoPoint(-122.6765, 45.5152), b));
        Assert.False(Clipper.ContainsPoint(new GeoPoint(0.0, 0.0), b));
    }

    // -- simplify goldens --------------------------------------------------

    [Fact]
    public void Simplify_CollinearLine_CollapsesToEndpoints()
    {
        var rng = new Random(286);
        var line = new List<GeoPoint>();
        for (int i = 0; i <= 100; i++)
            line.Add(new GeoPoint(-122.7 + i * 0.0001, 45.5 + (rng.NextDouble() - 0.5) * 1e-7));
        var simple = Simplifier.Simplify(line, 1e-5);
        Assert.Equal(2, simple.Count);
    }

    [Fact]
    public void Simplify_DeviationStaysWithinTolerance()
    {
        // Zigzag with 1e-4 deg amplitude simplified at 1e-3 deg: every
        // original vertex stays within tolerance of the simplified line.
        var line = new List<GeoPoint>();
        for (int i = 0; i <= 40; i++)
            line.Add(new GeoPoint(-122.7 + i * 0.0002, 45.5 + (i % 2 == 0 ? 0.0 : 1e-4)));
        double tol = 1e-3;
        var simple = Simplifier.Simplify(line, tol);
        Assert.True(simple.Count < line.Count);
        for (int i = 0; i < line.Count; i++)
        {
            double nearest = double.MaxValue;
            for (int s = 0; s + 1 < simple.Count; s++)
                nearest = Math.Min(nearest, Simplifier.PointSegmentDistance(line[i], simple[s], simple[s + 1]));
            Assert.True(nearest <= tol * 1.001, $"vertex {i} deviates {nearest:E} > tol {tol:E}");
        }
    }

    [Fact]
    public void Simplify_HausdorffBelowHalfPixelAtTargetZoom()
    {
        // Research 4.2 gate: deviation < 0.5 px at the target zoom.
        // A 256 px tile maps 1 px to 16 extents, so 0.5 px = 8 extents.
        var b = Portland14;
        double tolDeg = Simplifier.ToleranceDegrees(14);
        // Sub-tolerance waviness (0.4 * tol): the whole line lies within tol
        // of its chord, so Douglas-Peucker must collapse it to ~endpoints
        // while the measured Hausdorff deviation stays under 0.5 px.
        var line = new List<GeoPoint>();
        for (int i = 0; i <= 60; i++)
            line.Add(new GeoPoint(
                b.West + (b.East - b.West) * i / 60.0,
                (b.South + b.North) / 2.0 + Math.Sin(i * 0.7) * tolDeg * 0.4));
        var simple = Simplifier.Simplify(line, tolDeg);
        double maxExtents = 0.0;
        for (int i = 0; i < line.Count; i++)
        {
            double nearest = double.MaxValue;
            for (int s = 0; s + 1 < simple.Count; s++)
                nearest = Math.Min(nearest, Simplifier.PointSegmentDistance(line[i], simple[s], simple[s + 1]));
            double inExtents = nearest / (b.East - b.West) * Quantizer.Extent;
            maxExtents = Math.Max(maxExtents, inExtents);
        }
        Assert.True(maxExtents < 8.0, $"Hausdorff {maxExtents:F2} extents exceeds 0.5 px (8 extents)");
        double ratio = (double)simple.Count / line.Count;
        Assert.True(ratio < 0.6, $"no simplification happened (ratio {ratio:F2})");
    }

    [Fact]
    public void ToleranceSchedule_MatchesResearchTable()
    {
        Assert.Equal(8.0, Simplifier.ToleranceExtents(10));
        Assert.Equal(4.0, Simplifier.ToleranceExtents(12));
        Assert.Equal(1.5, Simplifier.ToleranceExtents(14));
        Assert.Equal(1.5, Simplifier.ToleranceExtents(19));
    }

    // -- quantize goldens ---------------------------------------------------

    [Fact]
    public void Quantize_CornersAndCenter_MatchMvtConvention()
    {
        var b = Portland14;
        Assert.Equal(new QTilePoint(0, 0), Quantizer.Quantize(b.West, b.North, b));
        Assert.Equal(new QTilePoint(4096, 4096), Quantizer.Quantize(b.East, b.South, b));
        var center = Quantizer.Quantize((b.West + b.East) / 2.0, (b.South + b.North) / 2.0, b);
        Assert.Equal(new QTilePoint(2048, 2048), center);
    }

    [Fact]
    public void Quantize_Roundtrip_WithinHalfExtent()
    {
        var b = Portland14;
        var rng = new Random(286);
        double halfExtentDeg = (b.East - b.West) / Quantizer.Extent / 2.0;
        for (int i = 0; i < 1000; i++)
        {
            double lon = b.West + rng.NextDouble() * (b.East - b.West);
            double lat = b.South + rng.NextDouble() * (b.North - b.South);
            var q = Quantizer.Quantize(lon, lat, b);
            var back = Quantizer.Dequantize(q, b);
            Assert.True(Math.Abs(back.Lon - lon) <= halfExtentDeg * 1.01);
            Assert.True(Math.Abs(back.Lat - lat) <= halfExtentDeg * 1.01);
        }
    }

    [Fact]
    public void OverzoomScale_ChildQuantize_AgreesWithParent()
    {
        // Overzoom identity: the same ground point quantized in the z15
        // child dequantizes to the same lon/lat within the child half-extent,
        // and the overzoom scale 2^(15-14) = 2 maps parent offsets to child.
        Assert.Equal(2.0, TileMath.OverzoomScale(15.0, 14), precision: 12);
        var parent = Portland14;
        var rng = new Random(286);
        for (int i = 0; i < 200; i++)
        {
            double lon = parent.West + rng.NextDouble() * (parent.East - parent.West);
            double lat = parent.South + rng.NextDouble() * (parent.North - parent.South);
            var childId = TileMath.LonLatToTile(lon, lat, 15);
            var child = TileMath.Bounds(childId.Z, childId.X, childId.Y);
            var qp = Quantizer.Quantize(lon, lat, parent);
            var qc = Quantizer.Quantize(lon, lat, child);
            var bp = Quantizer.Dequantize(qp, parent);
            var bc = Quantizer.Dequantize(qc, child);
            double halfChild = (child.East - child.West) / Quantizer.Extent / 2.0;
            Assert.True(Math.Abs(bp.Lon - bc.Lon) <= halfChild * 2.0 + 1e-12);
            Assert.True(Math.Abs(bp.Lat - bc.Lat) <= halfChild * 2.0 + 1e-12);
        }
    }

    // -- tile builder + determinism -----------------------------------------

    private static List<TileInput> SampleInputs()
    {
        var b = Portland14;
        double w = b.West, e = b.East, s = b.South, n = b.North;
        return new List<TileInput>
        {
            new PolygonInput(PackLayers.Buildings, new[]
            {
                (IReadOnlyList<GeoPoint>)new[]
                {
                    new GeoPoint(w + (e - w) * 0.2, s + (n - s) * 0.2),
                    new GeoPoint(w + (e - w) * 0.4, s + (n - s) * 0.2),
                    new GeoPoint(w + (e - w) * 0.4, s + (n - s) * 0.4),
                    new GeoPoint(w + (e - w) * 0.2, s + (n - s) * 0.4),
                },
            }),
            new PolylineInput(PackLayers.Roads, new[]
            {
                new GeoPoint(w - 0.1, (s + n) / 2.0),
                new GeoPoint((w + e) / 2.0, (s + n) / 2.0),
                new GeoPoint(e + 0.1, (s + n) / 2.0 + 0.0005),
            }),
            new PointInput(PackLayers.Pois, new GeoPoint((w + e) / 2.0, (s + n) / 2.0)),
            // Fully outside: must be dropped.
            new PointInput(PackLayers.Pois, new GeoPoint(0.0, 0.0)),
            new PolylineInput(PackLayers.Roads, new[]
            {
                new GeoPoint(10.0, 10.0), new GeoPoint(11.0, 11.0),
            }),
        };
    }

    [Fact]
    public void BuildTile_ClipsSimplifiesQuantizes_AllCoordsInExtent()
    {
        var tile = TileBuilder.BuildTile(14, 2608, 5860, SampleInputs());
        Assert.True(tile.Features.Count >= 3);
        foreach (var f in tile.Features)
        {
            IEnumerable<QTilePoint> pts = f.Geom switch
            {
                QTPoint pt => new[] { pt.P },
                QTPolyline pl => pl.Points,
                QTPolygon pg => pg.Rings.SelectMany(r => r),
                _ => throw new InvalidOperationException(),
            };
            foreach (var p in pts)
            {
                Assert.InRange(p.X, 0, Quantizer.Extent);
                Assert.InRange(p.Y, 0, Quantizer.Extent);
            }
        }
        // The outside point/line are gone: exactly one POI survives.
        Assert.Single(tile.Features, f => f.Geom is QTPoint);
    }

    [Fact]
    public void BuildTile_Deterministic_SameBytesTwice_RegardlessOfInputOrder()
    {
        var forward = TileBuilder.BuildTile(14, 2608, 5860, SampleInputs());
        var shuffled = SampleInputs();
        shuffled.Reverse();
        var reversed = TileBuilder.BuildTile(14, 2608, 5860, shuffled);
        string a = TileCanonical.Serialize(forward);
        string b = TileCanonical.Serialize(reversed);
        Assert.Equal(a, b);
        // And a rebuild from scratch agrees too.
        var rebuilt = TileBuilder.BuildTile(14, 2608, 5860, SampleInputs());
        Assert.Equal(a, TileCanonical.Serialize(rebuilt));
    }

    // -- pack schema ----------------------------------------------------------

    [Fact]
    public void PackManifest_Roundtrip_PreservesFields()
    {
        var manifest = new PackManifest(
            PackManifest.CurrentVersion, 286, -122.6765, 45.5152,
            new Dictionary<string, int> { ["roads"] = 10, ["pois"] = 3 }, "synthetic-v1");
        var back = PackManifest.FromJson(manifest.ToJson());
        Assert.Equal(manifest.Version, back.Version);
        Assert.Equal(286, back.Seed);
        Assert.Equal(-122.6765, back.CenterLon, precision: 9);
        Assert.Equal(new Dictionary<string, int> { ["roads"] = 10, ["pois"] = 3 }, back.FeatureCounts);
    }

    [Fact]
    public void NdjsonReader_ParsesPointLinePolygon()
    {
        string ndjson =
            "{\"type\":\"Feature\",\"properties\":{\"name\":\"a\"},\"geometry\":{\"type\":\"Point\",\"coordinates\":[-122.6,45.5]}}\n" +
            "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-122.7,45.5],[-122.6,45.5]]}}\n" +
            "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[-122.7,45.5],[-122.6,45.5],[-122.6,45.6],[-122.7,45.5]]]}}\n";
        var inputs = NdjsonReader.ParseLayer("test", ndjson);
        Assert.Equal(3, inputs.Count);
        Assert.IsType<PointInput>(inputs[0]);
        Assert.IsType<PolylineInput>(inputs[1]);
        Assert.IsType<PolygonInput>(inputs[2]);
    }

    [Fact]
    public void NdjsonReader_MalformedLine_ThrowsNamedLineNumber()
    {
        string ndjson =
            "{\"type\":\"Feature\",\"properties\":{},\"geometry\":{\"type\":\"Point\",\"coordinates\":[-122.6,45.5]}}\n" +
            "not json\n";
        var ex = Assert.Throws<FormatException>(() => NdjsonReader.ParseLayer("test", ndjson));
        Assert.Contains("line 2", ex.Message);
    }

    // -- reprojector QGeom overload ---------------------------------------------

    [Fact]
    public void ReprojectTo_Mercator_MatchesForward_Pointwise()
    {
        var merc = new WebMercatorProjection();
        var input = new PolylineInput(PackLayers.Roads, new[]
        {
            new GeoPoint(-122.7, 45.5), new GeoPoint(-122.6, 45.51),
        });
        var projected = Reprojector.ReprojectTo(input, merc);
        Assert.NotNull(projected);
        var line = Assert.IsType<PolylineInput>(projected);
        for (int i = 0; i < 2; i++)
        {
            var expect = merc.Forward(input.Points[i].Lon, input.Points[i].Lat);
            Assert.Equal(expect.X, line.Points[i].Lon, precision: 6);
            Assert.Equal(expect.Y, line.Points[i].Lat, precision: 6);
        }
    }

    [Fact]
    public void ReprojectTo_DropsOutOfDomainPoints()
    {
        var merc = new WebMercatorProjection();
        // Latitude 86 is outside the Mercator domain: point vanishes.
        TileInput input = new PointInput(PackLayers.Pois, new GeoPoint(0.0, 86.0));
        Assert.Null(Reprojector.ReprojectTo(input, merc));
        // Mixed line keeps only the valid vertexes; <2 survivors drops the line.
        var mixed = new PolylineInput(PackLayers.Roads, new[]
        {
            new GeoPoint(0.0, 86.0), new GeoPoint(-122.6, 45.5),
        });
        Assert.Null(Reprojector.ReprojectTo(mixed, merc));
    }

    [Fact]
    public void ReprojectTo_AlbersOrigin_MapsToZero()
    {
        var albers = new AlbersProjection();
        TileInput input = new PointInput(PackLayers.Pois, new GeoPoint(-96.0, 23.0));
        var projected = Assert.IsType<PointInput>(Reprojector.ReprojectTo(input, albers));
        Assert.Equal(0.0, projected.Point.Lon, precision: 6);
        Assert.Equal(0.0, projected.Point.Lat, precision: 6);
    }

    // -- pack -> tile integration -------------------------------------------------

    [Fact]
    public void PackIntegration_RealPackBuildsPortlandTile()
    {
        // The checked-in v1 city pack (written by Sextant.Pack, linked as
        // test content) parses through the Core reader and builds a
        // non-empty deterministic downtown-Portland tile.
        string dir = Path.Combine(AppContext.BaseDirectory, "packs");
        var inputs = new List<TileInput>();
        int parsed = 0;
        foreach (var layer in PackLayers.All)
        {
            string ndjson = File.ReadAllText(Path.Combine(dir, layer + ".ndjson"));
            var layerInputs = NdjsonReader.ParseLayer(layer, ndjson);
            Assert.True(layerInputs.Count > 0, $"pack layer '{layer}' is empty");
            inputs.AddRange(layerInputs);
            parsed += layerInputs.Count;
        }
        Assert.Equal(140, parsed);
        var tile = TileBuilder.BuildTile(14, 2608, 5860, inputs);
        Assert.True(tile.Features.Count > 10, $"expected a full tile, got {tile.Features.Count} features");
        Assert.Contains(tile.Features, f => f.Layer == PackLayers.Roads);
        Assert.Contains(tile.Features, f => f.Layer == PackLayers.Buildings);
        Assert.Contains(tile.Features, f => f.Layer == PackLayers.Pois);
        string a = TileCanonical.Serialize(tile);
        string b = TileCanonical.Serialize(TileBuilder.BuildTile(14, 2608, 5860, inputs));
        Assert.Equal(a, b);
    }
}
