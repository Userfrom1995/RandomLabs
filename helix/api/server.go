package api

import (
	"encoding/json"
	"net/http"

	"github.com/Userfrom1995/Random/helix/internal/index"
)

// Server wraps http server with index.
type Server struct {
	Idx *index.Index
	mux *http.ServeMux
}

func New(idx *index.Index) *Server {
	s := &Server{Idx: idx, mux: http.NewServeMux()}
	s.mux.HandleFunc("/api/index", s.handleIndex)
	s.mux.HandleFunc("/api/index/batch", s.handleBatch)
	s.mux.HandleFunc("/api/index/", s.handleDelete) // DELETE /api/index/:id
	s.mux.HandleFunc("/api/search", s.handleSearch)
	s.mux.HandleFunc("/api/stats", s.handleStats)
	s.mux.HandleFunc("/api/projection", s.handleProjection)
	// also serve UI static if needed (not here)
	s.mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, 200, map[string]any{"ok": true})
	})
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" {
		w.WriteHeader(204)
		return
	}
	s.mux.ServeHTTP(w, r)
}

func jsonResponse(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func errorResponse(w http.ResponseWriter, code int, msg string) {
	jsonResponse(w, code, map[string]string{"error": msg})
}
