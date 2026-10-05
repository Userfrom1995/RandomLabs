package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestParseRef(t *testing.T) {
	for _, good := range []string{"e1", "e12", "@e3", " E4 ", "@E5"} {
		got, err := ParseRef(good)
		if err != nil {
			t.Fatalf("reject good ref %q: %v", good, err)
		}
		if !strings.HasPrefix(got, "e") {
			t.Fatalf("unnormalized ref %q -> %q", good, got)
		}
	}
	for _, bad := range []string{"", "e0", "e", "@", "3", "ex", "e1x", "e-1"} {
		if _, err := ParseRef(bad); err == nil {
			t.Fatalf("accept bad ref %q", bad)
		}
	}
}

func TestActionableRoles(t *testing.T) {
	for _, role := range []string{"link", "Button", "TEXTBOX", " searchbox ", "combobox", "checkbox", "radio", "switch", "slider", "menuitem", "tab", "listbox"} {
		if !actionableRole(role) {
			t.Fatalf("role %q must be actionable", role)
		}
	}
	for _, role := range []string{"heading", "text", "StaticText", "image", "table", "RootWebArea", ""} {
		if actionableRole(role) {
			t.Fatalf("role %q must not take refs", role)
		}
	}
}

func TestRefNodesDOMOrder(t *testing.T) {
	raw := json.RawMessage(`{"nodes": [
		{"nodeId": "1", "role": {"value": "RootWebArea"}, "name": {"value": ""}, "childIds": ["2", "3", "4"]},
		{"nodeId": "2", "role": {"value": "heading"}, "name": {"value": "Title"}, "childIds": []},
		{"nodeId": "3", "role": {"value": "button"}, "name": {"value": "Go"}, "childIds": []},
		{"nodeId": "4", "role": {"value": "link"}, "name": {"value": "Story"}, "childIds": []}
	]}`)
	nodes, order, err := ParseAX(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	got := RefNodes(nodes, order)
	// Headings and text never take refs; controls surface in document
	// order: button before link.
	if len(got) != 2 || got[0].Role != "button" || got[1].Role != "link" {
		t.Fatalf("refs must follow DOM order from roots: %+v", got)
	}
}

func snapForTest(gen int, pairs ...string) *Snapshot {
	s := &Snapshot{Gen: gen, Stable: true}
	for i := 0; i+1 < len(pairs); i += 2 {
		s.Refs = append(s.Refs, Ref{
			ID: fmt.Sprintf("e%d", len(s.Refs)+1),
			Role: pairs[i], Name: pairs[i+1], BackendID: int64(100 + len(s.Refs)),
		})
	}
	return s
}

func TestRemapSameRoleName(t *testing.T) {
	old := snapForTest(2, "textbox", "Name", "button", "Go")
	fresh := snapForTest(3, "link", "New", "textbox", "Name", "button", "Go")
	got, reason := remapRef(old, fresh, "e1")
	if got == nil || *got != "e2" {
		t.Fatalf("same role+name must remap e1->e2, got %v (%s)", got, reason)
	}
}

func TestRemapNearestSibling(t *testing.T) {
	old := snapForTest(2, "link", "A", "button", "Stop", "link", "B")
	fresh := snapForTest(3, "link", "A", "link", "B", "button", "Halt")
	got, _ := remapRef(old, fresh, "e2")
	if got == nil || *got != "e3" {
		t.Fatalf("renamed button must map to the surviving same-role ref e3, got %v", strVal(got))
	}
}

func strVal(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}

func TestRemapNothingSurvived(t *testing.T) {
	old := snapForTest(2, "button", "Go")
	fresh := snapForTest(3, "link", "x")
	got, reason := remapRef(old, fresh, "e1")
	if got != nil {
		t.Fatalf("no surviving role must yield no remap, got %v", *got)
	}
	if !strings.Contains(reason, "button") {
		t.Fatalf("reason must name the lost role: %q", reason)
	}
}

func TestCodeOf(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{nil, ""},
		{&StaleError{Want: "e1", Gen: 1, Current: 2}, "ref_stale"},
		{&RefError{Code: "ref_no_node", Message: "x"}, "ref_no_node"},
		{&RefError{Code: "no_dialog", Message: "x"}, "no_dialog"},
		{fmt.Errorf("net::ERR_INTERNET_DISCONNECTED"), "offline"},
		{fmt.Errorf("no Chrome found"), "no_chrome"},
		{fmt.Errorf("whatever broke"), "error"},
	}
	for _, tc := range cases {
		if got := CodeOf(tc.err); got != tc.want {
			t.Fatalf("CodeOf(%v) = %q, want %q", tc.err, got, tc.want)
		}
	}
}

func TestStaleErrorText(t *testing.T) {
	with := &StaleError{Want: "e2", Gen: 1, Current: 3, Reason: "moved", Remap: strPtr("e4")}
	if !strings.Contains(with.Error(), "e4") || !strings.Contains(with.Error(), "ref_stale") {
		t.Fatalf("stale with remap must name both: %q", with.Error())
	}
	without := &StaleError{Want: "e2", Gen: 1, Current: 3, Reason: "gone"}
	if strings.Contains(without.Error(), "R") || !strings.Contains(without.Error(), "ref_stale") {
		t.Fatalf("stale without remap must not offer R: %q", without.Error())
	}
}

func strPtr(s string) *string { return &s }

// whitePNG builds a WxH white PNG for annotation tests.
func whitePNG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 255, G: 255, B: 255, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode: %v", err)
	}
	return buf.Bytes()
}

func decodePNG(t *testing.T, raw []byte) image.Image {
	t.Helper()
	img, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	return img
}

func TestB64PNGCap(t *testing.T) {
	if _, err := b64PNG(""); err == nil {
		t.Fatal("empty payload must fail")
	}
	if _, err := b64PNG("!!!"); err == nil {
		t.Fatal("bad base64 must fail")
	}
	// 33 zero bytes encode small but decode checks the 32 MiB cap path
	// only for real payloads; here the empty/prefix guards matter.
	if _, err := b64PNG("aGk="); err != nil {
		t.Fatalf("tiny payload must decode: %v", err)
	}
}

func TestAnnotateDrawsBoxes(t *testing.T) {
	// Build a 20x10 white PNG through the stdlib encoder, annotate two
	// boxes, and prove border pixels changed plus the legend names them.
	raw := whitePNG(t, 20, 10)
	boxes := []annotBox{
		{ID: "e1", X0: 2, Y0: 2, X1: 8, Y1: 6},
		{ID: "e2", X0: 12, Y0: 1, X1: 18, Y1: 8},
	}
	out, legend, err := annotatePNG(raw, boxes)
	if err != nil {
		t.Fatalf("annotate: %v", err)
	}
	if len(legend) != 2 || legend["e1"] == "" || legend["e2"] == "" {
		t.Fatalf("legend must name every drawn ref: %v", legend)
	}
	if legend["e1"] == legend["e2"] {
		t.Fatalf("refs must differ in color: %v", legend)
	}
	img := decodePNG(t, out)
	// Top-left corner of e1's box must wear the palette color.
	r, g, b, _ := img.At(2, 2).RGBA()
	if r == 0xffff && g == 0xffff && b == 0xffff {
		t.Fatal("box corner pixel still white: no box drawn")
	}
	// Interior far from borders stays white.
	r, g, b, _ = img.At(5, 4).RGBA()
	if r != 0xffff || g != 0xffff || b != 0xffff {
		t.Fatal("box fill leaked into the interior")
	}
	if _, _, err := annotatePNG([]byte("not a png"), boxes); err == nil {
		t.Fatal("corrupt PNG must fail annotation")
	}
}

// formProbe serves the Phase 4 gate page: a form with a text input, a
// select, a checkbox, and a submit guarded by a confirm dialog, plus
// a done page asserting the submit landed.
func formProbe() *httptest.Server {
	const form = `<!doctype html>
<html><head><title>Form Probe</title></head>
<body><h1>Signup</h1>
<form action="/done" method="GET" onsubmit="return confirm('submit this form?')">
<label>Name <input id="name" name="name" type="text"></label>
<label>Plan <select id="plan" name="plan">
<option value="free">Free</option><option value="pro">Pro</option>
</select></label>
<label><input id="agree" type="checkbox" name="agree" value="yes"> I agree</label>
<button id="go" type="submit">Sign up</button>
</form>
<script>console.log("form booted");</script>
</body></html>`
	const done = `<!doctype html>
<html><head><title>Done</title></head>
<body><h1>Welcome aboard</h1><p>signup complete</p></body></html>`
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/done" {
			_, _ = fmt.Fprint(w, done)
			return
		}
		_, _ = fmt.Fprint(w, form)
	})
	return httptest.NewServer(mux)
}

func chromeReady(t *testing.T) {
	t.Helper()
	bin, err := Locate()
	if err != nil {
		t.Skipf("no chrome: %v", err)
	}
	if _, err := CheckFloor(bin); err != nil {
		t.Skipf("below floor: %v", err)
	}
}

// TestLiveInteractFormLoop is the Phase 4 binding gate as a Go test:
// scripted form fill plus confirm-dialog dismiss plus
// screenshot-verify against a live page, with stale-ref recovery
// demonstrated against an expired gen. The page is local (httptest),
// so the loop needs Chrome but no outside network.
func TestLiveInteractFormLoop(t *testing.T) {
	if testing.Short() {
		t.Skip("short mode: live loop runs in full mode")
	}
	chromeReady(t)
	t.Setenv("TB_HOME", t.TempDir())
	srv := formProbe()
	defer srv.Close()

	b, err := Open(srv.URL, OpenOptions{Profile: "gate"})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer b.Close()

	snap, err := b.Snapshot()
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if len(snap.Refs) != 4 {
		t.Fatalf("want 4 refs (input, select, checkbox, button), got %+v", snap.Refs)
	}
	byRole := map[string]string{}
	for _, r := range snap.Refs {
		byRole[r.Role] = r.ID
	}
	for _, role := range []string{"textbox", "combobox", "checkbox", "button"} {
		if byRole[role] == "" {
			t.Fatalf("missing %s ref: %+v", role, snap.Refs)
		}
	}

	heldGen := snap.Gen
	if err := b.Fill(byRole["textbox"], heldGen, "Ada Lovelace", true, false); err != nil {
		t.Fatalf("fill: %v", err)
	}
	ok, actual, err := b.Verify(Condition{Kind: "value", Ref: byRole["textbox"], Value: "Ada Lovelace"})
	if err != nil || !ok {
		t.Fatalf("value assert: ok=%v actual=%q err=%v", ok, actual, err)
	}
	// Runners re-settle after every mutating act (RefreshURL plus a
	// fresh snapshot with a new gen); the engine leaves that explicit
	// so scripts and servers share the policy. Model it here: the
	// held gen goes stale by design from this point on.
	if _, err := b.Snapshot(); err != nil {
		t.Fatalf("resettle: %v", err)
	}
	if err := b.Select(byRole["combobox"], 0, "pro"); err != nil {
		t.Fatalf("select: %v", err)
	}
	if err := b.SetChecked(byRole["checkbox"], 0, true); err != nil {
		t.Fatalf("check: %v", err)
	}
	if n := len(b.Console(false)); n == 0 {
		t.Fatal("console tap missed the boot log")
	}
	shot, err := b.Screenshot("viewport", "", 0, filepath.Join(t.TempDir(), "form.png"), true, false)
	if err != nil {
		t.Fatalf("screenshot: %v", err)
	}
	if shot.Bytes == 0 || shot.Width == 0 {
		t.Fatalf("empty shot: %+v", shot)
	}
	// The fill re-settled the gen, so the held gen is stale by design:
	// the click must fail closed with a remap, never click blind.
	if err := b.Click(byRole["textbox"], heldGen); err == nil {
		t.Fatal("stale gen click must fail closed")
	} else if CodeOf(err) != "ref_stale" {
		t.Fatalf("stale click code = %q, want ref_stale (%v)", CodeOf(err), err)
	} else if se, ok := err.(*StaleError); !ok || se.Remap == nil {
		t.Fatalf("stale click must carry a remap: %v", err)
	}

	if err := b.Click(byRole["button"], 0); err != nil {
		t.Fatalf("submit click: %v", err)
	}
	if b.PendingDialog() == nil {
		t.Fatal("confirm dialog must be pending after submit")
	}
	if _, err := b.HandleDialog(true, ""); err != nil {
		t.Fatalf("dialog accept: %v", err)
	}
	actual, err = b.Wait(Condition{Kind: "title", Title: "Done"}, 8*time.Second)
	if err != nil {
		t.Fatalf("wait title: %v (%s)", err, actual)
	}
	ok, actual, err = b.Verify(Condition{Kind: "text", Text: "signup complete"})
	if err != nil || !ok {
		t.Fatalf("done assert: ok=%v actual=%q err=%v", ok, actual, err)
	}
	dir := t.TempDir()
	s1, err := b.Screenshot("viewport", "", 0, filepath.Join(dir, "done.png"), false, false)
	if err != nil {
		t.Fatalf("done shot: %v", err)
	}
	s2, err := b.Screenshot("viewport", "", 0, filepath.Join(dir, "done.png"), false, true)
	if err != nil {
		t.Fatalf("dedup shot: %v", err)
	}
	if !s2.Dedup || s2.SHA256 != s1.SHA256 {
		t.Fatalf("identical pixels must dedup: %+v vs %+v", s1, s2)
	}
	entries, _ := b.HAR()
	if len(entries) == 0 {
		t.Fatal("HAR captured no requests on a two-navigation loop")
	}
	_, n, err := b.PDF(filepath.Join(dir, "done.pdf"))
	if err != nil {
		t.Fatalf("pdf: %v", err)
	}
	if n == 0 {
		t.Fatal("empty pdf")
	}
	if _, err := os.Stat(filepath.Join(dir, "done.pdf")); err != nil {
		t.Fatalf("pdf missing: %v", err)
	}
}
