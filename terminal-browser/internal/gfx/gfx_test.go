package gfx

import (
	"bytes"
	"strings"
	"testing"

	"randomlabs/terminal-browser/internal/term"
)

func testCaps() term.Capabilities {
	return term.Capabilities{Width: 80, Height: 24, TrueColor: true, Tier: term.TierBlock}
}

func sampleImage() Image {
	im := NewImage(16, 8)
	for y := 0; y < 8; y++ {
		for x := 0; x < 16; x++ {
			im.Pix[y*16+x] = term.RGB{R: uint8(x * 16), G: uint8(y * 32), B: 128}
		}
	}
	return im
}

func TestKittyTransmitOnce(t *testing.T) {
	k := NewKitty()
	caps := testCaps()
	caps.Tier = term.TierKitty
	s := Surface{Img: sampleImage(), CellW: 8, CellH: 4}
	var first bytes.Buffer
	if err := k.Paint(&first, s, caps); err != nil {
		t.Fatal(err)
	}
	var second bytes.Buffer
	if err := k.Paint(&second, s, caps); err != nil {
		t.Fatal(err)
	}
	if second.Len() >= first.Len() {
		t.Fatalf("second paint must be placement-only: first=%d second=%d", first.Len(), second.Len())
	}
	if !strings.Contains(first.String(), "a=T") || !strings.Contains(second.String(), "a=p") {
		t.Fatal("missing transmit/place verbs")
	}
	if k.Cached() != 1 {
		t.Fatalf("expected 1 cached surface, got %d", k.Cached())
	}
}

func TestSixelEnvelope(t *testing.T) {
	var buf bytes.Buffer
	caps := testCaps()
	caps.Tier = term.TierSixel
	if err := (Sixel{}).Paint(&buf, Surface{Img: sampleImage(), CellW: 8, CellH: 4}, caps); err != nil {
		t.Fatal(err)
	}
	s := buf.String()
	if !strings.HasPrefix(s, "\x1b[") || !strings.Contains(s, "\x1bPq") || !strings.HasSuffix(s, "\x1b\\") {
		t.Fatalf("bad sixel envelope: %q", s[:min(60, len(s))])
	}
}

func TestIterm2Dedup(t *testing.T) {
	p := NewIterm2()
	caps := testCaps()
	caps.Tier = term.TierIterm2
	s := Surface{Img: sampleImage(), CellW: 8, CellH: 4}
	var first bytes.Buffer
	if err := p.Paint(&first, s, caps); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(first.String(), "1337;File=inline=1") {
		t.Fatal("missing iterm2 inline header")
	}
	var second bytes.Buffer
	if err := p.Paint(&second, s, caps); err != nil {
		t.Fatal(err)
	}
	if second.Len() != 0 {
		t.Fatalf("repeat still must be a no-op, got %d bytes", second.Len())
	}
}

func TestBlockDiff(t *testing.T) {
	b := NewBlock()
	caps := testCaps()
	a := term.NewFrame(20, 6)
	a.WriteText(0, 0, "hello world", term.RGB{R: 255}, term.RGB{})
	var full bytes.Buffer
	if n := b.PaintCells(&full, a, nil, caps); n != 120 {
		t.Fatalf("full repaint must cover 120 cells, got %d", n)
	}
	var empty bytes.Buffer
	if n := b.PaintCells(&empty, a, a, caps); n != 0 {
		t.Fatalf("identical frame must repaint 0 cells, got %d", n)
	}
	if empty.Len() > 32 {
		t.Fatalf("identical frame must be near-silent, got %d bytes", empty.Len())
	}
}

func TestSelectForcedBlock(t *testing.T) {
	caps := testCaps()
	caps.ForcedBlock = true
	painters := map[string]Painter{"block": NewBlock(), "kitty": NewKitty()}
	chain := Select(caps, painters)
	if len(chain) != 1 || chain[0].Name() != "block" {
		t.Fatalf("multiplexer must force block-only, got %v", chain)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
