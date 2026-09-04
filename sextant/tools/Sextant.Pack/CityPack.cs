// Sextant.Pack emit: synthetic city generator + authoring-dir converter.
// Deterministic: fixed seed, sorted emit, `\n` newlines, UTF-8 no BOM,
// coordinates rounded to 7 decimals (~1 cm), no timestamps anywhere.

using System.Globalization;
using System.Text;
using System.Text.Json;
using Sextant.Core;

namespace Sextant.Pack;

public sealed record PackData(Dictionary<string, List<string>> Layers, int Seed, string Source);

public static class CityPack
{
    public const double CenterLon = -122.6765;
    public const double CenterLat = 45.5152;

    private static string F(double v) => v.ToString("F7", CultureInfo.InvariantCulture);

    private static string Escape(string s) =>
        s.Replace("\\", "\\\\").Replace("\"", "\\\"");

    private static string Props(params (string Key, string Value)[] props)
    {
        var sb = new StringBuilder("{");
        for (int i = 0; i < props.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('"').Append(Escape(props[i].Key)).Append("\":\"")
              .Append(Escape(props[i].Value)).Append('"');
        }
        sb.Append('}');
        return sb.ToString();
    }

    private static string Feature(string props, string geomType, string coords) =>
        "{\"type\":\"Feature\",\"properties\":" + props +
        ",\"geometry\":{\"type\":\"" + geomType + "\",\"coordinates\":" + coords + "}}";

    private static string LineCoords(IReadOnlyList<GeoPoint> pts)
    {
        var sb = new StringBuilder("[");
        for (int i = 0; i < pts.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append('[').Append(F(pts[i].Lon)).Append(',').Append(F(pts[i].Lat)).Append(']');
        }
        sb.Append(']');
        return sb.ToString();
    }

    private static string RingCoords(IReadOnlyList<GeoPoint> ring)
    {
        // GeoJSON rings close explicitly; our model leaves them open.
        var sb = new StringBuilder("[");
        bool first = true;
        void Add(GeoPoint p)
        {
            if (!first) sb.Append(',');
            first = false;
            sb.Append('[').Append(F(p.Lon)).Append(',').Append(F(p.Lat)).Append(']');
        }
        foreach (var p in ring) Add(p);
        Add(ring[0]);
        sb.Append(']');
        return sb.ToString();
    }

    /// <summary>
    /// Synthetic downtown ("Portland-style" grid + river + park + POIs).
    /// Hand-authored generator, license-light: no OSM data involved, so no
    /// ODbL attribution is required for the v1 sample pack.
    /// </summary>
    public static PackData Generate(int seed = 286)
    {
        var rng = new Random(seed);
        var layers = new Dictionary<string, List<string>>();
        foreach (var layer in PackLayers.All)
            layers[layer] = new List<string>();

        double cx = CenterLon, cy = CenterLat;
        double hw = 0.006, hh = 0.005;

        // Roads: 11 avenues x 11 streets grid plus one diagonal arterial.
        for (int i = 0; i <= 10; i++)
        {
            double lon = cx - hw + i * (2 * hw / 10);
            layers[PackLayers.Roads].Add(Feature(
                Props(("name", $"Avenue {i + 1}"), ("class", "residential")),
                "LineString",
                LineCoords(new[] { new GeoPoint(lon, cy - hh), new GeoPoint(lon, cy + hh) })));
        }
        for (int j = 0; j <= 10; j++)
        {
            double lat = cy - hh + j * (2 * hh / 10);
            layers[PackLayers.Roads].Add(Feature(
                Props(("name", $"Street {j + 1}"), ("class", j % 3 == 0 ? "tertiary" : "residential")),
                "LineString",
                LineCoords(new[] { new GeoPoint(cx - hw, lat), new GeoPoint(cx + hw, lat) })));
        }
        layers[PackLayers.Roads].Add(Feature(
            Props(("name", "Burnside Diagonal"), ("class", "primary")),
            "LineString",
            LineCoords(new[]
            {
                new GeoPoint(cx - hw, cy - hh * 0.6),
                new GeoPoint(cx - hw * 0.3, cy - hh * 0.1),
                new GeoPoint(cx + hw * 0.4, cy + hh * 0.4),
                new GeoPoint(cx + hw, cy + hh * 0.8),
            })));

        // Buildings: inset rects in a seeded subset of blocks.
        double dx = 2 * hw / 10, dy = 2 * hh / 10;
        int buildings = 0;
        for (int i = 0; i < 10; i++)
        {
            for (int j = 0; j < 10; j++)
            {
                if (rng.NextDouble() < 0.25) continue; // park/river gaps vary per seed
                double x0 = cx - hw + i * dx, y0 = cy - hh + j * dy;
                int perBlock = 1 + (rng.NextDouble() < 0.4 ? 1 : 0);
                for (int k = 0; k < perBlock; k++)
                {
                    double ix = dx * (0.15 + rng.NextDouble() * 0.2);
                    double iy = dy * (0.15 + rng.NextDouble() * 0.2);
                    double w = dx * (0.25 + rng.NextDouble() * 0.3);
                    double h = dy * (0.25 + rng.NextDouble() * 0.3);
                    if (k == 1) { ix += dx * 0.45; iy += dy * 0.45; }
                    var ring = new[]
                    {
                        new GeoPoint(x0 + ix, y0 + iy),
                        new GeoPoint(x0 + ix + w, y0 + iy),
                        new GeoPoint(x0 + ix + w, y0 + iy + h),
                        new GeoPoint(x0 + ix, y0 + iy + h),
                    };
                    layers[PackLayers.Buildings].Add(Feature(
                        Props(("class", "building")),
                        "Polygon", "[" + RingCoords(ring) + "]"));
                    buildings++;
                }
            }
        }

        // Water: Willamette-style diagonal river band.
        layers[PackLayers.Water].Add(Feature(
            Props(("name", "River"), ("class", "water")),
            "Polygon", "[" + RingCoords(new[]
            {
                new GeoPoint(cx + 0.0020, cy - hh - 0.001),
                new GeoPoint(cx + 0.0035, cy - hh - 0.001),
                new GeoPoint(cx + 0.0015, cy + hh + 0.001),
                new GeoPoint(cx + 0.0000, cy + hh + 0.001),
            }) + "]"));

        // Landuse: one park rect plus one plaza rect.
        layers[PackLayers.Landuse].Add(Feature(
            Props(("name", "Central Park"), ("class", "park")),
            "Polygon", "[" + RingCoords(new[]
            {
                new GeoPoint(cx - hw + 2 * dx, cy - hh + 6 * dy),
                new GeoPoint(cx - hw + 4 * dx, cy - hh + 6 * dy),
                new GeoPoint(cx - hw + 4 * dx, cy - hh + 8 * dy),
                new GeoPoint(cx - hw + 2 * dx, cy - hh + 8 * dy),
            }) + "]"));
        layers[PackLayers.Landuse].Add(Feature(
            Props(("name", "Pioneer Plaza"), ("class", "plaza")),
            "Polygon", "[" + RingCoords(new[]
            {
                new GeoPoint(cx - hw + 6 * dx, cy - hh + 3 * dy),
                new GeoPoint(cx - hw + 7 * dx, cy - hh + 3 * dy),
                new GeoPoint(cx - hw + 7 * dx, cy - hh + 4 * dy),
                new GeoPoint(cx - hw + 6 * dx, cy - hh + 4 * dy),
            }) + "]"));

        // POIs: hand-placed named points (fixed, seed-independent).
        (string Name, string Class, double Dx, double Dy)[] pois =
        {
            ("Powell Books", "shop", -0.0015, 0.0008),
            ("Pioneer Square", "square", 0.0005, -0.0005),
            ("Central Station", "station", 0.0030, 0.0020),
            ("Riverside Cafe", "cafe", 0.0022, -0.0012),
            ("City Hall", "civic", -0.0005, 0.0018),
            ("Museum of Maps", "museum", -0.0028, -0.0022),
            ("North Park Kiosk", "kiosk", -0.0035, 0.0032),
            ("Union Bakery", "shop", 0.0012, 0.0028),
            ("Elm Clinic", "health", -0.0042, -0.0008),
            ("Grand Hotel", "hotel", 0.0042, 0.0002),
            ("Library", "civic", -0.0010, -0.0030),
            ("Ferry Dock", "station", 0.0028, -0.0035),
        };
        foreach (var (name, cls, ddx, ddy) in pois)
        {
            layers[PackLayers.Pois].Add(Feature(
                Props(("name", name), ("class", cls)),
                "Point", $"[{F(cx + ddx)},{F(cy + ddy)}]"));
        }

        // Sorted emit: generator loops are ordered already, but sort anyway
        // so the byte-stability rule never depends on loop discipline.
        foreach (var layer in PackLayers.All)
            layers[layer].Sort(StringComparer.Ordinal);

        return new PackData(layers, seed, "synthetic-v1");
    }

    /// <summary>
    /// Convert an authoring dir of `&lt;layer&gt;.geojson` FeatureCollections
    /// into sorted ndjson layers. Unknown files are ignored; missing layers
    /// emit empty files so the pack shape stays constant.
    /// </summary>
    public static PackData ConvertAuthoring(string authoringDir, int seed = 286)
    {
        var layers = new Dictionary<string, List<string>>();
        foreach (var layer in PackLayers.All)
        {
            var lines = new List<string>();
            string path = Path.Combine(authoringDir, layer + ".geojson");
            if (File.Exists(path))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(path));
                var root = doc.RootElement;
                if (!root.TryGetProperty("type", out var t) || t.GetString() != "FeatureCollection")
                    throw new FormatException($"{path}: expected a FeatureCollection.");
                foreach (var feature in root.GetProperty("features").EnumerateArray())
                {
                    string compact = JsonSerializer.Serialize(feature);
                    // Validate geometry through the same reader Core uses.
                    NdjsonReader.ParseLayer(layer, compact);
                    lines.Add(compact);
                }
                lines.Sort(StringComparer.Ordinal);
            }
            layers[layer] = lines;
        }
        return new PackData(layers, seed, "authoring-convert-v1");
    }

    /// <summary>Write ndjson layers + pack.json manifest (UTF-8 no BOM).</summary>
    public static PackManifest WritePack(PackData data, string outDir)
    {
        Directory.CreateDirectory(outDir);
        var counts = new Dictionary<string, int>();
        foreach (var layer in PackLayers.All)
        {
            var sb = new StringBuilder();
            foreach (var line in data.Layers[layer])
                sb.Append(line).Append('\n');
            File.WriteAllText(Path.Combine(outDir, layer + ".ndjson"),
                sb.ToString(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
            counts[layer] = data.Layers[layer].Count;
        }
        var manifest = new PackManifest(
            PackManifest.CurrentVersion, data.Seed, CenterLon, CenterLat, counts, data.Source);
        File.WriteAllText(Path.Combine(outDir, "pack.json"),
            manifest.ToJson(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        return manifest;
    }
}
