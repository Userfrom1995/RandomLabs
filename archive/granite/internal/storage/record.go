package storage

import (
	"encoding/binary"
	"errors"
	"math"

	"github.com/Userfrom1995/Random/granite/internal/sql"
)

// Value serialization tags.
const (
	tagNull = 0x00
	tagInt  = 0x01
	tagReal = 0x02
	tagText = 0x03
)

// encodeValue serializes a single value.
func encodeValue(v sql.Value) []byte {
	switch v.Kind() {
	case sql.KindNull:
		return []byte{tagNull}
	case sql.KindInt:
		i, _ := v.Int()
		b := make([]byte, 9)
		b[0] = tagInt
		binary.BigEndian.PutUint64(b[1:], uint64(i))
		return b
	case sql.KindReal:
		f, _ := v.Real()
		b := make([]byte, 9)
		b[0] = tagReal
		binary.BigEndian.PutUint64(b[1:], math.Float64bits(f))
		return b
	case sql.KindText:
		s, _ := v.Text()
		b := make([]byte, 1+4+len(s))
		b[0] = tagText
		binary.BigEndian.PutUint32(b[1:5], uint32(len(s)))
		copy(b[5:], s)
		return b
	}
	return []byte{tagNull}
}

func decodeValue(b []byte) (sql.Value, error) {
	if len(b) == 0 {
		return sql.Value{}, errors.New("empty value encoding")
	}
	switch b[0] {
	case tagNull:
		return sql.NullValue(), nil
	case tagInt:
		if len(b) < 9 {
			return sql.Value{}, errors.New("short int encoding")
		}
		return sql.IntValue(int64(binary.BigEndian.Uint64(b[1:]))), nil
	case tagReal:
		if len(b) < 9 {
			return sql.Value{}, errors.New("short real encoding")
		}
		return sql.RealValue(math.Float64frombits(binary.BigEndian.Uint64(b[1:]))), nil
	case tagText:
		if len(b) < 5 {
			return sql.Value{}, errors.New("short text encoding")
		}
		n := int(binary.BigEndian.Uint32(b[1:5]))
		if len(b) < 5+n {
			return sql.Value{}, errors.New("short text payload")
		}
		return sql.TextValue(string(b[5 : 5+n])), nil
	}
	return sql.Value{}, errors.New("unknown value tag")
}

// encodeRow serializes a full row of values.
func encodeRow(vals []sql.Value) []byte {
	var out []byte
	for _, v := range vals {
		out = append(out, encodeValue(v)...)
	}
	return out
}

// decodeRow deserializes a full row of the given width.
func decodeRow(b []byte, width int) ([]sql.Value, error) {
	vals := make([]sql.Value, 0, width)
	off := 0
	for i := 0; i < width; i++ {
		if off >= len(b) {
			return nil, errors.New("short row encoding")
		}
		switch b[off] {
		case tagNull:
			vals = append(vals, sql.NullValue())
			off++
		case tagInt, tagReal:
			if off+9 > len(b) {
				return nil, errors.New("short numeric encoding")
			}
			v, err := decodeValue(b[off : off+9])
			if err != nil {
				return nil, err
			}
			vals = append(vals, v)
			off += 9
		case tagText:
			if off+5 > len(b) {
				return nil, errors.New("short text header")
			}
			n := int(binary.BigEndian.Uint32(b[off+1 : off+5]))
			if off+5+n > len(b) {
				return nil, errors.New("short text payload")
			}
			v, err := decodeValue(b[off : off+5+n])
			if err != nil {
				return nil, err
			}
			vals = append(vals, v)
			off += 5 + n
		default:
			return nil, errors.New("bad row encoding")
		}
	}
	return vals, nil
}

// rowKey encodes an int64 rowid as the b-tree key.
func rowKey(rowid int64) []byte {
	b := make([]byte, 8)
	binary.BigEndian.PutUint64(b, uint64(rowid))
	return b
}

func keyRowid(b []byte) int64 {
	return int64(binary.BigEndian.Uint64(b))
}