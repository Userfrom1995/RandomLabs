// Package perapp proxy backend: macOS and Windows per-app routing.
//
// Binding choice (research spec, M4): no DYLD_INSERT_LIBRARIES shim on
// macOS (SIP strips it for system binaries, making coverage silently
// partial) and no LSP/WFP driver on Windows (out of scope for a
// lightweight wrapper). Both platforms route per-app traffic through
// proxy environment variables (socks5h://) instead.
//
// Honesty contract: only applications that honor proxy env are covered,
// and DNS is exit-side only when the app resolves through the proxy
// (the socks5h:// scheme requests remote resolution). Apps that ignore
// the environment (many GUI apps, raw syscalls, static dialers) leak.
// RunProxy always prints the coverage note to stderr so a success exit
// code is never mistaken for a shim-grade guarantee.
package perapp

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// proxyKeys are the environment keys owned by the proxy backend. They
// must appear exactly once in a child environment: a duplicate left
// over from the parent would shadow the socks5h value (getenv returns
// the first match) and run the app on clearnet proxy settings while
// the wrapper reports success.
var proxyKeys = []string{
	"ALL_PROXY", "all_proxy",
	"HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
	"TORSHIM_ACTIVE", "TORSHIM_SOCKS",
}

func proxyOwned(key string) bool {
	for _, k := range proxyKeys {
		if key == k {
			return true
		}
	}
	return false
}

// ProxyURL renders the socks5h URL for an endpoint. The h suffix is
// binding: without it the app resolves DNS locally (leak).
func ProxyURL(socksAddr string) string {
	return "socks5h://" + socksAddr
}

// ProxyEnv builds the proxy environment for a child process from base,
// dropping any proxy-owned keys first so the values below cannot be
// shadowed by duplicates.
func ProxyEnv(base []string, socksAddr string) []string {
	proxy := ProxyURL(socksAddr)
	env := make([]string, 0, len(base)+8)
	for _, kv := range base {
		if proxyOwned(envKey(kv)) {
			continue
		}
		env = append(env, kv)
	}
	return append(env,
		"ALL_PROXY="+proxy,
		"all_proxy="+proxy,
		"HTTP_PROXY="+proxy,
		"HTTPS_PROXY="+proxy,
		"http_proxy="+proxy,
		"https_proxy="+proxy,
		"TORSHIM_ACTIVE=1",
		"TORSHIM_SOCKS="+socksAddr,
	)
}

// CoverageNote is the honest per-app coverage statement for proxy mode.
// Callers print it to stderr on every proxy launch.
func CoverageNote() string {
	return "torshim: per-app on " + runtime.GOOS + " uses proxy environment (" +
		"socks5h, DNS resolves exit-side when the app honors it); " +
		"only apps that honor proxy env are covered - " +
		"apps ignoring the environment, raw syscalls, and UDP/ICMP leak. " +
		"Use Tor Browser for fingerprint-sensitive browsing."
}

// NeedsProxy reports whether the current platform routes per-app mode
// through proxy environment instead of the torsocks shim.
func NeedsProxy() bool {
	return runtime.GOOS != "linux"
}

// RunProxy executes app argv with the proxy environment against the
// given SOCKS endpoint. Unlike the shim path there is no ELF
// classification to perform: proxy env applies (or is ignored) at the
// application layer regardless of binary linkage. Unknown binaries
// still fail closed on empty argv and on missing PATH entries.
func RunProxy(socksAddr string, argv []string, extraEnv []string) (RunResult, error) {
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
	fmt.Fprintln(os.Stderr, CoverageNote())
	cmd := exec.Command(bin, argv[1:]...)
	cmd.Env = ProxyEnv(os.Environ(), socksAddr)
	for _, kv := range extraEnv {
		// Caller extras must not reintroduce a duplicate proxy key
		// that would shadow the socks5h values just installed.
		if proxyOwned(envKey(kv)) {
			continue
		}
		cmd.Env = append(cmd.Env, kv)
	}
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			return RunResult{ExitCode: ee.ExitCode()}, nil
		}
		return RunResult{}, fmt.Errorf("perapp: exec %s: %w", bin, err)
	}
	return RunResult{ExitCode: 0}, nil
}
