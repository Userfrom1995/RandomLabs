package core

// Candidate is an entry in HNSW search heaps.
type Candidate struct {
	ID   uint64
	Dist float32
}

// MaxHeap returns closest first when popped (smallest Dist has highest priority).
// Internally it is a max-heap by negative logic: heap Pop returns the largest
// according to Less, so we invert to get min-heap behavior for candidates.
// We provide both explicit types for clarity.

// MinHeap is a min-heap by Dist (smallest first).
type MinHeap []Candidate

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i].Dist < h[j].Dist }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x any)        { *h = append(*h, x.(Candidate)) }
func (h *MinHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
func (h *MinHeap) Peek() Candidate { return (*h)[0] }

// MaxHeap is a max-heap by Dist (largest first).
type MaxHeap []Candidate

func (h MaxHeap) Len() int           { return len(h) }
func (h MaxHeap) Less(i, j int) bool { return h[i].Dist > h[j].Dist }
func (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MaxHeap) Push(x any)        { *h = append(*h, x.(Candidate)) }
func (h *MaxHeap) Pop() any {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}
func (h *MaxHeap) Peek() Candidate { return (*h)[0] }
