package engine

import (
	"strings"
	"testing"
)

// Non-Windows paths pass through untouched, however long.
func TestLongPathPassthrough(t *testing.T) {
	for _, goos := range []string{"linux", "darwin"} {
		p := "/home/user/.terminal-browser/profiles/default/sidecar-1-2"
		if got := longPathFor(p, goos); got != p {
			t.Fatalf("%s: got %q", goos, got)
		}
	}
}

func TestLongPathWindows(t *testing.T) {
	short := `C:\Users\alice\.terminal-browser\profiles\default`
	if got := longPathFor(short, "windows"); got != short {
		t.Fatalf("short path rewritten: %q", got)
	}
	long := `C:\Users\` + strings.Repeat("a", 240) + `\profile`
	got := longPathFor(long, "windows")
	if got != `\\?\`+long {
		t.Fatalf("long path = %q", got)
	}
	if again := longPathFor(got, "windows"); again != got {
		t.Fatalf("prefix doubled: %q", again)
	}
}
