package index

import (
	"fmt"
	"math"
	"sort"

	"github.com/Userfrom1995/Random/helix/internal/core"
	"github.com/Userfrom1995/Random/helix/internal/hnsw"
	"github.com/Userfrom1995/Random/helix/internal/pq"
)

// Item is an input record for Build.
type Item struct {
	ID   uint64
	Vec  []float32
	Meta map[string]any
}

// Entry is a stored record.
type Entry struct {
	ID   uint64
	Vec  []float32
	Code []byte
	Meta map[string]any
}

// SearchResult is a single hit.
type SearchResult struct {
	ID       uint64         `json:"id"`
	Distance float32        `json:"distance"`
	Meta     map[string]any `json:"meta,omitempty"`
}

// SearchResponse wraps search output.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Visited int            `json:"visited"`
	Mode    string         `json:"mode"`
}

// Options for building an index.
type Options struct {
	Dim            int
	M              int
	Mmax           int
	Mmax0          int
	EfConstruction int
	Metric         core.Metric
	Seed           uint64
	PqEnabled      bool
	PqM            int
	PqK            int
	Opq            bool
	PqRerank       bool
}

// DefaultOptions returns sane defaults.
func DefaultOptions(dim int) Options {
	return Options{
		Dim:            dim,
		M:              16,
		Mmax:           16,
		Mmax0:          32,
		EfConstruction: 200,
		Metric:         core.MetricL2,
		Seed:           42,
		PqEnabled:      false,
		PqM:            8,
		PqK:            256,
		Opq:            true,
		PqRerank:       true,
	}
}

// Index is the coupled HNSW+PQ index.
type Index struct {
	Dim     int
	Graph   *hnsw.Graph
	PQ      *pq.PQ
	Proj    [2][]float32 // projection basis: two D-dim vectors
	Opts    Options
	Entries map[uint64]*Entry
	Rng     *core.RNG
}

// Build constructs a new index from items (deterministic).
func Build(opts Options, items []Item) (*Index, error) {
	if opts.Dim <= 0 {
		return nil, fmt.Errorf("dim must be >0")
	}
	if opts.M <= 0 {
		opts.M = 16
	}
	if opts.Mmax <= 0 {
		opts.Mmax = opts.M
	}
	if opts.Mmax0 <= 0 {
		opts.Mmax0 = 2 * opts.M
	}
	if opts.EfConstruction <= 0 {
		opts.EfConstruction = 200
	}
	if opts.PqEnabled {
		if opts.PqM <= 0 {
			opts.PqM = 8
		}
		if opts.PqK <= 0 {
			opts.PqK = 256
		}
		if opts.Dim%opts.PqM != 0 {
			return nil, fmt.Errorf("dim %d must be divisible by PqM %d", opts.Dim, opts.PqM)
		}
	}
	for _, it := range items {
		if len(it.Vec) != opts.Dim {
			return nil, fmt.Errorf("item %d: vector length %d != dim %d", it.ID, len(it.Vec), opts.Dim)
		}
		if err := core.CheckFinite(it.Vec); err != nil {
			return nil, fmt.Errorf("item %d: %w", it.ID, err)
		}
	}

	rng := core.NewRNG(opts.Seed)

	// Train PQ if enabled
	var pqObj *pq.PQ
	if opts.PqEnabled && len(items) > 0 {
		data := make([][]float32, len(items))
		for i, it := range items {
			data[i] = it.Vec
		}
		var err error
		pqObj, err = pq.Train(data, opts.Dim, opts.PqM, opts.PqK, opts.Opq, rng)
		if err != nil {
			return nil, err
		}
	}

	graph := hnsw.NewGraph(opts.M, opts.Mmax, opts.Mmax0, opts.EfConstruction, opts.Metric, rng)
	idx := &Index{
		Dim:     opts.Dim,
		Graph:   graph,
		PQ:      pqObj,
		Opts:    opts,
		Entries: make(map[uint64]*Entry, len(items)),
		Rng:     rng,
	}

	// Stable insertion order: sorted by ID
	sorted := make([]Item, len(items))
	copy(sorted, items)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].ID < sorted[j].ID })

	// Precompute entries with codes
	for _, it := range sorted {
		vec := make([]float32, opts.Dim)
		copy(vec, it.Vec)
		// Normalize if cosine metric
		if opts.Metric == core.MetricCosine {
			vec = core.Normalize(vec)
		}
		var code []byte
		if pqObj != nil {
			code = pqObj.Encode(vec)
		}
		e := &Entry{ID: it.ID, Vec: vec, Code: code, Meta: it.Meta}
		idx.Entries[it.ID] = e
	}

	// Insert into HNSW graph in sorted order
	for _, it := range sorted {
		e := idx.Entries[it.ID]
		layer := idx.randomLayer()
		// distance closure for insertion: use exact distance over stored vectors
		// For PQ mode we still build graph on exact vectors for better recall; spec allows both.
		distFn := func(aID, bID uint64) float32 {
			ea := idx.Entries[aID]
			eb := idx.Entries[bID]
			if ea == nil || eb == nil {
				return 1e30
			}
			return core.Distance(ea.Vec, eb.Vec, opts.Metric)
		}
		// For the new node's distance to others, we need its vec
		// The graph's Insert expects dist from qID (new) to existing; we capture e.Vec via closure using aID==newID
		// We need aID to be q; so dist(q, other) should use e.Vec when aID==newID
		// Our distFn above uses Entries map which already has e, so ok.
		// But during searchLayer inside Insert, it will call dist(qID, candidate) where qID is new id
		_ = e
		graph.Insert(it.ID, layer, distFn)
	}

	// Compute projection after build (deterministic)
	idx.computeProjection()

	return idx, nil
}

func (idx *Index) randomLayer() int {
	u := idx.Rng.Float64()
	if u < 1e-12 {
		u = 1e-12
	}
	if u > 1-1e-12 {
		u = 1 - 1e-12
	}
	ml := idx.Graph.Ml()
	l := int(math.Floor(-math.Log(u) * ml))
	if l < 0 {
		l = 0
	}
	return l
}

// Search performs ANN search.
func (idx *Index) Search(q []float32, k, ef int, mode string) (*SearchResponse, error) {
	if len(q) != idx.Dim {
		return nil, fmt.Errorf("query dim %d != index dim %d", len(q), idx.Dim)
	}
	if err := core.CheckFinite(q); err != nil {
		return nil, err
	}
	if k <= 0 {
		k = 10
	}
	if ef <= 0 {
		ef = max(idx.Opts.EfConstruction, k*16)
	}
	if ef < k {
		ef = k
	}
	if mode == "" {
		if idx.PQ != nil {
			mode = "pq"
		} else {
			mode = "exact"
		}
	}
	if mode != "exact" && mode != "pq" {
		return nil, fmt.Errorf("unknown mode %q (use exact or pq)", mode)
	}
	// Normalize query if cosine
	qnorm := q
	if idx.Opts.Metric == core.MetricCosine {
		tmp := make([]float32, len(q))
		copy(tmp, q)
		core.NormalizeInPlace(tmp)
		qnorm = tmp
	}

	// Edge: empty index
	if len(idx.Entries) == 0 || idx.Graph.TopLayer < 0 {
		return &SearchResponse{Results: nil, Visited: 0, Mode: mode}, nil
	}

	// Build distance closure
	var adcTable [][]float32
	if mode == "pq" && idx.PQ != nil {
		adcTable = idx.PQ.BuildDistanceTable(qnorm)
	}

	// For HNSW we need to insert q as a temporary node conceptually.
	// Instead we search using qnorm directly without inserting: we need a dist function that handles qID vs nodeID.
	// We simulate q as id = maxId+1 not in graph, with vec = qnorm, code = pq.Encode(qnorm) if needed.
	// Create a synthetic entry for q.
	qCode := []byte(nil)
	if idx.PQ != nil {
		qCode = idx.PQ.Encode(qnorm) // not used for ADC table method; for ADC we use table+code of stored nodes
		_ = qCode
	}

	// distQ returns distance from q to node id
	distQ := func(nodeID uint64) float32 {
		e := idx.Entries[nodeID]
		if e == nil {
			return 1e30
		}
		if mode == "pq" && idx.PQ != nil {
			// ADC: use table + stored code
			if e.Code != nil {
				return pq.ADC(adcTable, e.Code)
			}
		}
		return core.Distance(qnorm, e.Vec, idx.Opts.Metric)
	}

	// wrapper for graph's dist func which expects (aID,bID). We intercept qID.
	// Choose a synthetic qID that is not in graph (e.g., 1<<63)
	const qID uint64 = 1<<63 - 1
	// Temporarily store q entry so graph's dist closure can find it if needed for inter-candidate distances
	// But inter-candidate distances should be exact between nodes, not via q.
	// So we need two kinds: dist(q, node) and dist(nodeA, nodeB)
	// graph.Insert's dist was (q, node) and (candidate, selected) etc. For search, we have similar: searchLayer expands neighbors and computes dist(q, neighbor), and heuristic computes dist(candidate, selected) which is inter-node.
	// So we need a unified dist func that dispatches.
	graphDist := func(aID, bID uint64) float32 {
		if aID == qID {
			return distQ(bID)
		}
		if bID == qID {
			return distQ(aID)
		}
		// inter-node exact
		ea := idx.Entries[aID]
		eb := idx.Entries[bID]
		if ea == nil || eb == nil {
			return 1e30
		}
		return core.Distance(ea.Vec, eb.Vec, idx.Opts.Metric)
	}

	// HNSW search: greedy descent + ef search at base
	ep := idx.Graph.EntryPoint
	curTop := idx.Graph.TopLayer

	// Descend from top layer to 1 with ef=1 using q
	for lc := curTop; lc > 0; lc-- {
		cands, _ := idx.Graph.SearchLayerRaw(qID, []uint64{ep}, 1, lc, graphDist)
		if len(cands) > 0 {
			ep = cands[0].ID
		}
	}
	// Final layer 0 search with ef
	cands, visited := idx.Graph.SearchLayerRaw(qID, []uint64{ep}, ef, 0, graphDist)

	// cands are sorted ascending by dist (q distance)
	// Filter deleted
	filtered := make([]struct {
		ID   uint64
		Dist float32
	}, 0, len(cands))
	for _, c := range cands {
		n := idx.Graph.Get(c.ID)
		if n != nil && n.Deleted {
			continue
		}
		filtered = append(filtered, struct {
			ID   uint64
			Dist float32
		}{c.ID, c.Dist})
	}

	// Optional exact rerank for pq mode
	if mode == "pq" && idx.Opts.PqRerank && idx.PQ != nil {
		// recompute exact distance for filtered candidates and resort
		for i := range filtered {
			e := idx.Entries[filtered[i].ID]
			if e != nil {
				filtered[i].Dist = core.Distance(qnorm, e.Vec, idx.Opts.Metric)
			}
		}
		sort.Slice(filtered, func(i, j int) bool {
			if filtered[i].Dist == filtered[j].Dist {
				return filtered[i].ID < filtered[j].ID
			}
			return filtered[i].Dist < filtered[j].Dist
		})
	}

	// Take top k
	if len(filtered) > k {
		filtered = filtered[:k]
	}

	results := make([]SearchResult, 0, len(filtered))
	for _, f := range filtered {
		e := idx.Entries[f.ID]
		var meta map[string]any
		if e != nil {
			meta = e.Meta
		}
		// Convert squared L2 to sqrt for display if L2? Spec says take root only for final reported.
		d := f.Dist
		if idx.Opts.Metric == core.MetricL2 {
			d = sqrt32(d)
		}
		results = append(results, SearchResult{ID: f.ID, Distance: d, Meta: meta})
	}

	return &SearchResponse{Results: results, Visited: visited, Mode: mode}, nil
}

func sqrt32(x float32) float32 { return float32(math.Sqrt(float64(x))) }

// Insert adds a single vector (for API).
func (idx *Index) InsertItem(item Item) error {
	if len(item.Vec) != idx.Dim {
		return fmt.Errorf("vector length %d != dim %d", len(item.Vec), idx.Dim)
	}
	if err := core.CheckFinite(item.Vec); err != nil {
		return err
	}
	if _, exists := idx.Entries[item.ID]; exists {
		return fmt.Errorf("id %d already exists", item.ID)
	}
	vec := make([]float32, idx.Dim)
	copy(vec, item.Vec)
	if idx.Opts.Metric == core.MetricCosine {
		vec = core.Normalize(vec)
	}
	var code []byte
	if idx.PQ != nil {
		code = idx.PQ.Encode(vec)
	}
	e := &Entry{ID: item.ID, Vec: vec, Code: code, Meta: item.Meta}
	idx.Entries[item.ID] = e
	layer := idx.randomLayer()
	distFn := func(aID, bID uint64) float32 {
		ea := idx.Entries[aID]
		eb := idx.Entries[bID]
		if ea == nil || eb == nil {
			return 1e30
		}
		return core.Distance(ea.Vec, eb.Vec, idx.Opts.Metric)
	}
	idx.Graph.Insert(item.ID, layer, distFn)
	idx.computeProjection() // recompute? Could be expensive; for API we keep existing Proj unless we want to update incrementally.
	return nil
}

// Delete marks id as deleted.
func (idx *Index) Delete(id uint64) bool {
	if _, ok := idx.Entries[id]; !ok {
		return false
	}
	ok := idx.Graph.Delete(id)
	// also remove from Entries? Keep for rerank? But for stats count we should count live only.
	// Keep entry but graph deleted flag hides it.
	return ok
}

// CountLive returns live count.
func (idx *Index) CountLive() int {
	c := 0
	for id := range idx.Entries {
		n := idx.Graph.Get(id)
		if n != nil && n.Deleted {
			continue
		}
		c++
	}
	if c == 0 && len(idx.Entries) > 0 {
		// fallback if graph not yet populated? Should not happen
		return len(idx.Entries)
	}
	return c
}

// MemoryBytes estimates memory.
func (idx *Index) MemoryBytes() int {
	// edges + vectors + codes
	edges := 0
	for _, n := range idx.Graph.Nodes {
		for _, lst := range n.Neighbors {
			edges += len(lst)
		}
	}
	vecBytes := len(idx.Entries) * idx.Dim * 4
	codeBytes := 0
	if idx.PQ != nil {
		codeBytes = len(idx.Entries) * idx.PQ.M
	}
	edgeBytes := edges * 8
	return vecBytes + codeBytes + edgeBytes
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
