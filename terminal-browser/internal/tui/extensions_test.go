package tui

import (
	"testing"

	"randomlabs/terminal-browser/internal/term"
)

// The extension palette and media watch fail closed with guidance
// when no live page is open: both need a real browser, never a
// fixture stand-in.
func TestExtMediaKeysNeedLive(t *testing.T) {
	s := NewShell()
	s.Handle(term.Event{Kind: "key", Key: "X"})
	if s.ShowExt {
		t.Fatal("X must not open the palette without a live page")
	}
	if s.Message != "No extensions: open a live page first." {
		t.Fatalf("message = %q", s.Message)
	}
	s.Handle(term.Event{Kind: "key", Key: "V"})
	if got := s.MediaStatLine(); got != "" {
		t.Fatalf("media stat = %q, want idle", got)
	}
	if s.MediaSurface() != nil {
		t.Fatal("media surface must be nil when idle")
	}
	if s.Message != "No media: open a live page first." {
		t.Fatalf("message = %q", s.Message)
	}
}

// Palette focus clamps and pages inside the action list without a
// browser: pure overlay math stays hermetic.
func TestExtClampPaging(t *testing.T) {
	s := NewShell()
	s.clampExt()
	if s.ExtFocus != 0 || s.ExtTop != 0 {
		t.Fatal("empty palette must clamp to zero")
	}
	s.ExtFocus = 99
	s.clampExt()
	if s.ExtFocus != 0 {
		t.Fatal("empty palette must swallow focus")
	}
}
