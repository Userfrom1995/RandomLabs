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

/// Builds an inverted index from documents.
///
/// Deterministic: terms are sorted, postings are sorted by doc id, positions
/// are sorted.
pub fn build_index(
    texts: &[&str],
    titles: &[String],
    sources: &[String],
    urls: &[String],
) -> Index {
    let mut acc: HashMap<String, HashMap<usize, Acc>> = HashMap::new();
    let mut lengths: Vec<usize> = Vec::with_capacity(texts.len());
    let mut total_tokens: usize = 0;

    for (doc_id, text) in texts.iter().enumerate() {
        let tokens: Vec<Token> = tokenize(text);
        let mut seen: HashMap<&str, Acc> = HashMap::new();
        for t in &tokens {
            let acc = seen
                .entry(t.term.as_str())
                .or_insert_with(|| Acc {
                    tf: 0,
                    positions: Vec::new(),
                });
            acc.tf += 1;
            acc.positions.push(t.position as u32);
        }
        for (term, a) in seen {
            acc.entry(term.to_string())
                .or_default()
                .insert(doc_id, a);
        }
        lengths.push(tokens.len());
        total_tokens += tokens.len();
    }

    let total_docs = texts.len();
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

/// The tokens of a document (used by snippet generation and demos).
pub fn document_tokens(text: &str) -> Vec<Token> {
    tokenize(text)
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
}