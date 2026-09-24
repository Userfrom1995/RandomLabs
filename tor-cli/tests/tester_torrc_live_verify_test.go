package tests

// Tester live-torrc regression suite for issue #387.
//
// Real tor 0.4.9.11 accepts ONLY ControlPortWriteToFile; the removed
// SocksPortWriteToFile/DNSPortWriteToFile options are rejected as unknown,
// which broke every live Launch (run/shell/connect) with exit 3 while
// hermetic fake-tor suites stayed green. These tests pin the fixed-port
// torrc contract and drive a real `tor --verify-config` whenever tor is
// on PATH (skipping cleanly otherwise).

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Userfrom1995/RandomLabs/tor-cli/internal/lifecycle"
)

func TestTesterTorrcNeverRendersBogusWriteToFile(t *testing.T) {
	rendered := []string{
		lifecycle.GenerateTorrc(t.TempDir(), nil, 19050, 15353),
		lifecycle.GenerateTorrcTrans(t.TempDir(), nil, 9040, 19050, 15353),
		lifecycle.GenerateTorrc(t.TempDir(),
			[]string{"UseBridges 1", "Bridge obfs4 1.2.3.4:443 0123456789ABCDEF0123456789ABCDEF01234567"},
			19050, 15353),
	}
	for i, rc := range rendered {
		lower := strings.ToLower(rc)
		for _, bogus := range []string{"socksportwritetofile", "dnsportwritetofile"} {
			if strings.Contains(lower, bogus) {
				t.Fatalf("torrc %d renders rejected option %q:\n%s", i, bogus, rc)
			}
		}
		for _, want := range []string{
			"SocksPort 127.0.0.1:19050",
			"DNSPort 127.0.0.1:15353",
			"ControlPort 127.0.0.1:auto",
			"ControlPortWriteToFile",
		} {
			if !strings.Contains(rc, want) {
				t.Fatalf("torrc %d missing %q:\n%s", i, want, rc)
			}
		}
	}
	if !strings.Contains(rendered[1], "TransPort 127.0.0.1:9040") {
		t.Fatalf("trans torrc missing fixed TransPort:\n%s", rendered[1])
	}
}

func TestTesterTorrcLiveVerifiesAgainstRealTor(t *testing.T) {
	torBin, err := exec.LookPath("tor")
	if err != nil {
		t.Skip("real tor not on PATH; nothing to verify against")
	}
	dir := t.TempDir()
	cases := map[string]string{
		"torrc":       lifecycle.GenerateTorrcTrans(dir, nil, 0, 19050, 15353),
		"torrc-trans": lifecycle.GenerateTorrcTrans(dir, nil, 9040, 19050, 15353),
	}
	for name, rc := range cases {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte(rc), 0o600); err != nil {
			t.Fatal(err)
		}
		out, err := exec.Command(torBin, "--verify-config", "-f", p).CombinedOutput()
		if err != nil {
			t.Fatalf("%s: real tor rejected the generated torrc (exit %v):\n%s\n--- torrc ---\n%s",
				name, err, out, rc)
		}
		if strings.Contains(string(out), "Failed to parse") {
			t.Fatalf("%s: real tor failed to parse the generated torrc:\n%s\n--- torrc ---\n%s",
				name, out, rc)
		}
	}
}
