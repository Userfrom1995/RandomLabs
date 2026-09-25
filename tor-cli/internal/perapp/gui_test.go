package perapp

import (
	"strings"
	"testing"
)

func TestGUIBasenameTable(t *testing.T) {
	gui := []string{
		"firefox", "/usr/bin/firefox", "/usr/lib/firefox/firefox-bin",
		"firefox-esr", "falkon", "/usr/bin/falkon",
		"chromium", "chromium-browser", "google-chrome",
		"google-chrome-stable", "chrome",
		"/opt/google/chrome/chrome",
		"FIREFOX", "Falkon",
	}
	for _, bin := range gui {
		if !IsGUIApp(bin) {
			t.Errorf("IsGUIApp(%q) = false, want true", bin)
		}
	}
	cli := []string{"curl", "/usr/bin/curl", "ssh", "python3", "/bin/ls", "tor", "firefox-helper-tool", "mychromebook"}
	for _, bin := range cli {
		if IsGUIApp(bin) {
			t.Errorf("IsGUIApp(%q) = true, want false", bin)
		}
	}
}

func TestHeadlessBypass(t *testing.T) {
	headless := [][]string{
		{"/usr/bin/firefox", "--headless", "--screenshot", "https://example.com/"},
		{"/usr/bin/firefox", "--headless=new", "https://example.com/"},
		{"/usr/bin/falkon", "-headless"},
		{"/usr/bin/chromium", "--dump-dom", "https://example.com/"},
		{"/usr/bin/chromium", "--screenshot=/tmp/x.png"},
		{"/usr/bin/chromium", "--print-to-pdf=/tmp/x.pdf"},
		{"/usr/bin/chromium", "--dump-dom=/tmp/x.html"},
	}
	for _, argv := range headless {
		if !LooksHeadless(argv) {
			t.Errorf("LooksHeadless(%q) = false, want true", argv)
		}
		if ClassifyLaunch(argv[0], argv) != ClassCLI {
			t.Errorf("ClassifyLaunch(%q) = GUI, want CLI (headless bypass)", argv)
		}
	}
	interactive := [][]string{
		{"/usr/bin/firefox"},
		{"/usr/bin/falkon", "https://example.com/"},
		{"/usr/bin/chromium", "--new-window"},
	}
	for _, argv := range interactive {
		if LooksHeadless(argv) {
			t.Errorf("LooksHeadless(%q) = true, want false", argv)
		}
		if ClassifyLaunch(argv[0], argv) != ClassGUI {
			t.Errorf("ClassifyLaunch(%q) = CLI, want GUI", argv)
		}
	}
	if ClassifyLaunch("/usr/bin/curl", []string{"/usr/bin/curl", "https://example.com/"}) != ClassCLI {
		t.Error("plain CLI tool must classify as CLI")
	}
}

func TestGUIAppNameMatch(t *testing.T) {
	name, ok := GUIAppName("/usr/bin/firefox")
	if !ok || name != "firefox" {
		t.Fatalf("GUIAppName = %q,%v, want firefox,true", name, ok)
	}
	if _, ok := GUIAppName("/usr/bin/curl"); ok {
		t.Fatal("curl must not match the GUI tier")
	}
}

func TestCoverageNoteMentionsGUIBoundary(t *testing.T) {
	// The proxy coverage note is the contract GUI ack builds on; it
	// must keep naming the leak classes explicitly.
	n := CoverageNote()
	for _, want := range []string{"only apps that honor", "UDP/ICMP"} {
		if !strings.Contains(n, want) {
			t.Fatalf("coverage note lost %q: %q", want, n)
		}
	}
}
