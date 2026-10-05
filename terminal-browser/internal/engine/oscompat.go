// Package engine per-OS path hardening. Profile, store, and log
// paths are built with filepath.Join everywhere, so separators are
// already correct per platform; this file holds the cases that need
// explicit per-OS logic. The deep per-OS behavior (ConPTY graphics
// chain preference, keyboard remap, AV and install-path handling,
// tmux and screen forced fallback, macOS signing) is documented in
// docs/support.md; the code here covers what must be decided at
// runtime.
package engine

import (
	"runtime"
	"strings"
)

// LongPath returns p unchanged on every platform except Windows,
// where paths past the legacy 260-character limit gain the
// extended-length prefix so deep profile trees (per-launch sidecar
// instance dirs under long user names) keep launching Chrome. The
// prefix is added only past 240 characters, leaving normal paths
// untouched, and never doubled.
func LongPath(p string) string {
	return longPathFor(p, runtime.GOOS)
}

func longPathFor(p, goos string) string {
	if goos != "windows" {
		return p
	}
	if strings.HasPrefix(p, `\\?\`) || strings.HasPrefix(p, `\\.\`) {
		return p
	}
	if len(p) > 240 {
		return `\\?\` + p
	}
	return p
}
