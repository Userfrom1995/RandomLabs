package tui

import (
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/term"
)

// Harbor overlay: settled snapshot hint chips (eN plus +NN more bank,
// one row, zero reflow), the 3-row overlay drawer, and the ref entry
// line. Chips and the drawer are pure overlays over content rows: the
// content buffer underneath is never modified, so dismissing restores
// the exact viewport. Human clicks, typed eN, and agent acts resolve
// through the same gen check on the same live browser.

// chipHit is one clickable chip cell range on the chip row.
type chipHit struct {
	Ref      string
	X0, X1   int
	More     bool
	Focused  bool
}

// chipBudget caps visible chips by frame width: up to 80 cols max 6,
// 81-120 max 10, above 120 max 14. The +NN bank covers the rest.
func chipBudget(w int) int {
	switch {
	case w <= 80:
		return 6
	case w <= 120:
		return 10
	default:
		return 14
	}
}

// visibleChips returns the refs drawn as chips plus the overflow
// count for the +NN bank.
func (s *Shell) visibleChips() ([]engine.Ref, int) {
	t := s.Current()
	if !t.Live || len(t.Refs) == 0 || !s.ShowHints {
		return nil, 0
	}
	budget := chipBudget(s.LastW)
	if len(t.Refs) <= budget {
		return t.Refs, 0
	}
	return t.Refs[:budget], len(t.Refs) - budget
}

// drawChips paints the single overlay chip row at zero-based row
// chipRow and records hit boxes for mouse clicks. Focused chips wear
// brackets plus the focus background; the +NN bank is underlined.
func (s *Shell) drawChips(f *term.Frame, chipRow int) {
	refs, more := s.visibleChips()
	if len(refs) == 0 && more == 0 {
		s.chips = nil
		return
	}
	s.chips = s.chips[:0]
	x := 1
	put := func(text string, fg, bg term.RGB, bold, underline bool) {
		for _, r := range text {
			if x >= f.W {
				return
			}
			f.Set(x, chipRow, term.Cell{Ch: r, FG: fg, BG: bg, Bold: bold, Underline: underline})
			x++
		}
		if x < f.W {
			f.Set(x, chipRow, term.Cell{Ch: ' ', FG: fg, BG: bg})
			x++
		}
	}
	t := s.Current()
	for i, r := range refs {
		focused := i == s.HintFocus
		bg := chromeBG
		label := " " + r.ID + " "
		if focused {
			bg = activeBG
			label = "[" + r.ID + "]"
		}
		x0 := x
		put(label, chromeFG, bg, focused, false)
		s.chips = append(s.chips, chipHit{Ref: r.ID, X0: x0, X1: x, Focused: focused})
		_ = t
	}
	if more > 0 {
		label := "+" + itoa(more) + " more"
		x0 := x
		put(label, chromeFG, chromeBG, false, true)
		s.chips = append(s.chips, chipHit{More: true, X0: x0, X1: x})
	}
	meta := " gen" + itoa(s.Current().Gen)
	for _, r := range meta {
		if x >= f.W {
			break
		}
		f.Set(x, chipRow, term.Cell{Ch: r, FG: chromeFG, BG: chromeBG})
		x++
	}
}

// chipAt maps a 1-based mouse column on the chip row to a chip hit.
func (s *Shell) chipAt(mx int) *chipHit {
	x := mx - 1
	for i := range s.chips {
		if x >= s.chips[i].X0 && x < s.chips[i].X1 {
			return &s.chips[i]
		}
	}
	return nil
}

// drawDrawer paints the 3-row overlay drawer above the chip row: a
// bordered box with the title plus stale flag on row 1 and the
// DOM-order ref list on rows 2-3. Same snapshot always yields the
// same list; focus rides the `>` marker plus full-row reverse.
func (s *Shell) drawDrawer(f *term.Frame) {
	t := s.Current()
	top := f.H - 5
	if top < ChromeRows+1 {
		return
	}
	w := f.W - 4
	if w < 20 {
		w = f.W
	}
	x0 := 2
	if w < f.W {
		x0 = 2
	}
	if x0+w > f.W {
		w = f.W - x0
	}
	title := " refs gen" + itoa(t.Gen) + " stable"
	if !t.Stable {
		title += " WAIT-SETTLED"
	}
	if s.StaleWant != "" {
		title += " STALE:" + s.StaleWant
	}
	border := "+" + strings.Repeat("-", w-2) + "+"
	drawBoxLine(f, x0, top, border)
	drawBoxLine(f, x0, top+1, "|"+truncate(" "+title, w-2)+"|")
	rows := []string{"", ""}
	for i := 0; i < 2; i++ {
		idx := s.DrawerTop + i
		if idx < len(t.Refs) {
			r := t.Refs[idx]
			mark := " "
			if idx == s.HintFocus {
				mark = ">"
			}
			rows[i] = mark + r.ID + " [" + r.Role + "] " + r.Name
		}
	}
	for i, ln := range rows {
		focused := s.DrawerTop+i == s.HintFocus
		bg := chromeBG
		if focused {
			bg = activeBG
		}
		line := "|" + truncate(" "+ln, w-2) + "|"
		rs := []rune(line)
		for len(rs) < w {
			rs = append(rs, ' ')
		}
		for x := 0; x < w && x0+x < f.W; x++ {
			ch := ' '
			if x < len(rs) {
				ch = rs[x]
			}
			f.Set(x0+x, top+2+i, term.Cell{Ch: ch, FG: chromeFG, BG: bg, Bold: focused})
		}
	}
	_ = top
}

func drawBoxLine(f *term.Frame, x0, y int, s string) {
	for i, r := range s {
		if x0+i >= f.W {
			return
		}
		f.Set(x0+i, y, term.Cell{Ch: r, FG: chromeFG, BG: chromeBG})
	}
}

// clampHint keeps focus and drawer paging inside the ref list.
func (s *Shell) clampHint() {
	n := len(s.Current().Refs)
	if n == 0 {
		s.HintFocus, s.DrawerTop = 0, 0
		return
	}
	if s.HintFocus < 0 {
		s.HintFocus = 0
	}
	if s.HintFocus >= n {
		s.HintFocus = n - 1
	}
	if s.DrawerTop < 0 {
		s.DrawerTop = 0
	}
	if s.DrawerTop > s.HintFocus {
		s.DrawerTop = s.HintFocus
	}
	if s.DrawerTop+1 < s.HintFocus {
		s.DrawerTop = s.HintFocus - 1
	}
	maxTop := n - 1
	if s.DrawerTop > maxTop {
		s.DrawerTop = maxTop
	}
}

// actLiveClick clicks a ref on the persistent live browser, then
// re-settles: refresh the URL, take a fresh snapshot, and adopt the
// new page when the click navigated. Stale gens fail closed with the
// remap stored for the R key, never clicking a neighbor.
func (s *Shell) actLiveClick(id string) {
	t := s.Current()
	if s.live == nil || !t.Live {
		s.Message = "No live page: open an http(s) URL first."
		return
	}
	norm, err := engine.ParseRef(id)
	if err != nil {
		s.Message = "Bad ref: " + err.Error()
		return
	}
	if err := s.live.Click(norm, t.Gen); err != nil {
		s.noteActErr(norm, t.Gen, err)
		return
	}
	s.clearStale()
	time.Sleep(600 * time.Millisecond)
	s.live.RefreshURL()
	snap, err := s.live.Snapshot()
	if err != nil {
		s.Message = "Clicked " + norm + "; re-snapshot failed: " + firstLine(err.Error())
		return
	}
	rows := s.live.Rows()
	if snap.URL != "" && snap.URL != t.Address {
		t.Address, t.Title, t.Scroll = snap.URL, snap.Title, 0
		if s.Record {
			_ = engine.RecordVisit(s.Profile, snap.URL, snap.Title)
			_, _ = engine.VisitStack(s.Profile, snap.URL, snap.Title)
		}
		s.Message = "Clicked " + norm + ": navigated to " + snap.URL + " (gen" + itoa(snap.Gen) + ")"
	} else {
		s.Message = "Clicked " + norm + " (gen" + itoa(snap.Gen) + ", " + itoa(len(snap.Refs)) + " refs)"
	}
	t.Page.Rows = rows
	t.Page.Title = snap.Title
	t.Refs, t.Gen, t.Stable = snap.Refs, snap.Gen, snap.Stable
	s.HintFocus = 0
	s.DrawerTop = 0
}

// actLiveFill fills a text ref on the live browser and re-settles
// the snapshot so chips track the edited page.
func (s *Shell) actLiveFill(id, text string) {
	t := s.Current()
	if s.live == nil || !t.Live {
		s.Message = "No live page: open an http(s) URL first."
		return
	}
	norm, err := engine.ParseRef(id)
	if err != nil {
		s.Message = "Bad ref: " + err.Error()
		return
	}
	if err := s.live.Fill(norm, t.Gen, text, false, false); err != nil {
		s.noteActErr(norm, t.Gen, err)
		return
	}
	s.clearStale()
	snap, err := s.live.Snapshot()
	if err != nil {
		s.Message = "Filled " + norm + "; re-snapshot failed: " + firstLine(err.Error())
		return
	}
	t.Page.Rows = s.live.Rows()
	t.Refs, t.Gen, t.Stable = snap.Refs, snap.Gen, snap.Stable
	s.HintFocus = 0
	s.DrawerTop = 0
	s.Message = "Filled " + norm + " (gen" + itoa(snap.Gen) + ")"
}

// noteActErr turns an act failure into a status message, storing
// stale remaps for the R key.
func (s *Shell) noteActErr(id string, gen int, err error) {
	if se, ok := err.(*engine.StaleError); ok {
		s.StaleWant, s.StaleGen, s.StaleReason = id, gen, se.Reason
		s.StaleRemap = se.Remap
		msg := "ref_stale: " + id + " from gen" + itoa(gen) + ": " + se.Reason + "."
		if se.Remap != nil {
			msg += " Press R for " + *se.Remap + "."
		} else {
			msg += " Snapshot changed completely."
		}
		s.Message = msg
		return
	}
	s.Message = "Act failed: " + firstLine(err.Error())
}

func (s *Shell) clearStale() {
	s.StaleWant, s.StaleReason, s.StaleRemap = "", "", nil
	s.StaleGen = 0
}

// applyRemap fires the stored stale remap: the one-key recovery the
// design requires.
func (s *Shell) applyRemap() {
	if s.StaleWant == "" || s.StaleRemap == nil {
		s.Message = "Nothing stale: R needs a ref_stale first."
		return
	}
	target := *s.StaleRemap
	s.Message = "Remapped " + s.StaleWant + " to " + target + "."
	s.clearStale()
	s.actLiveClick(target)
}

// drawerPaging moves focus inside the drawer list.
func (s *Shell) drawerMove(d int) {
	s.HintFocus += d
	s.clampHint()
	s.Message = "Ref " + s.focusedRef() + " (" + itoa(s.HintFocus+1) + "/" + itoa(len(s.Current().Refs)) + ")."
}

func (s *Shell) focusedRef() string {
	refs := s.Current().Refs
	if len(refs) == 0 {
		return "-"
	}
	s.clampHint()
	return refs[s.HintFocus].ID
}
