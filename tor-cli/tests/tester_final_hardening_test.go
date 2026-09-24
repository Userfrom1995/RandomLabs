// Tester-owned regression suite for the torshim final-hardening pass
// (Refs #387): usage errors on connect/disconnect/repair must exit 2 on
// every OS, because flag parsing runs before the Linux-only gate. The
// exit-4 pointer fires only for well-formed invocations off-Linux.
package tests

import (
	"runtime"
	"testing"
)

func TestTesterFinalHardeningUsageBeforeGate(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("usage-before-gate Linux probes; off-Linux branches are pinned by the per-OS suites")
	}
	bin := buildTorshim(t)
	for _, args := range [][]string{
		{"connect", "extra-arg"},
		{"disconnect", "extra-arg"},
		{"repair", "extra-arg"},
		{"disconnect", "--bogus-flag-xyz"},
		{"repair", "--bogus-flag-xyz"},
		{"connect", "--bogus-flag-xyz"},
	} {
		_, _, code := runBin(bin, args...)
		if code != 2 {
			t.Fatalf("%v exit=%d, want usage exit 2", args, code)
		}
	}
}
