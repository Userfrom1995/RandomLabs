package engine

import (
	"strings"
	"unicode"

	"randomlabs/terminal-browser/internal/demo"
	"randomlabs/terminal-browser/internal/term"
)

// Terminal stylesheet: AX roles map to cell styles. Headings are warm
// and bold with level prefixes, links are accent and underlined,
// controls carry their affordance suffix from Flatten, images are dim
// stand-in glyphs until the media phase paints real rects.
var (
	ink     = term.RGB{R: 235, G: 235, B: 235}
	dim     = term.RGB{R: 150, G: 150, B: 160}
	accent  = term.RGB{R: 120, G: 200, B: 255}
	heading = term.RGB{R: 255, G: 210, B: 120}
	bg      = term.RGB{R: 12, G: 14, B: 20}
	linkBG  = term.RGB{R: 20, G: 30, B: 48}
)

// Style converts flattened AX blocks into styled rows at grid width.
// Tables reflow through LayoutTable; long prose wraps via Wrap.
func Style(blocks []Block, width int) []demo.Row {
	if width < 20 {
		width = 20
	}
	textW := width - 3
	var rows []demo.Row
	linkIdx := 0
	for _, b := range blocks {
		switch b.Kind {
		case "heading":
			prefix := strings.Repeat("#", clamp(b.Level, 1, 6)) + " "
			for _, ln := range Wrap(prefix+b.Text, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: heading, Bold: true})
			}
			rows = append(rows, demo.Row{})
		case "link":
			linkIdx++
			label := "[" + itoa(linkIdx) + "] " + b.Text
			for _, ln := range Wrap(label, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: accent, Underline: true, Link: true})
			}
			if strings.TrimSpace(b.Href) != "" {
				for _, ln := range Wrap("    -> "+b.Href, textW) {
					rows = append(rows, demo.Row{Text: ln, FG: dim})
				}
			}
		case "control":
			for _, ln := range Wrap(b.Text, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: accent})
			}
		case "image":
			for _, ln := range Wrap(b.Text, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: dim})
			}
		case "item":
			for _, ln := range Wrap("  - "+b.Text, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: ink})
			}
		case "table":
			for _, ln := range LayoutTable(b.Head, b.Cells, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: ink, NoWrap: true})
			}
			rows = append(rows, demo.Row{})
		default:
			for _, ln := range Wrap(b.Text, textW) {
				rows = append(rows, demo.Row{Text: ln, FG: ink})
			}
		}
	}
	return trimTrailingBlanks(rows)
}

// Wrap word-wraps text to width on rune boundaries. Long words break
// hard so CJK strings and URLs never overflow the grid.
func Wrap(text string, width int) []string {
	if width < 10 {
		width = 10
	}
	text = strings.TrimRight(text, " ")
	if text == "" {
		return []string{""}
	}
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{""}
	}
	var lines []string
	cur := ""
	for _, w := range words {
		for len([]rune(w)) > width {
			// Emit the full prefix chunk of an overlong word.
			r := []rune(w)
			if cur != "" {
				lines = append(lines, cur)
				cur = ""
			}
			lines = append(lines, string(r[:width]))
			w = string(r[width:])
		}
		if cur == "" {
			cur = w
			continue
		}
		if len([]rune(cur))+1+len([]rune(w)) <= width {
			cur += " " + w
			continue
		}
		lines = append(lines, cur)
		cur = w
	}
	if cur != "" || len(lines) == 0 {
		lines = append(lines, cur)
	}
	return lines
}

// LayoutTable renders headers plus rows into equal columns that fit
// width. Columns shrink evenly and truncate with an ellipsis mark;
// a separator row divides the header for scannability.
func LayoutTable(head []string, rows [][]string, width int) []string {
	ncol := len(head)
	for _, r := range rows {
		if len(r) > ncol {
			ncol = len(r)
		}
	}
	if ncol == 0 {
		return nil
	}
	colW := (width - (ncol - 1) * 2) / ncol
	if colW < 6 {
		colW = 6
	}
	var out []string
	if len(head) > 0 {
		out = append(out, joinCells(fitCells(head, ncol, colW), colW))
		sep := make([]string, ncol)
		for i := range sep {
			sep[i] = strings.Repeat("-", colW)
		}
		out = append(out, strings.Join(sep, "  "))
	}
	for _, r := range rows {
		out = append(out, joinCells(fitCells(r, ncol, colW), colW))
	}
	return out
}

func fitCells(cells []string, ncol, colW int) []string {
	out := make([]string, ncol)
	for i := 0; i < ncol; i++ {
		s := ""
		if i < len(cells) {
			s = squish(cells[i])
		}
		r := []rune(s)
		if len(r) > colW {
			if colW > 1 {
				s = string(r[:colW-1]) + "."
			} else {
				s = string(r[:colW])
			}
		}
		out[i] = s
	}
	return out
}

func joinCells(cells []string, colW int) string {
	padded := make([]string, len(cells))
	for i, c := range cells {
		padded[i] = c + strings.Repeat(" ", colW-len([]rune(c)))
	}
	return strings.TrimRight(strings.Join(padded, "  "), " ")
}

// squish collapses inner whitespace so table cells never embed
// newlines or tab runs that would break the grid.
func squish(s string) string {
	return strings.Join(strings.FieldsFunc(s, unicode.IsSpace), " ")
}

func trimTrailingBlanks(rows []demo.Row) []demo.Row {
	for len(rows) > 0 && strings.TrimSpace(rows[len(rows)-1].Text) == "" {
		rows = rows[:len(rows)-1]
	}
	return rows
}

// Rewrap reflows already-styled rows to a new grid width, one row at
// a time so style flags and link affordances survive. Table rows carry
// NoWrap from Style and pass through untouched: re-wrapping column
// grids as prose destroys their alignment. The shell uses this when
// the frame is narrower than the fetch width.
func Rewrap(rows []demo.Row, width int) []demo.Row {
	if width < 20 {
		width = 20
	}
	textW := width - 3
	var out []demo.Row
	for _, r := range rows {
		if strings.TrimSpace(r.Text) == "" {
			out = append(out, demo.Row{})
			continue
		}
		if r.NoWrap {
			out = append(out, r)
			continue
		}
		for _, ln := range Wrap(r.Text, textW) {
			out = append(out, demo.Row{
				Text: ln, FG: r.FG, BG: r.BG,
				Bold: r.Bold, Underline: r.Underline, Link: r.Link,
				NoWrap: r.NoWrap,
			})
		}
	}
	return out
}

func clamp(n, lo, hi int) int {
	if n < lo {
		return lo
	}
	if n > hi {
		return hi
	}
	return n
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

var _ = bg
var _ = linkBG
