package tests

// Tester Phase 3 GUI supervision suite (Refs #436, tester-owned):
// black-box honesty for the wait/detach split behind `run`.
//
// Hermetic by construction: the GUI gate fires before any tor is
// started, so every refusal case needs no tor binary at all, and the
// pass-through cases fail closed at ensureTor (exit 3, tor absent).
// A fake `firefox` symlink stands in for the real browser so the suite
// is deterministic on runners without Firefox installed; the basename
// tier is what the gate classifies on.
//
// Every case was driven live against the real binary before pinning.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// fakeGUIBin links /bin/true (or sh) under a GUI-tier basename so the
// gate classifies it as an interactive browser without needing one.
func fakeGUIBin(t *testing.T) string {
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
	link := filepath.Join(t.TempDir(), "firefox")
	if err := os.Symlink(src, link); err != nil {
		t.Fatal(err)
	}
	return link
}

func TestTesterPhase3GUIGateRequiresDetach(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	_, se, code := runBin(bin, "run", "--", app)
	if code != 2 {
		t.Fatalf("bare GUI run exit=%d, want 2 (must refuse the wait path that hung forever)", code)
	}
	if !strings.Contains(se, "--detach") {
		t.Fatalf("GUI refusal must name --detach, got:\n%s", se)
	}
}

func TestTesterPhase3DetachClearsGate(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// Gate passes; ensureTor then fails closed without tor (exit 3).
	// The assertion is the exit code class, not tor itself.
	_, _, code := runBin(bin, "run", "--detach", "--", app)
	if code != 3 {
		t.Fatalf("detached GUI run without tor exit=%d, want 3 (gate passed, tor absent)", code)
	}
}

func TestTesterPhase3DetachWaitExclusive(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	_, _, code := runBin(bin, "run", "--detach", "--wait", "--", app)
	if code != 2 {
		t.Fatalf("--detach --wait exit=%d, want 2 (mutually exclusive)", code)
	}
}

func TestTesterPhase3LogFileNeedsDetach(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	log := filepath.Join(t.TempDir(), "gui.log")
	_, se, code := runBin(bin, "run", "--log-file", log, "--", app)
	if code != 2 {
		t.Fatalf("--log-file without --detach exit=%d, want 2", code)
	}
	if !strings.Contains(se, "--detach") {
		t.Fatalf("--log-file refusal must name --detach, got:\n%s", se)
	}
}

func TestTesterPhase3HeadlessBypassesGate(t *testing.T) {
	bin := buildTorshim(t)
	app := fakeGUIBin(t)
	// Headless browsers are CLI-like: the gate must let them through
	// to the wait path (which then fails closed at ensureTor, exit 3,
	// instead of the usage refusal exit 2).
	_, _, code := runBin(bin, "run", "--", app, "--headless", "--screenshot", "https://example.com/")
	if code != 3 {
		t.Fatalf("headless GUI run without tor exit=%d, want 3 (gate bypassed, tor absent)", code)
	}
}

func TestTesterPhase3UsageDocumentsDetach(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "help")
	if code != 0 {
		t.Fatalf("help exit=%d, want 0", code)
	}
	for _, want := range []string{"--detach", "--log-file", "acknowledge-gui-risks", "--headless"} {
		if !strings.Contains(so, want) {
			t.Fatalf("usage missing %q:\n%s", want, so)
		}
	}
}
