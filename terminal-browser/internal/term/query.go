package term

import (
	"os"
	"strconv"
	"strings"
	"time"
)

func sizeFromEnv() (int, int) {
	w, errW := strconv.Atoi(strings.TrimSpace(os.Getenv("COLUMNS")))
	h, errH := strconv.Atoi(strings.TrimSpace(os.Getenv("LINES")))
	if errW != nil || errH != nil || w <= 0 || h <= 0 {
		return 0, 0
	}
	if w > 500 {
		w = 500
	}
	if h > 300 {
		h = 300
	}
	return w, h
}

// liveQuery writes the device query batch and collects the reply within
// the budget. Raw mode keeps the reply bytes out of canonical line
// discipline so escape responses arrive without requiring Enter.
func liveQuery(budget time.Duration) string {
	restore, err := setRaw(os.Stdin)
	if err != nil {
		return ""
	}
	defer restore()

	out := os.Stdout
	out.WriteString(queryRoundTrip.da)
	out.WriteString(queryRoundTrip.kitty)
	out.WriteString(queryRoundTrip.iterm2)
	out.WriteString(queryRoundTrip.sync)
	out.WriteString(queryRoundTrip.keyboard)

	deadline := time.Now().Add(budget)
	var sb strings.Builder
	buf := make([]byte, 512)
	for time.Now().Before(deadline) {
		n, err := os.Stdin.Read(buf)
		if n > 0 {
			sb.Write(buf[:n])
			if sb.Len() > 4096 {
				break
			}
		}
		if err != nil {
			break
		}
		if n == 0 {
			time.Sleep(5 * time.Millisecond)
		}
	}
	return sb.String()
}
