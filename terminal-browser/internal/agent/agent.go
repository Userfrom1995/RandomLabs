// Package agent is the shared control plane both agent surfaces run
// through: the tb-mcp stdio server and the tb-agent CLI execute the
// exact same tool functions against the exact same session manager,
// so CLI JSON equals MCP results by construction (the parity matrix
// only canonicalizes run-scoped ids, timings, and file paths).
//
// The 12-tool core is binding: navigate, snapshot, click, type,
// press_key, scroll, screenshot, wait_for, assert, evaluate, console,
// dialog_handle. Session/tab utilities (session_open, session_list,
// session_use, session_close, back, forward, reload, hints, network,
// capabilities) ride the same dispatch. Gated capabilities (pdf,
// trace) register only when enabled via --caps or TB_CAPS; the Phase
// 6 extension surface (extension_trigger, webmcp) is deliberately not
// registered until its engine exists (see docs/parity.md).
package agent

import (
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"randomlabs/terminal-browser/internal/engine"
)

// Caps is the enabled capability set. Empty means core only.
type Caps map[string]bool

// KnownCaps lists every gateable capability. pdf and trace execute
// real logic (PDF export, CDP tracing); extension_trigger and webmcp
// name the Phase 6 surface and stay unregistered until then.
var KnownCaps = []string{"pdf", "trace", "extension_trigger", "webmcp"}

// LiveCaps are capabilities with a working engine behind the gate.
var LiveCaps = []string{"pdf", "trace"}

// ParseCaps splits a comma list (flag or env) into a set. Unknown
// names fail closed: a typo must never silently narrow the surface.
func ParseCaps(raw string) (Caps, error) {
	c := Caps{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return c, nil
	}
	known := map[string]bool{}
	for _, k := range KnownCaps {
		known[k] = true
	}
	for _, part := range strings.Split(raw, ",") {
		name := strings.ToLower(strings.TrimSpace(part))
		if name == "" {
			continue
		}
		if !known[name] {
			return nil, fmt.Errorf("unknown capability %q: want one of %s", part, strings.Join(KnownCaps, ", "))
		}
		c[name] = true
	}
	return c, nil
}

// CapsFromEnv reads TB_CAPS with ParseCaps semantics.
func CapsFromEnv() (Caps, error) {
	return ParseCaps(os.Getenv("TB_CAPS"))
}

// Has reports whether a capability is enabled. Only live
// capabilities can be enabled: extension_trigger and webmcp parse
// (so scripts do not typo them) but never gate anything on yet.
func (c Caps) Has(name string) bool {
	if c == nil {
		return false
	}
	for _, live := range LiveCaps {
		if name == live {
			return c[name]
		}
	}
	return false
}

// Session names one live browser handle.
type Session struct {
	Handle  string `json:"handle"`
	Profile string `json:"profile"`
	URL     string `json:"url"`
	Active  bool   `json:"active"`
	Alive   bool   `json:"alive"`
}

// Manager owns every live browser handle in the process: the MCP
// server keeps many, the CLI keeps one. All methods serialize on mu;
// browsers serialize their own CDP internally.
type Manager struct {
	mu             sync.Mutex
	items          map[string]*engine.Browser
	order          []string
	active         string
	seq            int
	caps           Caps
	defaultProfile string
	defaultLite    bool
	defaultWidth   int
	defaultDialog  string
}

// ManagerOptions tunes sessions the manager opens.
type ManagerOptions struct {
	Caps           Caps
	DefaultProfile string
	DefaultLite    bool
	DefaultWidth   int
	DialogPolicy   string
}

// NewManager builds an empty session set.
func NewManager(o ManagerOptions) *Manager {
	prof := o.DefaultProfile
	if strings.TrimSpace(prof) == "" {
		prof = "default"
	}
	width := o.DefaultWidth
	if width <= 0 {
		width = 100
	}
	policy := strings.ToLower(strings.TrimSpace(o.DialogPolicy))
	if policy == "" {
		policy = "manual"
	}
	return &Manager{
		items:          map[string]*engine.Browser{},
		caps:           o.Caps,
		defaultProfile: prof,
		defaultLite:    o.DefaultLite,
		defaultWidth:   width,
		defaultDialog:  policy,
	}
}

// CapsOf reports the enabled capability set.
func (m *Manager) CapsOf() Caps {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := Caps{}
	for k, v := range m.caps {
		out[k] = v
	}
	return out
}

// Open launches a browser on target, archives it under a fresh
// handle (s1, s2, ...), and makes it active. The returned snapshot
// is the gen-1 settled snapshot, identical to a bare open.
func (m *Manager) Open(target, profile string, lite bool, width int, dialogPolicy string) (string, *engine.Snapshot, error) {
	if strings.TrimSpace(profile) == "" {
		profile = m.defaultProfile
	}
	if width <= 0 {
		width = m.defaultWidth
	}
	if strings.TrimSpace(dialogPolicy) == "" {
		dialogPolicy = m.defaultDialog
	}
	b, err := engine.Open(target, engine.OpenOptions{
		Profile: profile, Lite: lite, Width: width, DialogPolicy: dialogPolicy,
	})
	if err != nil {
		return "", nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	h := fmt.Sprintf("s%d", m.seq)
	m.items[h] = b
	m.order = append(m.order, h)
	m.active = h
	snap := b.Current()
	return h, snap, nil
}

// Active returns the active browser, or nil when no session is open.
func (m *Manager) Active() *engine.Browser {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.items[m.active]
}

// ActiveHandle names the active session ("" when none).
func (m *Manager) ActiveHandle() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.active
}

// Use makes handle active. Unknown handles fail closed.
func (m *Manager) Use(handle string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.items[handle]; !ok {
		return fmt.Errorf("unknown session %q", handle)
	}
	m.active = handle
	return nil
}

// Close shuts one session down and drops its handle. Closing the
// active session activates the most recently opened survivor.
func (m *Manager) Close(handle string) error {
	m.mu.Lock()
	b, ok := m.items[handle]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("unknown session %q", handle)
	}
	delete(m.items, handle)
	kept := m.order[:0]
	for _, h := range m.order {
		if h != handle {
			kept = append(kept, h)
		}
	}
	m.order = kept
	if m.active == handle {
		m.active = ""
		if len(m.order) > 0 {
			m.active = m.order[len(m.order)-1]
		}
	}
	m.mu.Unlock()
	_ = b.Close()
	return nil
}

// List snapshots every handle newest-last with liveness.
func (m *Manager) List() []Session {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]Session, 0, len(m.order))
	for _, h := range m.order {
		b := m.items[h]
		out = append(out, Session{
			Handle: h, Profile: b.Profile(), URL: b.URL(),
			Active: h == m.active, Alive: !b.Closed(),
		})
	}
	return out
}

// CloseAll shuts every session down. Servers defer it on exit; the
// CLI defers it after the script run.
func (m *Manager) CloseAll() {
	m.mu.Lock()
	items := m.items
	m.items = map[string]*engine.Browser{}
	m.order = nil
	m.active = ""
	m.mu.Unlock()
	for _, b := range items {
		_ = b.Close()
	}
}

// Tool describes one callable tool: its MCP name, human description,
// JSON Schema for arguments, and the capability gate ("" = core).
type Tool struct {
	Name        string
	Description string
	Schema      map[string]interface{}
	Cap         string
}

func schema(props map[string]interface{}, required ...string) map[string]interface{} {
	return map[string]interface{}{
		"type": "object", "properties": props, "required": required,
		"additionalProperties": false,
	}
}

func prop(desc, typ string) map[string]interface{} {
	return map[string]interface{}{"description": desc, "type": typ}
}

// Registry returns every registered tool in stable order: the exact
// 12-tool core first, then session/tab utilities, then the enabled
// gated capabilities. Disabled caps are absent (calls fail with
// capability_disabled either way, but listing only what works keeps
// agents from planning around tools they cannot call).
func Registry(caps Caps) []Tool {
	refProp := prop("snapshot ref like e3 (@e3 also accepted)", "string")
	genProp := prop("snapshot generation the ref belongs to (0 = latest)", "integer")
	tools := []Tool{
		{"navigate", "Load a URL in the active session (opens the default session when none is open) and return the fresh settled snapshot.", schema(map[string]interface{}{
			"url":     prop("http(s) URL to load (required)", "string"),
			"profile": prop("browser profile for a fresh open", "string"),
			"lite":    prop("block images, media, and trackers", "boolean"),
			"width":   prop("grid width for the text render", "integer"),
		}, "url"), ""},
		{"snapshot", "Take a fresh settled snapshot of the active session: gen, stability, URL, title, and DOM-order eN refs.", schema(map[string]interface{}{}), ""},
		{"click", "Click a snapshot ref with trusted input, then re-settle.", schema(map[string]interface{}{
			"ref": refProp, "gen": genProp,
		}, "ref"), ""},
		{"type", "Type text into a snapshot ref (clear first and/or submit with Enter), then re-settle.", schema(map[string]interface{}{
			"ref": refProp, "gen": genProp,
			"text":   prop("text to type", "string"),
			"clear":  prop("clear the field first", "boolean"),
			"submit": prop("press Enter after typing", "boolean"),
		}, "ref"), ""},
		{"press_key", "Press a key (Enter, Tab, Escape, arrows, a-z) with optional modifier, then re-settle.", schema(map[string]interface{}{
			"key": prop("key name (required)", "string"),
			"mod": prop("modifier: ctrl, alt, shift, or cmd", "string"),
		}, "key"), ""},
		{"scroll", "Scroll the page by CSS pixels.", schema(map[string]interface{}{
			"dx": prop("horizontal pixels", "number"),
			"dy": prop("vertical pixels", "number"),
		}), ""},
		{"screenshot", "Capture a PNG screenshot (viewport, full page, or one ref element), optionally annotated with ref boxes, to a server-side path.", schema(map[string]interface{}{
			"kind": prop("viewport, full, or element", "string"),
			"ref":  refProp, "gen": genProp,
			"out":          prop("output PNG path (required)", "string"),
			"annotate":     prop("draw ref boxes plus a legend file", "boolean"),
			"if_unchanged": prop("skip the write when pixels equal the last shot", "boolean"),
		}, "out"), ""},
		{"wait_for", "Poll until a condition holds (visible, text, url, title, value, count) or the timeout elapses.", schema(map[string]interface{}{
			"cond": prop("visible, text, url, title, value, or count (required)", "string"),
			"ref":  refProp, "gen": genProp,
			"text":     prop("text cond: page must contain this", "string"),
			"url":      prop("url cond: current URL must contain this", "string"),
			"title":    prop("title cond: title must contain this", "string"),
			"value":    prop("value cond: ref value must equal this", "string"),
			"selector": prop("count cond: CSS selector", "string"),
			"cmp":      prop("count comparison: eq, ge, or le", "string"),
			"want":     prop("count cond: expected element count", "integer"),
			"timeout":  prop("max wait in seconds", "number"),
		}, "cond"), ""},
		{"assert", "Check one condition once; failure returns assert_failed with the actual value.", schema(map[string]interface{}{
			"cond": prop("visible, text, url, title, value, or count (required)", "string"),
			"ref":  refProp, "gen": genProp,
			"text":     prop("text cond: page must contain this", "string"),
			"url":      prop("url cond: current URL must contain this", "string"),
			"title":    prop("title cond: title must contain this", "string"),
			"value":    prop("value cond: ref value must equal this", "string"),
			"selector": prop("count cond: CSS selector", "string"),
			"cmp":      prop("count comparison: eq, ge, or le", "string"),
			"want":     prop("count cond: expected element count", "integer"),
		}, "cond"), ""},
		{"evaluate", "Run a JavaScript expression in the page and return its JSON value (truncated past 4000 chars).", schema(map[string]interface{}{
			"expr": prop("expression to evaluate (required)", "string"),
		}, "expr"), ""},
		{"console", "Drain the console tap ring oldest-first.", schema(map[string]interface{}{
			"clear": prop("drop the buffer after reading", "boolean"),
		}), ""},
		{"dialog_handle", "Answer the pending JavaScript dialog (accept with optional prompt text, or dismiss).", schema(map[string]interface{}{
			"action": prop("accept or dismiss (required)", "string"),
			"prompt": prop("prompt text for accept", "string"),
		}, "action"), ""},
		{"session_open", "Open a new session (its own Chromium sidecar) on a URL and make it active. Returns the handle plus the gen-1 snapshot.", schema(map[string]interface{}{
			"url":     prop("http(s) URL to load (required)", "string"),
			"profile": prop("browser profile", "string"),
			"lite":    prop("block images, media, and trackers", "boolean"),
			"width":   prop("grid width for the text render", "integer"),
		}, "url"), ""},
		{"session_list", "List every session handle with profile, URL, active, and alive.", schema(map[string]interface{}{}), ""},
		{"session_use", "Make a session handle active.", schema(map[string]interface{}{
			"handle": prop("session handle like s1 (required)", "string"),
		}, "handle"), ""},
		{"session_close", "Shut a session down and drop its handle.", schema(map[string]interface{}{
			"handle": prop("session handle like s1 (required)", "string"),
		}, "handle"), ""},
		{"back", "Step the profile history stack back and load that entry without forking the stack.", schema(map[string]interface{}{}), ""},
		{"forward", "Step the profile history stack forward and load that entry without forking the stack.", schema(map[string]interface{}{}), ""},
		{"reload", "Reload the current URL without duplicating history or forking the stack.", schema(map[string]interface{}{}), ""},
		{"hints", "Return the current snapshot refs without re-fetching (the chip row for the active gen).", schema(map[string]interface{}{}), ""},
		{"network", "Return captured network rows in HAR-1.2 entry shape plus the in-flight count.", schema(map[string]interface{}{
			"clear": prop("drop console and network rings after reading", "boolean"),
		}), ""},
		{"capabilities", "Report the enabled capability flags and the full registered tool list.", schema(map[string]interface{}{}), ""},
	}
	if caps.Has("pdf") {
		tools = append(tools, Tool{"pdf", "Export the active page to PDF at a server-side path (capability-gated: pdf).", schema(map[string]interface{}{
			"out": prop("output PDF path (required)", "string"),
		}, "out"), "pdf"})
	}
	if caps.Has("trace") {
		tools = append(tools, Tool{"trace", "Record a CDP trace for N seconds and write the trace events file (capability-gated: trace).", schema(map[string]interface{}{
			"seconds": prop("capture length in seconds, clamped 1..30", "number"),
			"out":     prop("output trace JSON path (required)", "string"),
		}, "out"), "trace"})
	}
	return tools
}

// CoreNames is the binding 12-tool core in registry order.
var CoreNames = []string{
	"navigate", "snapshot", "click", "type", "press_key", "scroll",
	"screenshot", "wait_for", "assert", "evaluate", "console", "dialog_handle",
}

// Lookup finds a registered tool by name under caps, or nil.
func Lookup(caps Caps, name string) *Tool {
	reg := Registry(caps)
	for i := range reg {
		if reg[i].Name == name {
			cp := reg[i]
			return &cp
		}
	}
	return nil
}

// arg helpers read loosely-typed JSON args. Numbers arrive as
// float64; refs and enums arrive as strings; pulling them here keeps
// every tool on identical coercion (CLI --do JSON and MCP arguments
// decode the same way).
func argStr(args map[string]interface{}, key string) string {
	v, ok := args[key]
	if !ok || v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func argFloat(args map[string]interface{}, key string) float64 {
	v, ok := args[key]
	if !ok || v == nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	case bool:
		if n {
			return 1
		}
	}
	return 0
}

func argInt(args map[string]interface{}, key string) int {
	return int(argFloat(args, key))
}

func argBool(args map[string]interface{}, key string) bool {
	v, ok := args[key]
	if !ok || v == nil {
		return false
	}
	if b, ok := v.(bool); ok {
		return b
	}
	return false
}

// Resettle refreshes the URL and takes a fresh snapshot after a
// mutating act, so the next call sees the new gen. Both the MCP
// tools and the CLI script runner settle through here.
func Resettle(b *engine.Browser) map[string]interface{} {
	b.RefreshURL()
	snap, err := b.Snapshot()
	if err != nil {
		return map[string]interface{}{"resnapshot": FirstWarn(err)}
	}
	return map[string]interface{}{"gen": snap.Gen, "refs": len(snap.Refs), "url": snap.URL}
}

// FirstWarn trims the offline fail-closed suffix off an error for
// envelope warnings. Exported so the CLI shares the exact shape.
func FirstWarn(err error) string {
	if err == nil {
		return ""
	}
	s := err.Error()
	if i := strings.Index(s, " (offline fail-closed"); i > 0 {
		return s[:i]
	}
	return s
}

// Execute runs one tool by name against the manager and returns the
// envelope payload triple (data, warning, code): code == "" means
// success. Mutating tools re-settle (RefreshURL plus a fresh
// snapshot) so the next call sees the new gen, exactly like the TUI
// drawer does after a fire. Both surfaces call this, so results are
// identical by construction.
func Execute(m *Manager, name string, args map[string]interface{}) (interface{}, string, string) {
	if args == nil {
		args = map[string]interface{}{}
	}
	fail := func(err error) (interface{}, string, string) {
		code := engine.CodeOf(err)
		if code == "" {
			code = "act_failed"
		}
		data := map[string]interface{}{"error": FirstWarn(err)}
		if se, ok := err.(*engine.StaleError); ok {
			data["want"] = se.Want
			data["gen"] = se.Gen
			data["current_gen"] = se.Current
			data["reason"] = se.Reason
			if se.Remap != nil {
				data["remap"] = *se.Remap
			}
		}
		return data, FirstWarn(err), code
	}
	needActive := func() (*engine.Browser, interface{}, string, string) {
		b := m.Active()
		if b == nil {
			return nil, nil, "no session open: call session_open or navigate with a url first", "no_session"
		}
		return b, nil, "", ""
	}
	settled := func(b *engine.Browser) map[string]interface{} {
		b.RefreshURL()
		snap, err := b.Snapshot()
		if err != nil {
			return map[string]interface{}{"resnapshot": FirstWarn(err)}
		}
		return map[string]interface{}{"gen": snap.Gen, "refs": len(snap.Refs), "url": snap.URL}
	}
	snapData := func(snap *engine.Snapshot) map[string]interface{} {
		return map[string]interface{}{
			"gen": snap.Gen, "stable": snap.Stable, "url": snap.URL,
			"title": snap.Title, "refs": snap.Refs, "count": len(snap.Refs),
		}
	}
	condOf := func() engine.Condition {
		return engine.Condition{
			Kind: argStr(args, "cond"), Ref: argStr(args, "ref"), Gen: argInt(args, "gen"),
			Text: argStr(args, "text"), URL: argStr(args, "url"), Title: argStr(args, "title"),
			Value: argStr(args, "value"), Selector: argStr(args, "selector"),
			Op: argStr(args, "cmp"), Want: argInt(args, "want"),
		}
	}
	if err := checkArgs(name, args); err != nil {
		return nil, err.Error(), "bad_step"
	}
	switch name {
	case "navigate":
		url := strings.TrimSpace(argStr(args, "url"))
		if b := m.Active(); b != nil && m.ActiveHandle() != "" {
			snap, err := b.Navigate(url)
			if err != nil {
				return fail(err)
			}
			return snapData(snap), "", ""
		}
		h, snap, err := m.Open(url, argStr(args, "profile"), argBool(args, "lite"), argInt(args, "width"), argStr(args, "dialog_policy"))
		if err != nil {
			return fail(err)
		}
		d := snapData(snap)
		d["session"] = h
		return d, "", ""
	case "session_open":
		h, snap, err := m.Open(
			strings.TrimSpace(argStr(args, "url")),
			argStr(args, "profile"), argBool(args, "lite"),
			argInt(args, "width"), argStr(args, "dialog_policy"))
		if err != nil {
			return fail(err)
		}
		d := snapData(snap)
		d["session"] = h
		return d, "", ""
	case "session_list":
		list := m.List()
		if list == nil {
			list = []Session{}
		}
		return map[string]interface{}{"sessions": list, "count": len(list), "active": m.ActiveHandle()}, "", ""
	case "session_use":
		if err := m.Use(strings.TrimSpace(argStr(args, "handle"))); err != nil {
			return nil, err.Error(), "bad_step"
		}
		b := m.Active()
		return map[string]interface{}{"active": m.ActiveHandle(), "url": b.URL()}, "", ""
	case "session_close":
		h := strings.TrimSpace(argStr(args, "handle"))
		if err := m.Close(h); err != nil {
			return nil, err.Error(), "bad_step"
		}
		return map[string]interface{}{"closed": h, "active": m.ActiveHandle()}, "", ""
	case "snapshot":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		snap, err := b.Snapshot()
		if err != nil {
			return fail(err)
		}
		return snapData(snap), "", ""
	case "hints":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		cur := b.Current()
		if cur == nil {
			return fail(fmt.Errorf("no snapshot yet"))
		}
		return map[string]interface{}{
			"gen": cur.Gen, "stable": cur.Stable, "refs": cur.Refs, "count": len(cur.Refs),
		}, "", ""
	case "click":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		if err := b.Click(argStr(args, "ref"), argInt(args, "gen")); err != nil {
			return fail(err)
		}
		return settled(b), "", ""
	case "type":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		if err := b.Fill(argStr(args, "ref"), argInt(args, "gen"), argStr(args, "text"), argBool(args, "clear"), argBool(args, "submit")); err != nil {
			return fail(err)
		}
		d := settled(b)
		d["typed"] = argStr(args, "ref")
		return d, "", ""
	case "press_key":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		if err := b.Press(argStr(args, "key"), argStr(args, "mod")); err != nil {
			return fail(err)
		}
		d := settled(b)
		d["pressed"] = argStr(args, "key")
		return d, "", ""
	case "scroll":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		if err := b.ScrollPage(argFloat(args, "dx"), argFloat(args, "dy")); err != nil {
			return fail(err)
		}
		return map[string]interface{}{"dx": argFloat(args, "dx"), "dy": argFloat(args, "dy")}, "", ""
	case "screenshot":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		shot, err := b.Screenshot(argStr(args, "kind"), argStr(args, "ref"), argInt(args, "gen"), argStr(args, "out"), argBool(args, "annotate"), argBool(args, "if_unchanged"))
		if err != nil {
			return fail(err)
		}
		return shot, "", ""
	case "wait_for":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		timeout := time.Duration(argFloat(args, "timeout") * float64(time.Second))
		actual, err := b.Wait(condOf(), timeout)
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{"cond": argStr(args, "cond"), "actual": actual}, "", ""
	case "assert":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		ok, actual, err := b.Verify(condOf())
		if err != nil {
			return fail(err)
		}
		if !ok {
			return map[string]interface{}{"cond": argStr(args, "cond"), "actual": actual},
				fmt.Sprintf("assert %s failed: %s", argStr(args, "cond"), actual), "assert_failed"
		}
		return map[string]interface{}{"cond": argStr(args, "cond"), "actual": actual}, "", ""
	case "evaluate":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		v, err := b.Evaluate(argStr(args, "expr"))
		if err != nil {
			return fail(err)
		}
		s := string(v)
		if len(s) > 4000 {
			s = s[:4000] + "…[truncated]"
		}
		return map[string]interface{}{"value": s}, "", ""
	case "console":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		entries := b.Console(argBool(args, "clear"))
		if entries == nil {
			entries = []engine.ConsoleEntry{}
		}
		return map[string]interface{}{"entries": entries, "count": len(entries), "cleared": argBool(args, "clear")}, "", ""
	case "network":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		entries, inflight := b.HAR()
		if entries == nil {
			entries = []engine.HAREntry{}
		}
		if argBool(args, "clear") {
			b.ClearTaps()
		}
		return map[string]interface{}{
			"har_version": "1.2", "entries": entries,
			"count": len(entries), "inflight": inflight, "cleared": argBool(args, "clear"),
		}, "", ""
	case "dialog_handle":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		ev, err := b.HandleDialog(argStr(args, "action") == "accept", argStr(args, "prompt"))
		if err != nil {
			return fail(err)
		}
		d := settled(b)
		d["dialog"] = ev
		return d, "", ""
	case "back", "forward", "reload":
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		profile := b.Profile()
		var target string
		switch name {
		case "back":
			v, ok, err := engine.Back(profile)
			if err != nil {
				return fail(err)
			}
			if !ok {
				return map[string]interface{}{"moved": false, "target": nil}, "", ""
			}
			target = v.URL
		case "forward":
			v, ok, err := engine.Forward(profile)
			if err != nil {
				return fail(err)
			}
			if !ok {
				return map[string]interface{}{"moved": false, "target": nil}, "", ""
			}
			target = v.URL
		default:
			target = b.URL()
		}
		// Repeat loads must not fork the stack or duplicate history:
		// move first, record nothing.
		b.SetRecord(false)
		snap, err := b.Navigate(target)
		b.SetRecord(true)
		if err != nil {
			return fail(err)
		}
		d := snapData(snap)
		d["moved"] = true
		return d, "", ""
	case "pdf":
		if !m.CapsOf().Has("pdf") {
			return nil, "pdf is capability-gated: relaunch with --caps pdf (or TB_CAPS=pdf)", "capability_disabled"
		}
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		path, n, err := b.PDF(argStr(args, "out"))
		if err != nil {
			return fail(err)
		}
		return map[string]interface{}{"path": path, "bytes": n}, "", ""
	case "trace":
		if !m.CapsOf().Has("trace") {
			return nil, "trace is capability-gated: relaunch with --caps trace (or TB_CAPS=trace)", "capability_disabled"
		}
		b, data, warn, code := needActive()
		if code != "" {
			return data, warn, code
		}
		res, err := b.Trace(argFloat(args, "seconds"), argStr(args, "out"))
		if err != nil {
			return fail(err)
		}
		return res, "", ""
	case "capabilities":
		names := []string{}
		for _, t := range Registry(m.CapsOf()) {
			names = append(names, t.Name)
		}
		enabled := []string{}
		for cap := range m.CapsOf() {
			enabled = append(enabled, cap)
		}
		sort.Strings(enabled)
		return map[string]interface{}{
			"caps": enabled, "tools": names,
			"deferred": []string{"extension_trigger", "webmcp"},
		}, "", ""
	default:
		if Lookup(m.CapsOf(), name) == nil {
			// Unknown or disabled-gated tool: say which.
			for _, t := range Registry(Caps{"pdf": true, "trace": true}) {
				if t.Name == name {
					return nil, fmt.Sprintf("%s is capability-gated: relaunch with --caps %s (or TB_CAPS=%s)", name, t.Cap, t.Cap), "capability_disabled"
				}
			}
			return nil, fmt.Sprintf("unknown tool %q", name), "bad_step"
		}
		return nil, fmt.Sprintf("tool %q has no implementation", name), "act_failed"
	}
}

// checkArgs validates required fields before any browser launches,
// mirroring the CLI pre-flight so scripts fail fast with bad_step.
func checkArgs(name string, args map[string]interface{}) error {
	need := func(key string) error {
		if strings.TrimSpace(argStr(args, key)) == "" {
			return fmt.Errorf("%s needs %s", name, key)
		}
		return nil
	}
	switch name {
	case "navigate", "session_open":
		return need("url")
	case "click":
		return need("ref")
	case "type":
		if err := need("ref"); err != nil {
			return err
		}
	case "press_key":
		return need("key")
	case "scroll":
		if argFloat(args, "dx") == 0 && argFloat(args, "dy") == 0 {
			return fmt.Errorf("scroll needs dx or dy")
		}
	case "screenshot", "pdf", "trace":
		if err := need("out"); err != nil {
			return err
		}
		if name == "screenshot" {
			switch argStr(args, "kind") {
			case "", "viewport", "full", "element":
			default:
				return fmt.Errorf("bad screenshot kind %q", argStr(args, "kind"))
			}
			if argStr(args, "kind") == "element" && strings.TrimSpace(argStr(args, "ref")) == "" {
				return fmt.Errorf("element screenshot needs ref")
			}
		}
	case "wait_for", "assert":
		return checkCondArgs(args)
	case "evaluate":
		return need("expr")
	case "dialog_handle":
		a := argStr(args, "action")
		if a != "accept" && a != "dismiss" {
			return fmt.Errorf("dialog_handle needs action accept or dismiss")
		}
	case "session_use", "session_close":
		return need("handle")
	}
	// type with no text/clear/submit is a no-op: fail instead of
	// shipping an empty fill that reads as success.
	if name == "type" {
		if argStr(args, "text") == "" && !argBool(args, "clear") && !argBool(args, "submit") {
			return fmt.Errorf("type needs text, clear, or submit: nothing to do")
		}
	}
	return nil
}

// checkCondArgs validates one wait/assert condition.
func checkCondArgs(args map[string]interface{}) error {
	switch argStr(args, "cond") {
	case "visible":
		if strings.TrimSpace(argStr(args, "ref")) == "" {
			return fmt.Errorf("visible cond needs ref")
		}
	case "text":
		if argStr(args, "text") == "" {
			return fmt.Errorf("text cond needs text")
		}
	case "url":
		if argStr(args, "url") == "" {
			return fmt.Errorf("url cond needs url")
		}
	case "title":
		if argStr(args, "title") == "" {
			return fmt.Errorf("title cond needs title")
		}
	case "value":
		if strings.TrimSpace(argStr(args, "ref")) == "" {
			return fmt.Errorf("value cond needs ref")
		}
	case "count":
		if strings.TrimSpace(argStr(args, "selector")) == "" {
			return fmt.Errorf("count cond needs selector")
		}
		switch argStr(args, "cmp") {
		case "", "eq", "ge", "le":
		default:
			return fmt.Errorf("bad count op %q", argStr(args, "cmp"))
		}
	default:
		return fmt.Errorf("unknown cond %q", argStr(args, "cond"))
	}
	return nil
}
