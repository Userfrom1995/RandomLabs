package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func runCLI(t *testing.T, args ...string) (stdoutStr, stderrStr string, code int) {
	t.Helper()
	oldArgs := os.Args
	oldStdout, oldStderr := stdout, stderr
	defer func() {
		os.Args = oldArgs
		stdout, stderr = oldStdout, oldStderr
	}()

	var outBuf, errBuf bytes.Buffer
	os.Args = append([]string{"granite"}, args...)
	stdout = &outBuf
	stderr = &errBuf

	origExit := exit
	defer func() { exit = origExit }()
	exited := false
	exit = func(c int) {
		exited = true
		code = c
		stdoutStr, stderrStr = outBuf.String(), errBuf.String()
		panic(exitSentinel{})
	}
	defer func() {
		if r := recover(); r != nil {
			if _, ok := r.(exitSentinel); !ok {
				panic(r)
			}
		}
	}()

	main()
	if !exited {
		code = 0
	}
	return outBuf.String(), errBuf.String(), code
}

// exitSentinel unwinds main() when the CLI terminates, letting the test
// capture the exit code instead of killing the test process.
type exitSentinel struct{}

func TestCLIInitExecSelect(t *testing.T) {
	db := filepath.Join(t.TempDir(), "c.db")
	out, _, code := runCLI(t, "init", db)
	if code != 0 {
		t.Fatalf("init exit = %d\n%s", code, out)
	}
	out, _, code = runCLI(t, "exec", db,
		"CREATE TABLE t (id INTEGER, name TEXT);",
		"INSERT INTO t VALUES (1, 'one'), (2, 'two');",
	)
	if code != 0 {
		t.Fatalf("exec exit = %d\n%s", code, out)
	}
	out, _, code = runCLI(t, "exec", db, "SELECT name FROM t ORDER BY id;")
	if code != 0 {
		t.Fatalf("select exit = %d", code)
	}
	if !strings.Contains(out, "one") || !strings.Contains(out, "two") {
		t.Fatalf("select output missing rows:\n%s", out)
	}
	if !strings.Contains(out, "2 row(s)") {
		t.Fatalf("select output missing row count:\n%s", out)
	}
}

func TestCLIExecFromFile(t *testing.T) {
	dir := t.TempDir()
	db := filepath.Join(dir, "f.db")
	if _, _, code := runCLI(t, "init", db); code != 0 {
		t.Fatal("init failed")
	}
	script := filepath.Join(dir, "script.sql")
	if err := os.WriteFile(script, []byte("CREATE TABLE t (v INTEGER);\nINSERT INTO t VALUES (5);\nSELECT v FROM t;"), 0o644); err != nil {
		t.Fatal(err)
	}
	out, _, code := runCLI(t, "exec", db, "-f", script)
	if code != 0 {
		t.Fatalf("exec -f exit = %d\n%s", code, out)
	}
	if !strings.Contains(out, "5") {
		t.Fatalf("expected value 5 in output:\n%s", out)
	}
}

func TestCLIExplain(t *testing.T) {
	db := filepath.Join(t.TempDir(), "x.db")
	runCLI(t, "init", db)
	runCLI(t, "exec", db, "CREATE TABLE t (v INTEGER);")
	out, _, code := runCLI(t, "explain", db, "SELECT v FROM t;")
	if code != 0 {
		t.Fatalf("explain exit = %d", code)
	}
	if !strings.Contains(out, "SCAN t") || !strings.Contains(out, "PROJECT v") {
		t.Fatalf("explain output:\n%s", out)
	}
}

func TestCLIInfo(t *testing.T) {
	db := filepath.Join(t.TempDir(), "i.db")
	runCLI(t, "init", db)
	runCLI(t, "exec", db, "CREATE TABLE t (id INTEGER, name TEXT);", "INSERT INTO t VALUES (1, 'a');")
	out, _, code := runCLI(t, "info", db)
	if code != 0 {
		t.Fatalf("info exit = %d", code)
	}
	if !strings.Contains(out, "t (id INTEGER, name TEXT), 1 row(s)") {
		t.Fatalf("info output:\n%s", out)
	}
}

func TestCLIErrors(t *testing.T) {
	db := filepath.Join(t.TempDir(), "e.db")
	// Exec on a missing database errors.
	_, errOut, code := runCLI(t, "exec", db, "SELECT 1 FROM t;")
	if code == 0 {
		t.Fatalf("exec on missing db should fail")
	}
	if !strings.Contains(errOut, "granite:") {
		t.Fatalf("error output: %q", errOut)
	}
	// No args prints usage and fails.
	_, _, code = runCLI(t)
	if code != 2 {
		t.Fatalf("no args exit = %d, want 2", code)
	}
	// Unknown subcommand fails.
	_, _, code = runCLI(t, "frobnicate")
	if code != 2 {
		t.Fatalf("unknown subcommand exit = %d, want 2", code)
	}
	// Bad SQL errors at runtime.
	runCLI(t, "init", db)
	_, _, code = runCLI(t, "exec", db, "SELECT nope FROM missing;")
	if code != 1 {
		t.Fatalf("bad sql exit = %d, want 1", code)
	}
}

func TestCLIDemo(t *testing.T) {
	db := filepath.Join(t.TempDir(), "d.db")
	out, _, code := runCLI(t, "demo", db)
	if code != 0 {
		t.Fatalf("demo exit = %d\n%s", code, out)
	}
	for _, want := range []string{"Ada Lovelace", "Alan Turing", "Final inventory", "Demo complete"} {
		if !strings.Contains(out, want) {
			t.Fatalf("demo output missing %q:\n%s", want, out)
		}
	}
	// The demo database should be inspectable afterward.
	out, _, code = runCLI(t, "info", db)
	if code != 0 || !strings.Contains(out, "books") {
		t.Fatalf("demo db info failed:\n%s", out)
	}
}

func TestCLIPersistenceAcrossReopen(t *testing.T) {
	db := filepath.Join(t.TempDir(), "p.db")
	runCLI(t, "init", db)
	runCLI(t, "exec", db, "CREATE TABLE t (v INTEGER);", "INSERT INTO t VALUES (7);")
	// A fresh process-equivalent run sees the data.
	out, _, code := runCLI(t, "exec", db, "SELECT v FROM t;")
	if code != 0 || !strings.Contains(out, "7") {
		t.Fatalf("persisted select failed:\n%s", out)
	}
}

func TestCLIVersion(t *testing.T) {
	out, _, code := runCLI(t, "version")
	if code != 0 || !strings.Contains(out, "granite") {
		t.Fatalf("version output: %q", out)
	}
}

func TestCLIHelp(t *testing.T) {
	out, _, code := runCLI(t, "help")
	if code != 0 || !strings.Contains(out, "Usage:") {
		t.Fatalf("help output: %q", out)
	}
}