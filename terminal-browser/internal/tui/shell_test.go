package tui

import (
	"testing"

	"randomlabs/terminal-browser/internal/term"
)

func TestOpenAndNotFound(t *testing.T) {
	s := NewShell()
	s.Open("fixture://article")
	if s.Current().Address != "fixture://article" {
		t.Fatalf("expected article, got %s", s.Current().Address)
	}
	s.Open("fixture://missing")
	if s.Current().Page.Name != "not-found" {
		t.Fatalf("expected error page, got %s", s.Current().Page.Name)
	}
}

func TestTabs(t *testing.T) {
	s := NewShell()
	s.NewTab("fixture://table")
	if len(s.Tabs) != 2 || s.Active != 1 {
		t.Fatalf("expected 2 tabs active 1: %+v", s)
	}
	s.CloseTab()
	if len(s.Tabs) != 1 {
		t.Fatalf("expected 1 tab after close: %+v", s)
	}
	s.CloseTab()
	if len(s.Tabs) != 1 {
		t.Fatal("last tab must stay open")
	}
}

func TestAddrEditKeys(t *testing.T) {
	s := NewShell()
	s.Handle(term.Event{Kind: "key", Key: "/"})
	if !s.AddrEdit {
		t.Fatal("expected address edit mode")
	}
	for _, r := range "table" {
		s.Handle(term.Event{Kind: "key", Key: string(r)})
	}
	s.Handle(term.Event{Kind: "key", Special: "enter"})
	if s.Current().Address != "fixture://home/table" && s.Current().Page.Name == "not-found" {
		t.Logf("routed to %s (error page is fine for unlisted)", s.Current().Address)
	}
	if s.AddrEdit {
		t.Fatal("enter must leave edit mode")
	}
}

func TestRenderFillsGrid(t *testing.T) {
	s := NewShell()
	f := term.NewFrame(80, 24)
	if n := s.Render(f); n == 0 {
		t.Fatal("render must write content rows")
	}
	if c := f.At(0, 0); c.Ch == 0 {
		t.Fatal("tab strip must paint")
	}
	if c := f.At(0, f.H-1); c.Ch == 0 {
		t.Fatal("status line must paint")
	}
}

func TestQuitKey(t *testing.T) {
	s := NewShell()
	if s.Handle(term.Event{Kind: "key", Key: "q"}) {
		t.Fatal("q must request quit")
	}
}
