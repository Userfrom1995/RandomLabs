// Phase 5b pack loader: same-origin fetch of the versioned city pack into
// Core-owned structures. Core owns schema + readers (Packs, Geocode,
// Graph); this loader owns Http + byte counting + the live R-tree.

using System.Net.Http.Json;
using Sextant.Core;

namespace Sextant.App.Services;

/// <summary>Fully loaded city pack: manifest, WGS84 features per layer, a live
/// lon/lat R-tree over feature bboxes, the trigram geocode index, and the
/// routable graph (null when the manifest carries no graph fields).</summary>
public sealed record LoadedPack(
    PackManifest Manifest,
    IReadOnlyDictionary<string, IReadOnlyList<TileInput>> Layers,
    IReadOnlyList<TileInput> Features,
    RTree<int> Index,
    GeocodeIndex Geocode,
    RoadGraph? Graph,
    long BytesLoaded);

public sealed class PackLoader
{
    public const string PackBase = "packs/v1/";

    private readonly HttpClient _http;

    public PackLoader(HttpClient http) => _http = http;

    public long BytesLoaded { get; private set; }
    public bool OfflineReady { get; private set; }

    public async Task<LoadedPack> LoadAsync(CancellationToken ct = default)
    {
        var manifestJson = await GetStringAsync(PackBase + "pack.json", ct);
        var manifest = PackManifest.FromJson(manifestJson);

        var layers = new Dictionary<string, IReadOnlyList<TileInput>>();
        var flat = new List<TileInput>();
        foreach (var name in PackLayers.All)
        {
            string ndjson;
            try
            {
                ndjson = await GetStringAsync(PackBase + name + ".ndjson", ct);
            }
            catch (HttpRequestException) when (name is PackLayers.Water or PackLayers.Landuse)
            {
                ndjson = string.Empty; // thin layers may be absent in derived packs
            }
            var features = NdjsonReader.ParseLayer(name, ndjson);
            layers[name] = features;
            flat.AddRange(features);
        }

        var index = new RTree<int>();
        for (int i = 0; i < flat.Count; i++)
            index.Insert(BboxOf(flat[i]), i);

        var geocodeJson = await GetStringAsync(PackBase + "geocode.idx.json", ct);
        var geocode = GeocodeIndex.FromJson(geocodeJson);

        RoadGraph? graph = null;
        if (manifest.GraphNodes is { } nodes && manifest.GraphEdges is { })
        {
            var bytes = await _http.GetByteArrayAsync(PackBase + "graph.bin", ct);
            BytesLoaded += bytes.LongLength;
            graph = RoadGraph.LoadGraphBin(bytes);
            if (graph.NodeCount != nodes || graph.EdgeCount != edges)
                throw new FormatException(
                    $"graph.bin holds {graph.NodeCount}n/{graph.EdgeCount}e but pack.json declares {nodes}n/{edges}e.");
        }

        OfflineReady = true;
        return new LoadedPack(manifest, layers, flat, index, geocode, graph, BytesLoaded);
    }

    private async Task<string> GetStringAsync(string url, CancellationToken ct)
    {
        var bytes = await _http.GetByteArrayAsync(url, ct);
        BytesLoaded += bytes.LongLength;
        return System.Text.Encoding.UTF8.GetString(bytes);
    }

    /// <summary>WGS84 bbox of one feature, for the live lon/lat R-tree.</summary>
    public static Rect BboxOf(TileInput feature)
    {
        double minLon = double.PositiveInfinity, minLat = double.PositiveInfinity;
        double maxLon = double.NegativeInfinity, maxLat = double.NegativeInfinity;
        void Eat(GeoPoint p)
        {
            if (p.Lon < minLon) minLon = p.Lon;
            if (p.Lon > maxLon) maxLon = p.Lon;
            if (p.Lat < minLat) minLat = p.Lat;
            if (p.Lat > maxLat) maxLat = p.Lat;
        }
        switch (feature)
        {
            case PointInput pt: Eat(pt.Point); break;
            case PolylineInput pl: foreach (var p in pl.Points) Eat(p); break;
            case PolygonInput pg: foreach (var ring in pg.Rings) foreach (var p in ring) Eat(p); break;
        }
        if (double.IsPositiveInfinity(minLon))
            return new Rect(0, 0, 0, 0);
        if (maxLon == minLon) maxLon = minLon + 1e-9;
        if (maxLat == minLat) maxLat = minLat + 1e-9;
        return new Rect(minLon, minLat, maxLon, maxLat);
    }
}
