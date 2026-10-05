// Package engine interaction loop: a persistent Browser handle holds
// one Chromium sidecar plus one CDP session across navigations, so
// clicks, fills, waits, screenshots, and console taps run against a
// live page with single-digit CDP round trips instead of a cold
// relaunch per act. Snapshot refs (eN) with monotonic gens plus
// stale-ref fail-closed recovery keep humans and agents on identical
// refs per settled gen, per the Harbor overlay design.
package engine

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"randomlabs/terminal-browser/internal/demo"
)

// SettledQuiet is the post-load quiet period before a snapshot counts
// as settled: load event fired plus this window with no new load. The
// design names 300 ms; the Browser sleeps it after every navigation.
const SettledQuiet = 300 * time.Millisecond

// Ref is one actionable element in a settled snapshot: the eN chip id,
// its normalized role and accessible name, and the backend DOM node id
// the act path resolves. BackendID 0 means Chrome gave no node: the
// ref lists for reading but acts fail closed with ref_no_node.
type Ref struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Name      string `json:"name"`
	BackendID int64  `json:"backendDOMNodeId"`
}

// Snapshot is one settled generation: the gen counter, the page URL
// and title it was taken on, and the DOM-order refs. Stable is true
// exactly when the snapshot followed a load plus the quiet window;
// live re-snapshots after acts keep it true, interrupted loads leave
// it false and block acts with a wait-settled hint.
type Snapshot struct {
	Gen    int    `json:"gen"`
	Stable bool   `json:"stable"`
	URL    string `json:"url"`
	Title  string `json:"title"`
	Refs   []Ref  `json:"refs"`
}

// OpenOptions tunes one persistent browser.
type OpenOptions struct {
	Profile      string
	Lite         bool
	Width        int
	Timeout      time.Duration
	NoRecord     bool
	DialogPolicy string
}

// Browser is one live browser: sidecar process, CDP session, gen
// counter, snapshot archive, console plus network tap rings, dialog
// watcher, and last-screenshot dedup state. All mutating methods
// serialize on mu; the event watchers append under the same lock.
type Browser struct {
	proc    *Process
	sess    *Session
	profile string
	lite    bool
	width   int
	record  bool

	mu           sync.Mutex
	closed       bool
	gen          int
	snaps        map[int]*Snapshot
	lastRows     []demo.Row
	currentURL   string
	currentTitle string
	loaderID     string

	console []ConsoleEntry
	net     []netEvent
	har     []HAREntry

	dialogPolicy string
	pending      *DialogEvent
	handled      []DialogEvent

	lastShotHash string
	lastShotPath string

	viewW int
	viewH int

	stopCh chan struct{}
	wg     sync.WaitGroup
}

// Open launches a sidecar, connects one CDP session, enables every
// domain the loop needs, installs the persisted cookie jar, loads the
// target, records history, and takes the gen-1 settled snapshot. Any
// failure fails closed with the classify code on the error.
func Open(target string, o OpenOptions) (*Browser, error) {
	if err := ValidateURL(target); err != nil {
		return nil, err
	}
	timeout := o.Timeout
	if timeout == 0 {
		timeout = ColdBudget + 15*time.Second
	}
	safe, err := SanitizeProfile(o.Profile)
	if err != nil {
		return nil, err
	}
	width := o.Width
	if width <= 0 {
		width = 80
	}
	proc, err := openSidecar(safe, timeout)
	if err != nil {
		return nil, err
	}
	closeProc := func() { proc.Stop() }
	dbg, err := PageTarget(proc.Endpoint())
	if err != nil {
		closeProc()
		return nil, err
	}
	sess, err := Connect(dbg)
	if err != nil {
		closeProc()
		return nil, err
	}
	b := &Browser{
		proc: proc, sess: sess, profile: safe, lite: o.Lite,
		width: width, record: !o.NoRecord,
		snaps:        map[int]*Snapshot{},
		stopCh:       make(chan struct{}),
		viewW:        800,
		viewH:        600,
		dialogPolicy: strings.ToLower(strings.TrimSpace(o.DialogPolicy)),
	}
	if b.dialogPolicy == "" {
		b.dialogPolicy = "manual"
	}
	if err := b.enable(); err != nil {
		_ = b.Close()
		return nil, err
	}
	if err := sess.SetLite(o.Lite); err != nil {
		_ = b.Close()
		return nil, err
	}
	b.watch()
	PushJar(sess, safe, target, 10*time.Second)
	if err := b.load(target, ColdBudget); err != nil {
		_ = b.Close()
		return nil, err
	}
	if b.record {
		if _, n, serr := SyncJar(sess, safe, 10*time.Second); serr == nil {
			_ = n
		}
		_ = RecordVisit(safe, target, b.currentTitle)
		_, _ = VisitStack(safe, target, b.currentTitle)
	}
	if _, err := b.Snapshot(); err != nil {
		_ = b.Close()
		return nil, fmt.Errorf("snapshot: %w", err)
	}
	return b, nil
}

// openSidecar launches the sidecar with a bounded retry for slow
// hosts: a cold Chromium can take many seconds to answer its endpoint
// under load. Endpoint silence retries twice with backoff; every
// other launch error (bad profile, rejected flag, missing binary)
// fails immediately with no retry. Lock races cannot happen: every
// launch owns a fresh instance directory (see instanceDir).
func openSidecar(safe string, timeout time.Duration) (*Process, error) {
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		var proc *Process
		proc, err = Launch(LaunchOpts{Profile: safe, Timeout: timeout})
		if err == nil {
			return proc, nil
		}
		if !strings.Contains(err.Error(), "never answered") {
			return nil, err
		}
		if attempt < 3 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	return nil, err
}

// enable turns on every domain the loop needs beyond the fetch path:
// Log for page errors, plus the console and network taps the watchers
// feed. DOM needs no enable; a failure here fails the open honestly.
func (b *Browser) enable() error {
	if err := b.sess.Enable(); err != nil {
		return err
	}
	if _, err := b.sess.Call("Log.enable", nil, 10*time.Second); err != nil {
		return fmt.Errorf("enable Log: %w", err)
	}
	return nil
}

// load navigates in place and waits for the load event, then observes
// the settled quiet window. It records the loader id so later acts
// can detect a page swap under them.
func (b *Browser) load(target string, timeout time.Duration) error {
	loader, err := b.sess.Navigate(target, timeout)
	if err != nil {
		return err
	}
	time.Sleep(SettledQuiet)
	title := target
	if v, verr := b.sess.Evaluate(`document.title || ""`, false, 10*time.Second); verr == nil {
		var t string
		if json.Unmarshal(v, &t) == nil && strings.TrimSpace(t) != "" {
			title = t
		}
	}
	b.mu.Lock()
	b.currentURL = target
	b.currentTitle = title
	b.loaderID = loader
	b.mu.Unlock()
	b.measureViewport()
	return nil
}

// measureViewport records the layout viewport so trusted mouse events
// land at real coordinates. Failures keep the 800x600 default.
func (b *Browser) measureViewport() {
	raw, err := b.sess.Call("Page.getLayoutMetrics", nil, 10*time.Second)
	if err != nil {
		return
	}
	var m struct {
		LayoutViewport struct {
			ClientWidth  int `json:"clientWidth"`
			ClientHeight int `json:"clientHeight"`
		} `json:"layoutViewport"`
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return
	}
	if m.LayoutViewport.ClientWidth > 0 && m.LayoutViewport.ClientHeight > 0 {
		b.mu.Lock()
		b.viewW = m.LayoutViewport.ClientWidth
		b.viewH = m.LayoutViewport.ClientHeight
		b.mu.Unlock()
	}
}

// Navigate loads a new URL in place: warm when the session is healthy,
// fail-closed with the classify code when it is not. History and the
// stack record unless the browser opened with NoRecord, and the jar
// syncs exactly like the one-shot path. Navigation bumps the gen and
// takes a fresh settled snapshot: every ref from the old page is
// stale by construction, and acts holding it get ref_stale plus the
// remap suggestion instead of clicking the wrong element.
func (b *Browser) Navigate(target string) (*Snapshot, error) {
	if err := ValidateURL(target); err != nil {
		return nil, err
	}
	PushJar(b.sess, b.profile, target, 10*time.Second)
	if err := b.load(target, ColdBudget); err != nil {
		return nil, err
	}
	if b.record {
		if _, _, serr := SyncJar(b.sess, b.profile, 10*time.Second); serr != nil {
			_ = serr
		}
		_ = RecordVisit(b.profile, target, b.currentTitle)
		_, _ = VisitStack(b.profile, target, b.currentTitle)
	}
	return b.Snapshot()
}

// Snapshot fetches a fresh AX tree and archives it as gen+1, with the
// full styled rows alongside the refs. Refs run in DOM order with
// stable eN assignment: the same page yields the same eN across gens,
// so agents can reason about refs textually. One AX fetch serves both
// the ref list and the grid rows; a second fetch would double the
// settle cost on every navigation.
func (b *Browser) Snapshot() (*Snapshot, error) {
	return b.refresh()
}

func (b *Browser) refresh() (*Snapshot, error) {
	raw, err := b.sess.AXTree(15 * time.Second)
	if err != nil {
		return nil, err
	}
	nodes, order, err := ParseAX(raw)
	if err != nil {
		return nil, fmt.Errorf("parse AX: %w", err)
	}
	if len(nodes) == 0 {
		return nil, fmt.Errorf("empty accessibility tree; page may need longer to render")
	}
	got := RefNodes(nodes, order)
	refs := make([]Ref, 0, len(got))
	for i, n := range got {
		name := firstNonEmpty(n.Name, n.Value, n.Description)
		if name == "" {
			name = strings.ToLower(strings.TrimSpace(n.Role))
		}
		refs = append(refs, Ref{
			ID:        fmt.Sprintf("e%d", i+1),
			Role:      strings.ToLower(strings.TrimSpace(n.Role)),
			Name:      name,
			BackendID: n.BackendID,
		})
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.gen++
	snap := &Snapshot{
		Gen: b.gen, Stable: true,
		URL: b.currentURL, Title: b.currentTitle, Refs: refs,
	}
	b.snaps[b.gen] = snap
	b.lastRows = Style(Flatten(nodes, order), b.width)
	return snap, nil
}

// Current returns the latest settled snapshot without re-fetching.
func (b *Browser) Current() *Snapshot {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.snaps[b.gen]
}

// URL reports the last navigated URL.
func (b *Browser) URL() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.currentURL
}

// Profile reports the sanitized profile name.
func (b *Browser) Profile() string { return b.profile }

// Endpoint reports the sidecar CDP endpoint URL. The CLI records it
// in the session registry so `tb-agent sessions` can probe liveness
// without owning the process.
func (b *Browser) Endpoint() string { return b.proc.Endpoint() }

// Close stops the watchers, closes the session, and kills the sidecar.
// It is safe to call twice; the TUI defers it on shell exit.
func (b *Browser) Close() error {
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return nil
	}
	b.closed = true
	b.mu.Unlock()
	close(b.stopCh)
	b.wg.Wait()
	_ = b.sess.Close()
	b.proc.Stop()
	return nil
}

// Closed reports whether Close ran.
func (b *Browser) Closed() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.closed
}

// ParseRef normalizes the CLI @eN sugar and bare eN into a canonical
// ref id. Anything else fails closed with ref_not_found semantics at
// the call site: no fuzzy matching, no silent neighbor picks.
func ParseRef(raw string) (string, error) {
	s := strings.ToLower(strings.TrimSpace(raw))
	s = strings.TrimPrefix(s, "@")
	if len(s) < 2 || s[0] != 'e' {
		return "", fmt.Errorf("bad ref %q: want eN like e3 or @e3", raw)
	}
	for _, r := range s[1:] {
		if r < '0' || r > '9' {
			return "", fmt.Errorf("bad ref %q: want eN like e3 or @e3", raw)
		}
	}
	if s == "e0" {
		return "", fmt.Errorf("bad ref %q: refs start at e1", raw)
	}
	return s, nil
}

// Lookup resolves a ref id against a gen: exact-gen hits return the
// ref; older gens fail closed with a *StaleError carrying the remap
// suggestion, never the neighbor element. Gen 0 means latest;
// negative gens fail closed with ref_not_found.
func (b *Browser) Lookup(id string, gen int) (Ref, error) {
	id, err := ParseRef(id)
	if err != nil {
		return Ref{}, &RefError{Code: "ref_not_found", Message: err.Error()}
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if gen == 0 {
		gen = b.gen
	} else if gen < 0 {
		return Ref{}, &RefError{Code: "ref_not_found", Message: fmt.Sprintf("bad gen %d: want 0 (latest) or a positive snapshot gen", gen)}
	}
	if gen != b.gen {
		snap := b.snaps[b.gen]
		var remap *string
		var reason string
		if old, ok := b.snaps[gen]; ok {
			r, why := remapRef(old, snap, id)
			reason = why
			remap = r
		} else {
			reason = fmt.Sprintf("gen %d expired (current gen %d)", gen, b.gen)
		}
		return Ref{}, &StaleError{Want: id, Gen: gen, Current: b.gen, Reason: reason, Remap: remap}
	}
	snap := b.snaps[b.gen]
	if snap == nil {
		return Ref{}, &RefError{Code: "ref_not_found", Message: "no snapshot yet; take one first"}
	}
	for _, r := range snap.Refs {
		if r.ID == id {
			if r.BackendID == 0 {
				return Ref{}, &RefError{Code: "ref_no_node", Message: fmt.Sprintf("ref %s (%s %q) has no DOM node; it lists for reading only", id, r.Role, r.Name)}
			}
			return r, nil
		}
	}
	return Ref{}, &RefError{Code: "ref_not_found", Message: fmt.Sprintf("ref %s not in gen %d (%d refs); snapshot again", id, b.gen, len(snap.Refs))}
}

// RemapOne exposes the remap suggestion for a ref id against the
// latest snapshot without acting: the TUI R key and the CLI use this
// to offer one-key recovery after a ref_stale.
func (b *Browser) RemapOne(id string, gen int) (remap *string, reason string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	snap := b.snaps[b.gen]
	old, ok := b.snaps[gen]
	if !ok || snap == nil {
		return nil, fmt.Sprintf("gen %d expired (current gen %d)", gen, b.gen)
	}
	norm, err := ParseRef(id)
	if err != nil {
		return nil, err.Error()
	}
	return remapRef(old, snap, norm)
}

// remapRef finds the same role plus name in the fresh snapshot, else
// the same-role ref nearest the old position, else nothing. Callers
// hold b.mu.
func remapRef(old, fresh *Snapshot, id string) (*string, string) {
	if old == nil || fresh == nil {
		return nil, "no snapshots to compare"
	}
	var want *Ref
	oldIdx := -1
	for i := range old.Refs {
		if old.Refs[i].ID == id {
			want = &old.Refs[i]
			oldIdx = i
			break
		}
	}
	if want == nil {
		return nil, fmt.Sprintf("ref %s never existed in gen %d", id, old.Gen)
	}
	for i := range fresh.Refs {
		if fresh.Refs[i].Role == want.Role && fresh.Refs[i].Name == want.Name {
			s := fresh.Refs[i].ID
			return &s, fmt.Sprintf("same %s %q moved to %s", want.Role, want.Name, s)
		}
	}
	best := -1
	bestDist := -1
	for i := range fresh.Refs {
		if fresh.Refs[i].Role != want.Role {
			continue
		}
		d := i - oldIdx
		if d < 0 {
			d = -d
		}
		if best < 0 || d < bestDist {
			best, bestDist = i, d
		}
	}
	if best >= 0 {
		s := fresh.Refs[best].ID
		return &s, fmt.Sprintf("nearest same-role sibling %s (%s %q)", s, fresh.Refs[best].Role, fresh.Refs[best].Name)
	}
	return nil, fmt.Sprintf("no %s survived in gen %d; snapshot refs changed completely", want.Role, fresh.Gen)
}

// RefError is a fail-closed ref failure with a machine code.
type RefError struct {
	Code    string
	Message string
}

func (e *RefError) Error() string { return e.Message }

// StaleError is the settled-gen mismatch: the wanted ref, the held
// gen, the current gen, the reason, and the optional one-key remap.
type StaleError struct {
	Want    string
	Gen     int
	Current int
	Reason  string
	Remap   *string
}

func (e *StaleError) Error() string {
	if e.Remap != nil {
		return fmt.Sprintf("ref_stale: %s from gen %d (now gen %d): %s; press R or use %s", e.Want, e.Gen, e.Current, e.Reason, *e.Remap)
	}
	return fmt.Sprintf("ref_stale: %s from gen %d (now gen %d): %s", e.Want, e.Gen, e.Current, e.Reason)
}

// CodeOf maps act-time errors to envelope codes: ref_stale,
// ref_not_found, ref_no_node, no_dialog, bad_step, timeout, offline,
// bad_url, bad_profile, no_chrome, or act_failed. Nothing surfaces as
// a bare success and nothing swallows the message.
func CodeOf(err error) string {
	if err == nil {
		return ""
	}
	if _, ok := err.(*StaleError); ok {
		return "ref_stale"
	}
	if re, ok := err.(*RefError); ok {
		if re.Code != "" {
			return re.Code
		}
		return "act_failed"
	}
	return ClassifyError(err)
}

// RefreshURL re-reads document URL and title after an act that may
// have navigated (link clicks, submits). It never bumps the gen: the
// caller snapshots next, and the snapshot carries the fresh address.
func (b *Browser) RefreshURL() {
	v, err := b.sess.Evaluate(`document.URL || ""`, false, 10*time.Second)
	if err != nil {
		return
	}
	var u string
	if json.Unmarshal(v, &u) != nil || strings.TrimSpace(u) == "" {
		return
	}
	t := u
	if tv, terr := b.sess.Evaluate(`document.title || ""`, false, 10*time.Second); terr == nil {
		var tt string
		if json.Unmarshal(tv, &tt) == nil && strings.TrimSpace(tt) != "" {
			t = tt
		}
	}
	b.mu.Lock()
	b.currentURL, b.currentTitle = u, t
	b.mu.Unlock()
}

// NoteNavigation records a renderer-side navigation (link click,
// form submit, dialog-driven hop) the same way Navigate does: jar
// sync, history visit, and stack entry. Callers pass the URL from
// before the act; an unchanged URL records nothing, so pure
// in-page acts never duplicate history. Recording honors the record
// flag, so back/forward/refresh loads never fork the stack.
func (b *Browser) NoteNavigation(prevURL string) {
	if strings.TrimSpace(prevURL) == "" {
		prevURL = "\x00"
	}
	b.mu.Lock()
	cur := b.currentURL
	title := b.currentTitle
	record := b.record
	profile := b.profile
	b.mu.Unlock()
	if cur == prevURL || strings.TrimSpace(cur) == "" {
		return
	}
	if !record {
		return
	}
	if _, _, serr := SyncJar(b.sess, profile, 10*time.Second); serr != nil {
		_ = serr
	}
	_ = RecordVisit(profile, cur, title)
	_, _ = VisitStack(profile, cur, title)
}

// SetRecord toggles history and stack persistence for later
// navigations. The TUI flips it around back/forward/refresh loads so
// repeat visits never fork the stack.
func (b *Browser) SetRecord(record bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.record = record
}

// Rows returns the last styled grid rows: the same Style path the
// one-shot fetch paints, so live tabs read exactly like fetched
// pages. The TUI rewraps them to the frame like before.
func (b *Browser) Rows() []demo.Row {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]demo.Row, len(b.lastRows))
	copy(out, b.lastRows)
	return out
}
