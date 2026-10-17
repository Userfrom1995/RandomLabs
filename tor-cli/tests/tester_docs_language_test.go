package tests

// Tester docs-language guard (issue #596 sweep): the shipped tor-cli
// documentation must stay free of internal milestone codes, milestone
// counters, and em/en dashes so it keeps one unified product voice.
//
// Prose surfaces (README plus docs markdown) get the full check; the site
// shell gets the milestone and dash checks, since inline SVG path data in
// index.html legitimately contains M-digit pairs like "M16".

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var (
	docBareCode     = regexp.MustCompile(`\bM[0-9]\b`)
	docMilestone    = regexp.MustCompile(`[Mm]ilestone`)
	docPhaseCounter = regexp.MustCompile(`\b[Pp]hase\s+[0-9]`)
	docEmEnDash     = regexp.MustCompile(`[\x{2013}\x{2014}]`)
)

// docSurfaces returns the prose files (full sweep) and the shell files
// (milestone/dash sweep only), relative to the tests package directory.
func docSurfaces(t *testing.T) (prose, shell []string) {
	t.Helper()
	prose = []string{filepath.Join("..", "README.md")}
	entries, err := os.ReadDir(filepath.Join("..", "docs"))
	if err != nil {
		t.Fatalf("read docs dir: %v", err)
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".md") {
			prose = append(prose, filepath.Join("..", "docs", e.Name()))
		}
	}
	shell = []string{filepath.Join("..", "index.html")}
	return prose, shell
}

func scanDocs(t *testing.T, files []string, re *regexp.Regexp) []string {
	t.Helper()
	var hits []string
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		for i, line := range strings.Split(string(data), "\n") {
			if re.MatchString(line) {
				hits = append(hits, fmt.Sprintf("%s:%d: %s", file, i+1, strings.TrimSpace(line)))
			}
		}
	}
	return hits
}

func TestPublicDocsCarryNoMilestoneLanguage(t *testing.T) {
	prose, shell := docSurfaces(t)
	all := append(append([]string{}, prose...), shell...)
	checks := []struct {
		name  string
		files []string
		re    *regexp.Regexp
	}{
		{"bare milestone code", prose, docBareCode},
		{"milestone wording", all, docMilestone},
		{"phase counter", all, docPhaseCounter},
		{"em/en dash", all, docEmEnDash},
	}
	for _, c := range checks {
		if hits := scanDocs(t, c.files, c.re); len(hits) > 0 {
			t.Errorf("%s back in public docs:\n%s", c.name, strings.Join(hits, "\n"))
		}
	}
}
