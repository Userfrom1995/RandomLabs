//! Wildcard and prefix retrieval over the sorted vocabulary.
//!
//! Patterns support two metacharacters over ASCII/lowercase text:
//! - `*` matches any run of characters (including the empty run).
//! - `?` matches exactly one character.
//!
//! Every token is case-folded before it reaches this module, so patterns
//! compare directly against the (also lowercase) vocabulary. Expansion never
//! scans the whole vocabulary: the fixed prefix before the first metacharacter
//! bounds the candidate range with a `BTreeMap` range lookup, and only that
//! slice is pattern-tested.

use crate::index::Index;

/// The longest leading run of literal characters in `pattern`, i.e. the text
/// before the first `*` or `?`. Used to bound the candidate range.
pub fn fixed_prefix(pattern: &str) -> String {
    let mut out = String::new();
    for c in pattern.chars() {
        if c == '*' || c == '?' {
            break;
        }
        out.push(c);
    }
    out
}

/// True when `term` matches the wildcard `pattern` (`*` any run, `?` one char).
///
/// Classic dynamic programming over characters; deterministic and exact.
pub fn pattern_matches(pattern: &str, term: &str) -> bool {
    let p: Vec<char> = pattern.chars().collect();
    let t: Vec<char> = term.chars().collect();
    let (np, nt) = (p.len(), t.len());
    let mut dp = vec![vec![false; nt + 1]; np + 1];
    dp[0][0] = true;
    for i in 1..=np {
        if p[i - 1] == '*' {
            dp[i][0] = dp[i - 1][0];
        }
    }
    for i in 1..=np {
        for j in 1..=nt {
            dp[i][j] = match p[i - 1] {
                '*' => dp[i - 1][j] || dp[i][j - 1],
                '?' => dp[i - 1][j - 1],
                c => dp[i - 1][j - 1] && c == t[j - 1],
            };
        }
    }
    dp[np][nt]
}

/// Every vocabulary term matching `pattern`, in sorted vocabulary order.
///
/// The search is bounded to the `BTreeMap` range `[prefix, prefix + U+10FFFF)`
/// where `prefix` is the literal text before the first metacharacter, so
/// patterns like `sear*` only ever touch the `sear...` slice of the vocab.
pub fn expand_wildcard(index: &Index, pattern: &str) -> Vec<String> {
    let prefix = fixed_prefix(pattern);
    let mut out = Vec::new();
    if prefix.is_empty() {
        for t in index.terms.keys() {
            if pattern_matches(pattern, t) {
                out.push(t.clone());
            }
        }
        return out;
    }
    let start = prefix.to_string();
    let end = format!("{}\u{10FFFF}", prefix);
    for (t, _) in index.terms.range(start..end) {
        if pattern_matches(pattern, t) {
            out.push(t.clone());
        }
    }
    out
}

/// The `top` vocabulary terms with the given `prefix`, ranked by
/// `(df desc, term asc)`. Feeds `meridian suggest` and the UI typeahead.
pub fn suggest_prefix(index: &Index, prefix: &str, top: usize) -> Vec<String> {
    if prefix.is_empty() {
        return Vec::new();
    }
    let mut v: Vec<(&str, usize)> = index
        .terms
        .range(prefix.to_string()..format!("{}\u{10FFFF}", prefix))
        .map(|(t, e)| (t.as_str(), e.df))
        .collect();
    v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));
    v.truncate(top);
    v.into_iter().map(|(t, _)| t.to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::build_index;

    fn index_from(terms: &[&str]) -> Index {
        let texts: Vec<String> = terms
            .iter()
            .map(|t| format!("{} and filler text", t))
            .collect();
        let texts: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t{}", i)).collect();
        build_index(&texts, &titles, &titles, &titles)
    }

    #[test]
    fn pattern_matching_basics() {
        assert!(pattern_matches("sear*", "search"));
        assert!(pattern_matches("sear*", "sear"));
        assert!(pattern_matches("sear*", "searching"));
        assert!(!pattern_matches("sear*", "seafood-extra"));
        assert!(pattern_matches("sear?h", "search"));
        assert!(!pattern_matches("sear?h", "sear"));
        assert!(!pattern_matches("sear?h", "searched"));
        assert!(pattern_matches("?earch", "search"));
        assert!(pattern_matches("?earch", "pearch"));
        assert!(!pattern_matches("?earch", "ear"));
        assert!(pattern_matches("a*c", "abc"));
        assert!(pattern_matches("a*c", "ac"));
        assert!(pattern_matches("a*c", "abbc"));
        assert!(!pattern_matches("a*c", "ab"));
        assert!(pattern_matches("t?*", "ta"));
        assert!(pattern_matches("t?*", "tab"));
        assert!(!pattern_matches("t?*", "t"));
    }

    #[test]
    fn fixed_prefix_is_literal_head() {
        assert_eq!(fixed_prefix("sear*"), "sear");
        assert_eq!(fixed_prefix("sear?h"), "sear");
        assert_eq!(fixed_prefix("?earch"), "");
        assert_eq!(fixed_prefix("rust"), "rust");
        assert_eq!(fixed_prefix(""), "");
    }

    #[test]
    fn expansion_is_sorted_and_bounded() {
        let idx = index_from(&["search", "searching", "searched", "second", "socket"]);
        let hits = expand_wildcard(&idx, "sear*");
        assert_eq!(
            hits,
            vec![
                "search".to_string(),
                "searched".to_string(),
                "searching".to_string()
            ]
        );
        // A literal (no metacharacters) with a vocabulary hit returns itself.
        let literal = expand_wildcard(&idx, "socket");
        assert_eq!(literal, vec!["socket".to_string()]);
        let none = expand_wildcard(&idx, "zzz*");
        assert!(none.is_empty());
    }

    #[test]
    fn question_mark_expansion() {
        let idx = index_from(&["search", "searched", "searches"]);
        // `sear?h`: exactly one char between "sear" and "h".
        let hits = expand_wildcard(&idx, "sear?h");
        assert_eq!(hits, vec!["search".to_string()]);
    }

    #[test]
    fn leading_wildcard_scans_all() {
        let idx = index_from(&["search", "rust", "cargo", "bm25"]);
        // `?earch` has an empty fixed prefix, so the full vocab is scanned.
        let hits = expand_wildcard(&idx, "?earch");
        assert_eq!(hits, vec!["search".to_string()]);
        let star = expand_wildcard(&idx, "*rgo");
        assert_eq!(star, vec!["cargo".to_string()]);
    }

    #[test]
    fn expansion_on_empty_vocab() {
        let idx = build_index(&[], &[], &[], &[]);
        assert!(expand_wildcard(&idx, "sear*").is_empty());
    }

    #[test]
    fn suggest_ranks_by_df_then_term() {
        // "search" appears twice, "searched" once, "socket" once.
        let texts = [
            "search and search again",
            "searching and searched",
            "socket the socket",
        ];
        let texts: Vec<&str> = texts.to_vec();
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t{}", i)).collect();
        let idx = build_index(&texts, &titles, &titles, &titles);
        let sug = suggest_prefix(&idx, "se", 10);
        assert_eq!(sug.first().map(|s| s.as_str()), Some("search"));
        assert!(sug.contains(&"searched".to_string()));
        let top1 = suggest_prefix(&idx, "se", 1);
        assert_eq!(top1.len(), 1);
        assert!(suggest_prefix(&idx, "zz", 5).is_empty());
        assert!(suggest_prefix(&idx, "", 5).is_empty());
    }

    #[test]
    fn suggested_terms_are_prefix_completions() {
        let idx = index_from(&["prefix", "prefixes", "prefixed", "other"]);
        let sug = suggest_prefix(&idx, "pref", 10);
        for s in &sug {
            assert!(s.starts_with("pref"), "{} does not start with pref", s);
        }
        assert!(sug.contains(&"prefix".to_string()));
    }
}