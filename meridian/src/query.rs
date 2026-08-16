//! Boolean query parsing and evaluation against the postings.
//!
//! Supported syntax:
//!
//! ```text
//! expr      := or_expr
//! or_expr   := and_expr (OR and_expr)*
//! and_expr  := unary (AND unary)*
//! unary     := NOT unary | primary
//! primary   := '(' expr ')' | TERM | "quoted phrase"
//! ```
//!
//! Terms are case-insensitive. `AND`, `OR`, `NOT` are operators only outside
//! quotes. A query with no operators at all is a ranked search: every term and
//! phrase is scored together (the classic search-engine default). Any query
//! containing an operator or parentheses is a boolean query, evaluated against
//! the postings with sorted-list set operations; `AND` intersections are
//! planned rarest-first.

use crate::index::Index;
use crate::scoring::Scorer;

/// A parsed boolean expression tree.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BoolExpr {
    Term(String),
    Phrase(Vec<String>),
    And(Vec<BoolExpr>),
    Or(Vec<BoolExpr>),
    Not(Box<BoolExpr>),
}

/// A parsed query plan: either a plain ranked search or a boolean expression.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Plan {
    Ranked {
        terms: Vec<String>,
        phrases: Vec<Vec<String>>,
    },
    Bool(BoolExpr),
}

/// One scored result.
#[derive(Debug, Clone, PartialEq)]
pub struct SearchHit {
    pub doc_id: usize,
    pub score: f64,
    /// The query terms present in this document (for snippets and display).
    pub matches: Vec<String>,
    /// Per-term score contributions (for the ranking breakdown UI).
    pub breakdown: Vec<(String, f64)>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum LexTok {
    Term(String),
    Phrase(Vec<String>),
    And,
    Or,
    Not,
    LParen,
    RParen,
}

fn read_word(chars: &mut std::iter::Peekable<std::str::Chars>) -> Option<String> {
    let mut word = String::new();
    while let Some(&c) = chars.peek() {
        if c.is_alphanumeric() {
            for lc in c.to_lowercase() {
                word.push(lc);
            }
            chars.next();
        } else if c == '\'' && !word.is_empty() {
            chars.next();
            if let Some(&n) = chars.peek() {
                if n.is_alphanumeric() {
                    word.push('\'');
                }
            }
        } else {
            break;
        }
    }
    if word.is_empty() {
        None
    } else {
        Some(word)
    }
}

fn lex(query: &str) -> Result<Vec<LexTok>, String> {
    let mut out = Vec::new();
    let mut chars = query.chars().peekable();
    while let Some(&c) = chars.peek() {
        match c {
            ' ' | '\t' | '\n' | '\r' => {
                chars.next();
            }
            '(' => {
                chars.next();
                out.push(LexTok::LParen);
            }
            ')' => {
                chars.next();
                out.push(LexTok::RParen);
            }
            '"' => {
                chars.next();
                let mut phrase = String::new();
                let mut closed = false;
                for inner in chars.by_ref() {
                    if inner == '"' {
                        closed = true;
                        break;
                    }
                    phrase.push(inner);
                }
                if !closed {
                    return Err("unterminated quoted phrase".to_string());
                }
                let words = crate::tokenizer::tokenize(&phrase)
                    .into_iter()
                    .map(|t| t.term)
                    .collect::<Vec<_>>();
                if words.is_empty() {
                    return Err("empty quoted phrase".to_string());
                }
                out.push(LexTok::Phrase(words));
            }
            _ => {
                if let Some(word) = read_word(&mut chars) {
                    match word.as_str() {
                        "and" => out.push(LexTok::And),
                        "or" => out.push(LexTok::Or),
                        "not" => out.push(LexTok::Not),
                        _ => out.push(LexTok::Term(word)),
                    }
                } else {
                    // A separator character that does not start a word:
                    // consume it so the loop makes progress.
                    chars.next();
                }
            }
        }
    }
    Ok(out)
}

/// Parses a query string into a plan. Errors on malformed boolean queries.
pub fn parse_query(query: &str) -> Result<Plan, String> {
    let toks = lex(query)?;
    if toks.is_empty() {
        return Err("empty query".to_string());
    }
    let has_operator = toks.iter().any(|t| {
        matches!(
            t,
            LexTok::And | LexTok::Or | LexTok::Not | LexTok::LParen | LexTok::RParen
        )
    });
    if !has_operator {
        let mut terms = Vec::new();
        let mut phrases = Vec::new();
        for t in toks {
            match t {
                LexTok::Term(s) => terms.push(s),
                LexTok::Phrase(p) => phrases.push(p),
                _ => unreachable!("ranked mode cannot contain operators"),
            }
        }
        Ok(Plan::Ranked { terms, phrases })
    } else {
        let expr = Parser::new(&toks).parse()?;
        Ok(Plan::Bool(expr))
    }
}

struct Parser<'a> {
    toks: &'a [LexTok],
    pos: usize,
}

impl<'a> Parser<'a> {
    fn new(toks: &'a [LexTok]) -> Self {
        Parser { toks, pos: 0 }
    }

    fn peek(&self) -> Option<&LexTok> {
        self.toks.get(self.pos)
    }

    fn next(&mut self) -> Option<LexTok> {
        let t = self.toks.get(self.pos).cloned();
        if t.is_some() {
            self.pos += 1;
        }
        t
    }

    fn parse(mut self) -> Result<BoolExpr, String> {
        let expr = self.parse_or()?;
        if self.pos != self.toks.len() {
            return Err("unexpected trailing tokens".to_string());
        }
        Ok(expr)
    }

    fn parse_or(&mut self) -> Result<BoolExpr, String> {
        let mut parts = vec![self.parse_and()?];
        while let Some(LexTok::Or) = self.peek() {
            self.next();
            parts.push(self.parse_and()?);
        }
        if parts.len() == 1 {
            Ok(parts.pop().unwrap())
        } else {
            Ok(BoolExpr::Or(parts))
        }
    }

    fn parse_and(&mut self) -> Result<BoolExpr, String> {
        let mut parts = vec![self.parse_unary()?];
        while let Some(LexTok::And) = self.peek() {
            self.next();
            parts.push(self.parse_unary()?);
        }
        if parts.len() == 1 {
            Ok(parts.pop().unwrap())
        } else {
            Ok(BoolExpr::And(parts))
        }
    }

    fn parse_unary(&mut self) -> Result<BoolExpr, String> {
        if let Some(LexTok::Not) = self.peek() {
            self.next();
            Ok(BoolExpr::Not(Box::new(self.parse_unary()?)))
        } else {
            self.parse_primary()
        }
    }

    fn parse_primary(&mut self) -> Result<BoolExpr, String> {
        match self.next() {
            Some(LexTok::Term(t)) => Ok(BoolExpr::Term(t)),
            Some(LexTok::Phrase(p)) => Ok(BoolExpr::Phrase(p)),
            Some(LexTok::LParen) => {
                let inner = self.parse_or()?;
                match self.next() {
                    Some(LexTok::RParen) => Ok(inner),
                    _ => Err("missing closing parenthesis".to_string()),
                }
            }
            Some(LexTok::And) => Err("unexpected AND: missing left operand".to_string()),
            Some(LexTok::Or) => Err("unexpected OR: missing left operand".to_string()),
            Some(LexTok::Not) => Err("unexpected NOT".to_string()),
            Some(LexTok::RParen) => Err("unexpected ')'".to_string()),
            None => Err("unexpected end of query".to_string()),
        }
    }
}

// ---- evaluation ----

fn posting_docs(index: &Index, term: &str) -> Vec<usize> {
    index
        .postings(term)
        .iter()
        .map(|p| p.doc_id)
        .collect()
}

fn term_positions(index: &Index, term: &str, doc_id: usize) -> Vec<u32> {
    index
        .entry(term)
        .and_then(|e| e.postings.iter().find(|p| p.doc_id == doc_id))
        .map(|p| p.positions.clone())
        .unwrap_or_default()
}

fn contains_positions(positions: &[u32], pos: u32) -> bool {
    positions.binary_search(&pos).is_ok()
}

fn all_docs(index: &Index) -> Vec<usize> {
    (0..index.total_docs).collect()
}

/// The doc ids where every phrase word appears in consecutive positions.
pub fn phrase_docs(index: &Index, words: &[String]) -> Vec<usize> {
    if words.is_empty() {
        return Vec::new();
    }
    // Anchor on the rarest word, then verify the sequence.
    let anchor = words
        .iter()
        .enumerate()
        .min_by_key(|(_, w)| index.df(w))
        .map(|(i, _)| i)
        .unwrap_or(0);

    let mut out = Vec::new();
    for doc_id in posting_docs(index, &words[anchor]) {
        let anchor_positions = term_positions(index, &words[anchor], doc_id);
        for p in &anchor_positions {
            let mut ok = true;
            for (i, w) in words.iter().enumerate() {
                if i == anchor {
                    continue;
                }
                let target = p.wrapping_add(i as u32);
                if !contains_positions(&term_positions(index, w, doc_id), target) {
                    ok = false;
                    break;
                }
            }
            if ok {
                out.push(doc_id);
                break;
            }
        }
    }
    out
}

fn eval(index: &Index, expr: &BoolExpr) -> Vec<usize> {
    match expr {
        BoolExpr::Term(t) => posting_docs(index, t),
        BoolExpr::Phrase(words) => phrase_docs(index, words),
        BoolExpr::And(children) => {
            let mut sets: Vec<Vec<usize>> = children.iter().map(|c| eval(index, c)).collect();
            sets.sort_by_key(|s| s.len());
            let mut out = sets.remove(0);
            for s in sets {
                out = intersect_sorted(&out, &s);
                if out.is_empty() {
                    break;
                }
            }
            out
        }
        BoolExpr::Or(children) => {
            let mut out = Vec::new();
            for c in children {
                let s = eval(index, c);
                out = merge_sorted(&out, &s);
            }
            out
        }
        BoolExpr::Not(child) => {
            let excluded = eval(index, child);
            all_docs(index)
                .into_iter()
                .filter(|d| excluded.binary_search(d).is_err())
                .collect()
        }
    }
}

fn merge_sorted(a: &[usize], b: &[usize]) -> Vec<usize> {
    let mut out = Vec::with_capacity(a.len() + b.len());
    let (mut i, mut j) = (0, 0);
    while i < a.len() && j < b.len() {
        if a[i] < b[j] {
            out.push(a[i]);
            i += 1;
        } else if a[i] > b[j] {
            out.push(b[j]);
            j += 1;
        } else {
            out.push(a[i]);
            i += 1;
            j += 1;
        }
    }
    out.extend_from_slice(&a[i..]);
    out.extend_from_slice(&b[j..]);
    out
}

fn intersect_sorted(a: &[usize], b: &[usize]) -> Vec<usize> {
    let mut out = Vec::new();
    let (mut i, mut j) = (0, 0);
    while i < a.len() && j < b.len() {
        if a[i] < b[j] {
            i += 1;
        } else if a[i] > b[j] {
            j += 1;
        } else {
            out.push(a[i]);
            i += 1;
            j += 1;
        }
    }
    out
}

/// The set of documents matching a plan, sorted ascending.
pub fn candidates(index: &Index, plan: &Plan) -> Vec<usize> {
    match plan {
        Plan::Ranked { terms, phrases } => {
            let mut out = Vec::new();
            for t in terms {
                out = merge_sorted(&out, &posting_docs(index, t));
            }
            for p in phrases {
                out = merge_sorted(&out, &phrase_docs(index, p));
            }
            out
        }
        Plan::Bool(expr) => eval(index, expr),
    }
}

/// All terms and phrase words that should be scored for a plan.
pub fn scored_terms(plan: &Plan) -> Vec<String> {
    fn walk(expr: &BoolExpr, out: &mut Vec<String>) {
        match expr {
            BoolExpr::Term(t) => out.push(t.clone()),
            BoolExpr::Phrase(words) => out.extend(words.iter().cloned()),
            BoolExpr::And(children) | BoolExpr::Or(children) => {
                for c in children {
                    walk(c, out);
                }
            }
            BoolExpr::Not(c) => walk(c, out),
        }
    }
    let mut out = Vec::new();
    match plan {
        Plan::Ranked { terms, phrases } => {
            out.extend(terms.iter().cloned());
            for p in phrases {
                out.extend(p.iter().cloned());
            }
        }
        Plan::Bool(expr) => walk(expr, &mut out),
    }
    out
}

/// Runs a plan over the index and returns the top-scoring hits.
pub fn search(index: &Index, scorer: Scorer, plan: &Plan, top: usize) -> Vec<SearchHit> {
    let scored_terms = scored_terms(plan);
    let mut hits: Vec<SearchHit> = candidates(index, plan)
        .into_iter()
        .map(|doc_id| {
            let mut breakdown = Vec::new();
            let mut matches = Vec::new();
            let mut total = 0.0;
            for t in &scored_terms {
                if index.tf(t, doc_id) > 0 {
                    let contrib = single_term_score(index, scorer, doc_id, t);
                    total += contrib;
                    breakdown.push((t.clone(), contrib));
                    matches.push(t.clone());
                }
            }
            SearchHit {
                doc_id,
                score: total,
                matches,
                breakdown,
            }
        })
        .collect();
    hits.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(a.doc_id.cmp(&b.doc_id))
    });
    hits.truncate(top);
    hits
}

fn single_term_score(index: &Index, scorer: Scorer, doc_id: usize, term: &str) -> f64 {
    let term = vec![term.to_string()];
    crate::scoring::score(index, scorer, doc_id, &term)
}
#[cfg(test)]
mod tests {
    use super::*;

    fn corpus() -> Index {
        let texts = [
            "the quick brown fox jumps over the lazy dog",
            "quick red fox races the hound",
            "the lazy dog sleeps all day",
            "rust is a systems programming language for performance",
            "rust and cargo build fast tools with zero dependencies",
            "search engines tokenize text and rank results with bm25",
            "an inverted index stores postings lists for every term",
            "bm25 ranking rewards term frequency and penalizes long documents",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("doc-{}", i)).collect();
        let sources = titles.clone();
        let urls = titles.clone();
        crate::index::build_index(&texts, &titles, &sources, &urls)
    }

    fn ids(hits: &[SearchHit]) -> Vec<usize> {
        hits.iter().map(|h| h.doc_id).collect()
    }

    #[test]
    fn parse_ranked_query() {
        let plan = parse_query("rust cargo").unwrap();
        assert!(matches!(
            plan,
            Plan::Ranked { terms, .. } if terms == vec!["rust".to_string(), "cargo".to_string()]
        ));
    }

    #[test]
    fn parse_boolean_query() {
        let plan = parse_query("rust AND cargo").unwrap();
        match plan {
            Plan::Bool(BoolExpr::And(parts)) => {
                assert_eq!(parts.len(), 2);
            }
            other => panic!("expected And, got {:?}", other),
        }
    }

    #[test]
    fn parse_not_and_parens() {
        let plan = parse_query("(rust OR cargo) AND NOT bm25").unwrap();
        match plan {
            Plan::Bool(BoolExpr::And(parts)) => {
                assert_eq!(parts.len(), 2);
                assert!(matches!(&parts[1], BoolExpr::Not(_)));
            }
            other => panic!("expected And, got {:?}", other),
        }
    }

    #[test]
    fn parse_phrase() {
        let plan = parse_query("\"inverted index\"").unwrap();
        match plan {
            Plan::Ranked { phrases, .. } => {
                assert_eq!(phrases, vec![vec!["inverted".to_string(), "index".to_string()]]);
            }
            other => panic!("expected ranked with phrase, got {:?}", other),
        }
    }

    #[test]
    fn parse_phrase_in_boolean() {
        let plan = parse_query("\"inverted index\" AND bm25").unwrap();
        assert!(matches!(plan, Plan::Bool(BoolExpr::And(_))));
    }

    #[test]
    fn reject_malformed_queries() {
        assert!(parse_query("").is_err());
        assert!(parse_query("   ").is_err());
        assert!(parse_query("rust AND").is_err());
        assert!(parse_query("AND rust").is_err());
        assert!(parse_query("(rust").is_err());
        assert!(parse_query("rust)").is_err());
        assert!(parse_query("NOT").is_err());
        assert!(parse_query("\"unterminated").is_err());
        assert!(parse_query("\"\"").is_err());
    }

    #[test]
    fn operators_inside_quotes_are_literals() {
        let plan = parse_query("\"and or not\"").unwrap();
        match plan {
            Plan::Ranked { terms, phrases } => {
                assert!(terms.is_empty());
                assert_eq!(phrases.len(), 1);
                assert_eq!(phrases[0], vec!["and", "or", "not"]);
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn separators_do_not_loop_forever() {
        // Regression: a hyphen separator that does not start a word used to
        // never advance the lexer cursor, hanging on inputs like this.
        let plan = parse_query("variable-length integer").unwrap();
        match plan {
            Plan::Ranked { terms, .. } => {
                assert_eq!(terms, vec!["variable", "length", "integer"]);
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn boolean_evaluation_and() {
        let idx = corpus();
        let plan = parse_query("rust AND cargo").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        let got = ids(&hits);
        assert_eq!(got, vec![4]);
    }

    #[test]
    fn boolean_evaluation_or() {
        let idx = corpus();
        let plan = parse_query("rust OR bm25").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        let got = ids(&hits);
        assert!(got.contains(&3));
        assert!(got.contains(&4));
        assert!(got.contains(&5));
        assert!(got.contains(&7));
    }

    #[test]
    fn boolean_evaluation_not() {
        let idx = corpus();
        let plan = parse_query("NOT rust").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 100);
        let got = ids(&hits);
        assert!(!got.contains(&3));
        assert!(!got.contains(&4));
        assert!(got.contains(&0));
    }

    #[test]
    fn phrase_matches_consecutive_only() {
        let idx = corpus();
        let plan = parse_query("\"inverted index\"").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        assert_eq!(ids(&hits), vec![6]);
        // "index inverted" must not match
        let plan2 = parse_query("\"index inverted\"").unwrap();
        let hits2 = search(&idx, Scorer::Bm25, &plan2, 10);
        assert!(ids(&hits2).is_empty());
    }

    #[test]
    fn phrase_found_in_doc_5() {
        let idx = corpus();
        let plan = parse_query("\"tokenize text\"").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        assert_eq!(ids(&hits), vec![5]);
    }

    #[test]
    fn parens_change_precedence() {
        let idx = corpus();
        // rust AND (cargo OR bm25) -> doc 4 (has rust and cargo); doc 3 has rust
        // only, doc 5 has bm25 only -> only doc 4.
        let plan = parse_query("rust AND (cargo OR bm25)").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        assert_eq!(ids(&hits), vec![4]);
    }

    #[test]
    fn ranked_query_returns_sorted_scores() {
        let idx = corpus();
        let plan = parse_query("rust cargo").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        assert!(ids(&hits).contains(&4));
        for w in hits.windows(2) {
            assert!(w[0].score >= w[1].score);
        }
    }

    #[test]
    fn matches_and_breakdown_are_populated() {
        let idx = corpus();
        let plan = parse_query("rust cargo").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        let hit = hits.iter().find(|h| h.doc_id == 4).unwrap();
        assert!(hit.matches.contains(&"rust".to_string()));
        assert!(hit.matches.contains(&"cargo".to_string()));
        assert_eq!(hit.breakdown.len(), 2);
        let sum: f64 = hit.breakdown.iter().map(|(_, s)| s).sum();
        assert!((sum - hit.score).abs() < 1e-9);
    }

    #[test]
    fn top_n_is_respected() {
        let idx = corpus();
        let plan = parse_query("rust OR cargo OR bm25").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 2);
        assert_eq!(hits.len(), 2);
    }

    #[test]
    fn rarest_first_planning_does_not_change_results() {
        // "lazy AND dog": both terms appear in docs 0 and 2; result identical
        // regardless of intersection order.
        let idx = corpus();
        let plan = parse_query("lazy AND dog").unwrap();
        let hits = search(&idx, Scorer::Bm25, &plan, 10);
        let got = ids(&hits);
        assert!(got.contains(&0) && got.contains(&2));
        for w in hits.windows(2) {
            assert!(w[0].score >= w[1].score);
        }
    }
}
