// Probe reports the system-wide session from the outside (for status):
// state record plus live rule presence, never claiming more than observed.

package syswide

import (
	"errors"
	"os"
	"runtime"
)

// ProbeResult is the outside view of a system-wide session.
type ProbeResult struct {
	// Mode is one of "system" (state + rules agree), "stale" (state
	// without rules, or rules without state), "none" (neither).
	Mode string
	// Detail explains the verdict for status notes.
	Detail string
	// State is the session record when one exists (nil otherwise).
	State *ActiveState
}

// Probe inspects stateDir with r and reports the session. Non-root callers
// cannot confirm kernel rules, so a state record without confirmable
// rules is reported as stale, never as active. Off Linux the answer is
// always none (no backend exists there in M3).
func Probe(stateDir string, r Runner) ProbeResult {
	if runtime.GOOS != "linux" {
		return ProbeResult{Mode: "none"}
	}
	if r == nil {
		r = RealRunner{}
	}
	if stateDir == "" {
		stateDir = StateDir()
	}
	s, err := LoadState(stateDir)
	if err != nil {
		if errors.Is(err, os.ErrPermission) || os.IsPermission(err) {
			return ProbeResult{Mode: "none", Detail: "system state unreadable by non-root user (run with sudo to inspect)"}
		}
		return ProbeResult{Mode: "stale", Detail: "system state unreadable (run repair): " + err.Error()}
	}
	anyRules := (IptablesBackend{Run: r}.Present()) || (NftBackend{Run: r}.Present())
	switch {
	case s == nil && !anyRules:
		return ProbeResult{Mode: "none"}
	case s != nil && backendFor(s.Backend, r).Present():
		return ProbeResult{Mode: "system", Detail: s.Backend + " session since " + s.CreatedAt, State: s}
	case s != nil:
		return ProbeResult{Mode: "stale", Detail: "session record without matching rules (crashed run? reboot? run repair)", State: s}
	default:
		return ProbeResult{Mode: "stale", Detail: "torshim rules without a session record (foreign or crashed run? run repair)"}
	}
}
