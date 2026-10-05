package agent

import (
	"testing"
)

// The 12-tool core is binding: exact names, core-first registry
// order, no extras sneaking into the head of the list.
func TestCoreRegistryOrder(t *testing.T) {
	reg := Registry(Caps{})
	if len(reg) < len(CoreNames) {
		t.Fatalf("registry holds %d tools, want at least %d", len(reg), len(CoreNames))
	}
	for i, want := range CoreNames {
		if reg[i].Name != want {
			t.Fatalf("core tool %d = %q, want %q", i, reg[i].Name, want)
		}
	}
}

// Gated capabilities stay unlisted until enabled, and enabling an
// unknown cap fails closed instead of silently narrowing.
func TestCapGating(t *testing.T) {
	if Lookup(Caps{}, "pdf") != nil {
		t.Fatal("pdf must not register without caps")
	}
	if Lookup(Caps{}, "trace") != nil {
		t.Fatal("trace must not register without caps")
	}
	withPDF, err := ParseCaps("pdf")
	if err != nil {
		t.Fatalf("parse caps: %v", err)
	}
	if Lookup(withPDF, "pdf") == nil {
		t.Fatal("pdf must register with --caps pdf")
	}
	if Lookup(withPDF, "trace") != nil {
		t.Fatal("trace must stay unregistered when only pdf is enabled")
	}
	if _, err := ParseCaps("pdf,teleport"); err == nil {
		t.Fatal("unknown capability must fail closed")
	}
	// The extension surface registers only under its own caps.
	full, _ := ParseCaps("pdf,trace,extension_trigger,webmcp")
	if Lookup(full, "extension_trigger") == nil {
		t.Fatal("extension_trigger must register with --caps extension_trigger")
	}
	if Lookup(full, "webmcp") == nil {
		t.Fatal("webmcp must register with --caps webmcp")
	}
	partial, _ := ParseCaps("pdf,trace")
	if Lookup(partial, "extension_trigger") != nil {
		t.Fatal("extension_trigger must stay unregistered without its cap")
	}
	if Lookup(partial, "webmcp") != nil {
		t.Fatal("webmcp must stay unregistered without its cap")
	}
}

// Gated tools fail closed with capability_disabled without a
// session, and unknown tools fail with bad_step: no browser needed
// to prove the gate order.
func TestGatedExecuteWithoutSession(t *testing.T) {
	m := NewManager(ManagerOptions{})
	_, _, code := Execute(m, "pdf", map[string]interface{}{"out": "/tmp/x.pdf"})
	if code != "capability_disabled" {
		t.Fatalf("pdf without caps = %q, want capability_disabled", code)
	}
	withPDF, _ := ParseCaps("pdf")
	mpdf := NewManager(ManagerOptions{Caps: withPDF})
	_, _, code = Execute(mpdf, "pdf", map[string]interface{}{"out": "/tmp/x.pdf"})
	if code != "no_session" {
		t.Fatalf("pdf with caps but no session = %q, want no_session", code)
	}
	// Extension gates fail closed without caps, and list without a
	// session once enabled (no browser needed to prove gate order).
	_, _, code = Execute(m, "extension_trigger", map[string]interface{}{})
	if code != "capability_disabled" {
		t.Fatalf("extension_trigger without caps = %q, want capability_disabled", code)
	}
	_, _, code = Execute(m, "webmcp", map[string]interface{}{})
	if code != "capability_disabled" {
		t.Fatalf("webmcp without caps = %q, want capability_disabled", code)
	}
	withExt, _ := ParseCaps("extension_trigger,webmcp")
	mext := NewManager(ManagerOptions{Caps: withExt})
	_, _, code = Execute(mext, "extension_trigger", map[string]interface{}{})
	if code != "no_session" {
		t.Fatalf("extension_trigger list without session = %q, want no_session", code)
	}
	_, _, code = Execute(mext, "webmcp", map[string]interface{}{})
	if code != "no_session" {
		t.Fatalf("webmcp list without session = %q, want no_session", code)
	}
	_, _, code = Execute(mext, "extension_trigger", map[string]interface{}{"extension": "x", "action": "y", "args": "{oops"})
	if code != "bad_step" {
		t.Fatalf("extension_trigger broken args = %q, want bad_step", code)
	}
	_, _, code = Execute(m, "bogus", map[string]interface{}{})
	if code != "bad_step" {
		t.Fatalf("unknown tool = %q, want bad_step", code)
	}
	// Tools needing a session fail with no_session, never a nil panic.
	for _, name := range CoreNames {
		args := map[string]interface{}{}
		switch name {
		case "navigate":
			continue // navigate opens implicitly; needs Chrome
		case "click", "type":
			args["ref"] = "e1"
			args["text"] = "x"
		case "press_key":
			args["key"] = "Enter"
		case "scroll":
			args["dx"] = 0.0
			args["dy"] = 100.0
		case "screenshot":
			args["out"] = "/tmp/x.png"
		case "wait_for", "assert":
			args["cond"] = "title"
			args["title"] = "x"
		case "evaluate":
			args["expr"] = "1+1"
		case "dialog_handle":
			args["action"] = "dismiss"
		}
		_, _, code := Execute(m, name, args)
		if code != "no_session" {
			t.Fatalf("%s without session = %q, want no_session", name, code)
		}
	}
}

// Step aliases resolve to canonical tools; extended CLI-only ops
// stay out of the tool namespace.
func TestStepAliases(t *testing.T) {
	for op, want := range map[string]string{
		"fill": "type", "press": "press_key", "wait": "wait_for", "dialog": "dialog_handle",
		"click": "click", "snapshot": "snapshot", "pdf": "pdf", "trace": "trace",
		"back": "back", "session_open": "session_open", "network": "network",
		"extension_trigger": "extension_trigger", "webmcp": "webmcp",
	} {
		if got := CanonicalOp(op); got != want {
			t.Fatalf("CanonicalOp(%q) = %q, want %q", op, got, want)
		}
		if !IsToolOp(op) {
			t.Fatalf("IsToolOp(%q) must be true", op)
		}
	}
	for _, op := range []string{"hover", "select", "check", "drag", "upload", "cursor", "teleport", ""} {
		if IsToolOp(op) {
			t.Fatalf("IsToolOp(%q) must be false (extended or unknown)", op)
		}
	}
}

// ParseSteps accepts both a JSON array and NDJSON lines so --stdin
// piping works with jq-style producers.
func TestParseStepsShapes(t *testing.T) {
	arr, err := ParseSteps([]byte(`[{"op":"snapshot"},{"op":"click","ref":"e1"}]`))
	if err != nil || len(arr) != 2 {
		t.Fatalf("array parse: %v (%d steps)", err, len(arr))
	}
	nd, err := ParseSteps([]byte("{\"op\":\"snapshot\"}\n{\"op\":\"hints\"}\n"))
	if err != nil || len(nd) != 2 {
		t.Fatalf("ndjson parse: %v (%d steps)", err, len(nd))
	}
	if _, err := ParseSteps([]byte(`not json`)); err == nil {
		t.Fatal("garbage must fail closed")
	}
}
