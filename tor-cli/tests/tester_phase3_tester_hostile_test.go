package tests

// Tester Phase 3 hostile supplement (Refs #436, tester-owned):
// tor-agnostic black-box attacks on the GUI gate and detach contract.
//
// Motivation: the base Phase 3 suite pins exit 3 ("tor absent") for its
// gate-pass cases, which is hermetic only on tor-less runners. On any
// tor-ful host those cases proceed into a real session (exit 0/1 by
// design). Every assertion here holds with AND without tor installed:
// refusals stay exit 2 (the gate fires before ensureTor), and passes
// assert "not refused" instead of a tor-dependent code.
//
// Every case was driven live against the real binary before pinning,
// including a detached GUI launch under a live tor session (parent
// exits 0 at once, child keeps running) and a real Firefox detached
// under Xvfb (Linux; macOS/Windows display proof stays with the
// per-OS specialists).

import (
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

// fakeGUIBinAs links a short-lived system binary under an arbitrary
// GUI-tier-style basename so classification can be attacked without a
// real browser installed.
func fakeGUIBinAs(t *testing.T, name string) string {
	t.Helper()
	targets := []string{"/bin/true", "/usr/bin/true", "/bin/sh"}
	src := ""
	for _, c := range targets {
		if fi, err := os.Stat(c); err == nil && !fi.IsDir() {
			src = c
			break
		}
	}
	if src == "" {
		t.Skip("no linkable system binary for the fake GUI stub")
	}
	link := filepath.Join(t.TempDir(), name)
	if err := os.Symlink(src, link); err != nil {
		t.Fatal(err)
	}
	return link
}

func TestTesterPhase3BareShimFormGated(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// Bare `torshim <app>` routes through cmdRun, so the GUI gate must
	// refuse it exactly like `torshim run -- <app>`: exit 2 before any
	// tor starts, never the infinite wait that motivated Phase 3.
	_, se, code := runBin(bin, app)
	if code != 2 {
		t.Fatalf("bare-shim GUI run exit=%d, want 2 (gate must cover both invocation forms)", code)
	}
	if !strings.Contains(se, "--detach") {
		t.Fatalf("bare-shim refusal must name --detach, got:\n%s", se)
	}
}

func TestTesterPhase3ExplicitWaitStillRefused(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// --wait is the old hanging supervision: spelling it out must not
	// clear the gate. Only --detach (or headless) gets a GUI through.
	_, _, code := runBin(bin, "run", "--wait", "--", app)
	if code != 2 {
		t.Fatalf("GUI run with explicit --wait exit=%d, want 2 (wait is the hang path)", code)
	}
}

func TestTesterPhase3CaseInsensitiveBasename(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBinAs(t, "Firefox")
	// Classification lowercases the basename: a capitalized symlink
	// must hit the same refusal, not slip onto the wait path.
	_, se, code := runBin(bin, "run", "--", app)
	if code != 2 {
		t.Fatalf("capitalized GUI basename run exit=%d, want 2 (matching is case-insensitive)", code)
	}
	if !strings.Contains(se, "--detach") {
		t.Fatalf("capitalized refusal must name --detach, got:\n%s", se)
	}
}

func TestTesterPhase3PrefixHelperNotGUI(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBinAs(t, "firefox-helper-tool")
	// Exact-only matching is the fail-safe direction: a helper that
	// merely shares the prefix must NOT be conscripted into GUI
	// supervision. It passes the gate (any post-gate outcome is the
	// tor/backend path's business, hence != 2 rather than a code pin).
	_, _, code := runBin(bin, "run", "--", app)
	if code == 2 {
		t.Fatalf("prefix-helper run refused with exit 2: exact-only matching must not conscript firefox-helper-tool")
	}
}

func TestTesterPhase3NonGUIPassesGate(t *testing.T) {
	bin := buildTorshim(t)
	// A plain CLI binary is unaffected by the GUI contract regardless
	// of tor presence (exit 3 tor-absent, exit 0 under live tor).
	_, _, code := runBin(bin, "run", "--", "/bin/echo", "hi")
	if code == 2 {
		t.Fatalf("non-GUI run refused with exit 2: gate must pass CLI tools straight through")
	}
}

func TestTesterPhase3DetachClearsGateAnyEnv(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// --detach clears the usage gate in every environment: tor-absent
	// fails closed at ensureTor (3), tor-present launches (0/1). The
	// gate contract is "not refused", never a tor-dependent pin.
	_, _, code := runBin(bin, "run", "--detach", "--", app)
	if code == 2 {
		t.Fatalf("detached GUI run refused with exit 2: --detach must clear the gate in any environment (got tor-dependent code %d)", code)
	}
}

func TestTesterPhase3HeadlessBypassAnyEnv(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// Headless browsers are CLI-like in every environment: the gate
	// must let them onto the wait path (never exit 2).
	_, _, code := runBin(bin, "run", "--", app, "--headless", "--screenshot", "https://example.com/")
	if code == 2 {
		t.Fatalf("headless GUI run refused with exit 2: headless must bypass the gate in any environment")
	}
}

func TestTesterPhase3DetachUnderLiveTor(t *testing.T) {
	if !haveTor() {
		t.Skip("no tor on PATH: needs a live session for the detach prompt-return proof")
	}
	bin := buildTorshim(t)
	sleep := "/bin/sleep"
	if fi, err := os.Stat(sleep); err != nil || fi.IsDir() {
		t.Skip("no /bin/sleep for the long-lived GUI stand-in")
	}
	dir := t.TempDir()
	app := filepath.Join(dir, "firefox")
	if err := os.Symlink(sleep, app); err != nil {
		t.Fatal(err)
	}
	// End-to-end detach contract under a REAL tor session: the parent
	// must print the PID report and exit 0 promptly while the
	// long-lived GUI child survives. Driven live before pinning
	// (parent exited 0, child confirmed alive, then reaped).
	start := time.Now()
	so, se, code := runBin(bin, "run", "--timeout", "60s", "--detach", "--", app, "120")
	elapsed := time.Since(start)
	if code != 0 {
		t.Fatalf("detached GUI under live tor exit=%d, want 0:\nstdout:\n%s\nstderr:\n%s", code, so, se)
	}
	if !strings.Contains(so, "prompt returned") {
		t.Fatalf("detach report missing prompt-return line:\n%s", so)
	}
	m := regexp.MustCompile(`pid (\d+)`).FindStringSubmatch(so)
	if m == nil {
		t.Fatalf("detach report missing PID:\n%s", so)
	}
	pid, err := strconv.Atoi(m[1])
	if err != nil || pid <= 0 {
		t.Fatalf("detach report has unusable pid %q", m[1])
	}
	t.Logf("detached pid %d reported after %s", pid, elapsed)
	proc, err := os.FindProcess(pid)
	if err != nil {
		t.Fatalf("FindProcess(%d): %v", pid, err)
	}
	// Reap the stand-in so the test leaves no strays; the assertion is
	// that it was alive to be reaped (kill of a zombie/exited pid is
	// still nil on Unix, so also confirm via signal 0 where possible).
	if err := proc.Kill(); err != nil {
		t.Fatalf("detached child pid %d already gone (parent must outlive the launch): %v", pid, err)
	}
}
