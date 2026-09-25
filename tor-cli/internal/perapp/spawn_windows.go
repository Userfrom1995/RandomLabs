//go:build windows

package perapp

import (
	"os"
	"os/exec"
)

// setDetached on Windows: no setsid primitive; the Release after a
// bounded alive poll plus null stdio is the detach boundary.
func setDetached(cmd *exec.Cmd) {}

// setGrouped on Windows: process groups are a Unix concept; Ctrl-C
// forwarding below uses direct process signaling instead.
func setGrouped(cmd *exec.Cmd) {}

// forwardSignal on Windows relays to the direct child only.
func forwardSignal(p *os.Process, sig os.Signal) {
	if p == nil {
		return
	}
	_ = p.Signal(sig)
}

// detachFiles resolves detached stdio: log file append when configured,
// else NUL. The caller closes non-null files via cleanup.
func detachFiles(logFile string) (stdout, stderr *os.File, cleanup func(), err error) {
	cleanup = func() {}
	if logFile == "" {
		null, err := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
		if err != nil {
			return nil, nil, cleanup, err
		}
		cleanup = func() { null.Close() }
		return null, null, cleanup, nil
	}
	f, err := os.OpenFile(logFile, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, nil, cleanup, err
	}
	cleanup = func() { f.Close() }
	return f, f, cleanup, nil
}

func devNull() *os.File {
	f, err := os.Open(os.DevNull)
	if err != nil {
		return nil
	}
	return f
}
