// Package platform_compat is the read-only platform and dependency
// check layer (component A): architecture and OS facts, sandbox
// posture, per-platform capability truth, and dependency presence plus
// versions (tor, torsocks, pluggable transports).
//
// Everything here is read-only: capability probes use LookPath,
// bounded `--version` executions, and filesystem reads only. The
// diagnostics surface (internal/doctor) and the version command
// consume this snapshot so capability and version facts have exactly
// one source of truth.
package platform_compat

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// Options tune a snapshot.
type Options struct {
	// TorBinary is the tor executable to probe (default "tor").
	TorBinary string
	// Timeout bounds each dependency version probe (default 2s).
	Timeout time.Duration
	// NoVersions skips `--version` executions (pure filesystem probe).
	NoVersions bool
}

// Dependency is one probed program: presence, path, and - when the
// binary answers a version flag - the parsed version string.
type Dependency struct {
	Name    string `json:"name"`
	Present bool   `json:"present"`
	Path    string `json:"path,omitempty"`
	Version string `json:"version,omitempty"`
}

// Sandbox reports best-effort platform sandbox posture. Zero values
// mean "not readable on this platform", never a claim either way.
type Sandbox struct {
	// Containerized: this process looks containerized (affects
	// system-wide firewall capability honesty).
	Containerized bool `json:"containerized"`
	// AppArmor: "enabled", "disabled", or "" when unknown (Linux).
	AppArmor string `json:"apparmor,omitempty"`
	// NoNewPrivs: prctl no_new_privs bit (Linux), false when unknown.
	NoNewPrivs bool `json:"no_new_privs"`
}

// Capabilities is the binding per-platform capability truth.
type Capabilities struct {
	OS   string `json:"os"`
	Arch string `json:"arch"`
	// PerApp reports whether per-app routing exists on this OS today.
	PerApp bool `json:"per_app"`
	// PerAppMechanism is "torsocks", "proxy-env", or "unavailable".
	PerAppMechanism string `json:"per_app_mechanism"`
	// PerAppDetail names the concrete mechanism evidence (library path
	// or the honest proxy-env caveat).
	PerAppDetail string `json:"per_app_detail"`
	// SystemWide reports whether the firewall backend exists here.
	SystemWide bool `json:"system_wide"`
	// SystemWideDetail names the backend or the honest gap.
	SystemWideDetail string `json:"system_wide_detail"`
	// UDP is permanently false: Tor has no UDP exit (charter honesty).
	UDP bool `json:"udp"`
	// Sandbox carries the platform sandbox posture.
	Sandbox Sandbox `json:"sandbox"`
}

// Snapshot is the full read-only platform view.
type Snapshot struct {
	Capabilities Capabilities          `json:"capabilities"`
	Dependencies map[string]Dependency `json:"dependencies"`
}

// versionArgs are the flag conventions per dependency name.
func versionArgs(name string) []string {
	switch name {
	case "obfs4proxy":
		return []string{"-version"}
	default:
		return []string{"--version"}
	}
}

// probeDependency resolves name on PATH (override path wins) and, when
// versions are enabled, runs its version flag under the deadline.
func probeDependency(name, overridePath string, o Options) Dependency {
	d := Dependency{Name: name}
	path := overridePath
	if path == "" {
		lp, err := exec.LookPath(name)
		if err != nil {
			return d
		}
		path = lp
	} else {
		// An explicit path must still be a usable executable.
		if st, err := os.Stat(path); err != nil || st.IsDir() {
			return d
		}
	}
	d.Present = true
	d.Path = path
	if o.NoVersions {
		return d
	}
	ctx, cancel := context.WithTimeout(context.Background(), o.Timeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, path, versionArgs(name)...).CombinedOutput()
	if err == nil {
		d.Version = ParseVersionLine(string(out))
	}
	return d
}

// ParseVersionLine extracts the most version-shaped token from a
// binary's version output (e.g. "Tor version 0.4.8.12 (git-...)" or
// "0.4.8.12"). Returns "" when nothing version-shaped appears.
func ParseVersionLine(out string) string {
	best := ""
	for _, f := range strings.Fields(out) {
		f = strings.Trim(f, ",;()[]")
		if len(f) >= 3 && f[0] >= '0' && f[0] <= '9' && strings.Contains(f, ".") {
			if strings.Count(f, ".") >= strings.Count(best, ".") {
				best = f
			}
		}
	}
	return best
}

// PredatesTor04 reports whether a parsed tor version predates 0.4.x
// (the doctor's advisory threshold, research 16.1 check 1).
func PredatesTor04(v string) bool {
	major, rest, ok := strings.Cut(v, ".")
	if !ok {
		return false
	}
	m, err := strconv.Atoi(major)
	if err != nil {
		return false
	}
	if m != 0 {
		return m < 0
	}
	minor, _, ok := strings.Cut(rest, ".")
	if !ok {
		return false
	}
	n, err := strconv.Atoi(minor)
	if err != nil {
		return false
	}
	return n < 4
}

// ProbeSandbox reads platform sandbox posture (read-only).
func ProbeSandbox() Sandbox {
	var sb Sandbox
	if os.Getenv("container") != "" {
		sb.Containerized = true
	}
	if runtime.GOOS != "linux" {
		return sb
	}
	for _, marker := range []string{"/.dockerenv", "/run/.containerenv", "/proc/.containerenv"} {
		if _, err := os.Stat(marker); err == nil {
			sb.Containerized = true
			break
		}
	}
	if raw, err := os.ReadFile("/sys/module/apparmor/parameters/enabled"); err == nil {
		if strings.TrimSpace(string(raw)) == "Y" {
			sb.AppArmor = "enabled"
		} else {
			sb.AppArmor = "disabled"
		}
	}
	if raw, err := os.ReadFile("/proc/self/status"); err == nil {
		for _, line := range strings.Split(string(raw), "\n") {
			if strings.HasPrefix(line, "NoNewPrivs:") {
				fields := strings.Fields(line)
				if len(fields) == 2 && fields[1] == "1" {
					sb.NoNewPrivs = true
				}
			}
		}
	}
	return sb
}

// Gather builds the full read-only snapshot: capabilities for this OS
// plus dependency presence/versions. Never mutates anything.
func Gather(o Options) Snapshot {
	if o.TorBinary == "" {
		o.TorBinary = "tor"
	}
	if o.Timeout <= 0 {
		o.Timeout = 2 * time.Second
	}
	caps := Capabilities{
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
		UDP:  false, // binding: Tor has no UDP exit, ever.
	}
	deps := map[string]Dependency{}

	// Per-app mechanism truth.
	if runtime.GOOS == "linux" {
		torsocks := probeDependency("torsocks", os.Getenv("TORSOCKS_LIB"), o)
		if !torsocks.Present {
			// FindLib-style library hunt (the shim links the .so, not a CLI).
			for _, lib := range []string{
				"/usr/lib/x86_64-linux-gnu/torsocks/libtorsocks.so",
				"/usr/lib/aarch64-linux-gnu/torsocks/libtorsocks.so",
				"/usr/lib/torsocks/libtorsocks.so",
				"/usr/local/lib/torsocks/libtorsocks.so",
				"/usr/lib64/torsocks/libtorsocks.so",
			} {
				if fi, err := os.Stat(lib); err == nil && !fi.IsDir() {
					torsocks = Dependency{Name: "torsocks", Present: true, Path: lib}
					break
				}
			}
		}
		deps["torsocks"] = torsocks
		if torsocks.Present {
			caps.PerApp = true
			caps.PerAppMechanism = "torsocks"
			caps.PerAppDetail = "LD_PRELOAD shim at " + torsocks.Path
		} else {
			caps.PerAppMechanism = "unavailable"
			caps.PerAppDetail = `torsocks library not found (install package "torsocks")`
		}
	} else {
		// macOS/Windows: proxy environment is the shipped mechanism.
		caps.PerApp = true
		caps.PerAppMechanism = "proxy-env"
		caps.PerAppDetail = "socks5h proxy environment; only apps honoring proxy env are covered"
		deps["torsocks"] = Dependency{Name: "torsocks"}
	}

	// System-wide backend truth (Linux-only in the shipped product).
	switch runtime.GOOS {
	case "linux":
		if lp, err := exec.LookPath("nft"); err == nil {
			caps.SystemWide = true
			caps.SystemWideDetail = "nft backend at " + lp
		} else if lp, err := exec.LookPath("iptables"); err == nil {
			caps.SystemWide = true
			caps.SystemWideDetail = "iptables backend at " + lp
		} else {
			caps.SystemWideDetail = `neither nft nor iptables on PATH (install package "iptables" or "nftables")`
		}
	default:
		caps.SystemWideDetail = "system-wide needs a tun2socks backend (not shipped) on " + runtime.GOOS
	}
	if caps.SystemWide && ProbeSandbox().Containerized {
		// Still capable in principle; surface the caveat honestly.
		caps.SystemWideDetail += "; containerized environment (netfilter may be restricted)"
	}
	caps.Sandbox = ProbeSandbox()

	// Dependency versions (single source of truth for doctor/version).
	deps["tor"] = probeDependency(o.TorBinary, "", o)
	for _, pt := range []string{"lyrebird", "obfs4proxy", "snowflake-client"} {
		deps[pt] = probeDependency(pt, "", o)
	}
	return Snapshot{Capabilities: caps, Dependencies: deps}
}

// Dep returns one dependency (zero value when absent).
func (s Snapshot) Dep(name string) Dependency {
	if d, ok := s.Dependencies[name]; ok {
		return d
	}
	return Dependency{Name: name}
}

// PTFor returns the pluggable-transport binary covering transport:
// modern (lyrebird) and legacy (obfs4proxy/snowflake-client) names are
// both accepted; vanilla transports need no binary.
func (s Snapshot) PTFor(transport string) (dep Dependency, needed bool) {
	switch transport {
	case "", "vanilla":
		return Dependency{}, false
	case "snowflake":
		if d := s.Dep("snowflake-client"); d.Present {
			return d, true
		}
		if d := s.Dep("lyrebird"); d.Present {
			return d, true
		}
		return Dependency{Name: "snowflake-client"}, true
	default: // obfs4, meek, meek_lite, webtunnel, scramblesuit, unknowns
		if d := s.Dep("lyrebird"); d.Present {
			return d, true
		}
		if d := s.Dep("obfs4proxy"); d.Present {
			return d, true
		}
		return Dependency{Name: "lyrebird"}, true
	}
}

// LibraryPath is a convenience for callers that only need the torsocks
// library location (mirrors perapp.FindLib semantics).
func (s Snapshot) LibraryPath() string {
	return s.Dep("torsocks").Path
}
