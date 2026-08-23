package main

import (
	"net/http"
	"os"
	"path/filepath"
)

func listenImpl(addr string, handler http.Handler) error {
	// also serve static UI if helix/ui exists
	uiDir := filepath.Join("helix", "ui")
	if _, err := os.Stat(uiDir); err == nil {
		mux := http.NewServeMux()
		mux.Handle("/", http.FileServer(http.Dir(uiDir)))
		mux.Handle("/api/", handler)
		return http.ListenAndServe(addr, mux)
	}
	// fallback: also try helix/helix/ui? but main handler already handles /api
	return http.ListenAndServe(addr, handler)
}
