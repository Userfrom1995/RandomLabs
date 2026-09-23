//go:build linux || darwin

package lifecycle

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// applySpawnAttrs detaches the child process group; on Linux it also drops
// the child to the RunAs identity (system-wide mode). Other Unix systems
// refuse RunAs (fail closed: the owner-UID exemption is Linux-iptables).
func applySpawnAttrs(cmd *exec.Cmd, runAs *RunAsCreds) error {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	if runAs == nil {
		return nil
	}
	if isLinux && runAs != nil {
		cmd.SysProcAttr.Credential = &syscall.Credential{Uid: runAs.UID, Gid: runAs.GID}
		return nil
	}
	return fmt.Errorf("lifecycle: RunAs is Linux-only (refusing on this platform)")
}

func chownTreeOS(root string, uid, gid int) error {
	return filepath.Walk(root, func(p string, _ os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		return os.Chown(p, uid, gid)
	})
}

func signalTerm(p *os.Process) error { return p.Signal(syscall.SIGTERM) }

func signalKill(p *os.Process) error { return p.Signal(syscall.SIGKILL) }
