// Hermetic M3 tests: rule-spec honesty, backup round-trips, connect /
// disconnect / repair orchestration with a fake Runner (no root, no
// iptables, no tor required). Real-network coverage is exactly one path:
// dnsQuery against a local fake DNSPort server.

package syswide

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
)

// fakeRunner emulates iptables/ip6tables/nft statefully.
type fakeRunner struct {
	bins     map[string]bool
	jumps    map[string]bool // bin|table|chain
	rules    map[string]bool // bin|table|chain|args
	chains   map[string]bool // bin|table|chain created
	v4save   string
	v6save   string
	nftTable bool
	nftDump  string
	restored []string // RunWithStdin log: name + "\n" + stdin
	cmds     []string
}

func newFake() *fakeRunner {
	return &fakeRunner{
		bins:   map[string]bool{"iptables": true, "ip6tables": true, "nft": true},
		jumps:  map[string]bool{},
		rules:  map[string]bool{},
		chains: map[string]bool{},
		v4save: "*filter\n:OUTPUT ACCEPT\nCOMMIT\n",
		v6save: "*filter\n:OUTPUT ACCEPT\nCOMMIT\n",
		nftDump: "table inet filter { }",
	}
}

func (f *fakeRunner) log(format string, args ...interface{}) {
	f.cmds = append(f.cmds, fmt.Sprintf(format, args...))
}

func (f *fakeRunner) LookPath(file string) (string, error) {
	if f.bins[file] {
		return "/sbin/" + file, nil
	}
	return "", fmt.Errorf("not found: %s", file)
}

func (f *fakeRunner) Run(name string, args ...string) (string, error) {
	f.log("%s %s", name, strings.Join(args, " "))
	switch name {
	case "iptables", "ip6tables":
		return f.runXtables(name, args)
	case "iptables-save":
		return f.v4save, nil
	case "ip6tables-save":
		return f.v6save, nil
	case "nft":
		return f.runNft(args)
	}
	return "", fmt.Errorf("fake: unknown binary %s", name)
}

func (f *fakeRunner) runXtables(bin string, args []string) (string, error) {
	if len(args) < 2 || args[0] != "-t" {
		return "", fmt.Errorf("fake: bad xtables invocation")
	}
	table := args[1]
	rest := args[2:]
	get := func(i string) string {
		for k := 0; k < len(rest)-1; k++ {
			if rest[k] == i {
				return rest[k+1]
			}
		}
		return ""
	}
	switch rest[0] {
	case "-C":
		if len(rest) > 2 && rest[1] == "OUTPUT" {
			chain := get("-j")
			if f.jumps[bin+"|"+table+"|"+chain] {
				return "", nil
			}
			return "", fmt.Errorf("no such jump")
		}
		chain := rest[1]
		key := bin + "|" + table + "|" + chain + "|" + strings.Join(rest[2:], " ")
		if f.rules[key] {
			return "", nil
		}
		return "", fmt.Errorf("no such rule")
	case "-N":
		chain := rest[1]
		key := bin + "|" + table + "|" + chain
		if f.chains[key] {
			return "", fmt.Errorf("Chain already exists")
		}
		f.chains[key] = true
		return "", nil
	case "-I":
		// -I OUTPUT 1 -j chain
		chain := get("-j")
		f.jumps[bin+"|"+table+"|"+chain] = true
		return "", nil
	case "-A":
		chain := rest[1]
		f.rules[bin+"|"+table+"|"+chain+"|"+strings.Join(rest[2:], " ")] = true
		return "", nil
	case "-D":
		chain := get("-j")
		delete(f.jumps, bin+"|"+table+"|"+chain)
		return "", nil
	case "-F":
		chain := rest[1]
		pfx := bin + "|" + table + "|" + chain + "|"
		for k := range f.rules {
			if strings.HasPrefix(k, pfx) {
				delete(f.rules, k)
			}
		}
		return "", nil
	case "-X":
		chain := rest[1]
		delete(f.chains, bin+"|"+table+"|"+chain)
		return "", nil
	}
	return "", fmt.Errorf("fake: unhandled xtables op %v", rest)
}

func (f *fakeRunner) runNft(args []string) (string, error) {
	switch {
	case len(args) == 4 && args[0] == "list" && args[1] == "table" && args[2] == "inet" && args[3] == NftTable:
		if f.nftTable {
			return "table inet torshim { }", nil
		}
		return "", fmt.Errorf("No such file or directory")
	case len(args) == 2 && args[0] == "list" && args[1] == "ruleset":
		return f.nftDump, nil
	case len(args) == 3 && args[0] == "delete" && args[1] == "table":
		f.nftTable = false
		return "", nil
	}
	return "", fmt.Errorf("fake: unhandled nft op %v", args)
}

func (f *fakeRunner) RunWithStdin(stdin, name string, args ...string) (string, error) {
	f.log("%s %s <<<%d bytes", name, strings.Join(args, " "), len(stdin))
	f.restored = append(f.restored, name+"\n"+stdin)
	switch name {
	case "iptables-restore", "ip6tables-restore":
		return "", nil
	case "nft":
		if len(args) >= 2 && args[0] == "-c" {
			if !strings.Contains(stdin, "table inet "+NftTable) {
				return "", fmt.Errorf("nft: syntax error in check")
			}
			return "", nil
		}
		if len(args) >= 1 && args[0] == "-f" {
			if strings.Contains(stdin, "table inet") && !strings.Contains(stdin, "table inet "+NftTable) {
				// Full ruleset restore.
				f.nftDump = stdin
				f.nftTable = false
				return "", nil
			}
			f.nftTable = true
			return "", nil
		}
		if len(args) >= 1 && args[0] == "flush" {
			return "", nil
		}
	}
	return "", fmt.Errorf("fake: unhandled stdin op %s %v", name, args)
}

func testOpts(t *testing.T, f *fakeRunner) Options {
	t.Helper()
	return Options{
		StateDir:  t.TempDir(),
		Backend:   BackendIptables,
		Run:       f,
		GetEuid:   func() int { return 0 },
		Probe:     func(cookiePath, ctlAddr string, timeout time.Duration) error { return nil },
		Resolve:   func(name string) (uint32, uint32, error) { return 1001, 1001, nil },
		PortFree:  func(port int) error { return nil },
		DialTrans: func(port int) error { return nil },
		Launch: func(lo lifecycle.Options) (*lifecycle.Instance, error) {
			if lo.TransPort <= 0 {
				return nil, fmt.Errorf("test launcher needs TransPort")
			}
			if lo.RunAs == nil || lo.RunAs.UID == 0 {
				return nil, fmt.Errorf("test launcher needs unprivileged RunAs")
			}
			return &lifecycle.Instance{
				SocksPort:   19050,
				ControlPort: 19051,
				DNSPort:     dnsFakePort(t),
				Pid:         1 << 20, // dead pid: never signaled
				Owned:       true,
			}, nil
		},
		Stop: func(in *lifecycle.Instance) error { return nil },
	}
}

// dnsFakePort spins a UDP server answering any query with a matching-ID QR
// response (proves the dnsQuery client path for real).
func dnsFakePort(t *testing.T) int {
	t.Helper()
	pc, err := net.ListenPacket("udp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = pc.Close() })
	go func() {
		buf := make([]byte, 512)
		for {
			n, addr, err := pc.ReadFrom(buf)
			if err != nil || n < 12 {
				return
			}
			resp := []byte{buf[0], buf[1], 0x81, 0x80, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00}
			_, _ = pc.WriteTo(append(resp, buf[12:n]...), addr)
		}
	}()
	return pc.LocalAddr().(*net.UDPAddr).Port
}

// The fake launcher above needs a DNS port per launch; dnsFakePort uses
// t.TempDir-free listeners, but Launch closures run once per test, fine.

func TestNatRulesFailClosed(t *testing.T) {
	rules := NatRules(1001, 9040, 5353)
	joined := []string{}
	for _, r := range rules {
		joined = append(joined, strings.Join(r, " "))
	}
	text := strings.Join(joined, "\n")
	// Owner exemption must come before any REDIRECT (tor exits first).
	ownerIdx := strings.Index(text, "--uid-owner 1001")
	firstRedirect := strings.Index(text, "REDIRECT")
	if ownerIdx < 0 || firstRedirect < 0 || ownerIdx > firstRedirect {
		t.Fatalf("owner exemption must precede REDIRECT:\n%s", text)
	}
	if !strings.Contains(text, "-o lo -j RETURN") {
		t.Fatalf("loopback exemption missing:\n%s", text)
	}
	if !strings.Contains(text, "-d 127.0.0.1 -j RETURN") {
		t.Fatalf("127.0.0.1 exemption missing (redirect loop):\n%s", text)
	}
	if !strings.Contains(text, "-p udp --dport 53 -j REDIRECT --to-ports 5353") {
		t.Fatalf("DNS capture missing:\n%s", text)
	}
	if !strings.Contains(text, "-p tcp -j REDIRECT --to-ports 9040") {
		t.Fatalf("TCP capture missing:\n%s", text)
	}
	// Filter tail must REJECT; v6 must be loopback+owner then REJECT.
	filt := FilterRules(1001)
	last := strings.Join(filt[len(filt)-1], " ")
	if last != "-j REJECT" {
		t.Fatalf("filter tail must be bare REJECT, got %q", last)
	}
	for _, r := range filt[:len(filt)-1] {
		if !strings.Contains(strings.Join(r, " "), "RETURN") {
			t.Fatalf("filter pre-tail rule must RETURN: %q", r)
		}
	}
	v6 := V6Rules(1001)
	if strings.Join(v6[len(v6)-1], " ") != "-j REJECT" {
		t.Fatalf("v6 tail must REJECT (no v6 exits in M3)")
	}
	v6text := ""
	for _, r := range v6 {
		v6text += strings.Join(r, " ") + "\n"
	}
	if strings.Contains(v6text, "ACCEPT") {
		t.Fatalf("v6 chain must not ACCEPT anything except loopback/owner RETURN:\n%s", v6text)
	}
}

func TestNftScriptHonest(t *testing.T) {
	s := NftScript(1001, 9040, 5353)
	for _, want := range []string{
		"table inet " + NftTable,
		"skuid 1001 return",
		"redirect to :5353",
		"redirect to :9040",
		"reject",
		`oifname "lo" return`,
		"ip daddr 127.0.0.1 return",
	} {
		if !strings.Contains(s, want) {
			t.Fatalf("nft script missing %q:\n%s", want, s)
		}
	}
}

func TestStateRoundtrip(t *testing.T) {
	dir := t.TempDir()
	if s, err := LoadState(dir); err != nil || s != nil {
		t.Fatalf("fresh dir must load nil state: %v %+v", err, s)
	}
	want := &ActiveState{Backend: "nft", TransPort: 9040, DNSPort: 5353, TorUser: "nobody", TorUID: 65534}
	if err := SaveState(dir, want); err != nil {
		t.Fatal(err)
	}
	got, err := LoadState(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got.Backend != "nft" || got.TransPort != 9040 || got.TorUID != 65534 {
		t.Fatalf("state mismatch: %+v", got)
	}
	if err := ClearState(dir); err != nil {
		t.Fatal(err)
	}
	if s, _ := LoadState(dir); s != nil {
		t.Fatalf("state must be gone after clear")
	}
}

func TestConnectHappyPath(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	rep, err := Connect(o)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if rep.AlreadyActive || !rep.AllPassed {
		t.Fatalf("connect report wrong: %+v", rep)
	}
	if len(rep.Verify) != 5 {
		t.Fatalf("verify table must have 5 rows, got %d", len(rep.Verify))
	}
	for _, r := range rep.Verify {
		if !r.OK {
			t.Fatalf("verify row failed: %+v", r)
		}
	}
	ib := IptablesBackend{Run: f}
	if !ib.Present() {
		t.Fatalf("rules must be present after connect")
	}
	if s, _ := LoadState(o.StateDir); s == nil || s.Backend != BackendIptables {
		t.Fatalf("state must persist backend: %+v", s)
	}
	if _, err := os.Stat(rep.BackupDir); err != nil {
		t.Fatalf("backup dir must exist: %v", err)
	}
}

func TestConnectIdempotent(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	calls := 0
	inner := o.Launch
	o.Launch = func(lo lifecycle.Options) (*lifecycle.Instance, error) {
		calls++
		return inner(lo)
	}
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	rep, err := Connect(o)
	if err != nil {
		t.Fatal(err)
	}
	if !rep.AlreadyActive {
		t.Fatalf("double connect must report already-active")
	}
	if calls != 1 {
		t.Fatalf("double connect must not relaunch tor (launches=%d)", calls)
	}
}

func TestConnectStaleNeedsForce(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	// Simulate a crashed run: rules vanished, state lingers.
	_ = (IptablesBackend{Run: f}.Remove())
	if _, err := Connect(o); err == nil || !strings.Contains(err.Error(), "--force") {
		t.Fatalf("stale session must demand --force, got %v", err)
	}
	o2 := testOpts(t, f)
	o2.StateDir = o.StateDir
	o2.Force = true
	if _, err := Connect(o2); err != nil {
		t.Fatalf("forced connect must recover: %v", err)
	}
}

func TestConnectVerifyFailRollsBack(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.Probe = func(cookiePath, ctlAddr string, timeout time.Duration) error {
		return fmt.Errorf("tor not bootstrapped (simulated)")
	}
	if _, err := Connect(o); err == nil || !strings.Contains(err.Error(), "rolled back") {
		t.Fatalf("verify failure must roll back with clear error, got %v", err)
	}
	if (IptablesBackend{Run: f}.Present()) {
		t.Fatalf("rollback must remove rules")
	}
	if s, _ := LoadState(o.StateDir); s != nil {
		t.Fatalf("rollback must drop state")
	}
}

func TestConnectRequiresRoot(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.GetEuid = func() int { return 1000 }
	if _, err := Connect(o); err == nil || !strings.Contains(err.Error(), "sudo") {
		t.Fatalf("non-root connect must demand sudo, got %v", err)
	}
}

func TestConnectRefusesRootTorUser(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.TorUser = "root"
	o.Resolve = func(name string) (uint32, uint32, error) { return 0, 0, nil }
	if _, err := Connect(o); err == nil || !strings.Contains(err.Error(), "root") {
		t.Fatalf("root tor user must be refused, got %v", err)
	}
}

func TestDisconnectHappyRestores(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	f.restored = nil
	rep, err := Disconnect(o)
	if err != nil {
		t.Fatalf("disconnect: %v", err)
	}
	if !rep.WasConnected || !rep.RemovedRules || !rep.Restored || !rep.PostVerifyOK {
		t.Fatalf("disconnect report wrong: %+v", rep)
	}
	found := false
	for _, r := range f.restored {
		if strings.HasPrefix(r, "iptables-restore") && strings.Contains(r, f.v4save) {
			found = true
		}
	}
	if !found {
		t.Fatalf("disconnect must iptables-restore the exact backup; log: %v", f.restored)
	}
	if s, _ := LoadState(o.StateDir); s != nil {
		t.Fatalf("disconnect must drop state")
	}
	// Double disconnect is idempotent.
	rep2, err := Disconnect(o)
	if err != nil {
		t.Fatal(err)
	}
	if rep2.WasConnected {
		t.Fatalf("double disconnect must report not-connected")
	}
}

func TestDisconnectNoState(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	rep, err := Disconnect(o)
	if err != nil {
		t.Fatal(err)
	}
	if rep.WasConnected {
		t.Fatalf("fresh disconnect must report not-connected")
	}
}

func TestRepairStaleAndHealthy(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	rep, err := Repair(o)
	if err != nil {
		t.Fatal(err)
	}
	if len(rep.Actions) != 1 || !strings.Contains(rep.Actions[0], "nothing to repair") {
		t.Fatalf("fresh repair must be a no-op: %v", rep.Actions)
	}
	if _, err := Connect(o); err != nil {
		t.Fatal(err)
	}
	// Healthy session: repair is a no-op (tor pid is dead in fake, but
	// rules are present, so this exercises the dead-tor branch).
	rep2, err := Repair(o)
	if err != nil {
		t.Fatal(err)
	}
	_ = rep2
	// Corrupt state quarantined, never fatal.
	if err := os.WriteFile(filepath.Join(o.StateDir, "active.json"), []byte("{nope"), 0o600); err != nil {
		t.Fatal(err)
	}
	rep3, err := Repair(o)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, a := range rep3.Actions {
		if strings.Contains(a, "quarantin") {
			found = true
		}
	}
	if !found {
		t.Fatalf("corrupt state must be quarantined: %v", rep3.Actions)
	}
}

func TestResolveBackendAuto(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.Backend = "auto"
	po := (&o).withDefaults()
	name, err := resolveBackend(po)
	if err != nil || name != BackendNft {
		t.Fatalf("auto with nft present must pick nft: %v %q", err, name)
	}
	f.bins["nft"] = false
	name, err = resolveBackend(po)
	if err != nil || name != BackendIptables {
		t.Fatalf("auto without nft must fall back to iptables: %v %q", err, name)
	}
}

func TestNftConnectDisconnect(t *testing.T) {
	f := newFake()
	o := testOpts(t, f)
	o.Backend = BackendNft
	rep, err := Connect(o)
	if err != nil {
		t.Fatalf("nft connect: %v", err)
	}
	if !rep.AllPassed {
		t.Fatalf("nft verify must pass: %+v", rep.Verify)
	}
	if !(NftBackend{Run: f}.Present()) {
		t.Fatalf("nft table must be present")
	}
	drep, err := Disconnect(o)
	if err != nil {
		t.Fatalf("nft disconnect: %v", err)
	}
	if !drep.Restored || !drep.PostVerifyOK {
		t.Fatalf("nft disconnect wrong: %+v", drep)
	}
}

func TestSnapshotRestoreRoundtrip(t *testing.T) {
	f := newFake()
	dir := t.TempDir()
	bdir, err := Snapshot(dir, BackendIptables, f)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	for _, want := range []string{FileIptablesSave, FileIp6tablesSave, FileResolvConf, FileBackupMeta} {
		if _, err := os.Stat(filepath.Join(bdir, want)); err != nil {
			t.Fatalf("backup missing %s: %v", want, err)
		}
	}
	f.restored = nil
	if err := RestoreBackup(bdir, BackendIptables, f); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if len(f.restored) != 2 {
		t.Fatalf("restore must replay v4+v6, got %v", f.restored)
	}
	// Empty dumps fail closed, never half-open the firewall.
	empty := t.TempDir()
	_ = os.WriteFile(filepath.Join(empty, FileIptablesSave), []byte(""), 0o600)
	_ = os.WriteFile(filepath.Join(empty, FileIp6tablesSave), []byte(""), 0o600)
	if err := RestoreBackup(empty, BackendIptables, f); err == nil {
		t.Fatalf("empty dump restore must fail closed")
	}
}
