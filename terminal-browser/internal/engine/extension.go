// Package engine extension surface: installed content-script
// extensions plus the page-exposed webmcp contract. Extensions ship as
// plain directories under the extensions root holding one
// manifest.json and any number of JavaScript content scripts. Content
// scripts run in a dedicated isolated world per extension (CDP
// Page.createIsolatedWorld on the main frame), so extension globals
// never collide with page globals or with other extensions; the DOM
// stays shared, which is exactly what page actions need. The browser
// auto-loads every installed extension at open and injects scripts
// lazily per navigation (execution contexts die on navigation, so the
// world is recreated when the URL changes under the browser).
//
// A content script publishes page actions by assigning
// window.__tbActions = {actionId: function(args){...}, ...} inside
// its world. The manifest declares which actions exist; triggering
// runs the named function with the caller-supplied JSON args and
// returns its JSON value. Pages can expose agent-callable tools by
// assigning window.__tbWebMCP = {tools: [{name, description}],
// call: function(name, args){...}}; the webmcp surface lists those
// tools and calls them. Both surfaces fail closed when the page or
// the extension does not cooperate: no facades, no stub tools.
package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// maxExtScriptBytes caps one content script: extensions are small
// page helpers, never bundles. Oversized files fail validation.
const maxExtScriptBytes = 256 << 10

// extIDRe allows only safe extension and action ids: lowercase
// alphanumerics plus dash and underscore, so ids embed safely into
// world names and generated JS.
var extIDRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

// Manifest is one extension's manifest.json: identity, the URL scope
// it runs on, the content scripts to inject, and the page actions it
// publishes. Run names the __tbActions function; empty Run defaults
// to the action id.
type Manifest struct {
	ID      string           `json:"id"`
	Name    string           `json:"name"`
	Version string           `json:"version"`
	Matches []string         `json:"matches"`
	Scripts []string         `json:"scripts"`
	Actions []ManifestAction `json:"actions"`
}

// ManifestAction is one triggerable page action.
type ManifestAction struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Run   string `json:"run"`
}

// LoadedExtension is one validated install: its manifest plus the
// directory the scripts load from.
type LoadedExtension struct {
	ID       string
	Manifest *Manifest
	Dir      string
}

// ExtAction is one available page action for the current URL:
// the extension id, the action id, and the human title the TUI
// palette shows.
type ExtAction struct {
	Extension string `json:"extension"`
	Action    string `json:"action"`
	Title     string `json:"title"`
}

// ListedExtension is the inventory row the list surface returns.
type ListedExtension struct {
	ID      string           `json:"id"`
	Name    string           `json:"name"`
	Version string           `json:"version"`
	Matches []string         `json:"matches"`
	Actions []ManifestAction `json:"actions"`
}

// WebMCPTool is one page-exposed tool from window.__tbWebMCP.
type WebMCPTool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ExtensionsRoot holds one subdirectory per installed extension.
// TB_HOME redirects it for tests and portable installs, exactly like
// every other store.
func ExtensionsRoot() string {
	return filepath.Join(BaseDir(), "extensions")
}

// LoadManifest reads and validates dir/manifest.json with strict
// field checking: unknown fields fail closed so typos never ship a
// half-understood manifest. Script paths must stay inside dir.
func LoadManifest(dir string) (*Manifest, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if err != nil {
		return nil, fmt.Errorf("read manifest: %w", err)
	}
	var m Manifest
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}
	if !extIDRe.MatchString(m.ID) {
		return nil, fmt.Errorf("bad extension id %q: want [a-z0-9_-], leading alphanumeric, max 64 chars", m.ID)
	}
	if strings.TrimSpace(m.Name) == "" || len(m.Name) > 128 {
		return nil, fmt.Errorf("bad extension name: want 1..128 chars")
	}
	if strings.TrimSpace(m.Version) == "" || len(m.Version) > 32 {
		return nil, fmt.Errorf("bad extension version: want 1..32 chars")
	}
	if len(m.Matches) == 0 {
		m.Matches = []string{"*"}
	}
	for _, pat := range m.Matches {
		if strings.TrimSpace(pat) == "" || len(pat) > 256 {
			return nil, fmt.Errorf("bad match pattern %q: want 1..256 chars", pat)
		}
	}
	if len(m.Scripts) == 0 {
		return nil, fmt.Errorf("extension %q declares no content scripts", m.ID)
	}
	for _, s := range m.Scripts {
		if strings.TrimSpace(s) == "" || filepath.IsAbs(s) || s != filepath.Clean(s) ||
			s == "." || strings.HasPrefix(s, "..") || strings.Contains(s, ".."+string(filepath.Separator)) {
			return nil, fmt.Errorf("bad script path %q: want a relative path inside the extension dir", s)
		}
		fi, err := os.Stat(filepath.Join(dir, s))
		if err != nil {
			return nil, fmt.Errorf("script %q: %w", s, err)
		}
		if fi.IsDir() {
			return nil, fmt.Errorf("script %q is a directory", s)
		}
		if fi.Size() > maxExtScriptBytes {
			return nil, fmt.Errorf("script %q is %d bytes, over the %d-byte cap", s, fi.Size(), maxExtScriptBytes)
		}
	}
	if len(m.Actions) == 0 {
		return nil, fmt.Errorf("extension %q declares no actions", m.ID)
	}
	seen := map[string]bool{}
	for i := range m.Actions {
		a := &m.Actions[i]
		if !extIDRe.MatchString(a.ID) {
			return nil, fmt.Errorf("bad action id %q: want [a-z0-9_-], leading alphanumeric, max 64 chars", a.ID)
		}
		if seen[a.ID] {
			return nil, fmt.Errorf("duplicate action id %q", a.ID)
		}
		seen[a.ID] = true
		if strings.TrimSpace(a.Title) == "" || len(a.Title) > 128 {
			return nil, fmt.Errorf("bad title for action %q: want 1..128 chars", a.ID)
		}
		if strings.TrimSpace(a.Run) == "" {
			a.Run = a.ID
		}
	}
	return &m, nil
}

// MatchesURL reports whether any pattern scopes url. "*" matches
// everything; any other pattern matches as a case-insensitive
// substring, so "example.com/form" scopes one section and
// "127.0.0.1" scopes local test sites.
func MatchesURL(patterns []string, url string) bool {
	for _, pat := range patterns {
		if pat == "*" {
			return true
		}
		if pat != "" && strings.Contains(strings.ToLower(url), strings.ToLower(pat)) {
			return true
		}
	}
	return false
}

// ListExtensions inventories the extensions root: every subdirectory
// holding a valid manifest loads, broken ones are skipped with a
// warning per directory instead of failing the whole set. A missing
// root is not an error: it means no extensions installed.
func ListExtensions() ([]LoadedExtension, []string) {
	root := ExtensionsRoot()
	ents, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, []string{"extensions root: " + err.Error()}
	}
	var out []LoadedExtension
	var warns []string
	for _, e := range ents {
		if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		dir := filepath.Join(root, e.Name())
		m, err := LoadManifest(dir)
		if err != nil {
			warns = append(warns, e.Name()+": "+err.Error())
			continue
		}
		out = append(out, LoadedExtension{ID: m.ID, Manifest: m, Dir: dir})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, warns
}

// extRuntime is one installed extension inside a browser: its files
// plus the isolated world of the current page (worlds die on
// navigation, so pageURL tracks what the world was built for).
type extRuntime struct {
	manifest *Manifest
	dir      string
	world    int64
	pageURL  string
}

// loadInstalled inventories the extensions root into the browser.
// Broken installs never fail the open: they land in the warning list
// the list surface reports.
func (b *Browser) loadInstalled() {
	list, warns := ListExtensions()
	b.extMu.Lock()
	defer b.extMu.Unlock()
	b.exts = map[string]*extRuntime{}
	for i := range list {
		m := list[i].Manifest
		b.exts[list[i].ID] = &extRuntime{manifest: m, dir: list[i].Dir}
	}
	b.extWarn = append([]string{}, warns...)
}

// ExtensionWarnings returns install-time warnings (broken manifests)
// recorded at open, oldest first.
func (b *Browser) ExtensionWarnings() []string {
	b.extMu.Lock()
	defer b.extMu.Unlock()
	return append([]string{}, b.extWarn...)
}

// jsStr quotes a Go string as a JavaScript string literal via JSON
// encoding, so page-defined names with exotic characters cannot break
// out of the generated expression.
func jsStr(s string) string {
	raw, err := json.Marshal(s)
	if err != nil {
		return `""`
	}
	return string(raw)
}

// mainFrameID returns the main frame id for isolated-world creation.
func (b *Browser) mainFrameID() (string, error) {
	raw, err := b.sess.Call("Page.getFrameTree", nil, actTimeout)
	if err != nil {
		return "", fmt.Errorf("frame tree: %w", err)
	}
	var tree struct {
		FrameTree struct {
			Frame struct {
				ID string `json:"id"`
			} `json:"frame"`
		} `json:"frameTree"`
	}
	if err := json.Unmarshal(raw, &tree); err != nil {
		return "", fmt.Errorf("decode frame tree: %w", err)
	}
	if tree.FrameTree.Frame.ID == "" {
		return "", fmt.Errorf("no main frame in frame tree")
	}
	return tree.FrameTree.Frame.ID, nil
}

// ensureWorld builds (or rebuilds after navigation) the isolated
// world for rt on the current page and injects every content script
// into it, then verifies each declared action exists. The caller
// holds extMu.
func (b *Browser) ensureWorld(rt *extRuntime, pageURL string) error {
	if rt.world != 0 && rt.pageURL == pageURL {
		return nil
	}
	frameID, err := b.mainFrameID()
	if err != nil {
		return err
	}
	raw, err := b.sess.Call("Page.createIsolatedWorld", map[string]interface{}{
		"frameId": frameID, "worldName": "tb_" + rt.manifest.ID,
	}, actTimeout)
	if err != nil {
		return fmt.Errorf("create isolated world: %w", err)
	}
	var world struct {
		ExecutionContextID int64 `json:"executionContextId"`
	}
	if err := json.Unmarshal(raw, &world); err != nil {
		return fmt.Errorf("decode isolated world: %w", err)
	}
	if world.ExecutionContextID == 0 {
		return fmt.Errorf("isolated world has no execution context")
	}
	for _, script := range rt.manifest.Scripts {
		body, err := os.ReadFile(filepath.Join(rt.dir, script))
		if err != nil {
			return fmt.Errorf("read script %q: %w", script, err)
		}
		if len(body) > maxExtScriptBytes {
			return fmt.Errorf("script %q grew past the %d-byte cap after install", script, maxExtScriptBytes)
		}
		tagged := string(body) + "\n//# sourceURL=tb-ext-" + rt.manifest.ID + "/" + script + "\n"
		if _, err := b.sess.EvaluateInContext(tagged, world.ExecutionContextID, false, actTimeout); err != nil {
			return fmt.Errorf("inject script %q: %w", script, err)
		}
	}
	defined, err := b.sess.EvaluateInContext(
		`(Object.keys(window.__tbActions || {}))`, world.ExecutionContextID, false, actTimeout)
	if err != nil {
		return fmt.Errorf("read published actions: %w", err)
	}
	var names []string
	if err := json.Unmarshal(defined, &names); err != nil {
		return fmt.Errorf("decode published actions: %w", err)
	}
	have := map[string]bool{}
	for _, n := range names {
		have[n] = true
	}
	for _, a := range rt.manifest.Actions {
		if !have[a.Run] {
			return fmt.Errorf("action %q: content scripts never defined __tbActions[%s]",
				a.ID, jsStr(a.Run))
		}
	}
	rt.world = world.ExecutionContextID
	rt.pageURL = pageURL
	return nil
}

// currentPageURL reads the browser URL under the browser lock.
func (b *Browser) currentPageURL() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.currentURL
}

// ExtensionList returns every installed extension plus the page
// actions in scope for the current URL, with install warnings.
// Worlds are ensured so the list reflects actions that actually
// exist; an injection failure surfaces as an error, not a silent
// empty list.
func (b *Browser) ExtensionList() ([]ListedExtension, []ExtAction, []string, error) {
	b.extMu.Lock()
	defer b.extMu.Unlock()
	pageURL := b.currentPageURL()
	ids := make([]string, 0, len(b.exts))
	for id := range b.exts {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	var listed []ListedExtension
	var acts []ExtAction
	for _, id := range ids {
		rt := b.exts[id]
		m := rt.manifest
		cp := *m
		cp.Actions = append([]ManifestAction{}, m.Actions...)
		cp.Matches = append([]string{}, m.Matches...)
		cp.Scripts = append([]string{}, m.Scripts...)
		listed = append(listed, ListedExtension{
			ID: id, Name: m.Name, Version: m.Version,
			Matches: cp.Matches, Actions: cp.Actions,
		})
		if !MatchesURL(m.Matches, pageURL) {
			continue
		}
		if err := b.ensureWorld(rt, pageURL); err != nil {
			return nil, nil, nil, fmt.Errorf("extension %q: %w", id, err)
		}
		for _, a := range m.Actions {
			acts = append(acts, ExtAction{Extension: id, Action: a.ID, Title: a.Title})
		}
	}
	if listed == nil {
		listed = []ListedExtension{}
	}
	if acts == nil {
		acts = []ExtAction{}
	}
	return listed, acts, append([]string{}, b.extWarn...), nil
}

// validArgsJSON normalizes caller args to a JSON object string:
// empty means {}, strings must parse as JSON, and structured values
// marshal back. Anything else fails closed before touching the page.
func validArgsJSON(v interface{}) (string, error) {
	if v == nil {
		return "{}", nil
	}
	if s, ok := v.(string); ok {
		if strings.TrimSpace(s) == "" {
			return "{}", nil
		}
		var probe interface{}
		if err := json.Unmarshal([]byte(s), &probe); err != nil {
			return "", fmt.Errorf("args is not valid JSON: %w", err)
		}
		return s, nil
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("encode args: %w", err)
	}
	return string(raw), nil
}

// TriggerExtension runs one page action in its isolated world with
// the caller args and returns the raw JSON value. Unknown extensions
// or actions fail closed with bad_step; runtime failures carry the
// classify code like every other act.
func (b *Browser) TriggerExtension(extID, actionID string, args interface{}) (json.RawMessage, error) {
	if strings.TrimSpace(extID) == "" || strings.TrimSpace(actionID) == "" {
		return nil, &RefError{Code: "bad_step", Message: "extension_trigger needs extension and action"}
	}
	argStr, err := validArgsJSON(args)
	if err != nil {
		return nil, &RefError{Code: "bad_step", Message: "extension_trigger: " + err.Error()}
	}
	b.extMu.Lock()
	defer b.extMu.Unlock()
	rt, ok := b.exts[extID]
	if !ok {
		return nil, &RefError{Code: "bad_step", Message: fmt.Sprintf("unknown extension %q", extID)}
	}
	var run string
	for _, a := range rt.manifest.Actions {
		if a.ID == actionID {
			run = a.Run
		}
	}
	if run == "" {
		return nil, &RefError{Code: "bad_step", Message: fmt.Sprintf("extension %q has no action %q", extID, actionID)}
	}
	pageURL := b.currentPageURL()
	if !MatchesURL(rt.manifest.Matches, pageURL) {
		return nil, &RefError{Code: "bad_step", Message: fmt.Sprintf("extension %q does not run on this page", extID)}
	}
	if err := b.ensureWorld(rt, pageURL); err != nil {
		return nil, fmt.Errorf("extension %q: %w", extID, err)
	}
	expr := `(function(){var a=(window.__tbActions||{})[` + jsStr(run) +
		`];if(typeof a!=="function"){throw new Error("action ` + run + ` missing")};return a(` + argStr + `)})()`
	val, err := b.sess.EvaluateInContext(expr, rt.world, true, actTimeout)
	if err != nil {
		return nil, fmt.Errorf("extension %q action %q: %w", extID, actionID, err)
	}
	return val, nil
}

// WebMCPList reads the page-exposed tool surface. A page without
// window.__tbWebMCP fails closed with a plain error (the agent sees
// act_failed with an actionable message), never an empty success.
func (b *Browser) WebMCPList() ([]WebMCPTool, error) {
	val, err := b.sess.Evaluate(`(function(){var m=window.__tbWebMCP;if(!m||!m.tools){return null};return m.tools.map(function(t){return {name:t.name||"",description:t.description||""}})})()`, false, actTimeout)
	if err != nil {
		return nil, fmt.Errorf("read webmcp surface: %w", err)
	}
	if string(bytes.TrimSpace(val)) == "null" || len(bytes.TrimSpace(val)) == 0 {
		return nil, fmt.Errorf("page exposes no webmcp surface (window.__tbWebMCP with tools/call is missing)")
	}
	var tools []WebMCPTool
	if err := json.Unmarshal(val, &tools); err != nil {
		return nil, fmt.Errorf("decode webmcp tools: %w", err)
	}
	kept := tools[:0]
	for _, t := range tools {
		if strings.TrimSpace(t.Name) == "" {
			continue
		}
		kept = append(kept, t)
	}
	if kept == nil {
		kept = []WebMCPTool{}
	}
	return kept, nil
}

// CallWebMCP invokes one page-exposed tool with JSON args and returns
// the raw JSON value. Async page handlers are awaited.
func (b *Browser) CallWebMCP(tool string, args interface{}) (json.RawMessage, error) {
	if strings.TrimSpace(tool) == "" {
		return nil, &RefError{Code: "bad_step", Message: "webmcp needs tool (empty lists the page surface)"}
	}
	argStr, err := validArgsJSON(args)
	if err != nil {
		return nil, &RefError{Code: "bad_step", Message: "webmcp: " + err.Error()}
	}
	expr := `(function(){var m=window.__tbWebMCP;if(!m||typeof m.call!=="function"){throw new Error("page exposes no webmcp surface")};return m.call(` + jsStr(tool) + `,` + argStr + `)})()`
	val, err := b.sess.Evaluate(expr, true, actTimeout)
	if err != nil {
		return nil, fmt.Errorf("webmcp %q: %w", tool, err)
	}
	return val, nil
}
