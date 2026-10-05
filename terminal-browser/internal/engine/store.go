// Package engine persistence: profile isolation plus durable session
// state (cookies, history, bookmarks, navigation stack) in stdlib-only
// JSON files. The module carries no third-party dependencies, so the
// stores are atomic JSON documents instead of SQLite tables: every
// write lands on a temp file with 0600 permissions and renames into
// place, which gives crash-safe durability with the same query API
// (newest-first search with limits) the roadmap requires.
package engine

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BaseDir is the root that holds every profile. TB_HOME overrides the
// user home for tests, portable installs, and per-run isolation; the
// override is exact, never joined with shell expansion.
func BaseDir() string {
	if env := strings.TrimSpace(os.Getenv("TB_HOME")); env != "" {
		return filepath.Join(env, ".terminal-browser")
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(os.TempDir(), "terminal-browser")
	}
	return filepath.Join(home, ".terminal-browser")
}

// ProfilesRoot lists the directory that holds one subdirectory per
// profile. Profile user-data dirs (the Chromium sidecar context) live
// under it at <root>/profiles/<name>.
func ProfilesRoot() string {
	return filepath.Join(BaseDir(), "profiles")
}

// ensureProfileDir creates the profile directory with 0700: profiles
// hold cookies and history and are never world-readable. The name is
// sanitized first so traversal input cannot escape the root.
func ensureProfileDir(profile string) (string, error) {
	dir := ProfileDir(profile)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("profile dir: %w", err)
	}
	return dir, nil
}

// profileFile resolves one store document inside the profile dir,
// creating the dir on the way. Callers pass a fixed filename; the
// profile half is always sanitized by ProfileDir.
func profileFile(profile, name string) (string, error) {
	dir, err := ensureProfileDir(profile)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, name), nil
}

// readStore loads a JSON document into v. A missing file is not an
// error: it decodes as the zero value so fresh profiles start empty.
// Corrupt files fail closed with the path and reason, never with a
// half-filled struct.
func readStore(path string, v interface{}) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read %s: %w", path, err)
	}
	if len(bytesTrimSpace(raw)) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, v); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

// writeStore persists v as indented JSON atomically: temp file in the
// same directory, 0600 permissions, fsync, rename. Readers never see
// a torn document even if the process dies mid-write.
func writeStore(path string, v interface{}) error {
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	raw = append(raw, '\n')
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return fmt.Errorf("write %s: %w", tmp, err)
	}
	if err := os.Chmod(tmp, 0o600); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("chmod %s: %w", tmp, err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("commit %s: %w", path, err)
	}
	return nil
}

func bytesTrimSpace(b []byte) []byte {
	start := 0
	for start < len(b) && (b[start] == ' ' || b[start] == '\t' || b[start] == '\n' || b[start] == '\r') {
		start++
	}
	end := len(b)
	for end > start && (b[end-1] == ' ' || b[end-1] == '\t' || b[end-1] == '\n' || b[end-1] == '\r') {
		end--
	}
	return b[start:end]
}
