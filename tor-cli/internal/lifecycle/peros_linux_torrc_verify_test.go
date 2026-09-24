// Per-OS regression: the generated torrc must verify against a real tor
// binary (tor --verify-config). Linux Tester reproduces issue #387 field
// failure: tor 0.4.9.11 rejects SocksPortWriteToFile/DNSPortWriteToFile
// ("Unknown option"), so every live Launch (run, shell, connect) fails
// closed even though hermetic fake-tor suites stay green.
//
// Skips cleanly where tor is absent (macOS/Windows CI runners).
package lifecycle

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func verifyTorrcAgainstRealTor(t *testing.T, torrc string) {
	t.Helper()
	torBin, err := exec.LookPath("tor")
	if err != nil {
		t.Skip("real tor not on PATH; nothing to verify against")
	}
	dir := t.TempDir()
	torrcPath := filepath.Join(dir, "torrc")
	rendered := strings.ReplaceAll(torrc, "@DATADIR@", dir)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(torrcPath, []byte(rendered), 0o600); err != nil {
		t.Fatal(err)
	}
	out, err := exec.Command(torBin, "--verify-config", "-f", torrcPath).CombinedOutput()
	if err != nil {
		t.Fatalf("real tor rejected the generated torrc (exit %v):\n%s\n--- torrc ---\n%s", err, out, rendered)
	}
	if strings.Contains(string(out), "Failed to parse") {
		t.Fatalf("real tor failed to parse the generated torrc:\n%s\n--- torrc ---\n%s", out, rendered)
	}
}

// The stock per-app/shell torrc must be accepted by a real tor.
func TestPerosLinuxGeneratedTorrcVerifiesAgainstRealTor(t *testing.T) {
	verifyTorrcAgainstRealTor(t, GenerateTorrcTrans("@DATADIR@", nil, 0))
}

// The system-wide torrc (fixed TransPort) must also be accepted.
func TestPerosLinuxSystemTorrcVerifiesAgainstRealTor(t *testing.T) {
	verifyTorrcAgainstRealTor(t, GenerateTorrcTrans("@DATADIR@", nil, 9040))
}

// Bridge passthrough lines must not break real-tor verification either.
func TestPerosLinuxBridgeTorrcVerifiesAgainstRealTor(t *testing.T) {
	verifyTorrcAgainstRealTor(t, GenerateTorrcTrans("@DATADIR@",
		[]string{"UseBridges 1", "Bridge obfs4 1.2.3.4:443 FINGERPRINT"}, 0))
}
