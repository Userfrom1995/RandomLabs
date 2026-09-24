//! Fuzzy and typo-tolerant retrieval: Levenshtein edit distance and a BK-tree
//! (Burkhard-Keller tree) built over the vocabulary that answers
//! "which terms are within edit distance `max` of this word?".
//!
//! Levenshtein distance over Unicode scalar sequences is a true metric, so the
//! BK-tree's triangle-inequality pruning is sound: every vocabulary term within
//! the requested distance is found. The result list is sorted by
//! `(distance, term)` so both engines (Rust and the JS mirror) always agree on
//! the exact order.

use std::collections::BTreeMap;

/// The Levenshtein edit distance between two strings, over Unicode scalar
/// values (Rust `char`s, JavaScript code points).
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let (n, m) = (a.len(), b.len());
    if n == 0 {
        return m;
    }
    if m == 0 {
        return n;
    }
    // Classic two-row dynamic program. `prev[j]` holds the distance between
    // a[0..i-1] and b[0..j]; `cur[j]` the distance for the current row.
    let mut prev: Vec<usize> = (0..=m).collect();
    let mut cur = vec![0usize; m + 1];
    for i in 1..=n {
        cur[0] = i;
        let ai = a[i - 1];
        for j in 1..=m {
            let cost = if ai == b[j - 1] { 0 } else { 1 };
            cur[j] = (prev[j] + 1) // deletion
                .min(cur[j - 1] + 1) // insertion
                .min(prev[j - 1] + cost); // substitution
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[m]
}

/// A BK-tree node. Children are keyed by the edit distance to their parent.
#[derive(Debug, Default)]
struct Node {
    term: String,
    children: Vec<(usize, usize)>, // (distance, child index)
}

/// A BK-tree over a vocabulary, answering within-distance term lookups.
#[derive(Debug, Default)]
pub struct BkTree {
    nodes: Vec<Node>,
    index_of: BTreeMap<String, usize>,
}

impl BkTree {
    /// Builds a tree from a set of terms. Terms are inserted in sorted order
    /// so the tree shape (and therefore the search walk order) is
    /// deterministic across runs and across the two engines.
    pub fn build<'a>(terms: impl Iterator<Item = &'a str>) -> BkTree {
        let mut tree = BkTree::default();
        for t in terms {
            tree.insert(t);
        }
        tree
    }

    fn insert(&mut self, term: &str) {
        if self.nodes.is_empty() {
            self.nodes.push(Node {
                term: term.to_string(),
                children: Vec::new(),
            });
            self.index_of.insert(term.to_string(), 0);
            return;
        }
        let mut idx = 0;
        loop {
            let node = &self.nodes[idx];
            if node.term == term {
                return; // already present
            }
            let d = levenshtein(term, &node.term);
            match node.children.iter().find(|(dist, _)| *dist == d) {
                Some((_, child)) => idx = *child,
                None => {
                    let new_idx = self.nodes.len();
                    self.nodes[idx].children.push((d, new_idx));
                    self.nodes.push(Node {
                        term: term.to_string(),
                        children: Vec::new(),
                    });
                    self.index_of.insert(term.to_string(), new_idx);
                    return;
                }
            }
        }
    }

    /// Whether a term is a member of the vocabulary.
    pub fn contains(&self, term: &str) -> bool {
        self.index_of.contains_key(term)
    }

    /// Every vocabulary term within `max` edits of `query`, sorted by
    /// `(distance, term)`. The triangle inequality lets us skip entire child
    /// subtrees whose distance range cannot reach `query`.
    pub fn search(&self, query: &str, max: usize) -> Vec<(String, usize)> {
        let mut out = Vec::new();
        if self.nodes.is_empty() {
            return out;
        }
        let mut stack = vec![0usize];
        while let Some(idx) = stack.pop() {
            let node = &self.nodes[idx];
            let d = levenshtein(query, &node.term);
            if d <= max {
                out.push((node.term.clone(), d));
            }
            let lo = d.saturating_sub(max);
            let hi = d + max;
            for (dist, child) in &node.children {
                if *dist >= lo && *dist <= hi {
                    stack.push(*child);
                }
            }
        }
        out.sort();
        out
    }
}

/// Builds a BK-tree from an index's term table.
pub fn build_bk<'a>(terms: impl Iterator<Item = &'a str>) -> BkTree {
    BkTree::build(terms)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn levenshtein_vectors() {
        assert_eq!(levenshtein("", ""), 0);
        assert_eq!(levenshtein("kitten", "sitting"), 3);
        assert_eq!(levenshtein("flaw", "lawn"), 2);
        assert_eq!(levenshtein("book", "back"), 2);
        assert_eq!(levenshtein("same", "same"), 0);
        assert_eq!(levenshtein("abc", "abcdef"), 3);
        assert_eq!(levenshtein("rust", "rusting"), 3);
        // Unicode: distance over scalar sequences.
        assert_eq!(levenshtein("café", "cafe"), 1);
        assert_eq!(levenshtein("搜索引擎", "索引擎"), 1);
    }

    #[test]
    fn levenshtein_is_a_metric() {
        // Symmetry + zero-on-identity.
        for (a, b) in [("rust", "rusty"), ("search", "seach"), ("引擎", "索引")] {
            assert_eq!(levenshtein(a, b), levenshtein(b, a));
        }
        assert_eq!(levenshtein("abc", "abc"), 0);
    }

    fn sample_terms() -> Vec<String> {
        vec![
            "rust".into(),
            "rusty".into(),
            "rusting".into(),
            "search".into(),
            "searching".into(),
            "searches".into(),
            "cargo".into(),
            "bm25".into(),
            "ranking".into(),
            "ranked".into(),
        ]
    }

    #[test]
    fn bk_recall_matches_brute_force() {
        let terms = sample_terms();
        let tree = BkTree::build(terms.iter().map(|s| s.as_str()));
        for query in ["rust", "seach", "rank", "carrgo", "xyzzy", "search"] {
            for max in 0..=3 {
                let via_tree = tree.search(query, max);
                let mut brute: Vec<(String, usize)> = terms
                    .iter()
                    .map(|t| (t.clone(), levenshtein(query, t)))
                    .filter(|(_, d)| *d <= max)
                    .collect();
                brute.sort();
                assert_eq!(via_tree, brute, "recall for {:?} at {}", query, max);
            }
        }
    }

    #[test]
    fn search_sorted_by_distance_then_term() {
        let terms = sample_terms();
        let tree = BkTree::build(terms.iter().map(|s| s.as_str()));
        let res = tree.search("rust", 2);
        assert_eq!(res[0], ("rust".to_string(), 0));
        for w in res.windows(2) {
            assert!(
                w[0].1 < w[1].1 || (w[0].1 == w[1].1 && w[0].0 <= w[1].0),
                "sort order violated: {:?} then {:?}",
                w[0],
                w[1]
            );
        }
    }

    #[test]
    fn contains_and_nearest() {
        let terms = sample_terms();
        let tree = BkTree::build(terms.iter().map(|s| s.as_str()));
        assert!(tree.contains("rust"));
        assert!(!tree.contains("ruust"));
        let near = tree.search("seach", 2);
        assert_eq!(near[0], ("search".to_string(), 1));
    }

    #[test]
    fn empty_tree() {
        let tree = BkTree::build(std::iter::empty());
        assert!(tree.search("anything", 5).is_empty());
        assert!(!tree.contains("anything"));
    }
}