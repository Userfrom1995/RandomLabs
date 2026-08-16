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

use crate::fuzzy::{build_bk, BkTree};
use crate::index::Index;
use crate::scoring::{proximity, score, Scorer, TITLE_BOOST};
use crate::stem::{expand, stem_groups};
use crate::tokenizer::{is_cjk, tokenize};
use std::collections::BTreeMap;

/// Search capability toggles. `stem` expands query terms to their whole
/// morphological family; `signals` gates the title boost and proximity bonus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SearchOptions {
    pub stem: bool,
    pub signals: bool,
}

impl Default for SearchOptions {
    fn default() -> Self {
        SearchOptions {
            stem: false,
            signals: true,
        }
    }
}

/// A ranked query term: a plain word or a fuzzy `term~` / `term~2`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TermSpec {
    Word(String),
    Fuzzy(String, usize),
}

/// A parsed boolean expression tree.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BoolExpr {
    Term(String),
    Fuzzy(String, usize),
    Phrase(Vec<String>),
    And(Vec<BoolExpr>),
    Or(Vec<BoolExpr>),
    Not(Box<BoolExpr>),
}

/// A parsed query plan: either a plain ranked search or a boolean expression.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Plan {
    Ranked {
        terms: Vec<TermSpec>,
        phrases: Vec<Vec<String>>,
    },
    Bool(BoolExpr),
}

/// One row of the ranking breakdown: a scored term (or the pseudo-row
/// `(proximity)`), plus whether the term matched the document title.
#[derive(Debug, Clone, PartialEq)]
pub struct Breakdown {
    pub term: String,
    pub score: f64,
    pub title: bool,
}

/// One scored result.
#[derive(Debug, Clone, PartialEq)]
pub struct SearchHit {
    pub doc_id: usize,
    pub score: f64,
    /// The index terms present in this document (for snippets and display).
    pub matches: Vec<String>,
    /// Per-term score contributions (for the ranking breakdown UI).
    pub breakdown: Vec<Breakdown>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum LexTok {
    Term(String),
    Fuzzy(String, usize),
    Phrase(Vec<String>),
    And,
    Or,
    Not,
    LParen,
    RParen,
}

fn read_word(chars: &mut std::iter::Peekable<std::str::Chars>) -> Result<Option<(String, Option<usize>)>, String> {
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
        return Ok(None);
    }
    // A `~` directly after the word starts a fuzzy marker: `term~` (distance
    // 1) or `term~2` (distance 2). Any other distance is a parse error.
    if chars.peek() == Some(&'~') {
        chars.next();
        let mut digits = String::new();
        while let Some(&d) = chars.peek() {
            if d.is_ascii_digit() {
                digits.push(d);
                chars.next();
            } else {
                break;
            }
        }
        let distance: usize = if digits.is_empty() {
            1
        } else {
            digits
                .parse()
                .map_err(|_| format!("invalid fuzzy distance '~{}'", digits))?
        };
        if !(1..=2).contains(&distance) {
            return Err(format!("fuzzy distance must be 1 or 2 (got ~{})", distance));
        }
        Ok(Some((word, Some(distance))))
    } else {
        Ok(Some((word, None)))
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
                match read_word(&mut chars)? {
                    Some((w, fuzzy)) => {
                        let tok = match w.as_str() {
                            "and" if fuzzy.is_none() => LexTok::And,
                            "or" if fuzzy.is_none() => LexTok::Or,
                            "not" if fuzzy.is_none() => LexTok::Not,
                            _ => match fuzzy {
                                Some(d) => LexTok::Fuzzy(w, d),
                                None => LexTok::Term(w),
                            },
                        };
                        out.push(tok);
                    }
                    None => {
                        // A separator character that does not start a word:
                        // consume it so the loop makes progress.
                        chars.next();
                    }
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
                LexTok::Term(s) => terms.push(TermSpec::Word(s)),
                LexTok::Fuzzy(s, d) => terms.push(TermSpec::Fuzzy(s, d)),
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
            Some(LexTok::Fuzzy(t, d)) => Ok(BoolExpr::Fuzzy(t, d)),
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
    index.positions(term, doc_id)
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

/// Load-time derived structures shared by query expansion and evaluation.
pub struct SearchContext<'a> {
    index: &'a Index,
    stem: bool,
    groups: Option<BTreeMap<String, Vec<String>>>,
    bk: Option<BkTree>,
}

impl<'a> SearchContext<'a> {
    /// Builds a context over the index. The stem-group table is derived at
    /// load time when `stem` is enabled; the BK-tree is built lazily on the
    /// first fuzzy lookup.
    pub fn new(index: &'a Index, stem: bool) -> Self {
        let groups = if stem {
            Some(stem_groups(index.terms.keys().map(|k| k.as_str())))
        } else {
            None
        };
        SearchContext {
            index,
            stem,
            groups,
            bk: None,
        }
    }

    fn bk(&mut self) -> &BkTree {
        self.bk
            .get_or_insert_with(|| build_bk(self.index.terms.keys().map(|k| k.as_str())))
    }

    /// True when the query term is a CJK run that must be segmented like a
    /// document before it can match the n-gram index.
    fn is_cjk_term(term: &str) -> bool {
        term.chars().any(is_cjk)
    }

    /// The index terms a plain word expands to: CJK runs segment into their
    /// unigram/bigram tokens; with `--stem` on, ASCII words expand to their
    /// whole stem group; otherwise the word itself.
    pub fn expand(&self, term: &str) -> Vec<String> {
        if Self::is_cjk_term(term) {
            return tokenize(term).into_iter().map(|t| t.term).collect();
        }
        match &self.groups {
            Some(g) if self.stem => expand(g, term),
            _ => vec![term.to_string()],
        }
    }

    /// The vocabulary terms within edit distance `d` of `term`, sorted by
    /// `(distance, term)`.
    pub fn fuzzy_expand(&mut self, term: &str, d: usize) -> Vec<String> {
        self.bk()
            .search(term, d)
            .into_iter()
            .map(|(t, _)| t)
            .collect()
    }

    /// The effective scoring terms for a plan, each a list of index terms
    /// that must be present to score that query slot.
    pub fn effective_lists(&mut self, plan: &Plan) -> Vec<Vec<String>> {
        fn walk(ctx: &mut SearchContext, expr: &BoolExpr, out: &mut Vec<Vec<String>>) {
            match expr {
                BoolExpr::Term(t) => out.push(ctx.expand(t)),
                BoolExpr::Fuzzy(t, d) => out.push(ctx.fuzzy_expand(t, *d)),
                BoolExpr::Phrase(words) => {
                    for w in words {
                        out.push(vec![w.clone()]);
                    }
                }
                BoolExpr::And(children) | BoolExpr::Or(children) => {
                    for c in children {
                        walk(ctx, c, out);
                    }
                }
                BoolExpr::Not(c) => walk(ctx, c, out),
            }
        }
        let mut out = Vec::new();
        match plan {
            Plan::Ranked { terms, phrases } => {
                for spec in terms {
                    match spec {
                        TermSpec::Word(t) => out.push(self.expand(t)),
                        TermSpec::Fuzzy(t, d) => out.push(self.fuzzy_expand(t, *d)),
                    }
                }
                for p in phrases {
                    for w in p {
                        out.push(vec![w.clone()]);
                    }
                }
            }
            Plan::Bool(expr) => walk(self, expr, &mut out),
        }
        out
    }

    /// The doc ids where any effective term (or the phrase) appears, sorted
    /// ascending and deduplicated.
    pub fn candidates(&mut self, plan: &Plan) -> Vec<usize> {
        let mut out: Vec<usize> = Vec::new();
        match plan {
            Plan::Ranked { terms, phrases } => {
                for spec in terms {
                    match spec {
                        TermSpec::Word(t) => {
                            for e in self.expand(t) {
                                out = merge_sorted(&out, &posting_docs(self.index, &e));
                            }
                        }
                        TermSpec::Fuzzy(t, d) => {
                            for e in self.fuzzy_expand(t, *d) {
                                out = merge_sorted(&out, &posting_docs(self.index, &e));
                            }
                        }
                    }
                }
                for p in phrases {
                    out = merge_sorted(&out, &phrase_docs(self.index, p));
                }
            }
            Plan::Bool(expr) => out = eval(self, expr),
        }
        out
    }
}

fn eval(ctx: &mut SearchContext, expr: &BoolExpr) -> Vec<usize> {
    let index = ctx.index;
    match expr {
        BoolExpr::Term(t) => {
            let mut out = Vec::new();
            for e in ctx.expand(t) {
                out = merge_sorted(&out, &posting_docs(index, &e));
            }
            out
        }
        BoolExpr::Fuzzy(t, d) => {
            let mut out = Vec::new();
            for e in ctx.fuzzy_expand(t, *d) {
                out = merge_sorted(&out, &posting_docs(index, &e));
            }
            out
        }
        BoolExpr::Phrase(words) => phrase_docs(index, words),
        BoolExpr::And(children) => {
            let mut sets: Vec<Vec<usize>> = children.iter().map(|c| eval(ctx, c)).collect();
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
                let s = eval(ctx, c);
                out = merge_sorted(&out, &s);
            }
            out
        }
        BoolExpr::Not(child) => {
            let excluded = eval(ctx, child);
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
pub fn candidates(index: &Index, opts: &SearchOptions, plan: &Plan) -> Vec<usize> {
    SearchContext::new(index, opts.stem).candidates(plan)
}

/// "Did you mean" candidates: the nearest vocabulary terms (edit distance <=
/// 2, ascending `(distance, term)`) for every non-fuzzy, non-CJK query term
/// that has zero vocabulary hits. Empty when nothing is missing.
pub fn suggestions(index: &Index, plan: &Plan) -> Vec<String> {
    fn missing_words(index: &Index, expr: &BoolExpr, out: &mut Vec<String>) {
        match expr {
            BoolExpr::Term(t) => {
                if index.df(t) == 0 {
                    out.push(t.clone());
                }
            }
            BoolExpr::Fuzzy(_, _) => {}
            BoolExpr::Phrase(words) => out.extend(words.iter().cloned()),
            BoolExpr::And(children) | BoolExpr::Or(children) => {
                for c in children {
                    missing_words(index, c, out);
                }
            }
            BoolExpr::Not(c) => missing_words(index, c, out),
        }
    }
    let mut missing: Vec<String> = Vec::new();
    match plan {
        Plan::Ranked { terms, phrases } => {
            for spec in terms {
                if let TermSpec::Word(t) = spec {
                    if index.df(t) == 0 && !SearchContext::is_cjk_term(t) {
                        missing.push(t.clone());
                    }
                }
            }
            for p in phrases {
                for w in p {
                    if index.df(w) == 0 {
                        missing.push(w.clone());
                    }
                }
            }
        }
        Plan::Bool(expr) => missing_words(index, expr, &mut missing),
    }
    missing.dedup();
    if missing.is_empty() {
        return Vec::new();
    }

    let bk = build_bk(index.terms.keys().map(|k| k.as_str()));
    let mut out: Vec<(usize, String)> = Vec::new();
    for t in missing {
        for (cand, d) in bk.search(&t, 2) {
            out.push((d, cand));
        }
    }
    out.sort();
    out.dedup();
    out.truncate(5);
    out.into_iter().map(|(_, c)| c).collect()
}

/// Runs a plan over the index and returns the top-scoring hits.
///
/// With signals on, a term that also appears in the document title has its
/// contribution multiplied by `TITLE_BOOST`, and ranked queries with two or
/// more distinct terms present add the proximity bonus (reported as a
/// `(proximity)` breakdown row). Matches, breakdown, and scoring all use the
/// expanded index terms.
pub fn search(
    index: &Index,
    scorer: Scorer,
    opts: &SearchOptions,
    plan: &Plan,
    top: usize,
) -> Vec<SearchHit> {
    let mut ctx = SearchContext::new(index, opts.stem);
    let lists = ctx.effective_lists(plan);
    let mut hits: Vec<SearchHit> = ctx
        .candidates(plan)
        .into_iter()
        .map(|doc_id| {
            let title_terms: std::collections::HashSet<String> =
                index.docs.get(doc_id).map_or_else(std::collections::HashSet::new, |d| {
                    tokenize(&d.title).into_iter().map(|t| t.term).collect()
                });
            let mut breakdown = Vec::new();
            let mut matches = Vec::new();
            let mut present: Vec<String> = Vec::new();
            let mut total = 0.0;
            for list in &lists {
                for eff in list {
                    if index.tf(eff, doc_id) > 0 {
                        let title = opts.signals && title_terms.contains(eff);
                        let mut contrib = single_term_score(index, scorer, doc_id, eff);
                        if title {
                            contrib *= TITLE_BOOST;
                        }
                        total += contrib;
                        breakdown.push(Breakdown {
                            term: eff.clone(),
                            score: contrib,
                            title,
                        });
                        if !present.contains(eff) {
                            present.push(eff.clone());
                        }
                        matches.push(eff.clone());
                    }
                }
            }
            if opts.signals {
                let prox = proximity(index, doc_id, &present);
                if prox > 0.0 {
                    total += prox;
                    breakdown.push(Breakdown {
                        term: "(proximity)".to_string(),
                        score: prox,
                        title: false,
                    });
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
    score(index, scorer, doc_id, &term)
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

    fn s(index: &Index, plan: &Plan, top: usize) -> Vec<SearchHit> {
        search(index, Scorer::Bm25, &SearchOptions::default(), plan, top)
    }

    #[test]
    fn parse_ranked_query() {
        let plan = parse_query("rust cargo").unwrap();
        assert!(matches!(
            plan,
            Plan::Ranked { terms, .. }
                if terms
                    == vec![
                        TermSpec::Word("rust".to_string()),
                        TermSpec::Word("cargo".to_string())
                    ]
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
                assert_eq!(
                    terms,
                    vec![
                        TermSpec::Word("variable".to_string()),
                        TermSpec::Word("length".to_string()),
                        TermSpec::Word("integer".to_string())
                    ]
                );
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn boolean_evaluation_and() {
        let idx = corpus();
        let plan = parse_query("rust AND cargo").unwrap();
        let hits = s(&idx, &plan, 10);
        let got = ids(&hits);
        assert_eq!(got, vec![4]);
    }

    #[test]
    fn boolean_evaluation_or() {
        let idx = corpus();
        let plan = parse_query("rust OR bm25").unwrap();
        let hits = s(&idx, &plan, 10);
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
        let hits = s(&idx, &plan, 100);
        let got = ids(&hits);
        assert!(!got.contains(&3));
        assert!(!got.contains(&4));
        assert!(got.contains(&0));
    }

    #[test]
    fn phrase_matches_consecutive_only() {
        let idx = corpus();
        let plan = parse_query("\"inverted index\"").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![6]);
        // "index inverted" must not match
        let plan2 = parse_query("\"index inverted\"").unwrap();
        let hits2 = s(&idx, &plan2, 10);
        assert!(ids(&hits2).is_empty());
    }

    #[test]
    fn phrase_found_in_doc_5() {
        let idx = corpus();
        let plan = parse_query("\"tokenize text\"").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![5]);
    }

    #[test]
    fn parens_change_precedence() {
        let idx = corpus();
        // rust AND (cargo OR bm25) -> doc 4 (has rust and cargo); doc 3 has rust
        // only, doc 5 has bm25 only -> only doc 4.
        let plan = parse_query("rust AND (cargo OR bm25)").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![4]);
    }

    #[test]
    fn ranked_query_returns_sorted_scores() {
        let idx = corpus();
        let plan = parse_query("rust cargo").unwrap();
        let hits = s(&idx, &plan, 10);
        assert!(ids(&hits).contains(&4));
        for w in hits.windows(2) {
            assert!(w[0].score >= w[1].score);
        }
    }

    #[test]
    fn matches_and_breakdown_are_populated() {
        let idx = corpus();
        let plan = parse_query("rust cargo").unwrap();
        let hits = s(&idx, &plan, 10);
        let hit = hits.iter().find(|h| h.doc_id == 4).unwrap();
        assert!(hit.matches.contains(&"rust".to_string()));
        assert!(hit.matches.contains(&"cargo".to_string()));
        assert_eq!(hit.breakdown.len(), 3, "two term rows plus a proximity row");
        assert_eq!(
            hit.breakdown
                .iter()
                .filter(|b| b.term != "(proximity)")
                .count(),
            2
        );
        let sum: f64 = hit.breakdown.iter().map(|b| b.score).sum();
        assert!((sum - hit.score).abs() < 1e-9);
    }

    #[test]
    fn top_n_is_respected() {
        let idx = corpus();
        let plan = parse_query("rust OR cargo OR bm25").unwrap();
        let hits = s(&idx, &plan, 2);
        assert_eq!(hits.len(), 2);
    }

    #[test]
    fn rarest_first_planning_does_not_change_results() {
        // "lazy AND dog": both terms appear in docs 0 and 2; result identical
        // regardless of intersection order.
        let idx = corpus();
        let plan = parse_query("lazy AND dog").unwrap();
        let hits = s(&idx, &plan, 10);
        let got = ids(&hits);
        assert!(got.contains(&0) && got.contains(&2));
        for w in hits.windows(2) {
            assert!(w[0].score >= w[1].score);
        }
    }

    #[test]
    fn parse_fuzzy_terms() {
        let plan = parse_query("searching~ rust~2").unwrap();
        match plan {
            Plan::Ranked { terms, .. } => {
                assert_eq!(
                    terms,
                    vec![
                        TermSpec::Fuzzy("searching".to_string(), 1),
                        TermSpec::Fuzzy("rust".to_string(), 2),
                    ]
                );
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn reject_invalid_fuzzy_distance() {
        assert!(parse_query("term~3").is_err());
        assert!(parse_query("term~0").is_err());
        assert!(parse_query("term~99").is_err());
    }

    #[test]
    fn fuzzy_in_boolean_parses() {
        let plan = parse_query("car~ AND engine").unwrap();
        match plan {
            Plan::Bool(BoolExpr::And(parts)) => {
                assert!(matches!(&parts[0], BoolExpr::Fuzzy(t, 1) if t == "car"));
                assert!(matches!(&parts[1], BoolExpr::Term(t) if t == "engine"));
            }
            other => panic!("expected And, got {:?}", other),
        }
    }

    #[test]
    fn fuzzy_recovers_a_typo() {
        // "rases" is one edit from "races" (doc 1); "qjuick" two edits from
        // "quick" (docs 0, 1, 2).
        let idx = corpus();
        let plan = parse_query("rases~").unwrap();
        let hits = s(&idx, &plan, 10);
        assert!(ids(&hits).contains(&1));
        let plan2 = parse_query("qjuick~2").unwrap();
        let hits2 = s(&idx, &plan2, 10);
        assert!(ids(&hits2).contains(&0));
    }

    #[test]
    fn stem_expansion_finds_inflections() {
        // "ranking" appears verbatim in doc 7; with stem on it must also
        // match nothing else here since "ranks"/"ranked" are absent.
        let idx = corpus();
        let opts = SearchOptions {
            stem: true,
            signals: true,
        };
        let plan = parse_query("ranking").unwrap();
        let hits = search(&idx, Scorer::Bm25, &opts, &plan, 10);
        assert!(ids(&hits).contains(&7));
        // "system" stems to "system", matching the singular in doc 3 even
        // though the query wrote a different surface form's stem.
        let plan2 = parse_query("systems").unwrap();
        let hits2 = search(&idx, Scorer::Bm25, &opts, &plan2, 10);
        assert!(ids(&hits2).contains(&3));
    }

    #[test]
    fn stem_expansion_matches_across_forms() {
        let texts = [
            "the runner ranks the ranked results",
            "a rank is a ladder position",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let opts = SearchOptions {
            stem: true,
            signals: false,
        };
        let plan = parse_query("ranking").unwrap();
        let hits = search(&idx, Scorer::Bm25, &opts, &plan, 10);
        // "ranking" stems to "rank"; doc 0 holds "ranks" and "ranked".
        assert!(ids(&hits).contains(&0));
        let plan2 = parse_query("rank").unwrap();
        let hits2 = search(&idx, Scorer::Bm25, &opts, &plan2, 10);
        assert_eq!(ids(&hits2).len(), 2);
    }

    #[test]
    fn cjk_query_segments_like_documents() {
        let texts = ["搜索引擎与全文检索", "plain english text about engines"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("搜索").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![0]);
        let plan2 = parse_query("引擎").unwrap();
        let hits2 = s(&idx, &plan2, 10);
        assert_eq!(ids(&hits2), vec![0]);
    }

    #[test]
    fn title_boost_reorders_and_marks_title() {
        let texts = [
            "search engine internals and how search works",
            "the postings list and scoring math",
        ];
        let titles: Vec<String> = ["Postings and scoring", "Search engine postings"].iter().map(|s| s.to_string()).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let opts_on = SearchOptions::default();
        let plan = parse_query("postings search").unwrap();
        let hits_on = search(&idx, Scorer::Bm25, &opts_on, &plan, 10);
        let top = hits_on[0].doc_id;
        let title_rows = hits_on[0]
            .breakdown
            .iter()
            .filter(|b| b.title)
            .map(|b| b.term.clone())
            .collect::<Vec<_>>();
        assert!(!title_rows.is_empty(), "title row must be flagged");
        // Doc 1 has both terms in the title; with signals off, classic BM25
        // (shorter doc 0) should lead.
        let opts_off = SearchOptions {
            stem: false,
            signals: false,
        };
        let hits_off = search(&idx, Scorer::Bm25, &opts_off, &plan, 10);
        assert_eq!(hits_off[0].doc_id, 0);
        assert_eq!(top, 1);
    }

    #[test]
    fn proximity_row_appears_for_close_terms() {
        let texts = [
            "the rust language",
            "rust somewhere far away from language",
        ];
        let titles: Vec<String> = ["t0", "t1"].iter().map(|s| s.to_string()).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let opts = SearchOptions::default();
        let plan = parse_query("rust language").unwrap();
        let hits = search(&idx, Scorer::Bm25, &opts, &plan, 10);
        // Doc 0 (adjacent terms) must outrank doc 1 thanks to proximity.
        assert_eq!(hits[0].doc_id, 0);
        let prox = hits[0]
            .breakdown
            .iter()
            .find(|b| b.term == "(proximity)");
        assert!(prox.is_some() && prox.unwrap().score > 0.0);
        // signals off removes the proximity row entirely.
        let opts_off = SearchOptions {
            stem: false,
            signals: false,
        };
        let hits_off = search(&idx, Scorer::Bm25, &opts_off, &plan, 10);
        assert!(
            !hits_off[0]
                .breakdown
                .iter()
                .any(|b| b.term == "(proximity)")
        );
    }

    #[test]
    fn suggestions_find_nearest_vocab_terms() {
        let idx = corpus();
        let plan = parse_query("qjuick brwn").unwrap();
        let sug = suggestions(&idx, &plan);
        assert!(sug.contains(&"quick".to_string()));
        assert!(sug.contains(&"brown".to_string()));
        let ok = parse_query("rust cargo").unwrap();
        assert!(suggestions(&idx, &ok).is_empty());
    }

    #[test]
    fn cjk_and_fuzzy_terms_are_skipped_for_suggestions() {
        let idx = corpus();
        let plan = parse_query("qjuick~ 搜索").unwrap();
        // The fuzzy term never triggers suggestions; "搜索" is CJK so also
        // skipped, leaving nothing to suggest.
        assert!(suggestions(&idx, &plan).is_empty());
    }
}
