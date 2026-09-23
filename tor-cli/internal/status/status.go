// Package status aggregates instance state for `torshim status`.
//
// Binding invariant: status never claims protected when not. Unknown states
// render as unknown, never as protected.
package status

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
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
}

// Options tune collection.
type Options struct {
	ControlAddr string
	SocksAddr   string
	Timeout     time.Duration
}

// Collect probes the control endpoint and builds a Report. When nothing
// answers, the report is absent/unknown with Protected=false.
func Collect(o Options) Report {
	rep := Report{State: "absent", Mode: shellMode()}
	if o.Timeout <= 0 {
		o.Timeout = 3 * time.Second
	}
	ctlAddr := o.ControlAddr
	if ctlAddr == "" {
		ctlAddr = "127.0.0.1:9051"
	}
	ctl, err := control.Dial(ctlAddr, o.Timeout)
	if err != nil {
		// Try the Tor Browser conventional port before giving up.
		if ctlAddr == "127.0.0.1:9051" {
			if ctl2, err2 := control.Dial("127.0.0.1:9151", o.Timeout); err2 == nil {
				ctl = ctl2
				ctlAddr = "127.0.0.1:9151"
			} else {
				rep.Note = "no tor control endpoint answered (tried 9051, 9151)"
				return rep
			}
		} else {
			rep.Note = fmt.Sprintf("control %s unreachable: %v", ctlAddr, err)
			return rep
		}
	}
	defer ctl.Close()
	rep.Running = true
	rep.ControlAddr = ctlAddr
	phase, err := ctl.GetOne("status/bootstrap-phase")
	if err != nil {
		// Control answered but we cannot authenticate/read state:
		// presence without knowledge. Never claim protected.
		rep.State = "unknown"
		rep.Note = "control reachable but state unreadable (foreign instance without cookie?)"
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
	st.CircuitEstablished = rep.CircuitEstablished
	switch {
	case st.Ready():
		rep.State = lifecycle.Ready.String()
		rep.Protected = true
		rep.Note = "tor bootstrapped with a live circuit"
	default:
		rep.State = lifecycle.Bootstrapping.String()
		rep.Note = fmt.Sprintf("tor bootstrapping (%d%% tag %q)", st.Progress, st.Tag)
	}
	if o.SocksAddr != "" {
		rep.SocksAddr = o.SocksAddr
	} else {
		rep.SocksAddr = guessSocks(ctlAddr)
	}
	if err := lifecycle.ProbeSocks(rep.SocksAddr, o.Timeout); err != nil {
		rep.Note += "; SOCKS endpoint not answering: " + err.Error()
		rep.Protected = false
	}
	return rep
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
