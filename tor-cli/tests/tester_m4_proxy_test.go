package tests

// Tester M4 hostile black-box + unit suite: cross-platform proxy-env backend
// and packaging behind the common CLI.
//
// Hostile angles (fail-closed first):
//   - ProxyEnv scrubs ALL owned keys (all six proxy spellings + TORSHIM_*),
//     emits socks5h:// on every proxy key, never leaks parent evil values,
//     never duplicates a key (getenv-first-match shadowing), never mutates
//     the caller's base slice.
//   - RunProxy triple fail-closed: empty argv, empty SOCKS, missing binary;
//     absolute-path miss also fails; /bin/true success exits 0.
//   - version reports wrapper 0.3.0-m4 plus platform/per-app/syswide fields
//     with no em dashes and no misleading torsocks unknown off-Linux note.
//   - help/usage is M4-accurate (proxy env on macOS/Windows, tun2socks M5).
//   - disconnect stays idempotent; run without tor stays exit 3.
//   - packaging artifacts exist: Makefile targets + torshim.1 man page.

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/perapp"
)

func countKey(env []string, key string) (int, []string) {
	n := 0
	var vals []string
	for _, kv := range env {
		k := kv
		v := ""
		if i := strings.Index(kv, "="); i >= 0 {
			k, v = kv[:i], kv[i+1:]
		}
		if k == key {
			n++
			vals = append(vals, v)
		}
	}
	return n, vals
}

func TestM4ProxyEnvScrubsAllOwnedKeys(t *testing.T) {
	base := []string{
		"PATH=/usr/bin:/bin",
		"HOME=/root",
		"http_proxy=http://evil:8080",
		"HTTP_PROXY=http://evil:8080",
		"https_proxy=http://evil:8080",
		"HTTPS_PROXY=http://evil:8080",
		"all_proxy=http://evil:8080",
		"ALL_PROXY=http://evil:8080",
		"TORSHIM_ACTIVE=0",
		"TORSHIM_SOCKS=evil:1",
	}
	socks := "127.0.0.1:9050"
	env := perapp.ProxyEnv(base, socks)
	for _, k := range []string{"http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY", "TORSHIM_ACTIVE", "TORSHIM_SOCKS"} {
		n, vals := countKey(env, k)
		if n != 1 {
			t.Fatalf("key %s appears %d times, want exactly 1 (dup would shadow socks5h): %q", k, n, env)
		}
		for _, v := range vals {
			if strings.Contains(v, "evil") {
				t.Fatalf("stale parent value survived in %s=%q", k, v)
			}
		}
	}
	for _, k := range []string{"http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"} {
		_, vals := countKey(env, k)
		if vals[0] != "socks5h://"+socks {
			t.Fatalf("%s=%q, want socks5h://%s (remote DNS binding)", k, vals[0], socks)
		}
	}
	if _, vals := countKey(env, "TORSHIM_ACTIVE"); vals[0] != "1" {
		t.Fatalf("TORSHIM_ACTIVE=%q, want 1", vals[0])
	}
	if _, vals := countKey(env, "TORSHIM_SOCKS"); vals[0] != socks {
		t.Fatalf("TORSHIM_SOCKS=%q, want %q", vals[0], socks)
	}
	// Innocent keys survive untouched.
	if n, _ := countKey(env, "HOME"); n != 1 {
		t.Fatalf("HOME lost in proxy env: %q", env)
	}
}

func TestM4ProxyEnvNeverMutatesBase(t *testing.T) {
	base := []string{"A=1", "ALL_PROXY=http://evil:1"}
	snap := append([]string{}, base...)
	_ = perapp.ProxyEnv(base, "127.0.0.1:9050")
	for i := range base {
		if base[i] != snap[i] {
			t.Fatalf("ProxyEnv mutated caller base: %q vs %q", base, snap)
		}
	}
	empty := perapp.ProxyEnv(nil, "127.0.0.1:9050")
	for _, k := range []string{"http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY", "TORSHIM_ACTIVE", "TORSHIM_SOCKS"} {
		if n, _ := countKey(empty, k); n != 1 {
			t.Fatalf("empty-base env key %s appears %d times, want 1", k, n)
		}
	}
}

func TestM4ProxyURLSchemeBinding(t *testing.T) {
	if got := perapp.ProxyURL("127.0.0.1:9050"); got != "socks5h://127.0.0.1:9050" {
		t.Fatalf("ProxyURL=%q, want socks5h scheme (without h DNS leaks locally)", got)
	}
}

func TestM4RunProxyFailClosedTriple(t *testing.T) {
	if _, err := perapp.RunProxy("127.0.0.1:9050", nil, nil); err == nil {
		t.Fatalf("RunProxy(nil argv) must fail closed")
	}
	if _, err := perapp.RunProxy("127.0.0.1:9050", []string{}, nil); err == nil {
		t.Fatalf("RunProxy(empty argv) must fail closed")
	}
	if _, err := perapp.RunProxy("", []string{"true"}, nil); err == nil {
		t.Fatalf("RunProxy(empty SOCKS) must fail closed")
	}
	if _, err := perapp.RunProxy("127.0.0.1:9050", []string{"torshim-definitely-not-on-path-xyz"}, nil); err == nil {
		t.Fatalf("RunProxy(missing PATH binary) must fail closed")
	}
	if _, err := perapp.RunProxy("127.0.0.1:9050", []string{"/nonexistent-abs-path-xyz-123"}, nil); err == nil {
		t.Fatalf("RunProxy(missing absolute path) must fail closed")
	}
}

func TestM4RunProxyTrueExitsZero(t *testing.T) {
	trueBin, err := exec.LookPath("true")
	if err != nil {
		t.Skip("no true(1) on PATH")
	}
	res, err := perapp.RunProxy("127.0.0.1:9050", []string{trueBin}, nil)
	if err != nil {
		t.Fatalf("RunProxy(true)=%v, want success", err)
	}
	if res.ExitCode != 0 {
		t.Fatalf("RunProxy(true) exit=%d, want 0", res.ExitCode)
	}
}

func TestM4NeedsProxyMatchesGOOS(t *testing.T) {
	if (runtime.GOOS != "linux") != perapp.NeedsProxy() {
		t.Fatalf("NeedsProxy=%v inconsistent with GOOS=%s", perapp.NeedsProxy(), runtime.GOOS)
	}
}

func TestM4CoverageNoteHonest(t *testing.T) {
	n := perapp.CoverageNote()
	for _, want := range []string{"proxy environment", "socks5h", "only apps that honor", "UDP/ICMP"} {
		if !strings.Contains(n, want) {
			t.Fatalf("coverage note missing %q: %q", want, n)
		}
	}
}

func TestM4VersionReportsPlatformSurface(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "version")
	if code != 0 {
		t.Fatalf("version exit=%d, want 0", code)
	}
	for _, want := range []string{"0.3.0-m4", "platform:", "per-app:", "system-wide:"} {
		if !strings.Contains(so, want) {
			t.Fatalf("version missing %q:\n%s", want, so)
		}
	}
	if strings.Contains(so, "—") {
		t.Fatalf("version contains em dash (forbidden):\n%s", so)
	}
	if runtime.GOOS == "linux" {
		if !strings.Contains(so, "torsocks") {
			t.Fatalf("linux version must name torsocks path:\n%s", so)
		}
	}
}

func TestM4HelpNamesProxyAndM5(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "help")
	if code != 0 {
		t.Fatalf("help exit=%d, want 0", code)
	}
	for _, want := range []string{"proxy", "socks5h", "tun2socks", "M5"} {
		if !strings.Contains(so, want) {
			t.Fatalf("help missing %q (M4-accurate usage):\n%s", want, so)
		}
	}
}

func TestM4DisconnectIdempotentAndRunFailClosed(t *testing.T) {
	bin := buildTorshim(t)
	empty := t.TempDir()
	so, _, code := runBin(bin, "disconnect", "--state-dir", empty)
	if code != 0 {
		t.Fatalf("stateless disconnect exit=%d, want 0", code)
	}
	if !strings.Contains(so, "not connected") {
		t.Fatalf("stateless disconnect must say not connected:\n%s", so)
	}
	_, _, code = runBin(bin, "run", "--tor", "/nonexistent-tor-binary-xyz", "--", "/bin/true")
	if code != 3 {
		t.Fatalf("run without tor exit=%d, want 3 (fail-closed not-ready)", code)
	}
}

func TestM4PackagingArtifacts(t *testing.T) {
	mk, err := os.ReadFile(filepath.Join("..", "Makefile"))
	if err != nil {
		t.Fatalf("Makefile missing: %v", err)
	}
	for _, want := range []string{"build:", "test:", "vet:", "cross:", "install:", "uninstall:"} {
		if !strings.Contains(string(mk), want) {
			t.Fatalf("Makefile missing target %q", want)
		}
	}
	man, err := os.ReadFile(filepath.Join("..", "torshim.1"))
	if err != nil {
		t.Fatalf("torshim.1 missing: %v", err)
	}
	for _, want := range []string{"socks5h", "tun2socks"} {
		if !strings.Contains(string(man), want) {
			t.Fatalf("man page missing %q", want)
		}
	}
	if out, err := exec.Command("groff", "-man", "-Tascii", filepath.Join("..", "torshim.1")).CombinedOutput(); err != nil {
		t.Fatalf("torshim.1 groff render failed: %v\n%s", err, out)
	}
}
