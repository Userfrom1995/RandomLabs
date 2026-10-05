package agent

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"randomlabs/terminal-browser/internal/engine"
)

// SessionRecord is one CLI session registration: the durable handle
// name, profile, entry URL, sidecar CDP endpoint for liveness
// probes, and start time. The registry is observational: the opener
// process owns the sidecar, and later CLI invocations never
// reattach (documented extension point for a future phase). What the
// registry reports is real probe data, never a facade control.
type SessionRecord struct {
	Name     string `json:"name"`
	Profile  string `json:"profile"`
	URL      string `json:"url"`
	Endpoint string `json:"endpoint"`
	Started  int64  `json:"started_unix"`
	Alive    bool   `json:"alive,omitempty"`
	ProbeErr string `json:"probe_error,omitempty"`
}

func registryPath() (string, error) {
	dir := engine.BaseDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", fmt.Errorf("session registry dir: %w", err)
	}
	return filepath.Join(dir, "sessions.json"), nil
}

func writeAtomic(path string, v interface{}) error {
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("encode %s: %w", path, err)
	}
	raw = append(raw, '\n')
	tmp := path + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o600)
	if err != nil {
		return fmt.Errorf("write %s: %w", tmp, err)
	}
	if _, err := f.Write(raw); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("write %s: %w", tmp, err)
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		_ = os.Remove(tmp)
		return fmt.Errorf("fsync %s: %w", tmp, err)
	}
	if err := f.Close(); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("close %s: %w", tmp, err)
	}
	if err := os.Chmod(tmp, 0o600); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("chmod %s: %w", tmp, err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("commit %s: %w", path, err)
	}
	return nil
}

func readRegistry() ([]SessionRecord, string, error) {
	path, err := registryPath()
	if err != nil {
		return nil, "", err
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []SessionRecord{}, path, nil
		}
		return nil, path, fmt.Errorf("read %s: %w", path, err)
	}
	var recs []SessionRecord
	if len(raw) == 0 {
		return []SessionRecord{}, path, nil
	}
	if err := json.Unmarshal(raw, &recs); err != nil {
		return nil, path, fmt.Errorf("parse %s: %w", path, err)
	}
	if recs == nil {
		recs = []SessionRecord{}
	}
	return recs, path, nil
}

// probeEndpoint asks the sidecar /json/version with a short timeout.
// An answer means the session is alive; anything else (refused,
// timeout, non-200) means the opener exited or the sidecar died.
func probeEndpoint(endpoint string) (bool, string) {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return false, "no endpoint recorded"
	}
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(endpoint + "/json/version")
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return false, fmt.Sprintf("endpoint status %d", resp.StatusCode)
	}
	return true, ""
}

// RecordSession upserts one CLI session registration. Re-recording
// the same name moves it to the newest entry: names are stable
// handles for the human, not unique run ids.
func RecordSession(rec SessionRecord) error {
	recs, path, err := readRegistry()
	if err != nil {
		return err
	}
	kept := recs[:0]
	for _, r := range recs {
		if r.Name != rec.Name {
			kept = append(kept, r)
		}
	}
	recs = append(kept, rec)
	return writeAtomic(path, recs)
}

// ReadSessions returns every registration with a fresh liveness
// probe. Probes are live HTTP checks against the recorded sidecar
// endpoint, so alive=false is measured, not cached.
func ReadSessions() ([]SessionRecord, error) {
	recs, _, err := readRegistry()
	if err != nil {
		return nil, err
	}
	for i := range recs {
		alive, perr := probeEndpoint(recs[i].Endpoint)
		recs[i].Alive = alive
		recs[i].ProbeErr = perr
	}
	return recs, nil
}

// PruneSessions drops registrations whose endpoints no longer
// answer and returns the dropped count.
func PruneSessions() (int, error) {
	recs, path, err := readRegistry()
	if err != nil {
		return 0, err
	}
	kept := []SessionRecord{}
	for _, r := range recs {
		if alive, _ := probeEndpoint(r.Endpoint); alive {
			kept = append(kept, r)
		}
	}
	dropped := len(recs) - len(kept)
	if dropped == 0 {
		return 0, nil
	}
	return dropped, writeAtomic(path, kept)
}
