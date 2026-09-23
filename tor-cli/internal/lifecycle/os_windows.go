//go:build windows

package lifecycle

import (
	"fmt"
	"os"
	"os/exec"
)

// applySpawnAttrs on Windows: no process-group detach, no setuid. RunAs
// is refused (fail closed); per-app on Windows lands in M4 anyway.
func applySpawnAttrs(cmd *exec.Cmd, runAs *RunAsCreds) error {
	if runAs != nil {
		return fmt.Errorf("lifecycle: RunAs is Linux-only (refusing on windows)")
	}
	return nil
}

func chownTreeOS(root string, uid, gid int) error {
	return fmt.Errorf("lifecycle: chown is Unix-only (refusing on windows)")
}

func signalTerm(p *os.Process) error { return p.Kill() }

func signalKill(p *os.Process) error { return p.Kill() }
