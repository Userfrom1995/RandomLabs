package status

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestAbsentReportNeverProtected(t *testing.T) {
	// Nothing listens on 1:1; use an unroutable TEST-NET control port.
	rep := Collect(Options{ControlAddr: "192.0.2.1:19999", Timeout: 100000000})
	if rep.Running {
		t.Fatal("must not report running")
	}
	if rep.Protected {
		t.Fatal("absent status must never claim protected")
	}
	if rep.State != "absent" && rep.State != "unknown" {
		t.Fatalf("unexpected state %q", rep.State)
	}
}

func TestRenderTextHonest(t *testing.T) {
	rep := Report{State: "absent", Mode: "none", Protected: false, Note: "no tor"}
	out := RenderText(rep)
	for _, want := range []string{"state: absent", "protected: false", "no tor"} {
		if !strings.Contains(out, want) {
			t.Errorf("text missing %q:\n%s", want, out)
		}
	}
}

func TestRenderJSONRoundTrip(t *testing.T) {
	rep := Report{Running: true, State: "ready", Protected: true, BootstrapProgress: 100}
	out, err := RenderJSON(rep)
	if err != nil {
		t.Fatal(err)
	}
	var back Report
	if err := json.Unmarshal([]byte(out), &back); err != nil {
		t.Fatal(err)
	}
	if !back.Protected || back.BootstrapProgress != 100 {
		t.Fatalf("round trip lost data: %+v", back)
	}
}
