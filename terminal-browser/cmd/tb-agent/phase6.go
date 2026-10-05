// Extension and media CLI commands: installed-extension inventory
// plus manifest validation, and governor-paced media region sampling
// with bandwidth logging. Both emit the shared envelope; validation
// failures exit 1 before any browser launches.
package main

import (
	"bytes"
	"flag"
	"strings"

	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// extensionsCmd inventories installed extensions, validates one
// extension directory, or lists the page actions in scope for a live
// URL. The first two forms are hermetic; --url needs Chrome.
func extensionsCmd(args []string) {
	fs := flag.NewFlagSet("extensions", flag.ExitOnError)
	check := fs.String("check", "", "validate one extension directory")
	urlFlag := fs.String("url", "", "live page to scope listed actions to (opens a session, needs Chrome)")
	profile := profileFlag(fs)
	_ = fs.Parse(args)

	if strings.TrimSpace(*check) != "" {
		m, err := engine.LoadManifest(*check)
		if err != nil {
			failClosed(err.Error(), "bad_ext")
		}
		emit(true, map[string]interface{}{
			"dir": *check, "valid": true, "id": m.ID, "name": m.Name,
			"version": m.Version, "matches": m.Matches,
			"scripts": m.Scripts, "actions": m.Actions,
		}, "", "")
		return
	}

	inv, warns := engine.ListExtensions()
	if inv == nil {
		inv = []engine.LoadedExtension{}
	}
	if warns == nil {
		warns = []string{}
	}
	listed := make([]engine.ListedExtension, 0, len(inv))
	for _, e := range inv {
		m := e.Manifest
		listed = append(listed, engine.ListedExtension{
			ID: e.ID, Name: m.Name, Version: m.Version,
			Matches: append([]string{}, m.Matches...),
			Actions: append([]engine.ManifestAction{}, m.Actions...),
		})
	}
	data := map[string]interface{}{
		"extensions": listed, "warnings": warns, "count": len(listed),
	}
	if strings.TrimSpace(*urlFlag) != "" {
		p := resolveProfile(*profile)
		b, err := engine.Open(*urlFlag, engine.OpenOptions{Profile: p, Lite: false, Width: 100})
		if err != nil {
			failClosed(err.Error(), engine.CodeOf(err))
		}
		defer b.Close()
		_, acts, _, err := b.ExtensionList()
		if err != nil {
			failClosed(err.Error(), engine.CodeOf(err))
		}
		if acts == nil {
			acts = []engine.ExtAction{}
		}
		data["url"] = b.URL()
		data["actions"] = acts
		data["action_count"] = len(acts)
	}
	emit(true, data, "", "")
}

// mediaCmd samples one page media region on a governor-paced tick
// and logs the bandwidth ledger: painted frames, PTY bytes, skipped
// ticks, and measured fps. The animated path paints through a
// persistent Kitty transmitter (transmit-once plus placement, the
// real animation primitive); still mode repaints block stills at the
// still interval. Argument validation runs before any launch so bad
// flags fail closed without Chrome.
func mediaCmd(args []string) {
	fs := flag.NewFlagSet("media", flag.ExitOnError)
	urlFlag := fs.String("url", "", "live http(s) page to sample (required)")
	profile := profileFlag(fs)
	index := fs.Int("index", -1, "media element index from discovery order (-1 picks the largest video)")
	seconds := fs.Float64("seconds", 3, "watch length in seconds, clamped 1..30")
	animated := fs.Bool("animated", true, "sample at the animated-tier tick (Kitty); false paints stills")
	out := fs.String("out", "", "bandwidth log path (defaults to the media ledger)")
	_ = fs.Parse(args)

	if strings.TrimSpace(*urlFlag) == "" {
		failClosed("missing required --url", "bad_url")
	}
	if *index < -1 {
		failClosed("bad media index: want -1 (auto) or 0..N", "bad_step")
	}
	logPath := strings.TrimSpace(*out)
	if logPath == "" {
		logPath = engine.MediaLogPath()
	}
	p := resolveProfile(*profile)
	b, err := engine.Open(*urlFlag, engine.OpenOptions{Profile: p, Lite: false, Width: 100})
	if err != nil {
		code := engine.CodeOf(err)
		if code == "" {
			code = "no_chrome"
		}
		failClosed(err.Error(), code)
	}
	defer b.Close()

	els, err := b.MediaElements()
	if err != nil {
		failClosed(err.Error(), engine.CodeOf(err))
	}
	el, err := engine.PickMedia(els, *index)
	if err != nil {
		code := "bad_step"
		if strings.Contains(err.Error(), "no media elements") {
			code = "no_media"
		}
		failClosed(err.Error(), code)
	}

	var tier term.GraphicsTier
	tier = term.TierBlock
	if *animated {
		tier = term.TierKitty
	}
	kitty := gfx.NewKitty()
	block := gfx.NewBlock()
	var caps term.Capabilities
	paint := func(img gfx.Image, still bool) (string, int, error) {
		cw, ch := engine.MediaCells(el, 80, 24)
		surf := gfx.Surface{Img: img, CellX: 0, CellY: 2, CellW: cw, CellH: ch}
		var buf bytes.Buffer
		var name string
		if still {
			name, err = gfx.PaintChain(&buf, []gfx.Painter{block}, surf, caps)
		} else {
			name, err = gfx.PaintChain(&buf, []gfx.Painter{kitty}, surf, caps)
		}
		if err != nil {
			return "", 0, err
		}
		return name, buf.Len(), nil
	}
	rep, err := b.RunMediaWatch(el, *seconds, tier, paint)
	if err != nil {
		failClosed(err.Error(), engine.CodeOf(err))
	}
	rep.Log = logPath
	if err := engine.AppendMediaLog(logPath, rep); err != nil {
		failClosed(err.Error(), "bad_path")
	}
	emit(true, map[string]interface{}{
		"url": b.URL(), "element": rep.Element, "tag": rep.Tag,
		"frames": rep.Frames, "bytes": rep.Bytes, "skipped": rep.Skipped,
		"millis": rep.Millis, "fps": rep.FPS, "painter": rep.Painter,
		"log": rep.Log,
	}, "", "")
}
