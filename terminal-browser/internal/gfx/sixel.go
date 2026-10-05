package gfx

import (
	"io"
	"strconv"
	"strings"

	"randomlabs/terminal-browser/internal/term"
)

// Sixel paints quantized still regions: 3-3-2 color quantization into a
// 256-entry palette, run-length encoded sixel body inside DCS/ST.
type Sixel struct{}

// Name identifies the painter in the degrade chain.
func (Sixel) Name() string { return "sixel" }

// Paint emits one Sixel region positioned at the surface origin.
func (Sixel) Paint(w io.Writer, s Surface, caps term.Capabilities) error {
	if s.CellW < 1 || s.CellH < 1 || s.Img.W < 1 || s.Img.H < 1 || len(s.Img.Pix) == 0 {
		return nil
	}
	Cup(w, s.CellX+1, s.CellY+1)
	// Downscale the surface to the cell rectangle: at most 2x2 pixels
	// per cell keeps PTY bytes bounded on the 10 fps Sixel floor.
	pw, ph := s.CellW*2, s.CellH*2
	if pw < 1 {
		pw = 1
	}
	if ph < 1 {
		ph = 1
	}
	if pw > 800 {
		pw = 800
	}
	if ph > 600 {
		ph = 600
	}
	grid := resample(s.Img, pw, ph)
	io.WriteString(w, "\x1bPq\"1;1;"+strconv.Itoa(pw)+";"+strconv.Itoa(ph))
	writePalette(w, grid)
	writeBody(w, grid, pw, ph)
	io.WriteString(w, "\x1b\\")
	return nil
}

func quant(p term.RGB) int {
	return int(p.R>>5)<<5 | int(p.G>>5)<<2 | int(p.B>>6)
}

func resample(im Image, w, h int) []int {
	out := make([]int, w*h)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			sx := x * im.W / w
			sy := y * im.H / h
			out[y*w+x] = quant(im.At(sx, sy))
		}
	}
	return out
}

func writePalette(w io.Writer, grid []int) {
	seen := map[int]bool{}
	var sb strings.Builder
	for _, q := range grid {
		if seen[q] {
			continue
		}
		seen[q] = true
		r := (q >> 5) & 7
		g := (q >> 2) & 7
		b := q & 3
		sb.WriteString("#" + strconv.Itoa(q) + ";2;" +
			strconv.Itoa(r*100/7) + ";" + strconv.Itoa(g*100/7) + ";" + strconv.Itoa(b*100/3))
	}
	io.WriteString(w, sb.String())
}

func writeBody(w io.Writer, grid []int, pw, ph int) {
	var sb strings.Builder
	for band := 0; band*6 < ph; band++ {
		// Collect every color present in this band so each gets its
		// own pass; a single majority-color pass would drop dithered
		// pixels painted in minority colors.
		var colors []int
		present := map[int]bool{}
		for x := 0; x < pw; x++ {
			for bit := 0; bit < 6; bit++ {
				y := band*6 + bit
				if y >= ph {
					break
				}
				q := grid[y*pw+x]
				if !present[q] {
					present[q] = true
					colors = append(colors, q)
				}
			}
		}
		for _, q := range colors {
			masks := make([]int, pw)
			for x := 0; x < pw; x++ {
				mask := 0
				for bit := 0; bit < 6; bit++ {
					y := band*6 + bit
					if y < ph && grid[y*pw+x] == q {
						mask |= 1 << bit
					}
				}
				masks[x] = mask
			}
			sb.WriteString("#" + strconv.Itoa(q))
			// Run-length compress horizontal repeats of the same byte.
			for x := 0; x < pw; {
				run := 1
				for x+run < pw && masks[x+run] == masks[x] {
					run++
				}
				if run > 1 {
					sb.WriteString("!" + strconv.Itoa(run) + string(rune('?'+masks[x])))
					x += run
				} else {
					sb.WriteByte(byte('?' + masks[x]))
					x++
				}
			}
		}
		sb.WriteString("$-")
	}
	io.WriteString(w, sb.String())
}
