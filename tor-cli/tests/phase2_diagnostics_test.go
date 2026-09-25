package tests

// Phase 2 diagnostics regression suite (Refs #436, builder-owned): black-box
// honesty for the new verbs. Hermetic (no tor needed) except for the
// scripted control stub below, which pins the newnym success and
// rate-limit paths end to end through the real binary.

import (
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestPhase2UsageErrorsExit2(t *testing.T) {
	bin := buildTorshim(t)
	for _, args := range [][]string{
		{"newnym", "extra-arg"},
		{"doctor", "extra-arg"},
		{"newnym", "--bogus-flag-xyz"},
		{"doctor", "--bogus-flag-xyz"},
		{"status", "--bogus-flag-xyz"},
	} {
		_, _, code := runBin(bin, args...)
		if code != 2 {
			t.Fatalf("%v exit=%d, want usage exit 2", args, code)
		}
	}
}

func TestPhase2FailClosedWithoutTor(t *testing.T) {
	bin := buildTorshim(t)
	// Point at ports nothing answers so the test is hermetic.
	dead := "127.0.0.1:19099"
	if _, _, code := runBin(bin, "newnym", "--control", dead); code != 3 {
		t.Fatalf("newnym without tor exit=%d, want 3 (fail-closed)", code)
	}
	if _, _, code := runBin(bin, "doctor", "--control", dead, "--skip-exit-ip", "--skip-dns"); code != 3 {
		t.Fatalf("doctor without tor exit=%d, want 3 (unhealthy)", code)
	}
	// status/version verbose degrade to notes, never failures.
	if _, _, code := runBin(bin, "status", "--control", dead, "-v"); code != 0 {
		t.Fatalf("status --verbose without tor exit=%d, want 0", code)
	}
	if _, _, code := runBin(bin, "version", "-v"); code != 0 {
		t.Fatalf("version -v exit=%d, want 0", code)
	}
}

func TestPhase2DoctorJSONContract(t *testing.T) {
	bin := buildTorshim(t)
	out, _, code := runBin(bin, "doctor", "--control", "127.0.0.1:19099",
		"--skip-exit-ip", "--skip-dns", "--json")
	if code != 3 {
		t.Fatalf("doctor exit=%d, want 3", code)
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(out), &decoded); err != nil {
		t.Fatalf("doctor --json is not JSON: %v\n%s", err, out)
	}
	if decoded["healthy"] != false {
		t.Errorf("doctor without tor must report healthy=false: %s", out)
	}
	checks, _ := decoded["checks"].([]any)
	if len(checks) == 0 {
		t.Fatalf("doctor --json carries no checks: %s", out)
	}
}

// stubControl serves a ready tor script; newnymLimited selects the 515
// rate-limit answer to SIGNAL NEWNYM.
func stubControl(t *testing.T, newnymLimited bool) (addr, cookie string) {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	cookiePath := filepath.Join(t.TempDir(), "cookie")
	if err := os.WriteFile(cookiePath, []byte(strings.Repeat("k", 32)), 0o600); err != nil {
		t.Fatal(err)
	}
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				buf := make([]byte, 4096)
				for {
					n, err := c.Read(buf)
					if err != nil || n == 0 {
						return
					}
					line := strings.TrimSpace(strings.ToUpper(string(buf[:n])))
					reply := "552 Unrecognized key\r\n"
					switch {
					case strings.HasPrefix(line, "AUTHENTICATE"):
						reply = "250 OK\r\n"
					case line == "GETINFO STATUS/BOOTSTRAP-PHASE":
						reply = "250-status/bootstrap-phase=NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"\r\n250 OK\r\n"
					case line == "GETINFO STATUS/CIRCUIT-ESTABLISHED":
						reply = "250-status/circuit-established=1\r\n250 OK\r\n"
					case strings.HasPrefix(line, "GETINFO"):
						reply = "552 Unrecognized key\r\n"
					case line == "SIGNAL NEWNYM" && newnymLimited:
						reply = "515 Rate limited: please wait 10 seconds\r\n"
					case line == "SIGNAL NEWNYM":
						reply = "250 OK\r\n"
					}
					c.Write([]byte(reply))
				}
			}(conn)
		}
	}()
	// Wait for the listener to accept (hermetic, loopback, fast).
	deadline := time.Now().Add(5 * time.Second)
	for {
		c, err := net.DialTimeout("tcp", ln.Addr().String(), time.Second)
		if err == nil {
			c.Close()
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("stub control never came up")
		}
		time.Sleep(10 * time.Millisecond)
	}
	return ln.Addr().String(), cookiePath
}

func TestPhase2NewnymSuccessEndToEnd(t *testing.T) {
	bin := buildTorshim(t)
	addr, cookie := stubControl(t, false)
	out, _, code := runBin(bin, "newnym", "--control", addr, "--cookie", cookie)
	if code != 0 {
		t.Fatalf("newnym exit=%d, want 0 (out=%q)", code, out)
	}
	if !strings.Contains(out, "new identity requested") {
		t.Errorf("newnym success must say so: %q", out)
	}
}

func TestPhase2NewnymRateLimitHonest(t *testing.T) {
	bin := buildTorshim(t)
	addr, cookie := stubControl(t, true)
	_, errOut, code := runBin(bin, "newnym", "--control", addr, "--cookie", cookie)
	if code != 1 {
		t.Fatalf("rate-limited newnym exit=%d, want 1", code)
	}
	if !strings.Contains(strings.ToLower(errOut), "rate") {
		t.Errorf("rate-limited newnym must say rate-limited: %q", errOut)
	}
}
