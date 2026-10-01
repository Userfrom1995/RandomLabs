package lifecycle

import (
	"io"
	"os"
	"path/filepath"
	"time"
)

func cacheDir() string {
	base, err := os.UserCacheDir()
	if err != nil {
		return ""
	}
	return filepath.Join(base, "torshim")
}

var cachedFiles = []string{
	"cached-microdesc-consensus",
	"cached-microdescs",
	"cached-microdescs.new",
	"cached-certs",
}

func seedCache(dataDir string) {
	cd := cacheDir()
	if cd == "" {
		return
	}
	for _, name := range cachedFiles {
		src := filepath.Join(cd, name)
		fi, err := os.Stat(src)
		if err != nil || fi.IsDir() {
			continue
		}
		if time.Since(fi.ModTime()) > 24*time.Hour {
			continue
		}
		dst := filepath.Join(dataDir, name)
		copyFile(src, dst)
	}
}

func saveCache(dataDir string) {
	cd := cacheDir()
	if cd == "" {
		return
	}
	if err := os.MkdirAll(cd, 0o700); err != nil {
		return
	}
	for _, name := range cachedFiles {
		src := filepath.Join(dataDir, name)
		fi, err := os.Stat(src)
		if err != nil || fi.IsDir() {
			continue
		}
		dst := filepath.Join(cd, name)
		copyFile(src, dst)
	}
}

func copyFile(src, dst string) {
	in, err := os.Open(src)
	if err != nil {
		return
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return
	}
	defer out.Close()
	_, _ = io.Copy(out, in)
}
