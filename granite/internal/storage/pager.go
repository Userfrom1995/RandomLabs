package storage

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
)

// PageSize is the fixed byte size of every page in a Granite database file.
const PageSize = 4096

// magic is the file signature stored in page 0.
var magic = [8]byte{'G', 'R', 'A', 'N', 'I', 'T', 'E', '1'}

const (
	headerVersion    = 1
	headerMagicOff   = 0
	headerVersionOff = 8
	headerPageSize   = 10
	headerCatalogOff = 12
	headerNumPages   = 16
	headerFreeHead   = 20
	headerSize       = 24
)

// header is the metadata block stored at the start of page 0.
type header struct {
	catalogRoot uint32
	numPages    uint32
	freeHead    uint32
}

func (h *header) marshal() []byte {
	b := make([]byte, PageSize)
	copy(b[headerMagicOff:], magic[:])
	binary.BigEndian.PutUint16(b[headerVersionOff:], headerVersion)
	binary.BigEndian.PutUint16(b[headerPageSize:], PageSize)
	binary.BigEndian.PutUint32(b[headerCatalogOff:], h.catalogRoot)
	binary.BigEndian.PutUint32(b[headerNumPages:], h.numPages)
	binary.BigEndian.PutUint32(b[headerFreeHead:], h.freeHead)
	return b
}

func parseHeader(b []byte) (header, error) {
	var h header
	if len(b) < headerSize {
		return h, errors.New("file too small to be a Granite database")
	}
	if string(b[headerMagicOff:headerMagicOff+8]) != string(magic[:]) {
		return h, errors.New("not a Granite database (bad magic)")
	}
	if v := binary.BigEndian.Uint16(b[headerVersionOff:]); v != headerVersion {
		return h, fmt.Errorf("unsupported Granite version %d", v)
	}
	if ps := binary.BigEndian.Uint16(b[headerPageSize:]); ps != PageSize {
		return h, fmt.Errorf("unexpected page size %d", ps)
	}
	h.catalogRoot = binary.BigEndian.Uint32(b[headerCatalogOff:])
	h.numPages = binary.BigEndian.Uint32(b[headerNumPages:])
	h.freeHead = binary.BigEndian.Uint32(b[headerFreeHead:])
	return h, nil
}

// Pager provides paged, transactional access to a database file. Writes are
// buffered in a page cache; Commit() flushes them to disk and Rollback()
// discards them.
type Pager struct {
	file  *os.File
	h     header
	cache map[uint32][]byte
	dirty map[uint32]bool
	txn   bool
	saved header
	snap  map[uint32][]byte
	// savedDirty captures the dirty set at Begin so Rollback can restore it
	// exactly.
	savedDirty map[uint32]bool
}

// openPager opens an existing Granite database file.
func openPager(path string) (*Pager, error) {
	f, err := os.OpenFile(path, os.O_RDWR, 0o644)
	if err != nil {
		return nil, err
	}
	buf := make([]byte, headerSize)
	if _, err := f.ReadAt(buf, 0); err != nil {
		f.Close()
		return nil, err
	}
	h, err := parseHeader(buf)
	if err != nil {
		f.Close()
		return nil, err
	}
	return &Pager{file: f, h: h, cache: map[uint32][]byte{}, dirty: map[uint32]bool{}}, nil
}

// createPager creates a new empty Granite database file.
func createPager(path string) (*Pager, error) {
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return nil, err
	}
	p := &Pager{file: f, h: header{numPages: 1}, cache: map[uint32][]byte{}, dirty: map[uint32]bool{}}
	if err := p.writePage(0, p.h.marshal()); err != nil {
		f.Close()
		return nil, err
	}
	return p, nil
}

func (p *Pager) Close() error {
	// Persist any unflushed writes (e.g. statements issued outside an
	// explicit transaction). An open transaction is discarded.
	if !p.txn {
		if err := p.flush(); err != nil {
			_ = p.file.Close()
			return err
		}
	}
	return p.file.Close()
}

// pageBytes returns the number of pages currently in the file.
func (p *Pager) pageBytes() int { return int(p.h.numPages) * PageSize }

func (p *Pager) readPage(n uint32) ([]byte, error) {
	if b, ok := p.cache[n]; ok {
		out := make([]byte, PageSize)
		copy(out, b)
		return out, nil
	}
	off := int64(n) * PageSize
	buf := make([]byte, PageSize)
	if _, err := p.file.ReadAt(buf, off); err != nil && err != io.EOF {
		return nil, err
	}
	p.cache[n] = buf
	out := make([]byte, PageSize)
	copy(out, buf)
	return out, nil
}

func (p *Pager) writePage(n uint32, data []byte) error {
	if len(data) != PageSize {
		return fmt.Errorf("page %d: wrong size %d", n, len(data))
	}
	buf := make([]byte, PageSize)
	copy(buf, data)
	p.cache[n] = buf
	p.dirty[n] = true
	return nil
}

func (p *Pager) flushPage(n uint32) error {
	b, ok := p.cache[n]
	if !ok {
		return fmt.Errorf("flush: page %d not cached", n)
	}
	off := int64(n) * PageSize
	if _, err := p.file.WriteAt(b, off); err != nil {
		return err
	}
	return nil
}

// allocPage returns a free page number, growing the file if needed.
func (p *Pager) allocPage() (uint32, error) {
	if p.h.freeHead != 0 {
		n := p.h.freeHead
		b, err := p.readPage(n)
		if err != nil {
			return 0, err
		}
		p.h.freeHead = binary.BigEndian.Uint32(b[:4])
		p.markHeaderDirty()
		return n, nil
	}
	n := p.h.numPages
	p.h.numPages++
	p.markHeaderDirty()
	return n, nil
}

// freePage adds a page to the free list.
func (p *Pager) freePage(n uint32) error {
	b := make([]byte, PageSize)
	binary.BigEndian.PutUint32(b[:4], p.h.freeHead)
	if err := p.writePage(n, b); err != nil {
		return err
	}
	p.h.freeHead = n
	p.markHeaderDirty()
	return nil
}

func (p *Pager) markHeaderDirty() {
	p.dirty[0] = true
	p.cache[0] = p.h.marshal()
}

func (p *Pager) writeHeader() error {
	if err := p.writePage(0, p.h.marshal()); err != nil {
		return err
	}
	return nil
}

// Begin starts a transaction. Writes are buffered until Commit or Rollback.
// The current cache is snapshotted so Rollback can restore exactly what was
// on disk (or in the cache) before the transaction began.
func (p *Pager) Begin() error {
	if p.txn {
		return errors.New("transaction already active")
	}
	p.saved = p.h
	p.snap = make(map[uint32][]byte, len(p.cache))
	for n, b := range p.cache {
		cp := make([]byte, PageSize)
		copy(cp, b)
		p.snap[n] = cp
	}
	p.savedDirty = make(map[uint32]bool, len(p.dirty))
	for n := range p.dirty {
		p.savedDirty[n] = true
	}
	p.txn = true
	return nil
}

// Commit flushes all buffered writes to disk.
func (p *Pager) Commit() error {
	if !p.txn {
		return errors.New("no active transaction")
	}
	if err := p.flush(); err != nil {
		return err
	}
	p.snap = nil
	p.savedDirty = nil
	p.txn = false
	return nil
}

// flush writes every dirty page to disk and syncs the file. It is used by
// Commit and by the auto-commit path that persists statements issued outside
// an explicit transaction.
func (p *Pager) flush() error {
	// Flush all dirty data pages first, then the header page last.
	var pages []uint32
	for n := range p.dirty {
		if n != 0 {
			pages = append(pages, n)
		}
	}
	sortUint32(pages)
	for _, n := range pages {
		if err := p.flushPage(n); err != nil {
			return err
		}
	}
	if p.dirty[0] {
		if err := p.writeHeader(); err != nil {
			return err
		}
		if err := p.flushPage(0); err != nil {
			return err
		}
	}
	if err := p.file.Sync(); err != nil {
		return err
	}
	p.dirty = map[uint32]bool{}
	return nil
}

// AutoCommit persists any pending writes. It is a no-op while a transaction
// is active; only the transaction's Commit may flush then.
func (p *Pager) AutoCommit() error {
	if p.txn {
		return nil
	}
	return p.flush()
}

// Rollback discards all buffered writes, restoring the state captured by
// Begin.
func (p *Pager) Rollback() error {
	if !p.txn {
		return errors.New("no active transaction")
	}
	for n := range p.cache {
		if sb, ok := p.snap[n]; ok {
			cp := make([]byte, PageSize)
			copy(cp, sb)
			p.cache[n] = cp
		} else {
			delete(p.cache, n)
		}
	}
	p.dirty = make(map[uint32]bool, len(p.savedDirty))
	for n := range p.savedDirty {
		p.dirty[n] = true
	}
	p.h = p.saved
	p.snap = nil
	p.savedDirty = nil
	p.txn = false
	return nil
}

// inTxn reports whether a transaction is active.
func (p *Pager) inTxn() bool { return p.txn }

func sortUint32(s []uint32) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}

// rollbackOrCommit is a helper: on success commit, on failure rollback.
func (p *Pager) finish(ok bool) error {
	if ok {
		return p.Commit()
	}
	_ = p.Rollback()
	return nil
}