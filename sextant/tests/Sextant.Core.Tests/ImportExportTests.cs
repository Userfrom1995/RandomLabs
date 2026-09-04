// Phase-5 import/export gate: GeoJSON round-trips (point/line/polygon with
// F7 stability), right-hand-rule winding normalize, MultiPolygon splitting,
// open-ring auto-closure, malformed-input error enumeration, isochrone export
// schema validation, and emit-side validation.

using Sextant.Core;

namespace Sextant.Core.Tests;

public sealed class ImportExportTests
{
    private const string MixedCollection =
        "{\"type\":\"FeatureCollection\",\"features\":[" +
        "{\"type\":\"Feature\",\"properties\":{\"name\":\"Dock\",\"class\":\"station\"}," +
        "\"geometry\":{\"type\":\"Point\",\"coordinates\":[-122.6700,45.5100,12.5]}}," +
        "{\"type\":\"Feature\",\"properties\":{\"name\":\"Main\",\"class\":\"primary\"}," +
        "\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-122.6800,45.5100],[-122.6700,45.5200]]}}," +
        "{\"type\":\"Feature\",\"properties\":{\"name\":\"Park\",\"class\":\"park\"}," +
        "\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[-122.6800,45.5100],[-122.6700,45.5100],[-122.6700,45.5200],[-122.6800,45.5100]]]}}]}";

    [Fact]
    public void Parse_MixedCollection_ReadsAllKinds()
    {
        var features = GeoJson.Parse(MixedCollection);
        Assert.Equal(3, features.Count);
        Assert.Equal("Dock", features[0].Name);
        Assert.Equal("station", features[0].Class);
        Assert.IsType<PointInput>(features[0].Geometry);
        Assert.IsType<PolylineInput>(features[1].Geometry);
        var poly = Assert.IsType<PolygonInput>(features[2].Geometry);
        Assert.Single(poly.Rings);
        // Extra ordinate (12.5 elevation) ignored.
        var pt = Assert.IsType<PointInput>(features[0].Geometry);
        Assert.Equal(-122.67, pt.Point.Lon, 9);
    }

    [Fact]
    public void RoundTrip_EmitParse_IsStable()
    {
        var features = GeoJson.Parse(MixedCollection);
        string once = GeoJson.EmitFeatureCollection(features);
        var back = GeoJson.Parse(once);
        string twice = GeoJson.EmitFeatureCollection(back);
        Assert.Equal(once, twice);
        Assert.Equal(3, back.Count);
        // F7 rounding: coordinates survive to ~1 cm.
        var pt = Assert.IsType<PointInput>(back[0].Geometry);
        Assert.Equal(-122.67, pt.Point.Lon, 6);
        Assert.Equal(45.51, pt.Point.Lat, 6);
    }

    [Fact]
    public void Emit_NormalizesWindingToRightHandRule()
    {
        // Clockwise outer (negative area) plus CCW hole (positive area).
        var cwOuter = new[]
        {
            new GeoPoint(0, 0), new GeoPoint(0, 1),
            new GeoPoint(1, 1), new GeoPoint(1, 0),
            new GeoPoint(0, 0),
        };
        var ccwHole = new[]
        {
            new GeoPoint(0.2, 0.2), new GeoPoint(0.8, 0.2),
            new GeoPoint(0.8, 0.8), new GeoPoint(0.2, 0.8),
            new GeoPoint(0.2, 0.2),
        };
        Assert.True(GeoJson.SignedArea(cwOuter) < 0.0);
        Assert.True(GeoJson.SignedArea(ccwHole) > 0.0);
        var features = new[]
        {
            new GeoJsonFeature("Block", "building",
                new PolygonInput("buildings", new[] { cwOuter, ccwHole })),
        };
        var back = GeoJson.Parse(GeoJson.EmitFeatureCollection(features));
        var poly = Assert.IsType<PolygonInput>(Assert.Single(back).Geometry);
        Assert.Equal(2, poly.Rings.Count);
        Assert.True(GeoJson.SignedArea(poly.Rings[0]) > 0.0); // outer CCW
        Assert.True(GeoJson.SignedArea(poly.Rings[1]) < 0.0); // hole CW
    }

    [Fact]
    public void Parse_MultiPolygon_SplitsIntoFeatures()
    {
        const string json =
            "{\"type\":\"Feature\",\"properties\":{\"name\":\"Twin\",\"class\":\"park\"}," +
            "\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[" +
            "[[[0,0],[1,0],[1,1],[0,0]]]," +
            "[[[2,2],[3,2],[3,3],[2,2]]]]}}";
        var features = GeoJson.Parse(json);
        Assert.Equal(2, features.Count);
        Assert.All(features, f => Assert.Equal("Twin", f.Name));
        Assert.All(features, f => Assert.IsType<PolygonInput>(f.Geometry));
    }

    [Fact]
    public void Parse_OpenRing_AutoCloses()
    {
        const string json =
            "{\"type\":\"Feature\",\"properties\":{}," +
            "\"geometry\":{\"type\":\"Polygon\",\"coordinates\":" +
            "[[[0,0],[1,0],[1,1],[0,1]]]}}";
        var poly = Assert.IsType<PolygonInput>(Assert.Single(GeoJson.Parse(json)).Geometry);
        var ring = poly.Rings[0];
        Assert.True(ring.Count >= 4);
        Assert.Equal(ring[0], ring[^1]);
    }

    [Theory]
    [InlineData("not json", "not valid JSON")]
    [InlineData("[1,2]", "must be an object")]
    [InlineData("{\"a\":1}", "no \"type\"")]
    [InlineData("{\"type\":\"GeometryCollection\"}", "want Feature or FeatureCollection")]
    [InlineData("{\"type\":\"Feature\"}", "no geometry")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":null}", "null geometry")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\"}}", "no coordinates")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"MultiPoint\",\"coordinates\":[[0,0]]}}", "not supported in v1")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"Nope\",\"coordinates\":[]}}", "unknown geometry type")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[1]}}", "position must be")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[0,0]]}}", "at least 2 positions")]
    [InlineData("{\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[]}}", "at least one ring")]
    public void Parse_Malformed_ThrowsFormatException(string json, string fragment)
    {
        var ex = Assert.Throws<FormatException>(() => GeoJson.Parse(json));
        Assert.Contains(fragment, ex.Message);
    }

    [Fact]
    public void Emit_ValidatesDegenerateGeometry()
    {
        var shortLine = new[]
        {
            new GeoJsonFeature("X", "import",
                new PolylineInput("import", new[] { new GeoPoint(0, 0) })),
        };
        Assert.Throws<ArgumentException>(() => GeoJson.EmitFeatureCollection(shortLine));
        var emptyPoly = new[]
        {
            new GeoJsonFeature("X", "import",
                new PolygonInput("import", Array.Empty<IReadOnlyList<GeoPoint>>())),
        };
        Assert.Throws<ArgumentException>(() => GeoJson.EmitFeatureCollection(emptyPoly));
    }

    [Fact]
    public void IsochroneExport_ParsesAsValidPolygons()
    {
        // Tiny 5x5 two-way grid; arrivals radiate from the center node.
        var b = new RoadGraphBuilder();
        int n = 5;
        var ids = new int[n, n];
        for (int j = 0; j < n; j++)
            for (int i = 0; i < n; i++)
                ids[i, j] = b.AddNode(-122.6765 + i * 0.001, 45.5152 + j * 0.001);
        for (int j = 0; j < n; j++)
            for (int i = 0; i < n; i++)
            {
                if (i + 1 < n) b.AddEdge(ids[i, j], ids[i + 1, j], RoadClass.Residential);
                if (j + 1 < n) b.AddEdge(ids[i, j], ids[i, j + 1], RoadClass.Residential);
            }
        var g = b.Build();
        // Residential 30 km/h: ~13 s per 111 m edge; 150 s reaches the ring.
        var polys = Isochrone.ComputePolygons(g, ids[2, 2], 150.0, CostMode.Time, false, 25.0);
        Assert.NotEmpty(polys);
        // ToGeoJson emits a bare Polygon/MultiPolygon geometry: wrap it as a
        // Feature so the import path validates the export schema end to end.
        string wrapped =
            "{\"type\":\"Feature\",\"properties\":{\"name\":\"iso\"},\"geometry\":" +
            Isochrone.ToGeoJson(polys) + "}";
        var features = GeoJson.Parse(wrapped);
        foreach (var f in features)
        {
            var poly = Assert.IsType<PolygonInput>(f.Geometry);
            foreach (var ring in poly.Rings)
            {
                Assert.True(ring.Count >= 4);
                Assert.Equal(ring[0], ring[^1]);
            }
            Assert.True(GeoJson.SignedArea(poly.Rings[0]) > 0.0);
        }
    }
}
