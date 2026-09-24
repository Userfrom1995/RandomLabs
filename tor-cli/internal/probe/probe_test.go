package probe

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeSOCKS is a minimal SOCKS5 server: it records CONNECT targets
// (proving socks5h domain passing) and pipes to a fixed local target.
type fakeSOCKS struct {
	ln     net.Listener
	target string // host:port the proxy always dials

	mu       sync.Mutex
	hosts    []string // CONNECT target hostnames seen (raw bytes decoded)
	reject   bool     // reply with connection-refused instead of piping
	handOnly bool     // answer the greeting then hang up (handshake only)
}

func startFakeSOCKS(t *testing.T, target string) *fakeSOCKS {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	f := &fakeSOCKS{ln: ln, target: target}
	go f.serve()
	t.Cleanup(func() { _ = ln.Close() })
	return f
}

func (f *fakeSOCKS) addr() string { return f.ln.Addr().String() }

func (f *fakeSOCKS) seenHosts() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.hosts...)
}

func (f *fakeSOCKS) serve() {
	for {
		c, err := f.ln.Accept()
		if err != nil {
			return
		}
		go f.handle(c)
	}
}

func (f *fakeSOCKS) handle(c net.Conn) {
	defer c.Close()
	_ = c.SetDeadline(time.Now().Add(5 * time.Second))
	// Greeting: VER NMETHODS METHODS...
	hdr := make([]byte, 2)
	if _, err := io.ReadFull(c, hdr); err != nil {
		return
	}
	if _, err := io.CopyN(io.Discard, c, int64(hdr[1])); err != nil {
		return
	}
	if _, err := c.Write([]byte{0x05, 0x00}); err != nil {
		return
	}
	if f.handOnly {
		return
	}
	// Request: VER CMD RSV ATYP ...
	req := make([]byte, 4)
	if _, err := io.ReadFull(c, req); err != nil {
		return
	}
	if req[1] != 0x01 {
		_, _ = c.Write([]byte{0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0})
		return
	}
	var host string
	switch req[3] {
	case 0x01:
		b := make([]byte, 4)
		if _, err := io.ReadFull(c, b); err != nil {
			return
		}
		host = net.IP(b).String()
	case 0x04:
		b := make([]byte, 16)
		if _, err := io.ReadFull(c, b); err != nil {
			return
		}
		host = net.IP(b).String()
	case 0x03:
		l := make([]byte, 1)
		if _, err := io.ReadFull(c, l); err != nil {
			return
		}
		b := make([]byte, int(l[0]))
		if _, err := io.ReadFull(c, b); err != nil {
			return
		}
		host = string(b)
	default:
		_, _ = c.Write([]byte{0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0})
		return
	}
	pb := make([]byte, 2)
	if _, err := io.ReadFull(c, pb); err != nil {
		return
	}
	f.mu.Lock()
	f.hosts = append(f.hosts, host)
	reject := f.reject
	target := f.target
	f.mu.Unlock()

	if reject {
		_, _ = c.Write([]byte{0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0})
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
}

// unreachableSocks returns a loopback address nothing listens on.
func unreachableSocks(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Skipf("no loopback: %v", err)
	}
	addr := ln.Addr().String()
	_ = ln.Close()
	return addr
}

func TestVerifyUnreachableEndpointIsUnverified(t *testing.T) {
	res := Verify(Options{SocksAddr: unreachableSocks(t), Timeout: time.Second})
	if res.Verdict != VerdictUnverified {
		t.Fatalf("verdict = %s, want unverified (%s)", res.Verdict, res.Detail)
	}
	if res.FailedCheck != "socks_handshake" {
		t.Fatalf("failed check = %q, want socks_handshake", res.FailedCheck)
	}
}

func TestVerifyNoEndpointIsUnverified(t *testing.T) {
	res := Verify(Options{Timeout: time.Second})
	if res.Verdict != VerdictUnverified || res.FailedCheck != "socks_endpoint" {
		t.Fatalf("got %s/%q, want unverified/socks_endpoint", res.Verdict, res.FailedCheck)
	}
}

func TestVerifyGatesFailIsDegraded(t *testing.T) {
	f := startFakeSOCKS(t, "127.0.0.1:1")
	f.handOnly = true
	res := Verify(Options{SocksAddr: f.addr(), Timeout: time.Second,
		GatesReady: false, GatesNote: "tor bootstrapping (45% tag \"conn_dir\")"})
	if res.Verdict != VerdictDegraded || res.FailedCheck != "readiness_gates" {
		t.Fatalf("got %s/%q, want degraded/readiness_gates (%s)", res.Verdict, res.FailedCheck, res.Detail)
	}
	if !strings.Contains(res.Detail, "45%") {
		t.Fatalf("detail must carry the gate note: %q", res.Detail)
	}
}

func TestVerifyProtectedThroughSocks5h(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/ip" {
			http.NotFound(w, r)
			return
		}
		fmt.Fprint(w, `{"IsTor":true,"IP":"203.0.113.7"}`)
	}))
	defer srv.Close()
	f := startFakeSOCKS(t, srv.Listener.Addr().String())
	// A hostname check-url forces a DOMAINNAME CONNECT: the client must
	// hand the name to the proxy unresolved (socks5h semantics). The
	// fake proxy dials its configured target regardless of that name.
	res := Verify(Options{
		SocksAddr:  f.addr(),
		CheckURL:   "http://tor-check.invalid/api/ip",
		Timeout:    3 * time.Second,
		GatesReady: true,
	})
	if res.Verdict != VerdictProtected {
		t.Fatalf("verdict = %s (%s / %s), want protected", res.Verdict, res.FailedCheck, res.Detail)
	}
	if res.ExitIP != "203.0.113.7" {
		t.Fatalf("exit IP = %q", res.ExitIP)
	}
	seen := f.seenHosts()
	if len(seen) == 0 || seen[len(seen)-1] != "tor-check.invalid" {
		t.Fatalf("CONNECT target must be the unresolved DOMAINNAME, got %v", seen)
	}
}

func TestVerifyIsTorFalseIsDegraded(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":false,"IP":"198.51.100.9"}`)
	}))
	defer srv.Close()
	f := startFakeSOCKS(t, srv.Listener.Addr().String())
	res := Verify(Options{SocksAddr: f.addr(), CheckURL: "http://x.invalid/api/ip",
		Timeout: 3 * time.Second, GatesReady: true})
	if res.Verdict != VerdictDegraded || res.FailedCheck != "istor_probe" {
		t.Fatalf("got %s/%q, want degraded/istor_probe", res.Verdict, res.FailedCheck)
	}
	if res.ExitIP != "198.51.100.9" {
		t.Fatalf("exit IP must still be reported: %q", res.ExitIP)
	}
	if !strings.Contains(res.Detail, "IsTor=false") {
		t.Fatalf("detail must name the failing proof: %q", res.Detail)
	}
}

func TestVerifyBadShapeIsDegraded(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"result":"yes"}`)
	}))
	defer srv.Close()
	f := startFakeSOCKS(t, srv.Listener.Addr().String())
	res := Verify(Options{SocksAddr: f.addr(), CheckURL: "http://x.invalid/api/ip",
		Timeout: 3 * time.Second, GatesReady: true})
	if res.Verdict != VerdictDegraded || res.FailedCheck != "istor_probe" {
		t.Fatalf("got %s/%q, want degraded/istor_probe (%s)", res.Verdict, res.FailedCheck, res.Detail)
	}
}

func TestVerifyProxyRejectIsDegraded(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer srv.Close()
	f := startFakeSOCKS(t, srv.Listener.Addr().String())
	f.reject = true
	res := Verify(Options{SocksAddr: f.addr(), CheckURL: "http://x.invalid/api/ip",
		Timeout: 2 * time.Second, GatesReady: true})
	if res.Verdict != VerdictDegraded || res.FailedCheck != "istor_probe" {
		t.Fatalf("got %s/%q, want degraded/istor_probe (%s)", res.Verdict, res.FailedCheck, res.Detail)
	}
}

func TestSocks5ConnectIPLiteralUsesATYPIP(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"IsTor":true,"IP":"192.0.2.1"}`)
	}))
	defer srv.Close()
	f := startFakeSOCKS(t, srv.Listener.Addr().String())
	host, port, _ := net.SplitHostPort(strings.TrimPrefix(srv.URL, "http://"))
	checkURL := fmt.Sprintf("http://%s:%s/api/ip", host, port)
	res := Verify(Options{SocksAddr: f.addr(), CheckURL: checkURL,
		Timeout: 3 * time.Second, GatesReady: true})
	if res.Verdict != VerdictProtected {
		t.Fatalf("verdict = %s (%s / %s), want protected", res.Verdict, res.FailedCheck, res.Detail)
	}
	seen := f.seenHosts()
	if len(seen) == 0 || seen[len(seen)-1] != host {
		t.Fatalf("CONNECT host = %v, want %s", seen, host)
	}
}

func TestSocksHandshakeRejectsNonSOCKS(t *testing.T) {
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
			_, _ = c.Write([]byte("HTTP/1.1 400\r\n\r\n"))
			_ = c.Close()
		}
	}()
	res := Verify(Options{SocksAddr: ln.Addr().String(), Timeout: time.Second})
	if res.Verdict != VerdictUnverified || res.FailedCheck != "socks_handshake" {
		t.Fatalf("got %s/%q, want unverified/socks_handshake", res.Verdict, res.FailedCheck)
	}
}
