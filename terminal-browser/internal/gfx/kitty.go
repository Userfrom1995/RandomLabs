package gfx

import (
	"encoding/base64"
	"fmt"
	"io"

	"randomlabs/terminal-browser/internal/term"
)

// Kitty paints through the Kitty graphics protocol: transmit once per
// unique surface (id reuse keyed by exact content hash, then place per
// frame). Identical repeats stay place-only and cheap; distinct frames
// transmit in full (no inter-frame delta codec here). The transmit cache is LRU-capped so long sessions cannot grow server
// memory without bound; evicted ids are explicitly deleted (a=d).
type Kitty struct {
	seen  map[uint64]uint32
	order []uint64
	next  uint32
}

// maxKittyCached caps transmitted surfaces held on the server.
const maxKittyCached = 32

// NewKitty builds a stateful Kitty painter holding the transmit cache.
func NewKitty() *Kitty { return &Kitty{seen: map[uint64]uint32{}} }

// Name identifies the painter in the degrade chain.
func (k *Kitty) Name() string { return "kitty" }

// Paint transmits new surfaces once and places every surface per frame.
func (k *Kitty) Paint(w io.Writer, s Surface, caps term.Capabilities) error {
	if s.CellW < 1 || s.CellH < 1 || s.Img.W < 1 || s.Img.H < 1 || len(s.Img.Pix) == 0 {
		return nil
	}
	h := s.Img.Hash()
	id, known := k.seen[h]
	if !known {
		k.next++
		id = k.next
		k.seen[h] = id
		k.order = append(k.order, h)
		for len(k.order) > maxKittyCached {
			victim := k.order[0]
			k.order = k.order[1:]
			deleteID(w, k.seen[victim])
			delete(k.seen, victim)
		}
		if err := transmit(w, s.Img, id); err != nil {
			return err
		}
	}
	place(w, id, s.CellX+1, s.CellY+1, s.CellW, s.CellH)
	return nil
}

// Delete frees one cached surface on the server (a=d) and forgets it.
func (k *Kitty) Delete(w io.Writer, im Image) {
	h := im.Hash()
	if id, ok := k.seen[h]; ok {
		deleteID(w, id)
		delete(k.seen, h)
		for i, v := range k.order {
			if v == h {
				k.order = append(k.order[:i], k.order[i+1:]...)
				break
			}
		}
	}
}

// Cached reports how many unique surfaces were transmitted so far.
func (k *Kitty) Cached() int { return len(k.seen) }

func transmit(w io.Writer, im Image, id uint32) error {
	raw := make([]byte, 0, len(im.Pix)*3)
	for _, p := range im.Pix {
		raw = append(raw, p.R, p.G, p.B)
	}
	enc := base64.StdEncoding.EncodeToString(raw)
	head := fmt.Sprintf("\x1b_Ga=T,f=24,s=%d,v=%d,i=%d,q=2;", im.W, im.H, id)
	const chunk = 4096
	for len(enc) > chunk {
		io.WriteString(w, head+"m=1;"+enc[:chunk]+"\x1b\\")
		head = "\x1b_G"
		enc = enc[chunk:]
	}
	io.WriteString(w, head+"m=0;"+enc+"\x1b\\")
	return nil
}

func place(w io.Writer, id uint32, col, row, cw, ch int) {
	Cup(w, col, row)
	fmt.Fprintf(w, "\x1b_Ga=p,i=%d,c=%d,r=%d\x1b\\", id, cw, ch)
}

// deleteID frees one server-side image id (a=d).
func deleteID(w io.Writer, id uint32) {
	fmt.Fprintf(w, "\x1b_Ga=d,i=%d\x1b\\", id)
}
