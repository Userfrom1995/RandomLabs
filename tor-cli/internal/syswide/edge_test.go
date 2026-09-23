// M5 edge tests: corrupt/stale state files, lock contention on the
// mutating entry points, and lock hygiene. Hermetic: temp state dirs,
// fake Runner, stubbed pids; no root, no tor, no firewall.

package syswide

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func writeCorruptState(t *testing.T, dir string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "active.json"), []byte("{not-json"), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestLoadStateCorruptMentionsRepair(t *testing.T) {
	dir := t.TempDir()
	writeCorruptState(t, dir)
	_, err := LoadState(dir)
	if err == nil || !strings.Contains(err.Error(), "repair") {
		t.Fatalf("corrupt state must point at repair, got %v", err)
	}
}

func TestDisconnectCorruptNonRootHintsSudo(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	writeCorruptState(t, o.StateDir)
	o.GetEuid = func() int { return 1000 }
	_, err := Disconnect(o)
	if err == nil || !strings.Contains(err.Error(), "sudo") {
		t.Fatalf("corrupt-state disconnect as non-root must hint sudo, got %v", err)
	}
}

func TestRepairQuarantinesCorruptState(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	writeCorruptState(t, o.StateDir)
	rep, err := Repair(o)
	if err != nil {
		t.Fatalf("repair on corrupt state: %v", err)
	}
	found := false
	for _, a := range rep.Actions {
		if strings.Contains(a, "quarantin") {
			found = true
		}
	}
	if !found {
		t.Fatalf("repair must quarantine corrupt state, actions=%v", rep.Actions)
	}
	if _, serr := os.Stat(filepath.Join(o.StateDir, "active.json.corrupt")); serr != nil {
		t.Fatalf("quarantined bytes must be kept for forensics: %v", serr)
	}
	if s, _ := LoadState(o.StateDir); s != nil {
		t.Fatalf("state must read absent after quarantine")
	}
}

func TestConnectReleasesLockOnSuccess(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(lockPath(o.StateDir)); !os.IsNotExist(err) {
		t.Fatalf("session lock leaked after successful connect")
	}
}

func TestDisconnectReleasesLockOnSuccess(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	if _, err := Disconnect(o); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(lockPath(o.StateDir)); !os.IsNotExist(err) {
		t.Fatalf("session lock leaked after disconnect")
	}
}

func TestConnectVerifyFailureReleasesLock(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.Probe = func(cookiePath, ctlAddr string, timeout time.Duration) error {
		return fmt.Errorf("tor not bootstrapped (simulated)")
	}
	if _, err := Connect(o); err == nil {
		t.Fatalf("expected verify failure")
	}
	if _, err := os.Stat(lockPath(o.StateDir)); !os.IsNotExist(err) {
		t.Fatalf("session lock leaked after rolled-back connect")
	}
}

func TestConnectUnderContentionFailsClosed(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	// A live concurrent operator holds the session lock.
	holder, err := AcquireSessionLock(o.StateDir, func(int) bool { return true }, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer holder.Release()
	o.LockWait = 200 * time.Millisecond
	// The holder pid (this test process) must look alive to the
	// contender, or it would reap the lock as stale instead of
	// failing closed on contention.
	inner := o.PidAlive
	o.PidAlive = func(pid int) bool { return pid == os.Getpid() || inner(pid) }
	if _, err := Connect(o); err == nil || !strings.Contains(err.Error(), "in progress") {
		t.Fatalf("contended connect must fail closed, got %v", err)
	}
	// The failed contender must not have disturbed the holder's lock.
	if _, serr := os.Stat(lockPath(o.StateDir)); serr != nil {
		t.Fatalf("holder lock clobbered by failed contender: %v", serr)
	}
}

func TestDisconnectUnderContentionFailsClosed(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	s, err := LoadState(o.StateDir)
	if err != nil || s == nil {
		t.Fatalf("need a live session for this test: %v %+v", s, err)
	}
	torPid := s.TorPid
	holder, err := AcquireSessionLock(o.StateDir, func(int) bool { return true }, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer holder.Release()
	o.LockWait = 200 * time.Millisecond
	o.PidAlive = func(pid int) bool { return pid == os.Getpid() || pid == torPid }
	if _, err := Disconnect(o); err == nil || !strings.Contains(err.Error(), "in progress") {
		t.Fatalf("contended disconnect must fail closed, got %v", err)
	}
	// Session untouched by the failed contender.
	if s2, _ := LoadState(o.StateDir); s2 == nil {
		t.Fatalf("failed contender dropped the session")
	}
}
