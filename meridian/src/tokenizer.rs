//! Unicode-aware tokenizer with token positions.

/// A single token: a lowercase term plus its 0-based position in the
/// document stream.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub term: String,
    pub position: usize,
}

/// Tokenizes a document into lowercase terms with positions.
///
/// Rules (deterministic):
/// - Word characters are `char::is_alphanumeric` (unicode letters and
///   digits) plus an apostrophe between two word characters (`don't`).
/// - Case folding uses `char::to_lowercase`.
/// - Every other character is a separator.
///
/// A term must contain at least one alphanumeric character.
pub fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut word = String::new();

    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c.is_alphanumeric() {
            push_lowercase(&mut word, c);
        } else if c == '\'' && !word.is_empty() {
            if let Some(&next) = chars.peek() {
                if next.is_alphanumeric() {
                    word.push('\'');
                    continue;
                }
            }
            flush(&mut word, &mut tokens);
        } else {
            flush(&mut word, &mut tokens);
        }
    }
    flush(&mut word, &mut tokens);

    tokens
}

fn push_lowercase(word: &mut String, c: char) {
    for lc in c.to_lowercase() {
        word.push(lc);
    }
}

fn flush(word: &mut String, tokens: &mut Vec<Token>) {
    if word.is_empty() {
        return;
    }
    let has_alnum = word.chars().any(|c| c.is_alphanumeric());
    if has_alnum {
        tokens.push(Token {
            term: std::mem::take(word),
            position: tokens.len(),
        });
    } else {
        word.clear();
    }
}

/// The distinct terms of a document in first-occurrence order.
pub fn unique_terms(tokens: &[Token]) -> Vec<&str> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for t in tokens {
        if seen.insert(t.term.as_str()) {
            out.push(t.term.as_str());
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn terms(t: &[Token]) -> Vec<&str> {
        t.iter().map(|x| x.term.as_str()).collect()
    }

    #[test]
    fn lowercases_and_splits() {
        let t = tokenize("The Quick Brown Fox");
        assert_eq!(terms(&t), vec!["the", "quick", "brown", "fox"]);
        assert_eq!(t[0].position, 0);
        assert_eq!(t[3].position, 3);
    }

    #[test]
    fn handles_apostrophes() {
        let t = tokenize("don't stop rock'n'roll it's fine");
        assert_eq!(
            terms(&t),
            vec!["don't", "stop", "rock'n'roll", "it's", "fine"]
        );
    }

    #[test]
    fn splits_punctuation_and_symbols() {
        let t = tokenize("hello, world! (paren) - hyphen_at:underscore [x] \"quoted\"");
        assert_eq!(
            terms(&t),
            vec!["hello", "world", "paren", "hyphen", "at", "underscore", "x", "quoted"]
        );
    }

    #[test]
    fn splits_urls_and_code() {
        let t = tokenize("see https://example.com/path?q=1&x=2 or k1=1.2");
        assert_eq!(
            terms(&t),
            vec![
                "see", "https", "example", "com", "path", "q", "1", "x", "2", "or", "k1", "1",
                "2"
            ]
        );
    }

    #[test]
    fn unicode_letters_are_kept() {
        let t = tokenize("Café déjà vu über Straße");
        assert_eq!(terms(&t), vec!["café", "déjà", "vu", "über", "straße"]);
    }

    #[test]
    fn leading_apostrophe_is_a_separator() {
        let t = tokenize("'tis the 'season");
        assert_eq!(terms(&t), vec!["tis", "the", "season"]);
    }

    #[test]
    fn empty_and_symbol_only_input() {
        assert!(tokenize("").is_empty());
        assert!(tokenize("!!! ??? ---").is_empty());
    }

    #[test]
    fn positions_are_contiguous() {
        let t = tokenize("a b c d e");
        for (i, tok) in t.iter().enumerate() {
            assert_eq!(tok.position, i);
        }
    }
}