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
