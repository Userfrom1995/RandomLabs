// S3 spatial index: R*-tree with STR bulk load (research 5, blueprint RTree.cs).
// M=32, m=13 defaults, p=30% single-reinsert-per-level, ISplitStrategy seam
// (R* topological default, Guttman quadratic fallback). Planar doubles in the
// query CRS; single-threaded with a version-stamp guard. No wall-clock, no RNG,
// no IO here.

namespace Sextant.Core;

/// <summary>
/// Planar rectangle in the query CRS (city scale: lon/lat degrees or meters).
/// Exact double comparisons throughout; edge-touching counts as intersecting.
/// </summary>
public readonly record struct Rect
{
    public double MinX { get; }
    public double MinY { get; }
    public double MaxX { get; }
    public double MaxY { get; }

    public Rect(double minX, double minY, double maxX, double maxY)
    {
        if (double.IsNaN(minX) || double.IsNaN(minY)
            || double.IsNaN(maxX) || double.IsNaN(maxY))
            throw new ArgumentException("Rect coordinates must not be NaN.");
        if (double.IsInfinity(minX) || double.IsInfinity(minY)
            || double.IsInfinity(maxX) || double.IsInfinity(maxY))
            throw new ArgumentException("Rect coordinates must be finite.");
        if (minX > maxX || minY > maxY)
            throw new ArgumentException(
                $"Rect min must not exceed max: ({minX},{minY})-({maxX},{maxY}).");
        MinX = minX;
        MinY = minY;
        MaxX = maxX;
        MaxY = maxY;
    }

    public double Width => MaxX - MinX;

    public double Height => MaxY - MinY;

    public double Area => Width * Height;

    public double Perimeter => 2.0 * (Width + Height);

    public (double X, double Y) Centroid => ((MinX + MaxX) / 2.0, (MinY + MaxY) / 2.0);

    public bool Contains(Rect other) =>
        other.MinX >= MinX && other.MinY >= MinY
        && other.MaxX <= MaxX && other.MaxY <= MaxY;

    public bool Intersects(Rect other) =>
        !(MaxX < other.MinX || other.MaxX < MinX
          || MaxY < other.MinY || other.MaxY < MinY);

    public Rect Union(Rect other) => new(
        Math.Min(MinX, other.MinX),
        Math.Min(MinY, other.MinY),
        Math.Max(MaxX, other.MaxX),
        Math.Max(MaxY, other.MaxY));

    /// <summary>Area growth if this rect were enlarged to contain <paramref name="other"/>.</summary>
    public double Enlargement(Rect other) => Union(other).Area - Area;

    /// <summary>Planar overlap-enlargement cost used by R* ChooseSubtree.</summary>
    public double OverlapEnlargement(Rect other, Rect sibling) =>
        OverlapArea(Union(other), sibling) - OverlapArea(this, sibling);

    public static double OverlapArea(Rect a, Rect b)
    {
        double w = Math.Min(a.MaxX, b.MaxX) - Math.Max(a.MinX, b.MinX);
        double h = Math.Min(a.MaxY, b.MaxY) - Math.Max(a.MinY, b.MinY);
        return w <= 0.0 || h <= 0.0 ? 0.0 : w * h;
    }

    /// <summary>Planar point-to-rect distance (Hjaltason-Samet MinDist).</summary>
    public double MinDist(double x, double y)
    {
        if (double.IsNaN(x) || double.IsNaN(y)
            || double.IsInfinity(x) || double.IsInfinity(y))
            throw new ArgumentException("Query point must be finite.");
        double dx = x < MinX ? MinX - x : (x > MaxX ? x - MaxX : 0.0);
        double dy = y < MinY ? MinY - y : (y > MaxY ? y - MaxY : 0.0);
        return Math.Sqrt(dx * dx + dy * dy);
    }
}

/// <summary>
/// Split seam: given the MBRs overflowing one node (M+1 rects), return two
/// non-empty index groups covering all entries. Implementations must be
/// deterministic for the same input order.
/// </summary>
public interface ISplitStrategy
{
    (int[] Group1, int[] Group2) Split(IReadOnlyList<Rect> entries);
}

/// <summary>
/// R* topological split (Beckmann et al. 1990): choose the split axis by
/// minimum margin-sum over all distributions, then the cut by minimum overlap
/// (tie-break: minimum area-sum). Respects the tree minimum fill m.
/// </summary>
public sealed class RStarSplit : ISplitStrategy
{
    private readonly int _minEntries;

    public RStarSplit(int minEntries)
    {
        if (minEntries < 1) throw new ArgumentOutOfRangeException(nameof(minEntries));
        _minEntries = minEntries;
    }

    public (int[] Group1, int[] Group2) Split(IReadOnlyList<Rect> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);
        int n = entries.Count;
        if (n < 2 * _minEntries)
            throw new ArgumentException("Not enough entries to honor minimum fill.");
        int axis = ChooseSplitAxis(entries, n);
        return ChooseSplitIndex(entries, n, axis);
    }

    private int ChooseSplitAxis(IReadOnlyList<Rect> entries, int n)
    {
        double bestMargin = double.PositiveInfinity;
        int bestAxis = 0;
        for (int axis = 0; axis < 2; axis++)
        {
            double margin = MarginSum(entries, SortBy(entries, n, axis, lower: true), n)
                + MarginSum(entries, SortBy(entries, n, axis, lower: false), n);
            if (margin < bestMargin)
            {
                bestMargin = margin;
                bestAxis = axis;
            }
        }
        return bestAxis;
    }

    private (int[] Group1, int[] Group2) ChooseSplitIndex(
        IReadOnlyList<Rect> entries, int n, int axis)
    {
        double bestOverlap = double.PositiveInfinity;
        double bestArea = double.PositiveInfinity;
        int[] best = Array.Empty<int>();
        int bestK = 0;
        foreach (bool lower in new[] { true, false })
        {
            int[] order = SortBy(entries, n, axis, lower);
            for (int k = 1; k <= n - (2 * _minEntries) + 1; k++)
            {
                int c1 = _minEntries - 1 + k;
                Rect m1 = UnionOf(entries, order, 0, c1);
                Rect m2 = UnionOf(entries, order, c1, n);
                double overlap = Rect.OverlapArea(m1, m2);
                double area = m1.Area + m2.Area;
                if (overlap < bestOverlap
                    || (overlap == bestOverlap && area < bestArea))
                {
                    bestOverlap = overlap;
                    bestArea = area;
                    best = order;
                    bestK = c1;
                }
            }
        }
        return (best[..bestK], best[bestK..]);
    }

    private static int[] SortBy(IReadOnlyList<Rect> entries, int n, int axis, bool lower)
    {
        var order = Enumerable.Range(0, n).ToArray();
        Array.Sort(order, (a, b) =>
        {
            double va = axis == 0
                ? (lower ? entries[a].MinX : entries[a].MaxX)
                : (lower ? entries[a].MinY : entries[a].MaxY);
            double vb = axis == 0
                ? (lower ? entries[b].MinX : entries[b].MaxX)
                : (lower ? entries[b].MinY : entries[b].MaxY);
            int c = va.CompareTo(vb);
            return c != 0 ? c : a.CompareTo(b);
        });
        return order;
    }

    private double MarginSum(IReadOnlyList<Rect> entries, int[] order, int n)
    {
        double sum = 0.0;
        for (int k = 1; k <= n - (2 * _minEntries) + 1; k++)
        {
            int c1 = _minEntries - 1 + k;
            sum += UnionOf(entries, order, 0, c1).Perimeter
                + UnionOf(entries, order, c1, n).Perimeter;
        }
        return sum;
    }

    private static Rect UnionOf(IReadOnlyList<Rect> entries, int[] order, int from, int to)
    {
        Rect acc = entries[order[from]];
        for (int i = from + 1; i < to; i++)
            acc = acc.Union(entries[order[i]]);
        return acc;
    }
}

/// <summary>
/// Guttman quadratic split (1984) fallback: seed by maximum dead space, then
/// assign each entry to the group needing minimum enlargement (tie-break area,
/// then count), honoring minimum fill for the tail.
/// </summary>
public sealed class QuadraticSplit : ISplitStrategy
{
    private readonly int _minEntries;

    public QuadraticSplit(int minEntries)
    {
        if (minEntries < 1) throw new ArgumentOutOfRangeException(nameof(minEntries));
        _minEntries = minEntries;
    }

    public (int[] Group1, int[] Group2) Split(IReadOnlyList<Rect> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);
        int n = entries.Count;
        if (n < 2 * _minEntries)
            throw new ArgumentException("Not enough entries to honor minimum fill.");
        double worstWaste = double.NegativeInfinity;
        int seed1 = 0, seed2 = 1;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
            {
                double waste = entries[i].Union(entries[j]).Area
                    - entries[i].Area - entries[j].Area;
                if (waste > worstWaste)
                {
                    worstWaste = waste;
                    seed1 = i;
                    seed2 = j;
                }
            }
        var g1 = new List<int> { seed1 };
        var g2 = new List<int> { seed2 };
        Rect m1 = entries[seed1];
        Rect m2 = entries[seed2];
        var rest = new List<int>();
        for (int i = 0; i < n; i++)
            if (i != seed1 && i != seed2)
                rest.Add(i);
        while (rest.Count > 0)
        {
            if (g1.Count + rest.Count == _minEntries)
            {
                g1.AddRange(rest);
                break;
            }
            if (g2.Count + rest.Count == _minEntries)
            {
                g2.AddRange(rest);
                break;
            }
            double bestDiff = double.NegativeInfinity;
            int bestIdx = -1;
            int bestGroup = 1;
            foreach (int i in rest)
            {
                double d1 = entries[i].Union(m1).Area - m1.Area;
                double d2 = entries[i].Union(m2).Area - m2.Area;
                double diff = Math.Abs(d1 - d2);
                int group = d1 < d2 ? 1 : (d2 < d1 ? 2 : (m1.Area < m2.Area ? 1 : (m2.Area < m1.Area ? 2 : (g1.Count <= g2.Count ? 1 : 2))));
                if (diff > bestDiff)
                {
                    bestDiff = diff;
                    bestIdx = i;
                    bestGroup = group;
                }
            }
            rest.Remove(bestIdx);
            if (bestGroup == 1)
            {
                g1.Add(bestIdx);
                m1 = m1.Union(entries[bestIdx]);
            }
            else
            {
                g2.Add(bestIdx);
                m2 = m2.Union(entries[bestIdx]);
            }
        }
        return (g1.ToArray(), g2.ToArray());
    }
}

/// <summary>
/// R*-tree over planar rects. Defaults M=32, m=13 (Guttman 40%), p=30%
/// single-reinsert-per-level (Beckmann et al.). STR bulk load for pack import;
/// Guttman condense on delete; <see cref="Pack"/> STR-rebuilds for maintenance.
/// Queries are exact: window returns the full brute-force set, k-NN the true k
/// nearest by planar distance. Single-threaded; mutating during a visitor
/// query throws <see cref="InvalidOperationException"/>.
/// </summary>
public sealed class RTree<T> where T : notnull
{
    public const int DefaultMaxEntries = 32;
    public const int DefaultMinEntries = 13;
    public const double ReinsertFraction = 0.30;

    private readonly int _maxEntries;
    private readonly int _minEntries;
    private readonly ISplitStrategy _split;
    private readonly IEqualityComparer<T> _comparer;

    private Node _root;
    private int _count;
    private long _version;
    private long _heapSeq;

    public RTree(
        int maxEntries = DefaultMaxEntries,
        int minEntries = DefaultMinEntries,
        ISplitStrategy? splitStrategy = null,
        IEqualityComparer<T>? comparer = null)
    {
        if (maxEntries < 2)
            throw new ArgumentOutOfRangeException(nameof(maxEntries));
        if (minEntries < 1 || 2 * minEntries > maxEntries + 1)
            throw new ArgumentOutOfRangeException(nameof(minEntries),
                "Require 1 <= m <= (M+1)/2 so every split honors fill.");
        _maxEntries = maxEntries;
        _minEntries = minEntries;
        _split = splitStrategy ?? new RStarSplit(minEntries);
        _comparer = comparer ?? EqualityComparer<T>.Default;
        _root = new Node(0);
    }

    public int Count => _count;

    public int Depth => _root.Level;

    public long Version => _version;

    public int NodeCount
    {
        get
        {
            int n = 0;
            var stack = new Stack<Node>();
            stack.Push(_root);
            while (stack.Count > 0)
            {
                var node = stack.Pop();
                n++;
                foreach (var e in node.Entries)
                    if (e.Child is not null)
                        stack.Push(e.Child);
            }
            return n;
        }
    }

    public void Insert(Rect rect, T value)
    {
        ArgumentNullException.ThrowIfNull(value);
        _ = rect;
        _version++;
        _count++;
        InsertInternal(new Entry(rect, value), 0, new HashSet<int>());
    }

    /// <summary>Delete the exact (rect, value) pair; false when absent.</summary>
    public bool Delete(Rect rect, T value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var path = new List<(Node Parent, int Slot)>();
        Node? leaf = FindLeaf(_root, rect, value, path);
        if (leaf is null)
            return false;
        int idx = leaf.Entries.FindIndex(e =>
            e.Child is null && e.Mbr.Equals(rect) && _comparer.Equals(e.Value!, value));
        if (idx < 0)
            return false;
        _version++;
        _count--;
        leaf.Entries.RemoveAt(idx);
        var orphans = new List<(Entry Entry, int Level)>();
        Node cur = leaf;
        for (int i = path.Count - 1; i >= 0; i--)
        {
            var (parent, slot) = path[i];
            if (cur.Entries.Count < _minEntries)
            {
                foreach (var e in cur.Entries)
                    orphans.Add((e, cur.Level));
                parent.Entries.RemoveAt(slot);
                cur = parent;
            }
            else
            {
                Tighten(cur);
                parent.Entries[slot].Mbr = cur.Mbr;
                cur = parent;
            }
        }
        Tighten(_root);
        if (_root.Level > 0)
        {
            if (_root.Entries.Count == 0)
                _root = new Node(0);
            else if (_root.Entries.Count == 1 && _root.Entries[0].Child is not null)
                _root = _root.Entries[0].Child!;
        }
        foreach (var (entry, level) in orphans)
            InsertInternal(entry, level, new HashSet<int>());
        return true;
    }

    /// <summary>STR-rebuild the whole tree (maintenance after deletes).</summary>
    public void Pack()
    {
        var all = new List<Entry>();
        var stack = new Stack<Node>();
        stack.Push(_root);
        while (stack.Count > 0)
        {
            var node = stack.Pop();
            foreach (var e in node.Entries)
            {
                if (e.Child is not null)
                    stack.Push(e.Child);
                else
                    all.Add(e);
            }
        }
        _version++;
        _root = BuildLevels(all, 0, _maxEntries);
    }

    /// <summary>STR bulk load (Leutenegger et al. 1997) over (rect, value) pairs.</summary>
    public static RTree<T> BulkLoad(
        IEnumerable<(Rect Rect, T Value)> items,
        int maxEntries = DefaultMaxEntries,
        int minEntries = DefaultMinEntries,
        ISplitStrategy? splitStrategy = null,
        IEqualityComparer<T>? comparer = null)
    {
        ArgumentNullException.ThrowIfNull(items);
        var tree = new RTree<T>(maxEntries, minEntries, splitStrategy, comparer);
        var entries = items.Select(p => new Entry(p.Rect, p.Value)).ToList();
        tree._root = BuildLevels(entries, 0, tree._maxEntries);
        tree._count = entries.Count;
        tree._version++;
        return tree;
    }

    /// <summary>All values whose rect intersects <paramref name="query"/>.</summary>
    public IReadOnlyList<T> Window(Rect query)
    {
        var output = new List<T>();
        Window(query, output.Add);
        return output;
    }

    /// <summary>Streaming window query; mutating the tree inside <paramref name="visit"/> throws.</summary>
    public void Window(Rect query, Action<T> visit)
    {
        ArgumentNullException.ThrowIfNull(visit);
        if (_count == 0)
            return;
        long stamp = _version;
        var stack = new Stack<Node>();
        stack.Push(_root);
        while (stack.Count > 0)
        {
            if (stamp != _version)
                throw new InvalidOperationException(
                    "RTree mutated during Window query.");
            var node = stack.Pop();
            foreach (var e in node.Entries)
            {
                if (!e.Mbr.Intersects(query))
                    continue;
                if (e.Child is not null)
                    stack.Push(e.Child);
                else
                    visit(e.Value!);
            }
        }
    }

    /// <summary>True k nearest values to (x, y) by planar distance, nearest first.</summary>
    public IReadOnlyList<T> Nearest(double x, double y, int k)
    {
        var output = new List<(double Dist, long Seq, T Value)>();
        Nearest(x, y, k, (d, s, v) => output.Add((d, s, v)));
        output.Sort((a, b) =>
        {
            int c = a.Dist.CompareTo(b.Dist);
            return c != 0 ? c : a.Seq.CompareTo(b.Seq);
        });
        return output.Select(t => t.Value).ToList();
    }

    /// <summary>Streaming k-NN; mutating the tree inside <paramref name="visit"/> throws.</summary>
    public void Nearest(double x, double y, int k, Action<double, long, T> visit)
    {
        ArgumentNullException.ThrowIfNull(visit);
        if (k <= 0)
            throw new ArgumentOutOfRangeException(nameof(k), "k must be positive.");
        if (double.IsNaN(x) || double.IsNaN(y)
            || double.IsInfinity(x) || double.IsInfinity(y))
            throw new ArgumentException("Query point must be finite.");
        if (_count == 0)
            return;
        double rootDist = _root.Entries.Count == 0 ? 0.0 : _root.Mbr.MinDist(x, y);
        long stamp = _version;
        var pq = new PriorityQueue<Node, (double Dist, long Seq)>();
        pq.Enqueue(_root, (rootDist, _heapSeq++));
        var winners = new List<(double Dist, long Seq, T Value)>();
        double worst = double.PositiveInfinity;
        while (pq.Count > 0)
        {
            if (stamp != _version)
                throw new InvalidOperationException(
                    "RTree mutated during Nearest query.");
            pq.TryDequeue(out Node? node, out (double Dist, long Seq) prio);
            if (node is null)
                continue;
            if (winners.Count == k && prio.Dist > worst)
                break;
            if (node.Level == 0)
            {
                foreach (var e in node.Entries)
                {
                    if (stamp != _version)
                        throw new InvalidOperationException(
                            "RTree mutated during Nearest query.");
                    double d = e.Mbr.MinDist(x, y);
                    if (winners.Count < k)
                    {
                        winners.Add((d, _heapSeq++, e.Value!));
                        if (winners.Count == k)
                            worst = MaxDist(winners);
                    }
                    else if (d < worst)
                    {
                        ReplaceWorst(winners, d, e.Value!);
                        worst = MaxDist(winners);
                    }
                }
            }
            else
            {
                foreach (var e in node.Entries)
                {
                    double md = e.Mbr.MinDist(x, y);
                    if (winners.Count < k || md <= worst)
                        pq.Enqueue(e.Child!, (md, _heapSeq++));
                }
            }
        }
        winners.Sort((a, b) =>
        {
            int c = a.Dist.CompareTo(b.Dist);
            return c != 0 ? c : a.Seq.CompareTo(b.Seq);
        });
        foreach (var (d, s, v) in winners)
        {
            if (stamp != _version)
                throw new InvalidOperationException(
                    "RTree mutated during Nearest query.");
            visit(d, s, v);
        }
    }

    /// <summary>
    /// Walk the tree checking I1..I5 plus count/MBR-tightness. Returns null
    /// when every invariant holds, else a human-readable violation.
    /// </summary>
    public string? CheckInvariants()
    {
        if (_count == 0)
        {
            if (_root.Level != 0 || _root.Entries.Count != 0)
                return "Empty tree must be a single empty leaf.";
            return null;
        }
        int leafCount = 0;
        var stack = new Stack<(Node Node, bool IsRoot)>();
        stack.Push((_root, true));
        while (stack.Count > 0)
        {
            var (node, isRoot) = stack.Pop();
            int n = node.Entries.Count;
            if (n > _maxEntries)
                return $"Node over capacity: {n} > M={_maxEntries}.";
            if (!isRoot && n < _minEntries)
                return $"Node under fill: {n} < m={_minEntries}.";
            if (isRoot && node.Level > 0 && (n < 2 || n > _maxEntries))
                return $"Root directory fill out of [2, M]: {n}.";
            if (node.Level == 0)
            {
                leafCount += n;
                foreach (var e in node.Entries)
                    if (e.Child is not null)
                        return "Leaf entry carries a child pointer.";
            }
            Rect union = node.Entries[0].Mbr;
            for (int i = 1; i < n; i++)
                union = union.Union(node.Entries[i].Mbr);
            if (!union.Equals(node.Mbr))
                return "I1: node MBR is not the exact union of its entries.";
            foreach (var e in node.Entries)
            {
                if (e.Mbr.MinX > e.Mbr.MaxX || e.Mbr.MinY > e.Mbr.MaxY)
                    return "I4: degenerate rect (min > max).";
                if (!node.Mbr.Contains(e.Mbr))
                    return "I1: entry rect escapes its parent MBR.";
                if (node.Mbr.Area < e.Mbr.Area)
                    return "I5: parent MBR area below a child entry area.";
                if (e.Child is not null)
                {
                    if (e.Child.Level != node.Level - 1)
                        return "Child level must be exactly parent level - 1.";
                    if (!e.Mbr.Equals(e.Child.Mbr))
                        return "I1: directory slot rect differs from child MBR.";
                    if (node.Level == 0)
                        return "Leaf node carries a directory slot.";
                    stack.Push((e.Child, false));
                }
                else if (node.Level != 0)
                {
                    return "Directory node carries a value entry.";
                }
            }
        }
        if (leafCount != _count)
            return $"Entry count drift: walked {leafCount}, tracked {_count}.";
        int? leafDepth = null;
        var depthStack = new Stack<(Node Node, int Depth)>();
        depthStack.Push((_root, _root.Level));
        while (depthStack.Count > 0)
        {
            var (node, depth) = depthStack.Pop();
            if (node.Level == 0)
            {
                if (leafDepth is null)
                    leafDepth = depth;
                else if (leafDepth != depth)
                    return "I3: leaves at differing depths.";
            }
            else
            {
                foreach (var e in node.Entries)
                    depthStack.Push((e.Child!, depth - 1));
            }
        }
        return null;
    }

    // -- internals ------------------------------------------------------

    private sealed class Entry
    {
        public Rect Mbr;
        public Node? Child;
        public T? Value;

        public Entry(Rect mbr, T value)
        {
            Mbr = mbr;
            Value = value;
        }

        public Entry(Rect mbr, Node child)
        {
            Mbr = mbr;
            Child = child;
        }
    }

    private sealed class Node
    {
        public readonly int Level;
        public readonly List<Entry> Entries = new();
        public Rect Mbr = new(0, 0, 0, 0);

        public Node(int level)
        {
            Level = level;
        }
    }

    private void InsertInternal(Entry entry, int targetLevel, HashSet<int> reinserted)
    {
        var path = new List<(Node Parent, int Slot)>();
        Node node = _root;
        while (node.Level > targetLevel)
        {
            int idx = ChooseChild(node, entry.Mbr);
            path.Add((node, idx));
            node = node.Entries[idx].Child!;
        }
        node.Entries.Add(entry);
        AfterInsert(node, path, node.Level, reinserted);
    }

    private void AfterInsert(
        Node node, List<(Node Parent, int Slot)> path, int level, HashSet<int> reinserted)
    {
        TightenUp(node, path);
        if (node.Entries.Count <= _maxEntries)
            return;
        if (reinserted.Add(level))
            Reinsert(node, path, level, reinserted);
        else
            SplitNode(node, path, level, reinserted);
    }

    private void Reinsert(
        Node node, List<(Node Parent, int Slot)> path, int level, HashSet<int> reinserted)
    {
        int p = Math.Max(1, (int)(_maxEntries * ReinsertFraction));
        p = Math.Min(p, node.Entries.Count - _minEntries);
        var center = node.Mbr.Centroid;
        var doomed = node.Entries
            .Select(e => (Entry: e, Dist: DistSq(e.Mbr.Centroid, center)))
            .OrderByDescending(t => t.Dist)
            .Take(p)
            .Select(t => t.Entry)
            .ToList();
        foreach (var e in doomed)
            node.Entries.Remove(e);
        TightenUp(node, path);
        foreach (var e in doomed)
            InsertInternal(e, level, reinserted);
    }

    private void SplitNode(
        Node node, List<(Node Parent, int Slot)> path, int level, HashSet<int> reinserted)
    {
        var rects = node.Entries.Select(e => e.Mbr).ToList();
        var (a, b) = _split.Split(rects);
        var g1 = NewNode(level, a.Select(i => node.Entries[i]));
        var g2 = NewNode(level, b.Select(i => node.Entries[i]));
        if (path.Count == 0)
        {
            _root = new Node(level + 1);
            _root.Entries.Add(new Entry(g1.Mbr, g1));
            _root.Entries.Add(new Entry(g2.Mbr, g2));
            Tighten(_root);
            return;
        }
        var (parent, slot) = path[^1];
        parent.Entries[slot] = new Entry(g1.Mbr, g1);
        parent.Entries.Add(new Entry(g2.Mbr, g2));
        AfterInsert(parent, path.GetRange(0, path.Count - 1), level + 1, reinserted);
    }

    private Node NewNode(int level, IEnumerable<Entry> entries)
    {
        var node = new Node(level);
        node.Entries.AddRange(entries);
        Tighten(node);
        return node;
    }

    private int ChooseChild(Node node, Rect rect)
    {
        int best = 0;
        if (node.Level == 1)
        {
            double bestOverlap = double.PositiveInfinity;
            double bestArea = double.PositiveInfinity;
            double bestSize = double.PositiveInfinity;
            for (int i = 0; i < node.Entries.Count; i++)
            {
                var mbr = node.Entries[i].Mbr;
                double overlap = 0.0;
                for (int j = 0; j < node.Entries.Count; j++)
                {
                    if (j == i)
                        continue;
                    overlap += mbr.OverlapEnlargement(rect, node.Entries[j].Mbr);
                }
                double area = mbr.Enlargement(rect);
                double size = mbr.Area;
                if (overlap < bestOverlap
                    || (overlap == bestOverlap && area < bestArea)
                    || (overlap == bestOverlap && area == bestArea && size < bestSize))
                {
                    bestOverlap = overlap;
                    bestArea = area;
                    bestSize = size;
                    best = i;
                }
            }
            return best;
        }
        double bestEnlargement = double.PositiveInfinity;
        double bestEntryArea = double.PositiveInfinity;
        for (int i = 0; i < node.Entries.Count; i++)
        {
            var mbr = node.Entries[i].Mbr;
            double enlargement = mbr.Enlargement(rect);
            double area = mbr.Area;
            if (enlargement < bestEnlargement
                || (enlargement == bestEnlargement && area < bestEntryArea))
            {
                bestEnlargement = enlargement;
                bestEntryArea = area;
                best = i;
            }
        }
        return best;
    }

    private Node? FindLeaf(
        Node node, Rect rect, T value, List<(Node Parent, int Slot)> path)
    {
        if (node.Level == 0)
        {
            return node.Entries.Any(e =>
                e.Child is null && e.Mbr.Equals(rect) && _comparer.Equals(e.Value!, value))
                ? node
                : null;
        }
        for (int i = 0; i < node.Entries.Count; i++)
        {
            var e = node.Entries[i];
            if (e.Child is null || !e.Mbr.Contains(rect))
                continue;
            path.Add((node, i));
            var found = FindLeaf(e.Child, rect, value, path);
            if (found is not null)
                return found;
            path.RemoveAt(path.Count - 1);
        }
        return null;
    }

    private static void Tighten(Node node)
    {
        if (node.Entries.Count == 0)
            return;
        Rect acc = node.Entries[0].Mbr;
        for (int i = 1; i < node.Entries.Count; i++)
            acc = acc.Union(node.Entries[i].Mbr);
        node.Mbr = acc;
    }

    private static void TightenUp(Node node, List<(Node Parent, int Slot)> path)
    {
        Tighten(node);
        Node cur = node;
        for (int i = path.Count - 1; i >= 0; i--)
        {
            var (parent, slot) = path[i];
            parent.Entries[slot].Mbr = cur.Mbr;
            Tighten(parent);
            cur = parent;
        }
    }

    private static double DistSq((double X, double Y) a, (double X, double Y) b)
    {
        double dx = a.X - b.X;
        double dy = a.Y - b.Y;
        return dx * dx + dy * dy;
    }

    private static double MaxDist(List<(double Dist, long Seq, T Value)> winners)
    {
        double worst = winners[0].Dist;
        for (int i = 1; i < winners.Count; i++)
            if (winners[i].Dist > worst)
                worst = winners[i].Dist;
        return worst;
    }

    private static void ReplaceWorst(
        List<(double Dist, long Seq, T Value)> winners, double d, T value)
    {
        int worstIdx = 0;
        for (int i = 1; i < winners.Count; i++)
            if (winners[i].Dist > winners[worstIdx].Dist)
                worstIdx = i;
        winners[worstIdx] = (d, winners[worstIdx].Seq, value);
    }

    private static Node BuildLevels(List<Entry> entries, int level, int maxEntries)
    {
        if (entries.Count == 0)
            return new Node(0);
        var groups = StrPartition(entries, maxEntries);
        var nodes = groups.Select(g =>
        {
            var node = new Node(level);
            node.Entries.AddRange(g);
            Tighten(node);
            return node;
        }).ToList();
        int parentLevel = level + 1;
        while (nodes.Count > 1)
        {
            if (nodes.Count <= maxEntries)
            {
                var root = new Node(parentLevel);
                foreach (var child in nodes)
                    root.Entries.Add(new Entry(child.Mbr, child));
                Tighten(root);
                return root;
            }
            var nodeEntries = nodes.Select(n => new Entry(n.Mbr, n)).ToList();
            var parentGroups = StrPartition(nodeEntries, maxEntries);
            nodes = parentGroups.Select(g =>
            {
                var node = new Node(parentLevel);
                node.Entries.AddRange(g);
                Tighten(node);
                return node;
            }).ToList();
            parentLevel++;
        }
        return nodes[0];
    }

    private static List<List<Entry>> StrPartition(List<Entry> entries, int maxEntries)
    {
        if (entries.Count <= maxEntries)
            return new List<List<Entry>> { new(entries) };
        int groupCount = (entries.Count + maxEntries - 1) / maxEntries;
        int sliceCount = (int)Math.Ceiling(Math.Sqrt(groupCount));
        var byX = entries.OrderBy(e => e.Mbr.Centroid.X).ThenBy(e => e.Mbr.Centroid.Y).ToList();
        int sliceSize = (byX.Count + sliceCount - 1) / sliceCount;
        var output = new List<List<Entry>>();
        for (int s = 0; s < byX.Count; s += sliceSize)
        {
            var slice = byX.GetRange(s, Math.Min(sliceSize, byX.Count - s));
            slice.Sort((a, b) =>
            {
                int c = a.Mbr.Centroid.Y.CompareTo(b.Mbr.Centroid.Y);
                return c != 0 ? c : a.Mbr.Centroid.X.CompareTo(b.Mbr.Centroid.X);
            });
            int groups = (slice.Count + maxEntries - 1) / maxEntries;
            int baseSize = slice.Count / groups;
            int remainder = slice.Count % groups;
            int offset = 0;
            for (int g = 0; g < groups; g++)
            {
                int size = baseSize + (g < remainder ? 1 : 0);
                output.Add(slice.GetRange(offset, size));
                offset += size;
            }
        }
        return output;
    }
}
