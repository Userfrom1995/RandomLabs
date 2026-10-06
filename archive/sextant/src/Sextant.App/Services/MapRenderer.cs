// Phase 5b scene builder: pure C# map from pack + view state to canvas
// batches. No JS, no Blazor, no wall-clock: given the same pack and the same
// MapState it emits the same floats, so the Tester can assert on batches
// through NullCanvasBridge without a browser.
//
// Mercator path uses the real tile pipeline (R-tree window select per tile,
// clip/simplify/quantize via TileBuilder, overzoom scale 2^(zFloat-zInt)).
// Albers path re-projects the WGS84 source of truth directly (tiles stay
// Mercator-addressed per the blueprint, no re-tiling in v1).

using Sextant.Core;

namespace Sextant.App.Services;

public static class MapRenderer
{
    public const int TileExtent = 4096;
    public const int MaxTileSpan = 5;

    private static readonly WebMercatorProjection Mercator = new();

    public static IProjection ResolveProjection(string id) =>
        id == "albers" ? new AlbersProjection() : Mercator;

    /// <summary>Pixels per projected meter at a fractional zoom.</summary>
    public static double ScaleForZoom(double zoomFloat)
    {
        double worldM = 2.0 * Math.PI * Geo.R;
        return 256.0 * Math.Pow(2.0, zoomFloat) / worldM;
    }

    public static (float X, float Y) ToScreen(
        IProjection proj, ProjectionResult center, double scale,
        int wPx, int hPx, double lon, double lat)
    {
        var p = proj.Forward(lon, lat);
        if (!p.Valid) return (float.NaN, float.NaN);
        return (
            (float)(wPx / 2.0 + (p.X - center.X) * scale),
            (float)(hPx / 2.0 - (p.Y - center.Y) * scale));
    }

    public static (double Lon, double Lat, bool Valid) FromScreen(
        IProjection proj, ProjectionResult center, double scale,
        int wPx, int hPx, double px, double py)
    {
        double x = center.X + (px - wPx / 2.0) / scale;
        double y = center.Y - (py - hPx / 2.0) / scale;
        var inv = proj.Inverse(x, y);
        return (inv.Lon, inv.Lat, inv.Valid);
    }

    private sealed record Style(string Stroke, string Fill, float LineWidth);

    private static readonly IReadOnlyDictionary<string, Style> Styles =
        new Dictionary<string, Style>
        {
            [PackLayers.Landuse] = new("#22c55e", "#14532d", 1f),
            [PackLayers.Water] = new("#38bdf8", "#1d4ed8", 1f),
            [PackLayers.Buildings] = new("#94a3b8", "#334155", 1f),
            [PackLayers.Roads] = new("#e2e8f0", "#e2e8f0", 2f),
            [PackLayers.Pois] = new("#f59e0b", "#f59e0b", 1f),
        };

    private static readonly string[] DrawOrder =
        { PackLayers.Landuse, PackLayers.Water, PackLayers.Buildings, PackLayers.Roads, PackLayers.Pois };

    /// <summary>Build one batched draw list per layer, in draw order.</summary>
    public static LayerBatch[] BuildLayerBatches(LoadedPack pack, MapState map, int wPx, int hPx)
    {
        var proj = ResolveProjection(map.ProjectionId);
        var center = proj.Forward(map.CenterLon, map.CenterLat);
        double scale = ScaleForZoom(map.ZoomFloat);
        return map.ProjectionId == "albers"
            ? BuildAlbersBatches(pack, map, proj, center, scale, wPx, hPx)
            : BuildMercatorBatches(pack, map, proj, center, scale, wPx, hPx);
    }

    private static LayerBatch[] BuildMercatorBatches(
        LoadedPack pack, MapState map, IProjection proj,
        ProjectionResult center, double scale, int wPx, int hPx)
    {
        int zInt = Math.Clamp((int)Math.Floor(map.ZoomFloat), 0, 14);
        var corners = new (double Lon, double Lat)[]
        {
            ScreenLonLat(proj, center, scale, wPx, hPx, 0, 0),
            ScreenLonLat(proj, center, scale, wPx, hPx, wPx, 0),
            ScreenLonLat(proj, center, scale, wPx, hPx, 0, hPx),
            ScreenLonLat(proj, center, scale, wPx, hPx, wPx, hPx),
        };
        int x0 = int.MaxValue, x1 = int.MinValue, y0 = int.MaxValue, y1 = int.MinValue;
        foreach (var c in corners)
        {
            var t = TileMath.LonLatToTile(
                Math.Clamp(c.Lon, -180.0, 180.0),
                Math.Clamp(c.Lat, -Geo.MaxMercatorLat, Geo.MaxMercatorLat), zInt);
            if (t.X < x0) x0 = t.X; if (t.X > x1) x1 = t.X;
            if (t.Y < y0) y0 = t.Y; if (t.Y > y1) y1 = t.Y;
        }
        int n = 1 << zInt;
        x0 = Math.Clamp(x0, 0, n - 1); x1 = Math.Clamp(x1, 0, n - 1);
        y0 = Math.Clamp(y0, 0, n - 1); y1 = Math.Clamp(y1, 0, n - 1);
        if (x1 - x0 >= MaxTileSpan) { int cx = (x0 + x1) / 2; x0 = cx - 2; x1 = cx + 2; }
        if (y1 - y0 >= MaxTileSpan) { int cy = (y0 + y1) / 2; y0 = cy - 2; y1 = cy + 2; }

        var perLayer = DrawOrder.ToDictionary(l => l, _ => new List<float>());
        for (int ty = y0; ty <= y1; ty++)
            for (int tx = x0; tx <= x1; tx++)
            {
                var bounds = TileMath.Bounds(zInt, tx, ty);
                var candidates = pack.Index.Window(
                    new Rect(bounds.West, bounds.South, bounds.East, bounds.North));
                var inputs = candidates.Select(i => pack.Features[i]);
                var tile = TileBuilder.BuildTile(zInt, tx, ty, inputs);
                foreach (var f in tile.Features)
                    EmitBuilt(f, bounds, proj, center, scale, wPx, hPx, perLayer);
            }
        return EmitBatches(map, perLayer);
    }

    private static LayerBatch[] BuildAlbersBatches(
        LoadedPack pack, MapState map, IProjection proj,
        ProjectionResult center, double scale, int wPx, int hPx)
    {
        var perLayer = DrawOrder.ToDictionary(l => l, _ => new List<float>());
        foreach (var layer in DrawOrder)
        {
            if (!IsVisible(map, layer) || !pack.Layers.TryGetValue(layer, out var features))
                continue;
            foreach (var f in features)
                EmitWgs84(f, proj, center, scale, wPx, hPx, perLayer[layer]);
        }
        return EmitBatches(map, perLayer);
    }

    private static void EmitBuilt(
        BuiltFeature f, TileBounds bounds, IProjection proj,
        ProjectionResult center, double scale, int wPx, int hPx,
        Dictionary<string, List<float>> perLayer)
    {
        if (!perLayer.TryGetValue(f.Layer, out var buf))
            return;
        switch (f.Geom)
        {
            case QTPoint qp:
                EmitDot(buf, TileToScreen(bounds, qp.P, proj, center, scale, wPx, hPx), 3f);
                break;
            case QTPolyline ql:
                PenUp(buf);
                foreach (var p in ql.Points)
                {
                    var s = TileToScreen(bounds, p, proj, center, scale, wPx, hPx);
                    buf.Add(s.X); buf.Add(s.Y);
                }
                break;
            case QTPolygon qg:
                foreach (var ring in qg.Rings)
                {
                    PenUp(buf);
                    foreach (var p in ring)
                    {
                        var s = TileToScreen(bounds, p, proj, center, scale, wPx, hPx);
                        buf.Add(s.X); buf.Add(s.Y);
                    }
                }
                break;
        }
    }

    private static void EmitWgs84(
        TileInput f, IProjection proj, ProjectionResult center, double scale,
        int wPx, int hPx, List<float> buf)
    {
        switch (f)
        {
            case PointInput pt:
                EmitDot(buf, ToScreen(proj, center, scale, wPx, hPx, pt.Point.Lon, pt.Point.Lat), 3f);
                break;
            case PolylineInput pl:
                PenUp(buf);
                foreach (var p in pl.Points)
                {
                    var s = ToScreen(proj, center, scale, wPx, hPx, p.Lon, p.Lat);
                    buf.Add(s.X); buf.Add(s.Y);
                }
                break;
            case PolygonInput pg:
                foreach (var ring in pg.Rings)
                {
                    PenUp(buf);
                    foreach (var p in ring)
                    {
                        var s = ToScreen(proj, center, scale, wPx, hPx, p.Lon, p.Lat);
                        buf.Add(s.X); buf.Add(s.Y);
                    }
                }
                break;
        }
    }

    private static (float X, float Y) TileToScreen(
        TileBounds bounds, QTilePoint q, IProjection proj,
        ProjectionResult center, double scale, int wPx, int hPx)
    {
        double lon = bounds.West + (bounds.East - bounds.West) * q.X / TileExtent;
        double lat = bounds.North - (bounds.North - bounds.South) * q.Y / TileExtent;
        return ToScreen(proj, center, scale, wPx, hPx, lon, lat);
    }

    private static (double Lon, double Lat) ScreenLonLat(
        IProjection proj, ProjectionResult center, double scale,
        int wPx, int hPx, double px, double py)
    {
        var inv = FromScreen(proj, center, scale, wPx, hPx, px, py);
        return inv.Valid ? (inv.Lon, inv.Lat) : (0.0, 0.0);
    }

    private static LayerBatch[] EmitBatches(
        MapState map, Dictionary<string, List<float>> perLayer)
    {
        var output = new List<LayerBatch>();
        foreach (var layer in DrawOrder)
        {
            if (!IsVisible(map, layer)) continue;
            var buf = perLayer[layer];
            if (buf.Count < 2) continue;
            var style = Styles[layer];
            string kind = layer is PackLayers.Roads or PackLayers.Pois ? "stroke" : "fill";
            if (layer == PackLayers.Pois) kind = "fill";
            output.Add(new LayerBatch(layer, buf.ToArray(), kind, style.Stroke, style.Fill, style.LineWidth));
        }
        return output.ToArray();
    }

    public static bool IsVisible(MapState map, string layer) => layer switch
    {
        var l when l == PackLayers.Roads => map.RoadsVisible,
        var l when l == PackLayers.Buildings => map.BuildingsVisible,
        var l when l == PackLayers.Water => map.WaterVisible,
        var l when l == PackLayers.Landuse => map.LanduseVisible,
        var l when l == PackLayers.Pois => map.PoisVisible,
        _ => true,
    };

    private static void PenUp(List<float> buf)
    {
        if (buf.Count > 0)
        {
            buf.Add(float.NaN);
            buf.Add(float.NaN);
        }
    }

    private static void EmitDot(List<float> buf, (float X, float Y) s, float r)
    {
        if (float.IsNaN(s.X) || float.IsNaN(s.Y)) return;
        PenUp(buf);
        buf.Add(s.X - r); buf.Add(s.Y);
        buf.Add(s.X); buf.Add(s.Y - r);
        buf.Add(s.X + r); buf.Add(s.Y);
        buf.Add(s.X); buf.Add(s.Y + r);
        buf.Add(s.X - r); buf.Add(s.Y);
    }

    /// <summary>Nearest graph node to a lon/lat (linear scan; 5665 nodes is trivial).</summary>
    public static int NearestNode(RoadGraph graph, double lon, double lat)
    {
        int best = 0;
        double bestD = double.PositiveInfinity;
        for (int i = 0; i < graph.NodeCount; i++)
        {
            double dx = graph.Lon[i] - lon, dy = graph.Lat[i] - lat;
            double d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    }

    /// <summary>Project a route + frontier sample to screen overlays.</summary>
    public static OverlayBatch BuildRouteOverlay(
        RoadGraph graph, RouteResult route, MapState map, int wPx, int hPx, int maxDots = 500)
    {
        var proj = ResolveProjection(map.ProjectionId);
        var center = proj.Forward(map.CenterLon, map.CenterLat);
        double scale = ScaleForZoom(map.ZoomFloat);
        float[]? line = null;
        if (route.Found && route.Path.Length >= 2)
        {
            var buf = new List<float>(route.Path.Length * 2);
            foreach (int n in route.Path)
            {
                var s = ToScreen(proj, center, scale, wPx, hPx, graph.Lon[n], graph.Lat[n]);
                buf.Add(s.X); buf.Add(s.Y);
            }
            line = buf.ToArray();
        }
        float[]? dots = null;
        if (route.Frontier.Length > 0)
        {
            int step = Math.Max(1, route.Frontier.Length / maxDots);
            var buf = new List<float>();
            for (int i = 0; i < route.Frontier.Length; i += step)
            {
                int node = route.Frontier[i];
                if (node < 0 || node >= graph.NodeCount) continue;
                var s = ToScreen(proj, center, scale, wPx, hPx, graph.Lon[node], graph.Lat[node]);
                if (float.IsNaN(s.X)) continue;
                buf.Add(s.X); buf.Add(s.Y);
            }
            dots = buf.ToArray();
        }
        return new OverlayBatch(line, dots, null);
    }

    /// <summary>Project isochrone outer rings (Mercator meters) to a screen fill.</summary>
    public static OverlayBatch BuildIsochroneOverlay(
        IReadOnlyList<IsoPolygon> polys, MapState map, int wPx, int hPx, int maxPoints = 2000)
    {
        if (polys.Count == 0) return new OverlayBatch(null, null, null);
        var proj = ResolveProjection(map.ProjectionId);
        var center = proj.Forward(map.CenterLon, map.CenterLat);
        double scale = ScaleForZoom(map.ZoomFloat);
        var buf = new List<float>();
        foreach (var poly in polys)
        {
            if (buf.Count / 2 >= maxPoints) break;
            PenUp(buf);
            int step = Math.Max(1, poly.Outer.Count / (maxPoints / Math.Max(1, polys.Count)));
            for (int i = 0; i < poly.Outer.Count; i += step)
            {
                var m = poly.Outer[i];
                // Isochrone grid is Mercator meters; map linearly about the view center.
                float sx = (float)(wPx / 2.0 + (m.X - center.X) * scale);
                float sy = (float)(hPx / 2.0 - (m.Y - center.Y) * scale);
                buf.Add(sx); buf.Add(sy);
            }
        }
        return new OverlayBatch(null, null, buf.ToArray());
    }
}
