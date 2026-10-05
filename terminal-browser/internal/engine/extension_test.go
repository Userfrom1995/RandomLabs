package engine

import (
	"os"
	"path/filepath"
	"testing"
)

// writeExt stages one extension directory under root for validation
// tests: manifest text plus any script files it references.
func writeExt(t *testing.T, root, manifest string, scripts map[string]string) string {
	t.Helper()
	dir := filepath.Join(root, "staged")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(manifest), 0o600); err != nil {
		t.Fatal(err)
	}
	for name, body := range scripts {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

const validManifest = `{"id":"reader","name":"Reader","version":"1.0.0",` +
	`"matches":["*"],"scripts":["reader.js"],` +
	`"actions":[{"id":"summarize","title":"Summarize page"}]}`

// A valid manifest loads with Run defaulted to the action id.
func TestLoadManifestValid(t *testing.T) {
	root := t.TempDir()
	dir := writeExt(t, root, validManifest, map[string]string{
		"reader.js": `window.__tbActions={summarize:function(){return 1}}`,
	})
	m, err := LoadManifest(dir)
	if err != nil {
		t.Fatalf("load manifest: %v", err)
	}
	if m.ID != "reader" || len(m.Actions) != 1 {
		t.Fatalf("manifest = %+v", m)
	}
	if m.Actions[0].Run != "summarize" {
		t.Fatalf("run default = %q, want summarize", m.Actions[0].Run)
	}
}

// Unknown fields fail closed so manifest typos never ship silently.
func TestLoadManifestStrictFields(t *testing.T) {
	root := t.TempDir()
	dir := writeExt(t, root,
		`{"id":"reader","name":"R","version":"1","scripts":["a.js"],`+
			`"actions":[{"id":"go","title":"Go"}],"scriptz":[]}`,
		map[string]string{"a.js": `1`})
	if _, err := LoadManifest(dir); err == nil {
		t.Fatal("unknown manifest field must fail closed")
	}
}

func TestLoadManifestRejects(t *testing.T) {
	cases := []struct {
		name     string
		manifest string
		scripts  map[string]string
	}{
		{"bad id", `{"id":"../x","name":"R","version":"1","scripts":["a.js"],"actions":[{"id":"go","title":"Go"}]}`, map[string]string{"a.js": `1`}},
		{"empty name", `{"id":"reader","name":"","version":"1","scripts":["a.js"],"actions":[{"id":"go","title":"Go"}]}`, map[string]string{"a.js": `1`}},
		{"no scripts", `{"id":"reader","name":"R","version":"1","actions":[{"id":"go","title":"Go"}]}`, nil},
		{"traversal script", `{"id":"reader","name":"R","version":"1","scripts":["../a.js"],"actions":[{"id":"go","title":"Go"}]}`, nil},
		{"abs script", `{"id":"reader","name":"R","version":"1","scripts":["/tmp/a.js"],"actions":[{"id":"go","title":"Go"}]}`, nil},
		{"missing script", `{"id":"reader","name":"R","version":"1","scripts":["gone.js"],"actions":[{"id":"go","title":"Go"}]}`, nil},
		{"no actions", `{"id":"reader","name":"R","version":"1","scripts":["a.js"]}`, map[string]string{"a.js": `1`}},
		{"dup action", `{"id":"reader","name":"R","version":"1","scripts":["a.js"],"actions":[{"id":"go","title":"A"},{"id":"go","title":"B"}]}`, map[string]string{"a.js": `1`}},
		{"bad action id", `{"id":"reader","name":"R","version":"1","scripts":["a.js"],"actions":[{"id":"GO!","title":"Go"}]}`, map[string]string{"a.js": `1`}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			root := t.TempDir()
			dir := writeExt(t, root, c.manifest, c.scripts)
			if _, err := LoadManifest(dir); err == nil {
				t.Fatalf("manifest must fail: %s", c.manifest)
			}
		})
	}
}

// The shipped sample extension is itself a valid manifest: the docs
// example and the validation gate can never drift apart.
func TestExampleManifestValid(t *testing.T) {
	m, err := LoadManifest(filepath.Join("..", "..", "examples", "minimal-reader"))
	if err != nil {
		t.Fatalf("example manifest: %v", err)
	}
	if len(m.Actions) == 0 || len(m.Scripts) == 0 {
		t.Fatalf("example manifest holds no actions or scripts: %+v", m)
	}
}

func TestMatchesURL(t *testing.T) {
	if !MatchesURL([]string{"*"}, "https://example.com/") {
		t.Fatal("star must match everything")
	}
	if !MatchesURL([]string{"example.com/form"}, "https://EXAMPLE.com/form?q=1") {
		t.Fatal("substring match must be case-insensitive")
	}
	if MatchesURL([]string{"other.org"}, "https://example.com/") {
		t.Fatal("non-matching pattern must not match")
	}
	if MatchesURL(nil, "https://example.com/") {
		t.Fatal("empty patterns must match nothing")
	}
}

func TestValidArgsJSON(t *testing.T) {
	if s, err := validArgsJSON(nil); err != nil || s != "{}" {
		t.Fatalf("nil args = %q, %v", s, err)
	}
	if s, err := validArgsJSON("  "); err != nil || s != "{}" {
		t.Fatalf("blank args = %q, %v", s, err)
	}
	if s, err := validArgsJSON(`{"a":1}`); err != nil || s != `{"a":1}` {
		t.Fatalf("string args = %q, %v", s, err)
	}
	if _, err := validArgsJSON(`{"a":`); err == nil {
		t.Fatal("broken JSON args must fail closed")
	}
	s, err := validArgsJSON(map[string]interface{}{"a": float64(1)})
	if err != nil || s != `{"a":1}` {
		t.Fatalf("map args = %q, %v", s, err)
	}
}

// An empty extensions root lists nothing with no warnings and no
// error: no extensions installed is a normal state.
func TestListExtensionsEmpty(t *testing.T) {
	t.Setenv("TB_HOME", t.TempDir())
	list, warns := ListExtensions()
	if len(list) != 0 || len(warns) != 0 {
		t.Fatalf("empty root = %d extensions, %d warnings", len(list), len(warns))
	}
}

// One valid plus one broken install: the valid one loads, the broken
// one warns, and the set never fails as a whole.
func TestListExtensionsMixed(t *testing.T) {
	home := t.TempDir()
	t.Setenv("TB_HOME", home)
	root := filepath.Join(home, ".terminal-browser", "extensions")
	good := filepath.Join(root, "good")
	if err := os.MkdirAll(good, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(good, "manifest.json"), []byte(validManifest), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(good, "reader.js"), []byte(`1`), 0o600); err != nil {
		t.Fatal(err)
	}
	bad := filepath.Join(root, "bad")
	if err := os.MkdirAll(bad, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bad, "manifest.json"), []byte(`{"id":"nope"}`), 0o600); err != nil {
		t.Fatal(err)
	}
	list, warns := ListExtensions()
	if len(list) != 1 || list[0].ID != "reader" {
		t.Fatalf("list = %+v", list)
	}
	if len(warns) != 1 {
		t.Fatalf("warnings = %v", warns)
	}
}
