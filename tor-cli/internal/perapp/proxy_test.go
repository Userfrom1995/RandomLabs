package perapp

import (
	"runtime"
	"strings"
	"testing"
)

func TestProxyURLUsesSocks5h(t *testing.T) {
	u := ProxyURL("127.0.0.1:9050")
	if u != "socks5h://127.0.0.1:9050" {
		t.Fatalf("ProxyURL = %q, want socks5h scheme (remote DNS)", u)
	}
}

func TestProxyEnvDedupesShadowKeys(t *testing.T) {
	base := []string{
		"PATH=/usr/bin",
		"ALL_PROXY=http://evil:8080",
		"http_proxy=http://evil:8080",
		"TORSHIM_ACTIVE=0",
		"HOME=/root",
	}
	env := ProxyEnv(base, "127.0.0.1:9050")
	count := map[string]int{}
	for _, kv := range env {
		k := kv
		if i := strings.Index(kv, "="); i >= 0 {
			k = kv[:i]
		}
		count[k]++
	}
	for _, k := range proxyKeys {
		if count[k] != 1 {
			t.Fatalf("key %s appears %d times, want exactly 1 (duplicate would shadow socks5h)", k, count[k])
		}
	}
	for _, kv := range env {
		if strings.HasPrefix(kv, "ALL_PROXY=") && strings.Contains(kv, "evil") {
			t.Fatalf("stale parent proxy survived: %q", kv)
		}
	}
	found := false
	for _, kv := range env {
		if kv == "ALL_PROXY=socks5h://127.0.0.1:9050" {
			found = true
		}
	}
	if !found {
		t.Fatalf("socks5h ALL_PROXY missing in %q", env)
	}
}

func TestProxyEnvExtraKeysFiltered(t *testing.T) {
	// Simulates main.go appending caller extras: owned keys dropped.
	env := ProxyEnv([]string{"A=1"}, "127.0.0.1:9050")
	extras := []string{"B=2", "ALL_PROXY=http://evil:1", "TORSHIM_SOCKS=x"}
	out := append(append([]string{}, env...), func() []string {
		var kept []string
		for _, kv := range extras {
			if proxyOwned(envKey(kv)) {
				continue
			}
			kept = append(kept, kv)
		}
		return kept
	}()...)
	seen := 0
	for _, kv := range out {
		if strings.HasPrefix(kv, "ALL_PROXY=") {
			seen++
			if strings.Contains(kv, "evil") {
				t.Fatalf("evil extra survived: %q", kv)
			}
		}
	}
	if seen != 1 {
		t.Fatalf("ALL_PROXY appears %d times, want 1", seen)
	}
}

func TestCoverageNoteHonest(t *testing.T) {
	n := CoverageNote()
	for _, want := range []string{"proxy environment", "socks5h", "only apps that honor", "UDP/ICMP"} {
		if !strings.Contains(n, want) {
			t.Fatalf("coverage note missing %q: %q", want, n)
		}
	}
}

func TestNeedsProxyMatchesGOOS(t *testing.T) {
	if (runtime.GOOS != "linux") != NeedsProxy() {
		t.Fatalf("NeedsProxy=%v inconsistent with GOOS=%s", NeedsProxy(), runtime.GOOS)
	}
}

func TestRunProxyEmptyFailsClosed(t *testing.T) {
	if _, err := RunProxy("127.0.0.1:9050", nil, nil); err == nil {
		t.Fatalf("RunProxy(nil) must fail closed")
	}
	if _, err := RunProxy("", []string{"true"}, nil); err == nil {
		t.Fatalf("RunProxy(empty socks) must fail closed")
	}
	if _, err := RunProxy("127.0.0.1:9050", []string{"torshim-definitely-not-on-path-xyz"}, nil); err == nil {
		t.Fatalf("RunProxy(missing bin) must fail closed")
	}
}
