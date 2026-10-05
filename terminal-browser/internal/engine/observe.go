package engine

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"strings"
	"time"
)

// Observe: console plus network taps with HAR capture, wait-for and
// assert polling, screenshots (viewport, full, element, annotated,
// if-changed dedup), and PDF export. Every tap runs on a watcher
// goroutine fed by the CDP event subscription; buffers are capped
// rings so hostile pages (console-spam loops, thousand-request
// trackers) cannot grow the browser unboundedly.

// ConsoleEntry is one tapped console/log/exception line.
type ConsoleEntry struct {
	Source string `json:"source"`
	Level  string `json:"level"`
	Text   string `json:"text"`
	URL    string `json:"url,omitempty"`
}

// netEvent tracks one in-flight request across the Network domain.
type netEvent struct {
	ID     string
	URL    string
	Method string
	Status int
	Mime   string
	Start  time.Time
	Bytes  int64
	Failed string
	Done   bool
}

// HAREntry is one finished network row in HAR-1.2 shape.
type HAREntry struct {
	URL      string `json:"url"`
	Method   string `json:"method"`
	Status   int    `json:"status"`
	Mime     string `json:"mime,omitempty"`
	Bytes    int64  `json:"bytes"`
	TimeMs   int64  `json:"time_ms"`
	Failed   string `json:"failed,omitempty"`
	Finished bool   `json:"finished"`
}

const (
	maxConsole = 200
	maxNet     = 500
)

// watch starts the three tap goroutines: console/log, network, and
// dialogs. Channels are buffered; a full tap drops the oldest burst
// edge instead of blocking the CDP loop. The dialog watcher also
// enforces the auto policy: accept or dismiss answers the dialog
// inside the event tick so scripted form loops never wedge on an
// alert, and every auto-answer lands in the handled log.
func (b *Browser) watch() {
	b.wg.Add(3)
	go b.watchConsole()
	go b.watchNetwork()
	go b.watchDialogs()
}

func (b *Browser) watchConsole() {
	defer b.wg.Done()
	api := b.sess.Subscribe("Runtime.consoleAPICalled")
	defer b.sess.Unsubscribe(api)
	exc := b.sess.Subscribe("Runtime.exceptionThrown")
	defer b.sess.Unsubscribe(exc)
	logEv := b.sess.Subscribe("Log.entryAdded")
	defer b.sess.Unsubscribe(logEv)
	for {
		select {
		case <-b.stopCh:
			return
		case raw := <-api:
			var ev struct {
				Type string `json:"type"`
				Args []struct {
					Type        string          `json:"type"`
					Value       json.RawMessage `json:"value"`
					Description string          `json:"description"`
				} `json:"args"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				parts := make([]string, 0, len(ev.Args))
				for _, a := range ev.Args {
					t := string(a.Value)
					if t == "" || t == "null" {
						t = a.Description
					}
					if len(t) > 500 {
						t = t[:500] + "…"
					}
					parts = append(parts, t)
				}
				b.pushConsole(ConsoleEntry{Source: "console", Level: ev.Type, Text: strings.Join(parts, " ")})
			}
		case raw := <-exc:
			var ev struct {
				Details struct {
					Text string `json:"text"`
					URL  string `json:"url"`
				} `json:"exceptionDetails"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.pushConsole(ConsoleEntry{Source: "exception", Level: "error", Text: ev.Details.Text, URL: ev.Details.URL})
			}
		case raw := <-logEv:
			var ev struct {
				Entry struct {
					Level  string `json:"level"`
					Text   string `json:"text"`
					URL    string `json:"url"`
					Source string `json:"source"`
				} `json:"entry"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.pushConsole(ConsoleEntry{Source: "log:" + ev.Entry.Source, Level: ev.Entry.Level, Text: ev.Entry.Text, URL: ev.Entry.URL})
			}
		}
	}
}

func (b *Browser) pushConsole(e ConsoleEntry) {
	if strings.TrimSpace(e.Text) == "" {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.console = append(b.console, e)
	if len(b.console) > maxConsole {
		b.console = b.console[len(b.console)-maxConsole:]
	}
}

func (b *Browser) watchNetwork() {
	defer b.wg.Done()
	will := b.sess.Subscribe("Network.requestWillBeSent")
	defer b.sess.Unsubscribe(will)
	got := b.sess.Subscribe("Network.responseReceived")
	defer b.sess.Unsubscribe(got)
	done := b.sess.Subscribe("Network.loadingFinished")
	defer b.sess.Unsubscribe(done)
	fail := b.sess.Subscribe("Network.loadingFailed")
	defer b.sess.Unsubscribe(fail)
	for {
		select {
		case <-b.stopCh:
			return
		case raw := <-will:
			var ev struct {
				RequestID string `json:"requestId"`
				Request   struct {
					URL    string `json:"url"`
					Method string `json:"method"`
				} `json:"request"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.netUpsert(ev.RequestID, func(ne *netEvent) {
					ne.URL, ne.Method, ne.Start = ev.Request.URL, ev.Request.Method, time.Now()
				})
			}
		case raw := <-got:
			var ev struct {
				RequestID string `json:"requestId"`
				Response  struct {
					Status   int    `json:"status"`
					MimeType string `json:"mimeType"`
				} `json:"response"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.netUpsert(ev.RequestID, func(ne *netEvent) {
					ne.Status, ne.Mime = ev.Response.Status, ev.Response.MimeType
				})
			}
		case raw := <-done:
			var ev struct {
				RequestID         string `json:"requestId"`
				EncodedDataLength int64  `json:"encodedDataLength"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.netFinish(ev.RequestID, ev.EncodedDataLength, "")
			}
		case raw := <-fail:
			var ev struct {
				RequestID  string `json:"requestId"`
				ErrorText  string `json:"errorText"`
				BlockedURL string `json:"blockedURL"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.netFinish(ev.RequestID, 0, ev.ErrorText)
			}
		}
	}
}

func (b *Browser) netUpsert(id string, fn func(*netEvent)) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i := range b.net {
		if b.net[i].ID == id {
			fn(&b.net[i])
			return
		}
	}
	ne := netEvent{ID: id}
	fn(&ne)
	b.net = append(b.net, ne)
	if len(b.net) > maxNet {
		b.net = b.net[len(b.net)-maxNet:]
	}
}

func (b *Browser) netFinish(id string, bytes int64, failed string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i := range b.net {
		if b.net[i].ID == id && !b.net[i].Done {
			b.net[i].Done = true
			b.net[i].Bytes = bytes
			b.net[i].Failed = failed
			b.har = append(b.har, HAREntry{
				URL: b.net[i].URL, Method: b.net[i].Method,
				Status: b.net[i].Status, Mime: b.net[i].Mime,
				Bytes: bytes, TimeMs: time.Since(b.net[i].Start).Milliseconds(),
				Failed: failed, Finished: failed == "",
			})
			if len(b.har) > maxNet {
				b.har = b.har[len(b.har)-maxNet:]
			}
			return
		}
	}
}

func (b *Browser) watchDialogs() {
	defer b.wg.Done()
	ch := b.sess.Subscribe("Page.javascriptDialogOpening")
	defer b.sess.Unsubscribe(ch)
	for {
		select {
		case <-b.stopCh:
			return
		case raw := <-ch:
			var ev struct {
				Type        string `json:"type"`
				Message     string `json:"message"`
				URL         string `json:"url"`
				HasBrowserHandler bool `json:"hasBrowserHandler"`
			}
			if json.Unmarshal(raw, &ev) == nil {
				b.onDialog(DialogEvent{Type: ev.Type, Message: ev.Message, URL: ev.URL, HasPrompt: ev.Type == "prompt"})
			}
		}
	}
}

// onDialog records the opening dialog and applies the auto policy.
// Manual policy only records: the dialog op answers explicitly.
func (b *Browser) onDialog(ev DialogEvent) {
	b.mu.Lock()
	if b.pending == nil {
		cp := ev
		b.pending = &cp
	}
	policy := b.dialogPolicy
	b.mu.Unlock()
	if policy == "accept" || policy == "dismiss" {
		_, _ = b.sess.Call("Page.handleJavaScriptDialog", map[string]interface{}{"accept": policy == "accept"}, actTimeout)
		b.mu.Lock()
		ev.Handled = "auto-" + policy
		b.handled = append(b.handled, ev)
		if len(b.handled) > 50 {
			b.handled = b.handled[len(b.handled)-50:]
		}
		b.pending = nil
		b.mu.Unlock()
	}
}

// Console drains the tap ring oldest-first. Clear drops the buffer;
// keeping it lets the agent poll incrementally across script steps.
func (b *Browser) Console(clear bool) []ConsoleEntry {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]ConsoleEntry, len(b.console))
	copy(out, b.console)
	if clear {
		b.console = nil
	}
	return out
}

// HAR returns finished network rows in HAR-1.2 entry shape, plus the
// in-flight count so agents can tell quiet from truncated.
func (b *Browser) HAR() (entries []HAREntry, inflight int) {
	b.mu.Lock()
	defer b.mu.Unlock()
	entries = make([]HAREntry, len(b.har))
	copy(entries, b.har)
	for i := range b.net {
		if !b.net[i].Done {
			inflight++
		}
	}
	return entries, inflight
}

// ClearTaps drops console and network rings for a clean capture
// window (e.g. right before a scripted submit).
func (b *Browser) ClearTaps() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.console = nil
	b.net = nil
	b.har = nil
}

// Condition is one wait/assert predicate. Kinds: visible (ref has
// non-zero box), text (page innerText contains Text), url (current
// URL contains URL), title (title contains Title), value (ref value
// equals Value), count (querySelectorAll(Selector) length compared to
// Want with Op one of eq, ge, le). Exactly one subject field must fit
// the kind; mismatches fail closed with bad_step at the runner.
type Condition struct {
	Kind     string
	Ref      string
	Gen      int
	Text     string
	URL      string
	Title    string
	Value    string
	Selector string
	Op       string
	Want     int
}

// Verify evaluates the condition once against the live page and
// returns the human-readable actual for envelopes and errors.
func (b *Browser) Verify(c Condition) (bool, string, error) {
	switch c.Kind {
	case "visible":
		r, err := b.Lookup(c.Ref, c.Gen)
		if err != nil {
			return false, "", err
		}
		oid, err := b.sess.resolve(r.BackendID, actTimeout)
		if err != nil {
			return false, "gone", nil
		}
		p, err := b.sess.boxOf(oid, actTimeout)
		if err != nil {
			return false, "hidden", nil
		}
		return true, fmt.Sprintf("visible at %.0f,%.0f", p.X, p.Y), nil
	case "text":
		if c.Text == "" {
			return false, "", fmt.Errorf("text condition needs text")
		}
		v, err := b.sess.Evaluate(`(document.body ? document.body.innerText : "")`, false, actTimeout)
		if err != nil {
			return false, "", err
		}
		var body string
		_ = json.Unmarshal(v, &body)
		if strings.Contains(body, c.Text) {
			return true, fmt.Sprintf("found %q", c.Text), nil
		}
		return false, fmt.Sprintf("page holds %d chars without %q", len(body), c.Text), nil
	case "url":
		if c.URL == "" {
			return false, "", fmt.Errorf("url condition needs url")
		}
		u := b.URL()
		if strings.Contains(u, c.URL) {
			return true, u, nil
		}
		return false, u, nil
	case "title":
		if c.Title == "" {
			return false, "", fmt.Errorf("title condition needs title")
		}
		v, err := b.sess.Evaluate(`document.title || ""`, false, actTimeout)
		if err != nil {
			return false, "", err
		}
		var t string
		_ = json.Unmarshal(v, &t)
		if strings.Contains(t, c.Title) {
			return true, t, nil
		}
		return false, t, nil
	case "value":
		r, err := b.Lookup(c.Ref, c.Gen)
		if err != nil {
			return false, "", err
		}
		oid, err := b.sess.resolve(r.BackendID, actTimeout)
		if err != nil {
			return false, "gone", nil
		}
		v, err := b.sess.callOn(oid, `function() { const el = this; return ('value' in el) ? el.value : (el.textContent || ""); }`, nil, actTimeout)
		if err != nil {
			return false, "", err
		}
		var got string
		_ = json.Unmarshal(v, &got)
		if got == c.Value {
			return true, fmt.Sprintf("value %q", got), nil
		}
		return false, fmt.Sprintf("value %q", got), nil
	case "count":
		if c.Selector == "" {
			return false, "", fmt.Errorf("count condition needs selector")
		}
		expr := fmt.Sprintf(`document.querySelectorAll(%s).length`, quoteJS(c.Selector))
		v, err := b.sess.Evaluate(expr, false, actTimeout)
		if err != nil {
			return false, "", err
		}
		var n int
		_ = json.Unmarshal(v, &n)
		ok := false
		switch c.Op {
		case "", "eq":
			ok = n == c.Want
		case "ge":
			ok = n >= c.Want
		case "le":
			ok = n <= c.Want
		default:
			return false, "", fmt.Errorf("bad count op %q: want eq, ge, or le", c.Op)
		}
		return ok, fmt.Sprintf("count %d", n), nil
	default:
		return false, "", fmt.Errorf("bad condition kind %q: want visible, text, url, title, value, or count", c.Kind)
	}
}

func quoteJS(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// Wait polls the condition every 150 ms until it holds or the
// timeout elapses. Timeout bounds at 30 s: longer waits belong in
// the agent loop, not inside one CDP hold.
func (b *Browser) Wait(c Condition, timeout time.Duration) (string, error) {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	if timeout > 30*time.Second {
		timeout = 30 * time.Second
	}
	deadline := time.Now().Add(timeout)
	var last string
	for {
		ok, actual, err := b.Verify(c)
		if err != nil {
			// Ref errors (stale, gone) are terminal: polling a dead
			// ref for 30 s reports nothing new.
			if CodeOf(err) == "ref_stale" || CodeOf(err) == "ref_not_found" || CodeOf(err) == "ref_no_node" {
				return "", err
			}
			last = err.Error()
		} else if ok {
			return actual, nil
		} else {
			last = actual
		}
		if time.Now().After(deadline) {
			return "", &RefError{Code: "timeout", Message: fmt.Sprintf("wait %s timed out after %s (last: %s)", c.Kind, timeout.Round(time.Millisecond), last)}
		}
		time.Sleep(150 * time.Millisecond)
	}
}

// Shot is one screenshot outcome.
type Shot struct {
	Path   string `json:"path"`
	SHA256 string `json:"sha256"`
	Bytes  int    `json:"bytes"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Dedup  bool   `json:"deduplicated,omitempty"`
}

// Screenshot captures the viewport, the full page beyond the
// viewport, or one ref element clipped to its box. Annotate draws
// the current snapshot ref boxes into the PNG plus a legend beside
// the file. IfUnchanged skips the write when the pixels equal the
// last shot (dedup hit reports the previous path with no new bytes).
func (b *Browser) Screenshot(kind, refID string, gen int, out string, annotate, ifUnchanged bool) (*Shot, error) {
	if strings.TrimSpace(out) == "" {
		return nil, fmt.Errorf("empty out path: screenshots need an explicit file")
	}
	params := map[string]interface{}{"format": "png"}
	switch kind {
	case "", "viewport":
	case "full":
		params["captureBeyondViewport"] = true
	case "element":
		r, err := b.Lookup(refID, gen)
		if err != nil {
			return nil, err
		}
		oid, err := b.sess.resolve(r.BackendID, actTimeout)
		if err != nil {
			return nil, err
		}
		p, err := b.sess.boxOf(oid, actTimeout)
		if err != nil {
			return nil, err
		}
		// Element clips need the top-left corner, not just the
		// center: re-read the box and clip a padded region around
		// it. boxOf scrolled it into view, so viewport coords hold.
		raw, err := b.sess.Call("DOM.getBoxModel", map[string]interface{}{"objectId": oid}, actTimeout)
		if err != nil {
			return nil, err
		}
		var m struct {
			Model struct {
				Content []float64 `json:"content"`
			} `json:"model"`
		}
		if err := json.Unmarshal(raw, &m); err != nil || len(m.Model.Content) < 8 {
			return nil, fmt.Errorf("element clip: unreadable box")
		}
		q := m.Model.Content
		minX, minY := q[0], q[1]
		maxX, maxY := q[0], q[1]
		for i := 2; i < 8; i += 2 {
			if q[i] < minX {
				minX = q[i]
			}
			if q[i] > maxX {
				maxX = q[i]
			}
			if q[i+1] < minY {
				minY = q[i+1]
			}
			if q[i+1] > maxY {
				maxY = q[i+1]
			}
		}
		_ = p
		pad := 8.0
		params["clip"] = map[string]interface{}{
			"x": minX - pad, "y": minY - pad,
			"width": (maxX - minX) + 2*pad, "height": (maxY - minY) + 2*pad,
			"scale": 1,
		}
	default:
		return nil, fmt.Errorf("bad screenshot kind %q: want viewport, full, or element", kind)
	}
	raw, err := b.sess.Call("Page.captureScreenshot", params, 20*time.Second)
	if err != nil {
		return nil, fmt.Errorf("capture: %w", err)
	}
	var capOut struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(raw, &capOut); err != nil {
		return nil, fmt.Errorf("decode capture: %w", err)
	}
	pngBytes, err := b64PNG(capOut.Data)
	if err != nil {
		return nil, err
	}
	legend := map[string]string{}
	if annotate {
		var err error
		pngBytes, legend, err = annotatePNG(pngBytes, b.boxesForAnnotate(40))
		if err != nil {
			return nil, fmt.Errorf("annotate: %w", err)
		}
	}
	sum := sha256.Sum256(pngBytes)
	hash := hex.EncodeToString(sum[:])
	b.mu.Lock()
	lastHash, lastPath := b.lastShotHash, b.lastShotPath
	b.mu.Unlock()
	if ifUnchanged && hash == lastHash && lastPath != "" {
		return &Shot{Path: lastPath, SHA256: hash, Bytes: len(pngBytes), Dedup: true}, nil
	}
	if err := os.WriteFile(out, pngBytes, 0o644); err != nil {
		return nil, fmt.Errorf("write screenshot: %w", err)
	}
	if len(legend) > 0 {
		lb, _ := json.MarshalIndent(legend, "", "  ")
		_ = os.WriteFile(out+".legend.json", lb, 0o644)
	}
	cfg, _ := png.DecodeConfig(bytes.NewReader(pngBytes))
	b.mu.Lock()
	b.lastShotHash, b.lastShotPath = hash, out
	b.mu.Unlock()
	return &Shot{Path: out, SHA256: hash, Bytes: len(pngBytes), Width: cfg.Width, Height: cfg.Height}, nil
}

// boxesForAnnotate resolves up to cap current-gen ref boxes for the
// annotated overlay. Unresolvable refs skip silently: the legend only
// names refs that actually drew.
func (b *Browser) boxesForAnnotate(cap int) []annotBox {
	snap := b.Current()
	if snap == nil {
		return nil
	}
	var out []annotBox
	for _, r := range snap.Refs {
		if len(out) >= cap {
			break
		}
		if r.BackendID == 0 {
			continue
		}
		oid, err := b.sess.resolve(r.BackendID, 5*time.Second)
		if err != nil {
			continue
		}
		raw, err := b.sess.Call("DOM.getBoxModel", map[string]interface{}{"objectId": oid}, 5*time.Second)
		if err != nil {
			continue
		}
		var m struct {
			Model struct {
				Content []float64 `json:"content"`
			} `json:"model"`
		}
		if err := json.Unmarshal(raw, &m); err != nil || len(m.Model.Content) < 8 {
			continue
		}
		q := m.Model.Content
		minX, minY, maxX, maxY := q[0], q[1], q[0], q[1]
		for i := 2; i < 8; i += 2 {
			if q[i] < minX {
				minX = q[i]
			}
			if q[i] > maxX {
				maxX = q[i]
			}
			if q[i+1] < minY {
				minY = q[i+1]
			}
			if q[i+1] > maxY {
				maxY = q[i+1]
			}
		}
		if maxX-minX <= 0 || maxY-minY <= 0 {
			continue
		}
		out = append(out, annotBox{ID: r.ID, X0: minX, Y0: minY, X1: maxX, Y1: maxY})
	}
	return out
}

type annotBox struct {
	ID         string
	X0, Y0, X1, Y1 float64
}

var annotPalette = []color.RGBA{
	{R: 255, G: 80, B: 80, A: 255},
	{R: 80, G: 220, B: 120, A: 255},
	{R: 90, G: 160, B: 255, A: 255},
	{R: 255, G: 200, B: 80, A: 255},
}

// annotatePNG draws 2-pixel ref boxes into the PNG and returns the
// legend (color hex per ref id). No text rasterizer ships in stdlib,
// so labels live in the sidecar legend JSON: the boxes are real
// geometry, the legend names them, and nothing pretends to render
// glyphs it cannot.
func annotatePNG(raw []byte, boxes []annotBox) ([]byte, map[string]string, error) {
	img, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, nil, err
	}
	bounds := img.Bounds()
	out := image.NewRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			out.Set(x, y, img.At(x, y))
		}
	}
	legend := map[string]string{}
	for i, bx := range boxes {
		c := annotPalette[i%len(annotPalette)]
		legend[bx.ID] = fmt.Sprintf("#%02x%02x%02x", c.R, c.G, c.B)
		x0 := int(bx.X0)
		y0 := int(bx.Y0)
		x1 := int(bx.X1)
		y1 := int(bx.Y1)
		if x1 <= x0 || y1 <= y0 {
			continue
		}
		for x := x0; x <= x1; x++ {
			for _, y := range []int{y0, y0 + 1, y1 - 1, y1} {
				out.Set(x, y, c)
			}
		}
		for y := y0; y <= y1; y++ {
			for _, x := range []int{x0, x0 + 1, x1 - 1, x1} {
				out.Set(x, y, c)
			}
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, out); err != nil {
		return nil, nil, err
	}
	return buf.Bytes(), legend, nil
}

// PDF exports the current page through printToPDF with backgrounds
// on: the agent-readable paper trail for forms and receipts.
func (b *Browser) PDF(out string) (string, int, error) {
	if strings.TrimSpace(out) == "" {
		return "", 0, fmt.Errorf("empty out path: PDFs need an explicit file")
	}
	raw, err := b.sess.Call("Page.printToPDF", map[string]interface{}{"printBackground": true}, 30*time.Second)
	if err != nil {
		return "", 0, fmt.Errorf("print to pdf: %w", err)
	}
	var pdfOut struct {
		Data string `json:"data"`
	}
	if err := json.Unmarshal(raw, &pdfOut); err != nil {
		return "", 0, fmt.Errorf("decode pdf: %w", err)
	}
	if pdfOut.Data == "" {
		// Newer shells stream the PDF instead of returning bytes:
		// without a stream reader this build reports honestly
		// instead of writing an empty file and calling it a PDF.
		return "", 0, fmt.Errorf("print to pdf returned no bytes (streaming transfer unsupported); use screenshot instead")
	}
	data, err := base64.StdEncoding.DecodeString(pdfOut.Data)
	if err != nil {
		return "", 0, fmt.Errorf("decode pdf bytes: %w", err)
	}
	if len(data) < 5 || string(data[:5]) != "%PDF-" {
		return "", 0, fmt.Errorf("print to pdf returned %d non-PDF bytes; refusing a corrupt export", len(data))
	}
	if err := os.WriteFile(out, data, 0o644); err != nil {
		return "", 0, fmt.Errorf("write pdf: %w", err)
	}
	sum := sha256.Sum256(data)
	_ = sum
	return out, len(data), nil
}
