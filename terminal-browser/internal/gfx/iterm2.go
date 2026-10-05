package gfx

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"

	"randomlabs/terminal-browser/internal/term"
)

// Iterm2 paints PNG stills through OSC 1337 inline images. Animated
// regions are out of scope on this path by design: stills re-send per
// frame only when the surface hash changes, otherwise the paint is a
// no-op against the caller's own cache.
type Iterm2 struct {
	seen map[uint64]bool
}

// NewIterm2 builds a stateful iTerm2 painter with a still cache.
func NewIterm2() *Iterm2 { return &Iterm2{seen: map[uint64]bool{}} }

// Name identifies the painter in the degrade chain.
func (p *Iterm2) Name() string { return "iterm2" }

// Paint emits one inline PNG still unless already shown.
func (p *Iterm2) Paint(w io.Writer, s Surface, caps term.Capabilities) error {
	h := s.Img.Hash()
	if p.seen[h] {
		return nil
	}
	p.seen[h] = true
	var buf bytes.Buffer
	m := image.NewRGBA(image.Rect(0, 0, s.Img.W, s.Img.H))
	for y := 0; y < s.Img.H; y++ {
		for x := 0; x < s.Img.W; x++ {
			px := s.Img.Pix[y*s.Img.W+x]
			m.SetRGBA(x, y, color.RGBA{R: px.R, G: px.G, B: px.B, A: 0xff})
		}
	}
	if err := png.Encode(&buf, m); err != nil {
		return err
	}
	Cup(w, s.CellX+1, s.CellY+1)
	fmt.Fprintf(w, "\x1b]1337;File=inline=1;width=%dpx;height=%dpx:%s\a",
		s.CellW*8, s.CellH*16, base64.StdEncoding.EncodeToString(buf.Bytes()))
	return nil
}
