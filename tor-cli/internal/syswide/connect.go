// Connect/disconnect/repair orchestration: fail-closed ordering, verify
// suite gating, idempotence, and byte-exact restore.

package syswide

import (
	"fmt"
	"math/rand"
	"net"
	"os"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
)

// DefaultTorUsers is the lookup order for the unprivileged tor identity.
// The firewall owner-UID exemption covers exactly this UID, so tor must
// not run as root (exempting root would exempt everything).
var DefaultTorUsers = []string{"tor", "debian-tor", "_tor", "toranon", "nobody"}

// Options tunes connect/disconnect/repair. Zero value is usable on Linux
// as root; tests override StateDir, Runner, and the hook fields.
type Options struct {
	StateDir  string // default StateDir()
	Backend   string // "auto" (default), "iptables", "nft"
	TorBinary string // default "tor"
	Timeout   time.Duration
	Force     bool   // overwrite a broken active session instead of refusing
	TorUser   string // override unprivileged identity (default: lookup order)
	TransPort int    // default DefaultTransPort

	Run     Runner
	GetEuid func() int
	Launch  func(lifecycle.Options) (*lifecycle.Instance, error)
	Stop    func(*lifecycle.Instance) error
	Probe   func(cookiePath, ctlAddr string, timeout time.Duration) error
	Resolve func(name string) (uint32, uint32, error)
	// PortFree pre-flight (default: bind 127.0.0.1:port) and DialTrans
	// post-apply check (default: real TCP dial) are hooks so tests can
	// run hermetically without real listeners.
	PortFree  func(port int) error
	DialTrans func(port int) error
	// PidAlive reports whether a tor PID is still running (default:
	// signal-0 probe). Hooked so tests can simulate dead/alive tor
	// without real signals. TermPid/KillPid send SIGTERM/SIGKILL
	// (hooked for the same reason).
	PidAlive func(pid int) bool
	TermPid  func(pid int) error
	KillPid  func(pid int) error
	// LockWait bounds how long Connect/Disconnect/Repair wait for a
	// concurrent system operation holding the session lock (default
	// 30s; a live holder means fail closed, a stale one gets reaped).
	LockWait time.Duration
}

func (o *Options) withDefaults() *Options {
	out := *o
	if out.StateDir == "" {
		out.StateDir = StateDir()
	}
	if out.Backend == "" {
		out.Backend = "auto"
	}
	if out.TorBinary == "" {
		out.TorBinary = "tor"
	}
	if out.Timeout <= 0 {
		out.Timeout = 120 * time.Second
	}
	if out.TransPort <= 0 {
		out.TransPort = DefaultTransPort
	}
	if out.Run == nil {
		out.Run = RealRunner{}
	}
	if out.GetEuid == nil {
		out.GetEuid = myEuid
	}
	if out.Launch == nil {
		out.Launch = lifecycle.Launch
	}
	if out.Stop == nil {
		out.Stop = func(in *lifecycle.Instance) error { return in.Stop() }
	}
	if out.Probe == nil {
		out.Probe = probeTorReady
	}
	if out.Resolve == nil {
		out.Resolve = lookupUIDGID
	}
	if out.PortFree == nil {
		out.PortFree = portFree
	}
	if out.DialTrans == nil {
		out.DialTrans = dialTransPort
	}
	if out.PidAlive == nil {
		out.PidAlive = pidAlive
	}
	if out.TermPid == nil {
		out.TermPid = termPid
	}
	if out.KillPid == nil {
		out.KillPid = killPid
	}
	if out.LockWait <= 0 {
		out.LockWait = 30 * time.Second
	}
	return &out
}

func lookupUIDGID(name string) (uint32, uint32, error) {
	u, err := user.Lookup(name)
	if err != nil {
		return 0, 0, err
	}
	uid64, err := strconv.ParseUint(u.Uid, 10, 32)
	if err != nil {
		return 0, 0, err
	}
	gid64, err := strconv.ParseUint(u.Gid, 10, 32)
	if err != nil {
		return 0, 0, err
	}
	return uint32(uid64), uint32(gid64), nil
}

// resolveBackend picks iptables or nft (auto prefers nft when present).
func resolveBackend(o *Options) (string, error) {
	switch o.Backend {
	case BackendIptables, BackendNft:
		return o.Backend, nil
	case "auto", "":
		if _, err := o.Run.LookPath("nft"); err == nil {
			return BackendNft, nil
		}
		return BackendIptables, nil
	default:
		return "", fmt.Errorf("syswide: unknown backend %q (want auto, iptables, nft)", o.Backend)
	}
}

func backendFor(name string, r Runner) interface {
	Ensure(*ActiveState) error
	Present() bool
	Remove() error
	Binaries() error
} {
	if name == BackendNft {
		return NftBackend{Run: r}
	}
	return IptablesBackend{Run: r}
}

func requireRoot(o *Options, verb string) error {
	if o.GetEuid() != 0 {
		return fmt.Errorf("syswide: refusing to %s system networking as uid %d: re-run with sudo", verb, o.GetEuid())
	}
	return nil
}

// VerifyRow is one line of the connect verify table.
type VerifyRow struct {
	Name   string
	OK     bool
	Detail string
}

// ConnectReport describes a connect outcome for CLI rendering.
type ConnectReport struct {
	State           *ActiveState
	AlreadyActive   bool
	Verify          []VerifyRow
	ResolvWarning   string
	BackupDir       string
	AllPassed       bool
}

// probeTorReady re-verifies a bootstrapped tor: dial, cookie-auth, then the
// binding readiness gate (bootstrap 100% + done + live circuit).
func probeTorReady(cookiePath, ctlAddr string, timeout time.Duration) error {
	if timeout <= 0 || timeout > 30*time.Second {
		timeout = 20 * time.Second
	}
	ctl, err := control.Dial(ctlAddr, 10*time.Second)
	if err != nil {
		return fmt.Errorf("control dial: %w", err)
	}
	defer ctl.Close()
	if err := ctl.AuthCookie(cookiePath); err != nil {
		return fmt.Errorf("control auth: %w", err)
	}
	return lifecycle.WaitReady(ctl, time.Now().Add(timeout), 500*time.Millisecond)
}

// dialTransPort proves the transparent proxy accepts TCP.
func dialTransPort(port int) error {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 5*time.Second)
	if err != nil {
		return err
	}
	return conn.Close()
}
// portFree fails closed when the TransPort is already taken.
func portFree(port int) error {
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return fmt.Errorf("syswide: TransPort %d already in use (another tor? --trans-port to override): %w", port, err)
	}
	_ = ln.Close()
	return nil
}

// resolveTorUser finds the unprivileged identity tor will run as.
func resolveTorUser(o *Options) (name string, uid, gid uint32, err error) {
	if o.TorUser != "" {
		uid, gid, err := o.Resolve(o.TorUser)
		if err != nil {
			return "", 0, 0, fmt.Errorf("syswide: --tor-user %q not resolvable: %w", o.TorUser, err)
		}
		if uid == 0 {
			return "", 0, 0, fmt.Errorf("syswide: refusing to run tor as root (owner exemption would cover everything)")
		}
		return o.TorUser, uid, gid, nil
	}
	for _, n := range DefaultTorUsers {
		if uid, gid, rerr := o.Resolve(n); rerr == nil {
			if uid == 0 {
				continue
			}
			return n, uid, gid, nil
		}
	}
	return "", 0, 0, fmt.Errorf("syswide: no unprivileged tor user found (tried %s); create one or pass --tor-user",
		strings.Join(DefaultTorUsers, ", "))
}

// dnsQuery sends a minimal A query to the Tor DNSPort and requires a
// well-formed response with a matching ID. Any QR response proves the Tor
// DNS path is alive; timeouts and malformed replies fail closed.
func dnsQuery(dnsPort int, timeout time.Duration) error {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	id := uint16(rand.Intn(65536))
	var q []byte
	q = append(q, byte(id>>8), byte(id))
	q = append(q, 0x01, 0x00) // RD
	q = append(q, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
	for _, label := range strings.Split("example.com", ".") {
		q = append(q, byte(len(label)))
		q = append(q, label...)
	}
	q = append(q, 0x00, 0x00, 0x01, 0x00, 0x01) // root, A, IN
	conn, err := net.DialTimeout("udp", fmt.Sprintf("127.0.0.1:%d", dnsPort), timeout)
	if err != nil {
		return fmt.Errorf("dns dial: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(timeout))
	if _, err := conn.Write(q); err != nil {
		return fmt.Errorf("dns write: %w", err)
	}
	resp := make([]byte, 512)
	n, err := conn.Read(resp)
	if err != nil {
		return fmt.Errorf("dns read (Tor DNSPort not answering?): %w", err)
	}
	if n < 12 || resp[0] != byte(id>>8) || resp[1] != byte(id) || resp[2]&0x80 == 0 {
		return fmt.Errorf("dns malformed response (not a Tor DNSPort?)")
	}
	return nil
}

// runVerify executes the connect verify suite. ok=false means the caller
// must roll back and fail closed.
func runVerify(o *Options, s *ActiveState) ([]VerifyRow, bool) {
	rows := []VerifyRow{}
	ok := true
	fail := func(name, detail string) {
		rows = append(rows, VerifyRow{Name: name, Detail: detail})
		ok = false
	}
	pass := func(name, detail string) {
		rows = append(rows, VerifyRow{Name: name, OK: true, Detail: detail})
	}
	if err := o.Probe(s.CookiePath(), s.ControlAddr(), 20*time.Second); err != nil {
		fail("tor-ready", err.Error())
	} else {
		pass("tor-ready", "bootstrap 100% + live circuit")
	}
	be := backendFor(s.Backend, o.Run)
	if !be.Present() {
		fail("rules-present", s.Backend+" rules missing right after apply")
	} else {
		pass("rules-present", s.Backend+" rules installed")
	}
	if err := o.DialTrans(s.TransPort); err != nil {
		fail("transport-open", err.Error())
	} else {
		pass("transport-open", fmt.Sprintf("127.0.0.1:%d accepts", s.TransPort))
	}
	if err := dnsQuery(s.DNSPort, 5*time.Second); err != nil {
		fail("dns-alive", err.Error())
	} else {
		pass("dns-alive", fmt.Sprintf("Tor DNSPort 127.0.0.1:%d answers", s.DNSPort))
	}
	if same, detail := VerifyResolvUnchanged(s.BackupDir); !same {
		// Warn-only: M3 never rewrites resolv.conf and capture is via
		// REDIRECT, so drift does not weaken protection.
		pass("resolv-untouched", "WARNING: "+detail)
	} else {
		pass("resolv-untouched", "unchanged from snapshot")
	}
	return rows, ok
}

// cleanupDataDir removes the owned tor datadir (including the control
// cookie) after tor death. Every connect/disconnect cycle must leave no
// trace under /run plus no cookie behind.
func cleanupDataDir(dir string) {
	if dir == "" || dir == "/" {
		return
	}
	_ = os.RemoveAll(dir)
}

// stopPidGraceful best-effort stops a stale tor PID: SIGTERM, grace wait,
// then SIGKILL. Errors are ignored (stale PID may already be gone).
func stopPidGraceful(o *Options, pid int) {
	alive := o.PidAlive
	if alive == nil {
		alive = pidAlive
	}
	term := o.TermPid
	if term == nil {
		term = termPid
	}
	kill := o.KillPid
	if kill == nil {
		kill = killPid
	}
	if pid <= 0 || !alive(pid) {
		return
	}
	_ = term(pid)
	deadline := time.Now().Add(5 * time.Second)
	for alive(pid) && time.Now().Before(deadline) {
		time.Sleep(100 * time.Millisecond)
	}
	if alive(pid) {
		_ = kill(pid)
	}
}

// rollback removes freshly applied rules, stops the tor we started, and
// drops the state record (the backup dir is kept for forensics).
// Fail-closed ordering matches Disconnect: tor dies first (redirects
// blackhole, nothing leaks), then rules come out, then state drops.
// The owned datadir is always removed so no control cookie leaks.
func rollback(o *Options, s *ActiveState, in *lifecycle.Instance) {
	if in != nil {
		_ = o.Stop(in)
		cleanupDataDir(s.TorDataDir)
		if in.DataDir != "" && in.DataDir != s.TorDataDir {
			cleanupDataDir(in.DataDir)
		}
	} else if s.TorPid > 0 {
		stopPidGraceful(o, s.TorPid)
		cleanupDataDir(s.TorDataDir)
	} else if s.TorDataDir != "" {
		cleanupDataDir(s.TorDataDir)
	}
	be := backendFor(s.Backend, o.Run)
	_ = be.Remove()
	_ = ClearState(o.StateDir)
}

// Connect brings the whole system through Tor. Fail-closed ordering:
// root gate, tor-user resolve, port check, snapshot, tor launch+readiness,
// state write, rules apply, verify suite. Any failure after mutation rolls
// back and reports the cause.
func Connect(o Options) (*ConnectReport, error) {
	po := o.withDefaults()
	if err := RequireLinux(); err != nil {
		return nil, err
	}
	if err := requireRoot(po, "route"); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(po.StateDir, 0o755); err == nil {
		_ = os.Chmod(po.StateDir, 0o755)
	}
	// Serialize with concurrent connect/disconnect/repair runs sharing
	// this state dir: without the lock two connects would both snapshot,
	// both launch tor, and both write active.json (orphaned tor + half
	// firewall). A live holder fails closed; a stale one gets reaped.
	lk, err := AcquireSessionLock(po.StateDir, po.PidAlive, po.LockWait)
	if err != nil {
		return nil, err
	}
	defer lk.Release()
	backendName, err := resolveBackend(po)
	if err != nil {
		return nil, err
	}
	be := backendFor(backendName, po.Run)
	if err := be.Binaries(); err != nil {
		return nil, err
	}
	if cur, err := LoadState(po.StateDir); err != nil {
		return nil, err
	} else if cur != nil {
		curBE := backendFor(cur.Backend, po.Run)
		if curBE.Present() {
			// Rules present alone is not enough: a dead tor plus
			// surviving rules blackholes traffic, so the fast path
			// requires tor liveness too. Dead-tor falls through to
			// the stale-session handling below (same as Repair).
			if po.PidAlive(cur.TorPid) {
				return &ConnectReport{State: cur, AlreadyActive: true, AllPassed: true}, nil
			}
		}
		if !po.Force {
			if curBE.Present() {
				return nil, fmt.Errorf("syswide: stale session found (tor dead, rules present but blackholing): re-run with --force to repair-then-connect, or run repair")
			}
			return nil, fmt.Errorf("syswide: stale session found (rules missing, tor may be dead): re-run with --force to repair-then-connect, or run repair")
		}
		// --force: stop the stale tor before clearing state, or the
		// previous instance keeps running orphaned next to the new one.
		stopPidGraceful(po, cur.TorPid)
		cleanupDataDir(cur.TorDataDir)
		_ = curBE.Remove()
		_ = ClearState(po.StateDir)
	}
	userName, uid, gid, err := resolveTorUser(po)
	if err != nil {
		return nil, err
	}
	if err := po.PortFree(po.TransPort); err != nil {
		return nil, err
	}
	backupDir, err := Snapshot(po.StateDir, backendName, po.Run)
	if err != nil {
		return nil, err
	}
	in, err := po.Launch(lifecycle.Options{
		TorBinary:  po.TorBinary,
		Timeout:    po.Timeout,
		TransPort:  po.TransPort,
		RunAs:      &lifecycle.RunAsCreds{UID: uid, GID: gid},
		TempParent: po.StateDir,
	})
	if err != nil {
		return nil, fmt.Errorf("syswide: system tor failed to bootstrap (no rules installed, nothing changed): %w", err)
	}
	s := &ActiveState{
		Backend:     backendName,
		TransPort:   po.TransPort,
		DNSPort:     in.DNSPort,
		SocksPort:   in.SocksPort,
		ControlPort: in.ControlPort,
		TorPid:      in.Pid,
		TorDataDir:  in.DataDir,
		TorUID:      uid,
		TorUser:     userName,
		BackupDir:   backupDir,
	}
	if err := SaveState(po.StateDir, s); err != nil {
		rollback(po, s, in)
		return nil, err
	}
	if err := be.Ensure(s); err != nil {
		rollback(po, s, in)
		return nil, fmt.Errorf("syswide: rule apply failed (rolled back): %w", err)
	}
	rows, vrfyOK := runVerify(po, s)
	rep := &ConnectReport{State: s, Verify: rows, BackupDir: backupDir, AllPassed: vrfyOK}
	if same, detail := VerifyResolvUnchanged(backupDir); !same {
		rep.ResolvWarning = detail
	}
	if !vrfyOK {
		rollback(po, s, in)
		return rep, fmt.Errorf("syswide: verify suite failed (rolled back, system untouched): see table")
	}
	// Record the post-connect firewall for forensics (best effort).
	_ = recordAfter(po, s)
	return rep, nil
}

func recordAfter(o *Options, s *ActiveState) error {
	switch s.Backend {
	case BackendNft:
		if dump, err := (NftBackend{Run: o.Run}.Dump()); err == nil {
			_ = os.WriteFile(filepath.Join(s.BackupDir, FileNftAfter), []byte(dump), 0o600)
		}
	default:
		if v4, v6, err := (IptablesBackend{Run: o.Run}.Dump()); err == nil {
			_ = os.WriteFile(filepath.Join(s.BackupDir, FileIptablesAfter), []byte(v4+"\n"+v6), 0o600)
		}
	}
	return nil
}

// DisconnectReport describes a disconnect outcome.
type DisconnectReport struct {
	WasConnected  bool
	StoppedTor    bool
	RemovedRules  bool
	Restored      bool
	PostVerifyOK  bool
	ResolvWarning string
}

// pidAlive reports whether pid is still running (see osutil_*.go).

// Disconnect restores the exact pre-connect state. Fail-closed ordering:
// stop tor first (redirects blackhole, nothing leaks), then remove rules,
// then replay the backup dump, then drop state, then post-verify that no
// torshim rules remain.
func Disconnect(o Options) (*DisconnectReport, error) {
	po := o.withDefaults()
	if err := RequireLinux(); err != nil {
		return nil, err
	}
	s, err := LoadState(po.StateDir)
	if err != nil {
		if po.GetEuid() != 0 {
			return nil, fmt.Errorf("syswide: cannot read %s as uid %d (re-run with sudo to inspect the system session): %w", activePath(po.StateDir), po.GetEuid(), err)
		}
		return nil, err
	}
	rep := &DisconnectReport{}
	if s == nil {
		return rep, nil // WasConnected=false: idempotent not-connected, no privilege needed
	}
	// A session exists: everything below mutates the system, so root is
	// now mandatory.
	if err := requireRoot(po, "restore"); err != nil {
		return nil, err
	}
	lk, err := AcquireSessionLock(po.StateDir, po.PidAlive, po.LockWait)
	if err != nil {
		return nil, err
	}
	defer lk.Release()
	// Re-read under the lock: a concurrent operation may have finished
	// while we waited, in which case there is nothing left to do.
	s, err = LoadState(po.StateDir)
	if err != nil {
		return nil, err
	}
	if s == nil {
		return rep, nil
	}
	rep.WasConnected = true
	be := backendFor(s.Backend, po.Run)
	// 1. Tor dies first: any surviving redirect blackholes instead of
	// leaking, and the owned instance must never outlive the session.
	wasAlive := po.PidAlive(s.TorPid)
	stopPidGraceful(po, s.TorPid)
	if wasAlive {
		rep.StoppedTor = true
	}
	// The owned datadir (including the control cookie) dies with tor:
	// every connect/disconnect cycle must leave no trace under /run.
	cleanupDataDir(s.TorDataDir)
	// 2. Remove only our rules (never a bare flush).
	_ = be.Remove()
	rep.RemovedRules = true
	// 3. Byte-exact firewall restore.
	if err := RestoreBackup(s.BackupDir, s.Backend, po.Run); err != nil {
		return rep, fmt.Errorf("syswide: disconnect incomplete, firewall restore failed (rules removed, backup at %s): %w", s.BackupDir, err)
	}
	rep.Restored = true
	// 4. Drop state, then post-verify no torshim rules remain.
	_ = ClearState(po.StateDir)
	rep.PostVerifyOK = !be.Present()
	if !rep.PostVerifyOK {
		return rep, fmt.Errorf("syswide: disconnect incomplete, torshim rules still present after restore")
	}
	if same, detail := VerifyResolvUnchanged(s.BackupDir); !same {
		rep.ResolvWarning = detail
	}
	return rep, nil
}

// RepairReport describes a repair outcome.
type RepairReport struct {
	Actions []string
}

// Repair clears leftovers without touching foreign state: torshim rules
// are removed whenever present, and a session record pointing at a dead
// tor or missing rules is dropped (backups kept). A healthy active
// session is left alone.
func Repair(o Options) (*RepairReport, error) {
	po := o.withDefaults()
	if err := RequireLinux(); err != nil {
		return nil, err
	}
	if err := requireRoot(po, "repair"); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(po.StateDir, 0o755); err == nil {
		_ = os.Chmod(po.StateDir, 0o755)
	}
	lk, err := AcquireSessionLock(po.StateDir, po.PidAlive, po.LockWait)
	if err != nil {
		return nil, err
	}
	defer lk.Release()
	rep := &RepairReport{}
	s, err := LoadState(po.StateDir)
	if err != nil {
		// Corrupt state file: clear any leftover rules, quarantine the
		// bytes for forensics, never fatal.
		for _, name := range []string{BackendIptables, BackendNft} {
			be := backendFor(name, po.Run)
			if be.Present() {
				_ = be.Remove()
				rep.Actions = append(rep.Actions, "removed stale "+name+" rules")
			}
		}
		bad := activePath(po.StateDir) + ".corrupt"
		_ = os.Rename(activePath(po.StateDir), bad)
		rep.Actions = append(rep.Actions, "quarantined corrupt state file")
		return rep, nil
	}
	if s != nil && po.PidAlive(s.TorPid) && backendFor(s.Backend, po.Run).Present() {
		// Healthy active session: leave it alone. Only stray rules
		// from the *other* backend (mixed crashed run) are removed.
		stray := false
		for _, name := range []string{BackendIptables, BackendNft} {
			if name == s.Backend {
				continue
			}
			be := backendFor(name, po.Run)
			if be.Present() {
				_ = be.Remove()
				stray = true
				rep.Actions = append(rep.Actions, "removed stray "+name+" rules (session uses "+s.Backend+")")
			}
		}
		if !stray {
			rep.Actions = append(rep.Actions, "session healthy (tor alive, rules present): no action")
		}
		return rep, nil
	}
	// No healthy session: sweep both backends (a crashed run may have
	// mixed them), then reconcile the state record. Session-backend
	// presence is captured before the sweep so the report distinguishes
	// dead-tor-with-rules from dead-tor-without.
	if s == nil {
		Present := false
		for _, name := range []string{BackendIptables, BackendNft} {
			be := backendFor(name, po.Run)
			if be.Present() {
				_ = be.Remove()
				Present = true
				rep.Actions = append(rep.Actions, "removed stale "+name+" rules")
			}
		}
		if !Present {
			rep.Actions = append(rep.Actions, "nothing to repair (not connected, no stale rules)")
		}
		return rep, nil
	}
	sessionPresent := backendFor(s.Backend, po.Run).Present()
	for _, name := range []string{BackendIptables, BackendNft} {
		if be := backendFor(name, po.Run); be.Present() {
			_ = be.Remove()
			rep.Actions = append(rep.Actions, "removed stale "+name+" rules")
		}
	}
	torDead := !po.PidAlive(s.TorPid)
	rulesGone := !sessionPresent
	switch {
	case torDead && rulesGone:
		cleanupDataDir(s.TorDataDir)
		_ = ClearState(po.StateDir)
		rep.Actions = append(rep.Actions, "dropped stale session (tor dead, rules gone; backups kept)")
	case torDead:
		cleanupDataDir(s.TorDataDir)
		_ = ClearState(po.StateDir)
		rep.Actions = append(rep.Actions, "removed rules for dead tor, dropped stale session")
	case rulesGone:
		rep.Actions = append(rep.Actions, "session tor alive but rules missing: left tor running, dropped stale session (re-connect to re-arm)")
		_ = ClearState(po.StateDir)
	default:
		rep.Actions = append(rep.Actions, "session healthy (tor alive, rules present): no action")
	}
	return rep, nil
}
