// Package perapp GUI tier: first-class handling for long-lived graphical
// applications (Firefox, Falkon, Chromium, Chrome).
//
// Root cause of the pre-Phase-3 hang: `run` used cmd.Run unconditionally,
// which blocks until the child exits. CLI tools exit in milliseconds, so
// nobody noticed; browsers never exit, so the wrapper appeared to hang
// forever with no timeout and no way to recover the prompt.
//
// The fix splits launch into two modes with identical routing and
// environment, differing only in process supervision:
//
//   - Wait (CLI default): Start plus signal forwarding to the child
//     process group, parent blocks until the child exits and passes the
//     exit code through. Ctrl-C reaches the whole group, so the owned
//     tor is never orphaned.
//   - Detach (GUI path): Start plus Release into a new process group,
//     stdio to null (or --log-file), a bounded alive poll (default 2 s),
//     then the parent prints the PID plus endpoints and exits 0 while
//     the browser keeps running.
//
// Classification is by basename with a headless bypass: `firefox
// --headless` behaves like a CLI tool (short-lived, capturable stdio)
// and stays on the wait path. Proxy-backend GUI launches (macOS/Windows)
// additionally require an explicit acknowledgment flag because proxy env
// covers only honoring apps: the user must opt into the partial-coverage
// contract rather than hang and assume shim-grade protection.
package perapp

import (
	"path/filepath"
	"strings"
)

// guiBasenames is the GUI-aware tier. Browsers are the reported hang
// cases (Firefox, Falkon); Chromium/Chrome share the same long-lived,
// multiprocess, single-instance profile and ride the same path.
var guiBasenames = map[string]bool{
	"firefox":              true,
	"firefox-esr":          true,
	"firefox-bin":          true,
	"falkon":               true,
	"chromium":             true,
	"chromium-browser":     true,
	"google-chrome":        true,
	"google-chrome-stable": true,
	"chrome":               true,
}

// GUIAppName reports the matched GUI basename, if any. Matching is on
// the lowercased file basename, exact only: prefix guessing would turn
// unrelated helpers (firefox-helper-tool) into GUI targets, and a
// missed versioned binary fails safe (it takes the wait path and the
// user adds --detach explicitly) while a false positive would force
// GUI supervision onto a CLI tool.
func GUIAppName(bin string) (string, bool) {
	base := strings.ToLower(filepath.Base(bin))
	if guiBasenames[base] {
		return base, true
	}
	return "", false
}

// IsGUIApp reports whether bin belongs to the GUI tier.
func IsGUIApp(bin string) bool {
	_, ok := GUIAppName(bin)
	return ok
}

// LooksHeadless reports whether argv requests headless operation. A
// headless browser is a short-lived CLI-like process (screenshot, dump,
// automated test): it keeps capturable stdio and must stay on the wait
// path even though its basename is in the GUI tier.
func LooksHeadless(argv []string) bool {
	for _, a := range argv {
		low := strings.ToLower(a)
		if low == "--headless" || low == "-headless" ||
			strings.HasPrefix(low, "--headless=") ||
			low == "--screenshot" || low == "--dump-dom" || low == "--print-to-pdf" {
			return true
		}
	}
	return false
}

// LaunchClass describes which supervision mode a target wants.
type LaunchClass int

const (
	// ClassCLI is any non-GUI target, or a GUI binary in headless mode.
	ClassCLI LaunchClass = iota
	// ClassGUI is a GUI-tier binary in interactive mode: it needs the
	// detach path (or an explicit wait override) instead of a bare Run.
	ClassGUI
)

// ClassifyLaunch resolves the launch class for a resolved binary plus
// its full argv (argv[0] is the binary, the rest are its flags).
func ClassifyLaunch(bin string, argv []string) LaunchClass {
	if !IsGUIApp(bin) {
		return ClassCLI
	}
	if LooksHeadless(argv) {
		return ClassCLI
	}
	return ClassGUI
}
