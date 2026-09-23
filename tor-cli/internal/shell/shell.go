// Package shell spawns an isolated child shell whose processes route
// through Tor, while the parent shell is untouched.
//
// Linux: LD_PRELOAD torsocks shim + generated conf. Other OSes (M4):
// proxy env only. Every shell prints a coverage banner on entry stating
// the mechanism, the endpoints, and what is NOT covered.
package shell

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// Config describes the shell to spawn.
type Config struct {
	// SocksAddr is the instance SOCKS endpoint (host:port).
	SocksAddr string
	// LibPath is libtorsocks.so (Linux). Empty means proxy-env mode.
	LibPath string
	// ConfPath is the generated torsocks conf (Linux).
	ConfPath string
	// Shell is the shell binary; defaults to $SHELL else /bin/sh.
	Shell string
}

// Banner renders the coverage banner printed on shell entry. The banner is
// a binding requirement: it must state mechanism, endpoints, and gaps.
func Banner(cfg Config) string {
	var b strings.Builder
	b.WriteString("=== torshim shell: processes in THIS shell route through Tor ===\n")
	fmt.Fprintf(&b, "SOCKS endpoint : %s (hostname form, DNS resolves exit-side)\n", cfg.SocksAddr)
	if cfg.LibPath != "" {
		b.WriteString("Mechanism      : torsocks LD_PRELOAD shim (Linux)\n")
	} else {
		b.WriteString("Mechanism      : proxy environment (ALL_PROXY/HTTP(S)_PROXY)\n")
	}
	b.WriteString("NOT covered    : static binaries, raw syscalls, setuid tools,\n")
	b.WriteString("                 UDP/ICMP traffic, and children that scrub the\n")
	b.WriteString("                 environment (sudo, env -i) lose protection.\n")
	b.WriteString("Exit this shell to drop Tor routing. Parent shell untouched.\n")
	b.WriteString("Unofficial Tor frontend - not sponsored by The Tor Project.\n")
	return b.String()
}

// ResolveShell picks the child shell binary.
func ResolveShell() string {
	if s := os.Getenv("SHELL"); s != "" {
		return s
	}
	return "/bin/sh"
}

// Spawn runs the child shell interactively. It returns the shell exit code.
func Spawn(cfg Config) (int, error) {
	sh := cfg.Shell
	if sh == "" {
		sh = ResolveShell()
	}
	fmt.Print(Banner(cfg))
	env := os.Environ()
	env = append(env, "TORSHIM_ACTIVE=1", "TORSHIM_SOCKS="+cfg.SocksAddr)
	if cfg.LibPath != "" {
		env = append(env,
			"LD_PRELOAD="+cfg.LibPath,
			"TORSOCKS_CONF_FILE="+cfg.ConfPath,
			"TORSOCKS_ISOLATE_PID=1",
		)
	} else {
		proxy := "socks5h://" + cfg.SocksAddr
		env = append(env,
			"ALL_PROXY="+proxy,
			"all_proxy="+proxy,
			"HTTP_PROXY="+proxy,
			"HTTPS_PROXY="+proxy,
			"http_proxy="+proxy,
			"https_proxy="+proxy,
		)
	}
	if ps1 := os.Getenv("PS1"); ps1 != "" {
		env = append(env, "PS1=[torshim] "+ps1)
	} else {
		env = append(env, "PS1=[torshim] \\u@\\h:\\w\\$ ")
	}
	cmd := exec.Command(sh)
	cmd.Env = env
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			return ee.ExitCode(), nil
		}
		return 0, fmt.Errorf("shell: run %s: %w", sh, err)
	}
	return 0, nil
}
