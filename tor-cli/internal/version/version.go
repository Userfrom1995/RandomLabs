// Package version reports wrapper, tor, and backend versions.
package version

import (
	"os/exec"
	"runtime"
	"strings"
)

// Wrapper is the torshim version (0.5.0: control-plane diagnostics,
// NEWNYM rotation, and the doctor health check on top of M5).
const Wrapper = "0.5.0"

// Info carries the version surface.
type Info struct {
	Wrapper  string
	Tor      string
	Torsocks string
	// Platform is runtime.GOOS/runtime.GOARCH.
	Platform string
	// PerApp names the per-app mechanism on this OS.
	PerApp string
	// Syswide names system-wide support on this OS.
	Syswide string
}

// Collect gathers versions; missing backends report "unknown (<hint>)".
func Collect(torBinary string) Info {
	if torBinary == "" {
		torBinary = "tor"
	}
	return Info{
		Wrapper:  Wrapper,
		Tor:      firstLine(exec.Command(torBinary, "--version"), "unknown (tor not on PATH)"),
		Torsocks: torsocksVersion(),
		Platform: runtime.GOOS + "/" + runtime.GOARCH,
		PerApp:   perAppBackend(),
		Syswide:  syswideBackend(),
	}
}

// torsocksVersion reports the shim version on Linux; on other platforms
// the shim is not the product path, so report that honestly instead of
// "unknown" (which would read as a broken install).
func torsocksVersion() string {
	if runtime.GOOS != "linux" {
		return "n/a (proxy-env backend on " + runtime.GOOS + ")"
	}
	return firstLine(exec.Command("torsocks", "--version"), "unknown (torsocks not installed)")
}

// perAppBackend names the per-app mechanism for status/version output.
func perAppBackend() string {
	if runtime.GOOS == "linux" {
		return "torsocks LD_PRELOAD shim (fail-closed)"
	}
	return "proxy environment socks5h (only honoring apps covered)"
}

// syswideBackend names system-wide support for status/version output.
func syswideBackend() string {
	switch runtime.GOOS {
	case "linux":
		return "iptables/nft transparent proxy"
	default:
		return "unsupported (no tun2socks backend shipped; per-app + shell only)"
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
