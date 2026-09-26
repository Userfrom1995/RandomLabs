// Command torshim is a lightweight launcher for the Tor network.
//
// torshim never implements Tor itself; it automates the existing tor daemon:
// private instance lifecycle, readiness gating, per-app routing (torsocks on
// Linux), and isolated child shells. Fail-closed everywhere: when Tor is not
// ready or a route would leak, torshim errors out instead of pretending.
//
// Unofficial frontend - not sponsored by The Tor Project.
package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/doctor"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/perapp"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/shell"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/status"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/syswide"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/version"
)

// Exit codes: 0 ok, 1 runtime/app failure, 2 usage, 3 tor not ready
// (fail-closed), 4 feature unavailable on this platform.
const (
	exitOK         = 0
	exitError      = 1
	exitUsage      = 2
	exitNotReady   = 3
	exitFutureMile = 4
)

const trademarkNote = "torshim - lightweight launcher for the Tor network (unofficial, not sponsored by The Tor Project)"

func main() {
	os.Exit(run(os.Args[1:]))
}

func parseGlobalSubcommand(argv []string) (string, []string) {
	var flags []string
	for i, arg := range argv {
		if !strings.HasPrefix(arg, "-") {
			if isCommand(arg) {
				sub := arg
				subArgs := append(flags, argv[i+1:]...)
				return sub, subArgs
			}
			return "", argv
		}
		flags = append(flags, arg)
	}
	return "", argv
}

func run(argv []string) int {
	if len(argv) == 0 {
		usage()
		return exitUsage
	}
	cmd, rest := parseGlobalSubcommand(argv)
	// Bare `torshim <app> [args]`: everything is the app.
	if cmd == "" {
		return cmdRun(argv)
	}
	switch cmd {
	case "__supervise":
		return cmdSupervise(rest)
	case "run":
		return cmdRun(rest)
	case "shell":
		return cmdShell(rest)
	case "status":
		return cmdStatus(rest)
	case "newnym":
		return cmdNewnym(rest)
	case "doctor":
		return cmdDoctor(rest)
	case "version", "--version", "-V":
		return cmdVersion(rest)
	case "connect":
		return cmdConnect(rest)
	case "disconnect":
		return cmdDisconnect(rest)
	case "repair":
		return cmdRepair(rest)
	case "help", "--help", "-h":
		usage()
		return exitOK
	default:
		fmt.Fprintf(os.Stderr, "torshim: unknown command %q\n\n", cmd)
		usage()
		return exitUsage
	}
}

func isCommand(s string) bool {
	switch s {
	case "run", "shell", "status", "newnym", "doctor",
		"version", "--version", "-V",
		"connect", "disconnect", "repair", "help", "--help", "-h", "__supervise":
		return true
	}
	return false
}

func usage() {
	fmt.Printf(`%s

Usage:
  torshim run [-v] [--tor BIN] [--timeout D] [--reuse] [--detach|--wait] [--log-file PATH] [--acknowledge-gui-risks] -- <app> [args...]
  torshim <app> [args...]          same as run (shim on Linux, proxy env elsewhere)
  torshim shell [-v]               child shell routed through Tor
  torshim newnym [--control ADDR] [--cookie PATH] [-v]
                                   rotate circuits without restarting tor
  torshim doctor [--json] [-v]     full health check (bootstrap, SOCKS, DNS,
                                   exit IP, firewall, IPv6)
  sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
  torshim disconnect               restore pre-connect networking (needs sudo)
  torshim repair                   clear stale rules/state (needs sudo)
  torshim status [--json] [-v]     never claims protected when not
  torshim version [-v]             wrapper + tor + backend versions

-v / --verbose prints the session behind the command: endpoints, mode,
circuit state, backend, and the tor notices.log tail. newnym and doctor
address a persistent tor: --control, then TORSHIM_CONTROL (live shell or
run session), then the system connect session, then 9051/9151; cookies
via --cookie, TOR_COOKIE, TORSHIM_COOKIE, then conventional paths.

Per-app routing uses torsocks on Linux (fail-closed shim) and proxy
environment (socks5h, DNS exit-side when the app honors it) on macOS
and Windows - only apps honoring proxy env are covered there.
GUI browsers (firefox, falkon, chromium, chrome) are long-lived: launch
them detached (run --detach -- <browser>; on macOS/Windows also add
--acknowledge-gui-risks for the partial-coverage contract) so the
prompt returns at once. Headless runs (--headless, --screenshot,
--dump-dom) stay on the wait path like CLI tools. --wait selects
the wait path explicitly; --log-file PATH captures detached output.
System-wide connect/disconnect is Linux-only (iptables/nft); macOS and
Windows system-wide needs a tun2socks backend (not shipped) and refuses honestly.
While connected, TCP goes through Tor, DNS resolves through Tor,
non-DNS UDP/ICMP is blocked, and IPv6 is blocked.

%s
`, trademarkNote, "See tor-cli/README.md for details.")
}

// shared flags for run/shell.
type launchFlags struct {
	torBin  string
	timeout time.Duration
	reuse   bool
	verbose bool
	// detach selects the GUI supervision path (Start plus Release,
	// prompt returns at once with the child PID). wait forces the CLI
	// supervision path explicitly. logFile captures detached child
	// output; ackGUI opts into the partial proxy coverage contract.
	detach  bool
	wait    bool
	logFile string
	ackGUI  bool
	quiet   bool
}

func parseLaunch(fs *flag.FlagSet, args []string) (launchFlags, []string, error) {
	var lf launchFlags
	fs.StringVar(&lf.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&lf.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.BoolVar(&lf.reuse, "reuse", false, "reuse a foreign tor if verifiable (default: private instance)")
	fs.BoolVar(&lf.verbose, "verbose", false, "show endpoints, mode, circuit, backend, notices tail")
	fs.BoolVar(&lf.verbose, "v", false, "same as --verbose")
	fs.BoolVar(&lf.quiet, "quiet", false, "suppress bootstrap and informational progress messages")
	fs.BoolVar(&lf.quiet, "q", false, "same as --quiet")
	fs.BoolVar(&lf.detach, "detach", false, "GUI path: release the child, return the prompt at once with its PID")
	fs.BoolVar(&lf.wait, "wait", false, "CLI path: block until the child exits (default)")
	fs.StringVar(&lf.logFile, "log-file", "", "detached child stdout/stderr target (detach mode only)")
	fs.BoolVar(&lf.ackGUI, "acknowledge-gui-risks", false, "accept partial proxy coverage for GUI apps on macOS/Windows")
	if err := fs.Parse(args); err != nil {
		return lf, nil, err
	}
	rest := fs.Args()
	if len(rest) > 0 && rest[0] == "--" {
		rest = rest[1:]
	}
	return lf, rest, nil
}

// torSession is a ready tor plus everything --verbose reports about it.
// Default is a private owned instance; --reuse attaches to a verifiable
// foreign tor (no notices log, never stopped by us).
type torSession struct {
	socksAddr      string
	controlAddr    string
	httpTunnelAddr string
	cookiePath     string
	noticesPath    string
	backend        string
	mode           string
	isOwned        bool
	disarmed       bool
	pid            int
	dataDir        string
	cleanup        func()
}

// ensureTor returns a ready SOCKS endpoint plus a cleanup func. Default is a
// private owned instance; --reuse attempts a verifiable foreign tor first.
func ensureTor(lf launchFlags) (*torSession, error) {
	backend := "torsocks LD_PRELOAD shim (Linux)"
	if perapp.NeedsProxy() {
		backend = "proxy environment socks5h (only honoring apps covered)"
	}
	if lf.reuse {
		if sess, ok, rerr := tryReuse(lf, backend); rerr != nil {
			return nil, rerr
		} else if ok {
			return sess, nil
		}
	}
	var onProgress func(control.BootstrapState)
	if !lf.quiet {
		onProgress = func(st control.BootstrapState) {
			summary := st.Summary
			if summary == "" {
				summary = st.Tag
			}
			if st.Ready() {
				fmt.Fprintf(os.Stderr, "[torshim] bootstrapping: %d%% (%s) - circuit established, ready\n", st.Progress, summary)
			} else {
				fmt.Fprintf(os.Stderr, "[torshim] bootstrapping: %d%% (%s)\n", st.Progress, summary)
			}
		}
	}
	in, err := lifecycle.Launch(lifecycle.Options{
		TorBinary:  lf.torBin,
		Timeout:    lf.timeout,
		Detached:   lf.detach,
		OnProgress: onProgress,
	})
	if err != nil {
		return nil, err
	}
	sess := &torSession{
		socksAddr:      in.SocksAddr(),
		controlAddr:    in.ControlAddr(),
		httpTunnelAddr: in.HTTPTunnelAddr(),
		cookiePath:     in.CookiePath,
		noticesPath:    in.NoticesPath(),
		backend:        backend,
		mode:           "private owned instance (launched by torshim, stopped on exit)",
		isOwned:        true,
		pid:            in.Pid,
		dataDir:        in.DataDir,
	}
	// Ctrl-C/SIGTERM during the app run must not orphan the owned tor.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		if !sess.disarmed {
			in.Stop()
		}
		os.Exit(130)
	}()
	sess.cleanup = func() {
		signal.Stop(sigCh)
		if !sess.disarmed {
			in.Stop()
		}
	}
	return sess, nil
}

// printVerboseSession reports the session behind a command to stderr:
// endpoints, mode, backend, and the tor notices tail. It never fails the
// command: every probe degrades to a parenthetical.
func printVerboseSession(sess *torSession) {
	fmt.Fprintln(os.Stderr, "[torshim verbose]")
	fmt.Fprintf(os.Stderr, "mode: %s\n", sess.mode)
	fmt.Fprintf(os.Stderr, "socks: %s\n", sess.socksAddr)
	if sess.controlAddr != "" {
		fmt.Fprintf(os.Stderr, "control: %s\n", sess.controlAddr)
	}
	if sess.cookiePath != "" {
		fmt.Fprintf(os.Stderr, "cookie: %s\n", sess.cookiePath)
	}
	fmt.Fprintf(os.Stderr, "backend: %s\n", sess.backend)
	fmt.Fprintln(os.Stderr, "notices (tail):")
	if sess.noticesPath == "" {
		fmt.Fprintln(os.Stderr, "  (foreign instance: no notices.log)")
		return
	}
	lines, err := lifecycle.TailFile(sess.noticesPath, 5)
	if err != nil {
		fmt.Fprintf(os.Stderr, "  (unreadable: %v)\n", err)
		return
	}
	if len(lines) == 0 {
		fmt.Fprintln(os.Stderr, "  (notices.log not written yet)")
		return
	}
	for _, ln := range lines {
		fmt.Fprintf(os.Stderr, "  %s\n", ln)
	}
}

// tryReuse reuses a foreign tor only when readiness is verifiable (cookie
// auth succeeds and the binding gate passes). Unverifiable instances fail
// closed instead of being trusted blindly.
func tryReuse(lf launchFlags, backend string) (*torSession, bool, error) {
	f, err := lifecycle.Detect(3 * time.Second)
	if err != nil || f == nil {
		return nil, false, err
	}
	cookies := []string{os.Getenv("TOR_COOKIE")}
	if home, herr := os.UserHomeDir(); herr == nil {
		cookies = append(cookies, filepath.Join(home, ".tor", "control_auth_cookie"))
	}
	cookies = append(cookies, "/var/run/tor/control.authcookie")
	var ctl *control.Client
	for _, c := range cookies {
		if c == "" {
			continue
		}
		d, derr := control.Dial(f.ControlAddr, 5*time.Second)
		if derr != nil {
			continue
		}
		if aerr := d.AuthCookie(c); aerr != nil {
			d.Close()
			continue
		}
		ctl = d
		break
	}
	if ctl == nil {
		return nil, false, fmt.Errorf("torshim: foreign tor found but readiness is unverifiable (no cookie auth); stop it or drop --reuse for a private instance")
	}
	defer ctl.Close()
	deadline := time.Now().Add(lf.timeout)
	var onProgress func(control.BootstrapState)
	if !lf.quiet {
		onProgress = func(st control.BootstrapState) {
			summary := st.Summary
			if summary == "" {
				summary = st.Tag
			}
			if st.Ready() {
				fmt.Fprintf(os.Stderr, "[torshim] bootstrapping: %d%% (%s) - circuit established, ready\n", st.Progress, summary)
			} else {
				fmt.Fprintf(os.Stderr, "[torshim] bootstrapping: %d%% (%s)\n", st.Progress, summary)
			}
		}
	}
	if err := lifecycle.WaitReadyWithProgress(ctl, deadline, 500*time.Millisecond, onProgress); err != nil {
		return nil, false, err
	}
	if !lf.quiet {
		fmt.Fprintf(os.Stderr, "torshim: reusing foreign tor at %s (will not stop it)\n", f.SocksAddr)
	}
	return &torSession{
		socksAddr:   f.SocksAddr,
		controlAddr: f.ControlAddr,
		backend:     backend,
		mode:        "reused foreign tor (verified, will not stop it)",
		cleanup:     func() {},
	}, true, nil
}

func cmdRun(args []string) int {
	fs := flag.NewFlagSet("run", flag.ContinueOnError)
	lf, rest, err := parseLaunch(fs, args)
	if err != nil {
		return exitUsage
	}
	if len(rest) == 0 {
		fmt.Fprintln(os.Stderr, "torshim run: no application given")
		fs.Usage()
		return exitUsage
	}
	if lf.detach && lf.wait {
		fmt.Fprintln(os.Stderr, "torshim run: --detach and --wait are mutually exclusive")
		return exitUsage
	}
	if lf.logFile != "" && !lf.detach {
		fmt.Fprintln(os.Stderr, "torshim run: --log-file needs --detach (wait-mode output streams to the terminal)")
		return exitUsage
	}
	if code, ok := checkICMPRefusal(rest[0]); !ok {
		return code
	}
	if code, ok := gateGUILaunch(rest, lf); !ok {
		return code
	}
	sess, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitNotReady
	}
	defer func() {
		sess.cleanup()
	}()
	if lf.verbose {
		printVerboseSession(sess)
	}
	opts := perapp.LaunchOptions{
		Detach:         lf.detach,
		LogFile:        lf.logFile,
		HTTPTunnelAddr: sess.httpTunnelAddr,
	}
	if perapp.NeedsProxy() {
		// macOS/Windows (M4): proxy-environment backend, no torsocks
		// conf dir needed. Run prints the honest coverage note.
		res, err := perapp.RunProxyWithOptions(sess.socksAddr, rest, nil, opts)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		if res.Detached {
			printDetached(sess, rest[0], res.PID, lf.logFile)
			if sess.isOwned {
				sess.disarmed = true
				spawnSupervisor(res.PID, sess.pid, sess.controlAddr, sess.cookiePath, []string{sess.dataDir})
			}
		}
		return res.ExitCode
	}
	confDir, err := os.MkdirTemp("", "torshim-conf-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: mkdtemp: %v\n", err)
		return exitError
	}
	cleanConf := true
	defer func() {
		if cleanConf {
			_ = os.RemoveAll(confDir)
		}
	}()
	res, err := perapp.RunWithOptions(sess.socksAddr, rest, nil, confDir, opts)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	if res.Detached {
		printDetached(sess, rest[0], res.PID, lf.logFile)
		if sess.isOwned {
			cleanConf = false
			sess.disarmed = true
			spawnSupervisor(res.PID, sess.pid, sess.controlAddr, sess.cookiePath, []string{confDir, sess.dataDir})
		}
		return 0
	}
	return res.ExitCode
}

// gateGUILaunch enforces the GUI supervision contract before any tor is
// started: interactive GUI browsers must take the detach path (the old
// bare wait is what hung forever), and proxy-backend GUI launches must
// additionally carry the explicit coverage acknowledgment. Headless
// browsers bypass the gate and run like CLI tools. Failures are usage
// errors (exit 2): nothing was launched, no tor was started.
func gateGUILaunch(rest []string, lf launchFlags) (int, bool) {
	bin := rest[0]
	resolved := bin
	if !strings.Contains(bin, string(os.PathSeparator)) {
		if lp, lerr := lookPath(bin); lerr == nil {
			resolved = lp
		} else {
			return exitOK, true // let Run report "not found on PATH"
		}
	}
	if perapp.ClassifyLaunch(resolved, resolveArgv(resolved, rest)) != perapp.ClassGUI {
		return exitOK, true
	}
	name, _ := perapp.GUIAppName(resolved)
	if name == "" {
		name = bin
	}
	if !lf.detach {
		fmt.Fprintf(os.Stderr, "torshim: %s is a long-lived GUI app: re-run with torshim run --detach -- %s so the prompt returns at once (headless runs with --headless stay on the wait path)\n", name, strings.Join(rest, " "))
		return exitUsage, false
	}
	if perapp.NeedsProxy() && !lf.ackGUI {
		fmt.Fprintf(os.Stderr, "torshim: %s on this OS uses proxy env with partial coverage (only honoring connections routed; GPU/D-Bus/single-instance IPC bypass Tor): re-run adding --acknowledge-gui-risks, or use Tor Browser for fingerprint-sensitive browsing\n", name)
		return exitUsage, false
	}
	return exitOK, true
}

// lookPath is a thin indirection over exec.LookPath so tests can stub
// binary resolution without touching PATH.
var lookPath = exec.LookPath

func resolveArgv(resolved string, rest []string) []string {
	out := make([]string, len(rest))
	out[0] = resolved
	copy(out[1:], rest[1:])
	return out
}

// printDetached reports a released GUI child: PID, route, and log
// target. The parent exits 0 once the child has survived the alive
// poll; the browser keeps running under Tor routing.
func printDetached(sess *torSession, app string, pid int, logFile string) {
	target := "discarded (use --log-file to capture)"
	if logFile != "" {
		target = logFile
	}
	fmt.Printf("launched %s (pid %d) detached via %s; prompt returned; SOCKS %s; output: %s\n",
		app, pid, sess.backend, sess.socksAddr, target)
}

var icmpBinaries = map[string]bool{
	"ping":          true,
	"ping6":         true,
	"traceroute":    true,
	"traceroute6":   true,
	"tracepath":     true,
	"tracepath6":    true,
	"mtr":           true,
	"mtr-packet":    true,
	"tcptraceroute": true,
	"fping":         true,
	"nping":         true,
	"hping":         true,
	"hping2":        true,
	"hping3":        true,
}

func checkICMPRefusal(bin string) (int, bool) {
	base := strings.ToLower(filepath.Base(bin))
	if icmpBinaries[base] {
		fmt.Fprintf(os.Stderr, "torshim: refusing '%s': %s uses ICMP or raw IP packets, which cannot be routed through Tor.\n"+
			"Tor is a stream-based onion proxy that routes TCP only (no ICMP or raw UDP).\n"+
			"The torsocks shim blocks ICMP sockets (returning ENOSYS) to prevent cleartext packets from leaking your real IP.\n\n"+
			"Suggestions:\n"+
			"  • To test Tor connectivity, use HTTP/HTTPS over TCP:\n"+
			"      torshim curl -s https://check.torproject.org/api/ip\n"+
			"  • To diagnose your Tor daemon and circuits, run:\n"+
			"      torshim doctor\n", base, base)
		return exitUsage, false
	}
	return exitOK, true
}

func spawnSupervisor(childPid, torPid int, controlAddr, cookiePath string, cleanupDirs []string) {
	self, err := os.Executable()
	if err != nil {
		return
	}
	args := []string{"__supervise", strconv.Itoa(childPid), strconv.Itoa(torPid), controlAddr, cookiePath}
	args = append(args, cleanupDirs...)
	cmd := exec.Command(self, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	cmd.Stdin = nil
	cmd.Stdout = nil
	cmd.Stderr = nil
	_ = cmd.Start()
	if cmd.Process != nil {
		_ = cmd.Process.Release()
	}
}

func cmdSupervise(args []string) int {
	if len(args) < 4 {
		return exitUsage
	}
	childPid, err1 := strconv.Atoi(args[0])
	torPid, err2 := strconv.Atoi(args[1])
	if err1 != nil || err2 != nil {
		return exitUsage
	}
	controlAddr := args[2]
	cookiePath := args[3]
	cleanupDirs := args[4:]

	var ctl *control.Client
	if controlAddr != "" && cookiePath != "" {
		if c, err := control.Dial(controlAddr, 5*time.Second); err == nil {
			if aerr := c.AuthCookie(cookiePath); aerr == nil {
				_ = c.TakeOwnership()
				ctl = c
			} else {
				c.Close()
			}
		}
	}
	if ctl != nil {
		defer ctl.Close()
	}

	for {
		time.Sleep(1 * time.Second)
		if !isPidAlive(childPid) {
			break
		}
	}
	if ctl != nil {
		_ = ctl.Close()
		ctl = nil
	}
	if torPid > 0 && isPidAlive(torPid) {
		p, err := os.FindProcess(torPid)
		if err == nil {
			_ = p.Signal(syscall.SIGTERM)
			deadline := time.Now().Add(3 * time.Second)
			for time.Now().Before(deadline) {
				time.Sleep(200 * time.Millisecond)
				if !isPidAlive(torPid) {
					break
				}
			}
			if isPidAlive(torPid) {
				_ = p.Kill()
			}
		}
	}
	for _, dir := range cleanupDirs {
		if dir != "" {
			_ = os.RemoveAll(dir)
		}
	}
	return exitOK
}

func isPidAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	process, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	err = process.Signal(syscall.Signal(0))
	if err == nil {
		return true
	}
	if errors.Is(err, syscall.EPERM) {
		return true
	}
	return false
}

func cmdShell(args []string) int {
	fs := flag.NewFlagSet("shell", flag.ContinueOnError)
	lf, rest, err := parseLaunch(fs, args)
	if err != nil {
		return exitUsage
	}
	if lf.detach || lf.wait || lf.logFile != "" || lf.ackGUI {
		fmt.Fprintln(os.Stderr, "torshim shell: --detach/--wait/--log-file/--acknowledge-gui-risks are run-only flags (shell takes no application to supervise)")
		return exitUsage
	}
	if len(rest) != 0 {
		fmt.Fprintln(os.Stderr, "torshim shell: takes no arguments")
		return exitUsage
	}
	sess, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitNotReady
	}
	defer sess.cleanup()
	if lf.verbose {
		printVerboseSession(sess)
	}
	cfg := shell.Config{SocksAddr: sess.socksAddr, ControlAddr: sess.controlAddr, CookiePath: sess.cookiePath}
	if perapp.NeedsProxy() {
		// macOS/Windows (M4): proxy env only, no DYLD/LSP shim.
		// Spawn prints the coverage banner; nothing to probe.
		code, err := shell.Spawn(cfg)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		return code
	}
	if lib, lerr := perapp.FindLib(); lerr == nil {
		confDir, merr := os.MkdirTemp("", "torshim-shell-*")
		if merr != nil {
			fmt.Fprintf(os.Stderr, "torshim: mkdtemp: %v\n", merr)
			return exitError
		}
		defer os.RemoveAll(confDir)
		host, port := splitSocks(sess.socksAddr)
		cpath := filepath.Join(confDir, "torsocks.conf")
		if werr := perapp.WriteConf(cpath, host, port); werr != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", werr)
			return exitError
		}
		cfg.LibPath, cfg.ConfPath = lib, cpath
	} else {
		fmt.Fprintf(os.Stderr, "torshim: torsocks not found (%v); shell uses proxy env only\n", lerr)
	}
	code, err := shell.Spawn(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	return code
}

func splitSocks(addr string) (string, int) {
	host, port := "127.0.0.1", 9050
	var h, p string
	if i := lastColon(addr); i >= 0 {
		h, p = addr[:i], addr[i+1:]
	}
	if h != "" {
		host = h
	}
	var n int
	fmt.Sscanf(p, "%d", &n)
	if n > 0 {
		port = n
	}
	return host, port
}

func lastColon(s string) int {
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] == ':' {
			return i
		}
	}
	return -1
}

func cmdStatus(args []string) int {
	fs := flag.NewFlagSet("status", flag.ContinueOnError)
	asJSON := fs.Bool("json", false, "machine-readable output")
	ctlAddr := fs.String("control", "", "control endpoint (default 127.0.0.1:9051, fallback 9151)")
	cookiePath := fs.String("cookie", "", "control cookie path (default: session env, then conventional paths)")
	socksAddr := fs.String("socks", "", "SOCKS endpoint to probe")
	sysDir := fs.String("state-dir", "", "system session dir (default /run/torshim or TORSHIM_STATEDIR)")
	verbose := fs.Bool("verbose", false, "add control diagnostics (version, circuits, traffic, listeners)")
	fs.BoolVar(verbose, "v", false, "same as --verbose")
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	rep := status.Collect(status.Options{ControlAddr: *ctlAddr, SocksAddr: *socksAddr, SystemStateDir: *sysDir})
	if *asJSON {
		out, err := status.RenderJSON(rep)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		fmt.Print(out)
		return exitOK
	}
	fmt.Print(status.RenderText(rep))
	if *verbose {
		printStatusVerbose(rep, *ctlAddr, *cookiePath)
	}
	return exitOK
}

// printStatusVerbose appends control diagnostics to a status report. Auth
// uses the same cookie resolution as newnym/doctor, so `status --verbose`
// works fully inside a torshim shell session. A locked control port is a
// note, never a failure: the status above already stands on its own.
func printStatusVerbose(rep status.Report, controlFlag, cookieFlag string) {
	if !rep.Running || rep.ControlAddr == "" {
		fmt.Fprintln(os.Stderr, "[torshim verbose] (no live control endpoint: no diagnostics)")
		return
	}
	addr := rep.ControlAddr
	if controlFlag != "" {
		addr = controlFlag
	}
	_, source := doctor.ResolveControl(controlFlag)
	ctl, err := control.Dial(addr, 5*time.Second)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (control %s unreachable: %v)\n", addr, err)
		return
	}
	defer ctl.Close()
	if err := doctor.AuthAny(ctl, doctor.ResolveCookies(cookieFlag, source)); err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (control state unreadable: %v)\n", err)
		return
	}
	d, err := control.CollectDiagnostics(ctl)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (diagnostics: %v)\n", err)
		return
	}
	fmt.Fprintf(os.Stderr, "[torshim verbose]\n%s", indentLines(d.Text()))
}

func indentLines(s string) string {
	var b strings.Builder
	for _, ln := range strings.Split(strings.TrimRight(s, "\n"), "\n") {
		b.WriteString("  " + ln + "\n")
	}
	return b.String()
}

func cmdVersion(args []string) int {
	fs := flag.NewFlagSet("version", flag.ContinueOnError)
	torBin := fs.String("tor", "tor", "tor executable")
	verbose := fs.Bool("verbose", false, "add live control-protocol fields when a tor answers")
	fs.BoolVar(verbose, "v", false, "same as --verbose")
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	info := version.Collect(*torBin)
	fmt.Printf("torshim %s\n", info.Wrapper)
	fmt.Printf("platform: %s\n", info.Platform)
	fmt.Printf("per-app: %s\n", info.PerApp)
	fmt.Printf("system-wide: %s\n", info.Syswide)
	fmt.Printf("tor: %s\n", info.Tor)
	fmt.Printf("torsocks: %s\n", info.Torsocks)
	if *verbose {
		printVersionVerbose()
	}
	fmt.Println(trademarkNote)
	return exitOK
}

// printVersionVerbose adds the live control-protocol view (tor version as
// the daemon reports it, bootstrap state). No reachable or authorized
// endpoint is a note, never a failure: the binary versions stand alone.
func printVersionVerbose() {
	addr, source := doctor.ResolveControl("")
	ctl, addr, err := dialControlChoices(addr, 5*time.Second)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (no control endpoint answered: %v)\n", err)
		return
	}
	defer ctl.Close()
	if err := doctor.AuthAny(ctl, doctor.ResolveCookies("", source)); err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (control state unreadable: %v)\n", err)
		return
	}
	d, err := control.CollectDiagnostics(ctl)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[torshim verbose] (diagnostics: %v)\n", err)
		return
	}
	fmt.Fprintf(os.Stderr, "[torshim verbose] control %s:\n%s", addr, indentLines(d.Text()))
}

// dialControlChoices dials addr, or the conventional 9051/9151 pair when
// addr is "". It returns the client and the endpoint that answered.
func dialControlChoices(addr string, timeout time.Duration) (*control.Client, string, error) {
	addrs := []string{addr}
	if addr == "" {
		addrs = []string{"127.0.0.1:9051", "127.0.0.1:9151"}
	}
	var firstErr error
	for _, a := range addrs {
		c, err := control.Dial(a, timeout)
		if err == nil {
			return c, a, nil
		}
		if firstErr == nil {
			firstErr = err
		}
	}
	return nil, "", firstErr
}

// cmdNewnym rotates the tor identity without restarting: SIGNAL NEWNYM
// over the resolved control endpoint. It targets persistent tors (the
// system connect session, a torshim shell session via TORSHIM_CONTROL, a
// foreign tor, Tor Browser): per-app private instances exit with their
// command, so there is nothing to signal there. Fail-closed throughout:
// unreachable control, failed auth, a non-ready tor, and tor's own
// rate limit are all reported instead of claimed.
func cmdNewnym(args []string) int {
	fs := flag.NewFlagSet("newnym", flag.ContinueOnError)
	controlFlag := fs.String("control", "", "control endpoint (default: session env, system session, then 9051/9151)")
	cookieFlag := fs.String("cookie", "", "control cookie path (default: session env, then conventional paths)")
	timeout := fs.Duration("timeout", 10*time.Second, "control operation budget")
	verbose := fs.Bool("verbose", false, "show endpoint and pre-rotation diagnostics")
	fs.BoolVar(verbose, "v", false, "same as --verbose")
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	if len(fs.Args()) != 0 {
		fmt.Fprintln(os.Stderr, "torshim newnym: takes no positional arguments")
		return exitUsage
	}
	addr, source := doctor.ResolveControl(*controlFlag)
	ctl, addr, err := dialControlChoices(addr, *timeout)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: no tor control endpoint answered: %v\n", err)
		return exitNotReady
	}
	defer ctl.Close()
	cookies := doctor.ResolveCookies(*cookieFlag, source)
	if err := doctor.AuthAny(ctl, cookies); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitNotReady
	}
	if !newnymReady(ctl) {
		fmt.Fprintln(os.Stderr, "torshim: refusing NEWNYM: tor is not ready (no bootstrap + live circuit to rotate)")
		return exitNotReady
	}
	if *verbose {
		if d, derr := control.CollectDiagnostics(ctl); derr == nil {
			fmt.Fprintf(os.Stderr, "[torshim verbose] control %s (%s):\n%s", addr, source, indentLines(d.Text()))
		}
	}
	if err := ctl.Newnym(); err != nil {
		if errors.Is(err, control.ErrRateLimited) {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		fmt.Fprintf(os.Stderr, "torshim: identity rotation failed: %v\n", err)
		return exitError
	}
	fmt.Printf("new identity requested via %s: tor closed old circuits and is building fresh ones (verify with torshim doctor)\n", addr)
	return exitOK
}

// newnymReady is the single-shot readiness check before SIGNAL NEWNYM:
// bootstrap 100% + done AND a usable circuit. Unlike WaitReady it never
// polls: rotating a tor that cannot carry traffic would be a no-op claim.
func newnymReady(ctl *control.Client) bool {
	phase, err := ctl.GetOne("status/bootstrap-phase")
	if err != nil {
		return false
	}
	st := control.ParseBootstrapPhase(phase)
	if st.Progress != 100 || st.Tag != "done" {
		return false
	}
	if v, err := ctl.GetOne("status/circuit-established"); err == nil {
		return control.ParseCircuitEstablished(v)
	}
	if dump, err := ctl.GetOne("circuit-status"); err == nil {
		return control.HasBuiltCircuit(dump)
	}
	return false
}

// cmdDoctor runs the full health verdict and exits 0 when healthy, 3 when
// any check fails (tor-side: fail-closed semantics), 2 on usage errors.
func cmdDoctor(args []string) int {
	fs := flag.NewFlagSet("doctor", flag.ContinueOnError)
	controlFlag := fs.String("control", "", "control endpoint (default: session env, system session, then 9051/9151)")
	cookieFlag := fs.String("cookie", "", "control cookie path (default: session env, then conventional paths)")
	socksFlag := fs.String("socks", "", "SOCKS endpoint (default: derived from control)")
	timeout := fs.Duration("timeout", 10*time.Second, "per-probe budget")
	asJSON := fs.Bool("json", false, "machine-readable verdict")
	verbose := fs.Bool("verbose", false, "show endpoint resolution")
	fs.BoolVar(verbose, "v", false, "same as --verbose")
	skipExit := fs.Bool("skip-exit-ip", false, "skip the egress fetch (offline runs)")
	skipDNS := fs.Bool("skip-dns", false, "skip the DNSPort liveness query")
	sysDir := fs.String("state-dir", "", "system session dir (default /run/torshim or TORSHIM_STATEDIR)")
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	if len(fs.Args()) != 0 {
		fmt.Fprintln(os.Stderr, "torshim doctor: takes no positional arguments")
		return exitUsage
	}
	addr, source := doctor.ResolveControl(*controlFlag)
	cookies := doctor.ResolveCookies(*cookieFlag, source)
	rep := doctor.Collect(doctor.Options{
		ControlAddr: addr, CookiePaths: cookies, SocksAddr: *socksFlag,
		Timeout: *timeout, SystemStateDir: *sysDir,
		SkipExitIP: *skipExit, SkipDNS: *skipDNS,
	}, doctor.DefaultDeps())
	if *asJSON {
		out, err := doctor.RenderJSON(rep)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		fmt.Print(out)
	} else {
		fmt.Print(doctor.RenderText(rep))
	}
	if *verbose {
		shown := addr
		if shown == "" {
			shown = "127.0.0.1:9051/9151"
		}
		fmt.Fprintf(os.Stderr, "[torshim verbose] control %s (%s, %d cookie candidate(s))\n", shown, source, len(cookies))
	}
	if rep.Healthy {
		return exitOK
	}
	return exitNotReady
}

// syswideFlags are shared by connect/disconnect/repair.
type syswideFlags struct {
	stateDir string
	torBin   string
	timeout  time.Duration
	verbose  bool
}

func parseSyswide(fs *flag.FlagSet, args []string) (syswideFlags, error) {
	var sf syswideFlags
	fs.StringVar(&sf.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&sf.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.StringVar(&sf.stateDir, "state-dir", "", "session dir (default /run/torshim or TORSHIM_STATEDIR)")
	fs.BoolVar(&sf.verbose, "verbose", false, "show session dir and backend detail")
	fs.BoolVar(&sf.verbose, "v", false, "same as --verbose")
	if err := fs.Parse(args); err != nil {
		return sf, err
	}
	if len(fs.Args()) != 0 {
		return sf, fmt.Errorf("takes no positional arguments")
	}
	return sf, nil
}

func syswideUnsupported(cmd string) int {
	fmt.Fprintf(os.Stderr, "torshim: system-wide %q is Linux-only (no tun2socks backend shipped for %s: macOS would need utun+tun2socks+pf, Windows wintun+tun2socks+WFP). Per-app and shell modes work on this OS today; see tor-cli/docs/limitations.md.\n", cmd, runtime.GOOS)
	return exitFutureMile
}

func cmdConnect(args []string) int {
	// Usage errors surface identically on every OS (exit 2), so flag
	// parsing runs before the Linux-only gate below. The gate still
	// fires for well-formed invocations off-Linux (honest exit 4).
	o, code := parseConnectFlags(args)
	if code != exitOK {
		return code
	}
	if runtime.GOOS != "linux" {
		return syswideUnsupported("connect")
	}
	rep, err := syswide.Connect(syswide.Options{
		StateDir: o.stateDir, Backend: o.backendName, TorBinary: o.torBin,
		Timeout: o.timeout, Force: o.force, TorUser: o.torUser, TransPort: o.transPort,
	})
	if err != nil {
		if rep != nil && len(rep.Verify) > 0 {
			printVerify(rep)
		}
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		if rep != nil && len(rep.Verify) > 0 {
			return exitNotReady // verify gate failed: fail closed
		}
		return exitError
	}
	if rep.AlreadyActive {
		fmt.Printf("already connected (backend %s since %s)\n", rep.State.Backend, rep.State.CreatedAt)
		return exitOK
	}
	printVerify(rep)
	fmt.Printf("connected: system-wide via %s (backup %s)\n", rep.State.Backend, rep.BackupDir)
	if rep.ResolvWarning != "" {
		fmt.Printf("warning: %s\n", rep.ResolvWarning)
	}
	if o.verbose {
		fmt.Fprintf(os.Stderr, "[torshim verbose] session %s: socks 127.0.0.1:%d, control 127.0.0.1:%d, dns 127.0.0.1:%d, transparent %d, tor pid %d\n",
			syswide.StateDir(), rep.State.SocksPort, rep.State.ControlPort, rep.State.DNSPort, rep.State.TransPort, rep.State.TorPid)
	}
	return exitOK
}

// connectFlags carries the parsed connect flag set (no side effects from
// parsing alone, so this doubles as the cross-OS usage pre-check).
type connectFlags struct {
	backendName, torUser, stateDir, torBin string
	timeout                                time.Duration
	force                                  bool
	verbose                                bool
	transPort                              int
}

func defineConnectFlags(fs *flag.FlagSet, o *connectFlags) {
	fs.StringVar(&o.backendName, "backend", "auto", "firewall backend: auto, iptables, nft")
	fs.StringVar(&o.torUser, "tor-user", "", "unprivileged user for the system tor (default: tor, debian-tor, _tor, nobody)")
	fs.StringVar(&o.stateDir, "state-dir", "", "session dir (default /run/torshim or TORSHIM_STATEDIR)")
	fs.StringVar(&o.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&o.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.BoolVar(&o.force, "force", false, "repair a stale session, then connect")
	fs.BoolVar(&o.verbose, "verbose", false, "show session endpoints after connect")
	fs.BoolVar(&o.verbose, "v", false, "same as --verbose")
	fs.IntVar(&o.transPort, "trans-port", syswide.DefaultTransPort, "fixed transparent proxy port")
}

// parseConnectFlags parses the full connect flag set, returning exitOK on
// success or exitUsage when the invocation is malformed.
func parseConnectFlags(args []string) (connectFlags, int) {
	var o connectFlags
	fs := flag.NewFlagSet("connect", flag.ContinueOnError)
	defineConnectFlags(fs, &o)
	if err := fs.Parse(args); err != nil {
		return o, exitUsage
	}
	if len(fs.Args()) != 0 {
		fmt.Fprintln(os.Stderr, "torshim connect: takes no positional arguments")
		return o, exitUsage
	}
	return o, exitOK
}

// printVerify renders the connect verify table (pass and fail alike).
func printVerify(rep *syswide.ConnectReport) {
	for _, r := range rep.Verify {
		mark := "ok"
		if !r.OK {
			mark = "FAIL"
		}
		fmt.Printf("  [%s] %-16s %s\n", mark, r.Name, r.Detail)
	}
}

func cmdDisconnect(args []string) int {
	// Usage errors surface identically on every OS (exit 2): parsing is
	// side-effect free, so it runs before the Linux-only gate.
	fs := flag.NewFlagSet("disconnect", flag.ContinueOnError)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim disconnect: %v\n", err)
		return exitUsage
	}
	if runtime.GOOS != "linux" {
		return syswideUnsupported("disconnect")
	}
	rep, err := syswide.Disconnect(syswide.Options{
		StateDir: sf.stateDir, TorBinary: sf.torBin, Timeout: sf.timeout,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	if !rep.WasConnected {
		fmt.Println("not connected (nothing to do)")
		return exitOK
	}
	fmt.Printf("disconnected: rules removed=%v firewall restored=%v post-verify clean=%v\n",
		rep.RemovedRules, rep.Restored, rep.PostVerifyOK)
	if rep.ResolvWarning != "" {
		fmt.Printf("warning: %s\n", rep.ResolvWarning)
	}
	if sf.verbose {
		fmt.Fprintf(os.Stderr, "[torshim verbose] session dir %s\n", syswide.StateDir())
	}
	return exitOK
}

func cmdRepair(args []string) int {
	// Usage errors surface identically on every OS (exit 2): parsing is
	// side-effect free, so it runs before the Linux-only gate.
	fs := flag.NewFlagSet("repair", flag.ContinueOnError)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim repair: %v\n", err)
		return exitUsage
	}
	if runtime.GOOS != "linux" {
		return syswideUnsupported("repair")
	}
	rep, err := syswide.Repair(syswide.Options{
		StateDir: sf.stateDir, TorBinary: sf.torBin, Timeout: sf.timeout,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	for _, a := range rep.Actions {
		fmt.Printf("repair: %s\n", a)
	}
	if sf.verbose {
		fmt.Fprintf(os.Stderr, "[torshim verbose] session dir %s\n", syswide.StateDir())
	}
	return exitOK
}
