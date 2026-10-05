//go:build linux

package term

import (
	"os"
	"syscall"
	"unsafe"
)

type linuxTermios struct {
	Iflag  uint32
	Oflag  uint32
	Cflag  uint32
	Lflag  uint32
	Line   uint8
	Cc     [32]byte
	Ispeed uint32
	Ospeed uint32
}

const (
	linuxTCGETS     = 0x5401
	linuxTCSETS     = 0x5402
	linuxTIOCGWINSZ = 0x5413

	linuxICANON = 0x0002
	linuxECHO   = 0x0008
	linuxISIG   = 0x0001
	linuxIXON   = 0x0400
	linuxICRNL  = 0x0100
	linuxOPOST  = 0x0001
	linuxVMIN   = 6
	linuxVTIME  = 5
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
		uintptr(os.Stdout.Fd()), uintptr(linuxTIOCGWINSZ), uintptr(unsafe.Pointer(&ws)))
	if ws.Col == 0 || ws.Row == 0 {
		return 80, 24
	}
	return int(ws.Col), int(ws.Row)
}

func setRaw(f *os.File) (func(), error) {
	var t linuxTermios
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
		uintptr(linuxTCGETS), uintptr(unsafe.Pointer(&t))); errno != 0 {
		return func() {}, errno
	}
	orig := t
	t.Lflag &^= linuxICANON | linuxECHO | linuxISIG
	t.Iflag &^= linuxIXON | linuxICRNL
	t.Oflag &^= linuxOPOST
	t.Cc[linuxVMIN] = 0
	t.Cc[linuxVTIME] = 1
	if _, _, errno := syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
		uintptr(linuxTCSETS), uintptr(unsafe.Pointer(&t))); errno != 0 {
		return func() {}, errno
	}
	return func() {
		syscall.Syscall(syscall.SYS_IOCTL, f.Fd(),
			uintptr(linuxTCSETS), uintptr(unsafe.Pointer(&orig)))
	}, nil
}
