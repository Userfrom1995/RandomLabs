//! Fielded search: load-time per-document token sets for the `title` and
//! `source` metadata fields, used to restrict a query leaf to one field.
//!
//! The fields are derived at load time from the already-exported document
//! metadata (`title`, `source` strings), so the index format itself never
//! changes. A field-scoped term (`title:rust`, `source:docs*`) matches a
//! document exactly when the field's token set holds any of the term's
//! expanded index terms.

use crate::index::Index;
use crate::tokenizer::tokenize;
use std::collections::HashSet;

/// The searchable metadata fields.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Field {
    Title,
    Source,
}

impl Field {
    /// Parses a field name from the lexer's `title:` / `source:` prefixes.
    pub fn parse(s: &str) -> Option<Field> {
        match s {
            "title" => Some(Field::Title),
            "source" => Some(Field::Source),
            _ => None,
        }
    }

    /// The display name used in the query syntax and breakdown rows.
    pub fn name(self) -> &'static str {
        match self {
            Field::Title => "title",
            Field::Source => "source",
        }
    }
}

/// Per-document token sets for every searchable field.
#[derive(Debug, Clone, Default)]
pub struct Fields {
    title: Vec<HashSet<String>>,
    source: Vec<HashSet<String>>,
}

impl Fields {
    /// Builds the field token sets from an index's document metadata.
    pub fn build(index: &Index) -> Fields {
        let title = index
            .docs
            .iter()
            .map(|d| tokenize(&d.title).into_iter().map(|t| t.term).collect())
            .collect();
        let source = index
            .docs
            .iter()
            .map(|d| tokenize(&d.source).into_iter().map(|t| t.term).collect())
            .collect();
        Fields { title, source }
    }

    fn set(&self, field: Field, doc_id: usize) -> Option<&HashSet<String>> {
        match field {
            Field::Title => self.title.get(doc_id),
            Field::Source => self.source.get(doc_id),
        }
    }

    /// True when `term` is present in `doc_id`'s `field` token set.
    pub fn contains(&self, field: Field, doc_id: usize, term: &str) -> bool {
        self.set(field, doc_id)
            .map(|s| s.contains(term))
            .unwrap_or(false)
    }

    /// The sorted doc ids whose `field` token set contains any of `terms`.
    /// Result is already ascending (documents are visited in id order).
    pub fn field_docs(&self, field: Field, terms: &[String]) -> Vec<usize> {
        let sets = match field {
            Field::Title => &self.title,
            Field::Source => &self.source,
        };
        let mut out = Vec::new();
        for (doc_id, set) in sets.iter().enumerate() {
            if terms.iter().any(|t| set.contains(t)) {
                out.push(doc_id);
            }
        }
        out
    }

    /// The distinct field tokens matching a wildcard `pattern`, in sorted
    /// order. Fielded wildcards (`source:docs*`) must expand against the
    /// field's own vocabulary, which is not part of the index term
    /// dictionary, so this walks the per-document sets instead.
    pub fn expand_wildcard(&self, field: Field, pattern: &str) -> Vec<String> {
        let sets = match field {
            Field::Title => &self.title,
            Field::Source => &self.source,
        };
        let vocab: std::collections::BTreeSet<&str> =
            sets.iter().flat_map(|s| s.iter().map(|t| t.as_str())).collect();
        let mut out: Vec<String> = vocab
            .iter()
            .filter(|t| crate::wildcard::pattern_matches(pattern, t))
            .map(|t| t.to_string())
            .collect();
        out.sort();
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Index {
        let texts = [
            "search engine internals and rust code",
            "a database for storage engines",
            "rust web framework for search apis",
        ];
        let titles: Vec<String> = [
            "Search engine postings",
            "Database storage",
            "Rust search api",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let sources: Vec<String> = [
            "docs/articles/search.md",
            "docs/db/storage.md",
            "src/api.rs",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        crate::index::build_index(&texts, &titles, &sources, &sources)
    }

    #[test]
    fn builds_per_field_sets() {
        let idx = sample();
        let fields = Fields::build(&idx);
        assert!(fields.contains(Field::Title, 0, "search"));
        assert!(fields.contains(Field::Title, 0, "engine"));
        assert!(fields.contains(Field::Title, 2, "rust"));
        assert!(!fields.contains(Field::Title, 1, "rust"));
        assert!(fields.contains(Field::Source, 0, "docs"));
        assert!(fields.contains(Field::Source, 0, "articles"));
        assert!(fields.contains(Field::Source, 2, "api"));
        assert!(!fields.contains(Field::Source, 2, "docs"));
    }

    #[test]
    fn field_docs_filters_by_containment() {
        let idx = sample();
        let fields = Fields::build(&idx);
        let title_rust = fields.field_docs(Field::Title, &["rust".to_string()]);
        assert_eq!(title_rust, vec![2]);
        let title_any = fields.field_docs(Field::Title, &["search".to_string(), "database".to_string()]);
        assert_eq!(title_any, vec![0, 1, 2]);
        let src_docs = fields.field_docs(Field::Source, &["docs".to_string()]);
        assert_eq!(src_docs, vec![0, 1]);
        let none = fields.field_docs(Field::Source, &["zzz".to_string()]);
        assert!(none.is_empty());
    }

    #[test]
    fn field_matches_multiple_terms() {
        let idx = sample();
        let fields = Fields::build(&idx);
        // `title:search api` should match any doc whose title has either term.
        let hits = fields.field_docs(Field::Title, &["search".to_string(), "api".to_string()]);
        assert_eq!(hits, vec![0, 2]);
    }

    #[test]
    fn empty_index_has_empty_fields() {
        let idx = Index {
            terms: Default::default(),
            docs: Vec::new(),
            total_docs: 0,
            total_tokens: 0,
            avg_doc_len: 0.0,
        };
        let fields = Fields::build(&idx);
        assert!(fields.field_docs(Field::Title, &["x".to_string()]).is_empty());
        assert!(!fields.contains(Field::Title, 0, "x"));
        assert!(!fields.contains(Field::Source, 0, "x"));
    }
}