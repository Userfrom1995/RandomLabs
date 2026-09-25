//go:build linux || darwin

package perapp

import (
	"os"
	"os/exec"
	"syscall"
)

// setDetached puts the child in a new session/process group so terminal
// signals to the parent no longer reach the GUI child after Release.
func setDetached(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}

// setGrouped puts a waited child in its own process group so the
// forwarder below can signal the whole group (child plus grandchildren)
// without touching the parent's group.
func setGrouped(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// forwardSignal relays a parent signal to the child's process group.
// A negative pid targets the group; failure means the child already
// exited, which is not an error.
func forwardSignal(p *os.Process, sig os.Signal) {
	if p == nil {
		return
	}
	if s, ok := sig.(syscall.Signal); ok {
		_ = syscall.Kill(-p.Pid, s)
		return
	}
	_ = p.Signal(sig)
}

// detachFiles resolves detached stdio: log file append when configured,
// else the null device. The caller closes non-null files via cleanup.
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
