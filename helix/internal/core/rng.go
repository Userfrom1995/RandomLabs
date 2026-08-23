package core

import "math"

// RNG is a deterministic seeded RNG (SplitMix64 + xoshiro-like).
// It drives layer assignment, k-means init, and random projection.
type RNG struct {
	state uint64
}

// NewRNG creates a deterministic RNG from seed.
// Seed 0 is mapped to a non-zero constant so it still produces entropy.
func NewRNG(seed uint64) *RNG {
	if seed == 0 {
		seed = 0x9E3779B97F4A7C15
	}
	// SplitMix64 scramble so low seeds diverge quickly.
	seed += 0x9E3779B97F4A7C15
	seed = (seed ^ (seed >> 30)) * 0xBF58476D1CE4E5B9
	seed = (seed ^ (seed >> 27)) * 0x94D049BB133111EB
	seed ^= seed >> 31
	if seed == 0 {
		seed = 1
	}
	return &RNG{state: seed}
}

// Uint64 returns next pseudo-random uint64 (xorshift64*).
func (r *RNG) Uint64() uint64 {
	x := r.state
	x ^= x >> 12
	x ^= x << 25
	x ^= x >> 27
	r.state = x
	return x * 0x2545F4914F6CDD1D
}

// Float64 returns uniform in [0,1).
func (r *RNG) Float64() float64 {
	// 53-bit precision
	return float64(r.Uint64()>>11) * (1.0 / (1 << 53))
}

// Intn returns uniform in [0,n).
func (r *RNG) Intn(n int) int {
	if n <= 0 {
		return 0
	}
	return int(r.Uint64() % uint64(n))
}

// NormFloat64 returns standard normal via Box-Muller (deterministic pair caching).
func (r *RNG) NormFloat64() float64 {
	u1 := r.Float64()
	if u1 < 1e-12 {
		u1 = 1e-12
	}
	u2 := r.Float64()
	return math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
}

// Shuffle shuffles slice deterministically (Fisher-Yates).
func (r *RNG) Shuffle(n int, swap func(i, j int)) {
	for i := n - 1; i > 0; i-- {
		j := r.Intn(i + 1)
		swap(i, j)
	}
}
