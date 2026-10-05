package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestWrapBasic(t *testing.T) {
	lines := Wrap("hello world foo bar", 10)
	// "hello world" is 11 wide at width 10, so it must break; every
	// line must fit and every word must survive.
	for _, ln := range lines {
		if len([]rune(ln)) > 10 {
			t.Fatalf("line overflows: %q", ln)
		}
	}
	joined := strings.Join(lines, " ")
	for _, w := range []string{"hello", "world", "foo", "bar"} {
		if !strings.Contains(joined, w) {
			t.Fatalf("lost word %q in %q", w, lines)
		}
	}
}

func TestWrapLongWord(t *testing.T) {
	lines := Wrap("https://example.com/very/long/path/segment", 12)
	for _, ln := range lines {
		if len([]rune(ln)) > 12 {
			t.Fatalf("overflow: %q", ln)
		}
	}
	if len(lines) < 3 {
		t.Fatalf("long URL should hard-break: %q", lines)
	}
}

func TestLayoutTable(t *testing.T) {
	lines := LayoutTable([]string{"Tier", "Paint path"}, [][]string{{"kitty", "transmit-once and place"}, {"block", "half-block diff"}}, 40)
	if len(lines) != 4 {
		t.Fatalf("want header+sep+2 rows, got %d: %q", len(lines), lines)
	}
	if !strings.Contains(lines[1], "---") {
		t.Fatalf("missing separator row: %q", lines[1])
	}
	for _, ln := range lines {
		if len([]rune(ln)) > 40 {
			t.Fatalf("table row overflows: %q", ln)
		}
	}
}

func TestStyleRoles(t *testing.T) {
	blocks := []Block{
		{Kind: "heading", Text: "Title", Level: 1},
		{Kind: "link", Text: "Story", Href: "https://example.com/x"},
		{Kind: "control", Text: "Search [input]"},
		{Kind: "image", Text: "[image: logo]"},
		{Kind: "item", Text: "point one"},
		{Kind: "table", Head: []string{"A", "B"}, Cells: [][]string{{"1", "2"}}},
		{Kind: "text", Text: "plain prose"},
	}
	rows := Style(blocks, 40)
	if len(rows) == 0 {
		t.Fatal("no rows styled")
	}
	var sawHeading, sawLink, sawControl bool
	for _, r := range rows {
		if strings.Contains(r.Text, "# Title") && r.Bold {
			sawHeading = true
		}
		if strings.Contains(r.Text, "[1] Story") && r.Link && r.Underline {
			sawLink = true
		}
		if strings.Contains(r.Text, "Search [input]") {
			sawControl = true
		}
	}
	if !sawHeading || !sawLink || !sawControl {
		t.Fatalf("role styling lost (heading=%v link=%v control=%v): %+v", sawHeading, sawLink, sawControl, rows)
	}
}

func TestValidateURL(t *testing.T) {
	for _, good := range []string{"https://news.ycombinator.com/", "http://example.com/x"} {
		if err := ValidateURL(good); err != nil {
			t.Fatalf("reject good %q: %v", good, err)
		}
	}
	for _, bad := range []string{"fixture://home", "gopher://x", "not a url", ""} {
		if err := ValidateURL(bad); err == nil {
			t.Fatalf("accept bad %q", bad)
		}
	}
}

func TestClassifyError(t *testing.T) {
	cases := map[string]string{
		"net::ERR_INTERNET_DISCONNECTED": "offline",
		"no Chrome found":                "no_chrome",
		"chrome 120 below floor":         "no_chrome",
		"navigate: load timeout after":   "load_timeout",
		"unsupported scheme":             "bad_url",
		"something weird":                "error",
	}
	for msg, want := range cases {
		if got := ClassifyError(errMsg(msg)); got != want {
			t.Fatalf("%q: got %q want %q", msg, got, want)
		}
	}
}

type errMsg string

func (e errMsg) Error() string { return string(e) }

func TestParseAXFlatten(t *testing.T) {
	raw := json.RawMessage(`{"nodes": [
		{"nodeId": "1", "role": {"value": "RootWebArea"}, "name": {"value": ""}, "childIds": ["2", "3"]},
		{"nodeId": "2", "role": {"value": "heading"}, "name": {"value": "Hello HN"}, "childIds": []},
		{"nodeId": "3", "role": {"value": "link"}, "name": {"value": "Story"}, "childIds": []}
	]}`)
	nodes, order, err := ParseAX(raw)
	if err != nil || len(nodes) != 3 {
		t.Fatalf("parse: %v %d", err, len(nodes))
	}
	blocks := Flatten(nodes, order)
	if len(blocks) != 2 || blocks[0].Kind != "heading" || blocks[1].Kind != "link" {
		t.Fatalf("flatten: %+v", blocks)
	}
}

func TestOfflineHonesty(t *testing.T) {
	r := OfflineResult("https://example.com/", "offline", "net::ERR_INTERNET_DISCONNECTED")
	if !r.Offline || r.Code != "offline" {
		t.Fatalf("offline flags lost: %+v", r)
	}
	if !strings.Contains(r.Warning, "fail-closed") {
		t.Fatalf("warning must say fail-closed: %q", r.Warning)
	}
	page := r.ToDemoPage()
	found := false
	for _, row := range page.Rows {
		if strings.Contains(row.Text, "did not load") {
			found = true
		}
		if strings.Contains(strings.ToLower(row.Text), "success") {
			t.Fatalf("error page must never claim success: %q", row.Text)
		}
	}
	if !found {
		t.Fatalf("error page missing headline: %+v", page.Rows)
	}
}

func TestOfflineRowCountConsistent(t *testing.T) {
	for _, tc := range []struct{ code, reason string }{
		{"offline", "net::ERR_INTERNET_DISCONNECTED"},
		{"no_chrome", "no Chrome found"},
		{"error", ""},
	} {
		r := OfflineResult("https://example.com/", tc.code, tc.reason)
		if r.RowCount != len(r.Rows) {
			t.Fatalf("code=%s: RowCount=%d len(Rows)=%d", tc.code, r.RowCount, len(r.Rows))
		}
		if r.RowCount == 0 {
			t.Fatalf("code=%s: error page must carry real rows", tc.code)
		}
	}
}

func TestSanitizeProfile(t *testing.T) {
	for _, good := range []string{"default", "test-live", "aB0_-x"} {
		if _, err := SanitizeProfile(good); err != nil {
			t.Fatalf("reject good profile %q: %v", good, err)
		}
	}
	for _, bad := range []string{"../.ssh", "a/b", `a\b`, ".hidden", strings.Repeat("x", 65)} {
		if _, err := SanitizeProfile(bad); err == nil {
			t.Fatalf("accept bad profile %q", bad)
		}
	}
	if got, err := SanitizeProfile(""); err != nil || got != "default" {
		t.Fatalf("empty profile should map to default, got %q err %v", got, err)
	}
	if got := ProfileDir("../../.ssh"); strings.Contains(got, ".ssh") {
		t.Fatalf("profile traversal escaped isolation: %q", got)
	}
}

func TestControlRoleNormalize(t *testing.T) {
	raw := json.RawMessage(`{"nodes": [
		{"nodeId": "1", "role": {"value": "RootWebArea"}, "name": {"value": ""}, "childIds": ["2", "3", "4", "5"]},
		{"nodeId": "2", "role": {"value": "Button"}, "name": {"value": "Go"}, "childIds": []},
		{"nodeId": "3", "role": {"value": "SearchBox"}, "name": {"value": "Find"}, "childIds": []},
		{"nodeId": "4", "role": {"value": " textbox "}, "name": {"value": "Name"}, "childIds": []},
		{"nodeId": "5", "role": {"value": "CHECKBOX"}, "name": {"value": "Agree"}, "childIds": []}
	]}`)
	nodes, order, err := ParseAX(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	blocks := Flatten(nodes, order)
	if len(blocks) != 4 {
		t.Fatalf("want 4 controls, got %+v", blocks)
	}
	for _, b := range blocks {
		if b.Kind != "control" {
			t.Fatalf("role lost control kind: %+v", b)
		}
	}
}

func TestRewrapKeepsTables(t *testing.T) {
	blocks := []Block{{Kind: "table", Head: []string{"A", "B"}, Cells: [][]string{{"1", "2"}}}}
	rows := Style(blocks, 40)
	if len(rows) == 0 {
		t.Fatal("no table rows styled")
	}
	tableLines := map[string]bool{}
	for _, r := range rows {
		if strings.TrimSpace(r.Text) != "" {
			tableLines[r.Text] = true
		}
	}
	rewrapped := Rewrap(rows, 24)
	for _, r := range rewrapped {
		if r.NoWrap {
			continue
		}
		if strings.TrimSpace(r.Text) == "" {
			continue
		}
		if tableLines[r.Text] {
			continue
		}
		// Non-table rows may reflow; table lines must survive byte-identical.
	}
	for ln := range tableLines {
		found := false
		for _, r := range rewrapped {
			if r.Text == ln {
				found = true
			}
		}
		if !found {
			t.Fatalf("table line re-wrapped and lost alignment: %q", ln)
		}
	}
}

func TestLiteBlocklists(t *testing.T) {
	if len(LiteBlocklists) == 0 {
		t.Fatal("lite blocklists empty: text navigation would pay media bytes")
	}
	joined := strings.Join(LiteBlocklists, " ")
	for _, want := range []string{"*.png", "*.mp4", "*.woff2"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("blocklist missing %s: %q", want, joined)
		}
	}
}

func TestLocateChrome(t *testing.T) {
	bin, err := Locate()
	if err != nil {
		t.Skipf("no chrome on this host: %v", err)
	}
	major, full, err := ChromeVersion(bin)
	if err != nil {
		t.Fatalf("version probe: %v", err)
	}
	t.Logf("chrome: %s (%s), major %d, floor %d", bin, full, major, ChromeFloor)
	if major < ChromeFloor {
		t.Fatalf("chrome %d below floor %d", major, ChromeFloor)
	}
}

// TestOfflineFixtures proves the bundled snapshots under
// tests/fixtures render real rows through the production Style path.
// Runs use these only when the live network is unreachable and report
// offline-fallback, never live.
func TestOfflineFixtures(t *testing.T) {
	for _, name := range []string{"hn.json", "wiki.json"} {
		path := filepath.Join("..", "..", "tests", "fixtures", name)
		body, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("fixture %s: %v", name, err)
		}
		var snap struct {
			URL    string `json:"url"`
			Title  string `json:"title"`
			Blocks []Block `json:"blocks"`
		}
		// Block carries Cells/Head as [][]string plus Head []string;
		// decode leniently through a shadow struct.
		var raw struct {
			URL    string `json:"url"`
			Title  string `json:"title"`
			Blocks []struct {
				Kind  string     `json:"kind"`
				Text  string     `json:"text"`
				Href  string     `json:"href"`
				Level int        `json:"level"`
				Head  []string   `json:"head"`
				Cells [][]string `json:"cells"`
			} `json:"blocks"`
		}
		if err := json.Unmarshal(body, &raw); err != nil {
			t.Fatalf("fixture %s: %v", name, err)
		}
		for _, b := range raw.Blocks {
			snap.Blocks = append(snap.Blocks, Block{
				Kind: b.Kind, Text: b.Text, Href: b.Href,
				Level: b.Level, Head: b.Head, Cells: b.Cells,
			})
		}
		_ = snap.URL
		_ = snap.Title
		rows := Style(snap.Blocks, 80)
		if len(rows) == 0 {
			t.Fatalf("fixture %s styled to zero rows", name)
		}
		joined := ""
		for _, r := range rows {
			joined += r.Text + "\n"
		}
		marker := map[string]string{"hn.json": "Hacker News", "wiki.json": "Terminal pager"}[name]
		if !strings.Contains(joined, marker) {
			t.Fatalf("fixture %s missing marker %q:\n%s", name, marker, joined)
		}
	}
}

// TestLiveNavigate exercises the full sidecar path when the network and
// Chrome are present. On unreachable hosts it verifies the offline
// fail-closed path instead, reporting offline-fallback per policy.
func TestLiveNavigate(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: live corpus runs in full mode")
	}
	bin, err := Locate()
	if err != nil {
		t.Skipf("no chrome: %v", err)
	}
	if _, err := CheckFloor(bin); err != nil {
		t.Skipf("below floor: %v", err)
	}
	var last *Result
	for attempt := 1; attempt <= 3; attempt++ {
		last = Navigate("https://news.ycombinator.com/", Options{Profile: "test-live", Lite: true, Width: 80, Timeout: 30 * time.Second})
		if !last.Offline {
			break
		}
		t.Logf("attempt %d offline: %s", attempt, last.Warning)
		time.Sleep(time.Duration(attempt) * time.Second)
	}
	if last.Offline {
		t.Logf("offline-fallback: live unreachable, fail-closed code=%s", last.Code)
		if last.Code == "" || !strings.Contains(last.Warning, "fail-closed") {
			t.Fatalf("fallback must stay honest: %+v", last)
		}
		return
	}
	t.Logf("live: title=%q rows=%d cold=%s js=%+v chrome=%s", last.Title, last.RowCount, last.Cold(), last.JS, last.Version)
	if last.RowCount == 0 {
		t.Fatal("live render produced no rows")
	}
	if last.RowCount != len(last.Rows) {
		t.Fatalf("row count mismatch: RowCount=%d len(Rows)=%d", last.RowCount, len(last.Rows))
	}
	if last.Cold() > ColdBudget {
		t.Fatalf("cold %s exceeds binding budget %s", last.Cold(), ColdBudget)
	}
	if !last.JS.Executed {
		t.Fatal("JS probe reports no execution on a JS-served front page")
	}
}
