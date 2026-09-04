// S5 GeoJSON import/export codec (research 7). Parses Feature and
// FeatureCollection documents (Point, LineString, Polygon, MultiPolygon)
// into Core TileInputs for the import path, and emits RFC 7946-conformant
// FeatureCollections (right-hand rule: outer CCW, holes CW; explicit ring
// closure; F7 coordinates). MultiPolygon parses split into one feature per
// polygon sharing the source properties. Dateline-crossing polygons are
// carried through as-is (v1 city pack never crosses; documented scope).
// All malformed input throws FormatException naming the failure; never null,
// never partial. No IO, no wall-clock, no RNG.

using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Sextant.Core;

/// <summary>One parsed feature: passthrough name/class plus Core geometry.</summary>
public sealed record GeoJsonFeature(string? Name, string? Class, TileInput Geometry);

public static class GeoJson
{
    /// <summary>Parse a Feature or FeatureCollection document.</summary>
    public static IReadOnlyList<GeoJsonFeature> Parse(string json)
    {
        ArgumentNullException.ThrowIfNull(json);
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json, new JsonDocumentOptions
            {
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow,
            });
        }
        catch (JsonException ex)
        {
            throw new FormatException($"not valid JSON: {ex.Message}", ex);
        }
        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                throw new FormatException("GeoJSON root must be an object.");
            if (!root.TryGetProperty("type", out var type))
                throw new FormatException("GeoJSON object has no \"type\".");
            return type.GetString() switch
            {
                "Feature" => ParseFeature(root),
                "FeatureCollection" => ParseCollection(root),
                var t => throw new FormatException(
                    $"unsupported GeoJSON type '{t}' (want Feature or FeatureCollection)."),
            };
        }
    }

    private static IReadOnlyList<GeoJsonFeature> ParseFeature(JsonElement feature)
        => ParseOne(feature, 0);

    private static IReadOnlyList<GeoJsonFeature> ParseCollection(JsonElement root)
    {
        if (!root.TryGetProperty("features", out var features)
            || features.ValueKind != JsonValueKind.Array)
            throw new FormatException("FeatureCollection has no \"features\" array.");
        var output = new List<GeoJsonFeature>();
        int i = 0;
        foreach (var f in features.EnumerateArray())
        {
            try
            {
                output.AddRange(ParseOne(f, i));
            }
            catch (FormatException ex)
            {
                throw new FormatException($"features[{i}]: {ex.Message}", ex);
            }
            i++;
        }
        return output;
    }

    private static IReadOnlyList<GeoJsonFeature> ParseOne(JsonElement feature, int index)
    {
        if (feature.ValueKind != JsonValueKind.Object
            || !feature.TryGetProperty("type", out var t)
            || t.GetString() != "Feature")
            throw new FormatException($"features[{index}]: expected {{\"type\":\"Feature\",...}}.");
        if (!feature.TryGetProperty("geometry", out var geom))
            throw new FormatException($"features[{index}]: feature has no geometry.");
        if (geom.ValueKind == JsonValueKind.Null)
            throw new FormatException($"features[{index}]: null geometry is not supported (drop the feature instead).");
        if (geom.ValueKind != JsonValueKind.Object)
            throw new FormatException($"features[{index}]: geometry must be an object.");
        if (!geom.TryGetProperty("type", out var geomType))
            throw new FormatException($"features[{index}]: geometry has no type.");
        if (!geom.TryGetProperty("coordinates", out var coords))
            throw new FormatException($"features[{index}]: geometry has no coordinates.");

        string? name = null, cls = null;
        if (feature.TryGetProperty("properties", out var props)
            && props.ValueKind == JsonValueKind.Object)
        {
            if (props.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String)
                name = n.GetString();
            if (props.TryGetProperty("class", out var c) && c.ValueKind == JsonValueKind.String)
                cls = c.GetString();
        }
        string layer = cls ?? "import";
        string where = $"features[{index}]";
        try
        {
            return geomType.GetString() switch
            {
                "Point" => new[] { new GeoJsonFeature(name, cls, new PointInput(layer, ReadPosition(coords))) },
                "LineString" => new[] { new GeoJsonFeature(name, cls, new PolylineInput(layer, ReadPositions(coords, 2, "LineString"))) },
                "Polygon" => new[] { new GeoJsonFeature(name, cls, new PolygonInput(layer, ReadPolygon(coords))) },
                "MultiPolygon" => SplitMulti(coords).Select(rings =>
                    new GeoJsonFeature(name, cls, new PolygonInput(layer, rings))).ToArray(),
                "MultiPoint" or "MultiLineString" or "GeometryCollection" => throw new FormatException(
                    $"geometry type '{geomType.GetString()}' is not supported in v1 (want Point/LineString/Polygon/MultiPolygon)."),
                var g => throw new FormatException($"unknown geometry type '{g}'."),
            };
        }
        catch (FormatException ex) when (!ex.Message.StartsWith(where))
        {
            throw new FormatException($"{where}: {ex.Message}", ex);
        }
    }

    private static GeoPoint ReadPosition(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array || el.GetArrayLength() < 2)
            throw new FormatException("position must be [lon, lat].");
        double lon = el[0].GetDouble();
        double lat = el[1].GetDouble();
        if (!double.IsFinite(lon) || !double.IsFinite(lat))
            throw new FormatException("position ordinates must be finite numbers.");
        return new GeoPoint(lon, lat);
    }

    private static IReadOnlyList<GeoPoint> ReadPositions(JsonElement el, int min, string what)
    {
        if (el.ValueKind != JsonValueKind.Array)
            throw new FormatException($"{what} coordinates must be an array.");
        var output = new List<GeoPoint>(el.GetArrayLength());
        foreach (var p in el.EnumerateArray())
            output.Add(ReadPosition(p));
        if (output.Count < min)
            throw new FormatException($"{what} needs at least {min} positions (got {output.Count}).");
        return output;
    }

    private static IReadOnlyList<GeoPoint> CloseRing(IReadOnlyList<GeoPoint> ring)
    {
        if (ring.Count > 0 && !ring[0].Equals(ring[^1]))
            return new List<GeoPoint>(ring) { ring[0] };
        return ring;
    }

    private static IReadOnlyList<IReadOnlyList<GeoPoint>> ReadPolygon(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array || el.GetArrayLength() == 0)
            throw new FormatException("Polygon needs at least one ring.");
        var rings = new List<IReadOnlyList<GeoPoint>>(el.GetArrayLength());
        foreach (var ring in el.EnumerateArray())
            rings.Add(CloseRing(ReadPositions(ring, 4, "Polygon ring")));
        return rings;
    }

    private static IReadOnlyList<IReadOnlyList<IReadOnlyList<GeoPoint>>> SplitMulti(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array || el.GetArrayLength() == 0)
            throw new FormatException("MultiPolygon needs at least one polygon.");
        var output = new List<IReadOnlyList<IReadOnlyList<GeoPoint>>>(el.GetArrayLength());
        foreach (var poly in el.EnumerateArray())
            output.Add(ReadPolygon(poly));
        return output;
    }

    /// <summary>Signed lon/lat area (shoelace); positive = counter-clockwise.</summary>
    public static double SignedArea(IReadOnlyList<GeoPoint> ring)
    {
        ArgumentNullException.ThrowIfNull(ring);
        double sum = 0.0;
        for (int i = 0; i + 1 < ring.Count; i++)
            sum += ring[i].Lon * ring[i + 1].Lat - ring[i + 1].Lon * ring[i].Lat;
        return sum / 2.0;
    }

    private static IReadOnlyList<GeoPoint> ForceWinding(IReadOnlyList<GeoPoint> ring, bool wantCcw)
    {
        var closed = CloseRing(ring);
        bool ccw = SignedArea(closed) > 0.0;
        if (ccw == wantCcw) return closed;
        // Closed rings start and end on the same point, so a plain reversal
        // keeps the closure while flipping the winding.
        var rev = new List<GeoPoint>(closed);
        rev.Reverse();
        return rev;
    }

    private static string C(double v) => v.ToString("F7", CultureInfo.InvariantCulture);

    private static string Escape(string s) =>
        JsonSerializer.Serialize(s);

    private static void AppendRing(StringBuilder sb, IReadOnlyList<GeoPoint> ring, bool wantCcw)
    {
        var wound = ForceWinding(ring, wantCcw);
        sb.Append('[');
        for (int i = 0; i < wound.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('[').Append(C(wound[i].Lon)).Append(',').Append(C(wound[i].Lat)).Append(']');
        }
        sb.Append(']');
    }

    /// <summary>
    /// Emit an RFC 7946 FeatureCollection: outer rings CCW, holes CW,
    /// explicit closure, F7 coordinates, `\n` newlines. One line per feature
    /// (ndjson-compatible for pack round-trips).
    /// </summary>
    public static string EmitFeatureCollection(IReadOnlyList<GeoJsonFeature> features)
    {
        ArgumentNullException.ThrowIfNull(features);
        var sb = new StringBuilder();
        sb.Append("{\"type\":\"FeatureCollection\",\"features\":[");
        for (int i = 0; i < features.Count; i++)
        {
            if (i > 0) sb.Append(',');
            var f = features[i];
            ArgumentNullException.ThrowIfNull(f);
            sb.Append("{\"type\":\"Feature\",\"properties\":{");
            bool hasProp = false;
            if (f.Name is not null) { sb.Append("\"name\":").Append(Escape(f.Name)); hasProp = true; }
            if (f.Class is not null)
            {
                if (hasProp) sb.Append(',');
                sb.Append("\"class\":").Append(Escape(f.Class));
            }
            sb.Append("},\"geometry\":");
            AppendGeometry(sb, f.Geometry);
            sb.Append('}');
        }
        sb.Append("]}");
        return sb.ToString() + "\n";
    }

    private static void AppendGeometry(StringBuilder sb, TileInput geom)
    {
        switch (geom)
        {
            case PointInput p:
                sb.Append("{\"type\":\"Point\",\"coordinates\":[")
                  .Append(C(p.Point.Lon)).Append(',').Append(C(p.Point.Lat)).Append("]}");
                break;
            case PolylineInput l:
                if (l.Points.Count < 2) throw new ArgumentException("LineString needs at least 2 positions.");
                sb.Append("{\"type\":\"LineString\",\"coordinates\":[");
                for (int i = 0; i < l.Points.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    sb.Append('[').Append(C(l.Points[i].Lon)).Append(',').Append(C(l.Points[i].Lat)).Append(']');
                }
                sb.Append("]}");
                break;
            case PolygonInput p:
                if (p.Rings.Count == 0) throw new ArgumentException("Polygon needs at least one ring.");
                sb.Append("{\"type\":\"Polygon\",\"coordinates\":[");
                for (int r = 0; r < p.Rings.Count; r++)
                {
                    if (r > 0) sb.Append(',');
                    if (p.Rings[r].Count < 4) throw new ArgumentException("Polygon rings need at least 4 positions.");
                    AppendRing(sb, p.Rings[r], wantCcw: r == 0);
                }
                sb.Append("]}");
                break;
            default:
                throw new ArgumentException($"unknown geometry kind '{geom.GetType().Name}'.");
        }
    }
}
