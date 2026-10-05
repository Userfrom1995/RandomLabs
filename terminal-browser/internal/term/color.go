// Package term owns terminal capability probing, the frame compositor,
// and input codecs. It never fetches web content; it owns the grid.
package term

// RGB is a 24-bit color triplet used for both cells and image pixels.
type RGB struct {
	R, G, B uint8
}

// Equal reports whether two colors match exactly.
func (c RGB) Equal(o RGB) bool { return c.R == o.R && c.G == o.G && c.B == o.B }

// Luminance returns a 0-255 perceptual brightness estimate used by the
// ASCII fallback path.
func (c RGB) Luminance() uint8 {
	return uint8((uint16(c.R)*299 + uint16(c.G)*587 + uint16(c.B)*114) / 1000)
}

// To256 maps the color onto the 6x6x6 xterm cube (16-231).
func (c RGB) To256() int {
	r := int(c.R) * 5 / 255
	g := int(c.G) * 5 / 255
	b := int(c.B) * 5 / 255
	return 16 + 36*r + 6*g + b
}

// To16 maps the color onto the 16-color ANSI palette index.
func (c RGB) To16() int {
	v := c.Luminance()
	base := 0
	if c.R > 128 {
		base |= 1
	}
	if c.G > 128 {
		base |= 2
	}
	if c.B > 128 {
		base |= 4
	}
	if v > 128 {
		base |= 8
	}
	return base
}
