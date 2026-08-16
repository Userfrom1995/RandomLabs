//! Ranking functions: BM25 and tf-idf.

use crate::index::Index;

/// The ranking algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Scorer {
    Bm25,
    TfIdf,
}

impl Scorer {
    pub fn parse(s: &str) -> Option<Scorer> {
        match s.to_ascii_lowercase().as_str() {
            "bm25" => Some(Scorer::Bm25),
            "tfidf" | "tf-idf" => Some(Scorer::TfIdf),
            _ => None,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Scorer::Bm25 => "bm25",
            Scorer::TfIdf => "tfidf",
        }
    }
}

/// BM25 parameters (Robertson/Spärck Jones defaults).
pub const BM25_K1: f64 = 1.2;
pub const BM25_B: f64 = 0.75;

/// The smoothed inverse document frequency shared by both scorers:
/// `ln(1 + (N - df + 0.5) / (df + 0.5))`. Documents holding the term get a
/// positive weight; the more documents hold it, the smaller the weight.
pub fn idf(index: &Index, df: usize) -> f64 {
    let n = index.total_docs.max(1) as f64;
    (1.0 + (n - df as f64 + 0.5) / (df as f64 + 0.5)).ln()
}

/// Scores `doc_id` against the given terms with the chosen algorithm.
pub fn score(index: &Index, scorer: Scorer, doc_id: usize, terms: &[String]) -> f64 {
    match scorer {
        Scorer::Bm25 => bm25(index, doc_id, terms),
        Scorer::TfIdf => tf_idf(index, doc_id, terms),
    }
}

/// BM25: `sum over terms present of idf * tf*(k1+1) / (tf + k1*(1-b+b*dl/avgdl))`.
pub fn bm25(index: &Index, doc_id: usize, terms: &[String]) -> f64 {
    let dl = index.doc_len(doc_id) as f64;
    let avgdl = if index.avg_doc_len > 0.0 {
        index.avg_doc_len
    } else {
        1.0
    };
    let norm = 1.0 - BM25_B + BM25_B * (dl / avgdl);
    let mut total = 0.0;
    for term in terms {
        let df = index.df(term);
        if df == 0 {
            continue;
        }
        let tf = index.tf(term, doc_id) as f64;
        if tf == 0.0 {
            continue;
        }
        let idf = idf(index, df);
        let tf_component = tf * (BM25_K1 + 1.0) / (tf + BM25_K1 * norm);
        total += idf * tf_component;
    }
    total
}

/// Classic tf-idf: `sum over terms present of tf * idf`. No length
/// normalization (that is exactly what distinguishes it from BM25).
pub fn tf_idf(index: &Index, doc_id: usize, terms: &[String]) -> f64 {
    let mut total = 0.0;
    for term in terms {
        let df = index.df(term);
        if df == 0 {
            continue;
        }
        let tf = index.tf(term, doc_id) as f64;
        if tf == 0.0 {
            continue;
        }
        total += tf * idf(index, df);
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build() -> Index {
        let texts = [
            "rust rust rust rust rust rust rust rust rust rust", // term heavy in doc 0
            "rust is a systems programming language",
            "the quick brown fox jumps over the lazy dog",
        ];
        let titles = ["a", "b", "c"].map(|s| s.to_string());
        let sources = titles.clone();
        let urls = titles.clone();
        crate::index::build_index(&texts, &titles, &sources, &urls)
    }

    fn q(terms: &[&str]) -> Vec<String> {
        terms.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn bm25_prefers_tf_and_shorter_docs() {
        let idx = build();
        let terms = q(&["rust"]);
        let s0 = bm25(&idx, 0, &terms);
        let s1 = bm25(&idx, 1, &terms);
        let s2 = bm25(&idx, 2, &terms);
        assert!(s0 > s1, "term-heavy doc should outrank one mention");
        assert!(s2 == 0.0, "doc without the term scores zero");
        assert!(s1 > 0.0);
    }

    #[test]
    fn bm25_length_normalizes() {
        let idx = build();
        let terms = q(&["rust"]);
        let s0 = bm25(&idx, 0, &terms);
        let s1 = bm25(&idx, 1, &terms);
        assert!(
            (s0 / s1) < 10.0,
            "length normalization must tame raw tf: {} vs {}",
            s0,
            s1
        );
    }

    #[test]
    fn tfidf_has_no_length_normalization() {
        let idx = build();
        let terms = q(&["rust"]);
        let s0 = tf_idf(&idx, 0, &terms);
        let s1 = tf_idf(&idx, 1, &terms);
        assert!((s0 / s1) >= 10.0, "raw tf-idf scales linearly with tf");
    }

    #[test]
    fn idf_penalizes_common_terms() {
        let idx = build();
        let df_rust = idx.df("rust");
        let df_fox = idx.df("fox");
        assert!(idf(&idx, df_rust) < idf(&idx, df_fox));
    }

    #[test]
    fn scorer_parse() {
        assert_eq!(Scorer::parse("bm25"), Some(Scorer::Bm25));
        assert_eq!(Scorer::parse("TFIDF"), Some(Scorer::TfIdf));
        assert_eq!(Scorer::parse("nonsense"), None);
    }
}