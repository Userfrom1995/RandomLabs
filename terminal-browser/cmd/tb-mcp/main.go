// Command tb-mcp is the agent-first MCP server for terminal-browser.
// It speaks JSON-RPC 2.0 over stdio (newline-delimited messages):
// initialize, notifications/initialized, tools/list, tools/call, and
// ping. Every tool executes through the shared agent dispatch, so
// results are bit-identical to the tb-agent CLI twins after the
// documented canonicalization (docs/parity.md).
//
// Sessions are first-class: session_open returns a handle (s1, s2,
// ...), each with its own Chromium sidecar, and every other tool runs
// against the active handle. Capability-gated tools (pdf, trace)
// register only when enabled via --caps or TB_CAPS.
package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"randomlabs/terminal-browser/internal/agent"
)

// ServerVersion tracks the control-plane surface (bumped per phase).
const ServerVersion = "0.6.0"

// ProtocolVersion is the MCP wire version this server implements.
const ProtocolVersion = "2024-11-05"

type rpcRequest struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      *json.RawMessage `json:"id"`
	Method  string           `json:"method"`
	Params  json.RawMessage  `json:"params"`
}

type rpcError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Envelope mirrors the tb-agent JSON envelope so transcripts compare.
type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Warning string      `json:"warning,omitempty"`
	Code    string      `json:"code,omitempty"`
}

func writeMsg(enc *json.Encoder, id *json.RawMessage, result interface{}, rerr *rpcError) {
	msg := map[string]interface{}{"jsonrpc": "2.0"}
	if id != nil {
		msg["id"] = *id
	}
	if rerr != nil {
		msg["error"] = rerr
	} else {
		msg["result"] = result
	}
	_ = enc.Encode(msg)
}

func toolResult(enc *json.Encoder, id *json.RawMessage, data interface{}, warning, code string) {
	ok := code == ""
	env := Envelope{Success: ok, Data: data, Warning: warning, Code: code}
	body, _ := json.Marshal(env)
	content := []interface{}{map[string]interface{}{"type": "text", "text": string(body)}}
	res := map[string]interface{}{"content": content}
	if !ok {
		res["isError"] = true
	}
	writeMsg(enc, id, res, nil)
}

func main() {
	fs := flag.NewFlagSet("tb-mcp", flag.ExitOnError)
	capsFlag := fs.String("caps", "", "comma-separated capability gates (pdf, trace, extension_trigger, webmcp); TB_CAPS also read")
	profile := fs.String("profile", "default", "default browser profile for fresh sessions")
	lite := fs.Bool("lite", false, "block images, media, and trackers in fresh sessions")
	width := fs.Int("width", 100, "grid width for fresh sessions")
	dialogPolicy := fs.String("dialog-policy", "manual", "dialog policy: manual, accept, or dismiss")
	_ = fs.Parse(os.Args[1:])

	caps, err := agent.ParseCaps(*capsFlag)
	if err != nil {
		fmt.Fprintln(os.Stderr, "tb-mcp: "+err.Error())
		os.Exit(2)
	}
	if envCaps, err := agent.CapsFromEnv(); err != nil {
		fmt.Fprintln(os.Stderr, "tb-mcp: bad TB_CAPS: "+err.Error())
		os.Exit(2)
	} else {
		for k, v := range envCaps {
			caps[k] = v
		}
	}
	switch strings.ToLower(strings.TrimSpace(*dialogPolicy)) {
	case "manual", "accept", "dismiss":
		*dialogPolicy = strings.ToLower(strings.TrimSpace(*dialogPolicy))
	default:
		fmt.Fprintln(os.Stderr, "tb-mcp: bad --dialog-policy: want manual, accept, or dismiss")
		os.Exit(2)
	}

	mgr := agent.NewManager(agent.ManagerOptions{
		Caps:           caps,
		DefaultProfile: *profile,
		DefaultLite:    *lite,
		DefaultWidth:   *width,
		DialogPolicy:   *dialogPolicy,
	})
	defer mgr.CloseAll()

	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	enc := json.NewEncoder(out)
	enc.SetEscapeHTML(false)

	sc := bufio.NewScanner(os.Stdin)
	sc.Buffer(make([]byte, 1024*1024), 64*1024*1024)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		var req rpcRequest
		if err := json.Unmarshal([]byte(line), &req); err != nil {
			writeMsg(enc, nil, nil, &rpcError{Code: -32700, Message: "parse error: " + err.Error()})
			out.Flush()
			continue
		}
		if req.JSONRPC != "" && req.JSONRPC != "2.0" {
			writeMsg(enc, req.ID, nil, &rpcError{Code: -32600, Message: "invalid Request: want jsonrpc 2.0"})
			out.Flush()
			continue
		}
		// Notifications carry no id and get no reply.
		if req.ID == nil {
			continue
		}
		switch req.Method {
		case "initialize":
			writeMsg(enc, req.ID, map[string]interface{}{
				"protocolVersion": ProtocolVersion,
				"capabilities":    map[string]interface{}{"tools": map[string]interface{}{}},
				"serverInfo":      map[string]interface{}{"name": "terminal-browser-mcp", "version": ServerVersion},
			}, nil)
		case "ping":
			writeMsg(enc, req.ID, map[string]interface{}{}, nil)
		case "tools/list":
			tools := agent.Registry(mgr.CapsOf())
			list := make([]interface{}, 0, len(tools))
			for _, t := range tools {
				list = append(list, map[string]interface{}{
					"name": t.Name, "description": t.Description,
					"inputSchema": t.Schema,
				})
			}
			writeMsg(enc, req.ID, map[string]interface{}{"tools": list}, nil)
		case "tools/call":
			var p struct {
				Name      string                 `json:"name"`
				Arguments map[string]interface{} `json:"arguments"`
			}
			if err := json.Unmarshal(req.Params, &p); err != nil {
				writeMsg(enc, req.ID, nil, &rpcError{Code: -32602, Message: "invalid params: " + err.Error()})
				break
			}
			if agent.Lookup(mgr.CapsOf(), strings.TrimSpace(p.Name)) == nil {
				gated := ""
				for _, t := range agent.Registry(agent.Caps{"pdf": true, "trace": true, "extension_trigger": true, "webmcp": true}) {
					if t.Name == strings.TrimSpace(p.Name) {
						gated = t.Cap
					}
				}
				if gated != "" {
					toolResult(enc, req.ID, nil,
						fmt.Sprintf("%s is capability-gated: relaunch with --caps %s (or TB_CAPS=%s)", p.Name, gated, gated),
						"capability_disabled")
				} else {
					toolResult(enc, req.ID, nil, fmt.Sprintf("unknown tool %q", p.Name), "bad_step")
				}
				break
			}
			data, warn, code := agent.Execute(mgr, strings.TrimSpace(p.Name), p.Arguments)
			toolResult(enc, req.ID, data, warn, code)
		default:
			writeMsg(enc, req.ID, nil, &rpcError{Code: -32601, Message: "method not found: " + req.Method})
		}
		out.Flush()
	}
}
