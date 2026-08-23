package core

import (
	"fmt"
	"math"
)

// Vector is a dense float32 vector.
type Vector []float32

// Metric selects the distance function.
type Metric int

const (
	MetricL2 Metric = iota
	MetricIP
	MetricCosine
)

func ParseMetric(s string) (Metric, error) {
	switch s {
	case "", "l2", "L2":
		return MetricL2, nil
	case "ip", "IP", "inner":
		return MetricIP, nil
	case "cosine", "cos":
		return MetricCosine, nil
	default:
		return MetricL2, fmt.Errorf("unknown metric %q (use l2, ip, cosine)", s)
	}
}

func (m Metric) String() string {
	switch m {
	case MetricL2:
		return "l2"
	case MetricIP:
		return "ip"
	case MetricCosine:
		return "cosine"
	default:
		return "l2"
	}
}

// CheckFinite returns error if any component is NaN or Inf.
func CheckFinite(v []float32) error {
	for i, x := range v {
		if math.IsNaN(float64(x)) || math.IsInf(float64(x), 0) {
			return fmt.Errorf("vector component %d is non-finite (%v)", i, x)
		}
	}
	return nil
}

// L2Squared returns squared Euclidean distance.
func L2Squared(a, b []float32) float32 {
	var s float64
	for i := range a {
		d := float64(a[i] - b[i])
		s += d * d
	}
	return float32(s)
}

// IPSimilarity returns inner product.
func IPSimilarity(a, b []float32) float32 {
	var s float64
	for i := range a {
		s += float64(a[i]) * float64(b[i])
	}
	return float32(s)
}

// IPDistance returns negated inner product so smaller = more similar.
func IPDistance(a, b []float32) float32 {
	return -IPSimilarity(a, b)
}

// CosineDistance returns 1 - cosine similarity (smaller = more similar).
// Vectors are assumed normalized if using cosine; otherwise computed on the fly.
func CosineDistance(a, b []float32) float32 {
	var dot, na, nb float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		na += float64(a[i]) * float64(a[i])
		nb += float64(b[i]) * float64(b[i])
	}
	if na == 0 || nb == 0 {
		return 1
	}
	den := math.Sqrt(na) * math.Sqrt(nb)
	return float32(1 - dot/den)
}

// Distance dispatches by metric.
func Distance(a, b []float32, m Metric) float32 {
	switch m {
	case MetricIP:
		return IPDistance(a, b)
	case MetricCosine:
		return CosineDistance(a, b)
	default:
		return L2Squared(a, b)
	}
}

// Normalize returns L2-normalized copy.
func Normalize(v []float32) []float32 {
	var s float64
	for _, x := range v {
		s += float64(x) * float64(x)
	}
	n := math.Sqrt(s)
	if n == 0 {
		out := make([]float32, len(v))
		copy(out, v)
		return out
	}
	out := make([]float32, len(v))
	for i, x := range v {
		out[i] = float32(float64(x) / n)
	}
	return out
}

// NormalizeInPlace normalizes slice in place.
func NormalizeInPlace(v []float32) {
	var s float64
	for _, x := range v {
		s += float64(x) * float64(x)
	}
	n := math.Sqrt(s)
	if n == 0 {
		return
	}
	for i := range v {
		v[i] = float32(float64(v[i]) / n)
	}
}
