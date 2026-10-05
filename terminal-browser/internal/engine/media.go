// Package engine media surface: discovery of page media elements,
// governor-paced frame sampling, and bandwidth logging. Video in the
// terminal is element screenshots re-captured on a tier-paced tick:
// the Kitty tier composes frames through transmit-once id reuse plus
// per-frame placement (cheap enough for animation), while every other
// tier repaints stills no more often than the still interval. A tick
// whose capture plus encode overruns its interval is skipped and
// counted, never queued: the sampler degrades frame rate instead of
// latency, and every tick lands in the bandwidth log.
package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	_ "image/png"
	"os"
	"path/filepath"
	"time"

	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// MediaAnimInterval paces frame sampling on the animated (Kitty)
// tier: 100 ms sustains 10 fps, the binding floor for video regions.
const MediaAnimInterval = 100 * time.Millisecond

// MediaStillInterval paces still repaints on every other tier: 2 s
// refreshes well inside the 5 s binding ceiling.
const MediaStillInterval = 2 * time.Second

// MediaInterval returns the sampling tick for a tier: animated ticks
// on Kitty, still ticks everywhere else (including forced-block tmux
// and screen sessions).
func MediaInterval(tier term.GraphicsTier) time.Duration {
	if tier == term.TierKitty {
		return MediaAnimInterval
	}
	return MediaStillInterval
}

// MediaElement is one sampled page region: video, image, or canvas
// with a non-trivial layout box in CSS pixels.
type MediaElement struct {
	Tag string  `json:"tag"`
	Src string  `json:"src"`
	X   float64 `json:"x"`
	Y   float64 `json:"y"`
	W   float64 `json:"w"`
	H   float64 `json:"h"`
}

// mediaDiscoverJS collects visible media boxes, largest-area first.
// Audio has no box and is excluded; zero-area nodes never sample.
const mediaDiscoverJS = `(function(){var out=[];var tags=["video","img","canvas"];` +
	`for(var ti=0;ti<tags.length;ti++){var els=document.querySelectorAll(tags[ti]);` +
	`for(var i=0;i<els.length&&out.length<50;i++){var r=els[i].getBoundingClientRect();` +
	`if(r.width<2||r.height<2){continue}` +
	`out.push({tag:tags[ti],src:els[i].currentSrc||els[i].src||"",` +
	`x:r.x,y:r.y,w:r.width,h:r.height})}}` +
	`out.sort(function(a,b){return (b.w*b.h)-(a.w*a.h)});return out})()`

// MediaElements discovers the page media regions in area order.
func (b *Browser) MediaElements() ([]MediaElement, error) {
	val, err := b.sess.Evaluate(mediaDiscoverJS, false, actTimeout)
	if err != nil {
		return nil, fmt.Errorf("discover media: %w", err)
	}
	var els []MediaElement
	if err := json.Unmarshal(val, &els); err != nil {
		return nil, fmt.Errorf("decode media elements: %w", err)
	}
	if els == nil {
		els = []MediaElement{}
	}
	return els, nil
}

// PickMedia selects the sampling target: element index when it names
// a valid entry, otherwise the largest video, otherwise the largest
// region. No regions fails closed instead of sampling blind.
func PickMedia(els []MediaElement, index int) (MediaElement, error) {
	if len(els) == 0 {
		return MediaElement{}, fmt.Errorf("no media elements on this page")
	}
	if index >= 0 && index < len(els) {
		return els[index], nil
	}
	if index != -1 {
		return MediaElement{}, fmt.Errorf("media index %d out of range (0..%d)", index, len(els)-1)
	}
	best := els[0]
	for _, el := range els {
		if el.Tag == "video" && best.Tag != "video" {
			best = el
			continue
		}
		if el.Tag == best.Tag && el.W*el.H > best.W*best.H {
			best = el
		}
	}
	return best, nil
}

// CaptureClipPNG screenshots one CSS-pixel region. Beyond-viewport
// capture reaches below-fold media; the shared 32 MiB payload cap
// applies.
func (b *Browser) CaptureClipPNG(x, y, w, h float64) ([]byte, error) {
	if w < 1 || h < 1 {
		return nil, fmt.Errorf("media region %.0fx%.0f has no area", w, h)
	}
	raw, err := b.sess.Call("Page.captureScreenshot", map[string]interface{}{
		"format": "png",
		"clip": map[string]interface{}{
			"x": x, "y": y, "width": w, "height": h, "scale": 1,
		},
		"captureBeyondViewport": true,
	}, 20*time.Second)
	if err != nil {
		return nil, fmt.Errorf("capture media region: %w", err)
	}
	var shot struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(raw, &shot); err != nil {
		return nil, fmt.Errorf("decode media shot: %w", err)
	}
	return b64PNG(shot.Data)
}

// PNGToImage decodes PNG bytes into a paint-ready surface.
func PNGToImage(raw []byte) (gfx.Image, error) {
	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return gfx.Image{}, fmt.Errorf("decode media png: %w", err)
	}
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w < 1 || h < 1 {
		return gfx.Image{}, fmt.Errorf("media frame %dx%d has no area", w, h)
	}
	out := gfx.NewImage(w, h)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			px := color.NRGBAModel.Convert(img.At(bounds.Min.X+x, bounds.Min.Y+y)).(color.NRGBA)
			out.Pix[y*w+x] = term.RGB{R: px.R, G: px.G, B: px.B}
		}
	}
	return out, nil
}

// SampleMediaFrame captures one region and converts it to a surface.
func (b *Browser) SampleMediaFrame(el MediaElement) (gfx.Image, error) {
	raw, err := b.CaptureClipPNG(el.X, el.Y, el.W, el.H)
	if err != nil {
		return gfx.Image{}, err
	}
	return PNGToImage(raw)
}

// MediaCells maps an element box onto overlay cells at roughly 8x16
// px per cell, clamped into the frame so regions never paint outside
// the grid.
func MediaCells(el MediaElement, frameW, frameH int) (int, int) {
	if frameW < 1 {
		frameW = 1
	}
	if frameH < 1 {
		frameH = 1
	}
	w := int(el.W / 8)
	if w < 4 {
		w = 4
	}
	if w > frameW {
		w = frameW
	}
	h := int(el.H / 16)
	if h < 2 {
		h = 2
	}
	if h > frameH {
		h = frameH
	}
	return w, h
}

// MediaReport summarizes one watch run for the envelope and the
// bandwidth log: painted frames, PTY bytes, skipped ticks, and the
// measured frame rate.
type MediaReport struct {
	Element string `json:"element"`
	Tag     string `json:"tag"`
	Frames  int    `json:"frames"`
	Bytes   int    `json:"bytes"`
	Skipped int    `json:"skipped"`
	Millis  int64  `json:"millis"`
	FPS     float64 `json:"fps"`
	Painter string `json:"painter"`
	Log     string `json:"log,omitempty"`
}

// RunMediaWatch samples el for up to seconds (clamped 1..30),
// painting each kept frame through onFrame, which returns the winning
// painter name and its PTY bytes. Ticks that overrun their interval
// are skipped and counted; still tiers also throttle to one painted
// still per still interval. The watch always runs at least one frame
// so a zero-duration page still proves the path.
func (b *Browser) RunMediaWatch(el MediaElement, seconds float64, tier term.GraphicsTier, onFrame func(img gfx.Image, still bool) (string, int, error)) (*MediaReport, error) {
	if el.Tag == "" || el.W < 1 || el.H < 1 {
		return nil, fmt.Errorf("media element has no area to sample")
	}
	if seconds < 1 {
		seconds = 1
	}
	if seconds > 30 {
		seconds = 30
	}
	if onFrame == nil {
		return nil, fmt.Errorf("media watch needs a frame painter")
	}
	animated := tier == term.TierKitty
	interval := MediaInterval(tier)
	rep := &MediaReport{
		Element: fmt.Sprintf("%s %.0fx%.0f", el.Tag, el.W, el.H),
		Tag:     el.Tag,
	}
	start := time.Now()
	deadline := start.Add(time.Duration(seconds * float64(time.Second)))
	var lastStill time.Time
	painted := 0
	for {
		tick := time.Now()
		img, err := b.SampleMediaFrame(el)
		if err != nil {
			return rep, fmt.Errorf("sample media frame: %w", err)
		}
		cost := time.Since(tick)
		still := !animated
		if still && painted > 0 && time.Since(lastStill) < MediaStillInterval {
			rep.Skipped++
		} else if cost > interval && painted > 0 {
			// Overran the tick after the mandatory first frame:
			// drop it and count the skip instead of queueing
			// latency behind the page.
			rep.Skipped++
		} else {
			name, n, err := onFrame(img, still)
			if err != nil {
				return rep, fmt.Errorf("paint media frame: %w", err)
			}
			rep.Painter = name
			rep.Bytes += n
			painted++
			if still {
				lastStill = time.Now()
			}
		}
		rep.Frames = painted
		if now := time.Now(); now.After(deadline) {
			rep.Millis = now.Sub(start).Milliseconds()
			break
		} else if wait := interval - time.Since(tick); wait > 0 {
			time.Sleep(wait)
		}
	}
	if elapsed := time.Since(start).Seconds(); elapsed > 0 {
		rep.FPS = float64(painted) / elapsed
	}
	return rep, nil
}

// MediaLogPath is the JSONL bandwidth ledger for media watches.
func MediaLogPath() string {
	return filepath.Join(BaseDir(), "media.log")
}

// AppendMediaLog appends one watch report to the JSONL ledger with
// 0600 permissions: bandwidth history stays private to the user.
func AppendMediaLog(path string, rep *MediaReport) error {
	if rep == nil {
		return fmt.Errorf("nothing to log")
	}
	raw, err := json.Marshal(rep)
	if err != nil {
		return fmt.Errorf("encode media report: %w", err)
	}
	raw = append(raw, '\n')
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0o600)
	if err != nil {
		return fmt.Errorf("open media log: %w", err)
	}
	if _, err := f.Write(raw); err != nil {
		_ = f.Close()
		return fmt.Errorf("write media log: %w", err)
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("close media log: %w", err)
	}
	return nil
}
