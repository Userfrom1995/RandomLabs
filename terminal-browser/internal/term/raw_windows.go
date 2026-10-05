//go:build windows

package term

import "os"

// On Windows the console is driven through ConPTY guards owned by the
// per-OS shell layer, so live device queries stay disabled here and the
// block path is the default until that layer enables more.
func isCharDevice() bool { return false }

func termSize() (int, int) {
	if w, h := sizeFromEnv(); w > 0 {
		return w, h
	}
	return 80, 24
}

func setRaw(f *os.File) (func(), error) { return func() {}, nil }
