package tests

// Tester staged-CI backstop regression suite for issue #399.
//
// The staged mirror tor-cli/ci/tor-cli.yml must carry the live-head
// validation backstop: a `workflow_call` trigger plus a weekly
// `schedule` cron. Bot rebase-merges to main via GITHUB_TOKEN never
// trigger push workflows (platform loop suppression), and a misfiring
// sweep dispatch is silent without verification, so this cheap weekly
// head check guarantees live main gets validated even when both event
// paths miss. These tests pin that contract so a future resync that
// drops the backstop fails loudly.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTesterStagedCICarriesCallAndScheduleBackstop(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "ci", "tor-cli.yml"))
	if err != nil {
		t.Fatalf("staged CI missing at ci/tor-cli.yml: %v", err)
	}
	body := string(raw)
	if !strings.Contains(body, "workflow_call:") {
		t.Fatalf("staged CI missing workflow_call trigger (issue #399 backstop)")
	}
	if !strings.Contains(body, "schedule:") {
		t.Fatalf("staged CI missing schedule backstop (issue #399 head check)")
	}
	if !strings.Contains(body, "cron:") {
		t.Fatalf("staged CI schedule block missing cron entry")
	}
	if strings.Contains(body, "—") {
		t.Fatalf("staged CI contains em dash")
	}
}
