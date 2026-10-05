package engine

import (
	"strings"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/term"
)

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
	}
	return demo.Page{Name: "offline", Title: "Navigation failed", Address: addr, Rows: rows}
}

// OfflineFixture returns a bundled representative snapshot used when the
// live network is unreachable. Callers MUST report `offline-fallback`
// in the warning so a fallback never passes as a live render.
func OfflineFixture(kind string) demo.Page {
	switch kind {
	case "news":
		return demo.Page{
			Name: "offline-hn", Title: "Hacker News (offline snapshot)",
			Address: "https://news.ycombinator.com/",
			Rows: []demo.Row{
				{Text: "Hacker News (offline snapshot)", FG: errHeading, Bold: true},
				{Text: "", FG: errInk},
				{Text: "[1] Show HN: terminal browsers keep coming back", FG: term.RGB{R: 120, G: 200, B: 255}, Underline: true, Link: true},
				{Text: "    -> https://news.ycombinator.com/item?id=000001", FG: errDim},
				{Text: "[2] A cookbook for headless browser automation", FG: term.RGB{R: 120, G: 200, B: 255}, Underline: true, Link: true},
				{Text: "    -> https://news.ycombinator.com/item?id=000002", FG: errDim},
				{Text: "", FG: errInk},
				{Text: "Offline snapshot: shape mirrors the front page; refresh live for real items.", FG: errDim},
			},
		}
	default:
		return demo.Page{
			Name: "offline-wiki", Title: "Wikipedia (offline snapshot)",
			Address: "https://en.wikipedia.org/wiki/Terminal_pager",
			Rows: []demo.Row{
				{Text: "# Terminal pager (offline snapshot)", FG: errHeading, Bold: true},
				{Text: "", FG: errInk},
				{Text: "A terminal pager is a program that lets you page through text.", FG: errInk},
				{Text: "Offline snapshot: headings, links, and tables reflow as live would.", FG: errDim},
			},
		}
	}
}
