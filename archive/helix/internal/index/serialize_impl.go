package index

import (
	"github.com/Userfrom1995/Random/helix/internal/core"
	"github.com/Userfrom1995/Random/helix/internal/hnsw"
	"github.com/Userfrom1995/Random/helix/internal/pq"
)

func loadImpl(si *serializedIndex) (*Index, error) {
	rng := core.NewRNG(si.Opts.Seed)
	graph := hnsw.NewGraph(si.Opts.M, si.Opts.Mmax, si.Opts.Mmax0, si.Opts.EfConstruction, si.Opts.Metric, rng)
	graph.EntryPoint = si.EP
	graph.TopLayer = si.Top
	idx := &Index{
		Dim:     si.Dim,
		Graph:   graph,
		Opts:    si.Opts,
		Entries: make(map[uint64]*Entry, len(si.Entries)),
		Rng:     rng,
		Proj:    si.Proj,
	}
	if si.PQ != nil {
		pqo := pq.NewPQ(si.PQ.Dim, si.PQ.M, si.PQ.K, si.PQ.Rotation)
		pqo.Codebooks = si.PQ.Codebooks
		pqo.Ds = si.PQ.Ds
		idx.PQ = pqo
	}
	for _, se := range si.Entries {
		idx.Entries[se.ID] = &Entry{ID: se.ID, Vec: se.Vec, Code: se.Code, Meta: se.Meta}
	}
	for _, sn := range si.Nodes {
		n := hnsw.NewNode(sn.ID, sn.Layer)
		n.Neighbors = sn.Neighbors
		n.Deleted = sn.Deleted
		graph.Nodes[sn.ID] = n
	}
	// If projection missing, recompute
	if idx.Proj[0] == nil {
		idx.computeProjection()
	}
	return idx, nil
}
