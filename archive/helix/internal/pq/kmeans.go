package pq

import (
	"math"
	"sort"

	"github.com/Userfrom1995/Random/helix/internal/core"
)

// KMeans runs deterministic k-means with k-means++ init.
// data is T x Ds, returns K centroids each Ds.
func KMeans(data [][]float32, K int, maxIter int, rng *core.RNG) [][]float32 {
	T := len(data)
	if T == 0 || K <= 0 {
		return nil
	}
	Ds := len(data[0])
	if K > T {
		K = T
	}
	// init centroids via k-means++
	centroids := kmeansPlusPlus(data, K, rng)
	assign := make([]int, T)

	for iter := 0; iter < maxIter; iter++ {
		changed := false
		// assignment
		for i, p := range data {
			best := 0
			bestDist := l2Sq(p, centroids[0])
			for k := 1; k < K; k++ {
				d := l2Sq(p, centroids[k])
				if d < bestDist || (d == bestDist && k < best) {
					bestDist = d
					best = k
				}
			}
			if assign[i] != best {
				// for first iteration assign is 0 initially, but we need to detect changes after first full assign
			}
			assign[i] = best
			_ = changed
		}
		// recompute centroids
		newCentroids := make([][]float32, K)
		counts := make([]int, K)
		for k := 0; k < K; k++ {
			newCentroids[k] = make([]float32, Ds)
		}
		for i, p := range data {
			k := assign[i]
			counts[k]++
			for d := 0; d < Ds; d++ {
				newCentroids[k][d] += p[d]
			}
		}
		for k := 0; k < K; k++ {
			if counts[k] == 0 {
				// keep old centroid if empty cluster
				copy(newCentroids[k], centroids[k])
				continue
			}
			for d := 0; d < Ds; d++ {
				newCentroids[k][d] /= float32(counts[k])
			}
		}
		// check convergence
		maxShift := float32(0)
		for k := 0; k < K; k++ {
			s := l2Sq(centroids[k], newCentroids[k])
			if s > maxShift {
				maxShift = s
			}
		}
		centroids = newCentroids
		if maxShift < 1e-6 {
			break
		}
		_ = changed
	}
	// sort centroids deterministically by first dim then lexicographically for determinism of tie-breaking?
	// Don't sort: order matters for code assignment; keep k-means++ order dependence via rng which is deterministic.
	return centroids
}

func kmeansPlusPlus(data [][]float32, K int, rng *core.RNG) [][]float32 {
	T := len(data)
	centroids := make([][]float32, 0, K)
	// first centroid random
	first := rng.Intn(T)
	c := make([]float32, len(data[first]))
	copy(c, data[first])
	centroids = append(centroids, c)

	distSq := make([]float64, T)
	for {
		if len(centroids) >= K {
			break
		}
		// compute dist to nearest centroid
		var sum float64
		for i, p := range data {
			best := math.MaxFloat64
			for _, cc := range centroids {
				d := float64(l2Sq(p, cc))
				if d < best {
					best = d
				}
			}
			distSq[i] = best
			sum += best
		}
		if sum == 0 {
			// all points are centroids, pick random remaining
			idx := rng.Intn(T)
			nc := make([]float32, len(data[idx]))
			copy(nc, data[idx])
			centroids = append(centroids, nc)
			continue
		}
		r := rng.Float64() * sum
		cum := 0.0
		chosen := T - 1
		for i, d := range distSq {
			cum += d
			if cum >= r {
				chosen = i
				break
			}
		}
		nc := make([]float32, len(data[chosen]))
		copy(nc, data[chosen])
		centroids = append(centroids, nc)
	}
	// Ensure deterministic centroid tie order? Sort by a hash to make deterministic if needed? No, keep order.
	// But to avoid non-determinism from map iteration we already don't use maps.
	return centroids
}

func l2Sq(a, b []float32) float32 {
	var s float64
	for i := range a {
		d := float64(a[i] - b[i])
		s += d * d
	}
	return float32(s)
}

// For determinism helpers: sort data indices if needed, not here.

var _ = sort.Slice // ensure import used
