package storage

import (
	"bytes"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"testing"
)

func tempPath(t *testing.T) string {
	t.Helper()
	return filepath.Join(t.TempDir(), "test.db")
}

func key(i int) []byte { return []byte(fmt.Sprintf("k%06d", i)) }

func TestBTreeInsertFind(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	root, err := p.allocPage()
	if err != nil {
		t.Fatal(err)
	}
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	binaryPutUint16(page[1:3], 0)
	if err := p.writePage(root, page); err != nil {
		t.Fatal(err)
	}
	tree := newBTree(p, root)
	for i := 0; i < 1000; i++ {
		if err := tree.Insert(key(i), []byte(fmt.Sprintf("v%d", i))); err != nil {
			t.Fatalf("insert %d: %v", i, err)
		}
	}
	for i := 0; i < 1000; i++ {
		v, found, err := tree.Find(key(i))
		if err != nil {
			t.Fatalf("find %d: %v", i, err)
		}
		if !found {
			t.Fatalf("key %d not found", i)
		}
		if !bytes.Equal(v, []byte(fmt.Sprintf("v%d", i))) {
			t.Fatalf("key %d value = %q", i, v)
		}
	}
	if _, found, err := tree.Find(key(5000)); err != nil || found {
		t.Fatalf("missing key reported found=%v err=%v", found, err)
	}
}

func TestBTreeReplace(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	tree, err := emptyTree(p)
	if err != nil {
		t.Fatal(err)
	}
	if err := tree.Insert([]byte("a"), []byte("1")); err != nil {
		t.Fatal(err)
	}
	if err := tree.Insert([]byte("a"), []byte("2")); err != nil {
		t.Fatal(err)
	}
	v, _, err := tree.Find([]byte("a"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(v, []byte("2")) {
		t.Fatalf("value = %q, want 2", v)
	}
}

func TestBTreeRandomized(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	tree, err := emptyTree(p)
	if err != nil {
		t.Fatal(err)
	}
	rng := rand.New(rand.NewSource(42))
	expected := map[int]bool{}
	for i := 0; i < 5000; i++ {
		k := rng.Intn(3000)
		switch rng.Intn(3) {
		case 0, 1:
			if err := tree.Insert(key(k), []byte("x")); err != nil {
				t.Fatalf("insert %d: %v", k, err)
			}
			expected[k] = true
		case 2:
			if _, err := tree.Delete(key(k)); err != nil {
				t.Fatalf("delete %d: %v", k, err)
			}
			delete(expected, k)
		}
	}
	// Verify all expected present, none unexpected.
	seen := map[int]bool{}
	err = tree.Walk(nil, nil, func(k, _ []byte) bool {
		var n int
		fmt.Sscanf(string(k), "k%06d", &n)
		seen[n] = true
		return true
	})
	if err != nil {
		t.Fatal(err)
	}
	for k := range expected {
		if !seen[k] {
			t.Fatalf("expected key %d missing", k)
		}
	}
	if len(seen) != len(expected) {
		t.Fatalf("walk saw %d keys, expected %d", len(seen), len(expected))
	}
}

func TestBTreeDelete(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	tree, err := emptyTree(p)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 500; i++ {
		if err := tree.Insert(key(i), []byte("v")); err != nil {
			t.Fatal(err)
		}
	}
	for i := 0; i < 500; i += 2 {
		removed, err := tree.Delete(key(i))
		if err != nil {
			t.Fatalf("delete %d: %v", i, err)
		}
		if !removed {
			t.Fatalf("key %d was not reported removed", i)
		}
	}
	for i := 0; i < 500; i++ {
		_, found, err := tree.Find(key(i))
		if err != nil {
			t.Fatal(err)
		}
		if found != (i%2 == 1) {
			t.Fatalf("key %d found=%v", i, found)
		}
	}
	// Deleting a missing key reports false.
	if removed, err := tree.Delete(key(2000)); err != nil || removed {
		t.Fatalf("delete missing key: removed=%v err=%v", removed, err)
	}
	if removed, err := tree.Delete(key(0)); err != nil || removed {
		t.Fatalf("delete already-removed key: removed=%v err=%v", removed, err)
	}
}

func TestBTreeWalkRange(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	tree, err := emptyTree(p)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 100; i++ {
		if err := tree.Insert(key(i), []byte("v")); err != nil {
			t.Fatal(err)
		}
	}
	var got []string
	err = tree.Walk(key(10), key(20), func(k, _ []byte) bool {
		got = append(got, string(k))
		return true
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 10 || string(got[0]) != "k000010" || string(got[9]) != "k000019" {
		t.Fatalf("range walk = %v", got)
	}
}

func TestBTreeWalkStopEarly(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	tree, err := emptyTree(p)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 100; i++ {
		if err := tree.Insert(key(i), []byte("v")); err != nil {
			t.Fatal(err)
		}
	}
	count := 0
	err = tree.Walk(nil, nil, func(k, _ []byte) bool {
		count++
		return count < 3
	})
	if err != nil {
		t.Fatal(err)
	}
	if count != 3 {
		t.Fatalf("walk visited %d, want 3", count)
	}
}

func emptyTree(p *Pager) (*BTree, error) {
	root, err := p.allocPage()
	if err != nil {
		return nil, err
	}
	page := make([]byte, PageSize)
	page[0] = nodeLeaf
	binaryPutUint16(page[1:3], 0)
	if err := p.writePage(root, page); err != nil {
		return nil, err
	}
	return newBTree(p, root), nil
}

func TestPagerCreateOpen(t *testing.T) {
	path := tempPath(t)
	if _, err := createPager(path); err != nil {
		t.Fatal(err)
	}
	// Missing file errors.
	if _, err := openPager(filepath.Join(t.TempDir(), "nope.db")); err == nil {
		t.Fatal("expected error opening missing file")
	}
	// Bad magic errors.
	bad := filepath.Join(t.TempDir(), "bad.db")
	if err := os.WriteFile(bad, []byte("not a granite file at all, way too short"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := openPager(bad); err == nil {
		t.Fatal("expected error opening non-granite file")
	}
}

func TestPagerPersistOnClose(t *testing.T) {
	path := tempPath(t)
	p, err := createPager(path)
	if err != nil {
		t.Fatal(err)
	}
	page := make([]byte, PageSize)
	copy(page, []byte("hello world"))
	if err := p.writePage(1, page); err != nil {
		t.Fatal(err)
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
	p2, err := openPager(path)
	if err != nil {
		t.Fatal(err)
	}
	defer p2.Close()
	got, err := p2.readPage(1)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(got, []byte("hello world")) {
		t.Fatalf("persisted page = %q", got[:20])
	}
}

func TestPagerTxnCommitRollback(t *testing.T) {
	path := tempPath(t)
	p, err := createPager(path)
	if err != nil {
		t.Fatal(err)
	}
	// Write some data and persist it.
	base := make([]byte, PageSize)
	copy(base, []byte("base"))
	if err := p.writePage(1, base); err != nil {
		t.Fatal(err)
	}
	if err := p.flush(); err != nil {
		t.Fatal(err)
	}

	// Begin, write, rollback: the write must be gone.
	if err := p.Begin(); err != nil {
		t.Fatal(err)
	}
	other := make([]byte, PageSize)
	copy(other, []byte("txn"))
	if err := p.writePage(1, other); err != nil {
		t.Fatal(err)
	}
	if err := p.Rollback(); err != nil {
		t.Fatal(err)
	}
	got, err := p.readPage(1)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(got, []byte("base")) {
		t.Fatalf("after rollback page = %q, want base", got[:20])
	}

	// Begin, write, commit: the write must survive.
	if err := p.Begin(); err != nil {
		t.Fatal(err)
	}
	committed := make([]byte, PageSize)
	copy(committed, []byte("committed"))
	if err := p.writePage(1, committed); err != nil {
		t.Fatal(err)
	}
	if err := p.Commit(); err != nil {
		t.Fatal(err)
	}
	got, err = p.readPage(1)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(got, []byte("committed")) {
		t.Fatalf("after commit page = %q, want committed", got[:20])
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestPagerTxnErrors(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	if err := p.Commit(); err == nil {
		t.Fatal("commit without begin should error")
	}
	if err := p.Rollback(); err == nil {
		t.Fatal("rollback without begin should error")
	}
	if err := p.Begin(); err != nil {
		t.Fatal(err)
	}
	if err := p.Begin(); err == nil {
		t.Fatal("double begin should error")
	}
}

func TestPagerFreeListReuse(t *testing.T) {
	p, err := createPager(tempPath(t))
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	// Two allocs, then free page 1 and re-alloc: expect page 1 reused.
	if _, err := p.allocPage(); err != nil {
		t.Fatal(err)
	}
	n2, err := p.allocPage()
	if err != nil {
		t.Fatal(err)
	}
	if err := p.freePage(n2); err != nil {
		t.Fatal(err)
	}
	n3, err := p.allocPage()
	if err != nil {
		t.Fatal(err)
	}
	if n3 != n2 {
		t.Fatalf("alloc after free = %d, want %d", n3, n2)
	}
}

func binaryPutUint16(b []byte, v uint16) {
	b[0] = byte(v >> 8)
	b[1] = byte(v)
}
