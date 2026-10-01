// Launch supervision split: wait (CLI default) versus detach (GUI path).
//
// Both modes share the exact same routing environment (torsocks shim on
// Linux, proxy env on macOS/Windows); only supervision differs. Run and
// RunProxy keep their signatures as wait-mode wrappers so existing
// callers and tests are unaffected; the Options variants carry the new
// flags.
package perapp

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// LaunchOptions carries the supervision choice for a per-app launch.
type LaunchOptions struct {
	// Detach selects the GUI path: Start plus Release into a new
	// process group, stdio detached, bounded alive poll, parent
	// returns promptly with the child PID.
	Detach bool
	// LogFile redirects detached child stdout/stderr to a file.
	// Empty means the null device. Ignored in wait mode.
	LogFile string
	// AlivePoll bounds the post-start health check in detach mode.
	// Zero selects the default (2 s). A fast-failing child (bad
	// binary, missing display) surfaces its exit instead of a PID.
	AlivePoll time.Duration
	// HTTPTunnelAddr carries an optional Tor HTTPTunnelPort listener (e.g. 127.0.0.1:45679)
	// for applications (like QtWebEngine / Falkon) that require an HTTP CONNECT proxy.
	HTTPTunnelAddr string
}

// LaunchResult carries either a wait-mode exit code or a detach-mode PID.
type LaunchResult struct {
	ExitCode int
	Detached bool
	PID      int
}

func aliveBudget(o LaunchOptions) time.Duration {
	if o.AlivePoll > 0 {
		return o.AlivePoll
	}
	return 2 * time.Second
}

// RunWithOptions executes app argv under torsocks with supervision per
// opts. Classification, shim discovery, and conf generation are
// identical in both modes; only the final spawn differs.
func RunWithOptions(socksAddr string, argv []string, extraEnv []string, confDir string, opts LaunchOptions) (RunResult, error) {
	if NeedsProxy() {
		res, err := RunProxyWithOptions(socksAddr, argv, extraEnv, opts)
		return RunResult{ExitCode: res.ExitCode}, err
	}
	if len(argv) == 0 {
		return RunResult{}, fmt.Errorf("perapp: no application given")
	}
	bin := argv[0]
	if !strings.Contains(bin, string(os.PathSeparator)) {
		lp, err := exec.LookPath(bin)
		if err != nil {
			return RunResult{}, fmt.Errorf("perapp: %q not found on PATH: %w", bin, err)
		}
		bin = lp
	}
	switch DetectBrowser(bin) {
	case BrowserKindFirefox:
		return runFirefoxNative(socksAddr, bin, argv[1:], confDir, opts)
	case BrowserKindChromium:
		return runChromiumNative(socksAddr, bin, argv[1:], opts)
	}
	class, reason, err := ClassifyTarget(bin)
	if err != nil {
		return RunResult{}, err
	}
	if class == ShimBypass {
		return RunResult{}, fmt.Errorf("perapp: refusing %s: %s", bin, reason)
	}
	lib, err := FindLib()
	if err != nil {
		return RunResult{}, err
	}
	host, port := splitAddr(socksAddr)
	confPath := confDir + string(os.PathSeparator) + "torsocks.conf"
	if confDir == "" {
		confPath = os.DevNull
	} else if err := WriteConf(confPath, host, port); err != nil {
		return RunResult{}, fmt.Errorf("perapp: write torsocks conf: %w", err)
	}
	cmd := exec.Command(bin, argv[1:]...)
	cmd.Env = Env(os.Environ(), lib, confPath)
	for _, kv := range extraEnv {
		if shimOwned(envKey(kv)) {
			continue
		}
		cmd.Env = append(cmd.Env, kv)
	}
	if opts.Detach {
		pid, derr := startDetached(cmd, opts.LogFile, aliveBudget(opts))
		if derr != nil {
			return RunResult{}, derr
		}
		return RunResult{ExitCode: 0, Detached: true, PID: pid}, nil
	}
	return runWait(cmd)
}

// RunProxyWithOptions executes app argv with the proxy environment and
// supervision per opts. There is no ELF classification on this path
// (proxy env applies at the application layer); unknown binaries still
// fail closed on empty argv and missing PATH entries.
func RunProxyWithOptions(socksAddr string, argv []string, extraEnv []string, opts LaunchOptions) (RunResult, error) {
	if len(argv) == 0 {
		return RunResult{}, fmt.Errorf("perapp: no application given")
	}
	if socksAddr == "" {
		return RunResult{}, fmt.Errorf("perapp: no SOCKS endpoint (tor not ready?)")
	}
	bin := argv[0]
	if !strings.Contains(bin, string(os.PathSeparator)) {
		lp, err := exec.LookPath(bin)
		if err != nil {
			return RunResult{}, fmt.Errorf("perapp: %q not found on PATH: %w", bin, err)
		}
		bin = lp
	}
	if _, err := os.Stat(bin); err != nil {
		return RunResult{}, fmt.Errorf("perapp: stat %s: %w", bin, err)
	}
	switch DetectBrowser(bin) {
	case BrowserKindFirefox:
		confDir, _ := os.MkdirTemp("", "torshim-ff-*")
		return runFirefoxNative(socksAddr, bin, argv[1:], confDir, opts)
	case BrowserKindChromium:
		return runChromiumNative(socksAddr, bin, argv[1:], opts)
	}
	fmt.Fprintln(os.Stderr, CoverageNote())
	if name, ok := GUIAppName(bin); ok && !LooksHeadless(argv) {
		fmt.Fprintf(os.Stderr, "torshim: GUI note: %s runs detached with partial proxy coverage (only honoring connections routed; GPU/D-Bus/single-instance IPC bypass Tor). Prefer Tor Browser for fingerprint-sensitive browsing.\n", name)
	}
	cmd := exec.Command(bin, argv[1:]...)
	cmd.Env = ProxyEnv(os.Environ(), socksAddr)
	for _, kv := range extraEnv {
		if proxyOwned(envKey(kv)) {
			continue
		}
		cmd.Env = append(cmd.Env, kv)
	}
	if opts.Detach {
		pid, derr := startDetached(cmd, opts.LogFile, aliveBudget(opts))
		if derr != nil {
			return RunResult{}, derr
		}
		return RunResult{ExitCode: 0, Detached: true, PID: pid}, nil
	}
	return runWait(cmd)
}

// detachedPID is reported to the caller via stderr by startDetached;
// the Run wrappers translate it into the parent's prompt output in
// main.go. Keeping the print inside startDetached guarantees the PID
// line exists even for library callers.

// startDetached starts cmd in a new process group with stdio detached,
// waits up to budget for an early failure, releases the child on
// success, and reports its PID. An early exit is returned as an error
// carrying the exit code so a broken GUI launch (missing display,
// bad binary) fails loudly instead of printing a stale PID.
func startDetached(cmd *exec.Cmd, logFile string, budget time.Duration) (int, error) {
	setDetached(cmd)
	stdout, stderr, cleanup, err := detachFiles(logFile)
	if err != nil {
		return 0, err
	}
	defer cleanup()
	cmd.Stdin = devNull()
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	if err := cmd.Start(); err != nil {
		return 0, fmt.Errorf("perapp: detach start %s: %w", cmd.Path, err)
	}
	pid := cmd.Process.Pid
	waitCh := make(chan error, 1)
	go func() { waitCh <- cmd.Wait() }()
	select {
	case werr := <-waitCh:
		if werr != nil {
			if ee, ok := werr.(*exec.ExitError); ok {
				return 0, fmt.Errorf("perapp: detached %s exited early with code %d (see %s)", cmd.Path, ee.ExitCode(), logTarget(logFile))
			}
			return 0, fmt.Errorf("perapp: detached %s failed early: %w", cmd.Path, werr)
		}
		return 0, fmt.Errorf("perapp: detached %s exited immediately with code 0 (nothing to supervise)", cmd.Path)
	case <-time.After(budget):
	}
	if err := cmd.Process.Release(); err != nil {
		return 0, fmt.Errorf("perapp: detach release pid %d: %w", pid, err)
	}
	return pid, nil
}

func logTarget(logFile string) string {
	if logFile != "" {
		return logFile
	}
	return "stderr discarded (use --log-file to capture)"
}

// runWait starts cmd in its own process group, forwards SIGINT/SIGTERM
// to the whole group (so Ctrl-C reaches multiprocess GUI children and
// CLI pipelines alike), blocks until exit, and passes the exit code
// through. A signal-terminated child yields its conventional 128+sig
// code path via ExitError.
func runWait(cmd *exec.Cmd) (RunResult, error) {
	setGrouped(cmd)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := cmd.Start(); err != nil {
		return RunResult{}, fmt.Errorf("perapp: exec %s: %w", cmd.Path, err)
	}
	sigCh := make(chan os.Signal, 2)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(sigCh)
	done := make(chan struct{})
	defer close(done)
	go func() {
		for {
			select {
			case <-done:
				return
			case sig := <-sigCh:
				forwardSignal(cmd.Process, sig)
			}
		}
	}()
	if err := cmd.Wait(); err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			return RunResult{ExitCode: ee.ExitCode()}, nil
		}
		return RunResult{}, fmt.Errorf("perapp: exec %s: %w", cmd.Path, err)
	}
	return RunResult{ExitCode: 0}, nil
}

func runFirefoxNative(socksAddr, bin string, args []string, confDir string, opts LaunchOptions) (RunResult, error) {
	host, port := splitAddr(socksAddr)
	profileDir := filepath.Join(confDir, "firefox-profile")
	if err := os.MkdirAll(profileDir, 0o700); err != nil {
		return RunResult{}, fmt.Errorf("perapp: create firefox profile: %w", err)
	}
	userJS := fmt.Sprintf(`user_pref("network.proxy.type", 1);
user_pref("network.proxy.socks", %q);
user_pref("network.proxy.socks_port", %d);
user_pref("network.proxy.socks_version", 5);
user_pref("network.proxy.socks_remote_dns", true);
user_pref("network.proxy.no_proxies_on", "localhost, 127.0.0.1");
user_pref("network.trr.mode", 5);
user_pref("network.dns.disableIPv6", true);
user_pref("browser.safebrowsing.malware.enabled", false);
user_pref("browser.safebrowsing.phishing.enabled", false);
`, host, port)
	if err := os.WriteFile(filepath.Join(profileDir, "user.js"), []byte(userJS), 0o600); err != nil {
		return RunResult{}, fmt.Errorf("perapp: write firefox user.js: %w", err)
	}
	fmt.Fprintf(os.Stderr, "torshim: launching %s with native Tor SOCKS proxy profile (remote DNS enabled, no LD_PRELOAD)\n", filepath.Base(bin))
	cmdArgs := []string{"-profile", profileDir, "--no-remote"}
	cmdArgs = append(cmdArgs, args...)
	cmd := exec.Command(bin, cmdArgs...)
	cmd.Env = os.Environ()
	if opts.Detach {
		pid, derr := startDetached(cmd, opts.LogFile, aliveBudget(opts))
		if derr != nil {
			return RunResult{}, derr
		}
		return RunResult{ExitCode: 0, Detached: true, PID: pid}, nil
	}
	return runWait(cmd)
}

func runChromiumNative(socksAddr, bin string, args []string, opts LaunchOptions) (RunResult, error) {
	base := strings.ToLower(filepath.Base(bin))
	fmt.Fprintf(os.Stderr, "torshim: launching %s with native Tor proxy flags (remote DNS enabled, sandbox preserved)\n", base)
	cmdArgs := []string{
		"--proxy-server=socks5://" + socksAddr,
	}
	if base != "falkon" {
		cmdArgs = append(cmdArgs, "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1")
	} else {
		hasNoRemote := false
		for _, a := range args {
			if a == "-r" || a == "--no-remote" {
				hasNoRemote = true
				break
			}
		}
		if !hasNoRemote {
			cmdArgs = append(cmdArgs, "--no-remote")
		}
	}
	cmdArgs = append(cmdArgs, args...)
	cmd := exec.Command(bin, cmdArgs...)
	cmd.Env = ProxyEnv(os.Environ(), socksAddr)
	if opts.HTTPTunnelAddr != "" {
		httpURL := "http://" + opts.HTTPTunnelAddr
		cmd.Env = append(cmd.Env,
			"HTTP_PROXY="+httpURL,
			"http_proxy="+httpURL,
			"HTTPS_PROXY="+httpURL,
			"https_proxy="+httpURL,
		)
	}
	if opts.Detach {
		pid, derr := startDetached(cmd, opts.LogFile, aliveBudget(opts))
		if derr != nil {
			return RunResult{}, derr
		}
		return RunResult{ExitCode: 0, Detached: true, PID: pid}, nil
	}
	return runWait(cmd)
}
