package engine

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// cdpMsg is one wire message: either a method response (id present) or
// an event broadcast (method present, no id).
type cdpMsg struct {
	ID     *int            `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error"`
}

// Session is one CDP connection to a page target. Calls are serialized
// with incrementing ids; events fan out to subscribers by method name.
// mu guards next/pend; wmu serializes wire writes (Call frames plus the
// loop's pong replies) so concurrent Calls never interleave frames.
type Session struct {
	conn   *conn
	mu     sync.Mutex
	wmu    sync.Mutex
	next   int
	pend   map[int]chan cdpMsg
	subsMu sync.Mutex
	subs   map[string][]chan json.RawMessage
	closed chan struct{}
}

// Connect dials the debugger URL for a page target.
func Connect(debuggerURL string) (*Session, error) {
	c, err := wsDial(debuggerURL)
	if err != nil {
		return nil, err
	}
	s := &Session{
		conn:   c,
		pend:   map[int]chan cdpMsg{},
		subs:   map[string][]chan json.RawMessage{},
		closed: make(chan struct{}),
	}
	go s.loop()
	return s, nil
}

// PageTarget picks the first page target from /json/list and returns its
// debugger URL. It prefers type "page" and skips DevTools windows.
func PageTarget(endpoint string) (string, error) {
	resp, err := http.Get(endpoint + "/json/list")
	if err != nil {
		return "", fmt.Errorf("list targets: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var targets []struct {
		Type                 string `json:"type"`
		WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
		URL                  string `json:"url"`
	}
	if err := json.Unmarshal(body, &targets); err != nil {
		return "", err
	}
	for _, t := range targets {
		if t.Type == "page" && t.WebSocketDebuggerURL != "" {
			return t.WebSocketDebuggerURL, nil
		}
	}
	return "", fmt.Errorf("no page target on %s", endpoint)
}

func (s *Session) loop() {
	// On transport death, wake every pending Call with a connection
	// error instead of leaving it hung until its own timeout.
	defer func() {
		s.mu.Lock()
		for id, ch := range s.pend {
			ch <- cdpMsg{ID: &id, Error: &struct {
				Message string `json:"message"`
				Code    int    `json:"code"`
			}{Message: "debugger connection closed"}}
			delete(s.pend, id)
		}
		s.mu.Unlock()
	}()
	for {
		raw, err := s.conn.readText()
		if err != nil {
			return
		}
		var m cdpMsg
		if err := json.Unmarshal(raw, &m); err != nil {
			continue
		}
		if m.ID != nil {
			s.mu.Lock()
			ch := s.pend[*m.ID]
			delete(s.pend, *m.ID)
			s.mu.Unlock()
			if ch != nil {
				ch <- m
			}
			continue
		}
		if m.Method != "" {
			s.subsMu.Lock()
			for _, ch := range s.subs[m.Method] {
				select {
				case ch <- m.Params:
				default:
				}
			}
			s.subsMu.Unlock()
		}
	}
}

// Close shuts the socket down.
func (s *Session) Close() error {
	select {
	case <-s.closed:
	default:
		close(s.closed)
	}
	return s.conn.close()
}

// Subscribe returns a buffered channel fed with event params for method.
// Callers must defer Unsubscribe: every Navigate subscribes for its own
// load event, and leaked subscriptions grow subs unboundedly on warm
// reuse while stale buffered events fire the next Navigate as a
// wrong-load success.
func (s *Session) Subscribe(method string) chan json.RawMessage {
	ch := make(chan json.RawMessage, 16)
	s.subsMu.Lock()
	s.subs[method] = append(s.subs[method], ch)
	s.subsMu.Unlock()
	return ch
}

// Unsubscribe removes a channel added by Subscribe.
func (s *Session) Unsubscribe(ch chan json.RawMessage) {
	s.subsMu.Lock()
	defer s.subsMu.Unlock()
	for method, list := range s.subs {
		kept := list[:0]
		for _, c := range list {
			if c != ch {
				kept = append(kept, c)
			}
		}
		if len(kept) == 0 {
			delete(s.subs, method)
		} else {
			s.subs[method] = kept
		}
	}
}

// Call sends one CDP command and waits for its response.
func (s *Session) Call(method string, params interface{}, timeout time.Duration) (json.RawMessage, error) {
	s.mu.Lock()
	s.next++
	id := s.next
	ch := make(chan cdpMsg, 1)
	s.pend[id] = ch
	s.mu.Unlock()
	var rawParams json.RawMessage
	if params != nil {
		b, err := json.Marshal(params)
		if err != nil {
			s.mu.Lock()
			delete(s.pend, id)
			s.mu.Unlock()
			return nil, err
		}
		rawParams = b
	} else {
		rawParams = json.RawMessage(`{}`)
	}
	wire, _ := json.Marshal(map[string]interface{}{"id": id, "method": method, "params": json.RawMessage(rawParams)})
	s.wmu.Lock()
	werr := s.conn.writeText(wire)
	s.wmu.Unlock()
	if werr != nil {
		s.mu.Lock()
		delete(s.pend, id)
		s.mu.Unlock()
		return nil, fmt.Errorf("cdp %s: %w", method, werr)
	}
	if timeout == 0 {
		timeout = 15 * time.Second
	}
	select {
	case m := <-ch:
		if m.Error != nil {
			return nil, fmt.Errorf("cdp %s: %s", method, m.Error.Message)
		}
		return m.Result, nil
	case <-time.After(timeout):
		s.mu.Lock()
		delete(s.pend, id)
		s.mu.Unlock()
		return nil, fmt.Errorf("cdp %s: timeout after %s", method, timeout)
	}
}

// Enable turns on the domains Phase 2 needs. DOMSnapshot is
// best-effort: older shells may lack it and the AX path still works.
func (s *Session) Enable() error {
	for _, m := range []string{"Page.enable", "Network.enable", "Runtime.enable", "Accessibility.enable"} {
		if _, err := s.Call(m, nil, 10*time.Second); err != nil {
			return fmt.Errorf("enable %s: %w", m, err)
		}
	}
	// DOMSnapshot is optional; ignore failure so minimal builds still run.
	_, _ = s.Call("DOMSnapshot.enable", nil, 5*time.Second)
	return nil
}

// LiteBlocklists are the URL patterns blocked in lite mode: images,
// media, fonts, and common trackers. The full-resource media path
// re-enables them per surface in a later phase.
var LiteBlocklists = []string{
	"*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp", "*.avif", "*.svg",
	"*.mp4", "*.webm", "*.mp3", "*.ogg",
	"*.woff", "*.woff2", "*.ttf",
	"*googletagmanager*", "*google-analytics*", "*doubleclick*",
	"*facebook.net*", "*hotjar*",
}

// SetLite toggles resource blocking. Lite mode keeps text navigation
// fast and cheap; full mode loads everything for media surfaces.
func (s *Session) SetLite(lite bool) error {
	patterns := []string{}
	if lite {
		patterns = LiteBlocklists
	}
	_, err := s.Call("Network.setBlockedURLs", map[string]interface{}{"urls": patterns}, 10*time.Second)
	return err
}

// Navigate loads url and waits for the load event or timeout. It
// returns the loader id for diagnostics and maps CDP error text into
// fail-closed codes via ClassifyError. The load subscription is
// released on return and events are correlated by loaderId so a stale
// buffered event never completes the next Navigate as a wrong-load
// success.
func (s *Session) Navigate(target string, timeout time.Duration) (string, error) {
	loads := s.Subscribe("Page.loadEventFired")
	defer s.Unsubscribe(loads)
	// Drain any events buffered before this navigation started.
drain:
	for {
		select {
		case <-loads:
		default:
			break drain
		}
	}
	res, err := s.Call("Page.navigate", map[string]interface{}{"url": target}, 15*time.Second)
	if err != nil {
		return "", err
	}
	var nav struct {
		LoaderID string `json:"loaderId"`
		ErrText  string `json:"errorText"`
	}
	_ = json.Unmarshal(res, &nav)
	if nav.ErrText != "" {
		return nav.LoaderID, fmt.Errorf("navigate: %s", nav.ErrText)
	}
	if timeout == 0 {
		timeout = 15 * time.Second
	}
	deadline := time.After(timeout)
	for {
		select {
		case raw := <-loads:
			var ev struct {
				LoaderID string `json:"loaderId"`
			}
			if json.Unmarshal(raw, &ev) == nil && ev.LoaderID != "" && nav.LoaderID != "" && ev.LoaderID != nav.LoaderID {
				// Stale event from a previous load: keep waiting.
				continue
			}
			return nav.LoaderID, nil
		case <-deadline:
			return nav.LoaderID, fmt.Errorf("navigate: load timeout after %s (page may still render; retry with a longer timeout)", timeout)
		}
	}
}

// Evaluate runs JS in the page and returns the raw result value.
func (s *Session) Evaluate(expr string, await bool, timeout time.Duration) (json.RawMessage, error) {
	res, err := s.Call("Runtime.evaluate", map[string]interface{}{
		"expression":    expr,
		"returnByValue": true,
		"awaitPromise":  await,
	}, timeout)
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
	if err := json.Unmarshal(res, &out); err != nil {
		return nil, err
	}
	if out.Exception != nil {
		return nil, fmt.Errorf("evaluate: %s", out.Exception.Text)
	}
	return out.Result.Value, nil
}

// EvaluateInContext runs JS inside one execution context (for
// example an extension isolated world) and returns the raw value.
// Page-context Evaluate stays the default; contexts are opt-in per
// call so ordinary acts can never run in the wrong world.
func (s *Session) EvaluateInContext(expr string, contextID int64, await bool, timeout time.Duration) (json.RawMessage, error) {
	res, err := s.Call("Runtime.evaluate", map[string]interface{}{
		"expression":    expr,
		"returnByValue": true,
		"awaitPromise":  await,
		"contextId":     contextID,
	}, timeout)
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
	if err := json.Unmarshal(res, &out); err != nil {
		return nil, err
	}
	if out.Exception != nil {
		return nil, fmt.Errorf("evaluate: %s", out.Exception.Text)
	}
	return out.Result.Value, nil
}
// AXTree fetches the full accessibility tree.
func (s *Session) AXTree(timeout time.Duration) (json.RawMessage, error) {
	return s.Call("Accessibility.getFullAXTree", map[string]interface{}{"depth": 30}, timeout)
}
