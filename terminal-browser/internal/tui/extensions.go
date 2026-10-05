// Package tui extension palette and media watch: the human side of
// the Phase 6 surface. The extension palette lists the installed
// page actions in scope for the live URL (the same actions the agent
// triggers through extension_trigger) and fires them with the same
// settle semantics as ref clicks. The media watch samples the
// largest page video on a governor-paced tick in a background
// goroutine, paints frames through the real painter chain for
// bandwidth accounting, and exposes the latest surface for the tb
// loop to compose: Kitty tiers animate through transmit-once plus
// placement, every other tier holds stills.
package tui

import (
	"bytes"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// refreshExt reloads the page actions in scope for the live URL. With
// no extensions installed this costs nothing (no CDP round trips);
// otherwise worlds inject lazily per navigation inside ExtensionList.
func (s *Shell) refreshExt() {
	t := s.Current()
	s.ExtActions = nil
	s.ExtErr = ""
	s.ExtFocus, s.ExtTop = 0, 0
	if s.live == nil || !t.Live {
		return
	}
	_, acts, _, err := s.live.ExtensionList()
	if err != nil {
		s.ExtErr = firstLine(err.Error())
		return
	}
	s.ExtActions = acts
}

// clampExt keeps palette focus and paging inside the action list.
func (s *Shell) clampExt() {
	n := len(s.ExtActions)
	if n == 0 {
		s.ExtFocus, s.ExtTop = 0, 0
		return
	}
	if s.ExtFocus < 0 {
		s.ExtFocus = 0
	}
	if s.ExtFocus >= n {
		s.ExtFocus = n - 1
	}
	if s.ExtTop < 0 {
		s.ExtTop = 0
	}
	if s.ExtTop > s.ExtFocus {
		s.ExtTop = s.ExtFocus
	}
	if s.ExtTop+1 < s.ExtFocus {
		s.ExtTop = s.ExtFocus - 1
	}
	maxTop := n - 1
	if s.ExtTop > maxTop {
		s.ExtTop = maxTop
	}
}

// focusedExt names the highlighted palette action, if any.
func (s *Shell) focusedExt() (string, string, bool) {
	if len(s.ExtActions) == 0 {
		return "", "", false
	}
	s.clampExt()
	a := s.ExtActions[s.ExtFocus]
	return a.Extension, a.Action, true
}

// extMove steps palette focus, announcing position like the drawer.
func (s *Shell) extMove(d int) {
	s.ExtFocus += d
	s.clampExt()
	if ext, action, ok := s.focusedExt(); ok {
		s.Message = "Extension " + ext + "." + action +
			" (" + itoa(s.ExtFocus+1) + "/" + itoa(len(s.ExtActions)) + ")."
	}
}

// drawExt paints the 2-row extension palette above the status line:
// a bordered box with the title (or the injection error) plus the
// visible action window with the `>` focus marker. Pure overlay: the
// content rows underneath are never modified.
func (s *Shell) drawExt(f *term.Frame) {
	top := f.H - 5
	if top < ChromeRows+1 {
		return
	}
	w := f.W - 4
	if w < 20 {
		w = f.W
	}
	x0 := 2
	if x0+w > f.W {
		w = f.W - x0
	}
	if w < 10 {
		return
	}
	title := " extensions (Enter runs, Esc closes)"
	if s.ExtErr != "" {
		title = " extensions ERROR: " + s.ExtErr
	}
	border := "+" + strings.Repeat("-", w-2) + "+"
	drawBoxLine(f, x0, top, border)
	drawBoxLine(f, x0, top+1, "|"+truncate(" "+title, w-2)+"|")
	for i := 0; i < 2; i++ {
		ln := ""
		idx := s.ExtTop + i
		if idx < len(s.ExtActions) {
			a := s.ExtActions[idx]
			mark := " "
			if idx == s.ExtFocus {
				mark = ">"
			}
			ln = mark + a.Extension + "." + a.Action + " " + a.Title
		}
		focused := s.ExtTop+i == s.ExtFocus && len(s.ExtActions) > 0
		bg := chromeBG
		if focused {
			bg = activeBG
		}
		line := "|" + truncate(" "+ln, w-2) + "|"
		rs := []rune(line)
		for len(rs) < w {
			rs = append(rs, ' ')
		}
		for x := 0; x < w && x0+x < f.W; x++ {
			ch := ' '
			if x < len(rs) {
				ch = rs[x]
			}
			f.Set(x0+x, top+2+i, term.Cell{Ch: ch, FG: chromeFG, BG: bg, Bold: focused})
		}
	}
}

// actLiveExt runs one palette action on the persistent live browser,
// then re-settles exactly like a ref click: refresh the URL, take a
// fresh snapshot, adopt the new page when the action navigated, and
// refresh the palette. Humans and extension_trigger acts share the
// same engine call, so both see identical results.
func (s *Shell) actLiveExt(ext, action string) {
	t := s.Current()
	if s.live == nil || !t.Live {
		s.Message = "No live page: open an http(s) URL first."
		return
	}
	val, err := s.live.TriggerExtension(ext, action, "{}")
	if err != nil {
		s.Message = "Extension failed: " + firstLine(err.Error())
		return
	}
	s.clearStale()
	time.Sleep(600 * time.Millisecond)
	s.live.RefreshURL()
	snap, err := s.live.Snapshot()
	if err != nil {
		s.Message = "Extension " + ext + "." + action + " ran; re-snapshot failed: " + firstLine(err.Error())
		return
	}
	rows := s.live.Rows()
	if snap.URL != "" && snap.URL != t.Address {
		t.Address, t.Title, t.Scroll = snap.URL, snap.Title, 0
		if s.Record {
			_ = engine.RecordVisit(s.Profile, snap.URL, snap.Title)
			_, _ = engine.VisitStack(s.Profile, snap.URL, snap.Title)
		}
	}
	t.Page.Rows = rows
	t.Page.Title = snap.Title
	t.Refs, t.Gen, t.Stable = snap.Refs, snap.Gen, snap.Stable
	s.HintFocus = 0
	s.DrawerTop = 0
	s.refreshExt()
	s.Message = "Extension " + ext + "." + action + " returned " +
		firstLine(string(val)) + " (gen" + itoa(snap.Gen) + ")"
}

// toggleMedia starts or stops the background media watch on the
// largest page video (or the largest region when the page has no
// video). All CDP work happens off the input goroutine; the status
// line carries fps plus byte counts while the watch runs.
func (s *Shell) toggleMedia() {
	s.mediaMu.Lock()
	watching := s.mediaWatching
	s.mediaMu.Unlock()
	if watching {
		s.stopMediaWatch()
		return
	}
	t := s.Current()
	if s.live == nil || !t.Live {
		s.Message = "No media: open a live page first."
		return
	}
	b := s.live
	els, err := b.MediaElements()
	if err != nil {
		s.Message = "Media: " + firstLine(err.Error())
		return
	}
	el, err := engine.PickMedia(els, -1)
	if err != nil {
		s.Message = "Media: " + firstLine(err.Error())
		return
	}
	s.startMediaWatch(b, el)
	s.Message = "Watching media " + el.Tag + " (V stops; animation on Kitty, stills elsewhere)."
}

// startMediaWatch launches the sampler goroutine. The browser pointer
// is captured here on the main goroutine; CloseLive stops the watch
// before closing it, so the sampler never touches a dead handle.
func (s *Shell) startMediaWatch(b *engine.Browser, el engine.MediaElement) {
	stop := make(chan struct{})
	s.mediaMu.Lock()
	s.mediaStop = stop
	s.mediaWatching = true
	animated := s.MediaAnimated
	s.mediaStat = "media starting"
	s.mediaWG.Add(1)
	s.mediaMu.Unlock()
	go s.runMediaWatch(b, el, animated, stop)
}

// stopMediaWatch signals the sampler and waits for the in-flight
// frame, then reports the logged summary on the main goroutine. Only
// the main goroutine calls it (keys and CloseLive), so the channel
// never double-closes and the status write never races Render.
func (s *Shell) stopMediaWatch() {
	s.mediaMu.Lock()
	watching := s.mediaWatching
	stop := s.mediaStop
	s.mediaMu.Unlock()
	if !watching {
		return
	}
	close(stop)
	s.mediaWG.Wait()
	s.mediaMu.Lock()
	summary := s.mediaSummary
	s.mediaSummary = ""
	s.mediaMu.Unlock()
	if summary != "" {
		s.Message = summary
	} else {
		s.Message = "Media watch stopped."
	}
}

// runMediaWatch samples in 2-second slices until stopped, following
// the page across navigations by re-picking the largest video every
// slice. Every kept frame paints through the real painter chain into
// a counting buffer (persistent Kitty transmitter for animation,
// block stills otherwise), so the status bytes are measured PTY
// bytes, not estimates; the latest surface stays available for the
// tb loop to compose over the grid.
func (s *Shell) runMediaWatch(b *engine.Browser, first engine.MediaElement, animated bool, stop chan struct{}) {
	defer s.mediaWG.Done()
	var tier term.GraphicsTier
	if animated {
		tier = term.TierKitty
	} else {
		tier = term.TierBlock
	}
	kitty := gfx.NewKitty()
	block := gfx.NewBlock()
	var caps term.Capabilities
	el := first
	total := &engine.MediaReport{Tag: first.Tag, Element: first.Tag}
	started := time.Now()
	paint := func(img gfx.Image, still bool) (string, int, error) {
		s.mediaMu.Lock()
		fw, fh := s.mediaW, s.mediaH
		s.mediaMu.Unlock()
		if fw < 1 {
			fw = 80
		}
		if fh < 1 {
			fh = 24
		}
		cw, ch := engine.MediaCells(el, fw, fh)
		surf := gfx.Surface{Img: img, CellX: 0, CellY: ChromeRows, CellW: cw, CellH: ch}
		var buf bytes.Buffer
		var name string
		var err error
		if still {
			name, err = gfx.PaintChain(&buf, []gfx.Painter{block}, surf, caps)
		} else {
			name, err = gfx.PaintChain(&buf, []gfx.Painter{kitty}, surf, caps)
		}
		if err != nil {
			return "", 0, err
		}
		cp := surf
		s.mediaMu.Lock()
		s.mediaSurf = &cp
		s.mediaMu.Unlock()
		return name, buf.Len(), nil
	}
	for {
		select {
		case <-stop:
			s.finishMediaWatch(total, started)
			return
		default:
		}
		if els, err := b.MediaElements(); err == nil {
			if pick, perr := engine.PickMedia(els, -1); perr == nil {
				el = pick
			}
		}
		rep, err := b.RunMediaWatch(el, 2, tier, paint)
		if err != nil {
			s.setMediaStat("media error: " + firstLine(err.Error()))
			select {
			case <-stop:
				s.finishMediaWatch(total, started)
				return
			case <-time.After(2 * time.Second):
				continue
			}
		}
		total.Frames += rep.Frames
		total.Bytes += rep.Bytes
		total.Skipped += rep.Skipped
		total.Painter = rep.Painter
		total.Element = rep.Element
		fps := 0.0
		if d := time.Since(started).Seconds(); d > 0 {
			fps = float64(total.Frames) / d
		}
		s.setMediaStat("media " + rep.Element + " " + itoa(int(fps)) +
			"fps " + itoa(total.Bytes) + "B skip" + itoa(total.Skipped))
	}
}

// finishMediaWatch logs the accumulated bandwidth report and clears
// the overlay state. It runs on the sampler goroutine at most once
// per watch and never touches the status message directly: the main
// goroutine reports the summary after the wait.
func (s *Shell) finishMediaWatch(total *engine.MediaReport, started time.Time) {
	total.Millis = time.Since(started).Milliseconds()
	if d := time.Since(started).Seconds(); d > 0 {
		total.FPS = float64(total.Frames) / d
	}
	if total.Painter == "" {
		total.Painter = "none"
	}
	_ = engine.AppendMediaLog(engine.MediaLogPath(), total)
	s.mediaMu.Lock()
	s.mediaWatching = false
	s.mediaStat = ""
	s.mediaSurf = nil
	s.mediaSummary = "Media watch stopped: " + itoa(total.Frames) + " frames, " +
		itoa(total.Bytes) + " bytes, " + itoa(total.Skipped) + " skipped (logged)."
	s.mediaMu.Unlock()
}

// setMediaStat updates the status fragment while the watch runs.
func (s *Shell) setMediaStat(line string) {
	s.mediaMu.Lock()
	defer s.mediaMu.Unlock()
	if s.mediaWatching {
		s.mediaStat = line
	}
}

// MediaStatLine is the status-line fragment for an active watch, or
// empty when idle.
func (s *Shell) MediaStatLine() string {
	s.mediaMu.Lock()
	defer s.mediaMu.Unlock()
	if !s.mediaWatching {
		return ""
	}
	return s.mediaStat
}

// MediaSurface returns the latest sampled frame for the tb loop to
// compose over the grid, or nil when the watch is idle.
func (s *Shell) MediaSurface() *gfx.Surface {
	s.mediaMu.Lock()
	defer s.mediaMu.Unlock()
	if s.mediaSurf == nil {
		return nil
	}
	cp := *s.mediaSurf
	return &cp
}

// SetMediaAnimated selects the watch tick from the probed tier. The
// tb loop calls it once at startup; the default stays still-safe.
func (s *Shell) SetMediaAnimated(animated bool) {
	s.mediaMu.Lock()
	defer s.mediaMu.Unlock()
	s.MediaAnimated = animated
}
