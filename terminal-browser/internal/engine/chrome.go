// Package engine owns the live-web path: Chromium sidecar location and
// launch, a stdlib-only CDP session, AX-tree styling plus grid reflow,
// and navigation with lite-mode blocklists and offline fail-closed errors.
//
// Phase 2 scope only: fetch and text render. Sessions, interaction, MCP,
// and extensions arrive in later phases and never appear as stubs here.
package engine

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// ChromeFloor is the minimum supported major version. Runs record the
// exact version per run; anything below the floor fails closed with a
// clear message instead of rendering half-broken pages.
const ChromeFloor = 140

// Locate searches for a usable Chromium binary. It prefers an explicit
// TB_CHROME override, then system Chrome/Chromium on PATH, then the
// well-known install paths per OS, then chrome-headless-shell. It
// returns the first candidate that exists and executes.
func Locate() (string, error) {
	if env := strings.TrimSpace(os.Getenv("TB_CHROME")); env != "" {
		if _, statErr := os.Stat(env); statErr == nil {
			return env, nil
		} else {
			return "", fmt.Errorf("TB_CHROME points at %q: %w", env, statErr)
		}
	}
	names := []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome-headless-shell"}
	for _, n := range names {
		if p, err := exec.LookPath(n); err == nil {
			return p, nil
		}
	}
	switch runtime.GOOS {
	case "darwin":
		cands := []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
		}
		for _, c := range cands {
			if _, err := os.Stat(c); err == nil {
				return c, nil
			}
		}
	case "windows":
		cands := []string{
			`C:\Program Files\Google\Chrome\Application\chrome.exe`,
			`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
		}
		for _, c := range cands {
			if _, err := os.Stat(c); err == nil {
				return c, nil
			}
		}
	default:
		for _, c := range []string{"/usr/bin/google-chrome", "/usr/bin/chromium", "/snap/bin/chromium"} {
			if _, err := os.Stat(c); err == nil {
				return c, nil
			}
		}
	}
	return "", fmt.Errorf("no Chrome found: install system Chrome or set TB_CHROME (see docs/engine.md)")
}

var versionRe = regexp.MustCompile(`(\d+)\.`)

// ChromeVersion runs the binary with --version and parses the major
// version. The exact string is recorded per run for the corpus log.
func ChromeVersion(bin string) (major int, full string, err error) {
	out, err := exec.Command(bin, "--version").Output()
	if err != nil {
		return 0, "", fmt.Errorf("chrome --version: %w", err)
	}
	full = strings.TrimSpace(string(out))
	m := versionRe.FindStringSubmatch(full)
	if m == nil {
		return 0, full, fmt.Errorf("unparseable chrome version %q", full)
	}
	major, _ = strconv.Atoi(m[1])
	return major, full, nil
}

// CheckFloor verifies the binary meets the Chrome floor. Below-floor
// binaries fail closed: callers surface an actionable error, never a
// half-rendered page.
func CheckFloor(bin string) (string, error) {
	major, full, err := ChromeVersion(bin)
	if err != nil {
		return full, err
	}
	if major < ChromeFloor {
		return full, fmt.Errorf("chrome %d below floor %d (%s): upgrade system Chrome", major, ChromeFloor, full)
	}
	return full, nil
}

// ProfileDir returns the persistent user-data directory for a profile.
// Phase 2 uses it for per-profile contexts; cookie and history sync
// land in Phase 3, but the directory isolation is real from day one.
func ProfileDir(profile string) string {
	if profile == "" {
		profile = "default"
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(os.TempDir(), "terminal-browser", "profiles", profile)
	}
	return filepath.Join(home, ".terminal-browser", "profiles", profile)
}

// FreePort binds :0 to discover an open loopback port for the
// remote-debugging endpoint.
func FreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

// LaunchOpts tunes one headless Chromium sidecar.
type LaunchOpts struct {
	Binary  string
	Profile string
	Port    int
	Extra   []string
	Timeout time.Duration
}

// Process is one running sidecar: the child plus its DevTools endpoint.
type Process struct {
	Cmd     *exec.Cmd
	Port    int
	Bin     string
	Version string
	Dir     string
}

// Launch starts headless Chromium with a remote-debugging port and waits
// for the DevTools HTTP endpoint. Transport notes: Linux and macOS use
// a TCP loopback port; Windows prefers the same port transport (pipe
// transport documented in docs/engine.md for AV-constrained hosts).
func Launch(o LaunchOpts) (*Process, error) {
	bin := o.Binary
	if bin == "" {
		var err error
		bin, err = Locate()
		if err != nil {
			return nil, err
		}
	}
	ver, err := CheckFloor(bin)
	if err != nil {
		return nil, err
	}
	port := o.Port
	if port == 0 {
		var err error
		port, err = FreePort()
		if err != nil {
			return nil, err
		}
	}
	dir := ProfileDir(o.Profile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("profile dir: %w", err)
	}
	timeout := o.Timeout
	if timeout == 0 {
		timeout = 20 * time.Second
	}
	args := []string{
		"--headless=new",
		"--disable-gpu",
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-extensions",
		"--disable-background-timer-throttling",
		fmt.Sprintf("--remote-debugging-port=%d", port),
		fmt.Sprintf("--user-data-dir=%s", dir),
		"about:blank",
	}
	args = append(args, o.Extra...)
	cmd := exec.Command(bin, args...)
	cmd.Stdout = nil
	// Keep stderr discarded: headless Chrome is chatty and the bytes
	// would pollute the terminal frame budget accounting.
	devnull, err := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
	if err == nil {
		cmd.Stderr = devnull
		defer devnull.Close()
	}
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("launch chrome: %w", err)
	}
	p := &Process{Cmd: cmd, Port: port, Bin: bin, Version: ver, Dir: dir}
	if err := waitEndpoint(port, timeout); err != nil {
		_ = cmd.Process.Kill()
		return nil, err
	}
	return p, nil
}

// Stop kills the sidecar. Callers defer this right after Launch.
func (p *Process) Stop() {
	if p == nil || p.Cmd == nil || p.Cmd.Process == nil {
		return
	}
	_ = p.Cmd.Process.Kill()
	_, _ = p.Cmd.Process.Wait()
}

// Endpoint reports the DevTools HTTP base URL.
func (p *Process) Endpoint() string {
	return fmt.Sprintf("http://127.0.0.1:%d", p.Port)
}
