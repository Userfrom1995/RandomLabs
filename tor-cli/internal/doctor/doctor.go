// Package doctor runs torshim's read-only environment diagnostics:
// `torshim doctor [--deep] [--json]` (research 16.1).
//
// Binding invariants: every check is read-only (no state mutation, no
// signals, no config writes), output is per-check `[ok]`/`[FAIL]` with
// detail and remediation, `--json` renders {overall, checks:[{id, ok,
// severity, detail, remediation}]}, exit 0 all pass and 1 any failed
// (usage errors stay with the caller at 2), and the word "protected"
// never appears in any output.
package doctor

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/platform_compat"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/probe"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/syswide"
)

// Check is one diagnostic finding.
type Check struct {
	ID          string `json:"id"`
	OK          bool   `json:"ok"`
	Severity    string `json:"severity"` // error | warning | info
	Detail      string `json:"detail"`
	Remediation string `json:"remediation,omitempty"`
}

// Report is the whole doctor surface.
type Report struct {
	Overall string  `json:"overall"` // pass | fail
	Checks  []Check `json:"checks"`
}

// Options tune a doctor run.
type Options struct {
	TorBinary   string
	ControlAddr string
	SocksAddr   string
	StateDir    string
	CheckURL    string
	Deep        bool
	Timeout     time.Duration
}

// env is the shared, once-computed read-only environment view that the
// individual checks consult (single control dial, one syswide probe).
type env struct {
	opts    Options
	snap    platform_compat.Snapshot
	sys     syswide.ProbeResult
	ctl     *control.Client
	ctlAddr string
	ctlErr  error
	st      control.BootstrapState
	stOK    bool
	stErr   error
}

// Run executes the checks in research 16.1 order. Baseline checks run
// always; the three network checks only under --deep. Never mutates.
func Run(o Options) Report {
	if o.TorBinary == "" {
		o.TorBinary = "tor"
	}
	if o.CheckURL == "" {
		o.CheckURL = probe.DefaultCheckURL
	}
	if o.Timeout <= 0 {
		o.Timeout = 3 * time.Second
	}
	e := &env{opts: o}
	// One snapshot feeds every platform/dependency check (component A
	// is the single source of truth for capability and version facts).
	e.snap = platform_compat.Gather(platform_compat.Options{TorBinary: o.TorBinary})
	e.sys = syswide.Probe(o.StateDir, nil)
	e.openControl()
	defer e.closeControl()

	checks := []Check{
		e.checkTorBinary(),
		e.checkMechanism(),
		e.checkControl(),
		e.checkBootstrap(),
		e.checkSocks(),
		e.checkPortConflicts(),
		e.checkSessionState(),
		e.checkEnvHygiene(),
		e.checkBridges(),
		e.checkCoverage(),
	}
	if o.Deep {
		checks = append(checks,
			e.checkIsTor(),
			e.checkIPv6(),
			e.checkClock(),
		)
	}
	overall := "pass"
	for _, c := range checks {
		if !c.OK {
			overall = "fail"
			break
		}
	}
	return Report{Overall: overall, Checks: checks}
}

// ---------------------------------------------------------------------------
// Shared environment probing (read-only).
// ---------------------------------------------------------------------------

// openControl dials the control endpoint once for all checks.
func (e *env) openControl() {
	candidates := []string{}
	if e.opts.ControlAddr != "" {
		candidates = append(candidates, e.opts.ControlAddr)
	} else {
		candidates = append(candidates, "127.0.0.1:9051", "127.0.0.1:9151")
	}
	var lastErr error
	for _, addr := range candidates {
		ctl, err := control.Dial(addr, e.opts.Timeout)
		if err != nil {
			lastErr = err
			continue
		}
		e.ctl, e.ctlErr = ctl, nil
		e.ctlAddr = addr
		authBestEffort(ctl)
		if phase, err := ctl.GetOne("status/bootstrap-phase"); err == nil {
			e.st = control.ParseBootstrapPhase(phase)
			if v, err := ctl.GetOne("status/circuit-established"); err == nil {
				e.st.CircuitEstablished = control.ParseCircuitEstablished(v)
			}
			e.stOK = true
		} else {
			e.stErr = err
		}
		return
	}
	e.ctlErr = lastErr
	if e.ctlErr == nil {
		e.ctlErr = fmt.Errorf("no control endpoint candidates")
	}
}

func (e *env) closeControl() {
	if e.ctl != nil {
		_ = e.ctl.Close()
	}
}

// socksAddr resolves the SOCKS endpoint under inspection: explicit
// flag, then TORSHIM_SOCKS, then the conventional guess.
func (e *env) socksAddr() string {
	if e.opts.SocksAddr != "" {
		return e.opts.SocksAddr
	}
	if v := os.Getenv("TORSHIM_SOCKS"); v != "" {
		return v
	}
	if e.ctlAddr != "" && strings.HasSuffix(e.ctlAddr, ":9151") {
		return "127.0.0.1:9150"
	}
	return "127.0.0.1:9050"
}

// authBestEffort tries the standard cookie locations; failures are
// reported by the checks that need authenticated reads.
func authBestEffort(ctl *control.Client) {
	candidates := []string{os.Getenv("TOR_COOKIE")}
	if home, err := os.UserHomeDir(); err == nil {
		candidates = append(candidates, filepath.Join(home, ".tor", "control_auth_cookie"))
	}
	candidates = append(candidates, "/var/run/tor/control.authcookie", "/run/tor/control.authcookie")
	for _, c := range candidates {
		if c == "" {
			continue
		}
		if err := ctl.AuthCookie(c); err == nil {
			return
		}
	}
}

// ---------------------------------------------------------------------------
// Baseline checks (1-10).
// ---------------------------------------------------------------------------

func (e *env) checkTorBinary() Check {
	tor := e.snap.Dep("tor")
	if !tor.Present {
		return Check{ID: "tor_binary", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("tor binary %q not found on PATH", e.opts.TorBinary),
			Remediation: `install tor (package "tor") and retry`}
	}
	if tor.Version == "" {
		return Check{ID: "tor_binary", OK: true, Severity: "warning",
			Detail: fmt.Sprintf("tor found at %s (version string unreadable)", tor.Path)}
	}
	if platform_compat.PredatesTor04(tor.Version) {
		return Check{ID: "tor_binary", OK: true, Severity: "warning",
			Detail:      fmt.Sprintf("tor %s at %s (predates 0.4.x)", tor.Version, tor.Path),
			Remediation: "upgrade to a current tor release"}
	}
	return Check{ID: "tor_binary", OK: true, Severity: "info",
		Detail: fmt.Sprintf("tor %s at %s", tor.Version, tor.Path)}
}

func (e *env) checkMechanism() Check {
	caps := e.snap.Capabilities
	if caps.PerAppMechanism == "unavailable" {
		return Check{ID: "perapp_mechanism", OK: false, Severity: "error",
			Detail:      "per-app mechanism unavailable: " + caps.PerAppDetail,
			Remediation: `install torsocks (package "torsocks")`}
	}
	return Check{ID: "perapp_mechanism", OK: true, Severity: "info",
		Detail: "per-app mechanism: " + caps.PerAppMechanism + " (" + caps.PerAppDetail + ")"}
}

func (e *env) checkControl() Check {
	if e.ctlErr != nil {
		tried := "127.0.0.1:9051, 127.0.0.1:9151"
		if e.opts.ControlAddr != "" {
			tried = e.opts.ControlAddr
		}
		return Check{ID: "control", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("no control endpoint answered (tried %s): %v", tried, e.ctlErr),
			Remediation: "start an instance (torshim run / torshim shell) or the system tor"}
	}
	if e.stErr != nil {
		return Check{ID: "control", OK: false, Severity: "error",
			Detail:      "control " + e.ctlAddr + " reachable but state unreadable: " + e.stErr.Error(),
			Remediation: "supply a control cookie (run as the tor user) or use torshim's own instance"}
	}
	detail := "control " + e.ctlAddr + " answered"
	if info, err := e.ctl.GetOne("version"); err == nil {
		if v := strings.TrimSpace(info); v != "" {
			detail += "; " + v
		}
	}
	detail += "; cookie auth ok"
	return Check{ID: "control", OK: true, Severity: "info", Detail: detail}
}

func (e *env) checkBootstrap() Check {
	if e.ctlErr != nil {
		return Check{ID: "bootstrap", OK: false, Severity: "error",
			Detail:      "control unavailable: " + e.ctlErr.Error(),
			Remediation: "start an instance (torshim run / torshim shell) or the system tor"}
	}
	if !e.stOK {
		return Check{ID: "bootstrap", OK: false, Severity: "error",
			Detail:      "bootstrap state unreadable: " + e.stErr.Error(),
			Remediation: "supply a control cookie or use torshim's own instance"}
	}
	if e.st.Ready() {
		return Check{ID: "bootstrap", OK: true, Severity: "info",
			Detail: "bootstrap 100% (done), circuit established"}
	}
	return Check{ID: "bootstrap", OK: false, Severity: "error",
		Detail:      fmt.Sprintf("bootstrap %d%% (tag %q), circuit established=%v", e.st.Progress, e.st.Tag, e.st.CircuitEstablished),
		Remediation: "wait for bootstrap to finish or check the tor logs"}
}

func (e *env) checkSocks() Check {
	addr := e.socksAddr()
	if err := lifecycle.ProbeSocks(addr, e.opts.Timeout); err != nil {
		return Check{ID: "socks", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("SOCKS5 handshake at %s failed: %v", addr, err),
			Remediation: "check the instance's SocksPort or run torshim shell"}
	}
	return Check{ID: "socks", OK: true, Severity: "info",
		Detail: fmt.Sprintf("SOCKS5 handshake ok at %s", addr)}
}

func (e *env) checkPortConflicts() Check {
	pairs := []struct{ socks, ctl string }{
		{"127.0.0.1:9050", "127.0.0.1:9051"},
		{"127.0.0.1:9150", "127.0.0.1:9151"},
	}
	var findings []string
	for _, p := range pairs {
		if !tcpOpen(p.socks) {
			continue // nothing listening: no conflict
		}
		if err := lifecycle.ProbeSocks(p.socks, time.Second); err != nil {
			findings = append(findings, fmt.Sprintf("%s accepts TCP but fails the SOCKS handshake (%v)", p.socks, err))
			continue
		}
		ctl, err := control.Dial(p.ctl, time.Second)
		if err != nil {
			findings = append(findings, fmt.Sprintf("%s serves SOCKS but control %s does not answer (unverified instance)", p.socks, p.ctl))
			continue
		}
		authBestEffort(ctl)
		_, gerr := ctl.GetOne("status/bootstrap-phase")
		_ = ctl.Close()
		if gerr != nil {
			findings = append(findings, fmt.Sprintf("%s fails control verification at %s (%v)", p.socks, p.ctl, gerr))
		}
	}
	if len(findings) == 0 {
		return Check{ID: "port_conflicts", OK: true, Severity: "info",
			Detail: "no unverified listeners on 9050/9150"}
	}
	return Check{ID: "port_conflicts", OK: false, Severity: "error",
		Detail:      strings.Join(findings, "; "),
		Remediation: "stop the conflicting instance or point torshim at it with --socks/--control"}
}

func tcpOpen(addr string) bool {
	conn, err := net.DialTimeout("tcp", addr, 400*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

func (e *env) checkSessionState() Check {
	switch e.sys.Mode {
	case "system":
		if e.ctlErr != nil || !e.stOK || !e.st.Ready() {
			return Check{ID: "session_state", OK: false, Severity: "error",
				Detail:      "system-wide session records/rules present but tor is not answering with a ready state (mismatch)",
				Remediation: "sudo torshim repair, then sudo torshim connect again"}
		}
		return Check{ID: "session_state", OK: true, Severity: "info",
			Detail: "system-wide session active: " + e.sys.Detail}
	case "stale":
		return Check{ID: "session_state", OK: false, Severity: "error",
			Detail:      "stale system session: " + e.sys.Detail,
			Remediation: "sudo torshim repair"}
	default: // none, and non-linux probes report none
		if runtime.GOOS != "linux" {
			return Check{ID: "session_state", OK: true, Severity: "info",
				Detail: "system-wide sessions are Linux-only on this OS"}
		}
		return Check{ID: "session_state", OK: true, Severity: "info",
			Detail: "no system-wide session (per-app mode)"}
	}
}

func (e *env) checkEnvHygiene() Check {
	proxyKeys := []string{"HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"}
	var shadowed []string
	active, activeSet := os.LookupEnv("TORSHIM_ACTIVE")
	socksEnv := os.Getenv("TORSHIM_SOCKS")
	for _, kv := range os.Environ() {
		k, v, _ := strings.Cut(kv, "=")
		if v == "" {
			continue // an empty proxy var shadows nothing
		}
		for _, p := range proxyKeys {
			if k == p {
				shadowed = append(shadowed, k)
			}
		}
	}
	if activeSet && active == "1" && socksEnv == "" {
		return Check{ID: "env_hygiene", OK: false, Severity: "error",
			Detail:      "stale TORSHIM_ACTIVE=1 without TORSHIM_SOCKS (leftover from a dead shell)",
			Remediation: "unset TORSHIM_ACTIVE or re-enter: torshim shell"}
	}
	if len(shadowed) > 0 {
		sort.Strings(shadowed)
		return Check{ID: "env_hygiene", OK: true, Severity: "warning",
			Detail: "proxy env present (" + strings.Join(shadowed, ", ") + "): apps honoring those keys may route around the intended endpoint"}
	}
	return Check{ID: "env_hygiene", OK: true, Severity: "info",
		Detail: "no stale markers or shadowing proxy env"}
}

func (e *env) checkBridges() Check {
	if e.ctlErr != nil {
		return Check{ID: "bridges", OK: false, Severity: "warning",
			Detail:      "bridge configuration unknown (no control endpoint)",
			Remediation: "start an instance to inspect its bridge configuration"}
	}
	vals, err := e.ctl.GetConf("UseBridges", "Bridge")
	if err != nil {
		return Check{ID: "bridges", OK: false, Severity: "warning",
			Detail:      "GETCONF Bridge unavailable: " + err.Error(),
			Remediation: "tor may predate bridge introspection; upgrade or inspect the torrc"}
	}
	useBridges := strings.TrimSpace(vals["UseBridges"]) == "1"
	var lines []string
	for _, l := range strings.Split(vals["Bridge"], "\n") {
		if l = strings.TrimSpace(l); l != "" {
			lines = append(lines, l)
		}
	}
	if len(lines) == 0 {
		if useBridges {
			return Check{ID: "bridges", OK: false, Severity: "error",
				Detail:      "UseBridges is 1 but no Bridge entries are configured",
				Remediation: "add a bridge line (torshim bridge add) or disable UseBridges"}
		}
		return Check{ID: "bridges", OK: true, Severity: "info",
			Detail: "no bridges configured (direct directory guards)"}
	}
	need := map[string]bool{}
	for _, l := range lines {
		fields := strings.Fields(l)
		if len(fields) == 0 {
			continue
		}
		// A transport name leads the line; otherwise it is vanilla.
		t := fields[0]
		if _, err := strconv.Atoi(strings.SplitN(t, ".", 2)[0]); err == nil {
			t = "vanilla"
		}
		need[t] = true
	}
	var missing []string
	var found []string
	var names []string
	for t := range need {
		names = append(names, t)
	}
	sort.Strings(names)
	for _, t := range names {
		dep, needed := e.snap.PTFor(t)
		if !needed {
			found = append(found, t)
			continue
		}
		if dep.Present {
			found = append(found, t+" via "+dep.Path)
			continue
		}
		missing = append(missing, t)
	}
	if len(missing) > 0 {
		return Check{ID: "bridges", OK: false, Severity: "error",
			Detail: fmt.Sprintf("%d bridge(s) configured but pluggable transport not on PATH for %s",
				len(lines), strings.Join(missing, ", ")),
			Remediation: `install the transport (package "obfs4proxy" / lyrebird)`}
	}
	return Check{ID: "bridges", OK: true, Severity: "info",
		Detail: fmt.Sprintf("%d bridge(s) configured; transports: %s", len(lines), strings.Join(found, ", "))}
}

func (e *env) checkCoverage() Check {
	caps := e.snap.Capabilities
	detail := fmt.Sprintf("platform coverage (%s/%s): per-app via %s; system-wide: %s; UDP/ICMP never supported (see tor-cli/docs/limitations.md)",
		caps.OS, caps.Arch, caps.PerAppMechanism, caps.SystemWideDetail)
	return Check{ID: "platform_coverage", OK: true, Severity: "info", Detail: detail}
}

// ---------------------------------------------------------------------------
// Deep checks (11-13).
// ---------------------------------------------------------------------------

func (e *env) checkIsTor() Check {
	addr := e.socksAddr()
	if err := lifecycle.ProbeSocks(addr, e.opts.Timeout); err != nil {
		return Check{ID: "probe_istor", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("no SOCKS endpoint answering at %s to probe: %v", addr, err),
			Remediation: "start an instance or fix --socks, then re-run doctor --deep"}
	}
	isTor, exitIP, err := probe.IsTorThrough(addr, e.opts.CheckURL, e.opts.Timeout)
	if err != nil {
		return Check{ID: "probe_istor", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("IsTor probe via %s failed: %v", addr, err),
			Remediation: "check network reachability, then run torshim status --verify for the full verdict"}
	}
	if !isTor {
		return Check{ID: "probe_istor", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("IsTor=false: egress through %s is exit %s, which is not a Tor exit", addr, exitIP),
			Remediation: "verify --socks points at a bootstrapped tor and no proxy env overrides it"}
	}
	return Check{ID: "probe_istor", OK: true, Severity: "info",
		Detail: fmt.Sprintf("IsTor=true exit=%s via %s", exitIP, addr)}
}

func (e *env) checkIPv6() Check {
	t := e.opts.Timeout
	if t > 2*time.Second {
		t = 2 * time.Second
	}
	conn, err := net.DialTimeout("tcp", "[2606:4700:4700::1111]:443", t)
	if err != nil {
		return Check{ID: "probe_ipv6", OK: true, Severity: "info",
			Detail: "IPv6 posture: no direct IPv6 egress route detected"}
	}
	_ = conn.Close()
	return Check{ID: "probe_ipv6", OK: true, Severity: "info",
		Detail: "IPv6 posture: direct IPv6 egress route present (system-wide mode blocks IPv6; per-app mode does not)"}
}

func (e *env) checkClock() Check {
	u, err := http.NewRequest(http.MethodHead, e.opts.CheckURL, nil)
	if err != nil {
		return Check{ID: "probe_time", OK: false, Severity: "warning",
			Detail:      "clock sanity check URL unusable: " + err.Error(),
			Remediation: "pass a reachable --check-url"}
	}
	ctx, cancel := context.WithTimeout(context.Background(), e.opts.Timeout)
	defer cancel()
	u = u.WithContext(ctx)
	// Direct request: the clock check measures this host, not tor egress,
	// and must not be routed through any proxy env.
	client := &http.Client{Transport: &http.Transport{Proxy: nil}}
	resp, err := client.Do(u)
	if err != nil {
		return Check{ID: "probe_time", OK: false, Severity: "warning",
			Detail:      "clock sanity check unreachable: " + err.Error(),
			Remediation: "check network reachability (Date header source)"}
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
	dateHdr := resp.Header.Get("Date")
	if dateHdr == "" {
		return Check{ID: "probe_time", OK: false, Severity: "warning",
			Detail:      "clock sanity: response carries no Date header",
			Remediation: "probe a server that sends an HTTP Date header"}
	}
	serverTime, err := http.ParseTime(dateHdr)
	if err != nil {
		return Check{ID: "probe_time", OK: false, Severity: "warning",
			Detail:      "clock sanity: unparseable Date header: " + dateHdr,
			Remediation: "probe a server that sends a standard HTTP Date header"}
	}
	skew := time.Since(serverTime)
	if skew < 0 {
		skew = -skew
	}
	if skew > 2*time.Minute {
		return Check{ID: "probe_time", OK: false, Severity: "error",
			Detail:      fmt.Sprintf("system clock off by %s from the HTTP Date header", skew.Round(time.Second)),
			Remediation: "sync system time (NTP); TLS and bootstrap timing depend on it"}
	}
	return Check{ID: "probe_time", OK: true, Severity: "info",
		Detail: fmt.Sprintf("system clock within %s of the HTTP Date header", skew.Round(time.Second))}
}

// ---------------------------------------------------------------------------
// Renderers.
// ---------------------------------------------------------------------------

// RenderText renders the human `[ok]`/`[FAIL]` lines plus the overall
// result. Never emits the word "protected".
func RenderText(r Report) string {
	var b strings.Builder
	for _, c := range r.Checks {
		mark := "ok"
		if !c.OK {
			mark = "FAIL"
		}
		fmt.Fprintf(&b, "[%s] %s: %s\n", mark, c.ID, c.Detail)
		if !c.OK && c.Remediation != "" {
			fmt.Fprintf(&b, "     fix: %s\n", c.Remediation)
		}
	}
	fmt.Fprintf(&b, "overall: %s\n", r.Overall)
	return b.String()
}

// RenderJSON renders the --json payload ({overall, checks}).
func RenderJSON(r Report) (string, error) {
	raw, err := json.MarshalIndent(r, "", "  ")
	if err != nil {
		return "", err
	}
	return string(raw) + "\n", nil
}
