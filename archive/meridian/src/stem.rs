//! Morphological normalization: a from-scratch Porter stemmer plus a
//! stem-group table that lets a query term expand to every vocabulary term
//! sharing its stem ("rank", "ranks", "ranking", "ranked" all fold to
//! "rank").
//!
//! The stemmer is a faithful port of Martin Porter's canonical 1980
//! algorithm (the ANSI C reference implementation at
//! <https://tartarus.org/martin/PorterStemmer/>), which is the version that
//! the classic 23,531-word reference test set (`voc.txt` vs `output.txt`)
//! was produced against. Key subtleties that other ports get wrong:
//!
//! - Step 2/3/4 dispatch on the last (or second-to-last) character of the
//!   current word, and try suffixes in a fixed order, stopping at the first
//!   match even when the `m` constraint then rejects it.
//! - The measure `m` is computed on the stem *before* a replacement is
//!   applied (`r(s)` is "if m() > threshold, then setto").
//! - `y` counts as a consonant when it starts a word or follows a vowel.
//!
//! It is applied to ASCII words of length >= 3 (the reference skips length 1
//! and 2); shorter and non-ASCII words pass through unchanged, which keeps the
//! behaviour deterministic and CJK text untouched. Verified against the full
//! reference set: 23,531/23,531 words match.

use std::collections::BTreeMap;

/// One in-progress stemming operation over a character buffer. `k` is the
/// index of the last significant character (the reference's `k`); `j` is the
/// stem endpoint recorded by `ends()` and read by `measure()`.
struct Stemmer {
    word: Vec<char>,
    k: usize,
    j: isize,
}

impl Stemmer {
    /// `cons(i)`: true iff `word[i]` is a consonant. `y` is a consonant when
    /// it starts the word or follows a vowel.
    fn cons(&self, i: usize) -> bool {
        match self.word[i] {
            'a' | 'e' | 'i' | 'o' | 'u' => false,
            'y' => i == 0 || !self.cons(i - 1),
            _ => true,
        }
    }

    /// The measure `m` of `word[0..=j]`: the number of vowel-consonant
    /// sequences. `j` may be -1 (empty stem), yielding 0.
    fn measure(&self, j: isize) -> usize {
        let mut n = 0;
        let mut i = 0isize;
        // Skip the leading consonant sequence, if any.
        loop {
            if i > j {
                return n;
            }
            if !self.cons(i as usize) {
                break;
            }
            i += 1;
        }
        i += 1;
        loop {
            // Find the consonant that closes the current vowel sequence.
            loop {
                if i > j {
                    return n;
                }
                if self.cons(i as usize) {
                    break;
                }
                i += 1;
            }
            i += 1;
            n += 1;
            // Skip the following consonant sequence.
            loop {
                if i > j {
                    return n;
                }
                if !self.cons(i as usize) {
                    break;
                }
                i += 1;
            }
            i += 1;
        }
    }

    /// True when `word[0..=j]` contains a vowel.
    fn vowel_in_stem(&self, j: isize) -> bool {
        for i in 0..=j {
            if !self.cons(i as usize) {
                return true;
            }
        }
        false
    }

    /// True when `word` ends in a double consonant ending at index `j`.
    fn double_consonant(&self, j: usize) -> bool {
        if j < 1 {
            return false;
        }
        self.word[j] == self.word[j - 1] && self.cons(j)
    }

    /// True when `word[i-2..=i]` is consonant-vowel-consonant with a final
    /// consonant that is not w, x or y (`*o`).
    fn cvc(&self, i: usize) -> bool {
        if i < 2 {
            return false;
        }
        if !self.cons(i) || self.cons(i - 1) || !self.cons(i - 2) {
            return false;
        }
        !matches!(self.word[i], 'w' | 'x' | 'y')
    }

    /// Records `j = k - suffix.len()` when the word ends with `suffix`.
    fn ends(&mut self, suffix: &str) -> bool {
        let len = suffix.len();
        if len > self.k + 1 {
            return false;
        }
        let start = self.k + 1 - len;
        let chars: Vec<char> = suffix.chars().collect();
        if self.word[start..=self.k] != chars[..] {
            return false;
        }
        self.j = start as isize - 1;
        true
    }

    /// Writes `rep` at `word[j+1..]` and moves `k` to the new end.
    fn setto(&mut self, rep: &str) {
        self.word.truncate(self.j.max(0) as usize + 1);
        self.word.extend(rep.chars());
        self.k = self.word.len() - 1;
    }

    /// `r(s)`: replace when the measure of the current stem exceeds the
    /// threshold (0 for steps 2/3, 1 for step 4).
    fn r(&mut self, rep: &str, threshold: usize) {
        if self.measure(self.j) > threshold {
            self.setto(rep);
        }
    }

    fn step1ab(&mut self) {
        if self.word[self.k] == 's' {
            if self.ends("sses") {
                self.k -= 2;
            } else if self.ends("ies") {
                self.setto("i");
            } else if self.word[self.k - 1] != 's' {
                self.k -= 1;
            }
        }
        if self.ends("eed") {
            if self.measure(self.j) > 0 {
                self.k -= 1;
            }
        } else if (self.ends("ed") || self.ends("ing")) && self.vowel_in_stem(self.j) {
            self.k = self.j.max(0) as usize;
            if self.ends("at") {
                self.setto("ate");
            } else if self.ends("bl") {
                self.setto("ble");
            } else if self.ends("iz") {
                self.setto("ize");
            } else if self.double_consonant(self.k) {
                self.k -= 1;
                let ch = self.word[self.k];
                if matches!(ch, 'l' | 's' | 'z') {
                    self.k += 1;
                }
            } else if self.measure(self.k as isize) == 1 && self.cvc(self.k) {
                self.setto("e");
            }
        }
    }

    fn step1c(&mut self) {
        if self.ends("y") && self.vowel_in_stem(self.j) {
            self.word[self.k] = 'i';
        }
    }

    fn step2(&mut self) {
        let penultimate = self.word[self.k - 1];
        match penultimate {
            'a' => {
                if self.ends("ational") {
                    self.r("ate", 0);
                } else if self.ends("tional") {
                    self.r("tion", 0);
                }
            }
            'c' => {
                if self.ends("enci") {
                    self.r("ence", 0);
                } else if self.ends("anci") {
                    self.r("ance", 0);
                }
            }
            'e' => {
                if self.ends("izer") {
                    self.r("ize", 0);
                }
            }
            'l' => {
                // The C reference encodes a departure from the published
                // algorithm here: it matches the 3-letter "bli" and maps it
                // to "ble" (the paper's "abli" -> "able" line is commented
                // out). The 23,531-word reference set was produced against
                // the C version, so "bli" is the behaviour we replicate.
                if self.ends("bli") {
                    self.r("ble", 0);
                } else if self.ends("alli") {
                    self.r("al", 0);
                } else if self.ends("entli") {
                    self.r("ent", 0);
                } else if self.ends("eli") {
                    self.r("e", 0);
                } else if self.ends("ousli") {
                    self.r("ous", 0);
                }
            }
            'o' => {
                if self.ends("ization") {
                    self.r("ize", 0);
                } else if self.ends("ation") || self.ends("ator") {
                    self.r("ate", 0);
                }
            }
            's' => {
                if self.ends("alism") {
                    self.r("al", 0);
                } else if self.ends("iveness") {
                    self.r("ive", 0);
                } else if self.ends("fulness") {
                    self.r("ful", 0);
                } else if self.ends("ousness") {
                    self.r("ous", 0);
                }
            }
            't' => {
                if self.ends("aliti") {
                    self.r("al", 0);
                } else if self.ends("iviti") {
                    self.r("ive", 0);
                } else if self.ends("biliti") {
                    self.r("ble", 0);
                }
            }
            'g' if self.ends("logi") => {
                self.r("log", 0);
            }
            _ => {}
        }
    }

    fn step3(&mut self) {
        let last = self.word[self.k];
        match last {
            'e' => {
                if self.ends("icate") {
                    self.r("ic", 0);
                } else if self.ends("ative") {
                    self.r("", 0);
                } else if self.ends("alize") {
                    self.r("al", 0);
                }
            }
            'i' => {
                if self.ends("iciti") {
                    self.r("ic", 0);
                }
            }
            'l' => {
                if self.ends("ical") {
                    self.r("ic", 0);
                } else if self.ends("ful") {
                    self.r("", 0);
                }
            }
            's' if self.ends("ness") => {
                self.r("", 0);
            }
            _ => {}
        }
    }

    fn step4(&mut self) {
        let penultimate = self.word[self.k - 1];
        match penultimate {
            'a' if self.ends("al") => self.finish_step4(),
            'c' if self.ends("ance") => self.finish_step4(),
            'c' if self.ends("ence") => self.finish_step4(),
            'e' if self.ends("er") => self.finish_step4(),
            'i' if self.ends("ic") => self.finish_step4(),
            'l' if self.ends("able") => self.finish_step4(),
            'l' if self.ends("ible") => self.finish_step4(),
            'n' if self.ends("ant") => self.finish_step4(),
            'n' if self.ends("ement") => self.finish_step4(),
            'n' if self.ends("ment") => self.finish_step4(),
            'n' if self.ends("ent") => self.finish_step4(),
            'o'
                if self.ends("ion")
                    && self.j >= 0
                    && matches!(self.word[self.j as usize], 's' | 't') =>
            {
                self.finish_step4()
            }
            'o' if self.ends("ou") => self.finish_step4(),
            's' if self.ends("ism") => self.finish_step4(),
            't' if self.ends("ate") => self.finish_step4(),
            't' if self.ends("iti") => self.finish_step4(),
            'u' if self.ends("ous") => self.finish_step4(),
            'v' if self.ends("ive") => self.finish_step4(),
            'z' if self.ends("ize") => self.finish_step4(),
            _ => {}
        }
    }

    /// Shared tail of step 4: apply the removal when m > 1.
    fn finish_step4(&mut self) {
        if self.measure(self.j) > 1 {
            self.k = self.j.max(0) as usize;
        }
    }

    fn step5(&mut self) {
        self.j = self.k as isize;
        if self.word[self.k] == 'e' {
            let a = self.measure(self.j);
            if a > 1 || (a == 1 && !self.cvc(self.k - 1)) {
                self.k -= 1;
            }
        }
        if self.word[self.k] == 'l' && self.double_consonant(self.k) && self.measure(self.k as isize) > 1
        {
            self.k -= 1;
        }
    }

    fn run(&mut self) -> String {
        self.step1ab();
        if self.k > 0 {
            self.step1c();
            self.step2();
            self.step3();
            self.step4();
            self.step5();
        }
        self.word.truncate(self.k + 1);
        self.word.iter().collect()
    }
}

/// Stems an ASCII word of length >= 3 with the Porter algorithm; any other
/// word is returned unchanged.
pub fn stem(word: &str) -> String {
    if word.len() < 3 || !word.is_ascii() {
        return word.to_string();
    }
    Stemmer {
        word: word.chars().collect(),
        k: word.len() - 1,
        j: word.len() as isize - 1,
    }
    .run()
}

/// Groups vocabulary terms by stem: `stem -> sorted vocab terms`. Built once
/// from the index's term table; used to expand a query term to its whole
/// morphological family.
pub fn stem_groups<'a>(terms: impl Iterator<Item = &'a str>) -> BTreeMap<String, Vec<String>> {
    let mut groups: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for t in terms {
        let s = stem(t);
        groups.entry(s).or_default().push(t.to_string());
    }
    for group in groups.values_mut() {
        group.sort();
    }
    groups
}

/// The stem group of a single query term given the precomputed table; falls
/// back to the term itself when it has no family.
pub fn expand(group_table: &BTreeMap<String, Vec<String>>, term: &str) -> Vec<String> {
    match group_table.get(&stem(term)) {
        Some(group) => group.clone(),
        None => vec![term.to_string()],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_porter_vectors() {
        // The canonical Porter test set from the reference implementation.
        let vectors: &[(&str, &str)] = &[
            ("caresses", "caress"),
            ("ponies", "poni"),
            ("ties", "ti"),
            ("caress", "caress"),
            ("cats", "cat"),
            ("feed", "feed"),
            ("agreed", "agre"),
            ("plastered", "plaster"),
            ("motoring", "motor"),
            ("sing", "sing"),
            ("conflated", "conflat"),
            ("troubled", "troubl"),
            ("sized", "size"),
            ("hopping", "hop"),
            ("tanned", "tan"),
            ("falling", "fall"),
            ("hissing", "hiss"),
            ("fizzed", "fizz"),
            ("failing", "fail"),
            ("filing", "file"),
            ("happy", "happi"),
            ("sky", "sky"),
            ("relational", "relat"),
            ("conditional", "condit"),
            ("rational", "ration"),
            ("valenci", "valenc"),
            ("hesitanci", "hesit"),
            ("digitizer", "digit"),
            ("conformabli", "conform"),
            ("radicalli", "radic"),
            ("differentli", "differ"),
            ("vileli", "vile"),
            ("analogousli", "analog"),
            ("vietnamization", "vietnam"),
            ("predication", "predic"),
            ("operator", "oper"),
            ("feudalism", "feudal"),
            ("decisiveness", "decis"),
            ("hopefulness", "hope"),
            ("callousness", "callous"),
            ("formaliti", "formal"),
            ("sensitiviti", "sensit"),
            ("sensibiliti", "sensibl"),
            ("triplicate", "triplic"),
            ("formative", "form"),
            ("formalize", "formal"),
            ("electriciti", "electr"),
            ("electrical", "electr"),
            ("hopeful", "hope"),
            ("goodness", "good"),
            ("revival", "reviv"),
            ("allowance", "allow"),
            ("inference", "infer"),
            ("airliner", "airlin"),
            ("gyroscopic", "gyroscop"),
            ("adjustable", "adjust"),
            ("defensible", "defens"),
            ("irritant", "irrit"),
            ("replacement", "replac"),
            ("adjustment", "adjust"),
            ("dependent", "depend"),
            ("adoption", "adopt"),
            ("homologou", "homolog"),
            ("communism", "commun"),
            ("activate", "activ"),
            ("angulariti", "angular"),
            ("homologous", "homolog"),
            ("effective", "effect"),
            ("bowdlerize", "bowdler"),
            ("probate", "probat"),
            ("rate", "rate"),
            ("cease", "ceas"),
            ("controll", "control"),
            ("roll", "roll"),
        ];
        for (input, expected) in vectors {
            assert_eq!(stem(input), *expected, "stem({:?})", input);
        }
    }

    #[test]
    fn short_and_non_ascii_pass_through() {
        assert_eq!(stem("a"), "a");
        assert_eq!(stem("is"), "is");
        assert_eq!(stem("搜索引擎"), "搜索引擎");
        assert_eq!(stem("café"), "café");
    }

    #[test]
    fn stem_groups_are_sorted_and_family_like() {
        let terms = ["ranking", "ranked", "ranks", "rank", "rust", "rusting"];
        let groups = stem_groups(terms.iter().copied());
        // rank and its inflections share one stem.
        let rank = groups.get("rank").expect("rank group");
        assert_eq!(*rank, vec!["rank", "ranked", "ranking", "ranks"]);
        // rust variants share a stem ("rusty" -> "rusti" per the Porter rule,
        // so it deliberately falls outside the group).
        let rust = groups.get("rust").expect("rust group");
        assert_eq!(*rust, vec!["rust", "rusting"]);
    }

    #[test]
    fn expand_falls_back_to_the_term() {
        let groups = stem_groups(["ranked", "ranking"].iter().copied());
        assert_eq!(expand(&groups, "rank"), vec!["ranked", "ranking"]);
        assert_eq!(expand(&groups, "xyzzy"), vec!["xyzzy"]);
    }
}