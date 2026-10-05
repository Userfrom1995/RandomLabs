package tui

import (
	"testing"
)

// Session tests run with an isolated TB_HOME so fixture visits never
// touch the developer's real profile.
func TestShellSessionBackForwardReload(t *testing.T) {
	t.Setenv("TB_HOME", t.TempDir())
	s := NewShell()
	if !s.Record {
		t.Fatal("interactive shells must record by default")
	}
	s.Open("fixture://article")
	s.Open("fixture://table")
	if got := s.Current().Address; got != "fixture://table" {
		t.Fatalf("open: %q", got)
	}
	s.Back()
	if got := s.Current().Address; got != "fixture://article" {
		t.Fatalf("back: %q (msg %q)", got, s.Message)
	}
	s.Forward()
	if got := s.Current().Address; got != "fixture://table" {
		t.Fatalf("forward: %q", got)
	}
	s.Reload()
	if got := s.Current().Address; got != "fixture://table" {
		t.Fatalf("reload moved: %q", got)
	}
	s.Back()
	s.Back()
	if got := s.Current().Address; got != "fixture://article" {
		t.Fatalf("back at oldest moved: %q", got)
	}
}

func TestShellOffscreenRenderSkipsRecord(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("TB_HOME", dir)
	s := NewShell()
	s.Record = false
	s.Open("fixture://article")
	s2 := NewShell()
	s2.RestoreSession()
	if got := s2.Current().Address; got != "fixture://home" {
		t.Fatalf("unrecorded open leaked into restore: %q", got)
	}
}

func TestShellRestoreSession(t *testing.T) {
	t.Setenv("TB_HOME", t.TempDir())
	s := NewShell()
	s.Open("fixture://article")
	fresh := NewShell()
	fresh.RestoreSession()
	if got := fresh.Current().Address; got != "fixture://article" {
		t.Fatalf("restore: %q (msg %q)", got, fresh.Message)
	}
}

func TestShellCycleProfile(t *testing.T) {
	t.Setenv("TB_HOME", t.TempDir())
	s := NewShell()
	first := s.Profile
	s.CycleProfile()
	if s.Profile == first && len(s.Profiles) > 1 {
		t.Fatal("profile did not cycle")
	}
}
