//! Boolean query parsing and evaluation against the postings.
//!
//! Supported syntax:
//!
//! ```text
//! expr      := or_expr
//! or_expr   := and_expr (OR and_expr)*
//! and_expr  := unary (AND unary)*
//! unary     := NOT unary | primary
//! primary   := '(' expr ')' | TERM | "quoted phrase" [~N] | FIELD:TERM
//! ```
//!
//! Terms are case-insensitive. `AND`, `OR`, `NOT` are operators only outside
//! quotes. A query with no operators at all is a ranked search: every term and
//! phrase is scored together (the classic search-engine default). Any query
//! containing an operator or parentheses is a boolean query, evaluated against
//! the postings with sorted-list set operations; `AND` intersections are
//! planned rarest-first.
//!
//! Level 3 retrieval depth on top of the boolean core:
//! - Wildcards: `sear*`, `sear?h`, `?earch` expand over the sorted vocabulary.
//! - Fields: `title:rust`, `source:docs*` restrict a leaf to one metadata field.
//! - Phrase slop: `"a b"~N` matches terms in order within N extra positions.
//! - Boosting: `term^2`, `"phrase"^1.5`, `title:x^3`, `term~^2` scale a
//!   term's score contribution (visible in the breakdown).
//! - Stopwords: `--stopwords on` drops common function words from ranked
//!   queries only (never boolean, never phrases, never at index time).

use crate::fields::{Field, Fields};
use crate::fuzzy::{build_bk, BkTree};
use crate::index::Index;
use crate::scoring::{proximity, score, Scorer, TITLE_BOOST};
use crate::stem::{expand, stem_groups};
use crate::tokenizer::{is_cjk, tokenize};
use crate::wildcard;
use std::collections::BTreeMap;

/// Search capability toggles. `stem` expands query terms to their whole
/// morphological family; `signals` gates the title boost and proximity bonus;
/// `stopwords` drops common function words from ranked queries only.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SearchOptions {
    pub stem: bool,
    pub signals: bool,
    pub stopwords: bool,
}

impl Default for SearchOptions {
    fn default() -> Self {
        SearchOptions {
            stem: false,
            signals: true,
            stopwords: true,
        }
    }
}

/// The built-in stopword list (English function words). Sorted for binary
/// search; only consulted for ranked plain terms with `--stopwords on`.
const STOPWORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "for", "from", "have", "if",
    "in", "is", "it", "its", "just", "not", "of", "on", "or", "so", "than", "that", "the",
    "their", "these", "they", "this", "to", "was", "we", "were", "what", "when", "which",
    "with", "you", "your",
];

/// True when `word` is a stopword that `--stopwords on` skips in ranked
/// queries.
pub fn is_stopword(word: &str) -> bool {
    STOPWORDS.binary_search(&word).is_ok()
}

/// A ranked query term: a plain word, a fuzzy `term~` / `term~2`, a wildcard
/// `term*` / `sear?h`, or a field-scoped leaf `title:...` / `source:...`.
#[derive(Debug, Clone, PartialEq)]
pub enum TermSpec {
    Word(String),
    Fuzzy(String, usize),
    Wildcard(String),
    Field { field: Field, inner: Box<TermSpec> },
}

/// A ranked term slot with its boost multiplier (`term^N`, default 1.0).
#[derive(Debug, Clone, PartialEq)]
pub struct ScoredTerm {
    pub spec: TermSpec,
    pub boost: f64,
}

/// A ranked phrase with its slop (`"a b"~N`, default 0 = exact) and boost.
#[derive(Debug, Clone, PartialEq)]
pub struct PhraseSpec {
    pub words: Vec<String>,
    pub slop: usize,
    pub boost: f64,
}

/// A parsed boolean expression tree.
#[derive(Debug, Clone, PartialEq)]
pub enum BoolExpr {
    Term(String),
    Fuzzy(String, usize),
    Wildcard(String),
    Field { field: Field, inner: Box<BoolExpr> },
    Phrase(Vec<String>, usize),
    Boost(Box<BoolExpr>, f64),
    And(Vec<BoolExpr>),
    Or(Vec<BoolExpr>),
    Not(Box<BoolExpr>),
}

/// A parsed query plan: either a plain ranked search or a boolean expression.
#[derive(Debug, Clone, PartialEq)]
pub enum Plan {
    Ranked {
        terms: Vec<ScoredTerm>,
        phrases: Vec<PhraseSpec>,
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

#[derive(Debug, Clone, PartialEq)]
enum LexTok {
    Term(String),
    Fuzzy(String, usize),
    Wildcard(String),
    Field { field: String, inner: Box<LexTok> },
    Phrase(Vec<String>, usize),
    Boost(f64),
    And,
    Or,
    Not,
    LParen,
    RParen,
}

/// Reads one query word: alphanumeric runs (case-folded) plus apostrophes
/// inside words, plus the wildcard metacharacters `*` and `?`. A trailing `~`
/// starts a fuzzy marker (`term~` distance 1, `term~2` distance 2). Returns
/// `(word, fuzzy_distance, is_wildcard)`, or `None` when no word starts here.
fn read_word(
    chars: &mut std::iter::Peekable<std::str::Chars>,
) -> Result<Option<(String, Option<usize>, bool)>, String> {
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
        } else if c == '*' || c == '?' {
            word.push(c);
            chars.next();
        } else {
            break;
        }
    }
    let has_alnum = word.chars().any(|c| c.is_alphanumeric());
    if !has_alnum {
        return Ok(None);
    }
    let wildcard = word.contains('*') || word.contains('?');
    if wildcard {
        // Fuzzy markers do not combine with wildcards.
        return Ok(Some((word, None, true)));
    }
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
        Ok(Some((word, Some(distance), false)))
    } else {
        Ok(Some((word, None, false)))
    }
}

/// Reads a quoted phrase (the caller has consumed the opening `"`) plus an
/// optional `~N` slop suffix: `~` alone means slop 1, `~N` requires `0..=9`.
/// Returns `(words, slop)`.
fn read_phrase(
    chars: &mut std::iter::Peekable<std::str::Chars>,
) -> Result<(Vec<String>, usize), String> {
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
    let mut slop = 0usize;
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
        slop = if digits.is_empty() {
            // Bare `~`: valid only before a separator or the end of the query.
            match chars.peek() {
                None => 1,
                Some(' ') | Some('\t') | Some('\n') | Some('\r') => 1,
                _ => return Err("phrase slop needs a digit after '~'".to_string()),
            }
        } else {
            let n: usize = digits
                .parse()
                .map_err(|_| format!("invalid slop '~{}'", digits))?;
            if n > 9 {
                return Err(format!("phrase slop must be 0..=9 (got ~{})", n));
            }
            n
        };
    }
    Ok((words, slop))
}

/// Reads a `^N` boost suffix after a primary. `N` must be a positive finite
/// float; returns `None` when the next char is not `^`.
fn read_boost(
    chars: &mut std::iter::Peekable<std::str::Chars>,
) -> Result<Option<f64>, String> {
    if chars.peek() != Some(&'^') {
        return Ok(None);
    }
    chars.next();
    let mut s = String::new();
    while let Some(&d) = chars.peek() {
        if d.is_ascii_digit() || d == '.' {
            s.push(d);
            chars.next();
        } else {
            break;
        }
    }
    if s.is_empty() {
        return Err("missing boost value after '^'".to_string());
    }
    let v: f64 = s
        .parse()
        .map_err(|_| format!("invalid boost '^{}'", s))?;
    if !v.is_finite() || v <= 0.0 {
        return Err(format!("boost must be a positive number (got ^{})", s));
    }
    Ok(Some(v))
}

/// Reads the value of a field prefix (`title:` / `source:`): a word, fuzzy,
/// or wildcard. Fielded phrases are not supported and produce a clear error.
fn read_field_inner(
    chars: &mut std::iter::Peekable<std::str::Chars>,
) -> Result<LexTok, String> {
    while matches!(chars.peek(), Some(' ') | Some('\t') | Some('\n') | Some('\r')) {
        chars.next();
    }
    if chars.peek() == Some(&'"') {
        return Err("fielded phrases are not supported".to_string());
    }
    match read_word(chars)? {
        Some((w, fuzzy, wildcard)) => {
            let tok = match (fuzzy, wildcard) {
                (Some(d), false) => LexTok::Fuzzy(w, d),
                (None, true) => LexTok::Wildcard(w),
                (None, false) => LexTok::Term(w),
                (Some(_), true) => return Err("fuzzy wildcards are not supported".to_string()),
            };
            Ok(tok)
        }
        None => Err("missing term after field prefix (use title:<word> or source:<word>)".to_string()),
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
                let (words, slop) = read_phrase(&mut chars)?;
                out.push(LexTok::Phrase(words, slop));
            }
            '^' => {
                if let Some(b) = read_boost(&mut chars)? {
                    out.push(LexTok::Boost(b));
                }
            }
            _ => {
                match read_word(&mut chars)? {
                    Some((w, fuzzy, wildcard)) => {
                        let field_prefix = !wildcard
                            && fuzzy.is_none()
                            && (w == "title" || w == "source")
                            && chars.peek() == Some(&':');
                        if field_prefix {
                            chars.next(); // consume ':'
                            let inner = read_field_inner(&mut chars)?;
                            out.push(LexTok::Field {
                                field: w.clone(),
                                inner: Box::new(inner),
                            });
                        } else {
                            let tok = match (w.as_str(), fuzzy, wildcard) {
                                ("and", None, false) => LexTok::And,
                                ("or", None, false) => LexTok::Or,
                                ("not", None, false) => LexTok::Not,
                                (_, Some(d), false) => LexTok::Fuzzy(w, d),
                                (_, None, true) => LexTok::Wildcard(w),
                                (_, None, false) => LexTok::Term(w),
                                (_, Some(_), true) => {
                                    return Err("fuzzy wildcards are not supported".to_string())
                                }
                            };
                            out.push(tok);
                        }
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
        let mut last_is_term = false;
        for t in toks {
            match t {
                LexTok::Term(s) => {
                    terms.push(ScoredTerm {
                        spec: TermSpec::Word(s),
                        boost: 1.0,
                    });
                    last_is_term = true;
                }
                LexTok::Fuzzy(s, d) => {
                    terms.push(ScoredTerm {
                        spec: TermSpec::Fuzzy(s, d),
                        boost: 1.0,
                    });
                    last_is_term = true;
                }
                LexTok::Wildcard(w) => {
                    terms.push(ScoredTerm {
                        spec: TermSpec::Wildcard(w),
                        boost: 1.0,
                    });
                    last_is_term = true;
                }
                LexTok::Field { field, inner } => {
                    let field = field_name(&field)?;
                    let spec = match *inner {
                        LexTok::Term(t) => TermSpec::Word(t),
                        LexTok::Fuzzy(t, d) => TermSpec::Fuzzy(t, d),
                        LexTok::Wildcard(w) => TermSpec::Wildcard(w),
                        LexTok::Phrase(_, _) => {
                            return Err("fielded phrases are not supported".to_string())
                        }
                        _ => return Err("invalid fielded expression".to_string()),
                    };
                    terms.push(ScoredTerm {
                        spec: TermSpec::Field {
                            field,
                            inner: Box::new(spec),
                        },
                        boost: 1.0,
                    });
                    last_is_term = true;
                }
                LexTok::Phrase(words, slop) => {
                    phrases.push(PhraseSpec {
                        words,
                        slop,
                        boost: 1.0,
                    });
                    last_is_term = false;
                }
                LexTok::Boost(b) => {
                    if last_is_term {
                        if let Some(t) = terms.last_mut() {
                            t.boost = b;
                        }
                    } else if let Some(p) = phrases.last_mut() {
                        p.boost = b;
                    } else {
                        return Err("unexpected '^' (boost needs a term or phrase)".to_string());
                    }
                }
                _ => unreachable!("ranked mode cannot contain operators"),
            }
        }
        Ok(Plan::Ranked { terms, phrases })
    } else {
        let expr = Parser::new(&toks).parse()?;
        Ok(Plan::Bool(expr))
    }
}

fn field_name(s: &str) -> Result<Field, String> {
    Field::parse(s).ok_or_else(|| format!("unknown field '{}' (expected title or source)", s))
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
        let expr = match self.next() {
            Some(LexTok::Term(t)) => BoolExpr::Term(t),
            Some(LexTok::Fuzzy(t, d)) => BoolExpr::Fuzzy(t, d),
            Some(LexTok::Wildcard(w)) => BoolExpr::Wildcard(w),
            Some(LexTok::Phrase(words, slop)) => BoolExpr::Phrase(words, slop),
            Some(LexTok::Field { field, inner }) => {
                let field = field_name(&field)?;
                let inner = match *inner {
                    LexTok::Term(t) => BoolExpr::Term(t),
                    LexTok::Fuzzy(t, d) => BoolExpr::Fuzzy(t, d),
                    LexTok::Wildcard(w) => BoolExpr::Wildcard(w),
                    LexTok::Phrase(_, _) => {
                        return Err("fielded phrases are not supported".to_string())
                    }
                    _ => return Err("invalid fielded expression".to_string()),
                };
                BoolExpr::Field {
                    field,
                    inner: Box::new(inner),
                }
            }
            Some(LexTok::LParen) => {
                let inner = self.parse_or()?;
                match self.next() {
                    Some(LexTok::RParen) => inner,
                    _ => return Err("missing closing parenthesis".to_string()),
                }
            }
            Some(LexTok::And) => return Err("unexpected AND: missing left operand".to_string()),
            Some(LexTok::Or) => return Err("unexpected OR: missing left operand".to_string()),
            Some(LexTok::Not) => return Err("unexpected NOT".to_string()),
            Some(LexTok::Boost(_)) => return Err("unexpected '^' (boost needs a term or phrase)".to_string()),
            Some(LexTok::RParen) => return Err("unexpected ')'".to_string()),
            None => return Err("unexpected end of query".to_string()),
        };
        // A trailing `^N` boosts the just-parsed primary.
        let is_boost = matches!(self.peek(), Some(LexTok::Boost(_)));
        if is_boost {
            let b = match self.next() {
                Some(LexTok::Boost(b)) => b,
                _ => unreachable!("peeked Boost"),
            };
            Ok(BoolExpr::Boost(Box::new(expr), b))
        } else {
            Ok(expr)
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

fn all_docs(index: &Index) -> Vec<usize> {
    (0..index.total_docs).collect()
}

/// The doc ids where every phrase word appears in order within `slop` extra
/// positions: `"a b"~0` is the exact consecutive phrase, `"a b"~N` allows the
/// words to span `len - 1 + N` positions. Anchors on the rarest word and
/// greedily minimizes the span around each anchor position, which is exact
/// for existence.
pub fn phrase_docs(index: &Index, words: &[String], slop: usize) -> Vec<usize> {
    if words.is_empty() {
        return Vec::new();
    }
    let anchor = words
        .iter()
        .enumerate()
        .min_by_key(|(_, w)| index.df(w))
        .map(|(i, _)| i)
        .unwrap_or(0);

    let mut out = Vec::new();
    for doc_id in posting_docs(index, &words[anchor]) {
        let anchor_positions = term_positions(index, &words[anchor], doc_id);
        'outer: for p in &anchor_positions {
            let mut min_pos = *p;
            let mut max_pos = *p;
            // Forward words (after the anchor): pick the smallest position
            // strictly after the running max.
            for (i, w) in words.iter().enumerate().skip(anchor + 1) {
                let positions = term_positions(index, w, doc_id);
                let ix = positions.partition_point(|&x| x <= max_pos);
                if ix >= positions.len() {
                    continue 'outer;
                }
                max_pos = positions[ix];
                let _ = i;
            }
            // Backward words (before the anchor): pick the largest position
            // strictly before the running min.
            for i in (0..anchor).rev() {
                let w = &words[i];
                let positions = term_positions(index, w, doc_id);
                let ix = positions.partition_point(|&x| x < min_pos);
                if ix == 0 {
                    continue 'outer;
                }
                min_pos = positions[ix - 1];
            }
            let span = max_pos.saturating_sub(min_pos);
            if span.saturating_sub(words.len() as u32 - 1) <= slop as u32 {
                out.push(doc_id);
                break;
            }
        }
    }
    out
}

/// One scoring slot for a query: the expanded index terms that must be
/// present, the boost multiplier, and an optional field restriction.
#[derive(Debug, Clone, PartialEq)]
pub struct TermGroup {
    pub terms: Vec<String>,
    pub boost: f64,
    pub field: Option<Field>,
}

/// Load-time derived structures shared by query expansion and evaluation.
pub struct SearchContext<'a> {
    index: &'a Index,
    opts: SearchOptions,
    groups: Option<BTreeMap<String, Vec<String>>>,
    bk: Option<BkTree>,
    fields: Fields,
}

impl<'a> SearchContext<'a> {
    /// Builds a context over the index. The stem-group table and the per-field
    /// token sets are derived at load time; the BK-tree is built lazily on the
    /// first fuzzy lookup.
    pub fn new(index: &'a Index, opts: SearchOptions) -> Self {
        let groups = if opts.stem {
            Some(stem_groups(index.terms.keys().map(|k| k.as_str())))
        } else {
            None
        };
        let fields = Fields::build(index);
        SearchContext {
            index,
            opts,
            groups,
            bk: None,
            fields,
        }
    }

    fn bk(&mut self) -> &BkTree {
        self.bk
            .get_or_insert_with(|| build_bk(self.index.terms.keys().map(|k| k.as_str())))
    }

    /// True when the query term is a CJK run that must be segmented like a
    /// document before it can match the n-gram index.
    pub fn is_cjk_term(term: &str) -> bool {
        term.chars().any(is_cjk)
    }

    /// True when a ranked plain term should be dropped by `--stopwords on`.
    fn should_skip_stopword(&self, term: &str) -> bool {
        self.opts.stopwords && is_stopword(term)
    }

    /// The index terms a plain word expands to: CJK runs segment into their
    /// unigram/bigram tokens; with `--stem` on, ASCII words expand to their
    /// whole stem group; otherwise the word itself.
    pub fn expand(&self, term: &str) -> Vec<String> {
        if Self::is_cjk_term(term) {
            return tokenize(term).into_iter().map(|t| t.term).collect();
        }
        match &self.groups {
            Some(g) if self.opts.stem => expand(g, term),
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

    /// The scoring slots for a plan: each a `TermGroup` carrying the expanded
    /// index terms, its boost, and its optional field restriction. Used both
    /// to score ranked queries and to derive the ranked candidate union.
    pub fn effective_lists(&mut self, plan: &Plan) -> Vec<TermGroup> {
        fn walk_expr(
            ctx: &mut SearchContext,
            expr: &BoolExpr,
            out: &mut Vec<TermGroup>,
            boost: f64,
            field: Option<Field>,
        ) {
            match expr {
                BoolExpr::Term(t) => {
                    out.push(TermGroup {
                        terms: ctx.expand(t),
                        boost,
                        field,
                    });
                }
                BoolExpr::Fuzzy(t, d) => {
                    out.push(TermGroup {
                        terms: ctx.fuzzy_expand(t, *d),
                        boost,
                        field,
                    });
                }
                BoolExpr::Wildcard(w) => {
                    out.push(TermGroup {
                        terms: wildcard::expand_wildcard(ctx.index, w),
                        boost,
                        field,
                    });
                }
                BoolExpr::Field { field: f, inner } => {
                    walk_expr(ctx, inner, out, boost, Some(*f));
                }
                BoolExpr::Phrase(words, _) => {
                    for w in words {
                        out.push(TermGroup {
                            terms: vec![w.clone()],
                            boost,
                            field,
                        });
                    }
                }
                BoolExpr::Boost(inner, b) => {
                    walk_expr(ctx, inner, out, boost * b, field);
                }
                BoolExpr::And(children) | BoolExpr::Or(children) => {
                    for c in children {
                        walk_expr(ctx, c, out, boost, field);
                    }
                }
                BoolExpr::Not(c) => walk_expr(ctx, c, out, boost, field),
            }
        }
        fn push_spec(
            ctx: &mut SearchContext,
            out: &mut Vec<TermGroup>,
            spec: &TermSpec,
            boost: f64,
            field: Option<Field>,
        ) {
            match spec {
                TermSpec::Word(t) => {
                    if !ctx.should_skip_stopword(t) {
                        out.push(TermGroup {
                            terms: ctx.expand(t),
                            boost,
                            field,
                        });
                    }
                }
                TermSpec::Fuzzy(t, d) => {
                    out.push(TermGroup {
                        terms: ctx.fuzzy_expand(t, *d),
                        boost,
                        field,
                    });
                }
                TermSpec::Wildcard(w) => {
                    out.push(TermGroup {
                        terms: wildcard::expand_wildcard(ctx.index, w),
                        boost,
                        field,
                    });
                }
                TermSpec::Field { field: f, inner } => {
                    push_spec(ctx, out, inner, boost, Some(*f));
                }
            }
        }
        let mut out = Vec::new();
        match plan {
            Plan::Ranked { terms, phrases } => {
                for st in terms {
                    push_spec(self, &mut out, &st.spec, st.boost, None);
                }
                for p in phrases {
                    for w in &p.words {
                        out.push(TermGroup {
                            terms: vec![w.clone()],
                            boost: p.boost,
                            field: None,
                        });
                    }
                }
            }
            Plan::Bool(expr) => walk_expr(self, expr, &mut out, 1.0, None),
        }
        out
    }

    /// The doc ids where a ranked term spec matches, sorted ascending.
    fn spec_candidates(&mut self, spec: &TermSpec) -> Vec<usize> {
        match spec {
            TermSpec::Word(t) => {
                if self.should_skip_stopword(t) {
                    return Vec::new();
                }
                let mut out = Vec::new();
                for e in self.expand(t) {
                    out = merge_sorted(&out, &posting_docs(self.index, &e));
                }
                out
            }
            TermSpec::Fuzzy(t, d) => {
                let mut out = Vec::new();
                for e in self.fuzzy_expand(t, *d) {
                    out = merge_sorted(&out, &posting_docs(self.index, &e));
                }
                out
            }
            TermSpec::Wildcard(w) => {
                let mut out = Vec::new();
                for e in wildcard::expand_wildcard(self.index, w) {
                    out = merge_sorted(&out, &posting_docs(self.index, &e));
                }
                out
            }
            TermSpec::Field { field, inner } => {
                let effs = self.spec_effective(Some(*field), inner);
                self.fields.field_docs(*field, &effs)
            }
        }
    }

    /// The expanded index terms of a ranked term spec (used by fielded
    /// candidates). Wildcards expand against the field's own vocabulary when
    /// a field restriction is in scope.
    fn spec_effective(&mut self, field: Option<Field>, spec: &TermSpec) -> Vec<String> {
        match spec {
            TermSpec::Word(t) => self.expand(t),
            TermSpec::Fuzzy(t, d) => self.fuzzy_expand(t, *d),
            TermSpec::Wildcard(w) => match field {
                Some(f) => self.fields.expand_wildcard(f, w),
                None => wildcard::expand_wildcard(self.index, w),
            },
            TermSpec::Field { inner, .. } => self.spec_effective(field, inner),
        }
    }

    /// The doc ids where any effective term (or the phrase) appears, sorted
    /// ascending and deduplicated.
    pub fn candidates(&mut self, plan: &Plan) -> Vec<usize> {
        let mut out: Vec<usize> = Vec::new();
        match plan {
            Plan::Ranked { terms, phrases } => {
                for st in terms {
                    out = merge_sorted(&out, &self.spec_candidates(&st.spec));
                }
                for p in phrases {
                    out = merge_sorted(&out, &phrase_docs(self.index, &p.words, p.slop));
                }
            }
            Plan::Bool(expr) => out = eval(self, expr),
        }
        out
    }
}

fn leaf_effective(ctx: &mut SearchContext, expr: &BoolExpr) -> Vec<String> {
    match expr {
        BoolExpr::Term(t) => ctx.expand(t),
        BoolExpr::Fuzzy(t, d) => ctx.fuzzy_expand(t, *d),
        BoolExpr::Wildcard(w) => wildcard::expand_wildcard(ctx.index, w),
        _ => Vec::new(),
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
        BoolExpr::Wildcard(w) => {
            let mut out = Vec::new();
            for e in wildcard::expand_wildcard(index, w) {
                out = merge_sorted(&out, &posting_docs(index, &e));
            }
            out
        }
        BoolExpr::Field { field, inner } => {
            let effs = match &**inner {
                BoolExpr::Wildcard(w) => ctx.fields.expand_wildcard(*field, w),
                _ => leaf_effective(ctx, inner),
            };
            ctx.fields.field_docs(*field, &effs)
        }
        BoolExpr::Phrase(words, slop) => phrase_docs(index, words, *slop),
        BoolExpr::Boost(inner, _) => eval(ctx, inner),
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
    SearchContext::new(index, *opts).candidates(plan)
}

/// "Did you mean" candidates: the nearest vocabulary terms (edit distance <=
/// 2, ascending `(distance, term)`) for every non-fuzzy, non-CJK, non-wildcard
/// query term that has zero vocabulary hits. Empty when nothing is missing.
pub fn suggestions(index: &Index, plan: &Plan) -> Vec<String> {
    fn missing_words(index: &Index, expr: &BoolExpr, out: &mut Vec<String>) {
        match expr {
            BoolExpr::Term(t) => {
                if index.df(t) == 0 {
                    out.push(t.clone());
                }
            }
            BoolExpr::Fuzzy(_, _) | BoolExpr::Wildcard(_) | BoolExpr::Field { .. } => {}
            BoolExpr::Phrase(words, _) => out.extend(words.iter().cloned()),
            BoolExpr::Boost(inner, _) => missing_words(index, inner, out),
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
            for st in terms {
                match &st.spec {
                    TermSpec::Word(t) => {
                        if index.df(t) == 0 && !SearchContext::is_cjk_term(t) {
                            missing.push(t.clone());
                        }
                    }
                    TermSpec::Fuzzy(_, _) | TermSpec::Wildcard(_) | TermSpec::Field { .. } => {}
                }
            }
            for p in phrases {
                for w in &p.words {
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

/// Scores one candidate document against the effective term groups.
///
/// A term counts as present when (a) its field restriction, if any, holds in
/// the document's field token set, and (b) the term appears in the body text.
/// Present terms contribute `score * boost` (with the 1.5x title boost when
/// the term also appears in the title); co-located terms add the proximity
/// bonus reported as a `(proximity)` row.
fn score_hit(
    index: &Index,
    scorer: Scorer,
    opts: &SearchOptions,
    lists: &[TermGroup],
    fields: &Fields,
    doc_id: usize,
) -> SearchHit {
    let title_terms: std::collections::HashSet<String> =
        index.docs.get(doc_id).map_or_else(std::collections::HashSet::new, |d| {
            tokenize(&d.title).into_iter().map(|t| t.term).collect()
        });
    let mut breakdown = Vec::new();
    let mut matches = Vec::new();
    let mut present: Vec<String> = Vec::new();
    let mut total = 0.0;
    for group in lists {
        for eff in &group.terms {
            let in_field = match &group.field {
                None => true,
                Some(f) => fields.contains(*f, doc_id, eff),
            };
            if in_field && index.tf(eff, doc_id) > 0 {
                let title = opts.signals && title_terms.contains(eff);
                let mut contrib = single_term_score(index, scorer, doc_id, eff);
                if title {
                    contrib *= TITLE_BOOST;
                }
                contrib *= group.boost;
                total += contrib;
                let label = match &group.field {
                    Some(f) => format!("{}:{}", f.name(), eff),
                    None => eff.clone(),
                };
                breakdown.push(Breakdown {
                    term: label,
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
    search_with(index, scorer, opts, plan, top, 1)
}

/// Same as [`search`] but parallelizes per-document scoring over `threads`
/// workers. Results are merged in document order before the score sort, so
/// `--threads 1` and `--threads 8` are byte-identical.
pub fn search_with(
    index: &Index,
    scorer: Scorer,
    opts: &SearchOptions,
    plan: &Plan,
    top: usize,
    threads: usize,
) -> Vec<SearchHit> {
    let mut ctx = SearchContext::new(index, *opts);
    let lists = ctx.effective_lists(plan);
    let candidates = ctx.candidates(plan);
    let fields = ctx.fields;

    let hits = if threads <= 1 || candidates.len() < 2 {
        candidates
            .into_iter()
            .map(|d| score_hit(index, scorer, opts, &lists, &fields, d))
            .collect()
    } else {
        let n = candidates.len();
        let chunk = n.div_ceil(threads);
        let cand = &candidates;
        let lists = &lists;
        let fields = &fields;
        let mut chunks: Vec<Vec<SearchHit>> = Vec::new();
        std::thread::scope(|s| {
            let mut handles = Vec::new();
            for start in (0..n).step_by(chunk) {
                let end = (start + chunk).min(n);
                handles.push(s.spawn(move || {
                    cand[start..end]
                        .iter()
                        .map(|&d| score_hit(index, scorer, opts, lists, fields, d))
                        .collect::<Vec<_>>()
                }));
            }
            for h in handles {
                chunks.push(h.join().unwrap_or_default());
            }
        });
        let mut out = Vec::with_capacity(n);
        for c in chunks {
            out.extend(c);
        }
        out
    };

    let mut hits = hits;
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
                        ScoredTerm {
                            spec: TermSpec::Word("rust".to_string()),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Word("cargo".to_string()),
                            boost: 1.0
                        }
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
                assert_eq!(
                    phrases,
                    vec![PhraseSpec {
                        words: vec!["inverted".to_string(), "index".to_string()],
                        slop: 0,
                        boost: 1.0
                    }]
                );
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
        assert!(parse_query("^2").is_err());
        assert!(parse_query("rust^").is_err());
        assert!(parse_query("rust^0").is_err());
        assert!(parse_query("rust^-2").is_err());
        assert!(parse_query("rust^abc").is_err());
        assert!(parse_query("title:").is_err());
        assert!(parse_query("title:\"phrase\"").is_err());
        assert!(parse_query("\"a b\"~10").is_err());
        assert!(parse_query("\"a b\"~x").is_err());
    }

    #[test]
    fn operators_inside_quotes_are_literals() {
        let plan = parse_query("\"and or not\"").unwrap();
        match plan {
            Plan::Ranked { terms, phrases } => {
                assert!(terms.is_empty());
                assert_eq!(phrases.len(), 1);
                assert_eq!(phrases[0].words, vec!["and", "or", "not"]);
                assert_eq!(phrases[0].slop, 0);
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
                        ScoredTerm {
                            spec: TermSpec::Word("variable".to_string()),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Word("length".to_string()),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Word("integer".to_string()),
                            boost: 1.0
                        }
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
                        ScoredTerm {
                            spec: TermSpec::Fuzzy("searching".to_string(), 1),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Fuzzy("rust".to_string(), 2),
                            boost: 1.0
                        },
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
            stopwords: false,
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
            stopwords: false,
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
            stopwords: false,
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
            stopwords: false,
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

    // ---- Level 3: wildcards ----

    #[test]
    fn parse_wildcard_terms() {
        let plan = parse_query("sear* sear?h ?earch").unwrap();
        match plan {
            Plan::Ranked { terms, .. } => {
                assert_eq!(
                    terms,
                    vec![
                        ScoredTerm {
                            spec: TermSpec::Wildcard("sear*".to_string()),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Wildcard("sear?h".to_string()),
                            boost: 1.0
                        },
                        ScoredTerm {
                            spec: TermSpec::Wildcard("?earch".to_string()),
                            boost: 1.0
                        },
                    ]
                );
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn wildcard_in_boolean_parses() {
        let plan = parse_query("sear* AND rust").unwrap();
        match plan {
            Plan::Bool(BoolExpr::And(parts)) => {
                assert!(matches!(&parts[0], BoolExpr::Wildcard(w) if w == "sear*"));
            }
            other => panic!("expected And, got {:?}", other),
        }
    }

    #[test]
    fn wildcard_expands_ranked_retrieval() {
        // "search"/"searches"/"searching" style stems: build an index where
        // several forms exist and confirm a prefix wildcard matches them all.
        let texts = [
            "the search and search again",
            "many searches happen",
            "searching is the goal",
            "an unrelated sort story",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("search*").unwrap();
        let hits = s(&idx, &plan, 10);
        assert!(ids(&hits).contains(&0));
        assert!(ids(&hits).contains(&1));
        assert!(ids(&hits).contains(&2));
        assert!(!ids(&hits).contains(&3));
    }

    #[test]
    fn wildcard_with_zero_matches_is_empty() {
        let idx = corpus();
        let plan = parse_query("zzzqq*").unwrap();
        assert!(s(&idx, &plan, 10).is_empty());
        // Zero-match wildcards never trigger suggestions.
        assert!(suggestions(&idx, &plan).is_empty());
    }

    #[test]
    fn wildcard_question_mark_matches_single_char() {
        let texts = ["search and researched", "socket"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("sear?h").unwrap();
        let hits = s(&idx, &plan, 10);
        // Only "search" (one char between sear and h) matches, not "researched".
        assert!(ids(&hits).contains(&0));
        let plan2 = parse_query("researc*").unwrap();
        assert!(ids(&s(&idx, &plan2, 10)).contains(&0));
    }

    #[test]
    fn wildcard_boost_multiplies_contributions() {
        let texts = ["the search engine", "a rust program"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plain = parse_query("search*").unwrap();
        let boosted = parse_query("search*^2").unwrap();
        let hits_plain = s(&idx, &plain, 10);
        let hits_boosted = s(&idx, &boosted, 10);
        assert!(!hits_plain.is_empty());
        assert!((hits_boosted[0].score - hits_plain[0].score * 2.0).abs() < 1e-9);
    }

    // ---- Level 3: fielded search ----

    #[test]
    fn parse_fielded_terms() {
        let plan = parse_query("title:rust source:docs*").unwrap();
        match plan {
            Plan::Ranked { terms, .. } => {
                assert_eq!(terms.len(), 2);
                assert!(matches!(
                    &terms[0].spec,
                    TermSpec::Field { field: Field::Title, inner } if matches!(inner.as_ref(), TermSpec::Word(w) if w == "rust")
                ));
                assert!(matches!(
                    &terms[1].spec,
                    TermSpec::Field { field: Field::Source, inner } if matches!(inner.as_ref(), TermSpec::Wildcard(w) if w == "docs*")
                ));
            }
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn fielded_search_filters_to_field() {
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
        let sources: Vec<String> = ["docs/a.md", "docs/b.md", "src/api.rs"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let idx = crate::index::build_index(&texts, &titles, &sources, &sources);

        let plan = parse_query("title:rust").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![2]);

        let plan2 = parse_query("source:docs*").unwrap();
        let hits2 = s(&idx, &plan2, 10);
        assert_eq!(ids(&hits2), vec![0, 1]);

        let plan3 = parse_query("source:api*").unwrap();
        let hits3 = s(&idx, &plan3, 10);
        assert_eq!(ids(&hits3), vec![2]);
    }

    #[test]
    fn fielded_boolean_composition() {
        let texts = [
            "rust database index",
            "rust web search",
            "database storage engine",
        ];
        let titles: Vec<String> = [
            "Rust database",
            "Web search",
            "Database engine",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        // Both docs 0 and 1 have "rust" somewhere; only doc 0 has it in the title.
        let plan = parse_query("title:rust AND database").unwrap();
        let hits = s(&idx, &plan, 10);
        assert_eq!(ids(&hits), vec![0]);
        // NOT title:rust -> docs without rust in their title.
        let plan2 = parse_query("rust AND NOT title:rust").unwrap();
        let hits2 = s(&idx, &plan2, 10);
        assert_eq!(ids(&hits2), vec![1]);
    }

    #[test]
    fn fielded_breakdown_marks_the_field() {
        let texts = [
            "rust database code",
            "rust web framework",
        ];
        let titles: Vec<String> = ["Rust database", "Other web"].iter().map(|s| s.to_string()).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("title:rust database").unwrap();
        let hits = s(&idx, &plan, 10);
        let hit = hits.iter().find(|h| h.doc_id == 0).unwrap();
        assert!(
            hit.breakdown.iter().any(|b| b.term == "title:rust"),
            "fielded row must be labeled title:rust: {:?}",
            hit.breakdown
        );
    }

    #[test]
    fn fielded_boost_scales_the_contribution() {
        let texts = ["rust and more rust", "rust"];
        let titles: Vec<String> = ["Rust rust", "No"].iter().map(|s| s.to_string()).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("title:rust^3").unwrap();
        let hits = s(&idx, &plan, 10);
        // Doc 0 has rust in its title and body; doc 1's title lacks rust.
        assert!(ids(&hits).contains(&0));
        let rust_row = hits[0]
            .breakdown
            .iter()
            .find(|b| b.term == "title:rust")
            .expect("title:rust row");
        // The contribution must be 3x the unboosted title:rust contribution.
        let plain = parse_query("title:rust").unwrap();
        let hits_plain = s(&idx, &plain, 10);
        let plain_row = hits_plain[0]
            .breakdown
            .iter()
            .find(|b| b.term == "title:rust")
            .expect("plain title:rust row");
        assert!((rust_row.score - plain_row.score * 3.0).abs() < 1e-9);
    }

    // ---- Level 3: phrase slop ----

    #[test]
    fn parse_phrase_slop() {
        let plan = parse_query("\"a b\"~2").unwrap();
        match plan {
            Plan::Ranked { phrases, .. } => {
                assert_eq!(phrases[0].slop, 2);
            }
            other => panic!("expected ranked, got {:?}", other),
        }
        let plan0 = parse_query("\"a b\"~0").unwrap();
        match plan0 {
            Plan::Ranked { phrases, .. } => assert_eq!(phrases[0].slop, 0),
            other => panic!("expected ranked, got {:?}", other),
        }
        // Bare `~` after a phrase means slop 1.
        let plan_bare = parse_query("\"a b\"~").unwrap();
        match plan_bare {
            Plan::Ranked { phrases, .. } => assert_eq!(phrases[0].slop, 1),
            other => panic!("expected ranked, got {:?}", other),
        }
    }

    #[test]
    fn slop_matches_within_window() {
        // "rust systems" appears in doc 0 consecutively; doc 1 has "rust"
        // and "systems" separated by one word ("is"); doc 2 by two words.
        let texts = [
            "rust systems language",
            "rust is systems language",
            "rust only and systems far far away",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let exact = parse_query("\"rust systems\"").unwrap();
        assert_eq!(ids(&s(&idx, &exact, 10)), vec![0]);
        let slop1 = parse_query("\"rust systems\"~1").unwrap();
        let hits1 = ids(&s(&idx, &slop1, 10));
        assert!(hits1.contains(&0) && hits1.contains(&1));
        assert!(!hits1.contains(&2), "one-word gap must exceed slop 1");
        let slop2 = parse_query("\"rust systems\"~2").unwrap();
        let hits2 = ids(&s(&idx, &slop2, 10));
        assert!(hits2.contains(&2), "two-word gap fits within slop 2");
    }

    #[test]
    fn slop_zero_equals_exact_phrase() {
        let texts = [
            "alpha beta gamma",
            "alpha something beta something gamma",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let exact = parse_query("\"alpha beta gamma\"").unwrap();
        let slop0 = parse_query("\"alpha beta gamma\"~0").unwrap();
        assert_eq!(ids(&s(&idx, &exact, 10)), vec![0]);
        assert_eq!(ids(&s(&idx, &slop0, 10)), vec![0]);
        let slop2 = parse_query("\"alpha beta gamma\"~2").unwrap();
        let h = ids(&s(&idx, &slop2, 10));
        assert!(h.contains(&0) && h.contains(&1), "slop 2 covers doc 1: {:?}", h);
    }

    #[test]
    fn phrase_slop_in_boolean() {
        let texts = ["quick brown fox", "quick not not brown fox"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plan = parse_query("\"quick brown\"~2 AND fox").unwrap();
        let hits = s(&idx, &plan, 10);
        assert!(ids(&hits).contains(&1), "sloppy phrase + boolean AND");
    }

    // ---- Level 3: boosting ----

    #[test]
    fn parse_term_boost() {
        let plan = parse_query("rust^2 cargo").unwrap();
        match plan {
            Plan::Ranked { terms, .. } => {
                assert_eq!(terms[0].boost, 2.0);
                assert_eq!(terms[1].boost, 1.0);
            }
            other => panic!("expected ranked, got {:?}", other),
        }
        let plan2 = parse_query("\"a b\"^1.5").unwrap();
        match plan2 {
            Plan::Ranked { phrases, .. } => assert_eq!(phrases[0].boost, 1.5),
            other => panic!("expected ranked, got {:?}", other),
        }
        let plan3 = parse_query("term~^2").unwrap();
        match plan3 {
            Plan::Ranked { terms, .. } => assert_eq!(terms[0].boost, 2.0),
            other => panic!("expected ranked, got {:?}", other),
        }
        let plan4 = parse_query("rust^2 AND cargo").unwrap();
        match plan4 {
            Plan::Bool(BoolExpr::And(parts)) => {
                assert!(matches!(&parts[0], BoolExpr::Boost(_, b) if *b == 2.0));
            }
            other => panic!("expected And, got {:?}", other),
        }
    }

    #[test]
    fn boost_scales_scores_and_breakdown() {
        let texts = [
            "rust rust rust systems",
            "rust systems language",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plain = parse_query("rust systems").unwrap();
        let boosted = parse_query("rust^2 systems").unwrap();
        let h_plain = s(&idx, &plain, 10);
        let h_boosted = s(&idx, &boosted, 10);
        let rust_plain = h_plain[0]
            .breakdown
            .iter()
            .find(|b| b.term == "rust")
            .unwrap()
            .score;
        let rust_boosted = h_boosted[0]
            .breakdown
            .iter()
            .find(|b| b.term == "rust")
            .unwrap()
            .score;
        assert!((rust_boosted - rust_plain * 2.0).abs() < 1e-9);
        let systems_boosted = h_boosted[0]
            .breakdown
            .iter()
            .find(|b| b.term == "systems")
            .unwrap()
            .score;
        let systems_plain = h_plain[0]
            .breakdown
            .iter()
            .find(|b| b.term == "systems")
            .unwrap()
            .score;
        assert!((systems_boosted - systems_plain).abs() < 1e-9, "unboosted term unchanged");
    }

    #[test]
    fn boost_can_change_ranking_order() {
        let texts = [
            "alpha beta beta beta beta beta",
            "alpha alpha alpha alpha alpha beta",
            "beta beta",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let plain = parse_query("alpha beta").unwrap();
        // Doc 1 has 5 alpha, doc 0 has 1; alpha is rarer (higher idf).
        let h_plain = s(&idx, &plain, 10);
        assert_eq!(h_plain[0].doc_id, 1);
        // Boosting beta 5x makes the beta-heavy doc 0 win.
        let boosted = parse_query("alpha beta^5").unwrap();
        let h_boosted = s(&idx, &boosted, 10);
        assert_eq!(h_boosted[0].doc_id, 0);
    }

    #[test]
    fn boosted_phrase_scales_word_contributions() {
        let texts = [
            "inverted index search",
            "inverted index index search",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let opts = SearchOptions {
            stem: false,
            signals: false,
            stopwords: true,
        };
        let plain = parse_query("\"inverted index\"").unwrap();
        let boosted = parse_query("\"inverted index\"^2").unwrap();
        let h_plain = search(&idx, Scorer::Bm25, &opts, &plain, 10);
        let h_boosted = search(&idx, Scorer::Bm25, &opts, &boosted, 10);
        assert!((h_boosted[0].score - h_plain[0].score * 2.0).abs() < 1e-9);
    }

    // ---- Level 3: stopwords ----

    #[test]
    fn stopwords_skip_ranked_plain_terms() {
        let texts = ["the rust language", "the different document"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let on = SearchOptions {
            stem: false,
            signals: true,
            stopwords: true,
        };
        let off = SearchOptions {
            stem: false,
            signals: true,
            stopwords: false,
        };
        let plan = parse_query("the rust").unwrap();
        let h_on = search(&idx, Scorer::Bm25, &on, &plan, 10);
        let h_off = search(&idx, Scorer::Bm25, &off, &plan, 10);
        // With stopwords on, "the" is dropped; the candidate set is just rust.
        assert!(!h_on.iter().any(|h| h.doc_id == 1), "stopword dropped doc 1");
        assert!(h_off.iter().any(|h| h.doc_id == 1), "without stopwords doc 1 matches 'the'");
    }

    #[test]
    fn stopwords_never_touch_boolean_or_phrases() {
        let texts = ["the quick brown fox", "quick fox"];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let on = SearchOptions {
            stem: false,
            signals: false,
            stopwords: true,
        };
        // Boolean "the AND fox" still matches doc 0 exactly.
        let bool_plan = parse_query("the AND fox").unwrap();
        assert_eq!(ids(&search(&idx, Scorer::Bm25, &on, &bool_plan, 10)), vec![0]);
        // The quoted phrase keeps "the".
        let phrase_plan = parse_query("\"the quick\"").unwrap();
        assert_eq!(ids(&search(&idx, Scorer::Bm25, &on, &phrase_plan, 10)), vec![0]);
    }

    #[test]
    fn stopword_list_contains_common_words() {
        assert!(is_stopword("the"));
        assert!(is_stopword("and"));
        assert!(is_stopword("of"));
        assert!(is_stopword("a"));
        assert!(!is_stopword("rust"));
        assert!(!is_stopword("search"));
        assert!(!is_stopword(""));
    }

    // ---- Level 3: concurrency ----

    #[test]
    fn threaded_search_matches_sequential_byte_for_byte() {
        let texts = [
            "rust rust cargo cargo cargo systems",
            "search engine indexing postings bm25",
            "rust systems programming language cargo",
            "搜索引擎 检索 索引 全文 搜索",
            "a b c d e f g h i j k l m n o p",
            "quick brown fox rust cargo systems",
        ];
        let titles: Vec<String> = (0..texts.len()).map(|i| format!("t-{}", i)).collect();
        let idx = crate::index::build_index(&texts, &titles, &titles, &titles);
        let opts = SearchOptions::default();
        for query in [
            "rust cargo systems",
            "rust AND cargo",
            "searching~",
            "cargo^2 systems",
            "搜索引擎",
            "\"rust cargo\"~2",
            "title:doc* AND rust",
        ] {
            let plan = parse_query(query).unwrap();
            let seq = search_with(&idx, Scorer::Bm25, &opts, &plan, 10, 1);
            for threads in [2usize, 4, 8] {
                let par = search_with(&idx, Scorer::Bm25, &opts, &plan, 10, threads);
                assert_eq!(par, seq, "threads={} differs for {:?}", threads, query);
            }
        }
    }

    // ---- Level 3: suggestions gating ----

    #[test]
    fn suggestions_skip_wildcards_and_fields() {
        let idx = corpus();
        let plan = parse_query("qjuick brwn* title:zzz").unwrap();
        // "qjuick" is a plain misspelling, so suggestions still fire for it;
        // the wildcard and fielded leaves are skipped.
        let sug = suggestions(&idx, &plan);
        assert!(sug.contains(&"quick".to_string()));
    }
}