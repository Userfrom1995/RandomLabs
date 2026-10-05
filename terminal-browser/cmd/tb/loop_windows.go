//go:build windows

package main

import (
	"os"

	"randomlabs/terminal-browser/internal/term"
)

func sigWinch() os.Signal { return os.Interrupt }

func liveSize(caps term.Capabilities) (int, int) { return caps.Width, caps.Height }

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
