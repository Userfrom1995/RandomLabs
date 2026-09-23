// M5 hostile parser tests: the control-protocol parsers ingest bytes
// from a tor daemon (or a foreign/malicious control endpoint), so they
// must never panic and must never report ready on garbage. The seed
// corpus runs under plain `go test`; the Fuzz targets run bounded in
// CI (`go test -fuzz=... -fuzztime=30s`) and on demand locally.

package control

import (
	"strings"
	"testing"
)

func TestParseBootstrapPhaseHostile(t *testing.T) {
	// Garbage must parse to not-ready, never to ready, never panic.
	hostile := []string{
		"",
		"\x00\xff\xfe",
		"NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"",
		"PROGRESS=100 TAG=done", // minimal ready-looking (no circuit)
		"PROGRESS=100 TAG=done EXTRA=1 PROGRESS=100",
		"PROGRESS=abc TAG=",
		"PROGRESS=101 TAG=done",                       // over-100 is not 100
		"PROGRESS=-0 TAG=done",                        // Atoi accepts: -0 == 0, not ready
		"PROGRESS=9999999999999999999999999 TAG=done", // overflow: stays 0
		"progress=100 tag=done",                       // lowercase keys are not keys
		"PROGRESS =100 TAG= done",
		"PROGRESS=100\x00TAG=done",
		strings.Repeat("PROGRESS=100 ", 10000) + "TAG=done",
		"TAG=done PROGRESS=100 SUMMARY=\"a b c d e f\"",
		"650 ASYNC LINE THAT SHOULD NOT PARSE AS PHASE",
		"250 OK",
		"515 Authentication failed",
	}
	for _, in := range hostile {
		st := ParseBootstrapPhase(in)
		if st.Ready() {
			t.Errorf("ParseBootstrapPhase(%q).Ready() = true (parser never sets circuits; must be false)", in)
		}
		// Determinism: same bytes, same state.
		again := ParseBootstrapPhase(in)
		if st != again {
			t.Errorf("ParseBootstrapPhase(%q) nondeterministic: %+v vs %+v", in, st, again)
		}
	}
	// The one honest input: progress and tag land, circuit stays false
	// until the caller sets it from the circuit query.
	st := ParseBootstrapPhase("NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"")
	if st.Progress != 100 || st.Tag != "done" {
		t.Fatalf("honest phase misparsed: %+v", st)
	}
	st.CircuitEstablished = true
	if !st.Ready() {
		t.Fatalf("100%% + done + circuit must be ready: %+v", st)
	}
}

func TestParseCircuitEstablishedHostile(t *testing.T) {
	cases := map[string]bool{
		"1": true, "1\n": true, " 1 ": true,
		"0": false, "": false, "2": false, "-1": false,
		"true": false, "TRUE": false, "yes": false,
		"11": false, "1 ": true, "\x001": false,
		strings.Repeat("1", 10000): false,
	}
	for in, want := range cases {
		if got := ParseCircuitEstablished(in); got != want {
			t.Errorf("ParseCircuitEstablished(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestHasBuiltCircuitHostile(t *testing.T) {
	if HasBuiltCircuit("") {
		t.Errorf("empty dump must not report a built circuit")
	}
	if !HasBuiltCircuit("12 BUILT foo PURPOSE=GENERAL") {
		t.Errorf("BUILT line missed")
	}
	// "BUILT" as a substring of another word is not a built circuit.
	if HasBuiltCircuit("REBUILT") {
		t.Errorf("REBUILT must not count as BUILT")
	}
	if HasBuiltCircuit(strings.Repeat("x", 1<<20)) {
		t.Errorf("megabyte of noise must not report a circuit")
	}
}

// FuzzParseBootstrapPhase: no panic, deterministic, never Ready()
// straight out of the parser (circuits come from a separate query).
func FuzzParseBootstrapPhase(f *testing.F) {
	for _, seed := range []string{
		"", "NOTICE BOOTSTRAP PROGRESS=100 TAG=done SUMMARY=\"Done\"",
		"PROGRESS=0 TAG=starting", "515 Authentication failed",
		"PROGRESS=100 TAG=done", "\x00\xff",
	} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, in string) {
		a := ParseBootstrapPhase(in)
		b := ParseBootstrapPhase(in)
		if a != b {
			t.Fatalf("nondeterministic parse of %q: %+v vs %+v", in, a, b)
		}
		if a.Ready() {
			t.Fatalf("parser-reported Ready() on %q (circuit bit must come from the circuit query)", in)
		}
	})
}

// FuzzParseCircuitEstablished: true exactly for whitespace-padded "1".
func FuzzParseCircuitEstablished(f *testing.F) {
	for _, seed := range []string{"", "0", "1", " 1 ", "true", "11"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, in string) {
		got := ParseCircuitEstablished(in)
		want := strings.TrimSpace(in) == "1"
		if got != want {
			t.Fatalf("ParseCircuitEstablished(%q) = %v, want %v", in, got, want)
		}
	})
}

// FuzzHasBuiltCircuit: a positive implies the dump names BUILT.
func FuzzHasBuiltCircuit(f *testing.F) {
	for _, seed := range []string{"", "12 BUILT x", "REBUILT", "12 BUILD x"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, in string) {
		if HasBuiltCircuit(in) && !strings.Contains(in, "BUILT") {
			t.Fatalf("HasBuiltCircuit true without BUILT in %q", in)
		}
	})
}
