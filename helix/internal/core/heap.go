package core

import "container/heap"

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

// Helpers using container/heap

func HeapPushMin(h *MinHeap, c Candidate) { heap.Push(h, c) }
func HeapPopMin(h *MinHeap) Candidate     { return heap.Pop(h).(Candidate) }
func HeapPushMax(h *MaxHeap, c Candidate) { heap.Push(h, c) }
func HeapPopMax(h *MaxHeap) Candidate     { return heap.Pop(h).(Candidate) }

// BoundedMaxHeap keeps at most cap elements, largest at top, for result set W.
// When size exceeds cap, the farthest is evicted.
type BoundedMaxHeap struct {
	MaxHeap
	Cap int
}

func NewBoundedMaxHeap(cap int) *BoundedMaxHeap {
	return &BoundedMaxHeap{Cap: cap}
}
func (b *BoundedMaxHeap) PushBound(c Candidate) {
	heap.Push((*MaxHeap)(&b.MaxHeap), c)
	if b.Cap > 0 && b.MaxHeap.Len() > b.Cap {
		heap.Pop((*MaxHeap)(&b.MaxHeap))
	}
}
func (b *BoundedMaxHeap) Farthest() Candidate {
	if len(b.MaxHeap) == 0 {
		return Candidate{Dist: float32(1e30)}
	}
	return b.MaxHeap[0]
}
