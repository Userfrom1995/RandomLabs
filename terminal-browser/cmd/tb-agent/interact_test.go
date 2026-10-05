package main

import (
	"testing"
)

// Hermetic contract for the interact script surface: step validation
// fails closed before any browser launches, so malformed agent
// scripts never cost a sidecar.
func TestCheckStepValid(t *testing.T) {
	x, y := 10.0, 20.0
	valid := []Step{
		{Op: "snapshot"}, {Op: "hints"}, {Op: "console"}, {Op: "network"},
		{Op: "click", Ref: "e1"}, {Op: "click", Ref: "@e2", Gen: 3},
		{Op: "hover", Ref: "e1"},
		{Op: "fill", Ref: "e1", Text: "hi", Clear: true, Submit: true},
		{Op: "fill", Ref: "e1", Submit: true},
		{Op: "press", Key: "Enter"}, {Op: "press", Key: "a", Mod: "ctrl"},
		{Op: "scroll", DY: 400}, {Op: "scroll", DX: 10, DY: -5},
		{Op: "select", Ref: "e2", Value: "pro"},
		{Op: "check", Ref: "e3", Checked: true},
		{Op: "drag", From: "e1", To: "e2"},
		{Op: "drag", From: "e1", X: &x, Y: &y},
		{Op: "upload", Ref: "e1", File: "/tmp/f.png"},
		{Op: "cursor", X: &x, Y: &y},
		{Op: "dialog", Action: "accept"}, {Op: "dialog", Action: "dismiss", Prompt: "x"},
		{Op: "wait", Cond: "title", Title: "Done", Timeout: 8},
		{Op: "wait", Cond: "count", Selector: "a", Cmp: "ge", Want: 3},
		{Op: "assert", Cond: "text", Text: "hi"},
		{Op: "assert", Cond: "visible", Ref: "e1"},
		{Op: "screenshot", Kind: "viewport", Out: "/tmp/s.png"},
		{Op: "screenshot", Kind: "full", Out: "/tmp/s.png", Annotate: true, IfUnchanged: true},
		{Op: "screenshot", Kind: "element", Ref: "e1", Out: "/tmp/s.png"},
		{Op: "pdf", Out: "/tmp/p.pdf"},
		{Op: "trace", Seconds: 2, Out: "/tmp/t.json"},
		{Op: "extension_trigger"},
		{Op: "extension_trigger", Extension: "reader", Action: "summarize", Args: `{"max":5}`},
		{Op: "webmcp"},
		{Op: "webmcp", MCPTool: "echo", Args: `{"text":"hi"}`},
		{Op: "evaluate", Expr: "document.title"},
		{Op: "navigate", URL: "https://example.com/"},
	}
	for _, st := range valid {
		if err := checkStep(st); err != nil {
			t.Fatalf("reject valid step %+v: %v", st, err)
		}
	}
}

func TestCheckStepInvalid(t *testing.T) {
	invalid := []Step{
		{},
		{Op: "click"}, {Op: "hover", Ref: "  "},
		{Op: "fill"}, {Op: "fill", Ref: "e1"},
		{Op: "press"},
		{Op: "scroll"},
		{Op: "select", Ref: "e2"}, {Op: "select", Value: "x"},
		{Op: "check"},
		{Op: "drag"}, {Op: "drag", From: "e1"},
		{Op: "upload", Ref: "e1"}, {Op: "upload", File: "/tmp/f"},
		{Op: "cursor"},
		{Op: "dialog"}, {Op: "dialog", Action: "maybe"},
		{Op: "wait"}, {Op: "wait", Cond: "bogus"},
		{Op: "wait", Cond: "text"},
		{Op: "wait", Cond: "count", Selector: "a", Cmp: "gt"},
		{Op: "assert", Cond: "value"},
		{Op: "screenshot"}, {Op: "screenshot", Kind: "panorama", Out: "/tmp/s.png"},
		{Op: "screenshot", Kind: "element", Out: "/tmp/s.png"},
		{Op: "pdf"},
		{Op: "extension_trigger", Extension: "reader"},
		{Op: "extension_trigger", Extension: "reader", Action: "go", Args: "{oops"},
		{Op: "webmcp", MCPTool: "echo", Args: "not json"},
		{Op: "evaluate"},
		{Op: "navigate"},
		{Op: "teleport", Ref: "e1"},
	}
	for _, st := range invalid {
		if err := checkStep(st); err == nil {
			t.Fatalf("accept invalid step %+v", st)
		}
	}
}

func TestIsHaltCode(t *testing.T) {
	for _, code := range []string{"ref_stale", "ref_not_found", "ref_no_node", "bad_step", "no_chrome", "bad_profile"} {
		if !isHaltCode(code) {
			t.Fatalf("%s must halt the script", code)
		}
	}
	for _, code := range []string{"", "timeout", "assert_failed", "act_failed", "no_dialog", "offline"} {
		if isHaltCode(code) {
			t.Fatalf("%s must let recovery steps run", code)
		}
	}
}
