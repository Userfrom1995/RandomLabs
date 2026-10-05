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

// Iterm2 paints PNG stills through OSC 1337 inline images. The PNG
// bytes are cached per surface hash (LRU-capped) so encoding happens
// once, but the placement escape is re-emitted on every visible frame:
// a still the terminal scrolled away or cleared must come back, and a
// dedup-without-replace paint would leave the region blank.
type Iterm2 struct {
	png   map[uint64][]byte
	order []uint64
}

// maxIterm2Cached caps PNG stills held in memory.
const maxIterm2Cached = 32

// NewIterm2 builds a stateful iTerm2 painter with a still cache.
func NewIterm2() *Iterm2 { return &Iterm2{png: map[uint64][]byte{}} }

// Name identifies the painter in the degrade chain.
func (p *Iterm2) Name() string { return "iterm2" }

// Paint emits one inline PNG still, encoding each unique surface once
// and re-emitting the placement escape on every visible frame.
func (p *Iterm2) Paint(w io.Writer, s Surface, caps term.Capabilities) error {
	if s.CellW < 1 || s.CellH < 1 || s.Img.W < 1 || s.Img.H < 1 || len(s.Img.Pix) == 0 {
		return nil
	}
	h := s.Img.Hash()
	enc, known := p.png[h]
	if !known {
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
		enc = []byte(base64.StdEncoding.EncodeToString(buf.Bytes()))
		p.png[h] = enc
		p.order = append(p.order, h)
		for len(p.order) > maxIterm2Cached {
			victim := p.order[0]
			p.order = p.order[1:]
			delete(p.png, victim)
		}
	}
	Cup(w, s.CellX+1, s.CellY+1)
	fmt.Fprintf(w, "\x1b]1337;File=inline=1;width=%dpx;height=%dpx:%s\a",
		s.CellW*8, s.CellH*16, enc)
	return nil
}

// Cached reports how many PNG stills are held in memory.
func (p *Iterm2) Cached() int { return len(p.png) }
