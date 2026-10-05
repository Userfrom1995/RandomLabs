// Command tb is the terminal browser frontend: probe, compose frames,
// paint through the layered graphics stack, and run the app shell.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
	"randomlabs/terminal-browser/internal/tui"
)

func main() {
	fixture := flag.String("fixture", "", "render one fixture page offscreen (home, article, table) and exit")
	urlFlag := flag.String("url", "", "fetch one live http(s) page offscreen and exit")
	profile := flag.String("profile", "default", "browser profile for live fetch")
	lite := flag.Bool("lite", false, "block images, media, and trackers on live fetch")
	tierFlag := flag.String("tier", "", "force graphics tier (kitty, sixel, iterm2, block)")
	dumpStats := flag.Bool("dump-stats", false, "print per-frame byte stats for the fixture render")
	flag.Parse()

	caps := term.Probe()
	var tierOverride *term.GraphicsTier
	if *tierFlag != "" {
		t, ok := term.ParseTier(*tierFlag)
		if !ok {
			fmt.Fprintln(os.Stderr, "unknown tier: "+*tierFlag)
			os.Exit(2)
		}
		tierOverride = &t
		term.ApplyTierOverride(&caps, t)
	}

	if *fixture != "" {
		runFixture(os.Stdout, caps, *fixture, *dumpStats)
		return
	}
	if *urlFlag != "" {
		runURL(os.Stdout, caps, *urlFlag, *profile, *lite, *dumpStats)
		return
	}
	if err := runInteractive(caps, tierOverride, *profile); err != nil {
		fmt.Fprintln(os.Stderr, "tb: "+err.Error())
		os.Exit(1)
	}
}

// runURL fetches one live page through the engine, then paints it
// through the same frame pipeline as fixtures. Offline failures print
// the honest error page with a non-zero exit, never a faked success.
func runURL(w io.Writer, caps term.Capabilities, target, profile string, lite, dump bool) {
	res := engine.Navigate(target, engine.Options{Profile: profile, Lite: lite, Width: caps.Width})
	page := res.ToDemoPage()
	if res.Offline {
		paintPage(w, caps, page, dump)
		fmt.Fprintf(os.Stderr, "offline: %s\n", res.Warning)
		os.Exit(1)
	}
	paintPage(w, caps, page, dump)
	if dump {
		fmt.Fprintf(os.Stderr, "live=%s title=%q rows=%d cold=%s js_nodes=%d chrome=%s\n",
			res.URL, res.Title, len(page.Rows), res.Cold().Round(time.Millisecond), res.JS.Nodes, res.Version)
	}
}

// runFixture renders one fixture page through the full pipeline:
// frame, dirty rows, tier painter, byte counting. Used by demos,
// the agent CLI twin, and the success-gate harness.
func runFixture(w io.Writer, caps term.Capabilities, name string, dump bool) {
	addr := name
	if name != "not-found" && !strings.Contains(name, "://") {
		addr = "fixture://" + name
	}
	page := demo.Lookup(addr)
	paintPage(w, caps, page, dump)
}

// paintPage renders any demo page through the full pipeline. The page
// is placed directly on the tab: no second lookup or refetch happens
// here, so live pages paint exactly what the engine returned.
func paintPage(w io.Writer, caps term.Capabilities, page demo.Page, dump bool) {
	frame := term.NewFrame(caps.Width, caps.Height)
	shell := tui.NewShell()
	cur := shell.Current()
	cur.Address, cur.Title, cur.Page, cur.Scroll = page.Address, page.Title, page, 0
	shell.Render(frame)

	counter := &term.Counter{W: w}
	comp := term.NewCompositor(caps)
	comp.OpenFrame(counter)

	block := gfx.NewBlock()
	prev := (*term.Frame)(nil)
	n := block.PaintCells(counter, frame, prev, caps)

	var surf *gfx.Surface
	if hs := demo.HeroSurface(page, len(page.Rows)+tui.ChromeRows+1, frame.W); hs != nil {
		hs.CellY = tui.ChromeRows + len(page.Rows) + 1
		if hs.CellY+hs.CellH < frame.H-1 {
			surf = hs
		}
	}
	painters := map[string]gfx.Painter{
		"kitty":  gfx.NewKitty(),
		"sixel":  gfx.Sixel{},
		"iterm2": gfx.NewIterm2(),
		"block":  block,
	}
	chain := gfx.Select(caps, painters)
	if surf != nil && len(chain) > 0 {
		if _, err := gfx.PaintChain(counter, chain, *surf, caps); err != nil {
			fmt.Fprintln(os.Stderr, "paint: "+err.Error())
		}
	}
	comp.CloseFrame(counter)
	comp.Commit(frame)

	frame.Bytes = counter.N
	stats := term.Describe(frame, caps)
	stats.Dirty = frame.H
	if dump {
		fmt.Fprintf(os.Stderr, "fixture=%s tier=%s bytes=%d rows=%d cells=%d hero=%v\n",
			page.Address, stats.Tier, stats.Bytes, stats.Rows, n, surf != nil)
	}
}

// runInteractive owns the terminal until quit. The --tier override, if
// any, is re-applied after the cache probe so interactive mode cannot
// discard it. The --profile flag selects the session profile and the
// persisted stack restores into the first tab.
func runInteractive(caps term.Capabilities, tierOverride *term.GraphicsTier, profile string) error {
	if !isTTY() {
		return fmt.Errorf("no terminal attached; use --fixture to render offscreen")
	}
	restore, err := term.EnterRaw()
	if err != nil {
		return fmt.Errorf("raw mode: %w", err)
	}
	defer restore()

	out := os.Stdout
	tui.EnterAlt(out, caps)
	defer tui.ExitAlt(out, caps)

	cache := term.NewCache()
	caps = cache.Get()
	if tierOverride != nil {
		term.ApplyTierOverride(&caps, *tierOverride)
	}
	shell := tui.NewShell()
	defer shell.CloseLive()
	if strings.TrimSpace(profile) != "" && profile != "default" {
		safe, err := engine.SanitizeProfile(profile)
		if err != nil {
			return fmt.Errorf("profile: %w", err)
		}
		shell.Profile = safe
		found := false
		for _, p := range shell.Profiles {
			if p == safe {
				found = true
				break
			}
		}
		if !found {
			shell.Profiles = append(shell.Profiles, safe)
		}
	}
	shell.RestoreSession()
	comp := term.NewCompositor(caps)
	gov := term.NewGovernor(caps.Tier)
	block := gfx.NewBlock()
	painters := map[string]gfx.Painter{
		"kitty":  gfx.NewKitty(),
		"sixel":  gfx.Sixel{},
		"iterm2": gfx.NewIterm2(),
		"block":  block,
	}

	frame := term.NewFrame(caps.Width, caps.Height)
	frame.MarkAllDirty()
	var prev *term.Frame

	events := make(chan []byte, 32)
	done := make(chan struct{})
	defer close(done)
	go readLoop(events, done)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, sigWinch())
	defer signal.Stop(sig)

	running := true
	for running {
		select {
		case chunk := <-events:
			for _, ev := range term.Decode(chunk) {
				if !shell.Handle(ev) {
					running = false
				}
			}
		case <-sig:
			caps = cache.MarkResized()
			comp = term.NewCompositor(caps)
			frame = term.NewFrame(caps.Width, caps.Height)
			frame.MarkAllDirty()
			prev = nil
		default:
		}

		start := time.Now()
		w, h := liveSize(caps)
		if w != frame.W || h != frame.H {
			frame = term.NewFrame(w, h)
			frame.MarkAllDirty()
			prev = nil
		}
		shell.Render(frame)

		counter := &term.Counter{W: out}
		comp.OpenFrame(counter)
		block.PaintCells(counter, frame, prev, caps)
		if hs := demo.HeroSurface(shell.Current().Page, tui.ChromeRows+len(shell.Current().Page.Rows)+1, frame.W); hs != nil {
			hs.CellY = tui.ChromeRows + len(shell.Current().Page.Rows) + 1
			if hs.CellY+hs.CellH < frame.H-1 {
				chain := gfx.Select(caps, painters)
				_, _ = gfx.PaintChain(counter, chain, *hs, caps)
			}
		}
		comp.CloseFrame(counter)
		frame.Bytes = counter.N
		cp := term.NewFrame(frame.W, frame.H)
		copy(cp.Cells, frame.Cells)
		prev = cp
		comp.Commit(frame)
		gov.Observe(time.Since(start))
		gov.Wait()

		select {
		case chunk := <-events:
			for _, ev := range term.Decode(chunk) {
				if !shell.Handle(ev) {
					running = false
				}
			}
		default:
		}
	}
	return nil
}

func isTTY() bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}
