package index

import (
	"sort"

	"github.com/Userfrom1995/Random/helix/internal/core"
)

// ProjectedPoint for API.
type ProjectedPoint struct {
	ID   uint64         `json:"id"`
	X    float32        `json:"x"`
	Y    float32        `json:"y"`
	Meta map[string]any `json:"meta,omitempty"`
}

func (idx *Index) computeProjection() {
	if idx.Dim == 0 || len(idx.Entries) == 0 {
		idx.Proj[0] = nil
		idx.Proj[1] = nil
		return
	}
	// Deterministic random Gaussian projection: D x 2 matrix
	// Use a derived RNG seeded from index seed + 0x9E3779...
	projRng := core.NewRNG(idx.Opts.Seed ^ 0x9E3779B97F4A7C15)
	mat := make([]float32, idx.Dim*2)
	for i := range mat {
		mat[i] = float32(projRng.NormFloat64() * (1.0 / float64(idx.Dim)))
	}
	// mat is D rows, 2 cols? We produce two basis vectors of length Dim
	b0 := make([]float32, idx.Dim)
	b1 := make([]float32, idx.Dim)
	for d := 0; d < idx.Dim; d++ {
		b0[d] = mat[d*2+0]
		b1[d] = mat[d*2+1]
	}
	idx.Proj[0] = b0
	idx.Proj[1] = b1
}

// Projection returns 2D points for all live entries sorted by ID.
func (idx *Index) Projection() []ProjectedPoint {
	ids := make([]uint64, 0, len(idx.Entries))
	for id := range idx.Entries {
		n := idx.Graph.Get(id)
		if n != nil && n.Deleted {
			continue
		}
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	out := make([]ProjectedPoint, 0, len(ids))
	for _, id := range ids {
		e := idx.Entries[id]
		var x, y float32
		if idx.Proj[0] != nil && idx.Proj[1] != nil && e != nil {
			var sx, sy float64
			for d := 0; d < idx.Dim; d++ {
				sx += float64(e.Vec[d]) * float64(idx.Proj[0][d])
				sy += float64(e.Vec[d]) * float64(idx.Proj[1][d])
			}
			x = float32(sx)
			y = float32(sy)
		}
		out = append(out, ProjectedPoint{ID: id, X: x, Y: y, Meta: e.Meta})
	}
	return out
}
