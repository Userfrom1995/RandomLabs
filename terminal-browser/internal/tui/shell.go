// Package tui owns the terminal app shell: alternate screen lifecycle,
// tab strip, address bar, status line, profile picker, and the key map.
// Fixture addresses resolve locally; http(s) addresses fetch live
// through the engine sidecar with offline fail-closed errors.
package tui

import (
	"io"
	"os"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// Tab is one open document with its own scroll position. Live tabs
// remember their fetch width so Render can rewrap to the frame, plus
// the settled snapshot refs (eN) with their gen for the overlay.
type Tab struct {
	Title      string
	Address    string
	Page       demo.Page
	Scroll     int
	Live       bool
	FetchWidth int
	Refs       []engine.Ref
	Gen        int
	Stable     bool
}

// Shell is the full TUI state machine. Record gates history and
// stack persistence: the interactive shell records every visit,
// offscreen render paths disable it so probes never pollute history.
// Live holds the persistent interaction-loop browser shared by human
// input and agent acts; overlay fields drive the Harbor hint chips,
// drawer, and ref entry line.
type Shell struct {
	Tabs     []Tab
	Active   int
	AddrEdit bool
	AddrBuf  string
	Message  string
	Profiles []string
	Profile  string
	ShowHelp bool
	Record   bool

	live     *engine.Browser
	liveFor  string
	ShowHints bool
	ShowDrawer bool
	HintFocus  int
	DrawerTop  int
	RefEntry   bool
	RefBuf     string
	FillEntry  bool
	FillBuf    string
	FillRef    string
	LastW      int
	LastH      int
	chips      []chipHit
	StaleWant  string
	StaleGen   int
	StaleReason string
	StaleRemap *string
	// ShowExt toggles the extension action palette: page actions in
	// scope for the live URL with focus plus paging mirroring the
	// drawer. ExtActions refreshes on every settled navigation.
	ShowExt    bool
	ExtFocus   int
	ExtTop     int
	ExtActions []engine.ExtAction
	ExtErr     string
	// MediaAnimated selects the watch tick: Kitty paces animation,
	// every other tier repaints stills. The tb loop sets it from the
	// probed tier; the media fields below serialize the background
	// watch goroutine against Render.
	MediaAnimated bool
	mediaMu       sync.Mutex
	mediaWG       sync.WaitGroup
	mediaWatching bool
	mediaStop     chan struct{}
	mediaSurf     *gfx.Surface
	mediaStat     string
	mediaSummary  string
	mediaW        int
	mediaH        int
	// LoadElapsed carries the last live-fetch cost for the status
	// spinner line: elapsed label plus stepped bar, static text on
	// the reduced path.
	LoadElapsed time.Duration
	// AnchorTag plus AnchorUntil implement the anchored cut for
	// viewport displacement: one pinned row plus a gutter tag held
	// for 1x T2, then settle. AnchorStatic marks the reduced-motion
	// overlap: painted once with no hold.
	AnchorTag    string
	AnchorUntil  time.Time
	AnchorStatic bool
	// DialogMuted auto-dismisses JavaScript dialogs after acts; Esc
	// with a pending dialog breaks to the address bar with a mute
	// offer when muting is off.
	DialogMuted bool
	// lastDrawerToggle plus lastResolve feed the 150 ms strobe
	// window: gestures inside one window paint only the final state.
	lastDrawerToggle time.Time
	lastResolve      time.Time
}

// NewShell opens with the fixture home page on the default tab.
func NewShell() *Shell {
	page := demo.Lookup("fixture://home")
	return &Shell{
		Tabs:     []Tab{{Title: page.Title, Address: page.Address, Page: page}},
		Profiles: loadProfiles(),
		Profile:  "default",
		Record:   true,
		ShowHints: true,
		Message:  "Type / then an http(s) URL for live fetch; fixture://home works offline. Press ? for keys.",
	}
}

// CloseLive shuts the persistent live browser down. The tb frontend
// defers it on interactive exit; profile switches call it so the next
// navigation relaunches isolated under the new profile. A running
// media watch stops first: its sampler holds the same browser.
func (s *Shell) CloseLive() {
	s.stopMediaWatch()
	if s.live != nil {
		_ = s.live.Close()
		s.live = nil
		s.liveFor = ""
	}
}

func (s *Shell) closeLive() { s.CloseLive() }

// RestoreSession reopens the persisted current entry after a restart.
// Fixture entries repaint instantly; live entries restore the address
// and title with a reload prompt instead of blocking startup on a
// synchronous fetch. Either way the back/forward stack stays intact
// because the restore itself records nothing.
func (s *Shell) RestoreSession() {
	v, ok, err := engine.CurrentStackEntry(s.Profile)
	if err != nil || !ok {
		return
	}
	if isLiveAddr(v.URL) {
		t := s.Current()
		t.Address, t.Title, t.Scroll = v.URL, v.Title, 0
		t.Page = engine.OfflinePage(v.URL, "Session restored after restart; press r to reload "+v.URL)
		t.Live, t.FetchWidth = false, 0
		s.Message = "Restored session: " + v.URL + " (press r to reload)"
		return
	}
	was := s.Record
	s.Record = false
	s.Open(v.URL)
	s.Record = was
	s.Message = "Restored session: " + v.URL
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

// Open navigates the active tab: blocked script schemes paint the
// hostile-input card (nothing executes), fixture addresses resolve
// through the local router, http(s) addresses fetch live through the
// engine sidecar with offline fail-closed errors. Live pages rewrap
// to the frame at render time, so Open fetches at a generous width.
// Successful visits persist to history and the back/forward stack
// unless Record is off.
func (s *Shell) Open(addr string) {
	a := strings.TrimSpace(addr)
	if a == "" {
		a = "fixture://home"
	}
	if scheme, blocked := demo.BlockedScheme(a); blocked {
		page := demo.BlockedPage(a, scheme)
		t := s.Current()
		t.Address, t.Title, t.Page, t.Scroll = page.Address, page.Title, page, 0
		t.Live, t.FetchWidth, t.Refs, t.Gen, t.Stable = false, 0, nil, 0, true
		s.Message = "Blocked " + scheme + ": scheme cannot run here; open http(s) or fixture:// instead."
		return
	}
	if isLiveAddr(a) {
		s.openLive(a)
		return
	}
	page := demo.Lookup(a)
	t := s.Current()
	t.Address, t.Title, t.Page, t.Scroll = page.Address, page.Title, page, 0
	t.Live, t.FetchWidth = false, 0
	if s.Record {
		_ = engine.RecordVisit(s.Profile, page.Address, page.Title)
		_, _ = engine.VisitStack(s.Profile, page.Address, page.Title)
	}
	s.Message = "Opened " + page.Address
}

// CycleProfile switches to the next known profile. Tabs keep their
// pages; subsequent navigations record under the new profile. Unknown
// profile names never enter the list: membership comes from the
// profiles directory, not from keystrokes.
func (s *Shell) CycleProfile() {
	if len(s.Profiles) == 0 {
		s.Profiles = []string{"default"}
	}
	at := 0
	for i, p := range s.Profiles {
		if p == s.Profile {
			at = i
			break
		}
	}
	s.Profile = s.Profiles[(at+1)%len(s.Profiles)]
	s.closeLive()
	s.Message = "Profile: " + s.Profile + " (new navigations use it)"
}

// Back moves the persisted stack one entry back and loads that entry
// without appending: the index already moved, so the load reuses the
// no-record path.
func (s *Shell) Back() {
	v, ok, err := engine.Back(s.Profile)
	if err != nil {
		s.Message = "Back: " + firstLine(err.Error())
		return
	}
	if !ok {
		s.Message = "Back: oldest entry."
		return
	}
	was := s.Record
	s.Record = false
	s.Open(v.URL)
	s.Record = was
	s.Message = "Back to " + v.URL
}

// Forward moves the persisted stack one entry forward and loads that
// entry without appending.
func (s *Shell) Forward() {
	v, ok, err := engine.Forward(s.Profile)
	if err != nil {
		s.Message = "Forward: " + firstLine(err.Error())
		return
	}
	if !ok {
		s.Message = "Forward: newest entry."
		return
	}
	was := s.Record
	s.Record = false
	s.Open(v.URL)
	s.Record = was
	s.Message = "Forward to " + v.URL
}

// Reload reopens the current address without appending to history or
// the stack: refreshes repeat the visit, they never fork it.
func (s *Shell) Reload() {
	was := s.Record
	s.Record = false
	s.Open(s.Current().Address)
	s.Record = was
	if !strings.HasPrefix(s.Message, "Offline:") {
		s.Message = "Reloaded " + s.Current().Address
	}
}

// openLive loads a live page through the persistent interaction
// browser: the first navigation launches the sidecar, later ones
// reuse it warm in place. Tabs adopt the settled snapshot refs so
// human chips and agent acts share the same gen. Launch failures
// paint the honest offline page exactly like the one-shot path did.
// The fetch cost lands in LoadElapsed and the status message so the
// spinner line always names real milliseconds.
func (s *Shell) openLive(addr string) {
	start := time.Now()
	b, err := s.ensureLive(addr)
	off := func(err error) {
		res := engine.OfflineResult(addr, engine.ClassifyError(err), err.Error())
		page := res.ToDemoPage()
		t := s.Current()
		t.Address, t.Title, t.Page, t.Scroll = page.Address, page.Title, page, 0
		t.Live, t.FetchWidth, t.Refs, t.Gen, t.Stable = false, 0, nil, 0, false
		s.Message = "Offline: " + firstLine(res.Warning)
	}
	if err != nil {
		off(err)
		return
	}
	snap := b.Current()
	if snap == nil {
		offStr := "snapshot missing after open"
		off(errText(offStr))
		return
	}
	t := s.Current()
	t.Address, t.Title, t.Scroll = snap.URL, snap.Title, 0
	t.Page = demo.Page{Name: "live", Title: snap.Title, Address: snap.URL, Rows: b.Rows()}
	t.Live, t.FetchWidth = true, 100
	t.Refs, t.Gen, t.Stable = snap.Refs, snap.Gen, snap.Stable
	s.HintFocus, s.DrawerTop = 0, 0
	s.clearStale()
	s.refreshExt()
	s.LoadElapsed = time.Since(start)
	s.lastResolve = time.Now()
	msg := "Opened " + snap.URL + " live (gen" + itoa(snap.Gen) + ", " +
		itoa(len(snap.Refs)) + " refs, " + itoa(int(s.LoadElapsed/time.Millisecond)) + "ms; : drawer, eN act, ? keys)"
	if dlg := b.PendingDialog(); dlg != nil {
		if s.DialogMuted {
			if _, derr := b.HandleDialog(false, ""); derr == nil {
				msg += " dialog auto-dismissed (muted)."
			} else {
				msg += " dialog open (" + dlg.Type + "): dismiss failed, M mutes."
			}
		} else {
			msg += " dialog open (" + dlg.Type + "): Esc address bar, M mutes."
		}
	}
	s.Message = msg
}

// ensureLive returns the persistent browser, navigating it in place
// when the address changed. Profile switches relaunch isolated.
func (s *Shell) ensureLive(addr string) (*engine.Browser, error) {
	if s.live == nil || s.live.Closed() || s.liveFor != s.Profile {
		s.closeLive()
		b, err := engine.Open(addr, engine.OpenOptions{
			Profile: s.Profile, Lite: false, Width: 100, NoRecord: !s.Record,
		})
		if err != nil {
			return nil, err
		}
		s.live, s.liveFor = b, s.Profile
		return b, nil
	}
	s.live.SetRecord(s.Record)
	if s.live.URL() != addr {
		snap, err := s.live.Navigate(addr)
		if err != nil {
			return nil, err
		}
		_ = snap
	}
	return s.live, nil
}

type errText string

func (e errText) Error() string { return string(e) }

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

// NewEmptyTab opens the empty starter card: one centered card with
// the primary open action plus three starter destinations. The tab
// reports a stable gen with no refs, so chips and the drawer stay
// hidden until the first open commits.
func (s *Shell) NewEmptyTab() {
	page := demo.EmptyPage()
	s.Tabs = append(s.Tabs, Tab{Title: page.Title, Address: page.Address, Page: page, Stable: true})
	s.Active = len(s.Tabs) - 1
	s.Message = "New tab: type / then an address to open a page."
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
	if s.FillEntry {
		return s.handleFillKey(ev)
	}
	if ev.Special == "esc" {
		if s.RefEntry {
			s.RefEntry, s.RefBuf = false, ""
			s.Message = "Ref entry cancelled."
			return true
		}
		if s.ShowExt {
			s.ShowExt = false
			s.Message = "Extensions closed."
			return true
		}
		if s.ShowDrawer {
			s.ShowDrawer = false
			s.Message = "Drawer closed."
			return true
		}
		if s.live != nil && !s.live.Closed() && !s.DialogMuted {
			if dlg := s.live.PendingDialog(); dlg != nil {
				s.AddrEdit = true
				s.AddrBuf = s.Current().Address
				s.Message = "Dialog (" + dlg.Type + ") open: broke to address bar; M mutes dialogs."
				return true
			}
		}
		return true
	}
	if s.RefEntry {
		if ev.Special == "backspace" {
			if len(s.RefBuf) > 0 {
				s.RefBuf = s.RefBuf[:len(s.RefBuf)-1]
			}
			s.Message = "Ref: e" + s.RefBuf + " (Enter acts, Esc cancels)"
			return true
		}
		if ev.Special == "enter" {
			id := "e" + s.RefBuf
			s.RefEntry, s.RefBuf = false, ""
			if id == "e" {
				s.Message = "Empty ref: type e plus digits, like e3."
				return true
			}
			s.actLiveClick(id)
			return true
		}
		if ev.Special == "" && len(ev.Key) == 1 && ev.Key[0] >= '0' && ev.Key[0] <= '9' {
			s.RefBuf += ev.Key
			s.Message = "Ref: e" + s.RefBuf + " (Enter acts, Esc cancels)"
			return true
		}
		// While ref entry is open, non-digit keys stay inside the
		// entry: typos must never fall through to the main key switch
		// (where x closes a tab and q quits). Keep the entry open with
		// a hint so the user can correct or Esc out.
		s.Message = "Bad ref key: type digits, Enter acts, Esc cancels (Ref: e" + s.RefBuf + ")"
		return true
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
			s.NewEmptyTab()
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
	case "enter":
		if s.ShowExt {
			ext, action, ok := s.focusedExt()
			if !ok {
				s.Message = "No page actions: install an extension or open a matching page."
				return true
			}
			s.actLiveExt(ext, action)
			return true
		}
		if s.ShowDrawer {
			id := s.focusedRef()
			s.ShowDrawer = false
			s.actLiveClick(id)
			return true
		}
		return true
	}
	switch key {
	case "q":
		if s.ShowDrawer {
			s.ShowDrawer = false
			s.Message = "Drawer closed."
			return true
		}
		return false
	case "?":
		s.ShowHelp = !s.ShowHelp
		return true
	case ":":
		t := s.Current()
		if !t.Live || len(t.Refs) == 0 {
			s.Message = "No refs: open a live page first."
			return true
		}
		now := time.Now()
		collapsed := term.StrobeCollapse(s.lastResolve, now) ||
			term.StrobeCollapse(s.lastDrawerToggle, now)
		s.lastDrawerToggle = now
		s.ShowDrawer = !s.ShowDrawer
		if s.ShowDrawer {
			s.ShowExt = false
		}
		s.clampHint()
		if s.ShowDrawer {
			if collapsed {
				s.Message = "Drawer (settled): j/k move, Enter acts, [ ] page, Esc closes."
			} else {
				s.Message = "Drawer: j/k move, Enter acts, [ ] page, Esc closes."
			}
		} else {
			s.Message = "Drawer closed."
		}
		return true
	case ".":
		s.ShowHints = !s.ShowHints
		if s.ShowHints {
			s.Message = "Hint chips on."
		} else {
			s.Message = "Hint chips hidden (audit layer); refs still in drawer."
		}
		return true
	case "R":
		s.applyRemap()
		return true
	case "M":
		s.DialogMuted = !s.DialogMuted
		if s.DialogMuted {
			s.Message = "Dialogs muted: popups auto-dismiss after acts."
		} else {
			s.Message = "Dialogs unmuted: popups trap the ring until dismissed."
		}
		return true
	case " ":
		t := s.Current()
		if !t.Live || len(t.Refs) == 0 {
			return true
		}
		id := s.focusedRef()
		if s.ShowDrawer {
			s.ShowDrawer = false
		}
		s.actLiveClick(id)
		return true
	case "e":
		t := s.Current()
		if !t.Live || len(t.Refs) == 0 {
			s.Message = "No refs: open a live page first."
			return true
		}
		s.RefEntry, s.RefBuf = true, ""
		s.Message = "Ref: e (type digits, Enter acts, Esc cancels)"
		return true
	case "f":
		t := s.Current()
		if !t.Live || len(t.Refs) == 0 {
			s.Message = "No refs: open a live page first."
			return true
		}
		id := s.focusedRef()
		var role string
		for _, r := range t.Refs {
			if r.ID == id {
				role = r.Role
			}
		}
		switch role {
		case "textbox", "searchbox", "combobox":
		default:
			s.Message = "Ref " + id + " is " + role + ", not a text field."
			return true
		}
		s.FillEntry, s.FillRef, s.FillBuf = true, id, ""
		s.Message = "Fill " + id + ": type text, Enter fills, Esc cancels."
		return true
	case "j":
		if s.ShowDrawer {
			s.drawerMove(1)
			return true
		}
		if s.ShowExt {
			s.extMove(1)
			return true
		}
		return true
	case "k":
		if s.ShowDrawer {
			s.drawerMove(-1)
			return true
		}
		if s.ShowExt {
			s.extMove(-1)
			return true
		}
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
	case "H":
		s.Back()
		return true
	case "L":
		s.Forward()
		return true
	case "r":
		s.Reload()
		return true
	case "p":
		s.CycleProfile()
		return true
	case "[":
		if s.ShowExt {
			s.ExtTop -= 2
			s.ExtFocus = s.ExtTop
			s.clampExt()
			return true
		}
		if s.ShowDrawer {
			s.DrawerTop -= 2
			s.HintFocus = s.DrawerTop
			s.clampHint()
			return true
		}
		if s.Active > 0 {
			s.Active--
		}
		return true
	case "]":
		if s.ShowExt {
			s.ExtTop += 2
			s.ExtFocus = s.ExtTop
			s.clampExt()
			return true
		}
		if s.ShowDrawer {
			s.DrawerTop += 2
			s.HintFocus = s.DrawerTop
			s.clampHint()
			return true
		}
		if s.Active < len(s.Tabs)-1 {
			s.Active++
		}
		return true
	case "t":
		s.NewEmptyTab()
		return true
	case "X":
		t := s.Current()
		if !t.Live {
			s.Message = "No extensions: open a live page first."
			return true
		}
		s.ShowExt = !s.ShowExt
		if s.ShowExt {
			s.ShowDrawer = false
			s.refreshExt()
			s.clampExt()
			s.Message = "Extensions: j/k move, Enter runs, [ ] page, Esc closes."
		} else {
			s.Message = "Extensions closed."
		}
		return true
	case "V":
		s.toggleMedia()
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
		// cancels the edit.
		if ev.Key == "c" {
			s.AddrEdit = false
		}
		return true
	}
	if ev.Key != "" && ev.Special == "" {
		s.AddrBuf += ev.Key
	}
	return true
}

func (s *Shell) handleFillKey(ev term.Event) bool {
	switch ev.Special {
	case "enter":
		s.FillEntry = false
		id, text := s.FillRef, s.FillBuf
		s.FillRef, s.FillBuf = "", ""
		if strings.TrimSpace(text) == "" {
			s.Message = "Empty fill: nothing typed for " + id + "."
			return true
		}
		s.actLiveFill(id, text)
		return true
	case "esc":
		s.FillEntry, s.FillRef, s.FillBuf = false, "", ""
		s.Message = "Fill cancelled."
		return true
	case "backspace":
		if len(s.FillBuf) > 0 {
			_, size := utf8.DecodeLastRuneInString(s.FillBuf)
			if size <= 0 {
				size = 1
			}
			s.FillBuf = s.FillBuf[:len(s.FillBuf)-size]
		}
		return true
	}
	if ev.Ctrl {
		if ev.Key == "c" {
			s.FillEntry, s.FillRef, s.FillBuf = false, "", ""
			s.Message = "Fill cancelled."
		}
		return true
	}
	if ev.Key != "" && ev.Special == "" {
		s.FillBuf += ev.Key
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
		// Left click: the address bar (1-based terminal row 2) enters
		// edit mode; the chip row (1-based row LastH-1) fires the
		// clicked chip or opens the drawer on +NN more.
		if ev.MouseDown && ev.MouseY == 2 {
			s.AddrEdit = true
			s.AddrBuf = s.Current().Address
		} else if ev.MouseDown && s.LastH > 0 && ev.MouseY == s.LastH-1 {
			if hit := s.chipAt(ev.MouseX); hit != nil {
				if hit.More {
					s.ShowDrawer = true
					s.clampHint()
					s.Message = "Drawer: j/k move, Enter acts, [ ] page, Esc closes."
				} else {
					s.HintFocus = refIndex(s.Current().Refs, hit.Ref)
					s.actLiveClick(hit.Ref)
				}
			}
		}
	}
	return true
}

// refIndex finds a ref id position for focus sync after mouse picks.
func refIndex(refs []engine.Ref, id string) int {
	for i, r := range refs {
		if r.ID == id {
			return i
		}
	}
	return 0
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
	// Viewport displacement pins the continuity anchor: one prior
	// row plus a gutter tag for 1x T2, then settle. Small moves and
	// tab switches take the zero-frame cut (no anchor).
	if d >= 10 || d <= -10 {
		a := term.AnchorFor(true, itoa(d)+" rows")
		s.AnchorTag, s.AnchorStatic = a.Tag, a.Static
		if !a.Static {
			s.AnchorUntil = time.Now().Add(a.Hold)
		}
	}
}

// anchorSuffix renders the displacement anchor tag for the status
// line: the live 1x T2 hold, or the static overlap marker on the
// reduced path. Expired holds report nothing.
func (s *Shell) anchorSuffix() string {
	if s.AnchorTag == "" {
		return ""
	}
	if s.AnchorStatic {
		return "anchor:" + s.AnchorTag + " (static)"
	}
	if time.Now().Before(s.AnchorUntil) {
		return "anchor:" + s.AnchorTag
	}
	return ""
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
// rewrap to the frame width when it differs from the fetch width. The
// Harbor overlay paints last: hint chips on the bottom content row and
// the drawer above them, both pure overdraw that vanishes on dismiss.
func (s *Shell) Render(f *term.Frame) int {
	s.LastW, s.LastH = f.W, f.H
	if !s.AnchorStatic && s.AnchorTag != "" && time.Now().After(s.AnchorUntil) {
		s.AnchorTag = ""
	}
	s.mediaMu.Lock()
	s.mediaW, s.mediaH = f.W, f.H
	s.mediaMu.Unlock()
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
	if s.ShowDrawer && cur.Live && len(cur.Refs) > 0 {
		s.clampHint()
		s.drawDrawer(f)
	} else if s.ShowExt && cur.Live {
		s.clampExt()
		s.drawExt(f)
	} else if f.H >= 8 {
		s.drawChips(f, f.H-2)
	}
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
	} else if s.RefEntry {
		text = "Ref: e" + s.RefBuf + "_ (Enter acts, Esc cancels)"
	} else if s.FillEntry {
		text = "Fill " + s.FillRef + ": " + s.FillBuf + "_"
	}
	shown := addrWindow(text, f.W)
	f.WriteText(0, 1, shown, chromeFG, chromeBG)
	for x := 0; x < f.W && x < len([]rune(shown)); x++ {
		c := f.At(x, 1)
		c.BG = chromeBG
		f.Set(x, 1, c)
	}
}

// addrWindow fits overlong addresses into row width w with `<` `>`
// scroll markers: the tail stays visible (host plus path end keep
// context) and the markers show the row scrolls. Rows at or under w
// pass through with the leading pad.
func addrWindow(text string, w int) string {
	r := []rune(" " + text)
	if len(r) <= w {
		return string(r)
	}
	if w <= 4 {
		return string(r[:w])
	}
	inner := w - 2
	tail := r[len(r)-inner:]
	out := append([]rune{'<'}, tail...)
	out[len(out)-1] = '>'
	return string(out)
}

func renderStatus(s *Shell, f *term.Frame) {
	msg := s.Message + "  |  tabs:" + itoa(len(s.Tabs)) +
		"  scroll:" + itoa(s.Current().Scroll) + "/" + itoa(len(s.Current().Page.Rows))
	if t := s.Current(); t.Live && t.Gen > 0 {
		// The gen stamp leads the line: truncation cuts the message
		// tail on narrow frames, never the settled generation the
		// agent and the human both read refs against.
		stable := "settled"
		if !t.Stable {
			stable = "wait-settled"
		}
		msg = "gen" + itoa(t.Gen) + " " + stable + " " + itoa(len(t.Refs)) + "refs | " + msg
	}
	if s.StaleWant != "" {
		msg += "  STALE:" + s.StaleWant + " (R remaps)"
	}
	if tag := s.anchorSuffix(); tag != "" {
		msg += "  " + tag
	}
	if s.DialogMuted {
		msg += "  dlg:muted"
	}
	if len(s.ExtActions) > 0 {
		msg += "  ext:" + itoa(len(s.ExtActions))
	}
	if line := s.MediaStatLine(); line != "" {
		msg += "  " + line
	}
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
		"t new tab (empty card), x close tab, 1-9 jump, g/G top/bottom,",
		"H/L back/forward, r reload, p profile, Ctrl+T/W/L/Q twins,",
		"wheel scrolls, ? toggles help.",
		"Live refs: : drawer, Space act focused, eN+Enter act,",
		"f fill text field, . chips, R stale remap, Esc closes.",
		"X page actions, V media watch, M mute dialogs,",
		"Enter runs focused action. REDUCED_MOTION=1 stills motion.",
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
	dir := engine.ProfilesRoot()
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
