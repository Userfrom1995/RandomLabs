package tests

// Tester M3 hostile black-box suite: system-wide connect/disconnect/repair
// contract from the consumer side (no root, no tor, no iptables required).
//
// Hostile angles:
//   - usage honesty (positional args rejected with exit 2)
//   - privilege gating (connect/repair refuse without sudo; disconnect
//     stays idempotent when provably stateless)
//   - TORSHIM_STATEDIR env override honored
//   - status never claims protected/system on stale or corrupt state
//   - status --json always valid JSON, never crashes
//   - no em dashes in user-facing output

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/status"
)

func runBinEnv(bin string, env []string, args ...string) (string, string, int) {
	cmd := exec.Command(bin, args...)
	cmd.Env = env
	var so, se strings.Builder
	cmd.Stdout = &so
	cmd.Stderr = &se
	err := cmd.Run()
	code := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		} else {
			code = 99
		}
	}
	return so.String(), se.String(), code
}

func TestM3ConnectUsageRejectsPositionals(t *testing.T) {
	bin := buildTorshim(t)
	if _, _, code := runBin(bin, "connect", "extra-arg"); code != 2 {
		t.Fatalf("connect with positional exit=%d, want 2 (usage)", code)
	}
	if _, _, code := runBin(bin, "disconnect", "extra-arg"); code != 2 {
		t.Fatalf("disconnect with positional exit=%d, want 2 (usage)", code)
	}
	if _, _, code := runBin(bin, "repair", "extra-arg"); code != 2 {
		t.Fatalf("repair with positional exit=%d, want 2 (usage)", code)
	}
}

func TestM3ConnectRefusesNonRoot(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root CI would do real firewall work; refusal path not applicable")
	}
	bin := buildTorshim(t)
	if runtime.GOOS != "linux" {
		// No sudo story off-Linux: system-wide was never available there,
		// so the honest answer is the Linux-only pointer (exit 4), tested
		// here on every OS instead of skipped.
		_, se, code := runBin(bin, "connect")
		if code != 4 || !strings.Contains(se, "Linux-only") {
			t.Fatalf("off-Linux connect exit=%d, want honest 4:\n%s", code, se)
		}
		return
	}
	_, se, code := runBin(bin, "connect")
	if code == 0 {
		t.Fatalf("non-root connect exit=0, want refusal")
	}
	if !strings.Contains(se, "sudo") {
		t.Fatalf("non-root connect must demand sudo:\n%s", se)
	}
	// Even with a bogus tor binary the answer must still be the sudo
	// refusal, never a misleading tor error.
	_, se2, _ := runBin(bin, "connect", "--tor", "/nonexistent-tor-binary-xyz")
	if !strings.Contains(se2, "sudo") {
		t.Fatalf("non-root connect with bad --tor must still demand sudo:\n%s", se2)
	}
}

func TestM3RepairAlwaysNeedsSudo(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root-only path; non-root refusal not applicable")
	}
	bin := buildTorshim(t)
	empty := t.TempDir()
	if runtime.GOOS != "linux" {
		// Off-Linux there is nothing to repair and no sudo story: the
		// honest answer is the Linux-only pointer (exit 4).
		_, se, code := runBin(bin, "repair", "--state-dir", empty)
		if code != 4 || !strings.Contains(se, "Linux-only") {
			t.Fatalf("off-Linux repair exit=%d, want honest 4:\n%s", code, se)
		}
		return
	}
	// Unlike disconnect, repair mutates, so even a provably empty state
	// dir must still refuse without sudo (fail closed).
	_, se, code := runBin(bin, "repair", "--state-dir", empty)
	if code == 0 {
		t.Fatalf("non-root repair on empty state exit=0, want sudo refusal")
	}
	if !strings.Contains(se, "sudo") {
		t.Fatalf("non-root repair must demand sudo even when stateless:\n%s", se)
	}
}

func TestM3DisconnectStatelessIdempotent(t *testing.T) {
	bin := buildTorshim(t)
	empty := t.TempDir()
	if runtime.GOOS != "linux" {
		// System-wide does not exist off-Linux, so there is no
		// idempotent exit 0 to offer: the honest answer is exit 4
		// (never 0, never a mutation).
		if _, _, code := runBin(bin, "disconnect", "--state-dir", empty); code != 4 {
			t.Fatalf("off-Linux stateless disconnect exit=%d, want honest 4", code)
		}
		return
	}
	so, _, code := runBin(bin, "disconnect", "--state-dir", empty)
	if code != 0 {
		t.Fatalf("stateless disconnect exit=%d, want 0 (idempotent)", code)
	}
	if !strings.Contains(so, "not connected") {
		t.Fatalf("stateless disconnect must say not connected:\n%s", so)
	}
	// Same via TORSHIM_STATEDIR env override (no flag).
	env := append(os.Environ(), "TORSHIM_STATEDIR="+empty)
	so, _, code = runBinEnv(bin, env, "disconnect")
	if code != 0 {
		t.Fatalf("env-override stateless disconnect exit=%d, want 0", code)
	}
	if !strings.Contains(so, "not connected") {
		t.Fatalf("env-override disconnect must say not connected:\n%s", so)
	}
}

func TestM3DisconnectCorruptStateFailsWithSudoGuidance(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("non-root guidance path; root would attempt real restore")
	}
	bin := buildTorshim(t)
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "active.json"), []byte("{nope"), 0o600); err != nil {
		t.Fatal(err)
	}
	if runtime.GOOS != "linux" {
		// The OS gate fires before state is even read off-Linux:
		// corrupt state still yields the honest exit 4, never 0.
		if _, _, code := runBin(bin, "disconnect", "--state-dir", dir); code != 4 {
			t.Fatalf("off-Linux corrupt-state disconnect exit=%d, want honest 4", code)
		}
		return
	}
	_, se, code := runBin(bin, "disconnect", "--state-dir", dir)
	if code == 0 {
		t.Fatalf("corrupt-state disconnect exit=0, want error")
	}
	if !strings.Contains(se, "sudo") {
		t.Fatalf("corrupt-state disconnect as non-root must point at sudo:\n%s", se)
	}
}

func TestM3StatusNeverProtectedOnStaleState(t *testing.T) {
	bin := buildTorshim(t)
	dir := t.TempDir()
	stale := `{"backend":"iptables","trans_port":9040,"dns_port":5353,"tor_pid":999999,"tor_user":"nobody","tor_uid":65534,"created_at":"2026-01-01T00:00:00Z","backup_dir":"` + dir + `/backups/x"}`
	if err := os.WriteFile(filepath.Join(dir, "active.json"), []byte(stale), 0o600); err != nil {
		t.Fatal(err)
	}
	so, _, code := runBin(bin, "status", "--json",
		"--control", "127.0.0.1:19951", "--socks", "127.0.0.1:19950",
		"--state-dir", dir)
	if code != 0 {
		t.Fatalf("status on stale state exit=%d, want 0 (no crash)", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("stale-state status not JSON: %v\n%s", err, so)
	}
	if rep.Protected {
		t.Fatalf("stale state must never yield protected=true: %+v", rep)
	}
	if rep.Mode == "system" {
		t.Fatalf("stale state (no live rules) must not report mode=system: %+v", rep)
	}
}

func TestM3StatusSurvivesCorruptState(t *testing.T) {
	bin := buildTorshim(t)
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "active.json"), []byte("{corrupt!!!"), 0o600); err != nil {
		t.Fatal(err)
	}
	so, _, code := runBin(bin, "status", "--json",
		"--control", "127.0.0.1:19951", "--state-dir", dir)
	if code != 0 {
		t.Fatalf("status on corrupt state exit=%d, want 0 (no crash)", code)
	}
	var rep status.Report
	if err := json.Unmarshal([]byte(so), &rep); err != nil {
		t.Fatalf("corrupt-state status not JSON: %v\n%s", err, so)
	}
	if rep.Protected {
		t.Fatalf("corrupt state must never yield protected=true: %+v", rep)
	}
	if rep.Mode == "system" {
		t.Fatalf("corrupt state must not report mode=system: %+v", rep)
	}
	// Text rendering must agree: never protected.
	txt, _, _ := runBin(bin, "status", "--control", "127.0.0.1:19951", "--state-dir", dir)
	if !strings.Contains(txt, "protected: false") {
		t.Fatalf("corrupt-state text status must show protected: false:\n%s", txt)
	}
}

func TestM3NoEmDashInUserOutput(t *testing.T) {
	bin := buildTorshim(t)
	so1, _, _ := runBin(bin, "help")
	so2, _, _ := runBin(bin, "version")
	_, se3, _ := runBin(bin, "connect", "extra-arg")
	for name, out := range map[string]string{"help": so1, "version": so2, "connect-usage": se3} {
		if strings.Contains(out, "—") {
			t.Fatalf("%s output contains em dash (U+2014), forbidden by lab formatting rules", name)
		}
	}
}
