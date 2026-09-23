// Package control is a minimal Tor control-protocol (v1) client over TCP.
//
// It implements exactly what the torshim M2 lifecycle needs: PROTOCOLINFO
// probing, cookie authentication, GETINFO status queries, TAKEOWNERSHIP, and
// bootstrap/circuit readiness parsing. Stdlib only; no event subscription
// (readiness uses polling per the research spec).
package control

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

// ErrBadAuth is returned when the control port rejects our cookie (515).
// Per the research spec this means a foreign instance: reusable, never killed.
var ErrBadAuth = errors.New("control: authentication rejected (foreign instance?)")

// DefaultTimeout bounds any single control operation.
const DefaultTimeout = 10 * time.Second

// Client is a single authenticated (or pre-auth) control connection.
type Client struct {
	conn net.Conn
	r    *bufio.Reader
}

// Dial opens a control connection to addr (host:port).
func Dial(addr string, timeout time.Duration) (*Client, error) {
	if timeout <= 0 {
		timeout = DefaultTimeout
	}
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return nil, fmt.Errorf("control: dial %s: %w", addr, err)
	}
	return &Client{conn: conn, r: bufio.NewReader(conn)}, nil
}

// Close releases the connection. For an owned instance this lets tor exit
// cleanly (die-on-disconnect via TAKEOWNERSHIP), so callers must close first
// and only then fall back to signals.
func (c *Client) Close() error {
	return c.conn.Close()
}

// SetDeadline applies a read/write deadline to the underlying connection.
func (c *Client) SetDeadline(t time.Time) error {
	return c.conn.SetDeadline(t)
}

// send writes one command line and collects the reply. A successful reply is
// a run of "250-..." / "250+..." lines terminated by "250 ...". Any 4xx/5xx
// first line is returned as an error carrying the status code.
func (c *Client) send(cmd string) ([]string, error) {
	if err := c.conn.SetDeadline(time.Now().Add(DefaultTimeout)); err != nil {
		return nil, err
	}
	if _, err := fmt.Fprintf(c.conn, "%s\r\n", cmd); err != nil {
		return nil, fmt.Errorf("control: write %q: %w", cmd, err)
	}
	var out []string
	for {
		line, err := c.r.ReadString('\n')
		if err != nil {
			return nil, fmt.Errorf("control: read reply to %q: %w", cmd, err)
		}
		line = strings.TrimRight(line, "\r\n")
		if len(line) < 4 {
			return nil, fmt.Errorf("control: malformed reply line %q", line)
		}
		code, rest := line[:3], line[3:]
		if code == "650" {
			continue // async event; M2 never subscribes, but tolerate strays
		}
		if strings.HasPrefix(code, "4") || strings.HasPrefix(code, "5") {
			status, _ := strconv.Atoi(code)
			return nil, &StatusError{Code: status, Cmd: cmd, Line: line}
		}
		if code != "250" {
			return nil, fmt.Errorf("control: unexpected reply %q to %q", line, cmd)
		}
		if strings.HasPrefix(rest, "+") {
			// Multi-line data block terminated by a lone ".". The "+key="
			// header fragment is NOT a data line: emitting it would let
			// GetInfo match the key with an empty value and drop the real
			// dump that follows. Collect only the lines up to ".".
			for {
				dl, err := c.r.ReadString('\n')
				if err != nil {
					return nil, fmt.Errorf("control: read data block: %w", err)
				}
				dl = strings.TrimRight(dl, "\r\n")
				if dl == "." {
					break
				}
				out = append(out, dl)
			}
			continue
		}
		if strings.HasPrefix(rest, "-") {
			out = append(out, rest[1:])
			continue
		}
		if strings.HasPrefix(rest, " ") {
			if body := strings.TrimPrefix(rest, " "); body != "OK" {
				out = append(out, body)
			}
			break
		}
		return nil, fmt.Errorf("control: malformed reply %q", line)
	}
	return out, nil
}

// StatusError is a non-250 control reply.
type StatusError struct {
	Code int
	Cmd  string
	Line string
}

func (e *StatusError) Error() string {
	return fmt.Sprintf("control: %q failed: %s", e.Cmd, e.Line)
}

// ProtocolInfo issues PROTOCOLINFO (legal pre-auth) and returns raw lines.
func (c *Client) ProtocolInfo() ([]string, error) {
	return c.send("PROTOCOLINFO")
}

// AuthCookie reads a 32-byte cookie file, hex-encodes it, and authenticates.
// A 515 reply maps to ErrBadAuth (foreign instance: reuse, never kill).
func (c *Client) AuthCookie(cookiePath string) error {
	raw, err := os.ReadFile(cookiePath)
	if err != nil {
		return fmt.Errorf("control: read cookie %s: %w", cookiePath, err)
	}
	if len(raw) != 32 {
		return fmt.Errorf("control: cookie %s has %d bytes, want 32", cookiePath, len(raw))
	}
	hex := ""
	for _, b := range raw {
		hex += fmt.Sprintf("%02X", b)
	}
	if _, err := c.send("AUTHENTICATE " + hex); err != nil {
		var se *StatusError
		if errors.As(err, &se) && se.Code == 515 {
			return ErrBadAuth
		}
		return err
	}
	return nil
}

// GetInfo fetches one or more keys. Single-key replies arrive as
// "key=value" lines; multi-line data blocks (250+key= ... .) arrive as bare
// dump lines with no key prefix. The map holds the raw value strings;
// continuation lines are joined onto the last matched key so a circuit-status
// dump is never lost.
func (c *Client) GetInfo(keys ...string) (map[string]string, error) {
	lines, err := c.send("GETINFO " + strings.Join(keys, " "))
	if err != nil {
		return nil, err
	}
	got := make(map[string]string, len(keys))
	// A lone "+key=" data block carries no per-line key prefix, so for a
	// single-key query bare lines can only belong to that key.
	lastKey := ""
	if len(keys) == 1 {
		lastKey = keys[0]
	}
	for _, ln := range lines {
		matched := false
		for _, k := range keys {
			if strings.HasPrefix(ln, k+"=") {
				got[k] = strings.TrimPrefix(ln, k+"=")
				lastKey = k
				matched = true
			}
		}
		if !matched && lastKey != "" {
			if cur, ok := got[lastKey]; ok && cur != "" {
				got[lastKey] = cur + "\n" + ln
			} else {
				got[lastKey] = ln
			}
		}
	}
	return got, nil
}

// GetOne is GetInfo for a single key; missing keys are an error.
func (c *Client) GetOne(key string) (string, error) {
	got, err := c.GetInfo(key)
	if err != nil {
		return "", err
	}
	v, ok := got[key]
	if !ok {
		return "", fmt.Errorf("control: GETINFO %s: key absent in reply", key)
	}
	return v, nil
}

// TakeOwnership sends TAKEOWNERSHIP then drops __OwningControllerProcess so
// the owned tor dies on disconnect without PID polling (post-Vidalia fix).
func (c *Client) TakeOwnership() error {
	if _, err := c.send("TAKEOWNERSHIP"); err != nil {
		return fmt.Errorf("control: TAKEOWNERSHIP: %w", err)
	}
	if _, err := c.send("RESETCONF __OwningControllerProcess"); err != nil {
		return fmt.Errorf("control: RESETCONF __OwningControllerProcess: %w", err)
	}
	return nil
}

// Signal sends a control signal (e.g. NEWNYM). Only used on owned instances.
func (c *Client) Signal(name string) error {
	if _, err := c.send("SIGNAL " + name); err != nil {
		return fmt.Errorf("control: SIGNAL %s: %w", name, err)
	}
	return nil
}

// BootstrapState is the parsed readiness surface.
type BootstrapState struct {
	Progress           int
	Tag                string
	Summary            string
	CircuitEstablished bool
}

// Ready reports the binding readiness gate: bootstrap 100% AND done tag AND
// a usable circuit.
func (b BootstrapState) Ready() bool {
	return b.Progress == 100 && b.Tag == "done" && b.CircuitEstablished
}

// ParseBootstrapPhase parses a "status/bootstrap-phase" value such as:
// NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY="Done"
// Only PROGRESS (numeric) and TAG=done are trusted; tag sequences vary by
// Tor version so nothing else is hardcoded.
func ParseBootstrapPhase(value string) BootstrapState {
	st := BootstrapState{}
	for _, field := range strings.Fields(value) {
		if v, ok := strings.CutPrefix(field, "PROGRESS="); ok {
			if n, err := strconv.Atoi(v); err == nil {
				st.Progress = n
			}
		}
		if v, ok := strings.CutPrefix(field, "TAG="); ok {
			st.Tag = v
		}
		if v, ok := strings.CutPrefix(field, "SUMMARY="); ok {
			st.Summary = strings.Trim(v, "\"")
		}
	}
	return st
}

// ParseCircuitEstablished parses "status/circuit-established" ("1" usable).
func ParseCircuitEstablished(value string) bool {
	return strings.TrimSpace(value) == "1"
}

// HasBuiltCircuit scans a "circuit-status" dump for a BUILT line.
func HasBuiltCircuit(dump string) bool {
	for _, ln := range strings.Split(dump, "\n") {
		if strings.Contains(ln, " BUILT ") || strings.HasSuffix(strings.TrimSpace(ln), " BUILT") {
			return true
		}
	}
	return false
}
