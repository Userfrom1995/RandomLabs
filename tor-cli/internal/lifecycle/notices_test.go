package lifecycle

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func TestNoticesPathOwnedOnly(t *testing.T) {
	in := &Instance{DataDir: "/tmp/torshim-x", Owned: true}
	if got := in.NoticesPath(); got != filepath.Join("/tmp/torshim-x", "notices.log") {
		t.Fatalf("NoticesPath = %q", got)
	}
	if got := (&Instance{DataDir: "/tmp/torshim-x", Owned: false}).NoticesPath(); got != "" {
		t.Fatalf("foreign instance must have no notices path, got %q", got)
	}
	if got := (*Instance)(nil).NoticesPath(); got != "" {
		t.Fatalf("nil instance must have no notices path, got %q", got)
	}
}

func TestTailFileLastLines(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "notices.log")
	var b strings.Builder
	for i := 1; i <= 20; i++ {
		b.WriteString("line " + strconv.Itoa(i) + "\n")
	}
	if err := os.WriteFile(p, []byte(b.String()), 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := TailFile(p, 5)
	if err != nil {
		t.Fatalf("TailFile: %v", err)
	}
	if len(got) != 5 || got[0] != "line 16" || got[4] != "line 20" {
		t.Fatalf("tail = %q", got)
	}
}

func TestTailFileShortFileAndMissing(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "notices.log")
	if err := os.WriteFile(p, []byte("only\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := TailFile(p, 5)
	if err != nil || len(got) != 1 || got[0] != "only" {
		t.Fatalf("short tail = %q, err=%v", got, err)
	}
	got, err = TailFile(filepath.Join(dir, "absent.log"), 5)
	if err != nil || len(got) != 0 {
		t.Fatalf("missing file must tail empty without error: %q, %v", got, err)
	}
	empty := filepath.Join(dir, "empty.log")
	if err := os.WriteFile(empty, nil, 0o600); err != nil {
		t.Fatal(err)
	}
	got, err = TailFile(empty, 5)
	if err != nil || len(got) != 0 {
		t.Fatalf("empty file must tail empty without error: %q, %v", got, err)
	}
}
