//! Machine high-score table for the web layer.
//!
//! Pure logic: top-10 sorted table shared in spirit with the terminal
//! layer's machine scores. Persistence (localStorage) is owned by the JS
//! harness through the `bridge` getters; this module never touches I/O.

/// Maximum entries kept in the table.
pub const MAX_ENTRIES: usize = 10;
/// Maximum display characters per name.
pub const MAX_NAME: usize = 12;

/// One table row.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Entry {
    /// Sanitized display name (trimmed, capped at [`MAX_NAME`] chars).
    pub name: String,
    /// Final game score.
    pub score: u32,
    /// Level reached.
    pub level: u32,
}

/// Top-10 table, sorted by score descending.
#[derive(Clone, PartialEq, Eq, Debug, Default)]
pub struct Scores {
    entries: Vec<Entry>,
}

impl Scores {
    /// Empty table.
    pub fn new() -> Self {
        Self::default()
    }

    /// Number of rows.
    pub fn count(&self) -> usize {
        self.entries.len()
    }

    /// Row `i`, or `None` when out of range.
    pub fn get(&self, i: usize) -> Option<&Entry> {
        self.entries.get(i)
    }

    /// Best score on the table, or 0 when empty.
    pub fn best(&self) -> u32 {
        self.entries.first().map(|e| e.score).unwrap_or(0)
    }

    /// Whether `score` would make the table (score must be positive and
    /// either the table has room or it beats the weakest row).
    pub fn qualifies(&self, score: u32) -> bool {
        if score == 0 {
            return false;
        }
        if self.entries.len() < MAX_ENTRIES {
            return true;
        }
        self.entries.iter().any(|e| score > e.score)
    }

    /// Sanitize a raw name: trim, fall back to `"Pip"`, cap at
    /// [`MAX_NAME`] characters.
    pub fn clean_name(raw: &str) -> String {
        let trimmed = raw.trim();
        let base = if trimmed.is_empty() { "Pip" } else { trimmed };
        base.chars().take(MAX_NAME).collect()
    }

    /// Insert a row, keeping score-descending order (ties keep the older
    /// row first) and capping at [`MAX_ENTRIES`]. Returns `true` when the
    /// row made the table.
    pub fn add(&mut self, name: &str, score: u32, level: u32) -> bool {
        if !self.qualifies(score) {
            return false;
        }
        let entry = Entry {
            name: Self::clean_name(name),
            score,
            level,
        };
        let pos = self
            .entries
            .iter()
            .position(|e| score > e.score)
            .unwrap_or(self.entries.len());
        self.entries.insert(pos, entry);
        self.entries.truncate(MAX_ENTRIES);
        true
    }

    /// Drop every row.
    pub fn clear(&mut self) {
        self.entries.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_table_reports_zero() {
        let s = Scores::new();
        assert_eq!(s.count(), 0);
        assert_eq!(s.best(), 0);
        assert!(s.get(0).is_none());
        assert!(!s.qualifies(0));
        assert!(s.qualifies(10));
    }

    #[test]
    fn insert_sorts_descending_and_caps() {
        let mut s = Scores::new();
        for i in 1..=12u32 {
            assert!(s.add(&format!("p{i}"), i * 100, 1));
        }
        // 100 and 200 fall off the 10-row table.
        assert_eq!(s.count(), MAX_ENTRIES);
        assert_eq!(s.best(), 1200);
        assert_eq!(s.get(0).map(|e| e.score), Some(1200));
        assert_eq!(s.get(9).map(|e| e.score), Some(300));
        assert!(!s.qualifies(100));
        assert!(s.qualifies(301));
    }

    #[test]
    fn ties_keep_older_first() {
        let mut s = Scores::new();
        assert!(s.add("a", 500, 2));
        assert!(s.add("b", 500, 3));
        assert_eq!(s.get(0).map(|e| e.name.as_str()), Some("a"));
        assert_eq!(s.get(1).map(|e| e.name.as_str()), Some("b"));
    }

    #[test]
    fn names_are_sanitized() {
        assert_eq!(Scores::clean_name("  "), "Pip");
        assert_eq!(Scores::clean_name("  Kessa  "), "Kessa");
        assert_eq!(Scores::clean_name("averylongnamehere").len(), MAX_NAME);
        let mut s = Scores::new();
        assert!(s.add("", 50, 1));
        assert_eq!(s.get(0).map(|e| e.name.as_str()), Some("Pip"));
    }

    #[test]
    fn zero_score_never_qualifies() {
        let mut s = Scores::new();
        assert!(!s.add("x", 0, 1));
        assert_eq!(s.count(), 0);
    }

    #[test]
    fn clear_empties_the_table() {
        let mut s = Scores::new();
        assert!(s.add("a", 100, 1));
        s.clear();
        assert_eq!(s.count(), 0);
        assert_eq!(s.best(), 0);
    }
}
