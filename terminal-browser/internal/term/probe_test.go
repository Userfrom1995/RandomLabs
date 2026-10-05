package term

import (
	"os"
	"testing"
)

func TestForcedBlockUnderTmux(t *testing.T) {
	t.Setenv("TMUX", "/tmp/tmux-1")
	t.Setenv("TB_TIER", "")
	caps := ProbeWithTimeout(1)
	if !caps.ForcedBlock {
		t.Fatal("expected forced block inside tmux")
	}
	if caps.Tier != TierBlock {
		t.Fatalf("expected block tier, got %s", caps.Tier)
	}
	if got := caps.TierOrder(); len(got) != 1 || got[0] != TierBlock {
		t.Fatalf("expected block-only order, got %v", got)
	}
}

func TestTierOverride(t *testing.T) {
	t.Setenv("TB_TIER", "sixel")
	caps := ProbeWithTimeout(1)
	if caps.Tier != TierSixel {
		t.Fatalf("expected sixel override, got %s", caps.Tier)
	}
}

func TestTierOrderKitty(t *testing.T) {
	caps := Capabilities{KittyGraphics: true, Tier: TierKitty, TrueColor: true}
	order := caps.TierOrder()
	if len(order) != 4 || order[0] != TierKitty || order[3] != TierBlock {
		t.Fatalf("bad kitty order: %v", order)
	}
}

func TestApplyReplySixel(t *testing.T) {
	caps := fromEnv()
	caps.applyReply("\x1b[?62;4c")
	if !caps.Sixel || caps.Tier != TierSixel {
		t.Fatalf("expected sixel detection, got %+v", caps)
	}
}

func TestApplyReplySync(t *testing.T) {
	caps := fromEnv()
	caps.applyReply("\x1b[?2026;1$y")
	if !caps.SyncOutput {
		t.Fatal("expected sync output detection")
	}
}

func TestCacheResize(t *testing.T) {
	os.Setenv("COLUMNS", "100")
	os.Setenv("LINES", "30")
	defer os.Unsetenv("COLUMNS")
	defer os.Unsetenv("LINES")
	c := NewCache()
	got := c.MarkResized()
	if got.Width != 100 || got.Height != 30 {
		t.Fatalf("expected 100x30 after resize, got %dx%d", got.Width, got.Height)
	}
}
