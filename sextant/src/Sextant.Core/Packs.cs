// S5/S2 pack schema: versioned static asset manifest plus the ndjson
// layer readers. Core owns the schema and the readers; fetching and caching
// belong to the App (PackLoader, Phase 5). The writer lives in Sextant.Pack
// and must emit exactly what these readers accept.

using System.Text.Json;

namespace Sextant.Core;

/// <summary>Well-known layer names of a city pack.</summary>
public static class PackLayers
{
    public const string Roads = "roads";
    public const string Buildings = "buildings";
    public const string Water = "water";
    public const string Landuse = "landuse";
    public const string Pois = "pois";

    public static readonly IReadOnlyList<string> All =
        new[] { Roads, Buildings, Water, Landuse, Pois };
}

/// <summary>
/// Pack manifest: version + seed + center + per-layer feature counts.
/// Serialized with fixed property order, `\n` newlines, UTF-8 no BOM, so the
/// same inputs always produce the same bytes (determinism gate, Phase 2).
/// </summary>
public sealed record PackManifest(
    string Version,
    int Seed,
    double CenterLon,
    double CenterLat,
    Dictionary<string, int> FeatureCounts,
    string Source)
{
    public const string CurrentVersion = "sextant-pack/1";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
    };

    public string ToJson()
    {
        string json = JsonSerializer.Serialize(this, JsonOptions);
        return json.Replace("\r\n", "\n").Replace("\r", "\n") + "\n";
    }

    public static PackManifest FromJson(string json)
    {
        ArgumentNullException.ThrowIfNull(json);
        return JsonSerializer.Deserialize<PackManifest>(json, JsonOptions)
            ?? throw new FormatException("pack.json parsed to null.");
    }
}

/// <summary>
/// Minimal GeoJSON Feature reader for ndjson pack layers. Accepts Point,
/// LineString, and Polygon geometries with [lon, lat] positions (extra
/// ordinates ignored). Throws <see cref="FormatException"/> naming the
/// 1-based line number on any malformed input.
/// </summary>
public static class NdjsonReader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = false,
    };

    public static IReadOnlyList<TileInput> ParseLayer(string layer, string ndjson)
    {
        ArgumentNullException.ThrowIfNull(layer);
        ArgumentNullException.ThrowIfNull(ndjson);
        var output = new List<TileInput>();
        var lines = ndjson.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i].Trim();
            if (line.Length == 0) continue;
            try
            {
                output.Add(ParseFeature(layer, line));
            }
            catch (FormatException)
            {
                throw;
            }
            catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or ArgumentException)
            {
                throw new FormatException($"pack layer '{layer}' line {i + 1}: {ex.Message}", ex);
            }
        }
        return output;
    }

    private static TileInput ParseFeature(string layer, string line)
    {
        using var doc = JsonDocument.Parse(line, new JsonDocumentOptions
        {
            AllowTrailingCommas = false,
            CommentHandling = JsonCommentHandling.Disallow,
        });
        var root = doc.RootElement;
        if (!root.TryGetProperty("type", out var type) || type.GetString() != "Feature")
            throw new FormatException("expected {\"type\":\"Feature\",...}.");
        if (!root.TryGetProperty("geometry", out var geom) || geom.ValueKind != JsonValueKind.Object)
            throw new FormatException("feature has no geometry object.");
        if (!geom.TryGetProperty("type", out var geomType))
            throw new FormatException("geometry has no type.");
        if (!geom.TryGetProperty("coordinates", out var coords))
            throw new FormatException("geometry has no coordinates.");

        return geomType.GetString() switch
        {
            "Point" => new PointInput(layer, ReadPosition(coords)),
            "LineString" => new PolylineInput(layer, ReadPositions(coords)),
            "Polygon" => new PolygonInput(layer, ReadRings(coords)),
            var t => throw new FormatException($"unsupported geometry type '{t}' (want Point/LineString/Polygon)."),
        };
    }

    private static GeoPoint ReadPosition(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array || el.GetArrayLength() < 2)
            throw new FormatException("position must be [lon, lat].");
        return new GeoPoint(el[0].GetDouble(), el[1].GetDouble());
    }

    private static IReadOnlyList<GeoPoint> ReadPositions(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array)
            throw new FormatException("LineString coordinates must be an array.");
        var output = new List<GeoPoint>(el.GetArrayLength());
        foreach (var p in el.EnumerateArray())
            output.Add(ReadPosition(p));
        if (output.Count < 2)
            throw new FormatException("LineString needs at least 2 positions.");
        return output;
    }

    private static IReadOnlyList<IReadOnlyList<GeoPoint>> ReadRings(JsonElement el)
    {
        if (el.ValueKind != JsonValueKind.Array || el.GetArrayLength() == 0)
            throw new FormatException("Polygon needs at least one ring.");
        var rings = new List<IReadOnlyList<GeoPoint>>(el.GetArrayLength());
        foreach (var ring in el.EnumerateArray())
            rings.Add(ReadPositions(ring));
        return rings;
    }
}
