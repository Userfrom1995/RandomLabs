package hnsw

// Node is a graph node.
type Node struct {
	ID        uint64
	Layer     int
	Neighbors [][]uint64 // neighbors[l] sorted by id
	Deleted   bool
}

// NewNode creates a node with top layer l.
func NewNode(id uint64, layer int) *Node {
	return &Node{
		ID:        id,
		Layer:     layer,
		Neighbors: make([][]uint64, layer+1),
	}
}

func sortedInsert(s []uint64, v uint64) []uint64 {
	// insert keeping sorted ascending, no duplicate
	for i, x := range s {
		if x == v {
			return s
		}
		if x > v {
			out := make([]uint64, len(s)+1)
			copy(out, s[:i])
			out[i] = v
			copy(out[i+1:], s[i:])
			return out
		}
	}
	return append(s, v)
}

func removeSorted(s []uint64, v uint64) []uint64 {
	for i, x := range s {
		if x == v {
			out := make([]uint64, len(s)-1)
			copy(out, s[:i])
			copy(out[i:], s[i+1:])
			return out
		}
		if x > v {
			break
		}
	}
	return s
}
