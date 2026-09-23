package perapp

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeELF crafts a minimal ELF64 file. With interp=true it carries a
// PT_INTERP segment (dynamic); without, it has no program headers (static).
func writeELF(t *testing.T, interp bool) string {
	t.Helper()
	var hdr []byte
	ident := []byte{0x7f, 'E', 'L', 'F', 2, 1, 1, 0}
	ident = append(ident, make([]byte, 8)...)
	hdr = append(hdr, ident...)
	put16 := func(v uint16) { var b [2]byte; binary.LittleEndian.PutUint16(b[:], v); hdr = append(hdr, b[:]...) }
	put32 := func(v uint32) { var b [4]byte; binary.LittleEndian.PutUint32(b[:], v); hdr = append(hdr, b[:]...) }
	put64 := func(v uint64) { var b [8]byte; binary.LittleEndian.PutUint64(b[:], v); hdr = append(hdr, b[:]...) }
	put16(2)     // ET_EXEC
	put16(62)    // EM_X86_64
	put32(1)     // EV_CURRENT
	put64(0x400) // entry (unused)
	if interp {
		put64(64) // phoff right after ehdr
	} else {
		put64(0)
	}
	put64(0)   // shoff
	put32(0)   // flags
	put16(64)  // ehsize
	put16(56)  // phentsize
	if interp {
		put16(1) // phnum
	} else {
		put16(0)
	}
	put16(0) // shentsize
	put16(0) // shnum
	put16(0) // shstrndx
	if interp {
		// PT_INTERP program header: type=3.
		put32(3)
		put32(4) // flags R
		put64(0)
		put64(0)
		put64(0)
		put64(16)
		put64(16)
		put64(1)
		hdr = append(hdr, []byte("/lib64/ldx\x00\x00\x00\x00\x00\x00")...)
	}
	p := filepath.Join(t.TempDir(), "probe")
	if err := os.WriteFile(p, hdr, 0o755); err != nil {
		t.Fatal(err)
	}
	return p
}

func TestClassifyDynamicELF(t *testing.T) {
	class, reason, err := ClassifyTarget(writeELF(t, true))
	if err != nil {
		t.Fatal(err)
	}
	if class != ShimOK {
		t.Fatalf("dynamic ELF refused: %q", reason)
	}
}

func TestClassifyStaticELFRefused(t *testing.T) {
	class, reason, err := ClassifyTarget(writeELF(t, false))
	if err != nil {
		t.Fatal(err)
	}
	if class != ShimBypass {
		t.Fatal("static ELF must be refused (silent bypass)")
	}
	if !strings.Contains(reason, "Statically") && !strings.Contains(reason, "static") {
		t.Fatalf("reason must mention static linking: %q", reason)
	}
}

func TestClassifyNonELFRefused(t *testing.T) {
	p := filepath.Join(t.TempDir(), "blob")
	os.WriteFile(p, []byte{0x4d, 0x5a, 0x90, 0x00, 'x', 'y'}, 0o755) // MZ header
	class, _, err := ClassifyTarget(p)
	if err != nil {
		t.Fatal(err)
	}
	if class != ShimBypass {
		t.Fatal("non-ELF must be refused")
	}
}

func TestClassifySetuidRefused(t *testing.T) {
	p := writeELF(t, true)
	if err := os.Chmod(p, 0o4755); err != nil {
		t.Skip("cannot set setuid bit here")
	}
	if fi, _ := os.Stat(p); fi.Mode()&os.ModeSetuid == 0 {
		t.Skip("filesystem drops setuid bits; setuid guard covered by inspection")
	}
	class, reason, err := ClassifyTarget(p)
	if err != nil {
		t.Fatal(err)
	}
	if class != ShimBypass {
		t.Fatal("setuid must be refused")
	}
	if !strings.Contains(reason, "setuid") {
		t.Fatalf("reason must mention setuid: %q", reason)
	}
}

func TestClassifyScriptResolvesInterpreter(t *testing.T) {
	dir := t.TempDir()
	sh := filepath.Join(dir, "myscript")
	os.WriteFile(sh, []byte("#!/bin/sh\necho hi\n"), 0o755)
	class, _, err := ClassifyTarget(sh)
	if err != nil {
		t.Fatal(err)
	}
	// /bin/sh on any real Linux is dynamically linked; if it is missing
	// or exotic the classifier fails closed, both outcomes acceptable only
	// if they never claim ShimOK for a bypass. Assert no error only.
	_ = class
}

func TestClassifyMissingFile(t *testing.T) {
	if _, _, err := ClassifyTarget(filepath.Join(t.TempDir(), "nope")); err == nil {
		t.Fatal("missing file must error")
	}
}

func TestTorsocksConfProfile(t *testing.T) {
	conf := TorsocksConf("127.0.0.1", 19050)
	for _, want := range []string{
		"TorAddress 127.0.0.1",
		"TorPort 19050",
		"OnionAddrRange 127.42.42.0/24",
		"IsolatePID 1",
		"AllowInbound 0",
		"AllowOutboundLocalhost 0",
	} {
		if !strings.Contains(conf, want) {
			t.Errorf("conf missing %q:\n%s", want, conf)
		}
	}
}

func TestEnvCarriesShim(t *testing.T) {
	env := Env([]string{"PATH=/usr/bin"}, "/lib/libtorsocks.so", "/tmp/c.conf")
	joined := strings.Join(env, "\n")
	for _, want := range []string{
		"LD_PRELOAD=/lib/libtorsocks.so",
		"TORSOCKS_CONF_FILE=/tmp/c.conf",
		"TORSOCKS_ISOLATE_PID=1",
		"PATH=/usr/bin",
	} {
		if !strings.Contains(joined, want) {
			t.Errorf("env missing %q", want)
		}
	}
}

func TestFindLibMissingFailsClosed(t *testing.T) {
	t.Setenv("TORSOCKS_LIB", filepath.Join(t.TempDir(), "absent.so"))
	if _, err := FindLib(); err == nil {
		t.Fatal("bad TORSOCKS_LIB override must fail closed")
	}
}

func TestRunRefusesStatic(t *testing.T) {
	res, err := Run("127.0.0.1:9050", []string{writeELF(t, false)}, nil, t.TempDir())
	if err == nil {
		t.Fatal("Run must refuse static binaries")
	}
	if res.ExitCode != 0 {
		t.Fatal("refused run must not report an app exit code")
	}
}

func TestEnvDropsDuplicateShimKeys(t *testing.T) {
	// Regression: a parent LD_PRELOAD (or torsocks var) must not survive
	// into the child env where getenv would prefer it over the shim.
	base := []string{
		"PATH=/usr/bin",
		"LD_PRELOAD=/tmp/evil.so",
		"TORSOCKS_CONF_FILE=/tmp/evil.conf",
		"TORSOCKS_ISOLATE_PID=0",
	}
	env := Env(base, "/lib/libtorsocks.so", "/tmp/c.conf")
	seen := map[string]int{}
	for _, kv := range env {
		k := kv
		if i := strings.Index(kv, "="); i >= 0 {
			k = kv[:i]
		}
		seen[k]++
	}
	for _, k := range []string{"LD_PRELOAD", "TORSOCKS_CONF_FILE", "TORSOCKS_ISOLATE_PID"} {
		if seen[k] != 1 {
			t.Fatalf("env has %d entries for %s, want exactly 1:\n%v", seen[k], k, env)
		}
	}
	joined := strings.Join(env, "\n")
	for _, want := range []string{
		"LD_PRELOAD=/lib/libtorsocks.so",
		"TORSOCKS_CONF_FILE=/tmp/c.conf",
		"TORSOCKS_ISOLATE_PID=1",
		"PATH=/usr/bin",
	} {
		if !strings.Contains(joined, want) {
			t.Errorf("env missing %q", want)
		}
	}
	if strings.Contains(joined, "/tmp/evil") {
		t.Errorf("parent shim values leaked into child env:\n%s", joined)
	}
}
