// Package status aggregates instance state for `torshim status`.
//
// Binding invariant: status never claims protected when not. Unknown states
// render as unknown, never as protected.
package status

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/syswide"
)

// Report is the status surface (human + --json).
type Report struct {
	Running            bool   `json:"running"`
	State              string `json:"state"`
	BootstrapProgress  int    `json:"bootstrap_progress,omitempty"`
	BootstrapTag       string `json:"bootstrap_tag,omitempty"`
	CircuitEstablished bool   `json:"circuit_established"`
	Mode               string `json:"mode"`
	SocksAddr          string `json:"socks_addr,omitempty"`
	ControlAddr        string `json:"control_addr,omitempty"`
	TorVersion         string `json:"tor_version,omitempty"`
	Protected          bool   `json:"protected"`
	Note               string `json:"note"`
	// Additive verify/enrichment keys (research P0.3): present only
	// when there is evidence for them; existing keys stay pinned.
	Listeners map[string]string `json:"listeners,omitempty"`
	Uptime    int64             `json:"uptime,omitempty"`
	Instance  string            `json:"instance,omitempty"`
	Verdict   string            `json:"verdict,omitempty"`
	CheckURL  string            `json:"check_url,omitempty"`
	ExitIP    string            `json:"exit_ip,omitempty"`
}

// Options tune collection.
type Options struct {
	ControlAddr string
	SocksAddr   string
	// Timeout is the whole-collect wall-clock budget (default 1500ms),
	// not a per-operation one: dial, control reads, and the SOCKS probe
	// share the same deadline so status stays inside the 2s G4 bound
	// even against a silent endpoint.
	Timeout time.Duration
	// SystemStateDir overrides the syswide session dir (default resolved
	// from TORSHIM_STATEDIR or /run/torshim). Empty means probe default.
	SystemStateDir string
}

// Collect probes the control endpoint and builds a Report. When nothing
// answers, the report is absent/unknown with Protected=false. The system
// session (M3) is folded in: mode "system" only when a session record and
// live rules agree; anything else never upgrades the verdict.
func Collect(o Options) Report {
	rep := Report{State: "absent", Mode: shellMode()}
	sys := syswide.Probe(o.SystemStateDir, nil)
	sysNote := ""
	switch sys.Mode {
	case "system":
		rep.Mode = "system"
	case "stale":
		if sys.Detail != "" {
			sysNote = "system-wide: " + sys.Detail
			rep.Note = sysNote
		}
	}
	addSysNote := func() {
		if sysNote != "" && !strings.Contains(rep.Note, sysNote) {
			if rep.Note != "" {
				rep.Note += "; " + sysNote
			} else {
				rep.Note = sysNote
			}
		}
	}
	// The whole report is built inside one wall-clock budget so a dead
	// or silent control endpoint cannot stall status past G4 (2s): the
	// dial gets the budget, every control operation is capped by the
	// absolute deadline, and the SOCKS probe only gets what remains.
	if o.Timeout <= 0 {
		o.Timeout = 1500 * time.Millisecond
	}
	deadline := time.Now().Add(o.Timeout)
	remaining := func() time.Duration {
		d := time.Until(deadline)
		if d < 50*time.Millisecond {
			d = 50 * time.Millisecond
		}
		return d
	}
	ctlAddr := o.ControlAddr
	if ctlAddr == "" {
		ctlAddr = "127.0.0.1:9051"
	}
	// Resolve the SOCKS endpoint before dialing so every early return
	// still reports it: `status --verify` needs it even when control is
	// unreachable. An explicit flag/env always wins.
	rep.SocksAddr = o.SocksAddr
	ctl, err := control.Dial(ctlAddr, o.Timeout)
	if err != nil {
		// Try the Tor Browser conventional port before giving up.
		if ctlAddr == "127.0.0.1:9051" {
			if ctl2, err2 := control.Dial("127.0.0.1:9151", remaining()); err2 == nil {
				ctl = ctl2
				ctlAddr = "127.0.0.1:9151"
			} else {
				rep.Note = "no tor control endpoint answered (tried 9051, 9151)"
				if rep.SocksAddr == "" {
					rep.SocksAddr = guessSocks(ctlAddr)
				}
				addSysNote()
				return rep
			}
		} else {
			rep.Note = fmt.Sprintf("control %s unreachable: %v", ctlAddr, err)
			if rep.SocksAddr == "" {
				rep.SocksAddr = guessSocks(ctlAddr)
			}
			addSysNote()
			return rep
		}
	}
	defer ctl.Close()
	ctl.Deadline = deadline
	if rep.SocksAddr == "" {
		rep.SocksAddr = guessSocks(ctlAddr)
	}
	rep.Running = true
	rep.ControlAddr = ctlAddr
	// Best-effort cookie authentication: real tor refuses GETINFO until
	// AUTHENTICATE, while permissive fakes never notice the attempt
	// (missing cookie files abort before anything hits the wire).
	authBestEffort(ctl)
	phase, err := ctl.GetOne("status/bootstrap-phase")
	if err != nil {
		// Control answered but we cannot authenticate/read state:
		// presence without knowledge. Never claim protected.
		rep.State = "unknown"
		rep.Note = "control reachable but state unreadable (foreign instance without cookie?)"
		addSysNote()
		return rep
	}
	st := control.ParseBootstrapPhase(phase)
	rep.BootstrapProgress = st.Progress
	rep.BootstrapTag = st.Tag
	if v, err := ctl.GetOne("status/circuit-established"); err == nil {
		rep.CircuitEstablished = control.ParseCircuitEstablished(v)
	}
	if v, err := ctl.GetOne("version"); err == nil {
		rep.TorVersion = strings.TrimSpace(v)
	}
	enrich(ctl, &rep, sys.Mode)
	st.CircuitEstablished = rep.CircuitEstablished
	switch {
	case st.Ready():
		rep.State = lifecycle.Ready.String()
		rep.Protected = true
		rep.Note = "tor bootstrapped with a live circuit"
		if sys.Mode == "system" {
			rep.Note += "; system-wide via " + sys.State.Backend + " since " + sys.State.CreatedAt
		}
	default:
		rep.State = lifecycle.Bootstrapping.String()
		rep.Note = fmt.Sprintf("tor bootstrapping (%d%% tag %q)", st.Progress, st.Tag)
	}
	if err := lifecycle.ProbeSocks(rep.SocksAddr, remaining()); err != nil {
		rep.Note += "; SOCKS endpoint not answering: " + err.Error()
		rep.Protected = false
	}
	addSysNote()
	return rep
}

// authBestEffort tries the standard cookie locations and never fails
// the report: an unreadable control stays "unknown", exactly as before.
func authBestEffort(ctl *control.Client) {
	candidates := []string{os.Getenv("TOR_COOKIE")}
	if home, err := os.UserHomeDir(); err == nil {
		candidates = append(candidates,
			filepath.Join(home, ".tor", "control_auth_cookie"))
	}
	candidates = append(candidates,
		"/var/run/tor/control.authcookie",
		"/run/tor/control.authcookie")
	for _, c := range candidates {
		if c == "" {
			continue
		}
		if err := ctl.AuthCookie(c); err == nil {
			return
		}
	}
}

// enrich fills the additive JSON keys (research P0.3): listeners,
// uptime, and instance kind. Every read is best-effort; a fake control
// that lacks the keys simply leaves them empty.
func enrich(ctl *control.Client, rep *Report, sysMode string) {
	vals, err := ctl.GetInfo("uptime", "data-dir",
		"net/listeners/socks", "net/listeners/control",
		"net/listeners/dns", "net/listeners/trans")
	if err != nil {
		return
	}
	if u, e := strconv.ParseInt(strings.TrimSpace(vals["uptime"]), 10, 64); e == nil {
		rep.Uptime = u
	}
	listeners := map[string]string{}
	for _, k := range []string{"socks", "control", "dns", "trans"} {
		if v := cleanListener(vals["net/listeners/"+k]); v != "" {
			listeners[k] = v
		}
	}
	if len(listeners) > 0 {
		rep.Listeners = listeners
	}
	rep.Instance = classifyInstance(sysMode, rep.Running, vals["data-dir"])
}

// cleanListener strips Tor's quoting from a listener value.
func cleanListener(v string) string {
	v = strings.TrimSpace(v)
	return strings.Trim(v, `"`)
}

// classifyInstance names what kind of tor is being reported: a system
// session, a torshim private instance (temp data dir marker), a foreign
// instance, or nothing at all.
func classifyInstance(sysMode string, running bool, dataDir string) string {
	if !running {
		return ""
	}
	switch sysMode {
	case "system":
		return "system"
	}
	dataDir = strings.TrimSpace(dataDir)
	if dataDir != "" {
		base := filepath.Base(dataDir)
		if strings.HasPrefix(base, "torshim-") && filepath.Dir(dataDir) == os.TempDir() {
			return "private"
		}
	}
	return "foreign"
}

func guessSocks(ctlAddr string) string {
	if strings.HasSuffix(ctlAddr, ":9151") {
		return "127.0.0.1:9150"
	}
	return "127.0.0.1:9050"
}

func shellMode() string {
	if os.Getenv("TORSHIM_ACTIVE") == "1" {
		return "shell"
	}
	return "none"
}

// RenderText prints the human-readable status.
func RenderText(rep Report) string {
	var b strings.Builder
	fmt.Fprintf(&b, "state: %s\n", rep.State)
	fmt.Fprintf(&b, "running: %v\n", rep.Running)
	if rep.Running {
		fmt.Fprintf(&b, "bootstrap: %d%% (tag %q)\n", rep.BootstrapProgress, rep.BootstrapTag)
		fmt.Fprintf(&b, "circuit: %v\n", rep.CircuitEstablished)
	}
	fmt.Fprintf(&b, "mode: %s\n", rep.Mode)
	if rep.SocksAddr != "" {
		fmt.Fprintf(&b, "socks: %s\n", rep.SocksAddr)
	}
	if rep.TorVersion != "" {
		fmt.Fprintf(&b, "tor: %s\n", rep.TorVersion)
	}
	fmt.Fprintf(&b, "protected: %v\n", rep.Protected)
	fmt.Fprintf(&b, "note: %s\n", rep.Note)
	if rep.Instance != "" {
		fmt.Fprintf(&b, "instance: %s\n", rep.Instance)
	}
	if rep.Uptime > 0 {
		fmt.Fprintf(&b, "uptime: %ds\n", rep.Uptime)
	}
	for _, k := range []string{"socks", "control", "dns", "trans"} {
		if v, ok := rep.Listeners[k]; ok {
			fmt.Fprintf(&b, "listener %s: %s\n", k, v)
		}
	}
	return b.String()
}

// RenderJSON prints the machine-readable status.
func RenderJSON(rep Report) (string, error) {
	raw, err := json.MarshalIndent(rep, "", "  ")
	if err != nil {
		return "", err
	}
	return string(raw) + "\n", nil
}
