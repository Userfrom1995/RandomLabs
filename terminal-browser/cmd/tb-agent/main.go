// Command tb-agent is the agent CLI twin of tb: every command emits the
// JSON envelope {success, data, warning?, code?} shared with the MCP
// control plane. Phase scope covers probe, fixture rendering, and live
// fetch; the matrix grows with later phases.
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
		fmt.Fprintln(os.Stderr, "usage: tb-agent <probe|render|fetch> [flags]")
		os.Exit(2)
	}
	switch os.Args[1] {
	case "probe":
		probeCmd(os.Args[2:])
	case "render":
		renderCmd(os.Args[2:])
	case "fetch":
		fetchCmd(os.Args[2:])
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
		"address":       res.URL,
		"title":         res.Title,
		"rows":          res.RowCount,
		"lines":         lines,
		"lines_returned": len(lines),
		"cold_ms":       res.ColdMs,
		"js_executed":   res.JS.Executed,
		"js_nodes":      res.JS.Nodes,
		"js_ready":      res.JS.Ready,
		"chrome_version": res.Version,
	}, res.Warning, res.Code)
	if res.Offline {
		os.Exit(1)
	}
}
