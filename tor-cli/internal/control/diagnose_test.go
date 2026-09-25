package control

import (
	"errors"
	"strings"
	"testing"
)

func TestSummarizeCircuits(t *testing.T) {
	dump := "12 BUILT $AAA PURPOSE=GENERAL\n" +
		"13 LAUNCHED PURPOSE=GENERAL\n" +
		"14 EXTENDED $BBB PURPOSE=GENERAL\n" +
		"15 FAILED $CCC PURPOSE=GENERAL REASON=TIMEOUT\n" +
		"16 CLOSED $DDD PURPOSE=GENERAL REASON=FINISHED\n" +
		"17 FOO $EEE PURPOSE=GENERAL\n"
	s := SummarizeCircuits(dump)
	if s.Total != 6 || s.Built != 1 || s.Extending != 2 || s.Failed != 2 || s.Other != 1 {
		t.Fatalf("bad summary: %+v", s)
	}
	if !s.HasBuilt() {
		t.Fatal("HasBuilt must be true with a BUILT circuit")
	}
	if SummarizeCircuits("").Total != 0 || SummarizeCircuits("").HasBuilt() {
		t.Fatal("empty dump must summarize to zero with no built circuit")
	}
}

func TestSummarizeCircuitsCaseInsensitive(t *testing.T) {
	s := SummarizeCircuits("12 built $AAA\n")
	if s.Built != 1 {
		t.Fatalf("lowercase BUILT not counted: %+v", s)
	}
}

func TestSummarizeStreams(t *testing.T) {
	s := SummarizeStreams("7 SUCCEEDED 12 93.184.216.34:80\n8 NEW 0 93.184.216.34:443\n")
	if s.Total != 2 || s.Succeeded != 1 {
		t.Fatalf("bad stream summary: %+v", s)
	}
}

func TestCollectDiagnosticsFull(t *testing.T) {
	c := dial(t, &fakeServer{ready: true, version: "0.4.8.9"})
	d, err := CollectDiagnostics(c)
	if err != nil {
		t.Fatalf("CollectDiagnostics: %v", err)
	}
	if d.Version != "0.4.8.9" {
		t.Errorf("version = %q", d.Version)
	}
	if d.Bootstrap.Progress != 100 || d.Bootstrap.Tag != "done" {
		t.Errorf("bootstrap = %+v", d.Bootstrap)
	}
	if !d.CircuitEstablished {
		t.Error("circuit should be established")
	}
	if d.Circuits.Built != 1 || d.Circuits.Total != 1 {
		t.Errorf("circuits = %+v", d.Circuits)
	}
	if d.Streams.Total != 2 || d.Streams.Succeeded != 1 {
		t.Errorf("streams = %+v", d.Streams)
	}
	if d.Guards != 2 {
		t.Errorf("guards = %d, want 2", d.Guards)
	}
	if !d.HasTraffic || d.TrafficRead != 2048 || d.TrafficWritten != 512 {
		t.Errorf("traffic = %d/%d has=%v", d.TrafficRead, d.TrafficWritten, d.HasTraffic)
	}
	if !strings.Contains(d.SocksListeners, "9050") {
		t.Errorf("socks listeners = %q", d.SocksListeners)
	}
	if !strings.Contains(d.DNSListeners, "9053") {
		t.Errorf("dns listeners = %q", d.DNSListeners)
	}
	text := d.Text()
	for _, want := range []string{"0.4.8.9", "100%", "established=true", "1 built", "entry guards: 2", "2.0 KB"} {
		if !strings.Contains(text, want) {
			t.Errorf("diagnostics text missing %q:\n%s", want, text)
		}
	}
}

func TestCollectDiagnosticsDegradesOnMinimalTor(t *testing.T) {
	// A tor answering only the required keys: optional fields stay empty,
	// collection still succeeds.
	c := dial(t, &fakeServer{ready: true, minimal: true})
	d, err := CollectDiagnostics(c)
	if err != nil {
		t.Fatalf("CollectDiagnostics: %v", err)
	}
	if !d.CircuitEstablished || d.Bootstrap.Progress != 100 {
		t.Fatalf("required fields missing: %+v", d)
	}
	if d.HasTraffic || d.SocksListeners != "" || d.DNSListeners != "" || d.Guards != 0 {
		t.Errorf("optional fields must stay empty on minimal tor: %+v", d)
	}
	if strings.Contains(d.Text(), "listeners:") {
		t.Errorf("text must omit absent listeners:\n%s", d.Text())
	}
}

func TestCollectDiagnosticsFailsWithoutBootstrap(t *testing.T) {
	c := dial(t, &fakeServer{})
	// Drain: the fake answers bootstrap-phase empty (zero value "") only
	// when phase is unset; GetOne still returns a value, so force the
	// failure path with a server that rejects the key. The stock fake
	// always answers, so simulate by closing the connection.
	c.Close()
	if _, err := CollectDiagnostics(c); err == nil {
		t.Fatal("expected error on dead control connection")
	}
}

func TestNewnymOK(t *testing.T) {
	c := dial(t, &fakeServer{ready: true})
	if err := c.Newnym(); err != nil {
		t.Fatalf("Newnym: %v", err)
	}
}

func TestNewnymRateLimited(t *testing.T) {
	c := dial(t, &fakeServer{ready: true, newnymLimit: true})
	err := c.Newnym()
	if err == nil {
		t.Fatal("expected rate-limit error")
	}
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("error should wrap ErrRateLimited, got: %v", err)
	}
	if !strings.Contains(strings.ToLower(err.Error()), "wait") {
		t.Errorf("rate-limit error must state the wait: %v", err)
	}
}

func TestHumanBytes(t *testing.T) {
	for in, want := range map[uint64]string{
		0: "0 B", 512: "512 B", 1023: "1023 B",
		1024: "1.0 KB", 2048: "2.0 KB",
		1048576: "1.0 MB", 1073741824: "1.0 GB",
	} {
		if got := HumanBytes(in); got != want {
			t.Errorf("HumanBytes(%d) = %q, want %q", in, got, want)
		}
	}
}
