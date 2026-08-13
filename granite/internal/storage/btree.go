package storage

import (
	"bytes"
	"encoding/binary"
	"errors"
)

const (
	nodeLeaf     = 1
	nodeInternal = 2
	maxNodeBytes = PageSize - 64
	minFill      = maxNodeBytes / 4
)

// BTree is an on-page ordered key/value store. Keys and values are arbitrary
// byte slices ordered by bytes.Compare.
type BTree struct {
	pager *Pager
	root  uint32
}

func newBTree(p *Pager, root uint32) *BTree {
	return &BTree{pager: p, root: root}
}

// newEmptyLeaf allocates a fresh leaf page.
func (t *BTree) newEmptyLeaf() (uint32, error) {
	n, err := t.pager.allocPage()
	if err != nil {
		return 0, err
	}
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	binary.BigEndian.PutUint16(page[1:3], 0)
	if err := t.pager.writePage(n, page); err != nil {
		return 0, err
	}
	return n, nil
}

// ---------- serialization helpers ----------

type leafEntry struct {
	key   []byte
	value []byte
}

func parseLeaf(page []byte) ([]leafEntry, error) {
	if page[0] != nodeLeaf {
		return nil, errors.New("btree: not a leaf page")
	}
	count := int(binary.BigEndian.Uint16(page[1:3]))
	off := 3
	entries := make([]leafEntry, 0, count)
	for i := 0; i < count; i++ {
		if off+2 > PageSize {
			return nil, errors.New("btree: corrupt leaf page")
		}
		kl := int(binary.BigEndian.Uint16(page[off:]))
		off += 2
		if off+kl > PageSize {
			return nil, errors.New("btree: corrupt leaf page")
		}
		key := append([]byte(nil), page[off:off+kl]...)
		off += kl
		if off+2 > PageSize {
			return nil, errors.New("btree: corrupt leaf page")
		}
		vl := int(binary.BigEndian.Uint16(page[off:]))
		off += 2
		if off+vl > PageSize {
			return nil, errors.New("btree: corrupt leaf page")
		}
		value := append([]byte(nil), page[off:off+vl]...)
		off += vl
		entries = append(entries, leafEntry{key: key, value: value})
	}
	return entries, nil
}

func buildLeaf(entries []leafEntry) ([]byte, error) {
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	if len(entries) > 65535 {
		return nil, errors.New("btree: too many leaf entries")
	}
	binary.BigEndian.PutUint16(page[1:3], uint16(len(entries)))
	off := 3
	for _, e := range entries {
		if len(e.key) > 65535 || len(e.value) > 65535 {
			return nil, errors.New("btree: entry too large")
		}
		if off+2+len(e.key)+2+len(e.value) > PageSize {
			return nil, errors.New("btree: leaf page overflow")
		}
		binary.BigEndian.PutUint16(page[off:], uint16(len(e.key)))
		off += 2
		copy(page[off:], e.key)
		off += len(e.key)
		binary.BigEndian.PutUint16(page[off:], uint16(len(e.value)))
		off += 2
		copy(page[off:], e.value)
		off += len(e.value)
	}
	return page, nil
}

func leafUsed(entries []leafEntry) int {
	n := 3
	for _, e := range entries {
		n += 2 + len(e.key) + 2 + len(e.value)
	}
	return n
}

func parseInternal(page []byte) (children []uint32, keys [][]byte, err error) {
	if page[0] != nodeInternal {
		return nil, nil, errors.New("btree: not an internal page")
	}
	count := int(binary.BigEndian.Uint16(page[1:3]))
	off := 3
	children = make([]uint32, 0, count+1)
	keys = make([][]byte, 0, count)
	for i := 0; i < count; i++ {
		if off+4 > PageSize {
			return nil, nil, errors.New("btree: corrupt internal page")
		}
		child := binary.BigEndian.Uint32(page[off:])
		off += 4
		children = append(children, child)
		if off+2 > PageSize {
			return nil, nil, errors.New("btree: corrupt internal page")
		}
		kl := int(binary.BigEndian.Uint16(page[off:]))
		off += 2
		if off+kl > PageSize {
			return nil, nil, errors.New("btree: corrupt internal page")
		}
		keys = append(keys, append([]byte(nil), page[off:off+kl]...))
		off += kl
	}
	if off+4 > PageSize {
		return nil, nil, errors.New("btree: corrupt internal page")
	}
	children = append(children, binary.BigEndian.Uint32(page[off:]))
	return children, keys, nil
}

func buildInternal(children []uint32, keys [][]byte) ([]byte, error) {
	page := make([]byte, PageSize)
	page[0] = nodeInternal
	if len(keys) > 65535 || len(children) != len(keys)+1 {
		return nil, errors.New("btree: invalid internal node shape")
	}
	binary.BigEndian.PutUint16(page[1:3], uint16(len(keys)))
	off := 3
	for i := 0; i < len(keys); i++ {
		if off+4+2+len(keys[i]) > PageSize {
			return nil, errors.New("btree: internal page overflow")
		}
		binary.BigEndian.PutUint32(page[off:], children[i])
		off += 4
		binary.BigEndian.PutUint16(page[off:], uint16(len(keys[i])))
		off += 2
		copy(page[off:], keys[i])
		off += len(keys[i])
	}
	if off+4 > PageSize {
		return nil, errors.New("btree: internal page overflow")
	}
	binary.BigEndian.PutUint32(page[off:], children[len(children)-1])
	return page, nil
}

func internalUsed(keys [][]byte) int {
	n := 3
	for _, k := range keys {
		n += 4 + 2 + len(k)
	}
	return n + 4
}

// ---------- search ----------

// Find returns the value stored at key, or nil if not present.
func (t *BTree) Find(key []byte) ([]byte, bool, error) {
	page, err := t.pager.readPage(t.root)
	if err != nil {
		return nil, false, err
	}
	for {
		if page[0] == nodeLeaf {
			entries, err := parseLeaf(page)
			if err != nil {
				return nil, false, err
			}
			i := searchKeys(entries, key)
			if i < len(entries) && bytes.Equal(entries[i].key, key) {
				return entries[i].value, true, nil
			}
			return nil, false, nil
		}
		children, keys, err := parseInternal(page)
		if err != nil {
			return nil, false, err
		}
		child := descend(keys, children, key)
		page, err = t.pager.readPage(child)
		if err != nil {
			return nil, false, err
		}
	}
}

// searchKeys returns the first index whose key is >= target.
func searchKeys(entries []leafEntry, target []byte) int {
	lo, hi := 0, len(entries)
	for lo < hi {
		mid := (lo + hi) / 2
		if bytes.Compare(entries[mid].key, target) < 0 {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

// descend returns the child page to follow for target.
func descend(keys [][]byte, children []uint32, target []byte) uint32 {
	lo, hi := 0, len(keys)
	for lo < hi {
		mid := (lo + hi) / 2
		if bytes.Compare(keys[mid], target) <= 0 {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return children[lo]
}

// ---------- insert ----------

// Insert stores key -> value, replacing any existing entry.
func (t *BTree) Insert(key, value []byte) error {
	splitKey, right, split, err := t.insertInto(t.root, key, value)
	if err != nil {
		return err
	}
	if !split {
		return nil
	}
	// Split propagated to the root: grow a new root.
	root, err := t.pager.allocPage()
	if err != nil {
		return err
	}
	page, err := buildInternal([]uint32{t.root, right}, [][]byte{splitKey})
	if err != nil {
		return err
	}
	if err := t.pager.writePage(root, page); err != nil {
		return err
	}
	t.root = root
	return nil
}

// insertInto descends and inserts, returning a separator key and right page
// if the current node split.
func (t *BTree) insertInto(pageNo uint32, key, value []byte) ([]byte, uint32, bool, error) {
	page, err := t.pager.readPage(pageNo)
	if err != nil {
		return nil, 0, false, err
	}
	if page[0] == nodeLeaf {
		entries, err := parseLeaf(page)
		if err != nil {
			return nil, 0, false, err
		}
		i := searchKeys(entries, key)
		if i < len(entries) && bytes.Equal(entries[i].key, key) {
			entries[i].value = value
			b, err := buildLeaf(entries)
			if err != nil {
				return nil, 0, false, err
			}
			return nil, 0, false, t.pager.writePage(pageNo, b)
		}
		entries = append(entries, leafEntry{})
		copy(entries[i+1:], entries[i:])
		entries[i] = leafEntry{key: key, value: value}
		if leafUsed(entries) <= maxNodeBytes {
			b, err := buildLeaf(entries)
			if err != nil {
				return nil, 0, false, err
			}
			return nil, 0, false, t.pager.writePage(pageNo, b)
		}
		// Split the leaf.
		split := splitLeaf(entries)
		left := entries[:split]
		rightEntries := entries[split:]
		rightPage, err := t.pager.allocPage()
		if err != nil {
			return nil, 0, false, err
		}
		lb, err := buildLeaf(left)
		if err != nil {
			return nil, 0, false, err
		}
		rb, err := buildLeaf(rightEntries)
		if err != nil {
			return nil, 0, false, err
		}
		if err := t.pager.writePage(pageNo, lb); err != nil {
			return nil, 0, false, err
		}
		if err := t.pager.writePage(rightPage, rb); err != nil {
			return nil, 0, false, err
		}
		return rightEntries[0].key, rightPage, true, nil
	}

	children, keys, err := parseInternal(page)
	if err != nil {
		return nil, 0, false, err
	}
	child := descend(keys, children, key)
	sep, rightChild, split, err := t.insertInto(child, key, value)
	if err != nil {
		return nil, 0, false, err
	}
	if !split {
		return nil, 0, false, nil
	}
	// Insert the separator into this internal node.
	pos := searchInternal(keys, sep)
	children = append(children, 0)
	copy(children[pos+1:], children[pos:])
	children[pos] = child
	children[pos+1] = rightChild
	keys = append(keys, nil)
	copy(keys[pos+1:], keys[pos:])
	keys[pos] = sep
	if internalUsed(keys) <= maxNodeBytes {
		b, err := buildInternal(children, keys)
		if err != nil {
			return nil, 0, false, err
		}
		return nil, 0, false, t.pager.writePage(pageNo, b)
	}
	// Split this internal node.
	mid := len(keys) / 2
	sepKey := keys[mid]
	leftChildren := append([]uint32(nil), children[:mid+1]...)
	rightChildren := append([]uint32(nil), children[mid+1:]...)
	leftKeys := append([][]byte(nil), keys[:mid]...)
	rightKeys := append([][]byte(nil), keys[mid+1:]...)
	rightPage, err := t.pager.allocPage()
	if err != nil {
		return nil, 0, false, err
	}
	lb, err := buildInternal(leftChildren, leftKeys)
	if err != nil {
		return nil, 0, false, err
	}
	rb, err := buildInternal(rightChildren, rightKeys)
	if err != nil {
		return nil, 0, false, err
	}
	if err := t.pager.writePage(pageNo, lb); err != nil {
		return nil, 0, false, err
	}
	if err := t.pager.writePage(rightPage, rb); err != nil {
		return nil, 0, false, err
	}
	return sepKey, rightPage, true, nil
}

func searchInternal(keys [][]byte, target []byte) int {
	lo, hi := 0, len(keys)
	for lo < hi {
		mid := (lo + hi) / 2
		if bytes.Compare(keys[mid], target) < 0 {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}

// splitLeaf chooses a split index splitting entries roughly in half by bytes,
// leaving at least one entry on each side.
func splitLeaf(entries []leafEntry) int {
	total := leafUsed(entries)
	half := total / 2
	n := 0
	for i, e := range entries {
		n += 2 + len(e.key) + 2 + len(e.value)
		if n >= half && i >= 1 && (len(entries)-i) >= 1 {
			return i
		}
	}
	return len(entries) / 2
}

// ---------- delete ----------

// Delete removes key. It reports whether the key existed.
func (t *BTree) Delete(key []byte) (bool, error) {
	removed, underflow, err := t.deleteFrom(t.root, key, true)
	if err != nil {
		return false, err
	}
	if underflow {
		// Root can shrink: if it is an internal node with a single child,
		// promote that child.
		page, err := t.pager.readPage(t.root)
		if err != nil {
			return removed, err
		}
		if page[0] == nodeInternal {
			children, keys, err := parseInternal(page)
			if err != nil {
				return removed, err
			}
			if len(keys) == 0 && len(children) == 1 {
				old := t.root
				t.root = children[0]
				if err := t.pager.freePage(old); err != nil {
					return removed, err
				}
			}
		}
	}
	return removed, nil
}

// deleteFrom removes key from the subtree rooted at pageNo. It returns
// whether the key was removed and whether the node underflowed.
func (t *BTree) deleteFrom(pageNo uint32, key []byte, isRoot bool) (bool, bool, error) {
	page, err := t.pager.readPage(pageNo)
	if err != nil {
		return false, false, err
	}
	if page[0] == nodeLeaf {
		entries, err := parseLeaf(page)
		if err != nil {
			return false, false, err
		}
		i := searchKeys(entries, key)
		if i >= len(entries) || !bytes.Equal(entries[i].key, key) {
			return false, false, nil
		}
		entries = append(entries[:i], entries[i+1:]...)
		b, err := buildLeaf(entries)
		if err != nil {
			return false, false, err
		}
		if err := t.pager.writePage(pageNo, b); err != nil {
			return false, false, err
		}
		under := leafUsed(entries) < minFill && !isRoot && len(entries) > 0
		if len(entries) == 0 && !isRoot {
			under = true
		}
		return true, under, nil
	}

	children, keys, err := parseInternal(page)
	if err != nil {
		return false, false, err
	}
	child := descend(keys, children, key)
	pos := int(child)
	removed, underflow, err := t.deleteFrom(children[pos], key, false)
	if err != nil {
		return false, false, err
	}
	if !removed {
		return false, false, nil
	}
	if !underflow {
		return true, false, nil
	}
	// Rebalance: the child at children[pos] underflowed.
	rebalanced, err := t.rebalance(pageNo, pos, children, keys)
	if err != nil {
		return true, false, err
	}
	if !rebalanced {
		return true, false, nil
	}
	// Check if this node now underflows (only if not root).
	if !isRoot {
		newPage, err := t.pager.readPage(pageNo)
		if err != nil {
			return true, false, err
		}
		if newPage[0] == nodeLeaf {
			entries, _ := parseLeaf(newPage)
			if leafUsed(entries) < minFill && len(entries) > 0 {
				return true, true, nil
			}
			if len(entries) == 0 {
				return true, true, nil
			}
		} else {
			_, nkeys, _ := parseInternal(newPage)
			if internalUsed(nkeys) < minFill && len(nkeys) > 0 {
				return true, true, nil
			}
			if len(nkeys) == 0 {
				return true, true, nil
			}
		}
	}
	return true, false, nil
}

// rebalance fixes an underflowed child at children[pos]. It returns true if
// the parent node's structure changed (borrow or merge happened).
func (t *BTree) rebalance(pageNo uint32, pos int, children []uint32, keys [][]byte) (bool, error) {
	// Try to borrow from the left sibling.
	if pos > 0 {
		ok, err := t.borrowFrom(pageNo, pos, pos-1, children, keys)
		if err != nil {
			return false, err
		}
		if ok {
			return true, nil
		}
	}
	// Try to borrow from the right sibling.
	if pos+1 < len(children) {
		ok, err := t.borrowFrom(pageNo, pos, pos+1, children, keys)
		if err != nil {
			return false, err
		}
		if ok {
			return true, nil
		}
	}
	// Merge with a sibling.
	if pos+1 < len(children) {
		return true, t.mergeSiblings(pageNo, pos, pos+1, children, keys)
	}
	return true, t.mergeSiblings(pageNo, pos-1, pos, children, keys)
}

// borrowFrom moves one entry from sibling (page) into child at pos.
func (t *BTree) borrowFrom(pageNo uint32, pos, siblingIdx int, children []uint32, keys [][]byte) (bool, error) {
	childNo := children[pos]
	sibNo := children[siblingIdx]
	childPage, err := t.pager.readPage(childNo)
	if err != nil {
		return false, err
	}
	sibPage, err := t.pager.readPage(sibNo)
	if err != nil {
		return false, err
	}
	bothLeaf := childPage[0] == nodeLeaf && sibPage[0] == nodeLeaf
	if !bothLeaf {
		return false, nil
	}
	childEntries, err := parseLeaf(childPage)
	if err != nil {
		return false, err
	}
	sibEntries, err := parseLeaf(sibPage)
	if err != nil {
		return false, err
	}
	var take leafEntry
	var fromSib []leafEntry
	if siblingIdx < pos {
		// Left sibling: take its last entry.
		if len(sibEntries) < 2 {
			return false, nil
		}
		take = sibEntries[len(sibEntries)-1]
		fromSib = sibEntries[:len(sibEntries)-1]
		// The parent separator between them becomes the child's first entry.
		sep := keys[pos-1]
		childEntries = append([]leafEntry{{key: sep, value: take.value}}, childEntries...)
		// The sibling's taken key becomes the new separator.
		keys[pos-1] = take.key
	} else {
		// Right sibling: take its first entry.
		if len(sibEntries) < 2 {
			return false, nil
		}
		take = sibEntries[0]
		fromSib = sibEntries[1:]
		sep := keys[pos]
		childEntries = append(childEntries, leafEntry{key: sep, value: take.value})
		keys[pos] = take.key
	}
	// Only borrow if the child still has room.
	if leafUsed(childEntries) > maxNodeBytes {
		return false, nil
	}
	cb, err := buildLeaf(childEntries)
	if err != nil {
		return false, err
	}
	sb, err := buildLeaf(fromSib)
	if err != nil {
		return false, err
	}
	if err := t.pager.writePage(childNo, cb); err != nil {
		return false, err
	}
	if err := t.pager.writePage(sibNo, sb); err != nil {
		return false, err
	}
	// Rewrite the parent with the updated separator keys.
	parentKeys := append([][]byte(nil), keys...)
	parentChildren := append([]uint32(nil), children...)
	pb, err := buildInternal(parentChildren, parentKeys)
	if err != nil {
		return false, err
	}
	return true, t.pager.writePage(pageNo, pb)
}

// mergeSiblings merges children[a] and children[b] (a < b) into one node,
// dropping the separator key between them, and frees the right page.
func (t *BTree) mergeSiblings(pageNo uint32, a, b int, children []uint32, keys [][]byte) error {
	leftNo := children[a]
	rightNo := children[b]
	leftPage, err := t.pager.readPage(leftNo)
	if err != nil {
		return err
	}
	rightPage, err := t.pager.readPage(rightNo)
	if err != nil {
		return err
	}
	var mergedPage []byte
	if leftPage[0] == nodeLeaf {
		leftEntries, err := parseLeaf(leftPage)
		if err != nil {
			return err
		}
		rightEntries, err := parseLeaf(rightPage)
		if err != nil {
			return err
		}
		sep := keys[a]
		merged := append([]leafEntry(nil), leftEntries...)
		merged = append(merged, leafEntry{key: sep, value: rightEntries[0].value})
		merged = append(merged, rightEntries[1:]...)
		mergedPage, err = buildLeaf(merged)
		if err != nil {
			return err
		}
	} else {
		leftChildren, leftKeys, err := parseInternal(leftPage)
		if err != nil {
			return err
		}
		rightChildren, rightKeys, err := parseInternal(rightPage)
		if err != nil {
			return err
		}
		sep := keys[a]
		newKeys := append([][]byte(nil), leftKeys...)
		newKeys = append(newKeys, sep)
		newKeys = append(newKeys, rightKeys...)
		newChildren := append([]uint32(nil), leftChildren...)
		newChildren = append(newChildren, rightChildren...)
		mergedPage, err = buildInternal(newChildren, newKeys)
		if err != nil {
			return err
		}
	}
	if err := t.pager.writePage(leftNo, mergedPage); err != nil {
		return err
	}
	if err := t.pager.freePage(rightNo); err != nil {
		return err
	}
	// Remove the separator key and the right child from the parent.
	newKeys := append([][]byte(nil), keys[:a]...)
	newKeys = append(newKeys, keys[a+1:]...)
	newChildren := append([]uint32(nil), children[:b]...)
	newChildren = append(newChildren, children[b+1:]...)
	parent, err := t.pager.readPage(pageNo)
	if err != nil {
		return err
	}
	if parent[0] != nodeInternal {
		return errors.New("btree: parent not internal during merge")
	}
	pb, err := buildInternal(newChildren, newKeys)
	if err != nil {
		return err
	}
	return t.pager.writePage(pageNo, pb)
}

// ---------- iteration ----------

// Walk iterates keys in [start, end). A nil start means from the beginning;
// a nil end means to the last key. The callback stops iteration by returning
// false.
func (t *BTree) Walk(start, end []byte, fn func(key, value []byte) bool) error {
	return t.walkFrom(t.root, start, end, fn)
}

func (t *BTree) walkFrom(pageNo uint32, start, end []byte, fn func(key, value []byte) bool) error {
	page, err := t.pager.readPage(pageNo)
	if err != nil {
		return err
	}
	if page[0] == nodeLeaf {
		entries, err := parseLeaf(page)
		if err != nil {
			return err
		}
		i := 0
		if start != nil {
			i = searchKeys(entries, start)
		}
		for ; i < len(entries); i++ {
			if end != nil && bytes.Compare(entries[i].key, end) >= 0 {
				return nil
			}
			if !fn(entries[i].key, entries[i].value) {
				return nil
			}
		}
		return nil
	}
	children, keys, err := parseInternal(page)
	if err != nil {
		return err
	}
	startChild := 0
	if start != nil {
		startChild = int(descend(keys, children, start))
	}
	for i := startChild; i < len(children); i++ {
		// Child i contains keys in (keys[i-1], keys[i]). If its minimum key
		// is already >= end, every key in it and later children is too.
		if i > 0 && end != nil && bytes.Compare(keys[i-1], end) >= 0 {
			return nil
		}
		cont := true
		if err := t.walkFrom(children[i], start, end, func(k, v []byte) bool {
			cont = fn(k, v)
			return cont
		}); err != nil {
			return err
		}
		if !cont {
			return nil
		}
	}
	return nil
}

// Destroy frees every page in the tree. Use when dropping a table.
func (t *BTree) Destroy() error {
	return t.destroyFrom(t.root)
}

func (t *BTree) destroyFrom(pageNo uint32) error {
	page, err := t.pager.readPage(pageNo)
	if err != nil {
		return err
	}
	if page[0] == nodeInternal {
		children, _, err := parseInternal(page)
		if err != nil {
			return err
		}
		for _, c := range children {
			if err := t.destroyFrom(c); err != nil {
				return err
			}
		}
	}
	return t.pager.freePage(pageNo)
}