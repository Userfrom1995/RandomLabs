// Package demo ships the built-in fixture pages rendered through the
// real frame pipeline. They exercise headings, links, tables, and image
// surfaces with byte-counted frames, and they back the local
// fixture:// router until the web engine phase adds live fetching.
package demo

import (
	"strings"

	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// Palette for fixture styling.
var (
	ink     = term.RGB{R: 235, G: 235, B: 235}
	dim     = term.RGB{R: 150, G: 150, B: 160}
	accent  = term.RGB{R: 120, G: 200, B: 255}
	heading = term.RGB{R: 255, G: 210, B: 120}
	bg      = term.RGB{R: 12, G: 14, B: 20}
	linkBG  = term.RGB{R: 20, G: 30, B: 48}
)

// Row is one styled text line of a fixture page. NoWrap marks
// pre-aligned rows (table grids): Rewrap must pass them through
// untouched instead of re-wrapping them into misaligned prose.
type Row struct {
	Text      string
	FG        term.RGB
	BG        term.RGB
	Bold      bool
	Underline bool
	Link      bool
	NoWrap    bool
}

// Page is a named fixture document with an optional image surface.
type Page struct {
	Name    string
	Title   string
	Address string
	Rows    []Row
	Hero    *gfx.Image
}

// Pages lists every fixture address the local router serves.
func Pages() []Page {
	return []Page{homePage(), articlePage(), tablePage()}
}

func homePage() Page {
	hero := heroImage()
	return Page{
		Name:    "home",
		Title:   "Terminal Browser - fixture home",
		Address: "fixture://home",
		Hero:    &hero,
		Rows: []Row{
			{Text: "Terminal Browser", FG: heading, Bold: true},
			{Text: "An agent-first browser that lives in the terminal grid.", FG: dim},
			{Text: ""},
			{Text: "[1] Read the fixture article", FG: accent, Underline: true, Link: true},
			{Text: "[2] Open the table layout demo", FG: accent, Underline: true, Link: true},
			{Text: ""},
			{Text: "Type fixture://article or fixture://table in the address bar.", FG: dim},
			{Text: "Live web fetching arrives with the engine phase; until then", FG: dim},
			{Text: "every surface here renders through the real frame pipeline.", FG: dim},
		},
	}
}

func articlePage() Page {
	return Page{
		Name:    "article",
		Title:   "Fixture article - reflow and style",
		Address: "fixture://article",
		Rows: []Row{
			{Text: "Why terminals deserve a real browser", FG: heading, Bold: true},
			{Text: "Filed under fixture://article - 6 min read", FG: dim},
			{Text: ""},
			{Text: "The terminal is the oldest graphical interface still in daily", FG: ink},
			{Text: "use. Modern protocols (Kitty graphics, Sixel, inline images)", FG: ink},
			{Text: "finally give it a real paint stack, so a browser can live in", FG: ink},
			{Text: "the grid without conceding the modern web.", FG: ink},
			{Text: ""},
			{Text: "Three ideas carry the design:", FG: ink, Bold: true},
			{Text: "  1. Probe once, degrade per surface, never per session.", FG: ink},
			{Text: "  2. Snapshot-first interaction, screenshots for proof.", FG: ink},
			{Text: "  3. One engine serves keyboard, CLI, and MCP identically.", FG: ink},
		},
	}
}

func tablePage() Page {
	return Page{
		Name:    "table",
		Title:   "Fixture table - grid layout",
		Address: "fixture://table",
		Rows: []Row{
			{Text: "Graphics tier matrix (fixture data)", FG: heading, Bold: true},
			{Text: ""},
			{Text: "Tier     Paint path            Motion     Fallback", FG: dim, Bold: true},
			{Text: "kitty    transmit-once+place   animated   deltas", FG: ink},
			{Text: "sixel    quantized regions     stills     10 fps floor", FG: ink},
			{Text: "iterm2   inline PNG stills     stills     re-send on change", FG: ink},
			{Text: "block    half-block diff       always     256/16/ASCII", FG: ink},
			{Text: ""},
			{Text: "tmux and screen force the block row for every surface.", FG: dim},
		},
	}
}

// NotFound renders the honest local error page for unknown addresses.
func NotFound(addr string) Page {
	return Page{
		Name:    "not-found",
		Title:   "Unknown fixture address",
		Address: addr,
		Rows: []Row{
			{Text: "No fixture answers that address", FG: heading, Bold: true},
			{Text: ""},
			{Text: "Unknown: " + addr, FG: ink},
			{Text: ""},
			{Text: "Try fixture://home, fixture://article, or fixture://table.", FG: dim},
			{Text: "Live web fetching arrives with the engine phase.", FG: dim},
		},
	}
}

// Lookup routes a fixture:// address to its page.
func Lookup(addr string) Page {
	a := strings.TrimSpace(addr)
	if a == "" {
		a = "fixture://home"
	}
	if !strings.Contains(a, "://") {
		a = "fixture://" + strings.TrimPrefix(a, "/")
	}
	for _, p := range Pages() {
		if p.Address == a {
			return p
		}
	}
	return NotFound(a)
}

// BlockedScheme reports whether addr uses a scheme the browser refuses
// to run: script-bearing schemes never execute page code from the
// address bar. Matching is case-insensitive on the scheme prefix.
func BlockedScheme(addr string) (string, bool) {
	lower := strings.ToLower(strings.TrimSpace(addr))
	for _, scheme := range []string{"javascript:", "data:", "vbscript:"} {
		if strings.HasPrefix(lower, scheme) {
			return strings.TrimSuffix(scheme, ":"), true
		}
	}
	return "", false
}

// BlockedPage renders the hostile-input card for a refused scheme: it
// names the scheme and offers the safe action. Nothing executes.
func BlockedPage(addr, scheme string) Page {
	short := addr
	if len([]rune(short)) > 64 {
		short = string([]rune(short)[:63]) + ">"
	}
	return Page{
		Name:    "blocked",
		Title:   "Blocked address scheme",
		Address: addr,
		Rows: []Row{
			{Text: "Blocked: this address cannot run here", FG: heading, Bold: true},
			{Text: ""},
			{Text: "Scheme: " + scheme, FG: ink},
			{Text: "Address: " + short, FG: ink},
			{Text: ""},
			{Text: "Safe action: type / then an http(s) or fixture:// address.", FG: dim},
			{Text: "Try fixture://home, fixture://article, or fixture://table.", FG: dim},
		},
	}
}

// EmptyPage renders the new-tab card: one centered starter card with
// the primary open action plus three starter destinations. The
// snapshot reports no refs against a stable gen, so chips and the
// drawer stay hidden until the first open commits.
func EmptyPage() Page {
	return Page{
		Name:    "empty",
		Title:   "New tab",
		Address: "about:blank",
		Rows: []Row{
			{Text: "New tab", FG: heading, Bold: true},
			{Text: ""},
			{Text: "Type / then an address to open a page.", FG: ink},
			{Text: ""},
			{Text: "Starter destinations:", FG: ink, Bold: true},
			{Text: "  fixture://home - browser home", FG: dim},
			{Text: "  fixture://article - reflow and style demo", FG: dim},
			{Text: "  fixture://table - grid layout demo", FG: dim},
		},
	}
}

func heroImage() gfx.Image {
	im := gfx.NewImage(48, 24)
	for y := 0; y < 24; y++ {
		for x := 0; x < 48; x++ {
			t := float64(x) / 47.0
			u := float64(y) / 23.0
			im.Pix[y*48+x] = term.RGB{
				R: uint8(20 + t*180),
				G: uint8(40 + u*120),
				B: uint8(120 + (1-t)*120),
			}
		}
	}
	return im
}

// RenderToFrame lays rows into the frame below the chrome offset,
// returning the number of content rows written.
func RenderToFrame(p Page, f *term.Frame, chromeRows, scroll int) int {
	linkIdx := 0
	written := 0
	for i, row := range p.Rows {
		y := chromeRows + i - scroll
		if y < chromeRows || y >= f.H-1 {
			continue
		}
		fg, bg := row.FG, bg
		bold := row.Bold
		if row.Link {
			linkIdx++
			bg = linkBG
		}
		f.WriteText(1, y, pad(row.Text, f.W-3), fg, bg)
		_ = bold
		// Re-apply bold per cell since WriteText does not carry it.
		for x := 1; x < f.W-1 && x-1 < len([]rune(row.Text)); x++ {
			c := f.At(x, y)
			c.Bold = row.Bold
			c.Underline = row.Underline
			f.Set(x, y, c)
		}
		written++
	}
	return written
}

// HeroSurface places the page hero image under the text block.
func HeroSurface(p Page, contentRows, width int) *gfx.Surface {
	if p.Hero == nil {
		return nil
	}
	if width-4 < 1 {
		return nil
	}
	return &gfx.Surface{
		Img:   *p.Hero,
		CellX: 2, CellY: contentRows + 1,
		CellW: width - 4, CellH: 6,
	}
}

func pad(s string, w int) string {
	if w < 0 {
		w = 0
	}
	if len(s) >= w {
		return s
	}
	return s + strings.Repeat(" ", w-len(s))
}
