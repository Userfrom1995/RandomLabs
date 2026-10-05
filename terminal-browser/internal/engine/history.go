package engine

import (
	"fmt"
	"strings"
	"time"
)

// Visit is one recorded page view: the URL as loaded, the title as
// rendered, and the Unix second it completed.
type Visit struct {
	URL     string `json:"url"`
	Title   string `json:"title"`
	At      int64  `json:"at"`
	Profile string `json:"profile,omitempty"`
}

// Bookmark is one saved page: URL plus title plus creation time.
type Bookmark struct {
	URL     string `json:"url"`
	Title   string `json:"title"`
	Created int64  `json:"created"`
}

// History caps: newest visits survive, oldest prune first. The stack
// cap is smaller because it holds live back/forward state, not audit.
const (
	maxHistoryEntries = 5000
	maxStackEntries   = 200
)

const (
	historyFile  = "history.json"
	bookmarkFile = "bookmarks.json"
	sessionFile  = "session.json"
)

// RecordVisit appends a completed navigation to the profile history.
// Empty URLs are dropped; failures to persist never fail the calling
// navigation, they surface as the returned error for the CLI to
// report honestly.
func RecordVisit(profile, url, title string) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return fmt.Errorf("record visit: empty url")
	}
	path, err := profileFile(profile, historyFile)
	if err != nil {
		return err
	}
	var visits []Visit
	if err := readStore(path, &visits); err != nil {
		return err
	}
	safe, _ := SanitizeProfile(profile)
	visits = append(visits, Visit{URL: url, Title: title, At: time.Now().Unix(), Profile: safe})
	if len(visits) > maxHistoryEntries {
		visits = visits[len(visits)-maxHistoryEntries:]
	}
	return writeStore(path, visits)
}

// QueryHistory returns visits newest-first, filtered by a
// case-insensitive substring over URL and title. Empty query matches
// everything. Limit <= 0 means 50; the cap keeps CLI output bounded.
func QueryHistory(profile, query string, limit int) ([]Visit, error) {
	if limit <= 0 {
		limit = 50
	}
	path, err := profileFile(profile, historyFile)
	if err != nil {
		return nil, err
	}
	var visits []Visit
	if err := readStore(path, &visits); err != nil {
		return nil, err
	}
	q := strings.ToLower(strings.TrimSpace(query))
	out := make([]Visit, 0, limit)
	for i := len(visits) - 1; i >= 0 && len(out) < limit; i-- {
		v := visits[i]
		if q != "" && !strings.Contains(strings.ToLower(v.URL), q) && !strings.Contains(strings.ToLower(v.Title), q) {
			continue
		}
		out = append(out, v)
	}
	return out, nil
}

// ClearHistory drops every visit for the profile and reports how many
// were removed.
func ClearHistory(profile string) (int, error) {
	path, err := profileFile(profile, historyFile)
	if err != nil {
		return 0, err
	}
	var visits []Visit
	if err := readStore(path, &visits); err != nil {
		return 0, err
	}
	if err := writeStore(path, []Visit{}); err != nil {
		return 0, err
	}
	return len(visits), nil
}

// AddBookmark saves a page; re-adding the same URL updates its title
// instead of duplicating the row.
func AddBookmark(profile, url, title string) error {
	url = strings.TrimSpace(url)
	if url == "" {
		return fmt.Errorf("add bookmark: empty url")
	}
	path, err := profileFile(profile, bookmarkFile)
	if err != nil {
		return err
	}
	var marks []Bookmark
	if err := readStore(path, &marks); err != nil {
		return err
	}
	for i, m := range marks {
		if m.URL == url {
			marks[i].Title = title
			return writeStore(path, marks)
		}
	}
	marks = append(marks, Bookmark{URL: url, Title: title, Created: time.Now().Unix()})
	return writeStore(path, marks)
}

// RemoveBookmark deletes one URL. It reports whether a row existed.
func RemoveBookmark(profile, url string) (bool, error) {
	path, err := profileFile(profile, bookmarkFile)
	if err != nil {
		return false, err
	}
	var marks []Bookmark
	if err := readStore(path, &marks); err != nil {
		return false, err
	}
	kept := marks[:0]
	found := false
	for _, m := range marks {
		if m.URL == url {
			found = true
			continue
		}
		kept = append(kept, m)
	}
	if !found {
		return false, nil
	}
	return true, writeStore(path, kept)
}

// ListBookmarks returns bookmarks oldest-first (creation order).
func ListBookmarks(profile string) ([]Bookmark, error) {
	path, err := profileFile(profile, bookmarkFile)
	if err != nil {
		return nil, err
	}
	var marks []Bookmark
	if err := readStore(path, &marks); err != nil {
		return nil, err
	}
	if marks == nil {
		marks = []Bookmark{}
	}
	return marks, nil
}

// NavStack is the persisted back/forward state for one profile:
// entries in visit order plus the index of the current entry.
type NavStack struct {
	Entries []Visit `json:"entries"`
	Index   int     `json:"index"`
}

// LoadStack reads the persisted stack. Empty profiles yield an empty
// stack at index -1 (no current entry), never an error.
func LoadStack(profile string) (*NavStack, error) {
	path, err := profileFile(profile, sessionFile)
	if err != nil {
		return nil, err
	}
	st := &NavStack{Index: -1}
	if err := readStore(path, st); err != nil {
		return nil, err
	}
	if st.Entries == nil {
		st.Entries = []Visit{}
	}
	if len(st.Entries) == 0 {
		st.Index = -1
		return st, nil
	}
	if st.Index < 0 {
		st.Index = 0
	}
	if st.Index >= len(st.Entries) {
		st.Index = len(st.Entries) - 1
	}
	return st, nil
}

func saveStack(profile string, st *NavStack) error {
	path, err := profileFile(profile, sessionFile)
	if err != nil {
		return err
	}
	return writeStore(path, st)
}

// VisitStack records a navigation: forward entries truncate (a new
// visit after Back discards the redo path, matching browser
// semantics), the entry appends, and the index lands on it.
func VisitStack(profile, url, title string) (*NavStack, error) {
	url = strings.TrimSpace(url)
	if url == "" {
		return nil, fmt.Errorf("visit stack: empty url")
	}
	st, err := LoadStack(profile)
	if err != nil {
		return nil, err
	}
	if st.Index >= 0 && st.Index+1 < len(st.Entries) {
		st.Entries = st.Entries[:st.Index+1]
	}
	safe, _ := SanitizeProfile(profile)
	st.Entries = append(st.Entries, Visit{URL: url, Title: title, At: time.Now().Unix(), Profile: safe})
	if len(st.Entries) > maxStackEntries {
		st.Entries = st.Entries[len(st.Entries)-maxStackEntries:]
	}
	st.Index = len(st.Entries) - 1
	return st, saveStack(profile, st)
}

// Back moves one entry back and reports the entry to load. At the
// oldest entry (or on an empty stack) it reports ok=false and leaves
// the stack untouched.
func Back(profile string) (Visit, bool, error) {
	st, err := LoadStack(profile)
	if err != nil {
		return Visit{}, false, err
	}
	if st.Index <= 0 {
		return Visit{}, false, nil
	}
	st.Index--
	if err := saveStack(profile, st); err != nil {
		return Visit{}, false, err
	}
	return st.Entries[st.Index], true, nil
}

// Forward moves one entry forward and reports the entry to load. Past
// the newest entry it reports ok=false and leaves the stack
// untouched.
func Forward(profile string) (Visit, bool, error) {
	st, err := LoadStack(profile)
	if err != nil {
		return Visit{}, false, err
	}
	if st.Index < 0 || st.Index+1 >= len(st.Entries) {
		return Visit{}, false, nil
	}
	st.Index++
	if err := saveStack(profile, st); err != nil {
		return Visit{}, false, err
	}
	return st.Entries[st.Index], true, nil
}

// CurrentStackEntry reports the entry a restart should restore.
// ok=false means the profile never navigated: callers fall back to
// the home fixture instead of inventing an address.
func CurrentStackEntry(profile string) (Visit, bool, error) {
	st, err := LoadStack(profile)
	if err != nil {
		return Visit{}, false, err
	}
	if st.Index < 0 || st.Index >= len(st.Entries) {
		return Visit{}, false, nil
	}
	return st.Entries[st.Index], true, nil
}
