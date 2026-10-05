//go:build unix

package main

import (
	"os"
	"syscall"

	"randomlabs/terminal-browser/internal/term"
)

func sigWinch() os.Signal { return syscall.SIGWINCH }

func liveSize(caps term.Capabilities) (int, int) {
	w, h := term.CurrentSize()
	if w <= 0 || h <= 0 {
		return caps.Width, caps.Height
	}
	return w, h
}

func readLoop(events chan<- []byte, done <-chan struct{}) {
	buf := make([]byte, 1024)
	for {
		n, err := os.Stdin.Read(buf)
		if n > 0 {
			cp := make([]byte, n)
			copy(cp, buf[:n])
			select {
			case events <- cp:
			case <-done:
				return
			}
		}
		if err != nil {
			return
		}
		select {
		case <-done:
			return
		default:
		}
	}
}
