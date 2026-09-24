package tests

// Phase 1 (Diagnostics and Honesty Surface) black-box suite:
//   - --help exits 0 on every flag set while usage errors stay 2
//   - verbosity grammar, thresholds, --json drop, --log-file tee
//   - terminal verdict lines (-v) and their -q suppression
//   - status --verify three-state verdict table with injected probes
//   - doctor exit codes, JSON schema, and the never-"protected" rule
//   - verbose parity (G5): identical stdout+exit, default vs -vv

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/status"
)

var p1LineRe = regexp.MustCompile(`^\d{2}:\d{2}:\d{2}\.\d{3} (ERROR|WARN|INFO|DEBUG|TRACE) [a-z]+: .+$`)

func p1ClosedAddr(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	addr := ln.Addr().String()
	_ = ln.Close()
	return addr
}

// p1FakeControl serves the control verbs status/verify/doctor need.
func p1FakeControl(t *testing.T, ready bool) (string, func()) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				_ = c.SetDeadline(time.Now().Add(10 * time.Second))
				sc := bufio.NewScanner(c)
				for sc.Scan() {
					line := strings.TrimSpace(sc.Text())
					switch {
					case line == "PROTOCOLINFO":
						fmt.Fprint(c, "250-Auth methods=cookie\r\n250 OK\r\n")
					case strings.HasPrefix(line, "AUTHENTICATE"):
						fmt.Fprint(c, "250 OK\r\n")
					case line == "GETINFO status/bootstrap-phase":
						if ready {
							fmt.Fprint(c, "250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"\r\n250 OK\r\n")
						} else {
							fmt.Fprint(c, "250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=45 TAG=conn_dir SUMMARY=\"x\"\r\n250 OK\r\n")
						}
					case line == "GETINFO status/circuit-established":
						if ready {
							fmt.Fprint(c, "250-status/circuit-established=1\r\n250 OK\r\n")
						} else {
							fmt.Fprint(c, "250-status/circuit-established=0\r\n250 OK\r\n")
						}
					case line == "GETINFO version":
						fmt.Fprint(c, "250-version=Tor 0.4.8.12\r\n250 OK\r\n")
					case strings.HasPrefix(line, "GETINFO uptime"):
						fmt.Fprint(c, "250-uptime=99\r\n250-data-dir=/tmp/torshim-fake\r\n250-net/listeners/socks=\"127.0.0.1:9050\"\r\n250 OK\r\n")
					case strings.HasPrefix(line, "GETINFO net/listeners"):
						fmt.Fprint(c, "250-net/listeners/socks=\"127.0.0.1:9050\"\r\n250 OK\r\n")
					case strings.HasPrefix(line, "GETCONF"):
						fmt.Fprint(c, "250-UseBridges=0\r\n250-Bridge=\r\n250 OK\r\n")
					default:
						fmt.Fprint(c, "250 OK\r\n")
					}
				}
			}(c)
		}
	}()
	return ln.Addr().String(), func() { _ = ln.Close() }
}

// p1FakeSOCKS answers SOCKS5 and pipes CONNECT to target ("" = greeting only).
func p1FakeSOCKS(t *testing.T, target string) (string, func()) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				_ = c.SetDeadline(time.Now().Add(5 * time.Second))
				h := make([]byte, 2)
				if _, err := io.ReadFull(c, h); err != nil {
					return
				}
				if _, err := io.CopyN(io.Discard, c, int64(h[1])); err != nil {
					return
				}
				if _, err := c.Write([]byte{0x05, 0x00}); err != nil {
					return
				}
				req := make([]byte, 4)
				if _, err := io.ReadFull(c, req); err != nil {
					return
				}
				var skip int
				switch req[3] {
				case 0x01:
					skip = 4
				case 0x04:
					skip = 16
				case 0x03:
					l := make([]byte, 1)
					if _, err := io.ReadFull(c, l); err != nil {
						return
					}
					skip = int(l[0])
				default:
					return
				}
				if _, err := io.CopyN(io.Discard, c, int64(skip+2)); err != nil {
					return
				}
				if target == "" {
					return
				}
				if _, err := c.Write([]byte{0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0}); err != nil {
					return
				}
				up, err := net.DialTimeout("tcp", target, 2*time.Second)
				if err != nil {
					return
				}
				defer up.Close()
				go func() { _, _ = io.Copy(up, c); _ = up.(*net.TCPConn).CloseWrite() }()
				_, _ = io.Copy(c, up)
			}(c)
		}
	}()
	return ln.Addr().String(), func() { _ = ln.Close() }
}

func TestP1HelpExitZeroOnEveryFlagSet(t *testing.T) {
	bin := buildTorshim(t)
	cases := []struct {
		cmd  string
		want string
	}{
		{"run", "torshim run"},
		{"shell", "torshim shell"},
		{"status", "--verify"},
		{"doctor", "Read-only environment diagnostics"},
		{"version", "torshim version"},
		{"connect", "--backend"},
		{"disconnect", "torshim disconnect"},
		{"repair", "torshim repair"},
	}
	for _, c := range cases {
		so, se, code := runBin(bin, c.cmd, "--help")
		if code != 0 {
			t.Fatalf("%s --help exit=%d, want 0 (stdout=%q stderr=%q)", c.cmd, code, so, se)
		}
		if !strings.Contains(so, "Exit codes:") {
			t.Fatalf("%s --help must carry the exit-code table:\n%s", c.cmd, so)
		}
		if !strings.Contains(so, c.want) {
			t.Fatalf("%s --help missing %q:\n%s", c.cmd, c.want, so)
		}
		if se != "" && !strings.Contains(se, "flag provided") {
			t.Fatalf("%s --help stderr must stay empty (or flag errors only): %q", c.cmd, se)
		}
	}
	// The top-level help path stays 0 with the table.
	so, _, code := runBin(bin, "--help")
	if code != 0 || !strings.Contains(so, "Exit codes:") {
		t.Fatalf("--help exit=%d, table=%v", code, strings.Contains(so, "Exit codes:"))
	}
	// Malformed usage is still exit 2 with usage on stderr.
	_, se, code := runBin(bin, "status", "--bogus-flag")
	if code != 2 {
		t.Fatalf("status --bogus-flag exit=%d, want 2", code)
	}
	if !strings.Contains(se, "Exit codes:") {
		t.Fatalf("usage error must print usage on stderr:\n%s", se)
	}
	_, _, code = runBin(bin, "version", "--nope")
	if code != 2 {
		t.Fatalf("version --nope exit=%d, want 2", code)
	}
}

func TestP1VerbosityGrammarAndThresholds(t *testing.T) {
	bin := buildTorshim(t)
	closed := p1ClosedAddr(t)
	stateDir := t.TempDir()

	// Default: no INFO diagnostics on stderr.
	_, se, code := runBin(bin, "status", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("plain status exit=%d", code)
	}
	if strings.Contains(se, " INFO ") || strings.Contains(se, " WARN ") {
		t.Fatalf("default run leaked diagnostics:\n%s", se)
	}

	// -v: every stderr line obeys the research 16.3 grammar.
	_, se, code = runBin(bin, "-v", "status", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("-v status exit=%d", code)
	}
	if se == "" {
		t.Fatalf("-v status produced no diagnostics")
	}
	for _, line := range strings.Split(strings.TrimSuffix(se, "\n"), "\n") {
		if !p1LineRe.MatchString(line) {
			t.Fatalf("grammar violation: %q", line)
		}
	}
	if !strings.Contains(se, `command="status"`) {
		t.Fatalf("-v must show the parsed command:\n%s", se)
	}

	// Position (b): inside the subcommand's flag set.
	_, se, _ = runBin(bin, "status", "-vv", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if !strings.Contains(se, " DEBUG ") || !strings.Contains(se, "endpoints control=") {
		t.Fatalf("-vv inside the flag set must reach debug:\n%s", se)
	}
	// Position (a): before the command (prescan).
	_, se, _ = runBin(bin, "-vv", "status", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if !strings.Contains(se, " DEBUG ") {
		t.Fatalf("-vv before the command must reach debug:\n%s", se)
	}

	// --json drops the log level: no INFO on stderr, JSON on stdout.
	so, se, code := runBin(bin, "-v", "status", "--json", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("-v status --json exit=%d", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("stdout must be pure JSON: %v\n%s", err, so)
	}
	if strings.Contains(se, " INFO ") || strings.Contains(se, " DEBUG ") {
		t.Fatalf("--json run must drop the log level to warn:\n%s", se)
	}
}

func TestP1LogFileTee(t *testing.T) {
	bin := buildTorshim(t)
	closed := p1ClosedAddr(t)
	logPath := filepath.Join(t.TempDir(), "torshim.log")
	so, _, code := runBin(bin, "-v", "--log-file", logPath, "status", "--json",
		"--control", closed, "--socks", closed, "--state-dir", t.TempDir())
	if code != 0 {
		t.Fatalf("status exit=%d", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("stdout must stay JSON: %v\n%s", err, so)
	}
	raw, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("--log-file missing: %v", err)
	}
	if len(raw) == 0 {
		t.Fatalf("--log-file is empty")
	}
	found := false
	for _, line := range strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n") {
		if strings.HasPrefix(line, "torshim: ready") {
			continue // bare verdict lines may tee too
		}
		if !p1LineRe.MatchString(line) {
			t.Fatalf("log file grammar violation: %q", line)
		}
		found = true
	}
	if !found {
		t.Fatalf("log file has no log lines:\n%s", raw)
	}
}

func TestP1VerdictLinesAndQuietSuppression(t *testing.T) {
	bin := buildTorshim(t)

	// Failure path at -v: terminal verdict with reason and remediation.
	_, se, code := runBin(bin, "-v", "run", "--tor", "/nonexistent-tor-binary-p1", "--", "someapp")
	if code != 3 {
		t.Fatalf("run with missing tor exit=%d, want 3", code)
	}
	if !strings.Contains(se, "torshim: NOT protected reason=tor_binary_missing remediation=") {
		t.Fatalf("missing terminal failure verdict:\n%s", se)
	}
	if !strings.Contains(se, `command="run"`) {
		t.Fatalf("-v must show the parsed command:\n%s", se)
	}

	// Default: no verdict line (non-verbose path stays quiet).
	_, se, _ = runBin(bin, "run", "--tor", "/nonexistent-tor-binary-p1", "--", "someapp")
	if strings.Contains(se, "NOT protected") {
		t.Fatalf("verdict leaked into the default path:\n%s", se)
	}

	// -q: errors only; the Info-gated verdict stays suppressed.
	_, se, _ = runBin(bin, "-q", "run", "--tor", "/nonexistent-tor-binary-p1", "--", "someapp")
	if strings.Contains(se, "NOT protected") {
		t.Fatalf("-q must suppress the verdict line:\n%s", se)
	}
	if strings.Contains(se, " INFO ") || strings.Contains(se, " WARN ") {
		t.Fatalf("-q leaked non-error diagnostics:\n%s", se)
	}
}

func TestP1VerboseParityStdoutAndExit(t *testing.T) {
	bin := buildTorshim(t)
	closed := p1ClosedAddr(t)
	stateDir := t.TempDir()
	cases := [][]string{
		{"version"},
		{"help"},
		{"status", "--json", "--control", closed, "--socks", closed, "--state-dir", stateDir},
		{"run", "--help"},
		{"shell", "--help"},
		{"doctor", "--json", "--control", closed, "--socks", closed, "--state-dir", stateDir},
		{"run", "--tor", "/nonexistent-tor-binary-parity", "--", "someapp"},
	}
	for _, args := range cases {
		so1, _, c1 := runBin(bin, args...)
		so2, _, c2 := runBin(bin, append([]string{"-vv"}, args...)...)
		if c1 != c2 {
			t.Fatalf("parity exit mismatch for %v: %d vs %d", args, c1, c2)
		}
		if so1 != so2 {
			t.Fatalf("parity stdout mismatch for %v:\n--default--\n%s\n--verbose--\n%s", args, so1, so2)
		}
	}
}

func TestP1StatusVerifyVerdictTable(t *testing.T) {
	bin := buildTorshim(t)
	stateDir := t.TempDir()
	closed := p1ClosedAddr(t)

	// unverified: no endpoint answers.
	so, _, code := runBin(bin, "status", "--verify", "--socks", closed, "--control", closed, "--state-dir", stateDir)
	if code != 1 {
		t.Fatalf("unverified verify exit=%d, want 1", code)
	}
	if !strings.Contains(so, "verdict: unverified") || !strings.Contains(so, "failed check: socks_handshake") {
		t.Fatalf("unverified text wrong:\n%s", so)
	}

	// degraded: SOCKS answers, readiness gates not met.
	socksOnly, stopSocks := p1FakeSOCKS(t, "")
	defer stopSocks()
	so, _, code = runBin(bin, "status", "--verify", "--socks", socksOnly, "--control", closed, "--state-dir", stateDir)
	if code != 1 {
		t.Fatalf("gates-fail verify exit=%d, want 1", code)
	}
	if !strings.Contains(so, "verdict: degraded") || !strings.Contains(so, "failed check: readiness_gates") {
		t.Fatalf("degraded text wrong:\n%s", so)
	}

	// protected: ready control + live IsTor:true through the SOCKS.
	checkSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":true,"IP":"203.0.113.44"}`)
	}))
	defer checkSrv.Close()
	ctlAddr, stopCtl := p1FakeControl(t, true)
	defer stopCtl()
	socksAddr, stopSocks2 := p1FakeSOCKS(t, strings.TrimPrefix(checkSrv.URL, "http://"))
	defer stopSocks2()
	checkURL := "http://tor-check.invalid/api/ip"
	so, _, code = runBin(bin, "status", "--verify", "--check-url", checkURL,
		"--socks", socksAddr, "--control", ctlAddr, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("protected verify exit=%d, want 0:\n%s", code, so)
	}
	if !strings.Contains(so, "verdict: protected") {
		t.Fatalf("protected text wrong:\n%s", so)
	}
	if strings.Contains(so, "failed check") {
		t.Fatalf("protected verdict must not name a failing check:\n%s", so)
	}

	// JSON shape for the protected path: verdict + check_url + exit_ip.
	so, _, code = runBin(bin, "status", "--verify", "--json", "--check-url", checkURL,
		"--socks", socksAddr, "--control", ctlAddr, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("protected verify --json exit=%d", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("verify JSON: %v\n%s", err, so)
	}
	if rep.Verdict != "protected" || rep.ExitIP != "203.0.113.44" || rep.CheckURL != checkURL {
		t.Fatalf("verify JSON keys wrong: %+v", rep)
	}
	if !rep.Protected || rep.BootstrapProgress != 100 || !rep.CircuitEstablished {
		t.Fatalf("verify JSON lost pinned keys: %+v", rep)
	}
	if rep.Instance == "" {
		t.Fatalf("enrichment must fill instance when control answered: %+v", rep)
	}

	// IsTor:false answers degraded, exit 1, exit IP still reported.
	checkSrv2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":false,"IP":"198.51.100.200"}`)
	}))
	defer checkSrv2.Close()
	socks2, stopSocks3 := p1FakeSOCKS(t, strings.TrimPrefix(checkSrv2.URL, "http://"))
	defer stopSocks3()
	so, _, code = runBin(bin, "status", "--verify", "--check-url", "http://tor-check.invalid/api/ip",
		"--socks", socks2, "--control", ctlAddr, "--state-dir", stateDir)
	if code != 1 {
		t.Fatalf("IsTor=false exit=%d, want 1", code)
	}
	if !strings.Contains(so, "verdict: degraded") || !strings.Contains(so, "failed check: istor_probe") {
		t.Fatalf("IsTor=false text wrong:\n%s", so)
	}
	if !strings.Contains(so, "198.51.100.200") {
		t.Fatalf("failing proof must still report the exit IP:\n%s", so)
	}

	// Plain status keeps exiting 0 (unchanged contract).
	_, _, code = runBin(bin, "status", "--control", closed, "--socks", closed, "--state-dir", stateDir)
	if code != 0 {
		t.Fatalf("plain status exit=%d, want 0", code)
	}
}

func TestP1DoctorBlackBox(t *testing.T) {
	bin := buildTorshim(t)
	stateDir := t.TempDir()
	closed := p1ClosedAddr(t)

	// Absent environment: exit 1, honest FAILs, JSON schema, no forbidden word.
	so, _, code := runBin(bin, "doctor", "--json",
		"--control", closed, "--socks", closed, "--state-dir", stateDir,
		"--tor", "definitely-missing-tor-binary")
	if code != 1 {
		t.Fatalf("doctor on empty env exit=%d, want 1", code)
	}
	var payload struct {
		Overall string `json:"overall"`
		Checks  []struct {
			ID       string `json:"id"`
			OK       bool   `json:"ok"`
			Severity string `json:"severity"`
			Detail   string `json:"detail"`
		} `json:"checks"`
	}
	if err := json.Unmarshal([]byte(so), &payload); err != nil {
		t.Fatalf("doctor JSON: %v\n%s", err, so)
	}
	if payload.Overall != "fail" || len(payload.Checks) != 10 {
		t.Fatalf("doctor JSON shape wrong: overall=%q checks=%d", payload.Overall, len(payload.Checks))
	}
	if strings.Contains(strings.ToLower(so), "protected") {
		t.Fatalf("doctor JSON must never say protected:\n%s", so)
	}
	// Never mutates: the state dir stays empty.
	entries, err := os.ReadDir(stateDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Fatalf("doctor mutated state dir: %v", entries)
	}

	// Text mode: [FAIL] markers and fixes.
	so, se, code := runBin(bin, "doctor",
		"--control", closed, "--socks", closed, "--state-dir", stateDir,
		"--tor", "definitely-missing-tor-binary")
	if code != 1 {
		t.Fatalf("doctor text exit=%d, want 1", code)
	}
	if !strings.Contains(so, "[FAIL] tor_binary") || !strings.Contains(so, "overall: fail") {
		t.Fatalf("doctor text markers wrong:\n%s", so)
	}
	if !strings.Contains(so, "     fix: ") {
		t.Fatalf("failed checks must carry fixes:\n%s", so)
	}
	if strings.Contains(strings.ToLower(so+se), "protected") {
		t.Fatalf("doctor must never say protected:\n%s%s", so, se)
	}

	// Deep pass against fakes: IsTor probe through SOCKS, local clock.
	checkSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":true,"IP":"203.0.113.77"}`)
	}))
	defer checkSrv.Close()
	ctlAddr, stopCtl := p1FakeControl(t, true)
	defer stopCtl()
	socksAddr, stopSocks := p1FakeSOCKS(t, strings.TrimPrefix(checkSrv.URL, "http://"))
	defer stopSocks()
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	// The CI image may not ship torsocks; TORSOCKS_LIB is the supported
	// override that makes the mechanism check portable without lying.
	env := []string(nil)
	if runtime.GOOS == "linux" {
		lib := filepath.Join(t.TempDir(), "libtorsocks.so")
		if err := os.WriteFile(lib, []byte("stub"), 0o644); err != nil {
			t.Fatal(err)
		}
		env = append(env, "TORSOCKS_LIB="+lib)
	}
	so, _, code = runBinEnv(bin, env, "doctor", "--deep",
		"--control", ctlAddr, "--socks", socksAddr, "--state-dir", stateDir,
		"--tor", self, "--check-url", checkSrv.URL+"/api/ip", "--timeout", "3s")
	if code != 0 {
		t.Fatalf("doctor --deep against fakes exit=%d, want 0:\n%s", code, so)
	}
	if !strings.Contains(so, "[ok] probe_istor") || !strings.Contains(so, "IsTor=true") {
		t.Fatalf("deep doctor missing passing IsTor check:\n%s", so)
	}
	if !strings.Contains(so, "overall: pass") {
		t.Fatalf("deep doctor must pass:\n%s", so)
	}
}

func TestP1DoctorDeepExitOneWhenProofFails(t *testing.T) {
	bin := buildTorshim(t)
	checkSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":false,"IP":"198.51.100.4"}`)
	}))
	defer checkSrv.Close()
	ctlAddr, stopCtl := p1FakeControl(t, true)
	defer stopCtl()
	socksAddr, stopSocks := p1FakeSOCKS(t, strings.TrimPrefix(checkSrv.URL, "http://"))
	defer stopSocks()
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	so, _, code := runBin(bin, "doctor", "--deep",
		"--control", ctlAddr, "--socks", socksAddr, "--state-dir", t.TempDir(),
		"--tor", self, "--check-url", checkSrv.URL+"/api/ip", "--timeout", "3s")
	if code != 1 {
		t.Fatalf("doctor with IsTor=false exit=%d, want 1", code)
	}
	if !strings.Contains(so, "[FAIL] probe_istor") || !strings.Contains(so, "IsTor=false") {
		t.Fatalf("failing proof not reported:\n%s", so)
	}
}

// TestP1G3HelpAndVersionFast pins the G3 budget: help and version
// return in at most 50 ms (best of five runs each; cold-start noise
// excluded so the bound measures command work, not page-cache misses).
func TestP1G3HelpAndVersionFast(t *testing.T) {
	bin := buildTorshim(t)
	best := func(args ...string) time.Duration {
		min := time.Duration(1<<62 - 1)
		for i := 0; i < 5; i++ {
			start := time.Now()
			_, _, _ = runBin(bin, args...)
			if d := time.Since(start); d < min {
				min = d
			}
		}
		return min
	}
	if d := best("version"); d > 50*time.Millisecond {
		t.Fatalf("version best=%v exceeds the 50ms G3 bound", d)
	}
	if d := best("--help"); d > 50*time.Millisecond {
		t.Fatalf("--help best=%v exceeds the 50ms G3 bound", d)
	}
}

// TestP1G4StatusStaysInsideTwoSeconds pins the G4 budget: status
// without --verify must finish within 2s against both a silent control
// endpoint (accepts, never writes) and an unroutable one.
func TestP1G4StatusStaysInsideTwoSeconds(t *testing.T) {
	bin := buildTorshim(t)
	stateDir := t.TempDir()

	// Silent: accepts the TCP connection and never sends a byte.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	defer ln.Close()
	go func() {
		var held []net.Conn
		defer func() {
			for _, c := range held {
				_ = c.Close()
			}
		}()
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			held = append(held, c)
		}
	}()
	start := time.Now()
	so, _, code := runBin(bin, "status", "--control", ln.Addr().String(), "--state-dir", stateDir)
	if d := time.Since(start); d > 2*time.Second {
		t.Fatalf("status against a silent control endpoint took %v, G4 bound is 2s", d)
	}
	if code != 0 {
		t.Fatalf("silent-control status exit=%d, want 0", code)
	}
	if !strings.Contains(so, "unreadable") && !strings.Contains(so, "unreachable") {
		t.Fatalf("silent control must stay honest:\n%s", so)
	}
	if !strings.Contains(so, "protected: false") || strings.Contains(so, "protected: true") {
		t.Fatalf("silent control must report protected: false only:\n%s", so)
	}

	// Unroutable: the dial itself must be bounded by the same budget.
	black := "10.255.255.1:9051"
	start = time.Now()
	_, _, code = runBin(bin, "status", "--control", black, "--state-dir", stateDir)
	if d := time.Since(start); d > 2*time.Second {
		t.Fatalf("status against an unroutable control endpoint took %v, G4 bound is 2s", d)
	}
	if code != 0 {
		t.Fatalf("blackhole status exit=%d, want 0", code)
	}
}
