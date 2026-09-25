package doctor

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"testing"
	"time"
)

// stubController is a scripted Controller.
type stubController struct {
	values map[string]string
	authOK map[string]bool // cookie paths that authenticate; nil = accept any
	closed bool
}

func (s *stubController) GetOne(key string) (string, error) {
	v, ok := s.values[key]
	if !ok {
		return "", fmt.Errorf("stub: no key %q", key)
	}
	return v, nil
}

func (s *stubController) Signal(name string) error { return nil }

func (s *stubController) AuthCookie(path string) error {
	if s.authOK == nil {
		return nil
	}
	if s.authOK[path] {
		return nil
	}
	return errors.New("stub: authentication rejected")
}

func (s *stubController) Close() error { s.closed = true; return nil }

func readyStub() *stubController {
	return &stubController{values: map[string]string{
		"status/bootstrap-phase": `NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"`,
		"status/circuit-established": "1",
		"version":                    "0.4.8.9",
		"net/listeners/dns":          `"127.0.0.1:9053"`,
	}}
}

func okDeps(fwMode string) Deps {
	return Deps{
		DialControl: func(addr string, timeout time.Duration) (Controller, error) {
			return readyStub(), nil
		},
		AuthControl: func(c Controller, cookies []string) error { return nil },
		SocksProbe:  func(addr string, timeout time.Duration) error { return nil },
		DNSQuery:    func(dns, name string, timeout time.Duration) error { return nil },
		ExitIP: func(socks, host string, port int, path string, timeout time.Duration) (string, error) {
			return "203.0.113.7", nil
		},
		Firewall: func(stateDir string) FirewallState {
			return FirewallState{Mode: fwMode, Backend: "iptables", Detail: "stub session"}
		},
		IPv6Rules: func(backend, stateDir string) (bool, error) { return true, nil },
	}
}

func checkByName(t *testing.T, rep Report, name string) Check {
	t.Helper()
	for _, c := range rep.Checks {
		if c.Name == name {
			return c
		}
	}
	t.Fatalf("no check named %q in %+v", name, rep.Checks)
	return Check{}
}

func TestCollectHealthy(t *testing.T) {
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051", CookiePaths: []string{"/tmp/c"}}, okDeps("system"))
	if !rep.Healthy {
		t.Fatalf("expected healthy:\n%s", RenderText(rep))
	}
	want := []string{"control-reachable", "control-auth", "bootstrap-complete",
		"circuit-established", "socks-handshake", "dnsport-liveness",
		"exit-ip-egress", "firewall-present", "ipv6-blocked"}
	if len(rep.Checks) != len(want) {
		t.Fatalf("got %d checks, want %d: %+v", len(rep.Checks), len(want), rep.Checks)
	}
	for i, n := range want {
		if rep.Checks[i].Name != n {
			t.Fatalf("check %d = %q, want %q", i, rep.Checks[i].Name, n)
		}
		if rep.Checks[i].Status != StatusPass {
			t.Errorf("check %q = %s, want pass (%s)", n, rep.Checks[i].Status, rep.Checks[i].Detail)
		}
	}
}

func TestCollectDialFailureFailsClosed(t *testing.T) {
	deps := okDeps("none")
	deps.DialControl = func(addr string, timeout time.Duration) (Controller, error) {
		return nil, errors.New("connection refused")
	}
	rep := Collect(Options{}, deps)
	if rep.Healthy {
		t.Fatal("unreachable control must not be healthy")
	}
	if got := checkByName(t, rep, "control-reachable"); got.Status != StatusFail {
		t.Errorf("control-reachable = %s, want fail", got.Status)
	}
	// Control-dependent checks degrade to skip, never pass.
	if got := checkByName(t, rep, "dnsport-liveness"); got.Status != StatusSkip {
		t.Errorf("dnsport-liveness = %s, want skip without control", got.Status)
	}
	// Transport probes still ran (stubs pass here).
	if got := checkByName(t, rep, "socks-handshake"); got.Status != StatusPass {
		t.Errorf("socks-handshake = %s, want pass", got.Status)
	}
}

func TestCollectBootstrappingFails(t *testing.T) {
	deps := okDeps("none")
	deps.DialControl = func(addr string, timeout time.Duration) (Controller, error) {
		return &stubController{values: map[string]string{
			"status/bootstrap-phase":     `NOTICE BOOTSTRAP PROGRESS=45 TAG=onehop_create SUMMARY="Establishing"`,
			"status/circuit-established": "0",
		}}, nil
	}
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051"}, deps)
	if rep.Healthy {
		t.Fatal("bootstrapping tor must not be healthy")
	}
	if got := checkByName(t, rep, "bootstrap-complete"); got.Status != StatusFail {
		t.Errorf("bootstrap-complete = %s, want fail", got.Status)
	}
	if got := checkByName(t, rep, "circuit-established"); got.Status != StatusFail {
		t.Errorf("circuit-established = %s, want fail", got.Status)
	}
}

func TestCollectStaleFirewallFails(t *testing.T) {
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051"}, okDeps("stale"))
	if rep.Healthy {
		t.Fatal("stale firewall state must fail the verdict")
	}
	if got := checkByName(t, rep, "firewall-present"); got.Status != StatusFail {
		t.Errorf("firewall-present = %s, want fail", got.Status)
	}
}

func TestCollectSkipsDoNotFail(t *testing.T) {
	deps := okDeps("none")
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051", SkipExitIP: true, SkipDNS: true}, deps)
	if !rep.Healthy {
		t.Fatalf("skips must not fail the verdict:\n%s", RenderText(rep))
	}
	if got := checkByName(t, rep, "exit-ip-egress"); got.Status != StatusSkip {
		t.Errorf("exit-ip-egress = %s, want skip", got.Status)
	}
	if got := checkByName(t, rep, "dnsport-liveness"); got.Status != StatusSkip {
		t.Errorf("dnsport-liveness = %s, want skip", got.Status)
	}
	if got := checkByName(t, rep, "firewall-present"); got.Status != StatusSkip {
		t.Errorf("firewall-present = %s, want skip outside system mode", got.Status)
	}
	if got := checkByName(t, rep, "ipv6-blocked"); got.Status != StatusSkip {
		t.Errorf("ipv6-blocked = %s, want skip outside system mode", got.Status)
	}
	if !strings.Contains(checkByName(t, rep, "ipv6-blocked").Detail, "IPv6") {
		t.Error("ipv6 skip must explain the per-app gap")
	}
}

func TestCollectAuthFailureFails(t *testing.T) {
	deps := okDeps("none")
	deps.AuthControl = func(c Controller, cookies []string) error {
		return errors.New("doctor: control auth rejected by 1 cookie candidate(s)")
	}
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051"}, deps)
	if rep.Healthy {
		t.Fatal("failed auth must not be healthy")
	}
	if got := checkByName(t, rep, "control-auth"); got.Status != StatusFail {
		t.Errorf("control-auth = %s, want fail", got.Status)
	}
}

func TestJSONContractStable(t *testing.T) {
	rep := Collect(Options{ControlAddr: "127.0.0.1:19051"}, okDeps("none"))
	out, err := RenderJSON(rep)
	if err != nil {
		t.Fatalf("RenderJSON: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(out), &decoded); err != nil {
		t.Fatalf("report is not JSON: %v", err)
	}
	for _, k := range []string{"control_addr", "socks_addr", "healthy", "checks"} {
		if _, ok := decoded[k]; !ok {
			t.Errorf("JSON missing field %q: %s", k, out)
		}
	}
	checks, _ := decoded["checks"].([]any)
	if len(checks) == 0 {
		t.Fatalf("no checks in JSON: %s", out)
	}
	first, _ := checks[0].(map[string]any)
	for _, k := range []string{"name", "status", "detail"} {
		if _, ok := first[k]; !ok {
			t.Errorf("check JSON missing field %q: %s", k, out)
		}
	}
}

func TestRenderTextMarks(t *testing.T) {
	rep := Report{Healthy: false, Checks: []Check{
		{Name: "a", Status: StatusPass, Detail: "fine"},
		{Name: "b", Status: StatusFail, Detail: "broken"},
		{Name: "c", Status: StatusSkip, Detail: "n/a"},
	}}
	text := RenderText(rep)
	for _, want := range []string{"[ok]", "[FAIL]", "[skip]", "UNHEALTHY"} {
		if !strings.Contains(text, want) {
			t.Errorf("text missing %q:\n%s", want, text)
		}
	}
}

func TestAuthAnyPicksReadableCookie(t *testing.T) {
	dir := t.TempDir()
	good := dir + "/good.cookie"
	bad := dir + "/bad.cookie"
	if err := writeFile(good, "x"); err != nil {
		t.Fatal(err)
	}
	if err := writeFile(bad, "y"); err != nil {
		t.Fatal(err)
	}
	stub := &stubController{authOK: map[string]bool{good: true}}
	if err := AuthAny(stub, []string{dir + "/missing.cookie", bad, good}); err != nil {
		t.Fatalf("AuthAny should accept the good cookie: %v", err)
	}
	if err := AuthAny(stub, []string{bad}); err == nil {
		t.Fatal("AuthAny must fail when every cookie is rejected")
	}
	if err := AuthAny(stub, []string{dir + "/missing.cookie"}); err == nil {
		t.Fatal("AuthAny must fail when no cookie is readable")
	}
}

func writeFile(p, body string) error {
	return os.WriteFile(p, []byte(body), 0o600)
}

// --- Live-loopback probes: stub DNS and stub SOCKS+HTTP servers. ---

// stubDNS answers one canned response per query: NOERROR with one answer,
// echoing the request ID. rcodeOverride forces a refusal reply.
func startStubDNS(t *testing.T, rcodeOverride int) string {
	t.Helper()
	pc, err := net.ListenPacket("udp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pc.Close() })
	go func() {
		buf := make([]byte, 512)
		for {
			n, addr, err := pc.ReadFrom(buf)
			if err != nil {
				return
			}
			if n < 12 {
				continue
			}
			resp := []byte{buf[0], buf[1], 0x81, 0x80 | byte(rcodeOverride), 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00}
			resp = append(resp, buf[12:n]...)
			resp = append(resp, 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x04, 93, 184, 216, 34)
			pc.WriteTo(resp, addr)
		}
	}()
	return pc.LocalAddr().String()
}

func TestQueryDNSAgainstStub(t *testing.T) {
	if err := QueryDNS(startStubDNS(t, 0), "example.com", 5*time.Second); err != nil {
		t.Fatalf("QueryDNS: %v", err)
	}
	if err := QueryDNS(startStubDNS(t, 3), "example.com", 5*time.Second); err == nil {
		t.Fatal("refused query must error")
	}
	if err := QueryDNS("127.0.0.1:1", "example.com", 300*time.Millisecond); err == nil {
		t.Fatal("unreachable DNS must error (not hang)")
	}
}

// stubSocksHTTP speaks enough SOCKS5 for FetchExitIP (no-auth hello,
// CONNECT accept) then serves one canned HTTP response.
func startStubSocksHTTP(t *testing.T, httpBody string) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				hello := make([]byte, 3)
				if _, err := io.ReadFull(c, hello); err != nil {
					return
				}
				c.Write([]byte{0x05, 0x00})
				hdr := make([]byte, 4)
				if _, err := io.ReadFull(c, hdr); err != nil {
					return
				}
				rest := 0
				switch hdr[3] {
				case 0x01:
					rest = 4 + 2
				case 0x04:
					rest = 16 + 2
				case 0x03:
					ln1 := make([]byte, 1)
					if _, err := io.ReadFull(c, ln1); err != nil {
						return
					}
					rest = int(ln1[0]) + 2
				default:
					return
				}
				io.CopyN(io.Discard, c, int64(rest))
				c.Write([]byte{0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80})
				req := make([]byte, 4096)
				n, _ := c.Read(req)
				_ = n
				io.WriteString(c, httpBody)
			}(conn)
		}
	}()
	return ln.Addr().String()
}

func TestFetchExitIPAgainstStub(t *testing.T) {
	ok := "HTTP/1.0 200 OK\r\nContent-Type: application/json\r\n\r\n{\"IsTor\":true,\"IP\":\"203.0.113.7\"}"
	ip, err := FetchExitIP(startStubSocksHTTP(t, ok), "check.torproject.org", 80, "/api/ip", 5*time.Second)
	if err != nil {
		t.Fatalf("FetchExitIP: %v", err)
	}
	if ip != "203.0.113.7" {
		t.Fatalf("ip = %q", ip)
	}
	badStatus := "HTTP/1.0 500 Boom\r\n\r\n{}"
	if _, err := FetchExitIP(startStubSocksHTTP(t, badStatus), "h", 80, "/", 5*time.Second); err == nil {
		t.Error("non-200 egress page must error")
	}
	noIP := "HTTP/1.0 200 OK\r\n\r\n{\"IsTor\":false}"
	if _, err := FetchExitIP(startStubSocksHTTP(t, noIP), "h", 80, "/", 5*time.Second); err == nil {
		t.Error("egress page without IP must error")
	}
	if _, err := FetchExitIP("127.0.0.1:1", "h", 80, "/", 300*time.Millisecond); err == nil {
		t.Error("unreachable SOCKS must error (not hang)")
	}
}

func TestGuessSocks(t *testing.T) {
	if got := GuessSocks("127.0.0.1:9151"); got != "127.0.0.1:9150" {
		t.Fatalf("tor-browser control must map to 9150, got %q", got)
	}
	if got := GuessSocks("127.0.0.1:9051"); got != "127.0.0.1:9050" {
		t.Fatalf("default control must map to 9050, got %q", got)
	}
}

func TestBuildQueryRoundTrip(t *testing.T) {
	pkt, id, err := buildQuery("example.com")
	if err != nil {
		t.Fatalf("buildQuery: %v", err)
	}
	if len(pkt) < 12 || binary.BigEndian.Uint16(pkt[0:2]) != id {
		t.Fatalf("query header wrong: %x", pkt)
	}
	if _, _, err := buildQuery(""); err == nil {
		t.Error("empty name must error")
	}
}
