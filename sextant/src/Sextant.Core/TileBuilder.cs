// S2 tile builder: per-(z,x,y) in-memory tile from WGS84 inputs.
// Pipeline per feature: R-tree window select (Phase 3 caller-side) -> clip to
// tile bounds -> simplify per zoom -> quantize to 4096 extents. Output is
// deterministic: features sorted by (layer, kind, coordinates), coordinates
// rounded by the quantizer, so the same input bytes always yield the same
// canonical bytes (see TileCanonical).

namespace Sextant.Core;

/// <summary>Quantized tile geometry (MVT-convention extents, y down).</summary>
public abstract record QTGeom
{
    public abstract GeomKind Kind { get; }
}

public sealed record QTPoint(QTilePoint P) : QTGeom
{
    public override GeomKind Kind => GeomKind.Point;
}

public sealed record QTPolyline(IReadOnlyList<QTilePoint> Points) : QTGeom
{
    public override GeomKind Kind => GeomKind.Polyline;
}

public sealed record QTPolygon(IReadOnlyList<IReadOnlyList<QTilePoint>> Rings) : QTGeom
{
    public override GeomKind Kind => GeomKind.Polygon;
}

public sealed record BuiltFeature(string Layer, QTGeom Geom);

public sealed record BuiltTile(TileId Id, IReadOnlyList<BuiltFeature> Features);

public static class TileBuilder
{
    /// <summary>
    /// Build one tile. Inputs are pre-selected WGS84 features (Phase 3 moves
    /// selection into an R-tree window query; the clip here stays as the
    /// exact edge cutter). Degenerate outputs are dropped: empty clips,
    /// sub-2-point polylines, sub-3-point or zero-area rings.
    /// </summary>
    public static BuiltTile BuildTile(
        int z, int x, int y, IEnumerable<TileInput> inputs, double? toleranceDegOverride = null)
    {
        ArgumentNullException.ThrowIfNull(inputs);
        var bounds = TileMath.Bounds(z, x, y);
        double tolDeg = toleranceDegOverride ?? Simplifier.ToleranceDegrees(z);
        var output = new List<BuiltFeature>();
        foreach (var input in inputs)
        {
            switch (input)
            {
                case PointInput pt:
                    if (Clipper.ContainsPoint(pt.Point, bounds))
                        output.Add(new BuiltFeature(pt.Layer, new QTPoint(Quantizer.Quantize(pt.Point, bounds))));
                    break;
                case PolylineInput pl:
                    foreach (var piece in Clipper.ClipPolyline(pl.Points, bounds))
                    {
                        var simple = Simplifier.Simplify(piece, tolDeg);
                        var quant = Dedup(simple.Select(p => Quantizer.Quantize(p, bounds)));
                        if (quant.Count >= 2)
                            output.Add(new BuiltFeature(pl.Layer, new QTPolyline(quant)));
                    }
                    break;
                case PolygonInput pg:
                    var rings = new List<IReadOnlyList<QTilePoint>>();
                    foreach (var ring in pg.Rings)
                    {
                        var clipped = Clipper.ClipRing(ring, bounds);
                        if (clipped.Count < 3) continue;
                        var simple = Simplifier.Simplify(clipped, tolDeg);
                        var quant = Dedup(simple.Select(p => Quantizer.Quantize(p, bounds)));
                        if (quant.Count >= 3 && Shoelace(quant) != 0)
                            rings.Add(quant);
                    }
                    if (rings.Count > 0)
                        output.Add(new BuiltFeature(pg.Layer, new QTPolygon(rings)));
                    break;
            }
        }
        // Deterministic order: byte-stability demands sorted emit, never input order.
        output.Sort((a, b) => string.CompareOrdinal(
            CanonicalKey(a), CanonicalKey(b)));
        return new BuiltTile(new TileId(z, x, y), output);
    }

    private static List<QTilePoint> Dedup(IEnumerable<QTilePoint> points)
    {
        var output = new List<QTilePoint>();
        foreach (var p in points)
            if (output.Count == 0 || output[^1] != p)
                output.Add(p);
        // A closed ring quantizes its first point twice; drop the repeat.
        if (output.Count > 1 && output[0] == output[^1])
            output.RemoveAt(output.Count - 1);
        return output;
    }

    private static long Shoelace(IReadOnlyList<QTilePoint> ring)
    {
        long area2 = 0;
        for (int i = 0; i < ring.Count; i++)
        {
            var a = ring[i];
            var b = ring[(i + 1) % ring.Count];
            area2 += (long)a.X * b.Y - (long)b.X * a.Y;
        }
        return area2;
    }

    private static string CanonicalKey(BuiltFeature f)
    {
        return f.Layer + "\u0000" + ((int)f.Geom.Kind).ToString("D1") + "\u0000" + GeomKey(f.Geom);
    }

    private static string GeomKey(QTGeom geom) => geom switch
    {
        QTPoint pt => $"{pt.P.X},{pt.P.Y}",
        QTPolyline pl => string.Join(";", pl.Points.Select(p => $"{p.X},{p.Y}")),
        QTPolygon pg => string.Join("|", pg.Rings.Select(r => string.Join(";", r.Select(p => $"{p.X},{p.Y}")))),
        _ => throw new ArgumentOutOfRangeException(nameof(geom)),
    };
}

/// <summary>
/// Deterministic canonical serialization of a built tile (one line per
/// feature, `\n`-joined, no trailing newline). The determinism gate builds
/// the same tile twice and asserts byte equality of this string.
/// </summary>
public static class TileCanonical
{
    public static string Serialize(BuiltTile tile)
    {
        ArgumentNullException.ThrowIfNull(tile);
        var sb = new System.Text.StringBuilder();
        sb.Append($"tile {tile.Id.Z}/{tile.Id.X}/{tile.Id.Y} features {tile.Features.Count}\n");
        foreach (var f in tile.Features)
        {
            sb.Append(f.Layer);
            sb.Append(' ');
            sb.Append(f.Geom switch
            {
                QTPoint pt => $"point {pt.P.X},{pt.P.Y}",
                QTPolyline pl => "line " + string.Join(";", pl.Points.Select(p => $"{p.X},{p.Y}")),
                QTPolygon pg => "poly " + string.Join("|", pg.Rings.Select(r => string.Join(";", r.Select(p => $"{p.X},{p.Y}")))),
                _ => throw new ArgumentOutOfRangeException(nameof(tile)),
            });
            sb.Append('\n');
        }
        return sb.ToString();
    }
}
