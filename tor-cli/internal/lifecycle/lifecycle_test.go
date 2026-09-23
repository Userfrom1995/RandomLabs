package lifecycle

import (
	"net"
	"strings"
	"testing"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
)

func TestGenerateTorrc(t *testing.T) {
	rc := GenerateTorrc("/tmp/abs-dir", nil)
	for _, want := range []string{
		"DataDirectory /tmp/abs-dir",
		"SocksPort 127.0.0.1:auto",
		"SocksPortWriteToFile",
		"ControlPort 127.0.0.1:auto",
		"ControlPortWriteToFile",
		"DNSPort 127.0.0.1:auto",
		"CookieAuthentication 1",
		"SafeSocks 1",
	} {
		if !strings.Contains(rc, want) {
			t.Errorf("torrc missing %q:\n%s", want, rc)
		}
	}
	// No loopback escape: every port line must bind 127.0.0.1.
	for _, ln := range strings.Split(rc, "\n") {
		if strings.HasSuffix(ln, ":auto") && !strings.Contains(ln, "127.0.0.1:auto") {
			t.Errorf("non-loopback auto port line: %q", ln)
		}
	}
}

func TestGenerateTorrcExtraPassthrough(t *testing.T) {
	rc := GenerateTorrc("/tmp/d", []string{"UseBridges 1", "# comment", "", "Bridge obfs4 1.2.3.4:443 ABC"})
	if !strings.Contains(rc, "UseBridges 1") || !strings.Contains(rc, "Bridge obfs4") {
		t.Errorf("extra torrc lines lost:\n%s", rc)
	}
	if strings.Contains(rc, "# comment") {
		t.Errorf("comments should be skipped:\n%s", rc)
	}
}

func TestParsePortFile(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"9050", 9050, true},
		{"127.0.0.1:9050", 9050, true},
		{"[::1]:9150", 9150, true},
		{"", 0, false},
		{"abc", 0, false},
		{"0", 0, false},
		{"99999", 0, false},
	}
	for _, tc := range cases {
		got, err := parsePortFile(tc.in)
		if tc.ok && (err != nil || got != tc.want) {
			t.Errorf("parse %q: got %d,%v want %d", tc.in, got, err, tc.want)
		}
		if !tc.ok && err == nil {
			t.Errorf("parse %q: expected error", tc.in)
		}
	}
}

func TestProbeSocksHandshake(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func() {
				defer c.Close()
				buf := make([]byte, 3)
				c.SetDeadline(time.Now().Add(2 * time.Second))
				if _, err := c.Read(buf); err != nil {
					return
				}
				if buf[0] == 0x05 {
					c.Write([]byte{0x05, 0x00})
				}
			}()
		}
	}()
	if err := ProbeSocks(ln.Addr().String(), 2*time.Second); err != nil {
		t.Fatalf("handshake: %v", err)
	}
	// A plain TCP listener that never handshakes must fail the probe.
	ln2, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln2.Close()
	go func() {
		for {
			c, err := ln2.Accept()
			if err != nil {
				return
			}
			go func() {
				defer c.Close()
				time.Sleep(3 * time.Second)
			}()
		}
	}()
	if err := ProbeSocks(ln2.Addr().String(), 500*time.Millisecond); err == nil {
		t.Fatal("expected probe failure against non-SOCKS listener")
	}
}

func TestWaitReadySuccess(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go fakeReadyControl(ln)
	c, err := control.Dial(ln.Addr().String(), 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err := WaitReady(c, time.Now().Add(5*time.Second), 50*time.Millisecond); err != nil {
		t.Fatalf("WaitReady: %v", err)
	}
}

func TestWaitReadyTimeout(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go fakeStuckControl(ln)
	c, err := control.Dial(ln.Addr().String(), 2*time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err := WaitReady(c, time.Now().Add(200*time.Millisecond), 50*time.Millisecond); err == nil {
		t.Fatal("expected timeout for stuck bootstrap")
	}
}

// fakeReadyControl answers bootstrap 100%/done + circuit 1.
func fakeReadyControl(ln net.Listener) {
	serveLines(ln, map[string]string{
		"STATUS/BOOTSTRAP-PHASE": `250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"`,
		"STATUS/CIRCUIT-ESTABLISHED": "250-status/circuit-established=1",
	})
}

// fakeStuckControl answers bootstrap 10% forever.
func fakeStuckControl(ln net.Listener) {
	serveLines(ln, map[string]string{
		"STATUS/BOOTSTRAP-PHASE": `250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=10 TAG=starting SUMMARY="Starting"`,
		"STATUS/CIRCUIT-ESTABLISHED": "250-status/circuit-established=0",
	})
}

func serveLines(ln net.Listener, answers map[string]string) {
	for {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		go func() {
			defer conn.Close()
			buf := make([]byte, 4096)
			for {
				n, err := conn.Read(buf)
				if err != nil || n == 0 {
					return
				}
				line := strings.ToUpper(strings.TrimSpace(string(buf[:n])))
				key := strings.TrimPrefix(line, "GETINFO ")
				if a, ok := answers[key]; ok {
					conn.Write([]byte(a + "\r\n250 OK\r\n"))
				} else {
					conn.Write([]byte("250 OK\r\n"))
				}
			}
		}()
	}
}

func TestStateStrings(t *testing.T) {
	if Absent.String() != "absent" || Ready.String() != "ready" || Foreign.String() != "foreign" {
		t.Fatal("state strings wrong")
	}
}

func TestGenerateTorrcTrans(t *testing.T) {
	plain := GenerateTorrc("/tmp/d", nil)
	if strings.Contains(plain, "TransPort") {
		t.Fatalf("default torrc must not enable TransPort:\n%s", plain)
	}
	rc := GenerateTorrcTrans("/tmp/d", nil, 9040)
	if !strings.Contains(rc, "TransPort 127.0.0.1:9040") {
		t.Fatalf("trans torrc missing fixed TransPort:\n%s", rc)
	}
	if !strings.Contains(rc, "IsolateClientAddr") {
		t.Fatalf("trans torrc missing stream isolation flags:\n%s", rc)
	}
	// Loopback binding still holds with TransPort on.
	for _, ln := range strings.Split(rc, "\n") {
		if strings.HasSuffix(ln, ":auto") && !strings.Contains(ln, "127.0.0.1:auto") {
			t.Fatalf("non-loopback auto port line: %q", ln)
		}
	}
}
