package engine

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/demo"
)

// Timing budgets (binding fail thresholds). Cold navigations launch or
// reuse a sidecar for a first load; warm navigations reuse a live CDP
// session for a second load.
const (
	ColdBudget = 10 * time.Second
	WarmBudget = 3 * time.Second
)

// JSProbe reports whether page JavaScript actually executed: the SPA
// render check the success gate requires.
type JSProbe struct {
	Executed  bool   `json:"executed"`
	Nodes     int    `json:"nodes"`
	Ready     string `json:"ready"`
	HasApp    bool   `json:"has_app_root"`
	UserAgent string `json:"user_agent"`
}

// Result is one navigation outcome: styled rows plus timing, probe,
// and fail-closed error fields. Offline results carry Code and Warning
// with an honest error page in Rows, never a faked snapshot.
// ColdMs carries real milliseconds under the cold_ms name so corpus
// logs and the tb-agent JSON twin never mislabel units.
// JarApplied counts jar cookies installed pre-load; JarSynced counts
// live cookies copied back post-load.
type Result struct {
	URL        string        `json:"url"`
	Title      string        `json:"title"`
	Rows       []demo.Row    `json:"-"`
	RowCount   int           `json:"rows"`
	ColdMs     int64         `json:"cold_ms"`
	TotalMs    int64         `json:"total_ms,omitempty"`
	JarApplied int           `json:"jar_applied,omitempty"`
	JarSynced  int           `json:"jar_synced,omitempty"`
	Warm       time.Duration `json:"-"`
	WarmTitle  string        `json:"warm_title,omitempty"`
	WarmOver   bool          `json:"warm_over_budget,omitempty"`
	JS         JSProbe       `json:"js"`
	Offline    bool          `json:"offline"`
	Code       string        `json:"code,omitempty"`
	Warning    string        `json:"warning,omitempty"`
	Version    string        `json:"chrome_version"`
}

// Cold reports the cold navigation cost as a duration.
func (r *Result) Cold() time.Duration {
	if r == nil {
		return 0
	}
	return time.Duration(r.ColdMs) * time.Millisecond
}

// Total reports the spawn-inclusive cost from Navigate entry through
// render: sidecar launch plus connect plus enable plus cold load.
// ColdMs covers the load wait only; TotalMs never understates cold.
func (r *Result) Total() time.Duration {
	if r == nil {
		return 0
	}
	return time.Duration(r.TotalMs) * time.Millisecond
}

// Options tunes one navigation.
type Options struct {
	Profile string
	Lite    bool
	Timeout time.Duration
	Width   int
	WarmURL string
	// NoRecord skips history and stack persistence. Back/forward and
	// reload reuse Navigate without appending a fresh entry: the
	// stack index already moved and a second append would fork it.
	NoRecord bool
}

// ClassifyError maps Chrome/CDP/network error text to fail-closed
// codes. Unknown errors keep their message under "error" so nothing is
// ever swallowed into a fake success.
func ClassifyError(err error) string {
	if err == nil {
		return ""
	}
	s := strings.ToLower(err.Error())
	// Load timeouts name the phase explicitly; check before the generic
	// network-timeout arm since the message contains "timeout" too.
	if strings.Contains(s, "load timeout") {
		return "load_timeout"
	}
	switch {
	case strings.Contains(s, "internet_disconnected"),
		strings.Contains(s, "name_not_resolved"),
		strings.Contains(s, "connection_refused"),
		strings.Contains(s, "network unreachable"),
		strings.Contains(s, "no such host"),
		strings.Contains(s, "timeout"):
		return "offline"
	case strings.Contains(s, "no chrome"),
		strings.Contains(s, "chrome --version"),
		strings.Contains(s, "below floor"):
		return "no_chrome"
	case strings.Contains(s, "invalid url"), strings.Contains(s, "unsupported scheme"):
		return "bad_url"
	case strings.Contains(s, "invalid profile"),
		strings.Contains(s, "rejected extra chrome flag"):
		return "bad_profile"
	default:
		return "error"
	}
}

// ValidateURL accepts only http and https for live fetch. Anything else
// fails closed with a pointer to the fixture router.
func ValidateURL(raw string) error {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("invalid url %q: want http(s)://host/path", raw)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("unsupported scheme %q: live fetch wants http(s); try fixture://home offline", u.Scheme)
	}
	return nil
}

// Navigate loads url through a fresh sidecar, styles the AX tree into
// grid rows, runs the JS probe, and optionally measures a warm second
// load. Every failure returns an honest offline/error Result.
// Timing: ColdMs covers the load wait; TotalMs covers Navigate entry
// through render (sidecar spawn plus connect plus enable plus load),
// so cold_ms never understates true cold cost.
func Navigate(target string, o Options) *Result {
	t0 := time.Now()
	stamp := func(r *Result) *Result {
		r.TotalMs = time.Since(t0).Milliseconds()
		return r
	}
	width := o.Width
	if width <= 0 {
		width = 80
	}
	if err := ValidateURL(target); err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = ""
		return stamp(r)
	}
	timeout := o.Timeout
	if timeout == 0 {
		timeout = ColdBudget + 15*time.Second
	}
	bin, err := Locate()
	if err != nil {
		return stamp(OfflineResult(target, ClassifyError(err), err.Error()))
	}
	ver, err := CheckFloor(bin)
	if err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = ver
		return stamp(r)
	}
	proc, err := Launch(LaunchOpts{Binary: bin, Profile: o.Profile, Timeout: timeout})
	if err != nil {
		return stamp(OfflineResult(target, ClassifyError(err), err.Error()))
	}
	defer proc.Stop()

	dbg, err := PageTarget(proc.Endpoint())
	if err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = proc.Version
		return stamp(r)
	}
	sess, err := Connect(dbg)
	if err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = proc.Version
		return stamp(r)
	}
	defer sess.Close()
	if err := sess.Enable(); err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = proc.Version
		return stamp(r)
	}
	if err := sess.SetLite(o.Lite); err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = proc.Version
		return stamp(r)
	}
	// Session continuity: install the persisted jar into the fresh
	// context before the load (resumed logins), then copy the live
	// cookies back after it. Both are best-effort: a refused cookie
	// never fails a navigation, it only skips.
	jarApplied, _ := PushJar(sess, o.Profile, target, 10*time.Second)
	// Clock starts before Navigate so the cold cost covers the full
	// load wait (sidecar spawn stays outside: Launch already waited for
	// the DevTools endpoint and reports its own timeout separately).
	// TotalMs (stamped from t0 above) carries the spawn-inclusive cost.
	start := time.Now()
	if _, err := sess.Navigate(target, ColdBudget); err != nil {
		r := OfflineResult(target, ClassifyError(err), err.Error())
		r.Version = proc.Version
		r.ColdMs = time.Since(start).Milliseconds()
		return stamp(r)
	}
	cold := time.Since(start)
	res := buildResult(sess, target, proc.Version, width)
	res.ColdMs = cold.Milliseconds()
	res.JarApplied = jarApplied
	if !res.Offline && !o.NoRecord {
		// Successful loads persist: live cookies merge into the jar
		// and the visit lands in history plus the back/forward
		// stack. Sync failures stay silent here (navigation won);
		// the CLI surfaces them on demand via cookies/history.
		if _, n, serr := SyncJar(sess, o.Profile, 10*time.Second); serr == nil {
			res.JarSynced = n
		}
		_ = RecordVisit(o.Profile, target, res.Title)
		_, _ = VisitStack(o.Profile, target, res.Title)
	}
	if o.WarmURL != "" {
		w0 := time.Now()
		if _, err := sess.Navigate(o.WarmURL, WarmBudget); err == nil {
			warm := buildResult(sess, o.WarmURL, proc.Version, width)
			res.Warm = time.Since(w0)
			// Keep the user-visible title clean: warm diagnostics live
			// in dedicated fields, never appended to Title.
			res.WarmTitle = warm.Title
			if res.Warm > WarmBudget {
				res.WarmOver = true
				if res.Warning == "" {
					res.Warning = fmt.Sprintf("warm load %s exceeded budget %s", res.Warm.Round(time.Millisecond), WarmBudget)
				}
			}
		} else {
			res.Warm = time.Since(w0)
			res.WarmOver = res.Warm > WarmBudget
		}
	}
	return stamp(res)
}

// NavigateQuick is the TUI/CLI one-shot path: single load, default
// profile, caller-chosen lite flag, cold budget enforced inside.
func NavigateQuick(target, profile string, lite bool, width int) *Result {
	return Navigate(target, Options{Profile: profile, Lite: lite, Width: width})
}

func buildResult(sess *Session, target, version string, width int) *Result {
	title := target
	if v, err := sess.Evaluate(`document.title || ""`, false, 10*time.Second); err == nil {
		var t string
		if json.Unmarshal(v, &t) == nil && strings.TrimSpace(t) != "" {
			title = t
		}
	}
	js := probeJS(sess)
	axRaw, err := sess.AXTree(15 * time.Second)
	if err != nil {
		r := OfflineResult(target, ClassifyError(err), "AX snapshot failed: "+err.Error())
		r.Version = version
		return r
	}
	nodes, order, err := ParseAX(axRaw)
	if err != nil || len(nodes) == 0 {
		r := OfflineResult(target, "error", "empty accessibility tree; page may need longer to render")
		r.Version = version
		return r
	}
	blocks := Flatten(nodes, order)
	rows := Style(blocks, width)
	if len(rows) == 0 {
		r := OfflineResult(target, "error", "page rendered no text blocks; refusing an empty win")
		r.Version = version
		return r
	}
	return &Result{
		URL: target, Title: title, Rows: rows,
		RowCount: len(rows), JS: js, Version: version,
	}
}

// probeJSProbeExpr asks the page for render evidence: node count,
// readiness, app roots (React/Next/Vue markers), and the user agent.
// It sets a JS canary (window.__tbProbe = 1) so Executed proves JS ran:
// static HTML with JS disabled never sets the canary.
const probeJSProbeExpr = `(() => { try {
  window.__tbProbe = 1;
  const nodes = document.querySelectorAll('*').length;
  const ready = document.readyState;
  const app = !!document.querySelector('#root,#__next,#app,[data-reactroot],main,article');
  return {nodes: nodes, ready: ready, app: app, ua: navigator.userAgent || ''};
} catch (e) { return {nodes: 0, ready: 'error', app: false, ua: ''}; } })()`

func probeJS(sess *Session) JSProbe {
	v, err := sess.Evaluate(probeJSProbeExpr, false, 10*time.Second)
	if err != nil {
		return JSProbe{}
	}
	var p struct {
		Nodes int    `json:"nodes"`
		Ready string `json:"ready"`
		App   bool   `json:"app"`
		UA    string `json:"ua"`
	}
	if err := json.Unmarshal(v, &p); err != nil {
		return JSProbe{}
	}
	// Second step: read the canary back. A static page with JS disabled
	// yields nodes > 0 but no canary, so canaryBool gates Executed.
	var canaryBool bool
	if cv, canaryErr := sess.Evaluate(`window.__tbProbe === 1`, false, 10*time.Second); canaryErr == nil {
		_ = json.Unmarshal(cv, &canaryBool)
	}
	return JSProbe{
		Executed: canaryBool && p.Nodes > 0, Nodes: p.Nodes, Ready: p.Ready,
		HasApp: p.App, UserAgent: p.UA,
	}
}

// ToDemoPage converts a Result into the shared Page model so live pages
// paint through the exact Phase 1 frame pipeline.
func (r *Result) ToDemoPage() demo.Page {
	if r == nil {
		return demo.NotFound("about:blank")
	}
	if r.Offline || len(r.Rows) == 0 {
		return OfflinePage(r.URL, r.Warning)
	}
	return demo.Page{
		Name: "live", Title: r.Title, Address: r.URL, Rows: r.Rows,
	}
}

// OfflineResult builds the honest fail-closed result: actionable text,
// a machine code, and no fake rows.
func OfflineResult(target, code, reason string) *Result {
	if code == "" {
		code = "error"
	}
	msg := reason
	if strings.TrimSpace(msg) == "" {
		msg = "navigation failed"
	}
	msg += " (offline fail-closed: check network and Chrome, then retry; fixture://home works offline)"
	rows := OfflinePage(target, msg).Rows
	return &Result{
		URL: target, Title: "Navigation failed",
		Rows:     rows,
		RowCount: len(rows), Offline: true, Code: code, Warning: msg,
	}
}
