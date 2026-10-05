// Package gfx owns the layered image paint stack: Kitty graphics with
// transmit-once id reuse, quantized Sixel regions, iTerm2 PNG stills, and
// the always-live half-block truecolor diff with 256/16/ASCII fallbacks.
// Selection is per surface per frame, never per session.
package gfx

import (
	"hash/fnv"
	"io"

	"randomlabs/terminal-browser/internal/term"
)

// Image is a decoded RGB surface ready to paint into a cell rectangle.
type Image struct {
	W, H int
	Pix  []term.RGB
}

// NewImage allocates a surface; nil pixels render as transparent black.
func NewImage(w, h int) Image {
	if w < 1 {
		w = 1
	}
	if h < 1 {
		h = 1
	}
	return Image{W: w, H: h, Pix: make([]term.RGB, w*h)}
}

// At reads a pixel with clamping.
func (im Image) At(x, y int) term.RGB {
	if x < 0 {
		x = 0
	}
	if y < 0 {
		y = 0
	}
	if x >= im.W {
		x = im.W - 1
	}
	if y >= im.H {
		y = im.H - 1
	}
	return im.Pix[y*im.W+x]
}

// Hash identifies identical surfaces for transmit-once reuse.
func (im Image) Hash() uint64 {
	h := fnv.New64a()
	for _, p := range im.Pix {
		h.Write([]byte{p.R, p.G, p.B})
	}
	return h.Sum64()
}

// Surface is one paint rectangle inside a frame.
type Surface struct {
	Img        Image
	CellX      int // column of the top-left cell
	CellY      int // row of the top-left cell
	CellW      int // width in cells the paint covers
	CellH      int // height in cells the paint covers
	AllowStill bool
}

// Painter paints one surface with a tier-specific encoding.
type Painter interface {
	Name() string
	Paint(w io.Writer, s Surface, caps term.Capabilities) error
}

// Order returns the painter chain for the capabilities: per-surface
// degrade means the first painter that can render a given surface wins,
// and tmux/screen force the block painter for every surface.
func Order(caps term.Capabilities) []term.GraphicsTier {
	return caps.TierOrder()
}

// Select picks the first available painter name for a surface.
func Select(caps term.Capabilities, painters map[string]Painter) []Painter {
	var out []Painter
	for _, tier := range Order(caps) {
		if p, ok := painters[tier.String()]; ok {
			out = append(out, p)
		}
	}
	return out
}

// Cup positions the cursor (1-based) for region painters.
func Cup(w io.Writer, col, row int) {
	if col < 1 {
		col = 1
	}
	if row < 1 {
		row = 1
	}
	io.WriteString(w, "\x1b["+itoa(row)+";"+itoa(col)+"H")
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
