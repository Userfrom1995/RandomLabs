// Notices log access for `--verbose` tails: the owned instance writes
// `Log notice file notices.log` under its DataDirectory, so verbose output
// can show what tor itself said without new control-protocol surface.
package lifecycle

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// maxTailScan caps how far back TailFile reads. notices.log is append-only
// and can grow over long sessions; scanning is bounded so a verbose flag
// never pays more than a megabyte of I/O.
const maxTailScan = 1024 * 1024

// NoticesPath returns the tor notices.log for an owned instance. Foreign
// (reused) instances have no known log path: callers must degrade to a
// "(notices unavailable)" note, never an error.
func (in *Instance) NoticesPath() string {
	if in == nil || in.DataDir == "" || !in.Owned {
		return ""
	}
	return filepath.Join(in.DataDir, "notices.log")
}

// TailFile returns the last maxLines lines of path (fewer when the file is
// short). A missing file is not an error: tor may not have written yet, and
// verbose mode reports that instead of failing the command. maxLines <= 0
// means a small default.
func TailFile(path string, maxLines int) ([]string, error) {
	if maxLines <= 0 {
		maxLines = 5
	}
	raw, err := tailBytes(path)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return nil, nil
	}
	lines := strings.Split(strings.TrimRight(string(raw), "\n"), "\n")
	if len(lines) > maxLines {
		lines = lines[len(lines)-maxLines:]
	}
	return lines, nil
}

// tailBytes reads the tail of path, scanning at most maxTailScan bytes back.
// It over-reads by a line margin: the first (likely partial) line is
// dropped by the caller when the scan window cut the file.
func tailBytes(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("lifecycle: read notices %s: %w", path, err)
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		return nil, fmt.Errorf("lifecycle: stat notices %s: %w", path, err)
	}
	size := fi.Size()
	if size <= 0 {
		return nil, nil
	}
	start := int64(0)
	cut := false
	if size > maxTailScan {
		start = size - maxTailScan
		cut = true
	}
	buf := make([]byte, size-start)
	off := start
	for off < size {
		n, rerr := f.ReadAt(buf[off-start:], off)
		off += int64(n)
		if rerr != nil {
			break
		}
	}
	if cut {
		// Drop the partial first line: the window cut mid-line, and a
		// fragment would read as a corrupt tor notice.
		if i := strings.IndexByte(string(buf), '\n'); i >= 0 {
			buf = buf[i+1:]
		} else {
			buf = nil
		}
	}
	return buf, nil
}
