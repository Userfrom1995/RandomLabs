package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
)

// interact runs a scripted interaction loop against one persistent
// browser: open once, execute every step in order against the same
// live page, and report per-step results in the shared envelope.
// Refs use the @eN sugar (bare eN works too); steps may pin a gen,
// and stale gens fail closed with ref_stale plus the remap hint.
// Mutating acts (click, fill, press, select, check, drag, upload,
// dialog answers, navigations) re-settle automatically: RefreshURL
// plus a fresh snapshot, so the next step sees the new gen exactly
// like the TUI drawer does after a fire.

// Step is one script instruction. Only the fields its op needs are
// read; unknown ops and bad field combos fail closed with bad_step
// before any browser launches when the script parses, and at
// execution time when --do JSON arrives after the open.
type Step struct {
	Op         string  `json:"op"`
	Ref        string  `json:"ref"`
	Gen        int     `json:"gen"`
	From       string  `json:"from"`
	FromGen    int     `json:"from_gen"`
	To         string  `json:"to"`
	ToGen      int     `json:"to_gen"`
	Text       string  `json:"text"`
	Key        string  `json:"key"`
	Mod        string  `json:"mod"`
	Clear      bool    `json:"clear"`
	Submit     bool    `json:"submit"`
	DX         float64 `json:"dx"`
	DY         float64 `json:"dy"`
	X          *float64 `json:"x"`
	Y          *float64 `json:"y"`
	Value      string  `json:"value"`
	Checked    bool    `json:"checked"`
	Steps      int     `json:"steps"`
	File       string  `json:"file"`
	Selector   string  `json:"selector"`
	Cond       string  `json:"cond"`
	URL        string  `json:"url"`
	Title      string  `json:"title"`
	Want       int     `json:"want"`
	Cmp        string  `json:"cmp"`
	Timeout    float64 `json:"timeout"`
	Kind       string  `json:"kind"`
	Out        string  `json:"out"`
	Annotate   bool    `json:"annotate"`
	IfUnchanged bool   `json:"if_unchanged"`
	Action     string  `json:"action"`
	Prompt     string  `json:"prompt"`
	Expr       string  `json:"expr"`
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

type doFlags []string

func (d *doFlags) String() string { return strings.Join(*d, ", ") }
func (d *doFlags) Set(v string) error {
	*d = append(*d, v)
	return nil
}

func interactCmd(args []string) {
	fs := flag.NewFlagSet("interact", flag.ExitOnError)
	urlFlag := fs.String("url", "", "live http(s) page to open (required)")
	profile := fs.String("profile", "default", "browser profile")
	lite := fs.Bool("lite", false, "block images, media, and trackers")
	width := fs.Int("width", 100, "grid width for text renders")
	script := fs.String("script", "", "JSON file with an array of steps")
	dialogPolicy := fs.String("dialog-policy", "manual", "dialog policy: manual, accept, or dismiss")
	var dos doFlags
	fs.Var(&dos, "do", "one step as JSON (repeatable)")
	_ = fs.Parse(args)

	if strings.TrimSpace(*urlFlag) == "" {
		failClosed("missing required --url", "bad_url")
	}
	p := resolveProfile(*profile)
	switch strings.ToLower(strings.TrimSpace(*dialogPolicy)) {
	case "manual", "accept", "dismiss":
		*dialogPolicy = strings.ToLower(strings.TrimSpace(*dialogPolicy))
	default:
		failClosed(fmt.Sprintf("bad --dialog-policy %q: want manual, accept, or dismiss", *dialogPolicy), "bad_step")
	}
	var steps []Step
	if *script != "" {
		body, err := os.ReadFile(*script)
		if err != nil {
			failClosed(fmt.Sprintf("read script: %v", err), "bad_path")
		}
		if err := json.Unmarshal(body, &steps); err != nil {
			failClosed(fmt.Sprintf("parse script: %v", err), "bad_step")
		}
	}
	for _, d := range dos {
		var st Step
		if err := json.Unmarshal([]byte(d), &st); err != nil {
			failClosed(fmt.Sprintf("parse --do %q: %v", d, err), "bad_step")
		}
		steps = append(steps, st)
	}
	if len(steps) == 0 {
		failClosed("no steps: pass --script FILE or repeat --do '{...}'", "bad_step")
	}
	for i, st := range steps {
		if err := checkStep(st); err != nil {
			failClosed(fmt.Sprintf("step %d: %v", i+1, err), "bad_step")
		}
	}

	b, err := engine.Open(*urlFlag, engine.OpenOptions{
		Profile: p, Lite: *lite, Width: *width, DialogPolicy: *dialogPolicy,
	})
	if err != nil {
		emit(false, nil, firstWarn(err), engine.CodeOf(err))
		os.Exit(1)
	}
	defer b.Close()

	results := make([]StepResult, 0, len(steps))
	failed := 0
	for _, st := range steps {
		t0 := time.Now()
		data, warn, code := runStep(b, st)
		ms := time.Since(t0).Milliseconds()
		ok := code == ""
		if !ok {
			failed++
		}
		results = append(results, StepResult{Op: st.Op, Success: ok, Data: data, Warning: warn, Code: code, Ms: ms})
		if !ok && isHaltCode(code) {
			break
		}
	}
	cur := b.Current()
	var gen interface{}
	if cur != nil {
		gen = cur.Gen
	}
	emit(failed == 0, map[string]interface{}{
		"address": b.URL(), "profile": p, "gen": gen,
		"steps": results, "passed": len(results) - failed, "failed": failed,
	}, "", "")
	if failed > 0 {
		os.Exit(1)
	}
}

// isHaltCode stops the script after terminal failures: a stale or
// missing ref poisons every later ref step, so continuing only stacks
// confusing errors. Timeouts, assert failures, and act errors let the
// script run on: recovery steps often follow them by design.
func isHaltCode(code string) bool {
	switch code {
	case "ref_stale", "ref_not_found", "ref_no_node", "bad_step", "no_chrome", "bad_profile":
		return true
	}
	return false
}

func firstWarn(err error) string {
	if err == nil {
		return ""
	}
	s := err.Error()
	if i := strings.Index(s, " (offline fail-closed"); i > 0 {
		return s[:i]
	}
	return s
}

// checkStep validates one step before the browser launches.
func checkStep(st Step) error {
	switch st.Op {
	case "snapshot", "hints", "console", "network":
	case "click", "hover":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("op %s needs ref", st.Op)
		}
	case "fill":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("op fill needs ref")
		}
		if st.Text == "" && !st.Clear && !st.Submit {
			return fmt.Errorf("op fill needs text, clear, or submit: nothing to do")
		}
	case "press":
		if strings.TrimSpace(st.Key) == "" {
			return fmt.Errorf("op press needs key")
		}
	case "scroll":
		if st.DX == 0 && st.DY == 0 {
			return fmt.Errorf("op scroll needs dx or dy")
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
	case "dialog":
		if st.Action != "accept" && st.Action != "dismiss" {
			return fmt.Errorf("op dialog needs action accept or dismiss")
		}
	case "wait", "assert":
		if err := checkCond(st); err != nil {
			return err
		}
	case "screenshot":
		if strings.TrimSpace(st.Out) == "" {
			return fmt.Errorf("op screenshot needs out")
		}
		switch st.Kind {
		case "", "viewport", "full", "element":
		default:
			return fmt.Errorf("bad screenshot kind %q", st.Kind)
		}
		if st.Kind == "element" && strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("element screenshot needs ref")
		}
	case "pdf":
		if strings.TrimSpace(st.Out) == "" {
			return fmt.Errorf("op pdf needs out")
		}
	case "evaluate":
		if strings.TrimSpace(st.Expr) == "" {
			return fmt.Errorf("op evaluate needs expr")
		}
	case "navigate":
		if strings.TrimSpace(st.URL) == "" {
			return fmt.Errorf("op navigate needs url")
		}
	default:
		return fmt.Errorf("unknown op %q", st.Op)
	}
	return nil
}

func checkCond(st Step) error {
	switch st.Cond {
	case "visible":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("visible cond needs ref")
		}
	case "text":
		if st.Text == "" {
			return fmt.Errorf("text cond needs text")
		}
	case "url":
		if st.URL == "" {
			return fmt.Errorf("url cond needs url")
		}
	case "title":
		if st.Title == "" {
			return fmt.Errorf("title cond needs title")
		}
	case "value":
		if strings.TrimSpace(st.Ref) == "" {
			return fmt.Errorf("value cond needs ref")
		}
	case "count":
		if strings.TrimSpace(st.Selector) == "" {
			return fmt.Errorf("count cond needs selector")
		}
		switch st.Cmp {
		case "", "eq", "ge", "le":
		default:
			return fmt.Errorf("bad count op %q", st.Cmp)
		}
	default:
		return fmt.Errorf("unknown cond %q", st.Cond)
	}
	return nil
}

func stepCond(st Step) engine.Condition {
	return engine.Condition{
		Kind: st.Cond, Ref: st.Ref, Gen: st.Gen, Text: st.Text,
		URL: st.URL, Title: st.Title, Value: st.Value,
		Selector: st.Selector, Op: st.Cmp, Want: st.Want,
	}
}

// runStep executes one step. Mutating acts re-settle (RefreshURL plus
// fresh Snapshot) so later steps see the new gen; the fresh gen and
// ref count ride in the step data.
func runStep(b *engine.Browser, st Step) (interface{}, string, string) {
	fail := func(err error) (interface{}, string, string) {
		code := engine.CodeOf(err)
		if code == "" {
			code = "act_failed"
		}
		data := map[string]interface{}{"error": firstWarn(err)}
		if se, ok := err.(*engine.StaleError); ok {
			data["want"] = se.Want
			data["gen"] = se.Gen
			data["current_gen"] = se.Current
			data["reason"] = se.Reason
			if se.Remap != nil {
				data["remap"] = *se.Remap
			}
		}
		return data, firstWarn(err), code
	}
	settled := func() map[string]interface{} {
		b.RefreshURL()
		snap, err := b.Snapshot()
		if err != nil {
			return map[string]interface{}{"resnapshot": firstWarn(err)}
		}
		return map[string]interface{}{"gen": snap.Gen, "refs": len(snap.Refs), "url": snap.URL}
	}
	switch st.Op {
	case "snapshot":
		snap, err := b.Snapshot()
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{
			"gen": snap.Gen, "stable": snap.Stable, "url": snap.URL,
			"title": snap.Title, "refs": snap.Refs, "count": len(snap.Refs),
		}, "", ""
	case "hints":
		cur := b.Current()
		if cur == nil {
			return fail(fmt.Errorf("no snapshot yet"))
		}
		return map[string]interface{}{
			"gen": cur.Gen, "stable": cur.Stable, "refs": cur.Refs, "count": len(cur.Refs),
		}, "", ""
	case "click":
		if err := b.Click(st.Ref, st.Gen); err != nil {
			return fail(err)
		}
		return settled(), "", ""
	case "hover":
		if err := b.Hover(st.Ref, st.Gen); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"hovered": st.Ref}, "", ""
	case "fill":
		if err := b.Fill(st.Ref, st.Gen, st.Text, st.Clear, st.Submit); err != nil {
			return fail(err)
		}
		d := settled()
		d["filled"] = st.Ref
		return d, "", ""
	case "press":
		if err := b.Press(st.Key, st.Mod); err != nil {
			return fail(err)
		}
		d := settled()
		d["pressed"] = st.Key
		return d, "", ""
	case "scroll":
		if err := b.ScrollPage(st.DX, st.DY); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"dx": st.DX, "dy": st.DY}, "", ""
	case "select":
		if err := b.Select(st.Ref, st.Gen, st.Value); err != nil {
			return fail(err)
		}
		d := settled()
		d["selected"] = st.Value
		return d, "", ""
	case "check":
		if err := b.SetChecked(st.Ref, st.Gen, st.Checked); err != nil {
			return fail(err)
		}
		d := settled()
		d["checked"] = st.Checked
		return d, "", ""
	case "drag":
		if err := b.Drag(st.From, st.FromGen, st.To, st.ToGen, st.X, st.Y, st.Steps); err != nil {
			return fail(err)
		}
		return settled(), "", ""
	case "upload":
		if err := b.Upload(st.Ref, st.Gen, st.File); err != nil {
			return fail(err)
		}
		d := settled()
		d["uploaded"] = st.File
		return d, "", ""
	case "cursor":
		if err := b.Cursor(*st.X, *st.Y); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"x": *st.X, "y": *st.Y}, "", ""
	case "dialog":
		ev, err := b.HandleDialog(st.Action == "accept", st.Prompt)
		if err != nil {
			return fail(err)
		}
		d := settled()
		d["dialog"] = ev
		return d, "", ""
	case "wait":
		timeout := time.Duration(st.Timeout * float64(time.Second))
		actual, err := b.Wait(stepCond(st), timeout)
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{"cond": st.Cond, "actual": actual}, "", ""
	case "assert":
		ok, actual, err := b.Verify(stepCond(st))
		if err != nil {
			return fail(err)
		}
		if !ok {
			return map[string]interface{}{"cond": st.Cond, "actual": actual},
				fmt.Sprintf("assert %s failed: %s", st.Cond, actual), "assert_failed"
		}
		return map[string]interface{}{"cond": st.Cond, "actual": actual}, "", ""
	case "console":
		entries := b.Console(st.Clear)
		return map[string]interface{}{"entries": entries, "count": len(entries), "cleared": st.Clear}, "", ""
	case "network":
		entries, inflight := b.HAR()
		if st.Clear {
			b.ClearTaps()
		}
		return map[string]interface{}{
			"har_version": "1.2", "entries": entries,
			"count": len(entries), "inflight": inflight, "cleared": st.Clear,
		}, "", ""
	case "screenshot":
		shot, err := b.Screenshot(st.Kind, st.Ref, st.Gen, st.Out, st.Annotate, st.IfUnchanged)
		if err != nil {
			return fail(err)
		}
		return shot, "", ""
	case "pdf":
		path, n, err := b.PDF(st.Out)
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{"path": path, "bytes": n}, "", ""
	case "evaluate":
		v, err := b.Evaluate(st.Expr)
		if err != nil {
			return fail(err)
		}
		s := string(v)
		if len(s) > 4000 {
			s = s[:4000] + "…[truncated]"
		}
		return map[string]interface{}{"value": s}, "", ""
	case "navigate":
		snap, err := b.Navigate(st.URL)
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{
			"gen": snap.Gen, "stable": snap.Stable, "url": snap.URL,
			"title": snap.Title, "refs": snap.Refs, "count": len(snap.Refs),
		}, "", ""
	default:
		return nil, fmt.Sprintf("unknown op %q", st.Op), "bad_step"
	}
}
