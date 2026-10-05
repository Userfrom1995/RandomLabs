package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// taskSite serves the Phase 5 gate site: an index page linking to a
// form page, which submits to a done page. Two navigations, one fill,
// one assert, one screenshot: the whole agent loop.
func taskSite() *httptest.Server {
	const index = `<!doctype html>
<html><head><title>Index</title></head>
<body><h1>Directory</h1><a href="/form">Open form</a></body></html>`
	const form = `<!doctype html>
<html><head><title>Form</title></head>
<body><h1>Signup</h1>
<form action="/done" method="GET">
<label>Name <input id="name" name="name" type="text"></label>
<button id="go" type="submit">Sign up</button>
</form></body></html>`
	const done = `<!doctype html>
<html><head><title>Done</title></head>
<body><h1>Welcome aboard</h1><p>task complete</p></body></html>`
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/form":
			_, _ = fmt.Fprint(w, form)
		case "/done":
			_, _ = fmt.Fprint(w, done)
		default:
			_, _ = fmt.Fprint(w, index)
		}
	})
	return httptest.NewServer(mux)
}

// chromePresent mirrors the engine locator well enough to skip live
// tests cleanly: TB_CHROME wins, then PATH names, then the macOS and
// Windows well-known installs.
func chromePresent() bool {
	if env := strings.TrimSpace(os.Getenv("TB_CHROME")); env != "" {
		if _, err := os.Stat(env); err == nil {
			return true
		}
		return false
	}
	for _, n := range []string{"google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome-headless-shell"} {
		if _, err := exec.LookPath(n); err == nil {
			return true
		}
	}
	for _, c := range []string{
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
	} {
		if _, err := os.Stat(c); err == nil {
			return true
		}
	}
	return false
}

func buildMCP(t *testing.T) string {
	t.Helper()
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go toolchain absent")
	}
	bin := filepath.Join(t.TempDir(), "tb-mcp")
	build := exec.Command("go", "build", "-o", bin, ".")
	build.Dir = "."
	build.Env = os.Environ()
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build tb-mcp: %v\n%s", err, out)
	}
	return bin
}

// rpcPipe is a minimal JSON-RPC 2.0 client over the server stdio.
type rpcPipe struct {
	t      *testing.T
	cmd    *exec.Cmd
	in     *json.Encoder
	out    *bufio.Scanner
	nextID int
}

func startMCP(t *testing.T, bin string, env []string, args ...string) *rpcPipe {
	t.Helper()
	cmd := exec.Command(bin, args...)
	cmd.Env = env
	stdin, err := cmd.StdinPipe()
	if err != nil {
		t.Fatalf("stdin pipe: %v", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("stdout pipe: %v", err)
	}
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		t.Fatalf("start tb-mcp: %v", err)
	}
	t.Cleanup(func() {
		_ = stdin.Close()
		_ = cmd.Wait()
	})
	sc := bufio.NewScanner(stdout)
	sc.Buffer(make([]byte, 1024*1024), 64*1024*1024)
	return &rpcPipe{t: t, cmd: cmd, in: json.NewEncoder(stdin), out: sc}
}

func (p *rpcPipe) call(method string, params interface{}) map[string]interface{} {
	p.t.Helper()
	p.nextID++
	req := map[string]interface{}{"jsonrpc": "2.0", "id": p.nextID, "method": method}
	if params != nil {
		req["params"] = params
	}
	if err := p.in.Encode(req); err != nil {
		p.t.Fatalf("send %s: %v", method, err)
	}
	for p.out.Scan() {
		line := strings.TrimSpace(p.out.Text())
		if line == "" {
			continue
		}
		var msg map[string]interface{}
		if err := json.Unmarshal([]byte(line), &msg); err != nil {
			p.t.Fatalf("decode %s reply: %v", method, err)
		}
		return msg
	}
	p.t.Fatalf("no reply to %s", method)
	return nil
}

// tool calls one MCP tool and returns the decoded envelope.
func (p *rpcPipe) tool(name string, args map[string]interface{}) map[string]interface{} {
	p.t.Helper()
	if args == nil {
		args = map[string]interface{}{}
	}
	msg := p.call("tools/call", map[string]interface{}{"name": name, "arguments": args})
	res, _ := msg["result"].(map[string]interface{})
	if res == nil {
		p.t.Fatalf("tool %s: no result: %v", name, msg)
	}
	content, _ := res["content"].([]interface{})
	if len(content) == 0 {
		p.t.Fatalf("tool %s: empty content: %v", name, msg)
	}
	first, _ := content[0].(map[string]interface{})
	text, _ := first["text"].(string)
	var env map[string]interface{}
	if err := json.Unmarshal([]byte(text), &env); err != nil {
		p.t.Fatalf("tool %s: decode envelope: %v", name, err)
	}
	return env
}

func mustOK(t *testing.T, env map[string]interface{}, what string) map[string]interface{} {
	t.Helper()
	if env["success"] != true {
		t.Fatalf("%s: not ok: %v", what, env)
	}
	data, _ := env["data"].(map[string]interface{})
	if data == nil {
		t.Fatalf("%s: no data: %v", what, env)
	}
	return data
}

func refByName(t *testing.T, data map[string]interface{}, role, name string) string {
	t.Helper()
	refs, _ := data["refs"].([]interface{})
	for _, r := range refs {
		m, _ := r.(map[string]interface{})
		if m["role"] == role && strings.Contains(m["name"].(string), name) {
			return m["id"].(string)
		}
	}
	t.Fatalf("no %s %q in %+v", role, name, data["refs"])
	return ""
}

// TestMCPFraming is hermetic: initialize, tools/list shape, unknown
// tool and method errors, cap gating, all without Chrome.
func TestMCPFraming(t *testing.T) {
	bin := buildMCP(t)
	p := startMCP(t, bin, os.Environ())

	init := p.call("initialize", map[string]interface{}{})
	res, _ := init["result"].(map[string]interface{})
	if res["protocolVersion"] != ProtocolVersion {
		t.Fatalf("protocol = %v, want %s", res["protocolVersion"], ProtocolVersion)
	}
	list := p.call("tools/list", map[string]interface{}{})
	lres, _ := list["result"].(map[string]interface{})
	tools, _ := lres["tools"].([]interface{})
	if len(tools) == 0 {
		t.Fatal("empty tools/list")
	}
	first, _ := tools[0].(map[string]interface{})
	if first["name"] != "navigate" {
		t.Fatalf("first tool = %v, want navigate (core-first order)", first["name"])
	}
	names := map[string]bool{}
	for _, tl := range tools {
		m, _ := tl.(map[string]interface{})
		names[m["name"].(string)] = true
	}
	for _, want := range []string{"navigate", "snapshot", "click", "type", "press_key", "scroll",
		"screenshot", "wait_for", "assert", "evaluate", "console", "dialog_handle"} {
		if !names[want] {
			t.Fatalf("core tool %q missing from tools/list", want)
		}
	}
	if names["pdf"] || names["trace"] {
		t.Fatal("gated tools must not list without caps")
	}
	if names["extension_trigger"] || names["webmcp"] {
		t.Fatal("deferred Phase 6 tools must never list")
	}
	env := p.tool("bogus", nil)
	if env["success"] != false || env["code"] != "bad_step" {
		t.Fatalf("unknown tool: %v", env)
	}
	env = p.tool("pdf", map[string]interface{}{"out": "/tmp/x.pdf"})
	if env["success"] != false || env["code"] != "capability_disabled" {
		t.Fatalf("ungated pdf: %v", env)
	}
	bad := p.call("nope/method", nil)
	if _, has := bad["error"]; !has {
		t.Fatalf("unknown method needs JSON-RPC error: %v", bad)
	}
}

// TestLiveMCPMultiPageTask is the Phase 5 binding gate as a Go test:
// an agent drives a live multi-page task (index, follow link, fill,
// assert, screenshot) using ONLY MCP tools over stdio. The site is
// local (httptest), so the task needs Chrome but no outside network.
func TestLiveMCPMultiPageTask(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: live task runs in full mode")
	}
	if !chromePresent() {
		t.Skip("no chrome install found")
	}
	bin := buildMCP(t)
	tbHome := t.TempDir()
	env := append(os.Environ(), "TB_HOME="+tbHome)
	p := startMCP(t, bin, env)
	srv := taskSite()
	defer srv.Close()

	p.call("initialize", map[string]interface{}{})
	open := mustOK(t, p.tool("session_open", map[string]interface{}{"url": srv.URL}), "session_open")
	if open["session"] != "s1" {
		t.Fatalf("first handle = %v, want s1", open["session"])
	}
	list := mustOK(t, p.tool("session_list", nil), "session_list")
	if list["count"] != float64(1) || list["active"] != "s1" {
		t.Fatalf("session_list: %v", list)
	}
	// Search the index snapshot for the form link and follow it: the
	// multi-page hop every agent task needs.
	snap := mustOK(t, p.tool("snapshot", nil), "snapshot")
	link := refByName(t, snap, "link", "Open form")
	click := mustOK(t, p.tool("click", map[string]interface{}{"ref": link}), "click link")
	if click["url"] != srv.URL+"/form" {
		t.Fatalf("after click url = %v, want %s/form", click["url"], srv.URL)
	}
	wait := mustOK(t, p.tool("wait_for", map[string]interface{}{
		"cond": "title", "title": "Form", "timeout": 8.0,
	}), "wait_for title")
	if wait["cond"] != "title" {
		t.Fatalf("wait_for: %v", wait)
	}
	form := mustOK(t, p.tool("snapshot", nil), "form snapshot")
	box := refByName(t, form, "textbox", "Name")
	typed := mustOK(t, p.tool("type", map[string]interface{}{
		"ref": box, "text": "Ada Lovelace", "clear": true,
	}), "type")
	if typed["typed"] != box {
		t.Fatalf("type: %v", typed)
	}
	assert := mustOK(t, p.tool("assert", map[string]interface{}{
		"cond": "value", "ref": box, "value": "Ada Lovelace",
	}), "assert value")
	if assert["cond"] != "value" {
		t.Fatalf("assert: %v", assert)
	}
	eval := mustOK(t, p.tool("evaluate", map[string]interface{}{"expr": "document.title"}), "evaluate")
	if !strings.Contains(eval["value"].(string), "Form") {
		t.Fatalf("evaluate title: %v", eval)
	}
	shotDir := t.TempDir()
	shot := mustOK(t, p.tool("screenshot", map[string]interface{}{
		"kind": "viewport", "out": filepath.Join(shotDir, "form.png"),
	}), "screenshot")
	sha, _ := shot["sha256"].(string)
	if sha == "" {
		t.Fatalf("screenshot has no sha: %v", shot)
	}
	cons := mustOK(t, p.tool("console", nil), "console")
	if cons["count"] == nil {
		t.Fatalf("console: %v", cons)
	}
	// History stack round-trip through the agent surface.
	back := mustOK(t, p.tool("back", nil), "back")
	if back["moved"] != true {
		t.Fatalf("back: %v", back)
	}
	fwd := mustOK(t, p.tool("forward", nil), "forward")
	if fwd["moved"] != true {
		t.Fatalf("forward: %v", fwd)
	}
	// A failing assert returns assert_failed, not a crash.
	bad := p.tool("assert", map[string]interface{}{"cond": "text", "text": "no such text anywhere"})
	if bad["success"] != false || bad["code"] != "assert_failed" {
		t.Fatalf("bad assert: %v", bad)
	}
	close := mustOK(t, p.tool("session_close", map[string]interface{}{"handle": "s1"}), "session_close")
	if close["closed"] != "s1" {
		t.Fatalf("session_close: %v", close)
	}
	after := mustOK(t, p.tool("session_list", nil), "session_list after close")
	if after["count"] != float64(0) {
		t.Fatalf("sessions remain: %v", after)
	}
}

// TestLiveTraceCap proves the gated trace tool executes real CDP
// tracing: seconds of renderer events land in a JSON file.
func TestLiveTraceCap(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: live trace runs in full mode")
	}
	if !chromePresent() {
		t.Skip("no chrome install found")
	}
	bin := buildMCP(t)
	tbHome := t.TempDir()
	env := append(os.Environ(), "TB_HOME="+tbHome)
	p := startMCP(t, bin, env, "--caps", "trace,pdf")
	srv := taskSite()
	defer srv.Close()

	p.call("initialize", map[string]interface{}{})
	list := p.call("tools/list", map[string]interface{}{})
	lres, _ := list["result"].(map[string]interface{})
	tools, _ := lres["tools"].([]interface{})
	names := map[string]bool{}
	for _, tl := range tools {
		m, _ := tl.(map[string]interface{})
		names[m["name"].(string)] = true
	}
	if !names["pdf"] || !names["trace"] {
		t.Fatal("pdf and trace must list with --caps trace,pdf")
	}
	mustOK(t, p.tool("session_open", map[string]interface{}{"url": srv.URL}), "session_open")
	dir := t.TempDir()
	tr := mustOK(t, p.tool("trace", map[string]interface{}{
		"seconds": 1.0, "out": filepath.Join(dir, "run.json"),
	}), "trace")
	events, _ := tr["events"].(float64)
	if events == 0 {
		t.Fatalf("trace captured no events: %v", tr)
	}
	pdf := mustOK(t, p.tool("pdf", map[string]interface{}{"out": filepath.Join(dir, "page.pdf")}), "pdf")
	if pdf["bytes"] == float64(0) {
		t.Fatalf("empty pdf: %v", pdf)
	}
}
