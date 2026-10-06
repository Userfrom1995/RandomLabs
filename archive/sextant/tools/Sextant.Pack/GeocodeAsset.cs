// Sextant.Pack geocode asset: builds the offline trigram index from the
// named features of a pack (roads + pois + water/landuse with a
// properties.name) and emits `geocode.idx.json` through GeocodeIndex.ToJson.
// Deterministic: entries sorted by (folded name, lon, lat) before id
// assignment, so the same pack always yields the same bytes.

using System.Text;
using System.Text.Json;
using Sextant.Core;

namespace Sextant.Pack;

public static class GeocodeAsset
{
    public const string FileName = "geocode.idx.json";

    public static GeocodeIndex BuildFromLayers(Dictionary<string, List<string>> layers)
    {
        ArgumentNullException.ThrowIfNull(layers);
        var raw = new List<(string Name, GeocodeKind Kind, string Class, double Lon, double Lat, double Pop)>();
        foreach (var layer in PackLayers.All)
        {
            if (!layers.TryGetValue(layer, out var lines)) continue;
            GeocodeKind kind = layer switch
            {
                PackLayers.Roads => GeocodeKind.Street,
                PackLayers.Pois => GeocodeKind.Poi,
                _ => GeocodeKind.Place,
            };
            double pop = kind switch
            {
                GeocodeKind.Poi => 0.3,
                GeocodeKind.Place => 0.2,
                _ => 0.1,
            };
            foreach (string line in lines)
            {
                var parsed = ParseNamed(line);
                if (parsed is null) continue; // unnamed features are not searchable
                raw.Add((parsed.Value.Name, kind, parsed.Value.Class, parsed.Value.Lon, parsed.Value.Lat, pop));
            }
        }
        // Primary arterials get a small popularity bump (deterministic rule:
        // class string equals "primary").
        var entries = raw
            .OrderBy(r => GeocodeText.Normalize(r.Name), StringComparer.Ordinal)
            .ThenBy(r => r.Lon).ThenBy(r => r.Lat)
            .Select((r, i) => new GeocodeEntry(i, r.Name, r.Kind, r.Class, r.Lon, r.Lat,
                r.Class == "primary" ? Math.Min(0.5, r.Pop + 0.05) : r.Pop))
            .ToList();
        return GeocodeIndex.Build(entries);
    }

    private static (string Name, string Class, double Lon, double Lat)? ParseNamed(string line)
    {
        using var doc = JsonDocument.Parse(line);
        var root = doc.RootElement;
        string? name = null, cls = "";
        if (root.TryGetProperty("properties", out var props) && props.ValueKind == JsonValueKind.Object)
        {
            if (props.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String)
                name = n.GetString();
            if (props.TryGetProperty("class", out var c) && c.ValueKind == JsonValueKind.String)
                cls = c.GetString() ?? "";
        }
        if (string.IsNullOrWhiteSpace(name)) return null;
        var geom = root.GetProperty("geometry");
        var anchor = Centroid(geom);
        return (name, cls, anchor.Lon, anchor.Lat);
    }

    private static GeoPoint Centroid(JsonElement geom)
    {
        string type = geom.GetProperty("type").GetString() ?? "";
        int depth = type switch
        {
            "Point" => 0,
            "LineString" => 1,
            "Polygon" => 2,
            "MultiPolygon" => 3,
            _ => throw new FormatException($"geocode asset: unsupported geometry '{type}'."),
        };
        var coords = geom.GetProperty("coordinates");
        var sum = new List<GeoPoint>();
        Collect(coords, depth, sum);
        if (sum.Count == 0) throw new FormatException("geocode asset: empty coordinates.");
        double lon = 0.0, lat = 0.0;
        foreach (var p in sum) { lon += p.Lon; lat += p.Lat; }
        return new GeoPoint(lon / sum.Count, lat / sum.Count);
    }

    private static void Collect(JsonElement el, int depth, List<GeoPoint> output)
    {
        if (depth == 0)
        {
            output.Add(new GeoPoint(el[0].GetDouble(), el[1].GetDouble()));
            return;
        }
        foreach (var child in el.EnumerateArray())
            Collect(child, depth - 1, output);
    }

    public static void WriteAsset(GeocodeIndex index, string outDir)
    {
        ArgumentNullException.ThrowIfNull(index);
        Directory.CreateDirectory(outDir);
        File.WriteAllText(Path.Combine(outDir, FileName), index.ToJson(),
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }
}
