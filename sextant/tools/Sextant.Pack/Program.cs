// Sextant.Pack: offline asset packer (Phase 2). Reads authoring GeoJSON +
// road network, emits versioned static assets (ndjson layers, graph.bin,
// geocode index, pack.json manifest) with deterministic output (fixed seed,
// sorted emit). Phase 0: CLI skeleton only.

using Sextant.Core;

if (args.Length == 0 || args.Contains("--help"))
{
    Console.WriteLine("Sextant.Pack: offline asset packer (Phase 2 implements emit).");
    Console.WriteLine("Usage: Sextant.Pack <authoring-dir> <out-pack-dir>");
    Console.WriteLine($"WGS84 R = {Geo.R} m. Deterministic seed: 286.");
    return args.Length == 0 ? 1 : 0;
}

Console.Error.WriteLine("Sextant.Pack: pack emit not yet implemented (Phase 2).");
return 2;
