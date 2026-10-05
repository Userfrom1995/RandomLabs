package main

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// TestInvalidProfileFailClosed is the hermetic gate for the --profile
// CLI contract: an invalid name must exit 1 with code bad_profile and
// must leave the default profile untouched (no silent cross-profile
// read or write).
func TestInvalidProfileFailClosed(t *testing.T) {
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go toolchain absent")
	}
	tbHome := t.TempDir()
	bin := filepath.Join(t.TempDir(), "tb-agent")
	build := exec.Command("go", "build", "-o", bin, ".")
	build.Dir = "."
	build.Env = os.Environ()
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build tb-agent: %v\n%s", err, out)
	}
	// Seed the default profile so the test can prove it stays intact.
	seed := exec.Command(bin, "cookies-set", "--profile", "default",
		"--name", "sid", "--value", "keep", "--domain", "example.com")
	seed.Env = append(os.Environ(), "TB_HOME="+tbHome)
	if out, err := seed.CombinedOutput(); err != nil {
		t.Fatalf("seed default jar: %v\n%s", err, out)
	}
	for _, args := range [][]string{
		{"cookies", "--profile", "../escape"},
		{"history", "--profile", "../escape"},
		{"bookmarks", "--profile", "../escape"},
		{"session", "--profile", "../escape"},
		{"session-back", "--profile", "../escape"},
		{"cookies-clear", "--profile", "../escape"},
	} {
		cmd := exec.Command(bin, args...)
		cmd.Env = append(os.Environ(), "TB_HOME="+tbHome)
		out, err := cmd.CombinedOutput()
		if err == nil {
			t.Fatalf("%v: expected non-zero exit, got 0\n%s", args, out)
		}
		if exit, ok := err.(*exec.ExitError); ok && exit.ExitCode() != 1 {
			t.Fatalf("%v: exit %d, want 1\n%s", args, exit.ExitCode(), out)
		}
		var env struct {
			Success bool   `json:"success"`
			Code    string `json:"code"`
		}
		dec := json.NewDecoder(strings.NewReader(strings.TrimSpace(string(out))))
		// The binary emits exactly one envelope line on stdout; the
		// combined output may carry no stderr text on this path.
		if derr := dec.Decode(&env); derr != nil {
			t.Fatalf("%v: decode envelope: %v\n%s", args, derr, out)
		}
		if env.Success {
			t.Fatalf("%v: success=true on invalid profile\n%s", args, out)
		}
		if env.Code != "bad_profile" {
			t.Fatalf("%v: code %q, want bad_profile\n%s", args, env.Code, out)
		}
	}
	// The default jar must still hold exactly the seeded cookie.
	check := exec.Command(bin, "cookies", "--profile", "default")
	check.Env = append(os.Environ(), "TB_HOME="+tbHome)
	out, err := check.Output()
	if err != nil {
		t.Fatalf("read default jar: %v\n%s", err, out)
	}
	var got struct {
		Success bool `json:"success"`
		Data    struct {
			Count int `json:"count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(out, &got); err != nil {
		t.Fatalf("decode default jar: %v\n%s", err, out)
	}
	if !got.Success || got.Data.Count != 1 {
		t.Fatalf("default profile touched: %+v\n%s", got, out)
	}
}
