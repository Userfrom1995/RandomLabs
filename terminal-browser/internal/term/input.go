package term

import (
	"strconv"
	"strings"
)

// Event is a decoded input unit: a key press or a mouse report.
type Event struct {
	Kind string // "key" or "mouse"

	// Key fields.
	Key     string // printable text, or Special when non-printable
	Special string // "up","down","left","right","enter","esc","tab","backspace","f1"..,"home","end","pgup","pgdn","delete","insert"
	Ctrl    bool
	Alt     bool
	Shift   bool

	// Mouse fields.
	MouseButton int  // 0 left, 1 middle, 2 right, 3 release, 64 wheel-up, 65 wheel-down
	MouseX      int  // 1-based column
	MouseY      int  // 1-based row
	MouseDown   bool // press (vs release)
}

// Decode parses a raw byte chunk into input events, accepting Kitty
// keyboard progressive-enhancement sequences plus legacy encodings and
// SGR mouse reports. Unknown bytes surface as literal key text.
func Decode(chunk []byte) []Event {
	var out []Event
	s := string(chunk)
	for len(s) > 0 {
		if strings.HasPrefix(s, "\x1b[<") {
			if ev, rest, ok := decodeSGRMouse(s); ok {
				out = append(out, ev)
				s = rest
				continue
			}
		}
		if strings.HasPrefix(s, "\x1b[") {
			if ev, rest, ok := decodeCSI(s); ok {
				out = append(out, ev)
				s = rest
				continue
			}
		}
		if strings.HasPrefix(s, "\x1bO") && len(s) >= 3 {
			if ev, ok := ss3Key(s[2]); ok {
				out = append(out, ev)
				s = s[3:]
				continue
			}
		}
		if s[0] == 0x1b {
			if len(s) == 1 {
				out = append(out, Event{Kind: "key", Key: "", Special: "esc"})
				s = ""
				continue
			}
			rest := Decode([]byte(s[1:2]))
			if len(rest) > 0 {
				rest[0].Alt = true
				out = append(out, rest[0])
			}
			s = s[2:]
			continue
		}
		if s[0] < 0x20 {
			out = append(out, ctrlKey(s[0]))
			s = s[1:]
			continue
		}
		// Printable rune (ASCII fast path; multibyte passes through).
		r := []rune(s[:1])
		if s[0] >= 0x80 {
			r = []rune(s)
			out = append(out, Event{Kind: "key", Key: string(r[:1])})
			s = strings.TrimPrefix(s, string(r[:1]))
			continue
		}
		out = append(out, Event{Kind: "key", Key: string(rune(s[0]))})
		s = s[1:]
	}
	return out
}

func ctrlKey(b byte) Event {
	ev := Event{Kind: "key", Ctrl: true}
	switch b {
	case '\r':
		ev.Ctrl = false
		ev.Special = "enter"
	case '\t':
		ev.Ctrl = false
		ev.Special = "tab"
	case 0x7f:
		ev.Ctrl = false
		ev.Special = "backspace"
	default:
		if b >= 1 && b <= 26 {
			ev.Key = string(rune('a' + b - 1))
		} else {
			ev.Key = ""
			ev.Special = "unknown"
			ev.Ctrl = false
		}
	}
	return ev
}

func ss3Key(b byte) (Event, bool) {
	m := map[byte]string{'P': "f1", 'Q': "f2", 'R': "f3", 'S': "f4"}
	if name, ok := m[b]; ok {
		return Event{Kind: "key", Special: name}, true
	}
	return Event{}, false
}

// decodeCSI handles "CSI ... final" with Kitty "u" progressive
// enhancement, legacy arrow/function tails, and "~" codes.
func decodeCSI(s string) (Event, string, bool) {
	i := 2
	for i < len(s) && (s[i] < '@' || s[i] > '~') {
		i++
	}
	if i >= len(s) {
		return Event{}, s, false
	}
	body, final := s[2:i], s[i]
	rest := s[i+1:]
	if final == 'u' {
		// Kitty keyboard: unicode ; modifiers u
		parts := strings.Split(body, ";")
		code, _ := strconv.Atoi(parts[0])
		mods := 1
		if len(parts) > 1 {
			mods, _ = strconv.Atoi(parts[len(parts)-1])
			if strings.Contains(parts[len(parts)-1], ":") {
				mods, _ = strconv.Atoi(strings.Split(parts[len(parts)-1], ":")[0])
			}
		}
		ev := Event{Kind: "key"}
		mods--
		ev.Shift = mods&1 != 0
		ev.Alt = mods&2 != 0
		ev.Ctrl = mods&4 != 0
		switch code {
		case 13:
			ev.Special = "enter"
		case 9:
			ev.Special = "tab"
		case 127:
			ev.Special = "backspace"
		case 27:
			ev.Special = "esc"
		default:
			if code >= 32 {
				ev.Key = string(rune(code))
			} else if code >= 1 && code <= 26 {
				ev.Key = string(rune('a' + code - 1))
				ev.Ctrl = true
			} else {
				ev.Special = "unknown"
			}
		}
		return ev, rest, true
	}
	if fin, ok := csiLetter(body, final); ok {
		return fin, rest, true
	}
	return Event{}, s, false
}

func csiLetter(body string, final byte) (Event, bool) {
	mods := Event{Kind: "key"}
	if parts := strings.Split(body, ";"); len(parts) > 1 {
		if m, err := strconv.Atoi(parts[1]); err == nil {
			m--
			mods.Shift = m&1 != 0
			mods.Alt = m&2 != 0
			mods.Ctrl = m&4 != 0
		}
		body = parts[0]
	}
	set := func(name string) (Event, bool) { mods.Special = name; return mods, true }
	switch final {
	case 'A':
		return set("up")
	case 'B':
		return set("down")
	case 'C':
		return set("right")
	case 'D':
		return set("left")
	case 'H':
		return set("home")
	case 'F':
		return set("end")
	case 'Z':
		mods.Shift = true
		return set("tab")
	}
	if final != '~' {
		return Event{}, false
	}
	switch body {
	case "1", "7":
		return set("home")
	case "2":
		return set("insert")
	case "3":
		return set("delete")
	case "4", "8":
		return set("end")
	case "5":
		return set("pgup")
	case "6":
		return set("pgdn")
	case "11":
		return set("f1")
	case "12":
		return set("f2")
	case "13":
		return set("f3")
	case "14":
		return set("f4")
	}
	return Event{}, false
}

// decodeSGRMouse parses "CSI < Pb ; Px ; Py M/m".
func decodeSGRMouse(s string) (Event, string, bool) {
	i := 3
	for i < len(s) && s[i] != 'M' && s[i] != 'm' {
		i++
	}
	if i >= len(s) {
		return Event{}, s, false
	}
	press := s[i] == 'M'
	parts := strings.Split(s[3:i], ";")
	if len(parts) != 3 {
		return Event{}, s, false
	}
	b, errB := strconv.Atoi(parts[0])
	x, errX := strconv.Atoi(parts[1])
	y, errY := strconv.Atoi(parts[2])
	if errB != nil || errX != nil || errY != nil {
		return Event{}, s, false
	}
	return Event{
		Kind:        "mouse",
		MouseButton: b,
		MouseX:      x,
		MouseY:      y,
		MouseDown:   press,
	}, s[i+1:], true
}

// MouseEnable returns the sequence enabling SGR mouse reporting.
func MouseEnable() string { return "\x1b[?1000h\x1b[?1006h" }

// MouseDisable returns the sequence disabling mouse reporting.
func MouseDisable() string { return "\x1b[?1006l\x1b[?1000l" }
