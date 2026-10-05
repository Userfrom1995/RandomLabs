package engine

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// waitEndpoint polls /json/version until the sidecar answers or the
// timeout elapses. A silent sidecar fails closed with an actionable
// message, never a hung navigate.
func waitEndpoint(port int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var last error
	for time.Now().Before(deadline) {
		resp, err := http.Get(fmt.Sprintf("http://127.0.0.1:%d/json/version", port))
		if err == nil {
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return nil
			}
			last = fmt.Errorf("devtools status %d", resp.StatusCode)
		} else {
			last = err
		}
		time.Sleep(150 * time.Millisecond)
	}
	return fmt.Errorf("chrome devtools endpoint never answered: %v", last)
}

// conn is a minimal WebSocket client (text frames only) over the CDP
// debugger URL. The standard library has no WS client, and keeping the
// module dependency-free matters more than full RFC coverage: Chrome
// speaks unmasked text frames, we send masked text frames, and control
// frames are answered minimally.
type conn struct {
	rw *bufio.ReadWriter
	c  net.Conn
	// wmu serializes wire writes: Call frames from concurrent Sessions
	// and the read loop's pong replies share one socket and must never
	// interleave bytes.
	wmu sync.Mutex
}

// maxFrame caps one inbound WebSocket frame (32 MiB). CDP messages are
// kilobytes; an uncapped u64 length from a malicious target would OOM.
const maxFrame = 32 << 20

func wsDial(raw string) (*conn, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("bad debugger url: %w", err)
	}
	host := u.Host
	if _, _, err := net.SplitHostPort(host); err != nil {
		host = net.JoinHostPort(host, "80")
	}
	c, err := net.DialTimeout("tcp", host, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("dial debugger: %w", err)
	}
	key := make([]byte, 16)
	if _, err := rand.Read(key); err != nil {
		c.Close()
		return nil, err
	}
	keyStr := base64.StdEncoding.EncodeToString(key)
	wantAccept := wsAccept(keyStr)
	path := u.RequestURI()
	var sb strings.Builder
	fmt.Fprintf(&sb, "GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n",
		path, u.Host, keyStr)
	if _, err := c.Write([]byte(sb.String())); err != nil {
		c.Close()
		return nil, err
	}
	br := bufio.NewReader(c)
	line, err := br.ReadString('\n')
	if err != nil {
		c.Close()
		return nil, err
	}
	trimmed := strings.TrimSpace(line)
	if !strings.HasPrefix(trimmed, "HTTP/1.1 101 ") && !strings.HasPrefix(trimmed, "HTTP/1.0 101 ") {
		c.Close()
		return nil, fmt.Errorf("websocket handshake: %s", trimmed)
	}
	gotAccept := ""
	for {
		h, err := br.ReadString('\n')
		if err != nil {
			c.Close()
			return nil, err
		}
		if h == "\r\n" || h == "\n" {
			break
		}
		if i := strings.Index(h, ":"); i > 0 {
			name := strings.TrimSpace(strings.ToLower(h[:i]))
			if name == "sec-websocket-accept" {
				gotAccept = strings.TrimSpace(h[i+1:])
			}
		}
	}
	if gotAccept != wantAccept {
		c.Close()
		return nil, fmt.Errorf("ws: bad Sec-WebSocket-Accept (handshake hijack or MITM)")
	}
	return &conn{rw: bufio.NewReadWriter(br, bufio.NewWriter(c)), c: c}, nil
}

func wsAccept(key string) string {
	h := sha1.New()
	h.Write([]byte(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

// writeText sends one masked text frame. Writes hold wmu so two
// concurrent Calls (or a Call plus a pong reply) never interleave, and
// the header plus masked body go out under one lock.
func (w *conn) writeText(p []byte) error {
	w.wmu.Lock()
	defer w.wmu.Unlock()
	var hdr [14]byte
	n := 2
	hdr[0] = 0x81
	mask := make([]byte, 4)
	if _, err := rand.Read(mask); err != nil {
		return err
	}
	switch {
	case len(p) < 126:
		hdr[1] = byte(len(p)) | 0x80
	case len(p) < 65536:
		hdr[1] = 126 | 0x80
		binary.BigEndian.PutUint16(hdr[2:4], uint16(len(p)))
		n = 4
	default:
		hdr[1] = 127 | 0x80
		binary.BigEndian.PutUint64(hdr[2:10], uint64(len(p)))
		n = 10
	}
	copy(hdr[n:n+4], mask)
	n += 4
	if _, err := w.c.Write(hdr[:n]); err != nil {
		return err
	}
	masked := make([]byte, len(p))
	for i, b := range p {
		masked[i] = b ^ mask[i%4]
	}
	_, err := w.c.Write(masked)
	return err
}

// readText reads one message, answering pings and skipping control
// frames. Chrome sends unmasked text frames, possibly fragmented.
func (w *conn) readText() ([]byte, error) {
	var msg bytes.Buffer
	for {
		hdr := make([]byte, 2)
		if _, err := io.ReadFull(w.rw, hdr); err != nil {
			return nil, err
		}
		op := hdr[0] & 0x0F
		masked := hdr[1]&0x80 != 0
		length := int64(hdr[1] & 0x7F)
		switch length {
		case 126:
			var ext [2]byte
			if _, err := io.ReadFull(w.rw, ext[:]); err != nil {
				return nil, err
			}
			length = int64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			if _, err := io.ReadFull(w.rw, ext[:]); err != nil {
				return nil, err
			}
			length = int64(binary.BigEndian.Uint64(ext[:]))
		}
		if length < 0 || length > maxFrame {
			return nil, fmt.Errorf("ws: frame too large (%d bytes, cap %d)", length, maxFrame)
		}
		var key [4]byte
		if masked {
			if _, err := io.ReadFull(w.rw, key[:]); err != nil {
				return nil, err
			}
		}
		payload := make([]byte, length)
		if _, err := io.ReadFull(w.rw, payload); err != nil {
			return nil, err
		}
		if masked {
			for i := range payload {
				payload[i] ^= key[i%4]
			}
		}
		switch op {
		case 0x8:
			return nil, fmt.Errorf("debugger closed the connection")
		case 0x9:
			// Ping: answer pong with the same body.
			_ = w.writePong(payload)
			continue
		case 0xA:
			continue
		case 0x1, 0x0:
			msg.Write(payload)
			if hdr[0]&0x80 != 0 {
				return msg.Bytes(), nil
			}
		case 0x2:
			// Binary frames never carry CDP; skip.
			continue
		default:
			continue
		}
	}
}

// writePong answers a ping with a masked pong (client frames are
// always masked per RFC 6455) with full extended-length support.
// overlong payloads are truncated to the 125-byte control limit.
func (w *conn) writePong(p []byte) error {
	w.wmu.Lock()
	defer w.wmu.Unlock()
	if len(p) > 125 {
		p = p[:125]
	}
	var hdr [14]byte
	n := 2
	hdr[0] = 0x8A
	mask := make([]byte, 4)
	if _, err := rand.Read(mask); err != nil {
		return err
	}
	switch {
	case len(p) < 126:
		hdr[1] = byte(len(p)) | 0x80
	case len(p) < 65536:
		hdr[1] = 126 | 0x80
		binary.BigEndian.PutUint16(hdr[2:4], uint16(len(p)))
		n = 4
	default:
		hdr[1] = 127 | 0x80
		binary.BigEndian.PutUint64(hdr[2:10], uint64(len(p)))
		n = 10
	}
	copy(hdr[n:n+4], mask)
	n += 4
	if _, err := w.c.Write(hdr[:n]); err != nil {
		return err
	}
	masked := make([]byte, len(p))
	for i, b := range p {
		masked[i] = b ^ mask[i%4]
	}
	_, err := w.c.Write(masked)
	return err
}

func (w *conn) close() error {
	return w.c.Close()
}
