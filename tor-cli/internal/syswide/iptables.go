// Iptables backend: nat REDIRECT to TransPort/DNSPort plus fail-closed
// filter tails, all inside dedicated chains jumped from OUTPUT.
//
// Chain layout (jump inserted at OUTPUT position 1, so torshim evaluates
// before pre-existing user rules):
//
//	nat torshim-nat (jump: -t nat OUTPUT -j torshim-nat):
//	  -m owner --uid-owner <tor> -j RETURN   (tor's own circuits must exit)
//	  -o lo -j RETURN                        (local traffic stays local)
//	  -d 127.0.0.1 -j RETURN                (never redirect loopback into tor)
//	  -p udp --dport 53 -j REDIRECT --to-ports <dns>   (DNS capture)
//	  -p tcp -j REDIRECT --to-ports <trans>            (TCP capture)
//
//	filter torshim-filter (jump: OUTPUT -j torshim-filter):
//	  -o lo -j RETURN
//	  -m owner --uid-owner <tor> -j RETURN
//	  -d 127.0.0.1 -j RETURN                (redirected packets, post-nat dst)
//	  -j REJECT                              (non-TCP/non-DNS dies: no leak)
//
//	filter torshim-v6 via ip6tables (M3 blocks v6 for the session):
//	  -o lo -j RETURN
//	  -m owner --uid-owner <tor> -j RETURN
//	  -j REJECT
//
// Deliberately no ESTABLISHED exemption: pre-existing clearnet flows die on
// their next packet instead of leaking around the redirect. This is the
// fail-closed choice; see docs/limitations.md.

package syswide

import (
	"fmt"
	"strings"
)

// IptablesBackend drives iptables/ip6tables via a Runner.
type IptablesBackend struct {
	Run Runner
}

// uidMatch formats the owner exemption for a numeric UID.
func uidMatch(uid uint32) []string {
	return []string{"-m", "owner", "--uid-owner", fmt.Sprint(uid)}
}

// NatRules returns the full rule list for the nat chain (without the
// jump). Each rule is an arg list for `iptables -t nat -A torshim-nat`.
func NatRules(torUID uint32, transPort, dnsPort int) [][]string {
	u := uidMatch(torUID)
	return [][]string{
		append(append([]string{}, u...), "-j", "RETURN"),
		{"-o", "lo", "-j", "RETURN"},
		{"-d", "127.0.0.1", "-j", "RETURN"},
		{"-p", "udp", "--dport", "53", "-j", "REDIRECT", "--to-ports", fmt.Sprint(dnsPort)},
		{"-p", "tcp", "-j", "REDIRECT", "--to-ports", fmt.Sprint(transPort)},
	}
}

// FilterRules returns the fail-closed filter chain rules.
func FilterRules(torUID uint32) [][]string {
	u := uidMatch(torUID)
	return [][]string{
		{"-o", "lo", "-j", "RETURN"},
		append(append([]string{}, u...), "-j", "RETURN"),
		{"-d", "127.0.0.1", "-j", "RETURN"},
		{"-j", "REJECT"},
	}
}

// V6Rules returns the session v6 block rules (via ip6tables).
func V6Rules(torUID uint32) [][]string {
	u := uidMatch(torUID)
	return [][]string{
		{"-o", "lo", "-j", "RETURN"},
		append(append([]string{}, u...), "-j", "RETURN"),
		{"-j", "REJECT"},
	}
}

// hasChain reports whether `iptables -t <table> -C OUTPUT -j <chain>`
// (the jump) is installed. Check errors are treated as absent.
func (b IptablesBackend) jumpPresent(bin, table, chain string) bool {
	_, err := b.Run.Run(bin, "-t", table, "-C", "OUTPUT", "-j", chain)
	return err == nil
}

// ensureJump installs the OUTPUT jump when missing (idempotent).
func (b IptablesBackend) ensureJump(bin, table, chain string) error {
	if b.jumpPresent(bin, table, chain) {
		return nil
	}
	if _, err := b.Run.Run(bin, "-t", table, "-N", chain); err != nil {
		// Chain may already exist from a crashed run; continue to rules.
		if !isExistsErr(err) {
			return fmt.Errorf("syswide: create chain %s: %w", chain, err)
		}
	} else {
		// Fresh chain: also flush defensively in case of name reuse.
		_, _ = b.Run.Run(bin, "-t", table, "-F", chain)
	}
	if _, err := b.Run.Run(bin, "-t", table, "-I", "OUTPUT", "1", "-j", chain); err != nil {
		return fmt.Errorf("syswide: install OUTPUT jump to %s: %w", chain, err)
	}
	return nil
}

// ensureRules appends any missing rule (check-then-add: idempotent and
// tolerant of half-applied crashed runs).
func (b IptablesBackend) ensureRules(bin, table, chain string, rules [][]string) error {
	for _, r := range rules {
		check := append([]string{"-t", table, "-C", chain}, r...)
		if _, err := b.Run.Run(bin, check...); err == nil {
			continue
		}
		add := append([]string{"-t", table, "-A", chain}, r...)
		if _, err := b.Run.Run(bin, add...); err != nil {
			return fmt.Errorf("syswide: append to %s (%v): %w", chain, r, err)
		}
	}
	return nil
}

func isExistsErr(err error) bool {
	return err != nil && strings.Contains(err.Error(), "Chain already exists")
}

// Ensure installs all chains, jumps, and rules (idempotent).
func (b IptablesBackend) Ensure(s *ActiveState) error {
	if err := b.ensureJump("iptables", "nat", NatChain); err != nil {
		return err
	}
	if err := b.ensureRules("iptables", "nat", NatChain, NatRules(s.TorUID, s.TransPort, s.DNSPort)); err != nil {
		return err
	}
	if err := b.ensureJump("iptables", "filter", FilterChain); err != nil {
		return err
	}
	if err := b.ensureRules("iptables", "filter", FilterChain, FilterRules(s.TorUID)); err != nil {
		return err
	}
	if err := b.ensureJump("ip6tables", "filter", V6Chain); err != nil {
		return err
	}
	if err := b.ensureRules("ip6tables", "filter", V6Chain, V6Rules(s.TorUID)); err != nil {
		return err
	}
	return nil
}

// Present reports whether all three OUTPUT jumps are installed.
func (b IptablesBackend) Present() bool {
	return b.jumpPresent("iptables", "nat", NatChain) &&
		b.jumpPresent("iptables", "filter", FilterChain) &&
		b.jumpPresent("ip6tables", "filter", V6Chain)
}

// Remove deletes only torshim-owned rules: the three jumps plus their
// chains. Foreign rules are never touched; missing pieces are skipped.
func (b IptablesBackend) Remove() error {
	type target struct{ bin, table, chain string }
	for _, t := range []target{
		{"iptables", "nat", NatChain},
		{"iptables", "filter", FilterChain},
		{"ip6tables", "filter", V6Chain},
	} {
		_, _ = b.Run.Run(t.bin, "-t", t.table, "-D", "OUTPUT", "-j", t.chain)
		_, _ = b.Run.Run(t.bin, "-t", t.table, "-F", t.chain)
		_, _ = b.Run.Run(t.bin, "-t", t.table, "-X", t.chain)
	}
	return nil
}

// Binaries verifies iptables + ip6tables exist.
func (b IptablesBackend) Binaries() error {
	for _, bin := range []string{"iptables", "ip6tables"} {
		if _, err := b.Run.LookPath(bin); err != nil {
			return fmt.Errorf("syswide: %s not found (install iptables first)", bin)
		}
	}
	return nil
}

// Dump captures full firewall state for byte-exact restore.
func (b IptablesBackend) Dump() (v4, v6 string, err error) {
	v4, err = b.Run.Run("iptables-save")
	if err != nil {
		return "", "", fmt.Errorf("syswide: iptables-save: %w", err)
	}
	v6, err = b.Run.Run("ip6tables-save")
	if err != nil {
		return "", "", fmt.Errorf("syswide: ip6tables-save: %w", err)
	}
	return v4, v6, nil
}

// Restore replays dumps byte-exact (which also drops our chains).
func (b IptablesBackend) Restore(v4, v6 string) error {
	if strings.TrimSpace(v4) == "" || strings.TrimSpace(v6) == "" {
		return fmt.Errorf("syswide: refusing restore from empty firewall dump (run repair, inspect backup dir)")
	}
	if _, err := b.Run.RunWithStdin(v4, "iptables-restore"); err != nil {
		return fmt.Errorf("syswide: iptables-restore: %w", err)
	}
	if _, err := b.Run.RunWithStdin(v6, "ip6tables-restore"); err != nil {
		return fmt.Errorf("syswide: ip6tables-restore: %w", err)
	}
	return nil
}
