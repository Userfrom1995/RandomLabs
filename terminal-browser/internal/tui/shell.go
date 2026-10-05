// Package tui owns the terminal app shell: alternate screen lifecycle,
// tab strip, address bar, status line, profile picker, and the key map.
// Fixture addresses resolve locally; http(s) addresses fetch live
// through the engine sidecar with offline fail-closed errors.
package tui

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/term"
)

// Tab is one open document with its own scroll position. Live tabs
// remember their fetch width so Render can rewrap to the frame.
type Tab struct {
	Title      string
	Address    string
	Page       demo.Page
	Scroll     int
	Live       bool
	FetchWidth int
}

// Shell is the full TUI state machine.
type Shell struct {
	Tabs     []Tab
	Active   int
	AddrEdit bool
	AddrBuf  string
	Message  string
	Profiles []string
	Profile  string
	ShowHelp bool
}

// NewShell opens with the fixture home page on the default tab.
func NewShell() *Shell {
	page := demo.Lookup("fixture://home")
	return &Shell{
		Tabs:     []Tab{{Title: page.Title, Address: page.Address, Page: page}},
		Profiles: loadProfiles(),
		Profile:  "default",
		Message:  "Type / then an http(s) URL for live fetch; fixture://home works offline. Press ? for keys.",
	}
}

// Current returns the active tab.
func (s *Shell) Current() *Tab {
	if len(s.Tabs) == 0 {
		page := demo.Lookup("fixture://home")
		s.Tabs = append(s.Tabs, Tab{Title: page.Title, Address: page.Address, Page: page})
	}
	if s.Active < 0 {
		s.Active = 0
	}
	if s.Active >= len(s.Tabs) {
		s.Active = len(s.Tabs) - 1
	}
	return &s.Tabs[s.Active]
}

// Open navigates the active tab: fixture addresses resolve through the
// local router, http(s) addresses fetch live through the engine sidecar
// with offline fail-closed errors. Live pages rewrap to the frame at
// render time, so Open fetches at a generous width.
func (s *Shell) Open(addr string) {
	a := strings.TrimSpace(addr)
	if a == "" {
		a = "fixture://home"
	}
	if isLiveAddr(a) {
		s.openLive(a)
		return
	}
	page := demo.Lookup(a)
	t := s.Current()
	t.Address, t.Title, t.Page, t.Scroll = page.Address, page.Title, page, 0
	s.Message = "Opened " + page.Address
}

// openLive fetches a live page synchronously with the cold budget. The
// address bar blocks during load by design in this phase; async loads
// arrive with the interaction loop.
func (s *Shell) openLive(addr string) {
	res := engine.NavigateQuick(addr, s.Profile, false, 100)
	page := res.ToDemoPage()
	t := s.Current()
	t.Address, t.Title, t.Page, t.Scroll = page.Address, page.Title, page, 0
	t.Live, t.FetchWidth = true, 100
	if res.Offline {
		s.Message = "Offline: " + firstLine(res.Warning)
		return
	}
	s.Message = "Opened " + page.Address + " live in " + res.Cold().Round(0).String() +
		" (" + itoa(len(page.Rows)) + " rows, JS nodes " + itoa(res.JS.Nodes) + ")"
}

// isLiveAddr reports whether the address wants the live engine path.
func isLiveAddr(a string) bool {
	l := strings.ToLower(a)
	return strings.HasPrefix(l, "http://") || strings.HasPrefix(l, "https://")
}

func firstLine(s string) string {
	if i := strings.Index(s, " (offline fail-closed"); i > 0 {
		return s[:i]
	}
	if len(s) > 120 {
		return s[:120]
	}
	return s
}

// NewTab opens a tab on the given address.
func (s *Shell) NewTab(addr string) {
	page := demo.Lookup(addr)
	s.Tabs = append(s.Tabs, Tab{Title: page.Title, Address: page.Address, Page: page})
	s.Active = len(s.Tabs) - 1
	s.Message = "Opened " + page.Address
}

// CloseTab closes the active tab unless it is the last one.
func (s *Shell) CloseTab() {
	if len(s.Tabs) <= 1 {
		s.Message = "Last tab stays open."
		return
	}
	if s.Active < 0 {
		s.Active = 0
	}
	if s.Active >= len(s.Tabs) {
		s.Active = len(s.Tabs) - 1
	}
	s.Tabs = append(s.Tabs[:s.Active], s.Tabs[s.Active+1:]...)
	if s.Active >= len(s.Tabs) {
		s.Active = len(s.Tabs) - 1
	}
	s.Message = "Tab closed."
}

// Handle routes one input event. It returns false when the app should quit.
func (s *Shell) Handle(ev term.Event) bool {
	if ev.Kind == "mouse" {
		return s.handleMouse(ev)
	}
	if s.AddrEdit {
		return s.handleAddrKey(ev)
	}
	key := ev.Key
	if ev.Ctrl && len(key) == 1 {
		switch key {
		case "q":
			return false
		case "l":
			s.AddrEdit = true
			s.AddrBuf = s.Current().Address
			return true
		case "t":
			s.NewTab("fixture://home")
			return true
		case "w":
			s.CloseTab()
			return true
		}
	}
	switch ev.Special {
	case "left":
		if s.Active > 0 {
			s.Active--
		}
		return true
	case "right":
		if s.Active < len(s.Tabs)-1 {
			s.Active++
		}
		return true
	case "up":
		s.scroll(-1)
		return true
	case "down":
		s.scroll(1)
		return true
	case "pgup":
		s.scroll(-10)
		return true
	case "pgdn":
		s.scroll(10)
		return true
	}
	switch key {
	case "q":
		return false
	case "?":
		s.ShowHelp = !s.ShowHelp
		return true
	case "/":
		s.AddrEdit = true
		s.AddrBuf = s.Current().Address
		return true
	case "g":
		s.scroll(-1000)
		return true
	case "G":
		s.scroll(1000)
		return true
	case "[":
		if s.Active > 0 {
			s.Active--
		}
		return true
	case "]":
		if s.Active < len(s.Tabs)-1 {
			s.Active++
		}
		return true
	case "t":
		s.NewTab("fixture://home")
		return true
	case "x", "w":
		if ev.Ctrl {
			return false
		}
		if key == "x" {
			s.CloseTab()
		}
		return true
	case "1", "2", "3", "4", "5", "6", "7", "8", "9":
		n := int(key[0] - '1')
		if n < len(s.Tabs) {
			s.Active = n
			s.Message = "Switched to tab " + key + "."
		}
		return true
	}
	return true
}

func (s *Shell) handleAddrKey(ev term.Event) bool {
	switch ev.Special {
	case "enter":
		s.AddrEdit = false
		s.Open(s.AddrBuf)
		return true
	case "esc":
		s.AddrEdit = false
		s.Message = "Address edit cancelled."
		return true
	case "backspace":
		if len(s.AddrBuf) > 0 {
			_, size := utf8.DecodeLastRuneInString(s.AddrBuf)
			if size <= 0 {
				size = 1
			}
			s.AddrBuf = s.AddrBuf[:len(s.AddrBuf)-size]
		}
		return true
	}
	if ev.Ctrl {
		// Control chords never enter the address literally; Ctrl+C
		// above already cancelled the edit.
		return true
	}
	if ev.Ctrl && ev.Key == "c" {
		s.AddrEdit = false
		return true
	}
	if ev.Key != "" && ev.Special == "" {
		s.AddrBuf += ev.Key
	}
	return true
}

func (s *Shell) handleMouse(ev term.Event) bool {
	btn := ev.MouseButton & 67
	switch btn {
	case 64:
		s.scroll(-3)
	case 65:
		s.scroll(3)
	case 0:
		// Left click: the address bar (terminal row 2) enters edit
		// mode; other rows keep focus where it is.
		if ev.MouseDown && ev.MouseY == 2 {
			s.AddrEdit = true
			s.AddrBuf = s.Current().Address
		}
	}
	return true
}

func (s *Shell) scroll(d int) {
	t := s.Current()
	t.Scroll += d
	if t.Scroll < 0 {
		t.Scroll = 0
	}
	max := len(t.Page.Rows) - 1
	if max < 0 {
		max = 0
	}
	if t.Scroll > max {
		t.Scroll = max
	}
}

// ChromeRows reserves the tab strip plus address bar.
const ChromeRows = 2

var (
	chromeFG = term.RGB{R: 200, G: 200, B: 210}
	chromeBG = term.RGB{R: 30, G: 34, B: 46}
	activeBG = term.RGB{R: 52, G: 70, B: 110}
	statusBG = term.RGB{R: 22, G: 26, B: 36}
)

// Render draws chrome plus the active page into the frame. Live pages
// rewrap to the frame width when it differs from the fetch width.
func (s *Shell) Render(f *term.Frame) int {
	f.Fill(0, 0, f.W, f.H, term.Cell{Ch: ' ', FG: chromeFG, BG: term.RGB{R: 12, G: 14, B: 20}})
	renderTabStrip(s, f)
	renderAddrBar(s, f)
	cur := s.Current()
	page := cur.Page
	if cur.Live && cur.FetchWidth > 0 && cur.FetchWidth != f.W {
		cp := page
		cp.Rows = engine.Rewrap(page.Rows, f.W)
		page = cp
	}
	n := demo.RenderToFrame(page, f, ChromeRows, cur.Scroll)
	if s.ShowHelp {
		renderHelp(s, f)
	}
	renderStatus(s, f)
	return n
}

func renderTabStrip(s *Shell, f *term.Frame) {
	x := 0
	for i, t := range s.Tabs {
		label := " " + tabNum(i) + " " + truncate(t.shortTitle(), tabWidth(f.W, len(s.Tabs))) + " "
		bg := chromeBG
		if i == s.Active {
			bg = activeBG
		}
		for _, r := range label {
			if x >= f.W {
				break
			}
			f.Set(x, 0, term.Cell{Ch: r, FG: chromeFG, BG: bg, Bold: i == s.Active})
			x++
		}
	}
	prof := "[" + s.Profile + "] "
	start := f.W - len([]rune(prof)) - 1
	if start < x+1 {
		return
	}
	for i, r := range prof {
		f.Set(start+i, 0, term.Cell{Ch: r, FG: chromeFG, BG: chromeBG})
	}
}

func renderAddrBar(s *Shell, f *term.Frame) {
	text := s.Current().Address
	if s.AddrEdit {
		text = "Go: " + s.AddrBuf + "_"
	}
	f.WriteText(0, 1, truncate(" "+text, f.W), chromeFG, chromeBG)
	for x := 0; x < f.W && x < len([]rune(text))+1; x++ {
		c := f.At(x, 1)
		c.BG = chromeBG
		f.Set(x, 1, c)
	}
}

func renderStatus(s *Shell, f *term.Frame) {
	msg := s.Message + "  |  tabs:" + itoa(len(s.Tabs)) +
		"  scroll:" + itoa(s.Current().Scroll) + "/" + itoa(len(s.Current().Page.Rows))
	f.WriteText(0, f.H-1, truncate(" "+msg, f.W), chromeFG, statusBG)
	for x := 0; x < f.W; x++ {
		c := f.At(x, f.H-1)
		c.BG = statusBG
		f.Set(x, f.H-1, c)
	}
}

func renderHelp(_ *Shell, f *term.Frame) {
	lines := []string{
		"Keys: q quit, / address, arrows scroll, [/] tabs,",
		"t new tab, x close tab, 1-9 jump, g/G top/bottom,",
		"Ctrl+T/W/L/Q twins, wheel scrolls, ? toggles help.",
	}
	y := f.H - len(lines) - 2
	if y < ChromeRows {
		y = ChromeRows
	}
	for _, ln := range lines {
		if y >= f.H-1 {
			break
		}
		f.WriteText(2, y, ln, chromeFG, activeBG)
		for x := 2; x < f.W-2; x++ {
			c := f.At(x, y)
			c.BG = activeBG
			f.Set(x, y, c)
		}
		y++
	}
}

func (t *Tab) shortTitle() string {
	r := []rune(t.Title)
	if len(r) > 28 {
		return string(r[:27]) + ".."
	}
	return t.Title
}

func tabNum(i int) string {
	if i < 9 {
		return string(rune('1' + i))
	}
	return "+"
}

func tabWidth(frameW, tabs int) int {
	if tabs <= 0 {
		return 20
	}
	w := (frameW-12)/tabs - 4
	if w < 8 {
		w = 8
	}
	if w > 28 {
		w = 28
	}
	return w
}

func truncate(s string, w int) string {
	r := []rune(s)
	if len(r) <= w {
		return s
	}
	if w <= 0 {
		return ""
	}
	return string(r[:w])
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

func loadProfiles() []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return []string{"default"}
	}
	dir := filepath.Join(home, ".terminal-browser", "profiles")
	ents, err := os.ReadDir(dir)
	if err != nil {
		return []string{"default"}
	}
	var out []string
	for _, e := range ents {
		if e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			out = append(out, e.Name())
		}
	}
	if len(out) == 0 {
		return []string{"default"}
	}
	return out
}

// EnterAlt switches to the alternate screen with kitty-keyboard and
// SGR mouse reporting where probed. The cursor hides once here for the
// whole session; per-frame hiding would flicker, so the compositor
// stays out of cursor management.
func EnterAlt(w io.Writer, caps term.Capabilities) {
	io.WriteString(w, "\x1b[?1049h\x1b[H\x1b[?25l")
	if caps.KittyKeyboard {
		io.WriteString(w, "\x1b[>1u")
	}
	if caps.MouseSGR {
		io.WriteString(w, term.MouseEnable())
	}
}

// ExitAlt restores the main screen and input modes, always bringing
// the cursor back even if entry never hid it.
func ExitAlt(w io.Writer, caps term.Capabilities) {
	if caps.MouseSGR {
		io.WriteString(w, term.MouseDisable())
	}
	if caps.KittyKeyboard {
		io.WriteString(w, "\x1b[<u")
	}
	io.WriteString(w, "\x1b[?25h\x1b[?1049l")
}
