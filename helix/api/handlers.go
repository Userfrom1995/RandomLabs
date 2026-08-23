package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/Userfrom1995/Random/helix/internal/core"
	"github.com/Userfrom1995/Random/helix/internal/index"
)

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	var req struct {
		ID     uint64         `json:"id"`
		Vector []float32      `json:"vector"`
		Meta   map[string]any `json:"meta"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid json: "+err.Error())
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(req.Vector) != s.Idx.Dim {
		errorResponse(w, 400, "vector length mismatch")
		return
	}
	if err := core.CheckFinite(req.Vector); err != nil {
		errorResponse(w, 400, err.Error())
		return
	}
	if req.ID == 0 {
		// allow 0? spec says uint64; allow but warn
	}
	if err := s.Idx.InsertItem(index.Item{ID: req.ID, Vec: req.Vector, Meta: req.Meta}); err != nil {
		errorResponse(w, 400, err.Error())
		return
	}
	jsonResponse(w, 200, map[string]any{"ok": true, "id": req.ID})
}

func (s *Server) handleBatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	var req struct {
		Items []struct {
			ID     uint64         `json:"id"`
			Vector []float32      `json:"vector"`
			Meta   map[string]any `json:"meta"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid json: "+err.Error())
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, it := range req.Items {
		if len(it.Vector) != s.Idx.Dim {
			errorResponse(w, 400, "vector length mismatch for id "+strconv.FormatUint(it.ID, 10))
			return
		}
		if err := core.CheckFinite(it.Vector); err != nil {
			errorResponse(w, 400, err.Error())
			return
		}
		if err := s.Idx.InsertItem(index.Item{ID: it.ID, Vec: it.Vector, Meta: it.Meta}); err != nil {
			errorResponse(w, 400, err.Error())
			return
		}
		count++
	}
	jsonResponse(w, 200, map[string]any{"ok": true, "count": count})
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	// path /api/index/:id
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) != 3 {
		errorResponse(w, 404, "not found")
		return
	}
	id, err := strconv.ParseUint(parts[2], 10, 64)
	if err != nil {
		errorResponse(w, 400, "invalid id")
		return
	}
	ok := s.Idx.Delete(id)
	jsonResponse(w, 200, map[string]any{"ok": true, "deleted": ok})
}

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	var req struct {
		Vector []float32 `json:"vector"`
		K      int       `json:"k"`
		Ef     *int      `json:"ef"`
		Mode   string    `json:"mode"`
		Metric string    `json:"metric"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid json: "+err.Error())
		return
	}
	ef := 0
	if req.Ef != nil {
		ef = *req.Ef
	}
	// metric override not yet applied per query: we keep index metric
	if req.Metric != "" && req.Metric != s.Idx.Opts.Metric.String() {
		// allow but ignore for now; search uses index metric
	}
	if req.K <= 0 {
		req.K = 10
	}
	res, err := s.Idx.Search(req.Vector, req.K, ef, req.Mode)
	if err != nil {
		errorResponse(w, 400, err.Error())
		return
	}
	jsonResponse(w, 200, res)
}

func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	pqInfo := map[string]any{"enabled": s.Idx.PQ != nil}
	if s.Idx.PQ != nil {
		pqInfo["M"] = s.Idx.PQ.M
		pqInfo["K"] = s.Idx.PQ.K
	}
	jsonResponse(w, 200, map[string]any{
		"count":       s.Idx.CountLive(),
		"dim":         s.Idx.Dim,
		"layers":      s.Idx.Graph.Layers(),
		"memoryBytes": s.Idx.MemoryBytes(),
		"pq":          pqInfo,
	})
}

func (s *Server) handleProjection(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		errorResponse(w, 405, "method not allowed")
		return
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	pts := s.Idx.Projection()
	jsonResponse(w, 200, map[string]any{"points": pts})
}
