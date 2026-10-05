package term

import (
	"bytes"
	"strings"
	"testing"
)

func TestDirtyTracking(t *testing.T) {
	f := NewFrame(10, 5)
	if _, _, any := f.DirtyBBox(); any {
		t.Fatal("fresh frame must be clean")
	}
	f.Set(3, 2, Cell{Ch: 'x'})
	top, bottom, any := f.DirtyBBox()
	if !any || top != 2 || bottom != 2 {
		t.Fatalf("expected dirty row 2, got %d..%d any=%v", top, bottom, any)
	}
	f.MarkClean()
	if _, _, any := f.DirtyBBox(); any {
		t.Fatal("frame must be clean after MarkClean")
	}
}

func TestCompositorSyncWrapping(t *testing.T) {
	comp := NewCompositor(Capabilities{SyncOutput: true})
	var buf bytes.Buffer
	comp.OpenFrame(&buf)
	comp.CloseFrame(&buf)
	s := buf.String()
	if !strings.HasPrefix(s, "\x1b[?2026h") || !strings.HasSuffix(s, "\x1b[?2026l") {
		t.Fatalf("missing sync envelope: %q", s)
	}
}

func TestCompositorCursorFallback(t *testing.T) {
	comp := NewCompositor(Capabilities{})
	var buf bytes.Buffer
	comp.OpenFrame(&buf)
	comp.CloseFrame(&buf)
	s := buf.String()
	if !strings.Contains(s, "\x1b[?25l") || !strings.Contains(s, "\x1b[?25h") {
		t.Fatalf("missing cursor fallback: %q", s)
	}
}

func TestDirtyRowsSince(t *testing.T) {
	comp := NewCompositor(Capabilities{})
	a := NewFrame(8, 4)
	a.WriteText(0, 0, "hello", RGB{}, RGB{})
	rows := comp.DirtyRowsSince(a)
	for _, r := range rows {
		if !r {
			t.Fatal("first frame must be fully dirty")
		}
	}
	comp.Commit(a)
	b := NewFrame(8, 4)
	copy(b.Cells, a.Cells)
	b.Set(1, 3, Cell{Ch: 'z'})
	rows = comp.DirtyRowsSince(b)
	for y, r := range rows {
		if (y == 3) != r {
			t.Fatalf("only row 3 should differ, row %d dirty=%v", y, r)
		}
	}
}

func TestGovernorBounds(t *testing.T) {
	g := NewGovernor(TierBlock)
	if fps := g.TargetFPS(); fps < 9 || fps > 16 {
		t.Fatalf("block governor should target ~10fps, got %d", fps)
	}
	g = NewGovernor(TierKitty)
	if fps := g.TargetFPS(); fps < 25 {
		t.Fatalf("kitty governor should target ~30fps, got %d", fps)
	}
}
