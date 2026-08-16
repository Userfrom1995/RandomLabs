//! Unicode-aware tokenizer with token positions.
//!
//! Two token classes are produced:
//! - Words: lowercase alphanumeric runs (plus apostrophes inside words).
//! - CJK n-grams: contiguous runs of Han, Hiragana, Katakana or Hangul
//!   characters are segmented into unigrams and bigrams. Each character at
//!   run-relative position `i` yields a unigram and, when not at the run end,
//!   a bigram starting at that character. Both share the same token position,
//!   so phrase matching over CJK text is approximate (see the docs).
//!
//! Positions advance by one per emitted word and by one per character inside
//! a CJK run, so they always increase and stay deterministic.

/// A single token: a lowercase term plus its 0-based position in the
/// document stream.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub term: String,
    pub position: usize,
}

/// True for characters that should be segmented as CJK n-grams rather than
/// kept inside a latin word: CJK unified ideographs (incl. extension A and
/// compatibility), Hiragana, Katakana and Hangul syllables.
pub fn is_cjk(c: char) -> bool {
    matches!(
        c,
        '\u{3400}'..='\u{4DBF}'
            | '\u{4E00}'..='\u{9FFF}'
            | '\u{F900}'..='\u{FAFF}'
            | '\u{3040}'..='\u{309F}'
            | '\u{30A0}'..='\u{30FF}'
            | '\u{AC00}'..='\u{D7AF}'
    )
}

/// Tokenizes a document into lowercase terms with positions.
///
/// Rules (deterministic):
/// - Word characters are `char::is_alphanumeric` (unicode letters and
///   digits) plus an apostrophe between two word characters (`don't`).
/// - Contiguous CJK runs are segmented into unigrams and bigrams as
///   described in the module docs.
/// - Case folding uses `char::to_lowercase`.
/// - Every other character is a separator.
///
/// A term must contain at least one alphanumeric character.
pub fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut word = String::new();
    let mut pos = 0usize;

    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if is_cjk(c) {
            flush(&mut word, &mut tokens, &mut pos);
            let mut run = String::new();
            run.push(c);
            while let Some(&next) = chars.peek() {
                if is_cjk(next) {
                    run.push(next);
                    chars.next();
                } else {
                    break;
                }
            }
            segment_cjk(&run, &mut tokens, &mut pos);
        } else if c.is_alphanumeric() {
            push_lowercase(&mut word, c);
        } else if c == '\'' && !word.is_empty() {
            if let Some(&next) = chars.peek() {
                if next.is_alphanumeric() {
                    word.push('\'');
                    continue;
                }
            }
            flush(&mut word, &mut tokens, &mut pos);
        } else {
            flush(&mut word, &mut tokens, &mut pos);
        }
    }
    flush(&mut word, &mut tokens, &mut pos);

    tokens
}

fn push_lowercase(word: &mut String, c: char) {
    for lc in c.to_lowercase() {
        word.push(lc);
    }
}

/// Emits a CJK run as unigrams plus bigrams. All tokens for character `i`
/// share the position `pos + i`; the caller advances `pos` by the run length.
fn segment_cjk(run: &str, tokens: &mut Vec<Token>, pos: &mut usize) {
    let chars: Vec<char> = run.chars().collect();
    for i in 0..chars.len() {
        let p = *pos + i;
        let uni: String = chars[i].to_lowercase().collect();
        if !uni.is_empty() && uni.chars().all(|c| c.is_alphanumeric()) {
            tokens.push(Token { term: uni, position: p });
        }
        if i + 1 < chars.len() {
            let mut bi = String::new();
            bi.extend(chars[i].to_lowercase());
            bi.extend(chars[i + 1].to_lowercase());
            if bi.chars().all(|c| c.is_alphanumeric()) {
                tokens.push(Token {
                    term: bi,
                    position: p,
                });
            }
        }
    }
    *pos += chars.len();
}

fn flush(word: &mut String, tokens: &mut Vec<Token>, pos: &mut usize) {
    if word.is_empty() {
        return;
    }
    let has_alnum = word.chars().any(|c| c.is_alphanumeric());
    if has_alnum {
        tokens.push(Token {
            term: std::mem::take(word),
            position: *pos,
        });
        *pos += 1;
    } else {
        word.clear();
    }
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

    #[test]
    fn cjk_runs_segment_into_unigrams_and_bigrams() {
        let t = tokenize("日本語");
        // 日, 日本, 本, 本語, 語
        assert_eq!(
            terms(&t),
            vec!["日", "日本", "本", "本語", "語"]
        );
        // 日 and 日本 share position 0; 本 and 本語 share position 1; 語 is 2.
        assert_eq!(t[0].position, 0);
        assert_eq!(t[1].position, 0);
        assert_eq!(t[2].position, 1);
        assert_eq!(t[3].position, 1);
        assert_eq!(t[4].position, 2);
    }

    #[test]
    fn cjk_runs_mix_with_latin_words() {
        let t = tokenize("Hello世界World");
        assert_eq!(
            terms(&t),
            vec!["hello", "世", "世界", "界", "world"]
        );
        assert_eq!(t[0].position, 0);
        assert_eq!(t[1].position, 1);
        assert_eq!(t[2].position, 1);
        assert_eq!(t[3].position, 2);
        assert_eq!(t[4].position, 3);
    }

    #[test]
    fn cjk_covers_hiragana_katakana_and_hangul() {
        let t = tokenize("ひらがなカタカナ한글");
        let all = terms(&t);
        assert!(all.contains(&"ひら"));
        assert!(all.contains(&"らが"));
        assert!(all.contains(&"カタ"));
        assert!(all.contains(&"ナ한"));
        assert!(all.contains(&"한글"));
    }

    #[test]
    fn cjk_separators_do_not_bridge_bigrams() {
        let t = tokenize("漢・字");
        // ・ is not alphanumeric, so 漢 and 字 stay unigram-only.
        assert_eq!(terms(&t), vec!["漢", "字"]);
    }
}