// Nft backend: one inet table `torshim` with nat + filter + v6 chains.
// Family inet covers v4 and v6 in a single table. Apply is check-then-load
// (`nft -c -f` before `nft -f`); removal deletes only our table.

package syswide

import (
	"fmt"
	"strings"
)

// NftBackend drives nft via a Runner.
type NftBackend struct {
	Run Runner
}

// Script renders the full ruleset for our table. Ports and UID come from
// the session state so rules always match the running tor instance.
func NftScript(torUID uint32, transPort, dnsPort int) string {
	return fmt.Sprintf(`table inet %s {
	chain out_nat {
		type nat hook output priority dstnat; policy accept;
		skuid %d return
		oifname "lo" return
		ip daddr 127.0.0.1 return
		udp dport 53 redirect to :%d
		meta l4proto tcp redirect to :%d
	}
	chain out_filter {
		type filter hook output priority 0; policy accept;
		oifname "lo" return
		skuid %d return
		ip daddr 127.0.0.1 return
		reject
	}
	chain v6block {
		type filter hook output priority 1; policy accept;
		meta nfproto ipv6 oifname "lo" return
		meta nfproto ipv6 skuid %d return
		meta nfproto ipv6 reject
	}
}
`, NftTable, torUID, dnsPort, transPort, torUID, torUID)
}

// Ensure syntax-checks then loads the table (idempotent: loading twice
// yields the same table; stale copies are flushed first via delete).
func (b NftBackend) Ensure(s *ActiveState) error {
	script := NftScript(s.TorUID, s.TransPort, s.DNSPort)
	// Best-effort delete of a half-applied table from a crashed run.
	_, _ = b.Run.Run("nft", "delete", "table", "inet", NftTable)
	if _, err := b.Run.RunWithStdin(script, "nft", "-c", "-f", "-"); err != nil {
		return fmt.Errorf("syswide: nft syntax check failed: %w", err)
	}
	if _, err := b.Run.RunWithStdin(script, "nft", "-f", "-"); err != nil {
		return fmt.Errorf("syswide: nft load failed: %w", err)
	}
	return nil
}

// Present reports whether our table exists.
func (b NftBackend) Present() bool {
	_, err := b.Run.Run("nft", "list", "table", "inet", NftTable)
	return err == nil
}

// Remove deletes only our table.
func (b NftBackend) Remove() error {
	_, _ = b.Run.Run("nft", "delete", "table", "inet", NftTable)
	return nil
}

// Binaries verifies nft exists.
func (b NftBackend) Binaries() error {
	if _, err := b.Run.LookPath("nft"); err != nil {
		return fmt.Errorf("syswide: nft not found (install nftables first, or use --backend iptables)")
	}
	return nil
}

// Dump captures the full ruleset for restore.
func (b NftBackend) Dump() (string, error) {
	out, err := b.Run.Run("nft", "list", "ruleset")
	if err != nil {
		return "", fmt.Errorf("syswide: nft list ruleset: %w", err)
	}
	return out, nil
}

// Restore replays the dump (which drops our table along with restoring
// everything else byte-exact).
func (b NftBackend) Restore(dump string) error {
	if strings.TrimSpace(dump) == "" {
		return fmt.Errorf("syswide: refusing restore from empty nft dump (run repair, inspect backup dir)")
	}
	if _, err := b.Run.RunWithStdin(dump, "nft", "flush", "ruleset"); err != nil {
		return fmt.Errorf("syswide: nft flush ruleset: %w", err)
	}
	if _, err := b.Run.RunWithStdin(dump, "nft", "-f", "-"); err != nil {
		return fmt.Errorf("syswide: nft restore failed (firewall may be open): %w", err)
	}
	return nil
}
