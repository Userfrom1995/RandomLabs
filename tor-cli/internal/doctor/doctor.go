// Package doctor is the `torshim doctor` health check: one verdict over
// the whole routing stack (control, bootstrap, circuit, SOCKS, DNSPort,
// exit-IP egress, firewall, IPv6), each check honestly graded
// pass/fail/skip with a detail string.
//
// Design: Collect takes injectable Deps so the JSON contract and grading
// are pinned by hermetic tests against stub controllers and stub networks.
// Live runs use DefaultDeps (real dial/auth/probes). stdlib only.
package doctor

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/syswide"
)

// Check statuses. "skip" always carries the reason (unsupported platform,
// disabled probe, no session to inspect): silence would read as approval.
const (
	StatusPass = "pass"
	StatusFail = "fail"
	StatusSkip = "skip"
)

// Check is one graded probe.
type Check struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Detail string `json:"detail"`
}

// Report is the doctor verdict. Healthy is true only when zero checks
// failed (skips do not fail the verdict, but they are listed).
type Report struct {
	ControlAddr string  `json:"control_addr"`
	SocksAddr   string  `json:"socks_addr"`
	Healthy     bool    `json:"healthy"`
	Checks      []Check `json:"checks"`
}

// Options tune collection.
type Options struct {
	// ControlAddr is the control endpoint ("" means conventional
	// 127.0.0.1:9051 with 9151 fallback; see ResolveControl).
	ControlAddr string
	// CookiePaths are tried in order for control auth (see ResolveCookies).
	CookiePaths []string
	// SocksAddr overrides the SOCKS endpoint ("": derived from control).
	SocksAddr string
	Timeout   time.Duration
	// SystemStateDir overrides the syswide session dir for firewall checks.
	SystemStateDir string
	// SkipExitIP skips the egress fetch (offline runs, hermetic CI).
	SkipExitIP bool
	// SkipDNS skips the DNSPort liveness query.
	SkipDNS bool
	// CheckHost/CheckPort/CheckPath select the egress probe target
	// (default: check.torproject.org/api/ip over HTTP through SOCKS).
	CheckHost string
	CheckPort int
	CheckPath string
	// DNSName is the name resolved for the DNSPort check.
	DNSName string
}

// Controller is the control surface doctor needs. *control.Client
// implements it; tests inject a stub.
type Controller interface {
	GetOne(key string) (string, error)
	Signal(name string) error
	AuthCookie(path string) error
	Close() error
}

// Deps carries injectable operations. Nil hooks resolve to live defaults.
type Deps struct {
	DialControl func(addr string, timeout time.Duration) (Controller, error)
	AuthControl func(c Controller, cookiePaths []string) error
	SocksProbe  func(addr string, timeout time.Duration) error
	DNSQuery    func(dnsListener, name string, timeout time.Duration) error
	ExitIP      func(socksAddr, host string, port int, path string, timeout time.Duration) (string, error)
	Firewall    func(stateDir string) FirewallState
	// IPv6Rules reports whether the backend's v6 REJECT rules are present.
	// An error means the table could not be inspected (usually non-root).
	IPv6Rules func(backend, stateDir string) (bool, error)
}

// FirewallState is the read-only outside view of a system-wide session.
type FirewallState struct {
	Mode    string // system | stale | none
	Backend string
	Detail  string
}

// DefaultDeps wires the live operations.
func DefaultDeps() Deps {
	return Deps{
		DialControl: func(addr string, timeout time.Duration) (Controller, error) {
			return control.Dial(addr, timeout)
		},
		AuthControl: AuthAny,
		SocksProbe:  lifecycle.ProbeSocks,
		DNSQuery:    QueryDNS,
		ExitIP:      FetchExitIP,
		Firewall:    ProbeFirewall,
	}
}

// ResolveControl picks the control endpoint: explicit flag, then the
// TORSHIM_CONTROL session export (torshim shell / run --verbose sessions),
// then a live system-wide session record, else "" for conventional ports.
// The second return reports where the answer came from for verbose output.
func ResolveControl(flag string) (addr, source string) {
	if flag != "" {
		return flag, "flag --control"
	}
	if v := os.Getenv("TORSHIM_CONTROL"); v != "" {
		return v, "env TORSHIM_CONTROL (live torshim session)"
	}
	if runtime.GOOS == "linux" {
		if s, err := syswide.LoadState(syswide.StateDir()); err == nil && s != nil && s.ControlPort > 0 {
			return s.ControlAddr(), "system session record (torshim connect)"
		}
	}
	return "", "conventional ports 127.0.0.1:9051/9151"
}

// ResolveCookies orders cookie candidates: explicit flag, TOR_COOKIE,
// TORSHIM_COOKIE (live session export), the system session cookie when the
// endpoint came from the session record, then conventional paths.
func ResolveCookies(flag, controlSource string) []string {
	var out []string
	if flag != "" {
		out = append(out, flag)
	}
	if v := os.Getenv("TOR_COOKIE"); v != "" {
		out = append(out, v)
	}
	if v := os.Getenv("TORSHIM_COOKIE"); v != "" {
		out = append(out, v)
	}
	if strings.HasPrefix(controlSource, "system session") && runtime.GOOS == "linux" {
		if s, err := syswide.LoadState(syswide.StateDir()); err == nil && s != nil {
			out = append(out, s.CookiePath())
		}
	}
	if home, err := os.UserHomeDir(); err == nil {
		out = append(out, filepath.Join(home, ".tor", "control_auth_cookie"))
	}
	out = append(out, "/var/run/tor/control.authcookie")
	return out
}

// AuthAny authenticates with the first usable cookie. Missing/unreadable
// files are skipped (the next candidate may fit); a wrong cookie moves on
// to the next candidate; only when every candidate is exhausted is the
// failure reported, naming how many were tried.
func AuthAny(c Controller, cookiePaths []string) error {
	tried := 0
	for _, p := range cookiePaths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err != nil {
			continue
		}
		tried++
		if err := c.AuthCookie(p); err != nil {
			continue
		}
		return nil
	}
	if tried == 0 {
		return fmt.Errorf("doctor: no readable control cookie (tried conventional paths; set --cookie or TOR_COOKIE)")
	}
	return fmt.Errorf("doctor: control auth rejected by %d cookie candidate(s) (foreign instance without a shared cookie?)", tried)
}

// ProbeFirewall is the live Firewall hook: the syswide session record plus
// live rule presence on Linux, always "none" elsewhere (no backend exists
// there, so there is nothing to confirm and nothing to fail).
func ProbeFirewall(stateDir string) FirewallState {
	if runtime.GOOS != "linux" {
		return FirewallState{Mode: "none", Detail: "no system-wide backend on " + runtime.GOOS + " (per-app and shell only)"}
	}
	pr := syswide.Probe(stateDir, nil)
	st := FirewallState{Mode: pr.Mode, Detail: pr.Detail}
	if pr.State != nil {
		st.Backend = pr.State.Backend
	}
	return st
}

// GuessSocks derives the conventional SOCKS endpoint from a control
// endpoint (Tor Browser 9150 vs default 9050).
func GuessSocks(controlAddr string) string {
	if strings.HasSuffix(controlAddr, ":9151") {
		return "127.0.0.1:9150"
	}
	return "127.0.0.1:9050"
}

// Collect runs every check and builds the verdict. Control-dependent checks
// degrade to skip (never to pass) when dial or auth fails.
func Collect(o Options, deps Deps) Report {
	if o.Timeout <= 0 {
		o.Timeout = 10 * time.Second
	}
	if o.CheckHost == "" {
		o.CheckHost = "check.torproject.org"
	}
	if o.CheckPort == 0 {
		o.CheckPort = 80
	}
	if o.CheckPath == "" {
		o.CheckPath = "/api/ip"
	}
	if o.DNSName == "" {
		o.DNSName = "example.com"
	}
	live := DefaultDeps()
	if deps.DialControl == nil {
		deps.DialControl = live.DialControl
	}
	if deps.AuthControl == nil {
		deps.AuthControl = live.AuthControl
	}
	if deps.SocksProbe == nil {
		deps.SocksProbe = live.SocksProbe
	}
	if deps.DNSQuery == nil {
		deps.DNSQuery = live.DNSQuery
	}
	if deps.ExitIP == nil {
		deps.ExitIP = live.ExitIP
	}
	if deps.Firewall == nil {
		deps.Firewall = live.Firewall
	}
	if deps.IPv6Rules == nil {
		deps.IPv6Rules = ipv6RulesPresent
	}

	rep := Report{}
	addrs := []string{}
	if o.ControlAddr != "" {
		addrs = []string{o.ControlAddr}
	} else {
		addrs = []string{"127.0.0.1:9051", "127.0.0.1:9151"}
	}
	var ctl Controller
	var dialErr error
	for _, a := range addrs {
		ctl, dialErr = deps.DialControl(a, o.Timeout)
		if dialErr == nil {
			rep.ControlAddr = a
			break
		}
	}
	check := func(name, status, detail string) {
		rep.Checks = append(rep.Checks, Check{Name: name, Status: status, Detail: detail})
	}
	if dialErr != nil {
		check("control-reachable", StatusFail, fmt.Sprintf("no control endpoint answered (%s): %v", strings.Join(addrs, ", "), dialErr))
		socksAddr := o.SocksAddr
		if socksAddr == "" {
			socksAddr = GuessSocks(addrs[0])
		}
		rep.SocksAddr = socksAddr
		probeTransportChecks(&rep, check, o, deps, nil)
		finishReport(&rep, check, o, deps)
		return rep
	}
	defer ctl.Close()
	check("control-reachable", StatusPass, "answered at "+rep.ControlAddr)
	if err := deps.AuthControl(ctl, o.CookiePaths); err != nil {
		check("control-auth", StatusFail, err.Error())
		ctl.Close()
		rep.SocksAddr = o.SocksAddr
		if rep.SocksAddr == "" {
			rep.SocksAddr = GuessSocks(rep.ControlAddr)
		}
		probeTransportChecks(&rep, check, o, deps, nil)
		finishReport(&rep, check, o, deps)
		return rep
	}
	check("control-auth", StatusPass, "cookie accepted")

	phase, err := ctl.GetOne("status/bootstrap-phase")
	if err != nil {
		check("bootstrap-complete", StatusFail, "bootstrap state unreadable: "+err.Error())
	} else {
		st := control.ParseBootstrapPhase(phase)
		if st.Progress == 100 && st.Tag == "done" {
			check("bootstrap-complete", StatusPass, "100% tag done")
		} else {
			check("bootstrap-complete", StatusFail, fmt.Sprintf("%d%% tag %q (tor still bootstrapping)", st.Progress, st.Tag))
		}
	}
	est := false
	if v, err := ctl.GetOne("status/circuit-established"); err == nil {
		est = control.ParseCircuitEstablished(v)
	} else if dump, err2 := ctl.GetOne("circuit-status"); err2 == nil {
		est = control.HasBuiltCircuit(dump)
	}
	if est {
		check("circuit-established", StatusPass, "live circuit")
	} else {
		check("circuit-established", StatusFail, "no usable circuit (tor cannot carry traffic yet)")
	}

	socksAddr := o.SocksAddr
	if socksAddr == "" {
		socksAddr = GuessSocks(rep.ControlAddr)
	}
	rep.SocksAddr = socksAddr
	probeTransportChecks(&rep, check, o, deps, ctl)
	finishReport(&rep, check, o, deps)
	return rep
}

// probeTransportChecks runs the SOCKS, DNSPort, and exit-IP probes. ctl may
// be nil (no control session): DNS listener discovery then degrades to skip
// instead of guessing ports that were never advertised.
func probeTransportChecks(rep *Report, check func(name, status, detail string), o Options, deps Deps, ctl Controller) {
	if err := deps.SocksProbe(rep.SocksAddr, o.Timeout); err != nil {
		check("socks-handshake", StatusFail, fmt.Sprintf("SOCKS %s not serving: %v", rep.SocksAddr, err))
	} else {
		check("socks-handshake", StatusPass, "SOCKS5 handshake at "+rep.SocksAddr)
	}
	if o.SkipDNS {
		check("dnsport-liveness", StatusSkip, "disabled by --skip-dns")
	} else if ctl == nil {
		check("dnsport-liveness", StatusSkip, "no control session: DNSPort listener unknown")
	} else if v, err := ctl.GetOne("net/listeners/dns"); err != nil || strings.Trim(strings.TrimSpace(v), "\"") == "" {
		check("dnsport-liveness", StatusSkip, "tor advertises no DNSPort listener (DNS may leak outside Tor)")
	} else {
		dnsAddr := strings.Trim(strings.TrimSpace(v), "\"")
		// A listener list may hold several entries; probe the first.
		if i := strings.IndexAny(dnsAddr, " \t,"); i >= 0 {
			dnsAddr = dnsAddr[:i]
		}
		if err := deps.DNSQuery(dnsAddr, o.DNSName, o.Timeout); err != nil {
			check("dnsport-liveness", StatusFail, fmt.Sprintf("DNSPort %s did not answer an A query for %s: %v", dnsAddr, o.DNSName, err))
		} else {
			check("dnsport-liveness", StatusPass, fmt.Sprintf("DNSPort %s answered an A query for %s through the circuit", dnsAddr, o.DNSName))
		}
	}
	if o.SkipExitIP {
		check("exit-ip-egress", StatusSkip, "disabled by --skip-exit-ip")
	} else if ip, err := deps.ExitIP(rep.SocksAddr, o.CheckHost, o.CheckPort, o.CheckPath, o.Timeout); err != nil {
		check("exit-ip-egress", StatusFail, fmt.Sprintf("no egress through %s via %s: %v", o.CheckHost, rep.SocksAddr, err))
	} else {
		check("exit-ip-egress", StatusPass, fmt.Sprintf("exit IP %s reached %s%s through the circuit", ip, o.CheckHost, o.CheckPath))
	}
}

// finishReport appends the firewall and IPv6 checks, then sets Healthy.
// Healthy is true only with zero failures.
func finishReport(rep *Report, check func(name, status, detail string), o Options, deps Deps) {
	fw := deps.Firewall(o.SystemStateDir)
	switch fw.Mode {
	case "system":
		d := "system-wide session"
		if fw.Backend != "" {
			d += " via " + fw.Backend
		}
		if fw.Detail != "" {
			d += ": " + fw.Detail
		}
		check("firewall-present", StatusPass, d)
	case "stale":
		check("firewall-present", StatusFail, "stale system state ("+fw.Detail+"): run torshim repair")
	default:
		check("firewall-present", StatusSkip, "not in system-wide mode (per-app and shell need no firewall rules)")
	}
	ipv6Check(rep, check, o, deps, fw)
	rep.Healthy = true
	for _, c := range rep.Checks {
		if c.Status == StatusFail {
			rep.Healthy = false
			break
		}
	}
}

// ipv6Check grades IPv6 confinement honestly per mode. Only a live
// system-wide session on Linux blocks v6 (REJECT rules, verify-gated at
// connect): there the check passes while the backend rules are present and
// fails closed when the rule read itself errors under root. Everywhere else
// the check skips with the reason spelled out, because per-app mode leaves
// host IPv6 untouched by design (v6-capable apps may egress outside Tor:
// see docs/limitations.md) and off-Linux there is no backend at all.
func ipv6Check(rep *Report, check func(name, status, detail string), o Options, deps Deps, fw FirewallState) {
	_ = rep
	if runtime.GOOS != "linux" {
		check("ipv6-blocked", StatusSkip, "no system-wide backend on "+runtime.GOOS+": IPv6 confinement is a Linux connect-mode property")
		return
	}
	if fw.Mode != "system" {
		check("ipv6-blocked", StatusSkip, "per-app mode leaves host IPv6 untouched: v6-capable apps may egress outside Tor (see docs/limitations.md)")
		return
	}
	present, readErr := deps.IPv6Rules(fw.Backend, o.SystemStateDir)
	if readErr != nil {
		check("ipv6-blocked", StatusSkip, "rule table unreadable ("+readErr.Error()+"): re-run as root to confirm")
		return
	}
	if present {
		check("ipv6-blocked", StatusPass, "torshim v6 REJECT rules present (backend "+fw.Backend+", verify-gated at connect)")
	} else {
		check("ipv6-blocked", StatusFail, "system session without torshim v6 rules: run torshim repair")
	}
}

// ipv6RulesPresent reuses the backend presence probe (read-only). An error
// return means the table could not be inspected at all (usually non-root).
func ipv6RulesPresent(backend, _ string) (bool, error) {
	r := syswide.RealRunner{}
	switch backend {
	case syswide.BackendIptables:
		if _, err := r.LookPath("iptables"); err != nil {
			return false, err
		}
		return syswide.IptablesBackend{Run: r}.Present(), nil
	case syswide.BackendNft:
		if _, err := r.LookPath("nft"); err != nil {
			return false, err
		}
		return syswide.NftBackend{Run: r}.Present(), nil
	default:
		return syswide.IptablesBackend{Run: r}.Present() || syswide.NftBackend{Run: r}.Present(), nil
	}
}

// RenderText prints the human-readable verdict.
func RenderText(rep Report) string {
	var b strings.Builder
	for _, c := range rep.Checks {
		mark := "ok"
		switch c.Status {
		case StatusFail:
			mark = "FAIL"
		case StatusSkip:
			mark = "skip"
		}
		fmt.Fprintf(&b, "  [%s] %-20s %s\n", mark, c.Name, c.Detail)
	}
	if rep.Healthy {
		b.WriteString("doctor: healthy (tor is carrying traffic)\n")
	} else {
		b.WriteString("doctor: UNHEALTHY (see FAIL rows above)\n")
	}
	return b.String()
}

// RenderJSON prints the machine-readable verdict (stable field names).
func RenderJSON(rep Report) (string, error) {
	raw, err := json.MarshalIndent(rep, "", "  ")
	if err != nil {
		return "", err
	}
	return string(raw) + "\n", nil
}
