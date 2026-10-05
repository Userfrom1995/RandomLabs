package engine

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

// TraceResult is the envelope payload for a CDP tracing capture:
// the output path, byte count, and collected event count. The file
// holds the concatenated traceEvents arrays from the session, so
// agents can measure renderer activity (parse, layout, paint) around
// an interaction without leaving the terminal.
type TraceResult struct {
	Path   string `json:"path"`
	Bytes  int    `json:"bytes"`
	Events int    `json:"events"`
}

// Trace records a CDP trace for seconds and writes the collected
// events to out (0600, like screenshots and PDFs). Seconds clamps to
// 1..30: shorter captures miss the renderer idle tail, longer ones
// stall the agent loop. Tracing is opt-in behind the trace
// capability flag; the agent control plane gates it before calling.
func (b *Browser) Trace(seconds float64, out string) (*TraceResult, error) {
	if strings.TrimSpace(out) == "" {
		return nil, fmt.Errorf("empty out path: traces need an explicit file")
	}
	if seconds < 1 {
		seconds = 1
	}
	if seconds > 30 {
		seconds = 30
	}
	dataCh := b.sess.Subscribe("Tracing.dataCollected")
	defer b.sess.Unsubscribe(dataCh)
	doneCh := b.sess.Subscribe("Tracing.tracingComplete")
	defer b.sess.Unsubscribe(doneCh)
	// Drain pre-capture events so a previous run never leaks in.
drain:
	for {
		select {
		case <-dataCh:
		case <-doneCh:
		default:
			break drain
		}
	}
	if _, err := b.sess.Call("Tracing.start", map[string]interface{}{
		"traceConfig": map[string]interface{}{
			"recordMode":         "recordAsMuchAsPossible",
			"includedCategories": []string{"blink", "cc", "renderer", "v8", "loading"},
			"excludedCategories": []string{},
		},
	}, 10*time.Second); err != nil {
		return nil, fmt.Errorf("trace start: %w", err)
	}
	time.Sleep(time.Duration(seconds * float64(time.Second)))
	if _, err := b.sess.Call("Tracing.end", nil, 10*time.Second); err != nil {
		return nil, fmt.Errorf("trace end: %w", err)
	}
	var events []json.RawMessage
	deadline := time.After(15 * time.Second)
collect:
	for {
		select {
		case raw := <-dataCh:
			var batch struct {
				Value []json.RawMessage `json:"value"`
			}
			if json.Unmarshal(raw, &batch) == nil {
				events = append(events, batch.Value...)
			}
		case <-doneCh:
			// The complete event may race the last data batch:
			// drain briefly before closing the capture.
			tail := time.After(500 * time.Millisecond)
		tail:
			for {
				select {
				case raw := <-dataCh:
					var batch struct {
						Value []json.RawMessage `json:"value"`
					}
					if json.Unmarshal(raw, &batch) == nil {
						events = append(events, batch.Value...)
					}
				case <-tail:
					break tail
				}
			}
			break collect
		case <-deadline:
			return nil, fmt.Errorf("trace collect: timeout waiting for tracingComplete (got %d events)", len(events))
		}
	}
	joined := make([]string, 0, len(events)+2)
	joined = append(joined, `{"traceEvents":[`)
	for i, e := range events {
		s := strings.TrimSpace(string(e))
		if i > 0 {
			joined = append(joined, ",")
		}
		joined = append(joined, s)
	}
	joined = append(joined, `]}`)
	body := strings.Join(joined, "")
	if err := os.WriteFile(out, []byte(body), 0o600); err != nil {
		return nil, fmt.Errorf("write trace: %w", err)
	}
	return &TraceResult{Path: out, Bytes: len(body), Events: len(events)}, nil
}
