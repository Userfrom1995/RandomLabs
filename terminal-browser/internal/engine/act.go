package engine

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// Act primitives: every op resolves a snapshot ref to a live DOM
// object through DOM.resolveNode, then drives it with trusted Input
// events (real mouse and key traffic the page cannot distinguish from
// a human) or with DOM-scoped JS calls on the resolved object. A
// resolve failure means the node is gone: the act takes a fresh
// snapshot and fails closed with ref_stale plus the remap suggestion,
// never clicking a neighbor.

// point is a viewport coordinate in CSS pixels.
type point struct{ X, Y float64 }

// boxOf returns the in-viewport center of the element behind objectID:
// scrollIntoView first (trusted pages move under the agent exactly as
// they do under a human), then the content-quad center. Zero-area
// boxes fail closed: hidden elements are not clickable.
func (s *Session) boxOf(objectID string, timeout time.Duration) (point, error) {
	if _, err := s.Call("DOM.scrollIntoViewIfNeeded", map[string]interface{}{"objectId": objectID}, timeout); err != nil {
		return point{}, fmt.Errorf("scroll into view: %w", err)
	}
	raw, err := s.Call("DOM.getBoxModel", map[string]interface{}{"objectId": objectID}, timeout)
	if err != nil {
		return point{}, fmt.Errorf("box model: %w", err)
	}
	var m struct {
		Model struct {
			Content []float64 `json:"content"`
			Width   float64   `json:"width"`
			Height  float64   `json:"height"`
		} `json:"model"`
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return point{}, fmt.Errorf("decode box: %w", err)
	}
	if m.Model.Width <= 0 || m.Model.Height <= 0 || len(m.Model.Content) < 8 {
		return point{}, fmt.Errorf("element has zero area; refusing to click a hidden node")
	}
	q := m.Model.Content
	return point{X: (q[0] + q[2] + q[4] + q[6]) / 4, Y: (q[1] + q[3] + q[5] + q[7]) / 4}, nil
}

// resolve turns a backend DOM node id into a Runtime object id the
// act calls run against.
func (s *Session) resolve(backendID int64, timeout time.Duration) (string, error) {
	raw, err := s.Call("DOM.resolveNode", map[string]interface{}{"backendNodeId": backendID}, timeout)
	if err != nil {
		return "", err
	}
	var out struct {
		Object struct {
			ObjectID string `json:"objectId"`
		} `json:"object"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("decode resolve: %w", err)
	}
	if out.Object.ObjectID == "" {
		return "", fmt.Errorf("node %d no longer resolves; the page changed under the snapshot", backendID)
	}
	return out.Object.ObjectID, nil
}

// callOn runs fn on the resolved object and returns the raw value.
// DOM reads and writes go through this so every act touches the
// exact resolved node, never a re-queried lookalike. CDP invokes the
// function with the node as `this` (not as the first parameter), so
// every fn body reads the element through `this`; declared parameters
// carry the JSON arguments only.
func (s *Session) callOn(objectID, fn string, arg interface{}, timeout time.Duration) (json.RawMessage, error) {
	params := map[string]interface{}{
		"objectId":           objectID,
		"functionDeclaration": fn,
		"returnByValue":       true,
	}
	if arg != nil {
		b, err := json.Marshal(arg)
		if err != nil {
			return nil, err
		}
		params["arguments"] = []map[string]interface{}{{"value": json.RawMessage(b)}}
	}
	raw, err := s.Call("Runtime.callFunctionOn", params, timeout)
	if err != nil {
		return nil, err
	}
	var out struct {
		Result struct {
			Value json.RawMessage `json:"value"`
		} `json:"result"`
		Exception *struct {
			Text string `json:"text"`
		} `json:"exceptionDetails"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out.Exception != nil {
		return nil, fmt.Errorf("page function: %s", out.Exception.Text)
	}
	return out.Result.Value, nil
}

// mouse dispatches one trusted mouse event at p. typ is the full CDP
// type: mouseMoved, mousePressed, mouseReleased, or mouseWheel.
func (s *Session) mouse(typ string, p point, button string, clickCount int, buttons int, timeout time.Duration) error {
	params := map[string]interface{}{
		"type": typ, "x": p.X, "y": p.Y,
		"button": button, "clickCount": clickCount, "buttons": buttons,
	}
	_, err := s.Call("Input.dispatchMouseEvent", params, timeout)
	return err
}

// ClickObject left-clicks the resolved object with trusted mouse
// traffic at its box center: press plus release with no movement in
// between, exactly what a human click produces.
func (s *Session) ClickObject(objectID string, timeout time.Duration) error {
	p, err := s.boxOf(objectID, timeout)
	if err != nil {
		return err
	}
	if err := s.mouse("mouseMoved", p, "none", 0, 0, timeout); err != nil {
		return fmt.Errorf("hover before click: %w", err)
	}
	if err := s.mouse("mousePressed", p, "left", 1, 1, timeout); err != nil {
		return fmt.Errorf("press: %w", err)
	}
	if err := s.mouse("mouseReleased", p, "left", 1, 0, timeout); err != nil {
		return fmt.Errorf("release: %w", err)
	}
	return nil
}

// releaseTimeout bounds the mouse release: a modal JavaScript dialog
// blocks the renderer, so the release response may never arrive. The
// Browser treats a timeout with a pending dialog as a landed click.
const releaseTimeout = 4 * time.Second

// isTimeoutErr reports CDP round-trip timeouts for the dialog-hang
// tolerance: only timeouts consult the pending dialog, never logic
// errors.
func isTimeoutErr(err error) bool {
	return err != nil && strings.Contains(err.Error(), "timeout after")
}

// clickOID clicks a resolved object with modal-dialog release
// tolerance: trusted move plus press, then a short-budget release. A
// release timeout with a dialog now pending means the click landed
// and opened the dialog; the dialog op answers it next.
func (b *Browser) clickOID(oid string) error {
	p, err := b.sess.boxOf(oid, actTimeout)
	if err != nil {
		return err
	}
	if err := b.sess.mouse("mouseMoved", p, "none", 0, 0, actTimeout); err != nil {
		return fmt.Errorf("hover before click: %w", err)
	}
	if err := b.sess.mouse("mousePressed", p, "left", 1, 1, actTimeout); err != nil {
		return fmt.Errorf("press: %w", err)
	}
	if err := b.sess.mouse("mouseReleased", p, "left", 1, 0, releaseTimeout); err != nil {
		if isTimeoutErr(err) {
			time.Sleep(500 * time.Millisecond)
			if b.PendingDialog() != nil {
				return nil
			}
		}
		return fmt.Errorf("release: %w", err)
	}
	return nil
}

// keyCodes maps key names to Windows virtual key codes for trusted
// key events. Single characters bypass the table via the text path.
var keyCodes = map[string]int{
	"enter": 13, "tab": 9, "escape": 27, "esc": 27, "backspace": 8,
	"delete": 46, "left": 37, "up": 38, "right": 39, "down": 40,
	"home": 36, "end": 35, "pageup": 33, "pagedown": 34,
	"f1": 112, "f2": 113, "f3": 114, "f4": 115, "f5": 116, "f6": 117,
	"f7": 118, "f8": 119, "f9": 120, "f10": 121, "f11": 122, "f12": 123,
}

// PressKey dispatches a trusted key press: single characters as text,
// named keys by virtual code, with an optional ctrl/shift/alt
// modifier bit for chords like ctrl+a.
func (s *Session) PressKey(key, mod string, timeout time.Duration) error {
	modifiers := 0
	switch strings.ToLower(strings.TrimSpace(mod)) {
	case "ctrl", "control":
		modifiers = 2
	case "shift":
		modifiers = 8
	case "alt":
		modifiers = 1
	case "":
	default:
		return fmt.Errorf("bad modifier %q: want ctrl, shift, alt, or empty", mod)
	}
	if len([]rune(key)) == 1 {
		down := map[string]interface{}{
			"type": "keyDown", "text": key, "modifiers": modifiers,
		}
		if _, err := s.Call("Input.dispatchKeyEvent", down, timeout); err != nil {
			return fmt.Errorf("key down: %w", err)
		}
		up := map[string]interface{}{
			"type": "keyUp", "modifiers": modifiers,
		}
		if _, err := s.Call("Input.dispatchKeyEvent", up, timeout); err != nil {
			return fmt.Errorf("key up: %w", err)
		}
		return nil
	}
	code, ok := keyCodes[strings.ToLower(strings.TrimSpace(key))]
	if !ok {
		return fmt.Errorf("bad key %q: want a single character or one of enter tab escape backspace delete arrows home end pageup pagedown f1-f12", key)
	}
	text := ""
	if strings.EqualFold(key, "enter") {
		text = "\r"
	}
	down := map[string]interface{}{
		"type": "rawKeyDown", "windowsVirtualKeyCode": code,
		"text": text, "modifiers": modifiers,
	}
	if _, err := s.Call("Input.dispatchKeyEvent", down, timeout); err != nil {
		return fmt.Errorf("key down: %w", err)
	}
	up := map[string]interface{}{
		"type": "keyUp", "windowsVirtualKeyCode": code, "modifiers": modifiers,
	}
	if _, err := s.Call("Input.dispatchKeyEvent", up, timeout); err != nil {
		return fmt.Errorf("key up: %w", err)
	}
	return nil
}

// InsertText types trusted keystrokes at the focused element.
func (s *Session) InsertText(text string, timeout time.Duration) error {
	if text == "" {
		return fmt.Errorf("empty text: nothing to type")
	}
	_, err := s.Call("Input.insertText", map[string]interface{}{"text": text}, timeout)
	return err
}

// FocusObject focuses the resolved object via the DOM domain.
func (s *Session) FocusObject(objectID string, timeout time.Duration) error {
	_, err := s.Call("DOM.focus", map[string]interface{}{"objectId": objectID}, timeout)
	return err
}

// Wheel scrolls trusted mouse-wheel deltas at p (or the viewport
// center when p is nil).
func (s *Session) Wheel(p *point, dx, dy float64, timeout time.Duration) error {
	at := point{X: 400, Y: 300}
	if p != nil {
		at = *p
	}
	_, err := s.Call("Input.dispatchMouseEvent", map[string]interface{}{
		"type": "mouseWheel", "x": at.X, "y": at.Y,
		"deltaX": dx, "deltaY": dy,
	}, timeout)
	return err
}

// actTimeout bounds any single CDP round trip inside an act.
const actTimeout = 10 * time.Second

// withRef resolves a ref id at a gen and runs fn on the live object.
// On resolve failure it re-snapshots (the page changed under the
// agent) and returns the stale error with the remap suggestion, so
// the caller reports ref_stale instead of a raw CDP error.
func (b *Browser) withRef(id string, gen int, fn func(objectID string) error) error {
	r, err := b.Lookup(id, gen)
	if err != nil {
		return err
	}
	return b.resolveLive(r.ID, gen, r.BackendID, fn)
}

// resolveLive resolves a backend node id and runs fn on the live
// object. Resolve failure re-snapshots and fails closed with the
// stale error plus remap suggestion. Snapshot-map reads copy under
// b.mu: Snapshot writes b.snaps under the same lock, so a bare
// b.snaps[gen] read here would race concurrent Snapshot plus
// stale-recovery under -race.
func (b *Browser) resolveLive(id string, gen int, backendID int64, fn func(objectID string) error) error {
	oid, err := b.sess.resolve(backendID, actTimeout)
	if err != nil {
		fresh, serr := b.Snapshot()
		if serr != nil {
			return fmt.Errorf("node %s gone and re-snapshot failed: %v (resolve: %v)", id, serr, err)
		}
		b.mu.Lock()
		old := b.snaps[gen]
		b.mu.Unlock()
		remap, reason := remapRef(old, fresh, id)
		return &StaleError{Want: id, Gen: gen, Current: fresh.Gen, Reason: "node no longer resolves: " + reason, Remap: remap}
	}
	return fn(oid)
}

// Click clicks a ref: trusted mouse traffic at its box center,
// tolerating the modal-dialog release hang (see clickOID).
func (b *Browser) Click(id string, gen int) error {
	return b.withRef(id, gen, func(oid string) error {
		return b.clickOID(oid)
	})
}

// Hover moves the cursor to the ref center without clicking.
func (b *Browser) Hover(id string, gen int) error {
	return b.withRef(id, gen, func(oid string) error {
		p, err := b.sess.boxOf(oid, actTimeout)
		if err != nil {
			return err
		}
		return b.sess.mouse("mouseMoved", p, "none", 0, 0, actTimeout)
	})
}

// Fill focuses a text control, optionally clears it with a real
// select-all plus delete chord, types trusted keystrokes, and
// optionally submits with Enter. Contenteditable and input/textarea
// elements all take this path.
func (b *Browser) Fill(id string, gen int, text string, clear, submit bool) error {
	if text == "" && !clear {
		return fmt.Errorf("empty text with clear=false: nothing to do")
	}
	return b.withRef(id, gen, func(oid string) error {
		if err := b.sess.FocusObject(oid, actTimeout); err != nil {
			return fmt.Errorf("focus: %w", err)
		}
		if clear {
			if err := b.sess.PressKey("a", "ctrl", actTimeout); err != nil {
				return fmt.Errorf("select all: %w", err)
			}
			if err := b.sess.PressKey("backspace", "", actTimeout); err != nil {
				return fmt.Errorf("delete: %w", err)
			}
		}
		if text != "" {
			if err := b.sess.InsertText(text, actTimeout); err != nil {
				return fmt.Errorf("type: %w", err)
			}
		}
		if submit {
			if err := b.sess.PressKey("enter", "", actTimeout); err != nil {
				// Submits open confirm dialogs that block the
				// renderer mid-keystroke: a timeout with a pending
				// dialog proves the submit landed.
				if isTimeoutErr(err) {
					time.Sleep(500 * time.Millisecond)
					if b.PendingDialog() == nil {
						return fmt.Errorf("submit: %w", err)
					}
				} else {
					return fmt.Errorf("submit: %w", err)
				}
			}
		}
		return nil
	})
}

// Press sends a trusted key press to the page (no ref needed). An
// Enter onto a submit control may raise a confirm mid-keystroke; the
// same timeout plus pending-dialog tolerance applies.
func (b *Browser) Press(key, mod string) error {
	if err := b.sess.PressKey(key, mod, actTimeout); err != nil {
		if isTimeoutErr(err) {
			time.Sleep(500 * time.Millisecond)
			if b.PendingDialog() != nil {
				return nil
			}
		}
		return err
	}
	return nil
}

// ScrollPage scrolls trusted wheel deltas at the viewport center,
// then re-measures nothing: scroll never changes gens by itself, but
// lazy pages may swap DOM, so callers re-snapshot when they need
// post-scroll refs.
func (b *Browser) ScrollPage(dx, dy float64) error {
	if dx == 0 && dy == 0 {
		return fmt.Errorf("zero scroll delta: nothing to do")
	}
	if err := b.sess.Wheel(nil, dx, dy, actTimeout); err != nil {
		// Wheel-blocked pages (overflow hidden roots) still scroll
		// through the window: the fallback is real scrolling, not a
		// faked offset counter.
		if _, ferr := b.sess.Evaluate(fmt.Sprintf(`window.scrollBy(%d, %d)`, int(dx), int(dy)), false, actTimeout); ferr != nil {
			return fmt.Errorf("scroll: %w (fallback: %v)", err, ferr)
		}
	}
	return nil
}

// Select sets a select/combobox value and fires real input plus
// change events so framework listeners react. The returned value must
// equal the want or the act fails closed.
func (b *Browser) Select(id string, gen int, value string) error {
	return b.withRef(id, gen, func(oid string) error {
		v, err := b.sess.callOn(oid, `function(val) {
			const el = this;
			el.focus();
			el.value = val;
			el.dispatchEvent(new Event('input', {bubbles: true}));
			el.dispatchEvent(new Event('change', {bubbles: true}));
			return el.value;
		}`, value, actTimeout)
		if err != nil {
			return fmt.Errorf("select: %w", err)
		}
		var got string
		if err := json.Unmarshal(v, &got); err != nil {
			return fmt.Errorf("decode select result: %w", err)
		}
		if got != value {
			return fmt.Errorf("select refused value %q (stays %q): option may not exist", value, got)
		}
		return nil
	})
}

// SetChecked sets a checkbox/switch/radio to want via a real click when
// the state differs, then verifies. Verification failure fails
// closed: a no-op click that changes nothing is never silent.
func (b *Browser) SetChecked(id string, gen int, want bool) error {
	return b.withRef(id, gen, func(oid string) error {
		v, err := b.sess.callOn(oid, `function() {
			const el = this;
			if ('checked' in el && el.checked !== undefined) { return el.checked; }
			return null;
		}`, nil, actTimeout)
		if err != nil {
			return fmt.Errorf("read checked: %w", err)
		}
		var cur *bool
		_ = json.Unmarshal(v, &cur)
		if cur == nil {
			return fmt.Errorf("element has no checked state; use click for custom toggles")
		}
		if *cur == want {
			return nil
		}
		if err := b.clickOID(oid); err != nil {
			return fmt.Errorf("toggle click: %w", err)
		}
		v2, err := b.sess.callOn(oid, `function() { return !!this.checked; }`, nil, actTimeout)
		if err != nil {
			return fmt.Errorf("verify checked: %w", err)
		}
		var after bool
		_ = json.Unmarshal(v2, &after)
		if after != want {
			return fmt.Errorf("toggle did not stick (want %v, now %v)", want, after)
		}
		return nil
	})
}

// Drag drags from one ref to another (or to explicit viewport coords)
// with trusted press, stepped moves, and release. Steps default to 5.
// Both endpoints resolve through the same re-snapshot plus StaleError
// path as withRef: a dead BackendID fails closed with ref_stale plus
// the remap suggestion, never a raw CDP error.
func (b *Browser) Drag(fromID string, fromGen int, toID string, toGen int, toX, toY *float64, steps int) error {
	from, err := b.Lookup(fromID, fromGen)
	if err != nil {
		return err
	}
	var startOID string
	if err := b.resolveLive(from.ID, fromGen, from.BackendID, func(oid string) error {
		startOID = oid
		return nil
	}); err != nil {
		return fmt.Errorf("drag source: %w", err)
	}
	start, err := b.sess.boxOf(startOID, actTimeout)
	if err != nil {
		return fmt.Errorf("drag source: %w", err)
	}
	b.mu.Lock()
	vw, vh := b.viewW, b.viewH
	b.mu.Unlock()
	end := point{X: float64(vw) / 2, Y: float64(vh) / 2}
	if toID != "" {
		to, terr := b.Lookup(toID, toGen)
		if terr != nil {
			return terr
		}
		var targetOID string
		if terr := b.resolveLive(to.ID, toGen, to.BackendID, func(oid string) error {
			targetOID = oid
			return nil
		}); terr != nil {
			return fmt.Errorf("drag target: %w", terr)
		}
		p, terr := b.sess.boxOf(targetOID, actTimeout)
		if terr != nil {
			return fmt.Errorf("drag target: %w", terr)
		}
		end = p
	} else if toX != nil && toY != nil {
		end = point{X: *toX, Y: *toY}
	}
	if steps <= 0 {
		steps = 5
	}
	if steps > 20 {
		steps = 20
	}
	if err := b.sess.mouse("mouseMoved", start, "none", 0, 0, actTimeout); err != nil {
		return fmt.Errorf("drag move to source: %w", err)
	}
	if err := b.sess.mouse("mousePressed", start, "left", 1, 1, actTimeout); err != nil {
		return fmt.Errorf("drag press: %w", err)
	}
	for i := 1; i <= steps; i++ {
		f := float64(i) / float64(steps)
		mid := point{X: start.X + (end.X-start.X)*f, Y: start.Y + (end.Y-start.Y)*f}
		if err := b.sess.mouse("mouseMoved", mid, "left", 0, 1, actTimeout); err != nil {
			_ = b.sess.mouse("mouseReleased", mid, "left", 1, 0, releaseTimeout)
			return fmt.Errorf("drag move %d/%d: %w", i, steps, err)
		}
	}
	if err := b.sess.mouse("mouseReleased", end, "left", 1, 0, releaseTimeout); err != nil {
		if isTimeoutErr(err) {
			time.Sleep(500 * time.Millisecond)
			if b.PendingDialog() != nil {
				return nil
			}
		}
		return fmt.Errorf("drag release: %w", err)
	}
	return nil
}

// Upload sets a file input to a real on-disk file through
// DOM.setFileInputFiles. Missing files fail closed before any CDP
// traffic: the page never sees a phantom selection.
func (b *Browser) Upload(id string, gen int, file string) error {
	if strings.TrimSpace(file) == "" {
		return fmt.Errorf("empty file path: nothing to upload")
	}
	if fi, err := os.Stat(file); err != nil {
		return fmt.Errorf("upload file: %w", err)
	} else if fi.IsDir() {
		return fmt.Errorf("upload file %q is a directory", file)
	}
	return b.withRef(id, gen, func(oid string) error {
		raw, err := b.sess.Call("DOM.describeNode", map[string]interface{}{"objectId": oid}, actTimeout)
		if err != nil {
			return fmt.Errorf("describe node: %w", err)
		}
		var desc struct {
			Node struct {
				NodeID int64 `json:"nodeId"`
			} `json:"node"`
		}
		if err := json.Unmarshal(raw, &desc); err != nil {
			return fmt.Errorf("decode node: %w", err)
		}
		if _, err := b.sess.Call("DOM.setFileInputFiles", map[string]interface{}{
			"nodeId": desc.Node.NodeID, "files": []string{file},
		}, actTimeout); err != nil {
			return fmt.Errorf("set files: %w", err)
		}
		return nil
	})
}

// Cursor moves the OS-level cursor position inside the page viewport
// without clicking: the human-visible cursor control the spec asks
// for, shared by the TUI mouse and the agent cursor op.
func (b *Browser) Cursor(x, y float64) error {
	b.mu.Lock()
	vw, vh := b.viewW, b.viewH
	b.mu.Unlock()
	if x < 0 || y < 0 || x > float64(vw) || y > float64(vh) {
		return fmt.Errorf("cursor (%v,%v) outside viewport %dx%d", x, y, vw, vh)
	}
	return b.sess.mouse("mouseMoved", point{X: x, Y: y}, "none", 0, 0, actTimeout)
}

// DialogEvent is one JavaScript dialog: alert, confirm, prompt, or
// beforeunload, with its message and whether this browser handled it.
type DialogEvent struct {
	Type      string `json:"type"`
	Message   string `json:"message"`
	URL       string `json:"url"`
	HasPrompt bool   `json:"has_prompt"`
	Handled   string `json:"handled,omitempty"`
}

// HandleDialog answers the pending JavaScript dialog: accept (with
// optional prompt text) or dismiss. No pending dialog fails closed
// with no_dialog instead of blocking on a timer. The pending slot
// clears only after the CDP call succeeds: on transport or timeout
// failure the dialog is still open in Chrome, so pending stays for a
// retry instead of a lost no_dialog.
func (b *Browser) HandleDialog(accept bool, promptText string) (*DialogEvent, error) {
	b.mu.Lock()
	pending := b.pending
	policy := b.dialogPolicy
	b.mu.Unlock()
	if pending == nil {
		return nil, &RefError{Code: "no_dialog", Message: "no JavaScript dialog is open; nothing to handle"}
	}
	params := map[string]interface{}{"accept": accept}
	if promptText != "" {
		params["promptText"] = promptText
	}
	if _, err := b.sess.Call("Page.handleJavaScriptDialog", params, actTimeout); err != nil {
		return nil, fmt.Errorf("handle dialog: %w", err)
	}
	handled := *pending
	handled.Handled = "accept:" + policy
	if !accept {
		handled.Handled = "dismiss:" + policy
	}
	b.mu.Lock()
	if b.pending == pending {
		b.pending = nil
	}
	b.handled = append(b.handled, handled)
	if len(b.handled) > 50 {
		b.handled = b.handled[len(b.handled)-50:]
	}
	b.mu.Unlock()
	return &handled, nil
}

// PendingDialog reports the currently open dialog, if any.
func (b *Browser) PendingDialog() *DialogEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.pending == nil {
		return nil
	}
	cp := *b.pending
	return &cp
}

// DialogsHandled lists dialogs this browser answered.
func (b *Browser) DialogsHandled() []DialogEvent {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]DialogEvent, len(b.handled))
	copy(out, b.handled)
	return out
}

// Evaluate runs a JS expression in the page and returns the raw
// value. The agent CLI caps the rendered output; the raw bytes here
// stay complete for programmatic checks.
func (b *Browser) Evaluate(expr string) (json.RawMessage, error) {
	if strings.TrimSpace(expr) == "" {
		return nil, fmt.Errorf("empty expression: nothing to evaluate")
	}
	return b.sess.Evaluate(expr, false, actTimeout)
}

// b64PNG decodes base64 PNG bytes from CDP with a size sanity cap.
func b64PNG(data string) ([]byte, error) {
	if data == "" {
		return nil, fmt.Errorf("empty screenshot payload")
	}
	raw, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return nil, fmt.Errorf("decode screenshot: %w", err)
	}
	if len(raw) > 32<<20 {
		return nil, fmt.Errorf("screenshot payload %d bytes exceeds 32 MiB cap", len(raw))
	}
	return raw, nil
}
