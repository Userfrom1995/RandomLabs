package diag

import (
	"flag"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// restore resets the shared flag/logger state after every test so the
// package-level channel behaves like a fresh process.
func restore(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		Reset()
		Close()
		_ = Apply(Options{}) // back to the default warn threshold
	})
	Reset()
	Close()
	_ = Apply(Options{})
}

func TestParseLevelMapping(t *testing.T) {
	cases := map[string]Level{
		"quiet": Error, "error": Error, "warn": Warn, "info": Info,
		"debug": Debug, "trace": Trace, " INFO ": Info, "Quiet": Error,
	}
	for in, want := range cases {
		got, err := ParseLevel(in)
		if err != nil || got != want {
			t.Fatalf("ParseLevel(%q) = %v, %v; want %v", in, got, err, want)
		}
	}
	if _, err := ParseLevel("loud"); err == nil {
		t.Fatalf("ParseLevel(loud) accepted, want error")
	}
}

func TestPrescanStopsAtFirstNonFlag(t *testing.T) {
	restore(t)
	// The bare form must never steal the app's own -v/-q flags.
	rest := Prescan([]string{"curl", "-v", "https://example.test"})
	if len(rest) != 3 || rest[0] != "curl" || rest[1] != "-v" {
		t.Fatalf("prescan ate the app's flags: %v", rest)
	}
	if Threshold() != Warn {
		t.Fatalf("app flags must not change the threshold: %v", Threshold())
	}
	// Position (a): before the command name.
	rest = Prescan([]string{"-vv", "status", "--json"})
	if len(rest) != 2 || rest[0] != "status" {
		t.Fatalf("prescan remainder = %v", rest)
	}
	if err := Apply(Options{}); err != nil {
		t.Fatal(err)
	}
	if Threshold() != Debug {
		t.Fatalf("-vv threshold = %v, want debug", Threshold())
	}
}

func TestStackingAndExplicitLevel(t *testing.T) {
	cases := []struct {
		argv []string
		want Level
	}{
		{[]string{"-v"}, Info},
		{[]string{"-vv"}, Debug},
		{[]string{"-vvv"}, Trace},
		{[]string{"-v", "-v"}, Debug},
		{[]string{"-q"}, Error},
		{[]string{"-v", "-q"}, Error},
		{[]string{"--log-level", "info"}, Info},
		{[]string{"-vv", "--log-level", "quiet"}, Error}, // explicit wins
		{[]string{"--log-level=trace"}, Trace},
	}
	for _, c := range cases {
		restore(t)
		rest := Prescan(c.argv)
		if len(rest) != 0 {
			t.Fatalf("Prescan(%v) leftover %v", c.argv, rest)
		}
		if err := Apply(Options{}); err != nil {
			t.Fatalf("Apply(%v): %v", c.argv, err)
		}
		if Threshold() != c.want {
			t.Fatalf("Prescan(%v) threshold = %v, want %v", c.argv, Threshold(), c.want)
		}
	}
	restore(t)
	if Prescan([]string{"--log-level", "loud"}) == nil {
		t.Fatalf("invalid --log-level must be left for the flag set to reject")
	}
}

func TestRegisterInsideFlagSet(t *testing.T) {
	restore(t)
	fs := flag.NewFlagSet("t", flag.ContinueOnError)
	json := fs.Bool("json", false, "")
	Register(fs)
	if err := fs.Parse([]string{"-v", "--json", "--log-level", "debug"}); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if !*json {
		t.Fatalf("own flags must keep working alongside globals")
	}
	if err := Apply(Options{JSON: true}); err != nil {
		t.Fatalf("Apply: %v", err)
	}
	// Explicit --log-level survives the JSON drop.
	if Threshold() != Debug {
		t.Fatalf("explicit level must beat the JSON drop: %v", Threshold())
	}
}

func TestJSONRunDropsToWarnUnlessConfigured(t *testing.T) {
	restore(t)
	fs := flag.NewFlagSet("t", flag.ContinueOnError)
	Register(fs)
	if err := fs.Parse([]string{"-v"}); err != nil {
		t.Fatal(err)
	}
	if err := Apply(Options{JSON: true}); err != nil {
		t.Fatal(err)
	}
	if Threshold() != Warn {
		t.Fatalf("--json run without explicit logging must drop to warn, got %v", Threshold())
	}
	// ...but an explicit --log-file keeps the configured level.
	restore(t)
	logPath := filepath.Join(t.TempDir(), "diag.log")
	fs2 := flag.NewFlagSet("t", flag.ContinueOnError)
	Register(fs2)
	if err := fs2.Parse([]string{"-v", "--log-file", logPath}); err != nil {
		t.Fatal(err)
	}
	if err := Apply(Options{JSON: true}); err != nil {
		t.Fatal(err)
	}
	if Threshold() != Info {
		t.Fatalf("--log-file is explicit configuration: threshold = %v, want info", Threshold())
	}
}

// grammar pins research 16.3: HH:MM:SS.mmm LEVEL stage: message
var lineRe = regexp.MustCompile(`^\d{2}:\d{2}:\d{2}\.\d{3} (ERROR|WARN|INFO|DEBUG|TRACE) [a-z]+: .+$`)

func TestLogLineGrammarAndThresholds(t *testing.T) {
	for _, c := range []struct {
		th    Level
		emit  Level
		found bool
	}{
		{Warn, Error, true},
		{Warn, Info, false},
		{Info, Info, true},
		{Debug, Debug, true},
		{Debug, Trace, false},
		{Trace, Trace, true},
		{Error, Error, true},
		{Error, Warn, false},
	} {
		restore(t)
		if err := Apply(Options{}); err != nil {
			t.Fatal(err)
		}
		SetThresholdForTest(t, c.th)
		var sb strings.Builder
		defLog.out = &sb
		Logf(c.emit, StageCLI, "hello %d", 7)
		got := sb.String()
		if c.found {
			line := strings.TrimSuffix(got, "\n")
			if !lineRe.MatchString(line) {
				t.Fatalf("grammar mismatch for %v/%v: %q", c.th, c.emit, line)
			}
			if !strings.HasSuffix(line, ": hello 7") {
				t.Fatalf("message rendering wrong: %q", line)
			}
			if strings.Count(got, "\n") != 1 {
				t.Fatalf("want exactly one line, got %q", got)
			}
		} else if got != "" {
			t.Fatalf("record %v must not render at threshold %v: %q", c.emit, c.th, got)
		}
	}
}

func TestVerdictLineBareAndGated(t *testing.T) {
	restore(t)
	var sb strings.Builder
	defLog.out = &sb
	// Below info: suppressed (the non-verbose path must stay quiet).
	Logf(Info, StageCLI, "prep")
	Verdictf("torshim: ready mode=%s elapsed=%.1fs", "per-app", 12.4)
	if sb.Len() != 0 {
		t.Fatalf("verdict leaked below info: %q", sb.String())
	}
	SetThresholdForTest(t, Info)
	Verdictf("torshim: ready mode=%s elapsed=%.1fs", "per-app", 12.4)
	line := strings.TrimSuffix(sb.String(), "\n")
	if !strings.HasPrefix(line, "torshim: ready mode=per-app") {
		t.Fatalf("verdict must be bare (no timestamp prefix): %q", line)
	}
	if strings.Contains(line, "INFO") {
		t.Fatalf("verdict must not carry the log prefix: %q", line)
	}
}

func TestLogFileTeeAndClose(t *testing.T) {
	restore(t)
	logPath := filepath.Join(t.TempDir(), "t.log")
	fs := flag.NewFlagSet("t", flag.ContinueOnError)
	Register(fs)
	if err := fs.Parse([]string{"-v", "--log-file", logPath}); err != nil {
		t.Fatal(err)
	}
	if err := Apply(Options{}); err != nil {
		t.Fatal(err)
	}
	Logf(Info, StageCLI, "tee me")
	Verdictf("torshim: ready mode=shell")
	Close()
	raw, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("log file: %v", err)
	}
	body := string(raw)
	if !lineRe.MatchString(strings.SplitN(body, "\n", 2)[0]) {
		t.Fatalf("tee file first line wrong grammar: %q", body)
	}
	if !strings.Contains(body, "torshim: ready mode=shell") {
		t.Fatalf("verdict line must tee to the file: %q", body)
	}
	fi, err := os.Stat(logPath)
	if err != nil || fi.Size() == 0 {
		t.Fatalf("tee file empty or missing: %v", err)
	}
}

func TestTorsocksLogLevelMapping(t *testing.T) {
	restore(t)
	if got := TorsocksLogLevel(); got != "" {
		t.Fatalf("default threshold must not force torsocks logging: %q", got)
	}
	fs := flag.NewFlagSet("t", flag.ContinueOnError)
	Register(fs)
	if err := fs.Parse([]string{"-vv"}); err != nil {
		t.Fatal(err)
	}
	if err := Apply(Options{}); err != nil {
		t.Fatal(err)
	}
	if got := TorsocksLogLevel(); got != "5" {
		t.Fatalf("-vv mapping = %q, want \"5\" (debug)", got)
	}
}

// SetThresholdForTest pokes the package logger directly (white-box).
func SetThresholdForTest(t *testing.T, th Level) {
	t.Helper()
	defLog.SetThreshold(th)
}

func TestRegisterStackedFlagsInsideFlagSet(t *testing.T) {
	restore(t)
	// Research 16.4 position (b): -vv/-vvv are legal inside a
	// subcommand's flag set, not only before the command name.
	fs := flag.NewFlagSet("t", flag.ContinueOnError)
	Register(fs)
	if err := fs.Parse([]string{"-vvv"}); err != nil {
		t.Fatalf("parse -vvv: %v", err)
	}
	if err := Apply(Options{}); err != nil {
		t.Fatal(err)
	}
	if Threshold() != Trace {
		t.Fatalf("-vvv inside flag set threshold = %v, want trace", Threshold())
	}
}
