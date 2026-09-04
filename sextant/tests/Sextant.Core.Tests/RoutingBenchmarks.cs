// Phase-4 throughput harness (research 9 method: 5 warmup + 50 samples,
// xUnit + Stopwatch). Asserts are loose (no flaky perf gates in CI); the
// measured numbers are printed for the log and frozen in docs/routing.md.

using System.Diagnostics;
using Sextant.Core;

namespace Sextant.Core.Tests;

public static class RoutingBenchmarks
{
    private const int Seed = 286;

    public static void Report(Action<string> log)
    {
        var sw = Stopwatch.StartNew();
        var city = RoadGraph.BuildCityGrid(nx: 75, ny: 75, seed: Seed);
        sw.Stop();
        log($"routing city grid: {city.NodeCount} nodes, {city.EdgeCount} directed edges (build {sw.Elapsed.TotalMilliseconds:F0} ms)");
        log($"routing graph.bin: {city.ToGraphBin().Length / 1024} KiB");

        var rng = new Random(Seed);
        var pairs = new List<(int O, int D)>(205);
        while (pairs.Count < 205)
        {
            int o = rng.Next(city.NodeCount);
            int d = rng.Next(city.NodeCount);
            if (o != d) pairs.Add((o, d));
        }

        for (int i = 0; i < 5; i++)
        {
            var (o, d) = pairs[i];
            _ = Router.AStar(city, o, d, CostMode.Time, penalizeTurns: true);
        }
        var timeSamples = new List<double>(200);
        var expandedSamples = new List<double>(200);
        int found = 0;
        for (int i = 5; i < 205; i++)
        {
            var (o, d) = pairs[i];
            var watch = Stopwatch.StartNew();
            var r = Router.AStar(city, o, d, CostMode.Time, penalizeTurns: true);
            watch.Stop();
            timeSamples.Add(watch.Elapsed.TotalMilliseconds);
            expandedSamples.Add(r.Expanded);
            if (r.Found) found++;
        }
        timeSamples.Sort();
        expandedSamples.Sort();
        log($"routing A* time+turns on 75x75 city graph: reachable {found}/200, "
            + $"median {Percentile(timeSamples, 0.50):F2} ms, p95 {Percentile(timeSamples, 0.95):F2} ms "
            + $"(budget median < 50 ms, p95 < 200 ms)");
        log($"routing A* expanded states: median {Percentile(expandedSamples, 0.50):F0}, p95 {Percentile(expandedSamples, 0.95):F0}");
        Assert.True(Percentile(timeSamples, 0.95) < 30_000.0, "A* p95 implausibly slow");
        Assert.True(found >= 180, $"only {found}/200 pairs reachable on city graph");

        for (int i = 0; i < 5; i++)
        {
            var (o, d) = pairs[i];
            _ = Router.Dijkstra(city, o, d, CostMode.Time, penalizeTurns: false);
        }
        var dijSamples = new List<double>(50);
        for (int i = 5; i < 55; i++)
        {
            var (o, d) = pairs[i];
            var watch = Stopwatch.StartNew();
            _ = Router.Dijkstra(city, o, d, CostMode.Time, penalizeTurns: false);
            watch.Stop();
            dijSamples.Add(watch.Elapsed.TotalMilliseconds);
        }
        dijSamples.Sort();
        log($"routing Dijkstra reference: median {Percentile(dijSamples, 0.50):F2} ms, p95 {Percentile(dijSamples, 0.95):F2} ms");
    }

    private static double Percentile(List<double> sorted, double p)
    {
        int idx = Math.Min(sorted.Count - 1, (int)Math.Ceiling(p * sorted.Count) - 1);
        return sorted[Math.Max(0, idx)];
    }
}
