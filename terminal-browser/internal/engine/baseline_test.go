package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestClassifyBadProfile(t *testing.T) {
	for _, msg := range []string{
		`invalid profile "../.ssh": want [a-zA-Z0-9_-], max 64 chars`,
		`rejected extra chrome flag "--user-data-dir=/x": flag injection into sidecar transport denied`,
	} {
		if got := ClassifyError(errMsg(msg)); got != "bad_profile" {
			t.Fatalf("%q: got %q want bad_profile", msg, got)
		}
	}
	// Live contract: an invalid profile fails closed with bad_profile.
	// Requires a Chrome binary: without one Navigate fails earlier at
	// Locate with no_chrome, which is also fail-closed and honest.
	if _, err := Locate(); err == nil {
		r := Navigate("https://example.com/", Options{Profile: "../../.ssh", Width: 80})
		if r.Code != "bad_profile" {
			t.Fatalf("invalid profile code: got %q want bad_profile (warning %q)", r.Code, r.Warning)
		}
		if !r.Offline {
			t.Fatalf("invalid profile must fail closed, got %+v", r)
		}
	} else {
		t.Logf("no chrome: live bad_profile path skipped, mapping covered above")
	}
}

func TestTotalIncludesSpawn(t *testing.T) {
	r := OfflineResult("https://example.com/", "offline", "net::ERR_INTERNET_DISCONNECTED")
	if r.Total() != 0 {
		t.Fatalf("unstamped offline result should total 0, got %s", r.Total())
	}
	// Navigate stamps TotalMs from entry on every path, including
	// fail-closed validation errors.
	bad := Navigate("ftp://example.com/x", Options{Width: 80})
	if bad.TotalMs < 0 {
		t.Fatalf("negative total_ms: %d", bad.TotalMs)
	}
	// Validation path returns fast but must still carry the field.
	if bad.TotalMs > 60_000 {
		t.Fatalf("total_ms implausible: %d", bad.TotalMs)
	}
}

func TestSummarizeColdRequiresN(t *testing.T) {
	if _, err := SummarizeCold([]int64{100, 200}); err == nil {
		t.Fatal("N=2 must fail closed, need N>=5")
	}
	st, err := SummarizeCold([]int64{100, 200, 300, 400, 500})
	if err != nil {
		t.Fatalf("N=5: %v", err)
	}
	if st.N != 5 || st.P95Ms != 500 || st.MinMs != 100 || st.MaxMs != 500 {
		t.Fatalf("bad stats: %+v", st)
	}
	if st.MeanMs != 300 {
		t.Fatalf("mean: got %v want 300", st.MeanMs)
	}
}

func TestFixtureManifest(t *testing.T) {
	root := filepath.Join("..", "..")
	manifest, err := os.ReadFile(filepath.Join(root, "tests", "fixtures", "MANIFEST.sha256"))
	if err != nil {
		t.Fatalf("manifest: %v", err)
	}
	for _, line := range strings.Split(string(manifest), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) != 2 {
			t.Fatalf("bad manifest line: %q", line)
		}
		want, rel := parts[0], parts[1]
		body, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(rel)))
		if err != nil {
			t.Fatalf("%s: %v", rel, err)
		}
		sum := sha256.Sum256(body)
		if got := hex.EncodeToString(sum[:]); got != want {
			t.Fatalf("%s: sha256 %s want %s", rel, got, want)
		}
	}
}

// TestLiveBaselineComparison runs the engine head-to-head against the
// raw-fetch incumbent under matched budgets and logs both.
func TestLiveBaselineComparison(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: baseline runs in full mode")
	}
	if _, err := Locate(); err != nil {
		t.Skipf("no chrome: %v", err)
	}
	const target = "https://example.com/"
	base := BaselineFetchMs(target, ColdBudget)
	if base.Offline {
		t.Skipf("incumbent offline: %s", base.Warning)
	}
	res := Navigate(target, Options{Profile: "test-baseline", Lite: true, Width: 80})
	if res.Offline {
		t.Skipf("engine offline: %s", res.Warning)
	}
	t.Logf("head-to-head %s: engine cold=%dms total=%dms rows=%d vs incumbent total=%dms bytes=%d",
		target, res.ColdMs, res.TotalMs, res.RowCount, base.TotalMs, base.Bytes)
	if res.TotalMs < res.ColdMs {
		t.Fatalf("total_ms %d must cover cold_ms %d", res.TotalMs, res.ColdMs)
	}
	// The engine renders through a real sidecar, so it may trail raw
	// fetch; the binding bar is absolute (10 s) plus a generous ratio
	// cap so regressions beyond 10x the incumbent fail.
	if res.Cold() > ColdBudget {
		t.Fatalf("cold %s exceeds binding budget %s", res.Cold(), ColdBudget)
	}
	if float64(res.ColdMs) > float64(base.TotalMs)*10+2000 {
		t.Fatalf("engine cold %dms more than 10x incumbent %dms", res.ColdMs, base.TotalMs)
	}
}

// TestLiveRepeatStats performs N>=5 cold loads and reports mean/p95.
func TestLiveRepeatStats(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: repeat stats run in full mode")
	}
	if _, err := Locate(); err != nil {
		t.Skipf("no chrome: %v", err)
	}
	const target = "https://example.com/"
	const n = 5
	var samples []int64
	for i := 0; i < n; i++ {
		res := Navigate(target, Options{Profile: "test-repeat", Lite: true, Width: 80, Timeout: 30 * time.Second})
		if res.Offline {
			t.Skipf("engine offline on sample %d: %s", i, res.Warning)
		}
		samples = append(samples, res.ColdMs)
		time.Sleep(200 * time.Millisecond)
	}
	st, err := SummarizeCold(samples)
	if err != nil {
		t.Fatalf("stats: %v", err)
	}
	t.Logf("repeat %s N=%d mean=%.1fms p95=%dms min=%dms max=%dms samples=%v",
		target, st.N, st.MeanMs, st.P95Ms, st.MinMs, st.MaxMs, samples)
	if st.P95Ms > ColdBudget.Milliseconds() {
		t.Fatalf("p95 %dms exceeds binding budget %s", st.P95Ms, ColdBudget)
	}
}
