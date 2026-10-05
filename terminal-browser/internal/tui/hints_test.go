package tui

import (
	"testing"

	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/term"
)

// liveTab seeds a live tab with n refs for overlay tests. No browser
// launches: chips, drawer, and ref entry are pure view plus gen logic
// and stay hermetic without Chrome.
func liveTab(s *Shell, n int) {
	refs := make([]engine.Ref, 0, n)
	for i := 1; i <= n; i++ {
		refs = append(refs, engine.Ref{
			ID: "e" + itoa(i), Role: "link", Name: "item",
			BackendID: int64(i),
		})
	}
	t := s.Current()
	t.Live, t.FetchWidth = true, 100
	t.Refs, t.Gen, t.Stable = refs, 2, true
}

func TestChipBudget(t *testing.T) {
	if chipBudget(80) != 6 || chipBudget(81) != 10 || chipBudget(120) != 10 || chipBudget(121) != 14 {
		t.Fatalf("chip budgets drift: 80=%d 81=%d 120=%d 121=%d",
			chipBudget(80), chipBudget(81), chipBudget(120), chipBudget(121))
	}
}

func TestVisibleChipsOverflow(t *testing.T) {
	s := NewShell()
	liveTab(s, 10)
	s.LastW = 80
	vis, more := s.visibleChips()
	if len(vis) != 6 || more != 4 {
		t.Fatalf("80 cols must show 6 chips plus +4 bank, got %d+%d", len(vis), more)
	}
	s.ShowHints = false
	if vis, more := s.visibleChips(); len(vis) != 0 || more != 0 {
		t.Fatal("hidden audit layer must yield no chips")
	}
}

func TestChipRowOneLine(t *testing.T) {
	s := NewShell()
	liveTab(s, 4)
	f := term.NewFrame(80, 24)
	s.Render(f)
	// The chip row is the last content row; rows above it keep page
	// content and the status line keeps the gen stamp.
	found := false
	for _, h := range s.chips {
		if h.Ref != "" {
			found = true
		}
	}
	if !found {
		t.Fatal("chip row drew no ref hits")
	}
	var status string
	for x := 0; x < f.W; x++ {
		status += string(f.At(x, f.H-1).Ch)
	}
	if !contains(status, "gen2") {
		t.Fatalf("status must stamp the settled gen: %q", status)
	}
}

func TestDrawerToggleAndPaging(t *testing.T) {
	s := NewShell()
	liveTab(s, 5)
	if !s.Handle(term.Event{Kind: "key", Key: ":"}) || !s.ShowDrawer {
		t.Fatal(": must open the drawer on a live tab")
	}
	s.Handle(term.Event{Kind: "key", Key: "j"})
	if s.HintFocus != 1 {
		t.Fatalf("j must move focus, at %d", s.HintFocus)
	}
	s.Handle(term.Event{Kind: "key", Key: "]"})
	if s.HintFocus < 2 {
		t.Fatalf("] must page the drawer, at %d", s.HintFocus)
	}
	if !s.Handle(term.Event{Kind: "key", Special: "esc"}) || s.ShowDrawer {
		t.Fatal("esc must close the drawer")
	}
	// Drawer needs refs: fixture tabs refuse it honestly.
	s2 := NewShell()
	s2.Handle(term.Event{Kind: "key", Key: ":"})
	if s2.ShowDrawer {
		t.Fatal("drawer must not open without live refs")
	}
}

func TestRefEntryFlow(t *testing.T) {
	s := NewShell()
	liveTab(s, 3)
	s.Handle(term.Event{Kind: "key", Key: "e"})
	if !s.RefEntry {
		t.Fatal("e must enter ref entry on a live tab")
	}
	s.Handle(term.Event{Kind: "key", Key: "2"})
	if s.RefBuf != "2" {
		t.Fatalf("digits must accumulate, buf=%q", s.RefBuf)
	}
	// No live browser runs in hermetic tests, so firing reports the
	// honest no-page message and leaves entry mode.
	s.Handle(term.Event{Kind: "key", Special: "enter"})
	if s.RefEntry {
		t.Fatal("enter must leave ref entry")
	}
	s.Handle(term.Event{Kind: "key", Key: "e"})
	s.Handle(term.Event{Kind: "key", Special: "esc"})
	if s.RefEntry {
		t.Fatal("esc must cancel ref entry")
	}
}

func TestSpaceWithoutLiveIsNoop(t *testing.T) {
	s := NewShell()
	addr := s.Current().Address
	s.Handle(term.Event{Kind: "key", Key: " "})
	if s.Current().Address != addr {
		t.Fatal("space on a fixture tab must not navigate")
	}
}

func TestRemapWithoutStale(t *testing.T) {
	s := NewShell()
	s.Handle(term.Event{Kind: "key", Key: "R"})
	if !contains(s.Message, "Nothing stale") {
		t.Fatalf("R with no stale must say so: %q", s.Message)
	}
}

func TestChipClickMapping(t *testing.T) {
	s := NewShell()
	liveTab(s, 3)
	f := term.NewFrame(80, 24)
	s.Render(f)
	if len(s.chips) == 0 {
		t.Fatal("no chip hits recorded")
	}
	hit := s.chips[1]
	// 1-based mouse column inside the second chip resolves to e2.
	got := s.chipAt(hit.X0 + 2)
	if got == nil || got.Ref != "e2" {
		t.Fatalf("chip hit mapped to %+v, want e2", got)
	}
	if s.chipAt(0) != nil {
		t.Fatal("column 0 (gutter) must hit nothing")
	}
}

func TestClampHint(t *testing.T) {
	s := NewShell()
	liveTab(s, 3)
	s.HintFocus = 99
	s.clampHint()
	if s.HintFocus != 2 {
		t.Fatalf("focus must clamp to last ref, at %d", s.HintFocus)
	}
	s.HintFocus = -5
	s.DrawerTop = -5
	s.clampHint()
	if s.HintFocus != 0 || s.DrawerTop != 0 {
		t.Fatal("negative focus must clamp to zero")
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
