package storage

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"

	"github.com/Userfrom1995/Random/granite/internal/sql"
)

// Column describes a table column.
type Column struct {
	Name string
	Type sql.Type
}

// IndexMeta describes a secondary index.
type IndexMeta struct {
	Name   string
	Column int
}

// TableMeta is the in-memory description of a table.
type TableMeta struct {
	Name    string
	Cols    []Column
	Indexes []IndexMeta
	root    uint32
	ixRoots []uint32
	nextID  int64
}

// ---------- catalog schema serialization ----------

func encodeSchema(m *TableMeta) []byte {
	var b []byte
	b = appendString(b, m.Name)
	b = appendUint16(b, uint16(len(m.Cols)))
	for _, c := range m.Cols {
		b = appendString(b, c.Name)
		b = append(b, encodeType(c.Type))
	}
	b = appendUint32(b, m.root)
	b = appendInt64(b, m.nextID)
	b = appendUint16(b, uint16(len(m.Indexes)))
	for i, ix := range m.Indexes {
		b = appendString(b, ix.Name)
		b = appendUint16(b, uint16(ix.Column))
		b = appendUint32(b, m.ixRoots[i])
	}
	return b
}

func decodeSchema(b []byte) (*TableMeta, error) {
	m := &TableMeta{}
	var err error
	if m.Name, b, err = readString(b); err != nil {
		return nil, err
	}
	n, b, err := readUint16(b)
	if err != nil {
		return nil, err
	}
	for i := 0; i < int(n); i++ {
		var c Column
		if c.Name, b, err = readString(b); err != nil {
			return nil, err
		}
		if len(b) < 1 {
			return nil, errors.New("short schema: column type")
		}
		c.Type = decodeType(b[0])
		b = b[1:]
		m.Cols = append(m.Cols, c)
	}
	if m.root, b, err = readUint32(b); err != nil {
		return nil, err
	}
	if m.nextID, b, err = readInt64(b); err != nil {
		return nil, err
	}
	ni, b, err := readUint16(b)
	if err != nil {
		return nil, err
	}
	for i := 0; i < int(ni); i++ {
		var ix IndexMeta
		if ix.Name, b, err = readString(b); err != nil {
			return nil, err
		}
		var col uint16
		if col, b, err = readUint16(b); err != nil {
			return nil, err
		}
		ix.Column = int(col)
		var root uint32
		if root, b, err = readUint32(b); err != nil {
			return nil, err
		}
		m.Indexes = append(m.Indexes, ix)
		m.ixRoots = append(m.ixRoots, root)
	}
	return m, nil
}

func appendString(b []byte, s string) []byte {
	b = appendUint16(b, uint16(len(s)))
	return append(b, s...)
}

func readString(b []byte) (string, []byte, error) {
	n, b, err := readUint16(b)
	if err != nil {
		return "", nil, err
	}
	if len(b) < int(n) {
		return "", nil, errors.New("short schema: string")
	}
	return string(b[:n]), b[n:], nil
}

func appendUint16(b []byte, v uint16) []byte {
	return binary.BigEndian.AppendUint16(b, v)
}

func readUint16(b []byte) (uint16, []byte, error) {
	if len(b) < 2 {
		return 0, nil, errors.New("short schema: uint16")
	}
	return binary.BigEndian.Uint16(b), b[2:], nil
}

func appendUint32(b []byte, v uint32) []byte {
	return binary.BigEndian.AppendUint32(b, v)
}

func readUint32(b []byte) (uint32, []byte, error) {
	if len(b) < 4 {
		return 0, nil, errors.New("short schema: uint32")
	}
	return binary.BigEndian.Uint32(b), b[4:], nil
}

func appendInt64(b []byte, v int64) []byte {
	return binary.BigEndian.AppendUint64(b, uint64(v))
}

func readInt64(b []byte) (int64, []byte, error) {
	if len(b) < 8 {
		return 0, nil, errors.New("short schema: int64")
	}
	return int64(binary.BigEndian.Uint64(b)), b[8:], nil
}

// type byte codes used in schema serialization
const (
	typeCodeInt  = 0
	typeCodeReal = 1
	typeCodeText = 2
)

func encodeType(t sql.Type) byte {
	switch t {
	case sql.TypeInt:
		return typeCodeInt
	case sql.TypeReal:
		return typeCodeReal
	case sql.TypeText:
		return typeCodeText
	}
	return typeCodeText
}

func decodeType(b byte) sql.Type {
	switch b {
	case typeCodeInt:
		return sql.TypeInt
	case typeCodeReal:
		return sql.TypeReal
	}
	return sql.TypeText
}

// Database is an open Granite database file.
type Database struct {
	pager   *Pager
	catalog *BTree
	cache   map[string]*TableMeta
}

// CreateDatabase creates a new database file at path.
func CreateDatabase(path string) (*Database, error) {
	p, err := createPager(path)
	if err != nil {
		return nil, err
	}
	db := &Database{pager: p, cache: map[string]*TableMeta{}}
	if err := db.initCatalog(); err != nil {
		p.Close()
		return nil, err
	}
	return db, nil
}

// OpenDatabase opens an existing database file at path.
func OpenDatabase(path string) (*Database, error) {
	p, err := openPager(path)
	if err != nil {
		return nil, err
	}
	db := &Database{pager: p, cache: map[string]*TableMeta{}}
	db.catalog = newBTree(p, p.h.catalogRoot)
	return db, nil
}

func (db *Database) Close() error {
	return db.pager.Close()
}

func (db *Database) initCatalog() error {
	root, err := db.pager.allocPage()
	if err != nil {
		return err
	}
	db.pager.h.catalogRoot = root
	db.pager.markHeaderDirty()
	db.catalog = newBTree(db.pager, root)
	return nil
}

// inTxn reports whether a transaction is active.
func (db *Database) inTxn() bool { return db.pager.inTxn() }

// Begin starts a transaction.
func (db *Database) Begin() error { return db.pager.Begin() }

// Commit commits the active transaction.
func (db *Database) Commit() error { return db.pager.Commit() }

// Rollback rolls back the active transaction.
func (db *Database) Rollback() error { return db.pager.Rollback() }

// ---------- table management ----------

// CreateTable creates a new table.
func (db *Database) CreateTable(name string, cols []Column) error {
	if _, err := db.GetTable(name); err == nil {
		return fmt.Errorf("table %q already exists", name)
	}
	root, err := db.pager.allocPage()
	if err != nil {
		return err
	}
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	binary.BigEndian.PutUint16(page[1:3], 0)
	if err := db.pager.writePage(root, page); err != nil {
		return err
	}
	m := &TableMeta{Name: strings.ToLower(name), Cols: cols, root: root, nextID: 1}
	if err := db.saveTable(m); err != nil {
		return err
	}
	db.cache[m.Name] = m
	return nil
}

// DropTable removes a table and all its data.
func (db *Database) DropTable(name string) error {
	m, err := db.GetTable(name)
	if err != nil {
		return err
	}
	tree := newBTree(db.pager, m.root)
	if err := tree.Destroy(); err != nil {
		return err
	}
	for _, r := range m.ixRoots {
		it := newBTree(db.pager, r)
		if err := it.Destroy(); err != nil {
			return err
		}
	}
	if _, err := db.catalog.Delete([]byte(m.Name)); err != nil {
		return err
	}
	delete(db.cache, m.Name)
	return nil
}

// GetTable returns the table with the given name.
func (db *Database) GetTable(name string) (*TableMeta, error) {
	name = strings.ToLower(name)
	if m, ok := db.cache[name]; ok {
		return m, nil
	}
	raw, found, err := db.catalog.Find([]byte(name))
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("no such table: %s", name)
	}
	m, err := decodeSchema(raw)
	if err != nil {
		return nil, err
	}
	db.cache[name] = m
	return m, nil
}

// Tables lists the names of all tables.
func (db *Database) Tables() ([]string, error) {
	var names []string
	err := db.catalog.Walk(nil, nil, func(k, _ []byte) bool {
		names = append(names, string(k))
		return true
	})
	return names, err
}

// CreateIndex creates a secondary index on a single column.
func (db *Database) CreateIndex(t *TableMeta, name, column string) error {
	colIdx := -1
	for i, c := range t.Cols {
		if strings.EqualFold(c.Name, column) {
			colIdx = i
			break
		}
	}
	if colIdx < 0 {
		return fmt.Errorf("no such column: %s", column)
	}
	for _, ix := range t.Indexes {
		if ix.Name == name {
			return fmt.Errorf("index %q already exists", name)
		}
	}
	root, err := db.pager.allocPage()
	if err != nil {
		return err
	}
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	binary.BigEndian.PutUint16(page[1:3], 0)
	if err := db.pager.writePage(root, page); err != nil {
		return err
	}
	ixMeta := IndexMeta{Name: name, Column: colIdx}
	// Populate the index from existing rows.
	var rows []*rowRef
	err = db.scanRows(t, func(rid int64, vals []sql.Value) bool {
		rows = append(rows, &rowRef{rid: rid, vals: vals})
		return true
	})
	if err != nil {
		return err
	}
	it := newBTree(db.pager, root)
	for _, r := range rows {
		key := indexKey(t, r.vals, ixMeta, r.rid)
		if err := it.Insert(key, rowKey(r.rid)); err != nil {
			return err
		}
	}
	t.Indexes = append(t.Indexes, ixMeta)
	t.ixRoots = append(t.ixRoots, root)
	if err := db.saveTable(t); err != nil {
		return err
	}
	return nil
}

type rowRef struct {
	rid  int64
	vals []sql.Value
}

func (db *Database) saveTable(t *TableMeta) error {
	return db.catalog.Insert([]byte(t.Name), encodeSchema(t))
}

// ---------- rows ----------

// InsertRow adds a row and returns its rowid.
func (db *Database) InsertRow(t *TableMeta, vals []sql.Value) (int64, error) {
	rid := t.nextID
	encoded := encodeRow(vals)
	tree := newBTree(db.pager, t.root)
	if err := tree.Insert(rowKey(rid), encoded); err != nil {
		return 0, err
	}
	for i := range t.Indexes {
		it := newBTree(db.pager, t.ixRoots[i])
		key := indexKey(t, vals, t.Indexes[i], rid)
		if err := it.Insert(key, rowKey(rid)); err != nil {
			return 0, err
		}
	}
	t.nextID++
	if err := db.saveTable(t); err != nil {
		return 0, err
	}
	return rid, nil
}

// GetRow returns the row with the given rowid.
func (db *Database) GetRow(t *TableMeta, rid int64) ([]sql.Value, error) {
	raw, found, err := newBTree(db.pager, t.root).Find(rowKey(rid))
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("row %d not found", rid)
	}
	return decodeRow(raw, len(t.Cols))
}

// UpdateRow replaces the values of an existing row, maintaining indexes.
func (db *Database) UpdateRow(t *TableMeta, rid int64, vals []sql.Value) error {
	old, err := db.GetRow(t, rid)
	if err != nil {
		return err
	}
	for i := range t.Indexes {
		it := newBTree(db.pager, t.ixRoots[i])
		oldKey := indexKey(t, old, t.Indexes[i], rid)
		newKey := indexKey(t, vals, t.Indexes[i], rid)
		if !bytes.Equal(oldKey, newKey) {
			if _, err := it.Delete(oldKey); err != nil {
				return err
			}
			if err := it.Insert(newKey, rowKey(rid)); err != nil {
				return err
			}
		}
	}
	tree := newBTree(db.pager, t.root)
	if err := tree.Insert(rowKey(rid), encodeRow(vals)); err != nil {
		return err
	}
	return nil
}

// DeleteRow removes a row and its index entries.
func (db *Database) DeleteRow(t *TableMeta, rid int64) error {
	old, err := db.GetRow(t, rid)
	if err != nil {
		return err
	}
	for i := range t.Indexes {
		it := newBTree(db.pager, t.ixRoots[i])
		key := indexKey(t, old, t.Indexes[i], rid)
		if _, err := it.Delete(key); err != nil {
			return err
		}
	}
	tree := newBTree(db.pager, t.root)
	if _, err := tree.Delete(rowKey(rid)); err != nil {
		return err
	}
	return nil
}

// ScanRows iterates all rows in rowid order.
func (db *Database) ScanRows(t *TableMeta, fn func(rid int64, vals []sql.Value) bool) error {
	tree := newBTree(db.pager, t.root)
	return tree.Walk(nil, nil, func(k, v []byte) bool {
		vals, err := decodeRow(v, len(t.Cols))
		if err != nil {
			return false
		}
		return fn(keyRowid(k), vals)
	})
}

func (db *Database) scanRows(t *TableMeta, fn func(rid int64, vals []sql.Value) bool) error {
	return db.ScanRows(t, fn)
}

// IndexRoot returns the root page of an index tree.
func (db *Database) IndexRoot(t *TableMeta, i int) uint32 {
	return t.ixRoots[i]
}

// indexKey encodes (column value, rowid) for an index entry.
func indexKey(t *TableMeta, vals []sql.Value, ix IndexMeta, rid int64) []byte {
	key := append([]byte(nil), encodeValue(vals[ix.Column])...)
	key = append(key, rowKey(rid)...)
	return key
}

// indexValueLen returns the byte length of the encoded value prefix of an
// index key.
func indexValueLen(k []byte) int {
	if len(k) == 0 {
		return 0
	}
	switch k[0] {
	case tagNull:
		return 1
	case tagInt, tagReal:
		return 9
	case tagText:
		if len(k) < 5 {
			return len(k)
		}
		return 5 + int(binary.BigEndian.Uint32(k[1:5]))
	}
	return 0
}

// indexRows walks an index in value order, calling fn with each rowid.
func (db *Database) indexRows(t *TableMeta, ix int, start, end []byte, fn func(rid int64) bool) error {
	it := newBTree(db.pager, t.ixRoots[ix])
	return it.Walk(start, end, func(k, _ []byte) bool {
		off := indexValueLen(k)
		if off >= len(k) {
			return false
		}
		return fn(keyRowid(k[off:]))
	})
}

// IndexRowsPublic walks a full index, calling fn with each rowid.
func (db *Database) IndexRowsPublic(t *TableMeta, ix int, fn func(rid int64) bool) error {
	return db.indexRows(t, ix, nil, nil, fn)
}

func (db *Database) indexRowsPublic(t *TableMeta, ix int, fn func(rid int64) bool) error {
	return db.indexRows(t, ix, nil, nil, fn)
}

// IndexLookupEq finds rowids whose indexed column equals a value, using the
// index for an ordered scan that stops when the value prefix changes.
func (db *Database) IndexLookupEq(t *TableMeta, ix int, v sql.Value, fn func(rid int64) bool) error {
	prefix := encodeValue(v)
	start := prefix
	var end []byte
	switch prefix[0] {
	case tagNull:
		end = []byte{tagNull + 1}
	case tagInt, tagReal:
		end = []byte{prefix[0] + 1}
	case tagText:
		n := len(prefix)
		end = append([]byte(nil), prefix[:n-1]...)
		end = append(end, prefix[n-1]+1)
	}
	return db.indexRows(t, ix, start, end, fn)
}

// IndexLookupRange finds rowids whose indexed column lies in [lo, hi]
// (either may be nil), using an ordered index scan.
func (db *Database) IndexLookupRange(t *TableMeta, ix int, lo, hi *sql.Value, fn func(rid int64) bool) error {
	var start, end []byte
	if lo != nil {
		start = encodeValue(*lo)
	}
	if hi != nil {
		prefix := encodeValue(*hi)
		end = append([]byte(nil), prefix...)
		// exclusive upper bound: bump the final byte
		for i := len(end) - 1; i >= 0; i-- {
			if end[i] < 0xff {
				end[i]++
				break
			}
			end[i] = 0
		}
	}
	return db.indexRows(t, ix, start, end, fn)
}