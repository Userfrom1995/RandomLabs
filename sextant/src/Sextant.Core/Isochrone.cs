// S4 isochrones: time-limited Dijkstra arrivals, segment-rasterized onto a
// local grid, T-contour via marching squares, one Chaikin smooth pass,
// GeoJSON Polygon/MultiPolygon emit (research 6.3). Deterministic: fixed
// tie-breaks from Router, sorted ring emit, F7 coordinate rounding.
// Oracle contract (tested, not just prose): the contour contains exactly the
// nodes with arrival <= T, up to one cell of tolerance.

namespace Sextant.Core;

public readonly record struct IsoPoint(double X, double Y);

/// <summary>One output polygon: CCW outer ring plus zero or more CW holes (right-hand rule).</summary>
public sealed record IsoPolygon(
    IReadOnlyList<IsoPoint> Outer,
    IReadOnlyList<IReadOnlyList<IsoPoint>> Holes);

/// <summary>Row-major arrival field in Mercator meters; +Inf = unreached.</summary>
public sealed class ArrivalGrid
{
    public int Nx { get; }
    public int Ny { get; }
    public double X0 { get; }
    public double Y0 { get; }
    public double Cell { get; }
    public double[] Values { get; }

    public ArrivalGrid(int nx, int ny, double x0, double y0, double cell, double[] values)
    {
        Nx = nx; Ny = ny; X0 = x0; Y0 = y0; Cell = cell; Values = values;
    }

    public double At(int i, int j) => Values[j * Nx + i];
}

public static class Isochrone
{
    /// <summary>Exact per-node arrival costs from source (seconds in Time mode, meters in Distance).</summary>
    public static double[] ComputeArrivals(
        RoadGraph g, int source, CostMode mode = CostMode.Time, bool penalizeTurns = false)
        => Router.ArrivalField(g, source, mode, penalizeTurns);

    /// <summary>
    /// Rasterize reached edges onto a grid. Each reached edge (tail reached)
    /// is walked at half-cell steps with linearly interpolated arrival; the
    /// far value past an unreached head is tail + one full edge cost, which
    /// exceeds T by the Dijkstra optimality argument (documented in
    /// routing.md), so the contour always cuts the segment before the
    /// unreached node. Cells keep the minimum splat. The bbox is padded with
    /// unreached cells so contours never touch the border (all rings close).
    /// </summary>
    public static ArrivalGrid Rasterize(
        RoadGraph g, double[] arrivals,
        double cellMeters = 75.0, int padCells = 2, int maxDim = 400)
    {
        ArgumentNullException.ThrowIfNull(g);
        ArgumentNullException.ThrowIfNull(arrivals);
        if (arrivals.Length != g.NodeCount) throw new ArgumentException("arrival count must match node count.");
        if (cellMeters <= 0.0 || double.IsNaN(cellMeters) || double.IsInfinity(cellMeters))
            throw new ArgumentException("cell size must be finite and positive.", nameof(cellMeters));
        if (padCells < 1) throw new ArgumentException("need at least one pad cell.", nameof(padCells));

        double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity;
        double y0 = double.PositiveInfinity, y1 = double.NegativeInfinity;
        int reached = 0;
        for (int v = 0; v < g.NodeCount; v++)
        {
            if (double.IsPositiveInfinity(arrivals[v])) continue;
            reached++;
            x0 = Math.Min(x0, g.X[v]); x1 = Math.Max(x1, g.X[v]);
            y0 = Math.Min(y0, g.Y[v]); y1 = Math.Max(y1, g.Y[v]);
        }
        if (reached == 0) throw new ArgumentException("no reached nodes to rasterize.");

        double cell = cellMeters;
        int nx = Math.Max(4, (int)Math.Ceiling((x1 - x0) / cell) + 1 + 2 * padCells);
        int ny = Math.Max(4, (int)Math.Ceiling((y1 - y0) / cell) + 1 + 2 * padCells);
        if (nx > maxDim || ny > maxDim)
        {
            cell = Math.Max((x1 - x0 + cellMeters) / (maxDim - 1 - 2 * padCells),
                            (y1 - y0 + cellMeters) / (maxDim - 1 - 2 * padCells));
            nx = Math.Max(4, (int)Math.Ceiling((x1 - x0) / cell) + 1 + 2 * padCells);
            ny = Math.Max(4, (int)Math.Ceiling((y1 - y0) / cell) + 1 + 2 * padCells);
        }
        double gx0 = (x0 + x1) / 2.0 - (nx - 1) * cell / 2.0;
        double gy0 = (y0 + y1) / 2.0 - (ny - 1) * cell / 2.0;

        var values = new double[nx * ny];
        Array.Fill(values, double.PositiveInfinity);

        void Splat(double x, double y, double val)
        {
            int i = (int)Math.Round((x - gx0) / cell);
            int j = (int)Math.Round((y - gy0) / cell);
            if (i < 0 || i >= nx || j < 0 || j >= ny) return;
            int k = j * nx + i;
            if (val < values[k]) values[k] = val;
        }

        for (int v = 0; v < g.NodeCount; v++)
        {
            if (double.IsPositiveInfinity(arrivals[v])) continue;
            Splat(g.X[v], g.Y[v], arrivals[v]);
        }
        foreach (int e in AllEdges(g))
        {
            int u = g.Froms[e], v = g.Heads[e];
            if (double.IsPositiveInfinity(arrivals[u])) continue;
            double far = double.IsPositiveInfinity(arrivals[v])
                ? arrivals[u] + g.EdgeCost(e, CostMode.Time)
                : arrivals[v];
            double segLen = Math.Sqrt(
                (g.X[v] - g.X[u]) * (g.X[v] - g.X[u]) +
                (g.Y[v] - g.Y[u]) * (g.Y[v] - g.Y[u]));
            int steps = Math.Max(1, (int)Math.Ceiling(segLen / (cell * 0.5)));
            for (int s = 0; s <= steps; s++)
            {
                double t = (double)s / steps;
                Splat(g.X[u] + t * (g.X[v] - g.X[u]),
                      g.Y[u] + t * (g.Y[v] - g.Y[u]),
                      arrivals[u] + t * (far - arrivals[u]));
            }
        }
        return new ArrivalGrid(nx, ny, gx0, gy0, cell, values);
    }

    private static IEnumerable<int> AllEdges(RoadGraph g)
    {
        for (int v = 0; v < g.NodeCount; v++)
            foreach (int e in g.OutEdges(v))
                yield return e;
    }

    /// <summary>
    /// Marching-squares T-contour. Returns raw segments in planar meters.
    /// Case table uses inside = value &lt;= cutoff; saddles (5, 10) split by
    /// the center average. Shared grid-edge crossings are computed from the
    /// same endpoint order on both sides up to 1 ulp, and BuildRings hashes
    /// at millimeter resolution, so adjacent cells always stitch.
    /// </summary>
    public static List<(IsoPoint A, IsoPoint B)> ContourSegments(ArrivalGrid grid, double cutoff)
    {
        ArgumentNullException.ThrowIfNull(grid);
        if (double.IsNaN(cutoff) || double.IsInfinity(cutoff))
            throw new ArgumentException("cutoff must be finite.", nameof(cutoff));
        // Unreached cells are +Inf; interpolating against infinity yields NaN
        // ((-Inf)/(-Inf) on straddling edges), so substitute a large finite
        // outside value. The crossing then lands within ~1e-6 of a cell of
        // the reached corner: the contour hugs reached cells tightly.
        double outside = cutoff + 1e6;
        double V(int i, int j)
        {
            double v = grid.At(i, j);
            return double.IsPositiveInfinity(v) ? outside : v;
        }
        var segs = new List<(IsoPoint, IsoPoint)>();
        for (int j = 0; j < grid.Ny - 1; j++)
        {
            for (int i = 0; i < grid.Nx - 1; i++)
            {
                double a = V(i, j), b = V(i + 1, j);
                double c = V(i + 1, j + 1), d = V(i, j + 1);
                int idx = (a <= cutoff ? 1 : 0) | (b <= cutoff ? 2 : 0)
                        | (c <= cutoff ? 4 : 0) | (d <= cutoff ? 8 : 0);
                if (idx == 0 || idx == 15) continue;
                double x0 = grid.X0 + i * grid.Cell, y0 = grid.Y0 + j * grid.Cell;
                double x1 = x0 + grid.Cell, y1 = y0 + grid.Cell;
                IsoPoint Bottom() => new(x0 + grid.Cell * ((cutoff - a) / (b - a)), y0);
                IsoPoint Right() => new(x1, y0 + grid.Cell * ((cutoff - b) / (c - b)));
                IsoPoint Top() => new(x0 + grid.Cell * ((cutoff - d) / (c - d)), y1);
                IsoPoint Left() => new(x0, y0 + grid.Cell * ((cutoff - a) / (d - a)));
                switch (idx)
                {
                    case 1: segs.Add((Left(), Bottom())); break;
                    case 2: segs.Add((Bottom(), Right())); break;
                    case 3: segs.Add((Left(), Right())); break;
                    case 4: segs.Add((Right(), Top())); break;
                    case 5:
                        if ((a + b + c + d) / 4.0 <= cutoff) { segs.Add((Left(), Top())); segs.Add((Bottom(), Right())); }
                        else { segs.Add((Left(), Bottom())); segs.Add((Right(), Top())); }
                        break;
                    case 6: segs.Add((Bottom(), Top())); break;
                    case 7: segs.Add((Left(), Top())); break;
                    case 8: segs.Add((Left(), Top())); break;
                    case 9: segs.Add((Bottom(), Top())); break;
                    case 10:
                        if ((a + b + c + d) / 4.0 <= cutoff) { segs.Add((Left(), Bottom())); segs.Add((Right(), Top())); }
                        else { segs.Add((Bottom(), Right())); segs.Add((Left(), Top())); }
                        break;
                    case 11: segs.Add((Right(), Top())); break;
                    case 12: segs.Add((Right(), Left())); break;
                    case 13: segs.Add((Bottom(), Right())); break;
                    case 14: segs.Add((Bottom(), Left())); break;
                }
            }
        }
        return segs;
    }

    private static (long, long) Key(IsoPoint p)
        => ((long)Math.Round(p.X * 1000.0), (long)Math.Round(p.Y * 1000.0));

    /// <summary>
    /// Stitch segments into closed rings (each ring repeats its first point
    /// last). Open chains (only possible if a contour hits the grid border,
    /// which the raster pad prevents) are dropped. Rings are sorted by
    /// descending absolute area for deterministic emit.
    /// </summary>
    public static List<List<IsoPoint>> BuildRings(List<(IsoPoint A, IsoPoint B)> segments)
    {
        ArgumentNullException.ThrowIfNull(segments);
        var byKey = new Dictionary<(long, long), List<int>>();
        for (int s = 0; s < segments.Count; s++)
        {
            foreach (var p in new[] { segments[s].A, segments[s].B })
            {
                var k = Key(p);
                if (!byKey.TryGetValue(k, out var list)) byKey[k] = list = new List<int>();
                list.Add(s);
            }
        }
        var used = new bool[segments.Count];
        var rings = new List<List<IsoPoint>>();
        for (int s = 0; s < segments.Count; s++)
        {
            if (used[s]) continue;
            used[s] = true;
            var chain = new List<IsoPoint> { segments[s].A, segments[s].B };
            var start = Key(segments[s].A);
            bool closed = false;
            for (int guard = 0; guard <= segments.Count; guard++)
            {
                var end = Key(chain[^1]);
                if (end == start)
                {
                    closed = true;
                    break;
                }
                int next = -1;
                bool flip = false;
                if (byKey.TryGetValue(end, out var cands))
                {
                    foreach (int cand in cands)
                    {
                        if (used[cand]) continue;
                        var seg = segments[cand];
                        if (Key(seg.A) == end) { next = cand; flip = false; break; }
                        if (Key(seg.B) == end) { next = cand; flip = true; break; }
                    }
                }
                if (next < 0) break;
                used[next] = true;
                chain.Add(flip ? segments[next].A : segments[next].B);
            }
            if (closed && chain.Count >= 4)
                rings.Add(chain);
        }
        rings.Sort((r1, r2) => Math.Abs(SignedArea(r2)).CompareTo(Math.Abs(SignedArea(r1))));
        return rings;
    }

    /// <summary>One Chaikin corner-cutting pass on a closed ring (first == last).</summary>
    public static List<IsoPoint> ChaikinClosed(IReadOnlyList<IsoPoint> ring)
    {
        ArgumentNullException.ThrowIfNull(ring);
        if (ring.Count < 4) throw new ArgumentException("closed ring needs at least 3 distinct points.", nameof(ring));
        int n = ring[^1].Equals(ring[0]) ? ring.Count - 1 : ring.Count;
        if (n < 3) throw new ArgumentException("closed ring needs at least 3 distinct points.", nameof(ring));
        var output = new List<IsoPoint>(2 * n + 1);
        for (int i = 0; i < n; i++)
        {
            var p = ring[i];
            var q = ring[(i + 1) % n];
            output.Add(new IsoPoint(0.75 * p.X + 0.25 * q.X, 0.75 * p.Y + 0.25 * q.Y));
            output.Add(new IsoPoint(0.25 * p.X + 0.75 * q.X, 0.25 * p.Y + 0.75 * q.Y));
        }
        output.Add(output[0]);
        return output;
    }

    /// <summary>Signed planar area (shoelace); positive = counter-clockwise.</summary>
    public static double SignedArea(IReadOnlyList<IsoPoint> ring)
    {
        ArgumentNullException.ThrowIfNull(ring);
        double sum = 0.0;
        for (int i = 0; i + 1 < ring.Count; i++)
            sum += ring[i].X * ring[i + 1].Y - ring[i + 1].X * ring[i].Y;
        return sum / 2.0;
    }

    public static bool PointInRing(IReadOnlyList<IsoPoint> ring, double x, double y)
    {
        ArgumentNullException.ThrowIfNull(ring);
        bool inside = false;
        for (int i = 0, j = ring.Count - 1; i < ring.Count; j = i++)
        {
            double xi = ring[i].X, yi = ring[i].Y;
            double xj = ring[j].X, yj = ring[j].Y;
            if ((yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
                inside = !inside;
        }
        return inside;
    }

    /// <summary>
    /// Nest rings into polygons: largest first; a ring inside an existing
    /// outer becomes its hole, otherwise it starts a new polygon. Single
    /// level only (holes never nest deeper); documented v1 scope.
    /// </summary>
    public static List<IsoPolygon> NestRings(List<List<IsoPoint>> rings)
    {
        ArgumentNullException.ThrowIfNull(rings);
        var polys = new List<IsoPolygon>();
        foreach (var ring in rings)
        {
            var centroid = Centroid(ring);
            IsoPolygon? host = null;
            foreach (var poly in polys)
            {
                if (PointInRing(poly.Outer, centroid.X, centroid.Y))
                    host = poly;
            }
            if (host is null)
            {
                polys.Add(new IsoPolygon(ForceWinding(ring, wantCcw: true), new List<IReadOnlyList<IsoPoint>>()));
            }
            else
            {
                ((List<IReadOnlyList<IsoPoint>>)host.Holes).Add(ForceWinding(ring, wantCcw: false));
            }
        }
        return polys;
    }

    private static IsoPoint Centroid(IReadOnlyList<IsoPoint> ring)
    {
        double sx = 0.0, sy = 0.0;
        int n = ring[^1].Equals(ring[0]) ? ring.Count - 1 : ring.Count;
        for (int i = 0; i < n; i++) { sx += ring[i].X; sy += ring[i].Y; }
        return new IsoPoint(sx / n, sy / n);
    }

    private static List<IsoPoint> ForceWinding(List<IsoPoint> ring, bool wantCcw)
    {
        bool ccw = SignedArea(ring) > 0.0;
        if (ccw == wantCcw) return ring;
        var rev = new List<IsoPoint>(ring);
        rev.Reverse();
        return rev;
    }

    public static bool Contains(IReadOnlyList<IsoPolygon> polys, double x, double y)
    {
        ArgumentNullException.ThrowIfNull(polys);
        foreach (var poly in polys)
        {
            if (!PointInRing(poly.Outer, x, y)) continue;
            bool inHole = false;
            foreach (var hole in poly.Holes)
            {
                if (PointInRing(hole, x, y)) { inHole = true; break; }
            }
            if (!inHole) return true;
        }
        return false;
    }

    /// <summary>
    /// Full pipeline: arrivals -&gt; grid -&gt; contour -&gt; rings -&gt; one
    /// Chaikin pass -&gt; nested polygons. One entry point for the App overlay.
    /// </summary>
    public static List<IsoPolygon> ComputePolygons(
        RoadGraph g, int source, double cutoffT,
        CostMode mode = CostMode.Time, bool penalizeTurns = false, double cellMeters = 75.0)
    {
        ArgumentNullException.ThrowIfNull(g);
        var arrivals = ComputeArrivals(g, source, mode, penalizeTurns);
        var grid = Rasterize(g, arrivals, cellMeters);
        var rings = BuildRings(ContourSegments(grid, cutoffT));
        var smooth = new List<List<IsoPoint>>(rings.Count);
        foreach (var ring in rings)
            smooth.Add(ChaikinClosed(ring));
        return NestRings(smooth);
    }

    /// <summary>
    /// GeoJSON Polygon/MultiPolygon in WGS84 lon/lat (F7), right-hand rule,
    /// UTF-8, `\n` newlines. Planar-meter rings convert through the Web
    /// Mercator inverse.
    /// </summary>
    public static string ToGeoJson(IReadOnlyList<IsoPolygon> polys)
    {
        ArgumentNullException.ThrowIfNull(polys);
        if (polys.Count == 0) throw new ArgumentException("no polygons to emit.");
        var merc = new WebMercatorProjection();
        static string C(double v) => v.ToString("F7", System.Globalization.CultureInfo.InvariantCulture);
        var sb = new System.Text.StringBuilder();
        bool multi = polys.Count > 1;
        sb.Append(multi ? "{\"type\":\"MultiPolygon\",\"coordinates\":["
                        : "{\"type\":\"Polygon\",\"coordinates\":[");
        for (int p = 0; p < polys.Count; p++)
        {
            if (p > 0) sb.Append(',');
            if (multi) sb.Append('[');
            var poly = polys[p];
            var all = new List<IReadOnlyList<IsoPoint>> { poly.Outer };
            all.AddRange(poly.Holes);
            for (int r = 0; r < all.Count; r++)
            {
                if (r > 0) sb.Append(',');
                sb.Append('[');
                var ring = all[r];
                for (int i = 0; i < ring.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    var inv = merc.Inverse(ring[i].X, ring[i].Y);
                    sb.Append('[').Append(C(inv.Lon)).Append(',').Append(C(inv.Lat)).Append(']');
                }
                sb.Append(']');
            }
            if (multi) sb.Append(']');
        }
        sb.Append("]}");
        return sb.ToString();
    }
}
