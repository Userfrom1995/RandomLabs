// Phase-3 throughput harness: bulk-load 100k, 10k-feature window p95, 1-NN
// p95 (research 9 method: 5 warmup + 50 samples, xUnit + Stopwatch).
// Asserts are intentionally loose (no flaky perf gates in CI); the measured
// numbers are printed for the log and frozen in sextant/docs/rtree.md.

using System.Diagnostics;
using Sextant.Core;

namespace Sextant.Core.Tests;

public static class RTreeBenchmarks
{
    private const int Seed = 286;

    public static void Report(Action<string> log)
    {
        var rng = new Random(Seed);
        var bulk = new List<(Rect Rect, int Id)>(100_000);
        for (int i = 0; i < 100_000; i++)
        {
            double x = rng.NextDouble() * 1000.0;
            double y = rng.NextDouble() * 1000.0;
            double w = rng.NextDouble() * 5.0;
            double h = rng.NextDouble() * 5.0;
            bulk.Add((new Rect(x, y, x + w, y + h), i));
        }

        var sw = Stopwatch.StartNew();
        var big = RTree<int>.BulkLoad(bulk);
        sw.Stop();
        double bulkMs = sw.Elapsed.TotalMilliseconds;
        log($"rtree bulk-load 100k segments: {bulkMs:F0} ms (budget < 2000 ms WASM desktop)");
        Assert.True(bulkMs < 60_000.0, $"bulk load took {bulkMs:F0} ms");
        Assert.Null(big.CheckInvariants());

        var city = new List<(Rect Rect, int Id)>(10_000);
        for (int i = 0; i < 10_000; i++)
        {
            double x = rng.NextDouble() * 100.0;
            double y = rng.NextDouble() * 100.0;
            double w = rng.NextDouble() * 2.0;
            double h = rng.NextDouble() * 2.0;
            city.Add((new Rect(x, y, x + w, y + h), i));
        }
        var tree = RTree<int>.BulkLoad(city);

        var windows = new List<Rect>(55);
        for (int i = 0; i < 55; i++)
        {
            double x = rng.NextDouble() * 100.0;
            double y = rng.NextDouble() * 100.0;
            windows.Add(new Rect(x, y, x + 5.0, y + 5.0));
        }
        var points = new List<(double X, double Y)>(55);
        for (int i = 0; i < 55; i++)
            points.Add((rng.NextDouble() * 100.0, rng.NextDouble() * 100.0));

        var windowSamples = Sample(50, skip: 5, i =>
        {
            var q = windows[i];
            var watch = Stopwatch.StartNew();
            _ = tree.Window(q);
            watch.Stop();
            return watch.Elapsed.TotalMilliseconds;
        });
        double windowP95 = Percentile(windowSamples, 0.95);
        log($"rtree 10k-feature window query p95: {windowP95:F3} ms (budget < 5 ms)");
        Assert.True(windowP95 < 100.0, $"window p95 {windowP95:F3} ms");

        var nearestSamples = Sample(50, skip: 5, i =>
        {
            var (x, y) = points[i];
            var watch = Stopwatch.StartNew();
            _ = tree.Nearest(x, y, 1);
            watch.Stop();
            return watch.Elapsed.TotalMilliseconds;
        });
        double nearestP95 = Percentile(nearestSamples, 0.95);
        log($"rtree 10k-feature 1-NN query p95: {nearestP95:F3} ms (budget < 1 ms)");
        Assert.True(nearestP95 < 50.0, $"1-NN p95 {nearestP95:F3} ms");

        log($"rtree depth@100k={big.Depth} nodes@100k={big.NodeCount} depth@10k={tree.Depth}");
    }

    private static List<double> Sample(int count, int skip, Func<int, double> measure)
    {
        for (int i = 0; i < skip; i++)
            measure(i);
        var samples = new List<double>(count);
        for (int i = 0; i < count; i++)
            samples.Add(measure(skip + i));
        samples.Sort();
        return samples;
    }

    private static double Percentile(List<double> sorted, double p)
    {
        int idx = Math.Min(sorted.Count - 1, (int)Math.Ceiling(p * sorted.Count) - 1);
        return sorted[Math.Max(0, idx)];
    }
}
