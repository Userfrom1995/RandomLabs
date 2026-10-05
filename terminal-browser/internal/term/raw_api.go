package term

import "os"

// EnterRaw switches stdin to raw mode for the interactive loop and
// returns a restore function.
func EnterRaw() (func(), error) { return setRaw(os.Stdin) }

// CurrentSize reports the live terminal size.
func CurrentSize() (int, int) { return termSize() }
