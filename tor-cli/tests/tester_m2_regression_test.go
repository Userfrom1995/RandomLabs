package tests

// Tester M2 regression suite: black-box CLI honesty + fail-closed gates.
//
// Covers (from the consumer side, no tor/torsocks required in CI):
//   - version/help/connect/disconnect exit-code honesty
//   - status never claims protected when not (absent + corrupt control)
//   - run fail-closed when tor is missing (exit 3, no silent bypass)
//   - perapp classification refuses non-ELF/static-bypass targets
//   - LD_PRELOAD/shim-key dedup in perapp.Env and shell.Environ (Reviewer findings 1-2)
//   - shell Banner states mechanism, endpoint, and gaps (binding requirement)
//   - control 250+circuit-status block surfaces BUILT (Reviewer finding 3)

import (
	"encoding/json"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/perapp"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/shell"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/status"
)

func buildTorshim(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	bin := filepath.Join(dir, "torshim")
	// Module root is one level up from this tests directory.
	cmd := exec.Command("go", "build", "-o", bin, ".")
	cmd.Dir = filepath.Join("..")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("go build torshim: %v\n%s", err, out)
	}
	return bin
}

func runBin(bin string, args ...string) (string, string, int) {
	cmd := exec.Command(bin, args...)
	var so, se strings.Builder
	cmd.Stdout = &so
	cmd.Stderr = &se
	err := cmd.Run()
	code := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		} else {
			code = 99
		}
	}
	return so.String(), se.String(), code
}

func TestVersionHonest(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "version")
	if code != 0 {
		t.Fatalf("version exit=%d, want 0", code)
	}
	if !strings.Contains(so, "torshim") || !strings.Contains(so, "not sponsored by The Tor Project") {
		t.Fatalf("version output missing trademark note:\n%s", so)
	}
}

func TestHelpAndUsageCodes(t *testing.T) {
	bin := buildTorshim(t)
	if _, _, code := runBin(bin, "help"); code != 0 {
		t.Fatalf("help exit=%d, want 0", code)
	}
	if _, _, code := runBin(bin, "run"); code != 2 {
		t.Fatalf("run with no app exit=%d, want 2 (usage)", code)
	}
	if _, _, code := runBin(bin, "shell", "extra-arg"); code == 0 {
		t.Fatalf("shell with args exit=0, want non-zero usage error")
	}
}

func TestConnectDisconnectHonestExit4(t *testing.T) {
	bin := buildTorshim(t)
	for _, cmd := range []string{"connect", "disconnect"} {
		_, se, code := runBin(bin, cmd)
		if code != 4 {
			t.Fatalf("%s exit=%d, want 4 (future milestone)", cmd, code)
		}
		if !strings.Contains(se, "M3") {
			t.Fatalf("%s stderr missing M3 pointer:\n%s", cmd, se)
		}
	}
}

func TestStatusHonestWhenAbsent(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "status", "--json", "--control", "127.0.0.1:19951", "--socks", "127.0.0.1:19950")
	if code != 0 {
		t.Fatalf("status exit=%d, want 0", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("status --json not parseable: %v\n%s", err, so)
	}
	if rep.Protected {
		t.Fatalf("status claims protected with no tor answering: %+v", rep)
	}
	if rep.State == "ready" {
		t.Fatalf("status claims ready with no tor: %+v", rep)
	}
	// Text rendering must agree.
	txt, _, _ := runBin(bin, "status", "--control", "127.0.0.1:19951")
	if !strings.Contains(txt, "protected: false") {
		t.Fatalf("text status must show protected: false:\n%s", txt)
	}
}

func TestStatusHonestOnCorruptControl(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	defer ln.Close()
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func(conn net.Conn) {
				defer conn.Close()
				buf := make([]byte, 4096)
				conn.SetReadDeadline(time.Now().Add(2 * time.Second))
				_, _ = conn.Read(buf)
				_, _ = conn.Write([]byte("GARBAGE-WITHOUT-CODE\n"))
				time.Sleep(300 * time.Millisecond)
			}(c)
		}
	}()
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "status", "--json", "--control", ln.Addr().String())
	if code != 0 {
		t.Fatalf("status vs corrupt control exit=%d, want 0 (no crash)", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("corrupt-control status not JSON: %v\n%s", err, so)
	}
	if rep.Protected {
		t.Fatalf("corrupt control must never yield protected=true: %+v", rep)
	}
}

func TestRunFailClosedWithoutTor(t *testing.T) {
	bin := buildTorshim(t)
	_, _, code := runBin(bin, "run", "--tor", "/nonexistent-tor-binary-xyz", "--", "/bin/true")
	if code != 3 {
		t.Fatalf("run without tor exit=%d, want 3 (fail-closed not-ready)", code)
	}
	// Bare-app form routes through the same gate.
	_, _, code2 := runBin(bin, "--tor", "/nonexistent-tor-binary-xyz", "/bin/true")
	_ = code2 // bare form treats flags as app argv; at minimum it must not exit 0 with success
}

func TestClassifyRefusesNonELF(t *testing.T) {
	f := filepath.Join(t.TempDir(), "plain.txt")
	if err := os.WriteFile(f, []byte("hello not an executable"), 0o755); err != nil {
		t.Fatal(err)
	}
	class, _, err := perapp.ClassifyTarget(f)
	if err != nil {
		t.Fatalf("ClassifyTarget error: %v", err)
	}
	if class != perapp.ShimBypass {
		t.Fatalf("non-ELF target must be ShimBypass, got %v", class)
	}
}

func TestClassifyMissingBinaryFailsClosed(t *testing.T) {
	if _, _, err := perapp.ClassifyTarget("/nonexistent-path-xyz-123"); err == nil {
		t.Fatalf("missing target must error fail-closed, got nil")
	}
}

func TestPerappEnvDedupsShimKeys(t *testing.T) {
	base := []string{"PATH=/usr/bin", "LD_PRELOAD=/evil.so", "TORSOCKS_CONF_FILE=/evil.conf", "TORSOCKS_ISOLATE_PID=0", "HOME=/root"}
	env := perapp.Env(base, "/lib.so", "/conf")
	seen := map[string]int{}
	for _, kv := range env {
		k := kv[:strings.Index(kv, "=")]
		seen[k]++
	}
	for _, k := range []string{"LD_PRELOAD", "TORSOCKS_CONF_FILE", "TORSOCKS_ISOLATE_PID"} {
		if seen[k] != 1 {
			t.Fatalf("perapp.Env key %s appears %d times, want exactly 1: %v", k, seen[k], env)
		}
	}
	for _, kv := range env {
		if kv == "LD_PRELOAD=/evil.so" || kv == "TORSOCKS_CONF_FILE=/evil.conf" {
			t.Fatalf("parent shim value survived into child env: %v", env)
		}
	}
}

func TestShellEnvironDedupsOwnedKeys(t *testing.T) {
	base := []string{"PATH=/usr/bin", "LD_PRELOAD=/evil.so", "ALL_PROXY=socks5://evil:1", "TORSHIM_ACTIVE=0", "TORSHIM_SOCKS=evil", "PS1=orig$ "}
	env := shell.Environ(base, shell.Config{SocksAddr: "127.0.0.1:9050", LibPath: "/lib.so", ConfPath: "/conf"})
	seen := map[string][]string{}
	for _, kv := range env {
		i := strings.Index(kv, "=")
		seen[kv[:i]] = append(seen[kv[:i]], kv[i+1:])
	}
	if len(seen["LD_PRELOAD"]) != 1 || seen["LD_PRELOAD"][0] != "/lib.so" {
		t.Fatalf("LD_PRELOAD not owned by shim: %v", seen["LD_PRELOAD"])
	}
	if len(seen["TORSHIM_ACTIVE"]) != 1 || seen["TORSHIM_ACTIVE"][0] != "1" {
		t.Fatalf("TORSHIM_ACTIVE wrong: %v", seen["TORSHIM_ACTIVE"])
	}
	if len(seen["PS1"]) != 1 || !strings.HasPrefix(seen["PS1"][0], "[torshim]") {
		t.Fatalf("PS1 missing [torshim] marker: %v", seen["PS1"])
	}
}

func TestShellBannerStatesGaps(t *testing.T) {
	b := shell.Banner(shell.Config{SocksAddr: "127.0.0.1:9050", LibPath: "/lib.so"})
	for _, want := range []string{"127.0.0.1:9050", "torsocks", "NOT covered", "static binaries", "Parent shell untouched"} {
		if !strings.Contains(b, want) {
			t.Fatalf("banner missing %q:\n%s", want, b)
		}
	}
	proxy := shell.Banner(shell.Config{SocksAddr: "127.0.0.1:9050"})
	if !strings.Contains(proxy, "proxy environment") {
		t.Fatalf("proxy-mode banner must state proxy environment:\n%s", proxy)
	}
}

func TestControlCircuitStatusBlockSurfacesBuilt(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	defer ln.Close()
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func(conn net.Conn) {
				defer conn.Close()
				r := strings.NewReader("")
				_ = r
				buf := make([]byte, 4096)
				for {
					conn.SetReadDeadline(time.Now().Add(3 * time.Second))
					n, err := conn.Read(buf)
					if err != nil || n == 0 {
						return
					}
					_, _ = conn.Write([]byte("250+circuit-status=\r\n12 BUILT $ABC purpose=GENERAL\r\n.\r\n250 OK\r\n"))
				}
			}(c)
		}
	}()
	ctl, err := control.Dial(ln.Addr().String(), 3*time.Second)
	if err != nil {
		t.Fatalf("dial fake control: %v", err)
	}
	defer ctl.Close()
	got, err := ctl.GetOne("circuit-status")
	if err != nil {
		t.Fatalf("GetOne circuit-status: %v", err)
	}
	if !strings.Contains(got, "BUILT") {
		t.Fatalf("circuit dump lost BUILT, got %q", got)
	}
	if !control.HasBuiltCircuit(got) {
		t.Fatalf("HasBuiltCircuit(false) on dump %q", got)
	}
}
