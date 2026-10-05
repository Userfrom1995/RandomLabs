// Package term: capability probing.
//
// Probe strategy: environment heuristics first (TERM, TERM_PROGRAM,
// COLORTERM, TMUX/STY for multiplexers), then live device queries when a
// real TTY is present: primary DA for Sixel, the Kitty graphics query, the
// iTerm2 capabilities report, DECRQM for synchronized output, and the Kitty
// keyboard query. Answers win over heuristics; silence keeps heuristics.
// TB_TIER overrides everything for demos and tests.
package term

import (
	"os"
	"strings"
	"sync"
	"time"
)

// GraphicsTier is the selected image paint path, best first.
type GraphicsTier int

const (
	// TierBlock paints images as half-block truecolor diffs. Always works.
	TierBlock GraphicsTier = iota
	// TierSixel paints quantized Sixel regions.
	TierSixel
	// TierIterm2 paints PNG stills through OSC 1337.
	TierIterm2
	// TierKitty composes transmitted images with id reuse and deltas.
	TierKitty
)

// String names the tier for logs, JSON envelopes, and docs.
func (t GraphicsTier) String() string {
	switch t {
	case TierKitty:
		return "kitty"
	case TierSixel:
		return "sixel"
	case TierIterm2:
		return "iterm2"
	default:
		return "block"
	}
}

// ParseTier maps a user flag to a tier.
func ParseTier(s string) (GraphicsTier, bool) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "kitty":
		return TierKitty, true
	case "sixel":
		return TierSixel, true
	case "iterm2":
		return TierIterm2, true
	case "block":
		return TierBlock, true
	}
	return TierBlock, false
}

// Capabilities describes what the attached terminal can do.
type Capabilities struct {
	Width  int `json:"width"`
	Height int `json:"height"`

	KittyGraphics bool `json:"kitty_graphics"`
	Sixel         bool `json:"sixel"`
	Iterm2        bool `json:"iterm2"`
	SyncOutput    bool `json:"sync_output"`
	KittyKeyboard bool `json:"kitty_keyboard"`
	MouseSGR      bool `json:"mouse_sgr"`
	TrueColor     bool `json:"truecolor"`

	// ForcedBlock is set inside tmux/screen, where graphics pass-through
	// is unreliable, so every surface degrades to the block path.
	ForcedBlock bool         `json:"forced_block"`
	Tier        GraphicsTier `json:"-"`
	TierName    string       `json:"tier"`
	ProbedLive  bool         `json:"probed_live"`
}

// TierOrder returns the paint preference list for these capabilities.
func (c Capabilities) TierOrder() []GraphicsTier {
	if c.ForcedBlock {
		return []GraphicsTier{TierBlock}
	}
	switch c.Tier {
	case TierKitty:
		return []GraphicsTier{TierKitty, TierSixel, TierIterm2, TierBlock}
	case TierSixel:
		return []GraphicsTier{TierSixel, TierIterm2, TierBlock}
	case TierIterm2:
		return []GraphicsTier{TierIterm2, TierBlock}
	default:
		return []GraphicsTier{TierBlock}
	}
}

// queryRoundTrip holds the escape sequences written to probe the terminal.
var queryRoundTrip = struct {
	da       string
	kitty    string
	iterm2   string
	sync     string
	keyboard string
}{
	da:       "\x1b[c",
	kitty:    "\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\",
	iterm2:   "\x1b]1337;ReportCapabilities\a",
	sync:     "\x1b[?2026$p",
	keyboard: "\x1b[?u",
}

// Probe detects terminal capabilities with a bounded time budget.
func Probe() Capabilities {
	return ProbeWithTimeout(250 * time.Millisecond)
}

// ProbeWithTimeout runs detection, spending at most d on live queries.
func ProbeWithTimeout(d time.Duration) Capabilities {
	caps := fromEnv()
	caps.Width, caps.Height = termSize()

	if ov := strings.TrimSpace(os.Getenv("TB_TIER")); ov != "" {
		if t, ok := ParseTier(ov); ok {
			caps.Tier = t
			caps.TierName = t.String()
			caps.ForcedBlock = t == TierBlock && caps.ForcedBlock
			if t != TierBlock {
				caps.ForcedBlock = false
			}
			return caps
		}
	}

	if !isCharDevice() {
		caps.Tier = TierBlock
		caps.TierName = caps.Tier.String()
		return caps
	}

	reply := liveQuery(d)
	if reply == "" && !caps.guessedGraphics() {
		caps.Tier = TierBlock
		caps.TierName = caps.Tier.String()
		return caps
	}
	caps.ProbedLive = reply != ""
	caps.applyReply(reply)
	caps.TierName = caps.Tier.String()
	return caps
}

func (c *Capabilities) guessedGraphics() bool {
	return c.KittyGraphics || c.Sixel || c.Iterm2
}

func fromEnv() Capabilities {
	caps := Capabilities{TrueColor: true, MouseSGR: true}
	term := strings.ToLower(os.Getenv("TERM"))
	prog := strings.ToLower(os.Getenv("TERM_PROGRAM"))
	colorterm := strings.ToLower(os.Getenv("COLORTERM"))

	if term == "dumb" || term == "" {
		caps.TrueColor = false
		caps.MouseSGR = false
	}
	if colorterm == "" && !strings.Contains(term, "truecolor") && !strings.Contains(term, "24bit") {
		if strings.HasPrefix(term, "xterm") || strings.Contains(prog, "iterm") ||
			strings.Contains(prog, "wezterm") || strings.Contains(prog, "kitty") {
			caps.TrueColor = true
		} else if term == "dumb" || strings.Contains(term, "vt100") {
			caps.TrueColor = false
		}
	}
	if strings.Contains(prog, "iterm") || strings.Contains(prog, "wezterm") {
		caps.Iterm2 = true
	}
	if strings.Contains(prog, "kitty") {
		caps.KittyGraphics = true
		caps.SyncOutput = true
		caps.KittyKeyboard = true
	}
	if os.Getenv("TMUX") != "" || os.Getenv("STY") != "" {
		caps.ForcedBlock = true
		caps.KittyGraphics = false
		caps.Sixel = false
		caps.Iterm2 = false
		caps.SyncOutput = false
		caps.KittyKeyboard = false
	}
	return caps
}

func (c *Capabilities) applyReply(reply string) {
	if strings.Contains(reply, "_Gi=") || strings.Contains(reply, "OK") && strings.Contains(reply, "Gi") {
		c.KittyGraphics = true
	}
	if isDAResponseWith(reply, ";4") || isDAResponseWith(reply, "4;") || strings.Contains(reply, ";4c") {
		c.Sixel = true
	}
	if strings.Contains(reply, "1337;Capabilities") || strings.Contains(reply, "1337;File=ok") {
		c.Iterm2 = true
	}
	if strings.Contains(reply, "?2026;1$y") || strings.Contains(reply, "?2026;3$y") {
		c.SyncOutput = true
	}
	if strings.Contains(reply, "?0u") || strings.Contains(reply, "?1u") {
		c.KittyKeyboard = true
	}
	if c.KittyGraphics {
		c.SyncOutput = true
	}
	switch {
	case c.KittyGraphics:
		c.Tier = TierKitty
	case c.Sixel:
		c.Tier = TierSixel
	case c.Iterm2:
		c.Tier = TierIterm2
	default:
		c.Tier = TierBlock
	}
	if c.ForcedBlock {
		c.Tier = TierBlock
		c.KittyGraphics = false
		c.Sixel = false
		c.Iterm2 = false
		c.SyncOutput = false
		c.KittyKeyboard = false
	}
}

func isDAResponseWith(reply, needle string) bool {
	idx := strings.Index(reply, "\x1b[?")
	if idx < 0 {
		return false
	}
	end := strings.Index(reply[idx:], "c")
	if end < 0 {
		return false
	}
	return strings.Contains(reply[idx:idx+end], needle)
}

// Cache holds probed capabilities and re-probes on resize signals.
type Cache struct {
	mu   sync.Mutex
	caps Capabilities
}

// NewCache probes once and returns the cache.
func NewCache() *Cache {
	return &Cache{caps: Probe()}
}

// Get returns the cached capabilities.
func (c *Cache) Get() Capabilities {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.caps
}

// MarkResized invalidates size-dependent state and re-probes cheaply.
func (c *Cache) MarkResized() Capabilities {
	c.mu.Lock()
	defer c.mu.Unlock()
	w, h := termSize()
	c.caps.Width, c.caps.Height = w, h
	c.caps.ProbedLive = false
	return c.caps
}

// SetTier forces a tier (demos, tests, agent requests).
func (c *Cache) SetTier(t GraphicsTier) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.caps.Tier = t
	c.caps.TierName = t.String()
	c.caps.ForcedBlock = t == TierBlock && c.caps.ForcedBlock
	if t != TierBlock {
		c.caps.ForcedBlock = false
		c.caps.KittyGraphics = t == TierKitty
		c.caps.Sixel = t == TierSixel || t == TierKitty
		c.caps.Iterm2 = t == TierIterm2 || t == TierKitty
	}
}
