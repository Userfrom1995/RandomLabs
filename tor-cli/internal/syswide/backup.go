// Snapshot-first backup: firewall dumps plus resolv.conf state land in one
// timestamped directory before any mutation. Disconnect restores byte-exact;
// we never touch resolv.conf in M3 (REDIRECT-only capture), but its bytes
// are recorded so drift is detectable and repair can report it.

package syswide

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// BackupFilenames inside a backup dir.
const (
	FileIptablesSave   = "iptables-save.txt"
	FileIp6tablesSave  = "ip6tables-save.txt"
	FileNftRuleset     = "nft-ruleset.txt"
	FileResolvConf     = "resolv.conf.bytes"
	FileResolvLink     = "resolv.conf.symlink"
	FileBackupMeta     = "meta.txt"
	FileRestoreLog     = "restore.log"
	FileIptablesAfter  = "iptables-save.after-connect.txt"
	FileNftAfter       = "nft-ruleset.after-connect.txt"
)

// Snapshot captures firewall + DNS state into a fresh timestamped dir
// under stateDir/backups and returns its path.
func Snapshot(stateDir string, backend string, r Runner) (string, error) {
	dir := filepath.Join(stateDir, "backups", time.Now().UTC().Format("20060102T150405Z"))
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("syswide: create backup dir: %w", err)
	}
	write := func(name, data string) error {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(data), 0o600); err != nil {
			return fmt.Errorf("syswide: write backup %s: %w", name, err)
		}
		return nil
	}
	switch backend {
	case BackendNft:
		n := NftBackend{Run: r}
		dump, err := n.Dump()
		if err != nil {
			return "", err
		}
		if err := write(FileNftRuleset, dump); err != nil {
			return "", err
		}
	default:
		ip := IptablesBackend{Run: r}
		v4, v6, err := ip.Dump()
		if err != nil {
			return "", err
		}
		if err := write(FileIptablesSave, v4); err != nil {
			return "", err
		}
		if err := write(FileIp6tablesSave, v6); err != nil {
			return "", err
		}
	}
	// resolv.conf: bytes plus symlink target (M3 never rewrites it; the
	// snapshot proves disconnect left DNS exactly as found).
	resolv := ResolvPath
	if target, err := os.Readlink(resolv); err == nil {
		if err := write(FileResolvLink, target+"\n"); err != nil {
			return "", err
		}
		// Resolve relative to /etc for the byte snapshot.
		if !filepath.IsAbs(target) {
			target = filepath.Join(filepath.Dir(resolv), target)
		}
		resolv = target
	}
	if raw, err := os.ReadFile(resolv); err != nil {
		if err := write(FileResolvConf, ""); err != nil {
			return "", err
		}
	} else if err := write(FileResolvConf, string(raw)); err != nil {
		return "", err
	}
	meta := fmt.Sprintf("backend=%s\ncreated=%s\nresolv=%s\n", backend,
		time.Now().UTC().Format(time.RFC3339), ResolvPath)
	if err := write(FileBackupMeta, meta); err != nil {
		return "", err
	}
	return dir, nil
}

// VerifyResolvUnchanged reports whether /etc/resolv.conf still matches the
// snapshot (symlink target + bytes). M3 never rewrites it, so drift means
// something else (DHCP, admin) touched DNS mid-session: warn, do not fail.
func VerifyResolvUnchanged(backupDir string) (bool, string) {
	currentLink, linkErr := os.Readlink(ResolvPath)
	snapLink, snapErr := os.ReadFile(filepath.Join(backupDir, FileResolvLink))
	wasLink := snapErr == nil
	isLink := linkErr == nil
	if wasLink != isLink {
		return false, "resolv.conf changed between file and symlink mid-session"
	}
	if isLink {
		if strings.TrimSpace(string(snapLink)) != currentLink {
			return false, fmt.Sprintf("resolv.conf symlink now points at %q", currentLink)
		}
		return true, ""
	}
	snap, err := os.ReadFile(filepath.Join(backupDir, FileResolvConf))
	if err != nil {
		return true, "" // no snapshot bytes (was unreadable): nothing to compare
	}
	cur, err := os.ReadFile(ResolvPath)
	if err != nil {
		return false, "resolv.conf unreadable mid-session"
	}
	if string(snap) != string(cur) {
		return false, "resolv.conf bytes changed mid-session (DHCP or admin edit)"
	}
	return true, ""
}

// RestoreBackup replays the firewall dump from a backup dir. Empty dumps
// fail closed (never leave the firewall half-open without saying so).
func RestoreBackup(backupDir, backend string, r Runner) error {
	switch backend {
	case BackendNft:
		raw, err := os.ReadFile(filepath.Join(backupDir, FileNftRuleset))
		if err != nil {
			return fmt.Errorf("syswide: read nft backup: %w", err)
		}
		return NftBackend{Run: r}.Restore(string(raw))
	default:
		v4, err := os.ReadFile(filepath.Join(backupDir, FileIptablesSave))
		if err != nil {
			return fmt.Errorf("syswide: read iptables backup: %w", err)
		}
		v6, err := os.ReadFile(filepath.Join(backupDir, FileIp6tablesSave))
		if err != nil {
			return fmt.Errorf("syswide: read ip6tables backup: %w", err)
		}
		return IptablesBackend{Run: r}.Restore(string(v4), string(v6))
	}
}
