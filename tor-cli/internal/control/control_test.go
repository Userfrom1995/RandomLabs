package control

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// fakeServer is a scripted control-port stub.
type fakeServer struct {
	t       *testing.T
	ln      net.Listener
	cookie  []byte // expected cookie; nil skips auth checks
	phase   string
	circuit string
	version string
	ready   bool // when true, phase=100/done and circuit=1
}

func startFake(t *testing.T, fs *fakeServer) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	fs.t = t
	fs.ln = ln
	go fs.serve()
	t.Cleanup(func() { ln.Close() })
	return ln.Addr().String()
}

func (fs *fakeServer) serve() {
	for {
		conn, err := fs.ln.Accept()
		if err != nil {
			return
		}
		go fs.handle(conn)
	}
}

func (fs *fakeServer) handle(conn net.Conn) {
	defer conn.Close()
	r := bufio.NewReader(conn)
	phase := fs.phase
	circuit := fs.circuit
	if fs.ready {
		phase = `NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"`
		circuit = "1"
	}
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		line = strings.TrimSpace(line)
		up := strings.ToUpper(line)
		switch {
		case up == "PROTOCOLINFO":
			fmt.Fprint(conn, "250-AUTH METHODS=COOKIE COOKIEFILE=\"/tmp/x\"\r\n250-VERSION Tor=\"0.4.8.9\"\r\n250 OK\r\n")
		case strings.HasPrefix(up, "AUTHENTICATE"):
			arg := strings.TrimSpace(line[len("AUTHENTICATE"):])
			want := ""
			for _, b := range fs.cookie {
				want += fmt.Sprintf("%02X", b)
			}
			if fs.cookie == nil || strings.EqualFold(arg, want) {
				fmt.Fprint(conn, "250 OK\r\n")
			} else {
				fmt.Fprint(conn, "515 Authentication failed\r\n")
			}
		case strings.HasPrefix(up, "GETINFO "):
			keys := strings.Fields(line[len("GETINFO "):])
			for _, k := range keys {
				switch strings.ToLower(k) {
				case "status/bootstrap-phase":
					fmt.Fprintf(conn, "250-status/bootstrap-phase=%s\r\n", phase)
				case "status/circuit-established":
					fmt.Fprintf(conn, "250-status/circuit-established=%s\r\n", circuit)
				case "version":
					fmt.Fprintf(conn, "250-version=%s\r\n", fs.version)
				case "circuit-status":
					fmt.Fprint(conn, "250+circuit-status=\r\n12 BUILT $AAA PURPOSE=GENERAL\r\n.\r\n250 OK\r\n")
				}
			}
			fmt.Fprint(conn, "250 OK\r\n")
		case up == "TAKEOWNERSHIP" || strings.HasPrefix(up, "RESETCONF") || strings.HasPrefix(up, "SIGNAL"):
			fmt.Fprint(conn, "250 OK\r\n")
		default:
			fmt.Fprint(conn, "510 Unrecognized command\r\n")
		}
	}
}

func dial(t *testing.T, fs *fakeServer) *Client {
	t.Helper()
	c, err := Dial(startFake(t, fs), 5*time.Second)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { c.Close() })
	return c
}

func TestProtocolInfo(t *testing.T) {
	c := dial(t, &fakeServer{})
	lines, err := c.ProtocolInfo()
	if err != nil {
		t.Fatalf("PROTOCOLINFO: %v", err)
	}
	if len(lines) == 0 {
		t.Fatal("expected reply lines")
	}
}

func TestAuthCookieOK(t *testing.T) {
	cookie := make([]byte, 32)
	for i := range cookie {
		cookie[i] = byte(i)
	}
	c := dial(t, &fakeServer{cookie: cookie})
	dir := t.TempDir()
	p := filepath.Join(dir, "control_auth_cookie")
	if err := os.WriteFile(p, cookie, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := c.AuthCookie(p); err != nil {
		t.Fatalf("auth: %v", err)
	}
}

func TestAuthCookieBadMapsToErrBadAuth(t *testing.T) {
	cookie := make([]byte, 32)
	for i := range cookie {
		cookie[i] = byte(i + 1)
	}
	c := dial(t, &fakeServer{cookie: make([]byte, 32)})
	p := filepath.Join(t.TempDir(), "control_auth_cookie")
	if err := os.WriteFile(p, cookie, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := c.AuthCookie(p); err != ErrBadAuth {
		t.Fatalf("want ErrBadAuth, got %v", err)
	}
}

func TestAuthCookieWrongSize(t *testing.T) {
	c := dial(t, &fakeServer{})
	p := filepath.Join(t.TempDir(), "control_auth_cookie")
	os.WriteFile(p, []byte("short"), 0o600)
	if err := c.AuthCookie(p); err == nil {
		t.Fatal("expected size error")
	}
}

func TestGetInfoAndReadiness(t *testing.T) {
	c := dial(t, &fakeServer{ready: true, version: "0.4.8.9"})
	phase, err := c.GetOne("status/bootstrap-phase")
	if err != nil {
		t.Fatal(err)
	}
	st := ParseBootstrapPhase(phase)
	if st.Progress != 100 || st.Tag != "done" {
		t.Fatalf("bad parse: %+v", st)
	}
	est, err := c.GetOne("status/circuit-established")
	if err != nil {
		t.Fatal(err)
	}
	st.CircuitEstablished = ParseCircuitEstablished(est)
	if !st.Ready() {
		t.Fatal("expected ready")
	}
}

func TestParseBootstrapPhaseVariants(t *testing.T) {
	cases := []struct {
		in       string
		progress int
		tag      string
	}{
		{`NOTICE BOOTSTRAP PROGRESS=0 TAG=starting SUMMARY="Starting"`, 0, "starting"},
		{`NOTICE BOOTSTRAP PROGRESS=80 TAG=conn_done SUMMARY="Connected"`, 80, "conn_done"},
		{`NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"`, 100, "done"},
		{`garbage without fields`, 0, ""},
	}
	for _, tc := range cases {
		st := ParseBootstrapPhase(tc.in)
		if st.Progress != tc.progress || st.Tag != tc.tag {
			t.Errorf("parse %q: got %+v", tc.in, st)
		}
	}
	// 100% without a circuit must NOT be ready.
	st := ParseBootstrapPhase(cases[2].in)
	if st.Ready() {
		t.Error("100%/done without circuit must not be Ready")
	}
	st.CircuitEstablished = true
	if !st.Ready() {
		t.Error("100%/done + circuit must be Ready")
	}
}

func TestHasBuiltCircuit(t *testing.T) {
	if !HasBuiltCircuit("12 BUILT $AAA PURPOSE=GENERAL\n") {
		t.Error("expected BUILT detection")
	}
	if HasBuiltCircuit("12 EXTENDED $AAA PURPOSE=GENERAL\n") {
		t.Error("EXTENDED must not count as BUILT")
	}
}

func TestTakeOwnership(t *testing.T) {
	c := dial(t, &fakeServer{})
	if err := c.TakeOwnership(); err != nil {
		t.Fatalf("take ownership: %v", err)
	}
}

func TestStatusErrorSurface(t *testing.T) {
	c := dial(t, &fakeServer{})
	if _, err := c.send("BOGUSCMD"); err == nil {
		t.Fatal("expected error for unknown command")
	} else {
		se, ok := err.(*StatusError)
		if !ok {
			t.Fatalf("want *StatusError, got %T", err)
		}
		if se.Code != 510 {
			t.Fatalf("want 510, got %d", se.Code)
		}
	}
}
