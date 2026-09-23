// M5 session-lock tests: mutual exclusion, stale reaping, and safe
// release. Hermetic: temp state dirs, stubbed pid probes, no root.

package syswide

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

func TestSessionLockAcquireRelease(t *testing.T) {
	dir := t.TempDir()
	lk, err := AcquireSessionLock(dir, func(int) bool { return false }, 0)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	if _, err := os.Stat(lockPath(dir)); err != nil {
		t.Fatalf("lockfile missing after acquire: %v", err)
	}
	lk.Release()
	if _, err := os.Stat(lockPath(dir)); !os.IsNotExist(err) {
		t.Fatalf("lockfile still present after release")
	}
	// Double release is safe (second is a no-op, never deletes others).
	lk.Release()
}

func TestSessionLockContentionFailsClosed(t *testing.T) {
	dir := t.TempDir()
	alive := func(int) bool { return true } // holder pid looks live
	holder, err := AcquireSessionLock(dir, alive, 0)
	if err != nil {
		t.Fatalf("first acquire: %v", err)
	}
	defer holder.Release()
	// Second acquirer with no wait budget must fail closed, naming the
	// holder pid instead of proceeding concurrently.
	_, err = AcquireSessionLock(dir, alive, 0)
	if err == nil || !strings.Contains(err.Error(), "in progress") {
		t.Fatalf("contention: got %v, want in-progress error", err)
	}
	// Lockfile survived the failed attempt.
	if _, serr := os.Stat(lockPath(dir)); serr != nil {
		t.Fatalf("lockfile clobbered by failed acquirer: %v", serr)
	}
}

func TestSessionLockStalePidReaped(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	// Plant a lock pointing at a pid the probe reports dead.
	stale := fmt.Sprintf("999999\n%s\nstale-token\n", time.Now().UTC().Format(time.RFC3339))
	if err := os.WriteFile(lockPath(dir), []byte(stale), 0o600); err != nil {
		t.Fatal(err)
	}
	lk, err := AcquireSessionLock(dir, func(int) bool { return false }, 0)
	if err != nil {
		t.Fatalf("stale lock not reaped: %v", err)
	}
	defer lk.Release()
	raw, _ := os.ReadFile(lockPath(dir))
	if strings.Contains(string(raw), "stale-token") {
		t.Fatalf("stale lockfile content survived acquire")
	}
}

func TestSessionLockAncientTimestampReaped(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	// Live pid but ancient timestamp: abandoned holder, reap it.
	ancient := time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	body := fmt.Sprintf("%d\n%s\nancient-token\n", os.Getpid(), ancient)
	if err := os.WriteFile(lockPath(dir), []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	lk, err := AcquireSessionLock(dir, func(int) bool { return true }, 0)
	if err != nil {
		t.Fatalf("ancient lock not reaped: %v", err)
	}
	defer lk.Release()
}

func TestSessionLockCorruptBytesReaped(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(lockPath(dir), []byte("garbage-without-newlines"), 0o600); err != nil {
		t.Fatal(err)
	}
	lk, err := AcquireSessionLock(dir, func(int) bool { return true }, 0)
	if err != nil {
		t.Fatalf("corrupt lock not reaped: %v", err)
	}
	defer lk.Release()
}

func TestSessionLockReleaseKeepsForeignLock(t *testing.T) {
	dir := t.TempDir()
	lk, err := AcquireSessionLock(dir, func(int) bool { return false }, 0)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	// Simulate our lock going stale and being replaced by someone
	// else: Release must not delete the foreign lock.
	foreign := fmt.Sprintf("4242\n%s\nforeign-token\n", time.Now().UTC().Format(time.RFC3339))
	if err := os.WriteFile(lockPath(dir), []byte(foreign), 0o600); err != nil {
		t.Fatal(err)
	}
	lk.Release()
	raw, err := os.ReadFile(lockPath(dir))
	if err != nil || !strings.Contains(string(raw), "foreign-token") {
		t.Fatalf("Release deleted a foreign lock: %q %v", string(raw), err)
	}
}

func TestSessionLockSerializesGoroutines(t *testing.T) {
	dir := t.TempDir()
	probe := func(int) bool { return true }
	first, err := AcquireSessionLock(dir, probe, 0)
	if err != nil {
		t.Fatalf("acquire: %v", err)
	}
	done := make(chan error, 1)
	go func() {
		// Waits up to 5s for the holder to release.
		lk2, err := AcquireSessionLock(dir, probe, 5*time.Second)
		if err != nil {
			done <- err
			return
		}
		lk2.Release()
		done <- nil
	}()
	time.Sleep(300 * time.Millisecond)
	select {
	case err := <-done:
		t.Fatalf("second acquirer slipped through while lock held: %v", err)
	default:
	}
	first.Release()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("waiter failed after release: %v", err)
		}
	case <-time.After(6 * time.Second):
		t.Fatalf("waiter never acquired after release")
	}
	if _, err := os.Stat(lockPath(dir)); !os.IsNotExist(err) {
		t.Fatalf("lockfile leaked after serialized handoff")
	}
}
