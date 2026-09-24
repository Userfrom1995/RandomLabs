// Package probe proves egress protection through a SOCKS endpoint: the
// live IsTor check behind `status --verify` (research 16.2).
//
// Binding verdict rule: `protected` requires ALL of readiness gates
// (bootstrap 100% + tag done + circuit established + SOCKS handshake)
// AND a live {"IsTor":true} response fetched through the exact
// configured socks5h endpoint. Anything else is `degraded` (endpoint
// answers but proof failed) or `unverified` (no endpoint). Results are
// never cached: every call probes live.
//
// The connection is a hand-rolled SOCKS5 client (stdlib only) because
// the domain must be handed to the proxy as a DOMAINNAME target - that
// is the socks5h semantics being proven (the proxy resolves DNS, not
// this process).
package probe

import (
	"bufio"
	"crypto/tls"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Verdict is the three-state protection verdict (research 16.2).
type Verdict string

const (
	// VerdictProtected: gates pass and the live probe answered IsTor:true.
	VerdictProtected Verdict = "protected"
	// VerdictDegraded: an endpoint answers but proof failed.
	VerdictDegraded Verdict = "degraded"
	// VerdictUnverified: no endpoint to prove anything with.
	VerdictUnverified Verdict = "unverified"
)

// DefaultCheckURL is Tor's canonical IsTor probe endpoint.
const DefaultCheckURL = "https://check.torproject.org/api/ip"

// maxProbeBody bounds the probe response (the real answer is <200B).
const maxProbeBody = 64 << 10

// Options tune a verification run.
type Options struct {
	// SocksAddr is the exact SOCKS5 endpoint whose egress is proven.
	SocksAddr string
	// CheckURL is the IsTor probe URL (injectable for tests/privacy).
	CheckURL string
	// Timeout bounds every network step.
	Timeout time.Duration
	// GatesReady reports the readiness gates (bootstrap 100% + done +
	// circuit established + handshake as aggregated by status).
	GatesReady bool
	// GatesNote explains a failed gate in the degraded detail.
	GatesNote string
}

// Result carries the verdict plus the evidence behind it.
type Result struct {
	Verdict     Verdict
	FailedCheck string
	Detail      string
	ExitIP      string
	IsTor       bool
	CheckURL    string
}

// Verify runs the binding verdict rule end to end, live, every time.
func Verify(o Options) Result {
	if o.Timeout <= 0 {
		o.Timeout = 3 * time.Second
	}
	if o.CheckURL == "" {
		o.CheckURL = DefaultCheckURL
	}
	res := Result{CheckURL: o.CheckURL, Verdict: VerdictUnverified}

	if strings.TrimSpace(o.SocksAddr) == "" {
		res.FailedCheck = "socks_endpoint"
		res.Detail = "no SOCKS endpoint configured (is tor running?)"
		return res
	}
	if err := socksHandshake(o.SocksAddr, o.Timeout); err != nil {
		res.FailedCheck = "socks_handshake"
		res.Detail = "SOCKS endpoint " + o.SocksAddr + " not answering: " + err.Error()
		return res
	}
	if !o.GatesReady {
		res.Verdict = VerdictDegraded
		res.FailedCheck = "readiness_gates"
		res.Detail = "readiness gates not satisfied"
		if o.GatesNote != "" {
			res.Detail += " (" + o.GatesNote + ")"
		}
		return res
	}

	isTor, exitIP, err := IsTorThrough(o.SocksAddr, o.CheckURL, o.Timeout)
	res.ExitIP = exitIP
	if err != nil {
		res.Verdict = VerdictDegraded
		res.FailedCheck = "istor_probe"
		res.Detail = "IsTor probe through " + o.SocksAddr + " failed: " + err.Error()
		return res
	}
	res.IsTor = isTor
	if !isTor {
		res.Verdict = VerdictDegraded
		res.FailedCheck = "istor_probe"
		res.Detail = "probe answered IsTor=false (exit " + exitIP + " is not a Tor exit)"
		return res
	}
	res.Verdict = VerdictProtected
	res.FailedCheck = ""
	res.Detail = "IsTor=true exit " + exitIP + " through " + o.SocksAddr
	return res
}

// IsTorThrough fetches checkURL through socksAddr using socks5h
// semantics (the proxy resolves the hostname) and parses Tor's
// {"IsTor":bool,"IP":"..."} answer.
func IsTorThrough(socksAddr, checkURL string, timeout time.Duration) (isTor bool, exitIP string, err error) {
	body, err := fetchThroughSocks5h(socksAddr, checkURL, timeout)
	if err != nil {
		return false, "", err
	}
	var cr struct {
		IsTor *bool  `json:"IsTor"`
		IP    string `json:"IP"`
	}
	if jerr := json.Unmarshal(body, &cr); jerr != nil {
		return false, "", fmt.Errorf("probe: response is not JSON (%v): %q", jerr, truncate(string(body), 120))
	}
	if cr.IsTor == nil {
		return false, "", fmt.Errorf("probe: unexpected response shape (want {\"IsTor\":bool,\"IP\":\"...\"}): %q", truncate(string(body), 120))
	}
	return *cr.IsTor, cr.IP, nil
}

// socksHandshake proves a SOCKS5 server speaks the protocol (mirrors
// lifecycle.ProbeSocks without importing the lifecycle package).
func socksHandshake(addr string, timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return err
	}
	if _, err := conn.Write([]byte{0x05, 0x01, 0x00}); err != nil {
		return fmt.Errorf("handshake write: %w", err)
	}
	resp := make([]byte, 2)
	if _, err := io.ReadFull(conn, resp); err != nil {
		return fmt.Errorf("handshake read: %w", err)
	}
	if resp[0] != 0x05 || resp[1] != 0x00 {
		return fmt.Errorf("not a SOCKS5 server (reply %02x %02x)", resp[1], resp[0])
	}
	return nil
}

// fetchThroughSocks5h performs a full HTTP(S) GET whose TCP connection
// is established through the SOCKS5 proxy with a DOMAINNAME target, so
// the proxy - not this process - resolves the hostname.
func fetchThroughSocks5h(socksAddr, rawURL string, timeout time.Duration) ([]byte, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("probe: parse check-url: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("probe: check-url scheme %q unsupported (want http or https)", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return nil, fmt.Errorf("probe: check-url has no host")
	}
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	pnum, err := strconv.Atoi(port)
	if err != nil || pnum <= 0 || pnum > 65535 {
		return nil, fmt.Errorf("probe: check-url port %q invalid", port)
	}

	conn, err := net.DialTimeout("tcp", socksAddr, timeout)
	if err != nil {
		return nil, fmt.Errorf("dial SOCKS %s: %w", socksAddr, err)
	}
	defer conn.Close()
	deadline := time.Now().Add(timeout)
	if err := conn.SetDeadline(deadline); err != nil {
		return nil, err
	}
	if err := socks5Connect(conn, host, uint16(pnum)); err != nil {
		return nil, err
	}

	var r io.Reader = conn
	var w io.Writer = conn
	if u.Scheme == "https" {
		// The connection deadline set above bounds the handshake too.
		tconn := tls.Client(conn, &tls.Config{ServerName: host})
		if err := tconn.Handshake(); err != nil {
			return nil, fmt.Errorf("tls handshake: %w", err)
		}
		r, w = tconn, tconn
	}
	rw := bufio.NewReadWriter(bufio.NewReader(r), bufio.NewWriter(w))

	path := u.RequestURI()
	fmt.Fprintf(rw, "GET %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: torshim-probe\r\nAccept: application/json\r\nConnection: close\r\n\r\n", path, u.Host)
	if err := rw.Flush(); err != nil {
		return nil, fmt.Errorf("write HTTP request: %w", err)
	}
	resp, err := http.ReadResponse(rw.Reader, nil)
	if err != nil {
		return nil, fmt.Errorf("read HTTP response: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxProbeBody))
	if err != nil {
		return nil, fmt.Errorf("read HTTP body: %w", err)
	}
	return body, nil
}

// socks5Connect drives the SOCKS5 CONNECT exchange on conn: greeting,
// then a CONNECT with the hostname as a DOMAINNAME target (socks5h).
func socks5Connect(conn net.Conn, host string, port uint16) error {
	if _, err := conn.Write([]byte{0x05, 0x01, 0x00}); err != nil {
		return fmt.Errorf("socks greeting write: %w", err)
	}
	g := make([]byte, 2)
	if _, err := io.ReadFull(conn, g); err != nil {
		return fmt.Errorf("socks greeting read: %w", err)
	}
	if g[0] != 0x05 || g[1] != 0x00 {
		return fmt.Errorf("socks proxy rejected no-auth (reply %02x%02x)", g[0], g[1])
	}
	req := []byte{0x05, 0x01, 0x00}
	if ip := net.ParseIP(host); ip != nil {
		if v4 := ip.To4(); v4 != nil {
			req = append(req, 0x01)
			req = append(req, v4...)
		} else {
			req = append(req, 0x04)
			req = append(req, ip.To16()...)
		}
	} else {
		if len(host) > 255 {
			return fmt.Errorf("socks: hostname too long (%d bytes)", len(host))
		}
		req = append(req, 0x03, byte(len(host)))
		req = append(req, host...)
	}
	var pb [2]byte
	binary.BigEndian.PutUint16(pb[:], port)
	req = append(req, pb[:]...)
	if _, err := conn.Write(req); err != nil {
		return fmt.Errorf("socks connect write: %w", err)
	}
	hdr := make([]byte, 4)
	if _, err := io.ReadFull(conn, hdr); err != nil {
		return fmt.Errorf("socks connect read: %w", err)
	}
	if hdr[0] != 0x05 {
		return fmt.Errorf("socks: unexpected version %d", hdr[0])
	}
	if hdr[1] != 0x00 {
		return mapSocksReply(hdr[1])
	}
	// Consume the bound address so the stream sits at the payload.
	var skip int
	switch hdr[3] {
	case 0x01:
		skip = 4 + 2
	case 0x04:
		skip = 16 + 2
	case 0x03:
		l := make([]byte, 1)
		if _, err := io.ReadFull(conn, l); err != nil {
			return fmt.Errorf("socks addr read: %w", err)
		}
		skip = int(l[0]) + 2
	default:
		return fmt.Errorf("socks: unknown address type %d", hdr[3])
	}
	if _, err := io.CopyN(io.Discard, conn, int64(skip)); err != nil {
		return fmt.Errorf("socks addr read: %w", err)
	}
	return nil
}

// mapSocksReply turns a non-zero SOCKS5 reply code into an error.
func mapSocksReply(code byte) error {
	switch code {
	case 0x01:
		return fmt.Errorf("socks: general failure")
	case 0x02:
		return fmt.Errorf("socks: connection not allowed by ruleset")
	case 0x03:
		return fmt.Errorf("socks: network unreachable")
	case 0x04:
		return fmt.Errorf("socks: host unreachable")
	case 0x05:
		return fmt.Errorf("socks: connection refused")
	case 0x06:
		return fmt.Errorf("socks: TTL expired")
	case 0x07:
		return fmt.Errorf("socks: command not supported")
	case 0x08:
		return fmt.Errorf("socks: address type not supported")
	}
	return fmt.Errorf("socks: reply code %d", code)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
