package gfx

import (
	"io"
	"strconv"
	"strings"

	"randomlabs/terminal-browser/internal/term"
)

// Block is the always-live baseline: half-block diffs that repaint only
// changed cell pairs, with truecolor first and 256, 16-color, and ASCII
// fallbacks underneath.
type Block struct {
	prev []blockPair
	w, h int
}

type blockPair struct {
	top, bottom term.RGB
	ch          rune
}

// NewBlock builds the diffing block painter.
func NewBlock() *Block { return &Block{} }

// Name identifies the painter in the degrade chain.
func (*Block) Name() string { return "block" }

// PaintCells diffs a text frame against the previous commit and emits only
// changed rows. It returns the number of cells repainted.
func (b *Block) PaintCells(w io.Writer, cur, prev *term.Frame, caps term.Capabilities) int {
	rows := make([]bool, cur.H)
	if prev == nil || prev.W != cur.W || prev.H != cur.H {
		for i := range rows {
			rows[i] = true
		}
	} else {
		for y := 0; y < cur.H; y++ {
			for x := 0; x < cur.W; x++ {
				if cur.Cells[y*cur.W+x] != prev.Cells[y*prev.W+x] {
					rows[y] = true
					break
				}
			}
		}
	}
	var sb strings.Builder
	repainted := 0
	var lastFG, lastBG term.RGB
	var lastBold, lastUnderline bool
	styled := false
	for y := 0; y < cur.H; y++ {
		if !rows[y] {
			continue
		}
		sb.WriteString("\x1b[" + strconv.Itoa(y+1) + ";1H")
		for x := 0; x < cur.W; x++ {
			c := cur.Cells[y*cur.W+x]
			if !styled || c.FG != lastFG || c.BG != lastBG || c.Bold != lastBold || c.Underline != lastUnderline {
				writeCellStyle(&sb, c, caps, lastBold, lastUnderline)
				lastFG, lastBG, lastBold, lastUnderline, styled = c.FG, c.BG, c.Bold, c.Underline, true
			}
			if c.Ch == 0 {
				sb.WriteByte(' ')
			} else {
				sb.WriteRune(asciiSafe(c.Ch))
			}
			repainted++
		}
	}
	sb.WriteString("\x1b[0m")
	io.WriteString(w, sb.String())
	return repainted
}

// Paint renders an image surface as half-block rows: each text row shows
// two pixel rows through the upper half block with fg=top bg=bottom.
func (b *Block) Paint(w io.Writer, s Surface, caps term.Capabilities) error {
	if s.CellW < 1 || s.CellH < 1 || s.Img.W < 1 || s.Img.H < 1 || len(s.Img.Pix) == 0 {
		return nil
	}
	var sb strings.Builder
	for r := 0; r < s.CellH; r++ {
		CupString(&sb, s.CellX+1, s.CellY+1+r)
		for c := 0; c < s.CellW; c++ {
			px := s.Img.At(c*s.Img.W/s.CellW, (r*2)*s.Img.H/(s.CellH*2))
			py := s.Img.At(c*s.Img.W/s.CellW, (r*2+1)*s.Img.H/(s.CellH*2))
			writeHalfBlock(&sb, px, py, caps)
		}
	}
	sb.WriteString("\x1b[0m")
	io.WriteString(w, sb.String())
	return nil
}

func writeCellStyle(sb *strings.Builder, c term.Cell, caps term.Capabilities, lastBold, lastUnderline bool) {
	if c.Reverse {
		c.FG, c.BG = c.BG, c.FG
	}
	writeFG(sb, c.FG, caps)
	writeBG(sb, c.BG, caps)
	if c.Bold && !lastBold {
		sb.WriteString("\x1b[1m")
	} else if !c.Bold && lastBold {
		sb.WriteString("\x1b[22m")
	}
	if c.Underline && !lastUnderline {
		sb.WriteString("\x1b[4m")
	} else if !c.Underline && lastUnderline {
		sb.WriteString("\x1b[24m")
	}
}

func writeHalfBlock(sb *strings.Builder, top, bottom term.RGB, caps term.Capabilities) {
	writeFG(sb, top, caps)
	writeBG(sb, bottom, caps)
	if !caps.TrueColor && caps.Tier == term.TierBlock {
		sb.WriteString(shadeChar(top, bottom))
		return
	}
	sb.WriteString("\u2580")
}

func writeFG(sb *strings.Builder, c term.RGB, caps term.Capabilities) {
	if !caps.TrueColor {
		if isBasic(c) {
			v := c.To16()
			if v >= 8 {
				sb.WriteString("\x1b[" + strconv.Itoa(90+(v-8)) + "m")
			} else {
				sb.WriteString("\x1b[" + strconv.Itoa(30+v) + "m")
			}
		} else {
			sb.WriteString("\x1b[38;5;" + strconv.Itoa(c.To256()) + "m")
		}
		return
	}
	sb.WriteString("\x1b[38;2;" + strconv.Itoa(int(c.R)) + ";" +
		strconv.Itoa(int(c.G)) + ";" + strconv.Itoa(int(c.B)) + "m")
}

func writeBG(sb *strings.Builder, c term.RGB, caps term.Capabilities) {
	if !caps.TrueColor {
		if isBasic(c) {
			v := c.To16()
			if v >= 8 {
				sb.WriteString("\x1b[" + strconv.Itoa(100+(v-8)) + "m")
			} else {
				sb.WriteString("\x1b[" + strconv.Itoa(40+v) + "m")
			}
			return
		}
		sb.WriteString("\x1b[48;5;" + strconv.Itoa(c.To256()) + "m")
		return
	}
	sb.WriteString("\x1b[48;2;" + strconv.Itoa(int(c.R)) + ";" +
		strconv.Itoa(int(c.G)) + ";" + strconv.Itoa(int(c.B)) + "m")
}

func isBasic(c term.RGB) bool {
	return c.To16() < 8 && c.Luminance() < 200
}

var shades = []string{" ", "\u2591", "\u2592", "\u2593", "\u2588"}

func shadeChar(top, bottom term.RGB) string {
	lt, lb := int(top.Luminance()), int(bottom.Luminance())
	d := lt - lb
	if d < 0 {
		d = -d
	}
	return shades[d*5/256]
}

func asciiSafe(r rune) rune {
	if r < 32 || r == 127 {
		return ' '
	}
	return r
}

// CupString appends cursor positioning to a builder.
func CupString(sb *strings.Builder, col, row int) {
	sb.WriteString("\x1b[" + strconv.Itoa(row) + ";" + strconv.Itoa(col) + "H")
}
