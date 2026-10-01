// Live network probes for doctor: DNS-over-UDP against the Tor DNSPort
// and exit-IP egress fetched through SOCKS5. Stdlib only; both take an
// explicit timeout and fail with a descriptive error, never a hang.
package doctor

import (
	"crypto/tls"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"net/url"
	"strings"
	"time"
)

// QueryDNS sends one A query for name to a UDP DNS server (the Tor DNSPort
// listener) and requires a NOERROR answer carrying at least one record. A
// timed-out or refused query is an error: silent DNS failure would leak.
func QueryDNS(serverAddr, name string, timeout time.Duration) error {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	pkt, id, err := buildQuery(name)
	if err != nil {
		return err
	}
	conn, err := net.DialTimeout("udp", serverAddr, timeout)
	if err != nil {
		return fmt.Errorf("doctor: dns dial %s: %w", serverAddr, err)
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return err
	}
	if _, err := conn.Write(pkt); err != nil {
		return fmt.Errorf("doctor: dns query write: %w", err)
	}
	resp := make([]byte, 512)
	n, err := conn.Read(resp)
	if err != nil {
		return fmt.Errorf("doctor: dns query for %s via %s: %w", name, serverAddr, err)
	}
	return checkResponse(resp[:n], id, name)
}

// buildQuery renders a minimal recursive A query. The ID is fixed per call
// and returned so the reply can be matched (no global randomness needed).
func buildQuery(name string) ([]byte, uint16, error) {
	name = strings.Trim(strings.TrimSpace(name), ".")
	if name == "" {
		return nil, 0, fmt.Errorf("doctor: empty DNS name")
	}
	const id = 0x54d2 // fixed per process call is fine: matched against reply
	var pkt []byte
	pkt = append(pkt, 0x54, 0xd2)       // ID
	pkt = append(pkt, 0x01, 0x00)       // flags: recursion desired
	pkt = append(pkt, 0x00, 0x01)       // QDCOUNT = 1
	pkt = append(pkt, 0x00, 0x00)       // ANCOUNT
	pkt = append(pkt, 0x00, 0x00)       // NSCOUNT
	pkt = append(pkt, 0x00, 0x00)       // ARCOUNT
	for _, label := range strings.Split(name, ".") {
		if len(label) == 0 || len(label) > 63 {
			return nil, 0, fmt.Errorf("doctor: bad DNS label in %q", name)
		}
		pkt = append(pkt, byte(len(label)))
		pkt = append(pkt, label...)
	}
	pkt = append(pkt, 0x00)             // root
	pkt = append(pkt, 0x00, 0x01)       // QTYPE A
	pkt = append(pkt, 0x00, 0x01)       // QCLASS IN
	return pkt, id, nil
}

// checkResponse validates ID match, NOERROR rcode, and ANCOUNT > 0.
func checkResponse(resp []byte, id uint16, name string) error {
	if len(resp) < 12 {
		return fmt.Errorf("doctor: dns reply for %s too short (%d bytes)", name, len(resp))
	}
	if binary.BigEndian.Uint16(resp[0:2]) != id {
		return fmt.Errorf("doctor: dns reply ID mismatch for %s", name)
	}
	if rcode := resp[3] & 0x0f; rcode != 0 {
		return fmt.Errorf("doctor: dns query for %s refused by server (rcode %d)", name, rcode)
	}
	if binary.BigEndian.Uint16(resp[6:8]) == 0 {
		return fmt.Errorf("doctor: dns query for %s answered with no records", name)
	}
	return nil
}

// maxExitBody caps the egress probe read: the check endpoint answers a
// tiny JSON body, and anything larger is not our page.
const maxExitBody = 64 * 1024

// FetchExitIP GETs path from host:port through the SOCKS endpoint and
// extracts the client IP tor egressed with. The CONNECT uses domain-name
// address type when host is a name, so tor resolves it exit-side (no local
// DNS involved, hence no leak in the probe itself). It supports TLS on
// port 443 and follows HTTP 301/302 redirects.
func FetchExitIP(socksAddr, host string, port int, path string, timeout time.Duration) (string, error) {
	return fetchExitIPWithRedirect(socksAddr, host, port, path, timeout, 3)
}

func fetchExitIPWithRedirect(socksAddr, host string, port int, path string, timeout time.Duration, redirectsLeft int) (string, error) {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	if host == "" || port <= 0 || port > 65535 {
		return "", fmt.Errorf("doctor: bad egress target %q:%d", host, port)
	}
	if path == "" {
		path = "/"
	}
	conn, err := net.DialTimeout("tcp", socksAddr, timeout)
	if err != nil {
		return "", fmt.Errorf("doctor: socks dial %s: %w", socksAddr, err)
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return "", err
	}
	if err := socksHello(conn); err != nil {
		return "", err
	}
	if err := socksConnect(conn, host, port); err != nil {
		return "", err
	}

	var rw io.ReadWriter = conn
	if port == 443 {
		tlsConn := tls.Client(conn, &tls.Config{
			ServerName: host,
		})
		if err := tlsConn.Handshake(); err != nil {
			return "", fmt.Errorf("doctor: tls handshake to %s: %w", host, err)
		}
		defer tlsConn.Close()
		rw = tlsConn
	}

	req := fmt.Sprintf("GET %s HTTP/1.0\r\nHost: %s\r\nConnection: close\r\n\r\n", path, host)
	if _, err := io.WriteString(rw, req); err != nil {
		return "", fmt.Errorf("doctor: egress request write: %w", err)
	}
	raw, err := io.ReadAll(io.LimitReader(rw, maxExitBody))
	if err != nil {
		return "", fmt.Errorf("doctor: egress response read: %w", err)
	}

	rawStr := string(raw)
	head, _, found := strings.Cut(rawStr, "\r\n\r\n")
	if found {
		status := head
		if i := strings.Index(status, "\r\n"); i >= 0 {
			status = status[:i]
		}
		if (strings.Contains(status, " 301 ") || strings.Contains(status, " 302 ")) && redirectsLeft > 0 {
			loc := parseRedirectLocation(head)
			if loc != "" {
				u, err := url.Parse(loc)
				if err == nil {
					nextHost := u.Hostname()
					if nextHost == "" {
						nextHost = host
					}
					nextPort := port
					if u.Scheme == "https" {
						nextPort = 443
					} else if u.Scheme == "http" {
						nextPort = 80
					}
					nextPath := u.RequestURI()
					if nextPath == "" {
						nextPath = "/"
					}
					return fetchExitIPWithRedirect(socksAddr, nextHost, nextPort, nextPath, timeout, redirectsLeft-1)
				}
			}
		}
	}

	return parseExitIP(rawStr)
}

func parseRedirectLocation(head string) string {
	for _, ln := range strings.Split(head, "\r\n") {
		if strings.HasPrefix(strings.ToLower(ln), "location:") {
			return strings.TrimSpace(ln[len("location:"):])
		}
	}
	return ""
}

// socksHello performs the no-auth SOCKS5 greeting.
func socksHello(conn net.Conn) error {
	if _, err := conn.Write([]byte{0x05, 0x01, 0x00}); err != nil {
		return fmt.Errorf("doctor: socks hello write: %w", err)
	}
	resp := make([]byte, 2)
	if _, err := io.ReadFull(conn, resp); err != nil {
		return fmt.Errorf("doctor: socks hello read: %w", err)
	}
	if resp[0] != 0x05 || resp[1] != 0x00 {
		return fmt.Errorf("doctor: not a SOCKS5 server (reply %02x %02x)", resp[0], resp[1])
	}
	return nil
}

// socksConnect issues CONNECT and consumes the reply (including the bound
// address, whose length depends on the reply ATYP).
func socksConnect(conn net.Conn, host string, port int) error {
	var req []byte
	req = append(req, 0x05, 0x01, 0x00)
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
			return fmt.Errorf("doctor: egress hostname too long")
		}
		req = append(req, 0x03, byte(len(host)))
		req = append(req, host...)
	}
	req = append(req, byte(port>>8), byte(port))
	if _, err := conn.Write(req); err != nil {
		return fmt.Errorf("doctor: socks connect write: %w", err)
	}
	hdr := make([]byte, 4)
	if _, err := io.ReadFull(conn, hdr); err != nil {
		return fmt.Errorf("doctor: socks connect read: %w", err)
	}
	if hdr[0] != 0x05 {
		return fmt.Errorf("doctor: bad socks connect reply version %02x", hdr[0])
	}
	if hdr[1] != 0x00 {
		return fmt.Errorf("doctor: socks connect refused (code %02x): exit-side connect to %s failed", hdr[1], host)
	}
	var rest int
	switch hdr[3] {
	case 0x01:
		rest = 4 + 2
	case 0x04:
		rest = 16 + 2
	case 0x03:
		ln := make([]byte, 1)
		if _, err := io.ReadFull(conn, ln); err != nil {
			return fmt.Errorf("doctor: socks bind-addr read: %w", err)
		}
		rest = int(ln[0]) + 2
	default:
		return fmt.Errorf("doctor: bad socks connect address type %02x", hdr[3])
	}
	if _, err := io.CopyN(io.Discard, conn, int64(rest)); err != nil {
		return fmt.Errorf("doctor: socks bind-addr read: %w", err)
	}
	return nil
}

// parseExitIP extracts the egress IP from an HTTP response whose body is
// the check endpoint JSON ({"IsTor":true,"IP":"1.2.3.4"}). Non-200 pages
// and bodies without an IP field are errors, never guesses.
func parseExitIP(raw string) (string, error) {
	head, body, found := strings.Cut(raw, "\r\n\r\n")
	if !found {
		return "", fmt.Errorf("doctor: egress reply is not HTTP")
	}
	status := head
	if i := strings.Index(status, "\r\n"); i >= 0 {
		status = status[:i]
	}
	if !strings.Contains(status, " 200 ") && !strings.HasSuffix(strings.TrimSpace(status), "200") {
		return "", fmt.Errorf("doctor: egress check answered %q", strings.TrimSpace(status))
	}
	idx := strings.Index(body, `"IP"`)
	if idx < 0 {
		return "", fmt.Errorf("doctor: egress reply carries no IP field")
	}
	rest := body[idx+4:]
	colon := strings.Index(rest, ":")
	if colon < 0 {
		return "", fmt.Errorf("doctor: egress reply carries no IP field")
	}
	rest = strings.TrimSpace(rest[colon+1:])
	if !strings.HasPrefix(rest, `"`) {
		return "", fmt.Errorf("doctor: egress reply carries no IP field")
	}
	end := strings.Index(rest[1:], `"`)
	if end < 0 {
		return "", fmt.Errorf("doctor: egress reply carries no IP field")
	}
	ip := rest[1 : 1+end]
	if net.ParseIP(ip) == nil {
		return "", fmt.Errorf("doctor: egress reply IP %q is not an IP address", ip)
	}
	return ip, nil
}
