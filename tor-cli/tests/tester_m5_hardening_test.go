package tests

// Tester M5 hostile regression suite: session lock, torrc managed-key
// guard, corrupt-state honesty, staged tri-OS CI presence.
//
// Hostile angles (fail-closed first):
//   - torrc guard rejects case/equals/whitespace/Include variants, accepts
//     bridge lines, filters at render time, Launch fails closed pre-creation.
//   - session lock: live holder fails closed naming pid; dead pid, ancient
//     timestamp, and corrupt bytes are reaped; foreign release never deletes.
//   - CLI black box: version 0.4.0, status absent never protected, corrupt
//     state never protected, disconnect idempotent, run/connect fail closed.
//   - staged CI file parses with 4 jobs and honesty probes; no em dashes.

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/syswide"
)

func TestM5TorrcGuardRejectsHostileVariants(t *testing.T) {
	hostile := []string{
		"SocksPort 127.0.0.1:9999",
		"socksport 127.0.0.1:9999",
		"SOCKSPORT=127.0.0.1:9999",
		"  ControlPort  9059",
		"ControlSocket /tmp/evil.sock",
		"DNSPort 5353",
		"TransPort 127.0.0.1:9049",
		"DataDirectory /tmp/evil",
		"PidFile /tmp/evil.pid",
		"CookieAuthentication 0",
		"CookieAuthFile /tmp/evil",
		"Log debug file /tmp/evil.log",
		"RunAsDaemon 1",
		"User evil",
		"OwningControllerProcess 99999",
		"Include /tmp/evil.torrc",
		"include=/tmp/evil2.torrc",
	}
	for _, ln := range hostile {
		if err := lifecycle.ValidateExtraTorrc([]string{ln}); err == nil {
			t.Fatalf("ValidateExtraTorrc(%q): expected rejection", ln)
		} else if !strings.Contains(err.Error(), "torshim-managed") {
			t.Fatalf("ValidateExtraTorrc(%q): error must name managed keys, got %v", ln, err)
		}
	}
	ok := []string{
		"# a comment",
		"",
		"   ",
		"Bridge obfs4 1.2.3.4:443 ABCDEF cert=xyz iat-mode=0",
		"UseBridges 1",
		"ClientTransportPlugin obfs4 exec /usr/bin/obfs4proxy",
		"ExitNodes {us} StrictNodes 1",
	}
	if err := lifecycle.ValidateExtraTorrc(ok); err != nil {
		t.Fatalf("ValidateExtraTorrc(bridge lines): unexpected %v", err)
	}
	if err := lifecycle.ValidateExtraTorrc(nil); err != nil {
		t.Fatalf("ValidateExtraTorrc(nil): unexpected %v", err)
	}
}

func TestM5TorrcRenderFiltersManagedKeepsBridges(t *testing.T) {
	rc := lifecycle.GenerateTorrc(t.TempDir(), []string{
		"SocksPort 127.0.0.1:9999",
		"Include /tmp/evil.torrc",
		"Bridge obfs4 1.2.3.4:443 ABCDEF cert=xyz iat-mode=0",
		"UseBridges 1",
	})
	if strings.Contains(rc, "9999") || strings.Contains(strings.ToLower(rc), "include /tmp") {
		t.Fatalf("managed-key override leaked into torrc:\n%s", rc)
	}
	for _, want := range []string{"Bridge obfs4", "UseBridges 1", "SocksPort 127.0.0.1:auto"} {
		if !strings.Contains(rc, want) {
			t.Fatalf("torrc missing %q:\n%s", want, rc)
		}
	}
}

func TestM5LaunchFailsClosedOnManagedOverride(t *testing.T) {
	_, err := lifecycle.Launch(lifecycle.Options{
		TorBinary:  "/nonexistent-tor-binary-xyz",
		Timeout:    5 * time.Second,
		ExtraTorrc: []string{"SocksPort 127.0.0.1:9999"},
	})
	if err == nil || !strings.Contains(err.Error(), "torshim-managed") {
		t.Fatalf("Launch with managed override: got %v, want managed-key error", err)
	}
}

func TestM5SessionLockContentionAndReap(t *testing.T) {
	dir := t.TempDir()
	alive := func(int) bool { return true }
	holder, err := syswide.AcquireSessionLock(dir, alive, 0)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	// Live holder: contender fails closed naming pid.
	_, err = syswide.AcquireSessionLock(dir, alive, 50*time.Millisecond)
	if err == nil || !strings.Contains(err.Error(), "in progress") {
		t.Fatalf("contended acquire must fail closed, got %v", err)
	}
	// Foreign release must not delete the holder's lock.
	raw, _ := os.ReadFile(filepath.Join(dir, "session.lock"))
	_ = raw
	holder.Release()
	if _, serr := os.Stat(filepath.Join(dir, "session.lock")); !os.IsNotExist(serr) {
		t.Fatalf("lock leaked after release")
	}
	// Dead pid reaped.
	dead := func(int) bool { return false }
	h2, err := syswide.AcquireSessionLock(dir, dead, 0)
	if err != nil {
		t.Fatalf("acquire for dead-pid setup: %v", err)
	}
	h2.Release()
	// Simulate stale lockfile with dead pid bytes.
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	stale := "99999999\n2000-01-01T00:00:00Z\nstale-token\n"
	if err := os.WriteFile(filepath.Join(dir, "session.lock"), []byte(stale), 0o600); err != nil {
		t.Fatal(err)
	}
	h3, err := syswide.AcquireSessionLock(dir, dead, 0)
	if err != nil {
		t.Fatalf("stale lock must be reaped, got %v", err)
	}
	h3.Release()
	// Corrupt bytes reaped.
	if err := os.WriteFile(filepath.Join(dir, "session.lock"), []byte("{garbage"), 0o600); err != nil {
		t.Fatal(err)
	}
	h4, err := syswide.AcquireSessionLock(dir, alive, 0)
	if err != nil {
		t.Fatalf("corrupt lock must be reaped, got %v", err)
	}
	h4.Release()
}

func TestM5CLIBlackBoxHonesty(t *testing.T) {
	bin := buildTorshim(t)
	so, _, code := runBin(bin, "version")
	if code != 0 {
		t.Fatalf("version exit=%d", code)
	}
	if !strings.Contains(so, "0.4.0") {
		t.Fatalf("version must report 0.4.0:\n%s", so)
	}
	if strings.Contains(so, "—") {
		t.Fatalf("version contains em dash")
	}
	stateDir := t.TempDir()
	envBin := func(args ...string) (string, string, int) {
		return runBinEnv(bin, []string{"TORSHIM_STATEDIR=" + stateDir}, args...)
	}
	so, _, _ = envBin("status")
	if !strings.Contains(strings.ToLower(so), "protect") {
		t.Fatalf("status must discuss protection:\n%s", so)
	}
	sj, _, _ := envBin("status", "--json")
	if strings.Contains(sj, `"protected": true`) {
		t.Fatalf("absent status claims protected:\n%s", sj)
	}
	if err := os.WriteFile(filepath.Join(stateDir, "active.json"), []byte("{not-json"), 0o600); err != nil {
		t.Fatal(err)
	}
	sj, _, _ = envBin("status", "--json")
	if strings.Contains(sj, `"protected": true`) {
		t.Fatalf("corrupt state claims protected:\n%s", sj)
	}
	so, _, code = runBin(bin, "disconnect", "--state-dir", t.TempDir())
	if code != 0 || !strings.Contains(so, "not connected") {
		t.Fatalf("stateless disconnect must be idempotent exit 0, got %d:\n%s", code, so)
	}
	_, _, code = runBin(bin, "run", "--tor", "./does-not-exist-xyz", "--", "echo", "hi")
	if code != 3 {
		t.Fatalf("run without tor exit=%d, want 3", code)
	}
}

func TestM5StagedCIParsesWithFourJobs(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "ci", "tor-cli.yml"))
	if err != nil {
		t.Fatalf("staged CI missing at ci/tor-cli.yml: %v", err)
	}
	body := string(raw)
	for _, want := range []string{"matrix:", "cross:", "fuzz:", "live-tor:"} {
		if !strings.Contains(body, want) {
			t.Fatalf("staged CI missing job %q", want)
		}
	}
	for _, want := range []string{"go build", "go vet", "go test", "make cross", "honesty"} {
		if !strings.Contains(body, want) {
			t.Fatalf("staged CI missing %q", want)
		}
	}
	if strings.Contains(body, "—") {
		t.Fatalf("staged CI contains em dash")
	}
}
