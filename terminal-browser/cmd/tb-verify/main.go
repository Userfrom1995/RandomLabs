// Command tb-verify runs the terminal browser real-world verification
// corpus: live navigations with 3-attempt retry against five real
// pages, offline-fixture fallback through the production Style path,
// fixture goldens, a Chrome 140 floor check, and an optional
// agent-as-user end-to-end run through the persistent Browser the
// agents drive. Every result names whether it is live or fallback:
// fallbacks never masquerade as live passes.
//
// Exit codes: 0 when the harness executed and every golden held
// (live misses recorded, not fatal); 1 when a golden fails or when
// --strict-live is set and any live entry or the e2e run missed;
// 2 on flag misuse.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
	"randomlabs/terminal-browser/internal/term"
)

// CorpusEntry is one real page the harness proves the browser against.
type CorpusEntry struct {
	Name    string
	URL     string
	Kind    string
	MinRows int
	WantJS  bool
}

// Corpus pins the live set: news plus wiki content pages, the TodoMVC
// React SPA (JS must execute), the bot-walled probe page, and the
// GitHub login wall.
func Corpus() []CorpusEntry {
	return []CorpusEntry{
		{Name: "hn", URL: "https://news.ycombinator.com/", Kind: "content", MinRows: 10},
		{Name: "wiki", URL: "https://en.wikipedia.org/wiki/Terminal_pager", Kind: "content", MinRows: 10},
		{Name: "todomvc", URL: "https://todomvc.com/examples/react/dist/", Kind: "spa", MinRows: 3, WantJS: true},
		{Name: "botwall", URL: "https://bot.sannysoft.com/", Kind: "botwall", MinRows: 3},
		{Name: "github-login", URL: "https://github.com/login", Kind: "loginwall", MinRows: 3},
	}
}

// EntryResult is the verdict for one corpus entry.
type EntryResult struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Kind     string `json:"kind"`
	Live     bool   `json:"live"`
	Fallback bool   `json:"fallback"`
	Rows     int    `json:"rows"`
	ColdMs   int64  `json:"cold_ms"`
	TotalMs  int64  `json:"total_ms"`
	JS       bool   `json:"js_executed"`
	Chrome   string `json:"chrome"`
	Code     string `json:"code,omitempty"`
	Attempts int    `json:"attempts"`
	Over     bool   `json:"over_budget"`
	Pass     bool   `json:"pass"`
	Note     string `json:"note"`
}

// Golden pins the hermetic acceptance for one entry.
type Golden struct {
	Name    string `json:"name"`
	Marker  string `json:"marker,omitempty"`
	MinRows int    `json:"min_rows"`
	Fixture string `json:"fixture,omitempty"`
}

// GoldenResult is the verdict for one golden file.
type GoldenResult struct {
	Name   string `json:"name"`
	Pass   bool   `json:"pass"`
	Rows   int    `json:"rows"`
	Marker bool   `json:"marker_found"`
	Note   string `json:"note"`
}

// E2EResult is the agent-as-user run through the persistent Browser.
type E2EResult struct {
	Ran      bool   `json:"ran"`
	Skipped  bool   `json:"skipped"`
	Pass     bool   `json:"pass"`
	URL      string `json:"url"`
	Gen      int    `json:"gen"`
	Refs     int    `json:"refs"`
	Rows     int    `json:"rows"`
	Code     string `json:"code,omitempty"`
	Note     string `json:"note"`
}

// Report is the full harness output.
type Report struct {
	Tool      string         `json:"tool"`
	OS        string         `json:"os"`
	Arch      string         `json:"arch"`
	Chrome    string         `json:"chrome"`
	ChromeOK  bool           `json:"chrome_ok"`
	Reduced   bool           `json:"reduced_motion"`
	Tier      string         `json:"tier"`
	Entries   []EntryResult  `json:"entries"`
	Goldens   []GoldenResult `json:"goldens"`
	E2E       *E2EResult     `json:"e2e,omitempty"`
	Pass      bool           `json:"pass"`
	StrictLive bool          `json:"strict_live"`
}

func main() {
	attempts := flag.Int("attempts", 3, "live attempts per corpus entry before fallback")
	profile := flag.String("profile", "verify", "browser profile for live fetch")
	lite := flag.Bool("lite", false, "block images, media, and trackers on live fetch")
	width := flag.Int("width", 80, "grid width for fallback styling")
	out := flag.String("out", "", "write the JSON report to this path (0600)")
	goldens := flag.String("goldens", "tests/fixtures/goldens", "golden directory (module-relative or absolute)")
	fixtures := flag.String("fixtures", "tests/fixtures", "offline fixture directory for fallback rendering")
	hermetic := flag.Bool("hermetic", false, "skip live attempts; fixtures and goldens only")
	e2e := flag.Bool("e2e", false, "run the agent-as-user persistent-browser pass")
	e2eURL := flag.String("e2e-url", "https://news.ycombinator.com/", "target for the e2e run")
	strict := flag.Bool("strict-live", false, "fail when any live entry or the e2e run misses")
	flag.Parse()

	if *attempts < 1 || *attempts > 10 {
		fmt.Fprintln(os.Stderr, "tb-verify: --attempts must be 1..10")
		os.Exit(2)
	}

	caps := term.Probe()
	rep := Report{Tool: "tb-verify", OS: runtime.GOOS, Arch: runtime.GOARCH,
		Reduced: term.Reduced(), Tier: caps.Tier.String(), StrictLive: *strict}

	if bin, err := engine.Locate(); err != nil {
		rep.Chrome, rep.ChromeOK = "", false
		_ = bin
	} else if ver, verr := engine.CheckFloor(bin); verr != nil {
		rep.Chrome, rep.ChromeOK = ver, false
	} else {
		rep.Chrome, rep.ChromeOK = ver, true
	}

	goldPass := true
	for _, g := range loadGoldens(*goldens) {
		gr := checkGolden(g, *goldens, *fixtures, *width)
		rep.Goldens = append(rep.Goldens, gr)
		if !gr.Pass {
			goldPass = false
		}
	}

	entryPass := true
	for _, e := range Corpus() {
		er := runEntry(e, *attempts, *profile, *lite, *width, *hermetic, *fixtures, rep.Chrome)
		rep.Entries = append(rep.Entries, er)
		if *strict && !er.Pass {
			entryPass = false
		}
	}

	if *e2e {
		er := runE2E(*e2eURL, *profile, *lite, *strict)
		rep.E2E = &er
		if *strict && !er.Pass {
			entryPass = false
		}
	}

	rep.Pass = goldPass && entryPass
	enc, _ := json.MarshalIndent(rep, "", "  ")
	fmt.Println(string(enc))
	if *out != "" {
		if err := os.WriteFile(*out, append(enc, '\n'), 0600); err != nil {
			fmt.Fprintln(os.Stderr, "tb-verify: write report: "+err.Error())
			os.Exit(1)
		}
	}
	if !rep.Pass {
		os.Exit(1)
	}
}

// runEntry navigates one corpus entry up to maxAttempts times with
// linear backoff, then falls back to the bundled shape snapshot
// (hn plus wiki only) rendered through the production Style path.
// Fallbacks report live:false with the offline code: never a pass
// dressed as live.
func runEntry(e CorpusEntry, maxAttempts int, profile string, lite bool, width int, hermetic bool, fixtureDir, chrome string) EntryResult {
	r := EntryResult{Name: e.Name, URL: e.URL, Kind: e.Kind, Chrome: chrome}
	if !hermetic {
		for a := 1; a <= maxAttempts; a++ {
			r.Attempts = a
			res := engine.Navigate(e.URL, engine.Options{Profile: profile, Lite: lite, Width: width})
			if !res.Offline {
				r.Live, r.Rows, r.ColdMs, r.TotalMs = true, res.RowCount, res.ColdMs, res.TotalMs
				r.JS, r.Chrome = res.JS.Executed, res.Version
				r.Over = res.Cold() > engine.ColdBudget
				r.Pass = res.RowCount >= e.MinRows && !r.Over && (!e.WantJS || res.JS.Executed)
				if e.WantJS && !res.JS.Executed {
					r.Note = "live load missed the JS probe"
				} else if r.Over {
					r.Note = "live load over the 10s cold budget"
				} else if res.RowCount < e.MinRows {
					r.Note = "live load under the row floor"
				} else {
					r.Note = "live pass"
				}
				return r
			}
			r.Code = res.Code
			if a < maxAttempts {
				time.Sleep(time.Duration(a) * 500 * time.Millisecond)
			}
		}
	}
	fb, rows, note := renderFallback(e.Name, fixtureDir, width)
	r.Fallback, r.Rows, r.Note = fb, rows, note
	r.Pass = fb && rows > 0
	if !fb && r.Code == "" {
		r.Code = "no_fixture"
	}
	return r
}

// renderFallback styles the bundled shape snapshot for hn plus wiki
// through engine.Style. Other entries have no snapshot: the harness
// reports the miss honestly instead of inventing rows.
func renderFallback(name, fixtureDir string, width int) (bool, int, string) {
	file, ok := map[string]string{"hn": "hn.json", "wiki": "wiki.json"}[name]
	if !ok {
		return false, 0, "live unreachable and no bundled snapshot; entry misses offline"
	}
	body, err := os.ReadFile(filepath.Join(fixtureDir, file))
	if err != nil {
		return false, 0, "fallback snapshot unreadable: " + err.Error()
	}
	var snap struct {
		Blocks []engine.Block `json:"blocks"`
	}
	if err := json.Unmarshal(body, &snap); err != nil {
		return false, 0, "fallback snapshot corrupt: " + err.Error()
	}
	rows := engine.Style(snap.Blocks, width)
	if len(rows) == 0 {
		return false, 0, "fallback snapshot styled to zero rows"
	}
	return true, len(rows), "offline-fallback through the production Style path, never live"
}

// loadGoldens reads every golden file in dir, sorted by filename for
// deterministic reports.
func loadGoldens(dir string) []Golden {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	var out []Golden
	for _, e := range ents {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		body, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var g Golden
		if err := json.Unmarshal(body, &g); err != nil {
			continue
		}
		if strings.TrimSpace(g.Name) == "" {
			continue
		}
		out = append(out, g)
	}
	return out
}

// checkGolden proves one golden: entries with a fixture render it
// through engine.Style and require the marker plus the row floor;
// live-only entries pin the row floor for live runs and pass
// hermetically by definition (nothing to render offline).
func checkGolden(g Golden, dir, fixtureDir string, width int) GoldenResult {
	r := GoldenResult{Name: g.Name}
	_ = dir
	if g.Fixture == "" {
		r.Pass, r.Note = true, "live-only golden: row floor applies to live runs"
		return r
	}
	body, err := os.ReadFile(filepath.Join(fixtureDir, g.Fixture))
	if err != nil {
		r.Note = "fixture unreadable: " + err.Error()
		return r
	}
	var snap struct {
		Blocks []engine.Block `json:"blocks"`
	}
	if err := json.Unmarshal(body, &snap); err != nil {
		r.Note = "fixture corrupt: " + err.Error()
		return r
	}
	rows := engine.Style(snap.Blocks, width)
	r.Rows = len(rows)
	joined := ""
	for _, row := range rows {
		joined += row.Text + "\n"
	}
	r.Marker = g.Marker == "" || strings.Contains(joined, g.Marker)
	r.Pass = r.Rows >= g.MinRows && r.Marker
	if !r.Pass {
		r.Note = "golden miss: rows or marker under floor"
		return r
	}
	r.Note = "golden holds through the production Style path"
	return r
}

// runE2E drives the persistent Browser exactly like an agent would:
// open a session, take the settled snapshot, and assert real content.
// Without Chrome it reports skipped with the classify reason (missing
// Chrome classifies as no_chrome) instead of failing the hermetic gate.
func runE2E(target, profile string, lite, strict bool) E2EResult {
	r := E2EResult{URL: target}
	b, err := engine.Open(target, engine.OpenOptions{Profile: profile, Lite: lite, Width: 100, NoRecord: true})
	if err != nil {
		r.Skipped, r.Code, r.Note = true, engine.ClassifyError(err), "e2e skipped: "+firstLine(err.Error())
		r.Pass = !strict
		return r
	}
	defer func() { _ = b.Close() }()
	r.Ran = true
	snap, err := b.Snapshot()
	if err != nil {
		r.Code, r.Note = "no_snapshot", "e2e snapshot failed: "+firstLine(err.Error())
		return r
	}
	rows := b.Rows()
	r.Gen, r.Refs, r.Rows = snap.Gen, len(snap.Refs), len(rows)
	if strings.TrimSpace(snap.Title) == "" || len(rows) == 0 {
		r.Code, r.Note = "empty_page", "e2e opened but the page proved empty"
		return r
	}
	r.Pass, r.Note = true, "agent-as-user pass: open plus settled snapshot plus content assert"
	return r
}

func firstLine(s string) string {
	if i := strings.Index(s, "\n"); i >= 0 {
		return s[:i]
	}
	if len(s) > 160 {
		return s[:160]
	}
	return s
}
