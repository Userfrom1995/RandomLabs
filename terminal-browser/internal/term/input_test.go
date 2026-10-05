package term

import "testing"

func TestDecodeArrows(t *testing.T) {
	evs := Decode([]byte("\x1b[A\x1b[B\x1b[C\x1b[D"))
	want := []string{"up", "down", "right", "left"}
	if len(evs) != 4 {
		t.Fatalf("expected 4 events, got %d", len(evs))
	}
	for i, w := range want {
		if evs[i].Special != w {
			t.Fatalf("event %d: expected %s, got %+v", i, w, evs[i])
		}
	}
}

func TestDecodeKittyKeyboard(t *testing.T) {
	evs := Decode([]byte("\x1b[97;5u"))
	if len(evs) != 1 {
		t.Fatalf("expected 1 event, got %d", len(evs))
	}
	ev := evs[0]
	if ev.Key != "a" || !ev.Ctrl {
		t.Fatalf("expected ctrl+a, got %+v", ev)
	}
}

func TestDecodeSGRMouse(t *testing.T) {
	evs := Decode([]byte("\x1b[<0;40;12M"))
	if len(evs) != 1 {
		t.Fatalf("expected 1 event, got %d", len(evs))
	}
	ev := evs[0]
	if ev.Kind != "mouse" || ev.MouseX != 40 || ev.MouseY != 12 || !ev.MouseDown {
		t.Fatalf("bad mouse decode: %+v", ev)
	}
	rel := Decode([]byte("\x1b[<3;1;1m"))
	if len(rel) != 1 || rel[0].MouseDown {
		t.Fatalf("release must set MouseDown=false: %+v", rel)
	}
}

func TestDecodeCtrlQuit(t *testing.T) {
	evs := Decode([]byte{0x11})
	if len(evs) != 1 || evs[0].Key != "q" || !evs[0].Ctrl {
		t.Fatalf("expected ctrl+q, got %+v", evs)
	}
}

func TestDecodeTildeCodes(t *testing.T) {
	evs := Decode([]byte("\x1b[5~\x1b[3~"))
	if len(evs) != 2 || evs[0].Special != "pgup" || evs[1].Special != "delete" {
		t.Fatalf("bad tilde decode: %+v", evs)
	}
}
