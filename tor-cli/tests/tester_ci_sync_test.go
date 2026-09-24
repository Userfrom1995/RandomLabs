package tests

// Tester staged-CI sync regression suite for issue #387.
//
// PR #396 re-synced tor-cli/ci/tor-cli.yml byte-identical with the
// Lab-trimmed .github/workflows/tor-cli.yml (shared off-Linux else
// branch, single load-bearing tests/ skip). These tests pin that sync
// contract so future drift fails loudly:
//
//   - staged and installed copies are byte-identical (skipped when the
//     installed copy is absent, e.g. standalone module checkout).
//   - the staged file carries one shared off-Linux else branch with the
//     single tests/ skip 'TestConnectDisconnect'.
//   - Go -skip semantics: the pattern is an unanchored regexp, so
//     'TestConnectDisconnect' also suppresses
//     TestConnectDisconnectM3Contract (substring match), while leaving
//     every sibling black-box test unskipped.

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestTesterStagedCIByteIdenticalWithInstalled(t *testing.T) {
	staged, err := os.ReadFile(filepath.Join("..", "ci", "tor-cli.yml"))
	if err != nil {
		t.Fatalf("staged CI missing at ci/tor-cli.yml: %v", err)
	}
	installed, err := os.ReadFile(filepath.Join("..", "..", ".github", "workflows", "tor-cli.yml"))
	if err != nil {
		t.Skipf("installed CI absent (standalone checkout?), skipping equivalence: %v", err)
	}
	if string(staged) != string(installed) {
		t.Fatalf("staged ci/tor-cli.yml drifted from .github/workflows/tor-cli.yml (%d vs %d bytes)", len(staged), len(installed))
	}
}

func TestTesterStagedCISharedOffLinuxElseBranch(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "ci", "tor-cli.yml"))
	if err != nil {
		t.Fatalf("staged CI missing at ci/tor-cli.yml: %v", err)
	}
	body := string(raw)
	// One shared off-Linux branch: the Lab trim retired the macOS-only
	// elif, so only a single "else" remains in the hermetic suite step.
	if strings.Contains(body, "elif [ \"$RUNNER_OS\"") {
		t.Fatalf("staged CI still carries a per-OS elif branch; want a single shared off-Linux else")
	}
	if !strings.Contains(body, "-skip 'TestConnectDisconnect'") {
		t.Fatalf("staged CI missing the single load-bearing tests/ skip")
	}
	if !strings.Contains(body, "-skip 'TestConnect|TestDisconnect|TestRepair|TestNftConnectDisconnect'") {
		t.Fatalf("staged CI missing the internal syswide skip group")
	}
}

func TestTesterOffLinuxSkipRegexSemantics(t *testing.T) {
	testsSkip := regexp.MustCompile(`TestConnectDisconnect`)
	// Load-bearing: the Linux-contract test must be suppressed off-Linux
	// by substring match.
	if !testsSkip.MatchString("TestConnectDisconnectM3Contract") {
		t.Fatalf("skip 'TestConnectDisconnect' does not cover TestConnectDisconnectM3Contract")
	}
	// Precision: sibling black-box tests must stay unskipped on macOS
	// and Windows (they carry explicit per-OS branches by design).
	siblings := []string{
		"TestVersionHonest",
		"TestHelpAndUsageCodes",
		"TestStatusHonestWhenAbsent",
		"TestRunFailClosedWithoutTor",
		"TestM3ConnectRefusesNonRoot",
		"TestM3DisconnectStatelessIdempotent",
		"TestM3StatusNeverProtectedOnStaleState",
		"TestM3NoEmDashInUserOutput",
		"TestM4DisconnectIdempotentAndRunFailClosed",
		"TestM4PackagingArtifacts",
		"TestM4VersionReportsPlatformSurface",
		"TestM5CLIBlackBoxHonesty",
		"TestM5SessionLockContentionAndReap",
		"TestM5StagedCIParsesWithFourJobs",
	}
	for _, name := range siblings {
		if testsSkip.MatchString(name) {
			t.Fatalf("skip 'TestConnectDisconnect' over-matches sibling %s", name)
		}
	}
	internalSkip := regexp.MustCompile(`TestConnect|TestDisconnect|TestRepair|TestNftConnectDisconnect`)
	for _, name := range []string{"TestConnect", "TestDisconnect", "TestRepair", "TestNftConnectDisconnect"} {
		if !internalSkip.MatchString(name) {
			t.Fatalf("internal skip group does not cover %s", name)
		}
	}
}
