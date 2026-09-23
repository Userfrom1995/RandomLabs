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
	"syscall"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/perapp"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/shell"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/status"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/version"
)

// Exit codes: 0 ok, 1 runtime/app failure, 2 usage, 3 tor not ready
// (fail-closed), 4 feature lands in a later milestone.
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
	case "connect", "disconnect":
		fmt.Fprintf(os.Stderr, "torshim: system-wide %q lands in M3 (Linux iptables/nft backends).\n", cmd)
		fmt.Fprintf(os.Stderr, "M2 covers per-app (`torshim run`) and `torshim shell` on Linux.\n")
		return exitFutureMile
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
		"connect", "disconnect", "help", "--help", "-h":
		return true
	}
	return false
}

func usage() {
	fmt.Printf(`%s

Usage:
  torshim run [--tor BIN] [--timeout D] [--reuse] -- <app> [args...]
  torshim <app> [args...]          same as run (Linux: torsocks shim)
  torshim shell                    child shell routed through Tor
  torshim status [--json]          never claims protected when not
  torshim version                  wrapper + tor + backend versions

Per-app on Linux uses torsocks (fail-closed). Static binaries, setuid
tools, and non-ELF executables are refused: they would silently bypass
the shim. System-wide connect/disconnect lands in M3.

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
	if err := fs.Parse(args); err != nil {
		return exitUsage
	}
	rep := status.Collect(status.Options{ControlAddr: *ctlAddr, SocksAddr: *socksAddr})
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
	fmt.Printf("tor: %s\n", info.Tor)
	fmt.Printf("torsocks: %s\n", info.Torsocks)
	fmt.Println(trademarkNote)
	return exitOK
}
