package term

import (
	"os"
	"strings"
	"testing"
	"time"
)

// saveEnv snapshots the motion env vars for restore after the test.
func saveEnv() (red, tbm string, hasRed, hasTBM bool) {
	red, hasRed = os.LookupEnv("REDUCED_MOTION")
	tbm, hasTBM = os.LookupEnv("TB_MOTION")
	return red, tbm, hasRed, hasTBM
}

func restoreEnv(red, tbm string, hasRed, hasTBM bool) {
	if hasRed {
		_ = os.Setenv("REDUCED_MOTION", red)
	} else {
		_ = os.Unsetenv("REDUCED_MOTION")
	}
	if hasTBM {
		_ = os.Setenv("TB_MOTION", tbm)
	} else {
		_ = os.Unsetenv("TB_MOTION")
	}
}

func TestTickConstants(t *testing.T) {
	if T1Ms != 33 || T2Ms != 50 || T3Ms != 100 {
		t.Fatalf("tick table drift: T1=%d T2=%d T3=%d, want 33/50/100", T1Ms, T2Ms, T3Ms)
	}
	if StrobeWindowMs != 150 {
		t.Fatalf("strobe window drift: %d, want 150", StrobeWindowMs)
	}
	if T1() != 33*time.Millisecond || T2() != 50*time.Millisecond || T3() != 100*time.Millisecond {
		t.Fatalf("tick accessors drift: %v %v %v", T1(), T2(), T3())
	}
}

func TestReducedMotionSources(t *testing.T) {
	oldForce := forcedReduced
	red, tbm, hasRed, hasTBM := saveEnv()
	defer func() {
		forcedReduced = oldForce
		restoreEnv(red, tbm, hasRed, hasTBM)
	}()
	forcedReduced = false
	_ = os.Unsetenv("REDUCED_MOTION")
	_ = os.Unsetenv("TB_MOTION")
	if Reduced() {
		t.Fatalf("reduced must default off")
	}
	_ = os.Setenv("REDUCED_MOTION", "1")
	if !Reduced() {
		t.Fatalf("REDUCED_MOTION=1 must enable reduced")
	}
	_ = os.Unsetenv("REDUCED_MOTION")
	_ = os.Setenv("TB_MOTION", "reduced")
	if !Reduced() {
		t.Fatalf("TB_MOTION=reduced must enable reduced")
	}
	_ = os.Unsetenv("TB_MOTION")
	SetReduced(true)
	if !Reduced() {
		t.Fatalf("flag override must enable reduced")
	}
	SetReduced(false)
}

func TestSpinnerAndBar(t *testing.T) {
	old := forcedReduced
	forcedReduced = false
	defer func() { forcedReduced = old }()
	frames := map[string]bool{}
	for i := 0; i < 4; i++ {
		frames[SpinnerFrame(i)] = true
	}
	if len(frames) != 4 {
		t.Fatalf("spinner must cycle 4 distinct frames, got %v", frames)
	}
	if got := SteppedBar(0, 10); got != "[----------]" {
		t.Fatalf("empty bar drift: %q", got)
	}
	if got := SteppedBar(10, 10); got != "[##########]" {
		t.Fatalf("full bar drift: %q", got)
	}
	if got := SteppedBar(5, 10); got != "[#####-----]" {
		t.Fatalf("half bar drift: %q", got)
	}
	line := FetchLine(250*time.Millisecond, 2, 10)
	if !strings.Contains(line, "fetch 250ms") || !strings.Contains(line, "[") {
		t.Fatalf("fetch line must carry elapsed plus bar: %q", line)
	}
	if late := FetchLine(1500*time.Millisecond, 9, 10); !strings.Contains(late, "Ctrl-C cancels") {
		t.Fatalf("late fetch line must name cancel: %q", late)
	}
}

func TestReducedSpinnerStatic(t *testing.T) {
	old := forcedReduced
	forcedReduced = true
	defer func() { forcedReduced = old }()
	if got := SpinnerFrame(3); got != "..." {
		t.Fatalf("reduced spinner must be static text, got %q", got)
	}
	if line := FetchLine(250*time.Millisecond, 2, 10); strings.Contains(line, "[|]") || strings.Contains(line, "[/]") {
		t.Fatalf("reduced fetch line must not animate: %q", line)
	}
}

func TestAnchorPolicy(t *testing.T) {
	old := forcedReduced
	forcedReduced = false
	defer func() { forcedReduced = old }()
	if a := AnchorFor(false, "3 new"); a.Hold != 0 || a.Static {
		t.Fatalf("stable-viewport replace must be a zero-frame cut: %+v", a)
	}
	if a := AnchorFor(true, "3 new"); a.Hold != 50*time.Millisecond || a.Static || a.Tag != "3 new" {
		t.Fatalf("displacement must pin 1xT2 with the tag: %+v", a)
	}
	forcedReduced = true
	if a := AnchorFor(true, "stale..."); !a.Static || a.Hold != 0 {
		t.Fatalf("reduced displacement must be a static overlap with no hold: %+v", a)
	}
}

func TestStrobeCollapse(t *testing.T) {
	now := time.Now()
	if !StrobeCollapse(now, now.Add(100*time.Millisecond)) {
		t.Fatalf("gestures 100ms apart must collapse")
	}
	if StrobeCollapse(now, now.Add(300*time.Millisecond)) {
		t.Fatalf("gestures 300ms apart must paint separately")
	}
	if StrobeCollapse(time.Time{}, now) {
		t.Fatalf("zero times must never collapse")
	}
}

func TestMotionBoundaries(t *testing.T) {
	old := forcedReduced
	forcedReduced = false
	defer func() { forcedReduced = old }()
	// Spinner clamps: negative parks on frame 0, far-past parks on
	// the final frame so a stuck load never spins forever.
	if got := SpinnerFrame(-3); got != spinnerFrames[0] {
		t.Fatalf("negative spinner must park on frame 0, got %q", got)
	}
	if got := SpinnerFrame(SpinnerMaxFrames*len(spinnerFrames) + 40); got != spinnerFrames[len(spinnerFrames)-1] {
		t.Fatalf("over-cap spinner must park on the final frame, got %q", got)
	}
	// SteppedBar clamps: negative steps empty, past-total full,
	// zero total treated as a single cell.
	if got := SteppedBar(-5, 10); got != "[----------]" {
		t.Fatalf("negative step must clamp empty, got %q", got)
	}
	if got := SteppedBar(99, 10); got != "[##########]" {
		t.Fatalf("past-total step must clamp full, got %q", got)
	}
	if got := SteppedBar(0, 0); got != "[----------]" {
		t.Fatalf("zero total must render empty, got %q", got)
	}
	if got := SteppedBar(1, 0); got != "[##########]" {
		t.Fatalf("zero total with progress must render full, got %q", got)
	}
	// FetchLine clamps negative elapsed to zero.
	if line := FetchLine(-250*time.Millisecond, 2, 10); !strings.Contains(line, "fetch 0ms") {
		t.Fatalf("negative elapsed must clamp to 0ms: %q", line)
	}
	// Strobe edges: exact-150 ms collapses, reversed order uses the
	// absolute gap so argument order never matters.
	now := time.Now()
	if !StrobeCollapse(now, now.Add(150*time.Millisecond)) {
		t.Fatalf("exact-150ms gestures must collapse")
	}
	if !StrobeCollapse(now.Add(100*time.Millisecond), now) {
		t.Fatalf("reversed-order gestures 100ms apart must collapse")
	}
	// Reduced plus zero displacement stays a zero-frame cut: the
	// stable-viewport path never gains a static anchor.
	forcedReduced = true
	if a := AnchorFor(false, "3 new"); a.Hold != 0 || a.Static || a.Tag != "" {
		t.Fatalf("reduced stable-viewport replace must stay a zero-frame cut: %+v", a)
	}
	// Reduced stepped bar is a static snapshot: same fill, painted
	// once, with no spinner frames.
	forcedReduced = false
	plain := SteppedBar(5, 10)
	forcedReduced = true
	if got := SteppedBar(5, 10); got != plain {
		t.Fatalf("reduced bar must match the static snapshot %q, got %q", plain, got)
	}
}
