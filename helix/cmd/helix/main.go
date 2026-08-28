package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"time"

	"github.com/Userfrom1995/Random/helix/api"
	"github.com/Userfrom1995/Random/helix/internal/core"
	"github.com/Userfrom1995/Random/helix/internal/index"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}
	cmd := os.Args[1]
	switch cmd {
	case "build":
		doBuild()
	case "search":
		doSearch()
	case "serve":
		doServe()
	case "bench":
		doBench()
	case "help", "--help", "-h":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", cmd)
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Print(`helix - Helix vector search engine

Usage:
  helix build --dim D --in items.json --out index.json [--seed 42 --m 16 --ef 200 --pq --pqm 8 --opq]
  helix search --index index.json --vector "[0.1,0.2,...]" --k 10 --ef 64 --mode pq
  helix serve --index index.json --port 8080
  helix bench --index index.json [--out report.json]
`)
}

func doBuild() {
	// args: --dim, --in, --out, --seed, --m, --ef, --pq, --pqm, --opq, --metric
	fs := parseFlags(os.Args[2:])
	dim := fs.intVal("dim", 0)
	in := fs.strVal("in", "")
	out := fs.strVal("out", "index.json")
	seed := uint64(fs.intVal("seed", 42))
	m := fs.intVal("m", 16)
	ef := fs.intVal("ef", 200)
	pqEnabled := fs.boolVal("pq", false)
	pqm := fs.intVal("pqm", 8)
	opq := fs.boolVal("opq", true)
	metricStr := fs.strVal("metric", "l2")

	if dim == 0 {
		fmt.Fprintln(os.Stderr, "--dim required")
		os.Exit(1)
	}
	if in == "" {
		fmt.Fprintln(os.Stderr, "--in required")
		os.Exit(1)
	}
	metric, err := core.ParseMetric(metricStr)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	data, err := os.ReadFile(in)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	var raw []struct {
		ID     uint64         `json:"id"`
		Vector []float32      `json:"vector"`
		Meta   map[string]any `json:"meta"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		// try items wrapper
		var wrap struct {
			Items []struct {
				ID     uint64         `json:"id"`
				Vector []float32      `json:"vector"`
				Meta   map[string]any `json:"meta"`
			} `json:"items"`
		}
		if err2 := json.Unmarshal(data, &wrap); err2 != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		raw = make([]struct {
			ID     uint64         `json:"id"`
			Vector []float32      `json:"vector"`
			Meta   map[string]any `json:"meta"`
		}, len(wrap.Items))
		for i, it := range wrap.Items {
			raw[i].ID = it.ID
			raw[i].Vector = it.Vector
			raw[i].Meta = it.Meta
		}
	}
	items := make([]index.Item, len(raw))
	for i, r := range raw {
		items[i] = index.Item{ID: r.ID, Vec: r.Vector, Meta: r.Meta}
	}
	opts := index.Options{
		Dim: dim, M: m, Mmax: m, Mmax0: 2 * m, EfConstruction: ef, Metric: metric, Seed: seed,
		PqEnabled: pqEnabled, PqM: pqm, PqK: 256, Opq: opq, PqRerank: true,
	}
	idx, err := index.Build(opts, items)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := idx.Save(out); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("built index: %d items, dim=%d, pq=%v -> %s\n", len(items), dim, pqEnabled, out)
}

func doSearch() {
	fs := parseFlags(os.Args[2:])
	idxPath := fs.strVal("index", "index.json")
	vecStr := fs.strVal("vector", "")
	k := fs.intVal("k", 10)
	ef := fs.intVal("ef", 0)
	mode := fs.strVal("mode", "exact")
	if idxPath == "" || vecStr == "" {
		fmt.Fprintln(os.Stderr, "--index and --vector required")
		os.Exit(1)
	}
	var vec []float32
	if err := json.Unmarshal([]byte(vecStr), &vec); err != nil {
		fmt.Fprintln(os.Stderr, "invalid vector json:", err)
		os.Exit(1)
	}
	idx, err := index.Load(idxPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	res, err := idx.Search(vec, k, ef, mode)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.Encode(res)
}

func doServe() {
	fs := parseFlags(os.Args[2:])
	idxPath := fs.strVal("index", "")
	port := fs.intVal("port", 8080)
	var idx *index.Index
	var err error
	if idxPath != "" {
		idx, err = index.Load(idxPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	} else {
		// empty index dim 8 for demo
		idx, err = index.Build(index.Options{Dim: 8, M: 16, Mmax: 16, Mmax0: 32, EfConstruction: 200, Metric: core.MetricL2, Seed: 42}, nil)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	}
	srv := api.New(idx)
	addr := fmt.Sprintf(":%d", port)
	fmt.Printf("Helix serving on http://localhost%s (index: %d vectors)\n", addr, idx.CountLive())
	// serve UI files if present
	// also mount helix/ui directory via additional handler is handled by static file fallback in http
	// Use net/http ListenAndServe
	if err := httpListen(addr, srv); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func httpListen(addr string, handler http.Handler) error {
	// import net/http lazily via function that uses it to avoid top-level import cycle? we already need it but not imported.
	// Do dynamic import via extra file.
	return listenImpl(addr, handler)
}

func doBench() {
	fs := parseFlags(os.Args[2:])
	idxPath := fs.strVal("index", "")
	out := fs.strVal("out", "")
	var idx *index.Index
	var err error
	if idxPath != "" {
		idx, err = index.Load(idxPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	} else {
		// build synthetic bench index: N=2000, D=32 for quick bench
		idx = buildSynthetic(2000, 32, 42)
	}
	report := runBench(idx)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.Encode(report)
	if out != "" {
		data, _ := json.MarshalIndent(report, "", "  ")
		os.WriteFile(out, data, 0644)
	}
}

func buildSynthetic(N, D int, seed uint64) *index.Index {
	rng := core.NewRNG(seed)
	items := make([]index.Item, N)
	for i := 0; i < N; i++ {
		vec := make([]float32, D)
		for d := 0; d < D; d++ {
			vec[d] = float32(rng.NormFloat64())
		}
		items[i] = index.Item{ID: uint64(i + 1), Vec: vec}
	}
	opts := index.Options{Dim: D, M: 16, Mmax: 16, Mmax0: 32, EfConstruction: 100, Metric: core.MetricL2, Seed: seed}
	idx, _ := index.Build(opts, items)
	return idx
}

func runBench(idx *index.Index) map[string]any {
	// Recall@10 vs ef curve, latency, etc.
	// Generate 50 queries sampled from index vectors with small noise
	rng := core.NewRNG(999)
	ids := make([]uint64, 0, len(idx.Entries))
	for id := range idx.Entries {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	queries := make([][]float32, 50)
	for i := range queries {
		id := ids[rng.Intn(len(ids))]
		base := idx.Entries[id].Vec
		q := make([]float32, len(base))
		for d := range base {
			q[d] = base[d] + float32(rng.NormFloat64()*0.01)
		}
		queries[i] = q
	}
	// Ground truth via brute force
	// ef values
	efs := []int{10, 20, 40, 80, 160, 320}
	recalls := make([]float64, len(efs))
	for ei, ef := range efs {
		var sum float64
		for _, q := range queries {
			// brute force top 10
			truth := bruteForce(idx, q, 10)
			res, _ := idx.Search(q, 10, ef, "exact")
			hit := 0
			truthSet := make(map[uint64]bool, len(truth))
			for _, id := range truth {
				truthSet[id] = true
			}
			for _, r := range res.Results {
				if truthSet[r.ID] {
					hit++
				}
			}
			sum += float64(hit) / 10.0
		}
		recalls[ei] = sum / float64(len(queries))
	}
	// Latency
	k := 10
	ef := 80
	start := time.Now()
	for _, q := range queries {
		idx.Search(q, k, ef, "exact")
	}
	elapsed := time.Since(start)
	avgMs := float64(elapsed.Microseconds()) / float64(len(queries)) / 1000.0

	// PQ distortion if applicable
	distortion := map[string]any{"pqEnabled": idx.PQ != nil}
	if idx.PQ != nil {
		data := make([][]float32, 0, len(idx.Entries))
		for _, e := range idx.Entries {
			data = append(data, e.Vec)
		}
		distortion["mse"] = idx.PQ.Distortion(data)
	}

	return map[string]any{
		"index":            map[string]any{"count": idx.CountLive(), "dim": idx.Dim, "layers": idx.Graph.Layers()},
		"recallAt10_vs_ef": map[string]any{"efs": efs, "recalls": recalls},
		"latency":          map[string]any{"avgMs": avgMs, "qps": 1000.0 / avgMs * 1.0},
		"distortion":       distortion,
		"determinism":      "pass if second build identical (checked via go test)",
	}
}

func bruteForce(idx *index.Index, q []float32, k int) []uint64 {
	type pair struct {
		id uint64
		d  float32
	}
	var list []pair
	for id, e := range idx.Entries {
		n := idx.Graph.Get(id)
		if n != nil && n.Deleted {
			continue
		}
		d := core.Distance(q, e.Vec, idx.Opts.Metric)
		list = append(list, pair{id, d})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].d < list[j].d })
	if len(list) > k {
		list = list[:k]
	}
	out := make([]uint64, len(list))
	for i, p := range list {
		out[i] = p.id
	}
	return out
}

// flag parsing helpers

type flagSet map[string]string

func parseFlags(args []string) flagSet {
	m := make(flagSet)
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if !isFlag(arg) {
			continue
		}
		key := trimFlag(arg)
		val := "true"
		if i+1 < len(args) && !isFlag(args[i+1]) {
			val = args[i+1]
			i++
		} else if eqIdx := indexOf(arg, "="); eqIdx >= 0 {
			parts := splitFlag(arg)
			key = parts[0]
			val = parts[1]
		}
		m[key] = val
	}
	return m
}

func isFlag(s string) bool { return len(s) > 2 && s[0] == '-' && s[1] == '-' }
func trimFlag(s string) string {
	s = s[2:]
	if idx := indexOf(s, "="); idx >= 0 {
		return s[:idx]
	}
	return s
}
func splitFlag(s string) []string {
	s = s[2:]
	idx := indexOf(s, "=")
	if idx < 0 {
		return []string{s, "true"}
	}
	return []string{s[:idx], s[idx+1:]}
}
func indexOf(s, sub string) int {
	for i := 0; i < len(s)-len(sub)+1; i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func (fs flagSet) strVal(key, def string) string {
	if v, ok := fs[key]; ok {
		return v
	}
	return def
}
func (fs flagSet) intVal(key string, def int) int {
	if v, ok := fs[key]; ok {
		var x int
		fmt.Sscanf(v, "%d", &x)
		return x
	}
	return def
}
func (fs flagSet) boolVal(key string, def bool) bool {
	if v, ok := fs[key]; ok {
		return v == "true" || v == "1" || v == "yes"
	}
	return def
}
