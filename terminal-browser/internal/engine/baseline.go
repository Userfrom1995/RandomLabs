// Baseline harness and repeat-run statistics for the Phase 2 binding gate.
//
// The engine never grades itself on an absolute clock alone: every live
// run is compared head-to-head against a raw-fetch incumbent (plain
// net/http GET, the curl time_total equivalent) under matched budgets,
// and repeat runs report mean plus p95 over N>=5 samples.
package engine

import (
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"
)

// BaselineResult is one raw-fetch incumbent sample: wall time plus
// body bytes, the curl time_total plus size_download equivalent.
type BaselineResult struct {
	URL      string `json:"url"`
	TotalMs  int64  `json:"total_ms"`
	Bytes    int64  `json:"bytes"`
	Status   int    `json:"status"`
	Offline  bool   `json:"offline"`
	Warning  string `json:"warning,omitempty"`
}

// BaselineFetchMs performs a plain GET with no rendering and reports
// wall time. It is the incumbent every engine run is compared against.
func BaselineFetchMs(target string, timeout time.Duration) BaselineResult {
	if timeout == 0 {
		timeout = ColdBudget
	}
	if err := ValidateURL(target); err != nil {
		return BaselineResult{URL: target, Offline: true, Warning: err.Error()}
	}
	client := &http.Client{Timeout: timeout}
	start := time.Now()
	resp, err := client.Get(target)
	if err != nil {
		return BaselineResult{URL: target, Offline: true, Warning: err.Error()}
	}
	defer resp.Body.Close()
	n, _ := io.Copy(io.Discard, io.LimitReader(resp.Body, 32<<20))
	ms := time.Since(start).Milliseconds()
	return BaselineResult{URL: target, TotalMs: ms, Bytes: n, Status: resp.StatusCode}
}

// ColdStats summarizes N>=5 cold samples with mean and p95.
type ColdStats struct {
	N      int     `json:"n"`
	MeanMs float64 `json:"mean_ms"`
	P95Ms  int64   `json:"p95_ms"`
	MinMs  int64   `json:"min_ms"`
	MaxMs  int64   `json:"max_ms"`
}

// SummarizeCold computes mean and p95 over cold millisecond samples.
// It requires at least 5 samples; fewer fails closed so N=1 runs can
// never masquerade as statistics.
func SummarizeCold(samples []int64) (ColdStats, error) {
	if len(samples) < 5 {
		return ColdStats{}, fmt.Errorf("need at least 5 samples, got %d", len(samples))
	}
	cp := append([]int64(nil), samples...)
	sort.Slice(cp, func(i, j int) bool { return cp[i] < cp[j] })
	var sum int64
	for _, v := range cp {
		sum += v
	}
	// Nearest-rank p95.
	idx := (95*len(cp) + 99) / 100
	if idx < 1 {
		idx = 1
	}
	if idx > len(cp) {
		idx = len(cp)
	}
	return ColdStats{
		N:      len(cp),
		MeanMs: float64(sum) / float64(len(cp)),
		P95Ms:  cp[idx-1],
		MinMs:  cp[0],
		MaxMs:  cp[len(cp)-1],
	}, nil
}
