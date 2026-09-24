package doctor

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
	"runtime"
	"strings"
	"testing"
	"time"
)

// startFakeControl speaks just enough of the Tor control protocol for
// doctor and status: PROTOCOLINFO, AUTHENTICATE, GETINFO, GETCONF.
func startFakeControl(t *testing.T, ready bool) (string, func()) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go serveControlConn(c, ready)
		}
	}()
	return ln.Addr().String(), func() { _ = ln.Close(); <-done }
}

func serveControlConn(c net.Conn, ready bool) {
	defer c.Close()
	_ = c.SetDeadline(time.Now().Add(10 * time.Second))
	sc := bufio.NewScanner(c)
	sc.Buffer(make([]byte, 0, 64*1024), 64*1024)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		switch {
		case line == "PROTOCOLINFO":
			fmt.Fprint(c, "250-Auth methods=cookie\r\n250-Version=0.4.8.12\r\n250 OK\r\n")
		case strings.HasPrefix(line, "AUTHENTICATE"):
			fmt.Fprint(c, "250 OK\r\n")
		case line == "GETINFO status/bootstrap-phase":
			if ready {
				fmt.Fprint(c, "250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"\r\n250 OK\r\n")
			} else {
				fmt.Fprint(c, "250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=45 TAG=conn_dir SUMMARY=\"Connecting to directory\"\r\n250 OK\r\n")
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
			fmt.Fprint(c, "250-uptime=3600\r\n250 OK\r\n")
		case strings.HasPrefix(line, "GETINFO data-dir"):
			fmt.Fprint(c, "250-data-dir=/tmp/torshim-fake\r\n250 OK\r\n")
		case strings.HasPrefix(line, "GETINFO net/listeners/socks"),
			strings.HasPrefix(line, "GETINFO net/listeners"):
			fmt.Fprint(c, "250-net/listeners/socks=\"127.0.0.1:9050\"\r\n250-net/listeners/control=\"127.0.0.1:9051\"\r\n250 OK\r\n")
		case strings.HasPrefix(line, "GETCONF"):
			fmt.Fprint(c, "250-UseBridges=0\r\n250-Bridge=\r\n250 OK\r\n")
		case strings.HasPrefix(line, "GETINFO"):
			fmt.Fprint(c, "250 OK\r\n")
		default:
			fmt.Fprint(c, "250 OK\r\n")
		}
	}
}

// startFakeSOCKS answers SOCKS5 handshakes and pipes CONNECTs to target.
func startFakeSOCKS(t *testing.T, target string) (string, func()) {
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
				if _, err := readFull(c, h); err != nil {
					return
				}
				if _, err := readFullPad(c, int(h[1])); err != nil {
					return
				}
				if _, err := c.Write([]byte{0x05, 0x00}); err != nil {
					return
				}
				req := make([]byte, 4)
				if _, err := readFull(c, req); err != nil {
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
					if _, err := readFull(c, l); err != nil {
						return
					}
					skip = int(l[0])
				default:
					return
				}
				if _, err := readFullPad(c, skip+2); err != nil {
					return
				}
				if target == "" {
					return // handshake-only probe
				}
				if _, err := c.Write([]byte{0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 0}); err != nil {
					return
				}
				up, err := net.DialTimeout("tcp", target, 2*time.Second)
				if err != nil {
					return
				}
				defer up.Close()
				go func() { _, _ = copyClose(up, c) }()
				_, _ = copyClose(c, up)
			}(c)
		}
	}()
	return ln.Addr().String(), func() { _ = ln.Close() }
}

func readFull(c net.Conn, b []byte) (int, error) {
	n := 0
	for n < len(b) {
		m, err := c.Read(b[n:])
		if err != nil {
			return n, err
		}
		n += m
	}
	return n, nil
}

func readFullPad(c net.Conn, n int) (int, error) {
	buf := make([]byte, n)
	return readFull(c, buf)
}

func copyClose(dst, src net.Conn) (int64, error) {
	n, err := io.Copy(dst, src)
	type closeWriter interface{ CloseWrite() error }
	if cw, ok := dst.(closeWriter); ok {
		_ = cw.CloseWrite()
	}
	return n, err
}

func closedAddr(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	addr := ln.Addr().String()
	_ = ln.Close()
	return addr
}

func runReport(t *testing.T, o Options) Report {
	t.Helper()
	if o.StateDir == "" {
		o.StateDir = t.TempDir()
	}
	if o.TorBinary == "" {
		// Fixed name: never embed t.Name(), which could itself contain
		// words the output invariant forbids.
		o.TorBinary = "definitely-missing-tor-binary"
	}
	if o.Timeout == 0 {
		o.Timeout = time.Second
	}
	return Run(o)
}

func TestDoctorAbsentEnvironmentFailsHonest(t *testing.T) {
	rep := runReport(t, Options{
		ControlAddr: closedAddr(t),
		SocksAddr:   closedAddr(t),
	})
	if rep.Overall != "fail" {
		t.Fatalf("overall = %s, want fail on an empty environment", rep.Overall)
	}
	byID := map[string]Check{}
	for _, c := range rep.Checks {
		byID[c.ID] = c
	}
	if len(rep.Checks) != 10 {
		t.Fatalf("baseline must run exactly 10 checks, got %d", len(rep.Checks))
	}
	for _, id := range []string{"tor_binary", "control", "socks", "bootstrap"} {
		c, ok := byID[id]
		if !ok {
			t.Fatalf("missing check %s", id)
		}
		if c.OK {
			t.Fatalf("check %s must fail in an empty environment: %+v", id, c)
		}
		if c.Severity == "" || c.Detail == "" {
			t.Fatalf("check %s lacks severity/detail: %+v", id, c)
		}
	}
	if byID["platform_coverage"].OK != true {
		t.Fatalf("platform coverage is a statement, must be ok: %+v", byID["platform_coverage"])
	}
}

func TestDoctorNeverSaysProtectedAndNeverMutates(t *testing.T) {
	stateDir := t.TempDir()
	before, err := os.ReadDir(stateDir)
	if err != nil {
		t.Fatal(err)
	}
	rep := runReport(t, Options{ControlAddr: closedAddr(t), SocksAddr: closedAddr(t), StateDir: stateDir})
	text := RenderText(rep)
	if strings.Contains(strings.ToLower(text), "protected") {
		t.Fatalf("doctor must never use the word protected:\n%s", text)
	}
	raw, err := RenderJSON(rep)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(strings.ToLower(raw), "protected") {
		t.Fatalf("doctor JSON must never use the word protected:\n%s", raw)
	}
	after, err := os.ReadDir(stateDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(before) != len(after) {
		t.Fatalf("doctor mutated the state dir: %d -> %d entries", len(before), len(after))
	}
	// Text marks: every check line is [ok] or [FAIL], plus the overall.
	for _, line := range strings.Split(strings.TrimSuffix(text, "\n"), "\n") {
		if strings.HasPrefix(line, "[ok] ") || strings.HasPrefix(line, "[FAIL] ") ||
			strings.HasPrefix(line, "     fix: ") || strings.HasPrefix(line, "overall: ") {
			continue
		}
		t.Fatalf("unexpected text line %q", line)
	}
	if !strings.Contains(text, "overall: fail") {
		t.Fatalf("missing overall line:\n%s", text)
	}
}

func TestDoctorJSONSchema(t *testing.T) {
	rep := runReport(t, Options{ControlAddr: closedAddr(t), SocksAddr: closedAddr(t)})
	out, err := RenderJSON(rep)
	if err != nil {
		t.Fatal(err)
	}
	var payload struct {
		Overall string `json:"overall"`
		Checks  []struct {
			ID          string `json:"id"`
			OK          bool   `json:"ok"`
			Severity    string `json:"severity"`
			Detail      string `json:"detail"`
			Remediation string `json:"remediation"`
		} `json:"checks"`
	}
	if err := json.Unmarshal([]byte(out), &payload); err != nil {
		t.Fatalf("JSON schema: %v\n%s", err, out)
	}
	if payload.Overall != "fail" {
		t.Fatalf("overall = %q", payload.Overall)
	}
	if len(payload.Checks) != 10 {
		t.Fatalf("checks = %d, want 10", len(payload.Checks))
	}
	for _, c := range payload.Checks {
		if c.ID == "" || c.Severity == "" || c.Detail == "" {
			t.Fatalf("check missing fields: %+v", c)
		}
		switch c.Severity {
		case "error", "warning", "info":
		default:
			t.Fatalf("unknown severity %q on %s", c.Severity, c.ID)
		}
	}
}

func TestDoctorAllPassAgainstFakes(t *testing.T) {
	ctlAddr, stopCtl := startFakeControl(t, true)
	defer stopCtl()
	socksAddr, stopSocks := startFakeSOCKS(t, "")
	defer stopSocks()
	if runtime.GOOS == "linux" {
		// The host CI image may not ship torsocks; the TORSOCKS_LIB
		// override makes the mechanism check honest and portable.
		lib := filepath.Join(t.TempDir(), "libtorsocks.so")
		if err := os.WriteFile(lib, []byte("stub"), 0o644); err != nil {
			t.Fatal(err)
		}
		t.Setenv("TORSOCKS_LIB", lib)
	}
	// A present tor binary (the test binary itself; version unreadable
	// is a warning, not a failure).
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	rep := runReport(t, Options{
		TorBinary:   self,
		ControlAddr: ctlAddr,
		SocksAddr:   socksAddr,
		Timeout:     2 * time.Second,
	})
	if rep.Overall != "pass" {
		t.Fatalf("overall = %s, want pass:\n%s", rep.Overall, RenderText(rep))
	}
	text := RenderText(rep)
	if !strings.Contains(text, "[ok] control") || !strings.Contains(text, "[ok] socks") {
		t.Fatalf("expected passing control/socks:\n%s", text)
	}
	if !strings.Contains(text, "overall: pass") {
		t.Fatalf("missing overall pass:\n%s", text)
	}
}

func TestDoctorBootstrapProgressFails(t *testing.T) {
	ctlAddr, stopCtl := startFakeControl(t, false)
	defer stopCtl()
	socksAddr, stopSocks := startFakeSOCKS(t, "")
	defer stopSocks()
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	rep := runReport(t, Options{TorBinary: self, ControlAddr: ctlAddr, SocksAddr: socksAddr})
	for _, c := range rep.Checks {
		if c.ID == "bootstrap" {
			if c.OK {
				t.Fatalf("45%% bootstrap must fail: %+v", c)
			}
			if !strings.Contains(c.Detail, "45%") {
				t.Fatalf("detail must carry progress: %+v", c)
			}
			if c.Remediation == "" {
				t.Fatalf("failed check needs remediation: %+v", c)
			}
			return
		}
	}
	t.Fatalf("bootstrap check missing")
}

func TestDoctorDeepChecks(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":true,"IP":"192.0.2.55"}`)
	}))
	defer srv.Close()
	target := strings.TrimPrefix(srv.URL, "http://")
	ctlAddr, stopCtl := startFakeControl(t, true)
	defer stopCtl()
	socksAddr, stopSocks := startFakeSOCKS(t, target)
	defer stopSocks()
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	rep := runReport(t, Options{
		TorBinary:   self,
		ControlAddr: ctlAddr,
		SocksAddr:   socksAddr,
		Deep:        true,
		// Local URL: the clock check is a direct HEAD (needs a
		// reachable server); the IsTor check still traverses the fake
		// SOCKS proxy to reach it.
		CheckURL: srv.URL + "/api/ip",
		Timeout:  3 * time.Second,
	})
	byID := map[string]Check{}
	for _, c := range rep.Checks {
		byID[c.ID] = c
	}
	for _, id := range []string{"probe_istor", "probe_ipv6", "probe_time"} {
		c, ok := byID[id]
		if !ok {
			t.Fatalf("deep check %s missing", id)
		}
		if c.Severity == "" {
			t.Fatalf("deep check %s lacks severity: %+v", id, c)
		}
	}
	istor := byID["probe_istor"]
	if !istor.OK || !strings.Contains(istor.Detail, "IsTor=true") {
		t.Fatalf("probe_istor = %+v, want passing IsTor=true", istor)
	}
	if !strings.Contains(istor.Detail, "192.0.2.55") {
		t.Fatalf("probe_istor must report the exit IP: %+v", istor)
	}
	// The clock check talks to the same local URL (HEAD, Date header
	// provided by httptest) and must pass with near-zero skew.
	clock := byID["probe_time"]
	if !clock.OK {
		t.Fatalf("probe_time = %+v, want pass against local Date header", clock)
	}
}

func TestDoctorUsageErrorsAreTheCallers(t *testing.T) {
	// Run itself never claims to handle usage; unknown flags never reach
	// it. This pins that Options with hostile URLs degrade to a failed
	// check instead of panicking.
	rep := runReport(t, Options{
		ControlAddr: closedAddr(t),
		SocksAddr:   closedAddr(t),
		Deep:        true,
		CheckURL:    "ftp://bad.example/x",
		Timeout:     time.Second,
	})
	if rep.Overall != "fail" {
		t.Fatalf("overall = %s, want fail", rep.Overall)
	}
}

func TestRenderTextFixLinesOnlyOnFailures(t *testing.T) {
	rep := Report{Overall: "pass", Checks: []Check{
		{ID: "a", OK: true, Severity: "info", Detail: "fine", Remediation: "unused hint"},
	}}
	text := RenderText(rep)
	if strings.Contains(text, "unused hint") {
		t.Fatalf("remediation must not print for passing checks:\n%s", text)
	}
	if !strings.Contains(text, "[ok] a: fine") {
		t.Fatalf("passing line wrong:\n%s", text)
	}
}
