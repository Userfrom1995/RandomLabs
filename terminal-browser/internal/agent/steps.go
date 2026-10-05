package agent

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
)

// Step is one script instruction for the CLI runner. Tool-mapped ops
// use the MCP vocabulary (navigate, snapshot, click, type, press_key,
// scroll, screenshot, wait_for, assert, evaluate, console,
// dialog_handle, plus session and tap utilities); the legacy aliases
// fill, press, wait, and dialog still parse to their canonical tools
// so Phase 4 scripts keep running. Extended ops (hover, select,
// check, drag, upload, cursor) are CLI-only until a later phase
// promotes them to MCP tools; they execute against the active
// session with identical settle semantics.
type Step struct {
	Op          string   `json:"op"`
	Ref         string   `json:"ref"`
	Gen         int      `json:"gen"`
	From        string   `json:"from"`
	FromGen     int      `json:"from_gen"`
	To          string   `json:"to"`
	ToGen       int      `json:"to_gen"`
	Text        string   `json:"text"`
	Key         string   `json:"key"`
	Mod         string   `json:"mod"`
	Clear       bool     `json:"clear"`
	Submit      bool     `json:"submit"`
	DX          float64  `json:"dx"`
	DY          float64  `json:"dy"`
	X           *float64 `json:"x"`
	Y           *float64 `json:"y"`
	Value       string   `json:"value"`
	Checked     bool     `json:"checked"`
	Steps       int      `json:"steps"`
	File        string   `json:"file"`
	Selector    string   `json:"selector"`
	Cond        string   `json:"cond"`
	URL         string   `json:"url"`
	Title       string   `json:"title"`
	Want        int      `json:"want"`
	Cmp         string   `json:"cmp"`
	Timeout     float64  `json:"timeout"`
	Kind        string   `json:"kind"`
	Out         string   `json:"out"`
	Annotate    bool     `json:"annotate"`
	IfUnchanged bool     `json:"if_unchanged"`
	Action      string   `json:"action"`
	Prompt      string   `json:"prompt"`
	Expr        string   `json:"expr"`
	Seconds     float64  `json:"seconds"`
	Handle      string   `json:"handle"`
	Profile     string   `json:"profile"`
	Lite        bool     `json:"lite"`
	Width       int      `json:"width"`
}

// StepResult is one executed step for the envelope.
type StepResult struct {
	Op      string      `json:"op"`
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Warning string      `json:"warning,omitempty"`
	Code    string      `json:"code,omitempty"`
	Ms      int64       `json:"ms"`
}

// aliases maps legacy CLI op spellings to canonical tool names.
var aliases = map[string]string{
	"fill":   "type",
	"press":  "press_key",
	"wait":   "wait_for",
	"dialog": "dialog_handle",
}

// fullCaps recognizes every implemented tool for step validation,
// including gated ones: validation passes and the capability gate
// fails closed at execution time with capability_disabled.
var fullCaps = Caps{"pdf": true, "trace": true}

// CanonicalOp resolves aliases to the tool name, or "" when the op
// is an extended CLI-only op rather than a registered tool.
func CanonicalOp(op string) string {
	op = strings.TrimSpace(op)
	if op == "" {
		return ""
	}
	if Canon, ok := aliases[op]; ok {
		return Canon
	}
	if Lookup(fullCaps, op) != nil {
		return op
	}
	return ""
}

// IsToolOp reports whether op executes through Execute (canonical
// tool or alias) rather than the extended CLI-only path.
func IsToolOp(op string) bool { return CanonicalOp(op) != "" }

// ToolArgs translates one mapped step into (tool, args) for Execute.
func ToolArgs(st Step) (string, map[string]interface{}) {
	name := CanonicalOp(st.Op)
	args := map[string]interface{}{}
	set := func(k string, v interface{}) { args[k] = v }
	switch name {
	case "navigate", "session_open":
		set("url", st.URL)
		set("profile", st.Profile)
		set("lite", st.Lite)
		set("width", st.Width)
	case "session_use", "session_close":
		set("handle", st.Handle)
	case "click", "type":
		set("ref", st.Ref)
		set("gen", st.Gen)
		set("text", st.Text)
		set("clear", st.Clear)
		set("submit", st.Submit)
	case "press_key":
		set("key", st.Key)
		set("mod", st.Mod)
	case "scroll":
		set("dx", st.DX)
		set("dy", st.DY)
	case "screenshot":
		set("kind", st.Kind)
		set("ref", st.Ref)
		set("gen", st.Gen)
		set("out", st.Out)
		set("annotate", st.Annotate)
		set("if_unchanged", st.IfUnchanged)
	case "pdf":
		set("out", st.Out)
	case "trace":
		set("seconds", st.Seconds)
		set("out", st.Out)
	case "evaluate":
		set("expr", st.Expr)
	case "wait_for", "assert":
		set("cond", st.Cond)
		set("ref", st.Ref)
		set("gen", st.Gen)
		set("text", st.Text)
		set("url", st.URL)
		set("title", st.Title)
		set("value", st.Value)
		set("selector", st.Selector)
		set("cmp", st.Cmp)
		set("want", st.Want)
		set("timeout", st.Timeout)
	case "console", "network":
		set("clear", st.Clear)
	case "dialog_handle":
		set("action", st.Action)
		set("prompt", st.Prompt)
	}
	return name, args
}

// ValidateStep checks one step before the browser launches.
// Unknown ops and bad field combos fail closed with bad_step.
func ValidateStep(st Step) error {
	op := strings.TrimSpace(st.Op)
	if IsToolOp(op) {
		name, args := ToolArgs(st)
		return checkArgs(name, args)
	}
	switch op {
	case "hover":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("op hover needs ref")
		}
	case "select":
		if strings.TrimSpace(st.Ref) == "" || st.Value == "" {
			return fmt.Errorf("op select needs ref and value")
		}
	case "check":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("op check needs ref")
		}
	case "drag":
		if strings.TrimSpace(st.From) == "" {
			return fmt.Errorf("op drag needs from")
		}
		if strings.TrimSpace(st.To) == "" && (st.X == nil || st.Y == nil) {
			return fmt.Errorf("op drag needs to or x plus y")
		}
	case "upload":
		if strings.TrimSpace(st.Ref) == "" || strings.TrimSpace(st.File) == "" {
			return fmt.Errorf("op upload needs ref and file")
		}
	case "cursor":
		if st.X == nil || st.Y == nil {
			return fmt.Errorf("op cursor needs x and y")
		}
	default:
		return fmt.Errorf("unknown op %q", st.Op)
	}
	return nil
}

// ValidateCond checks one wait/assert step condition.
func ValidateCond(st Step) error {
	return checkCondArgs(map[string]interface{}{
		"cond": st.Cond, "ref": st.Ref, "text": st.Text, "url": st.URL,
		"title": st.Title, "value": st.Value, "selector": st.Selector,
		"cmp": st.Cmp,
	})
}

// RunStep executes one step against the manager. Tool-mapped ops run
// through Execute (bit-identical to the MCP path); extended ops run
// the same engine calls with the same settle and error shapes.
func RunStep(m *Manager, st Step) (interface{}, string, string) {
	if IsToolOp(st.Op) {
		name, args := ToolArgs(st)
		return Execute(m, name, args)
	}
	b := m.Active()
	if b == nil {
		return nil, "no session open: call session_open or navigate with a url first", "no_session"
	}
	fail := func(err error) (interface{}, string, string) {
		code := engine.CodeOf(err)
		if code == "" {
			code = "act_failed"
		}
		return map[string]interface{}{"error": FirstWarn(err)}, FirstWarn(err), code
	}
	switch strings.TrimSpace(st.Op) {
	case "hover":
		if err := b.Hover(st.Ref, st.Gen); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"hovered": st.Ref}, "", ""
	case "select":
		prev := b.URL()
		if err := b.Select(st.Ref, st.Gen, st.Value); err != nil {
			return fail(err)
		}
		d := Resettle(b, prev)
		d["selected"] = st.Value
		return d, "", ""
	case "check":
		prev := b.URL()
		if err := b.SetChecked(st.Ref, st.Gen, st.Checked); err != nil {
			return fail(err)
		}
		d := Resettle(b, prev)
		d["checked"] = st.Checked
		return d, "", ""
	case "drag":
		prev := b.URL()
		if err := b.Drag(st.From, st.FromGen, st.To, st.ToGen, st.X, st.Y, st.Steps); err != nil {
			return fail(err)
		}
		return Resettle(b, prev), "", ""
	case "upload":
		prev := b.URL()
		if err := b.Upload(st.Ref, st.Gen, st.File); err != nil {
			return fail(err)
		}
		d := Resettle(b, prev)
		d["uploaded"] = st.File
		return d, "", ""
	case "cursor":
		if err := b.Cursor(*st.X, *st.Y); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"x": *st.X, "y": *st.Y}, "", ""
	default:
		return nil, fmt.Sprintf("unknown op %q", st.Op), "bad_step"
	}
}

// ParseSteps decodes a JSON array of steps from a file or flag body.
func ParseSteps(body []byte) ([]Step, error) {
	var steps []Step
	dec := json.NewDecoder(strings.NewReader(strings.TrimSpace(string(body))))
	// Accept one array or newline-delimited single objects.
	if err := dec.Decode(&steps); err == nil {
		return steps, nil
	}
	steps = nil
	dec = json.NewDecoder(strings.NewReader(strings.TrimSpace(string(body))))
	for {
		var st Step
		if err := dec.Decode(&st); err != nil {
			break
		}
		steps = append(steps, st)
	}
	if len(steps) == 0 {
		return nil, fmt.Errorf("no steps: want a JSON array or newline-delimited step objects")
	}
	return steps, nil
}

// HaltCode stops a script after terminal failures: a stale or
// missing ref poisons every later ref step, so continuing only stacks
// confusing errors. Timeouts, assert failures, and act errors let the
// script run on: recovery steps often follow them by design.
func HaltCode(code string) bool {
	switch code {
	case "ref_stale", "ref_not_found", "ref_no_node", "bad_step", "no_chrome", "bad_profile":
		return true
	}
	return false
}

// WaitTimeout converts step seconds to a duration.
func WaitTimeout(seconds float64) time.Duration {
	return time.Duration(seconds * float64(time.Second))
}
