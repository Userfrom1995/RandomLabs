package tests

// Tester Phase 2 diagnostics suite (Refs #436, tester-owned): black-box
// honesty for the new `newnym` / `doctor` verbs plus the `-v` control plane.
//
// Hermetic by construction (loopback stubs or dead ports only, no tor
// binary needed). Every case was driven live against the real binary
// before being pinned here.

import (
	"encoding/json"
	"net"
	"os"
	"strings"
	"testing"
)

// garbageControl serves 999-lines to every command: AUTHENTICATE never
// yields 250 OK, so auth must fail closed instead of being trusted.
func garbageControl(t *testing.T) string {
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
				buf := make([]byte, 4096)
				for {
					n, err := c.Read(buf)
					if err != nil || n == 0 {
						return
					}
					c.Write([]byte("999 GARBAGE LINE WITH NO STRUCTURE\r\n"))
				}
			}(conn)
		}
	}()
	return ln.Addr().String()
}

func TestTesterPhase2VerboseDegradesWithoutTor(t *testing.T) {
	bin := buildTorshim(t)
	dead := "127.0.0.1:19099"
	// version -v with no control endpoint: binary versions stand, note on stderr.
	so, se, code := runBin(bin, "version", "-v")
	if code != 0 {
		t.Fatalf("version -v exit=%d, want 0", code)
	}
	if !strings.Contains(so, "torshim") {
		t.Fatalf("version -v lost the version report:\n%s", so)
	}
	if !strings.Contains(se, "torshim verbose") {
		t.Fatalf("version -v must note the missing endpoint on stderr, got:\n%s", se)
	}
	// status -v with a dead endpoint: report stands, diagnostics degrade.
	if _, se, code := runBin(bin, "status", "--control", dead, "-v"); code != 0 {
		t.Fatalf("status -v without tor exit=%d, want 0", code)
	} else if !strings.Contains(se, "torshim verbose") {
		t.Fatalf("status -v must emit a verbose note, got:\n%s", se)
	}
}

func TestTesterPhase2DoctorVerboseNamesEndpoint(t *testing.T) {
	bin := buildTorshim(t)
	dead := "127.0.0.1:19099"
	_, se, code := runBin(bin, "doctor", "--control", dead,
		"--skip-exit-ip", "--skip-dns", "-v")
	if code != 3 {
		t.Fatalf("doctor without tor exit=%d, want 3 (unhealthy)", code)
	}
	if !strings.Contains(se, "torshim verbose") || !strings.Contains(se, dead) {
		t.Fatalf("doctor -v must name the endpoint it probed, got:\n%s", se)
	}
}

func TestTesterPhase2NewnymVerboseShowsDiagnostics(t *testing.T) {
	bin := buildTorshim(t)
	addr, cookie := stubControl(t, false)
	_, se, code := runBin(bin, "newnym", "--control", addr, "--cookie", cookie, "-v")
	if code != 0 {
		t.Fatalf("newnym -v exit=%d, want 0", code)
	}
	if !strings.Contains(se, "torshim verbose") || !strings.Contains(se, addr) {
		t.Fatalf("newnym -v must render pre-rotation diagnostics for %s, got:\n%s", addr, se)
	}
}

func TestTesterPhase2NewnymBadCookieFailClosed(t *testing.T) {
	bin := buildTorshim(t)
	addr, _ := stubControl(t, false)
	// A live endpoint with no readable cookie must refuse, never signal.
	_, _, code := runBin(bin, "newnym", "--control", addr,
		"--cookie", "/nonexistent-cookie-xyz")
	if code != 3 {
		t.Fatalf("newnym with unreadable cookie exit=%d, want 3 (fail-closed)", code)
	}
}

func TestTesterPhase2GarbageControlFailClosed(t *testing.T) {
	bin := buildTorshim(t)
	addr := garbageControl(t)
	cookieFile, err := os.CreateTemp(t.TempDir(), "cookie")
	if err != nil {
		t.Fatal(err)
	}
	cookieFile.WriteString(strings.Repeat("k", 32))
	cookieFile.Close()
	out, _, code := runBin(bin, "doctor", "--control", addr,
		"--cookie", cookieFile.Name(),
		"--skip-exit-ip", "--skip-dns", "--json")
	if code != 3 {
		t.Fatalf("doctor against garbage control exit=%d, want 3 (unhealthy)", code)
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(out), &decoded); err != nil {
		t.Fatalf("doctor --json is not JSON: %v\n%s", err, out)
	}
	if decoded["healthy"] != false {
		t.Fatalf("garbage control must report healthy=false:\n%s", out)
	}
	for _, c := range decoded["checks"].([]any) {
		m := c.(map[string]any)
		if m["name"] == "control-auth" && m["status"] == "pass" {
			t.Fatalf("garbage control must never pass auth:\n%s", out)
		}
	}
}

func TestTesterPhase2SkipsAlwaysCarryReasons(t *testing.T) {
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
	for _, c := range decoded["checks"].([]any) {
		m := c.(map[string]any)
		if m["status"] == "skip" && strings.TrimSpace(m["detail"].(string)) == "" {
			t.Fatalf("skip check %q carries no reason:\n%s", m["name"], out)
		}
	}
}

func TestTesterPhase2TorshimControlEnvResolution(t *testing.T) {
	bin := buildTorshim(t)
	addr, cookie := stubControl(t, false)
	env := append(os.Environ(), "TORSHIM_CONTROL="+addr)
	// No --control flag: the session export must resolve the endpoint.
	so, _, code := runBinEnv(bin, env, "newnym", "--cookie", cookie)
	if code != 0 {
		t.Fatalf("newnym via TORSHIM_CONTROL exit=%d, want 0 (out=%q)", code, so)
	}
	if !strings.Contains(so, "new identity requested") {
		t.Fatalf("newnym via env must confirm rotation: %q", so)
	}
}
