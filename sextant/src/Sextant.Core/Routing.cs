// S4 routing: A* plus Dijkstra on the expanded state graph (research 6.2).
// State = (node, incomingEdge); state id 0 is the start (no incoming edge),
// otherwise state id = edgeIndex + 1 (arrival via that edge). Dijkstra is the
// same code path with h = 0, which makes the 1000-pair oracle self-contained.
// Heap priority is (f, nodeId, stateId): fixed tie-breaks keep the closed-set
// order and the returned path deterministic for a fixed (origin, goal).
// The heuristic is admissible and consistent (see sextant/docs/routing.md):
// time mode h(v) = haversine(v,goal)/vmax, distance mode h(v) = haversine m.

namespace Sextant.Core;

/// <summary>Route outcome. Unreachable goals return <c>Found == false</c>, never an exception.</summary>
public sealed record RouteResult(
    bool Found,
    int[] Path,
    double Cost,
    int[] Frontier,
    int Expanded);

public static class Router
{
    /// <summary>Maximum closed-set points recorded for the frontier animation (research: cap 20k).</summary>
    public const int MaxFrontier = 20_000;

    public static RouteResult AStar(RoadGraph g, int origin, int goal, CostMode mode, bool penalizeTurns)
        => Search(g, origin, goal, mode, penalizeTurns, useHeuristic: true);

    public static RouteResult Dijkstra(RoadGraph g, int origin, int goal, CostMode mode, bool penalizeTurns)
        => Search(g, origin, goal, mode, penalizeTurns, useHeuristic: false);

    /// <summary>Full time-limited Dijkstra arrival field from source (seconds or meters per mode).</summary>
    internal static double[] ArrivalField(RoadGraph g, int source, CostMode mode, bool penalizeTurns)
    {
        ArgumentNullException.ThrowIfNull(g);
        if (source < 0 || source >= g.NodeCount) throw new ArgumentOutOfRangeException(nameof(source));
        var search = Run(g, source, -1, mode, penalizeTurns, useHeuristic: false, recordFrontier: false);
        var arrival = new double[g.NodeCount];
        Array.Fill(arrival, double.PositiveInfinity);
        for (int s = 0; s < search.G.Length; s++)
        {
            if (double.IsPositiveInfinity(search.G[s])) continue;
            int node = s == 0 ? source : g.Heads[s - 1];
            if (search.G[s] < arrival[node]) arrival[node] = search.G[s];
        }
        return arrival;
    }

    public static RouteResult Search(
        RoadGraph g, int origin, int goal, CostMode mode, bool penalizeTurns, bool useHeuristic)
    {
        ArgumentNullException.ThrowIfNull(g);
        if (origin < 0 || origin >= g.NodeCount) throw new ArgumentOutOfRangeException(nameof(origin));
        if (goal < 0 || goal >= g.NodeCount) throw new ArgumentOutOfRangeException(nameof(goal));
        var search = Run(g, origin, goal, mode, penalizeTurns, useHeuristic, recordFrontier: true);
        if (search.GoalState < 0)
            return new RouteResult(false, Array.Empty<int>(), double.PositiveInfinity, search.Frontier, search.Expanded);
        var path = new List<int>();
        for (int s = search.GoalState; s != -1; s = search.Parent[s])
            path.Add(s == 0 ? origin : g.Heads[s - 1]);
        path.Reverse();
        return new RouteResult(true, path.ToArray(), search.G[search.GoalState], search.Frontier, search.Expanded);
    }

    private sealed record SearchState(double[] G, int[] Parent, int GoalState, int[] Frontier, int Expanded);

    private static SearchState Run(
        RoadGraph g, int origin, int goal, CostMode mode, bool penalizeTurns,
        bool useHeuristic, bool recordFrontier)
    {
        int m = g.EdgeCount;
        var dist = new double[m + 1];
        Array.Fill(dist, double.PositiveInfinity);
        var parent = new int[m + 1];
        Array.Fill(parent, -2); // -2 = unseen; parent[state] = previous state, -1 = start
        var closed = new bool[m + 1];
        var frontier = recordFrontier ? new List<int>(1024) : null;

        double H(int node)
        {
            if (!useHeuristic || node == goal) return 0.0;
            double hav = Geo.HaversineM(new GeoPoint(g.Lon[node], g.Lat[node]), new GeoPoint(g.Lon[goal], g.Lat[goal]));
            return mode == CostMode.Time ? hav / g.MaxSpeedMs : hav;
        }

        // .NET PriorityQueue is a min-heap; tuple priority orders (f, node, state).
        var open = new PriorityQueue<int, (double F, int Node, int State)>();
        dist[0] = 0.0;
        parent[0] = -1;
        open.Enqueue(0, (H(origin), origin, 0));

        int expanded = 0;
        int goalState = -1;
        while (open.Count > 0)
        {
            int s = open.Dequeue();
            if (closed[s]) continue;
            closed[s] = true;
            expanded++;
            int v = s == 0 ? origin : g.Heads[s - 1];
            // The overlay budget is fixed; optimality never depends on it.
            if (frontier is not null && frontier.Count < MaxFrontier)
                frontier.Add(v);
            if (v == goal && goal >= 0)
            {
                goalState = s;
                break;
            }
            // Arrival-field mode (goal == -1) drains the whole reachable set.
            foreach (int e in g.OutEdges(v))
            {
                int w = g.Heads[e];
                double step = g.EdgeCost(e, mode);
                if (penalizeTurns && s != 0)
                {
                    int prev = s - 1;
                    int u = g.Froms[prev];
                    step += TurnTable.Penalty(
                        g.X[u], g.Y[u], g.X[v], g.Y[v], g.X[w], g.Y[w],
                        g.Classes[prev], g.Classes[e]);
                }
                double ng = dist[s] + step;
                int t = e + 1;
                if (ng < dist[t])
                {
                    dist[t] = ng;
                    parent[t] = s;
                    open.Enqueue(t, (ng + H(w), w, t));
                }
            }
        }

        int[] recorded = frontier is null ? Array.Empty<int>() : frontier.ToArray();
        return new SearchState(dist, parent, goalState, recorded, expanded);
    }
}
