package engine

import (
	"strings"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/term"
)

// Offline snapshots that read like live content were removed: dead
// fake-live fixtures must not sit in the tree. Offline failures render
// the honest OfflinePage error document with a fail-closed code and
// exit 1; the only bundled snapshots are the clearly-labeled corpus
// files under tests/fixtures/ used by hermetic tests.

var (
	errHeading = term.RGB{R: 255, G: 210, B: 120}
	errInk     = term.RGB{R: 235, G: 235, B: 235}
	errDim     = term.RGB{R: 150, G: 150, B: 160}
)

// OfflinePage renders the honest error document for failed navigation:
// what was attempted, why it failed, and what to try next. It never
// claims content it did not fetch.
func OfflinePage(addr, reason string) demo.Page {
	if strings.TrimSpace(addr) == "" {
		addr = "about:blank"
	}
	rows := []demo.Row{
		{Text: "Page did not load", FG: errHeading, Bold: true},
		{Text: ""},
		{Text: "Address: " + addr, FG: errInk},
		{Text: ""},
		{Text: reason, FG: errInk},
		{Text: ""},
		{Text: "Next steps:", FG: errInk, Bold: true},
		{Text: "  1. Check the network, then retry the address.", FG: errDim},
		{Text: "  2. Confirm Chrome is installed (chrome --version, floor 140).", FG: errDim},
		{Text: "  3. Browse offline fixtures: fixture://home, fixture://article.", FG: errDim},
		{Text: ""},
		{Text: "Actions: r retries, / opens a new address, fixture://home works offline.", FG: errDim},
	}
	return demo.Page{Name: "offline", Title: "Navigation failed", Address: addr, Rows: rows}
}

