// Command tb is the terminal browser frontend: probe, compose frames,
// paint through the layered graphics stack, and run the app shell.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"time"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
	"randomlabs/terminal-browser/internal/tui"
)

func main() {
	fixture := flag.String("fixture", "", "render one fixture page offscreen (home, article, table) and exit")
	tierFlag := flag.String("tier", "", "force graphics tier (kitty, sixel, iterm2, block)")
	dumpStats := flag.Bool("dump-stats", false, "print per-frame byte stats for the fixture render")
	flag.Parse()

	caps := term.Probe()
	if *tierFlag != "" {
		t, ok := term.ParseTier(*tierFlag)
		if !ok {
			fmt.Fprintln(os.Stderr, "unknown tier: "+*tierFlag)
			os.Exit(2)
		}
		cache := term.NewCache()
		caps = cache.Get()
		caps.Tier = t
		caps.TierName = t.String()
		caps.ForcedBlock = false
		if t != term.TierBlock {
			caps.KittyGraphics = t == term.TierKitty
			caps.Sixel = t == term.TierSixel || t == term.TierKitty
			caps.Iterm2 = t == term.TierIterm2 || t == term.TierKitty
			caps.SyncOutput = t == term.TierKitty
		}
	}

	if *fixture != "" {
		runFixture(os.Stdout, caps, *fixture, *dumpStats)
		return
	}
	if err := runInteractive(caps); err != nil {
		fmt.Fprintln(os.Stderr, "tb: "+err.Error())
		os.Exit(1)
	}
}

// runFixture renders one fixture page through the full pipeline:
// frame, dirty rows, tier painter, byte counting. Used by demos,
// the agent CLI twin, and the success-gate harness.
func runFixture(w io.Writer, caps term.Capabilities, name string, dump bool) {
	page := demo.Lookup("fixture://" + name)
	if name == "not-found" || page.Name == "not-found" {
		page = demo.Lookup(name)
	}
	frame := term.NewFrame(caps.Width, caps.Height)
	shell := tui.NewShell()
	shell.Open(page.Address)
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
		if err := chain[0].Paint(counter, *surf, caps); err != nil {
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

// runInteractive owns the terminal until quit.
func runInteractive(caps term.Capabilities) error {
	if !isTTY() {
		return fmt.Errorf("no terminal attached; use --fixture to render offscreen")
	}
	out := os.Stdout
	tui.EnterAlt(out, caps)
	defer tui.ExitAlt(out, caps)

	cache := term.NewCache()
	caps = cache.Get()
	shell := tui.NewShell()
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
	go readLoop(events)

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
				if chain := gfx.Select(caps, painters); len(chain) > 0 {
					_ = chain[0].Paint(counter, *hs, caps)
				}
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
