// Sextant.Pack: offline asset packer (Phase 2: synthetic city pack + authoring
// converter). Reads nothing from the network; writes versioned static assets
// (ndjson layers + pack.json manifest) with deterministic output (fixed seed,
// sorted emit, `\n`, UTF-8 no BOM, no timestamps). Exit 0 ok, 1 usage, 2 error.

using Sextant.Core;
using Sextant.Pack;

int seed = 286;
var positionals = new List<string>();
for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--help" || args[i] == "-h")
    {
        PrintUsage();
        return 0;
    }
    if (args[i] == "--seed" && i + 1 < args.Length)
    {
        if (!int.TryParse(args[++i], out seed))
        {
            Console.Error.WriteLine("Sextant.Pack: --seed needs an integer.");
            return 1;
        }
    }
    else if (args[i].StartsWith("--"))
    {
        Console.Error.WriteLine($"Sextant.Pack: unknown flag {args[i]}.");
        PrintUsage();
        return 1;
    }
    else
    {
        positionals.Add(args[i]);
    }
}

try
{
    if (positionals.Count == 1)
    {
        var data = CityPack.Generate(seed);
        var graph = RoadGraph.BuildCityGrid(seed: seed);
        var manifest = CityPack.WritePack(data, positionals[0], graph);
        Console.WriteLine($"Sextant.Pack: synthetic pack v1 ({manifest.Source}, seed {seed}) -> {positionals[0]}");
        foreach (var layer in PackLayers.All)
            Console.WriteLine($"  {layer}.ndjson: {manifest.FeatureCounts[layer]} features");
        Console.WriteLine($"  graph.bin: {manifest.GraphNodes} nodes, {manifest.GraphEdges} directed edges");
        return 0;
    }
    if (positionals.Count == 2)
    {
        var data = CityPack.ConvertAuthoring(positionals[0], seed);
        var manifest = CityPack.WritePack(data, positionals[1]);
        Console.WriteLine($"Sextant.Pack: converted {positionals[0]} -> {positionals[1]}");
        foreach (var layer in PackLayers.All)
            Console.WriteLine($"  {layer}.ndjson: {manifest.FeatureCounts[layer]} features");
        return 0;
    }
    PrintUsage();
    return 1;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Sextant.Pack: {ex.Message}");
    return 2;
}

static void PrintUsage()
{
    Console.WriteLine("Sextant.Pack: offline asset packer.");
    Console.WriteLine("Usage:");
    Console.WriteLine("  Sextant.Pack <out-pack-dir> [--seed N]               synthetic v1 city pack");
    Console.WriteLine("  Sextant.Pack <authoring-dir> <out-pack-dir> [--seed N]  convert <layer>.geojson files");
    Console.WriteLine($"WGS84 R = {Geo.R} m. Default seed: 286.");
}
