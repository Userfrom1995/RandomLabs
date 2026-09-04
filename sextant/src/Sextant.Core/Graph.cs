// S4 graph model: directed weighted road graph in CSR layout (research 6.1).
// Nodes carry WGS84 lon/lat plus Web Mercator meters (X east, Y north); edges
// are directed with haversine length, per-edge max speed, and road class.
// Primary cost is travel TIME seconds; distance mode is a toggle. Turn costs
// run on the implicit expanded state (node, incomingEdge) at expansion time.
// graph.bin layout (little-endian, version 1) is pinned here:
//   magic[4] = 'S','X','G','R', int32 version=1, int32 nodeCount, int32 edgeCount,
//   then nodeCount x (float64 lon, float64 lat, float64 x, float64 y),
//   then edgeCount x (int32 from, int32 to, float32 lengthM, float32 maxKmh, byte class)
// edges sorted by (from, to) so the bytes are deterministic.

namespace Sextant.Core;

/// <summary>Road class, ordered by rank (higher = faster arterial).</summary>
public enum RoadClass : byte
{
    Residential = 0,
    Tertiary = 1,
    Secondary = 2,
    Primary = 3,
    Trunk = 4,
    Motorway = 5,
}

/// <summary>Cost semantics: Time (seconds, default) or Distance (meters).</summary>
public enum CostMode
{
    Time,
    Distance,
}

/// <summary>Turn penalty table (research 6.2): straight 0 s, normal +4 s, left-across/U +8 s, class downgrade +2 s.</summary>
public static class TurnTable
{
    public const double StraightMaxDeg = 20.0;
    public const double UTurnMinDeg = 150.0;
    public const double StraightCostS = 0.0;
    public const double NormalTurnCostS = 4.0;
    public const double LeftAcrossCostS = 8.0;
    public const double UTurnCostS = 8.0;
    public const double DowngradeCostS = 2.0;

    /// <summary>
    /// Heading of u-v in degrees clockwise from north, from planar meters.
    /// </summary>
    public static double HeadingDeg(double ux, double uy, double vx, double vy)
        => Math.Atan2(vx - ux, vy - uy) * (180.0 / Math.PI);

    /// <summary>Signed turn from heading h1 to h2, normalized to [-180, 180]. Positive = right (clockwise).</summary>
    public static double SignedTurnDeg(double h1, double h2)
    {
        double d = h2 - h1;
        while (d > 180.0) d -= 360.0;
        while (d < -180.0) d += 360.0;
        return d;
    }

    /// <summary>
    /// Penalty in seconds for the transition prev -&gt; via -&gt; next.
    /// Coordinates are planar meters (Mercator X/Y). Driving side is
    /// right-hand traffic, so negative (counter-clockwise) turns cross traffic.
    /// </summary>
    public static double Penalty(
        double pux, double puy, double pxx, double pyy, double pwx, double pwy,
        RoadClass prevClass, RoadClass nextClass)
    {
        double h1 = HeadingDeg(pux, puy, pxx, pyy);
        double h2 = HeadingDeg(pxx, pyy, pwx, pwy);
        double turn = Math.Abs(SignedTurnDeg(h1, h2));
        double cost = turn < StraightMaxDeg ? StraightCostS
            : turn >= UTurnMinDeg ? UTurnCostS
            : SignedTurnDeg(h1, h2) < 0.0 ? LeftAcrossCostS
            : NormalTurnCostS;
        if ((int)nextClass < (int)prevClass)
            cost += DowngradeCostS;
        return cost;
    }
}

/// <summary>Mutable builder; <see cref="Build"/> sorts edges by (from, to) for determinism.</summary>
public sealed class RoadGraphBuilder
{
    private readonly List<double> _lon = new();
    private readonly List<double> _lat = new();
    private readonly List<(int From, int To, double LengthM, double MaxKmh, RoadClass Class)> _edges = new();
    private static readonly WebMercatorProjection Merc = new();

    public int AddNode(double lonDeg, double latDeg)
    {
        var p = Merc.Forward(lonDeg, latDeg);
        if (!p.Valid)
            throw new ArgumentException($"node ({lonDeg},{latDeg}) is outside the Web Mercator domain.");
        _lon.Add(lonDeg);
        _lat.Add(latDeg);
        return _lon.Count - 1;
    }

    public void AddEdge(int from, int to, RoadClass cls, double? maxKmhOverride = null, bool oneWay = false)
    {
        if (from < 0 || from >= _lon.Count) throw new ArgumentOutOfRangeException(nameof(from));
        if (to < 0 || to >= _lon.Count) throw new ArgumentOutOfRangeException(nameof(to));
        if (from == to) throw new ArgumentException("self-loop edges are not supported.");
        double maxKmh = maxKmhOverride ?? RoadGraph.SpeedKmh(cls);
        if (maxKmh <= 0.0 || double.IsNaN(maxKmh) || double.IsInfinity(maxKmh))
            throw new ArgumentException("max speed must be finite and positive.", nameof(maxKmhOverride));
        double len = Geo.HaversineM(new GeoPoint(_lon[from], _lat[from]), new GeoPoint(_lon[to], _lat[to]));
        _edges.Add((from, to, len, maxKmh, cls));
        if (!oneWay)
            _edges.Add((to, from, len, maxKmh, cls));
    }

    public int NodeCount => _lon.Count;

    public RoadGraph Build() => RoadGraph.FromEdgeList(
        _lon.ToArray(), _lat.ToArray(), _edges.ToArray());
}

/// <summary>
/// Directed road graph in CSR layout. Immutable after build; single-threaded
/// (no locks, matching the R-tree v1 rule). Edge cost helpers live here so
/// Router and Isochrone share one definition of time vs distance.
/// </summary>
public sealed class RoadGraph
{
    public int NodeCount { get; }
    public int EdgeCount { get; }

    public double[] Lon { get; }
    public double[] Lat { get; }
    public double[] X { get; }
    public double[] Y { get; }

    /// <summary>CSR row offsets, length NodeCount+1.</summary>
    public int[] Offsets { get; }
    /// <summary>CSR edge tails, length EdgeCount.</summary>
    public int[] Froms { get; }
    /// <summary>CSR edge heads, length EdgeCount.</summary>
    public int[] Heads { get; }
    public float[] LengthM { get; }
    public float[] MaxKmh { get; }
    public RoadClass[] Classes { get; }

    /// <summary>Maximum speed over all edges, meters/second (A* time heuristic divisor).</summary>
    public double MaxSpeedMs { get; }

    private RoadGraph(
        double[] lon, double[] lat, double[] x, double[] y,
        int[] offsets, int[] froms, int[] heads, float[] lengthM, float[] maxKmh,
        RoadClass[] classes, double maxSpeedMs)
    {
        NodeCount = lon.Length;
        EdgeCount = heads.Length;
        Lon = lon; Lat = lat; X = x; Y = y;
        Offsets = offsets; Froms = froms; Heads = heads;
        LengthM = lengthM; MaxKmh = maxKmh; Classes = classes;
        MaxSpeedMs = maxSpeedMs;
    }

    /// <summary>Speed table by road class, km/h (research 6.1, tunable in UI).</summary>
    public static double SpeedKmh(RoadClass cls) => cls switch
    {
        RoadClass.Residential => 30.0,
        RoadClass.Tertiary => 40.0,
        RoadClass.Secondary => 50.0,
        RoadClass.Primary => 60.0,
        RoadClass.Trunk => 80.0,
        RoadClass.Motorway => 100.0,
        _ => throw new ArgumentOutOfRangeException(nameof(cls)),
    };

    internal static RoadGraph FromEdgeList(
        double[] lon, double[] lat,
        (int From, int To, double LengthM, double MaxKmh, RoadClass Class)[] edges)
    {
        int n = lon.Length;
        var order = Enumerable.Range(0, edges.Length)
            .OrderBy(i => edges[i].From).ThenBy(i => edges[i].To).ToArray();
        var offsets = new int[n + 1];
        foreach (var e in edges) offsets[e.From + 1]++;
        for (int i = 0; i < n; i++) offsets[i + 1] += offsets[i];
        var froms = new int[edges.Length];
        var heads = new int[edges.Length];
        var lengthM = new float[edges.Length];
        var maxKmh = new float[edges.Length];
        var classes = new RoadClass[edges.Length];
        var cursor = (int[])offsets.Clone();
        double vmax = 0.0;
        foreach (int i in order)
        {
            var e = edges[i];
            int slot = cursor[e.From]++;
            froms[slot] = e.From;
            heads[slot] = e.To;
            lengthM[slot] = (float)e.LengthM;
            maxKmh[slot] = (float)e.MaxKmh;
            classes[slot] = e.Class;
            vmax = Math.Max(vmax, e.MaxKmh / 3.6);
        }
        var merc = new WebMercatorProjection();
        var xs = new double[n];
        var ys = new double[n];
        for (int i = 0; i < n; i++)
        {
            var p = merc.Forward(lon[i], lat[i]);
            xs[i] = p.X; ys[i] = p.Y;
        }
        return new RoadGraph(
            (double[])lon.Clone(), (double[])lat.Clone(), xs, ys,
            offsets, froms, heads, lengthM, maxKmh, classes, vmax);
    }

    public IEnumerable<int> OutEdges(int node)
    {
        if (node < 0 || node >= NodeCount) throw new ArgumentOutOfRangeException(nameof(node));
        for (int e = Offsets[node]; e < Offsets[node + 1]; e++)
            yield return e;
    }

    public int EdgeFrom(int edge) => Froms[edge];
    public int EdgeTo(int edge) => Heads[edge];

    /// <summary>Edge traversal cost: seconds (Time) or meters (Distance).</summary>
    public double EdgeCost(int edge, CostMode mode) => mode switch
    {
        CostMode.Time => LengthM[edge] / (MaxKmh[edge] / 3.6),
        CostMode.Distance => LengthM[edge],
        _ => throw new ArgumentOutOfRangeException(nameof(mode)),
    };

    /// <summary>
    /// Synthetic routable city grid over the v1 downtown window (seed 286):
    /// nx-by-ny intersections, 4-connected, every 5th row/column an arterial,
    /// one diagonal primary avenue, alternating one-way residential streets.
    /// License-light (no OSM data). Nodes ~ nx*ny + diagonal extras.
    /// </summary>
    public static RoadGraph BuildCityGrid(int nx = 75, int ny = 75, int seed = 286)
    {
        if (nx < 2 || ny < 2) throw new ArgumentException("grid must be at least 2x2.");
        var rng = new Random(seed);
        const double cx = -122.6765;
        const double cy = 45.5152;
        const double hw = 0.006;
        const double hh = 0.005;
        var b = new RoadGraphBuilder();
        var id = new int[nx, ny];
        for (int j = 0; j < ny; j++)
            for (int i = 0; i < nx; i++)
                id[i, j] = b.AddNode(
                    cx - hw + i * (2.0 * hw / (nx - 1)),
                    cy - hh + j * (2.0 * hh / (ny - 1)));
        bool TertiaryRow(int j) => j % 5 == 4;
        bool TertiaryCol(int i) => i % 5 == 4;
        // Seeded promotion: a deterministic subset of local streets runs at
        // tertiary speed, so the seed shapes the cost surface (and the
        // fastest-path answers) without ever breaking connectivity.
        var promoRow = new bool[ny];
        var promoCol = new bool[nx];
        for (int j = 0; j < ny; j++) promoRow[j] = !TertiaryRow(j) && rng.NextDouble() < 0.15;
        for (int i = 0; i < nx; i++) promoCol[i] = !TertiaryCol(i) && rng.NextDouble() < 0.15;
        for (int j = 0; j < ny; j++)
        {
            for (int i = 0; i < nx; i++)
            {
                if (i + 1 < nx)
                {
                    var cls = TertiaryRow(j) || promoRow[j] ? RoadClass.Tertiary : RoadClass.Residential;
                    // Even-row locals run eastbound-only; westbound traffic
                    // uses the two-way odd rows. Arterials stay two-way, so
                    // the directed graph remains strongly connected.
                    if (cls == RoadClass.Residential && j % 2 == 0)
                        b.AddEdge(id[i, j], id[i + 1, j], cls, oneWay: true);
                    else
                        b.AddEdge(id[i, j], id[i + 1, j], cls);
                }
                if (j + 1 < ny)
                {
                    var cls = TertiaryCol(i) || promoCol[i] ? RoadClass.Tertiary : RoadClass.Residential;
                    // Odd-column locals run northbound-only; southbound
                    // traffic uses the two-way even columns.
                    if (cls == RoadClass.Residential && i % 2 == 1)
                        b.AddEdge(id[i, j], id[i, j + 1], cls, oneWay: true);
                    else
                        b.AddEdge(id[i, j], id[i, j + 1], cls);
                }
            }
        }
        // Diagonal primary avenue: chain extra mid-block nodes corner to corner.
        const int diag = 40;
        var diagNodes = new List<int>(diag);
        int prev = -1;
        for (int k = 0; k < diag; k++)
        {
            double t = (double)k / (diag - 1);
            double dlon = cx - hw + t * 2.0 * hw;
            double dlat = (cy - hh * 0.6) + t * (hh * 1.4);
            int cur = b.AddNode(dlon, dlat);
            diagNodes.Add(cur);
            if (prev >= 0) b.AddEdge(prev, cur, RoadClass.Primary);
            prev = cur;
            // Stitch each avenue node into the nearest grid intersection so
            // the avenue is routable (never a disconnected component).
            int bi = (int)Math.Round((dlon - (cx - hw)) / (2.0 * hw / (nx - 1)));
            int bj = (int)Math.Round((dlat - (cy - hh)) / (2.0 * hh / (ny - 1)));
            bi = Math.Clamp(bi, 0, nx - 1);
            bj = Math.Clamp(bj, 0, ny - 1);
            b.AddEdge(cur, id[bi, bj], RoadClass.Tertiary);
        }
        return b.Build();
    }

    private const int BinVersion = 1;

    /// <summary>Serialize to graph.bin (see layout note at file top).</summary>
    public void SaveGraphBin(Stream out_)
    {
        ArgumentNullException.ThrowIfNull(out_);
        using var w = new BinaryWriter(out_, System.Text.Encoding.UTF8, leaveOpen: true);
        w.Write(new[] { (byte)'S', (byte)'X', (byte)'G', (byte)'R' });
        w.Write(BinVersion);
        w.Write(NodeCount);
        w.Write(EdgeCount);
        for (int i = 0; i < NodeCount; i++)
        {
            w.Write(Lon[i]); w.Write(Lat[i]); w.Write(X[i]); w.Write(Y[i]);
        }
        for (int e = 0; e < EdgeCount; e++)
        {
            w.Write(Froms[e]);
            w.Write(Heads[e]);
            w.Write(LengthM[e]);
            w.Write(MaxKmh[e]);
            w.Write((byte)Classes[e]);
        }
    }

    public byte[] ToGraphBin()
    {
        using var ms = new MemoryStream();
        SaveGraphBin(ms);
        return ms.ToArray();
    }

    /// <summary>Load a graph.bin written by <see cref="SaveGraphBin"/>.</summary>
    public static RoadGraph LoadGraphBin(byte[] bytes)
    {
        ArgumentNullException.ThrowIfNull(bytes);
        using var ms = new MemoryStream(bytes, writable: false);
        using var r = new BinaryReader(ms);
        byte[] magic = r.ReadBytes(4);
        if (magic.Length != 4 || magic[0] != 'S' || magic[1] != 'X' || magic[2] != 'G' || magic[3] != 'R')
            throw new FormatException("graph.bin has a bad magic header.");
        int version = r.ReadInt32();
        if (version != BinVersion)
            throw new FormatException($"graph.bin version {version} (want {BinVersion}).");
        int n = r.ReadInt32();
        int m = r.ReadInt32();
        if (n < 0 || m < 0 || n > 10_000_000 || m > 100_000_000)
            throw new FormatException("graph.bin has implausible counts.");
        var lon = new double[n];
        var lat = new double[n];
        var xs = new double[n];
        var ys = new double[n];
        for (int i = 0; i < n; i++)
        {
            lon[i] = r.ReadDouble(); lat[i] = r.ReadDouble();
            xs[i] = r.ReadDouble(); ys[i] = r.ReadDouble();
        }
        var edges = new (int From, int To, double LengthM, double MaxKmh, RoadClass Class)[m];
        for (int e = 0; e < m; e++)
        {
            int from = r.ReadInt32();
            int to = r.ReadInt32();
            float len = r.ReadSingle();
            float kmh = r.ReadSingle();
            var cls = (RoadClass)r.ReadByte();
            if (from < 0 || from >= n || to < 0 || to >= n)
                throw new FormatException($"graph.bin edge {e} references a missing node.");
            if (!Enum.IsDefined(cls))
                throw new FormatException($"graph.bin edge {e} has an unknown road class.");
            edges[e] = (from, to, len, kmh, cls);
        }
        if (ms.Position != ms.Length)
            throw new FormatException("graph.bin has trailing bytes.");
        var g = FromEdgeList(lon, lat, edges);
        // Restore exact stored planar coordinates (FromEdgeList recomputes them;
        // they must agree to < 1 nm, else the file disagrees with Core math).
        for (int i = 0; i < n; i++)
        {
            if (Math.Abs(g.X[i] - xs[i]) > 1e-6 || Math.Abs(g.Y[i] - ys[i]) > 1e-6)
                throw new FormatException($"graph.bin node {i} planar coordinates disagree with Core projection.");
        }
        return g;
    }

    /// <summary>
    /// Debug overlay GeoJSON (arterials only: secondary and above). The full
    /// edge set rides in graph.bin; the overlay stays small for the Pages
    /// budget while still showing the routable skeleton.
    /// </summary>
    public string ToArterialGeoJson()
    {
        var sb = new System.Text.StringBuilder();
        sb.Append("{\"type\":\"FeatureCollection\",\"features\":[");
        bool first = true;
        var seen = new HashSet<(int, int)>();
        for (int e = 0; e < EdgeCount; e++)
        {
            if ((int)Classes[e] < (int)RoadClass.Secondary) continue;
            int a = Froms[e], bIdx = Heads[e];
            var key = a < bIdx ? (a, bIdx) : (bIdx, a);
            if (!seen.Add(key)) continue;
            if (!first) sb.Append(',');
            first = false;
            sb.Append("{\"type\":\"Feature\",\"properties\":{\"class\":\"")
              .Append(Classes[e].ToString().ToLowerInvariant())
              .Append("\"},\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[")
              .Append(Lon[a].ToString("F7", System.Globalization.CultureInfo.InvariantCulture))
              .Append(',').Append(Lat[a].ToString("F7", System.Globalization.CultureInfo.InvariantCulture))
              .Append("],[")
              .Append(Lon[bIdx].ToString("F7", System.Globalization.CultureInfo.InvariantCulture))
              .Append(',').Append(Lat[bIdx].ToString("F7", System.Globalization.CultureInfo.InvariantCulture))
              .Append("]}}");
        }
        sb.Append("]}");
        return sb.ToString();
    }
}
