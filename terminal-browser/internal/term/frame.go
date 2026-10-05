package term

import (
	"io"
	"time"
)

// Cell is one grid position with text and style.
type Cell struct {
	Ch        rune
	FG, BG    RGB
	Bold      bool
	Underline bool
	Reverse   bool
}

// Frame is a full grid snapshot plus the byte accounting of its paint.
type Frame struct {
	W, H  int
	Cells []Cell

	// DirtyRows marks rows that changed since the last commit.
	DirtyRows []bool
	// Bytes is the PTY byte count of the last emitted frame.
	Bytes int
	// PaintedAt is the emission timestamp used by the FPS governor.
	PaintedAt time.Time
}

// NewFrame allocates a blank grid.
func NewFrame(w, h int) *Frame {
	if w < 1 {
		w = 1
	}
	if h < 1 {
		h = 1
	}
	return &Frame{
		W:         w,
		H:         h,
		Cells:     make([]Cell, w*h),
		DirtyRows: make([]bool, h),
	}
}

// Set writes a cell and marks its row dirty on change.
func (f *Frame) Set(x, y int, c Cell) {
	if x < 0 || y < 0 || x >= f.W || y >= f.H {
		return
	}
	i := y*f.W + x
	if f.Cells[i] != c {
		f.Cells[i] = c
		f.DirtyRows[y] = true
	}
}

// At reads a cell; out-of-range yields a blank.
func (f *Frame) At(x, y int) Cell {
	if x < 0 || y < 0 || x >= f.W || y >= f.H {
		return Cell{Ch: ' '}
	}
	return f.Cells[y*f.W+x]
}

// Fill paints a rectangle with one cell value.
func (f *Frame) Fill(x, y, w, h int, c Cell) {
	for j := y; j < y+h; j++ {
		for i := x; i < x+w; i++ {
			f.Set(i, j, c)
		}
	}
}

// WriteText writes a string starting at x,y, clipping to the grid.
func (f *Frame) WriteText(x, y int, s string, fg, bg RGB) {
	i := x
	for _, r := range s {
		if i >= f.W {
			break
		}
		f.Set(i, y, Cell{Ch: r, FG: fg, BG: bg})
		i++
	}
}

// DirtyBBox returns the bounding box of dirty rows.
func (f *Frame) DirtyBBox() (top, bottom int, any bool) {
	top, bottom = -1, -1
	for y, d := range f.DirtyRows {
		if d {
			if top < 0 {
				top = y
			}
			bottom = y
		}
	}
	return top, bottom, top >= 0
}

// MarkClean clears dirty flags after a successful commit.
func (f *Frame) MarkClean() {
	for i := range f.DirtyRows {
		f.DirtyRows[i] = false
	}
}

// MarkAllDirty forces a full repaint (resize, tier switch, tab change).
func (f *Frame) MarkAllDirty() {
	for i := range f.DirtyRows {
		f.DirtyRows[i] = true
	}
}

// Counter wraps a writer and counts PTY bytes per frame.
type Counter struct {
	W io.Writer
	N int
}

func (c *Counter) Write(p []byte) (int, error) {
	n, err := c.W.Write(p)
	c.N += n
	return n, err
}

// Compositor emits frames with synchronized output where probed,
// cursor-hide fallback elsewhere, and dirty-row-only output.
type Compositor struct {
	caps Capabilities
	prev *Frame
}

// NewCompositor binds a compositor to probed capabilities.
func NewCompositor(caps Capabilities) *Compositor {
	return &Compositor{caps: caps}
}

// OpenFrame writes the frame prologue.
func (c *Compositor) OpenFrame(w io.Writer) {
	if c.caps.SyncOutput {
		io.WriteString(w, "\x1b[?2026h")
	} else {
		io.WriteString(w, "\x1b[?25l")
	}
}

// CloseFrame writes the epilogue atomically paired with the prologue.
func (c *Compositor) CloseFrame(w io.Writer) {
	if c.caps.SyncOutput {
		io.WriteString(w, "\x1b[?2026l")
	} else {
		io.WriteString(w, "\x1b[?25h")
	}
}

// DirtyRowsSince computes rows that differ from the last committed frame.
func (c *Compositor) DirtyRowsSince(f *Frame) []bool {
	rows := make([]bool, f.H)
	if c.prev == nil || c.prev.W != f.W || c.prev.H != f.H {
		for i := range rows {
			rows[i] = true
		}
		return rows
	}
	for y := 0; y < f.H; y++ {
		for x := 0; x < f.W; x++ {
			if f.Cells[y*f.W+x] != c.prev.Cells[y*f.W+x] {
				rows[y] = true
				break
			}
		}
	}
	return rows
}

// Commit records the frame as the new baseline.
func (c *Compositor) Commit(f *Frame) {
	cp := NewFrame(f.W, f.H)
	copy(cp.Cells, f.Cells)
	c.prev = cp
	f.MarkClean()
}

// Governor paces frames between 10 and 30 fps with a 10 fps floor on
// Sixel and block paths, where PTY bytes cost the most.
type Governor struct {
	minInterval time.Duration
	maxInterval time.Duration
	last        time.Time
	lastCost    time.Duration
}

// NewGovernor builds a governor for the active tier.
func NewGovernor(tier GraphicsTier) *Governor {
	g := &Governor{minInterval: 33 * time.Millisecond, maxInterval: 100 * time.Millisecond}
	if tier == TierSixel || tier == TierBlock {
		g.minInterval = 66 * time.Millisecond
		g.maxInterval = 100 * time.Millisecond
	}
	if tier == TierKitty {
		g.minInterval = 33 * time.Millisecond
	}
	return g
}

// Wait blocks until the next frame slot, adapting to measured paint cost.
func (g *Governor) Wait() {
	now := time.Now()
	target := g.minInterval + g.lastCost/2
	if target > g.maxInterval {
		target = g.maxInterval
	}
	if wait := target - now.Sub(g.last); wait > 0 {
		time.Sleep(wait)
	}
	g.last = time.Now()
}

// Observe records how long the last paint took.
func (g *Governor) Observe(cost time.Duration) { g.lastCost = cost }

// TargetFPS reports the current frame-rate target for status display.
func (g *Governor) TargetFPS() int {
	target := g.minInterval + g.lastCost/2
	if target > g.maxInterval {
		target = g.maxInterval
	}
	if target <= 0 {
		return 30
	}
	return int(time.Second / target)
}

// FrameStats summarizes one painted frame for logs and agent envelopes.
type FrameStats struct {
	Bytes    int    `json:"bytes"`
	Rows     int    `json:"rows"`
	Dirty    int    `json:"dirty_rows"`
	Tier     string `json:"tier"`
	SyncTear bool   `json:"sync_tear_free"`
}

// Describe builds stats for an emitted frame.
func Describe(f *Frame, caps Capabilities) FrameStats {
	dirty := 0
	for _, d := range f.DirtyRows {
		if d {
			dirty++
		}
	}
	return FrameStats{
		Bytes:    f.Bytes,
		Rows:     f.H,
		Dirty:    dirty,
		Tier:     caps.Tier.String(),
		SyncTear: caps.SyncOutput,
	}
}
