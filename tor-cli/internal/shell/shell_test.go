package shell

import (
	"strings"
	"testing"
)

func TestBannerStatesCoverageAndGaps(t *testing.T) {
	b := Banner(Config{SocksAddr: "127.0.0.1:19050", LibPath: "/lib/libtorsocks.so"})
	for _, want := range []string{
		"127.0.0.1:19050",
		"torsocks",
		"NOT covered",
		"Static",   // static binaries (case-insensitive check below)
		"sudo",     // env-scrub warning
		"Parent shell untouched",
	} {
		if !strings.Contains(strings.ToLower(b), strings.ToLower(want)) {
			t.Errorf("banner missing %q:\n%s", want, b)
		}
	}
}

func TestBannerProxyMode(t *testing.T) {
	b := Banner(Config{SocksAddr: "127.0.0.1:19050"})
	if !strings.Contains(b, "proxy environment") {
		t.Errorf("proxy-mode banner must say so:\n%s", b)
	}
}

func TestResolveShell(t *testing.T) {
	t.Setenv("SHELL", "/bin/zsh")
	if got := ResolveShell(); got != "/bin/zsh" {
		t.Fatalf("got %q", got)
	}
}

func TestEnvironDedupsOwnedKeys(t *testing.T) {
	// Regression: a parent LD_PRELOAD (or stale TORSHIM_*/proxy/PS1 value)
	// must not survive into the child shell where getenv would prefer it
	// over the shim, contradicting the coverage banner.
	base := []string{
		"PATH=/usr/bin",
		"LD_PRELOAD=/tmp/evil.so",
		"TORSOCKS_CONF_FILE=/tmp/evil.conf",
		"TORSHIM_ACTIVE=0",
		"TORSHIM_SOCKS=127.0.0.1:1",
		"TORSHIM_FUTURE=x",
		"ALL_PROXY=http://evil:8080",
		"PS1=parent$ ",
	}
	cfg := Config{SocksAddr: "127.0.0.1:19050", LibPath: "/lib/libtorsocks.so", ConfPath: "/tmp/c.conf"}
	env := Environ(base, cfg)
	seen := map[string]int{}
	for _, kv := range env {
		k := kv
		if i := strings.Index(kv, "="); i >= 0 {
			k = kv[:i]
		}
		seen[k]++
	}
	for _, k := range []string{
		"LD_PRELOAD", "TORSOCKS_CONF_FILE", "TORSOCKS_ISOLATE_PID",
		"TORSHIM_ACTIVE", "TORSHIM_SOCKS", "PS1",
	} {
		if seen[k] != 1 {
			t.Fatalf("env has %d entries for %s, want exactly 1:\n%v", seen[k], k, env)
		}
	}
	joined := strings.Join(env, "\n")
	for _, want := range []string{
		"LD_PRELOAD=/lib/libtorsocks.so",
		"TORSOCKS_CONF_FILE=/tmp/c.conf",
		"TORSHIM_ACTIVE=1",
		"TORSHIM_SOCKS=127.0.0.1:19050",
		"PS1=[torshim] parent$ ",
		"PATH=/usr/bin",
	} {
		if !strings.Contains(joined, want) {
			t.Errorf("env missing %q", want)
		}
	}
	if strings.Contains(joined, "/tmp/evil") || strings.Contains(joined, "evil:8080") {
		t.Errorf("parent shim values leaked into child env:\n%s", joined)
	}
}
