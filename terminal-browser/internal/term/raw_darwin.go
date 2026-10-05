//go:build darwin

package term

import (
	"os"
	"syscall"
	"unsafe"
)

type darwinTermios struct {
	Iflag  uint64
	Oflag  uint64
	Cflag  uint64
	Lflag  uint64
	Cc     [20]byte
	Ispeed uint64
	Ospeed uint64
}

const (
	darwinTIOCGETA   = 0x40487413
	darwinTIOCSETA   = 0x80487414
	darwinTIOCGWINSZ = 0x40087468

	darwinICANON = 0x00000100
	darwinECHO   = 0x00000008
	darwinISIG   = 0x00000080
	darwinIXON   = 0x00000200
	darwinICRNL  = 0x00000100
	darwinOPOST  = 0x00000001
	darwinVMIN   = 16
	darwinVTIME  = 17
)

type winsize struct {
	Row, Col, X, Y uint16
}

func isCharDevice() bool {
	for _, f := range []*os.File{os.Stdout, os.Stdin} {
		fi, err := f.Stat()
		if err == nil && fi.Mode()&os.ModeCharDevice != 0 {
			return true
		}
	}
	return false
}

func termSize() (int, int) {
	if w, h := sizeFromEnv(); w > 0 {
		return w, h
	}
	var ws winsize
	_, _, _ = syscall.Syscall(syscall.SYS_IOCTL,
		uintptr(os.Stdout.Fd()), uintptr(darwinTIOCGWINSZ), uintptr(unsafe.Pointer(&ws)))
	if ws.Col == 0 || ws.Row == 0 {
		return 80, 24
	}
	return int(ws.Col), int(ws.Row)
}

// setRaw switches the terminal to raw mode for the query window and
// returns a restore function.
func setRaw(f *os.File) (func(), error) {
	var t darwinTermios
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
		uintptr(darwinTIOCGETA), uintptr(unsafe.Pointer(&t))); errno != 0 {
		return func() {}, errno
	}
	orig := t
	t.Lflag &^= darwinICANON | darwinECHO | darwinISIG
	t.Iflag &^= darwinIXON | darwinICRNL
	t.Oflag &^= darwinOPOST
	t.Cc[darwinVMIN] = 0
	t.Cc[darwinVTIME] = 1
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
		uintptr(darwinTIOCSETA), uintptr(unsafe.Pointer(&t))); errno != 0 {
		return func() {}, errno
	}
	return func() {
		syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
			uintptr(darwinTIOCSETA), uintptr(unsafe.Pointer(&orig)))
	}, nil
}
