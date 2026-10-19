//! High-score table: top runs on this machine.
//!
//! A small human-readable text file (`rank | score | level | mode |
//! date`), kept to the best [`MAX_SCORES`] entries sorted by score.
//! Pure parse/format plus thin std-fs load/save; the app records a run
//! when it ends and the scores screen reads the table back.

use std::io;
use std::path::Path;

/// Entries kept per machine.
pub const MAX_SCORES: usize = 10;

/// One recorded run.
#[derive(Clone, PartialEq, Eq, Debug)]
pub struct Score {
    pub score: u32,
    pub level: u32,
    pub mode: String,
    pub date: String,
}

impl Score {
    pub fn new(score: u32, level: u32, mode: &str, date: &str) -> Self {
        Self {
            score,
            level,
            mode: mode.to_string(),
            date: date.to_string(),
        }
    }
}

/// Parse one `score | level | mode | date` line. `None` on any malformed
/// line (callers skip and count; a corrupt file never kills the game).
pub fn parse_line(line: &str) -> Option<Score> {
    let parts: Vec<&str> = line.split('|').map(str::trim).collect();
    if parts.len() != 4 {
        return None;
    }
    let score = parts[0].parse::<u32>().ok()?;
    let level = parts[1].parse::<u32>().ok()?;
    if parts[2].is_empty() || parts[2].len() > 24 {
        return None;
    }
    if parts[3].is_empty() || parts[3].len() > 32 || parts[3].contains('\n') {
        return None;
    }
    Some(Score::new(score, level, parts[2], parts[3]))
}

/// Format one table line.
pub fn format_line(s: &Score) -> String {
    format!("{} | {} | {} | {}", s.score, s.level, s.mode, s.date)
}

/// Insert a score and report whether it made the table (rank included).
pub fn insert_ranked(table: &mut Vec<Score>, score: Score) -> Option<usize> {
    table.push(score.clone());
    table.sort_by(|a, b| b.score.cmp(&a.score).then(b.level.cmp(&a.level)));
    table.truncate(MAX_SCORES);
    table.iter().position(|s| s == &score).map(|i| i + 1)
}

/// Parse a whole table file; returns entries plus skipped-line count.
pub fn parse_table(text: &str) -> (Vec<Score>, usize) {
    let mut table = Vec::new();
    let mut skipped = 0;
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        match parse_line(line) {
            Some(s) => table.push(s),
            None => skipped += 1,
        }
    }
    table.sort_by(|a, b| b.score.cmp(&a.score).then(b.level.cmp(&a.level)));
    table.truncate(MAX_SCORES);
    (table, skipped)
}

/// Format a whole table file (with a `#` header comment).
pub fn format_table(table: &[Score]) -> String {
    let mut out = String::from("# maze-chase high scores: score | level | mode | date\n");
    for s in table.iter().take(MAX_SCORES) {
        out.push_str(&format_line(s));
        out.push('\n');
    }
    out
}

/// Load the table; missing files load empty, corrupt lines are skipped.
///
/// A FIFO is refused before opening: `std::fs::read_to_string` opens
/// with `O_RDONLY`, which blocks until a writer appears, so a score
/// path replaced with a FIFO would hang the game before the first
/// frame. It loads an empty table with one skipped entry and leaves
/// the FIFO untouched.
pub fn load_from(path: &Path) -> (Vec<Score>, usize) {
    #[cfg(unix)]
    if path.metadata().is_ok_and(|m| {
        use std::os::unix::fs::FileTypeExt;
        m.file_type().is_fifo()
    }) {
        return (Vec::new(), 1);
    }
    match std::fs::read_to_string(path) {
        Ok(text) => parse_table(&text),
        Err(_) => (Vec::new(), 0),
    }
}

/// Save the table (creates parent directories).
///
/// A FIFO is refused before opening: `std::fs::write` opens with
/// `O_WRONLY`, which blocks until a reader appears, so a score path
/// replaced with a FIFO would hang the game after a finished run. The
/// settings writer carries the same guard; both return `InvalidInput`
/// and leave the FIFO untouched.
pub fn save_to(table: &[Score], path: &Path) -> io::Result<()> {
    #[cfg(unix)]
    if path.metadata().is_ok_and(|m| {
        use std::os::unix::fs::FileTypeExt;
        m.file_type().is_fifo()
    }) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("refusing to write high scores to FIFO {}", path.display()),
        ));
    }
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    std::fs::write(path, format_table(table))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_and_ranking() {
        let mut t = Vec::new();
        assert_eq!(
            insert_ranked(&mut t, Score::new(500, 2, "classic", "2026-10-16")),
            Some(1)
        );
        assert_eq!(
            insert_ranked(&mut t, Score::new(900, 1, "sprint", "2026-10-16")),
            Some(1)
        );
        assert_eq!(t[0].score, 900);
        assert_eq!(t[1].score, 500);
        // Table caps at MAX_SCORES.
        for i in 0..20 {
            insert_ranked(&mut t, Score::new(i * 10, 1, "classic", "d"));
        }
        assert_eq!(t.len(), MAX_SCORES);
        assert_eq!(t[0].score, 900);
    }

    #[test]
    fn corrupt_lines_are_skipped_not_fatal() {
        let text = "# header\n900 | 3 | classic | 2026-10-16\nbogus line\n-5 | 1 | classic | d\n700 | x | classic | d\n";
        let (t, skipped) = parse_table(text);
        assert_eq!(t.len(), 1);
        assert_eq!(t[0].score, 900);
        assert_eq!(skipped, 3);
    }

    #[test]
    fn missing_file_loads_empty() {
        let (t, skipped) = load_from(Path::new("/nonexistent-dir-xyz/scores.txt"));
        assert!(t.is_empty());
        assert_eq!(skipped, 0);
    }

    #[test]
    fn save_creates_parents_and_reloads() {
        let dir = std::env::temp_dir().join("maze-chase-term-test-scores");
        let path = dir.join("sub").join("scores.txt");
        let _ = std::fs::remove_dir_all(&dir);
        let t = vec![Score::new(1230, 4, "classic", "2026-10-16")];
        save_to(&t, &path).unwrap();
        let (back, skipped) = load_from(&path);
        assert_eq!(back, t);
        assert_eq!(skipped, 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[cfg(unix)]
    #[test]
    fn fifo_score_writes_are_refused_instead_of_hanging() {
        use std::os::unix::fs::FileTypeExt;
        let dir =
            std::env::temp_dir().join(format!("maze-chase-scores-fifo-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("scores.txt");
        let status = std::process::Command::new("mkfifo").arg(&path).status();
        if !matches!(status, Ok(s) if s.success()) {
            let _ = std::fs::remove_dir_all(&dir);
            return;
        }
        assert!(path.metadata().unwrap().file_type().is_fifo());
        let table = vec![Score::new(500, 2, "classic", "2026-10-16")];
        let err = save_to(&table, &path).expect_err("a FIFO score path must be refused");
        assert_eq!(err.kind(), std::io::ErrorKind::InvalidInput);
        assert!(path.metadata().unwrap().file_type().is_fifo());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[cfg(unix)]
    #[test]
    fn fifo_score_reads_are_refused_instead_of_hanging() {
        use std::os::unix::fs::FileTypeExt;
        let dir = std::env::temp_dir().join(format!(
            "maze-chase-scores-fifo-read-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("scores.txt");
        let status = std::process::Command::new("mkfifo").arg(&path).status();
        if !matches!(status, Ok(s) if s.success()) {
            let _ = std::fs::remove_dir_all(&dir);
            return;
        }
        assert!(path.metadata().unwrap().file_type().is_fifo());
        let (table, skipped) = load_from(&path);
        assert!(table.is_empty());
        assert_eq!(skipped, 1);
        assert!(path.metadata().unwrap().file_type().is_fifo());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
