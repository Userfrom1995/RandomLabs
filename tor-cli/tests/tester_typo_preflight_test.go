package tests

import (
	"strings"
	"testing"
	"time"
)

func TestSubcommandTypoSuggestions(t *testing.T) {
	bin := buildTorshim(t)
	cases := []struct {
		input       string
		wantSuggest string
	}{
		{"discoonect", "disconnect"},
		{"disconect", "disconnect"},
		{"stauts", "status"},
		{"docter", "doctor"},
		{"conenct", "connect"},
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			start := time.Now()
			_, se, code := runBin(bin, tc.input)
			elapsed := time.Since(start)
			if code != 2 {
				t.Fatalf("runBin %s exit=%d, want 2 (usage exit for command typo)", tc.input, code)
			}
			if !strings.Contains(se, tc.wantSuggest) {
				t.Fatalf("runBin %s stderr=%q, want suggestion %q", tc.input, se, tc.wantSuggest)
			}
			// Must be instantaneous (never bootstrapping tor)
			if elapsed > 2*time.Second {
				t.Fatalf("runBin %s took %v, should fail instantly without starting Tor", tc.input, elapsed)
			}
		})
	}
}

func TestMissingBinaryFailsBeforeTor(t *testing.T) {
	bin := buildTorshim(t)
	start := time.Now()
	_, se, code := runBin(bin, "nonexistent_binary_xyz_404")
	elapsed := time.Since(start)
	if code != 1 {
		t.Fatalf("runBin nonexistent binary exit=%d, want 1", code)
	}
	if !strings.Contains(se, "not found on PATH") {
		t.Fatalf("runBin nonexistent binary stderr=%q, want 'not found on PATH'", se)
	}
	// Must fail immediately without starting Tor
	if elapsed > 2*time.Second {
		t.Fatalf("runBin nonexistent took %v, should fail instantly without starting Tor", elapsed)
	}
}
