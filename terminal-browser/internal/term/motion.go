// Package term motion policy: the Signal Ledger v2 tick table plus the
// reduced-motion fallback the design requires to ship with every item.
// Ticks pace cursor/focus (T1), drawer and pane cuts (T2), and spinners
// plus fetch progress (T3). Reduced motion forces every duration to
// zero: zero-frame cuts, a static anchor overlap with no hold, and
// static loading text with no animation.
package term

import (
	"os"
	"strings"
	"time"
)

// Signal Ledger v2 tick durations. Steps count frames, never
// interpolation: hover costs 1x T1, drawer open/close costs at most
// 3x T2, spinner frames advance 1x T3.
const (
	T1Ms = 33
	T2Ms = 50
	T3Ms = 100
	// StrobeWindowMs groups drawer open plus close plus resolve inside
	// one window into a single final-state paint.
	StrobeWindowMs = 150
	// SpinnerMaxFrames caps the loading spinner before it parks on a
	// static elapsed label.
	SpinnerMaxFrames = 6
)

// T1 returns the cursor and focus tick.
func T1() time.Duration { return T1Ms * time.Millisecond }

// T2 returns the drawer and pane tick.
func T2() time.Duration { return T2Ms * time.Millisecond }

// T3 returns the spinner and progress tick.
func T3() time.Duration { return T3Ms * time.Millisecond }

// forcedReduced is the process-wide override set by the --reduced-motion
// flag. Env and config checks below layer on top of it.
var forcedReduced = false

// SetReduced forces the reduced-motion path for the process. The tb
// frontend calls it when --reduced-motion is passed; tests use it to
// pin the policy without touching the environment.
func SetReduced(on bool) { forcedReduced = on }

// Reduced reports whether the reduced-motion path is active: the flag
// override, REDUCED_MOTION=1, or TB_MOTION=reduced (config motion:
// reduced expressed as an env var). Empty values never enable it.
func Reduced() bool {
	if forcedReduced {
		return true
	}
	if os.Getenv("REDUCED_MOTION") == "1" {
		return true
	}
	return strings.ToLower(strings.TrimSpace(os.Getenv("TB_MOTION"))) == "reduced"
}

// spinnerFrames are the block-cell spinner steps the design pins.
var spinnerFrames = []string{"[|]", "[/]", "[-]", "[\\]"}

// SpinnerFrame renders spinner step n (0-based). Steps beyond the cap
// park on the final frame so a stuck load never spins forever; the
// reduced path returns static text instead.
func SpinnerFrame(n int) string {
	if Reduced() {
		return "..."
	}
	if n < 0 {
		n = 0
	}
	if n >= SpinnerMaxFrames*len(spinnerFrames) {
		return spinnerFrames[len(spinnerFrames)-1]
	}
	return spinnerFrames[n%len(spinnerFrames)]
}

// SteppedBar renders the 10-cell stepped progress bar: 1 cell per T3
// tick. Counts past total clamp full; the fill is a static snapshot
// on the reduced path (painted once, no tick animation), so the bar
// stays honest without motion.
func SteppedBar(step, total int) string {
	const cells = 10
	if total <= 0 {
		total = 1
	}
	if step < 0 {
		step = 0
	}
	if step > total {
		step = total
	}
	filled := step * cells / total
	var b strings.Builder
	b.WriteString("[")
	for i := 0; i < cells; i++ {
		if i < filled {
			b.WriteString("#")
		} else {
			b.WriteString("-")
		}
	}
	b.WriteString("]")
	return b.String()
}

// FetchLine renders the status-row loading line: spinner plus elapsed
// label plus stepped bar plus the cancel hint past 1000 ms. The
// reduced path renders static text with no spinner frames.
func FetchLine(elapsed time.Duration, step, total int) string {
	ms := int(elapsed / time.Millisecond)
	if ms < 0 {
		ms = 0
	}
	line := "fetch " + itoaLocal(ms) + "ms " + SteppedBar(step, total)
	if Reduced() {
		return "... " + line
	}
	return SpinnerFrame(step) + " " + line + cancelHint(ms)
}

// cancelHint names the cancel key once the load passes one second.
func cancelHint(ms int) string {
	if ms > 1000 {
		return " Ctrl-C cancels"
	}
	return ""
}

// Anchor describes a viewport-displacement cut: one pinned anchor row
// plus a gutter tag held for 1x T2, then settle. Content replacement
// inside a stable viewport takes the zero-frame cut (no anchor).
// Reduced motion takes the static path: 1-row overlap, no hold.
type Anchor struct {
	// Tag is the gutter marker ("N new" or "stale...").
	Tag string
	// Hold is how long the anchor stays pinned. Zero means a
	// zero-frame cut or the reduced static overlap.
	Hold time.Duration
	// Static marks the reduced-motion overlap: painted once, no timer.
	Static bool
}

// AnchorFor builds the displacement anchor for a viewport move
// (pgup/pgdn, search jump, resolve reorder). Tab switches and filter
// swaps pass displacement=false and get the zero-frame cut.
func AnchorFor(displacement bool, tag string) Anchor {
	if !displacement {
		return Anchor{}
	}
	if Reduced() {
		return Anchor{Tag: tag, Static: true}
	}
	return Anchor{Tag: tag, Hold: T2()}
}

// StrobeCollapse reports whether two drawer gestures fall inside one
// 150 ms strobe window: the pair paints only the final state in 1x
// T2 with no intermediate frame.
func StrobeCollapse(first, last time.Time) bool {
	if first.IsZero() || last.IsZero() {
		return false
	}
	d := last.Sub(first)
	if d < 0 {
		d = -d
	}
	return d <= StrobeWindowMs*time.Millisecond
}

// itoaLocal formats a non-negative int without importing extra deps.
func itoaLocal(n int) string {
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
