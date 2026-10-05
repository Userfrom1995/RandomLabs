package engine

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// isolate redirects the whole profile tree into a temp dir. Every
// store test calls it first so hermetic runs never touch the real
// home directory.
func isolate(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("TB_HOME", dir)
	return dir
}

func TestProfileDirRespectsTBHome(t *testing.T) {
	root := isolate(t)
	got := ProfileDir("work")
	if !strings.HasPrefix(got, filepath.Join(root, ".terminal-browser")) {
		t.Fatalf("TB_HOME ignored: %q", got)
	}
	if _, err := SanitizeProfile("../escape"); err == nil {
		t.Fatal("traversal profile accepted")
	}
	if err := RecordVisit("work", "fixture://home", "Home"); err != nil {
		t.Fatalf("record: %v", err)
	}
	fi, err := os.Stat(ProfileDir("work"))
	if err != nil {
		t.Fatalf("profile dir missing: %v", err)
	}
	if fi.Mode().Perm() != 0o700 {
		t.Fatalf("profile dir perm %o, want 700", fi.Mode().Perm())
	}
}

func TestHistoryRoundTripQueryLimit(t *testing.T) {
	isolate(t)
	for _, v := range [][2]string{
		{"https://example.com/a", "Alpha page"},
		{"https://example.com/b", "Beta page"},
		{"https://other.dev/c", "Gamma page"},
	} {
		if err := RecordVisit("p", v[0], v[1]); err != nil {
			t.Fatalf("record %s: %v", v[0], err)
		}
	}
	all, err := QueryHistory("p", "", 50)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if len(all) != 3 {
		t.Fatalf("want 3 visits, got %d", len(all))
	}
	if all[0].URL != "https://other.dev/c" {
		t.Fatalf("newest-first violated: %+v", all[0])
	}
	filtered, err := QueryHistory("p", "beta", 50)
	if err != nil {
		t.Fatalf("filtered query: %v", err)
	}
	if len(filtered) != 1 || filtered[0].Title != "Beta page" {
		t.Fatalf("filter mismatch: %+v", filtered)
	}
	one, err := QueryHistory("p", "", 1)
	if err != nil {
		t.Fatalf("limited query: %v", err)
	}
	if len(one) != 1 {
		t.Fatalf("limit ignored: %+v", one)
	}
	if err := RecordVisit("p", "", "empty"); err == nil {
		t.Fatal("empty URL recorded")
	}
}

func TestHistoryClear(t *testing.T) {
	isolate(t)
	if err := RecordVisit("p", "https://example.com/", "X"); err != nil {
		t.Fatal(err)
	}
	n, err := ClearHistory("p")
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("cleared %d, want 1", n)
	}
	rest, err := QueryHistory("p", "", 50)
	if err != nil {
		t.Fatal(err)
	}
	if len(rest) != 0 {
		t.Fatalf("history not empty: %+v", rest)
	}
}

func TestBookmarksCRUD(t *testing.T) {
	isolate(t)
	empty, err := ListBookmarks("p")
	if err != nil {
		t.Fatal(err)
	}
	if len(empty) != 0 {
		t.Fatalf("fresh profile has bookmarks: %+v", empty)
	}
	if err := AddBookmark("p", "https://example.com/", "Example"); err != nil {
		t.Fatal(err)
	}
	if err := AddBookmark("p", "https://example.org/", "Org"); err != nil {
		t.Fatal(err)
	}
	if err := AddBookmark("p", "https://example.com/", "Example v2"); err != nil {
		t.Fatal(err)
	}
	marks, err := ListBookmarks("p")
	if err != nil {
		t.Fatal(err)
	}
	if len(marks) != 2 {
		t.Fatalf("re-add duplicated: %+v", marks)
	}
	if marks[0].Title != "Example v2" {
		t.Fatalf("re-add did not update title: %+v", marks[0])
	}
	found, err := RemoveBookmark("p", "https://example.org/")
	if err != nil || !found {
		t.Fatalf("remove: found=%v err=%v", found, err)
	}
	found, err = RemoveBookmark("p", "https://missing.dev/")
	if err != nil || found {
		t.Fatalf("remove missing: found=%v err=%v", found, err)
	}
	if err := AddBookmark("p", "   ", "blank"); err == nil {
		t.Fatal("blank URL bookmarked")
	}
}

func TestNavStackBackForwardTruncate(t *testing.T) {
	isolate(t)
	if _, ok, err := CurrentStackEntry("p"); err != nil || ok {
		t.Fatalf("empty stack restores: ok=%v err=%v", ok, err)
	}
	for _, u := range []string{"fixture://home", "fixture://article", "fixture://table"} {
		if _, err := VisitStack("p", u, u); err != nil {
			t.Fatalf("visit %s: %v", u, err)
		}
	}
	v, ok, err := Back("p")
	if err != nil || !ok || v.URL != "fixture://article" {
		t.Fatalf("back: v=%+v ok=%v err=%v", v, ok, err)
	}
	v, ok, err = Back("p")
	if err != nil || !ok || v.URL != "fixture://home" {
		t.Fatalf("back2: v=%+v ok=%v err=%v", v, ok, err)
	}
	if _, ok, err := Back("p"); err != nil || ok {
		t.Fatalf("back past oldest: ok=%v err=%v", ok, err)
	}
	v, ok, err = Forward("p")
	if err != nil || !ok || v.URL != "fixture://article" {
		t.Fatalf("forward: v=%+v ok=%v err=%v", v, ok, err)
	}
	// A new visit after Back discards the redo path.
	if _, err := VisitStack("p", "fixture://fresh", "fresh"); err != nil {
		t.Fatal(err)
	}
	if _, ok, err := Forward("p"); err != nil || ok {
		t.Fatalf("forward after new visit: ok=%v err=%v", ok, err)
	}
	st, err := LoadStack("p")
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Entries) != 3 || st.Entries[2].URL != "fixture://fresh" {
		t.Fatalf("truncate mismatch: %+v", st.Entries)
	}
	cur, ok, err := CurrentStackEntry("p")
	if err != nil || !ok || cur.URL != "fixture://fresh" {
		t.Fatalf("current: %+v ok=%v err=%v", cur, ok, err)
	}
	if _, err := VisitStack("p", "", "blank"); err == nil {
		t.Fatal("blank URL stacked")
	}
}

func TestStackSurvivesReload(t *testing.T) {
	isolate(t)
	if _, err := VisitStack("p", "https://example.com/", "E"); err != nil {
		t.Fatal(err)
	}
	if _, err := VisitStack("p", "https://example.org/", "O"); err != nil {
		t.Fatal(err)
	}
	// Fresh load from disk, like a restarted process.
	st, err := LoadStack("p")
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Entries) != 2 || st.Index != 1 {
		t.Fatalf("restore mismatch: %+v", st)
	}
}

func TestJarMergeClear(t *testing.T) {
	isolate(t)
	empty, err := LoadJar("p")
	if err != nil || len(empty) != 0 {
		t.Fatalf("fresh jar: %+v err=%v", empty, err)
	}
	if _, err := SetJarCookie("p", Cookie{}); err == nil {
		t.Fatal("nameless cookie stored")
	}
	if _, err := SetJarCookie("p", Cookie{Name: "sid", Value: "1", Domain: "example.com", Path: "/"}); err != nil {
		t.Fatal(err)
	}
	merged, touched, err := MergeJar("p", []Cookie{
		{Name: "sid", Value: "2", Domain: "example.com", Path: "/"},
		{Name: "theme", Value: "dark", Domain: "example.com", Path: "/"},
		{Name: "", Value: "skip"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if touched != 2 {
		t.Fatalf("touched %d, want 2", touched)
	}
	if len(merged) != 2 || merged[0].Value != "2" {
		t.Fatalf("keyed replace failed: %+v", merged)
	}
	reloaded, err := LoadJar("p")
	if err != nil || len(reloaded) != 2 {
		t.Fatalf("jar not durable: %+v err=%v", reloaded, err)
	}
	n, err := ClearJar("p")
	if err != nil || n != 2 {
		t.Fatalf("clear: n=%d err=%v", n, err)
	}
}

func TestJarFilePerms(t *testing.T) {
	isolate(t)
	if err := SaveJar("p", []Cookie{{Name: "a", Value: "b"}}); err != nil {
		t.Fatal(err)
	}
	path, err := profileFile("p", cookieFile)
	if err != nil {
		t.Fatal(err)
	}
	fi, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if fi.Mode().Perm() != 0o600 {
		t.Fatalf("jar perm %o, want 600", fi.Mode().Perm())
	}
}

func TestStateSaveLoadRoundTrip(t *testing.T) {
	isolate(t)
	if _, err := SetJarCookie("src", Cookie{Name: "sid", Value: "abc", Domain: "example.com", Path: "/"}); err != nil {
		t.Fatal(err)
	}
	if err := AddBookmark("src", "https://example.com/", "E"); err != nil {
		t.Fatal(err)
	}
	if _, err := VisitStack("src", "https://example.com/", "E"); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(t.TempDir(), "state.json")
	st, err := SaveStateFile("src", file)
	if err != nil {
		t.Fatal(err)
	}
	if len(st.Cookies) != 1 || len(st.Marks) != 1 || len(st.Stack.Entries) != 1 {
		t.Fatalf("export counts off: %+v", st)
	}
	cookies, marks, entries, err := LoadStateFile("dst", file)
	if err != nil {
		t.Fatal(err)
	}
	if cookies != 1 || marks != 1 || entries != 1 {
		t.Fatalf("import counts off: %d %d %d", cookies, marks, entries)
	}
	jar, err := LoadJar("dst")
	if err != nil || len(jar) != 1 || jar[0].Value != "abc" {
		t.Fatalf("jar import: %+v err=%v", jar, err)
	}
	cur, ok, err := CurrentStackEntry("dst")
	if err != nil || !ok || cur.URL != "https://example.com/" {
		t.Fatalf("stack import: %+v ok=%v err=%v", cur, ok, err)
	}
	if _, _, _, err := LoadStateFile("dst", filepath.Join(t.TempDir(), "missing.json")); err == nil {
		t.Fatal("missing snapshot imported")
	}
}

func TestCorruptStoreFailsClosed(t *testing.T) {
	isolate(t)
	path, err := profileFile("p", historyFile)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := QueryHistory("p", "", 10); err == nil {
		t.Fatal("corrupt history parsed silently")
	}
	if _, err := LoadStack("p"); err != nil {
		t.Fatalf("stack must survive sibling corruption: %v", err)
	}
}
