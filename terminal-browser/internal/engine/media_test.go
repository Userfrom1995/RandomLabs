package engine

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"

	"randomlabs/terminal-browser/internal/gfx"
	"randomlabs/terminal-browser/internal/term"
)

// Tiers pace differently: Kitty animates at the 10 fps floor, every
// other tier repaints stills inside the 5 s ceiling.
func TestMediaInterval(t *testing.T) {
	if got := MediaInterval(term.TierKitty); got != MediaAnimInterval {
		t.Fatalf("kitty interval = %v, want %v", got, MediaAnimInterval)
	}
	for _, tier := range []term.GraphicsTier{term.TierBlock, term.TierSixel, term.TierIterm2} {
		if got := MediaInterval(tier); got != MediaStillInterval {
			t.Fatalf("tier %v interval = %v, want %v", tier, got, MediaStillInterval)
		}
	}
}

func TestPickMedia(t *testing.T) {
	els := []MediaElement{
		{Tag: "img", W: 800, H: 600},
		{Tag: "video", W: 100, H: 100},
		{Tag: "video", W: 640, H: 360},
	}
	// Default prefers video, largest first.
	got, err := PickMedia(els, -1)
	if err != nil {
		t.Fatal(err)
	}
	if got.Tag != "video" || got.W != 640 {
		t.Fatalf("pick = %+v, want the 640x360 video", got)
	}
	// Explicit index wins.
	got, err = PickMedia(els, 0)
	if err != nil || got.Tag != "img" {
		t.Fatalf("index 0 = %+v, %v", got, err)
	}
	if _, err := PickMedia(els, 9); err == nil {
		t.Fatal("out-of-range index must fail closed")
	}
	if _, err := PickMedia(nil, -1); err == nil {
		t.Fatal("empty discovery must fail closed")
	}
}

// Element boxes map onto overlay cells inside the frame, never
// outside it.
func TestMediaCellsClamp(t *testing.T) {
	w, h := MediaCells(MediaElement{Tag: "video", W: 640, H: 360}, 80, 24)
	if w <= 0 || h <= 0 || w > 80 || h > 24 {
		t.Fatalf("cells = %dx%d for an 80x24 frame", w, h)
	}
	w, h = MediaCells(MediaElement{Tag: "img", W: 4000, H: 3000}, 80, 24)
	if w != 80 || h != 24 {
		t.Fatalf("huge element must clamp to frame, got %dx%d", w, h)
	}
}

// PNG bytes round-trip into a paint-ready surface with exact pixels.
func TestPNGToImageRoundTrip(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 4, 3))
	src.Set(1, 1, color.NRGBA{R: 200, G: 100, B: 50, A: 255})
	var buf bytes.Buffer
	if err := png.Encode(&buf, src); err != nil {
		t.Fatal(err)
	}
	img, err := PNGToImage(buf.Bytes())
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if img.W != 4 || img.H != 3 {
		t.Fatalf("dims = %dx%d, want 4x3", img.W, img.H)
	}
	if got := img.At(1, 1); got != (term.RGB{R: 200, G: 100, B: 50}) {
		t.Fatalf("pixel = %+v", got)
	}
	if _, err := PNGToImage([]byte("not a png")); err == nil {
		t.Fatal("garbage bytes must fail closed")
	}
}

// The Kitty animation primitive is what makes video cheap: the first
// frame transmits, repeats only place. Ten synthetic frames must cost
// far less than ten transmits and each repeat under a kilobyte.
func TestKittyAnimationBytes(t *testing.T) {
	frame := func(seed uint8) gfx.Image {
		im := gfx.NewImage(64, 48)
		for i := range im.Pix {
			im.Pix[i] = term.RGB{R: seed, G: uint8(i), B: uint8(i >> 3)}
		}
		return im
	}
	k := gfx.NewKitty()
	caps := term.Capabilities{}
	surf := func(im gfx.Image) gfx.Surface {
		return gfx.Surface{Img: im, CellX: 0, CellY: 2, CellW: 40, CellH: 12}
	}
	var first bytes.Buffer
	if _, err := gfx.PaintChain(&first, []gfx.Painter{k}, surf(frame(7)), caps); err != nil {
		t.Fatal(err)
	}
	total := first.Len()
	for f := uint8(8); f < 17; f++ {
		var rep bytes.Buffer
		name, err := gfx.PaintChain(&rep, []gfx.Painter{k}, surf(frame(f)), caps)
		if err != nil {
			t.Fatal(err)
		}
		if name != "kitty" {
			t.Fatalf("painter = %q, want kitty", name)
		}
		if rep.Len() > 1024 {
			t.Fatalf("repeat frame %d bytes, want place-only under 1 KiB", rep.Len())
		}
		total += rep.Len()
	}
	if total >= 10*first.Len() {
		t.Fatalf("10 animated frames cost %d bytes, want far less than 10 transmits (%d)", total, 10*first.Len())
	}
	if k.Cached() > 32 {
		t.Fatalf("kitty cache holds %d surfaces, over the 32 cap", k.Cached())
	}
}

// The bandwidth ledger appends one JSON report per line with private
// permissions.
func TestAppendMediaLog(t *testing.T) {
	path := filepath.Join(t.TempDir(), "media.log")
	rep := &MediaReport{Element: "video 640x360", Tag: "video", Frames: 30, Bytes: 9000, Skipped: 2, FPS: 10, Painter: "kitty"}
	if err := AppendMediaLog(path, rep); err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var back MediaReport
	if err := json.Unmarshal(bytes.TrimSpace(raw), &back); err != nil {
		t.Fatalf("log line: %v", err)
	}
	if back.Frames != 30 || back.Painter != "kitty" {
		t.Fatalf("logged = %+v", back)
	}
	fi, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if fi.Mode().Perm() != 0o600 {
		t.Fatalf("media log mode = %o, want 600", fi.Mode().Perm())
	}
	if err := AppendMediaLog(path, nil); err == nil {
		t.Fatal("nil report must fail closed")
	}
}
