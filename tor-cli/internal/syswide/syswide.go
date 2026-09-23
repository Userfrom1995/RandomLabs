// Package syswide implements Linux system-wide Tor routing for torshim M3:
// `sudo torshim connect` sends the whole system through Tor via a private
// tor instance (TransPort + DNSPort) plus kernel packet rules, and
// `torshim disconnect` restores the exact pre-connect state.
//
// Contract (from the research spec, Linux row):
//   - snapshot-first: firewall dumps plus resolv.conf bytes land in a
//     timestamped backup dir before any mutation;
//   - fail-closed ordering: tor must be bootstrapped before rules go in;
//     on disconnect tor dies first (traffic blackholes) and only then do
//     rules come out, so no window leaks clearnet;
//   - REDIRECT-only DNS capture: /etc/resolv.conf is never rewritten
//     (DHCP cannot clobber a redirect); the nat rule sends port-53 UDP to
//     the Tor DNSPort, which answers A/AAAA/PTR through the circuit;
//   - IPv6 is blocked for the session (REJECT, loopback and tor exempt):
//     no v6 exits in M3, documented in docs/limitations.md;
//   - no bare flushes: only chains/tables named torshim plus the two jump
//     rules that point at them are ever removed; foreign rules are untouched;
//   - idempotent: double connect reports already-connected, double
//     disconnect reports not-connected, both exit 0;
//   - reboot-safe: state lives under /run (tmpfs) and rules are in-memory,
//     so a reboot always equals disconnected; `repair` clears leftovers.
//
// macOS and Windows have no backend in M3: connect/disconnect refuse with
// an honest pointer (exit 4) instead of pretending. No stubs, no fake
// success. Unofficial frontend, not sponsored by The Tor Project.
package syswide

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Backend names.
const (
	BackendIptables = "iptables"
	BackendNft      = "nft"
)

// Conventional ports and names. TransPort is fixed (not auto) so firewall
// rules and docs stay deterministic; DNS/SOCKS/control stay auto.
const (
	DefaultTransPort = 9040
	NatChain         = "torshim-nat"
	FilterChain      = "torshim-filter"
	V6Chain          = "torshim-v6"
	NftTable         = "torshim"
	ResolvPath       = "/etc/resolv.conf"
)

// ErrUnsupportedOS is returned on non-Linux platforms (M4 owns the ports).
var ErrUnsupportedOS = errors.New("syswide: system-wide routing is Linux-only in M3 (macOS/Windows land in M4)")

// Runner executes privileged commands. The real runner shells out; tests
// inject a fake. RunWithStdin exists because *-restore reads dumps.
type Runner interface {
	LookPath(file string) (string, error)
	Run(name string, args ...string) (string, error)
	RunWithStdin(stdin, name string, args ...string) (string, error)
}

// RealRunner shells out to the host (needs root for connect/disconnect).
type RealRunner struct{}

func (RealRunner) LookPath(file string) (string, error) { return exec.LookPath(file) }

func (RealRunner) Run(name string, args ...string) (string, error) {
	out, err := exec.Command(name, args...).CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("syswide: %s %v: %w: %s", name, args, err, truncate(out, 500))
	}
	return string(out), nil
}

func (RealRunner) RunWithStdin(stdin, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Stdin = strings.NewReader(stdin)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("syswide: %s %v: %w: %s", name, args, err, truncate(out, 500))
	}
	return string(out), nil
}

func truncate(b []byte, n int) string {
	s := string(b)
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}

// ActiveState is the on-disk record of a live system-wide session.
// It is the idempotence key: present means connected (modulo repair).
type ActiveState struct {
	Backend     string `json:"backend"`
	TransPort   int    `json:"trans_port"`
	DNSPort     int    `json:"dns_port"`
	SocksPort   int    `json:"socks_port"`
	ControlPort int    `json:"control_port"`
	TorPid      int    `json:"tor_pid"`
	TorDataDir  string `json:"tor_data_dir"`
	TorUID      uint32 `json:"tor_uid"`
	TorUser     string `json:"tor_user"`
	BackupDir   string `json:"backup_dir"`
	CreatedAt   string `json:"created_at"`
}

// CookiePath derives the control cookie for the system tor instance.
func (s *ActiveState) CookiePath() string {
	return filepath.Join(s.TorDataDir, "control_auth_cookie")
}

// ControlAddr derives the control endpoint for the system tor instance.
func (s *ActiveState) ControlAddr() string {
	return fmt.Sprintf("127.0.0.1:%d", s.ControlPort)
}

// StateDir resolves the session directory: TORSHIM_STATEDIR override
// (tests, custom layouts) else /run/torshim (tmpfs: reboot-safe).
func StateDir() string {
	if v := os.Getenv("TORSHIM_STATEDIR"); v != "" {
		return v
	}
	return "/run/torshim"
}

func activePath(stateDir string) string { return filepath.Join(stateDir, "active.json") }

// LoadState reads the session record, or (nil, nil) when disconnected.
func LoadState(stateDir string) (*ActiveState, error) {
	raw, err := os.ReadFile(activePath(stateDir))
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("syswide: read state: %w", err)
	}
	var s ActiveState
	if err := json.Unmarshal(raw, &s); err != nil {
		return nil, fmt.Errorf("syswide: corrupt state file (run repair): %w", err)
	}
	return &s, nil
}

// SaveState persists the session record (root-only permissions).
func SaveState(stateDir string, s *ActiveState) error {
	if err := os.MkdirAll(stateDir, 0o700); err != nil {
		return fmt.Errorf("syswide: create state dir: %w", err)
	}
	raw, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	if s.CreatedAt == "" {
		s.CreatedAt = time.Now().UTC().Format(time.RFC3339)
		raw, _ = json.MarshalIndent(s, "", "  ")
	}
	if err := os.WriteFile(activePath(stateDir), append(raw, '\n'), 0o600); err != nil {
		return fmt.Errorf("syswide: write state: %w", err)
	}
	return nil
}

// ClearState removes the session record (backups are kept for forensics).
func ClearState(stateDir string) error {
	if err := os.Remove(activePath(stateDir)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("syswide: clear state: %w", err)
	}
	return nil
}

// RequireLinux fails closed on non-Linux platforms.
func RequireLinux() error {
	if runtime.GOOS != "linux" {
		return ErrUnsupportedOS
	}
	return nil
}
