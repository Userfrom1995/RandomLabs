// Command tb-agent is the agent CLI twin of tb: every command emits the
// JSON envelope {success, data, warning?, code?} shared with the MCP
// control plane. Commands cover probe, fixture rendering, live fetch,
// and the full session surface (cookies, history, bookmarks, the
// back/forward stack, portable state files) with the same JSON the
// interactive shell persists.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
	"randomlabs/terminal-browser/internal/tui"
)

// Envelope is the byte-comparable result wrapper shared with MCP tools.
type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Warning string      `json:"warning,omitempty"`
	Code    string      `json:"code,omitempty"`
}

func emit(ok bool, data interface{}, warning, code string) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(Envelope{Success: ok, Data: data, Warning: warning, Code: code})
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: tb-agent <probe|render|fetch|cookies|cookies-set|cookies-clear|history|history-clear|bookmark-add|bookmarks|bookmark-remove|session|session-back|session-forward|session-reload|state-save|state-load> [flags]")
		os.Exit(2)
	}
	switch os.Args[1] {
	case "probe":
		probeCmd(os.Args[2:])
	case "render":
		renderCmd(os.Args[2:])
	case "fetch":
		fetchCmd(os.Args[2:])
	case "cookies":
		cookiesCmd(os.Args[2:])
	case "cookies-set":
		cookiesSetCmd(os.Args[2:])
	case "cookies-clear":
		cookiesClearCmd(os.Args[2:])
	case "history":
		historyCmd(os.Args[2:])
	case "history-clear":
		historyClearCmd(os.Args[2:])
	case "bookmark-add":
		bookmarkAddCmd(os.Args[2:])
	case "bookmarks":
		bookmarksCmd(os.Args[2:])
	case "bookmark-remove":
		bookmarkRemoveCmd(os.Args[2:])
	case "session":
		sessionCmd(os.Args[2:])
	case "session-back":
		sessionBackCmd(os.Args[2:])
	case "session-forward":
		sessionForwardCmd(os.Args[2:])
	case "session-reload":
		sessionReloadCmd(os.Args[2:])
	case "state-save":
		stateSaveCmd(os.Args[2:])
	case "state-load":
		stateLoadCmd(os.Args[2:])
	default:
		fmt.Fprintln(os.Stderr, "unknown command: "+os.Args[1])
		os.Exit(2)
	}
}

func probeCmd(args []string) {
	fs := flag.NewFlagSet("probe", flag.ExitOnError)
	_ = fs.Parse(args)
	caps := term.Probe()
	emit(true, caps, "", "")
}

func renderCmd(args []string) {
	fs := flag.NewFlagSet("render", flag.ExitOnError)
	fixture := fs.String("fixture", "home", "fixture page to render")
	tierFlag := fs.String("graphics-tier", "", "force graphics tier")
	_ = fs.Parse(args)

	caps := term.Probe()
	if *tierFlag != "" {
		t, ok := term.ParseTier(*tierFlag)
		if !ok {
			emit(false, nil, "", "bad_tier")
			os.Exit(1)
		}
		term.ApplyTierOverride(&caps, t)
	}

	addr := *fixture
	if *fixture != "not-found" && !strings.Contains(*fixture, "://") {
		addr = "fixture://" + *fixture
	}
	page := demo.Lookup(addr)
	frame := term.NewFrame(caps.Width, caps.Height)
	shell := tui.NewShell()
	shell.Record = false
	shell.Open(page.Address)
	rows := shell.Render(frame)

	var buf bytes.Buffer
	counter := &term.Counter{W: &buf}
	comp := term.NewCompositor(caps)
	comp.OpenFrame(counter)
	block := gfx.NewBlock()
	cells := block.PaintCells(counter, frame, nil, caps)
	painters := map[string]gfx.Painter{"block": block, "sixel": gfx.Sixel{}, "iterm2": gfx.NewIterm2(), "kitty": gfx.NewKitty()}
	chain := gfx.Select(caps, painters)
	painter := "block"
	if hs := demo.HeroSurface(page, len(page.Rows)+tui.ChromeRows+1, frame.W); hs != nil {
		hs.CellY = tui.ChromeRows + len(page.Rows) + 1
		if hs.CellY+hs.CellH < frame.H-1 && len(chain) > 0 {
			if name, err := gfx.PaintChain(counter, chain, *hs, caps); err == nil && name != "" {
				painter = name
			} else if len(chain) > 0 {
				painter = chain[0].Name()
			}
		} else if len(chain) > 0 {
			painter = chain[0].Name()
		}
	} else if len(chain) > 0 {
		painter = chain[0].Name()
	}
	comp.CloseFrame(counter)
	comp.Commit(frame)

	emit(true, map[string]interface{}{
		"address": page.Address,
		"title":   page.Title,
		"rows":    rows,
		"cells":   cells,
		"bytes":   counter.N,
		"tier":    caps.Tier.String(),
		"painter": painter,
	}, "", "")
}

// fetchCmd loads one live http(s) page through the engine and emits the
// shared envelope. Offline failures emit success=false with the
// fail-closed code, never a faked snapshot.
func fetchCmd(args []string) {
	fs := flag.NewFlagSet("fetch", flag.ExitOnError)
	urlFlag := fs.String("url", "", "live http(s) page to fetch (required)")
	profile := fs.String("profile", "default", "browser profile")
	lite := fs.Bool("lite", false, "block images, media, and trackers")
	width := fs.Int("width", 80, "grid width for the text render")
	_ = fs.Parse(args)
	if strings.TrimSpace(*urlFlag) == "" {
		emit(false, nil, "missing required --url", "bad_url")
		os.Exit(1)
	}
	res := engine.Navigate(*urlFlag, engine.Options{Profile: *profile, Lite: *lite, Width: *width})
	lines := make([]string, 0, len(res.Rows))
	for _, r := range res.Rows {
		lines = append(lines, r.Text)
	}
	// Ship every row: truncating lines while emitting the full RowCount
	// breaks the rows == len(lines) contract on pages over the cap
	// (Wikipedia and SPA probes exceed 200 rows).
	emit(!res.Offline, map[string]interface{}{
		"address":        res.URL,
		"title":          res.Title,
		"rows":           res.RowCount,
		"lines":          lines,
		"lines_returned": len(lines),
		"cold_ms":        res.ColdMs,
		"total_ms":       res.TotalMs,
		"jar_applied":    res.JarApplied,
		"jar_synced":     res.JarSynced,
		"js_executed":    res.JS.Executed,
		"js_nodes":       res.JS.Nodes,
		"js_ready":       res.JS.Ready,
		"chrome_version": res.Version,
	}, res.Warning, res.Code)
	if res.Offline {
		os.Exit(1)
	}
}

// profileFlag registers the shared --profile flag on fs.
func profileFlag(fs *flag.FlagSet) *string {
	return fs.String("profile", "default", "browser profile")
}

// failClosed emits success=false with a machine code and exits 1.
// Every session command fails this way: no partial JSON, no zero exit
// on error.
func failClosed(warning, code string) {
	emit(false, nil, warning, code)
	os.Exit(1)
}

// resolveProfile gates --profile once for every session command.
// SanitizeProfile rejects traversal and shell metacharacters; without
// this gate the store layer would silently map invalid names to
// "default" while the envelope still reported the requested name.
// Fail-closed with bad_profile keeps the envelope honest, consistent
// with Launch and tb --profile.
func resolveProfile(profile string) string {
	safe, err := engine.SanitizeProfile(profile)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	return safe
}

// cookiesCmd lists the persisted jar for a profile.
func cookiesCmd(args []string) {
	fs := flag.NewFlagSet("cookies", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	jar, err := engine.LoadJar(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "cookies": jar, "count": len(jar)}, "", "")
}

// cookiesSetCmd inserts or replaces one jar row. The row persists
// immediately and installs into the next live navigation, which is
// how agents resume authenticated sessions across restarts.
func cookiesSetCmd(args []string) {
	fs := flag.NewFlagSet("cookies-set", flag.ExitOnError)
	profile := profileFlag(fs)
	name := fs.String("name", "", "cookie name (required)")
	value := fs.String("value", "", "cookie value")
	domain := fs.String("domain", "", "cookie domain")
	path := fs.String("path", "/", "cookie path")
	expires := fs.Int64("expires", 0, "expiry as unix seconds (0 = session)")
	secure := fs.Bool("secure", false, "secure flag")
	httpOnly := fs.Bool("httponly", false, "httpOnly flag")
	sameSite := fs.String("samesite", "", "Strict, Lax, or None")
	_ = fs.Parse(args)
	if strings.TrimSpace(*name) == "" {
		failClosed("missing required --name", "bad_cookie")
	}
	p := resolveProfile(*profile)
	jar, err := engine.SetJarCookie(p, engine.Cookie{
		Name: *name, Value: *value, Domain: *domain, Path: *path,
		Expires: *expires, Secure: *secure, HTTPOnly: *httpOnly, SameSite: *sameSite,
	})
	if err != nil {
		failClosed(err.Error(), "bad_cookie")
	}
	emit(true, map[string]interface{}{"profile": p, "cookies": jar, "count": len(jar)}, "", "")
}

// cookiesClearCmd drops the whole persisted jar.
func cookiesClearCmd(args []string) {
	fs := flag.NewFlagSet("cookies-clear", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	n, err := engine.ClearJar(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "cleared": n}, "", "")
}

// historyCmd queries visits newest-first with optional substring
// filter and limit.
func historyCmd(args []string) {
	fs := flag.NewFlagSet("history", flag.ExitOnError)
	profile := profileFlag(fs)
	query := fs.String("query", "", "substring filter over URL and title")
	limit := fs.Int("limit", 50, "max entries (newest first)")
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	visits, err := engine.QueryHistory(p, *query, *limit)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "visits": visits, "count": len(visits)}, "", "")
}

// historyClearCmd drops every visit for the profile.
func historyClearCmd(args []string) {
	fs := flag.NewFlagSet("history-clear", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	n, err := engine.ClearHistory(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "cleared": n}, "", "")
}

// bookmarkAddCmd saves a page; re-adding updates its title.
func bookmarkAddCmd(args []string) {
	fs := flag.NewFlagSet("bookmark-add", flag.ExitOnError)
	profile := profileFlag(fs)
	urlFlag := fs.String("url", "", "page URL (required)")
	title := fs.String("title", "", "page title")
	_ = fs.Parse(args)
	if strings.TrimSpace(*urlFlag) == "" {
		failClosed("missing required --url", "bad_url")
	}
	p := resolveProfile(*profile)
	if err := engine.AddBookmark(p, *urlFlag, *title); err != nil {
		failClosed(err.Error(), "bad_url")
	}
	marks, err := engine.ListBookmarks(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "bookmarks": marks, "count": len(marks)}, "", "")
}

// bookmarksCmd lists bookmarks in creation order.
func bookmarksCmd(args []string) {
	fs := flag.NewFlagSet("bookmarks", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	marks, err := engine.ListBookmarks(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "bookmarks": marks, "count": len(marks)}, "", "")
}

// bookmarkRemoveCmd deletes one bookmark by URL.
func bookmarkRemoveCmd(args []string) {
	fs := flag.NewFlagSet("bookmark-remove", flag.ExitOnError)
	profile := profileFlag(fs)
	urlFlag := fs.String("url", "", "page URL (required)")
	_ = fs.Parse(args)
	if strings.TrimSpace(*urlFlag) == "" {
		failClosed("missing required --url", "bad_url")
	}
	p := resolveProfile(*profile)
	found, err := engine.RemoveBookmark(p, *urlFlag)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	if !found {
		failClosed("bookmark not found: "+*urlFlag, "not_found")
	}
	emit(true, map[string]interface{}{"profile": p, "removed": *urlFlag}, "", "")
}

// sessionCmd reports the persisted back/forward stack: entry count,
// current index, and the entry a restart would restore.
func sessionCmd(args []string) {
	fs := flag.NewFlagSet("session", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	st, err := engine.LoadStack(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	var current interface{}
	if st.Index >= 0 && st.Index < len(st.Entries) {
		current = st.Entries[st.Index]
	}
	emit(true, map[string]interface{}{
		"profile": p, "entries": st.Entries, "count": len(st.Entries),
		"index": st.Index, "current": current,
	}, "", "")
}

// sessionMove runs Back or Forward and emits the entry to load. ok=false
// (oldest/newest edge) is success with a null target, not an error:
// the edge is a normal boundary, and the exit code must not punish it.
func sessionMove(profile string, back bool) {
	profile = resolveProfile(profile)
	if back {
		v, ok, err := engine.Back(profile)
		if err != nil {
			failClosed(err.Error(), "bad_profile")
		}
		emit(true, map[string]interface{}{"profile": profile, "moved": ok, "target": visitOrNull(v, ok)}, "", "")
		return
	}
	v, ok, err := engine.Forward(profile)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": profile, "moved": ok, "target": visitOrNull(v, ok)}, "", "")
}

func visitOrNull(v engine.Visit, ok bool) interface{} {
	if !ok {
		return nil
	}
	return v
}

// sessionBackCmd steps the stack back.
func sessionBackCmd(args []string) {
	fs := flag.NewFlagSet("session-back", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	sessionMove(*profile, true)
}

// sessionForwardCmd steps the stack forward.
func sessionForwardCmd(args []string) {
	fs := flag.NewFlagSet("session-forward", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	sessionMove(*profile, false)
}

// sessionReloadCmd reports the current entry without moving the stack.
func sessionReloadCmd(args []string) {
	fs := flag.NewFlagSet("session-reload", flag.ExitOnError)
	profile := profileFlag(fs)
	_ = fs.Parse(args)
	p := resolveProfile(*profile)
	v, ok, err := engine.CurrentStackEntry(p)
	if err != nil {
		failClosed(err.Error(), "bad_profile")
	}
	emit(true, map[string]interface{}{"profile": p, "restored": ok, "target": visitOrNull(v, ok)}, "", "")
}

// stateSaveCmd exports cookies, bookmarks, and the stack to a file.
func stateSaveCmd(args []string) {
	fs := flag.NewFlagSet("state-save", flag.ExitOnError)
	profile := profileFlag(fs)
	file := fs.String("file", "", "destination path (required)")
	_ = fs.Parse(args)
	if strings.TrimSpace(*file) == "" {
		failClosed("missing required --file", "bad_path")
	}
	p := resolveProfile(*profile)
	st, err := engine.SaveStateFile(p, *file)
	if err != nil {
		failClosed(err.Error(), "bad_path")
	}
	emit(true, map[string]interface{}{
		"profile": p, "file": *file, "cookies": len(st.Cookies),
		"bookmarks": len(st.Marks), "entries": len(st.Stack.Entries),
	}, "", "")
}

// stateLoadCmd imports a snapshot file over the profile.
func stateLoadCmd(args []string) {
	fs := flag.NewFlagSet("state-load", flag.ExitOnError)
	profile := profileFlag(fs)
	file := fs.String("file", "", "snapshot path (required)")
	_ = fs.Parse(args)
	if strings.TrimSpace(*file) == "" {
		failClosed("missing required --file", "bad_path")
	}
	p := resolveProfile(*profile)
	cookies, marks, entries, err := engine.LoadStateFile(p, *file)
	if err != nil {
		failClosed(err.Error(), "bad_path")
	}
	emit(true, map[string]interface{}{
		"profile": p, "file": *file, "cookies": cookies,
		"bookmarks": marks, "entries": entries,
	}, "", "")
}
