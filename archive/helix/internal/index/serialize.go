package index

import (
	"encoding/json"
	"os"
	"sort"
)

type serializedIndex struct {
	Version int           `json:"version"`
	Dim     int           `json:"dim"`
	Opts    Options       `json:"opts"`
	Entries []serialEntry `json:"entries"`
	Nodes   []serialNode  `json:"nodes"`
	EP      uint64        `json:"entryPoint"`
	Top     int           `json:"topLayer"`
	PQ      *serialPQ     `json:"pq,omitempty"`
	Proj    [2][]float32  `json:"proj"`
}

type serialEntry struct {
	ID   uint64         `json:"id"`
	Vec  []float32      `json:"vec"`
	Code []byte         `json:"code,omitempty"`
	Meta map[string]any `json:"meta,omitempty"`
}

type serialNode struct {
	ID        uint64     `json:"id"`
	Layer     int        `json:"layer"`
	Neighbors [][]uint64 `json:"neighbors"`
	Deleted   bool       `json:"deleted"`
}

type serialPQ struct {
	M         int           `json:"m"`
	K         int           `json:"k"`
	Ds        int           `json:"ds"`
	Dim       int           `json:"dim"`
	Codebooks [][][]float32 `json:"codebooks"`
	Rotation  []float32     `json:"rotation"`
}

// Save writes index to JSON file.
func (idx *Index) Save(path string) error {
	si := serializedIndex{
		Version: 1,
		Dim:     idx.Dim,
		Opts:    idx.Opts,
		EP:      idx.Graph.EntryPoint,
		Top:     idx.Graph.TopLayer,
		Proj:    idx.Proj,
	}
	ids := make([]uint64, 0, len(idx.Entries))
	for id := range idx.Entries {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	for _, id := range ids {
		e := idx.Entries[id]
		si.Entries = append(si.Entries, serialEntry{ID: e.ID, Vec: e.Vec, Code: e.Code, Meta: e.Meta})
		n := idx.Graph.Get(id)
		if n != nil {
			si.Nodes = append(si.Nodes, serialNode{ID: n.ID, Layer: n.Layer, Neighbors: n.Neighbors, Deleted: n.Deleted})
		} else {
			si.Nodes = append(si.Nodes, serialNode{ID: id, Layer: 0, Neighbors: nil, Deleted: false})
		}
	}
	if idx.PQ != nil {
		si.PQ = &serialPQ{M: idx.PQ.M, K: idx.PQ.K, Ds: idx.PQ.Ds, Dim: idx.PQ.Dim, Codebooks: idx.PQ.Codebooks, Rotation: idx.PQ.Rotation}
	}
	data, err := json.MarshalIndent(si, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// Load reads index from JSON file.
func Load(path string) (*Index, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var si serializedIndex
	if err := json.Unmarshal(data, &si); err != nil {
		return nil, err
	}
	return loadFromSerial(&si)
}

func loadFromSerial(si *serializedIndex) (*Index, error) {
	// deferred to avoid import cycle: implement here with full imports
	return loadImpl(si)
}
