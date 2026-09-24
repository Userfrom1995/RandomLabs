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
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/control"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/diag"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/doctor"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/perapp"
	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/probe"
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
	code := run(os.Args[1:])
	diag.Close()
	os.Exit(code)
}

func run(argv []string) int {
	// Global verbosity flags are recognized before the command name
	// (research 16.4); everything else falls through untouched so the
	// bare form keeps handing its flags to the app.
	argv = diag.Prescan(argv)
	if len(argv) == 0 {
		usage()
		return exitUsage
	}
	// Apply the pre-scanned verbosity now so even the command line
	// below is visible at -v; commands re-Apply after their own flag
	// set parses (adds --json and subcommand-position globals).
	if err := diag.Apply(diag.Options{}); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
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
	case "run", "shell", "status", "doctor", "version", "--version", "-V",
		"connect", "disconnect", "repair", "help", "--help", "-h":
		return true
	}
	return false
}

// exitCodeTable is the binding exit-code contract, printed on every
// help surface (research 19: keep it on help, doctor, man, README).
const exitCodeTable = `Exit codes:
  0  success (status --verify: verdict protected)
  1  runtime failure (status --verify: degraded or unverified)
  2  usage error
  3  tor not ready (fail-closed)
  4  feature unavailable on this platform
`

// parseFlags parses fs with -h/--help routed to usage(os.Stdout) at
// exit 0 and any parse error routed to usage(os.Stderr) at exit 2.
// The flag package's own output is discarded so help text lands on
// stdout with the exit-code table (the --help exit-0 fix, research
// P0.4). Returns ok=false when the caller must return code.
func parseFlags(fs *flag.FlagSet, args []string, usage func(io.Writer)) (ok bool, code int) {
	fs.SetOutput(io.Discard)
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			usage(os.Stdout)
			return false, exitOK
		}
		fmt.Fprintf(os.Stderr, "torshim %s: %v\n", fs.Name(), err)
		usage(os.Stderr)
		return false, exitUsage
	}
	return true, exitOK
}

// printUsage renders cmd-specific usage plus the shared exit-code
// table and trademark line.
func printUsage(w io.Writer, body string) {
	fmt.Fprint(w, body)
	fmt.Fprint(w, "\n"+exitCodeTable+"\n"+trademarkNote+"\n")
}

func usage() {
	body := fmt.Sprintf(`%s

Usage:
  torshim run [--tor BIN] [--timeout D] [--reuse] [-- -v ...] -- <app> [args...]
  torshim <app> [args...]          same as run (shim on Linux, proxy env elsewhere)
  torshim shell                    child shell routed through Tor
  sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
  torshim disconnect               restore pre-connect networking (needs sudo)
  torshim repair                   clear stale rules/state (needs sudo)
  torshim status [--json] [--verify [--check-url URL]]
                                   never claims protected when not;
                                   --verify proves egress through Tor
  torshim doctor [--deep] [--json] read-only environment diagnostics
  torshim version                  wrapper + tor + backend versions

Verbosity (global: before the command, inside a command's flags, or
before -- in run/shell; never stolen from a bare app):
  -v  info: steps, endpoints, modes, verdict line
  -vv debug: adds control chatter, child log level, retries
  -vvv trace: adds per-poll timestamps
  -q  errors only
  --log-level quiet|error|warn|info|debug|trace   wins over -v/-q
  --log-file FILE                 tee log lines to FILE (bug reports)

Per-app routing uses torsocks on Linux (fail-closed shim) and proxy
environment (socks5h, DNS exit-side when the app honors it) on macOS
and Windows - only apps honoring proxy env are covered there.
System-wide connect/disconnect is Linux-only (iptables/nft); macOS and
Windows system-wide needs a tun2socks backend (not shipped) and refuses honestly.
While connected, TCP goes through Tor, DNS resolves through Tor,
non-DNS UDP/ICMP is blocked, and IPv6 is blocked.

See tor-cli/README.md for details.
`, trademarkNote)
	printUsage(os.Stdout, body)
}

// newFlagSet builds a flag set whose own error/help chatter is
// discarded: parseFlags/flagsFailed own all of that output, so --help
// goes to stdout at exit 0 and parse errors go to stderr at exit 2.
func newFlagSet(name string) *flag.FlagSet {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	return fs
}

// flagsFailed renders a failed flag parse: ErrHelp is success with the
// usage on stdout (the --help exit-0 contract), anything else is a
// usage error at exit 2 with the usage on stderr.
func flagsFailed(fs *flag.FlagSet, err error, usage func(io.Writer)) int {
	if errors.Is(err, flag.ErrHelp) {
		usage(os.Stdout)
		return exitOK
	}
	fmt.Fprintf(os.Stderr, "torshim %s: %v\n", fs.Name(), err)
	usage(os.Stderr)
	return exitUsage
}

// applyDiag finalizes verbosity after flag parsing (JSON runs drop to
// warn unless logging was configured explicitly).
func applyDiag(jsonMode bool) error {
	return diag.Apply(diag.Options{JSON: jsonMode})
}

// logCommand emits the Owner's "command and flags parsed" line. It
// must run AFTER the command's applyDiag so a --json run's log-level
// drop swallows it and stdout stays payload-only.
func logCommand(name string, args []string) {
	diag.Logf(diag.Info, diag.StageCLI, "command=%q args=%q", name, args)
}

// usageRun is the `torshim run` help body.
func usageRun(w io.Writer) {
	printUsage(w, `Usage:
  torshim run [--tor BIN] [--timeout D] [--reuse] [--log-level L] [--log-file F] -- <app> [args...]
  torshim <app> [args...]   bare form: everything after the app name goes to the app
                            (torshim curl -v URL gives -v to curl)

Launches (or reuses, with --reuse) a private tor instance, waits for
readiness, then execs the application through the per-app backend.`)
}

// usageShell is the `torshim shell` help body.
func usageShell(w io.Writer) {
	printUsage(w, `Usage:
  torshim shell [--tor BIN] [--timeout D] [--reuse]

Opens a child shell whose processes route through Tor; the parent shell
is untouched. A coverage banner states the mechanism, endpoints, and
what is not covered.`)
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

// readyInfo carries what the terminal verdict line needs after a
// successful launch: elapsed time to readiness (the diagnostic clock
// stops at ready, not when the child exits).
type readyInfo struct {
	Elapsed time.Duration
}

// ensureTor returns a ready SOCKS endpoint, readiness metadata, plus a
// cleanup func. Default is a private owned instance; --reuse attempts a
// verifiable foreign tor first. Diagnostics answer the Owner's -v
// acceptance list: instance decision, endpoints, timing.
func ensureTor(lf launchFlags) (socksAddr string, ready readyInfo, cleanup func(), err error) {
	start := time.Now()
	if lf.reuse {
		if addr, ok, rerr := tryReuse(lf); rerr != nil {
			return "", readyInfo{}, nil, rerr
		} else if ok {
			return addr, readyInfo{Elapsed: time.Since(start)}, func() {}, nil
		}
	}
	diag.Logf(diag.Info, diag.StageLife, "launching private instance tor=%q timeout=%s reuse=%v",
		lf.torBin, lf.timeout, lf.reuse)
	in, err := lifecycle.Launch(lifecycle.Options{TorBinary: lf.torBin, Timeout: lf.timeout})
	if err != nil {
		return "", readyInfo{}, nil, err
	}
	diag.Logf(diag.Info, diag.StageLife,
		"private instance up pid=%d data_dir=%s socks=%s control=%s dns_port=%d trans_port=%d elapsed=%s",
		in.Pid, in.DataDir, in.SocksAddr(), in.ControlAddr(), in.DNSPort, in.TransPort, time.Since(start).Round(time.Millisecond))
	// Ctrl-C/SIGTERM during the app run must not orphan the owned tor.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		in.Stop()
		os.Exit(130)
	}()
	return in.SocksAddr(), readyInfo{Elapsed: time.Since(start)}, func() {
		signal.Stop(sigCh)
		in.Stop()
	}, nil
}

// failReason maps a launch error onto the verdict reason slug and an
// actionable remediation (verdict line, research 16.3).
func failReason(err error) (reason, remediation string) {
	msg := err.Error()
	switch {
	case strings.Contains(msg, "not found on PATH"):
		return "tor_binary_missing", `install tor (package "tor") and retry`
	case strings.Contains(msg, "within deadline") || strings.Contains(msg, "timed out"):
		return "bootstrap_timeout", "check network reachability or raise --timeout"
	case strings.Contains(msg, "unverifiable"):
		return "control_auth_unverified", "stop the foreign tor or drop --reuse for a private instance"
	case strings.Contains(msg, "dial control") || strings.Contains(msg, "control:"):
		return "control_unreachable", "run torshim doctor to diagnose the control endpoint"
	case strings.Contains(msg, "SOCKS") || strings.Contains(msg, "socks"):
		return "socks_not_serving", "run torshim doctor to diagnose the SOCKS endpoint"
	default:
		return "launch_failed", "run torshim doctor for a full diagnosis"
	}
}

// verdictReady emits the terminal success verdict (only at -v and up).
func verdictReady(mode, mechanism, socks string, ready readyInfo) {
	diag.Verdictf("torshim: ready mode=%s mechanism=%s socks=%s bootstrap=100%% (done) circuit=established elapsed=%.1fs",
		mode, mechanism, socks, ready.Elapsed.Seconds())
}

// verdictFailed emits the terminal failure verdict (only at -v and up;
// the error itself already printed on the user channel).
func verdictFailed(err error) {
	reason, remediation := failReason(err)
	diag.Verdictf("torshim: NOT protected reason=%s remediation=%s", reason, remediation)
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
	// Post-auth: name the exact process being reused (Owner acceptance
	// list: instance decision with pid and version).
	if v, perr := ctl.GetOne("process/id"); perr == nil {
		if n, cerr := strconv.Atoi(strings.TrimSpace(v)); cerr == nil {
			f.Pid = n
		}
	}
	if f.Pid > 0 {
		diag.Logf(diag.Warn, diag.StageLife, "reusing foreign tor at %s pid=%d version=%q (will not stop it)",
			f.SocksAddr, f.Pid, f.Version)
	} else {
		diag.Logf(diag.Warn, diag.StageLife, "reusing foreign tor at %s version=%q (will not stop it)",
			f.SocksAddr, f.Version)
	}
	return f.SocksAddr, true, nil
}

func cmdRun(args []string) int {
	fs := newFlagSet("run")
	diag.Register(fs)
	lf, rest, err := parseLaunch(fs, args)
	if err != nil {
		return flagsFailed(fs, err, usageRun)
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	logCommand("run", args)
	if len(rest) == 0 {
		fmt.Fprintln(os.Stderr, "torshim run: no application given")
		usageRun(os.Stderr)
		return exitUsage
	}
	diag.Logf(diag.Info, diag.StageCLI, "run: tor=%q timeout=%s reuse=%v app=%q",
		lf.torBin, lf.timeout, lf.reuse, rest)
	socks, ready, cleanup, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		verdictFailed(err)
		return exitNotReady
	}
	defer cleanup()
	mechanism := "torsocks"
	if perapp.NeedsProxy() {
		mechanism = "proxy-env"
	}
	diag.Logf(diag.Info, diag.StagePerApp, "mechanism=%s socks=%s", mechanism, socks)
	code := runApp(socks, rest)
	verdictReady("per-app", mechanism, socks, ready)
	return code
}

// runApp executes the application through the platform backend and
// returns its exit code (shared by the run and bare-app forms).
func runApp(socks string, argv []string) int {
	if perapp.NeedsProxy() {
		// macOS/Windows (M4): proxy-environment backend, no torsocks
		// conf dir needed. Run prints the honest coverage note.
		res, err := perapp.Run(socks, argv, nil, "")
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
	res, err := perapp.Run(socks, argv, nil, confDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	return res.ExitCode
}

func cmdShell(args []string) int {
	fs := newFlagSet("shell")
	diag.Register(fs)
	lf, rest, err := parseLaunch(fs, args)
	if err != nil {
		return flagsFailed(fs, err, usageShell)
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	logCommand("shell", args)
	if len(rest) != 0 {
		fmt.Fprintln(os.Stderr, "torshim shell: takes no arguments")
		usageShell(os.Stderr)
		return exitUsage
	}
	diag.Logf(diag.Info, diag.StageCLI, "shell: tor=%q timeout=%s reuse=%v", lf.torBin, lf.timeout, lf.reuse)
	socks, ready, cleanup, err := ensureTor(lf)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		verdictFailed(err)
		return exitNotReady
	}
	defer cleanup()
	cfg := shell.Config{SocksAddr: socks}
	mechanism := "proxy-env"
	if perapp.NeedsProxy() {
		// macOS/Windows (M4): proxy env only, no DYLD/LSP shim.
		// Spawn prints the coverage banner; nothing to probe.
		code, err := shell.Spawn(cfg)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		verdictReady("shell", mechanism, socks, ready)
		return code
	}
	if lib, lerr := perapp.FindLib(); lerr == nil {
		mechanism = "torsocks"
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
		diag.Logf(diag.Warn, diag.StageShell, "torsocks not found (%v); shell uses proxy env only", lerr)
	}
	code, err := shell.Spawn(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	verdictReady("shell", mechanism, socks, ready)
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

// usageStatus is the `torshim status` help body.
func usageStatus(w io.Writer) {
	printUsage(w, `Usage:
  torshim status [--json] [--verify [--check-url URL]] [--control ADDR] [--socks ADDR] [--state-dir DIR]

Reports instance state without ever claiming protection when it is
not established. Plain status always exits 0. --verify probes egress
through the exact configured socks5h endpoint (IsTor check) and exits
0 only when the verdict is protected, else 1.`)
}

// usageDoctor is the `torshim doctor` help body.
func usageDoctor(w io.Writer) {
	printUsage(w, `Usage:
  torshim doctor [--deep] [--json] [--tor BIN] [--control ADDR] [--socks ADDR] [--check-url URL] [--timeout D]

Read-only environment diagnostics: ten baseline checks (tor binary,
per-app mechanism, control, bootstrap, SOCKS, port conflicts, session
state, env hygiene, bridges, platform coverage) plus, with --deep,
three live network checks (IsTor probe, IPv6 posture, clock sanity).
Exit 0 all pass, 1 any failed, 2 usage. Doctor never mutates state.`)
}

func cmdStatus(args []string) int {
	fs := newFlagSet("status")
	asJSON := fs.Bool("json", false, "machine-readable output")
	verify := fs.Bool("verify", false, "probe egress through the configured SOCKS endpoint (exit 0 iff verdict protected)")
	checkURL := fs.String("check-url", probe.DefaultCheckURL, "IsTor probe URL for --verify")
	ctlAddr := fs.String("control", "", "control endpoint (default 127.0.0.1:9051, fallback 9151)")
	socksAddr := fs.String("socks", "", "SOCKS endpoint to probe")
	sysDir := fs.String("state-dir", "", "system session dir (default /run/torshim or TORSHIM_STATEDIR)")
	diag.Register(fs)
	if ok, code := parseFlags(fs, args, usageStatus); !ok {
		return code
	}
	if err := applyDiag(*asJSON); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	if *socksAddr == "" {
		*socksAddr = os.Getenv("TORSHIM_SOCKS")
	}
	logCommand("status", args)
	diag.Logf(diag.Debug, diag.StageStatus, "endpoints control=%q socks=%q state_dir=%q verify=%v check_url=%q",
		*ctlAddr, *socksAddr, *sysDir, *verify, *checkURL)
	diag.Logf(diag.Info, diag.StageStatus, "flags json=%v verify=%v control=%q socks=%q state_dir=%q",
		*asJSON, *verify, *ctlAddr, *socksAddr, *sysDir)
	rep := status.Collect(status.Options{ControlAddr: *ctlAddr, SocksAddr: *socksAddr, SystemStateDir: *sysDir})
	diag.Logf(diag.Info, diag.StageStatus, "collected state=%s running=%v protected=%v note=%q",
		rep.State, rep.Running, rep.Protected, rep.Note)
	if !*verify {
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
	// --verify: live proof through the exact configured endpoint
	// (research 16.2 binding rule).
	res := probe.Verify(probe.Options{
		SocksAddr:  rep.SocksAddr,
		CheckURL:   *checkURL,
		Timeout:    3 * time.Second,
		GatesReady: rep.Protected,
		GatesNote:  rep.Note,
	})
	rep.Verdict = string(res.Verdict)
	rep.CheckURL = res.CheckURL
	rep.ExitIP = res.ExitIP
	diag.Logf(diag.Info, diag.StageVerify, "verdict=%s failed_check=%q detail=%q exit_ip=%q",
		res.Verdict, res.FailedCheck, res.Detail, res.ExitIP)
	if *asJSON {
		out, err := status.RenderJSON(rep)
		if err != nil {
			fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
			return exitError
		}
		fmt.Print(out)
	} else {
		fmt.Print(status.RenderText(rep))
		fmt.Printf("verdict: %s\n", res.Verdict)
		if res.Verdict != probe.VerdictProtected {
			fmt.Printf("failed check: %s (%s)\n", res.FailedCheck, res.Detail)
		}
	}
	if res.Verdict == probe.VerdictProtected {
		return exitOK
	}
	return exitError
}

// cmdDoctor runs the read-only environment diagnostics (research 16.1).
func cmdDoctor(args []string) int {
	fs := newFlagSet("doctor")
	deep := fs.Bool("deep", false, "add live network checks (IsTor probe, IPv6 posture, clock sanity)")
	asJSON := fs.Bool("json", false, "machine-readable output")
	torBin := fs.String("tor", "tor", "tor executable")
	ctlAddr := fs.String("control", "", "control endpoint (default 127.0.0.1:9051, fallback 9151)")
	socksAddr := fs.String("socks", "", "SOCKS endpoint to probe (default 9050, or 9150 next to control 9151)")
	sysDir := fs.String("state-dir", "", "system session dir (default /run/torshim or TORSHIM_STATEDIR)")
	checkURL := fs.String("check-url", probe.DefaultCheckURL, "probe URL for --deep checks")
	timeout := fs.Duration("timeout", 3*time.Second, "per-check network timeout")
	diag.Register(fs)
	if ok, code := parseFlags(fs, args, usageDoctor); !ok {
		return code
	}
	if err := applyDiag(*asJSON); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	if *socksAddr == "" {
		*socksAddr = os.Getenv("TORSHIM_SOCKS")
	}
	logCommand("doctor", args)
	diag.Logf(diag.Info, diag.StageDoctor, "flags deep=%v json=%v control=%q socks=%q check_url=%q",
		*deep, *asJSON, *ctlAddr, *socksAddr, *checkURL)
	rep := doctor.Run(doctor.Options{
		TorBinary:   *torBin,
		ControlAddr: *ctlAddr,
		SocksAddr:   *socksAddr,
		StateDir:    *sysDir,
		CheckURL:    *checkURL,
		Deep:        *deep,
		Timeout:     *timeout,
	})
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
	if rep.Overall == "pass" {
		return exitOK
	}
	return exitError
}

// usageVersion is the `torshim version` help body.
func usageVersion(w io.Writer) {
	printUsage(w, `Usage:
  torshim version [--tor BIN]

Prints wrapper, platform, backend, tor, and torsocks versions.`)
}

func cmdVersion(args []string) int {
	fs := newFlagSet("version")
	torBin := fs.String("tor", "tor", "tor executable")
	diag.Register(fs)
	if ok, code := parseFlags(fs, args, usageVersion); !ok {
		return code
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	logCommand("version", args)
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
	// Usage errors surface identically on every OS (exit 2), so flag
	// parsing runs before the Linux-only gate below. The gate still
	// fires for well-formed invocations off-Linux (honest exit 4).
	// done separates "usage rendered, stop" from success: --help maps
	// to exitOK yet must still terminate here instead of falling
	// through into the networking path.
	o, code, done := parseConnectFlags(args)
	if done {
		return code
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	if runtime.GOOS != "linux" {
		return syswideUnsupported("connect")
	}
	logCommand("connect", args)
	diag.Logf(diag.Info, diag.StageSyswide, "connect: backend=%q force=%v trans_port=%d state_dir=%q",
		o.backendName, o.force, o.transPort, o.stateDir)
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
		diag.Logf(diag.Info, diag.StageSyswide, "already active: backend=%s since=%s", rep.State.Backend, rep.State.CreatedAt)
		fmt.Printf("already connected (backend %s since %s)\n", rep.State.Backend, rep.State.CreatedAt)
		return exitOK
	}
	printVerify(rep)
	diag.Logf(diag.Info, diag.StageSyswide, "connected via backend=%s backup=%s", rep.State.Backend, rep.BackupDir)
	fmt.Printf("connected: system-wide via %s (backup %s)\n", rep.State.Backend, rep.BackupDir)
	if rep.ResolvWarning != "" {
		fmt.Printf("warning: %s\n", rep.ResolvWarning)
	}
	return exitOK
}

// connectFlags carries the parsed connect flag set (no side effects from
// parsing alone, so this doubles as the cross-OS usage pre-check).
type connectFlags struct {
	backendName, torUser, stateDir, torBin string
	timeout                                time.Duration
	force                                  bool
	transPort                              int
}

func defineConnectFlags(fs *flag.FlagSet, o *connectFlags) {
	fs.StringVar(&o.backendName, "backend", "auto", "firewall backend: auto, iptables, nft")
	fs.StringVar(&o.torUser, "tor-user", "", "unprivileged user for the system tor (default: tor, debian-tor, _tor, nobody)")
	fs.StringVar(&o.stateDir, "state-dir", "", "session dir (default /run/torshim or TORSHIM_STATEDIR)")
	fs.StringVar(&o.torBin, "tor", "tor", "tor executable")
	fs.DurationVar(&o.timeout, "timeout", 120*time.Second, "bootstrap wait budget")
	fs.BoolVar(&o.force, "force", false, "repair a stale session, then connect")
	fs.IntVar(&o.transPort, "trans-port", syswide.DefaultTransPort, "fixed transparent proxy port")
}

// usageConnect is the `torshim connect` help body.
func usageConnect(w io.Writer) {
	printUsage(w, `Usage:
  sudo torshim connect [--backend auto|iptables|nft] [--tor-user USER]
                       [--state-dir DIR] [--tor BIN] [--timeout D] [--force] [--trans-port PORT]

Brings up system-wide transparent routing through Tor (Linux-only:
iptables/nft backend), verifies every rule, and fails closed if
verification does not pass.`)
}

// parseConnectFlags parses the full connect flag set, returning the
// exit code plus a done flag: done=true means usage was already
// rendered (--help to stdout at 0, malformed to stderr at 2) and the
// caller must stop.
func parseConnectFlags(args []string) (connectFlags, int, bool) {
	var o connectFlags
	fs := newFlagSet("connect")
	defineConnectFlags(fs, &o)
	diag.Register(fs)
	if err := fs.Parse(args); err != nil {
		return o, flagsFailed(fs, err, usageConnect), true
	}
	if len(fs.Args()) != 0 {
		return o, flagsFailed(fs, fmt.Errorf("takes no positional arguments"), usageConnect), true
	}
	return o, exitOK, false
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

// usageDisconnect is the `torshim disconnect` help body.
func usageDisconnect(w io.Writer) {
	printUsage(w, `Usage:
  sudo torshim disconnect [--state-dir DIR] [--tor BIN] [--timeout D]

Restores pre-connect networking: removes torshim firewall rules and
restores the resolver snapshot (Linux-only). Idempotent: running it
when not connected succeeds with "not connected".`)
}

func cmdDisconnect(args []string) int {
	// Usage errors surface identically on every OS (exit 2): parsing is
	// side-effect free, so it runs before the Linux-only gate.
	fs := newFlagSet("disconnect")
	diag.Register(fs)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		return flagsFailed(fs, err, usageDisconnect)
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	logCommand("disconnect", args)
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
	return exitOK
}

// usageRepair is the `torshim repair` help body.
func usageRepair(w io.Writer) {
	printUsage(w, `Usage:
  sudo torshim repair [--state-dir DIR] [--tor BIN] [--timeout D]

Clears stale torshim session state and firewall rules (Linux-only),
reporting every action it took.`)
}

func cmdRepair(args []string) int {
	// Usage errors surface identically on every OS (exit 2): parsing is
	// side-effect free, so it runs before the Linux-only gate.
	fs := newFlagSet("repair")
	diag.Register(fs)
	sf, err := parseSyswide(fs, args)
	if err != nil {
		return flagsFailed(fs, err, usageRepair)
	}
	if err := applyDiag(false); err != nil {
		fmt.Fprintf(os.Stderr, "torshim: %v\n", err)
		return exitError
	}
	logCommand("repair", args)
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
	return exitOK
}
