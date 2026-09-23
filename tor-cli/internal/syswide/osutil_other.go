//go:build !linux

package syswide

// Non-Linux stubs: every syswide mutation is gated by RequireLinux first,
// so these only keep the package compiling for M4 ports.

func myEuid() int { return -1 }

func pidAlive(pid int) bool { return false }

func termPid(pid int) error { return ErrUnsupportedOS }

func killPid(pid int) error { return ErrUnsupportedOS }
