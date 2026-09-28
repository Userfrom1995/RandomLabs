package hnsw

import (
	"container/heap"
	"math"
	"sort"

	"github.com/Userfrom1995/Random/helix/internal/core"
)

// Graph is the HNSW graph.
type Graph struct {
	Nodes          map[uint64]*Node
	EntryPoint     uint64
	TopLayer       int
	M              int
	Mmax           int
	Mmax0          int
	EfConstruction int
	Metric         core.Metric
	Rng            *core.RNG
	ml             float64 // 1/ln(M)
}

// NewGraph creates an empty graph.
func NewGraph(M, Mmax, Mmax0, efConstruction int, metric core.Metric, rng *core.RNG) *Graph {
	if M <= 0 {
		M = 16
	}
	if Mmax <= 0 {
		Mmax = M
	}
	if Mmax0 <= 0 {
		Mmax0 = 2 * M
	}
	if efConstruction <= 0 {
		efConstruction = 200
	}
	ml := 1.0 / math.Log(float64(M))
	return &Graph{
		Nodes:          make(map[uint64]*Node),
		TopLayer:       -1,
		M:              M,
		Mmax:           Mmax,
		Mmax0:          Mmax0,
		EfConstruction: efConstruction,
		Metric:         metric,
		Rng:            rng,
		ml:             ml,
	}
}

func (g *Graph) randomLayer() int {
	u := g.Rng.Float64()
	if u < 1e-12 {
		u = 1e-12
	}
	if u > 1-1e-12 {
		u = 1 - 1e-12
	}
	l := int(math.Floor(-math.Log(u) * g.ml))
	if l < 0 {
		l = 0
	}
	return l
}

// Get returns node or nil.
func (g *Graph) Get(id uint64) *Node { return g.Nodes[id] }

// Delete marks node as deleted (lazy).
func (g *Graph) Delete(id uint64) bool {
	n, ok := g.Nodes[id]
	if !ok {
		return false
	}
	if n.Deleted {
		return false
	}
	n.Deleted = true
	return true
}

// Insert adds a node with given id and layer, and connects it.
// dist is the distance function to use for searchLayer.
func (g *Graph) Insert(id uint64, layer int, dist func(aID, bID uint64) float32) {
	if _, exists := g.Nodes[id]; exists {
		return
	}
	node := NewNode(id, layer)
	// Ensure degree cap uses correct Mmax.
	g.Nodes[id] = node

	if len(g.Nodes) == 1 {
		g.EntryPoint = id
		g.TopLayer = layer
		return
	}

	// Current entry point and top layer before insertion.
	ep := g.EntryPoint
	curTop := g.TopLayer
	// If the new node sits above the current top layer, wire it into the
	// intermediate upper layers via the old entry point so top-down searches
	// can descend. The neighbor search for the new node still starts from the
	// old entry point (ep) at layer curTop.
	if layer > curTop {
		for lc := curTop + 1; lc <= layer; lc++ {
			g.ensureLayer(node, lc)
			g.ensureLayer(g.Nodes[ep], lc)
			node.Neighbors[lc] = sortedInsert(node.Neighbors[lc], ep)
			g.Nodes[ep].Neighbors[lc] = sortedInsert(g.Nodes[ep].Neighbors[lc], id)
		}
	}

	// 1. Greedy descent from top to layer+1 (ef=1)
	for lc := curTop; lc > layer; lc-- {
		// searchLayer with ef=1 at this level
		best := g.searchLayerWithDist(id, []uint64{ep}, 1, lc, dist)
		if len(best) > 0 {
			// pick closest
			ep = best[0].ID
		}
	}

	// 2. From min(layer, curTop) down to 0, search and connect
	start := layer
	if curTop < start {
		start = curTop
	}
	for lc := start; lc >= 0; lc-- {
		candidates := g.searchLayerWithDist(id, []uint64{ep}, g.EfConstruction, lc, dist)
		// select neighbors
		neighbors := g.selectNeighborsHeuristic(id, candidates, g.M, lc, dist, true)
		// cap for this layer will be applied to neighbor shrinkage differently
		// Add bidirectional edges
		for _, nb := range neighbors {
			// Ensure neighbor's slice exists for this layer
			nNode := g.Nodes[nb.ID]
			if nNode == nil {
				continue
			}
			// Ensure both nodes have enough layers allocated
			g.ensureLayer(node, lc)
			g.ensureLayer(nNode, lc)
			// add edge both ways (sorted)
			node.Neighbors[lc] = sortedInsert(node.Neighbors[lc], nb.ID)
			nNode.Neighbors[lc] = sortedInsert(nNode.Neighbors[lc], id)
			// shrink neighbor if over degree
			capM := g.Mmax
			if lc == 0 {
				capM = g.Mmax0
			}
			if len(nNode.Neighbors[lc]) > capM {
				// re-select for nNode
				cands := make([]core.Candidate, 0, len(nNode.Neighbors[lc]))
				for _, nid := range nNode.Neighbors[lc] {
					d := dist(nNode.ID, nid)
					cands = append(cands, core.Candidate{ID: nid, Dist: d})
				}
				// sort by dist
				sort.Slice(cands, func(i, j int) bool { return cands[i].Dist < cands[j].Dist })
				shrunk := g.selectNeighborsHeuristic(nNode.ID, cands, capM, lc, dist, false)
				newList := make([]uint64, 0, len(shrunk))
				for _, c := range shrunk {
					newList = append(newList, c.ID)
				}
				// Keep sorted by id for determinism
				sort.Slice(newList, func(i, j int) bool { return newList[i] < newList[j] })
				// Remove edges that were dropped: need to remove reverse edges
				dropped := difference(nNode.Neighbors[lc], newList)
				for _, did := range dropped {
					if other, ok := g.Nodes[did]; ok && lc < len(other.Neighbors) {
						other.Neighbors[lc] = removeSorted(other.Neighbors[lc], nNode.ID)
					}
				}
				nNode.Neighbors[lc] = newList
			}
		}
		// Also shrink current node if over degree (can happen when M small)
		capM := g.Mmax
		if lc == 0 {
			capM = g.Mmax0
		}
		if len(node.Neighbors[lc]) > capM {
			cands := make([]core.Candidate, 0, len(node.Neighbors[lc]))
			for _, nid := range node.Neighbors[lc] {
				cands = append(cands, core.Candidate{ID: nid, Dist: dist(id, nid)})
			}
			sort.Slice(cands, func(i, j int) bool { return cands[i].Dist < cands[j].Dist })
			shrunk := g.selectNeighborsHeuristic(id, cands, capM, lc, dist, false)
			newList := make([]uint64, 0, len(shrunk))
			for _, c := range shrunk {
				newList = append(newList, c.ID)
			}
			sort.Slice(newList, func(i, j int) bool { return newList[i] < newList[j] })
			// Remove reverse edges for dropped
			dropped := difference(node.Neighbors[lc], newList)
			for _, did := range dropped {
				if other, ok := g.Nodes[did]; ok && lc < len(other.Neighbors) {
					other.Neighbors[lc] = removeSorted(other.Neighbors[lc], id)
				}
			}
			node.Neighbors[lc] = newList
		}
		// Update ep to candidates for next lower layer (use closest)
		if len(candidates) > 0 {
			// candidates already sorted by dist ascending (from searchLayer return)
			ep = candidates[0].ID
		}
	}

	if layer > g.TopLayer {
		g.EntryPoint = id
		g.TopLayer = layer
	}
}

func (g *Graph) ensureLayer(n *Node, lc int) {
	if lc < len(n.Neighbors) {
		return
	}
	newN := make([][]uint64, lc+1)
	copy(newN, n.Neighbors)
	n.Neighbors = newN
}

func difference(a, b []uint64) []uint64 {
	setB := make(map[uint64]bool, len(b))
	for _, x := range b {
		setB[x] = true
	}
	var out []uint64
	for _, x := range a {
		if !setB[x] {
			out = append(out, x)
		}
	}
	return out
}

// searchLayerWithDist is the HNSW beam search at a single layer.
// Returns up to ef candidates sorted by distance ascending.
func (g *Graph) searchLayerWithDist(qID uint64, entryPoints []uint64, ef, lc int, dist func(aID, bID uint64) float32) []core.Candidate {
	if ef <= 0 {
		ef = 1
	}
	visited := make(map[uint64]bool, ef*4)
	for _, ep := range entryPoints {
		visited[ep] = true
	}
	// candidates: max-heap by dist? For exploration we want min-heap: pop closest.
	// But we maintain both: candidates min-heap, W max-heap (farthest on top).
	candidates := &core.MinHeap{}
	heap.Init(candidates)
	wHeap := &core.MaxHeap{}
	heap.Init(wHeap)

	for _, ep := range entryPoints {
		if _, ok := g.Nodes[ep]; !ok {
			continue
		}
		// skip deleted entry points? include but they won't be traversable via neighbors check?
		d := dist(qID, ep)
		heap.Push(candidates, core.Candidate{ID: ep, Dist: d})
		heap.Push(wHeap, core.Candidate{ID: ep, Dist: d})
	}
	// Trim W to ef
	for wHeap.Len() > ef {
		heap.Pop(wHeap)
	}

	for candidates.Len() > 0 {
		c := heap.Pop(candidates).(core.Candidate)
		// If c is farther than farthest in W, we can break (no closer possible)
		if wHeap.Len() >= ef {
			farthest := (*wHeap)[0]
			if c.Dist > farthest.Dist {
				break
			}
		}
		node := g.Nodes[c.ID]
		if node == nil || lc >= len(node.Neighbors) {
			continue
		}
		for _, nbID := range node.Neighbors[lc] {
			if visited[nbID] {
				continue
			}
			visited[nbID] = true
			nbNode := g.Nodes[nbID]
			if nbNode != nil && nbNode.Deleted {
				continue
			}
			d := dist(qID, nbID)
			farthest := core.Candidate{Dist: float32(1e30)}
			if wHeap.Len() > 0 {
				farthest = (*wHeap)[0]
			}
			if wHeap.Len() < ef || d < farthest.Dist {
				heap.Push(candidates, core.Candidate{ID: nbID, Dist: d})
				heap.Push(wHeap, core.Candidate{ID: nbID, Dist: d})
				if wHeap.Len() > ef {
					heap.Pop(wHeap)
				}
			}
		}
	}
	// wHeap contains up to ef closest; extract sorted ascending
	out := make([]core.Candidate, wHeap.Len())
	for i := len(out) - 1; i >= 0; i-- {
		out[i] = heap.Pop(wHeap).(core.Candidate)
	}
	// Currently pops farthest first, so reversed gives ascending. But we popped from max-heap so order is descending; reverse gives ascending.
	// Actually max-heap Pop returns farthest first, so filling from end gives ascending.
	// Verify ascending:
	sort.Slice(out, func(i, j int) bool { return out[i].Dist < out[j].Dist })
	return out
}

// SearchLayer is public wrapper that returns candidates sorted ascending, plus visited count.
// It is used by index for queries.
func (g *Graph) SearchLayer(qID uint64, entryPoints []uint64, ef, lc int, dist func(aID, bID uint64) float32) ([]core.Candidate, int) {
	cands := g.searchLayerWithDist(qID, entryPoints, ef, lc, dist)
	// visited count approximated as ef * something; we return len(cands) for now; index will track separately via traversal
	return cands, len(cands)
}

// selectNeighborsHeuristic implements the diversity heuristic from the spec.
func (g *Graph) selectNeighborsHeuristic(qID uint64, candidates []core.Candidate, M, lc int, dist func(aID, bID uint64) float32, extend bool) []core.Candidate {
	if len(candidates) == 0 {
		return nil
	}
	// Optionally extend candidate pool with neighbors of candidates
	poolMap := make(map[uint64]core.Candidate, len(candidates)*2)
	for _, c := range candidates {
		poolMap[c.ID] = c
	}
	if extend {
		for _, c := range candidates {
			node := g.Nodes[c.ID]
			if node == nil || lc >= len(node.Neighbors) {
				continue
			}
			for _, nb := range node.Neighbors[lc] {
				if _, ok := poolMap[nb]; ok {
					continue
				}
				if nb == qID {
					continue
				}
				// compute distance from q to this neighbor
				d := dist(qID, nb)
				poolMap[nb] = core.Candidate{ID: nb, Dist: d}
			}
		}
	}
	pool := make([]core.Candidate, 0, len(poolMap))
	for _, c := range poolMap {
		pool = append(pool, c)
	}
	sort.Slice(pool, func(i, j int) bool {
		if pool[i].Dist == pool[j].Dist {
			return pool[i].ID < pool[j].ID
		}
		return pool[i].Dist < pool[j].Dist
	})

	// Diversity pruning
	var result []core.Candidate
	for _, c := range pool {
		if len(result) >= M {
			break
		}
		// Check if c is closer to any already selected than to q
		skip := false
		for _, r := range result {
			// dist(c, r) < dist(c, q)  -> redundant
			dcr := dist(c.ID, r.ID)
			if dcr < c.Dist {
				skip = true
				break
			}
		}
		if skip {
			continue
		}
		result = append(result, c)
	}
	// If we pruned too aggressively and result < M, fill with next best not yet selected
	if len(result) < M {
		selected := make(map[uint64]bool, len(result))
		for _, r := range result {
			selected[r.ID] = true
		}
		for _, c := range pool {
			if len(result) >= M {
				break
			}
			if selected[c.ID] {
				continue
			}
			result = append(result, c)
		}
	}
	return result
}

// Ml returns layer decay constant.
func (g *Graph) Ml() float64 { return g.ml }

// SearchLayerRaw exposes searchLayerWithDist with visited count.
func (g *Graph) SearchLayerRaw(qID uint64, entryPoints []uint64, ef, lc int, dist func(aID, bID uint64) float32) ([]core.Candidate, int) {
	return g.searchLayerWithDistVisited(qID, entryPoints, ef, lc, dist)
}

func (g *Graph) searchLayerWithDistVisited(qID uint64, entryPoints []uint64, ef, lc int, dist func(aID, bID uint64) float32) ([]core.Candidate, int) {
	if ef <= 0 {
		ef = 1
	}
	visited := make(map[uint64]bool, ef*4)
	for _, ep := range entryPoints {
		visited[ep] = true
	}
	candidates := &core.MinHeap{}
	heap.Init(candidates)
	wHeap := &core.MaxHeap{}
	heap.Init(wHeap)
	for _, ep := range entryPoints {
		if _, ok := g.Nodes[ep]; !ok {
			continue
		}
		d := dist(qID, ep)
		heap.Push(candidates, core.Candidate{ID: ep, Dist: d})
		heap.Push(wHeap, core.Candidate{ID: ep, Dist: d})
	}
	for wHeap.Len() > ef {
		heap.Pop(wHeap)
	}
	for candidates.Len() > 0 {
		c := heap.Pop(candidates).(core.Candidate)
		if wHeap.Len() >= ef {
			farthest := (*wHeap)[0]
			if c.Dist > farthest.Dist {
				break
			}
		}
		node := g.Nodes[c.ID]
		if node == nil || lc >= len(node.Neighbors) {
			continue
		}
		for _, nbID := range node.Neighbors[lc] {
			if visited[nbID] {
				continue
			}
			visited[nbID] = true
			if nbN := g.Nodes[nbID]; nbN != nil && nbN.Deleted {
				continue
			}
			d := dist(qID, nbID)
			farthest := core.Candidate{Dist: float32(1e30)}
			if wHeap.Len() > 0 {
				farthest = (*wHeap)[0]
			}
			if wHeap.Len() < ef || d < farthest.Dist {
				heap.Push(candidates, core.Candidate{ID: nbID, Dist: d})
				heap.Push(wHeap, core.Candidate{ID: nbID, Dist: d})
				if wHeap.Len() > ef {
					heap.Pop(wHeap)
				}
			}
		}
	}
	out := make([]core.Candidate, wHeap.Len())
	for i := len(out) - 1; i >= 0; i-- {
		out[i] = heap.Pop(wHeap).(core.Candidate)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Dist < out[j].Dist })
	return out, len(visited)
}

// Layers returns number of layers.
func (g *Graph) Layers() int {
	if g.TopLayer < 0 {
		return 0
	}
	return g.TopLayer + 1
}
