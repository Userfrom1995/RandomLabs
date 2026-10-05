package engine

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// Cookie is one HTTP cookie in CDP Storage shape, which doubles as the
// jar file shape: the same struct crosses the wire and the disk, so a
// sync round-trip never loses fields to translation.
type Cookie struct {
	Name     string `json:"name"`
	Value    string `json:"value"`
	Domain   string `json:"domain,omitempty"`
	Path     string `json:"path,omitempty"`
	Expires  int64  `json:"expires,omitempty"`
	HTTPOnly bool   `json:"httpOnly,omitempty"`
	Secure   bool   `json:"secure,omitempty"`
	Session  bool   `json:"session,omitempty"`
	SameSite string `json:"sameSite,omitempty"`
}

const cookieFile = "cookies.json"

// cookieKey identifies one jar row: name plus domain plus path, the
// same triple browsers use to decide replacement.
func cookieKey(c Cookie) string {
	return c.Name + "\x00" + strings.ToLower(c.Domain) + "\x00" + c.Path
}

// GetCookies returns every cookie the page context currently holds
// via the CDP Storage domain. No enable call is needed: Storage
// answers without one.
func (s *Session) GetCookies(timeout time.Duration) ([]Cookie, error) {
	raw, err := s.Call("Storage.getCookies", map[string]interface{}{}, timeout)
	if err != nil {
		return nil, err
	}
	var out struct {
		Cookies []Cookie `json:"cookies"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("decode cookies: %w", err)
	}
	if out.Cookies == nil {
		out.Cookies = []Cookie{}
	}
	return out.Cookies, nil
}

// SetCookie installs one cookie into the page context. CDP requires a
// URL or a domain: jar rows carry domains, so the call builds a URL
// from the domain when no explicit URL is set.
func (s *Session) SetCookie(c Cookie, pageURL string, timeout time.Duration) error {
	name := strings.TrimSpace(c.Name)
	if name == "" {
		return fmt.Errorf("set cookie: empty name")
	}
	params := map[string]interface{}{"name": name, "value": c.Value}
	if c.Domain != "" {
		params["domain"] = c.Domain
	}
	if c.Path != "" {
		params["path"] = c.Path
	} else {
		params["path"] = "/"
	}
	if c.Expires > 0 {
		params["expires"] = c.Expires
	}
	if c.HTTPOnly {
		params["httpOnly"] = true
	}
	if c.Secure {
		params["secure"] = true
	}
	switch strings.ToLower(strings.TrimSpace(c.SameSite)) {
	case "strict", "lax", "none":
		params["sameSite"] = strings.ToLower(strings.TrimSpace(c.SameSite))
	}
	if pageURL != "" {
		params["url"] = pageURL
	} else if c.Domain != "" {
		scheme := "https://"
		if strings.HasPrefix(strings.ToLower(c.Domain), "localhost") || strings.HasPrefix(c.Domain, "127.") {
			scheme = "http://"
		}
		params["url"] = scheme + strings.TrimPrefix(c.Domain, ".")
	}
	raw, err := s.Call("Storage.setCookie", params, timeout)
	if err != nil {
		return err
	}
	var ok struct {
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(raw, &ok); err != nil {
		return fmt.Errorf("decode setCookie: %w", err)
	}
	if !ok.Success {
		return fmt.Errorf("set cookie %q refused by the page context", name)
	}
	return nil
}

// ClearCookiesForContext drops every cookie in the page context.
func (s *Session) ClearCookiesForContext(timeout time.Duration) error {
	_, err := s.Call("Storage.clearCookies", map[string]interface{}{}, timeout)
	return err
}

// LoadJar reads the persisted jar for a profile. Fresh profiles yield
// an empty jar, never an error.
func LoadJar(profile string) ([]Cookie, error) {
	path, err := profileFile(profile, cookieFile)
	if err != nil {
		return nil, err
	}
	var jar []Cookie
	if err := readStore(path, &jar); err != nil {
		return nil, err
	}
	if jar == nil {
		jar = []Cookie{}
	}
	return jar, nil
}

// SaveJar replaces the persisted jar wholesale. Callers that merge
// must load first; blind saves would drop cookies the page set
// outside the caller's view.
func SaveJar(profile string, jar []Cookie) error {
	if jar == nil {
		jar = []Cookie{}
	}
	path, err := profileFile(profile, cookieFile)
	if err != nil {
		return err
	}
	return writeStore(path, jar)
}

// MergeJar folds freshly synced cookies into the jar, keyed by
// name/domain/path, and persists the union. It returns the merged jar
// plus how many rows the sync touched.
func MergeJar(profile string, fresh []Cookie) ([]Cookie, int, error) {
	jar, err := LoadJar(profile)
	if err != nil {
		return nil, 0, err
	}
	slot := make(map[string]int, len(jar)+len(fresh))
	for i, c := range jar {
		slot[cookieKey(c)] = i
	}
	touched := 0
	for _, c := range fresh {
		if strings.TrimSpace(c.Name) == "" {
			continue
		}
		if i, ok := slot[cookieKey(c)]; ok {
			jar[i] = c
		} else {
			slot[cookieKey(c)] = len(jar)
			jar = append(jar, c)
		}
		touched++
	}
	if err := SaveJar(profile, jar); err != nil {
		return nil, 0, err
	}
	return jar, touched, nil
}

// SetJarCookie inserts or replaces one jar row by key. Empty names
// fail closed: nameless rows corrupt every later merge.
func SetJarCookie(profile string, c Cookie) ([]Cookie, error) {
	if strings.TrimSpace(c.Name) == "" {
		return nil, fmt.Errorf("set jar cookie: empty name")
	}
	jar, err := LoadJar(profile)
	if err != nil {
		return nil, err
	}
	replaced := false
	for i, e := range jar {
		if cookieKey(e) == cookieKey(c) {
			jar[i] = c
			replaced = true
			break
		}
	}
	if !replaced {
		jar = append(jar, c)
	}
	if err := SaveJar(profile, jar); err != nil {
		return nil, err
	}
	return jar, nil
}

// ClearJar drops the whole persisted jar and reports the row count.
func ClearJar(profile string) (int, error) {
	jar, err := LoadJar(profile)
	if err != nil {
		return 0, err
	}
	if err := SaveJar(profile, []Cookie{}); err != nil {
		return 0, err
	}
	return len(jar), nil
}

// PushJar installs every persisted jar cookie into the live page
// context before navigation, so a restarted process resumes logged-in
// sessions. Rows that the page refuses (expired, domain mismatch)
// count as skipped, never as navigation failures.
func PushJar(sess *Session, profile, pageURL string, timeout time.Duration) (applied, skipped int) {
	jar, err := LoadJar(profile)
	if err != nil || sess == nil {
		return 0, len(jar)
	}
	for _, c := range jar {
		if err := sess.SetCookie(c, pageURL, timeout); err != nil {
			skipped++
			continue
		}
		applied++
	}
	return applied, skipped
}

// SyncJar copies the live page cookies back into the jar after a
// successful load. It returns the persisted jar plus the synced row
// count; sync errors propagate so callers can warn honestly.
func SyncJar(sess *Session, profile string, timeout time.Duration) ([]Cookie, int, error) {
	if sess == nil {
		jar, err := LoadJar(profile)
		return jar, 0, err
	}
	fresh, err := sess.GetCookies(timeout)
	if err != nil {
		return nil, 0, err
	}
	merged, touched, err := MergeJar(profile, fresh)
	if err != nil {
		return nil, 0, err
	}
	return merged, touched, nil
}

// State is the portable session snapshot: cookies plus bookmarks plus
// the navigation stack. Saving and loading it moves a login session
// across machines or backs it up before risky automation.
type State struct {
	Exported int64      `json:"exported"`
	Profile  string     `json:"profile"`
	Cookies  []Cookie   `json:"cookies"`
	Marks    []Bookmark `json:"bookmarks"`
	Stack    *NavStack  `json:"stack,omitempty"`
}

// ExportState snapshots the profile into one portable struct.
func ExportState(profile string) (*State, error) {
	safe, _ := SanitizeProfile(profile)
	jar, err := LoadJar(profile)
	if err != nil {
		return nil, err
	}
	marks, err := ListBookmarks(profile)
	if err != nil {
		return nil, err
	}
	st, err := LoadStack(profile)
	if err != nil {
		return nil, err
	}
	return &State{Exported: time.Now().Unix(), Profile: safe, Cookies: jar, Marks: marks, Stack: st}, nil
}

// ImportState restores a snapshot over the profile: jar replaced,
// bookmarks replaced, stack replaced. It returns the counts it wrote.
func ImportState(profile string, st *State) (cookies, marks, entries int, err error) {
	if st == nil {
		return 0, 0, 0, fmt.Errorf("import state: nil snapshot")
	}
	jar := st.Cookies
	if jar == nil {
		jar = []Cookie{}
	}
	for _, c := range jar {
		if strings.TrimSpace(c.Name) == "" {
			return 0, 0, 0, fmt.Errorf("import state: cookie with empty name refused")
		}
	}
	if err := SaveJar(profile, jar); err != nil {
		return 0, 0, 0, err
	}
	mk := st.Marks
	if mk == nil {
		mk = []Bookmark{}
	}
	bpath, err := profileFile(profile, bookmarkFile)
	if err != nil {
		return 0, 0, 0, err
	}
	if err := writeStore(bpath, mk); err != nil {
		return 0, 0, 0, err
	}
	stack := st.Stack
	if stack == nil {
		stack = &NavStack{Entries: []Visit{}, Index: -1}
	}
	if stack.Entries == nil {
		stack.Entries = []Visit{}
	}
	if len(stack.Entries) == 0 {
		stack.Index = -1
	} else {
		if stack.Index < 0 {
			stack.Index = 0
		}
		if stack.Index >= len(stack.Entries) {
			stack.Index = len(stack.Entries) - 1
		}
	}
	if err := saveStack(profile, stack); err != nil {
		return 0, 0, 0, err
	}
	return len(jar), len(mk), len(stack.Entries), nil
}

// SaveStateFile exports the profile snapshot to an explicit path
// (0600, atomic). LoadStateFile imports it back.
func SaveStateFile(profile, path string) (*State, error) {
	st, err := ExportState(profile)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(path) == "" {
		return nil, fmt.Errorf("save state: empty path")
	}
	if err := writeStore(path, st); err != nil {
		return nil, err
	}
	return st, nil
}

// LoadStateFile reads a snapshot file and imports it over the
// profile. Corrupt files fail closed before touching any store.
func LoadStateFile(profile, path string) (cookies, marks, entries int, err error) {
	if strings.TrimSpace(path) == "" {
		return 0, 0, 0, fmt.Errorf("load state: empty path")
	}
	// Unlike profile stores (where a missing file means "fresh and
	// empty"), a snapshot path is caller-chosen: a missing file is a
	// usage error and fails closed before touching any store.
	if _, err := os.Stat(path); err != nil {
		return 0, 0, 0, fmt.Errorf("load state %s: %w", path, err)
	}
	var st State
	if err := readStore(path, &st); err != nil {
		return 0, 0, 0, err
	}
	return ImportState(profile, &st)
}
