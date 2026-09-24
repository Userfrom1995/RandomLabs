package storage

import (
	"testing"

	"github.com/Userfrom1995/Random/granite/internal/sql"
)

func TestDatabaseLifecycle(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	// CreateTable twice is an error.
	if err := db.CreateTable("t", []Column{{"id", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	if err := db.CreateTable("t", []Column{{"id", sql.TypeInt}}); err == nil {
		t.Fatal("second create should error")
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	// Reopen and confirm the table survived.
	db, err = OpenDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	meta, err := db.GetTable("t")
	if err != nil {
		t.Fatal(err)
	}
	if meta.Name != "t" || len(meta.Cols) != 1 || meta.Cols[0].Name != "id" {
		t.Fatalf("meta = %+v", meta)
	}
	names, err := db.Tables()
	if err != nil || len(names) != 1 || names[0] != "t" {
		t.Fatalf("tables = %v, err = %v", names, err)
	}
}

func TestInsertScanRoundTrip(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	cols := []Column{{"id", sql.TypeInt}, {"name", sql.TypeText}}
	if err := db.CreateTable("people", cols); err != nil {
		t.Fatal(err)
	}
	tbl, err := db.GetTable("people")
	if err != nil {
		t.Fatal(err)
	}
	for i := int64(1); i <= 10; i++ {
		rid, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(i), sql.TextValue("p")})
		if err != nil {
			t.Fatalf("insert %d: %v", i, err)
		}
		if rid != i {
			t.Fatalf("rowid = %d, want %d", rid, i)
		}
	}
	var count int
	err = db.ScanRows(tbl, func(rid int64, vals []sql.Value) bool {
		count++
		if vals[0].String() != sql.IntValue(rid).String() {
			t.Fatalf("rid %d val %v", rid, vals[0])
		}
		return true
	})
	if err != nil {
		t.Fatal(err)
	}
	if count != 10 {
		t.Fatalf("scan count = %d, want 10", count)
	}
	row, err := db.GetRow(tbl, 3)
	if err != nil {
		t.Fatal(err)
	}
	if row[0].String() != "3" || row[1].String() != "p" {
		t.Fatalf("row 3 = %v", row)
	}
}

func TestUpdateDeleteRow(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.CreateTable("t", []Column{{"v", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	rid, _ := db.InsertRow(tbl, []sql.Value{sql.IntValue(1)})
	if err := db.UpdateRow(tbl, rid, []sql.Value{sql.IntValue(2)}); err != nil {
		t.Fatal(err)
	}
	row, _ := db.GetRow(tbl, rid)
	if row[0].String() != "2" {
		t.Fatalf("after update row = %v", row)
	}
	if err := db.DeleteRow(tbl, rid); err != nil {
		t.Fatal(err)
	}
	if _, err := db.GetRow(tbl, rid); err == nil {
		t.Fatal("deleted row should not exist")
	}
}

func TestIndexLifecycle(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.CreateTable("t", []Column{{"id", sql.TypeInt}, {"name", sql.TypeText}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	for i := int64(1); i <= 5; i++ {
		if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(i), sql.TextValue("n")}); err != nil {
			t.Fatal(err)
		}
	}
	// CreateIndex populates from existing rows.
	if err := db.CreateIndex(tbl, "ix_name", "name"); err != nil {
		t.Fatal(err)
	}
	if err := db.CreateIndex(tbl, "ix_id", "id"); err != nil {
		t.Fatal(err)
	}
	// Inserting after index creation maintains the index.
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(6), sql.TextValue("n6")}); err != nil {
		t.Fatal(err)
	}
	if len(tbl.Indexes) != 2 {
		t.Fatalf("indexes = %+v", tbl.Indexes)
	}
	// Equality lookup finds the right rowids.
	var got []int64
	err = db.IndexLookupEq(tbl, 0, sql.TextValue("n6"), func(rid int64) bool {
		got = append(got, rid)
		return true
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0] != 6 {
		t.Fatalf("eq lookup = %v", got)
	}
	// Range lookup covers a value range on the id index (index 1).
	lo := sql.IntValue(3)
	hi := sql.IntValue(5)
	var got2 []int64
	err = db.IndexLookupRange(tbl, 1, &lo, &hi, func(rid int64) bool {
		got2 = append(got2, rid)
		return true
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got2) != 3 {
		t.Fatalf("range lookup = %v", got2)
	}
	// Duplicate index names error.
	if err := db.CreateIndex(tbl, "ix_name", "name"); err == nil {
		t.Fatal("duplicate index should error")
	}
	// Unknown columns error.
	if err := db.CreateIndex(tbl, "ix_bad", "nope"); err == nil {
		t.Fatal("index on unknown column should error")
	}
}

func TestIndexUpdateAndDelete(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.CreateTable("t", []Column{{"id", sql.TypeInt}, {"tag", sql.TypeText}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	rid, _ := db.InsertRow(tbl, []sql.Value{sql.IntValue(1), sql.TextValue("a")})
	if err := db.CreateIndex(tbl, "ix_tag", "tag"); err != nil {
		t.Fatal(err)
	}
	// Update the indexed column: old entry removed, new added.
	if err := db.UpdateRow(tbl, rid, []sql.Value{sql.IntValue(1), sql.TextValue("b")}); err != nil {
		t.Fatal(err)
	}
	var got []int64
	_ = db.IndexLookupEq(tbl, 0, sql.TextValue("b"), func(r int64) bool { got = append(got, r); return true })
	if len(got) != 1 || got[0] != rid {
		t.Fatalf("lookup after update = %v", got)
	}
	got = nil
	_ = db.IndexLookupEq(tbl, 0, sql.TextValue("a"), func(r int64) bool { got = append(got, r); return true })
	if len(got) != 0 {
		t.Fatalf("stale index entry found = %v", got)
	}
	// Delete: index entry removed too.
	if err := db.DeleteRow(tbl, rid); err != nil {
		t.Fatal(err)
	}
	got = nil
	_ = db.IndexLookupEq(tbl, 0, sql.TextValue("b"), func(r int64) bool { got = append(got, r); return true })
	if len(got) != 0 {
		t.Fatalf("index entry survived delete = %v", got)
	}
}

func TestDropTable(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.CreateTable("a", []Column{{"x", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	if err := db.CreateTable("b", []Column{{"y", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	if err := db.DropTable("a"); err != nil {
		t.Fatal(err)
	}
	if _, err := db.GetTable("a"); err == nil {
		t.Fatal("dropped table should not exist")
	}
	if _, err := db.GetTable("b"); err != nil {
		t.Fatal("other table should survive drop")
	}
	if err := db.DropTable("a"); err == nil {
		t.Fatal("dropping a missing table should error")
	}
}

func TestTransactionCommitPersists(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.CreateTable("t", []Column{{"v", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	if err := db.Begin(); err != nil {
		t.Fatal(err)
	}
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(1)}); err != nil {
		t.Fatal(err)
	}
	if err := db.Commit(); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = OpenDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	tbl, _ = db.GetTable("t")
	var count int
	if err := db.ScanRows(tbl, func(_ int64, _ []sql.Value) bool { count++; return true }); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("committed row count = %d, want 1", count)
	}
}

func TestTransactionRollbackDiscards(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.CreateTable("t", []Column{{"v", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(1)}); err != nil {
		t.Fatal(err)
	}
	if err := db.Begin(); err != nil {
		t.Fatal(err)
	}
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(2)}); err != nil {
		t.Fatal(err)
	}
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(3)}); err != nil {
		t.Fatal(err)
	}
	if err := db.Rollback(); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.ScanRows(tbl, func(_ int64, _ []sql.Value) bool { count++; return true }); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("post-rollback count = %d, want 1", count)
	}
	// Commit/rollback without a transaction error.
	if err := db.Commit(); err == nil {
		t.Fatal("commit without begin should error")
	}
	if err := db.Rollback(); err == nil {
		t.Fatal("rollback without begin should error")
	}
}

func TestAutoCommitPersistsStatements(t *testing.T) {
	path := tempPath(t)
	db, err := CreateDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	// No explicit transaction: the write is flushed by AutoCommit.
	if err := db.CreateTable("t", []Column{{"v", sql.TypeInt}}); err != nil {
		t.Fatal(err)
	}
	tbl, _ := db.GetTable("t")
	if _, err := db.InsertRow(tbl, []sql.Value{sql.IntValue(7)}); err != nil {
		t.Fatal(err)
	}
	if err := db.AutoCommit(); err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = OpenDatabase(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	tbl, _ = db.GetTable("t")
	var count int
	if err := db.ScanRows(tbl, func(_ int64, _ []sql.Value) bool { count++; return true }); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("auto-committed count = %d, want 1", count)
	}
}