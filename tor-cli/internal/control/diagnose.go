// Diagnostic surface for `torshim --verbose`, `status --verbose`, `newnym`
// and `doctor`: read-only control-protocol getters plus identity rotation.
//
// Everything here is side-effect free except Newnym (which asks tor to
// build fresh circuits). No behavior change to the binding readiness gate.
package control

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// ErrRateLimited is wrapped when tor refuses SIGNAL NEWNYM as too frequent.
// Tor enforces roughly 10 seconds between rotations; callers must surface
// the wait instead of pretending the identity changed.
var ErrRateLimited = errors.New("control: NEWNYM rate-limited by tor")

// CircuitSummary counts circuits by state from a circuit-status dump.
type CircuitSummary struct {
	Total     int
	Built     int
	Extending int // LAUNCHED + EXTENDED: still being built
	Failed    int // FAILED + CLOSED
	Other     int
}

// HasBuilt reports whether at least one usable circuit exists.
func (s CircuitSummary) HasBuilt() bool { return s.Built > 0 }

// SummarizeCircuits parses a "circuit-status" dump (one "<id> <STATUS> ..."
// line per circuit) into counts. Unknown statuses land in Other, never in
// Built: a circuit only counts as usable when tor says BUILT.
func SummarizeCircuits(dump string) CircuitSummary {
	var s CircuitSummary
	for _, ln := range strings.Split(dump, "\n") {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		fields := strings.Fields(ln)
		if len(fields) < 2 {
			s.Other++
			continue
		}
		s.Total++
		switch strings.ToUpper(fields[1]) {
		case "BUILT":
			s.Built++
		case "LAUNCHED", "EXTENDED", "APATH":
			s.Extending++
		case "FAILED", "CLOSED":
			s.Failed++
		default:
			s.Other++
		}
	}
	return s
}

// StreamSummary counts streams from a stream-status dump.
type StreamSummary struct {
	Total     int
	Succeeded int
}

// SummarizeStreams parses a "stream-status" dump (one "<id> <STATUS> ..."
// line per stream). A stream only counts as delivered on SUCCEEDED.
func SummarizeStreams(dump string) StreamSummary {
	var s StreamSummary
	for _, ln := range strings.Split(dump, "\n") {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		fields := strings.Fields(ln)
		if len(fields) < 2 {
			continue
		}
		s.Total++
		if strings.ToUpper(fields[1]) == "SUCCEEDED" {
			s.Succeeded++
		}
	}
	return s
}

// CountDumpLines counts non-empty lines in a multi-line dump (entry guards,
// address maps). Empty dump means none, never an error.
func CountDumpLines(dump string) int {
	n := 0
	for _, ln := range strings.Split(dump, "\n") {
		if strings.TrimSpace(ln) != "" {
			n++
		}
	}
	return n
}

// Diagnostics is the read-only verbose surface collected over one
// authenticated control connection. Optional fields stay zero/empty when
// the tor version does not advertise them; required readiness fields
// (Bootstrap, CircuitEstablished) are always populated or Collect fails.
type Diagnostics struct {
	Version            string
	Bootstrap          BootstrapState
	CircuitEstablished bool
	Circuits           CircuitSummary
	Streams            StreamSummary
	Guards             int
	TrafficRead        uint64
	TrafficWritten     uint64
	HasTraffic         bool
	SocksListeners     string
	ControlListeners   string
	DNSListeners       string
}

// optionalGetOne is GetOne that tolerates missing keys: older tor builds
// and minimal stubs do not advertise every GETINFO key, and verbose output
// must degrade to fewer lines, never to an error.
func optionalGetOne(c *Client, key string) string {
	v, err := c.GetOne(key)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(v)
}

// CollectDiagnostics gathers the verbose surface. Bootstrap and circuit
// state are required (a control endpoint that cannot answer them is as
// useless as absent); every other key is best-effort.
func CollectDiagnostics(c *Client) (*Diagnostics, error) {
	d := &Diagnostics{}
	phase, err := c.GetOne("status/bootstrap-phase")
	if err != nil {
		return nil, fmt.Errorf("control: diagnostics need bootstrap state: %w", err)
	}
	d.Bootstrap = ParseBootstrapPhase(phase)
	if v, err := c.GetOne("status/circuit-established"); err == nil {
		d.CircuitEstablished = ParseCircuitEstablished(v)
	} else if dump, err2 := c.GetOne("circuit-status"); err2 == nil {
		d.CircuitEstablished = HasBuiltCircuit(dump)
	} else {
		return nil, fmt.Errorf("control: diagnostics need circuit state: %w", err)
	}
	d.Bootstrap.CircuitEstablished = d.CircuitEstablished
	d.Version = optionalGetOne(c, "version")
	if dump := optionalGetOne(c, "circuit-status"); dump != "" {
		d.Circuits = SummarizeCircuits(dump)
	}
	if dump := optionalGetOne(c, "stream-status"); dump != "" {
		d.Streams = SummarizeStreams(dump)
	}
	if dump := optionalGetOne(c, "entry-guards"); dump != "" {
		d.Guards = CountDumpLines(dump)
	}
	if r, w := optionalGetOne(c, "traffic/read"), optionalGetOne(c, "traffic/written"); r != "" && w != "" {
		if rn, err1 := strconv.ParseUint(strings.TrimSpace(r), 10, 64); err1 == nil {
			if wn, err2 := strconv.ParseUint(strings.TrimSpace(w), 10, 64); err2 == nil {
				d.TrafficRead, d.TrafficWritten, d.HasTraffic = rn, wn, true
			}
		}
	}
	d.SocksListeners = optionalGetOne(c, "net/listeners/socks")
	d.ControlListeners = optionalGetOne(c, "net/listeners/control")
	d.DNSListeners = optionalGetOne(c, "net/listeners/dns")
	return d, nil
}

// HumanBytes renders a byte count for verbose output (deterministic,
// one decimal, binary units).
func HumanBytes(n uint64) string {
	if n < 1024 {
		return fmt.Sprintf("%d B", n)
	}
	nf := float64(n)
	for _, u := range []string{"KB", "MB", "GB", "TB"} {
		nf /= 1024.0
		if nf < 1024.0 || u == "TB" {
			return fmt.Sprintf("%.1f %s", nf, u)
		}
	}
	return fmt.Sprintf("%d B", n)
}

// Text renders the deterministic verbose block. Missing optional fields
// are omitted, never blank: the block always fits what tor answered.
func (d *Diagnostics) Text() string {
	var b strings.Builder
	if d.Version != "" {
		fmt.Fprintf(&b, "tor version: %s\n", d.Version)
	}
	fmt.Fprintf(&b, "bootstrap: %d%% (tag %q)\n", d.Bootstrap.Progress, d.Bootstrap.Tag)
	fmt.Fprintf(&b, "circuit: established=%v (%d built / %d total, %d streams)\n",
		d.CircuitEstablished, d.Circuits.Built, d.Circuits.Total, d.Streams.Total)
	if d.Guards > 0 {
		fmt.Fprintf(&b, "entry guards: %d\n", d.Guards)
	}
	if d.HasTraffic {
		fmt.Fprintf(&b, "traffic: read %s (%d B), written %s (%d B)\n",
			HumanBytes(d.TrafficRead), d.TrafficRead,
			HumanBytes(d.TrafficWritten), d.TrafficWritten)
	}
	if d.SocksListeners != "" {
		fmt.Fprintf(&b, "listeners: socks=%q", d.SocksListeners)
		if d.ControlListeners != "" {
			fmt.Fprintf(&b, " control=%q", d.ControlListeners)
		}
		if d.DNSListeners != "" {
			fmt.Fprintf(&b, " dns=%q", d.DNSListeners)
		}
		b.WriteString("\n")
	}
	return b.String()
}

// Newnym asks tor to close current circuits and build fresh ones (identity
// rotation without restart). Tor rate-limits rotations to roughly one per
// 10 seconds: a refusal surfaces as ErrRateLimited carrying the server
// message plus the wait, so callers can report it instead of claiming a
// rotation that never happened.
func (c *Client) Newnym() error {
	if _, err := c.send("SIGNAL NEWNYM"); err != nil {
		var se *StatusError
		if errors.As(err, &se) && (se.Code == 515 || strings.Contains(strings.ToLower(se.Line), "rate")) {
			return fmt.Errorf("%w: %s (wait ~10s between rotations)", ErrRateLimited, strings.TrimSpace(se.Line))
		}
		return fmt.Errorf("control: SIGNAL NEWNYM: %w", err)
	}
	return nil
}
