// Session lock: mutual exclusion across concurrent connect/disconnect/
// repair invocations sharing one state dir.
//
// Why a lockfile and not the state record: two `connect` runs racing
// each other would both snapshot, both launch tor, and both write
// active.json; the loser orphans a tor and a firewall half-applied.
// The lock serializes every mutating entry point (Connect, Disconnect,
// Repair) so at most one of them owns the firewall at a time.
//
// Portable design (must compile on linux/darwin/windows): an
// O_CREATE|O_EXCL file holding "pid\nrfc3339\ntoken". A lock whose pid
// is dead, whose timestamp is older than staleAfter, or whose bytes do
// not parse is stale and gets reaped by the next acquirer. The random
// token makes Release drop only our own lock, never someone else's.

package syswide

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// LockFileName is the session lock leaf inside the state dir.
const LockFileName = "session.lock"

// staleAfter bounds how long a lock may be held before it is treated
// as abandoned (crashed holder). Generous on purpose: a slow bootstrap
// can legitimately hold the lock for minutes.
const staleAfter = 10 * time.Minute

// SessionLock is a held lock on a state dir. Release it when done.
type SessionLock struct {
	path  string
	token string
}

// lockPath resolves the lockfile for a state dir.
func lockPath(stateDir string) string { return filepath.Join(stateDir, LockFileName) }

// lockAlive defaults to the platform pid probe (see osutil_*.go).
func lockAlive(pid int) bool { return pidAlive(pid) }

// AcquireSessionLock serializes mutating syswide operations. isAlive
// reports whether a pid is running (nil means the platform default);
// timeout bounds how long to wait for a live holder before failing
// closed (<=0 means try once, no waiting).
func AcquireSessionLock(stateDir string, isAlive func(int) bool, timeout time.Duration) (*SessionLock, error) {
	if isAlive == nil {
		isAlive = lockAlive
	}
	if err := os.MkdirAll(stateDir, 0o700); err != nil {
		return nil, fmt.Errorf("syswide: create state dir for lock: %w", err)
	}
	path := lockPath(stateDir)
	token := newLockToken()
	deadline := time.Now().Add(timeout)
	for {
		// Fresh claim attempt (O_EXCL: losers get EEXIST, never truncate).
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
		if err == nil {
			body := fmt.Sprintf("%d\n%s\n%s\n", os.Getpid(), time.Now().UTC().Format(time.RFC3339), token)
			_, werr := f.WriteString(body)
			cerr := f.Close()
			if werr != nil || cerr != nil {
				_ = os.Remove(path)
				return nil, fmt.Errorf("syswide: write session lock: %v %v", werr, cerr)
			}
			return &SessionLock{path: path, token: token}, nil
		}
		if !os.IsExist(err) {
			return nil, fmt.Errorf("syswide: create session lock: %w", err)
		}
		// Someone holds (or abandoned) the lock: inspect it.
		holder, serr := readLock(path)
		if serr != nil {
			// Unreadable bytes: reap once, then retry as a fresh claim.
			_ = os.Remove(path)
			continue
		}
		if holder.pid > 0 && isAlive(holder.pid) && time.Since(holder.at) < staleAfter {
			if time.Now().After(deadline) {
				return nil, fmt.Errorf("syswide: another torshim system operation is in progress (pid %d, since %s): wait for it or run repair if it crashed",
					holder.pid, holder.at.Format(time.RFC3339))
			}
			time.Sleep(100 * time.Millisecond)
			continue
		}
		// Stale (dead pid, ancient timestamp, or unparseable pid):
		// reap and retry the fresh claim above.
		_ = os.Remove(path)
	}
}

// Release drops the lock, but only when it still holds our token: a
// holder that outlived its own staleAfter must never delete the lock
// a newer operation already claimed.
func (l *SessionLock) Release() {
	if l == nil || l.path == "" {
		return
	}
	raw, err := os.ReadFile(l.path)
	if err != nil {
		return
	}
	lines := strings.Split(string(raw), "\n")
	mine := false
	for _, ln := range lines {
		if strings.TrimSpace(ln) == l.token {
			mine = true
			break
		}
	}
	if mine {
		_ = os.Remove(l.path)
	}
	l.path = ""
}

// lockHolder is the parsed content of a lockfile.
type lockHolder struct {
	pid int
	at  time.Time
}

// readLock parses a lockfile. Garbage (bad pid, bad time) errors so
// the caller reaps it as stale.
func readLock(path string) (lockHolder, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return lockHolder{}, err
	}
	lines := strings.Split(strings.TrimSpace(string(raw)), "\n")
	if len(lines) < 2 {
		return lockHolder{}, fmt.Errorf("short lockfile")
	}
	var pid int
	if _, err := fmt.Sscanf(strings.TrimSpace(lines[0]), "%d", &pid); err != nil || pid <= 0 {
		return lockHolder{}, fmt.Errorf("bad pid")
	}
	at, err := time.Parse(time.RFC3339, strings.TrimSpace(lines[1]))
	if err != nil {
		return lockHolder{}, fmt.Errorf("bad timestamp")
	}
	return lockHolder{pid: pid, at: at}, nil
}

// newLockToken mints a unique holder token (pid collisions across
// namespaces/containers are why pid alone is not enough).
func newLockToken() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d-%d", os.Getpid(), time.Now().UTC().UnixNano())
	}
	return fmt.Sprintf("%d-%s", os.Getpid(), hex.EncodeToString(b[:]))
}
