package platform_compat

import (
	"os"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestParseVersionLine(t *testing.T) {
	cases := map[string]string{
		"Tor version 0.4.8.12 (git-abc)": "0.4.8.12",
		"0.4.7.13":                       "0.4.7.13",
		"obfs4proxy-0.0.14":              "0.0.14",
		"lyrebird 1.2.3":                 "1.2.3",
		"no digits here":                 "",
		"Tor version 0.4.8.12, extra":    "0.4.8.12",
	}
	for in, want := range cases {
		if got := ParseVersionLine(in); got != want {
			t.Fatalf("ParseVersionLine(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestPredatesTor04(t *testing.T) {
	cases := map[string]bool{
		"":        false,
		"1.0":     false,
		"0.4.8":   false,
		"0.4.0":   false,
		"0.5.1":   false,
		"0.3.9":   true,
		"0.2.9":   true,
		"0.48.1":  false, // minor 48 >= 4
		"garbage": false,
	}
	for v, want := range cases {
		if got := PredatesTor04(v); got != want {
			t.Fatalf("PredatesTor04(%q) = %v, want %v", v, got, want)
		}
	}
}

func TestGatherMissingTorBinary(t *testing.T) {
	s := Gather(Options{TorBinary: "definitely-not-a-real-tor-" + t.Name()})
	tor := s.Dep("tor")
	if tor.Present {
		t.Fatalf("missing tor reported present: %+v", tor)
	}
	if s.Capabilities.OS != runtime.GOOS || s.Capabilities.Arch != runtime.GOARCH {
		t.Fatalf("caps OS/arch = %s/%s, want %s/%s",
			s.Capabilities.OS, s.Capabilities.Arch, runtime.GOOS, runtime.GOARCH)
	}
	if s.Capabilities.UDP {
		t.Fatalf("UDP must never be reported capable (binding honesty)")
	}
	if s.Capabilities.PerAppMechanism == "" {
		t.Fatalf("per-app mechanism must be named")
	}
}

func TestGatherPresentBinaryWithoutVersion(t *testing.T) {
	// The test binary itself exists; its --version flag is undefined so
	// the version probe fails and stays empty, while presence holds.
	self, err := os.Executable()
	if err != nil {
		t.Skipf("no executable: %v", err)
	}
	s := Gather(Options{TorBinary: self, Timeout: 2 * time.Second})
	tor := s.Dep("tor")
	if !tor.Present {
		t.Fatalf("explicit present binary not detected: %+v", tor)
	}
	if tor.Version != "" {
		t.Fatalf("unexpected version %q from a binary without --version", tor.Version)
	}
}

func TestGatherNoVersionsSkipsExec(t *testing.T) {
	s := Gather(Options{TorBinary: "tor", NoVersions: true})
	if _, ok := s.Dependencies["tor"]; !ok {
		t.Fatalf("tor dependency slot missing: %#v", s.Dependencies)
	}
	for name, d := range s.Dependencies {
		if d.Version != "" {
			t.Fatalf("NoVersions left version %q on %s", d.Version, name)
		}
	}
}

func TestPTForTransportMapping(t *testing.T) {
	s := Snapshot{Dependencies: map[string]Dependency{
		"lyrebird":         {Name: "lyrebird", Present: true, Path: "/usr/bin/lyrebird"},
		"snowflake-client": {Name: "snowflake-client", Present: false},
	}}
	if _, needed := s.PTFor("vanilla"); needed {
		t.Fatalf("vanilla must not need a PT binary")
	}
	if _, needed := s.PTFor(""); needed {
		t.Fatalf("empty transport must not need a PT binary")
	}
	dep, needed := s.PTFor("obfs4")
	if !needed || !dep.Present || dep.Path != "/usr/bin/lyrebird" {
		t.Fatalf("obfs4 -> %+v needed=%v, want present lyrebird", dep, needed)
	}
	// No snowflake-client but lyrebird present: lyrebird covers it.
	dep, needed = s.PTFor("snowflake")
	if !needed || !dep.Present || !strings.HasSuffix(dep.Path, "lyrebird") {
		t.Fatalf("snowflake -> %+v needed=%v, want lyrebird fallback", dep, needed)
	}
	// Prefer the dedicated binary when it exists.
	s.Dependencies["snowflake-client"] = Dependency{Name: "snowflake-client", Present: true, Path: "/usr/bin/snowflake-client"}
	dep, needed = s.PTFor("snowflake")
	if !needed || !dep.Present || !strings.HasSuffix(dep.Path, "snowflake-client") {
		t.Fatalf("snowflake -> %+v, want snowflake-client", dep)
	}
	// Nothing at all: still required, reported missing.
	empty := Snapshot{Dependencies: map[string]Dependency{}}
	dep, needed = empty.PTFor("obfs4")
	if !needed || dep.Present {
		t.Fatalf("obfs4 on empty snapshot -> %+v needed=%v, want missing", dep, needed)
	}
}

func TestProbeSandboxDoesNotPanic(t *testing.T) {
	sb := ProbeSandbox()
	if runtime.GOOS != "linux" && sb.AppArmor != "" {
		t.Fatalf("apparmor reported off %s", runtime.GOOS)
	}
}
