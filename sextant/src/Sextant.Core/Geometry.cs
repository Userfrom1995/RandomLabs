// S2 geometry: QGeom model (WGS84 doubles) + clip/simplify/quantize.
// All inputs/outputs in WGS84 degrees unless noted; quantized tile space is
// MVT-convention 4096 extents (y down). No wall-clock, no RNG, no IO here.

namespace Sextant.Core;

/// <summary>Geometry kind carried through the tile pipeline.</summary>
public enum GeomKind
{
    Point = 0,
    Polyline = 1,
    Polygon = 2,
}

/// <summary>WGS84 input feature. Coordinates are always lon/lat degrees.</summary>
public abstract record TileInput(string Layer)
{
    public abstract GeomKind Kind { get; }
}

/// <summary>Single WGS84 point (POI, label anchor).</summary>
public sealed record PointInput(string Layer, GeoPoint Point) : TileInput(Layer)
{
    public override GeomKind Kind => GeomKind.Point;
}

/// <summary>WGS84 polyline (road segment, river centerline).</summary>
public sealed record PolylineInput(string Layer, IReadOnlyList<GeoPoint> Points) : TileInput(Layer)
{
    public override GeomKind Kind => GeomKind.Polyline;
}

/// <summary>WGS84 polygon; first ring is the outer shell, rest are holes.</summary>
public sealed record PolygonInput(string Layer, IReadOnlyList<IReadOnlyList<GeoPoint>> Rings) : TileInput(Layer)
{
    public override GeomKind Kind => GeomKind.Polygon;
}

/// <summary>Tile-space integer point, MVT convention: [0, Extent], y down.</summary>
public readonly record struct QTilePoint(int X, int Y);

/// <summary>Polygon clipper (Sutherland-Hodgman per ring), polyline clipper
/// (Liang-Barsky per segment with stitching), point-in-tile test.</summary>
public static class Clipper
{
    public static bool ContainsPoint(GeoPoint p, TileBounds b) =>
        p.Lon >= b.West && p.Lon <= b.East && p.Lat >= b.South && p.Lat <= b.North;

    /// <summary>
    /// Clip a polygon ring to the tile bounds. Returns the clipped ring
    /// (possibly empty); output is not explicitly closed.
    /// </summary>
    public static IReadOnlyList<GeoPoint> ClipRing(IReadOnlyList<GeoPoint> ring, TileBounds b)
    {
        ArgumentNullException.ThrowIfNull(ring);
        if (ring.Count < 3) return Array.Empty<GeoPoint>();
        // Against left (lon >= west), right (lon <= east), bottom (lat >= south), top (lat <= north).
        var pts = ring;
        pts = ClipHalfPlane(pts, p => p.Lon >= b.West, IntersectLon(b.West));
        pts = ClipHalfPlane(pts, p => p.Lon <= b.East, IntersectLon(b.East));
        pts = ClipHalfPlane(pts, p => p.Lat >= b.South, IntersectLat(b.South));
        pts = ClipHalfPlane(pts, p => p.Lat <= b.North, IntersectLat(b.North));
        return pts.Count < 3 ? Array.Empty<GeoPoint>() : pts;
    }

    private static List<GeoPoint> ClipHalfPlane(
        IReadOnlyList<GeoPoint> pts, Func<GeoPoint, bool> inside, Func<GeoPoint, GeoPoint, GeoPoint> intersect)
    {
        var output = new List<GeoPoint>(pts.Count + 1);
        if (pts.Count == 0) return output;
        GeoPoint s = pts[pts.Count - 1];
        foreach (var e in pts)
        {
            bool eIn = inside(e);
            bool sIn = inside(s);
            if (eIn)
            {
                if (!sIn) output.Add(intersect(s, e));
                output.Add(e);
            }
            else if (sIn)
            {
                output.Add(intersect(s, e));
            }
            s = e;
        }
        return output;
    }

    private static Func<GeoPoint, GeoPoint, GeoPoint> IntersectLon(double lon) =>
        (a, b) =>
        {
            double t = b.Lon == a.Lon ? 0.0 : (lon - a.Lon) / (b.Lon - a.Lon);
            return new GeoPoint(lon, a.Lat + t * (b.Lat - a.Lat));
        };

    private static Func<GeoPoint, GeoPoint, GeoPoint> IntersectLat(double lat) =>
        (a, b) =>
        {
            double t = b.Lat == a.Lat ? 0.0 : (lat - a.Lat) / (b.Lat - a.Lat);
            return new GeoPoint(a.Lon + t * (b.Lon - a.Lon), lat);
        };

    /// <summary>
    /// Clip a polyline to the tile bounds. Returns zero or more clipped
    /// pieces (a line crossing the tile yields one piece; a line dipping
    /// in and out yields several). Single-point pieces are dropped.
    /// </summary>
    public static IReadOnlyList<IReadOnlyList<GeoPoint>> ClipPolyline(
        IReadOnlyList<GeoPoint> line, TileBounds b)
    {
        ArgumentNullException.ThrowIfNull(line);
        var pieces = new List<List<GeoPoint>>();
        for (int i = 0; i + 1 < line.Count; i++)
        {
            var seg = ClipSegment(line[i], line[i + 1], b);
            if (seg is null) continue;
            // Stitch onto the previous piece when they share the endpoint
            // (exact double equality holds for shared input vertices; clipped
            // boundary points from adjacent segments agree within 1e-9 deg).
            if (pieces.Count > 0 && SamePoint(pieces[^1][^1], seg.Value.P0))
                pieces[^1].Add(seg.Value.P1);
            else
                pieces.Add(new List<GeoPoint> { seg.Value.P0, seg.Value.P1 });
        }
        return pieces.Where(p => p.Count >= 2).Select(p => (IReadOnlyList<GeoPoint>)p).ToArray();
    }

    private static bool SamePoint(GeoPoint a, GeoPoint b) =>
        Math.Abs(a.Lon - b.Lon) < 1e-9 && Math.Abs(a.Lat - b.Lat) < 1e-9;

    private static (GeoPoint P0, GeoPoint P1)? ClipSegment(GeoPoint a, GeoPoint b, TileBounds bounds)
    {
        double x0 = a.Lon, y0 = a.Lat, x1 = b.Lon, y1 = b.Lat;
        double dx = x1 - x0, dy = y1 - y0;
        double t0 = 0.0, t1 = 1.0;
        // Liang-Barsky against [west,east] x [south,north].
        double[] p = { -dx, dx, -dy, dy };
        double[] q = { x0 - bounds.West, bounds.East - x0, y0 - bounds.South, bounds.North - y0 };
        for (int i = 0; i < 4; i++)
        {
            if (p[i] == 0.0)
            {
                if (q[i] < 0.0) return null; // parallel and outside
            }
            else
            {
                double r = q[i] / p[i];
                if (p[i] < 0.0) { if (r > t1) return null; if (r > t0) t0 = r; }
                else { if (r < t0) return null; if (r < t1) t1 = r; }
            }
        }
        if (t0 > t1) return null;
        return (new GeoPoint(x0 + t0 * dx, y0 + t0 * dy),
                new GeoPoint(x0 + t1 * dx, y0 + t1 * dy));
    }
}

/// <summary>
/// Per-zoom simplification: radial-distance pre-pass plus Douglas-Peucker,
/// the standard Mapbox simplify-js combination (research 4.2). Operates in
/// WGS84 degrees; tolerances derive from extent budgets via
/// <see cref="ToleranceDegrees"/>.
/// </summary>
public static class Simplifier
{
    /// <summary>Extent-unit tolerance budget per zoom (research 4.2).</summary>
    public static double ToleranceExtents(int z) => z <= 10 ? 8.0 : z <= 13 ? 4.0 : 1.5;

    /// <summary>Convert an extent tolerance to WGS84 degrees at zoom z.</summary>
    public static double ExtentsToDegrees(double extents, int z) =>
        extents / Quantizer.Extent * (360.0 / Math.Pow(2.0, z));

    /// <summary>Simplify tolerance in degrees for zoom z.</summary>
    public static double ToleranceDegrees(int z) => ExtentsToDegrees(ToleranceExtents(z), z);

    /// <summary>Radial pre-pass + Douglas-Peucker. Never drops endpoints.</summary>
    public static IReadOnlyList<GeoPoint> Simplify(IReadOnlyList<GeoPoint> points, double tolDeg)
    {
        ArgumentNullException.ThrowIfNull(points);
        if (tolDeg <= 0.0 || points.Count <= 2) return points;
        var pre = RadialPass(points, tolDeg);
        if (pre.Count <= 2) return pre;
        return DouglasPeucker(pre, tolDeg);
    }

    private static List<GeoPoint> RadialPass(IReadOnlyList<GeoPoint> points, double tolDeg)
    {
        double tolSq = tolDeg * tolDeg;
        var kept = new List<GeoPoint>(points.Count) { points[0] };
        GeoPoint last = points[0];
        for (int i = 1; i < points.Count; i++)
        {
            double dx = points[i].Lon - last.Lon;
            double dy = points[i].Lat - last.Lat;
            if (dx * dx + dy * dy > tolSq)
            {
                kept.Add(points[i]);
                last = points[i];
            }
        }
        if (!SameExact(kept[^1], points[^1])) kept.Add(points[^1]);
        return kept;
    }

    private static bool SameExact(GeoPoint a, GeoPoint b) => a.Lon == b.Lon && a.Lat == b.Lat;

    private static List<GeoPoint> DouglasPeucker(IReadOnlyList<GeoPoint> points, double tolDeg)
    {
        int n = points.Count;
        var keep = new bool[n];
        keep[0] = true;
        keep[n - 1] = true;
        var stack = new Stack<(int Lo, int Hi)>();
        stack.Push((0, n - 1));
        while (stack.Count > 0)
        {
            var (lo, hi) = stack.Pop();
            double maxDist = 0.0;
            int index = -1;
            for (int i = lo + 1; i < hi; i++)
            {
                double d = PointSegmentDistance(points[i], points[lo], points[hi]);
                if (d > maxDist) { maxDist = d; index = i; }
            }
            if (index >= 0 && maxDist > tolDeg)
            {
                keep[index] = true;
                stack.Push((lo, index));
                stack.Push((index, hi));
            }
        }
        var output = new List<GeoPoint>(n);
        for (int i = 0; i < n; i++)
            if (keep[i]) output.Add(points[i]);
        return output;
    }

    /// <summary>Planar point-to-segment distance in degrees.</summary>
    public static double PointSegmentDistance(GeoPoint p, GeoPoint a, GeoPoint b)
    {
        double dx = b.Lon - a.Lon, dy = b.Lat - a.Lat;
        double lenSq = dx * dx + dy * dy;
        if (lenSq == 0.0)
        {
            double ex = p.Lon - a.Lon, ey = p.Lat - a.Lat;
            return Math.Sqrt(ex * ex + ey * ey);
        }
        double t = ((p.Lon - a.Lon) * dx + (p.Lat - a.Lat) * dy) / lenSq;
        t = Math.Min(1.0, Math.Max(0.0, t));
        double cx = a.Lon + t * dx - p.Lon, cy = a.Lat + t * dy - p.Lat;
        return Math.Sqrt(cx * cx + cy * cy);
    }
}

/// <summary>
/// Quantization to MVT-compatible 4096 extents (research 4.1): linear map of
/// the tile lon/lat rect onto [0, 4096] with y flipped (north = 0).
/// No protobuf wire in v1; the convention lets a future MVT decoder slot in.
/// </summary>
public static class Quantizer
{
    public const int Extent = 4096;

    public static QTilePoint Quantize(double lon, double lat, TileBounds b)
    {
        double fx = (lon - b.West) / (b.East - b.West) * Extent;
        double fy = (b.North - lat) / (b.North - b.South) * Extent;
        return new QTilePoint(
            Math.Min(Extent, Math.Max(0, (int)Math.Round(fx))),
            Math.Min(Extent, Math.Max(0, (int)Math.Round(fy))));
    }

    public static QTilePoint Quantize(GeoPoint p, TileBounds b) => Quantize(p.Lon, p.Lat, b);

    public static GeoPoint Dequantize(int qx, int qy, TileBounds b)
    {
        double lon = b.West + (double)qx / Extent * (b.East - b.West);
        double lat = b.North - (double)qy / Extent * (b.North - b.South);
        return new GeoPoint(lon, lat);
    }

    public static GeoPoint Dequantize(QTilePoint q, TileBounds b) => Dequantize(q.X, q.Y, b);
}
