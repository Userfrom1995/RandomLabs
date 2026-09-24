// Package lifecycle manages a private tor daemon instance: detect/reuse,
// launch-if-absent, readiness gating, and owned-vs-foreign shutdown.
//
// State machine (binding, from the research spec):
// ABSENT -> STARTING -> BOOTSTRAPPING -> READY -> STOPPING -> ABSENT,
// plus FOREIGN (reused, never owned, never killed).
package lifecycle

import (
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/diag"
)

// State is the lifecycle state of a tor instance.
type State int

const (
	// Absent means no usable tor was found.
	Absent State = iota
	// Starting means the tor child was spawned but auth is not done.
	Starting
	// Bootstrapping means tor is building circuits (progress < 100%).
	Bootstrapping
	// Ready means bootstrap 100% + done tag + usable circuit.
	Ready
	// Stopping means shutdown is in progress.
	Stopping
	// Foreign means a tor we did not start (reused, never killed).
	Foreign
)

// String renders the state for status output.
func (s State) String() string {
	switch s {
	case Absent:
		return "absent"
	case Starting:
		return "starting"
	case Bootstrapping:
		return "bootstrapping"
	case Ready:
		return "ready"
	case Stopping:
		return "stopping"
	case Foreign:
		return "foreign"
	default:
		return "unknown"
	}
}

// Instance describes a running tor (owned or foreign).
type Instance struct {
	DataDir     string
	SocksPort   int
	ControlPort int
	DNSPort     int
	// TransPort is the transparent TCP proxy port (0 when disabled).
	TransPort  int
	Pid        int
	Owned      bool
	CookiePath string

	cmd *exec.Cmd
	ctl *control.Client
}

// SocksAddr returns host:port for SOCKS clients.
func (in *Instance) SocksAddr() string {
	return net.JoinHostPort("127.0.0.1", strconv.Itoa(in.SocksPort))
}

// ControlAddr returns host:port for the control client.
func (in *Instance) ControlAddr() string {
	return net.JoinHostPort("127.0.0.1", strconv.Itoa(in.ControlPort))
}

// Control exposes the owning control connection (nil for foreign handles).
func (in *Instance) Control() *control.Client { return in.cmdCtl() }

func (in *Instance) cmdCtl() *control.Client { return in.ctl }

// RunAsCreds drops the spawned tor to an unprivileged identity (system-wide
// mode needs this so the firewall owner-UID exemption covers only tor).
type RunAsCreds struct {
	UID uint32
	GID uint32
}

// Options tune Launch and WaitReady.
type Options struct {
	// TorBinary is the tor executable (default: "tor" on PATH).
	TorBinary string
	// Timeout bounds the whole launch+bootstrap wait (default 120s).
	Timeout time.Duration
	// PollInterval for readiness polling (default 500ms).
	PollInterval time.Duration
	// ExtraTorrc lines are appended to the generated torrc
	// (bridge/passthrough config; M2 accepts but never requires them).
	// Lines that would override a torshim-managed key (listeners,
	// identity, daemon behavior) are rejected by ValidateExtraTorrc
	// and fail Launch closed instead of silently re-listening.
	ExtraTorrc []string
	// TransPort enables a transparent TCP proxy listener on 127.0.0.1 at
	// the given fixed port (0 disables; system-wide mode uses 9040 by
	// convention). Fixed (not auto) keeps firewall rules deterministic
	// and works on older tor builds without TransPort auto support.
	TransPort int
	// RunAs, when non-nil, chowns the fresh DataDirectory to the identity
	// and spawns tor under it (setuid/setgid). Nil means run as self.
	RunAs *RunAsCreds
	// TempParent overrides the parent dir for the fresh DataDirectory
	// (default: system temp). System-wide mode points it under the
	// session state dir so a reboot wipes tor data with the state.
	TempParent string
}

func (o *Options) withDefaults() Options {
	out := *o
	if out.TorBinary == "" {
		out.TorBinary = "tor"
	}
	if out.Timeout <= 0 {
		out.Timeout = 120 * time.Second
	}
	if out.PollInterval <= 0 {
		out.PollInterval = 500 * time.Millisecond
	}
	return out
}

// GenerateTorrc renders a private-instance torrc. socksPort and dnsPort are
// wrapper-picked free loopback ports baked in as fixed listeners: on real
// tor only ControlPortWriteToFile exists (SocksPortWriteToFile and
// DNSPortWriteToFile are rejected as unknown options), so auto+readback is
// used for the ControlPort only. transPort > 0 adds a fixed transparent
// proxy listener (system-wide mode).
func GenerateTorrc(dir string, extra []string, socksPort, dnsPort int) string {
	return GenerateTorrcTrans(dir, extra, 0, socksPort, dnsPort)
}

// managedTorrcKeys are torrc keywords owned by torshim. An ExtraTorrc
// line starting with one of these (case-insensitive) would add a second
// listener, move the identity, or change daemon behavior outside the
// wrapper's supervision, so it is rejected, never merged. "Include" is
// included: an included file could carry any of the above.
var managedTorrcKeys = map[string]bool{
	"datadirectory": true, "pidfile": true,
	"socksport": true, "socksportwritetofile": true,
	"sockslistenaddress": true,
	"controlport":        true, "controlportwritetofile": true,
	"controlsocket": true, "controlsocketwritetofile": true,
	"controllistenaddress": true,
	"dnsport":              true, "dnsportwritetofile": true, "dnslistenaddress": true,
	"transport": true, "transportwritetofile": true, "translistenaddress": true,
	"natdport": true, "natdlistenaddress": true,
	"cookieauthentication": true, "cookieauthfile": true,
	"cookieauthfilegroupreadable": true,
	"log":                         true, "runasdaemon": true, "user": true, "group": true,
	"owningcontrollerprocess": true, "__owningcontrollerprocess": true,
	"include": true,
}

// torrcKey extracts the keyword of a torrc line (lowercased). Empty lines
// and comments return "". Separators (space, tab, equals) are all cut.
func torrcKey(line string) string {
	line = strings.TrimSpace(line)
	if line == "" || strings.HasPrefix(line, "#") {
		return ""
	}
	if i := strings.IndexAny(line, " \t="); i >= 0 {
		line = line[:i]
	}
	return strings.ToLower(line)
}

// ValidateExtraTorrc rejects ExtraTorrc lines that would override a
// torshim-managed key. Fail-closed: callers must refuse to launch when
// this errors instead of dropping the lines silently.
func ValidateExtraTorrc(extra []string) error {
	var bad []string
	for _, ln := range extra {
		if k := torrcKey(ln); k != "" && managedTorrcKeys[k] {
			bad = append(bad, strings.TrimSpace(ln))
		}
	}
	if len(bad) > 0 {
		return fmt.Errorf("lifecycle: ExtraTorrc overrides torshim-managed key(s): %s (managed keys cannot be overridden; use bridge/pluggable-transport lines instead)",
			strings.Join(bad, "; "))
	}
	return nil
}

// GenerateTorrcTrans is GenerateTorrc with an optional fixed TransPort.
// socksPort and dnsPort must be wrapper-picked free ports (see
// pickListenerPorts): they are rendered as fixed 127.0.0.1 listeners
// because real tor has no SocksPortWriteToFile/DNSPortWriteToFile option.
func GenerateTorrcTrans(dir string, extra []string, transPort, socksPort, dnsPort int) string {
	var b strings.Builder
	b.WriteString("# Generated by torshim. Do not edit.\n")
	fmt.Fprintf(&b, "DataDirectory %s\n", dir)
	fmt.Fprintf(&b, "PidFile %s\n", filepath.Join(dir, "tor.pid"))
	fmt.Fprintf(&b, "SocksPort 127.0.0.1:%d\n", socksPort)
	b.WriteString("ControlPort 127.0.0.1:auto\n")
	fmt.Fprintf(&b, "ControlPortWriteToFile %s\n", filepath.Join(dir, "control-port"))
	fmt.Fprintf(&b, "DNSPort 127.0.0.1:%d\n", dnsPort)
	b.WriteString("CookieAuthentication 1\n")
	fmt.Fprintf(&b, "CookieAuthFile %s\n", filepath.Join(dir, "control_auth_cookie"))
	fmt.Fprintf(&b, "Log notice file %s\n", filepath.Join(dir, "notices.log"))
	if transPort > 0 {
		fmt.Fprintf(&b, "TransPort 127.0.0.1:%d IsolateClientAddr IsolateClientProtocol\n", transPort)
	}
	b.WriteString("SafeSocks 1\n")
	b.WriteString("AutomapHostsOnResolve 1\n")
	b.WriteString("VirtualAddrNetworkIPv4 10.192.0.0/10\n")
	for _, ln := range extra {
		ln = strings.TrimSpace(ln)
		if ln == "" || strings.HasPrefix(ln, "#") {
			continue
		}
		// Defense in depth: even if a caller skips ValidateExtraTorrc,
		// a managed-key line never reaches the torrc (Launch validates
		// first and fails closed with the offending line named).
		if k := torrcKey(ln); k != "" && managedTorrcKeys[k] {
			continue
		}
		b.WriteString(ln + "\n")
	}
	return b.String()
}

// Launch starts a private tor instance and blocks until readiness or timeout.
// Ownership: tor is spawned with __OwningControllerProcess, then TAKEOWNERSHIP
// is issued over the single owning control connection, so a wrapper crash
// exits the owned tor instead of orphaning it.
func Launch(o Options) (*Instance, error) {
	o = o.withDefaults()
	// Fail closed before creating anything: a managed-key override
	// would otherwise add an unsupervised listener or move identity.
	if err := ValidateExtraTorrc(o.ExtraTorrc); err != nil {
		return nil, err
	}
	if _, err := exec.LookPath(o.TorBinary); err != nil {
		return nil, fmt.Errorf("lifecycle: tor binary %q not found on PATH (install tor first): %w", o.TorBinary, err)
	}
	// SOCKS/DNS listeners use wrapper-picked fixed ports (real tor has no
	// SocksPortWriteToFile/DNSPortWriteToFile), chosen before the temp dir
	// so a pick failure needs no cleanup.
	socksPort, dnsPort, err := pickListenerPorts(o.TransPort)
	if err != nil {
		return nil, err
	}
	dir, err := os.MkdirTemp(o.TempParent, "torshim-*")
	if err != nil {
		return nil, fmt.Errorf("lifecycle: mkdtemp: %w", err)
	}
	// Absolute DataDirectory is required (relative paths break pid/lock logic).
	abs, err := filepath.Abs(dir)
	if err != nil {
		abs = dir
	}
	torrcPath := filepath.Join(abs, "torrc")
	if err := os.WriteFile(torrcPath, []byte(GenerateTorrcTrans(abs, o.ExtraTorrc, o.TransPort, socksPort, dnsPort)), 0o600); err != nil {
		os.RemoveAll(abs)
		return nil, fmt.Errorf("lifecycle: write torrc: %w", err)
	}
	if o.RunAs != nil {
		// The child will run unprivileged, so hand it the directory first.
		// Root keeps control-channel access (cookie is world-readable to
		// uid 0 regardless of ownership).
		if err := chownTree(abs, int(o.RunAs.UID), int(o.RunAs.GID)); err != nil {
			os.RemoveAll(abs)
			return nil, fmt.Errorf("lifecycle: chown datadir for RunAs: %w", err)
		}
	}
	self := os.Getpid()
	cmd := exec.Command(o.TorBinary,
		"-f", torrcPath,
		"--__OwningControllerProcess", strconv.Itoa(self),
	)
	// Keep RunAsDaemon 0: the wrapper supervises the child directly.
	logF, err := os.OpenFile(filepath.Join(abs, "stdout.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		os.RemoveAll(abs)
		return nil, fmt.Errorf("lifecycle: open stdout.log: %w", err)
	}
	defer logF.Close()
	cmd.Stdout = logF
	cmd.Stderr = logF
	// New process group so Ctrl-C forwarding stays explicit, not inherited.
	// Platform-specific spawn attributes (setuid lives here on Linux).
	if err := applySpawnAttrs(cmd, o.RunAs); err != nil {
		os.RemoveAll(abs)
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		os.RemoveAll(abs)
		return nil, fmt.Errorf("lifecycle: spawn tor: %w", err)
	}
	diag.Logf(diag.Info, diag.StageLife, "spawned tor pid=%d binary=%q data_dir=%s torrc=%s",
		cmd.Process.Pid, o.TorBinary, abs, torrcPath)
	in := &Instance{DataDir: abs, Owned: true, Pid: cmd.Process.Pid, cmd: cmd}
	deadline := time.Now().Add(o.Timeout)
	cleanup := func(err error) (*Instance, error) {
		in.stopOwned()
		os.RemoveAll(abs)
		return nil, err
	}
	// STARTING gate: the control port file AND cookie file must exist.
	// (Listener-without-cookie is a known tor startup race.) SOCKS/DNS
	// ports are wrapper-picked fixed values known upfront, so there is no
	// port file to wait for; a tor that fails to bind them never reaches
	// control readiness and fails closed below.
	ctlPort, err := waitPortFile(filepath.Join(abs, "control-port"), deadline)
	if err != nil {
		return cleanup(fmt.Errorf("lifecycle: starting: %w", err))
	}
	cookie := filepath.Join(abs, "control_auth_cookie")
	if err := waitFile(cookie, deadline); err != nil {
		return cleanup(fmt.Errorf("lifecycle: starting: cookie: %w", err))
	}
	in.SocksPort, in.ControlPort, in.DNSPort = socksPort, ctlPort, dnsPort
	in.TransPort = o.TransPort
	in.CookiePath = cookie
	ctl, err := control.Dial(in.ControlAddr(), 10*time.Second)
	if err != nil {
		return cleanup(fmt.Errorf("lifecycle: starting: dial control: %w", err))
	}
	in.ctl = ctl
	if err := ctl.AuthCookie(cookie); err != nil {
		return cleanup(fmt.Errorf("lifecycle: starting: auth: %w", err))
	}
	if err := ctl.TakeOwnership(); err != nil {
		return cleanup(fmt.Errorf("lifecycle: starting: take ownership: %w", err))
	}
	if err := WaitReady(ctl, deadline, o.PollInterval); err != nil {
		diag.Logf(diag.Error, diag.StageReady, "gate bootstrap/circuit: FAIL (%v)", err)
		return cleanup(err)
	}
	diag.Logf(diag.Info, diag.StageReady, "gate bootstrap=100%% (done): pass")
	diag.Logf(diag.Info, diag.StageReady, "gate circuit-established: pass")
	// The SOCKS listener is a fixed wrapper-picked port, so prove it
	// serves SOCKS (not just TCP-open) before handing the instance out.
	// DNS liveness is verified downstream by the system-wide dnsQuery
	// gate; per-app/shell paths only need SOCKS here.
	if err := ProbeSocks(in.SocksAddr(), 5*time.Second); err != nil {
		diag.Logf(diag.Error, diag.StageReady, "gate socks-handshake %s: FAIL (%v)", in.SocksAddr(), err)
		return cleanup(fmt.Errorf("lifecycle: socks listener %s not serving: %w", in.SocksAddr(), err))
	}
	diag.Logf(diag.Info, diag.StageReady, "gate socks-handshake %s: pass", in.SocksAddr())
	return in, nil
}

// pickFreePort asks the kernel for a currently-free loopback TCP port and
// releases it. A bind race remains (tiny window, localhost only); Launch
// fails closed if tor cannot bind the picked port.
func pickFreePort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, fmt.Errorf("lifecycle: pick free port: %w", err)
	}
	defer ln.Close()
	addr, ok := ln.Addr().(*net.TCPAddr)
	if !ok || addr.Port <= 0 || addr.Port > 65535 {
		return 0, fmt.Errorf("lifecycle: kernel returned bad listener addr %v", ln.Addr())
	}
	return addr.Port, nil
}

// pickListenerPorts returns distinct free loopback ports for the fixed
// SOCKS and DNS listeners, avoiding the fixed TransPort when enabled.
func pickListenerPorts(transPort int) (socks, dns int, err error) {
	for i := 0; i < 25; i++ {
		socks, err = pickFreePort()
		if err != nil {
			return 0, 0, err
		}
		dns, err = pickFreePort()
		if err != nil {
			return 0, 0, err
		}
		if socks != dns && socks != transPort && dns != transPort {
			return socks, dns, nil
		}
	}
	return 0, 0, fmt.Errorf("lifecycle: could not pick distinct free listener ports")
}

// WaitReady polls GETINFO until the binding readiness gate passes:
// bootstrap PROGRESS=100 + TAG=done AND circuit-established == 1
// (falling back to a BUILT line in circuit-status). It never reports
// ready early; on timeout it surfaces the failure.
func WaitReady(ctl *control.Client, deadline time.Time, poll time.Duration) error {
	if poll <= 0 {
		poll = 500 * time.Millisecond
	}
	var last control.BootstrapState
	prevTag := ""
	nextMilestone := 25
	for {
		if time.Now().After(deadline) {
			return fmt.Errorf("lifecycle: tor not ready within deadline (last bootstrap %d%% tag %q circuit %v): bootstrapping timed out",
				last.Progress, last.Tag, last.CircuitEstablished)
		}
		phase, err := ctl.GetOne("status/bootstrap-phase")
		if err != nil {
			return fmt.Errorf("lifecycle: bootstrapping: GETINFO bootstrap-phase: %w", err)
		}
		last = control.ParseBootstrapPhase(phase)
		est := false
		if v, err := ctl.GetOne("status/circuit-established"); err == nil {
			est = control.ParseCircuitEstablished(v)
		} else if dump, err2 := ctl.GetOne("circuit-status"); err2 == nil {
			est = control.HasBuiltCircuit(dump)
		} else {
			return fmt.Errorf("lifecycle: bootstrapping: circuit query: %w", err)
		}
		last.CircuitEstablished = est
		// Owner acceptance list (-v): bootstrap transitions at 25/50/75/100
		// percent with their tags; tag handoffs at -vv; per-poll detail at -vvv.
		if last.Progress >= nextMilestone {
			diag.Logf(diag.Info, diag.StageReady, "bootstrap %d%% tag %q", last.Progress, last.Tag)
			for nextMilestone <= 100 && last.Progress >= nextMilestone {
				nextMilestone += 25
			}
		}
		if last.Tag != "" && last.Tag != prevTag {
			if prevTag != "" {
				diag.Logf(diag.Debug, diag.StageReady, "bootstrap tag %q -> %q at %d%%", prevTag, last.Tag, last.Progress)
			}
			prevTag = last.Tag
		}
		diag.Logf(diag.Trace, diag.StageReady, "poll progress=%d%% tag=%q circuit=%v",
			last.Progress, last.Tag, last.CircuitEstablished)
		if last.Ready() {
			return nil
		}
		time.Sleep(poll)
	}
}

// ProbeSocks performs a real SOCKS5 handshake (not just TCP connect) against
// addr. TCP-open proves nothing; a valid handshake proves a SOCKS server.
func ProbeSocks(addr string, timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return err
	}
	if _, err := conn.Write([]byte{0x05, 0x01, 0x00}); err != nil {
		return fmt.Errorf("lifecycle: socks handshake write: %w", err)
	}
	resp := make([]byte, 2)
	if _, err := readFull(conn, resp); err != nil {
		return fmt.Errorf("lifecycle: socks handshake read: %w", err)
	}
	if resp[0] != 0x05 || resp[1] != 0x00 {
		return fmt.Errorf("lifecycle: not a SOCKS5 server (reply %02x %02x)", resp[0], resp[1])
	}
	return nil
}

func readFull(conn net.Conn, buf []byte) (int, error) {
	got := 0
	for got < len(buf) {
		n, err := conn.Read(buf[got:])
		got += n
		if err != nil {
			return got, err
		}
	}
	return got, nil
}

// ForeignTor describes a tor instance owned by someone else.
type ForeignTor struct {
	SocksAddr   string
	ControlAddr string
	Pid         int
	Version     string
	State       control.BootstrapState
}

// Detect checks the conventional endpoints (9050/9150 SOCKS, 9051/9151
// control) with real protocol handshakes. It returns nil when no usable
// foreign tor exists. Detected instances are FOREIGN: reuse, never kill.
func Detect(timeout time.Duration) (*ForeignTor, error) {
	if timeout <= 0 {
		timeout = 3 * time.Second
	}
	socksCandidates := []string{"127.0.0.1:9050", "127.0.0.1:9150"}
	ctlCandidates := []string{"127.0.0.1:9051", "127.0.0.1:9151"}
	var socksOK string
	for _, s := range socksCandidates {
		if err := ProbeSocks(s, timeout); err == nil {
			socksOK = s
			break
		}
	}
	for _, c := range ctlCandidates {
		ctl, err := control.Dial(c, timeout)
		if err != nil {
			continue
		}
		info, err := ctl.ProtocolInfo()
		_ = info
		if err != nil {
			ctl.Close()
			continue
		}
		// Pre-auth we can still read bootstrap state only after auth;
		// without the cookie we report presence but unknown readiness.
		f := &ForeignTor{ControlAddr: c, SocksAddr: socksOK}
		if phase, err := tryUnauthBootstrap(ctl); err == nil {
			f.State = phase
		}
		if v, err := tryUnauthGetOne(ctl, "version"); err == nil {
			f.Version = v
		}
		ctl.Close()
		if f.SocksAddr == "" {
			continue // control without SOCKS is not reusable for per-app
		}
		return f, nil
	}
	return nil, nil
}

func tryUnauthBootstrap(ctl *control.Client) (control.BootstrapState, error) {
	phase, err := ctl.GetOne("status/bootstrap-phase")
	if err != nil {
		return control.BootstrapState{}, err
	}
	st := control.ParseBootstrapPhase(phase)
	if v, err := ctl.GetOne("status/circuit-established"); err == nil {
		st.CircuitEstablished = control.ParseCircuitEstablished(v)
	}
	return st, nil
}

func tryUnauthGetOne(ctl *control.Client, key string) (string, error) {
	return ctl.GetOne(key)
}

// Stop shuts down an owned instance: close the owning control connection
// first (clean exit), then SIGTERM with grace, then SIGKILL. Foreign
// instances are never signaled; Stop on them just closes the connection.
func (in *Instance) Stop() error {
	if in == nil {
		return nil
	}
	if !in.Owned {
		if in.ctl != nil {
			in.ctl.Close()
			in.ctl = nil
		}
		return nil
	}
	return in.stopOwned()
}

func (in *Instance) stopOwned() error {
	var first error
	if in.ctl != nil {
		// Close-first: lets an owned tor exit cleanly on disconnect.
		if err := in.ctl.Close(); err != nil {
			first = err
		}
		in.ctl = nil
	}
	if in.cmd != nil && in.cmd.Process != nil {
		proc := in.cmd.Process
		done := make(chan error, 1)
		go func() { done <- in.cmd.Wait() }()
		// Only signal when the PID is the one we spawned.
		_ = signalTerm(proc)
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			_ = signalKill(proc)
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				if first == nil {
					first = errors.New("lifecycle: owned tor did not exit after SIGKILL")
				}
			}
		}
		in.cmd = nil
	}
	if in.DataDir != "" {
		os.RemoveAll(in.DataDir)
	}
	return first
}

// chownTree hands a fresh tree to the RunAs identity (Launch only, the
// directory was just created by us, so no symlink games are possible).
// Implemented per OS (unix chowns, other platforms refuse: RunAs is a
// Linux system-wide feature).
func chownTree(root string, uid, gid int) error {
	return chownTreeOS(root, uid, gid)
}

// waitPortFile polls a *WriteToFile port file ("127.0.0.1:PORT" or "PORT").
func waitPortFile(path string, deadline time.Time) (int, error) {
	for {
		raw, err := os.ReadFile(path)
		if err == nil {
			if port, perr := parsePortFile(strings.TrimSpace(string(raw))); perr == nil {
				return port, nil
			}
		}
		if time.Now().After(deadline) {
			return 0, fmt.Errorf("port file %s never appeared: %w", path, errOrTimeout(err))
		}
		time.Sleep(100 * time.Millisecond)
	}
}

// waitFile polls for a plain file (cookie) to exist with nonzero size.
func waitFile(path string, deadline time.Time) error {
	for {
		if fi, err := os.Stat(path); err == nil && fi.Size() > 0 {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("file %s never appeared", path)
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func errOrTimeout(err error) error {
	if err != nil {
		return err
	}
	return errors.New("timeout")
}

// parsePortFile accepts "PORT", "IP:PORT", or "[IP]:PORT" spellings.
func parsePortFile(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, errors.New("empty port file")
	}
	if h, p, err := net.SplitHostPort(s); err == nil {
		_ = h
		n, err := strconv.Atoi(strings.TrimSpace(p))
		if err != nil || n <= 0 || n > 65535 {
			return 0, fmt.Errorf("bad port %q", s)
		}
		return n, nil
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 || n > 65535 {
		return 0, fmt.Errorf("bad port %q", s)
	}
	return n, nil
}
