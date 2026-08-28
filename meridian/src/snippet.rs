//! Snippet generation: a short window of document text around the best
//! cluster of matched terms, with highlight offsets for the UI.

/// A generated snippet.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Snippet {
    /// The displayed text, already bounded to word boundaries.
    pub text: String,
    /// Character ranges `[start, end)` of matched terms within `text`.
    pub highlights: Vec<(usize, usize)>,
    /// True when the snippet was cut on the left side.
    pub truncated_left: bool,
    /// True when the snippet was cut on the right side.
    pub truncated_right: bool,
}

/// A word token with its character range in the source document.
#[derive(Debug, Clone)]
struct Word {
    term: String,
    start: usize,
    end: usize,
}

/// Builds the word list with byte offsets, using exactly the same word rule
/// as the tokenizer (including apostrophe handling and case folding). The
/// byte span covers the original (unfolded) word in the source text.
fn word_spans(text: &str) -> Vec<Word> {
    let mut spans = Vec::new();
    let mut word = String::new();
    let mut word_start = 0usize;
    let mut in_word = false;
    let mut chars = text.char_indices().peekable();
    while let Some((idx, c)) = chars.next() {
        if c.is_alphanumeric() {
            if !in_word {
                in_word = true;
                word_start = idx;
                word.clear();
            }
            for lc in c.to_lowercase() {
                word.push(lc);
            }
        } else if c == '\'' && in_word {
            if let Some(&(_, next)) = chars.peek() {
                if next.is_alphanumeric() {
                    word.push('\'');
                    continue;
                }
            }
            flush_span(&mut word, word_start, idx, &mut spans, &mut in_word);
        } else {
            flush_span(&mut word, word_start, idx, &mut spans, &mut in_word);
        }
    }
    if in_word {
        flush_span(&mut word, word_start, text.len(), &mut spans, &mut in_word);
    }
    spans
}

fn flush_span(
    word: &mut String,
    start: usize,
    end: usize,
    spans: &mut Vec<Word>,
    in_word: &mut bool,
) {
    if *in_word {
        spans.push(Word {
            term: std::mem::take(word),
            start,
            end,
        });
        *in_word = false;
    }
}

/// Picks the snippet window containing the most matched terms.
pub fn generate(text: &str, query_terms: &[String], max_len: usize) -> Snippet {
    let max_len = max_len.max(40);
    let spans = word_spans(text);
    let terms: std::collections::HashSet<&str> =
        query_terms.iter().map(|s| s.as_str()).collect();

    // Find spans whose term is in the query.
    let matched: Vec<&Word> = spans
        .iter()
        .filter(|w| terms.contains(w.term.as_str()))
        .collect();

    if matched.is_empty() {
        // No match (should not happen for candidate docs): return the head.
        return head_snippet(text, max_len);
    }

    // Try each matched span as the window anchor; score by distinct matched
    // terms inside the window, tie-broken by earlier start.
    type Best = (usize, usize, Vec<(usize, usize)>, usize);
    let mut best: Option<Best> = None;
    for anchor in &matched {
        let start = anchor.start;
        let mut end = start + max_len;
        if end > text.len() {
            end = text.len();
        }
        // Don't cut mid-word.
        end = snap_end(text, start, end);
        let (hl, distinct) = highlight_in(text, start, end, &terms);
        let better = match &best {
            Some((_, _, _, best_distinct)) => distinct > *best_distinct,
            None => true,
        };
        if better {
            best = Some((start, end, hl, distinct));
        }
    }

    let (start, end, hl, _) = best.unwrap_or((0, text.len().min(max_len), Vec::new(), 0));
    let truncated_left = start > 0;
    let truncated_right = end < text.len();

    let mut out = String::new();
    if truncated_left {
        out.push('…');
    }
    out.push_str(&text[start..end]);
    if truncated_right {
        out.push('…');
    }

    // Adjust highlight offsets for the added ellipsis (byte length).
    let offset = if truncated_left { "…".len() } else { 0 };
    let highlights = hl
        .into_iter()
        .map(|(s, e)| (s - start + offset, e - start + offset))
        .collect();

    Snippet {
        text: out,
        highlights,
        truncated_left,
        truncated_right,
    }
}

/// Counts matched-term highlights inside `[start, end)`, returning the ranges
/// and the number of distinct query terms hit.
fn highlight_in(
    text: &str,
    start: usize,
    end: usize,
    terms: &std::collections::HashSet<&str>,
) -> (Vec<(usize, usize)>, usize) {
    let mut out = Vec::new();
    let mut distinct = std::collections::HashSet::new();
    for w in word_spans(text) {
        if w.start >= start && w.end <= end && terms.contains(w.term.as_str()) {
            out.push((w.start, w.end));
            distinct.insert(w.term.clone());
        }
    }
    (out, distinct.len())
}

fn snap_end(text: &str, start: usize, mut end: usize) -> usize {
    if end >= text.len() {
        return text.len();
    }
    // Back up to a char boundary.
    while end > start && !text.is_char_boundary(end) {
        end -= 1;
    }
    if end <= start {
        return text.len();
    }
    let prev_is_word = text[..end]
        .chars()
        .next_back()
        .map(|c| c.is_alphanumeric())
        .unwrap_or(false);
    let next_is_word = text[end..]
        .chars()
        .next()
        .map(|c| c.is_alphanumeric())
        .unwrap_or(false);
    // Snap only when the boundary splits a word.
    if prev_is_word && next_is_word {
        let word_start = word_start_of(text, end);
        if word_start >= start {
            return word_start;
        }
    }
    end
}

fn word_start_of(text: &str, byte: usize) -> usize {
    let prefix = &text[..byte];
    let mut last_sep_end = 0usize;
    let mut in_word = false;
    for (idx, c) in prefix.char_indices() {
        if c.is_alphanumeric() || (c == '\'' && in_word) {
            in_word = true;
        } else {
            last_sep_end = idx + c.len_utf8();
            in_word = false;
        }
    }
    last_sep_end
}

fn head_snippet(text: &str, max_len: usize) -> Snippet {
    let end = snap_end(text, 0, max_len.min(text.len()));
    let text_slice = &text[..end];
    Snippet {
        text: text_slice.to_string(),
        highlights: Vec::new(),
        truncated_left: false,
        truncated_right: end < text.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn q(terms: &[&str]) -> Vec<String> {
        terms.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn snippet_contains_the_match() {
        let text = "The quick brown fox jumps over the lazy dog. Then the fox sleeps.";
        let s = generate(text, &q(&["fox"]), 60);
        assert!(s.text.contains("fox"));
        assert!(!s.highlights.is_empty());
        let (hs, he) = s.highlights[0];
        assert_eq!(&s.text[hs..he], "fox");
    }

    #[test]
    fn snippet_highlights_all_matched_terms() {
        let text = "rust is a systems programming language for performance and safety";
        let s = generate(text, &q(&["rust", "systems", "performance"]), 80);
        for (hs, he) in &s.highlights {
            let word = &s.text[*hs..*he];
            assert!(["rust", "systems", "performance"].contains(&word));
        }
    }

    #[test]
    fn snippet_marks_truncation() {
        let long = "word ".repeat(200);
        let s = generate(&long, &q(&["word"]), 60);
        assert!(s.text.len() <= 63, "got {}", s.text.len());
        assert!(s.truncated_right);
    }

    #[test]
    fn snippet_no_crash_on_no_match() {
        let s = generate("nothing here matches", &q(&["zzz"]), 50);
        assert!(s.text.contains("nothing"));
        assert!(s.highlights.is_empty());
    }

    #[test]
    fn snippet_bounds_are_valid_utf8_boundaries() {
        let text = "café déjà vu and a very long sentence about ünïcödé spanning words";
        let s = generate(text, &q(&["déjà"]), 30);
        for (hs, he) in &s.highlights {
            assert!(s.text.is_char_boundary(*hs));
            assert!(s.text.is_char_boundary(*he));
        }
    }

    #[test]
    fn distinct_terms_win_over_repeats() {
        let text = "search engine ranking is about ranking ranking ranking quality";
        // Anchor around "engine" should be preferred over the repeated
        // "ranking" cluster because it covers 2 distinct terms.
        let s = generate(text, &q(&["search", "engine", "ranking"]), 60);
        let mut distinct = std::collections::HashSet::new();
        for (hs, he) in &s.highlights {
            distinct.insert(&s.text[*hs..*he]);
        }
        assert!(distinct.len() >= 2, "want 2+ distinct terms, got {:?}", distinct);
    }
}