package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/agent"
	"randomlabs/terminal-browser/internal/engine"
)

// Interact runs a scripted interaction loop against one session
// manager: open once, execute every step in order, and report
// per-step results in the shared envelope. Tool-mapped ops (the MCP
// vocabulary plus the fill/press/wait/dialog aliases) execute through
// the shared agent dispatch, so CLI step data is bit-identical to the
// MCP tool results in docs/parity.md. Refs use the @eN sugar (bare eN
// works too); steps may pin a gen, and stale gens fail closed with
// ref_stale plus the remap hint. Mutating acts re-settle
// automatically: RefreshURL plus a fresh snapshot, so the next step
// sees the new gen exactly like the TUI drawer does after a fire.

// Step is the CLI script instruction (alias of the shared shape).
type Step = agent.Step

// StepResult is one executed step for the envelope (shared shape).
type StepResult = agent.StepResult

type doFlags []string

func (d *doFlags) String() string { return strings.Join(*d, ", ") }
func (d *doFlags) Set(v string) error {
	*d = append(*d, v)
	return nil
}

// checkStep validates one step before the browser launches.
func checkStep(st Step) error { return agent.ValidateStep(st) }

// isHaltCode stops the script after terminal failures.
func isHaltCode(code string) bool { return agent.HaltCode(code) }

func firstWarn(err error) string { return agent.FirstWarn(err) }

func interactCmd(args []string) {
	fs := flag.NewFlagSet("interact", flag.ExitOnError)
	urlFlag := fs.String("url", "", "live http(s) page to open (empty when the first step opens the session)")
	profile := fs.String("profile", "default", "browser profile")
	lite := fs.Bool("lite", false, "block images, media, and trackers")
	width := fs.Int("width", 100, "grid width for text renders")
	script := fs.String("script", "", "JSON file with an array of steps (or NDJSON)")
	stdin := fs.Bool("stdin", false, "read steps from stdin (JSON array or newline-delimited objects)")
	out := fs.String("out", "", "tee the final envelope JSON to FILE (0600) as well as stdout")
	session := fs.String("session", "", "session name recorded in the registry and echoed in the envelope")
	capsFlag := fs.String("caps", "", "comma-separated capability gates (pdf, trace, extension_trigger, webmcp); TB_CAPS also read")
	dialogPolicy := fs.String("dialog-policy", "manual", "dialog policy: manual, accept, or dismiss")
	var dos doFlags
	fs.Var(&dos, "do", "one step as JSON (repeatable)")
	_ = fs.Parse(args)

	// failOut mirrors failClosed and additionally tees the failure
	// envelope to --out, so offloaded transcripts capture the error
	// that stopped the run, not just successful ones.
	failOut := func(warning, code string) {
		if *out != "" {
			_ = writeEnvelopeFile(*out, false, nil, warning, code)
		}
		failClosed(warning, code)
	}

	p := resolveProfile(*profile)
	switch strings.ToLower(strings.TrimSpace(*dialogPolicy)) {
	case "manual", "accept", "dismiss":
		*dialogPolicy = strings.ToLower(strings.TrimSpace(*dialogPolicy))
	default:
		failOut(fmt.Sprintf("bad --dialog-policy %q: want manual, accept, or dismiss", *dialogPolicy), "bad_step")
	}
	caps, err := agent.ParseCaps(*capsFlag)
	if err != nil {
		failOut(err.Error(), "bad_step")
	}
	if envCaps, err := agent.CapsFromEnv(); err != nil {
		failOut("bad TB_CAPS: "+err.Error(), "bad_step")
	} else {
		for k, v := range envCaps {
			caps[k] = v
		}
	}
	var steps []Step
	if *script != "" {
		body, err := os.ReadFile(*script)
		if err != nil {
			failOut(fmt.Sprintf("read script: %v", err), "bad_path")
		}
		steps, err = agent.ParseSteps(body)
		if err != nil {
			failOut(fmt.Sprintf("parse script: %v", err), "bad_step")
		}
	}
	if *stdin {
		body, err := readAllStdin()
		if err != nil {
			failOut(fmt.Sprintf("read stdin: %v", err), "bad_step")
		}
		more, err := agent.ParseSteps(body)
		if err != nil {
			failOut(fmt.Sprintf("parse stdin: %v", err), "bad_step")
		}
		steps = append(steps, more...)
	}
	for _, d := range dos {
		var st Step
		if err := json.Unmarshal([]byte(d), &st); err != nil {
			failOut(fmt.Sprintf("parse --do %q: %v", d, err), "bad_step")
		}
		steps = append(steps, st)
	}
	if len(steps) == 0 {
		failOut("no steps: pass --script FILE, --stdin, or repeat --do '{...}'", "bad_step")
	}
	for i, st := range steps {
		if err := checkStep(st); err != nil {
			failOut(fmt.Sprintf("step %d: %v", i+1, err), "bad_step")
		}
	}
	// session_open and navigate open implicitly, so --url is only
	// required when the first step needs a live session already.
	if strings.TrimSpace(*urlFlag) == "" && len(steps) > 0 {
		first := agent.CanonicalOp(steps[0].Op)
		if first != "session_open" && first != "navigate" {
			failOut("missing required --url (or start the script with session_open/navigate)", "bad_url")
		}
	}

	mgr := agent.NewManager(agent.ManagerOptions{
		Caps:           caps,
		DefaultProfile: p,
		DefaultLite:    *lite,
		DefaultWidth:   *width,
		DialogPolicy:   *dialogPolicy,
	})
	defer mgr.CloseAll()

	if strings.TrimSpace(*urlFlag) != "" {
		h, _, err := mgr.Open(*urlFlag, p, *lite, *width, *dialogPolicy)
		if err != nil {
			warn, code := firstWarn(err), engine.CodeOf(err)
			if *out != "" {
				_ = writeEnvelopeFile(*out, false, nil, warn, code)
			}
			emit(false, nil, warn, code)
			os.Exit(1)
		}
		_ = h
	}

	results := make([]StepResult, 0, len(steps))
	failed := 0
	for _, st := range steps {
		t0 := time.Now()
		data, warn, code := agent.RunStep(mgr, st)
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
	var gen interface{}
	var address string
	if b := mgr.Active(); b != nil {
		address = b.URL()
		if cur := b.Current(); cur != nil {
			gen = cur.Gen
		}
	}
	sessionName := strings.TrimSpace(*session)
	if sessionName == "" {
		sessionName = p
	}
	payload := map[string]interface{}{
		"address": address, "profile": p, "session": sessionName, "gen": gen,
		"steps": results, "passed": len(results) - failed, "failed": failed,
	}
	if mgr.ActiveHandle() != "" {
		payload["handle"] = mgr.ActiveHandle()
	}
	// Record the CLI session for `tb-agent sessions`: the endpoint
	// probe reports real liveness; the opener owns the sidecar.
	if b := mgr.Active(); b != nil && strings.TrimSpace(*session) != "" {
		_ = agent.RecordSession(agent.SessionRecord{
			Name: sessionName, Profile: p, URL: address,
			Endpoint: b.Endpoint(), Started: time.Now().Unix(),
		})
	}
	emitEnvelope(failed == 0, payload, "", "")
	if *out != "" {
		if err := writeEnvelopeFile(*out, failed == 0, payload, "", ""); err != nil {
			fmt.Fprintln(os.Stderr, "offload: "+err.Error())
			os.Exit(1)
		}
	}
	if failed > 0 {
		os.Exit(1)
	}
}

// readAllStdin slurps piped steps for --stdin mode.
func readAllStdin() ([]byte, error) {
	fi, err := os.Stdin.Stat()
	if err != nil {
		return nil, err
	}
	if fi.Mode()&os.ModeCharDevice != 0 {
		return nil, fmt.Errorf("--stdin needs piped input, stdin is a terminal")
	}
	return io.ReadAll(os.Stdin)
}

// emitEnvelope prints one envelope line on stdout.
func emitEnvelope(ok bool, data interface{}, warning, code string) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(Envelope{Success: ok, Data: data, Warning: warning, Code: code})
}

// writeEnvelopeFile tees the same envelope bytes to FILE (0600) for
// large transcripts (snapshots, HAR) agents want to pass by path.
func writeEnvelopeFile(path string, ok bool, data interface{}, warning, code string) error {
	raw, err := json.Marshal(Envelope{Success: ok, Data: data, Warning: warning, Code: code})
	if err != nil {
		return err
	}
	raw = append(raw, '\n')
	tmp := path + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	if _, err := f.Write(raw); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return err
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Chmod(tmp, 0o600); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}
