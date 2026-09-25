package perapp

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

// stubScript writes an executable shell script with the given body and
// returns its path. Scripts resolve through /bin/sh (dynamic ELF), so
// they pass the shim classifier and exercise supervision only.
func stubScript(t *testing.T, body string) string {
	t.Helper()
	p := filepath.Join(t.TempDir(), "stub-app")
	if err := os.WriteFile(p, []byte("#!/bin/sh\n"+body+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return p
}

// proxyStubArgv returns argv for a proxy-backend supervision stub.
// On Unix it is a shell script (extensionless exec works); on Windows
// an extensionless shebang script is not runnable and %PATH% resolution
// needs a PATHEXT-suffixed binary, so the stub runs through cmd.exe,
// which is always present and resolvable via LookPath/PATHEXT.
func proxyStubArgv(t *testing.T, kind string) []string {
	t.Helper()
	if runtime.GOOS != "windows" {
		switch kind {
		case "sleep30":
			return []string{stubScript(t, "sleep 30")}
		case "exit7":
			return []string{stubScript(t, "exit 7")}
		default:
			t.Fatalf("unknown proxy stub kind %q", kind)
			return nil
		}
	}
	switch kind {
	case "sleep30":
		// ping -n 30 waits ~29 s: long-lived enough for the detach
		// prompt-return assertion without a real browser.
		return []string{"cmd", "/C", "ping", "-n", "30", "127.0.0.1"}
	case "exit7":
		return []string{"cmd", "/C", "exit", "7"}
	default:
		t.Fatalf("unknown proxy stub kind %q", kind)
		return nil
	}
}
// withFakeShim points TORSOCKS_LIB at a present file so the shim path
// (not installed on CI runners) proceeds to supervision.
func withFakeShim(t *testing.T) {
	t.Helper()
	fake := filepath.Join(t.TempDir(), "libtorsocks.so")
	if err := os.WriteFile(fake, []byte("fake"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("TORSOCKS_LIB", fake)
}

func TestWaitPassesExitCode(t *testing.T) {
	if NeedsProxy() {
		t.Skip("shim wait path is Linux-only; proxy covered below")
	}
	withFakeShim(t)
	app := stubScript(t, "exit 42")
	res, err := RunWithOptions("127.0.0.1:9050", []string{app}, nil, t.TempDir(), LaunchOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if res.Detached || res.ExitCode != 42 {
		t.Fatalf("wait result = %+v, want exit 42, attached", res)
	}
}

func TestDetachReturnsPromptlyForLongLived(t *testing.T) {
	if NeedsProxy() {
		t.Skip("shim detach path is Linux-only; proxy covered below")
	}
	withFakeShim(t)
	app := stubScript(t, "sleep 30")
	start := time.Now()
	res, err := RunWithOptions("127.0.0.1:9050", []string{app}, nil, t.TempDir(),
		LaunchOptions{Detach: true, AlivePoll: 300 * time.Millisecond})
	if err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(start); elapsed > 10*time.Second {
		t.Fatalf("detach took %v, want prompt return (the GUI hang)", elapsed)
	}
	if !res.Detached || res.PID <= 0 {
		t.Fatalf("detach result = %+v, want Detached with PID", res)
	}
	// The released child outlives the test; reap via kill.
	if p, err := os.FindProcess(res.PID); err == nil {
		_ = p.Kill()
	}
}

func TestDetachSurfacesEarlyFailure(t *testing.T) {
	if NeedsProxy() {
		t.Skip("shim detach path is Linux-only; proxy covered below")
	}
	withFakeShim(t)
	app := stubScript(t, "exit 3")
	_, err := RunWithOptions("127.0.0.1:9050", []string{app}, nil, t.TempDir(),
		LaunchOptions{Detach: true, AlivePoll: 2 * time.Second})
	if err == nil {
		t.Fatal("detach of an immediately-failing child must error, not print a stale PID")
	}
}

func TestDetachWritesLogFile(t *testing.T) {
	if NeedsProxy() {
		t.Skip("shim detach path is Linux-only; proxy covered below")
	}
	withFakeShim(t)
	app := stubScript(t, "echo hello-detach-marker; sleep 30")
	log := filepath.Join(t.TempDir(), "gui.log")
	res, err := RunWithOptions("127.0.0.1:9050", []string{app}, nil, t.TempDir(),
		LaunchOptions{Detach: true, LogFile: log, AlivePoll: 1500 * time.Millisecond})
	if err != nil {
		t.Fatal(err)
	}
	if p, err := os.FindProcess(res.PID); err == nil {
		_ = p.Kill()
	}
	// Give the shell a moment to flush before asserting.
	deadline := time.Now().Add(3 * time.Second)
	for {
		raw, _ := os.ReadFile(log)
		if len(raw) > 0 {
			return
		}
		if time.Now().After(deadline) {
			t.Fatal("log file stayed empty; detached stdio must reach --log-file")
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func TestProxyDetachReturnsPromptly(t *testing.T) {
	argv := proxyStubArgv(t, "sleep30")
	start := time.Now()
	res, err := RunProxyWithOptions("127.0.0.1:9050", argv, nil,
		LaunchOptions{Detach: true, AlivePoll: 300 * time.Millisecond})
	if err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(start); elapsed > 10*time.Second {
		t.Fatalf("proxy detach took %v, want prompt return", elapsed)
	}
	if !res.Detached || res.PID <= 0 {
		t.Fatalf("proxy detach result = %+v, want Detached with PID", res)
	}
	if p, err := os.FindProcess(res.PID); err == nil {
		_ = p.Kill()
	}
}

func TestProxyWaitPassesExitCode(t *testing.T) {
	argv := proxyStubArgv(t, "exit7")
	res, err := RunProxyWithOptions("127.0.0.1:9050", argv, nil, LaunchOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if res.Detached || res.ExitCode != 7 {
		t.Fatalf("proxy wait result = %+v, want exit 7, attached", res)
	}
}
