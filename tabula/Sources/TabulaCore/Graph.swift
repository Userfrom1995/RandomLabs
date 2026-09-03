/// Dependency graph: precedent extraction, cycle detection, dirty closure,
/// and topological recalculation order (research 5, normative).
///
/// Nodes are formula cells; literal cells are graph sources with no outgoing
/// precedent edges but may be precedents of others. Edges point
/// precedent -> dependent (value-flow direction); recalc order follows it.
/// Ranges expand to member-cell edges at build time, so observable behavior
/// always equals full expansion (research 5.1; the range-folding invariant
/// test in Phase 3 pins this against an interval-storage optimization, if one
/// ever lands).
///
/// Cycle detection is iterative DFS with WHITE/GRAY/BLACK colors (research
/// 5.2): recursion is forbidden because deep chains (A1->A2->...->A100000)
/// must not overflow the SwiftWasm stack. Recalculation is Kahn restricted to
/// the dirty subgraph (research 5.3); unemitted residue is exactly the
/// DFS-tainted set and evaluates to `#CYCLE!` with the recorded path.
extension Addr: Comparable {
    /// Deterministic total order (sheet, row, col) used by Kahn's queue and
    /// by every test that snapshots graph output. Row-major within a sheet so
    /// range folds and evaluation order agree.
    public static func < (l: Addr, r: Addr) -> Bool {
        if l.sheet != r.sheet { return l.sheet < r.sheet }
        if l.row != r.row { return l.row < r.row }
        return l.col < r.col
    }
}

extension Expr {
    /// All precedent addresses of this expression against `host`, with ranges
    /// fully expanded in row-major order and names resolved through `resolver`.
    /// Dangling refs (deleted cells, missing sheets) and unknown names
    /// contribute no edges; the evaluator still reports `#REF!`/`#NAME?` for
    /// them (research 6, `Ref(a)` rule).
    public func precedentCells(host: Addr, resolver: StaticResolver = .empty) -> Set<Addr> {
        var out = Set<Addr>()
        var noRects: [RangeRect]? = nil
        collectPrecedents(host: host, resolver: resolver, cells: &out, rects: &noRects)
        return out
    }

    /// The range rectangles observed by this expression, normalized, in
    /// source order. Used by the range-folding invariant test.
    public func precedentRects(host: Addr, resolver: StaticResolver = .empty) -> [RangeRect] {
        var rects: [RangeRect]? = []
        var sink = Set<Addr>()
        collectPrecedents(host: host, resolver: resolver, cells: &sink, rects: &rects)
        return rects ?? []
    }

    /// True when this expression calls a volatile function (`TODAY`, `NOW`).
    /// Volatile hosts join every recalc's dirty set (research 5.4). `RAND` is
    /// not in the v1 library (determinism); if it ever lands it must be added
    /// here plus seeded per research 5.4.
    public var isVolatile: Bool {
        switch self {
        case .call(let fn, let args):
            if fn == "TODAY" || fn == "NOW" { return true }
            return args.contains(where: { $0.isVolatile })
        case .unary(_, let e):
            return e.isVolatile
        case .binary(_, let l, let r):
            return l.isVolatile || r.isVolatile
        case .percent(let e):
            return e.isVolatile
        case .arrayConst(let rows):
            return rows.joined().contains(where: { $0.isVolatile })
        case .num, .str, .bool, .ref, .range, .name, .errLit:
            return false
        }
    }

    private func collectPrecedents(
        host: Addr, resolver: StaticResolver,
        cells: inout Set<Addr>, rects: inout [RangeRect]?
    ) {
        switch self {
        case .num, .str, .bool, .errLit:
            break
        case .ref(let r):
            if let a = r.resolve(host: host) { cells.insert(a) }
        case .range(let rr):
            if let rect = rr.resolve(host: host) {
                rects?.append(rect)
                var row = rect.loRow
                while row <= rect.hiRow {
                    var col = rect.loCol
                    while col <= rect.hiCol {
                        cells.insert(Addr(
                            sheet: rect.sheet ?? host.sheet,
                            col: col, row: row
                        ))
                        col += 1
                    }
                    row += 1
                }
            }
        case .name(let n):
            if let addrs = resolver.nameAddrs(n) {
                for a in addrs { cells.insert(a) }
            }
        case .call(_, let args):
            for a in args {
                a.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
            }
        case .unary(_, let e):
            e.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
        case .binary(_, let l, let r):
            l.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
            r.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
        case .percent(let e):
            e.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
        case .arrayConst(let rows):
            for e in rows.joined() {
                e.collectPrecedents(host: host, resolver: resolver, cells: &cells, rects: &rects)
            }
        }
    }
}

/// The workbook's formula dependency graph, built once per structural change
/// and queried on every edit (research 5.1-5.3).
public struct DepGraph: Sendable {
    /// Formula AST per formula cell. Literal cells are absent (graph sources).
    public var formulas: [Addr: Expr]
    /// Forward edges: formula cell -> its precedent addresses (literals
    /// included as values, so dirty marking reaches dependents of literals).
    public var precedents: [Addr: Set<Addr>]
    /// Reverse edges: precedent address -> its dependent formula cells.
    public var dependents: [Addr: Set<Addr>]
    /// Formula cells whose AST calls a volatile function.
    public var volatile: Set<Addr>
    /// Sorted formula-cell successors per formula cell (precedents that are
    /// themselves formulas). Precomputed once: intersecting against the live
    /// key collection per visit would be O(V) per node (issue #282 Phase 3
    /// proxy caught 6.7s on 10k cells here).
    var succ: [Addr: [Addr]]

    public init(formulas: [Addr: Expr], resolver: StaticResolver = .empty) {
        self.formulas = formulas
        var prec: [Addr: Set<Addr>] = [:]
        var dep: [Addr: Set<Addr>] = [:]
        var vol = Set<Addr>()
        let fset = Set(formulas.keys)
        var s: [Addr: [Addr]] = [:]
        s.reserveCapacity(formulas.count)
        for (cell, expr) in formulas {
            let ps = expr.precedentCells(host: cell, resolver: resolver)
            prec[cell] = ps
            for p in ps {
                dep[p, default: []].insert(cell)
            }
            if expr.isVolatile { vol.insert(cell) }
            s[cell] = ps.intersection(fset).sorted()
        }
        self.precedents = prec
        self.dependents = dep
        self.volatile = vol
        self.succ = s
    }

    /// Dirty closure over dependent edges from `edits` (BFS following
    /// precedent -> dependent), union volatile cells and their transitive
    /// dependents (research 5.3-5.4). Laziness (`IF` untaken branches) affects
    /// values, never dirty marking: all syntactic dependents join.
    public func dirtyClosure(edits: Set<Addr>) -> Set<Addr> {
        var dirty = edits
        var queue = Array(edits).sorted()
        // Seed volatile cells: they are dirty on every pass (research 5.4).
        for v in volatile.sorted() where !dirty.contains(v) {
            dirty.insert(v)
            queue.append(v)
        }
        var head = 0
        while head < queue.count {
            let cur = queue[head]
            head += 1
            for d in dependents[cur] ?? [] {
                if dirty.insert(d).inserted { queue.append(d) }
            }
        }
        return dirty
    }

    /// Iterative DFS cycle detection (research 5.2). Returns the tainted set
    /// (cycle members plus their transitive dependents, which all evaluate to
    /// `#CYCLE!`) and one recorded path per cycle found, for the inspector UI.
    /// Sound (only GRAY back edges reported) and complete (every directed
    /// cycle holds a DFS back edge).
    public func detectCycles() -> (tainted: Set<Addr>, paths: [[Addr]]) {
        enum Color { case white, gray, black }
        var color: [Addr: Color] = [:]
        for cell in formulas.keys { color[cell] = .white }
        var paths: [[Addr]] = []
        var members = Set<Addr>()

        for start in formulas.keys.sorted() where color[start] == .white {
            // Explicit stack of (node, sorted-children, next-child-index).
            var stack: [(node: Addr, kids: [Addr], idx: Int)] = []
            color[start] = .gray
            stack.append((start, succ[start] ?? [], 0))
            while let top = stack.last {
                let node = top.node
                if top.idx < top.kids.count {
                    let kid = top.kids[top.idx]
                    stack[stack.count - 1].idx += 1
                    switch color[kid] ?? .black {
                    case .white:
                        color[kid] = .gray
                        stack.append((kid, succ[kid] ?? [], 0))
                    case .gray:
                        // Back edge node -> kid: cycle is the stack slice.
                        if let at = stack.firstIndex(where: { $0.node == kid }) {
                            var path = stack[at...].map(\.node)
                            path.append(kid)
                            paths.append(path)
                            for m in stack[at...].map(\.node) { members.insert(m) }
                        }
                    case .black:
                        break
                    }
                } else {
                    color[node] = .black
                    stack.removeLast()
                }
            }
        }

        // Taint members plus transitive dependents (dependent direction BFS).
        var tainted = members
        var queue = Array(members)
        var head = 0
        while head < queue.count {
            let cur = queue[head]
            head += 1
            for d in dependents[cur] ?? [] {
                if tainted.insert(d).inserted { queue.append(d) }
            }
        }
        return (tainted, paths)
    }

    /// Kahn topological order restricted to `dirty` formula cells (research
    /// 5.3). Indegrees count precedents inside the dirty formula subgraph via
    /// one edge walk (no per-node set allocation); the zero-indegree queue is
    /// a binary heap over the deterministic `Addr` order, so deep chains and
    /// wide fan-outs stay O((V+E) log V). Cells never emitted are in cycles:
    /// the residue must equal the DFS-tainted set intersected with dirty
    /// (pinned by the Phase 3 invariant test).
    public func kahnOrder(dirty: Set<Addr>) -> (order: [Addr], residue: Set<Addr>) {
        let nodes = Set(formulas.keys).intersection(dirty)
        var indegree: [Addr: Int] = [:]
        indegree.reserveCapacity(nodes.count)
        for cell in nodes { indegree[cell] = 0 }
        for (cell, pres) in precedents where nodes.contains(cell) {
            for p in pres where nodes.contains(p) {
                indegree[cell, default: 0] += 1
            }
        }
        var heap = AddrHeap()
        for n in nodes where indegree[n] == 0 { heap.push(n) }
        var order: [Addr] = []
        order.reserveCapacity(nodes.count)
        while let n = heap.pop() {
            order.append(n)
            for d in dependents[n] ?? [] where nodes.contains(d) {
                let v = (indegree[d] ?? 1) - 1
                indegree[d] = v
                if v == 0 { heap.push(d) }
            }
        }
        return (order, nodes.subtracting(order))
    }

    /// Formula-cell successors for DFS: precomputed sorted adjacency
    /// (`succ`). Literals are sinks and cannot lie on a cycle.
    func formulaSucc(_ cell: Addr) -> [Addr] {
        succ[cell] ?? []
    }
}

/// Minimal binary min-heap over the deterministic `Addr` order, backing
/// Kahn's zero-indegree queue (research 5.3). Emission order stays a valid
/// topological order; determinism comes from the total `Addr` comparison,
/// not from insertion order.
struct AddrHeap: Sendable {
    private var items: [Addr] = []

    var isEmpty: Bool { items.isEmpty }

    mutating func push(_ x: Addr) {
        items.append(x)
        var i = items.count - 1
        while i > 0 {
            let p = (i - 1) / 2
            guard items[i] < items[p] else { break }
            items.swapAt(i, p)
            i = p
        }
    }

    mutating func pop() -> Addr? {
        guard !items.isEmpty else { return nil }
        let top = items[0]
        let last = items.removeLast()
        if !items.isEmpty {
            items[0] = last
            var i = 0
            while true {
                let l = 2 * i + 1, r = l + 1
                var m = i
                if l < items.count, items[l] < items[m] { m = l }
                if r < items.count, items[r] < items[m] { m = r }
                guard m != i else { break }
                items.swapAt(i, m)
                i = m
            }
        }
        return top
    }
}
