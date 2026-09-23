// Package version reports wrapper, tor, and backend versions.
package version

import (
	"os/exec"
	"strings"
)

// Wrapper is the torshim version (M2 milestone build).
const Wrapper = "0.2.0-m2"

// Info carries the version surface.
type Info struct {
	Wrapper  string
	Tor      string
	Torsocks string
}

// Collect gathers versions; missing backends report "unknown (<hint>)".
func Collect(torBinary string) Info {
	if torBinary == "" {
		torBinary = "tor"
	}
	return Info{
		Wrapper:  Wrapper,
		Tor:      firstLine(exec.Command(torBinary, "--version"), "unknown (tor not on PATH)"),
		Torsocks: firstLine(exec.Command("torsocks", "--version"), "unknown (torsocks not installed)"),
	}
}

func firstLine(cmd *exec.Cmd, fallback string) string {
	out, err := cmd.Output()
	if err != nil {
		return fallback
	}
	ln, _, _ := strings.Cut(string(out), "\n")
	ln = strings.TrimSpace(ln)
	if ln == "" {
		return fallback
	}
	return ln
}
