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
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
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

func run(argv []string) int {
	if len(argv) == 0 {
		usage()
		return exitUsage
	}
	cmd, rest := argv[0], argv[1:]
	// Bare `torshim <app> [args]`: everything is the app.
	if !isCommand(cmd) {
		return cmdRun(argv)
	}
	switch cmd {
	case "run":
		return cmdRun(rest)
	case "shell":
		return cmdShell(rest)
	case "status":
		return cmdStatus(rest)
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
	case "run", "shell", "status", "version", "--version", "-V",
		"connect", "disconnect", "repair", "help", "--help", "-h":
		return true
	}
	return false
}

func usage() {
	fmt.Printf(`%s

Usage:
  torshim run [--tor BIN] [--timeout D] [--reuse] -- <app> [args...]
  torshim <app> [args...]          same as run (shim on Linux, proxy env elsewhere)
  torshim shell                    child shell routed through Tor
  sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
  torshim disconnect               restore pre-connect networking (needs sudo)
  torshim repair                   clear stale rules/state (needs sudo)
  torshim status [--json]          never claims protected when not
  torshim version                  wrapper + tor + backend versions

Per-app routing uses torsocks on Linux (fail-closed shim) and proxy
environment (socks5h, DNS exit-side when the app honors it) on macOS
and Windows - only apps honoring proxy env are covered there.
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
}

func parseLaunch(fs *flag.FlagSet, args []string) (launchFlags, []string, error) {
	var lf launchFlags
	fs.StringVar(&lf.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&lf.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.BoolVar(&lf.reuse, "reuse", false, "reuse a foreign tor if verifiable (default: private instance)")
	if err := fs.Parse(args); err != nil {
		return lf, nil, err
	}
	rest := fs.Args()
	if len(rest) > 0 && rest[0] == "--" {
		rest = rest[1:]
	}
	return lf, rest, nil
}

// ensureTor returns a ready SOCKS endpoint plus a cleanup func. Default is a
// private owned instance; --reuse attempts a verifiable foreign tor first.
func ensureTor(lf launchFlags) (socksAddr string, cleanup func(), err error) {
	if lf.reuse {
		if addr, ok, rerr := tryReuse(lf); rerr != nil {
			return "", nil, rerr
		} else if ok {
			return addr, func() {}, nil
		}
	}
	in, err := lifecycle.Launch(lifecycle.Options{TorBinary: lf.torBin, Timeout: lf.timeout})
	if err != nil {
		return "", nil, err
	}
	// Ctrl-C/SIGTERM during the app run must not orphan the owned tor.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		in.Stop()
		os.Exit(130)
	}()
	return in.SocksAddr(), func() {
		signal.Stop(sigCh)
		in.Stop()
	}, nil
}

// tryReuse reuses a foreign tor only when readiness is verifiable (cookie
// auth succeeds and the binding gate passes). Unverifiable instances fail
// closed instead of being trusted blindly.
func tryReuse(lf launchFlags) (string, bool, error) {
	f, err := lifecycle.Detect(3 * time.Second)
	if err != nil || f == nil {
		return "", false, err
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
		return "", false, fmt.Errorf("torshim: foreign tor found but readiness is unverifiable (no cookie auth); stop it or drop --reuse for a private instance")
	}
	defer ctl.Close()
	deadline := time.Now().Add(lf.timeout)
	if err := lifecycle.WaitReady(ctl, deadline, 500*time.Millisecond); err != nil {
		return "", false, err
	}
	fmt.Fprintf(os.Stderr, "torshim: reusing foreign tor at %s (will not stop it)\n", f.SocksAddr)
	return f.SocksAddr, true, nil
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
	socks, cleanup, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitNotReady
	}
	defer cleanup()
	if perapp.NeedsProxy() {
		// macOS/Windows (M4): proxy-environment backend, no torsocks
		// conf dir needed. Run prints the honest coverage note.
		res, err := perapp.Run(socks, rest, nil, "")
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		return res.ExitCode
	}
	confDir, err := os.MkdirTemp("", "torshim-conf-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: mkdtemp: %v\n", err)
		return exitError
	}
	defer os.RemoveAll(confDir)
	res, err := perapp.Run(socks, rest, nil, confDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	return res.ExitCode
}

func cmdShell(args []string) int {
	fs := flag.NewFlagSet("shell", flag.ContinueOnError)
	lf, rest, err := parseLaunch(fs, args)
	if err != nil {
		return exitUsage
	}
	if len(rest) != 0 {
		fmt.Fprintln(os.Stderr, "torshim shell: takes no arguments")
		return exitUsage
	}
	socks, cleanup, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitNotReady
	}
	defer cleanup()
	cfg := shell.Config{SocksAddr: socks}
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
		host, port := splitSocks(socks)
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
	socksAddr := fs.String("socks", "", "SOCKS endpoint to probe")
	sysDir := fs.String("state-dir", "", "system session dir (default /run/torshim or TORSHIM_STATEDIR)")
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
	return exitOK
}

func cmdVersion(args []string) int {
	fs := flag.NewFlagSet("version", flag.ContinueOnError)
	torBin := fs.String("tor", "tor", "tor executable")
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
	fmt.Println(trademarkNote)
	return exitOK
}

// syswideFlags are shared by connect/disconnect/repair.
type syswideFlags struct {
	stateDir string
	torBin   string
	timeout  time.Duration
}

func parseSyswide(fs *flag.FlagSet, args []string) (syswideFlags, error) {
	var sf syswideFlags
	fs.StringVar(&sf.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&sf.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.StringVar(&sf.stateDir, "state-dir", "", "session dir (default /run/torshim or TORSHIM_STATEDIR)")
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
	if runtime.GOOS != "linux" {
		return syswideUnsupported("connect")
	}
	return cmdConnectFull(args)
}

// cmdConnectFull parses the full connect flag set (split out so the
// Linux-only gate above stays trivially readable).
func cmdConnectFull(args []string) int {
	fs := flag.NewFlagSet("connect", flag.ContinueOnError)
	var backendName, torUser, stateDir, torBin string
	var timeout time.Duration
	var force bool
	var transPort int
	fs.StringVar(&backendName, "backend", "auto", "firewall backend: auto, iptables, nft")
	fs.StringVar(&torUser, "tor-user", "", "unprivileged user for the system tor (default: tor, debian-tor, _tor, nobody)")
	fs.StringVar(&stateDir, "state-dir", "", "session dir (default /run/torshim or TORSHIM_STATEDIR)")
	fs.StringVar(&torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.BoolVar(&force, "force", false, "repair a stale session, then connect")
	fs.IntVar(&transPort, "trans-port", syswide.DefaultTransPort, "fixed transparent proxy port")
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	if len(fs.Args()) != 0 {
		fmt.Fprintln(os.Stderr, "torshim connect: takes no positional arguments")
		return exitUsage
	}
	rep, err := syswide.Connect(syswide.Options{
		StateDir: stateDir, Backend: backendName, TorBinary: torBin,
		Timeout: timeout, Force: force, TorUser: torUser, TransPort: transPort,
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
	return exitOK
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
	if runtime.GOOS != "linux" {
		return syswideUnsupported("disconnect")
	}
	fs := flag.NewFlagSet("disconnect", flag.ContinueOnError)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim disconnect: %v\n", err)
		return exitUsage
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
	return exitOK
}

func cmdRepair(args []string) int {
	if runtime.GOOS != "linux" {
		return syswideUnsupported("repair")
	}
	fs := flag.NewFlagSet("repair", flag.ContinueOnError)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim repair: %v\n", err)
		return exitUsage
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
	return exitOK
}
