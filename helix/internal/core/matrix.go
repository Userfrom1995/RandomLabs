package core

// MatVecMul multiplies D x D matrix (row-major, D*D) by vector D.
func MatVecMul(mat []float32, vec []float32, D int) []float32 {
	out := make([]float32, D)
	for i := 0; i < D; i++ {
		var s float64
		row := i * D
		for j := 0; j < D; j++ {
			s += float64(mat[row+j]) * float64(vec[j])
		}
		out[i] = float32(s)
	}
	return out
}

// Transpose returns transpose of D x D row-major matrix.
func Transpose(mat []float32, D int) []float32 {
	out := make([]float32, D*D)
	for i := 0; i < D; i++ {
		for j := 0; j < D; j++ {
			out[j*D+i] = mat[i*D+j]
		}
	}
	return out
}

// MatMul multiplies A (D x D) by B (D x D).
func MatMul(A, B []float32, D int) []float32 {
	out := make([]float32, D*D)
	for i := 0; i < D; i++ {
		for j := 0; j < D; j++ {
			var s float64
			for k := 0; k < D; k++ {
				s += float64(A[i*D+k]) * float64(B[k*D+j])
			}
			out[i*D+j] = float32(s)
		}
	}
	return out
}

// Identity returns D x D identity.
func Identity(D int) []float32 {
	m := make([]float32, D*D)
	for i := 0; i < D; i++ {
		m[i*D+i] = 1
	}
	return m
}
