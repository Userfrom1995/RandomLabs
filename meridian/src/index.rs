//! Inverted index construction and access.

use crate::tokenizer::{tokenize, Token};
use std::collections::BTreeMap;
use std::collections::HashMap;

/// One term occurrence in one document.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Posting {
    pub doc_id: usize,
    pub tf: u32,
    pub positions: Vec<u32>,
}

/// A term and its postings list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TermEntry {
    pub term: String,
    pub df: usize,
    pub postings: Vec<Posting>,
}

/// Immutable per-document metadata.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DocMeta {
    pub id: usize,
    pub title: String,
    pub source: String,
    pub url: String,
    pub length: usize,
}

/// The inverted index: a BTreeMap (sorted by term) of terms plus document
/// metadata and corpus statistics.
#[derive(Debug, Clone)]
pub struct Index {
    pub terms: BTreeMap<String, TermEntry>,
    pub docs: Vec<DocMeta>,
    pub total_docs: usize,
    pub total_tokens: usize,
    pub avg_doc_len: f64,
}

impl Index {
    pub fn doc_len(&self, doc_id: usize) -> usize {
        self.docs
            .get(doc_id)
            .map(|d| d.length)
            .unwrap_or(0)
    }

    pub fn df(&self, term: &str) -> usize {
        self.terms.get(term).map(|t| t.df).unwrap_or(0)
    }

    pub fn entry(&self, term: &str) -> Option<&TermEntry> {
        self.terms.get(term)
    }

    /// The term frequency of `term` in `doc_id`.
    pub fn tf(&self, term: &str, doc_id: usize) -> u32 {
        self.entry(term)
            .and_then(|e| e.postings.iter().find(|p| p.doc_id == doc_id))
            .map(|p| p.tf)
            .unwrap_or(0)
    }

    /// Posting doc ids for a term, sorted ascending.
    pub fn postings(&self, term: &str) -> &[Posting] {
        match self.terms.get(term) {
            Some(e) => &e.postings,
            None => &[],
        }
    }

    /// The sorted positions of `term` in `doc_id` (empty when absent).
    pub fn positions(&self, term: &str, doc_id: usize) -> Vec<u32> {
        self.entry(term)
            .and_then(|e| e.postings.iter().find(|p| p.doc_id == doc_id))
            .map(|p| p.positions.clone())
            .unwrap_or_default()
    }

    /// True when `term` appears among the document's title tokens.
    pub fn title_has(&self, doc_id: usize, term: &str) -> bool {
        self.docs
            .get(doc_id)
            .map(|d| {
                crate::tokenizer::tokenize(&d.title)
                    .iter()
                    .any(|t| t.term == term)
            })
            .unwrap_or(false)
    }
}

/// The documents an index was built from (kept so rebuilds can be compared).
#[derive(Debug, Clone)]
pub struct BuildInput {
    pub titles: Vec<String>,
    pub sources: Vec<String>,
    pub urls: Vec<String>,
}

struct Acc {
    tf: u32,
    positions: Vec<u32>,
}

/// One worker's partial index: per-term per-doc accumulators plus the token
/// lengths of its document range.
type ChunkAcc = (HashMap<String, HashMap<usize, Acc>>, Vec<usize>);

/// Builds an inverted index from documents.
///
/// Deterministic: terms are sorted, postings are sorted by doc id, positions
/// are sorted. Runs single-threaded (see [`build_index_with`] for the
/// thread-pool variant that produces identical output).
pub fn build_index(
    texts: &[&str],
    titles: &[String],
    sources: &[String],
    urls: &[String],
) -> Index {
    build_index_with(texts, titles, sources, urls, 1)
}

/// Builds an inverted index using a fixed worker count.
///
/// The document range is split into `threads` contiguous chunks; each chunk is
/// tokenized on a scoped worker and the per-doc accumulators are merged back
/// in document order. Because docs are disjoint across chunks and every result
/// structure is sorted afterwards, `--threads 1` and `--threads 8` produce
/// byte-identical indexes. `threads <= 1` falls back to the sequential path.
pub fn build_index_with(
    texts: &[&str],
    titles: &[String],
    sources: &[String],
    urls: &[String],
    threads: usize,
) -> Index {
    let n = texts.len();
    if threads <= 1 || n < 2 {
        return build_sequential(texts, titles, sources, urls);
    }

    let chunk = n.div_ceil(threads);
    let mut chunks: Vec<ChunkAcc> = Vec::new();
    std::thread::scope(|s| {
        let mut handles = Vec::new();
        for start in (0..n).step_by(chunk) {
            let end = (start + chunk).min(n);
            handles.push(s.spawn(move || {
                let mut acc: HashMap<String, HashMap<usize, Acc>> = HashMap::new();
                let mut lens = Vec::with_capacity(end - start);
                for (offset, text) in texts[start..end].iter().enumerate() {
                    let doc_id = start + offset;
                    let tokens = tokenize(text);
                    let mut seen: HashMap<&str, Acc> = HashMap::new();
                    for t in &tokens {
                        let a = seen
                            .entry(t.term.as_str())
                            .or_insert_with(|| Acc {
                                tf: 0,
                                positions: Vec::new(),
                            });
                        a.tf += 1;
                        a.positions.push(t.position as u32);
                    }
                    for (term, a) in seen {
                        acc.entry(term.to_string()).or_default().insert(doc_id, a);
                    }
                    lens.push(tokens.len());
                }
                (acc, lens)
            }));
        }
        for h in handles {
            chunks.push(h.join().unwrap_or_default());
        }
    });

    let mut acc: HashMap<String, HashMap<usize, Acc>> = HashMap::new();
    let mut lengths: Vec<usize> = Vec::with_capacity(n);
    for (partial, lens) in chunks {
        lengths.extend(lens);
        for (term, per_doc) in partial {
            let merged = acc.entry(term).or_default();
            for (doc_id, a) in per_doc {
                merged.insert(doc_id, a);
            }
        }
    }
    finish_index(acc, lengths, titles, sources, urls)
}

fn build_sequential(
    texts: &[&str],
    titles: &[String],
    sources: &[String],
    urls: &[String],
) -> Index {
    let mut acc: HashMap<String, HashMap<usize, Acc>> = HashMap::new();
    let mut lengths: Vec<usize> = Vec::with_capacity(texts.len());

    for (doc_id, text) in texts.iter().enumerate() {
        let tokens: Vec<Token> = tokenize(text);
        let mut seen: HashMap<&str, Acc> = HashMap::new();
        for t in &tokens {
            let a = seen
                .entry(t.term.as_str())
                .or_insert_with(|| Acc {
                    tf: 0,
                    positions: Vec::new(),
                });
            a.tf += 1;
            a.positions.push(t.position as u32);
        }
        for (term, a) in seen {
            acc.entry(term.to_string()).or_default().insert(doc_id, a);
        }
        lengths.push(tokens.len());
    }

    finish_index(acc, lengths, titles, sources, urls)
}

fn finish_index(
    acc: HashMap<String, HashMap<usize, Acc>>,
    lengths: Vec<usize>,
    titles: &[String],
    sources: &[String],
    urls: &[String],
) -> Index {
    let total_docs = lengths.len();
    let total_tokens: usize = lengths.iter().sum();
    let avg_doc_len = if total_docs == 0 {
        0.0
    } else {
        total_tokens as f64 / total_docs as f64
    };

    let mut terms = BTreeMap::new();
    for (term, per_doc) in acc {
        let mut postings: Vec<Posting> = per_doc
            .into_iter()
            .map(|(doc_id, a)| {
                let mut positions = a.positions;
                positions.sort_unstable();
                Posting {
                    doc_id,
                    tf: a.tf,
                    positions,
                }
            })
            .collect();
        postings.sort_by_key(|p| p.doc_id);
        let df = postings.len();
        terms.insert(
            term.clone(),
            TermEntry {
                term,
                df,
                postings,
            },
        );
    }

    let docs = (0..total_docs)
        .map(|id| DocMeta {
            id,
            title: titles.get(id).cloned().unwrap_or_default(),
            source: sources.get(id).cloned().unwrap_or_default(),
            url: urls.get(id).cloned().unwrap_or_default(),
            length: lengths[id],
        })
        .collect();

    Index {
        terms,
        docs,
        total_docs,
        total_tokens,
        avg_doc_len,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn title(s: &str) -> String {
        s.to_string()
    }

    #[test]
    fn builds_sorted_index() {
        let texts = [
            "the quick brown fox",
            "the lazy dog",
            "quick red fox jumps",
        ];
        let titles = ["a", "b", "c"].map(title);
        let sources = ["a.txt", "b.txt", "c.txt"].map(title);
        let urls = sources.clone();
        let idx = build_index(&texts, &titles, &sources, &urls);

        assert_eq!(idx.total_docs, 3);
        assert_eq!(idx.total_tokens, 11);
        assert!((idx.avg_doc_len - (11.0 / 3.0)).abs() < 1e-9);

        let first = idx.terms.keys().next().unwrap();
        assert_eq!(first, "brown");
        assert_eq!(idx.terms.keys().next().unwrap(), "brown");

        let fox = idx.entry("fox").unwrap();
        assert_eq!(fox.df, 2);
        assert_eq!(fox.postings.len(), 2);
        assert_eq!(fox.postings[0].doc_id, 0);
        assert_eq!(fox.postings[1].doc_id, 2);
        assert_eq!(fox.postings[0].positions, vec![3]);
        assert_eq!(fox.postings[1].positions, vec![2]);
    }

    #[test]
    fn tf_and_doc_len() {
        let texts = ["alpha beta alpha", "beta gamma"];
        let titles = ["a", "b"].map(title);
        let sources = ["a", "b"].map(title);
        let urls = sources.clone();
        let idx = build_index(&texts, &titles, &sources, &urls);
        assert_eq!(idx.tf("alpha", 0), 2);
        assert_eq!(idx.tf("alpha", 1), 0);
        assert_eq!(idx.doc_len(0), 3);
        assert_eq!(idx.doc_len(1), 2);
        assert_eq!(idx.df("beta"), 2);
    }

    #[test]
    fn missing_terms_are_empty() {
        let texts = ["hello"];
        let titles = ["h"].map(title);
        let sources = ["h"].map(title);
        let urls = sources.clone();
        let idx = build_index(&texts, &titles, &sources, &urls);
        assert!(idx.entry("nope").is_none());
        assert!(idx.postings("nope").is_empty());
    }

    #[test]
    fn empty_corpus_is_ok() {
        let idx = build_index(&[], &[], &[], &[]);
        assert_eq!(idx.total_docs, 0);
        assert_eq!(idx.avg_doc_len, 0.0);
    }

    #[test]
    fn title_has_checks_the_title_tokens() {
        let texts = ["some body text", "more body text"];
        let titles: Vec<String> = ["Alpha search engine", "Beta"].iter().map(|s| s.to_string()).collect();
        let sources = titles.clone();
        let urls = titles.clone();
        let idx = build_index(&texts, &titles, &sources, &urls);
        assert!(idx.title_has(0, "alpha"));
        assert!(idx.title_has(0, "engine"));
        assert!(!idx.title_has(0, "body"), "title check must ignore body text");
        assert!(!idx.title_has(1, "alpha"));
    }

    #[test]
    fn threaded_build_matches_sequential_byte_for_byte() {
        let texts = [
            "the quick brown fox jumps over the lazy dog",
            "rust is a systems programming language",
            "搜索引擎 检索 索引 全文 搜索",
            "日本語の文章とひらがなとカタカナ",
            "quick red fox and rust and the dog",
            "a b c d e f g h i j k l m n",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("doc {} title", i)).collect();
        let sources = titles.clone();
        let urls = titles.clone();
        let seq = build_index_with(&texts, &titles, &sources, &urls, 1);
        for threads in [2usize, 3, 5, 8] {
            let par = build_index_with(&texts, &titles, &sources, &urls, threads);
            assert_eq!(par.terms, seq.terms, "terms differ at threads={}", threads);
            assert_eq!(par.docs, seq.docs, "docs differ at threads={}", threads);
            assert_eq!(par.total_tokens, seq.total_tokens);
            assert!((par.avg_doc_len - seq.avg_doc_len).abs() < 1e-12);
        }
    }

    #[test]
    fn positions_accessor_returns_doc_positions() {
        let texts = ["alpha beta alpha"];
        let titles = ["t"].map(title);
        let idx = build_index(&texts, &titles, &titles, &titles);
        assert_eq!(idx.positions("alpha", 0), vec![0, 2]);
        assert!(idx.positions("alpha", 5).is_empty());
        assert!(idx.positions("nope", 0).is_empty());
    }
}