package demo

import "testing"

func TestLookupAll(t *testing.T) {
	for _, addr := range []string{"fixture://home", "fixture://article", "fixture://table"} {
		p := Lookup(addr)
		if p.Address != addr || len(p.Rows) == 0 {
			t.Fatalf("bad page for %s: %+v", addr, p)
		}
	}
}

func TestLookupBare(t *testing.T) {
	p := Lookup("article")
	if p.Address != "fixture://article" {
		t.Fatalf("bare name should route, got %s", p.Address)
	}
}

func TestNotFoundHonest(t *testing.T) {
	p := Lookup("fixture://nope")
	if p.Name != "not-found" {
		t.Fatalf("unknown address must yield the error page, got %s", p.Name)
	}
}
